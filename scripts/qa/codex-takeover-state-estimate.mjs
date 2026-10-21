import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { reduceLessonSession } from '../../lib/lesson/runtime.js';

// Read-only continuation of the actual N150 capacity failure. Estimate only; not HTTP proof.
const root = resolve(import.meta.dirname, '../..');
const prior = JSON.parse(await readFile(join(root, 'tasks/codex-takeover-e2e-state-cap-red.json'), 'utf8'));
const d1 = join(prior.persistence, 'd1');
const file = (await readdir(d1, { recursive: true })).find(file => /(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(file));
const database = new DatabaseSync(join(d1, file), { readOnly: true });
const row = database.prepare("SELECT s.*,p.data FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id WHERE s.status='active'").get();
let state = JSON.parse(row.state); state.package = JSON.parse(row.data); state.eventCache = {}; const teacher = { role: 'teacher', id: state.hostId };
const learners = Object.keys(state.roster); assert.equal(learners.length, 150); const points = [];
let serial = 0;
function send(type, payload = {}, actor = teacher) {
  const result = reduceLessonSession(state, { type, payload, eventId: 'estimate-' + ++serial, activityId: state.timeline.currentActivityId, round: state.round, revision: state.revision }, { actor, now: state.clock.lastNow + 1 });
  assert.equal(result.result.ok, true, type + ':' + result.result.code); state = result.state; state.eventCache = {}; return result;
}
function measure(activityId) {
  const raw = structuredClone(state); delete raw.package;
  const candidate = structuredClone(raw);
  for (const passport of Object.values(candidate.passports || {})) for (const sub of passport.submissions || []) delete sub.answer;
  for (const [key, reward] of Object.entries(candidate.rewardLedger || {})) if (reward.amount === 0) delete candidate.rewardLedger[key];
  points.push({ activityId, rawBytes: Buffer.byteLength(JSON.stringify(raw)), normalizedBytes: Buffer.byteLength(JSON.stringify(candidate)), submissions: Object.keys(state.submissions).length, fields: Object.entries(candidate).map(([key, value]) => ({ key, bytes: Buffer.byteLength(JSON.stringify(value)) })).sort((a, b) => b.bytes - a.bytes).slice(0, 8) });
}
function individual(activityId) {
  while (state.timeline.currentActivityId !== activityId) send('NEXT');
  const activity = state.package.activities.find(activity => activity.id === activityId);
  const tasks = state.package.tasks.filter(task => activity.taskIds.includes(task.id) && task.participation === 'individual' && ['shared', 'core'].includes(task.branch) && task.type !== 'reflection');
  for (const id of learners) {
    const actor = { role: 'student', id };
    if (['recheck', 'exit'].includes(activity.phase)) send('INTEGRITY', { confirmed: true, usedAI: false }, actor);
    for (const task of tasks) {
      if (state.passports[id].submissions.some(sub => sub.taskId === task.id)) continue;
      const answer = task.type === 'closed' ? task.evaluation.answerKey : 'n là chỉ số; u_n là giá trị. 4,7,10; w_n=3n+1; w_1=4; w_n=w_(n-1)+3.';
      const posted = send('SUBMIT', { taskId: task.id, answer }, actor);
      if (posted.result.pending) send('ASSESS', { submissionId: posted.result.submissionId, criteriaMet: true });
    }
  }
  measure(activityId);
}
try {
  measure('actual-act-pre-cap'); individual('act-pre'); individual('act-form-18');
  while (state.timeline.currentActivityId !== 'act-form-19') send('NEXT');
  const groupTask = state.package.tasks.find(task => task.id === 'task-form-four-rep');
  for (const id of learners) { const actor = { role: 'student', id }; send('SAVE_DRAFT', { taskId: groupTask.id, answer: 'Nháp riêng QA' }, actor); send('GROUP_CONTRIBUTE', { taskId: groupTask.id, text: 'Ý kiến riêng QA' }, actor); }
  for (const group of state.groups['act-form-19'].groups) {
    const proposer = { role: 'student', id: group.memberIds[0] };
    send('GROUP_PROPOSE', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalId: 'estimate-proposal-' + serial }, proposer);
    const hash = state.groups['act-form-19'].groups.find(item => item.id === group.id).proposal.hash;
    for (const id of group.memberIds.slice(1, Math.floor(group.memberIds.length / 2) + 1)) send('GROUP_VOTE', { taskId: groupTask.id, proposalHash: hash }, { role: 'student', id });
    send('GROUP_SUBMIT', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalHash: hash }, proposer);
  }
  measure('act-form-19'); individual('act-prac'); individual('act-recheck'); individual('act-exit'); send('CONCLUDE'); measure('concluded');
  const result = { result: 'ESTIMATE_ONLY', input: 'actual D1 N150 STATE_TOO_LARGE snapshot, opened read-only', commands: serial, learners: 150, points, note: 'Reducer continuation; normalized estimate deletes duplicate passport answers and zero-amount ledger; keeps open-assessment answers for rollback compatibility. Must rerun compiled Worker HTTP after implementation.' };
  await writeFile(join(root, 'tasks/codex-takeover-state-estimate.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ result: result.result, commands: serial, points: points.map(({ activityId, rawBytes, normalizedBytes, submissions }) => ({ activityId, rawBytes, normalizedBytes, submissions })) }));
} finally { database.close(); }
