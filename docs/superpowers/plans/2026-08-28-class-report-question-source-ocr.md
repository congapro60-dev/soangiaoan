# Class Report Question Source OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the class-report question inspector open beside the selected statistic row and recover question text from existing PDF, Word, image, and scanned-PDF sources without changing submissions or grades.

**Architecture:** Keep report aggregation read-only. Normalize question labels through explicit aliases so grouped labels such as `Phần III – Bài 4` and `Tự luận – Bài 1` match their source headings without collapsing different sections. Add a teacher-only, lazy source reader that first uses stored/digital text, then extracts embedded/rendered images and calls the existing vision provider only when text is unavailable; cache the result in memory for the current report session and never overwrite classroom data.

**Tech Stack:** React + TypeScript + Vitest + PDF.js + Mammoth + JSZip + existing `callAIWithVision`/KaTeX renderer.

---

### Task 1: Make question labels and row-local details deterministic

**Files:**
- Modify: `src/lib/classroom/questionCatalog.ts`
- Test: `src/lib/classroom/questionCatalog.test.ts`
- Modify: `src/lib/classroom/classReportModel.ts`
- Test: `src/lib/classroom/classReportModel.test.ts`
- Modify: `src/components/features/classroom/ClassAssignmentReport.tsx`

- [x] **Step 1: Write failing tests**

Add cases proving that composite headings are parsed and that an active detail row is inserted immediately after its question row:

```ts
it('ghép được nhãn Phần/Tự luận với cùng nhãn trong kết quả chấm', () => {
  expect(extractQuestionCatalogFromText(
    'Phần III – Bài 4: Tính $x^2$.\nTự luận – Bài 1: Chứng minh $a=b$.',
    ['Phần III – Bài 4', 'Bài 1 (TL)'],
  )).toEqual([
    { questionNumber: 'Phần III – Bài 4', content: 'Tính $x^2$.' },
    { questionNumber: 'Bài 1 (TL)', content: 'Chứng minh $a=b$.' },
  ]);
});

it('đặt dòng xem câu hỏi ngay sau dòng thống kê đang chọn', () => {
  expect(buildQuestionStatsTableRows([
    { questionNumber: 'Câu 1', evidenceCount: 1, correct: 1, partial: 0, incorrect: 0, unreadable: 0, notAttempted: 0, correctRate: 1, scoreRate: 1 },
    { questionNumber: 'Câu 2', evidenceCount: 1, correct: 0, partial: 0, incorrect: 1, unreadable: 0, notAttempted: 0, correctRate: 0, scoreRate: 0 },
  ], 'Câu 2').map(row => row.kind === 'question' ? row.question.questionNumber : `detail:${row.questionNumber}`))
    .toEqual(['Câu 1', 'Câu 2', 'detail:Câu 2']);
});
```

- [x] **Step 2: Run the focused tests and confirm the expected RED failures**

Run:

```powershell
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test -- --run src/lib/classroom/questionCatalog.test.ts src/lib/classroom/classReportModel.test.ts
```

Expected: the composite catalog assertion and table-row assertion fail because the current parser/matching only removes one simple prefix and the current component renders the detail panel after the table.

- [x] **Step 3: Implement the minimal catalog and table-row behavior**

Add explicit alias keys for section/type context, parse composite headings before simple headings, and use alias intersection for catalog lookup. Add `buildQuestionStatsTableRows` as the single source of truth for the table order. Refactor `QuestionStats` to map those rows and render the detail content in a `<tr>` directly after the selected question; preserve hover, focus, click-to-pin, close, accessible labels, and the existing source fallback.

- [x] **Step 4: Run the focused tests and confirm GREEN**

Run the command from Step 2. Expected: all question-catalog and class-report-model tests pass.

- [x] **Step 5: Commit the focused change**

```powershell
git add src/lib/classroom/questionCatalog.ts src/lib/classroom/questionCatalog.test.ts src/lib/classroom/classReportModel.ts src/lib/classroom/classReportModel.test.ts src/components/features/classroom/ClassAssignmentReport.tsx
git commit -m "fix(class-report): anchor question details to selected row"
```

### Task 2: Read question text from PDF, Word, image, and scanned sources

**Files:**
- Create: `src/lib/classroom/questionSourceReader.ts`
- Test: `src/lib/classroom/questionSourceReader.test.ts`
- Modify: `src/lib/classroom/questionCatalog.ts` only if the reader needs a shared merge helper

- [x] **Step 1: Write failing tests**

Cover four source paths with injected dependencies: digital text returned by PDF/Word extraction, image/PDF-scan images sent to vision OCR, embedded DOCX media sent to OCR when raw text is empty, and an unreadable source returning a Vietnamese warning without throwing away the source link.

- [x] **Step 2: Run the reader tests and confirm RED**

```powershell
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test -- --run src/lib/classroom/questionSourceReader.test.ts
```

Expected: the reader module or its public function is missing, so the new behavior fails for the intended reason.

- [x] **Step 3: Implement the reader**

Implement `readQuestionCatalogFromSources({ sources, questionNumbers, sourceText, settings, deps })` with these rules:

1. Parse existing `sourceText` first.
2. Fetch only safe `http(s)` source URLs, enforce a 20 MB per-file guard, and convert each response to a `File`.
3. Reuse `readSourceFile` for PDF/Word/image extraction; render scan-PDF pages through the existing PDF-to-image helper.
4. Extract `/word/media/*` images from DOCX with JSZip when raw text is missing or incomplete.
5. If unresolved questions remain and images exist, call the existing vision provider once with a strict Vietnamese OCR instruction: preserve question labels, preserve `$...$`/`$$...$$` LaTeX, mark unreadable text as `[không đọc rõ]`, and never solve or infer an answer.
6. Merge only matching requested labels; never assign one multi-question OCR block to multiple questions. Return `catalog`, `mode`, and non-fatal `warnings`.

Do not write to Firestore, Storage, submissions, grades, or student projections.

- [x] **Step 4: Run reader tests GREEN and then the existing focused report tests**

Expected: all reader tests pass and the previous report/catalog tests remain green.

- [x] **Step 5: Commit the reader**

```powershell
git add src/lib/classroom/questionSourceReader.ts src/lib/classroom/questionSourceReader.test.ts src/lib/classroom/questionCatalog.ts
git commit -m "feat(class-report): recover question text from source files"
```

### Task 3: Connect lazy OCR to the teacher report without slowing initial load

**Files:**
- Modify: `src/components/features/classroom/ClassAssignmentReport.tsx`
- Modify: `src/components/tabs/ClassesTab.tsx`
- Test: `src/components/features/classroom/ClassAssignmentReport.test.tsx`

- [x] **Step 1: Write failing integration tests**

Add tests for an upload assignment with only a PDF/image source: opening a question requests the source reader, shows a loading state, then updates only that report's catalog; repeated question hovers reuse one in-flight/result promise. Add a no-API-key case that keeps the source link and shows an actionable Vietnamese warning.

- [x] **Step 2: Run integration tests and confirm RED**

```powershell
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test -- --run src/components/features/classroom/ClassAssignmentReport.test.tsx
```

- [x] **Step 3: Implement the lazy connection**

Pass the existing teacher `data.settings` into the report. Keep initial report loading unchanged. On hover/focus/click of a question with no matching catalog item, start one cached source-read promise keyed by assignment ID and source URLs; show `Đang đọc đề gốc…`, merge successful catalog items into the in-memory report snapshot, and surface warnings without replacing valid statistics. Keep the source reader teacher-side only and do not add a new Vercel function.

- [x] **Step 4: Run focused tests GREEN**

Run the integration command and the Task 1/2 focused commands. Expected: all pass.

- [x] **Step 5: Commit the integration**

```powershell
git add src/components/features/classroom/ClassAssignmentReport.tsx src/components/features/classroom/ClassAssignmentReport.test.tsx src/components/tabs/ClassesTab.tsx
git commit -m "feat(class-report): load missing question sources on demand"
```

### Task 4: Full verification and handoff

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md` only if a new reusable regression rule is discovered
- Modify: `HANDOFF.md` with verification evidence

- [x] **Step 1: Run all required gates**

Run each separately and record exit code/output:

```powershell
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run lint
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run lint:api
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run build
git diff --check
```

The build succeeded. Existing Vite chunk/dynamic-import warnings remain visible; the entry chunk is about 1.45 MB in the current application and is recorded as a pre-existing performance follow-up, not a data-integrity or build blocker for this change.

- [x] **Step 2: Run read-only browser smoke and source-path checks**

Follow `.agents/qa/BROWSER_TESTING_GUIDE.md` and `.agents/qa/QA_TESTING_PROTOCOL.md`. Local unauthenticated smoke confirmed the app loads without console errors/warnings; report-row interaction and production HTTP/authenticated behavior remain owner-QA items because no signed-in session was available. Unit/integration tests cover row placement, KaTeX content, source failure fallback, and no-write behavior. Do not create, delete, regrade, or edit real classroom data.

- [x] **Step 3: Update task evidence and inspect the final diff**

Record exact test counts, build/index size, browser limits, and the fact that no Firestore/Storage grade/submission writes occurred. Confirm only the feature worktree changed.

- [x] **Step 4: Stop before integration**

Keep the feature branch and do not push `main` or deploy until the user explicitly requests that integration step.
