import {hash} from './roster.js';
import {createCampaign, numericAnswer} from '../campaign.js';
import {contextQuestion, checkContext} from '../context-questions.js';
import {checkPuzzle} from '../challenges.js';

export function curriculumPlan(input = {}, seed = 0) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_CURRICULUM');
  for (const key of Object.keys(input)) if (!['grade', 'topics', 'minLevel', 'maxLevel', 'categories', 'formats'].includes(key)) throw new Error('INVALID_CURRICULUM');
  for (const key of ['topics', 'categories', 'formats']) if (Object.hasOwn(input, key) && !Array.isArray(input[key])) throw new Error('INVALID_CURRICULUM');
  for (const key of ['grade', 'minLevel', 'maxLevel']) if (Object.hasOwn(input, key) && !Number.isInteger(input[key])) throw new Error('INVALID_CURRICULUM');
  return createCampaign(input, seed);
}

export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  throw new Error('INVALID_PAYLOAD');
}

export function issueChallenge({seed, serial, unitId, action, gameNow, context = '', round = 1, curriculum, questionKey, legacyQuestion}) {
  const key = questionKey ?? `${serial}:${unitId}:${context}:${round}`;
  const n = hash(`${seed}:${key}`);
  if (!curriculum?.plan?.length) throw new Error('CURRICULUM_REQUIRED');
  const q = legacyQuestion ? structuredClone(legacyQuestion) : contextQuestion(curriculum.plan[n % curriculum.plan.length], n);
  const id = `challenge-${round}-${serial}`;
  return {...q, id, unitId, action: structuredClone(action), context, round, issuedAt: gameNow, deadline: gameNow + 60000,
    prompt: q.question, format: q.expected ? 'puzzle' : q.format ?? 'short', used: false};
}

export function verifyChallenge(challenge, {unitId, action, answer, gameNow, round, context}) {
  if (!challenge || challenge.unitId !== unitId || challenge.round !== round || challenge.context !== context || canonical(challenge.action) !== canonical(action)) throw new Error('CHALLENGE_MISMATCH');
  if (challenge.used) throw new Error('CHALLENGE_USED');
  if (gameNow < challenge.issuedAt || gameNow >= challenge.deadline) throw new Error('CHALLENGE_EXPIRED');
  if (challenge.format === 'puzzle') return !!answer && typeof answer === 'object' && !Array.isArray(answer) && checkPuzzle({...challenge, widget: challenge.widget ?? {}}, answer);
  if (!['string', 'number'].includes(typeof answer)) return false;
  return checkContext(challenge, answer) ?? numericAnswer(answer, challenge.answer);
}

export function publicChallenge(challenge) {
  if (!challenge) return null;
  const keys = ['id', 'prompt', 'format', 'deadline', 'options', 'statements', 'topic', 'topicName', 'category', 'categoryName', 'level', 'points', 'maxAttempts', 'source', 'fields', 'widget', 'title'];
  return {...Object.fromEntries(keys.filter(k => Object.hasOwn(challenge, k)).map(k => [k, structuredClone(challenge[k])])), action: structuredClone(challenge.action), used: Boolean(challenge.used)};
}
