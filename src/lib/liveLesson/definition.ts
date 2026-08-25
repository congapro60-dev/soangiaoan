import pilotPackageText from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.json?raw';

import {
  g10W5P31BptTiet1Cues,
  type LiveCue,
} from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues';
import type {
  LiveAiErrorOfTheWeek,
  LiveLessonDefinition,
  LiveLessonScreen,
  LiveResponseStep,
} from './types';
import { LiveLessonDefinitionError } from './types';

interface PilotScreen {
  id: string;
  label?: string;
  title?: string;
  body?: string;
  action?: string;
}

interface PilotPackage {
  meta: { id: string; title: string; durationMinutes: number };
  displayContract: Record<string, unknown>;
  timeline: unknown[];
  tvScreens: PilotScreen[];
  studentScreens: PilotScreen[];
  aiErrorOfTheWeek: LiveAiErrorOfTheWeek;
  routeTasks: Record<string, unknown>;
  quickCheck: unknown[];
  exitTicket: Record<string, unknown>;
  board: Record<string, unknown>;
  notebook: Record<string, unknown>;
  resources: unknown[];
  fallback: Record<string, unknown>;
}

const MAX_TEXT_LENGTH = 2000;

function fail(code: string, message: string): never {
  throw new LiveLessonDefinitionError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPublicScreenFieldTypes(value: Record<string, unknown>): boolean {
  return isNonEmptyString(value.id)
    && ['label', 'title', 'body', 'action'].every((key) => (
      value[key] === undefined || typeof value[key] === 'string'
    ));
}

function isPilotScreen(value: unknown): value is PilotScreen {
  return isRecord(value) && hasPublicScreenFieldTypes(value);
}

function isPublicScreen(value: unknown): value is LiveLessonScreen {
  if (!isPilotScreen(value)) return false;
  const allowedKeys = new Set(['id', 'label', 'title', 'body', 'action']);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isAiErrorOfTheWeek(value: unknown): value is LiveAiErrorOfTheWeek {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.category === 'string'
    && typeof value.correction === 'string'
    && typeof value.proof === 'string';
}

function isRouteTask(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.prompt)
    && isNonEmptyString(value.answer)
    && Array.isArray(value.hints)
    && value.hints.length > 0
    && value.hints.every(isNonEmptyString);
}

function isQuickCheckItem(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.prompt)
    && isNonEmptyString(value.answer)
    && isNonEmptyString(value.why);
}

function isLiveCue(value: unknown): value is LiveCue {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.atSeconds === 'number'
    && typeof value.label === 'string'
    && typeof value.tvScreenId === 'string'
    && typeof value.teacher === 'string'
    && typeof value.student === 'string'
    && typeof value.boardLarge === 'string'
    && typeof value.boardSide === 'string'
    && typeof value.notebook === 'string'
    && typeof value.observerEvidence === 'string'
    && (value.responseStepId === undefined || typeof value.responseStepId === 'string');
}

function isLiveResponseStepShape(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string';
}

function isLiveResponseType(value: unknown): boolean {
  return value === 'choice'
    || value === 'text'
    || value === 'boolean'
    || value === 'route'
    || value === 'hint'
    || value === 'exit_ticket';
}

function isPilotPackage(value: unknown): value is PilotPackage {
  if (!isRecord(value)) return false;

  const requiredKeys = [
    'meta',
    'displayContract',
    'timeline',
    'tvScreens',
    'studentScreens',
    'aiErrorOfTheWeek',
    'routeTasks',
    'quickCheck',
    'exitTicket',
    'board',
    'notebook',
    'resources',
    'fallback',
  ];
  if (requiredKeys.some((key) => value[key] === undefined || value[key] === null)) return false;

  const meta = value.meta;
  return isRecord(meta)
    && typeof meta.id === 'string'
    && typeof meta.title === 'string'
    && typeof meta.durationMinutes === 'number'
    && isRecord(value.displayContract)
    && Array.isArray(value.timeline)
    && Array.isArray(value.tvScreens)
    && value.tvScreens.every(isPilotScreen)
    && Array.isArray(value.studentScreens)
    && value.studentScreens.every(isPilotScreen)
    && isAiErrorOfTheWeek(value.aiErrorOfTheWeek)
    && isRecord(value.routeTasks)
    && ['M', 'S', 'C'].every((routeId) => isRouteTask(value.routeTasks[routeId]))
    && Array.isArray(value.quickCheck)
    && value.quickCheck.length >= 3
    && value.quickCheck.every(isQuickCheckItem)
    && isRecord(value.exitTicket)
    && isNonEmptyString(value.exitTicket.prompt)
    && isNonEmptyString(value.exitTicket.answer)
    && Array.isArray(value.exitTicket.lookFor)
    && value.exitTicket.lookFor.length > 0
    && value.exitTicket.lookFor.every(isNonEmptyString)
    && isRecord(value.board)
    && isRecord(value.notebook)
    && Array.isArray(value.resources)
    && isRecord(value.fallback);
}

function assertPilotPackage(value: unknown): asserts value is PilotPackage {
  if (!isPilotPackage(value)) {
    fail('LIVE_PACKAGE_INVALID', 'Pilot package is missing required canonical fields or has an invalid shape.');
  }
}

function parsePilotPackage(): PilotPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(pilotPackageText) as unknown;
  } catch {
    fail('LIVE_PACKAGE_INVALID', 'Pilot package JSON could not be parsed.');
  }
  assertPilotPackage(parsed);
  return parsed;
}

function normalizeScreens(screens: PilotScreen[]): LiveLessonScreen[] {
  return screens.map((screen) => {
    const normalized: LiveLessonScreen = { id: screen.id };
    if (screen.label !== undefined) normalized.label = screen.label;
    if (screen.title !== undefined) normalized.title = screen.title;
    if (screen.body !== undefined) normalized.body = screen.body;
    if (screen.action !== undefined) normalized.action = screen.action;
    return normalized;
  });
}

function normalizeAiErrorOfTheWeek(error: LiveAiErrorOfTheWeek): LiveAiErrorOfTheWeek {
  return {
    id: error.id,
    category: error.category,
    correction: error.correction,
    proof: error.proof,
  };
}

function isLiveLessonDefinitionShape(value: unknown): value is LiveLessonDefinition {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.lessonId === 'string'
    && typeof value.title === 'string'
    && typeof value.durationSeconds === 'number'
    && Array.isArray(value.cues)
    && value.cues.every(isLiveCue)
    && Array.isArray(value.tvScreens)
    && value.tvScreens.every(isPublicScreen)
    && Array.isArray(value.studentScreens)
    && value.studentScreens.every(isPublicScreen)
    && Array.isArray(value.allowedStepIds)
    && value.allowedStepIds.every((stepId) => typeof stepId === 'string')
    && typeof value.aiErrorStepId === 'string'
    && isAiErrorOfTheWeek(value.aiErrorOfTheWeek)
    && Array.isArray(value.responseSteps)
    && value.responseSteps.every(isLiveResponseStepShape);
}

function assertPilotCueContract(definition: LiveLessonDefinition): void {
  if (definition.id !== 'g10_w5_p31_bpt_tiet1') return;
  if (definition.cues.length !== g10W5P31BptTiet1Cues.length) {
    fail('LIVE_CUE_CONTRACT_INVALID', 'Pilot cue count does not match the canonical cue source.');
  }
  const textFields: Array<keyof LiveCue> = [
    'label',
    'tvScreenId',
    'teacher',
    'student',
    'boardLarge',
    'boardSide',
    'notebook',
    'observerEvidence',
  ];
  for (const [index, cue] of definition.cues.entries()) {
    const canonicalCue = g10W5P31BptTiet1Cues[index];
    const textChanged = textFields.some((field) => cue[field] !== canonicalCue[field]);
    if (
      cue.id !== canonicalCue.id
      || cue.atSeconds !== canonicalCue.atSeconds
      || cue.responseStepId !== canonicalCue.responseStepId
      || textChanged
    ) {
      fail('LIVE_CUE_CONTRACT_INVALID', `Pilot cue ${cue.id} differs from the canonical cue source.`);
    }
  }
}

const responseSteps: LiveResponseStep[] = [
  { id: 'warmup', label: 'Khởi động', screenId: 'HS1', responseTypes: ['choice'] },
  { id: 'notice-wonder', label: 'Notice/Wonder', screenId: 'HS2', responseTypes: ['choice', 'text'], maxTextLength: 120 },
  { id: 'goals', label: 'Mục tiêu cá nhân', screenId: 'HS3', responseTypes: ['choice'] },
  { id: 'model', label: 'Mô hình', screenId: 'HS4', responseTypes: ['choice', 'text'] },
  { id: 'ai-error-w01', label: 'AI Error of the Week W01', screenId: 'HS6', responseTypes: ['choice', 'text'] },
  { id: 'quick-check', label: 'Quick check', screenId: 'HS9', responseTypes: ['choice', 'text'] },
  { id: 'exit-ticket', label: 'Exit ticket', screenId: 'HS10', responseTypes: ['text'] },
];

export function normalizeLiveLessonDefinition(
  pilotPackage: unknown,
  cues = g10W5P31BptTiet1Cues,
): LiveLessonDefinition {
  assertPilotPackage(pilotPackage);
  const definition: LiveLessonDefinition = {
    id: 'g10_w5_p31_bpt_tiet1',
    lessonId: pilotPackage.meta.id,
    title: pilotPackage.meta.title,
    durationSeconds: pilotPackage.meta.durationMinutes * 60,
    cues: cues.map((cue) => ({ ...cue })),
    tvScreens: normalizeScreens(pilotPackage.tvScreens),
    studentScreens: normalizeScreens(pilotPackage.studentScreens),
    allowedStepIds: responseSteps.map((step) => step.id),
    aiErrorStepId: 'ai-error-w01',
    aiErrorOfTheWeek: normalizeAiErrorOfTheWeek(pilotPackage.aiErrorOfTheWeek),
    responseSteps: responseSteps.map((step) => ({ ...step, responseTypes: [...step.responseTypes] })),
  };

  return validateLiveLessonDefinition(definition);
}

export function validateLiveLessonDefinition(
  definition: LiveLessonDefinition,
): LiveLessonDefinition {
  if (!isLiveLessonDefinitionShape(definition)) {
    fail('LIVE_DEFINITION_INVALID', 'Live lesson definition has an invalid runtime shape.');
  }
  if (definition.durationSeconds !== 2400) {
    fail('LIVE_DURATION_INVALID', 'Live lesson duration must be exactly 2400 seconds.');
  }

  const tvScreenIds = new Set(definition.tvScreens.map((screen) => screen.id));
  const stepIds = new Set(definition.responseSteps.map((step) => step.id));

  for (const step of definition.responseSteps) {
    if (!Array.isArray(step.responseTypes) || !step.responseTypes.every(isLiveResponseType)) {
      fail('LIVE_RESPONSE_TYPE_INVALID', `Response step ${step.id} has an invalid response type.`);
    }
  }

  if (new Set(definition.allowedStepIds).size !== definition.allowedStepIds.length) {
    fail('LIVE_STEP_ID_DUPLICATE', 'allowedStepIds must not contain duplicates.');
  }

  if (definition.cues.length === 0) {
    fail('LIVE_CUES_EMPTY', 'Live lesson must contain at least one cue.');
  }
  if (!Number.isFinite(definition.cues[0].atSeconds)
    || !Number.isFinite(definition.cues[definition.cues.length - 1].atSeconds)) {
    fail('LIVE_CUE_INVALID', 'Cue timing must use finite numbers.');
  }
  if (definition.cues[0].atSeconds !== 0) {
    fail('LIVE_CUE_START_INVALID', 'The first cue must start at 0 seconds.');
  }
  if (definition.cues[definition.cues.length - 1].atSeconds !== definition.durationSeconds) {
    fail('LIVE_CUE_END_INVALID', 'The last cue must end at the lesson duration.');
  }

  for (const stepId of definition.allowedStepIds) {
    if (!stepIds.has(stepId)) {
      fail('LIVE_STEP_NOT_FOUND', `Allowed step ${stepId} is not declared.`);
    }
  }

  let previousAtSeconds = -1;
  for (const cue of definition.cues) {
    if (!Number.isFinite(cue.atSeconds)
      || cue.atSeconds <= previousAtSeconds
      || cue.atSeconds > definition.durationSeconds) {
      fail('LIVE_CUE_ORDER_INVALID', `Cue ${cue.id} is outside the increasing timeline.`);
    }
    previousAtSeconds = cue.atSeconds;
    if (!tvScreenIds.has(cue.tvScreenId)) {
      fail('LIVE_TV_SCREEN_NOT_FOUND', `Cue ${cue.id} references ${cue.tvScreenId}.`);
    }
    if (cue.responseStepId && !stepIds.has(cue.responseStepId)) {
      fail('LIVE_RESPONSE_STEP_NOT_FOUND', `Cue ${cue.id} references ${cue.responseStepId}.`);
    }
    for (const value of [cue.label, cue.teacher, cue.student, cue.boardLarge, cue.boardSide, cue.notebook, cue.observerEvidence]) {
      if (value.length > MAX_TEXT_LENGTH) {
        fail('LIVE_TEXT_TOO_LONG', `Cue ${cue.id} contains text longer than ${MAX_TEXT_LENGTH} characters.`);
      }
    }
  }

  for (const screen of definition.tvScreens) {
    if (!screen.id || screen.id.length > 100) fail('LIVE_SCREEN_INVALID', 'TV screen id is invalid.');
  }
  for (const screen of definition.studentScreens) {
    if (!screen.id || screen.id.length > 100) fail('LIVE_SCREEN_INVALID', 'Student screen id is invalid.');
  }

  const aiError = definition.aiErrorOfTheWeek;
  if (definition.aiErrorStepId !== 'ai-error-w01' || aiError.id !== 'W01') {
    fail('LIVE_AI_ERROR_STEP_INVALID', 'AI Error step must be ai-error-w01 for W01.');
  }
  if (!aiError.category.trim()) fail('LIVE_AI_ERROR_INCOMPLETE', 'AI Error category is required.');
  if (!aiError.correction.trim()) fail('LIVE_AI_ERROR_INCOMPLETE', 'AI Error correction is required.');
  if (!aiError.proof.trim()) fail('LIVE_AI_ERROR_INCOMPLETE', 'AI Error proof is required.');

  assertPilotCueContract(definition);

  return definition;
}

export function getPilotLiveLessonDefinition(): LiveLessonDefinition {
  return normalizeLiveLessonDefinition(parsePilotPackage());
}

export { LiveLessonDefinitionError } from './types';
