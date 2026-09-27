// Offline pack builder — tổng hợp gói offline cho GV dạy khi mất mạng.
// Bao gồm: cue TV, glossary approved, bảng phụ, M/S/C cards, AI error answer key,
// nhóm mặc định, exit ticket giấy.
// Pack không được publish nếu thiếu post-check hoặc có glossary chưa approved.

import type {
  AiErrorOfTheWeek,
  GlossaryItem,
  GroupingCheckpoint,
  LiveLessonV4Contract,
  OfflinePack,
  ScaffoldSet,
  TaskVariant,
  TimelineBlock,
  V4Route,
} from './types';

export interface OfflinePackContents {
  tvCues: TimelineBlock[];
  approvedGlossary: GlossaryItem[];
  boardPlan: {
    objectives: string[];
    sentenceFrames: string[];
    rubric: string[];
  };
  routeCards: Array<{
    route: V4Route;
    prompt: string;
    hints: string[];
    extension?: string;
  }>;
  aiErrorAnswerKey: {
    faultyStatement: string;
    correction: string;
    proof: string;
  };
  defaultGrouping: {
    question: string;
    rubric: string[];
  } | null;
  paperExitTicket: {
    prompt: string;
  };
}

export interface OfflinePackValidation {
  ok: boolean;
  missingPostChecks: V4Route[];
  unapprovedGlossaryItems: string[];
}

/**
 * Kiểm tra xem contract có đầy đủ post-check cho mọi task variant không.
 */
export function validatePostChecks(contract: LiveLessonV4Contract): V4Route[] {
  const postCheckIds = new Set(
    contract.checkpoints.filter((c) => c.kind === 'post_check').map((c) => c.id),
  );
  const missing: V4Route[] = [];
  for (const variant of contract.taskVariants) {
    if (!postCheckIds.has(variant.postCheckId)) {
      missing.push(variant.route);
    }
  }
  return missing;
}

/**
 * Kiểm tra xem mọi glossary item có ở trạng thái approved không.
 */
export function validateGlossaryApproved(contract: LiveLessonV4Contract): string[] {
  return contract.glossary
    .filter((item) => item.status !== 'approved')
    .map((item) => item.id);
}

/**
 * Validate full offline pack readiness.
 */
export function validateOfflinePackReadiness(contract: LiveLessonV4Contract): OfflinePackValidation {
  return {
    ok: contract.offline.tvCuesIncluded
      && contract.offline.glossaryPrintIncluded
      && contract.offline.boardPlanIncluded
      && contract.offline.aiErrorAnswerKeyIncluded
      && contract.offline.routeCards.length === 3
      && contract.offline.manualGroupingSheet
      && contract.offline.paperExitTicket
      && validatePostChecks(contract).length === 0
      && validateGlossaryApproved(contract).length === 0,
    missingPostChecks: validatePostChecks(contract),
    unapprovedGlossaryItems: validateGlossaryApproved(contract),
  };
}

/**
 * Build full offline pack contents từ contract.
 * Trả về null nếu contract chưa sẵn sàng cho offline.
 */
export function buildOfflinePackContents(
  contract: LiveLessonV4Contract,
): OfflinePackContents | null {
  const readiness = validateOfflinePackReadiness(contract);
  if (!readiness.ok) return null;

  const approvedGlossary = contract.glossary.filter((g) => g.status === 'approved');

  const boardSideBlocks = contract.timeline.filter(
    (b) => b.boardSide && b.boardSide.trim().length > 0,
  );

  const routeCards = contract.taskVariants.map((variant) => {
    const scaffold = contract.scaffoldSets.find((s) => s.id === variant.scaffoldSetId);
    return {
      route: variant.route,
      prompt: variant.prompt,
      hints: scaffold?.hints ?? [],
      extension: variant.extension,
    };
  });

  const groupingCheckpoint = contract.groupingCheckpoints[0] ?? null;

  return {
    tvCues: [...contract.timeline],
    approvedGlossary,
    boardPlan: {
      objectives: contract.objectives.math.map((o) => o.text),
      sentenceFrames: contract.languageDemands.flatMap((d) => d.sentenceFrames),
      rubric: groupingCheckpoint?.rubric ?? [],
    },
    routeCards,
    aiErrorAnswerKey: {
      faultyStatement: contract.aiError.faultyStatement,
      correction: contract.aiError.correction,
      proof: contract.aiError.proof,
    },
    defaultGrouping: groupingCheckpoint
      ? {
          question: groupingCheckpoint.sharedQuestion,
          rubric: groupingCheckpoint.rubric,
        }
      : null,
    paperExitTicket: {
      prompt: contract.checkpoints.find((c) => c.id === 'cp-exit-ticket')?.prompt
        ?? 'Một điều em đã hiểu, một điều còn cần kiểm chứng.',
    },
  };
}

/**
 * Trả về summary checklist cho teacher offline view.
 */
export function buildOfflineChecklist(
  contract: LiveLessonV4Contract,
): Array<{ label: string; ready: boolean }> {
  const readiness = validateOfflinePackReadiness(contract);
  const postCheckRoutes = ['M', 'S', 'C'] as const;
  const missingPostChecks = new Set(readiness.missingPostChecks);

  return [
    { label: 'Cue và hình/đồ thị TV', ready: contract.offline.tvCuesIncluded },
    { label: 'Bảng thuật ngữ (chỉ approved)', ready: contract.offline.glossaryPrintIncluded && readiness.unapprovedGlossaryItems.length === 0 },
    { label: 'Bảng phụ: mục tiêu, khung câu, rubric', ready: contract.offline.boardPlanIncluded },
    { label: 'Lỗi AI và đáp án kiểm chứng', ready: contract.offline.aiErrorAnswerKeyIncluded },
    ...postCheckRoutes.map((route) => ({
      label: `Post-check tuyến ${route}`,
      ready: !missingPostChecks.has(route),
    })),
    { label: 'Danh sách nhóm thủ công', ready: contract.offline.manualGroupingSheet },
    { label: 'Exit ticket giấy', ready: contract.offline.paperExitTicket },
  ];
}
