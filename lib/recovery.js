export const HINT_TIERS = Object.freeze(['none', 'nudge', 'method', 'guided']);
export const RECOVERY_STATES = Object.freeze(['draft', 'active', 'teacher-help', 'broken-question', 'abandoned', 'complete']);
export const PENALTY_CAP = 3;

export function draftKey(participant, round, questionRevision) { return `${participant}:${round}:${questionRevision}`; }
export function createRecovery({participant, round, questionRevision = 0, phase = 'middle'} = {}) {
  return {participant, round, questionRevision, phase, state: 'active', hintTier: 'none', penalty: 0, pause: {numerator: 0, denominator: 1}, draft: {key: draftKey(participant, round, questionRevision), answer: null}};
}
export function setDraft(state, answer, revision = state.questionRevision) {
  if (revision !== state.questionRevision) throw new Error('DRAFT_REVISION_MISMATCH');
  return {...state, draft: {key: draftKey(state.participant, state.round, revision), answer}};
}
export function requestHint(state, tier) {
  if (!HINT_TIERS.includes(tier) || HINT_TIERS.indexOf(tier) < HINT_TIERS.indexOf(state.hintTier)) throw new Error('INVALID_HINT_TIER');
  return {...state, hintTier: tier};
}
export function downgradeQuestion(state, {reason = 'too-hard'} = {}) {
  return {...state, questionRevision: state.questionRevision + 1, state: 'active', hintTier: 'none', draft: {key: draftKey(state.participant, state.round, state.questionRevision + 1), answer: null}, downgrade: {reason, from: state.questionRevision, to: state.questionRevision + 1}};
}
export function requestTeacherHelp(state) { return {...state, state: 'teacher-help'}; }
export function reportBrokenQuestion(state) { return {...state, state: 'broken-question'}; }
export function abandon(state, phase = state.phase) { if (phase === 'start' || phase === 'end') throw new Error('GUIDED_GATE_REQUIRED'); return {...state, phase, state: 'abandoned'}; }
export function applyPenalty(state, amount = 1) { return {...state, penalty: Math.min(PENALTY_CAP, state.penalty + Math.max(0, amount))}; }
function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Invariant: Pause composition is additive and immutable.
 * Preserves the canonical rational fraction (numerator/denominator in lowest terms, denominator > 0)
 * and accumulates elapsed interval duration when openedAt/resumeAt or duration is supplied.
 * Given initial state pause P0 = {numerator: n0, denominator: d0},
 * composing P = {numerator: n, denominator: d} yields P_next = (n0/d0 + n/d) reduced by gcd.
 * If openedAt/resumeAt durations are provided, delta = max(0, resumeAt - openedAt) is additively
 * composed into the rational accumulator (as delta / 1) and tracked in pause.duration.
 */
export function composePause(state, pause = {}) {
  const current = state.pause || {numerator: 0, denominator: 1};
  const curN = current.numerator ?? 0;
  const curD = current.denominator ?? 1;

  const durationDelta = pause.duration != null
    ? Math.max(0, pause.duration)
    : (pause.openedAt != null && pause.resumeAt != null
        ? Math.max(0, pause.resumeAt - pause.openedAt)
        : 0);

  let incN = pause.numerator;
  let incD = pause.denominator ?? 1;

  if (incN == null && durationDelta > 0) {
    incN = durationDelta;
    incD = 1;
  } else if (incN != null && durationDelta > 0) {
    incN = incN * 1 + durationDelta * incD;
  } else if (incN == null) {
    incN = 0;
    incD = 1;
  }

  let rawN = curN * incD + incN * curD;
  let rawD = curD * incD;
  if (rawD < 0) {
    rawN = -rawN;
    rawD = -rawD;
  }
  const g = gcd(rawN, rawD);
  const nextPause = {
    ...current,
    numerator: rawN / g,
    denominator: rawD / g
  };

  if (durationDelta > 0 || current.duration != null) {
    nextPause.duration = (current.duration ?? 0) + durationDelta;
  }

  return {...state, pause: nextPause};
}
