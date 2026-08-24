# Classroom AI Scope Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the teacher's saved grading instruction control answer-key generation, rubric generation, and every future grading attempt for the assignment, while placing the instruction field beside the student-facing assignment source.

**Architecture:** Keep the existing `gradingInstructions` assignment field and persistence path. Thread that value through the two currently incomplete AI preparation actions (`solveAnswerKey` and `suggestRubric`) into the shared prompt builders. The real grading path already reads the saved assignment value; add regression coverage so all three paths share the same scope contract.

**Tech Stack:** React + TypeScript + Vite, Vercel API functions, Firebase/Firestore, Vitest.

---

### Task 1: Add failing prompt-contract tests first

**Files:** `src/lib/classroom/gradingPrompt.test.ts`

- [ ] Add a `buildSolveExamPrompt` test with an instruction such as “Bỏ câu 4.3, chỉ làm 4.1, 4.2 và 4.4”.
- [ ] Assert the prompt contains the teacher instruction, says excluded parts must be omitted, and preserves the configured total score.
- [ ] Add a `buildRubricPrompt` test with the same instruction.
- [ ] Assert the rubric prompt contains the instruction and forbids points/rubric criteria for excluded parts.
- [ ] Run the targeted test and record the expected RED failure before implementation:

```powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" exec -- vitest run src/lib/classroom/gradingPrompt.test.ts
```

### Task 2: Implement the shared prompt contract

**Files:** `src/lib/classroom/gradingPrompt.ts`

- [ ] Add `gradingInstructions` to `SolveExamInput`.
- [ ] Add a clearly delimited teacher-instruction block to `buildSolveExamPrompt`.
- [ ] Change “solve every question” wording so it means every included question; omitted parts must not appear in the answer draft or receive points.
- [ ] Extend `buildRubricPrompt` with an optional `gradingInstructions` argument and the same scope rules.
- [ ] Require ambiguity or a scope/score conflict to be surfaced for teacher review instead of guessed.
- [ ] Keep the existing max-score contract and JSON parsing behavior unchanged.
- [ ] Re-run the targeted tests and confirm GREEN.

### Task 3: Wire the instruction through client and API actions

**Files:** `src/services/gradingApi.ts`, `api/grade-homework.ts`

- [ ] Add `gradingInstructions` to the `solveAnswerKey` request and pass it from the caller.
- [ ] Add `gradingInstructions` to the `suggestRubric` request and pass it from the caller.
- [ ] In `handleSolveAnswerKey`, pass the body value into `buildSolveExamPrompt`.
- [ ] In `handleSuggestRubric`, pass the body value into `buildRubricPrompt`.
- [ ] Normalize missing values to an empty string without breaking older callers.
- [ ] Verify the existing actual-grading path still reads the latest `assignment.gradingInstructions`, including re-submissions and teacher re-grading.

### Task 4: Move the field beside the student-facing assignment source

**File:** `src/components/features/classroom/AssignmentFormModal.tsx`

- [ ] Move the existing `gradingInstructions` UI block from the final standalone section into the “Đề gửi học sinh” section, immediately after the source-file/text area.
- [ ] Keep one state field and one submit property; do not create a second instruction field.
- [ ] Explain in the label/help text that the command is teacher-only, saved with the assignment, and applies to all later submissions/re-submissions.
- [ ] Ensure both AI buttons read the latest textarea value at click time and receive it in their service calls.
- [ ] Keep the instruction out of the student-visible assignment content.

### Task 5: Verify, independent QA, and handoff

- [ ] Run targeted prompt tests, the full Vitest suite, lint, API lint, and production build.
- [ ] Have a separate OpenCode Ox Alpha session independently inspect the diff and the end-to-end data flow; it may add a focused regression test/fix only if it finds a concrete logic defect.
- [ ] Review the final diff for unrelated changes and run `git diff --check`.
- [ ] Update `tasks/todo.md` and `HANDOFF.md` with the verified behavior and remaining deployment status.
- [ ] Commit the implementation and QA fixes, then push the feature branch to `main` only after all gates pass.

### Acceptance criteria

- [ ] Entering “Bỏ bài 4.3…” before clicking either AI preparation button causes both prompts to carry that scope immediately; generated answer/rubric instructions explicitly exclude 4.3.
- [ ] The saved command is attached to the assignment and is used by the real grading prompt for every future submission, re-submission, and re-grade until edited.
- [ ] The command appears beside “Đề gửi học sinh”, is not shown to students, and is not duplicated elsewhere in the form.
- [ ] No regex/post-processing removes question text after AI generation.
- [ ] All tests, lint checks, and build pass with evidence.
