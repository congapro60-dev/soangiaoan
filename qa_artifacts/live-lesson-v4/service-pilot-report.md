# Live Lesson V4 Service Pilot Report

## Scope

Local service-layer pilot for the real `LiveLessonService` against the Firestore/Auth emulators and the current `firestore.rules`.

## Checks

- PASS: `createLiveLessonSession` succeeded as the teacher and wrote `public/state`.
- PASS: `updateLiveLessonState` succeeded for a running session with public stats enabled.
- PASS: three anonymous students with REST-seeded `studentLinks/{uid}` submitted live responses.
- PASS: the teacher re-authenticated by email/password and published public stats.
- PASS: unauthenticated TV subscriptions received public state and stats without `onError`.
- PASS: public payload JSON excluded teacher uid, student uids, student names, response `value` fields, evidence reasons, language-support plans, and teacher scripts.
- PASS: student/TV deny checks threw `permission-denied` for private response/evidence/group/session writes.
- PASS: all allow-path operations succeeded, proving no fatal rules evaluator error occurred on an allow path.

## Result

`npm run test:pilot` passed on 2026-08-28: 1 test file, 1 test.

Expected emulator stderr was observed for denied operations, including the service's response write fallback path. The allow operation still succeeded after fallback, so deny-path evaluator traces are accepted.

## Run

```powershell
npm run test:pilot
```

The script runs:

```powershell
firebase emulators:exec --only firestore,auth "vitest run --config vitest.pilot.config.ts"
```
