# V4 live lesson — QA checkpoint

Date: 2026-08-29  
Scope: local feature worktree `codex/g10-p31-firestore` only  
Environment: Vite + Firestore/Auth Emulator; synthetic QA data; no production classroom data

## Verdict

**PASS có điều kiện cho pilot local/staging. Chưa phải release production.**

The browser wiring and service layer were exercised against the local emulators. The final static, unit, Rules, service-pilot, deterministic E2E, and build gates passed. Production deployment, real teacher authentication, and a Vercel classroom smoke were not performed.

## Verified browser flow

- `VITE_USE_EMULATOR=1` connected the app singleton to Auth Emulator `127.0.0.1:9099` and Firestore Emulator `127.0.0.1:8080`; the production path remained unchanged when the flag was off.
- Anonymous browser authentication completed against the Auth Emulator.
- A teacher session was created and read back through the app service; the session was not read from production.
- Teacher state/cue changes reached the public TV view in realtime.
- The student join flow accepted the selected class, roster name, and PIN; the selected language preference was persisted through the allowed preference path.
- Student choice submission reached the teacher and anonymous TV aggregates; the TV did not display student identity or answer text.
- The language UI exposed `VI`, `EN`, `JA`, `KO`, and `ZH`. The P31 pilot kept Vietnamese as the mathematical anchor and used bilingual scaffolding; full translation stayed disabled because a complete reviewed localized lesson pack was not available.
- Closing a session no longer attempts a public-state write after Rules revoke public access. The UI reported the closed state and locked controls.
- A student can change `languagePreference` after an existing response without changing the response value or bypassing the language validator; the Rules regression test passed.

## Automated evidence

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run lint:api` | PASS, exit 0 |
| `npm run test` | PASS, 90 files / 1311 tests |
| `npm run test:rules` | PASS, 8 files / 291 tests |
| `npm run test:pilot` | PASS, 13/13 pilot checks, 1 test |
| `npm run build` | PASS, exit 0; existing Vite chunk/import warnings only |
| `npm exec -- tsx test/e2e-v4-live-lesson.mjs` | PASS, 9/9 checks |

The Rules and service pilot logs still contain evaluator traces on intentionally denied operations. This is not evidence that allow-path writes are broken: all allow-path operations passed. It is also not a zero-evaluator-error claim.

The response write path now uses a Firestore transaction (`get` then `set`/`update`) rather than a merge-first write followed by a permission-denied retry. The Rules suite also includes a regression test for a response ID with a spoofed prefix; Firestore Rules `matches()` requires the complete string to match.

The latest regression was real and was fixed before this checkpoint: response update rules originally omitted `languagePreference` from the allowed update keys, so an online language change after the first response was denied. The allowlist now includes that field and keeps its validator in place.

## Known limits

- The browser smoke used synthetic/emulator identities. The real teacher-auth progress bridge was not claimed as passed by this harness.
- The deterministic E2E validates projections, privacy, language neutrality, grouping, post-check, offline queue, and the 2400-second contract; it cannot measure human join, language-choice, approval, or movement latency.
- The malformed-parent negative fixture was removed from the Rules suite after reproducing that the emulator emits an evaluator trace while denying a document whose ownership field is absent. This fixture is not a valid app write. Runtime protection remains for valid-schema documents; malformed data must be blocked at contract/service/seed boundaries.
- At the time this checkpoint report was created, no commit, push, Vercel deployment, or production smoke had been performed.

## Next release gate

Use a real teacher-authenticated staging session, drive the three browser roles (teacher phone, public TV, student), verify Vercel `Ready / Production` plus HTTP smoke, then review and explicitly approve the exact feature diff before any push or deployment.
