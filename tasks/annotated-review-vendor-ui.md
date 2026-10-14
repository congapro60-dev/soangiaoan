# Gemini independent review ui

Model ag/gemini-3.8-flash-low; source14/10/2026. Read-only; not test or production proof. finish_reason=stop

```json
{
  "verdict": "BLOCKED",
  "findings": [
    {
      "file": "src/components/features/classroom/CorrectionAttempts.tsx",
      "problem": "Evidence upload call ignores credentials prop: `uploadActorEvidence({}, ...)` sends empty object instead of `credentials`, dropping parent actor tokens or auth headers during correction upload.",
      "reproduction": "Pass `credentials` with parent session token into `CorrectionAttempts`. Call `save()`. Network request for evidence upload drops authorization credentials because `{}` is passed.",
      "fix": "Replace `uploadActorEvidence({}, submission.assignmentId || null, prepared, ...)` with `uploadActorEvidence(credentials, submission.assignmentId || null, prepared, ...)`."
    },
    {
      "file": "src/components/features/classroom/student/StudentAssignmentCard.tsx",
      "problem": "`isUploadAction` and `canSupplement` permit upload actions for locked non-exam assignments when `isOpen !== false` due to ternary evaluation precedence (`assignment.type === 'exam' ? assignment.isOpen !== false : !assignment.submissionLocked`).",
      "reproduction": "View an assignment with `type !== 'exam'` and `submissionLocked: true`. `isUploadAction` evaluates `!assignment.submissionLocked` correctly, but the supplement button checks `(assignment.type === 'exam' ? assignment.isOpen !== false : !assignment.submissionLocked) && !assignment.submissionLocked`, while line 79 computes `canSupplement` as `(assignment.type === 'exam' ? assignment.isOpen !== false : !assignment.submissionLocked)` which evaluates truthy when `assignment.submissionLocked === true` if `isOpen` isn't falsy on assignments where type was defaulted or checked improperly.",
      "fix": "Ensure submission lock strictly blocks uploads across all checks: use `!assignment.submissionLocked && (assignment.type === 'exam' ? assignment.isOpen !== false : true)`."
    }
  ]
}
```
## Adjudication source/test — native independent reviewer,14/10

Overall source gate PASS; Gemini's two findings are rejected, raw review preserved above.
1. B4 correction save/review is HS-only by approved contract. StudentSubmittedWork calls default student credentials; AssignmentPanel teacher is list-only; ParentPortal has no correction editor. Client call with{} still obtains Firebase idToken; server rejects PH upload/save/review. Passing PH credentials is not an authorized fix.
2. Claimed ternary bypass is false: for locked non-exam `!submissionLocked` is false regardless isOpen; supplement has the same guard. Native runnable assert9combinations(typeupload/undefined/exam×isOpentrue/false/undefined) and freshcomponent16/16 passed.
No source changes from these false positives; evidence code in SubmissionActorsAPI/CorrectionAttempts/StudentAssignmentCard and native reviewer. Final online upload guards scoped39tests passed.
