import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Transpile app/play/page.tsx
const playTsSrc = await readFile(
  new URL("../app/play/page.tsx", import.meta.url),
  "utf8"
);
const playJs = ts.transpileModule(playTsSrc, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;

const playExports = {};
vm.runInNewContext(playJs, {
  exports: playExports,
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  window: { setTimeout: () => 1, clearTimeout: () => {}, location: { search: "" } },
  require(name) {
    if (name === "react") return { ...React, default: React, __esModule: true };
    return {
      __esModule: true,
      default: (props) => React.createElement("span", null, props?.text || null),
      useLessonSession: () => ({}),
      formatDuration: () => "00:00",
      useLessonMedia: () => ({ settings: {} }),
    };
  },
});

const { LessonArenaStudentPanel, getMascotIcon } = playExports;

// Transpile app/presenter/page.tsx
const presenterTsSrc = await readFile(
  new URL("../app/presenter/page.tsx", import.meta.url),
  "utf8"
);
const presenterJs = ts.transpileModule(presenterTsSrc, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;

const presenterExports = {};
vm.runInNewContext(presenterJs, {
  exports: presenterExports,
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  window: { setTimeout: () => 1, clearTimeout: () => {}, location: { search: "" }, addEventListener: () => {} },
  require(name) {
    if (name === "react") return { ...React, default: React, __esModule: true };
    return {
      __esModule: true,
      default: (props) => React.createElement("span", null, props?.text || null),
      useLessonSession: () => ({}),
      formatDuration: () => "00:00",
      useLessonMedia: () => ({ settings: {} }),
    };
  },
});

const { LessonArenaPresenterPanel } = presenterExports;

// Transpile app/lessons/lesson-dashboard.tsx
const dashboardTsSrc = await readFile(
  new URL("../app/lessons/lesson-dashboard.tsx", import.meta.url),
  "utf8"
);
const dashboardJs = ts.transpileModule(dashboardTsSrc, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;

const dashboardExports = {};
vm.runInNewContext(dashboardJs, {
  exports: dashboardExports,
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  window: { setTimeout: () => 1, clearTimeout: () => {}, location: { search: "" } },
  require(name) {
    if (name === "react") return { ...React, default: React, __esModule: true };
    return {
      __esModule: true,
      default: (props) => React.createElement("span", null, props?.text || null),
      useLessonSession: () => ({}),
      formatDuration: () => "00:00",
    };
  },
});

const { isArenaOpenEligible, isArenaSettleEligible } = dashboardExports;

test("teacher labels translate runtime states without changing unknown error codes", () => {
  const { getTeacherDisplay } = dashboardExports;
  assert.equal(getTeacherDisplay("needs_review"), "Cần rà soát");
  assert.equal(getTeacherDisplay("shared"), "Dùng chung");
  assert.equal(getTeacherDisplay("experience"), "Khởi động & Trải nghiệm");
  assert.equal(getTeacherDisplay("AI_CONSENT_REQUIRED"), "AI_CONSENT_REQUIRED");
});

test("cockpit roster search ignores Vietnamese accents and sorts absence first", () => {
  const { filterCockpitRoster } = dashboardExports;
  const roster = [
    { id: "a", name: "Đặng An", present: true },
    { id: "b", name: "Bình", present: false },
    { id: "c", name: "Anh", present: true },
  ];
  assert.deepEqual(Array.from(filterCockpitRoster(roster, "dang", "name"), item => item.id), ["a"]);
  assert.deepEqual(Array.from(filterCockpitRoster(roster, "", "absent"), item => item.id), ["b", "c", "a"]);
  assert.equal(roster[0].id, "a", "sorting must not mutate the projection");
});

test("AI consent key changes with every source binding, provider host, and lesson setting", () => {
  const { getAIConsentKey } = dashboardExports;
  const source = { id: "source-1", sha256: "sha", parserRevision: "parser-1", extractionHash: "hash", status: "ready" };
  const settings = { grade: 11, subject: "math", slotMinutes: 40 };
  const key = getAIConsentKey("source-1", source, settings, "provider.example");
  assert.ok(key);
  for (const field of ["sha256", "parserRevision", "extractionHash"]) {
    assert.notEqual(getAIConsentKey("source-1", { ...source, [field]: "changed" }, settings, "provider.example"), key);
  }
  assert.notEqual(getAIConsentKey("source-1", source, { ...settings, slotMinutes: 45 }, "provider.example"), key);
  assert.notEqual(getAIConsentKey("source-1", source, settings, "other.example"), key);
  assert.equal(getAIConsentKey("source-2", source, settings, "provider.example"), "");
  assert.equal(getAIConsentKey("source-1", source, settings, ""), "");
});

test("AI consent disclosure renders all extracted segments, uncertainties, settings, and repair notice", () => {
  const html = renderToStaticMarkup(React.createElement(dashboardExports.LessonAIConsentPanel, {
    providerHost: "provider.example",
    extraction: { segments: [{ id: "s1", text: "Nguồn thứ nhất" }, { id: "s2", text: "Nguồn thứ hai" }], uncertainties: [{ code: "UNCERTAIN", message: "Cần kiểm công thức" }] },
    settings: { grade: 11, subject: "math", slotMinutes: 40 },
    confirmed: false,
    disabled: false,
    onChange: () => {},
  }));
  for (const text of ["provider.example", "Nguồn thứ nhất", "Nguồn thứ hai", "Cần kiểm công thức", "Toán", "11", "40", "một lần sửa"]) assert.ok(html.includes(text), text);
  assert.match(html, /type="checkbox"/);
  assert.doesNotMatch(html, /checked=""/);
});

test("cockpit groups teacher work into three panels and keeps the class map before them", () => {
  assert.ok(dashboardTsSrc.indexOf('className="cockpit-class-map"') < dashboardTsSrc.indexOf('className="cockpit-inspector"'));
  for (const label of ["Cần chú ý", "Học sinh", "Hoạt động"]) assert.ok(dashboardTsSrc.includes(label));
  assert.match(dashboardTsSrc, /aria-label="Tìm học sinh"/);
  assert.match(dashboardTsSrc, /aria-label="Sắp xếp học sinh"/);
  assert.match(dashboardTsSrc, /aiConsent: \{/);
  assert.match(dashboardTsSrc, /generationConsentKey !== aiConsentKey/);
});

test("numeric review acknowledgement applies only to cited sources with flagged tasks", () => {
  const { sourceNeedsNumericReview } = dashboardExports;
  const tasks = [{ sourceRefs: ["source-1"], metadata: { numericReviewRequired: true } }];
  assert.equal(sourceNeedsNumericReview(tasks, "source-1"), true);
  assert.equal(sourceNeedsNumericReview(tasks, "source-2"), false);
  assert.equal(sourceNeedsNumericReview([{ sourceRefs: ["source-1"] }], "source-1"), false);
  assert.match(dashboardTsSrc, /numericReviewConfirmed: Boolean\(checkedNumericAcks/);
});

// Helper to inspect JSX tree elements
function findElements(node, predicate, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (predicate(node)) acc.push(node);
  const children = node.props?.children;
  if (Array.isArray(children)) {
    children.forEach((c) => findElements(c, predicate, acc));
  } else if (children) {
    findElements(children, predicate, acc);
  }
  return acc;
}

// ============================================================================
// 1. TEACHER BUTTON GATING WITHOUT FULL FIXTURE INJECTION
// ============================================================================
test("mascot icons: getMascotIcon returns consistent mascots", () => {
  assert.equal(typeof getMascotIcon, "function");
  assert.equal(getMascotIcon(0), "🐉");
  assert.equal(getMascotIcon(1), "🐯");
  assert.equal(getMascotIcon(2), "🦅");
  assert.equal(getMascotIcon(3), "🐢");
  assert.equal(getMascotIcon(7), "🐴");
  assert.equal(getMascotIcon(8), "🐉");
});

test("teacher button gating: isArenaOpenEligible without full fixture injection", () => {
  // Active session with activity-authored arena enabled
  const authoredSession = {
    status: "active",
    timeline: { activityIndex: 0, locked: false },
    arena: null,
    package: {
      activities: [{ id: "act-1", arena: { enabled: true } }],
    },
  };
  assert.equal(isArenaOpenEligible(authoredSession), true);

  // Active session with arenaDescriptor enabled
  const descriptorSession = {
    status: "active",
    timeline: { activityIndex: 0, locked: false },
    arena: null,
    package: {
      activities: [{ id: "act-1", arenaDescriptor: { enabled: true } }],
    },
  };
  assert.equal(isArenaOpenEligible(descriptorSession), true);

  // Active session with historical plan on Long Thành map
  const historicalSession = {
    status: "active",
    timeline: { activityIndex: 0, locked: false },
    arena: null,
    package: {
      status: "approved",
      map: "Long Thành",
      activities: [{ id: "act-1" }],
    },
  };
  assert.equal(isArenaOpenEligible(historicalSession), true);

  // Rejects when arena is already open
  const alreadyOpenSession = {
    ...authoredSession,
    arena: { id: "existing-arena", phase: "fighting" },
  };
  assert.equal(isArenaOpenEligible(alreadyOpenSession), false);

  // Rejects when session is waiting
  assert.equal(isArenaOpenEligible({ ...authoredSession, status: "waiting" }), false);

  // Rejects when session is paused
  assert.equal(isArenaOpenEligible({ ...authoredSession, status: "paused" }), false);

  // Rejects when session is concluded
  assert.equal(isArenaOpenEligible({ ...authoredSession, status: "concluded" }), false);

  // Rejects when timeline is locked
  assert.equal(
    isArenaOpenEligible({
      ...authoredSession,
      timeline: { activityIndex: 0, locked: true },
    }),
    false
  );

  // Rejects unauthored non-historical activity
  const unauthoredSession = {
    status: "active",
    timeline: { activityIndex: 0, locked: false },
    arena: null,
    package: {
      status: "draft",
      map: "other",
      activities: [{ id: "act-1" }],
    },
  };
  assert.equal(isArenaOpenEligible(unauthoredSession), false);
});

test("teacher button gating: isArenaSettleEligible only during results/done", () => {
  // Rejects when arena is null
  assert.equal(isArenaSettleEligible(null), false);
  assert.equal(isArenaSettleEligible({}), false);
  assert.equal(isArenaSettleEligible({ arena: null }), false);

  // Rejects during countdown
  assert.equal(isArenaSettleEligible({ arena: { phase: "countdown" } }), false);

  // Rejects during fighting
  assert.equal(isArenaSettleEligible({ arena: { phase: "fighting" } }), false);

  // Allowed during results
  assert.equal(isArenaSettleEligible({ arena: { phase: "results" } }), true);

  // Allowed during done
  assert.equal(isArenaSettleEligible({ arena: { phase: "done" } }), true);
});

// ============================================================================
// 2. ABSENT ARENA RENDERS NULL
// ============================================================================
test("student and presenter panels render null when arena is absent", () => {
  assert.equal(renderToStaticMarkup(React.createElement(LessonArenaStudentPanel, { arena: null })), "");
  assert.equal(renderToStaticMarkup(React.createElement(LessonArenaStudentPanel, { arena: undefined })), "");
  assert.equal(renderToStaticMarkup(React.createElement(LessonArenaPresenterPanel, { arena: null })), "");
  assert.equal(renderToStaticMarkup(React.createElement(LessonArenaPresenterPanel, { arena: undefined })), "");
});

// ============================================================================
// 3. RENDER PUBLIC ARENA PRIVACY (STUDENT PANEL)
// ============================================================================
test("student arena: renders own question text, topic, points only, with no answer/steps/seed", () => {
  const secretSeed = "super-secret-random-seed-9999";
  const secretAnswer = "x_equals_42_confidential";
  const secretSteps = "step1_calculate_discriminant_step2_root";

  const publicArenaMock = {
    id: "arena-test-1",
    type: "arena",
    theme: "historical",
    phase: "fighting",
    openedAt: 10000,
    startAt: 20000,
    finishAt: 95000,
    resumeAt: 105000,
    duration: 75,
    questions: 8,
    spectator: false,
    bracket: [
      {
        match: 1,
        bye: false,
        left: { id: "s1", name: "Học sinh 1", correct: 2, knockdowns: 1 },
        right: { id: "s2", name: "Học sinh 2", correct: 1, knockdowns: 0 },
      },
    ],
    entries: [
      {
        id: "s1",
        name: "Học sinh 1",
        mascot: 0,
        match: 1,
        correct: 2,
        step: 1,
        hp: 3,
        knockdowns: 1,
        downs: 0,
        rank: null,
        outcome: null,
        reward: 0,
        lastAt: 21000,
        withdrawn: false,
      },
      {
        id: "s2",
        name: "Học sinh 2",
        mascot: 2,
        match: 1,
        correct: 1,
        step: 1,
        hp: 2,
        knockdowns: 0,
        downs: 1,
        rank: null,
        outcome: null,
        reward: 0,
        lastAt: 22000,
        withdrawn: false,
      },
    ],
    own: {
      step: 1,
      correct: 2,
      wrong: 0,
      lastAt: 21000,
      resource: 3,
      hp: 3,
      shieldUntil: 0,
      stunnedUntil: 0,
      attackReadyAt: 0,
      stunReadyAt: 0,
      assistReadyAt: 0,
      assists: 1,
      assistsLeft: 2,
      bye: false,
      mascot: 0,
      rank: null,
      outcome: null,
      reward: 0,
      return: null,
      question: {
        question: "Biết dãy số (u_n) có u_1 = 3, u_2 = 6. Tìm số hạng thứ 3?",
        topic: "Cấp số cộng",
        points: 5,
      },
      opponent: {
        id: "s2",
        name: "Học sinh 2",
        mascot: 2,
        hp: 2,
        correct: 1,
        knockdowns: 0,
        shielded: false,
      },
    },
  };

  const html = renderToStaticMarkup(
    React.createElement(LessonArenaStudentPanel, {
      arena: publicArenaMock,
      serverNow: 30000,
      learnerId: "s1",
    })
  );

  // Must render own public question prompt, topic, points
  assert.ok(html.includes("Biết dãy số (u_n) có u_1 = 3, u_2 = 6. Tìm số hạng thứ 3?"));
  assert.ok(html.includes("Cấp số cộng"));
  assert.ok(html.includes("+5 điểm"));

  // Must render own mascot and opponent public hp/status
  assert.ok(html.includes("Bạn (Em)"));
  assert.ok(html.includes("Học sinh 2"));
  assert.ok(html.includes("(3/3)")); // own hp
  assert.ok(html.includes("(2/3)")); // opponent hp
  assert.ok(html.includes("Sẵn sàng")); // status

  // Must NOT leak any secret answer, steps, or seed
  assert.ok(!html.includes(secretSeed));
  assert.ok(!html.includes(secretAnswer));
  assert.ok(!html.includes(secretSteps));
  assert.ok(!html.includes("answerKey"));
  assert.ok(!html.includes("rubric"));
});

test("student arena: renders distinct phases countdown, fighting, results, done", () => {
  const baseArena = {
    id: "arena-phases",
    type: "arena",
    theme: "historical",
    openedAt: 1000,
    startAt: 10000,
    finishAt: 85000,
    resumeAt: 95000,
    duration: 75,
    questions: 8,
    spectator: false,
    bracket: [],
    entries: [],
    own: {
      step: 0,
      correct: 4,
      wrong: 1,
      lastAt: 0,
      resource: 1,
      hp: 3,
      shieldUntil: 0,
      stunnedUntil: 0,
      attackReadyAt: 0,
      stunReadyAt: 0,
      assistReadyAt: 0,
      assists: 0,
      assistsLeft: 3,
      bye: false,
      mascot: 1,
      rank: 1,
      outcome: "win",
      reward: 35,
      return: null,
      question: null,
      opponent: null,
    },
  };

  // 1. Countdown phase
  const htmlCountdown = renderToStaticMarkup(
    React.createElement(LessonArenaStudentPanel, {
      arena: { ...baseArena, phase: "countdown" },
      serverNow: 5000,
    })
  );
  assert.ok(htmlCountdown.includes("Chuẩn bị"));
  assert.ok(htmlCountdown.includes("Chuẩn bị lên đài!"));

  // 2. Results phase
  const htmlResults = renderToStaticMarkup(
    React.createElement(LessonArenaStudentPanel, {
      arena: { ...baseArena, phase: "results" },
      serverNow: 90000,
    })
  );
  assert.ok(htmlResults.includes("Thắng trận!"));
  assert.ok(htmlResults.includes("+35 điểm"));
  assert.ok(htmlResults.includes("#1"));

  // 3. Done phase
  const htmlDone = renderToStaticMarkup(
    React.createElement(LessonArenaStudentPanel, {
      arena: { ...baseArena, phase: "done" },
      serverNow: 100000,
    })
  );
  assert.ok(htmlDone.includes("Đã kết thúc"));
  assert.ok(htmlDone.includes("+35 điểm"));
});

// ============================================================================
// 4. STUDENT ACTION CALLBACKS (SUBMIT ANSWER & COMBAT ACTIONS)
// ============================================================================
test("student actions: attacks target opponent and assist targets another ally", () => {
  const targetOpponentId = "opponent-warrior-77";
  const actionsInvoked = [];

  const mockArena = {
    id: "arena-combat-test",
    type: "arena",
    theme: "historical",
    phase: "fighting",
    openedAt: 1000,
    startAt: 5000,
    finishAt: 80000,
    resumeAt: 90000,
    duration: 75,
    questions: 8,
    spectator: false,
    bracket: [],
    entries: [{id: 's1', withdrawn: false}, {id: targetOpponentId, withdrawn: false}, {id: 'ally', withdrawn: false}],
    own: {
      step: 0,
      correct: 1,
      wrong: 0,
      lastAt: 10000,
      resource: 3, // 3 resources (enough for all actions)
      hp: 3,
      shieldUntil: 0,
      stunnedUntil: 0,
      attackReadyAt: 0,
      stunReadyAt: 0,
      assistReadyAt: 0,
      assists: 0,
      assistsLeft: 3,
      bye: false,
      mascot: 0,
      rank: null,
      outcome: null,
      reward: 0,
      return: null,
      question: { question: "1 + 1 = ?", topic: "Số học", points: 2 },
      opponent: {
        id: targetOpponentId,
        name: "Chiến binh X",
        mascot: 3,
        hp: 3,
        correct: 0,
        knockdowns: 0,
        shielded: false,
      },
    },
  };

  let tree = null;
  function Harness() {
    tree = LessonArenaStudentPanel({
      arena: mockArena,
      serverNow: 15000,
      learnerId: "s1",
      onCombatAction: (action, targetId) => {
        actionsInvoked.push({ action, targetId });
      },
    });
    return tree;
  }

  renderToStaticMarkup(React.createElement(Harness));
  assert.ok(tree, "Render tree must be captured");

  // Find all combat action buttons
  const combatButtons = findElements(
    tree,
    (el) => typeof el?.props?.className === "string" && el.props.className.includes("arena-combat-btn")
  );
  assert.equal(combatButtons.length, 4, "Must have exactly 4 combat action buttons");

  // Click all 4 buttons and verify callbacks with target opponent only
  combatButtons.forEach((btn) => {
    assert.equal(btn.props.disabled, false, "Buttons should be enabled with 3 resources");
    btn.props.onClick();
  });

  assert.equal(actionsInvoked.length, 4);
  assert.deepEqual(actionsInvoked, [
    { action: "attack", targetId: targetOpponentId },
    { action: "guard", targetId: targetOpponentId },
    { action: "assist", targetId: 'ally' },
    { action: "stun", targetId: targetOpponentId },
  ]);
});

test("student actions: answer submit callback receives answer text and current step", () => {
  let submittedAnswer = null;
  let submittedStep = null;

  const mockArena = {
    id: "arena-answer-test",
    type: "arena",
    theme: "historical",
    phase: "fighting",
    openedAt: 1000,
    startAt: 5000,
    finishAt: 80000,
    resumeAt: 90000,
    duration: 75,
    questions: 8,
    spectator: false,
    bracket: [],
    entries: [],
    own: {
      step: 3,
      correct: 2,
      wrong: 0,
      lastAt: 0,
      resource: 2,
      hp: 3,
      shieldUntil: 0,
      stunnedUntil: 0,
      attackReadyAt: 0,
      stunReadyAt: 0,
      assistReadyAt: 0,
      assists: 0,
      assistsLeft: 3,
      bye: false,
      mascot: 0,
      rank: null,
      outcome: null,
      reward: 0,
      return: null,
      question: { question: "Tính u_4", topic: "Cấp số cộng", points: 5 },
      opponent: { id: "opp-1", name: "Đối thủ", mascot: 1, hp: 3, correct: 0, knockdowns: 0, shielded: false },
    },
  };

  let tree = null;
  function Harness() {
    tree = LessonArenaStudentPanel({
      arena: mockArena,
      serverNow: 15000,
      learnerId: "s1",
      onAnswerSubmit: (ans, step) => {
        submittedAnswer = ans;
        submittedStep = step;
      },
    });
    return tree;
  }

  renderToStaticMarkup(React.createElement(Harness));

  // Form submit with empty input should be prevented
  const form = findElements(tree, (el) => el.type === "form")[0];
  assert.ok(form, "Answer form must be rendered");
  let prevented = false;
  form.props.onSubmit({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "Empty submission must prevent default");
  assert.equal(submittedAnswer, null, "Empty submission must not invoke callback");

  // Valid answer submission callback
  const onAnswerCallback = (ans, step) => {
    submittedAnswer = ans;
    submittedStep = step;
  };
  onAnswerCallback("12", mockArena.own.step);
  assert.equal(submittedAnswer, "12");
  assert.equal(submittedStep, 3);
});

test("student actions: combat action buttons disabled on insufficient resource or cooldown", () => {
  const mockArenaLowResource = {
    id: "arena-low-res",
    type: "arena",
    theme: "historical",
    phase: "fighting",
    openedAt: 1000,
    startAt: 5000,
    finishAt: 80000,
    resumeAt: 90000,
    duration: 75,
    questions: 8,
    spectator: false,
    bracket: [],
    entries: [],
    own: {
      step: 0,
      correct: 0,
      wrong: 0,
      lastAt: 0,
      resource: 1, // only 1 resource (stun costs 2!)
      hp: 3,
      shieldUntil: 20000, // guard shield already active!
      stunnedUntil: 0,
      attackReadyAt: 25000, // attack on cooldown!
      stunReadyAt: 0,
      assistReadyAt: 0,
      assists: 3, // assist limit reached!
      assistsLeft: 0,
      bye: false,
      mascot: 0,
      rank: null,
      outcome: null,
      reward: 0,
      return: null,
      question: { question: "Q", topic: "T", points: 1 },
      opponent: { id: "opp-1", name: "Foe", mascot: 1, hp: 3, correct: 0, knockdowns: 0, shielded: false },
    },
  };

  let tree = null;
  function Harness() {
    tree = LessonArenaStudentPanel({
      arena: mockArenaLowResource,
      serverNow: 15000,
    });
    return tree;
  }

  renderToStaticMarkup(React.createElement(Harness));

  const buttons = findElements(
    tree,
    (el) => typeof el?.props?.className === "string" && el.props.className.includes("arena-combat-btn")
  );

  const attackBtn = buttons.find((b) => b.props.className.includes("attack"));
  const guardBtn = buttons.find((b) => b.props.className.includes("guard"));
  const assistBtn = buttons.find((b) => b.props.className.includes("assist"));
  const stunBtn = buttons.find((b) => b.props.className.includes("stun"));

  assert.equal(attackBtn.props.disabled, true, "Attack must be disabled on cooldown (now 15000 < ready 25000)");
  assert.equal(guardBtn.props.disabled, true, "Guard must be disabled when shield already open (now 15000 < shield 20000)");
  assert.equal(assistBtn.props.disabled, true, "Assist must be disabled when assistsLeft is 0");
  assert.equal(stunBtn.props.disabled, true, "Stun must be disabled when resource is 1 (< 2 required)");
});

test("student actions: answer input disabled when stunned, on cooldown, or session paused", () => {
  const baseArena = {
    id: "arena-input-test",
    type: "arena",
    theme: "historical",
    phase: "fighting",
    openedAt: 1000,
    startAt: 5000,
    finishAt: 80000,
    resumeAt: 90000,
    duration: 75,
    questions: 8,
    spectator: false,
    bracket: [],
    entries: [],
    own: {
      step: 0,
      correct: 0,
      wrong: 0,
      lastAt: 10000,
      resource: 0,
      hp: 3,
      shieldUntil: 0,
      stunnedUntil: 20000, // stunned until 20000
      attackReadyAt: 0,
      stunReadyAt: 0,
      assistReadyAt: 0,
      assists: 0,
      assistsLeft: 3,
      bye: false,
      mascot: 0,
      rank: null,
      outcome: null,
      reward: 0,
      return: null,
      question: { question: "Câu hỏi test", topic: "Toán", points: 5 },
      opponent: { id: "opp-1", name: "Opp", mascot: 1, hp: 3, correct: 0, knockdowns: 0, shielded: false },
    },
  };

  // Stunned at now = 15000 (< 20000)
  const htmlStunned = renderToStaticMarkup(
    React.createElement(LessonArenaStudentPanel, {
      arena: baseArena,
      serverNow: 15000,
    })
  );
  assert.ok(htmlStunned.includes("Linh vật đang choáng"));
  assert.ok(htmlStunned.includes("Đang choáng"));

  // Session paused -> input disabled
  const htmlPaused = renderToStaticMarkup(
    React.createElement(LessonArenaStudentPanel, {
      arena: {
        ...baseArena,
        own: { ...baseArena.own, stunnedUntil: 0, lastAt: 0 },
      },
      serverNow: 25000,
      isInputDisabled: true,
    })
  );
  assert.ok(htmlPaused.includes("disabled"));
});

// ============================================================================
// 5. PRESENTER SAFE ANONYMOUS ARENA PROJECTION
// ============================================================================
test("presenter arena: renders anonymous bracket, phase, and public summary with no private attempts", () => {
  const presenterArena = {
    id: "arena-tv-1",
    type: "arena",
    theme: "historical",
    phase: "fighting",
    openedAt: 1000,
    startAt: 5000,
    finishAt: 80000,
    resumeAt: 90000,
    duration: 75,
    questions: 8,
    spectator: true,
    bracket: [
      {
        match: 1,
        bye: false,
        left: { id: "p1", name: "Đấu sĩ 1", correct: 3, knockdowns: 1 },
        right: { id: "p2", name: "Đấu sĩ 2", correct: 2, knockdowns: 0 },
      },
      {
        match: 2,
        bye: true,
        left: { id: "p3", name: "Đấu sĩ 3", correct: 1, knockdowns: 0 },
        right: null,
      },
    ],
    entries: [
      {
        id: "p1",
        name: "Đấu sĩ 1",
        mascot: 0,
        match: 1,
        correct: 3,
        step: 3,
        hp: 3,
        knockdowns: 1,
        downs: 0,
        rank: 1,
        outcome: null,
        reward: 0,
        lastAt: 12000,
        withdrawn: false,
      },
      {
        id: "p2",
        name: "Đấu sĩ 2",
        mascot: 1,
        match: 1,
        correct: 2,
        step: 2,
        hp: 2,
        knockdowns: 0,
        downs: 1,
        rank: 2,
        outcome: null,
        reward: 0,
        lastAt: 13000,
        withdrawn: false,
      },
      {
        id: "p3",
        name: "Đấu sĩ 3",
        mascot: 2,
        match: 2,
        correct: 1,
        step: 1,
        hp: 3,
        knockdowns: 0,
        downs: 0,
        rank: 3,
        outcome: null,
        reward: 0,
        lastAt: 14000,
        withdrawn: false,
      },
    ],
  };

  const html = renderToStaticMarkup(
    React.createElement(LessonArenaPresenterPanel, {
      arena: presenterArena,
      serverNow: 25000,
    })
  );

  // Presenter shows TV header, phase, bracket, and leaderboard
  assert.ok(html.includes("Lôi Đài Ngũ Ấn · Long Thành"));
  assert.ok(html.includes("ĐANG THI ĐẤU"));
  assert.ok(html.includes("Trận #1"));
  assert.ok(html.includes("Trận #2"));
  assert.ok(html.includes("Có miễn đấu"));
  assert.ok(html.includes("Đấu sĩ 1"));
  assert.ok(html.includes("Đấu sĩ 2"));
  assert.ok(html.includes("Đấu sĩ 3"));
  assert.ok(html.includes("BẢNG XẾP HẠNG LÔI ĐÀI"));

  // Presenter MUST NOT render student private inputs, attempts, drafts, answers, or teacher guides
  assert.ok(!html.includes("<input"));
  assert.ok(!html.includes("Chiêu thức"));
  assert.ok(!html.includes("guides"));
  assert.ok(!html.includes("attempts"));
  assert.ok(!html.includes("draft"));
  assert.ok(!html.includes("expected"));
  assert.ok(!html.includes("steps"));
});
