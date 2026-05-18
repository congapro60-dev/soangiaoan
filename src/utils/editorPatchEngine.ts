export interface EditorPatchRejection {
  type: 'section' | 'find-replace' | 'full-rewrite';
  reason: string;
  target?: string;
}

export interface EditorPatchResult {
  patched: string;
  appliedCount: number;
  attemptedCount: number;
  rejected: EditorPatchRejection[];
  warnings: string[];
  hasPatchIntent: boolean;
}

const PLACEHOLDER_PATTERNS = [
  /giữ\s*nguyên/i,
  /giu\s*nguyen/i,
  /\[\s*(?:nội dung cũ|noi dung cu|\.\.\.|…)[\s\S]*?\]/i,
  /\(\s*(?:giữ\s*nguyên|giu\s*nguyen)[\s\S]*?\)/i,
  /^\s*(?:\.\.\.|…)\s*$/m,
  /<\s*giữ\s*nguyên[\s\S]*?>/i,
];

const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, '\n');

export const hasEditorPatchIntent = (aiResponse: string): boolean => (
  /<PATCH_SECTION>|<PATCH>|<UPDATE_EDITOR>/i.test(aiResponse)
);

export const stripEditorPatchTags = (aiResponse: string): string => aiResponse
  .replace(/<PATCH_SECTION>[\s\S]*?<\/PATCH_SECTION>/gi, '')
  .replace(/<PATCH>[\s\S]*?<\/PATCH>/gi, '')
  .replace(/<UPDATE_EDITOR>[\s\S]*?<\/UPDATE_EDITOR>/gi, '')
  .trim();

export const containsDangerousPlaceholder = (content: string): boolean => (
  PLACEHOLDER_PATTERNS.some(pattern => pattern.test(content))
);

const getSectionBounds = (original: string, heading: string): { start: number; contentStart: number; end: number; originalSectionContent: string } | null => {
  const start = original.indexOf(heading);
  if (start === -1) return null;

  const contentStart = start + heading.length;
  const afterHeading = original.slice(contentStart);
  const nextSection = afterHeading.match(/\n#{1,6}\s+/);
  const end = nextSection ? contentStart + nextSection.index! : original.length;

  return {
    start,
    contentStart,
    end,
    originalSectionContent: original.slice(contentStart, end).trim(),
  };
};

const isSuspiciouslyShortReplacement = (originalContent: string, replacementContent: string): boolean => {
  const originalLength = originalContent.trim().length;
  const replacementLength = replacementContent.trim().length;

  if (originalLength < 500) return false;
  if (replacementLength < 120) return true;

  return replacementLength < originalLength * 0.35;
};

const applySectionPatch = (original: string, heading: string, newContent: string): { patched: string; applied: boolean; rejection?: EditorPatchRejection; warning?: string } => {
  const bounds = getSectionBounds(original, heading);
  if (!bounds) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'section',
        target: heading,
        reason: `Không tìm thấy heading "${heading}" trong giáo án hiện tại.`,
      },
    };
  }

  if (containsDangerousPlaceholder(newContent)) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'section',
        target: heading,
        reason: `Patch cho "${heading}" chứa placeholder/cụm rút gọn có nguy cơ làm mất nội dung.`,
      },
      warning: 'AI đã trả về nội dung bị rút gọn/placeholder nên hệ thống không ghi đè giáo án.',
    };
  }

  if (isSuspiciouslyShortReplacement(bounds.originalSectionContent, newContent)) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'section',
        target: heading,
        reason: `Patch cho "${heading}" ngắn bất thường so với mục gốc.`,
      },
      warning: 'AI có dấu hiệu cắt ngắn nội dung nên hệ thống đã chặn cập nhật.',
    };
  }

  const patched = `${original.slice(0, bounds.start)}${heading}\n\n${newContent.trim()}\n\n${original.slice(bounds.end).replace(/^\n+/, '')}`;
  return { patched, applied: patched !== original };
};

const applyFindReplacePatch = (original: string, find: string, replace: string): { patched: string; applied: boolean; rejection?: EditorPatchRejection; warning?: string } => {
  if (!find) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'find-replace',
        reason: 'Patch FIND rỗng nên không được áp dụng.',
      },
    };
  }

  if (!original.includes(find)) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'find-replace',
        target: find.slice(0, 120),
        reason: 'Không tìm thấy đoạn FIND chính xác trong giáo án hiện tại.',
      },
    };
  }

  if (containsDangerousPlaceholder(replace)) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'find-replace',
        target: find.slice(0, 120),
        reason: 'Patch REPLACE chứa placeholder/cụm rút gọn có nguy cơ làm mất nội dung.',
      },
      warning: 'AI đã trả về nội dung bị rút gọn/placeholder nên hệ thống không ghi đè giáo án.',
    };
  }

  if (isSuspiciouslyShortReplacement(find, replace)) {
    return {
      patched: original,
      applied: false,
      rejection: {
        type: 'find-replace',
        target: find.slice(0, 120),
        reason: 'Patch REPLACE ngắn bất thường so với đoạn FIND.',
      },
      warning: 'AI có dấu hiệu cắt ngắn nội dung nên hệ thống đã chặn cập nhật.',
    };
  }

  const patched = original.replace(find, replace);
  return { patched, applied: patched !== original };
};

export const applyEditorPatches = (originalContent: string, aiResponse: string): EditorPatchResult => {
  const original = normalizeLineEndings(originalContent);
  const response = normalizeLineEndings(aiResponse);
  let patched = original;
  let appliedCount = 0;
  let attemptedCount = 0;
  const rejected: EditorPatchRejection[] = [];
  const warnings: string[] = [];

  if (/<UPDATE_EDITOR>/i.test(response)) {
    attemptedCount += 1;
    rejected.push({
      type: 'full-rewrite',
      reason: 'AI trả về UPDATE_EDITOR/full rewrite. Hệ thống chỉ cho phép PATCH_SECTION hoặc PATCH để tránh mất giáo án.',
    });
    warnings.push('AI đã cố ghi đè toàn bộ giáo án; cập nhật bị chặn để bảo toàn nội dung hiện có.');
  }

  const sectionRegex = /<PATCH_SECTION>\s*<HEADING>([\s\S]*?)<\/HEADING>\s*<CONTENT>([\s\S]*?)<\/CONTENT>\s*<\/PATCH_SECTION>/gi;
  let sectionMatch: RegExpExecArray | null;
  while ((sectionMatch = sectionRegex.exec(response)) !== null) {
    attemptedCount += 1;
    const heading = sectionMatch[1].trim();
    const content = sectionMatch[2].trim();
    const outcome = applySectionPatch(patched, heading, content);

    if (outcome.applied) {
      patched = outcome.patched;
      appliedCount += 1;
    } else if (outcome.rejection) {
      rejected.push(outcome.rejection);
    }
    if (outcome.warning) warnings.push(outcome.warning);
  }

  const patchRegex = /<PATCH>\s*<FIND>([\s\S]*?)<\/FIND>\s*<REPLACE>([\s\S]*?)<\/REPLACE>\s*<\/PATCH>/gi;
  let patchMatch: RegExpExecArray | null;
  while ((patchMatch = patchRegex.exec(response)) !== null) {
    attemptedCount += 1;
    const find = patchMatch[1].trim();
    const replace = patchMatch[2].trim();
    const outcome = applyFindReplacePatch(patched, find, replace);

    if (outcome.applied) {
      patched = outcome.patched;
      appliedCount += 1;
    } else if (outcome.rejection) {
      rejected.push(outcome.rejection);
    }
    if (outcome.warning) warnings.push(outcome.warning);
  }

  return {
    patched,
    appliedCount,
    attemptedCount,
    rejected,
    warnings: Array.from(new Set(warnings)),
    hasPatchIntent: hasEditorPatchIntent(response),
  };
};
