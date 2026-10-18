# Assistant Gateway Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a multi-channel assistant (Telegram + Zalo OA) that reads SmartPlan data through scoped tools and performs confirmed actions through a server-side gateway.

**Architecture:** Keep Telegram and Zalo OA as thin channel adapters over one consolidated SmartPlan Assistant Gateway route plus focused server modules for identity linking, tool authorization, confirmations, audit, and jobs. Reuse existing Firebase Admin classroom/grading cores; do not give the bot direct Firestore Admin access.

**Tech Stack:** React + TypeScript + Vite, Vercel Node functions, Firebase Admin Auth/Firestore, existing Firestore Rules, Python requests Telegram polling, Vitest, Python unittest/stdlib checks.

**Scope amendment:** Documentation only. Add no source code or dependencies until implementation is explicitly started.

---

## 1. Source and file map

Current source to reuse:

- src/hooks/useChat.ts: Chat prompt and editor patch behavior; no database tools.
- src/App.tsx: current Chat context is the open creator plan only.
- api/classroom.ts: teacher/student classroom operations and token verification.
- api/grade-homework.ts: grading/practice/approval paths and quota checks.
- api/_classroom-core.ts and api/_grading-core.ts: shared server logic.
- src/lib/classroom/types.ts: classes, assignments, submissions, profiles.
- firestore.rules: current client-side ownership boundary.
- C:\Users\ADMIN\Downloads\edu-lesson-automation\lesson-bot\app\telegram_bot.py: Telegram polling and confirmation parser.

Files to create:

- api/assistant.ts: single gateway route with action dispatch.
- api/_assistant-types.ts: actor, link, share, confirmation, audit, job, and tool result types.
- api/_assistant-auth.ts: Firebase ID-token verification, channel signature verification, link-code consume, actor resolution.
- api/_assistant-core.ts: tool registry, request normalization, scope checks, confirmation hash, redaction.
- api/_assistant-tools.ts: typed read/write tools.
- api/_assistant-jobs.ts: job creation, status, idempotency, and retry state.
- api/__tests__/assistant-auth.test.ts
- api/__tests__/assistant-tools.test.ts
- api/__tests__/assistant-confirmation.test.ts
- api/__tests__/assistant-sharing.test.ts
- api/__tests__/assistant-jobs.test.ts
- api/__tests__/assistant-writes.test.ts
- src/services/telegramLinkService.ts
- src/services/telegramLinkService.test.ts
- lesson-bot/app/assistant_client.py
- lesson-bot/tests/test_assistant_client.py
- lesson-bot/app/zalo_adapter.py: Zalo OA webhook event normalization and reply dispatch.
- lesson-bot/app/zalo_client.py: Zalo OpenAPI webhook verification and message client.
- lesson-bot/tests/test_zalo_adapter.py
- lesson-bot/tests/test_zalo_client.py

Files to modify:

- src/components/modals/SettingsModal.tsx: link/unlink UI.
- src/types.ts: link status and share types used by web UI.
- firestore.rules: deny client access to assistant server collections explicitly.
- lesson-bot/app/config.py: gateway URL and service-secret settings.
- lesson-bot/app/telegram_bot.py: Telegram link, assistant request, confirmation, cancellation, status.
- lesson-bot/app/zalo_adapter.py: Zalo OA webhook, link, assistant request, confirmation, cancellation, status.
- lesson-bot/app/zalo_client.py: Zalo OpenAPI transport and signature verification.
- lesson-bot/README.md and lesson-bot/HANDOFF.md: runtime contract and secret names.
- vercel.json: only if the consolidated route requires explicit duration/memory settings.

---

## 2. Task 0 — Lock baseline and deployment budget

Files:
- Read: vercel.json, package.json, api/*.ts
- Create: docs/superpowers/handoffs/2026-10-16-assistant-gateway-baseline.md

- [ ] Record the current Git commit, dirty-worktree state, Vercel function count, configured maxDuration values, and existing Firebase Admin initialization path.
- [ ] Confirm whether one consolidated /api/assistant route fits the current Vercel function budget; if not, keep the gateway as a separate Railway service before writing code.
- [ ] Record service secret names without values and confirm no secret is written to Firestore, browser localStorage, or Telegram output.

Run:

~~~powershell
npm --prefix "C:/Users/ADMIN/.codex/worktrees/smart-lesson-plan-ai/assistant-gateway-plan" run build
(Get-ChildItem "C:/Users/ADMIN/.codex/worktrees/smart-lesson-plan-ai/assistant-gateway-plan/api" -Recurse -Filter "*.ts").Count
~~~

Expected: baseline evidence is written; no source file is modified by this task.

---

## 3. Task 1 — Lock contracts and server-only collections

Files:
- Create: api/_assistant-types.ts
- Modify: firestore.rules
- Test: api/__tests__/assistant-auth.test.ts

- [x] Define AssistantActor with firebaseUid, channel, channelAccountId, channelUserId, optional channelChatId, linkId, and active.
- [x] Define AssistantToolName as an explicit union. Do not accept arbitrary tool names from the model.
- [x] Define assistantLinkCodes, channelLinks, assistantShares, assistantConfirmations, assistantAuditLogs, and assistantJobs document shapes.
- [x] Add deny-by-default Firestore matches for all six collections. Server Admin SDK remains the only access path.
- [x] Add tests for unlinked actor, expired link, revoked link, and inactive share.

Contract to implement before tool code:

~~~ts
type AssistantActor = {
  firebaseUid: string;
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  linkId: string;
  active: true;
};
~~~

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- api/__tests__/assistant-auth.test.ts
~~~

Expected: new tests pass against pure validation helpers.

Verification (2026-10-16): `git diff --check` passes. Runtime tests and build blocked because `node_modules` is absent in this worktree.

---

## 4. Task 2 — Create and consume channel link codes

Files:
- Create: api/_assistant-auth.ts
- Create: src/services/telegramLinkService.ts
- Create: src/services/telegramLinkService.test.ts
- Modify: src/components/modals/SettingsModal.tsx
- Modify: api/assistant.ts

- [x] Implement createLinkCode(idToken): verify Firebase ID token, generate a cryptographically random code, store only SHA-256 hash, expire after 10 minutes, return the one-time display code.
- [x] Implement channel-specific consumeLinkCode: require Telegram private chat or verified Zalo OA identity, atomically reject used/expired code, and bind the exact channel account/user pair.
- [x] Implement revokeChannelLink(idToken, linkId): verify owner, mark link inactive, and invalidate pending confirmations for that actor.
- [x] Add Settings UI states: generate code, copy/display once, linked account, revoke, and error.
- [x] Never persist the raw bot service secret or raw one-time code in userSettings.
- [x] Add tests for expiry, replay, wrong Firebase owner, group-chat rejection, relink, revoke, and code hash mismatch.

Validation status (2026-10-16): implementation and test cases complete, including replay rejection (`claimAssistantRequestNonce` and one-time link-code consume). Runtime test execution/build blocked because `node_modules` is absent in this worktree; `git diff --check` passes.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- src/services/telegramLinkService.test.ts api/__tests__/assistant-auth.test.ts
~~~

Expected: all link lifecycle tests pass.

---

## 5. Task 3 — Add gateway envelope and service authentication

Files:
- Create: api/assistant.ts
- Create: api/_assistant-core.ts
- Modify: vercel.json only when needed for the single route.

- [x] Accept POST actions createLinkCode, consumeLinkCode, revokeLink, revokeChannelLink, cancelLinkCode, listChannelLinks, and safe NOT_IMPLEMENTED responses for chat, confirm, cancel, and jobStatus.
- [x] Normalize `channel`, `channelAccountId`, and `channelUserId`; keep link and authorization channel-specific.
- [x] For web actions, verify Firebase ID token from Authorization header.
- [x] For adapter actions, verify HMAC over timestamp, nonce, body, and service identifier using SMARTPLAN_ASSISTANT_SECRET.
- [x] For Zalo OA actions, verify the signed request and bind the exact OA ID plus OA-scoped Zalo UID before dispatch.
- [x] Reject old timestamps, reused nonces, unknown channel links, non-private Telegram chats, unknown Zalo OA IDs, and malformed JSON.
- [x] Normalize every request to action, actor, requestId, and payload.
- [x] Return stable kinds: answer, confirmation, job, or safe error.
- [x] Preserve legacy top-level client responses while unwrapping `{ result }` gateway envelopes; bind verified Zalo OA identity and numeric Telegram user IDs.
- [ ] Chat, confirm, cancel, and jobStatus remain safe NOT_IMPLEMENTED placeholders; actor/tool dispatch is deferred.
- [x] Redact internal error details before sending to Telegram.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- api/__tests__/assistant-auth.test.ts
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run build
~~~

Expected: gateway contract tests pass; build has zero TypeScript errors.

---

## 6. Task 4 — Implement private-by-default read tools

Files:
- Create: api/_assistant-tools.ts
- Create: api/__tests__/assistant-tools.test.ts
- Reuse: api/_classroom-core.ts, api/_grading-core.ts, src/lib/classroom/types.ts

- [x] Implement private read tools and signed linked actor resolution; shares remain unavailable until Task 5.
- [x] Derive Firestore owner scopes from actor.firebaseUid; reject caller-supplied teacher IDs.
- [x] Exclude private collections, raw provider errors, file URLs, and unapproved teacher notes.
- [x] Separate submitted, grading, graded, error, missing, and unknown counts.
- [x] Attach source collection, resource label, and observedAt.
- [x] Test ownership, unavailable query errors, safe projections, and linked actor resolution.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- api/__tests__/assistant-tools.test.ts
~~~

Expected: ownership, redaction, count, and source tests pass.

Verification (2026-10-18): focused tests PASS (15/15), `npm run lint:api -- --pretty false` PASS, `npm run build` PASS with existing chunk-size and static/dynamic import warnings, `git diff --check` PASS.

---

## 7. Task 5 — Add explicit class and lesson sharing

Files:
- Modify: api/_assistant-auth.ts
- Modify: api/_assistant-tools.ts
- Modify: api/assistant.ts
- Modify: firestore.rules
- Create: api/__tests__/assistant-sharing.test.ts
- Modify: src/types.ts
- Modify: src/components/modals/SettingsModal.tsx

- [ ] Add owner-only web actions to create, list, revoke, and expire a share grant.
- [ ] Support resource types class and lessonPlan; roles read and write.
- [ ] Resolve a shared resource only when an active grant matches granteeUid, resource ID, and required role.
- [ ] Keep student submissions and grades read-only through a read class share; only the owner can approve or edit grades in phase one.
- [ ] Show share state in the web UI without exposing secret collections.
- [ ] Test owner, grantee, revoked grant, wrong resource type, and write-role escalation.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- api/__tests__/assistant-sharing.test.ts
~~~

Expected: private-by-default and explicit-share matrix passes.

---

## 8. Task 6 — Add confirmation, cancellation, audit, and idempotency

Files:
- Create: api/__tests__/assistant-confirmation.test.ts
- Modify: api/_assistant-core.ts
- Modify: api/_assistant-tools.ts
- Modify: api/assistant.ts

- [ ] Classify tools as read, draft, write, send, destructive, or billable.
- [ ] Require confirmation for every category except read.
- [ ] Build request hash from normalized tool name, actor, resource IDs, payload, and intended recipients.
- [ ] Store a short-lived confirmation with preview, expiry, and status.
- [ ] Accept confirmation only from the same linked channel identity (channel + channelAccountId + channelUserId, optional channelChatId) and matching request hash.
- [ ] Mark confirmed records executed atomically before side effect; replay returns the original result.
- [ ] Write audit logs for reads that expose student data and all mutations.
- [ ] Test cancel, expiry, wrong chat, changed payload, replay, and partial failure.

Contract to implement before the confirmation handler:

~~~ts
type AssistantConfirmation = {
  id: string;
  actorUid: string;
  channel: Channel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
  toolName: AssistantToolName;
  requestHash: string;
  preview: string;
  expiresAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'executed';
};
~~~

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- api/__tests__/assistant-confirmation.test.ts
- api/__tests__/assistant-sharing.test.ts
- api/__tests__/assistant-jobs.test.ts
- api/__tests__/assistant-writes.test.ts
~~~

Expected: no confirmed action can execute twice.

---

## 9. Task 7 — Add long-running jobs

Files:
- Create: api/_assistant-jobs.ts
- Modify: api/assistant.ts
- Create: api/__tests__/assistant-jobs.test.ts
- Modify: lesson-bot/app/config.py
- Create: lesson-bot/app/assistant_client.py
- Create: lesson-bot/tests/test_assistant_client.py

- [ ] Create job records for lesson generation, export, bulk grading, and multi-recipient messages.
- [ ] Store jobId, actor, tool, request hash, status, progress, retry count, result references, and redacted error class.
- [ ] Enforce one active job for the same request hash unless the previous job is terminal.
- [ ] Implement bot client methods send_request, confirm, cancel, and get_job_status.
- [ ] Configure SMARTPLAN_ASSISTANT_URL, SMARTPLAN_ASSISTANT_SECRET, request timeout, and polling interval through environment variables.
- [ ] Test queueing, status transitions, retryable failure, terminal failure, and idempotent polling.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan" run test -- api/__tests__/assistant-jobs.test.ts
python -m unittest discover -s "C:\Users\ADMIN\.codex\worktrees\smart-lesson-plan-ai\assistant-gateway-plan\lesson-bot\tests" -p "test_*.py"
~~~

Expected: job state transitions and client envelope tests pass.

---

## 10. Task 8 — Wire channel adapters and natural-language requests

Files:
- Modify: lesson-bot/app/telegram_bot.py
- Modify: lesson-bot/app/main.py
- Create: lesson-bot/tests/test_telegram_assistant_commands.py
- Modify: lesson-bot/README.md
- Modify: lesson-bot/HANDOFF.md

- [ ] Add Telegram `/link`, `/unlink`, `/confirm`, `/cancel`, `/status`, and `/help` entries.
- [ ] Add Zalo webhook link, confirmation, cancellation, and status handling.
- [ ] Route a linked teacher's natural-language message from either adapter to the shared gateway when it is not a legacy TDS/MOET command.
- [ ] Preserve legacy PPCT audit/generation commands during migration.
- [ ] Render confirmation previews with target, scope, count, recipients, and expiration.
- [ ] Poll job status with bounded backoff and stop at terminal state.
- [ ] Reject unlinked users without revealing whether a Firebase account exists.
- [ ] Test Telegram linking, read request, confirmation, cancellation, job status, legacy compatibility, and malformed responses.
- [ ] Test Zalo webhook signature/verify, OA ID + UID binding, event normalization, OpenAPI reply/send, approved message type/template checks, and seven-day interaction policy.

Run:

~~~powershell
python -m unittest discover -s "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\lesson-bot\tests" -p "test_*.py"
~~~

Expected: assistant and legacy Telegram flows pass without network credentials.

---

## 11. Task 9 — Add confirmed write tools

Files:
- Modify: api/_assistant-tools.ts
- Modify: api/_assistant-jobs.ts
- Create: api/__tests__/assistant-writes.test.ts
- Reuse: api/export-lesson.ts, api/grade-homework.ts, api/classroom.ts, src/services/pushLessonToDrive.ts

- [ ] Implement draftLesson and patchLessonSection with the existing bounded editor-patch contract.
- [ ] Implement exportLesson with the existing server export path; use single-format requests for long content.
- [ ] Implement uploadLessonToDrive through a server-side authenticated path; never expose a shared bot token to browser storage.
- [ ] Implement createAssignment with teacher ownership and explicit class scope.
- [ ] Implement startAssignmentGrading through the existing grading action and preserve quota and approval rules.
- [ ] Implement approveGrade and editGrade only for the submission owner teacher; preview affected students and scores.
- [ ] Implement outbound messages only after recipient resolution, template rendering, and confirmation.
- [ ] Test write authorization, confirmation requirement, idempotency, quota errors, and partial bulk results.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run test -- api/__tests__/assistant-writes.test.ts
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build
~~~

Expected: write tests pass and existing build remains clean.

---

## 12. Task 10 — Full verification and two-teacher canary

Files:
- Create: scripts/qa/assistant-gateway.mjs
- Modify: docs/superpowers/specs/2026-10-16-assistant-gateway-design.md only for verified evidence.
- Modify: docs/superpowers/plans/2026-10-16-assistant-gateway.md only for checked items.

- [ ] Run API unit tests, web tests, API lint, web lint, and build.
- [ ] Run Firestore Rules tests for assistant collections and existing classroom paths.
- [ ] Run a two-teacher matrix:
  - Teacher A private class read succeeds.
  - Teacher B private class read fails.
  - Teacher A shares one class with Teacher B.
  - Teacher B read succeeds only for that class.
  - Teacher B write remains denied unless explicit write grant and confirmation succeed.
  - Revocation blocks the next read.
- [ ] Run confirmed lesson export/upload, cancelled upload, duplicate confirmation, and job timeout cases.
- [ ] Run real Telegram private-chat canary with two linked teacher accounts. Redact IDs, tokens, private URLs, and student secrets.
- [ ] Run Zalo OA canary: signed webhook in, normalized assistant reply out, invalid signature rejected, wrong OA/UID rejected, and proactive notification policy enforced.
- [ ] Record each check as pass, fail, or unresolved; do not call production-ready from local tests alone.

Run:

~~~powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run test
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build
python -m unittest discover -s "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\lesson-bot\tests" -p "test_*.py"
node "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\scripts\qa\assistant-gateway.mjs"
~~~

Expected: local gates pass; real-account canary evidence is recorded separately.

---

## 13. Stop conditions

Stop before enabling writes if:

- Telegram link maps to the wrong Firebase UID.
- A teacher can read another teacher's private resource.
- A revoked share remains usable.
- Confirmation can be replayed or bypassed.
- A failed write claims success.
- Student PINs, private tokens, or raw teacher-only notes reach Telegram.
- Vercel function limits or runtime duration cannot support the route.

Do not add generic query tools, broad Admin credentials to Python, automatic writes, student/parent Telegram or Zalo access, arbitrary proactive Zalo messages, or unrelated UI refactors.
