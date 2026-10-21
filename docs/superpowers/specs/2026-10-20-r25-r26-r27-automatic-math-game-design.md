# R25-R27 Automatic Math Game Design

**Date:** 2026-10-20  
**Scope:** R25 automatic evidence and grading, R26 lesson library launch, R27 automatic game rules, math input formats.

## Owner Decision

The normal path is automatic. The teacher may pause a lesson, open one pupil's work, or regrade a specific answer. A teacher approval click is not required before the system records an ordinary AI assessment.

The system must still distinguish a confident automatic result from an uncertain result. Uncertain work becomes `needs_review`; it is never silently marked correct, mastered, or complete.

## R25: Automatic Assessment

1. At exit or after the lesson deadline, the server selects the latest eligible submission for each pupil and task.
2. Closed answers use deterministic checkers first. AI is not called for exact choice, numeric, ordering, matching, or four-cell short answers.
3. Open answers are sent in bounded batches to the configured provider. The prompt contains task text, the visible criteria, and the pupil answer; it excludes answer keys, hidden `lookFor`, tokens, and internal IDs.
4. A valid provider response is stored automatically as `ai_assessed` with `criteriaMet`, feedback, model, source fingerprint, and audit receipt. It does not grant mastery by itself.
5. Invalid, unavailable, contradictory, or low-confidence output becomes `needs_review`; the existing answer and prior teacher mark remain unchanged.
6. Regrading opens one pupil/task record. A teacher mark supersedes the automatic mark and records actor, reason, previous result, and timestamp.
7. Retry is idempotent by session, source fingerprint, task set, and request ID. A changed answer or branch invalidates the old job.
8. Class statistics show `passed`, `notPassed`, `pending`, `needsReview`, `incomplete`, and `notSubmitted` separately.

## R26: Automatic Library Launch

The legacy game entry reads the authored lesson catalogue through the existing lesson package/session pipeline. It must expose all 807 packages with grade, week, purpose, and title filters. Selecting a package opens the same configuration path used by the authored lesson dashboard; no second game engine or copied package data is allowed.

Defaults come from the package: lesson purpose, 40-minute budget, self-paced mode, device mode, world, exploration availability, and a recommended rule. The teacher may edit these defaults, but opening a room does not require saving a separate draft first. Draft and `teacher_review_required` content remains visibly labelled.

## R27: Automatic Game Rule Plan

Selecting a rule creates a deterministic operational plan from the validated package and normalized teacher setup. The plan is marked `auto_generated`, contains source package hash and rule/setup fingerprints, and is audit logged. It controls game mechanics only; it does not change content approval or source verification.

If plan validation fails, the session uses Hành trình and returns a visible `RULE_FALLBACK` warning. The system never runs a malformed rule silently. A valid automatic plan runs immediately for preview and live sessions according to the existing room authorization rules.

## Math Question Formats

### Choice

- `choice_exact`: exactly four options with one answer key.
- `true_false_4`: exactly four labelled statements, each independently true or false; stores a four-value answer vector and per-statement feedback.

### Short Answer

`short_answer_4` renders four bounded character cells. The checker compares the normalized four-cell vector, preserving leading zero and sign policy from the task. It is a four-character response format, not four separate questions.

### Open and Drawing

Open response remains limited to proof, explanation, or construction reasoning where a deterministic checker is inappropriate. AI may provide feedback and a provisional result; uncertain work is `needs_review`.

Drawing tasks use a structured `drawing` schema: required objects, allowed relations, numeric tolerances, labels, and optional image prompt. Paper is primary. A pupil may upload a photo; the server stores the image and an AI/geometry checker extracts only verifiable claims. A blurry, missing, or contradictory image becomes `needs_review`.

Desmos is an optional editor for supported 2D representations. The task stores a constrained graph configuration and a read-only export/screenshot. Assessment checks declared constraints (points, intersections, equations, intervals, labels), not visual similarity. Arbitrary 3D geometry is outside the first slice.

Hints may include a separate teacher-authored or generated diagram asset. The hint layer never exposes the answer key or the target construction verbatim.

## Safety and Failure Rules

- No real provider calls in tests; use the existing fake endpoint.
- No learner peer data in a pupil projection.
- No AI result overwrites a teacher mark.
- No automatic mastery from an AI suggestion.
- No automatic deployment or production migration in implementation work.
- Preserve V7 and immutable saved-room snapshots.

## Acceptance Evidence

- Focused red/green tests for each new checker and automatic assessment state.
- 150 fake pupils, bounded provider calls, replay and retry tests.
- R26 catalogue count/filter/launch tests.
- R27 valid-rule, invalid-rule fallback, source-hash and audit tests.
- 375px and desktop browser QA when browser control is available.
- Typecheck, lint, build, asset graph, local migration replay, then owner-approved release.

## Open Design Boundary

The first Desmos slice supports constrained 2D tasks only. Add 3D when a concrete curriculum task, renderer, export format, and deterministic checker are specified.
