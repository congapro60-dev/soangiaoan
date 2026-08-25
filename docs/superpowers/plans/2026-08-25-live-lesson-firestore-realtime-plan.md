# V3 Live Lesson Firestore Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Tích hợp runtime tiết học phân hoá realtime vào SmartPlan AI hiện tại để học sinh gửi phản hồi, giáo viên điều khiển nhịp và TV nhận thống kê tổng hợp qua Firestore mà vẫn có đường chạy offline.

**Architecture:** Tạo lớp liveLesson độc lập, tham chiếu bài học adaptive và gói nội dung pilot đã chuẩn hoá. Teacher mode là chủ phiên và tính aggregate từ responses; TV chỉ đọc public state/stats; student mode ghi response của chính mình sau khi đăng nhập lớp/PIN. Ba chế độ dùng chung route /adaptive-live/:sessionId?mode=....

**Tech Stack:** React 19 + TypeScript + Vite, Firebase Auth/Firestore SDK, Firestore Rules Emulator, Vitest, React Router, Tailwind hiện có, Vcast/Sender cho cửa sổ TV.

---

## Phạm vi file

### Tạo mới

- src/lib/liveLesson/types.ts — kiểu dữ liệu runtime, response, session và public stats.
- src/lib/liveLesson/definition.ts — chuẩn hoá và kiểm tra LiveLessonDefinition.
- src/lib/liveLesson/aggregate.ts — reducer thuần tính thống kê.
- src/lib/liveLesson/aggregate.test.ts — test reducer, dedup và không rò PII.
- src/lib/liveLesson/definition.test.ts — test gói pilot có đủ cue/TV/student step.
- src/services/liveLessonService.ts — CRUD phiên, submit response, listeners và publish public state/stats.
- src/services/liveLessonService.test.ts — test helper/path/payload ở Firebase boundary.
- src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.json — dữ liệu runtime chuẩn hoá từ package V2.
- src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues.ts — cue P00–P40 cho teacher mode.
- src/components/liveLesson/LiveLessonLauncher.tsx — chọn lớp và tạo phiên.
- src/components/liveLesson/TeacherLiveView.tsx — timeline, timer, điều khiển session và aggregate.
- src/components/liveLesson/TvLiveView.tsx — màn hình chiếu học sinh.
- src/components/liveLesson/StudentLiveView.tsx — đăng nhập lớp/PIN, câu hỏi và gửi response.
- src/components/liveLesson/LiveLessonStatus.tsx — trạng thái kết nối, đồng bộ và lỗi.
- src/pages/LiveLessonPage.tsx — route loader, chọn mode và subscriptions.
- tests/rules/liveLesson.rules.test.ts — Firestore Rules test.
- docs/features/08-live-lesson-realtime.md — hướng dẫn giáo viên.

### Sửa

- src/main.tsx — thêm route /adaptive-live/:sessionId.
- src/App.tsx — truyền lớp hiện có và mở launcher live.
- src/pages/AdaptiveLessonListPage.tsx — thêm nút Mở tiết trực tiếp.
- src/lib/classroom/classroomService.ts — lấy danh sách lớp Firestore của giáo viên.
- src/services/studentPortalApi.ts — giữ session login học sinh dùng chung với live mode, không đổi safety guard.
- firestore.rules — thêm namespace liveLessonSessions.
- tasks/todo.md — ghi checkpoint và kết quả QA.

### Không sửa trong feature này

- Không thay renderer của AdaptiveStudentPortalPage.
- Không xoá V2 local-first, PPTX, DOCX hoặc V1 archive.
- Không deploy production, sửa dữ liệu lớp thật hoặc push main trước khi smoke test.

---

## Task 0: Baseline worktree and project health

**Files:**

- Modify: tasks/todo.md only with baseline results.

- [ ] **Step 1: Install dependencies in the isolated worktree**

~~~powershell
npm install
~~~

Use the project package-lock and do not change dependency versions for this feature.

- [ ] **Step 2: Capture the pre-feature baseline**

~~~powershell
npm run test
npm run lint
npm run lint:api
npm run build
~~~

Record command, exit code and the first actionable error in tasks/todo.md. A pre-existing failure must remain distinguishable from a V3 regression; do not edit unrelated files to make the baseline green.

- [ ] **Step 3: Verify the Rules test harness**

~~~powershell
npm run test:rules
~~~

If the emulator is unavailable, record the exact environment error and continue only with unit tests until the emulator can be started.

- [ ] **Step 4: Commit the baseline record if it changes tasks/todo.md**

~~~powershell
git add tasks/todo.md
git commit -m "chore(live-lesson): record clean worktree baseline"
~~~

---

## Task 1: Chuẩn hoá gói pilot và type boundary

**Files:**

- Create: src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.json
- Create: src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues.ts
- Create: src/lib/liveLesson/types.ts
- Create: src/lib/liveLesson/definition.ts
- Test: src/lib/liveLesson/definition.test.ts

- [ ] **Step 1: Đưa package V2 vào nguồn build có kiểm soát**

Lấy nội dung từ file lesson_package.json trong artifacts/lesson-pilot/g10_w5_p31_bpt_tiet1, đưa vào src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.json, giữ các trường meta, displayContract, timeline, tvScreens, studentScreens, aiErrorOfTheWeek, routeTasks, quickCheck, exitTicket, board, notebook, resources và fallback. Kiểm tra diff để không đưa teacher hoặc board script vào trường TV/student.

Chạy:

~~~powershell
node -e "JSON.parse(require('fs').readFileSync('src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.json','utf8')); console.log('JSON_PASS')"
~~~

Expected: JSON_PASS.

- [ ] **Step 2: Tách cue P00–P40 khỏi script HTML cũ**

Tạo module cue TypeScript từ các cue hiện có trong teacher_console.js. Mỗi cue có shape:

~~~ts
export interface LiveCue {
  id: string;
  atSeconds: number;
  label: string;
  tvScreenId: string;
  teacher: string;
  student: string;
  boardLarge: string;
  boardSide: string;
  notebook: string;
  observerEvidence: string;
  responseStepId?: string;
}
~~~

Giữ các mốc AI Error tại 1005/1035/1080/1170 giây, tuyến M/S/C, quick check và exit ticket. Không phân tích chuỗi teacher_console.js ở production; module cue là nguồn dữ liệu có kiểu rõ ràng.

- [ ] **Step 3: Tạo type boundary và normalizer tối thiểu**

Trong types.ts định nghĩa LiveLessonMode, LiveSessionStatus, LiveResponseType, LiveLessonDefinition, LiveResponse, LiveLessonSession, LiveLessonState, LiveLessonStatePatch, LivePublicStats, LivePublicState, CreateLiveSessionInput, SubmitLiveResponseInput và LiveLessonDefinitionError.

LiveLessonDefinition phải có id, lessonId, title, durationSeconds, cues, tvScreens, studentScreens, allowedStepIds, aiErrorStepId và responseSteps. LiveResponse phải có id, participantUid, classId, stepId, responseType, value, clientNonce, submittedAt và updatedAt.

Các input phải thống nhất với service:

~~~ts
export interface LiveLessonStatePatch {
  status?: LiveSessionStatus;
  currentCueId?: string;
  currentTvScreenId?: string;
  publicStateEnabled?: boolean;
  publicStatsEnabled?: boolean;
}

export interface SubmitLiveResponseInput {
  sessionId: string;
  participantUid: string;
  classId: string;
  stepId: string;
  responseType: LiveResponseType;
  value: string | number | boolean;
  clientNonce: string;
}
~~~

definition.ts kiểm tra đúng 40 phút, cue tăng dần, tvScreenId tồn tại, allowedStepIds không trùng, giới hạn text và W01 có đủ phân loại/sửa/chứng minh. Lỗi ném LiveLessonDefinitionError với mã ổn định.

- [ ] **Step 4: Viết test đỏ cho package**

Test tối thiểu:

~~~ts
it('normalizes the G10 pilot into the live runtime contract', () => {
  const definition = getPilotLiveLessonDefinition();
  expect(definition.durationSeconds).toBe(2400);
  expect(definition.cues.length).toBeGreaterThanOrEqual(20);
  expect(definition.tvScreens).toHaveLength(12);
  expect(definition.studentScreens).toHaveLength(11);
  expect(definition.aiErrorStepId).toBe('ai-error-w01');
  expect(definition.allowedStepIds).toContain('quick-check');
});

it('rejects an undeclared TV screen', () => {
  expect(() => validateLiveLessonDefinition(badFixture))
    .toThrow('LIVE_TV_SCREEN_NOT_FOUND');
});
~~~

Chạy:

~~~powershell
npm run test -- src/lib/liveLesson/definition.test.ts
~~~

Expected at first: FAIL vì type/normalizer chưa tồn tại.

- [ ] **Step 5: Implement normalizer và chạy test**

Implement getPilotLiveLessonDefinition từ JSON + cue module. Chạy focused test và npm run lint.

- [ ] **Step 6: Commit**

~~~powershell
git add src/data/liveLessonPackages src/lib/liveLesson/types.ts src/lib/liveLesson/definition.ts src/lib/liveLesson/definition.test.ts
git commit -m "feat(live-lesson): normalize pilot runtime package"
~~~

## Task 2: Reducer aggregate thuần và idempotency

**Files:**

- Create: src/lib/liveLesson/aggregate.ts
- Test: src/lib/liveLesson/aggregate.test.ts

- [ ] **Step 1: Viết test đỏ**

Test việc đếm lựa chọn, khởi tạo category bằng zero, loại participantUid khỏi public output và lấy bản mới nhất của cùng participant + step.

~~~ts
it('counts route choices without exposing participant identity', () => {
  const stats = aggregateLiveResponses([
    response('u-a', 'route', 'M'),
    response('u-b', 'route', 'S'),
    response('u-c', 'route', 'S'),
  ], 'route');

  expect(stats.participantCount).toBe(3);
  expect(stats.routeCounts).toEqual({ M: 1, S: 2, C: 0 });
  expect(JSON.stringify(stats)).not.toContain('u-a');
});

it('uses the latest response per participant and step', () => {
  const stats = aggregateLiveResponses([
    response('u-a', 'ai-error', 'Logical', 'old'),
    response('u-a', 'ai-error', 'Missing condition', 'new'),
  ], 'ai-error');

  expect(stats.errorCategoryCounts).toEqual({
    Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 1,
  });
});
~~~

- [ ] **Step 2: Implement pure reducer**

Expose mergeLatestResponse, aggregateLiveResponses và toPublicStats. Dùng participantUid + stepId làm stable key, sort theo updatedAt, khởi tạo đủ category và chỉ phát ra count/boolean/number. Raw text và student IDs không được đi qua toPublicStats.

- [ ] **Step 3: Test và commit**

~~~powershell
npm run test -- src/lib/liveLesson/aggregate.test.ts src/lib/liveLesson/definition.test.ts
git add src/lib/liveLesson/aggregate.ts src/lib/liveLesson/aggregate.test.ts
git commit -m "feat(live-lesson): add deterministic public stats reducer"
~~~

Expected: focused tests PASS.

## Task 3: Firestore service boundary

**Files:**

- Create: src/services/liveLessonService.ts
- Create: src/services/liveLessonService.test.ts
- Modify: src/lib/classroom/classroomService.ts
- Modify: src/services/studentPortalApi.ts

- [ ] **Step 1: Define service contracts**

Implement:

~~~ts
export interface CreateLiveSessionInput {
  definition: LiveLessonDefinition;
  teacherUid: string;
  classId: string;
}

export async function createLiveLessonSession(input: CreateLiveSessionInput): Promise<LiveLessonSession>;
export async function getLiveLessonSession(sessionId: string): Promise<LiveLessonSession | null>;
export async function updateLiveLessonState(sessionId: string, patch: LiveLessonStatePatch): Promise<void>;
export async function closeLiveLessonSession(sessionId: string): Promise<void>;
export async function submitLiveResponse(input: SubmitLiveResponseInput): Promise<void>;
export async function publishLivePublicStats(sessionId: string, stats: LivePublicStats): Promise<void>;
export function subscribeToTeacherResponses(sessionId: string, stepId: string, onChange: (rows: LiveResponse[]) => void, onError: (error: Error) => void): () => void;
export function subscribeToLivePublicState(sessionId: string, onChange: (state: LivePublicState | null) => void, onError: (error: Error) => void): () => void;
export function subscribeToLivePublicStats(sessionId: string, onChange: (stats: LivePublicStats | null) => void, onError: (error: Error) => void): () => void;
~~~

Use document paths liveLessonSessions/sessionId, nested responses, public/state and public/stats. Use Firestore Timestamp/serverTimestamp for expiry/update fields. responseId is participantUid + "__" + stepId, so a retry updates one document; clientNonce remains stable.

- [ ] **Step 2: Add class listing helper**

Add listTeacherClasses(teacherId): Promise<ClassDoc[]> beside listTeacherClassIds in classroomService.ts, querying classes with where teacherId == teacherId, mapping document IDs and sorting by name. Reuse ClassDoc.

- [ ] **Step 3: Reuse student PIN result safely**

Keep the existing loginStudent guard that refuses to replace a non-anonymous teacher session. Add only a typed helper that stores the LoginResponse in namespaced sessionStorage and restores it after refresh. Never store PIN. If the anonymous session has no studentLinks document, show the login form.

- [ ] **Step 4: Write service contract tests**

Test random session IDs, allowedStepIds copied from definition, deterministic response path, text length rejection before Firestore, close state, and unsubscribe functions.

- [ ] **Step 5: Implement and run**

~~~powershell
npm run test -- src/services/liveLessonService.test.ts src/lib/liveLesson/aggregate.test.ts
npm run lint
~~~

- [ ] **Step 6: Commit**

~~~powershell
git add src/services/liveLessonService.ts src/services/liveLessonService.test.ts src/lib/classroom/classroomService.ts src/services/studentPortalApi.ts
git commit -m "feat(live-lesson): add Firestore session service boundary"
~~~

## Task 4: Firestore Rules and Emulator coverage

**Files:**

- Modify: firestore.rules
- Create: tests/rules/liveLesson.rules.test.ts

- [ ] **Step 1: Add isolated rules helpers and match block**

Add match /liveLessonSessions/{sessionId}. Enforce:

~~~text
teacher create: auth.uid == request.resource.data.teacherUid
teacher update/delete: auth.uid == resource.data.teacherUid
student response write: auth.uid == participantUid and studentLinks/auth.uid.classId == session.classId
student response read: own response only, or teacher owner
public/state and public/stats read: active, unexpired, public flag true
student cannot write public docs or session state
~~~

Use keys().hasOnly, type/length limits, immutable identity fields, request.time < expiresAt and allowedStepIds checks. Do not broaden personalizationCache. Keep existing class/adaptive matches unchanged.

- [ ] **Step 2: Seed emulator fixtures**

Create teacher A, teacher B, class owned by teacher A, studentLinks for student A in that class, studentLinks for student B in another class, active session and closed/expired session.

- [ ] **Step 3: Write security tests**

Cover owner create/update, other-teacher denial, linked student own write, wrong-class denial, no raw response read, public aggregate read, disabled/closed/expired public denial, forged identity denial, oversized text denial and unknown step denial.

- [ ] **Step 4: Run Rules before UI**

~~~powershell
npm run test:rules
~~~

Expected: existing Rules suite and live lesson suite PASS. If a baseline suite fails before the new tests, record the exact pre-existing failure in tasks/todo.md and do not weaken new Rules.

- [ ] **Step 5: Commit**

~~~powershell
git add firestore.rules tests/rules/liveLesson.rules.test.ts
git commit -m "feat(live-lesson): secure Firestore realtime session rules"
~~~

## Task 5: Launcher and route integration

**Files:**

- Create: src/components/liveLesson/LiveLessonLauncher.tsx
- Create: src/pages/LiveLessonPage.tsx
- Modify: src/pages/AdaptiveLessonListPage.tsx
- Modify: src/App.tsx
- Modify: src/main.tsx

- [ ] **Step 1: Add published lesson action**

Extend AdaptiveLessonListPageProps with onOpenLiveLesson and classes. Render Mở tiết trực tiếp only for published lessons. Keep existing row open/edit/delete behavior.

- [ ] **Step 2: Build launcher**

Launcher receives the selected lesson, loads server classes when props are absent, filters to classes owned by auth.currentUser.uid, requires one class and calls createLiveLessonSession. On success show:

~~~text
GV: /adaptive-live/{id}?mode=teacher
TV: /adaptive-live/{id}?mode=tv
HS: /adaptive-live/{id}?mode=student
~~~

Add copy buttons and QR for the student URL. If class is not synchronized, show a warning and do not create the session.

- [ ] **Step 3: Add route loader**

Add route /adaptive-live/:sessionId. LiveLessonPage reads sessionId and mode, loads session + definition, rejects unknown modes, and passes only mode-specific data. Teacher mode requires current user owner. TV/student props must not contain teacher cue text.

- [ ] **Step 4: Test launcher/route**

Test draft/archived lessons have no live action, no-class blocks creation, all links share one ID, and unknown session/mode renders a recoverable error.

- [ ] **Step 5: Build**

~~~powershell
npm run lint
npm run build
~~~

- [ ] **Step 6: Commit**

~~~powershell
git add src/components/liveLesson/LiveLessonLauncher.tsx src/pages/LiveLessonPage.tsx src/pages/AdaptiveLessonListPage.tsx src/App.tsx src/main.tsx
git commit -m "feat(live-lesson): launch realtime sessions from adaptive lessons"
~~~

## Task 6: Teacher mode and TV mode vertical slice

**Files:**

- Create: src/components/liveLesson/TeacherLiveView.tsx
- Create: src/components/liveLesson/TvLiveView.tsx
- Create: src/components/liveLesson/LiveLessonStatus.tsx
- Modify: src/pages/LiveLessonPage.tsx

- [ ] **Step 1: Test cue transitions and surface separation**

Verify next/previous bounds, closed-session write guard, teacher cue contains teacher/board fields and TV view contains only tvScreenId/public prompt.

- [ ] **Step 2: Implement TeacherLiveView**

Subscribe to session state and current-step responses. Render P00–P40 progress/timer, teacher cue, board large/side, notebook action, next/back/pause/show-hide stats/close controls and aggregate cards. Navigation calls updateLiveLessonState. Response snapshots run aggregateLiveResponses and publishLivePublicStats. Closed/expired sessions cannot continue state writes.

- [ ] **Step 3: Implement TvLiveView**

Subscribe only to public/state, public/stats and public lesson screen definition. Render high-contrast 16:9 content, aggregate cards, waiting/updated/offline states. Do not render teacher text, board script, names, PIN, raw response, answer key or hidden solution.

- [ ] **Step 4: Local two-window smoke**

~~~powershell
npm run dev -- --host 0.0.0.0
~~~

Open teacher and TV URLs separately. Advance cue, toggle public stats and verify TV changes without reload. Record observed delay in tasks/todo.md.

- [ ] **Step 5: Commit**

~~~powershell
git add src/components/liveLesson/TeacherLiveView.tsx src/components/liveLesson/TvLiveView.tsx src/components/liveLesson/LiveLessonStatus.tsx src/pages/LiveLessonPage.tsx
git commit -m "feat(live-lesson): add teacher and TV realtime views"
~~~

## Task 7: Student mode, class login and offline queue

**Files:**

- Create: src/components/liveLesson/StudentLiveView.tsx
- Create: src/lib/liveLesson/offlineQueue.ts
- Test: src/lib/liveLesson/offlineQueue.test.ts
- Modify: src/pages/LiveLessonPage.tsx

- [ ] **Step 1: Write queue tests**

Prove duplicate enqueue keeps one item, markSynced removes it, network failure retains it and malformed payload is rejected before storage. Use a namespaced localStorage key and never store PIN.

- [ ] **Step 2: Implement login gate**

Check namespaced sessionStorage from existing loginStudent. If absent, render class/PIN fields and call loginStudent. After success verify returned classId matches session. If browser has non-anonymous teacher auth, show safety message and do not call signInAnonymously.

- [ ] **Step 3: Implement response controls**

Route/choice/boolean write on confirmation; hint writes one event per tier; text/exit ticket writes only on Gửi and respects max length; AI Error stores category, correction/proof status and reason as allowed steps. Show local queued versus server-confirmed state. Do not reveal answer before package reveal time.

- [ ] **Step 4: Implement retry**

On online, focus and mount, drain sequentially. Permission denied, closed and expired are permanent visible errors; network errors remain pending. Deduplicate by response document ID.

- [ ] **Step 5: Browser smoke**

Join as student A, submit route, verify teacher/TV counts, disable network and submit exit ticket, re-enable network and verify exactly one new count.

- [ ] **Step 6: Commit**

~~~powershell
git add src/components/liveLesson/StudentLiveView.tsx src/lib/liveLesson/offlineQueue.ts src/lib/liveLesson/offlineQueue.test.ts src/pages/LiveLessonPage.tsx
git commit -m "feat(live-lesson): add class-bound student mode and offline queue"
~~~

## Task 8: Close-session progress bridge and documentation

**Files:**

- Create: src/lib/liveLesson/progressBridge.ts
- Test: src/lib/liveLesson/progressBridge.test.ts
- Modify: src/pages/LiveLessonPage.tsx
- Create: docs/features/08-live-lesson-realtime.md
- Modify: tasks/todo.md

- [ ] **Step 1: Define close bridge**

Accept only a closed session, definition and normalized per-student submissions. Return a valid existing StudentSessionProgressRecord payload or a structured not_ready result; never write partial progress that looks completed.

~~~ts
export type ProgressBridgeResult =
  | { kind: 'ready'; record: StudentSessionProgressRecord }
  | { kind: 'not_ready'; reason: 'missing_diagnostic' | 'missing_quick_check' | 'missing_exit_ticket' };
~~~

For the G10 pilot, map route, quick check and exit ticket only when required response steps are server-confirmed. Keep raw live responses teacher-only; write existing adaptive record through its established service/API boundary.

- [ ] **Step 2: Test bridge**

Test incomplete participant refusal, complete participant identity mapping and idempotent close/retry.

- [ ] **Step 3: Connect close action**

Teacher close writes status=closed, then runs bridge. UI reports eligible records and incomplete evidence without claiming all students completed.

- [ ] **Step 4: Write teacher guide**

Document: synchronize class, publish lesson, open live, select class, copy HS link/QR, open TV in separate window, cast TV window only, keep teacher mode on laptop, close session, use V2 package/PPTX/phiếu offline when needed. Include wrong-class, non-synchronized class, expired session, wrong Vcast window and delayed-statistics troubleshooting.

- [ ] **Step 5: Commit**

~~~powershell
git add src/lib/liveLesson/progressBridge.ts src/lib/liveLesson/progressBridge.test.ts src/pages/LiveLessonPage.tsx docs/features/08-live-lesson-realtime.md tasks/todo.md
git commit -m "feat(live-lesson): bridge completed results and document pilot use"
~~~

## Task 9: Verification gate and handoff

**Files:**

- Modify: tasks/todo.md with exact outputs and known gaps.

- [ ] **Step 1: Focused unit tests**

~~~powershell
npm run test -- src/lib/liveLesson src/services/liveLessonService.test.ts
~~~

Expected: all liveLesson tests PASS.

- [ ] **Step 2: Rules tests**

~~~powershell
npm run test:rules
~~~

Expected: existing Rules suite and liveLesson.rules.test.ts PASS; no unauthenticated raw-response read.

- [ ] **Step 3: Static checks/build**

~~~powershell
npm run lint
npm run lint:api
npm run build
~~~

Expected: zero TypeScript/build errors. If full lint is resource-constrained, run focused checks and record the exact limitation instead of marking it green.

- [ ] **Step 4: Three-context browser integration**

Run teacher, student and TV contexts against emulator/local app. Verify cue propagation and aggregate update within 5 seconds on stable network, no teacher script in TV DOM/text, retry no double count, wrong-class denial, closed/expired denial and offline queue recovery.

- [ ] **Step 5: Visual QA**

Check TV presentation size and laptop size for no horizontal overflow, readable stats, visible connection state and no fixed overlay hiding controls. Recheck V2 local-first fallback.

- [ ] **Step 6: Handoff without deployment**

Report branch/commits, tests, local commands, Rules deployment command to run only after user asks, known limitations and the fact that PowerPoint remains offline-only. Do not push main, deploy Rules or deploy Vercel automatically.

---

## Self-review

- Spec coverage: session creation, class identity, response writes, teacher/TV/student modes, public aggregate docs, Rules, idempotency, offline queue, V2 fallback, bridge and browser/Rules/build QA are assigned.
- No parallel classroom system: existing class/PIN and studentLinks are reused; only liveLessonSessions is new.
- No public PII: raw responses remain teacher-only; TV reads aggregate docs.
- No false realtime claim: acceptance requires a real onSnapshot browser test.
- Type consistency: domain types and pure reducers precede service/UI consumers.
- Scope boundary: guest anonymous mode, generic authoring and live PowerPoint mutation are out of scope.
