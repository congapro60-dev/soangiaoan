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

## Continuation QA — 2026-08-31

Environment: local Vite on `127.0.0.1:3002` with Firestore/Auth Emulator; `/api/classroom` used a temporary local proxy with an ephemeral test key; all class, student, PIN and response data were synthetic and ephemeral.

### Three-portal browser evidence

- GV created the V4 P31 session from the current `Bài học phân hoá` list after the V4 checkpoint Rules fix.
- GV advanced the same session through `P00 → P03 → P05 → P08`; TV and HS changed from `LOBBY` to `RUNNING` and showed the same public screen.
- HS joined by roster + test PIN on the `localhost` origin, separate from GV/TV `127.0.0.1` origin, then selected `Tiếng Việt + EN`.
- HS submitted diagnostic choice, AI Error text, route `M`, group product text and individual post-check text. GV received `ĐÃ GỬI = 1` for each active checkpoint; TV received only aggregate counts.
- GV toggled public stats; TV showed aggregate `THAM GIA/ĐÃ GỬI/TUYẾN` counts and did not show the synthetic student name or private response text.
- Screenshot QA at the TV viewport showed rendered KaTeX formulas and no page overflow (`scrollHeight = clientHeight`, `scrollWidth = clientWidth`); the student screen also rendered KaTeX.

### Fixes found by this pilot

- V4 canonical `cp-*` checkpoints were not in the Rules allowlist; valid session creation was denied. Added the exact nine runtime IDs without raising the nine-step cap.
- Auth transition revoked the student public listener before `studentLinks` existed. Public projection access is now auth-invariant; private responses/evidence/group data remain restricted.
- TV/HS rendered raw LaTeX because live screen bodies were plain text nodes. Added shared `LiveLessonRichText` normalization + KaTeX renderer and unit tests.

### Updated automated gates

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run lint:api` | PASS, exit 0 |
| `npm run test` | PASS, 142 files / 1691 tests |
| `npm run test:rules` | PASS, 8 files / 301 tests |
| `npm run build` | PASS, exit 0; existing chunk/dynamic-import warnings only |

Rules test stderr still includes evaluator traces on intentional deny paths. This remains a conditional/pilot result, not a zero-evaluator-error claim.

The pilot proves local three-portal choreography with synthetic identities. It does not prove real teacher authentication, Vercel/production HTTP behavior, deployment, or a human classroom with three physical devices.

## Sequential publication and visual-design follow-up — 2026-08-31

The V4 list now has a guarded `Xuất bản tuần tự 48 bài` action. It audits and saves one source key at a time, skips already-published lessons, blocks foreign ownership or source identity, and reports each audit/save result. In the local emulator run, the UI reported `48 xuất bản, 0 bỏ qua, 0 audit fail, 0 lỗi`; an independent Firestore REST read confirmed 48 V4 documents, 48 unique source keys, all `published`, all `durationMinutes = 40`. This is emulator-only evidence; it is not a production write.

The visual QA policy was tightened using the following slide-design evidence:

- One dominant idea per screen and a 3-metre readability check; fix layout or remove content rather than shrinking text: [hunkim/slide-skill](https://github.com/hunkim/slide-skill).
- Use one coherent design system, choose a visual intent before layout, and keep spoken detail outside the projected surface: [Presentation-Slides](https://github.com/HubertHua/Presentation-Slides), [presentation-making](https://github.com/msimchowitz/writing-skills).
- Keep hierarchy, contrast, margins, line spacing and overflow under control; use high-contrast portable typography: [Evidence-Based Human Factors Guidelines for PowerPoint Presentations](https://journals.sagepub.com/doi/pdf/10.1177/1064804611416583), [Anthropic PPTX guidance](https://github.com/anthropics/skills/blob/main/skills/pptx/SKILL.md).
- For mathematics, preserve the semantic structure of formulas and use visual augmentation only when it clarifies reading; do not replace the mathematical object with decorative graphics: [Math Augmentation](https://doi.org/10.1145/3491102.3501932).

Applied to V4: TV uses a fixed 16:9-style 1280×720-tested surface, high-contrast dark projection, a single current-screen message, aggregate-only footer cards, and KaTeX rendering for formula lines. The teacher script remains on the GV portal; individual responses remain off TV. The skill research is a design/QA input, not a reason to create a separate slide website.

## Self-study portal QA — 2026-08-31

Environment: local Vite on `127.0.0.1:3002` with Firestore/Auth Emulator; synthetic student identity `QA-026`; no production data.

- The published V4 P31 lesson opened with the human-readable title `Bất phương trình bậc nhất hai ẩn — Tiết 1`.
- The browser flow completed: identify form → five-question diagnostic → Dewey lesson → four scaffold steps with feedback → knowledge completion → practice → real-world application → summary → outer portal saved-progress state.
- Before the fix, the self-study converter put a visible `Câu hỏi đang được chuẩn bị.` placeholder in the Vận dụng pack. The converter now prefers the three existing V4 route tasks when `practiceSet` is absent; browser re-run showed substantive Nhận biết/Thông hiểu/Vận dụng essay tasks and no placeholder.
- Browser visual QA found the long conclusion/notes formula causing horizontal clipping. The fix splits newline-separated bare formulas into separate MathJax regions and confines MathJax overflow to the local card/note region. Re-run showed the full conclusion in the card, no outer page overflow, and bounded notebook width.
- The delete control was not exercised against production; its action remains guarded by explicit confirmation and the existing owner-scoped Firestore service call.

This validates the self-study content path with synthetic data. It does not replace real teacher/TV/student production choreography or a Vercel smoke.
