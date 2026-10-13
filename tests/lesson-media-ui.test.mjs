import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  MEDIA_CATALOG,
  MEDIA_SETTINGS_KEY,
  DEFAULT_MEDIA_SETTINGS,
  normalizeMediaSettings,
  readMediaSettings,
  mediaReaction,
  createMediaGate,
  mediaEvents,
} from "../lib/media-catalog.js";

// Transpile useLessonMedia.ts for Node VM testing
const mediaTsSrc = await readFile(
  new URL("../components/lesson/useLessonMedia.ts", import.meta.url),
  "utf8"
);
const mediaJs = ts.transpileModule(mediaTsSrc, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;

const mediaExports = {};
vm.runInNewContext(mediaJs, {
  exports: mediaExports,
  require(name) {
    if (name === "react") return { ...React, default: React, __esModule: true };
    if (name.includes("media-catalog")) {
      return {
        MEDIA_CATALOG,
        MEDIA_SETTINGS_KEY,
        DEFAULT_MEDIA_SETTINGS,
        normalizeMediaSettings,
        readMediaSettings,
        mediaReaction,
        createMediaGate,
        mediaEvents,
        __esModule: true,
      };
    }
    throw new Error(`Unexpected import in useLessonMedia: ${name}`);
  },
});

const {
  QUIET_PHASES,
  canPlayLessonMedia,
  lessonMediaEvent,
  useLessonMedia,
} = mediaExports;

test("useLessonMedia hook and QUIET_PHASES are exported", () => {
  assert.equal(typeof useLessonMedia, "function");
  assert.ok(Array.isArray(QUIET_PHASES));
  assert.deepEqual(Array.from(QUIET_PHASES), ["formation", "recheck", "reflection", "exit"]);
});

test("canPlayLessonMedia blocks sound, meme, and effects in quiet phases", () => {
  for (const quietPhase of QUIET_PHASES) {
    // Sound is strictly blocked in quiet phases even if unlocked and settings are active
    assert.equal(
      canPlayLessonMedia({
        phase: quietPhase,
        gesture: true,
        settings: { master: true, sfx: true, volume: 80 },
        channel: "sound",
      }),
      false,
      `Sound must be blocked in ${quietPhase}`
    );

    // Meme is strictly blocked in quiet phases
    assert.equal(
      canPlayLessonMedia({
        phase: quietPhase,
        settings: { master: true, meme: true },
        channel: "meme",
      }),
      false,
      `Meme must be blocked in ${quietPhase}`
    );

    // Effects are strictly blocked in quiet phases
    assert.equal(
      canPlayLessonMedia({
        phase: quietPhase,
        settings: { master: true, effects: true, reducedMotion: false },
        channel: "effects",
      }),
      false,
      `Effects must be blocked in ${quietPhase}`
    );

    // Reaction text is also suppressed in quiet phases
    assert.equal(
      canPlayLessonMedia({
        phase: quietPhase,
        channel: "text",
      }),
      false,
      `Text must be blocked in ${quietPhase}`
    );
  }
});

test("canPlayLessonMedia blocks sound, meme, and effects in paused, concluded, waiting, locked, and teacher handoff statuses", () => {
  const blockingStatuses = ["paused", "concluded", "waiting"];
  for (const status of blockingStatuses) {
    assert.equal(
      canPlayLessonMedia({
        phase: "practice",
        status,
        gesture: true,
        channel: "sound",
      }),
      false,
      `Sound blocked when status is ${status}`
    );
    assert.equal(
      canPlayLessonMedia({
        phase: "practice",
        status,
        channel: "meme",
      }),
      false,
      `Meme blocked when status is ${status}`
    );
  }

  // Teacher handoff
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      teacherHandoff: true,
      gesture: true,
      channel: "sound",
    }),
    false,
    "Teacher handoff blocks sound"
  );

  // Timeline locked
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      locked: true,
      gesture: true,
      channel: "sound",
    }),
    false,
    "Locked timeline blocks sound"
  );
});

test("canPlayLessonMedia requires trusted gesture for sound and prevents autoplay at load", () => {
  // At load without user gesture: gesture=false
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      gesture: false,
      settings: { master: true, sfx: true, volume: 70 },
      channel: "sound",
    }),
    false,
    "Must not autoplay sound without trusted user gesture"
  );

  // After trusted gesture: gesture=true
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      gesture: true,
      settings: { master: true, sfx: true, volume: 70 },
      channel: "sound",
    }),
    true,
    "Sound allowed after trusted gesture"
  );

  // Experience phase also allows sound after gesture
  assert.equal(
    canPlayLessonMedia({
      phase: "experience",
      gesture: true,
      settings: { master: true, sfx: true, volume: 70 },
      channel: "sound",
    }),
    true,
    "Experience phase allows sound after gesture"
  );
});

test("canPlayLessonMedia respects master, sfx, meme, effects, volume, and hidden tab", () => {
  // Hidden tab drops everything
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      hidden: true,
      gesture: true,
      channel: "sound",
    }),
    false,
    "Hidden tab blocks sound"
  );
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      hidden: true,
      channel: "text",
    }),
    false,
    "Hidden tab blocks text"
  );

  // Master disabled
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      gesture: true,
      settings: { master: false, sfx: true, volume: 70 },
      channel: "sound",
    }),
    false,
    "master=false blocks sound"
  );

  // SFX disabled
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      gesture: true,
      settings: { master: true, sfx: false, volume: 70 },
      channel: "sound",
    }),
    false,
    "sfx=false blocks sound"
  );

  // Volume 0
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      gesture: true,
      settings: { master: true, sfx: true, volume: 0 },
      channel: "sound",
    }),
    false,
    "volume=0 blocks sound"
  );

  // Reduced motion disables visual pulses and effects
  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      settings: { master: true, effects: true, reducedMotion: true },
      channel: "effects",
    }),
    false,
    "reducedMotion=true blocks effects"
  );

  assert.equal(
    canPlayLessonMedia({
      phase: "practice",
      settings: { master: true, effects: true, reducedMotion: false },
      channel: "effects",
    }),
    true,
    "effects allowed when reducedMotion=false"
  );
});

test("canPlayLessonMedia allows short accessible text in experience and practice", () => {
  assert.equal(
    canPlayLessonMedia({ phase: "experience", channel: "text" }),
    true,
    "Text allowed in experience"
  );
  assert.equal(
    canPlayLessonMedia({ phase: "practice", channel: "text" }),
    true,
    "Text allowed in practice"
  );
});

test("lessonMediaEvent generates stable id and handles single event parameters", () => {
  const ev = lessonMediaEvent({
    category: "dice",
    id: "dice-roll-4",
    phase: "experience",
    revision: 3,
    round: 1,
  });

  assert.ok(ev);
  assert.equal(ev.category, "dice");
  assert.equal(ev.phase, "experience");
  assert.equal(ev.round, 1);
  assert.equal(ev.revision, 3);
  assert.match(ev.id, /dice:dice-roll-4/);
});

test("pending submissions stay neutral until a teacher returns an assessed result", () => {
  const before = { id: 's1', round: 1, currentActivity: { phase: 'practice' }, submissions: [] };
  const pending = { ...before, submissions: [{ submissionId: 'open-1', taskId: 't1', ok: false, assessmentStatus: 'pending' }] };
  assert.equal(lessonMediaEvent(before, pending).length, 0);
  for (const ok of [false, true]) {
    const assessed = { ...pending, submissions: [{ ...pending.submissions[0], ok, assessmentStatus: 'assessed' }] };
    assert.equal(lessonMediaEvent(pending, assessed)[0].category, ok ? 'correct' : 'wrong');
    assert.equal(lessonMediaEvent(assessed, assessed).length, 0);
  }
});

test("presenter supports teacher-owned anonymous fallback without a token", async () => {
  const presenter = await readFile(new URL("../app/presenter/page.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/lessons/lesson-dashboard.tsx", import.meta.url), "utf8");
  assert.match(presenter, /teacherOwnedPresenter/);
  assert.match(presenter, /!presenterToken && !teacherOwnedPresenter/);
  assert.match(dashboard, /presenter\?session=/);
});

test("lessonMediaEvent diffs view snapshots without leaking private answers or sources", () => {
  const prevView = {
    id: "sess-1",
    round: 1,
    revision: 2,
    timeline: { activityIndex: 0 },
    currentActivity: { phase: "practice" },
    diceTrack: { rolls: 1, position: 2 },
    submissions: [
      { submissionId: "sub-1", taskId: "t-1", ok: false, answer: { privateSecret: "hiddenKey" } },
    ],
    tasks: [{ id: "t-1", advertisedHints: [{ id: "h-1", opened: false }] }],
  };

  const nextView = {
    id: "sess-1",
    round: 1,
    revision: 3,
    timeline: { activityIndex: 1 },
    currentActivity: { phase: "practice" },
    diceTrack: { rolls: 2, position: 5 },
    submissions: [
      { submissionId: "sub-1", taskId: "t-1", ok: false, answer: { privateSecret: "hiddenKey" } },
      { submissionId: "sub-2", taskId: "t-2", ok: true, answer: { privateAnswer: "superSecret123" } },
    ],
    tasks: [{ id: "t-1", advertisedHints: [{ id: "h-1", opened: true }] }],
  };

  const events = lessonMediaEvent(prevView, nextView);
  assert.ok(Array.isArray(events));
  assert.ok(events.length > 0);

  // Check event categories derived
  const categories = events.map((e) => e.category);
  assert.ok(categories.includes("dice"), "Dice increment detected");
  assert.ok(categories.includes("move"), "Movement detected");
  assert.ok(categories.includes("correct"), "Correct submission detected");
  assert.ok(categories.includes("hint"), "Opened hint detected");

  // SAFETY & PRIVACY: Absolutely no private answers, secrets, or sources leaked in events
  const serialized = JSON.stringify(events);
  assert.ok(!serialized.includes("hiddenKey"), "No private keys leaked");
  assert.ok(!serialized.includes("superSecret123"), "No student answers leaked");
  assert.ok(!serialized.includes("privateAnswer"), "No answer objects leaked");

  // Deduplication check: categories are unique
  const uniqueCategories = new Set(categories);
  assert.equal(uniqueCategories.size, categories.length, "Events deduplicated by category");
});

test("createMediaGate deduplicates event ids and drops events when tab is hidden", () => {
  const gate = createMediaGate();
  const event1 = { id: "sess:1:dice:1", category: "dice" };

  // First time accepted
  assert.equal(gate.accept(event1, false), true);

  // Duplicate rejected
  assert.equal(gate.accept(event1, false), false);

  // Hidden tab rejected
  const event2 = { id: "sess:1:hint:2", category: "hint" };
  assert.equal(gate.accept(event2, true), false);

  // Invalid category or missing id rejected
  assert.equal(gate.accept({ id: "", category: "dice" }, false), false);
  assert.equal(gate.accept({ id: "foo", category: "unknownCategory" }, false), false);
});

test("settings normalization and safe parsing", () => {
  const norm = normalizeMediaSettings({ volume: 150, master: true, reducedMotion: false });
  assert.equal(norm.volume, 100, "Volume clamped to 100");
  assert.equal(norm.master, true);

  const normZero = normalizeMediaSettings({ volume: -20 });
  assert.equal(normZero.volume, 0, "Volume clamped to 0");

  const parsedSafe = readMediaSettings("{ invalid json }", true);
  assert.equal(parsedSafe.reducedMotion, true, "Safe parse fallback with os reduced motion");
});

test("mediaReaction resolves theme and educational text without equating speed to mastery", () => {
  const correctModern = mediaReaction("correct", "modern");
  assert.ok(correctModern);
  assert.equal(correctModern.reaction, "+");
  assert.match(correctModern.text, /Lập luận chính xác/);

  const correctHist = mediaReaction("correct", "historical");
  assert.ok(correctHist);
  // Educational text encourages learning, no speed/score mastery equating
  assert.ok(!correctHist.text.includes("thành thạo qua điểm số"));

  const diceReaction = mediaReaction("dice", "modern");
  assert.ok(diceReaction);
  assert.match(diceReaction.text, /Xúc xắc đã sẵn sàng/);
});

test("PlayPage keeps audio opt-in and separate wallet in utilities menu without autoplay", async () => {
  let playSrc = await readFile(new URL("../app/play/page.tsx", import.meta.url), "utf8");

  // Initialize state so synchronous SSR renders main view
  playSrc = playSrc.replace(
    "[isSessionRestored, setIsSessionRestored] = useState<boolean>(false)",
    "[isSessionRestored, setIsSessionRestored] = useState<boolean>(true)"
  );
  playSrc = playSrc.replace(
    "[sessionId, setSessionId] = useState<string | null>(null)",
    '[sessionId, setSessionId] = useState<string | null>("sess-play")'
  );
  playSrc = playSrc.replace(
    "[learnerId, setLearnerId] = useState<string | null>(null)",
    '[learnerId, setLearnerId] = useState<string | null>("learner-an")'
  );
  playSrc = playSrc.replace(
    "[bearerToken, setBearerToken] = useState<string | null>(null)",
    '[bearerToken, setBearerToken] = useState<string | null>("token-an")'
  );

  playSrc = playSrc.replace('[menuOpen, setMenuOpen] = useState<boolean>(false)', '[menuOpen, setMenuOpen] = useState<boolean>(true)');
  const playJs = ts.transpileModule(playSrc, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

  const mockStudentView = {
    id: "sess-play",
    status: "active",
    mode: "live",
    round: 1,
    timeline: { activityIndex: 0, currentActivityId: "act-1" },
    currentActivity: { phase: "practice", studentAction: "Nhiệm vụ kiểm chứng" },
    wallet: { earned: 20, bonus: 0 },
    group: { id: "g1", memberIds: ["learner-an"], wallet: { earned: 10, bonus: 0 } },
    extension: { authored: false, eligible: false, displaySafe: true },
    branch: "core",
    gamePlan: {
      theme: "historical",
      story: { title: "Hành Trình Ngũ Ấn", goal: "Thắp sáng ngọn hải đăng" },
      activityPlans: [{ id: "act-1", order: 1, phase: "practice", mapSegment: { coreGate: false } }],
    },
    diceTrack: { position: 3, rolls: 1 },
    passport: { name: "Trần Minh" },
    tasks: [],
  };

  const playExports = {};
  vm.runInNewContext(playJs, {
    exports: playExports,
    window: {
      setTimeout: (fn) => { fn(); return 1; },
      clearTimeout: () => {},
      location: { search: "" },
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { hidden: false, addEventListener: () => {}, removeEventListener: () => {} },
    require(name) {
      if (name === "react") return { ...React, default: React, __esModule: true };
      if (name.endsWith("/MathText")) return { default: ({ text }) => text, MathText: ({ text }) => text, __esModule: true };
      if (name.endsWith("/QuestionPager")) return { QuestionPager: ({items}) => React.createElement("section",null,items[0]?.content) };
      if (name.endsWith("/TaskInput")) return { default: () => null, __esModule: true };
      if (name.endsWith("/LessonThemedRoute")) return { default: () => null, LessonThemedRoute: () => null, getSafeWorldMetadata: () => ({ spriteImage: '/assets/mascots.png', mascots: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] }), __esModule: true };
      if (name.endsWith("/LessonMascotPicker")) return { LessonMascotPicker: () => null, LessonMascotChip: () => null, __esModule: true };
      if (name.endsWith("/LessonEncounterSheet")) return { LessonEncounterSheet: ({ children }) => React.createElement('div', { className: 'mock-sheet' }, children), __esModule: true };
      if (name.endsWith("/LessonMapStage")) return { LessonMapStage: () => null, __esModule: true };
      if (name.endsWith("/LessonWorldMap")) return { LessonWorldMap: () => null, __esModule: true };
      if (name.endsWith("/useLessonSession")) {
        return {
          useLessonSession: () => ({
            view: mockStudentView,
            dispatchCommand: () => ({ ok: true }),
            getRemainingMs: () => 180000,
          }),
          formatDuration: () => "03:00",
          __esModule: true,
        };
      }
      if (name.endsWith("/useLessonMedia")) {
        return {
          useLessonMedia: () => ({
            settings: { master: false, sfx: true, meme: true, effects: true, reducedMotion: false, volume: 70 },
            isUnlocked: false,
            activeReaction: null,
            unlockAudio: () => {},
            toggleMaster: () => {},
            updateSettings: () => {},
            clearReaction: () => {},
            canPlay: () => false,
            triggerReaction: () => {},
          }),
          canPlayLessonMedia,
          lessonMediaEvent,
          QUIET_PHASES,
          __esModule: true,
        };
      }
      if (name.endsWith(".css")) return {};
      if (name.endsWith("/ClassRosterPanel")) return { ClassRosterPanel: () => null };
      if (name.endsWith("/ContentScopePicker")) return { ContentScopePicker: () => null };
      if (name.endsWith("lesson-catalogue.json")) return { default: { lessons: [] } };
      if (name.endsWith("/PracticePanel")) return { PracticePanel: () => null };
      if (name.endsWith("/SessionRules")) return { SessionRules: () => null };
      if (name.endsWith("/ExplorationPanel")) return { ExplorationPanel: () => null, LessonAttention: () => null };
      if (name.endsWith("/TutorPanel")) return { TutorPanel: () => null };
      if (name.endsWith("/TeacherLessonTools")) return { TeacherLessonTools: () => null };
      if (name.endsWith("/LeaguePanel")) return { LeaguePanel: () => null };
      if (name.endsWith("/LessonModePanel")) return { LessonModePanel: () => null };
      if (name.endsWith("/ClassEventPanel")) return { ClassEventPanel: () => null };
      if (name.endsWith("/ValueReflection")) return { ValueReflection: () => null };
      if (name === "next/link") return { default: ({href, children}) => React.createElement("a", {href}, children), __esModule: true };
      throw new Error(`Unexpected import in PlayPage: ${name}`);
    },
  });

  const html = renderToStaticMarkup(React.createElement(playExports.default));

  // 1. Explicit visible "Bật phản hồi" button at load (No autoplay)
  assert.match(html, /Bật phản hồi/);
  assert.match(html, /Tiện ích trò chơi/);

  // 2. Wallets are separate (the dice disclaimer now lives in the map stage; see lesson-map-stage-ui.test.mjs)
  assert.match(html, /Ví cá nhân: 20/);
  assert.doesNotMatch(html, /play-learner-wallet/);

  // 3. Static student import: no private answers leaked
  assert.ok(!html.includes("hiddenKey"));
  assert.ok(!html.includes("answerKey"));
});

test("PresenterPage UI renders visible Bật phản hồi button and TV layout", async () => {
  let presSrc = await readFile(new URL("../app/presenter/page.tsx", import.meta.url), "utf8");

  presSrc = presSrc.replace(
    "[connected, setConnected] = useState<boolean>(false)",
    "[connected, setConnected] = useState<boolean>(true)"
  );
  presSrc = presSrc.replace(
    "[isSessionRestored, setIsSessionRestored] = useState<boolean>(false)",
    "[isSessionRestored, setIsSessionRestored] = useState<boolean>(true)"
  );
  presSrc = presSrc.replace(
    "[sessionId, setSessionId] = useState<string | null>(null)",
    '[sessionId, setSessionId] = useState<string | null>("sess-tv")'
  );
  presSrc = presSrc.replace(
    "[presenterToken, setPresenterToken] = useState<string | null>(null)",
    '[presenterToken, setPresenterToken] = useState<string | null>("token-tv")'
  );

  const presJs = ts.transpileModule(presSrc, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

  const mockPresenterView = {
    id: "sess-tv",
    status: "active",
    mode: "live",
    timeline: { activityIndex: 0, currentActivityId: "act-tv-1" },
    currentActivity: { phase: "practice", studentAction: "Trình chiếu TV hoạt động 1" },
    gamePlan: {
      theme: "future",
      story: { title: "Aurora TV", goal: "Chiếu sáng bầu trời" },
      activityPlans: [{ id: "act-tv-1", order: 1, phase: "practice", mapSegment: { coreGate: false } }],
    },
    tasks: [],
  };

  const presExports = {};
  vm.runInNewContext(presJs, {
    exports: presExports,
    window: {
      setTimeout: (fn) => { fn(); return 1; },
      clearTimeout: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { origin: "http://localhost:3000" },
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    },
    sessionStorage: { getItem: () => "sess-tv", setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { hidden: false, addEventListener: () => {}, removeEventListener: () => {} },
    require(name) {
      if (name === "react") return { ...React, default: React, __esModule: true };
      if (name.endsWith("/MathText")) return { default: ({ text }) => text, MathText: ({ text }) => text, __esModule: true };
      if (name.endsWith("/LessonThemedRoute")) return { default: () => null, LessonThemedRoute: () => null, getSafeWorldMetadata: () => ({ spriteImage: '/assets/mascots.png', mascots: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] }), __esModule: true };
      if (name.endsWith("/LessonMascotPicker")) return { LessonMascotPicker: () => null, LessonMascotChip: () => null, __esModule: true };
      if (name.endsWith("/LessonEncounterSheet")) return { LessonEncounterSheet: ({ children }) => React.createElement('div', { className: 'mock-sheet' }, children), __esModule: true };
      if (name.endsWith("/LessonMapStage")) return { LessonMapStage: () => null, __esModule: true };
      if (name.endsWith("/LessonWorldMap")) return { LessonWorldMap: () => null, __esModule: true };
      if (name.endsWith("/useLessonSession")) {
        return {
          useLessonSession: () => ({ view: mockPresenterView, getRemainingMs: () => 180000 }),
          formatDuration: () => "03:00",
          __esModule: true,
        };
      }
      if (name.endsWith("/useLessonMedia")) {
        return {
          useLessonMedia: () => ({
            settings: { master: false, sfx: true, meme: true, effects: true, reducedMotion: false, volume: 70 },
            isUnlocked: false,
            activeReaction: null,
            unlockAudio: () => {},
            toggleMaster: () => {},
            updateSettings: () => {},
            clearReaction: () => {},
            canPlay: () => false,
            triggerReaction: () => {},
          }),
          canPlayLessonMedia,
          lessonMediaEvent,
          QUIET_PHASES,
          __esModule: true,
        };
      }
      if (name.endsWith(".css")) return {};
      if (name.endsWith("/LessonModePanel")) return { LessonModePanel: () => null };
      if (name.endsWith("/ClassEventPanel")) return { ClassEventPanel: () => null };
      throw new Error(`Unexpected import in PresenterPage: ${name}`);
    },
  });

  const html = renderToStaticMarkup(React.createElement(presExports.default));

  // 1. Presenter TV layout
  assert.match(html, /presenter-shell/);

  // 2. Visible "Bật phản hồi" TV button without autoplay
  assert.match(html, /Bật phản hồi/);
  assert.match(html, /lesson-media-enable-btn/);

  // 3. Safe anonymity: no learner identity leaks
  assert.match(html, /Không hiển thị thông tin cá nhân học sinh/);
});

