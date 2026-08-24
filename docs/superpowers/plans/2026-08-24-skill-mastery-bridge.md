# Skill & Mastery Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nối classroom evidence, practice attempt và adaptive objective bằng một `skillId` ổn định cùng reducer mastery deterministic, vẫn giữ nguyên dữ liệu topic legacy và ranh giới privacy hiện tại.

**Architecture:** Tạo shared learning layer tại `src/lib/learning/` gồm contract, catalog pilot, adapter bảo thủ và reducer thuần. `studentProfiles.skills` là summary canonical mới; `topics` và `evidenceSubmissionIds` vẫn là compatibility view. Practice và adaptive chỉ thêm `skillIds` optional, không suy luận skill bằng AI và không tạo migration phá huỷ.

**Tech Stack:** React + TypeScript + Vite, Firebase/Firestore Admin API, Vitest, Firebase Rules Unit Testing.

---

### Task 1: Khóa contract và catalog pilot

**Files:**
- Create: `src/lib/learning/skillTypes.ts`
- Create: `src/lib/learning/skillCatalog.ts`
- Test: `src/lib/learning/skillCatalog.test.ts`

- [ ] **Step 1: Write failing catalog tests**

  Test các hành vi bắt buộc:

  ```ts
  it('catalog có skillId ổn định, alias duy nhất và không có prerequisite cycle', () => {
    expect(new Set(SKILL_CATALOG.map(skill => skill.skillId)).size).toBe(SKILL_CATALOG.length);
    expect(SKILL_CATALOG.every(skill => skill.skillId.startsWith('math.'))).toBe(true);
    expect(findSkillByTopic('phương trình đường thẳng')?.skillId).toBe('math.line-equation');
    expect(findSkillByTopic('chủ đề không có trong catalog')).toEqual({ kind: 'unknown', topic: 'chủ đề không có trong catalog' });
    expect(validateSkillCatalog(SKILL_CATALOG)).toEqual([]);
  });

  it('topic khớp nhiều alias không bị nối mù', () => {
    expect(findSkillByTopic('hàm số')).toMatchObject({ kind: 'ambiguous' });
  });
  ```

- [ ] **Step 2: Run the focused test and verify RED**

  Run:

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test -- src/lib/learning/skillCatalog.test.ts
  ```

  Expected: fail because the shared learning contract and catalog do not exist.

- [ ] **Step 3: Implement the minimal contract and catalog**

  Define `SkillStatus`, `SkillEvidenceSource`, `SkillSignal`, `SkillTrend`, `SkillDefinition`, `SkillEvidence`, `StudentSkillState` and a versioned 3-skill pilot catalog covering the existing classroom/adaptive fixtures: `math.line-equation`, `math.linear-function`, and `math.quadratic-function`. Include exact Vietnamese aliases, prerequisite IDs, misconception codes and policy thresholds. `findSkillByTopic` must return `unique`, `unknown` or `ambiguous`; never choose an ambiguous match.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run the same command; expected: all catalog tests pass.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/lib/learning/skillTypes.ts src/lib/learning/skillCatalog.ts src/lib/learning/skillCatalog.test.ts
  git commit -m "feat(learning): add versioned pilot skill catalog"
  ```

### Task 2: Build deterministic topic/objective bridge

**Files:**
- Create: `src/lib/learning/skillBridge.ts`
- Test: `src/lib/learning/skillBridge.test.ts`
- Modify: `src/lib/adaptive/types.ts:73-85`
- Modify: `src/lib/classroom/types.ts:218-310`

- [ ] **Step 1: Write failing adapter tests**

  Cover unique topic mapping, unknown/ambiguous preservation, explicit adaptive `skillId`, and normalization of homework/practice evidence. Assert that AI draft evidence is not authoritative and that all numeric confidence/score values are clamped to `[0, 1]`.

- [ ] **Step 2: Run the focused test and verify RED**

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test -- src/lib/learning/skillBridge.test.ts
  ```

- [ ] **Step 3: Implement the adapter and optional compatibility fields**

  Add `skillId?: string` to `ProfileTopic`, `ProfileEvidenceRef`, `LearningObjective`, `PracticeSetDoc`, `PracticeQuestionPublic`, `PracticeQuestionKey`, `PracticeAttemptDoc` and `PracticeQuestionResult`. Keep every field optional. Implement `mapTopicToSkill`, `mapObjectiveToSkill` and `toSkillEvidence`; only an explicit objective `skillId` or a unique catalog alias can produce canonical evidence.

- [ ] **Step 4: Run focused adapter tests and the existing adaptive/classroom type tests**

  Expected: new tests and all affected existing tests pass.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/lib/learning/skillBridge.ts src/lib/learning/skillBridge.test.ts src/lib/adaptive/types.ts src/lib/classroom/types.ts
  git commit -m "feat(learning): bridge classroom topics to adaptive skills"
  ```

### Task 3: Implement the mastery reducer

**Files:**
- Create: `src/lib/learning/skillMastery.ts`
- Test: `src/lib/learning/skillMastery.test.ts`

- [ ] **Step 1: Write failing reducer tests**

  Test these exact policies:

  ```ts
  it('giữ skill không được đánh giá và không làm tăng mastery vì thiếu evidence', () => {});
  it('approved homework và transfer mạnh hơn practice formative', () => {});
  it('practice không tự đưa skill lên mastered khi thiếu evidence chất lượng cao', () => {});
  it('resubmission cùng assignment không đếm như evidence độc lập', () => {});
  it('retry cùng attemptId không tăng evidenceCount', () => {});
  it('tính trend theo evidence gần nhất và kẹp score/confidence', () => {});
  ```

- [ ] **Step 2: Run focused reducer tests and verify RED**

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test -- src/lib/learning/skillMastery.test.ts
  ```

- [ ] **Step 3: Implement the pure reducer**

  Expose `reduceSkillStates(definitions, evidence)` and `reduceSkillState(definition, evidence)`. Deduplicate by assignment for homework and by attempt for practice, preserve source kinds separately from evidence count, use policy constants for source weights/thresholds, and never infer evidence for a skill absent from the input. `weak` requires two independent non-formative evidence sources; absent high-quality evidence caps status at `developing`.

- [ ] **Step 4: Run reducer tests and refactor only while green**

  Expected: focused tests pass with no changes to policy semantics.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/lib/learning/skillMastery.ts src/lib/learning/skillMastery.test.ts
  git commit -m "feat(learning): add deterministic skill mastery reducer"
  ```

### Task 4: Persist canonical skill state without breaking legacy profiles

**Files:**
- Modify: `src/lib/classroom/types.ts:238-245`
- Modify: `src/lib/classroom/profileMerge.ts`
- Modify: `src/lib/classroom/submissionService.ts`
- Modify: `api/grade-homework.ts`
- Modify: `api/classroom.ts`
- Test: `src/lib/classroom/profileMerge.test.ts`
- Test: `api/__tests__/grade-homework.practice.test.ts`
- Test: `api/__tests__/classroom-delete-handlers.test.ts`

- [ ] **Step 1: Add failing integration tests**

  Assert that approved homework updates `topics` and `skills`, practice updates only formative skill evidence, an AI draft does not update canonical skills, same-assignment replacement is idempotent, deleting a submission removes only its skill evidence, and a legacy profile without `skills` remains readable.

- [ ] **Step 2: Run affected tests and verify RED**

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test -- src/lib/classroom/profileMerge.test.ts api/__tests__/grade-homework.practice.test.ts api/__tests__/classroom-delete-handlers.test.ts
  ```

- [ ] **Step 3: Implement lazy, non-destructive profile writes**

  Add `skills?: StudentSkillState[]` to `StudentProfileDoc`. Build canonical evidence from approved grade/practice data through `skillBridge`, reduce it with `skillMastery`, and write `skills` with `merge: true` while preserving `topics`, legacy refs and unrelated fields. Do not create skill evidence when the topic is unknown/ambiguous or the grade is unapproved. For deletion, remove only the matching evidence ID and recompute the affected state.

- [ ] **Step 4: Run affected tests and full type checks**

  Expected: affected API/classroom tests pass; `lint` and `lint:api` remain green.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/lib/classroom/types.ts src/lib/classroom/profileMerge.ts src/lib/classroom/submissionService.ts api/classroom.ts api/grade-homework.ts src/lib/classroom/profileMerge.test.ts api/__tests__/grade-homework.practice.test.ts api/__tests__/classroom-delete-handlers.test.ts
  git commit -m "feat(learning): persist canonical skill states lazily"
  ```

### Task 5: Tag practice and one adaptive objective

**Files:**
- Modify: `api/grade-homework.ts`
- Modify: `src/lib/classroom/gradingPrompt.ts`
- Modify: one existing adaptive lesson fixture/generator that owns the pilot objective
- Test: `api/__tests__/grade-homework.practice.test.ts`
- Test: affected adaptive tests

- [ ] **Step 1: Write failing tagging tests**

  Assert that a practice set generated from a uniquely mapped topic carries the same `skillIds` through public set, private key and attempt; ambiguous/unknown topics remain topic-only; one adaptive objective carries an explicit `skillId` and the bridge reads it without title matching.

- [ ] **Step 2: Run focused tests and verify RED**

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test -- api/__tests__/grade-homework.practice.test.ts src/lib/adaptive
  ```

- [ ] **Step 3: Implement safe tagging**

  Derive tags server-side from the catalog/adapter, not from untrusted client input and not from a new AI call. Keep private answer keys server-only; skill IDs are safe metadata but are still validated against the catalog.

- [ ] **Step 4: Run focused tests and API lint**

  Expected: no answer key appears in public responses; practice evidence remains formative.

- [ ] **Step 5: Commit**

  ```powershell
  git add api/grade-homework.ts src/lib/classroom/gradingPrompt.ts src/lib/adaptive src/lib/classroom/types.ts api/__tests__/grade-homework.practice.test.ts
  git commit -m "feat(learning): tag practice and adaptive evidence"
  ```

### Task 6: Display safe skill summary and finish QA

**Files:**
- Modify: `src/components/features/classroom/student/StudentPortalDashboard.tsx`
- Modify: the classroom student projection/type consumer that reads `StudentProfileDoc`
- Test: relevant portal view-model tests
- Create/modify: `tasks/session_2026-08-24-skill-mastery-bridge.md`

- [ ] **Step 1: Write failing view-model tests**

  Assert that the student sees status, confidence, trend and source labels only; no answer key, rubric, teacher note or raw evidence payload is exposed. Legacy topic-only profiles still render the existing view.

- [ ] **Step 2: Implement the minimal safe summary UI**

  Add a compact “Kỹ năng” section with explicit empty/loading states. Keep the existing topic view as fallback and do not show unapproved grades as official mastery.

- [ ] **Step 3: Run all verification gates**

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test:rules
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint:api
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run build
  git diff --check
  ```

  Also run authenticated browser E2E for: approved homework → skill summary, practice → formative evidence, resubmission/delete → no double count or orphaned state. Run the Ox Alpha Free audit if the model is available; record a network/provider failure instead of treating it as approval.

- [ ] **Step 4: Commit the verified milestone**

  ```powershell
  git add src/components/features/classroom/student tasks/session_2026-08-24-skill-mastery-bridge.md
  git commit -m "feat(learning): expose safe skill mastery summary"
  ```

## Self-review checklist

- The plan covers the spec contract, catalog, adapter, reducer, persistence, practice/adaptive tags, safe UI and all acceptance/QA gates.
- No task performs destructive migration, grants student write access, adds a Vercel function, or invokes LLM mapping.
- Unknown and ambiguous topics remain visible as legacy topics and never become authoritative skill evidence.
- Existing camera queue, supplemental revision, old-submission deletion, practice privacy and teacher approval behavior remain regression requirements.
