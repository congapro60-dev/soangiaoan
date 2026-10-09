import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  canonicalize,
  hashPackage,
  createPackageDraft,
  TASK_TYPES,
  CHECKER_REGISTRY
} from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';

const pilotJson = await readFile(
  new URL('../content/lessons/g11-sequences-p1.json', import.meta.url),
  'utf8'
);
const basePilot = JSON.parse(pilotJson);

test('schema canonicalize sorts keys recursively and preserves arrays with no whitespace', () => {
  const unordered = {
    z: 1,
    b: [{ d: 4, c: 3 }, 2],
    a: { y: 'bar', x: 'foo' }
  };
  const canonical = canonicalize(unordered);
  assert.equal(
    canonical,
    '{"a":{"x":"foo","y":"bar"},"b":[{"c":3,"d":4},2],"z":1}'
  );
  assert.doesNotMatch(canonical, /\s/);
});

test('hashPackage computes sha256 excluding contentHash deterministically', () => {
  const pkg1 = { ...basePilot, contentHash: 'arbitrary_hash' };
  const pkg2 = { ...basePilot };
  delete pkg2.contentHash;
  const pkg3 = { ...basePilot, contentHash: basePilot.contentHash };

  const hash1 = hashPackage(pkg1);
  const hash2 = hashPackage(pkg2);
  const hash3 = hashPackage(pkg3);

  assert.equal(hash1, hash2);
  assert.equal(hash1, hash3);
  assert.equal(hash1, basePilot.contentHash);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test('createPackageDraft returns a valid draft structure with auto-generated hash', () => {
  const draft = createPackageDraft({ id: 'pkg-draft-test' });
  assert.equal(draft.schemaVersion, '1.0.0');
  assert.equal(draft.id, 'pkg-draft-test');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.contentHash, hashPackage(draft));
  assert.deepEqual(TASK_TYPES, ['closed', 'open', 'reflection']);
});

test('CHECKER_REGISTRY numeric_exact accepts Vietnamese decimal comma and typographic minus', () => {
  const checker = CHECKER_REGISTRY.numeric_exact;
  assert.deepEqual(checker('1,5', { evaluation: { answerKey: 1.5 } }), { ok: true });
  assert.deepEqual(checker('-0,5', { evaluation: { answerKey: -0.5 } }), { ok: true });
  assert.deepEqual(checker('−3', { evaluation: { answerKey: -3 } }), { ok: true });
  assert.deepEqual(checker('−1/2', { evaluation: { answerKey: -0.5 } }), { ok: true });
  assert.deepEqual(checker('–3', { evaluation: { answerKey: -3 } }), { ok: true });
  // a comma is only a decimal mark between digits: lists and thousands grouping stay rejected
  assert.deepEqual(checker('1,5,2', { evaluation: { answerKey: 1.52 } }), { ok: false });
  assert.deepEqual(checker('1,', { evaluation: { answerKey: 1 } }), { ok: false });
  assert.deepEqual(checker('1,5', { evaluation: { answerKey: 15 } }), { ok: false });
});

test('CHECKER_REGISTRY numeric_exact handles numbers, strict decimals, fractions, tolerances and fails invalid expressions safely', () => {
  const checker = CHECKER_REGISTRY.numeric_exact;
  const task = { evaluation: { answerKey: 30 } };

  // valid cases
  assert.deepEqual(checker(30, task), { ok: true });
  assert.deepEqual(checker('30', task), { ok: true });
  assert.deepEqual(checker('30.0', task), { ok: true });
  assert.deepEqual(checker('60/2', task), { ok: true });
  assert.deepEqual(checker(30 + 1e-10, task), { ok: true }); // within 1e-9 tolerance

  // tolerance boundary failure
  assert.deepEqual(checker(30.001, task), { ok: false });

  // expressions rejected
  assert.deepEqual(checker('18+12', task), { ok: false });
  assert.deepEqual(checker('2*15', task), { ok: false });

  // numeric_exact answerKey must be finite number only (not string)
  assert.deepEqual(checker(30, { evaluation: { answerKey: '30' } }), { ok: false });

  // malformed inputs return { ok: false } without throwing
  assert.deepEqual(checker(null, task), { ok: false });
  assert.deepEqual(checker(undefined, task), { ok: false });
  assert.deepEqual(checker(NaN, task), { ok: false });
  assert.deepEqual(checker('invalid-text', task), { ok: false });
  assert.deepEqual(checker('10/0', task), { ok: false });
  assert.deepEqual(checker({}, task), { ok: false });
});

test('numeric_exact documents the Vietnamese thousands ambiguity and keeps accentless keywords strict', () => {
  const checker = CHECKER_REGISTRY.numeric_exact;
  // `3.000` is interpreted as decimal 3; the UI tells teachers not to use it for thousands.
  assert.deepEqual(checker('3.000', { evaluation: { answerKey: 3 } }), { ok: true });
  assert.deepEqual(checker('3.000', { evaluation: { answerKey: 3000 } }), { ok: false });
  const text = CHECKER_REGISTRY.text_normalized_exact;
  assert.deepEqual(text('huu han', { evaluation: { answerKey: 'hữu hạn' } }), { ok: false });
});

test('CHECKER_REGISTRY text_normalized_exact normalizes casing, Unicode NFC and whitespace safely', () => {
  const checker = CHECKER_REGISTRY.text_normalized_exact;
  const task = { evaluation: { answerKey: 'dãy số' } };

  assert.deepEqual(checker('  DÃY   SỐ  ', task), { ok: true });
  assert.deepEqual(checker('dãy số', task), { ok: true });
  assert.deepEqual(checker('Dãy Số', task), { ok: true });
  assert.deepEqual(checker('dãy   số', task), { ok: true });
  assert.deepEqual(checker('day so', task), { ok: false });

  // malformed inputs return { ok: false } without throwing
  assert.deepEqual(checker(null, task), { ok: false });
  assert.deepEqual(checker(123, task), { ok: false });
  assert.deepEqual(checker({}, task), { ok: false });
});

test('CHECKER_REGISTRY choice_exact validates valid membership and rejects invalid choices safely', () => {
  const checker = CHECKER_REGISTRY.choice_exact;
  const task = {
    evaluation: {
      options: ['opt_A', 'opt_B', 'opt_C'],
      answerKey: 'opt_B'
    }
  };

  assert.deepEqual(checker('opt_B', task), { ok: true });
  assert.deepEqual(checker('opt_A', task), { ok: false });
  assert.deepEqual(checker('opt_unknown', task), { ok: false });

  // Malformed choice task without valid options must be rejected
  assert.deepEqual(checker('x', { evaluation: { answerKey: 'x' } }), { ok: false });
  assert.deepEqual(checker('x', { evaluation: { options: [], answerKey: 'x' } }), { ok: false });

  // malformed inputs return { ok: false } without throwing
  assert.deepEqual(checker(null, task), { ok: false });
  assert.deepEqual(checker(['opt_B'], task), { ok: false });
  assert.deepEqual(checker(1, task), { ok: false });
});

test('CHECKER_REGISTRY multi_choice_exact validates sets and rejects extras or duplicates safely', () => {
  const checker = CHECKER_REGISTRY.multi_choice_exact;
  const task = {
    evaluation: {
      options: ['c1', 'c2', 'c3', 'c4'],
      answerKey: ['c1', 'c3']
    }
  };

  assert.deepEqual(checker(['c1', 'c3'], task), { ok: true });
  assert.deepEqual(checker(['c3', 'c1'], task), { ok: true }); // set order invariant
  assert.deepEqual(checker(['c1'], task), { ok: false }); // missing
  assert.deepEqual(checker(['c1', 'c2', 'c3'], task), { ok: false }); // extras
  assert.deepEqual(checker(['c1', 'c1', 'c3'], task), { ok: false }); // duplicate input rejected

  // Rejects duplicate or non-string key values
  assert.deepEqual(
    checker(['c1'], { evaluation: { options: ['c1'], answerKey: ['c1', 'c1'] } }),
    { ok: false }
  );
  assert.deepEqual(
    checker(['c1'], { evaluation: { options: ['c1'], answerKey: [1] } }),
    { ok: false }
  );

  // malformed inputs return { ok: false } without throwing
  assert.deepEqual(checker('c1', task), { ok: false });
  assert.deepEqual(checker(null, task), { ok: false });
  assert.deepEqual(checker([1, 3], task), { ok: false });
});

test('CHECKER_REGISTRY representation_match compares representations and card mappings safely', () => {
  const checker = CHECKER_REGISTRY.representation_match;
  const task = {
    evaluation: {
      answerKey: {
        rep_list: 'card_1',
        rep_explicit: 'card_2',
        rep_recurrence: 'card_3',
        rep_verbal: 'card_4'
      }
    }
  };

  assert.deepEqual(
    checker(
      {
        rep_list: 'card_1',
        rep_explicit: 'card_2',
        rep_recurrence: 'card_3',
        rep_verbal: 'card_4'
      },
      task
    ),
    { ok: true }
  );

  // mismatched value
  assert.deepEqual(
    checker(
      {
        rep_list: 'card_2',
        rep_explicit: 'card_1',
        rep_recurrence: 'card_3',
        rep_verbal: 'card_4'
      },
      task
    ),
    { ok: false }
  );

  // missing key
  assert.deepEqual(
    checker(
      {
        rep_list: 'card_1',
        rep_explicit: 'card_2'
      },
      task
    ),
    { ok: false }
  );

  // extra key
  assert.deepEqual(
    checker(
      {
        rep_list: 'card_1',
        rep_explicit: 'card_2',
        rep_recurrence: 'card_3',
        rep_verbal: 'card_4',
        rep_extra: 'card_5'
      },
      task
    ),
    { ok: false }
  );

  // Rejects non-string values or empty maps
  assert.deepEqual(
    checker({ r: 1 }, { evaluation: { answerKey: { r: 1 } } }),
    { ok: false }
  );
  assert.deepEqual(
    checker({}, { evaluation: { answerKey: {} } }),
    { ok: false }
  );

  // malformed inputs return { ok: false } without throwing
  assert.deepEqual(checker(null, task), { ok: false });
  assert.deepEqual(checker('card_1', task), { ok: false });
  assert.deepEqual(checker(['card_1'], task), { ok: false });
});

test('pilot lesson package g11-sequences-p1 validates successfully in draft mode', () => {
  const res = validateLessonPackage(basePilot, { mode: 'draft' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.errors, []);
  assert.equal(basePilot.status, 'needs_review');
});

test('pilot lesson package rejects publish mode due to unverified external sourceRefs (ERR_SOURCE_UNVERIFIED_ON_PUBLISH)', () => {
  const res = validateLessonPackage(basePilot, { mode: 'publish' });
  assert.equal(res.ok, false);
  const codes = res.errors.map((e) => e.code);
  assert.ok(codes.includes('ERR_SOURCE_UNVERIFIED_ON_PUBLISH'));
});

test('pilot asserts both finite and unbounded sequence interpretations', () => {
  const t11_18_tasks = basePilot.tasks.filter((t) =>
    t.objectiveIds.includes('obj-t11-18')
  );
  const sequenceTypes = new Set(t11_18_tasks.map((t) => t.sequenceType));
  assert.ok(sequenceTypes.has('finite'));
  assert.ok(sequenceTypes.has('infinite'));

  // Prompt checks
  const finiteTask = t11_18_tasks.find((t) => t.sequenceType === 'finite');
  assert.match(finiteTask.prompt, /25 hàng ghế|1 \\le n \\le 25/);
  const infiniteTask = t11_18_tasks.find((t) => t.sequenceType === 'infinite');
  assert.match(infiniteTask.prompt, /\\mathbb\{N\}\^\*|vô hạn/);
});

test('pilot asserts all four representations for T11.19: list, explicit formula, recurrence, verbal', () => {
  const repTask = basePilot.tasks.find((t) => t.id === 'task-form-four-rep');
  assert.ok(repTask, 'task-form-four-rep exists');
  assert.deepEqual(repTask.representations.sort(), [
    'explicit',
    'list',
    'recurrence',
    'verbal'
  ]);

  const keys = Object.keys(repTask.evaluation.answerKey);
  assert.ok(keys.includes('rep_list'));
  assert.ok(keys.includes('rep_explicit'));
  assert.ok(keys.includes('rep_recurrence'));
  assert.ok(keys.includes('rep_verbal'));
});

test('pilot asserts n vs u_n distinction and full scaffold H1..H4 in order', () => {
  const distTask = basePilot.tasks.find((t) => t.id === 'task-form-distinguish-n-un');
  assert.ok(distTask);
  assert.equal(distTask.isCore, true);
  assert.equal(distTask.requiresFullScaffold, true);

  const hints = distTask.hintIds.map((id) =>
    basePilot.hints.find((h) => h.id === id)
  );
  assert.equal(hints.length, 4);
  assert.deepEqual(
    hints.map((h) => h.tier),
    ['H1', 'H2', 'H3', 'H4']
  );
  assert.deepEqual(
    hints.map((h) => h.order),
    [1, 2, 3, 4]
  );
  hints.forEach((h) => {
    assert.equal(h.notAnswer, true);
    assert.deepEqual(h.penalty, { time: 0, score: 0, freeze: 0 });
  });
});

test('pilot asserts seat formula u1=18, u_n=18+2(n-1)=2n+16 (1<=n<=25), recurrence u1=18, u_n=u_{n-1}+2, u7=30, u25=66, and error hunt', () => {
  // Error hunt task
  const huntTask = basePilot.tasks.find((t) => t.id === 'task-prac-error-hunt');
  assert.ok(huntTask);
  assert.match(huntTask.prompt, /18 \+ 2n/);
  assert.equal(huntTask.evaluation.answerKey, 20); // 18 + 2(1) = 20 != 18

  // Core calculation task: asserts u7 = 30 and u25 = 66
  const coreTask = basePilot.tasks.find((t) => t.id === 'task-prac-core-calc');
  assert.ok(coreTask);
  assert.equal(coreTask.evaluation.answerKey, 'opt_u7_30_u25_66');
  assert.match(coreTask.prompt, /u_7/);
  assert.match(coreTask.prompt, /u_\{25\}/);
  assert.match(coreTask.supportRationale, /u_7 = 18 \+ 2\(7 - 1\) = 30/);
  assert.match(coreTask.supportRationale, /u_\{25\} = 18 \+ 2\(25 - 1\) = 66/);

  // Recheck T11.19 independently demonstrates all four representations on new sequence with rubric
  const recheckTask = basePilot.tasks.find((t) => t.id === 'task-recheck-19');
  assert.ok(recheckTask);
  assert.equal(recheckTask.type, 'open');
  assert.ok(Array.isArray(recheckTask.evaluation.rubric.criteria));
  assert.ok(recheckTask.evaluation.rubric.criteria.length >= 2);
  assert.match(recheckTask.prompt, /w_1 = 4/);
  assert.deepEqual(recheckTask.representations.sort(), ['explicit', 'list', 'recurrence', 'verbal']);

  // Recurrence task
  const suppTask = basePilot.tasks.find((t) => t.id === 'task-prac-support-tab');
  assert.ok(suppTask);
  assert.match(suppTask.prompt, /u_\{n-1\} \+ 2/);
  assert.equal(suppTask.evaluation.answerKey, 20);
});

test('pilot keeps practice differentiation and places the optional extension after recheck', () => {
  const pracAct = basePilot.activities.find((a) => a.id === 'act-prac');
  assert.ok(pracAct);
  assert.equal(pracAct.minutes, 8);

  const pracTasks = basePilot.tasks.filter((t) => pracAct.taskIds.includes(t.id));
  const branches = pracTasks.map((t) => t.branch);
  assert.ok(branches.includes('shared'));
  assert.ok(branches.includes('support'));
  assert.ok(branches.includes('core'));
  assert.ok(!branches.includes('extension'));

  // Shared task (3 min) + max(support: 5, core: 5, extension: 5) = 8 min
  const sharedMins = pracTasks
    .filter((t) => t.branch === 'shared')
    .reduce((s, t) => s + t.minutes, 0);
  const supportMins = pracTasks
    .filter((t) => t.branch === 'support')
    .reduce((s, t) => s + t.minutes, 0);
  const coreMins = pracTasks
    .filter((t) => t.branch === 'core')
    .reduce((s, t) => s + t.minutes, 0);
  const extAct = basePilot.activities.find((a) => a.id === 'act-extension');
  const extTask = basePilot.tasks.find((t) => extAct.taskIds.includes(t.id) && t.branch === 'extension');
  assert.ok(extAct);
  assert.equal(extAct.budgetRole, 'optional');
  assert.ok(basePilot.activities.indexOf(extAct) > basePilot.activities.findIndex((a) => a.phase === 'recheck'));
  assert.ok(extTask);
  const extMins = extTask.minutes;

  assert.equal(sharedMins, 3);
  assert.equal(supportMins, 5);
  assert.equal(coreMins, 5);
  assert.equal(extMins, 2);
  assert.equal(sharedMins + Math.max(supportMins, coreMins, extMins), pracAct.minutes);
});

test('pilot asserts evidence coverage, individual rechecks and strict mastery policy without group/map mastery', () => {
  for (const obj of basePilot.objectives) {
    const evs = basePilot.evidenceRules.filter((e) =>
      e.objectiveIds.includes(obj.id)
    );
    const individualCount = evs.filter((e) => e.individual).length;
    assert.ok(
      individualCount >= 2,
      `Objective ${obj.id} must have >= 2 individual records`
    );
    const hasRecheck = evs.some(
      (e) => e.kind === 'individual_recheck' && e.individual
    );
    assert.ok(
      hasRecheck,
      `Objective ${obj.id} must have individual_recheck evidence`
    );
  }

  // Mastery sources check
  const masteryEvs = basePilot.evidenceRules.filter((e) => e.countsForMastery);
  for (const ev of masteryEvs) {
    assert.equal(ev.individual, true, 'Mastery evidence must be individual');
    assert.ok(
      ['individual_recheck', 'exit'].includes(ev.kind),
      'Mastery source must be individual_recheck or exit'
    );
    assert.ok(
      !basePilot.masteryPolicy.forbiddenSources.includes(ev.kind),
      'Mastery evidence must not use forbidden source'
    );
  }

  // Group product evidence does not count for mastery
  const groupEv = basePilot.evidenceRules.find((e) => e.kind === 'group_product');
  assert.ok(groupEv);
  assert.equal(groupEv.individual, false);
  assert.equal(groupEv.countsForMastery, false);
});

// Mutated test cases for ALL exact error codes and review repro mutations
function mutatePilot(fn) {
  const clone = JSON.parse(JSON.stringify(basePilot));
  fn(clone);
  return clone;
}

test('validator detects ERR_PACKAGE_MUTABLE on contentHash mismatch or invalid version', () => {
  const mutated = mutatePilot((p) => {
    p.contentHash = 'corrupted_hash';
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_PACKAGE_MUTABLE'));

  const badVersion = mutatePilot((p) => {
    p.version = 'not-semver';
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(badVersion);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_PACKAGE_MUTABLE'));
});

test('validator detects ERR_PACKAGE_MUTABLE on unknown package fields', () => {
  const mutated = mutatePilot((p) => {
    p.unrecognized = true;
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_PACKAGE_MUTABLE'));
});

test('validator detects ERR_PACKAGE_MUTABLE on invalid package status', () => {
  const mutated = mutatePilot((p) => {
    p.status = 'banana';
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_PACKAGE_MUTABLE'));
});

test('validator detects ERR_TIME_BUDGET_MISMATCH on duration excess or budget miscalculation', () => {
  // Activity task minutes exceeding activity duration
  const mutatedTaskTime = mutatePilot((p) => {
    const task = p.tasks.find((t) => t.id === 'task-exp-predict');
    task.minutes = 10; // activity is only 3 min
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutatedTaskTime);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_TIME_BUDGET_MISMATCH'));

  // Core minutes mismatch
  const mutatedBudget = mutatePilot((p) => {
    p.budget.coreMinutes = 50; // sum is 36
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutatedBudget);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_TIME_BUDGET_MISMATCH'));
});

test('validator detects ERR_MISSING_SOURCES on missing or empty sourceRefs', () => {
  const mutated = mutatePilot((p) => {
    p.sourceRefs = [];
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_MISSING_SOURCES'));
});

test('validator detects ERR_MISSING_SOURCES on malformed sourceRef shape', () => {
  const mutated = mutatePilot((p) => {
    p.sourceRefs[0].kind = 'bogus';
    delete p.sourceRefs[0].locator;
    p.sourceRefs[0].verification = 'verified';
    p.sourceRefs[1].verification = 'verified';
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated, { mode: 'publish' });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_MISSING_SOURCES'));
});

test('validator detects ERR_LO_NOT_COVERED when an objective has no covering tasks', () => {
  const mutated = mutatePilot((p) => {
    p.objectives.push({
      id: 'obj-orphan',
      code: 'T11.99',
      level: 'could',
      statement: 'Orphan LO',
      prerequisiteIds: []
    });
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_LO_NOT_COVERED'));
});

test('validator detects ERR_RECHECK_MISSING when an objective lacks individual_recheck', () => {
  const mutated = mutatePilot((p) => {
    p.evidenceRules = p.evidenceRules.filter((e) => e.id !== 'ev-recheck-18');
    p.activities.forEach((a) => {
      a.evidenceIds = a.evidenceIds.filter((id) => id !== 'ev-recheck-18');
    });
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_RECHECK_MISSING'));
});

test('validator detects ERR_MISSING_REPRESENTATIONS when T11.19 lacks any of 4 representations', () => {
  const mutated = mutatePilot((p) => {
    const repTask = p.tasks.find((t) => t.id === 'task-form-four-rep');
    repTask.representations = ['list', 'explicit', 'verbal']; // recurrence missing
    delete repTask.evaluation.answerKey.rep_recurrence;
    p.tasks = p.tasks.filter((t) => t.id !== 'task-prac-support-tab'); // remove other recurrence tasks
    p.activities.forEach((a) => {
      a.taskIds = a.taskIds.filter((id) => id !== 'task-prac-support-tab');
    });
    const recheckTask = p.tasks.find((t) => t.id === 'task-recheck-19');
    if (recheckTask) {
      recheckTask.representations = ['list', 'explicit', 'verbal'];
    }
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_MISSING_REPRESENTATIONS'));
});

test('validator detects ERR_MISSING_FINITE_INFINITE_DISTINCTION when T11.18 lacks finite or infinite context', () => {
  const mutated = mutatePilot((p) => {
    const t11_18_tasks = p.tasks.filter((t) => t.objectiveIds.includes('obj-t11-18'));
    t11_18_tasks.forEach((t) => {
      t.sequenceType = 'finite';
      t.prompt = 'Dãy số hữu hạn ghế hội trường $1 \\le n \\le 25$.';
    });
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(
    res.errors.some((e) => e.code === 'ERR_MISSING_FINITE_INFINITE_DISTINCTION')
  );
});

test('validator detects ERR_UNKNOWN_CHECKER on unregistered checkerId', () => {
  const mutated = mutatePilot((p) => {
    const task = p.tasks.find((t) => t.id === 'task-prac-error-hunt');
    task.evaluation.checkerId = 'custom_checker_unregistered';
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_UNKNOWN_CHECKER'));
});

test('validator detects ERR_INVALID_TASK_EVALUATION on malformed evaluation data or answerKey', () => {
  // Missing answerKey on closed task
  const mutated1 = mutatePilot((p) => {
    const task = p.tasks.find((t) => t.id === 'task-prac-error-hunt');
    delete task.evaluation.answerKey;
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutated1);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Open/reflection task with checkerId or sole answerKey
  const mutated2 = mutatePilot((p) => {
    const exitTask = p.tasks.find((t) => t.id === 'task-exit-ticket');
    exitTask.evaluation.checkerId = 'text_normalized_exact';
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutated2);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Choice_exact with key not in options
  const mutated3 = mutatePilot((p) => {
    const choiceTask = p.tasks.find((t) => t.id === 'task-exp-predict');
    choiceTask.evaluation.answerKey = 'not_in_options';
    p.contentHash = hashPackage(p);
  });
  const res3 = validateLessonPackage(mutated3);
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Numeric_exact with string answerKey
  const mutated4 = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-prac-core-calc').evaluation.answerKey = '30';
    p.contentHash = hashPackage(p);
  });
  const res4 = validateLessonPackage(mutated4);
  assert.equal(res4.ok, false);
  assert.ok(res4.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));
});

test('validator detects ERR_SCAFFOLD_INCOMPLETE when full scaffold lacks required tiers or core task lacks rationale', () => {
  const mutated = mutatePilot((p) => {
    const distTask = p.tasks.find((t) => t.id === 'task-form-distinguish-n-un');
    distTask.hintIds = ['hint-form18-1', 'hint-form18-2', 'hint-form18-3']; // H4 missing
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_SCAFFOLD_INCOMPLETE'));
});

test('validator detects ERR_SCAFFOLD_PENALTY_FORBIDDEN on non-zero penalties or exact answer leakage', () => {
  // Non-zero penalty
  const mutatedPenalty = mutatePilot((p) => {
    const hint = p.hints.find((h) => h.id === 'hint-hunt-1');
    hint.penalty.time = 5;
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutatedPenalty);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_SCAFFOLD_PENALTY_FORBIDDEN'));

  // Exact answer leakage
  const mutatedLeak = mutatePilot((p) => {
    const hint = p.hints.find((h) => h.id === 'hint-hunt-1');
    hint.text = '20'; // matches task answerKey 20
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutatedLeak);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_SCAFFOLD_PENALTY_FORBIDDEN'));
});

test('closed hints cannot declare the numeric key or the correct choice label', () => {
  const cases = [
    { text: 'Đáp án là 20.', taskId: 'task-prac-error-hunt' },
    { text: 'The answer is 20.', taskId: 'task-prac-error-hunt' },
    { text: 'H3: Đây là cách cho bằng hệ thức truy hồi.', label: 'Công thức truy hồi' },
    { text: 'Không có số hạng cuối cùng nên là dãy vô hạn.', label: 'Dãy số vô hạn (tập chỉ số vô tận)' },
    { text: 'Dãy số vô hạn.', label: 'Dãy số vô hạn (tập chỉ số vô tận)' }
  ];
  for (const sample of cases) {
    const mutated = mutatePilot(pkg => {
      const task = pkg.tasks.find(item => item.id === (sample.taskId || 'task-pre-finite-inf'));
      if (sample.label) task.inputSchema.options.find(option => option.id === task.evaluation.answerKey).label = sample.label;
      pkg.hints.find(hint => hint.taskId === task.id).text = sample.text;
      pkg.contentHash = hashPackage(pkg);
    });
    const result = validateLessonPackage(mutated);
    assert.ok(result.errors.some(issue => issue.code === 'ERR_SCAFFOLD_PENALTY_FORBIDDEN' && issue.path.endsWith('.text')), sample.text);
  }
});

test('literal hint checks preserve comparisons, strategies and worked examples', () => {
  for (const text of [
    'Nếu tập chỉ số có phần tử cuối thì dãy hữu hạn; nếu không có phần tử cuối thì dãy vô hạn.',
    'Để xem đây là dãy hữu hạn hay vô hạn, hãy xét tập chỉ số.',
    'H4: Ví dụ tương tự: một mô hình không có hàng cuối, nên là dãy số vô hạn. Hãy xét miền chỉ số của đề.',
    'H4: Ví dụ khác: 10 + 2 × 5 có kết quả là 20; thay dữ kiện của đề vào bước tương tự.'
  ]) {
    const mutated = mutatePilot(pkg => {
      const task = pkg.tasks.find(item => item.id === 'task-pre-finite-inf');
      pkg.hints.find(hint => hint.taskId === task.id).text = text;
      pkg.contentHash = hashPackage(pkg);
    });
    const result = validateLessonPackage(mutated);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  }
});

test('validator detects ERR_INVALID_MASTERY_SOURCE on forbidden sources or non-individual mastery', () => {
  // Non-individual mastery
  const mutatedNonInd = mutatePilot((p) => {
    const ev = p.evidenceRules.find((e) => e.id === 'ev-recheck-18');
    ev.individual = false;
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutatedNonInd);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'));

  // Forbidden source group_product counting for mastery
  const mutatedGroup = mutatePilot((p) => {
    const ev = p.evidenceRules.find((e) => e.id === 'ev-form-19');
    ev.countsForMastery = true;
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutatedGroup);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'));

  // Weakened mastery policy
  const mutatedWeakened = mutatePilot((p) => {
    p.masteryPolicy.forbiddenSources = [];
    p.masteryPolicy.masterySources.push('group_product');
    p.evidenceRules.find((e) => e.id === 'ev-form-19').countsForMastery = true;
    p.contentHash = hashPackage(p);
  });
  const res3 = validateLessonPackage(mutatedWeakened);
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'));
});

test('validator detects ERR_KATEX_SYNTAX on invalid LaTeX math expressions or unclosed delimiters', () => {
  const mutated1 = mutatePilot((p) => {
    const task = p.tasks.find((t) => t.id === 'task-prac-error-hunt');
    task.prompt = 'Biểu thức lỗi: $\\frac{1}{$ kết quả thế nào?';
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutated1);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_KATEX_SYNTAX'));

  // Unclosed $
  const mutated2 = mutatePilot((p) => {
    p.tasks[0].prompt = 'Broken $\\frac{1}{2}';
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutated2);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_KATEX_SYNTAX'));

  // Unmatched \(
  const mutated3 = mutatePilot((p) => {
    p.tasks[0].prompt = 'Unmatched \\( x + 1';
    p.contentHash = hashPackage(p);
  });
  const res3 = validateLessonPackage(mutated3);
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some((e) => e.code === 'ERR_KATEX_SYNTAX'));
});

test('validator detects ERR_DANGLING_REFERENCE on invalid references, reciprocal link mismatch and prerequisite cycles', () => {
  // Missing objective reference
  const mutatedDangling = mutatePilot((p) => {
    const task = p.tasks.find((t) => t.id === 'task-exp-predict');
    task.objectiveIds = ['obj-nonexistent'];
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutatedDangling);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));

  // Cycle in prerequisites
  const mutatedCycle = mutatePilot((p) => {
    const o18 = p.objectives.find((o) => o.id === 'obj-t11-18');
    o18.prerequisiteIds = ['obj-t11-19']; // obj-t11-19 already has obj-t11-18 as prerequisite
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutatedCycle);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));

  // Activity-task reciprocal mismatch
  const mutatedActTask = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-exp-predict').activityId = 'act-form-18';
    p.contentHash = hashPackage(p);
  });
  const res3 = validateLessonPackage(mutatedActTask);
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));

  // Evidence-task reciprocal mismatch
  const mutatedEvTask = mutatePilot((p) => {
    p.evidenceRules.find((e) => e.id === 'ev-recheck-18').taskId = 'task-recheck-19';
    p.contentHash = hashPackage(p);
  });
  const res4 = validateLessonPackage(mutatedEvTask);
  assert.equal(res4.ok, false);
  assert.ok(res4.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));
});

test('validator detects ERR_DUPLICATE_ID on colliding IDs across entities', () => {
  const mutated = mutatePilot((p) => {
    p.tasks.push({
      ...p.tasks[0],
      id: 'task-exp-predict' // duplicate of tasks[0]
    });
    p.activities[0].taskIds.push('task-exp-predict');
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_DUPLICATE_ID'));
});

test('validator detects ERR_EVIDENCE_COVERAGE when individual evidence count is below minimum or distinct tasks < 2', () => {
  // Keep only 1 individual evidence for obj-t11-18
  const mutated1 = mutatePilot((p) => {
    p.evidenceRules = p.evidenceRules.filter(
      (e) => !e.objectiveIds.includes('obj-t11-18') || e.id === 'ev-recheck-18'
    );
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutated1);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_EVIDENCE_COVERAGE'));

  // Removing countsForMastery from exit leaves only 1 distinct task with mastery
  const mutated2 = mutatePilot((p) => {
    p.evidenceRules.find((e) => e.id === 'ev-exit-mastery').countsForMastery = false;
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutated2);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_EVIDENCE_COVERAGE'));
});

test('validator structural safety: null, primitive or array entity members return ok:false without throwing', () => {
  const cases = [
    ['sourceRefs', (p) => { p.sourceRefs = [null]; }],
    ['sourceRefs-string', (p) => { p.sourceRefs = ['string-member']; }],
    ['objectives', (p) => { p.objectives = [null]; }],
    ['activities', (p) => { p.activities = [null]; }],
    ['tasks', (p) => { p.tasks = [null]; }],
    ['hints', (p) => { p.hints = [null]; }],
    ['evidenceRules', (p) => { p.evidenceRules = [null]; }],
    ['budget-null', (p) => { p.budget = null; }],
    ['mastery-null', (p) => { p.masteryPolicy = null; }]
  ];

  for (const [name, fn] of cases) {
    const mutated = mutatePilot((p) => {
      fn(p);
      p.contentHash = hashPackage(p);
    });
    let res;
    assert.doesNotThrow(() => {
      res = validateLessonPackage(mutated);
    }, `${name} should not throw`);
    assert.equal(res.ok, false, `${name} should fail validation`);
    assert.ok(res.errors.length > 0, `${name} should have errors`);
  }
});

test('validator enforces exact nested field allowlist across entities', () => {
  const mutatedSrc = mutatePilot((p) => {
    p.sourceRefs[0].unrecognized = true;
    p.contentHash = hashPackage(p);
  });
  const resSrc = validateLessonPackage(mutatedSrc);
  assert.equal(resSrc.ok, false);
  assert.ok(resSrc.errors.some((e) => e.code === 'ERR_MISSING_SOURCES'));

  const mutatedAct = mutatePilot((p) => {
    p.activities[0].unrecognized = true;
    p.contentHash = hashPackage(p);
  });
  const resAct = validateLessonPackage(mutatedAct);
  assert.equal(resAct.ok, false);
  assert.ok(resAct.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));

  const mutatedTask = mutatePilot((p) => {
    p.tasks[0].unrecognized = true;
    p.contentHash = hashPackage(p);
  });
  const resTask = validateLessonPackage(mutatedTask);
  assert.equal(resTask.ok, false);
  assert.ok(resTask.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  const mutatedEv = mutatePilot((p) => {
    p.evidenceRules[0].unrecognized = true;
    p.contentHash = hashPackage(p);
  });
  const resEv = validateLessonPackage(mutatedEv);
  assert.equal(resEv.ok, false);
  assert.ok(resEv.errors.some((e) => e.code === 'ERR_EVIDENCE_COVERAGE'));
});

test('validator enforces exact nested enums across activities and tasks', () => {
  const mutatedPhase = mutatePilot((p) => {
    p.activities[0].phase = 'bogus';
    p.contentHash = hashPackage(p);
  });
  const resPhase = validateLessonPackage(mutatedPhase);
  assert.equal(resPhase.ok, false);
  assert.ok(resPhase.errors.some((e) => e.code === 'ERR_TIME_BUDGET_MISMATCH'));

  const mutatedPart = mutatePilot((p) => {
    p.tasks[0].participation = 'group_score';
    p.contentHash = hashPackage(p);
  });
  const resPart = validateLessonPackage(mutatedPart);
  assert.equal(resPart.ok, false);
  assert.ok(resPart.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));
});

test('validator enforces activity-to-evidence ownership and complete reverse linkage', () => {
  // Orphan activity evidence: act-recheck claims ev-prac-reasoning from act-prac
  const mutatedOrphan = mutatePilot((p) => {
    p.activities.find((a) => a.id === 'act-recheck').evidenceIds = ['ev-prac-reasoning'];
    p.contentHash = hashPackage(p);
  });
  const resOrphan = validateLessonPackage(mutatedOrphan);
  assert.equal(resOrphan.ok, false);
  assert.ok(resOrphan.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));

  // Activity omitting evidence produced by its own task
  const mutatedMissing = mutatePilot((p) => {
    p.activities.find((a) => a.id === 'act-recheck').evidenceIds = [];
    p.contentHash = hashPackage(p);
  });
  const resMissing = validateLessonPackage(mutatedMissing);
  assert.equal(resMissing.ok, false);
  assert.ok(resMissing.errors.some((e) => e.code === 'ERR_DANGLING_REFERENCE'));
});

test('validator ensures mandatory forbidden mastery sources cannot be weakened by package policy', () => {
  // Emptying forbiddenSources fails validation
  const mutatedEmpty = mutatePilot((p) => {
    p.masteryPolicy.forbiddenSources = [];
    p.contentHash = hashPackage(p);
  });
  const resEmpty = validateLessonPackage(mutatedEmpty);
  assert.equal(resEmpty.ok, false);
  assert.ok(resEmpty.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'));

  // Weakening policy and crediting group_product is completely blocked
  const mutatedWeaken = mutatePilot((p) => {
    p.masteryPolicy.forbiddenSources = [];
    p.masteryPolicy.masterySources.push('group_product');
    const e = p.evidenceRules.find((ev) => ev.id === 'ev-form-19');
    e.countsForMastery = true;
    e.individual = true;
    const t = p.tasks.find((task) => task.id === e.taskId);
    t.participation = 'individual';
    p.contentHash = hashPackage(p);
  });
  const resWeaken = validateLessonPackage(mutatedWeaken);
  assert.equal(resWeaken.ok, false);
  assert.ok(resWeaken.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'));
});

test('validator rejects individualEvidencePerObjectiveMin when not an integer >= 2 (0, -1, 1, 1.5)', () => {
  const invalidMins = [0, -1, 1, 1.5, '2', null];
  for (const val of invalidMins) {
    const mutated = mutatePilot((p) => {
      p.masteryPolicy.individualEvidencePerObjectiveMin = val;
      p.contentHash = hashPackage(p);
    });
    const res = validateLessonPackage(mutated);
    assert.equal(res.ok, false, `individualEvidencePerObjectiveMin=${val} should fail`);
    assert.ok(
      res.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'),
      `individualEvidencePerObjectiveMin=${val} should emit ERR_INVALID_MASTERY_SOURCE`
    );
  }
});

test('validator rejects reflection tasks contributing to mastery', () => {
  const mutated = mutatePilot((p) => {
    // If exit ticket is typed reflection while holding countsForMastery evidence
    p.tasks.find((t) => t.id === 'task-exit-ticket').type = 'reflection';
    p.contentHash = hashPackage(p);
  });
  const res = validateLessonPackage(mutated);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === 'ERR_INVALID_MASTERY_SOURCE'));
});

test('validator requires public inputSchema on choice tasks with valid options and math labels', () => {
  // Missing inputSchema on choice task
  const mutatedMissing = mutatePilot((p) => {
    delete p.tasks.find((t) => t.id === 'task-exp-predict').inputSchema;
    p.contentHash = hashPackage(p);
  });
  const resMissing = validateLessonPackage(mutatedMissing);
  assert.equal(resMissing.ok, false);
  assert.ok(resMissing.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Unclosed math in option label
  const mutatedMath = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-exp-predict').inputSchema.options[0].label = 'Dãy $u_n hữu hạn';
    p.contentHash = hashPackage(p);
  });
  const resMath = validateLessonPackage(mutatedMath);
  assert.equal(resMath.ok, false);
  assert.ok(resMath.errors.some((e) => e.code === 'ERR_KATEX_SYNTAX'));

  // Option answerKey not in inputSchema
  const mutatedKey = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-exp-predict').evaluation.answerKey = 'opt_unknown';
    p.contentHash = hashPackage(p);
  });
  const resKey = validateLessonPackage(mutatedKey);
  assert.equal(resKey.ok, false);
  assert.ok(resKey.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));
});

test('validator requires public inputSchema on representation matching tasks matching domain and range without disclosing mapping', () => {
  const repTask = basePilot.tasks.find((t) => t.id === 'task-form-four-rep');
  assert.ok(repTask.inputSchema);
  assert.equal(repTask.inputSchema.representations.length, 4);
  assert.equal(repTask.inputSchema.cards.length, 4);

  // Assert inputSchema only lists representations and cards without disclosing mapping
  assert.equal(repTask.inputSchema.answerKey, undefined);
  assert.equal(repTask.inputSchema.mapping, undefined);

  // Missing inputSchema fails
  const mutatedMissing = mutatePilot((p) => {
    delete p.tasks.find((t) => t.id === 'task-form-four-rep').inputSchema;
    p.contentHash = hashPackage(p);
  });
  const resMissing = validateLessonPackage(mutatedMissing);
  assert.equal(resMissing.ok, false);
  assert.ok(resMissing.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Domain mismatch between answerKey and representations
  const mutatedDomain = mutatePilot((p) => {
    const t = p.tasks.find((task) => task.id === 'task-form-four-rep');
    t.inputSchema.representations = t.inputSchema.representations.slice(0, 3); // omit 1
    p.contentHash = hashPackage(p);
  });
  const resDomain = validateLessonPackage(mutatedDomain);
  assert.equal(resDomain.ok, false);
  assert.ok(resDomain.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));
});

test('pilot asserts Vietnamese labels and math formulas on all choice options and cards', () => {
  const choiceTasks = basePilot.tasks.filter((t) =>
    ['choice_exact', 'multi_choice_exact'].includes(t.evaluation?.checkerId)
  );
  assert.ok(choiceTasks.length >= 4);

  for (const ct of choiceTasks) {
    assert.ok(ct.inputSchema, `Task ${ct.id} must have inputSchema`);
    assert.ok(Array.isArray(ct.inputSchema.options), `Task ${ct.id} must have inputSchema.options`);
    for (const opt of ct.inputSchema.options) {
      assert.ok(typeof opt.id === 'string' && opt.id.length > 0);
      assert.ok(typeof opt.label === 'string' && opt.label.length > 0);
    }
  }

  const repTask = basePilot.tasks.find((t) => t.id === 'task-form-four-rep');
  for (const r of repTask.inputSchema.representations) {
    assert.ok(r.label.length > 0);
    assert.match(r.label, /Cách \d/);
  }
  for (const c of repTask.inputSchema.cards) {
    assert.ok(c.label.length > 0);
  }
});

test('validator rejects nested unknown keys in inputSchema and option/card entries (leak prevention)', () => {
  // Injected answerKey in choice task inputSchema
  const mutated1 = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-exp-predict').inputSchema.answerKey = 'leaked_key';
    p.contentHash = hashPackage(p);
  });
  const res1 = validateLessonPackage(mutated1);
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Injected serverToken on choice option entry
  const mutated2 = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-exp-predict').inputSchema.options[0].serverToken = 'secret_token';
    p.contentHash = hashPackage(p);
  });
  const res2 = validateLessonPackage(mutated2);
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Injected mapping in representation task inputSchema
  const mutated3 = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-form-four-rep').inputSchema.mapping = { rep_list: 'card_list_18_20_22' };
    p.contentHash = hashPackage(p);
  });
  const res3 = validateLessonPackage(mutated3);
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Injected serverToken on card entry
  const mutated4 = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-form-four-rep').inputSchema.cards[0].serverToken = 'secret_card';
    p.contentHash = hashPackage(p);
  });
  const res4 = validateLessonPackage(mutated4);
  assert.equal(res4.ok, false);
  assert.ok(res4.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));

  // Injected extraKey on representation entry
  const mutated5 = mutatePilot((p) => {
    p.tasks.find((t) => t.id === 'task-form-four-rep').inputSchema.representations[0].extraKey = 'leak';
    p.contentHash = hashPackage(p);
  });
  const res5 = validateLessonPackage(mutated5);
  assert.equal(res5.ok, false);
  assert.ok(res5.errors.some((e) => e.code === 'ERR_INVALID_TASK_EVALUATION'));
});
