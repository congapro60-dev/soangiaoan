import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createDirector, pilotDraft } from '../lib/lesson/director.js';
import { hashPackage } from '../lib/lesson/schema.js';

const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url)));

test('pilot director is deterministic and returns review reasons and alternatives', () => {
  const a = pilotDraft({ package: pkg, seed: 7 });
  const b = pilotDraft({ package: pkg, seed: 7 });
  assert.deepEqual(a, b);
  assert.equal(a.status, 'draft');
  assert.ok(a.reasonCodes.includes('SOURCE_REVIEW_REQUIRED'));
  assert.ok(a.alternatives.length > 0);
  assert.ok(a.uncertainties.includes('sourceRefs'));
  assert.equal(a.confidence, 0);
});

test('director refuses approved output while sources need review', () => {
  const result = createDirector().approved({ package: pkg, seed: 3 });
  assert.equal(result.approved, false);
  assert.equal(result.status, 'draft');
  assert.ok(result.reasonCodes.includes('APPROVAL_REFUSED_UNVERIFIED_SOURCE'));
});

test('director can approve a verified package without AI calls', () => {
  const verified = structuredClone(pkg);
  verified.rowId = 'row-verified';
  verified.sourceRefs = verified.sourceRefs.map((ref) => ({ ...ref, verification: 'verified' }));
  const packageContent = { ...verified };
  delete packageContent.rowId;
  verified.contentHash = hashPackage(packageContent);
  const result = createDirector().approved({ package: verified, seed: 3 });
  assert.equal(result.approved, true);
  assert.equal(result.plan.status, 'approved');
});

test('director chooses a deterministic compatible rule and participation from task characteristics', () => {
  const result = pilotDraft({ package: pkg, rule: 'duel', participation: 'individual', seed: 3 });
  assert.equal(result.plan.rule, 'campaign');
  assert.equal(result.plan.participation, 'group');
  assert.ok(result.reasonCodes.includes('REQUESTED_RULE_OVERRIDDEN_INCOMPATIBLE'));
  assert.ok(result.reasonCodes.includes('REQUESTED_PARTICIPATION_OVERRIDDEN_INCOMPATIBLE'));
});
