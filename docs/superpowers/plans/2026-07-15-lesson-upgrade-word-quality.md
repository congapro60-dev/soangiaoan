# Lesson Upgrade and Toán Export Quality – Implementation Plan

> **Goal:** Let a teacher upload a `.docx` lesson plan, receive standards-based feedback, apply a safe revision while retaining the original document structure, and produce a polished Toán plan/export that is checked before delivery.

## Scope and decisions

- A `.docx` is the only input eligible for layout-preserving revision. The app retains its original bytes and makes a copy; PDF remains analysis-only because browser code cannot safely preserve/edit its pages.
- Revision is additive and traceable: the app injects a clearly headed “NỘI DUNG ĐÃ BỔ SUNG” section before the document’s final section properties. This preserves every original paragraph, table, image, header/footer, style, and page geometry. Users can download the unmodified source at any time.
- The standards audit is deterministic for visible structural evidence and augments the existing AI analysis. Practice plans receive the user-approved Section C/Polya and differentiation checks.
- The Toán creator runs deterministic validation on AI output and asks the model for one focused repair when required sections are absent. Export uses the existing Toán Word rendering profile.
- LibreOffice is a local QA dependency only. It is not a runtime dependency for Vercel.

## Task 1: Standards audit and DOCX revision utility

**Files:**
- Create: `src/lib/lessonUpgrade/mathStandards.ts`
- Create: `src/lib/lessonUpgrade/mathStandards.test.ts`
- Create: `src/utils/docxLessonRevision.ts`
- Create: `src/utils/docxLessonRevision.test.ts`

1. Write failing Vitest cases for practice-plan detection, each Section C criterion, and generic standards findings.
2. Implement pure audit functions which return stable finding IDs, severity, evidence, and concrete improvement text.
3. Write failing tests with a minimal DOCX ZIP fixture to prove the revision keeps existing body/table XML and injects an escaped supplement before `w:sectPr`.
4. Implement the JSZip patcher; reject non-DOCX and malformed packages with an actionable error.

## Task 2: Upgrade analysis, prompt and user flow

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/lessonUpgrade/analysisPrompt.ts`
- Modify: `src/lib/lessonUpgrade/productPrompts.ts`
- Modify: `src/hooks/useLessonUpgrade.ts`
- Modify: `src/components/tabs/LessonUpgradeTab.tsx`

1. Extend analysis types/prompt with standards findings and revision supplement, preserving JSON parsing compatibility.
2. Capture the original selected `.docx` file in hook state, enforce a 20 MB limit, and combine AI findings with the deterministic audit.
3. Add a dedicated “Rà soát theo chuẩn Toán” result path and “Tạo bản DOCX đã bổ sung” action. For PDF, show feedback only and do not advertise layout preservation.
4. Render the audit with evidence/severity and make export use the original DOCX patcher when a DOCX exists; otherwise retain the current Word export fallback.

## Task 3: Toán generation quality gate and export selection

**Files:**
- Create: `src/lib/toanLessonQuality.ts`
- Create: `src/lib/toanLessonQuality.test.ts`
- Modify: `src/hooks/useLessonCreator.ts`
- Modify: `src/utils/wordExportA4.ts`

1. Add failing pure-function tests for required phases, objectives, time coverage, practice Polya/dual route evidence, expected results, homework, and leaked template instructions.
2. Implement the validator and build a concise repair brief from only failed checks.
3. In the Toán generation flow, validate generated content and issue one focused repair request if necessary; retain the first response if repair fails.
4. Ensure the Toán export profile is selected from the plan format so Word/PDF exports use the KHDH layout renderer.

## Task 4: Local render QA and verification

**Files:**
- Create: `scripts/render-docx-qa.ps1`
- Modify: `tasks/todo.md`

1. Add a local-only script which locates LibreOffice and renders DOCX to PDF/PNG for visual inspection without being bundled into Vercel.
2. Run targeted tests, full `npm run test`, `npm run lint`, and `npm run build` from the worktree.
3. Render the supplied representative DOCX files, inspect the generated images, and record evidence/results in `tasks/todo.md`.
4. Commit the focused changes, fast-forward/rebase onto current `origin/main` if needed, then push the verified commit to `main` as explicitly authorized.

## Verification matrix

| Area | Evidence |
|---|---|
| Practice standards | unit tests cover all Section C rules and negative controls |
| DOCX preservation | ZIP/XML test proves existing document XML survives and supplement is inserted safely |
| Upload UX | component/type build validates DOCX/PDF paths and 20 MB guard |
| Toán quality | validator unit tests plus prompt repair path test |
| Word layout | LibreOffice PDF/PNG render of a DOCX fixture and generated export |
| Regression | full Vitest, TypeScript lint, Vite build |
