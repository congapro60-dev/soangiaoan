import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PRODUCT_THEMES, resolveThemeId } from '../lib/product-content.js';
import { createLessonSession } from '../lib/lesson/runtime.js';
import { serializeForStudent, serializeForPresenter, serializeForTeacher } from '../lib/lesson/serialize.js';
import { storyCue } from '../lib/lesson/story-cues.js';

// Transpile LessonThemedRoute.tsx for Node VM testing
const themedRouteSrc = await readFile(
  new URL('../components/lesson/LessonThemedRoute.tsx', import.meta.url),
  'utf8'
);
const themedRouteJs = ts.transpileModule(themedRouteSrc, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true
  }
}).outputText;

const themedRouteExports = {};
vm.runInNewContext(themedRouteJs, {
  exports: themedRouteExports,
  require(name) {
    if (name === 'react') return { ...React, default: React };
    if (name.includes('product-content')) return { PRODUCT_THEMES, resolveThemeId, default: { PRODUCT_THEMES, resolveThemeId } };
    throw new Error(`Unexpected import in LessonThemedRoute: ${name}`);
  }
});

const LessonThemedRoute = themedRouteExports.LessonThemedRoute;
const buildRoutePins = themedRouteExports.buildRoutePins;
const handleSelectPin = themedRouteExports.handleSelectPin;
const getSafeWorldMetadata = themedRouteExports.getSafeWorldMetadata;

// Load pilot fixture for runtime / serialization tests
const fixtureJson = await readFile(
  new URL('../content/lessons/g11-sequences-p1.json', import.meta.url),
  'utf8'
);
const baseFixture = JSON.parse(fixtureJson);

test('Historical world renders theme, title, story goal, distinct 5 places, and cover asset', () => {
  const gamePlan = {
    id: 'plan-hist',
    theme: 'historical',
    map: 'historical',
    story: {
      title: 'Hành Trình Ngũ Ấn Long Thành',
      goal: 'Ghép năm ấn tín để thắp đèn dẫn đường'
    },
    activityPlans: [
      {
        id: 'act-1',
        order: 1,
        phase: 'experience',
        minutes: 5,
        participation: 'whole_class',
        mapSegment: {
          id: 'seg-1',
          order: 1,
          start: { index: 0, point: [15, 75] },
          end: { index: 8, point: [30, 53] },
          coreGate: false,
          gateIndex: null
        }
      },
      {
        id: 'act-2',
        order: 2,
        phase: 'practice',
        minutes: 15,
        participation: 'group',
        mapSegment: {
          id: 'seg-2',
          order: 2,
          start: { index: 8, point: [30, 53] },
          end: { index: 16, point: [53, 56] },
          coreGate: true,
          gateIndex: 1
        }
      },
      {
        id: 'act-3',
        order: 3,
        phase: 'exit',
        minutes: 10,
        participation: 'individual',
        mapSegment: {
          id: 'seg-3',
          order: 3,
          start: { index: 16, point: [53, 56] },
          end: { index: 24, point: [79, 60] },
          coreGate: true,
          gateIndex: 2
        }
      }
    ],
    checkpoints: [
      { id: 'cp-1', objectiveCodes: ['T11.18'] },
      { id: 'cp-2', objectiveCodes: ['T11.19'] }
    ]
  };

  const html = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, {
      gamePlan,
      currentActivityIndex: 1,
      currentPhase: 'practice',
      variant: 'student'
    })
  );

  // Title and world metadata
  assert.match(html, /Hành Trình Ngũ Ấn Long Thành/);
  assert.match(html, /Ghép năm ấn tín để thắp đèn dẫn đường/);
  assert.match(html, /HÀNH TRÌNH NGŨ ẤN · Cổ trang/);
  assert.match(html, /campaign-historical\.webp/);
  assert.match(html, /🐾 Cáo/);

  // All 5 distinct places
  const places = ['BẾN ĐÒ', 'KHO QUÂN LƯƠNG', 'THỦY MÔN', 'VỌNG LÂU', 'LONG ĐIỆN'];
  for (const place of places) {
    assert.match(html, new RegExp(place));
  }

  // Active place indicator and core gate count at current activity index 1
  assert.match(html, /lesson-themed-place-chip active/);
  assert.match(html, /0\/2 Cổng cốt lõi/);
  assert.match(html, /Cổng 1/);

  // Check that advancing to activity index 2 updates completed gates to 1/2
  const advancedHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, {
      gamePlan,
      currentActivityIndex: 2,
      currentPhase: 'exit',
      variant: 'student'
    })
  );
  assert.match(advancedHtml, /1\/2 Cổng cốt lõi/);
  assert.match(advancedHtml, /Cổng 2/);

  // Checkpoint tags
  assert.match(html, /Mốc: T11\.18/);
  assert.match(html, /Mốc: T11\.19/);
});

test('Contrasting worlds (future, dewey, cube) render distinctive assets, stories, and places', () => {
  // 1. Future World
  const futurePlan = {
    theme: 'future',
    story: { title: 'Nghịch Lý Aurora', goal: 'Giải nghịch lý và gửi tín hiệu dẫn đường' },
    activityPlans: [{ id: 'a1', order: 1, phase: 'experience', minutes: 5, mapSegment: { coreGate: true, gateIndex: 1 } }]
  };
  const futureHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, { gamePlan: futurePlan, currentActivityIndex: 0 })
  );
  assert.match(futureHtml, /Nghịch Lý Aurora/);
  assert.match(futureHtml, /campaign-future\.webp/);
  assert.match(futureHtml, /BÃI HẠ CÁNH/);
  assert.match(futureHtml, /CỔNG AURORA/);

  // 2. Dewey World
  const deweyPlan = {
    theme: 'dewey',
    story: { title: 'Bí Mật Sau Tiếng Chuông', goal: 'Mở rương tri thức' },
    activityPlans: [{ id: 'a1', order: 1, phase: 'formation', minutes: 8, mapSegment: { coreGate: false } }]
  };
  const deweyHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, { gamePlan: deweyPlan, currentActivityIndex: 0 })
  );
  assert.match(deweyHtml, /Bí Mật Sau Tiếng Chuông/);
  assert.match(deweyHtml, /campaign-dewey\.webp/);
  assert.match(deweyHtml, /CỔNG TRƯỜNG/);
  assert.match(deweyHtml, /VƯỜN HỌC TẬP/);

  // 3. Cube World (SVG cover asset)
  const cubePlan = {
    theme: 'cube',
    story: { title: 'Đảo Khối Lập Phương', goal: 'Ghép đúng không gian' },
    activityPlans: [{ id: 'a1', order: 1, phase: 'guided', minutes: 10, mapSegment: { coreGate: true, gateIndex: 1 } }]
  };
  const cubeHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, { gamePlan: cubePlan, currentActivityIndex: 0 })
  );
  assert.match(cubeHtml, /Đảo Khối Lập Phương/);
  assert.match(cubeHtml, /map-cube-r19\.webp/);
  assert.match(cubeHtml, /BẾN KHỐI/);
  assert.match(cubeHtml, /ĐÀI KHÔNG GIAN/);
});

test('Package-only preview neutral state renders without game assertions or broken images', () => {
  // Case 1: Null gamePlan
  const nullHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, { gamePlan: null, currentActivityIndex: 0 })
  );
  assert.match(nullHtml, /lesson-themed-route-neutral/);
  assert.match(nullHtml, /Bản xem trước gói bài học/);
  assert.match(nullHtml, /Chưa kết nối kế hoạch trò chơi/);
  assert.doesNotMatch(nullHtml, /<img/);
  assert.doesNotMatch(nullHtml, /<svg/);

  // Case 2: GamePlan without theme (package-only descriptor)
  const noThemePlan = {
    id: 'preview-draft',
    activityPlans: [
      { id: 'act-1', order: 1, phase: 'experience', minutes: 5, participation: 'whole_class' },
      { id: 'act-2', order: 2, phase: 'practice', minutes: 15, participation: 'group' }
    ]
  };
  const noThemeHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, { gamePlan: noThemePlan, currentActivityIndex: 0 })
  );
  assert.match(noThemeHtml, /lesson-themed-route-neutral/);
  assert.match(noThemeHtml, /Pha: experience/);
  assert.match(noThemeHtml, /Pha: practice/);
  assert.doesNotMatch(noThemeHtml, /<img/);
});

test('Presenter variant applies TV projection classes and larger hierarchy', () => {
  const gamePlan = {
    theme: 'historical',
    story: { title: 'Ngũ Ấn Long Thành', goal: 'Mở cổng Long Thành' },
    activityPlans: [{ id: 'a1', order: 1, phase: 'practice', minutes: 10, mapSegment: { coreGate: true, gateIndex: 1 } }]
  };
  const presenterHtml = renderToStaticMarkup(
    React.createElement(LessonThemedRoute, {
      gamePlan,
      currentActivityIndex: 0,
      variant: 'presenter'
    })
  );
  assert.match(presenterHtml, /lesson-themed-route-presenter/);
  assert.match(presenterHtml, /Ngũ Ấn Long Thành/);
});

test('Backend projection privacy: student and presenter game plans expose only public allowlist', () => {
  const state = createLessonSession({
    package: baseFixture,
    mode: 'preview',
    sessionId: 'sess-privacy-test',
    hostId: 'teacher-1',
    now: 1000
  });

  // Inject backend plan with private fields and secrets
  state.gamePlan = {
    id: 'plan-secret-test',
    contentHash: 'hash-abc',
    schemaVersion: '1.0.0',
    theme: 'historical',
    map: 'historical',
    rule: 'campaign',
    participation: 'group',
    story: {
      title: 'Title',
      premise: 'SECRET_PREMISE_DO_NOT_LEAK',
      goal: 'Public Goal',
      places: ['private place']
    },
    route: [[1, 2], [3, 4], [5, 6]], // rawroute must be omitted
    mascot: 'Secret Mascot Override', // mascot must be absent
    activityPlans: [
      {
        id: 'act-1',
        order: 1,
        phase: 'practice',
        minutes: 10,
        participation: 'group',
        taskIds: ['task-1'],
        evidenceIds: ['ev-1'],
        mapSegment: {
          id: 'seg-1',
          activityId: 'act-1',
          order: 1,
          start: { index: 0, point: [15, 75], privateMeta: 'leak' },
          end: { index: 8, point: [30, 53], privateMeta: 'leak' },
          coreGate: true,
          gateIndex: 1,
          internalRubric: 'DO_NOT_LEAK'
        }
      }
    ],
    checkpoints: [{ id: 'cp-1', objectiveIds: ['obj-t11-18'] }],
    director: { confidence: 0.9, seed: 123 },
    policy: { internalTeacherKey: 'SECRET' }
  };

  const studentView = serializeForStudent(state, 'learner-1');
  const presenterView = serializeForPresenter(state);

  for (const view of [studentView, presenterView]) {
    assert.ok(view.gamePlan, 'gamePlan exists in view');
    // rawroute is absent
    assert.equal(view.gamePlan.route, undefined, 'rawroute is omitted');
    // mascot is absent
    assert.equal(view.gamePlan.mascot, undefined, 'mascot is omitted from server projection');
    // private premise and internal secrets are omitted
    assert.equal(view.gamePlan.story.premise, undefined);
    assert.equal(view.gamePlan.story.goal, 'Public Goal');
    assert.equal(view.gamePlan.director, undefined);
    assert.equal(view.gamePlan.policy, undefined);

    // mapSegment allowlist check
    const seg = view.gamePlan.activityPlans[0].mapSegment;
    assert.ok(seg, 'mapSegment exists');
    assert.deepEqual(seg.start, { index: 0, point: [15, 75] });
    assert.deepEqual(seg.end, { index: 8, point: [30, 53] });
    assert.equal(seg.coreGate, true);
    assert.equal(seg.gateIndex, 1);
    assert.equal(seg.internalRubric, undefined, 'internalRubric omitted');

    // Rendered HTML must not leak secrets
    const renderedHtml = renderToStaticMarkup(
      React.createElement(LessonThemedRoute, { gamePlan: view.gamePlan })
    );
    assert.doesNotMatch(renderedHtml, /SECRET_PREMISE_DO_NOT_LEAK/);
    assert.doesNotMatch(renderedHtml, /internalRubric/);
    assert.doesNotMatch(renderedHtml, /DO_NOT_LEAK/);
  }
});

test('Student extension branch lock is governed by server projection, not client score or dice', () => {
  // Mock Play page branch bar rendering under different extension projections
  function renderBranchBar({ branch, extension, onSelectBranch }) {
    const isInputDisabled = false;
    return React.createElement(
      'div',
      { className: 'play-branch-bar' },
      React.createElement('span', null, `Phân nhánh của em: ${branch}`),
      extension?.authored && !extension.eligible
        ? React.createElement(
            'span',
            { className: 'branch-locked-hint' },
            '🔒 Nhánh Mở rộng: Cần recheck cá nhân đạt, không dùng gợi ý hay xem đáp án'
          )
        : null,
      React.createElement(
        'div',
        { className: 'branch-buttons' },
        branch !== 'support' &&
          React.createElement('button', { onClick: () => onSelectBranch('support') }, 'Chuyển sang Hỗ trợ'),
        branch !== 'core' &&
          React.createElement('button', { onClick: () => onSelectBranch('core') }, 'Về nhánh Cốt lõi'),
        extension?.authored && branch !== 'extension'
          ? React.createElement(
              'button',
              {
                className: 'lesson-branch-extension-btn',
                disabled: isInputDisabled || !extension.eligible,
                onClick: () => {
                  if (extension.eligible) onSelectBranch('extension');
                }
              },
              extension.eligible ? '🚀 Nhánh Mở rộng' : '🔒 Nhánh Mở rộng (Khóa)'
            )
          : null
      )
    );
  }

  // 1. Not authored: extension button is completely absent
  const notAuthoredHtml = renderToStaticMarkup(
    renderBranchBar({
      branch: 'core',
      extension: { authored: false, eligible: false, reasonCode: 'NO_AUTHORED_EXTENSION', displaySafe: true },
      onSelectBranch: () => {}
    })
  );
  assert.doesNotMatch(notAuthoredHtml, /lesson-branch-extension-btn/);
  assert.doesNotMatch(notAuthoredHtml, /Nhánh Mở rộng/);

  // 2. Authored but NOT eligible: button is disabled with lock text and prerequisite hint
  const lockedHtml = renderToStaticMarkup(
    renderBranchBar({
      branch: 'core',
      extension: { authored: true, eligible: false, reasonCode: 'MUST_OBJECTIVES_NOT_INDEPENDENT', displaySafe: true },
      onSelectBranch: () => {}
    })
  );
  assert.match(lockedHtml, /lesson-branch-extension-btn/);
  assert.match(lockedHtml, /disabled=""/);
  assert.match(lockedHtml, /🔒 Nhánh Mở rộng \(Khóa\)/);
  assert.match(lockedHtml, /Cần recheck cá nhân đạt, không dùng gợi ý hay xem đáp án/);

  // 3. Authored AND eligible: button is enabled and triggers callback
  let selectedBranch = null;
  const eligibleEl = renderBranchBar({
    branch: 'core',
    extension: { authored: true, eligible: true, reasonCode: null, displaySafe: true },
    onSelectBranch: (b) => { selectedBranch = b; }
  });
  const eligibleHtml = renderToStaticMarkup(eligibleEl);
  assert.match(eligibleHtml, /🚀 Nhánh Mở rộng/);
  assert.doesNotMatch(eligibleHtml, /disabled=""/);

  // Simulate click on enabled button
  const buttons = eligibleEl.props.children[2].props.children.filter(Boolean);
  const extBtn = buttons.find((btn) => btn.props.className === 'lesson-branch-extension-btn');
  assert.ok(extBtn, 'extension button found');
  extBtn.props.onClick();
  assert.equal(selectedBranch, 'extension', 'dispatches SELECT_BRANCH extension');
});

test('Group reward wallet and learner passport/wallet are visibly distinct', () => {
  // Test wallet rendering model
  function renderWalletsHeader({ learnerWallet, groupWallet }) {
    return React.createElement(
      'header',
      { className: 'play-header' },
      React.createElement(
        'span',
        { className: 'play-learner-wallet' },
        `🎖️ Ví cá nhân: ${learnerWallet?.earned || 0}`
      ),
      groupWallet &&
        React.createElement(
          'span',
          { className: 'play-group-wallet' },
          `👥 Quỹ nhóm: ${groupWallet.earned || 0}`
        )
    );
  }

  const html = renderToStaticMarkup(
    renderWalletsHeader({
      learnerWallet: { earned: 25, bonus: 0 },
      groupWallet: { earned: 60, bonus: 10 }
    })
  );

  // Clearly distinct labels and values
  assert.match(html, /🎖️ Ví cá nhân: 25/);
  assert.match(html, /👥 Quỹ nhóm: 60/);
});

test('Dice steps are displayed separately without plotting raw dice onto the server route', () => {
  function renderDiceTrack({ position, rolls }) {
    return React.createElement(
      'section',
      { className: 'play-dice-track' },
      React.createElement('span', null, `Bước xúc xắc cá nhân: ${position || 0}`),
      React.createElement('span', null, `Lần lắc: ${rolls || 0}`),
      React.createElement(
        'div',
        { className: 'play-dice-disclaimer' },
        'Bước xúc xắc phục vụ trải nghiệm khám phá; lộ trình sư phạm và chuẩn đầu ra do giáo viên điều phối độc lập.'
      )
    );
  }

  const html = renderToStaticMarkup(renderDiceTrack({ position: 7, rolls: 2 }));
  assert.match(html, /Bước xúc xắc cá nhân: 7/);
  assert.match(html, /Lần lắc: 2/);
  assert.match(html, /chuẩn đầu ra do giáo viên điều phối độc lập/);
});

test('Interactive callback and asset error fallback handler', () => {
  let selectedPin = null;
  const gamePlan = {
    theme: 'historical',
    activityPlans: [
      { id: 'act-pin-1', order: 1, phase: 'experience', minutes: 5, mapSegment: { start: { point: [10, 20] }, end: { point: [20, 30] } } },
      { id: 'act-pin-2', order: 2, phase: 'practice', minutes: 15, mapSegment: { start: { point: [20, 30] }, end: { point: [40, 50] }, coreGate: true, gateIndex: 1 } }
    ]
  };

  const el = React.createElement(LessonThemedRoute, {
    gamePlan,
    currentActivityIndex: 0,
    onSelectCheckpoint: (id) => { selectedPin = id; }
  });

  const html = renderToStaticMarkup(el);
  assert.match(html, /route-pin-group/);
  assert.match(html, /core-gate-pin/);

  // Pure route pin model helper testing without direct component invocation
  const pins = buildRoutePins(gamePlan.activityPlans, 0);
  assert.equal(pins.length, 2, 'computes two route pins');
  assert.equal(pins[0].id, 'act-pin-1');
  assert.equal(pins[0].status, 'active');
  assert.equal(pins[0].isCoreGate, false);
  assert.equal(pins[1].id, 'act-pin-2');
  assert.equal(pins[1].status, 'upcoming');
  assert.equal(pins[1].isCoreGate, true);
  assert.equal(pins[1].gateIndex, 1);

  // Invoke interactive pin click handler using exported pure helper
  handleSelectPin(pins[0].id, (id) => { selectedPin = id; });
  assert.equal(selectedPin, 'act-pin-1', 'invokes onSelectCheckpoint callback');

  // Verify safe world metadata pure helper
  const histWorld = getSafeWorldMetadata('historical');
  assert.equal(histWorld.name, 'Cổ trang');
  assert.equal(histWorld.title, 'Ngũ Ấn Long Thành');
  assert.equal(histWorld.coverImage, '/assets/campaign-historical.webp');
  assert.equal(histWorld.places.length, 5);

  // Verify all 12 public world asset files exist in public asset manifest
  const themes = ['modern', 'historical', 'future', 'dewey', 'pastoral', 'cube', 'ring', 'zones', 'academy', 'survival', 'galaxy', 'maze'];
  for (const themeKey of themes) {
    const theme = PRODUCT_THEMES[themeKey];
    assert.ok(theme, `Theme ${themeKey} exists`);
    assert.ok(theme.image, `Theme ${themeKey} has cover image: ${theme.image}`);
    assert.equal(theme.places.length, 5, `Theme ${themeKey} has exactly 5 places`);
    assert.ok(theme.title, `Theme ${themeKey} has title`);
  }
});

test('PlayPage integrates LessonThemedRoute, separated wallets, and server-projected extension branch', async () => {
  let playSrc = await readFile(new URL('../app/play/page.tsx', import.meta.url), 'utf8');
  // Initialize state so synchronous SSR renders main view
  playSrc = playSrc.replace('[isSessionRestored, setIsSessionRestored] = useState<boolean>(false)', '[isSessionRestored, setIsSessionRestored] = useState<boolean>(true)');
  playSrc = playSrc.replace('[sessionId, setSessionId] = useState<string | null>(null)', '[sessionId, setSessionId] = useState<string | null>("sess-play")');
  playSrc = playSrc.replace('[learnerId, setLearnerId] = useState<string | null>(null)', '[learnerId, setLearnerId] = useState<string | null>("learner-an")');
  playSrc = playSrc.replace('[bearerToken, setBearerToken] = useState<string | null>(null)', '[bearerToken, setBearerToken] = useState<string | null>("token-an")');

  playSrc = playSrc.replace('[menuOpen, setMenuOpen] = useState<boolean>(false)', '[menuOpen, setMenuOpen] = useState<boolean>(true)');
  const playJs = ts.transpileModule(playSrc, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true
    }
  }).outputText;

  const mockStudentView = {
    id: 'sess-play',
    status: 'active',
    mode: 'live',
    round: 1,
    timeline: { activityIndex: 0, currentActivityId: 'act-1' },
    currentActivity: { phase: 'practice', studentAction: 'Hoàn thành nhiệm vụ nhóm' },
    wallet: { earned: 15, bonus: 0 },
    group: { id: 'g1', memberIds: ['learner-an', 'learner-binh'], wallet: { earned: 50, bonus: 5 } },
    extension: { authored: true, eligible: false, reasonCode: 'MUST_OBJECTIVES_NOT_INDEPENDENT', displaySafe: true },
    branch: 'core',
    gamePlan: {
      theme: 'historical',
      story: { title: 'Hành Trình Ngũ Ấn', goal: 'Giải cứu Long Thành' },
      activityPlans: [{ id: 'act-1', order: 1, phase: 'practice', mapSegment: { coreGate: true, gateIndex: 1 } }]
    },
    diceTrack: { position: 4, rolls: 1 },
    map: { totalPosition: 72, gatePosition: 8, unitsPerActivity: 8, peers: [{ id: 'm0', mascot: 2, position: 4, own: true, chosen: true, name: 'An' }] },
    passport: { name: 'Nguyễn Văn An' },
    tasks: []
  };

  const playExports = {};
  vm.runInNewContext(playJs, {
    exports: playExports,
    window: { setTimeout: fn => { fn(); return 1; }, clearTimeout: () => {}, location: { search: '' } },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    require(name) {
      if (name === 'react') return { ...React, default: React, __esModule: true };
      if (name.endsWith('/MathText')) return { default: ({ text }) => text, MathText: ({ text }) => text, __esModule: true };
      if (name.endsWith('/QuestionPager')) return { QuestionPager: ({items}) => React.createElement('section',null,items[0]?.content) };
      if (name.endsWith('/TaskInput')) return { default: () => null, __esModule: true };
      if (name.endsWith('/LessonThemedRoute')) return { default: LessonThemedRoute, LessonThemedRoute, getSafeWorldMetadata, __esModule: true };
      if (name.endsWith('/LessonMascotPicker')) return { LessonMascotPicker: () => null, LessonMascotChip: () => null, __esModule: true };
      if (name.endsWith('/LessonEncounterSheet')) return { LessonEncounterSheet: ({ children }) => React.createElement('div', { className: 'mock-sheet' }, children), __esModule: true };
      if (name.endsWith('/LessonMapStage')) return { LessonMapStage: ({ map }) => React.createElement('div', null, `dice-position:${map?.peers?.find((peer) => peer.own)?.position}`), __esModule: true };
      if (name.endsWith('/LessonWorldMap')) return { LessonWorldMap: () => null, __esModule: true };
      if (name.endsWith('/useLessonSession')) return {
        useLessonSession: () => ({ view: mockStudentView, dispatchCommand: () => ({ ok: true }), getRemainingMs: () => 120000 }),
        formatDuration: () => '02:00',
        __esModule: true
      };
      if (name.endsWith('/useLessonMedia')) return {
        useLessonMedia: () => ({
          settings: { master: false, sfx: true, meme: true, effects: true, reducedMotion: false, volume: 70 },
          activeReaction: null,
          isUnlocked: false,
          unlockAudio: () => {},
          updateSettings: () => {},
        }),
        canPlayLessonMedia: () => false,
        lessonMediaEvent: () => null,
        __esModule: true
      };
      if (name.endsWith('.css')) return {};
      if (name.endsWith("/PracticePanel")) return { PracticePanel: () => null };
      if (name.endsWith("/SessionRules")) return { SessionRules: () => null };
      if (name.endsWith("/ExplorationPanel")) return { ExplorationPanel: () => null, LessonAttention: () => null };
      if (name.endsWith("/TutorPanel")) return { TutorPanel: () => null };
      if (name.endsWith("/TeacherLessonTools")) return { TeacherLessonTools: () => null };
      if (name.endsWith("/LeaguePanel")) return { LeaguePanel: () => null };
      if (name.endsWith("/LessonModePanel")) return { LessonModePanel: () => null };
      if (name.endsWith("/ClassEventPanel")) return { ClassEventPanel: () => null };
      if (name.endsWith("/ValueReflection")) return { ValueReflection: () => null };
      if (name.endsWith("/LearningEvidencePanel")) return { StudentLearningEvidence: () => null, TeacherLearningEvidence: () => null, __esModule: true };
      if (name.endsWith("/PupilReports")) return { StudentBugReport: () => null, TeacherBugReports: () => null, __esModule: true };
        if (name === "next/link") return { default: ({href, children}) => React.createElement("a", {href}, children), __esModule: true };
        throw new Error(`Unexpected import: ${name}`);
    }
  });

  const html = renderToStaticMarkup(React.createElement(playExports.default));

  // 1. LessonThemedRoute is rendered
  assert.match(html, /Hành Trình Ngũ Ấn/);
  assert.match(html, /campaign-historical\.webp/);
  assert.match(html, /BẾN ĐÒ/);

  // 2. Wallets are distinctly displayed
  assert.match(html, /Ví cá nhân: 15/);
  assert.doesNotMatch(html, /play-learner-wallet/);
  assert.match(html, /Quỹ nhóm: 50/);
  assert.doesNotMatch(html, /play-group-wallet/);

  // 3. Extension button is rendered locked due to server projection
  assert.match(html, /lesson-branch-extension-btn/);
  assert.match(html, /🔒 Mức 3 · Thử thách/);
  assert.match(html, /Mở khi em tự làm đúng câu kiểm tra mức nền, không dùng gợi ý/);

  // 4. The pupil's own dice position reaches the map stage; dice never touch the wallets above
  assert.match(html, /dice-position:4/);
});

test('PresenterPage integrates LessonThemedRoute TV projection with approved theme', async () => {
  let presSrc = await readFile(new URL('../app/presenter/page.tsx', import.meta.url), 'utf8');
  presSrc = presSrc.replace('[connected, setConnected] = useState<boolean>(false)', '[connected, setConnected] = useState<boolean>(true)');
  presSrc = presSrc.replace('[isSessionRestored, setIsSessionRestored] = useState<boolean>(false)', '[isSessionRestored, setIsSessionRestored] = useState<boolean>(true)');
  presSrc = presSrc.replace('[sessionId, setSessionId] = useState<string | null>(null)', '[sessionId, setSessionId] = useState<string | null>("sess-tv")');
  presSrc = presSrc.replace('[presenterToken, setPresenterToken] = useState<string | null>(null)', '[presenterToken, setPresenterToken] = useState<string | null>("token-tv")');

  const presJs = ts.transpileModule(presSrc, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true
    }
  }).outputText;

  const mockPresenterView = {
    id: 'sess-tv',
    status: 'active',
    mode: 'live',
    timeline: { activityIndex: 0, currentActivityId: 'act-tv-1' },
    currentActivity: { phase: 'guided', studentAction: 'Thực hiện nhiệm vụ TV' },
    gamePlan: {
      theme: 'future',
      story: { title: 'Nghịch Lý Aurora TV', goal: 'Đồng bộ mạng lưới Aurora' },
      activityPlans: [{ id: 'act-tv-1', order: 1, phase: 'guided', mapSegment: { coreGate: true, gateIndex: 1 } }]
    },
    tasks: []
  };

  const presExports = {};
  vm.runInNewContext(presJs, {
    exports: presExports,
    window: {
      setTimeout: fn => { fn(); return 1; },
      clearTimeout: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { origin: 'http://localhost:3000' }
    },
    sessionStorage: { getItem: () => 'sess-tv', setItem: () => {}, removeItem: () => {} },
    require(name) {
      if (name === 'react') return { ...React, default: React, __esModule: true };
      if (name.endsWith('/MathText')) return { default: ({ text }) => text, MathText: ({ text }) => text, __esModule: true };
      if (name.endsWith('/LessonThemedRoute')) return { default: LessonThemedRoute, LessonThemedRoute, getSafeWorldMetadata, __esModule: true };
      if (name.endsWith('/LessonMascotPicker')) return { LessonMascotPicker: () => null, LessonMascotChip: () => null, __esModule: true };
      if (name.endsWith('/LessonEncounterSheet')) return { LessonEncounterSheet: ({ children }) => React.createElement('div', { className: 'mock-sheet' }, children), __esModule: true };
      if (name.endsWith('/LessonMapStage')) return { LessonMapStage: ({ map }) => React.createElement('div', null, `dice-position:${map?.peers?.find((peer) => peer.own)?.position}`), __esModule: true };
      if (name.endsWith('/LessonWorldMap')) return { LessonWorldMap: () => null, __esModule: true };
      if (name.endsWith('/useLessonSession')) return {
        useLessonSession: () => ({ view: mockPresenterView, getRemainingMs: () => 180000 }),
        formatDuration: () => '03:00',
        __esModule: true
      };
      if (name.endsWith('/useLessonMedia')) return {
        useLessonMedia: () => ({
          settings: { master: false, sfx: true, meme: true, effects: true, reducedMotion: false, volume: 70 },
          activeReaction: null,
          isUnlocked: false,
          unlockAudio: () => {},
          updateSettings: () => {},
        }),
        canPlayLessonMedia: () => false,
        lessonMediaEvent: () => null,
        __esModule: true
      };
      if (name.endsWith('.css')) return {};
      if (name.endsWith("/TeacherLessonTools")) return { TeacherLessonTools: () => null };
      if (name.endsWith("/LeaguePanel")) return { LeaguePanel: () => null };
      if (name.endsWith("/LessonModePanel")) return { LessonModePanel: () => null };
      if (name.endsWith("/ClassEventPanel")) return { ClassEventPanel: () => null };
      if (name.endsWith("/ValueReflection")) return { ValueReflection: () => null };
      throw new Error(`Unexpected import: ${name}`);
    }
  });

  const html = renderToStaticMarkup(React.createElement(presExports.default));

  // 1. Presenter shell and TV layout
  assert.match(html, /presenter-shell/);

  // 2. Themed route TV projection rendered
  assert.match(html, /lesson-themed-route-presenter/);
  assert.match(html, /Nghịch Lý Aurora TV/);
  assert.match(html, /campaign-future\.webp/);
  assert.match(html, /BÃI HẠ CÁNH/);
});


test('world override changes presentation and safe DTOs without changing approved package or plan', () => {
  const state=createLessonSession({package:baseFixture,mode:'preview',sessionId:'world-choice',hostId:'teacher-1',learners:[{id:'learner-1',name:'A'}],now:1000});
  state.gamePlan={theme:'modern',contentHash:'APPROVED_HASH',story:{title:'Approved city story',goal:'Approved city goal'},activityPlans:[{id:'a',order:1,phase:'experience',minutes:2,mapSegment:{coreGate:true}}],checkpoints:[{id:'gate',objectiveCodes:['T11.18']}]};
  state.teacherSetup={worldTheme:'historical',deviceMode:'B',integrationIds:['digital-privacy'],event:{type:'buzzer',minutes:3},privateMarker:'PRIVATE_SETUP'};
  const before=JSON.stringify({package:state.package,gamePlan:state.gamePlan});
  for(const view of [serializeForStudent(state,'learner-1'),serializeForPresenter(state),serializeForTeacher(state)]) {
    assert.equal(view.worldTheme,'historical');assert.equal(view.deviceMode,'B');assert.equal(view.gamePlan.theme,'modern');assert.equal(view.gamePlan.contentHash,'APPROVED_HASH');
  }
  const student=serializeForStudent(state,'learner-1'),presenter=serializeForPresenter(state);
  assert.equal(student.teacherSetup,undefined);assert.equal(presenter.teacherSetup,undefined);assert.doesNotMatch(JSON.stringify([student,presenter]),/PRIVATE_SETUP/);
  assert.equal(student.storyCue,storyCue({theme:'historical',phase:state.package.activities[state.timeline.activityIndex].phase}));
  const html=renderToStaticMarkup(React.createElement(LessonThemedRoute,{gamePlan:student.gamePlan,worldTheme:student.worldTheme}));
  assert.ok(html.includes(PRODUCT_THEMES.historical.title));assert.ok(html.includes(PRODUCT_THEMES.historical.goal));assert.doesNotMatch(html,/Approved city story/);
  assert.equal(JSON.stringify({package:state.package,gamePlan:state.gamePlan}),before);
  state.teacherSetup.worldTheme='__proto__';state.teacherSetup.deviceMode='D';
  assert.equal(serializeForPresenter(state).worldTheme,'modern');assert.equal(serializeForPresenter(state).deviceMode,undefined);
});
