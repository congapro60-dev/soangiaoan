# Discover Self-study 10–12 Implementation Plan

> **For agentic workers:** use `subagent-driven-development` for each task and keep the current worktree isolated.

**Goal:** Convert PPCT Discover new-knowledge periods into teacher-reviewed Adaptive self-study lessons with student progress and teacher evidence.

**Base:** Continue `codex/elearning-muse-task1` in the isolated worktree; preserve the original Downloads checkout WIP.

### Task 1: PPCT manifest and teacher source picker

- [x] Extract 218 new-knowledge seeds from `G10`, `G11`, `G12`.
- [x] Add `src/data/discoverNewKnowledgeLessons.json` with source row/week traceability.
- [x] Add `src/lib/discover/types.ts`.
- [x] Add `src/pages/DiscoverSelfStudyPage.tsx` with grade/week/search filters and source handoff to Builder.
- [x] Add `/discover-self-study` route and entry from Adaptive lesson list.

### Task 2: Builder handoff and teacher review

- [x] Load a selected Discover source into `AdaptiveLessonBuilderPage` through session storage.
- [x] Add explicit `AI rà soát nguồn Discover` action.
- [x] Keep teacher approval before pipeline/publish.
- [ ] Persist source seed ID on the generated Adaptive lesson for dashboard grouping.
- [ ] Add a review panel for purpose coverage, exact math source, and fallback media.

### Task 3: Student assignment and evidence

- [ ] Add an assignment type/link for a published Adaptive Discover lesson.
- [ ] Show assigned Discover lessons in the authenticated student workspace.
- [ ] Bind session progress to student/class/lesson version; prevent client spoofing.
- [ ] Store event-level evidence: open, attempt, hint, remediation, exit ticket, completed.
- [ ] Expose teacher summaries grouped by seed, objective, misconception and support need.

### Task 4: Verification

- [ ] Unit-test manifest counts and stable IDs.
- [ ] Unit-test source handoff and Builder loading.
- [ ] Rules/API tests for student isolation and teacher-only summaries.
- [ ] Browser QA for teacher -> review -> publish -> student -> progress -> teacher summary.
- [ ] `npm --prefix <worktree> run lint`, `lint:api`, focused Vitest, Rules, `build`.
