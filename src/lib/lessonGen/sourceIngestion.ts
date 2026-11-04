export type LessonSourceRole = 'canonical' | 'teacher_lesson' | 'reference' | 'teacher_authored';

export interface LessonSourceInput {
  id: string;
  name: string;
  mimeType: string;
  role: LessonSourceRole;
  content: string;
  durationMinutes?: number;
}

export interface LessonSourceRecord extends LessonSourceInput {
  locator: { kind: 'whole_file'; value: string };
}

export interface LessonSourceBundle {
  sourceHash: string;
  durationMinutes?: number;
  sources: LessonSourceRecord[];
}

export interface LessonSourceIssue {
  code: 'INPUT_DURATION_REQUIRED' | 'CANONICAL_SOURCE_REQUIRED' | 'UNTRUSTED_INSTRUCTION_CONTENT' | 'SOURCE_CONTENT_UNREADABLE';
  message: string;
  sourceId?: string;
}

const sha256 = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
};

const serializeSourceBundle = (sources: LessonSourceRecord[], version: 1 | 2): string =>
  (version === 2 ? 'lesson-source-bundle-v2\n' : '') + sources.map(source =>
    `${version === 1 ? `${source.id}\n` : ''}${source.name}\n${source.mimeType}\n${source.role}\n${source.content}`).join('\n---\n');

export const verifySourceBundleHash = async (bundle: LessonSourceBundle): Promise<boolean> => {
  const { sourceHash } = bundle;
  const current = serializeSourceBundle(bundle.sources, 2);
  const historical = serializeSourceBundle(bundle.sources, 1);
  return sourceHash === await sha256(current) || sourceHash === await sha256(historical);
};

export const createSourceBundle = async (input: LessonSourceInput | LessonSourceInput[]): Promise<LessonSourceBundle> => {
  const inputs = Array.isArray(input) ? input : [input];
  const sources = inputs.map(source => ({ ...source, locator: { kind: 'whole_file' as const, value: source.name } }));
  const canonicalText = serializeSourceBundle(sources, 2);
  const durationMinutes = sources.find(source => Number.isFinite(source.durationMinutes) && (source.durationMinutes ?? 0) > 0)?.durationMinutes;
  return { sourceHash: await sha256(canonicalText), ...(durationMinutes ? { durationMinutes } : {}), sources };
};

const UNTRUSTED_INSTRUCTION_RE = /(?:bỏ qua|ignore).{0,80}(?:quy tắc|instructions?|previous)|(?:công bố|reveal).{0,80}(?:đáp án|answer)/i;

export const sourceTextIsReadable = (content: string): boolean =>
  Boolean(content.trim()) && !/^data:[^,]*;base64,/i.test(content.trim());

export const inspectSourceBundle = (bundle: LessonSourceBundle): LessonSourceIssue[] => {
  const issues: LessonSourceIssue[] = [];
  if (!bundle.durationMinutes || bundle.durationMinutes <= 0) {
    issues.push({ code: 'INPUT_DURATION_REQUIRED', message: 'Giáo án chưa có thời lượng xác định.' });
  }
  if (!bundle.sources.some(source => source.role === 'canonical')) {
    issues.push({ code: 'CANONICAL_SOURCE_REQUIRED', message: 'Chưa có nguồn canonical để xác minh kiến thức Toán.' });
  }
  for (const source of bundle.sources) {
    if (!sourceTextIsReadable(source.content)) {
      issues.push({ code: 'SOURCE_CONTENT_UNREADABLE', sourceId: source.id,
        message: 'Tệp chưa được trích xuất thành chữ đọc được; cần OCR/nhập bản có chữ trước khi duyệt nguồn.' });
    }
    if (UNTRUSTED_INSTRUCTION_RE.test(source.content)) {
      issues.push({ code: 'UNTRUSTED_INSTRUCTION_CONTENT', sourceId: source.id, message: 'Tài liệu chứa câu mang tính chỉ dẫn; chỉ dùng như nội dung tham khảo.' });
    }
  }
  return issues;
};
