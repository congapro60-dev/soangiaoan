import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as values from '../lib/lesson/values.js';

const teacher = { role: 'teacher', id: 'teacher' };
function session() {
  return { hostId: 'teacher', roster: { a: { name: 'PRIVATE_A', present: true }, b: { name: 'PRIVATE_B', present: true }, c: { name: 'PRIVATE_C', present: false } },
    package: { objectives: [{ id: 'o1', statement: 'Tự kiểm chứng' }], tasks: [{ id: 'r', participation: 'individual', type: 'closed', objectiveIds: ['o1'] }, { id: 'x', participation: 'individual', type: 'open', objectiveIds: ['o1'] }, { id: 'reflection', type: 'reflection', participation: 'individual', objectiveIds: ['o1'] }],
      evidenceRules: [{ taskId: 'r', kind: 'individual_recheck', objectiveIds: ['o1'], individual: true, countsForMastery: true }, { taskId: 'x', kind: 'exit', objectiveIds: ['o1'], individual: true, countsForMastery: true }], masteryPolicy: { individualEvidencePerObjectiveMin: 2 } },
    passports: { a: { submissions: [{ taskId: 'r', ok: true, assessmentStatus: 'assessed', at: 1 }, { taskId: 'x', ok: true, assessmentStatus: 'assessed', at: 2 }], supportHistory: [], revealedTasks: {} },
      b: { submissions: [{ taskId: 'r', ok: true, assessmentStatus: 'assessed', at: 1 }, { taskId: 'x', assessmentStatus: 'pending', at: 2 }], supportHistory: [{ taskId: 'r' }], revealedTasks: {} } },
    groups: { act: { groups: [{ memberIds: ['a', 'b'], contributions: [{ learnerId: 'a', text: 'PRIVATE_WORK', taskId: 'g', at: 1 }] }] } },
    valueReflections: { a: { reflection: 'Trước em nghĩ…\nGiờ em nghĩ…', submittedAt: 2 } },
    lessonIntegrations: ['real-world'], gameWallets: { a: { earned: 99999 } }, valuesBadges: [] };
}

test('school frameworks keep official names and exact category counts', () => {
  assert.deepEqual(values.EDUFIT_VALUES.map(v => v.name), ['Integrity', 'Đam mê', 'Hào phóng', 'Học tập suốt đời']);
  assert.deepEqual(values.GLOBAL_ISSUES.map(v => v.name), ['công bằng xã hội và bình đẳng', 'bản sắc và sự đa dạng', 'toàn cầu hóa và sự phụ thuộc lẫn nhau', 'phát triển bền vững', 'hòa bình và xung đột', 'quyền con người']);
  assert.equal(values.GLOBAL_SKILLS.length, 5); assert.equal(values.GLOBAL_ATTITUDES.length, 2);
  assert.deepEqual(values.DIGITAL_TOPICS.map(v => v.name), ['Cân bằng truyền thông & hạnh phúc', 'Quyền riêng tư & an ninh', 'Dấu chân số & danh tính', 'Quan hệ & giao tiếp', 'Bắt nạt mạng, drama số & ngôn từ thù ghét', 'Hiểu biết tin tức & truyền thông']);
  assert.equal(values.WELLBEING_COMPONENTS.length, 5);
  assert.ok(values.EDUFIT_VALUES.every(Object.isFrozen));
});

test('lesson integrations accept zero to two known IDs and reject forged values', () => {
  assert.deepEqual(values.sanitizeLessonIntegrations(['real-world', 'ai']), ['real-world', 'ai']);
  assert.deepEqual(values.sanitizeLessonIntegrations([]), []);
  for (const bad of [null, ['real-world', 'ai', 'global-rights'], ['ai', 'ai'], ['unknown'], 'ai', [{ id: 'ai' }], ['__proto__']]) assert.throws(() => values.sanitizeLessonIntegrations(bad), /INVALID_INTEGRATIONS/);
});

test('reflection templates cover Visible Thinking, AI disclosure, Kolb and verification', () => {
  for (const id of ['before-now', 'see-think-wonder', 'ai-disclosure', 'real-world-kolb', 'cross-perspective', 'check-news']) {
    assert.ok(values.REFLECTION_PROMPTS[id].length);
    assert.ok(values.REFLECTION_PROMPTS[id].every(prompt => typeof prompt === 'string' && prompt.length));
  }
  assert.deepEqual(values.AI_POLICIES, ['off', 'hints', 'check']);
});

test('AI disclosure stays truthful with policy off, records own changes and bounds reflection input', () => {
  const input = { integrity: true, usedAI: true, aiHelp: ' AI gợi cách kiểm tra ', ownChanges: ' Em sửa phép tính ', reflection: ' Trước em nghĩ A\nGiờ em nghĩ B ' };
  const clean = values.sanitizeValueReflection(input, 'off');
  assert.equal(clean.usedAI, true); assert.equal(clean.aiHelp, 'AI gợi cách kiểm tra');
  assert.equal(clean.ownChanges, 'Em sửa phép tính'); assert.equal(clean.integrity, true);
  assert.equal(input.aiHelp, ' AI gợi cách kiểm tra ');
  for (const bad of [{ ...input, usedAI: 'true' }, { ...input, usedAI: false }, { ...input, aiHelp: '' }, { ...input, ownChanges: '' }, { ...input, reflection: 'a\nb\nc' }, { ...input, reflection: 'a\rb\rc' }, { ...input, reflection: 'a'.repeat(1001) }, { ...input, score: 999 }, null]) assert.throws(() => values.sanitizeValueReflection(bad, 'off'), /INVALID_REFLECTION/);
  assert.throws(() => values.sanitizeValueReflection(input, 'anything'), /INVALID_AI_POLICY/);
});

test('observed value badges require an authorized teacher, own roster target and evidence', () => {
  const state = session(), before = JSON.stringify(state), input = { learnerId: 'a', valueId: 'integrity', evidenceId: 'observation-1', reason: 'Em tự khai khi dùng gợi ý.', now: 10 };
  const badge = values.grantValueBadge(state, input, teacher);
  assert.deepEqual(Object.keys(badge).sort(), ['awardedAt', 'awardedBy', 'evidenceId', 'learnerId', 'reason', 'valueId']);
  assert.equal(badge.awardedBy, 'teacher'); assert.equal(badge.awardedAt, 10);
  assert.equal(JSON.stringify(state), before);
  for (const actor of [null, { role: 'student', id: 'a' }, { role: 'teacher', id: 'other' }]) assert.throws(() => values.grantValueBadge(state, input, actor), /FORBIDDEN/);
  for (const bad of [{ ...input, learnerId: 'unknown' }, { ...input, learnerId: { toString: () => 'a' } }, { ...input, reason: '' }, { ...input, evidenceId: '' }, { ...input, valueId: 'rank' }, { ...input, now: NaN }, { ...input, points: 100 }]) assert.throws(() => values.grantValueBadge(state, bad, teacher), /INVALID_VALUE_BADGE/);
  assert.equal(values.grantValueBadge(state, input, { role: 'teacher', id: 'cohost', authorizedHostId: 'teacher' }).awardedBy, 'cohost');
});

test('badge revocation preserves the award and requires a recorded teacher reason', () => {
  const state = session(), badge = values.grantValueBadge(state, { learnerId: 'a', valueId: 'generosity', evidenceId: 'obs', reason: 'Em góp ý tử tế.', now: 5 }, teacher);
  const revoked = values.revokeValueBadge(state, badge, { reason: 'Nhầm người nhận.', now: 9 }, teacher);
  assert.equal(revoked.revokedBy, 'teacher'); assert.equal(revoked.revokedAt, 9); assert.equal(revoked.revocationReason, 'Nhầm người nhận.');
  assert.equal(badge.revokedAt, undefined);
  assert.throws(() => values.revokeValueBadge(state, badge, { reason: '', now: 9 }, teacher), /INVALID_VALUE_BADGE/);
  assert.throws(() => values.revokeValueBadge(state, badge, { reason: 'Bad', now: 1 }, teacher), /INVALID_VALUE_BADGE/);
});

test('quality report uses current objectives and own assessed evidence, never game scores or names', () => {
  const state = session(), before = JSON.stringify(state);
  const report = values.buildLessonQualityReport(state, teacher);
  assert.equal(report.learners, 2); assert.equal(report.objectives[0].withEvidence, 2);
  assert.equal(report.objectives[0].independentMastery, 1); assert.equal(report.objectives[0].supported, 1);
  assert.equal(report.objectives[0].evidenceRate, 1); assert.equal(report.pending, 1);
  assert.equal(report.groupContribution.learners, 1); assert.equal(report.reflection.completed, 1);
  assert.equal(report.reflection.total, 2); assert.equal(report.kind, 'observed_evidence_summary');
  assert.ok(report.criteria.every(c => ['observed', 'missing'].includes(c.status)));
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_|99999|Danielson|rank|score|learnerId/);
  assert.equal(JSON.stringify(state), before);
  assert.throws(() => values.buildLessonQualityReport(state, { role: 'student', id: 'a' }), /FORBIDDEN/);
});

test('quality report marks missing observations instead of inventing quality when no learner or evidence exists', () => {
  const state = session(); state.roster = {}; state.passports = {}; state.groups = {}; state.valueReflections = {};
  const report = values.buildLessonQualityReport(state, teacher);
  assert.equal(report.learners, 0); assert.equal(report.objectives[0].evidenceRate, null);
  assert.equal(report.reflection.rate, null); assert.equal(report.groupContribution.rate, null);
  assert.ok(report.criteria.some(c => c.status === 'missing'));
});

test('reflection UI keeps disclosure possible when AI is forbidden and requires the learner integrity choice', async () => {
  const source = await readFile(new URL('../components/lesson/ValueReflection.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports = {}; vm.runInNewContext(js, { exports, require(name) { assert.equal(name, 'react'); return { ...React, default: React }; } });
  const html = renderToStaticMarkup(React.createElement(exports.ValueReflection, { policy: 'off', value: { integrity: false, usedAI: true, aiHelp: '', ownChanges: '', reflection: '' }, onChange() {}, onSubmit() {} }));
  assert.match(html, /không dùng AI/); assert.match(html, /AI giúp gì/); assert.match(html, /em sửa gì/);
  assert.match(html, /Em tự làm/); assert.match(html, /textarea/); assert.match(html, /disabled/);
  assert.doesNotMatch(source, /fetch\(|node:|generation-provider|answerKey/);
});
