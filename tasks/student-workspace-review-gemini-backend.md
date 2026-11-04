# Independent Gemini review backend

Adjudication: các finding dưới đây bị bác bằng source và regression test; xem student-workspace-review-gemini-final.md (PASS).

Model: ag/gemini-3.8-flash-low. Source snapshot 14/10/2026; not a test/release result.

```json
{
  "verdict": "BLOCKED",
  "findings": [
    {
      "severity": "high",
      "file": "api/_student-workspace.ts",
      "line": 158,
      "problem": "Unapproved submission leaks raw question-level correction and nextPractice to student.",
      "reproduction": "Call action studentAssignmentDetail on assignment submission with teacherApproved: false and questionResults containing correction text. Detail projection returns questionResults without masking correction or nextPractice because condition only tests approved for expectedAnswer and explanation, but still returns fullRows when awaitingClarification is false.",
      "fix": "In projectStudentSubmission in classroom: when !approved, set questionResults to undefined instead of returning fullRows, or strip correction, nextPractice, status, and score on unapproved rows."
    },
    {
      "severity": "medium",
      "file": "src/lib/adaptive/mathText.ts",
      "line": 284,
      "problem": "Punctuation strip mutates trailing period inside next token without checking non-empty text, truncating single dot tokens to empty string and mutating shared parsed AST token array.",
      "reproduction": "Pass mathematical expression followed by text token containing only '.' like '$x=1=2=3$.'. Tokenizer leaves next.content as '.', slice(1) sets next.content to '', causing empty token propagation or dropped trailing characters in downstream joined tokens.",
      "fix": "Ensure token mutation clones or cleanly updates content without leaving empty string tokens, or preserve sentence boundary formatting explicitly."
    }
  ]
}
```
