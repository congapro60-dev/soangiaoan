# Assistant Gateway baseline

- Timestamp: 2026-10-16 (Asia/Ho_Chi_Minh context; local source inspection)
- Repository: `C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan`
- Branch: `codex/assistant-gateway-plan`
- Source HEAD at baseline capture (before documentation commits): `e6312892bbe7bfa368e86a4f4a679155ecbeb98e`
- Documentation-only correction commits after capture: `e28cc88`, `980f330`, `e861923`; no source changes in these commits.
- Dirty state at capture: clean (`git status --short --branch` showed only the branch header; no changed or untracked files).
- `git diff --check`: PASS (no output).

## Route inventory

The `api/` tree contains 8 deployable TypeScript route handlers (default exports), excluding underscore-prefixed shared cores, helper modules, and tests:

| Route | Source | Explicit runtime export | `vercel.json` function budget |
|---|---|---|---|
| `/api/adaptive-progress` | `api/adaptive-progress.ts` | none | `maxDuration` 15s, `memory` 512 MB |
| `/api/classroom` | `api/classroom.ts` | none | `maxDuration` 15s, `memory` 512 MB |
| `/api/exam` | `api/exam.ts` | none | `maxDuration` 15s, `memory` 512 MB |
| `/api/export-lesson` | `api/export-lesson.ts` | none | `maxDuration` 60s, `memory` 1024 MB; includes `node_modules/katex/dist/**` |
| `/api/generate-simulation` | `api/generate-simulation.ts` | none | no route entry in `vercel.json` (platform default applies) |
| `/api/grade-homework` | `api/grade-homework.ts` | `maxDuration = 60` | `maxDuration` 60s, `memory` 1024 MB |
| `/api/render-word` | `api/render-word.ts` | none | `maxDuration` 30s, `memory` 1024 MB |
| `/api/health/firebase-admin` | `api/health/firebase-admin.ts` | none | `maxDuration` 10s, `memory` 256 MB |
| `/api/adaptive-progress-profile` | no handler file | n/a | helper only: `api/adaptive-progress-profile.ts` exports `mergeProfileWithExisting`; not a route |

`api/adaptive-progress-profile.ts` is a helper module only; it exports `mergeProfileWithExisting` and is not a route. `vercel.json` also has a catch-all `/api/:path*` self-rewrite and an SPA fallback to `/index.html`. No `/api/assistant` route exists in this baseline.

## Runtime and budget evidence

Observed `vercel.json` function entries:

- `api/export-lesson.ts`: 60s / 1024 MB
- `api/render-word.ts`: 30s / 1024 MB
- `api/adaptive-progress.ts`: 15s / 512 MB
- `api/health/firebase-admin.ts`: 10s / 256 MB
- `api/exam.ts`: 15s / 512 MB
- `api/classroom.ts`: 15s / 512 MB
- `api/grade-homework.ts`: 60s / 1024 MB

`api/grade-homework.ts` independently exports `maxDuration = 60`, matching its Vercel entry. `generate-simulation.ts` has no explicit `vercel.json` function budget and no local `maxDuration` export observed. No `memory` exports were observed in route source. The repository package scripts expose `build`, `lint:api`, and `test`; no Railway configuration or Railway runtime evidence was observed in the inspected files.

## Firebase Admin entrypoints

Firebase Admin initialization is duplicated in route/core code:

- `api/adaptive-progress.ts`: `firebase-admin/app` (`cert`, `getApps`, `initializeApp`) and `firebase-admin/firestore`; credential resolution from service-account JSON/base64 or split fields.
- `api/_exam-core.ts`: same `firebase-admin/app` and Firestore initialization helper.
- `api/generate-simulation.ts`: `firebase-admin/app`, Auth, Firestore; same credential resolution.
- `api/health/firebase-admin.ts`: dynamic `import('firebase-admin')`, health validation, then `initializeApp` with the resolved credential.
- `api/_ai-gateway-handler.ts`, `api/classroom.ts`, and `api/grade-homework.ts`: Firebase Admin Auth consumers.

Secret/environment names observed (names only; values intentionally excluded):

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `GRADING_GEMINI_API_KEY`
- `AI_GATEWAY_API_KEY`
- `PUPPETEER_EXECUTABLE_PATH`

The client Firebase config also references `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_MEASUREMENT_ID`; this inventory records names only.

## Route decision

A new `/api/assistant` handler can fit the existing Vercel function model. Current source evidence does not require route consolidation or a Railway fallback: existing routes already run as independent Vercel functions, and the observed budget ceiling is 60s / 1024 MB. Revisit this decision only after production measurements show a gateway-specific timeout, memory, concurrency, or platform limit that the documented Vercel budgets cannot satisfy.

This document is local source evidence only. It is not production proof, deployment proof, or live capacity evidence.
