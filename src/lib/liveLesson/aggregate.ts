import type {
  LiveErrorCategory,
  LivePublicStats,
  LiveResponse,
  LiveRoute,
} from './types';

const ROUTES: LiveRoute[] = ['M', 'S', 'C'];
const ERROR_CATEGORIES: LiveErrorCategory[] = [
  'Conceptual',
  'Algebraic',
  'Logical',
  'Missing condition',
];

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const valueFingerprint = (value: LiveResponse['value']): string => {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'number:NaN';
    if (value === Number.POSITIVE_INFINITY) return 'number:+Infinity';
    if (value === Number.NEGATIVE_INFINITY) return 'number:-Infinity';
    if (Object.is(value, -0)) return 'number:-0';
    return `number:${value}`;
  }
  if (typeof value === 'string') return `string:${JSON.stringify(value)}`;
  return `boolean:${value}`;
};

const compareNumbers = (left: number, right: number): number => {
  const leftFinite = isFiniteNumber(left);
  const rightFinite = isFiniteNumber(right);
  if (leftFinite !== rightFinite) return leftFinite ? 1 : -1;
  if (!leftFinite && !rightFinite) return 0;
  if (left === right) return 0;
  return left > right ? 1 : -1;
};

const compareStrings = (left: string, right: string): number => {
  if (left === right) return 0;
  return left > right ? 1 : -1;
};

const responseFingerprint = (response: LiveResponse): string => JSON.stringify([
  response.classId,
  response.responseType,
  valueFingerprint(response.value),
]);

const compareResponseVersion = (left: LiveResponse, right: LiveResponse): number => {
  return compareNumbers(left.updatedAt, right.updatedAt)
    || compareNumbers(left.submittedAt, right.submittedAt)
    || compareStrings(left.id, right.id)
    || compareStrings(left.clientNonce, right.clientNonce)
    || compareStrings(responseFingerprint(left), responseFingerprint(right));
};

const responseKey = (response: LiveResponse): string => `${response.participantUid}\u0000${response.stepId}`;

export function mergeLatestResponse(responses: LiveResponse[]): LiveResponse[] {
  const latest = new Map<string, LiveResponse>();

  for (const response of responses) {
    const key = responseKey(response);
    const current = latest.get(key);
    if (!current || compareResponseVersion(response, current) > 0) {
      latest.set(key, response);
    }
  }

  return [...latest.entries()]
    .sort(([leftKey], [rightKey]) => compareStrings(leftKey, rightKey))
    .map(([, response]) => response);
}

const emptyRouteCounts = (): Record<LiveRoute, number> => ({ M: 0, S: 0, C: 0 });

const emptyErrorCategoryCounts = (): Record<LiveErrorCategory, number> => ({
  Conceptual: 0,
  Algebraic: 0,
  Logical: 0,
  'Missing condition': 0,
});

const isErrorCategory = (value: string): value is LiveErrorCategory => (
  ERROR_CATEGORIES.includes(value as LiveErrorCategory)
);

const isRoute = (value: string): value is LiveRoute => ROUTES.includes(value as LiveRoute);

const PUBLIC_CHOICE_KEY_PATTERN = /^[A-Za-z0-9]+(?:[._:/-][A-Za-z0-9]+)*$/;
const PRIVATE_CHOICE_KEY_PATTERN = /(student|participant|uid|user)/i;

const isPublicChoiceKey = (value: string): boolean => (
  value.length > 0
  && value.length <= 24
  && PUBLIC_CHOICE_KEY_PATTERN.test(value)
  && !PRIVATE_CHOICE_KEY_PATTERN.test(value)
);

export function aggregateLiveResponses(
  responses: LiveResponse[],
  stepId: string,
): LivePublicStats {
  const selected = mergeLatestResponse(responses).filter((response) => response.stepId === stepId);
  const routeCounts = emptyRouteCounts();
  const errorCategoryCounts = emptyErrorCategoryCounts();
  const choiceCounts: Record<string, number> = {};
  let hintUseCount = 0;
  let updatedAt: number | undefined;

  for (const response of selected) {
    if (isFiniteNumber(response.updatedAt)) {
      updatedAt = updatedAt === undefined ? response.updatedAt : Math.max(updatedAt, response.updatedAt);
    }

    const stringValue = String(response.value);
    if (stepId === 'ai-error-w01' && isErrorCategory(stringValue)) {
      errorCategoryCounts[stringValue] += 1;
    }

    if (response.responseType === 'route') {
      if (isRoute(stringValue)) routeCounts[stringValue] += 1;
    } else if (
      (response.responseType === 'choice' || response.responseType === 'boolean')
      && !(stepId === 'ai-error-w01' && isErrorCategory(stringValue))
    ) {
      const isCountableValue = typeof response.value !== 'number' || Number.isFinite(response.value);
      if (isCountableValue && isPublicChoiceKey(stringValue)) {
        choiceCounts[stringValue] = (choiceCounts[stringValue] ?? 0) + 1;
      }
    } else if (response.responseType === 'hint') {
      hintUseCount += 1;
    }
  }

  return {
    stepId,
    participantCount: selected.length,
    submittedCount: selected.length,
    choiceCounts,
    routeCounts,
    errorCategoryCounts,
    hintUseCount,
    updatedAt: updatedAt ?? 0,
  };
}

export function toPublicStats(input: LivePublicStats): LivePublicStats {
  const choiceCounts: Record<string, number> = {};
  for (const [key, value] of Object.entries(input.choiceCounts ?? {})) {
    if (isPublicChoiceKey(key) && typeof value === 'number' && Number.isFinite(value)) {
      choiceCounts[key] = value;
    }
  }

  const routeCounts = emptyRouteCounts();
  for (const route of ROUTES) {
    const value = input.routeCounts?.[route];
    if (typeof value === 'number' && Number.isFinite(value)) routeCounts[route] = value;
  }

  const errorCategoryCounts = emptyErrorCategoryCounts();
  for (const category of ERROR_CATEGORIES) {
    const value = input.errorCategoryCounts?.[category];
    if (typeof value === 'number' && Number.isFinite(value)) errorCategoryCounts[category] = value;
  }

  return {
    stepId: input.stepId,
    participantCount: input.participantCount,
    submittedCount: input.submittedCount,
    choiceCounts,
    routeCounts,
    errorCategoryCounts,
    hintUseCount: input.hintUseCount,
    updatedAt: input.updatedAt,
  };
}
