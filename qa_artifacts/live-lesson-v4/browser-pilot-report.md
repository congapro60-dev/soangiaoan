# V4 live lesson — QA checkpoint

Date: 2026-08-30
Scope: isolated integration worktree `codex/v4-main-integration` based on `origin/main`
Environment: Vite + Firestore/Auth Emulator; synthetic QA data; no production classroom data

## Verdict

**PASS có điều kiện cho service/emulator và static integration gates. Chưa phải release production.**

The app singleton wiring and service round-trip were exercised against the local emulators. The final static, unit, Rules, service-pilot, deterministic E2E, and build gates passed. A full three-viewport browser classroom run, real teacher authentication, production deployment, and a Vercel classroom smoke were not performed.

## Verified browser wiring/service flow

- `VITE_USE_EMULATOR=1` connected the app singleton to Auth Emulator `127.0.0.1:9099` and Firestore Emulator `127.0.0.1:8080`; the production path remained unchanged when the flag was off.
- Anonymous browser authentication completed against the Auth Emulator.
- A teacher session was created and read back through the app service; the session was not read from production.
- The app authenticated anonymously against Auth Emulator and created/read a session through the app service against Firestore Emulator.
- The service pilot separately exercised teacher update, three student responses, public TV state/stats listener, privacy projection, and deny-path identity checks.
- The pure deterministic E2E separately covers language/glossary, grouping approval, post-check, offline queue, TV privacy, and the 2400-second contract.
- The real teacher/TV/student browser choreography and human latency were not claimed from these checks.

## Automated evidence

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run lint:api` | PASS, exit 0 |
| `npm run test` | PASS, 133 files / 1635 tests |
| `npm run test:rules` | PASS, 8 files / 299 tests |
| `npm run test:pilot` | PASS, 13/13 pilot checks, 1 test |
| `npm run build` | PASS, exit 0; existing Vite chunk/import warnings only |
| `npm exec -- tsx test/e2e-v4-live-lesson.mjs` | PASS, 9/9 checks |

The Rules and service pilot logs still contain evaluator traces on intentionally denied operations. This is not evidence that allow-path writes are broken: all allow-path operations passed. It is also not a zero-evaluator-error claim.

The response write path now uses a Firestore transaction (`get` then `set`/`update`) rather than a merge-first write followed by a permission-denied retry. The Rules suite also includes a regression test for a response ID with a spoofed prefix; Firestore Rules `matches()` requires the complete string to match.

The latest regression was real and was fixed before this checkpoint: response update rules originally omitted `languagePreference` from the allowed update keys, so an online language change after the first response was denied. The allowlist now includes that field and keeps its validator in place.

## Known limits

- The browser wiring used synthetic/emulator identities. The real teacher-auth progress bridge was not claimed as passed by this harness.
- The deterministic E2E validates projections, privacy, language neutrality, grouping, post-check, offline queue, and the 2400-second contract; it cannot measure human join, language-choice, approval, or movement latency.
- The malformed-parent negative fixture was removed from the Rules suite after reproducing that the emulator emits an evaluator trace while denying a document whose ownership field is absent. This fixture is not a valid app write. Runtime protection remains for valid-schema documents; malformed data must be blocked at contract/service/seed boundaries.
- This report does not claim a Vercel deployment, production HTTP smoke, or real teacher-authenticated staging run.

## Next release gate

Use a real teacher-authenticated staging session, drive the three browser roles (teacher phone, public TV, student), verify Vercel `Ready / Production` plus HTTP smoke, then review and explicitly approve the exact feature diff before any push or deployment.
