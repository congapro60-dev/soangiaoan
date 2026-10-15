# Gemini plan review

Model ag/gemini-3.8-flash-low; read-only, source15/10/2026.

```json
{
  "verdict": "PASS",
  "findings": [
    {
      "problem": "IDOR: readHandMarkedFile actor validation omits handMarkedPublished check for student/parent.",
      "check": "Assert student/parent request returns 403 when handMarkedPublished is false.",
      "minimalfix": "readHandMarkedFile endpoint must verify (isTeacher || (isOwnerOrParent && submission.handMarkedPublished)) before issuing signed URL."
    },
    {
      "problem": "Lock bypass: acceptance criteria locks hand-marked upload on assignment lock, but design text says lock only blocks submissions.",
      "check": "Assert saveHandMarkedWork and issueSubmissionUpload reject requests when assignment is locked.",
      "minimalfix": "Enforce assignment lock check in issueSubmissionUpload(purpose='hand_marked') and saveHandMarkedWork."
    },
    {
      "problem": "Denial of Wallet: unthrottled AI review trigger on saveCorrectionAttempt by student/parent.",
      "check": "Assert reviewCorrectionAttempt enforces per-submission rate limit on correction attempts.",
      "minimalfix": "Add submission-scoped correction attempt limit counter before dispatching AI review."
    }
  ]
}
```