import type {
  Checkpoint,
  GlossaryItem,
  LiveLessonV4Contract,
  PublicTvField,
  PublicTvState,
  ScaffoldSet,
  StudentLanguageView,
  TaskVariant,
  TimelineBlock,
} from './types';

type LoosePublicStats = Partial<PublicTvState> & Record<string, unknown>;

export interface TeacherLessonProjection {
  cue: TimelineBlock;
  script: string;
  board: {
    large?: string;
    side?: string;
  };
  checkpoint?: Checkpoint;
  taskVariants: TaskVariant[];
  groupingCheckpoints: LiveLessonV4Contract['groupingCheckpoints'];
  aiError?: LiveLessonV4Contract['aiError'];
}

export interface TvLessonProjection {
  cueId: string;
  screenId: string;
  status: PublicTvState['status'];
  showStats: boolean;
  participantCount: number;
  submittedCount: number;
  routeCounts: PublicTvState['routeCounts'];
  errorCategoryCounts: PublicTvState['errorCategoryCounts'];
  groupProgress?: PublicTvState['groupProgress'];
  updatedAt: number;
  screen: {
    title: string;
    question: string;
    board?: string;
  };
}

export interface StudentLessonProjection {
  cueId: string;
  action?: string;
  checkpoint?: Checkpoint;
  taskVariants: TaskVariant[];
  scaffoldSets: ScaffoldSet[];
  glossary: GlossaryItem[];
  languageView: StudentLanguageView;
  curriculumBridges: LiveLessonV4Contract['curriculumBridges'];
}

const EMPTY_COUNTS = { M: 0, S: 0, C: 0 } as const;
const EMPTY_ERRORS = { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 } as const;

function findCue(contract: LiveLessonV4Contract, stepId: string): TimelineBlock {
  const cue = contract.timeline.find((block) => block.id === stepId);
  if (!cue) {
    throw new Error(`Không tìm thấy timeline block ${stepId}.`);
  }
  return cue;
}

function checkpointFor(contract: LiveLessonV4Contract, cue: TimelineBlock): Checkpoint | undefined {
  return contract.checkpoints.find((checkpoint) => checkpoint.id === cue.checkpointId);
}

export function projectTeacher(contract: LiveLessonV4Contract, stepId: string): TeacherLessonProjection {
  const cue = findCue(contract, stepId);

  return {
    cue,
    script: cue.teacherScript,
    board: {
      large: cue.boardLarge,
      side: cue.boardSide,
    },
    checkpoint: checkpointFor(contract, cue),
    taskVariants: contract.taskVariants,
    groupingCheckpoints: contract.groupingCheckpoints.filter((checkpoint) => checkpoint.stepId === stepId),
    aiError: contract.aiError.stepId === stepId ? contract.aiError : undefined,
  };
}

function pickPublicState(stats: LoosePublicStats, cue: TimelineBlock): Pick<TvLessonProjection, PublicTvField> {
  return {
    cueId: typeof stats.cueId === 'string' ? stats.cueId : cue.id,
    screenId: typeof stats.screenId === 'string' ? stats.screenId : cue.tvScreenId,
    status: stats.status ?? 'running',
    showStats: Boolean(stats.showStats),
    participantCount: typeof stats.participantCount === 'number' ? stats.participantCount : 0,
    submittedCount: typeof stats.submittedCount === 'number' ? stats.submittedCount : 0,
    routeCounts: stats.routeCounts ?? { ...EMPTY_COUNTS },
    errorCategoryCounts: stats.errorCategoryCounts ?? { ...EMPTY_ERRORS },
    groupProgress: stats.groupProgress,
    updatedAt: typeof stats.updatedAt === 'number' ? stats.updatedAt : 0,
  };
}

export function projectTv(
  contract: LiveLessonV4Contract,
  stepId: string,
  publicState: LoosePublicStats = {},
): TvLessonProjection {
  const cue = findCue(contract, stepId);
  const state = pickPublicState(publicState, cue);

  return {
    ...state,
    screen: {
      title: cue.label,
      question: cue.studentAction ?? cue.label,
      board: cue.boardLarge,
    },
  };
}

export function projectStudent(
  contract: LiveLessonV4Contract,
  stepId: string,
  studentLanguageView: StudentLanguageView,
): StudentLessonProjection {
  const cue = findCue(contract, stepId);
  const checkpoint = checkpointFor(contract, cue);
  const bridgeIds = new Set(studentLanguageView.curriculumBridgeIds);

  return {
    cueId: cue.id,
    action: cue.studentAction,
    checkpoint,
    taskVariants: contract.taskVariants,
    scaffoldSets: contract.scaffoldSets,
    glossary: studentLanguageView.showGlossary ? contract.glossary : [],
    languageView: studentLanguageView,
    curriculumBridges: contract.curriculumBridges.filter((bridge) => bridgeIds.has(bridge.id)),
  };
}
