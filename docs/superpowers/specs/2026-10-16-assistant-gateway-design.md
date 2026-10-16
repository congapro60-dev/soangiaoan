# Assistant Gateway — đa kênh (Telegram + Zalo OA)

Status: approved-for-plan
Version: 2026-10-16

## Source of truth

- User: one shared Telegram bot, multiple teachers.
- User: add Zalo Official Account (OA) as a second channel adapter.
- Official evidence observed 2026-10-16:
  - https://oa.zalo.me/home/documents/guides/Khoi-tao-ung-dung-va-cap-quyen_117071366476220195 - OA OpenAPI integrates an internal server; Zalo sends event data to the server through POST webhooks.
  - https://oa.zalo.me/home/documents/guides/tin-tu-van - OpenAPI advisory messages can be sent within 7 days of the user's last interaction.
  - https://oa.zalo.me/home/documents/vie/guides/tong-quan-cac-loai-tin-nhan-tren-zalo-official-account-_3651713298729094511 - OA User ID/UID is scoped to a specific OA.
- User: each teacher links Firebase account with a one-time code.
- User: reads run automatically; every write, edit, send, or destructive action requires confirmation.
- User: data is private by default; explicit sharing is allowed per class or lesson.
- Repository: src/hooks/useChat.ts, src/App.tsx, api/classroom.ts, api/grade-homework.ts, firestore.rules.
- Bot: C:\Users\ADMIN\Downloads\edu-lesson-automation\lesson-bot\app\telegram_bot.py and bot_api_server.py.

## 1. Objective

Build a channel-neutral multi-tenant assistant for SmartPlan. Telegram and Zalo OA are transport adapters over the same assistant core. A teacher can ask about their own classes, students, lesson plans, homework submissions, grades, exams, adaptive progress, and AI jobs. The teacher can request generation or mutations. The assistant executes only through server-side tools, enforces ownership and sharing, asks for explicit confirmation before every write, and records an audit event.

The result is a thin channel adapter layer plus a SmartPlan Assistant Gateway. The model never receives unrestricted Firestore access, Firebase Admin credentials, or a generic query primitive.

## 2. Users and identity

### Teacher

- Authenticated SmartPlan Firebase user.
- Links one or more channel identities through a short-lived one-time code.
- Reads owned data automatically.
- Reads explicitly shared classes or lesson plans according to a share grant.
- Confirms every mutation, outbound message, destructive action, or billable AI job.

### Student and parent

- No direct Telegram access in the first release.
- Existing student portal and parent-safe projections remain the source of truth.
- Student PINs, studentSecrets, raw teacher notes, private download tokens, and private class URLs never enter assistant responses.

### Channel identity

Every request carries `channel`, `channelAccountId`, and `channelUserId`.

- Telegram: use numeric userId as `channelUserId`; private chats only in phase one. Do not use display name or username for authorization.
- Zalo OA: use the OA ID as `channelAccountId` and the Zalo User ID/UID as `channelUserId`; the UID is scoped to that OA.
- A channel-specific link binds one channel identity to one SmartPlan Firebase UID. Never infer a cross-channel identity from matching names, phone numbers, or UIDs.

## 3. Scope

### In scope

- One shared Telegram bot and one Zalo OA adapter for multiple teachers.
- Web-generated one-time linking code.
- Server-side identity resolution.
- Read tools for classes, students, assignments, submissions, grades, lesson plans, exams, adaptive progress, and job status.
- Explicit share grants for individual classes and lesson plans.
- Confirmation records bound to teacher, channel identity, optional channel chat, request hash, and expiration.
- Audit records for reads that expose student data and every write.
- Draft lesson generation, export, Drive upload, assignment creation, grading launch, grade approval/edit, and outbound teacher/parent message as confirmed tools.
- Long-running job status through the originating channel adapter.

### Out of scope for first release

- Direct Telegram or Zalo access for students or parents.
- Arbitrary Firestore query language.
- Browser automation against the SmartPlan UI.
- Automatic write/send actions without confirmation.
- Sharing whole teacher accounts or API keys.
- Automatic cross-school data discovery.
- Replacing the existing web Chat UI.
- Deleting or migrating existing classroom data.

## 4. Current state and evidence

The web Chat currently calls callAI, includes only the current lesson content as optional context, and applies bounded editor patches. It does not call database tools: src/hooks/useChat.ts:85 and src/App.tsx:80.

The current server already contains ownership-aware flows:

- Classroom actions and Firebase ID-token verification: api/classroom.ts:21.
- Grading, practice, quota, and teacher ownership checks: api/grade-homework.ts:38.
- Firestore teacher/student rules: firestore.rules:478.
- Telegram currently provides PPCT audit/generation and a limited FastAPI upload/check API, but no SmartPlan data tools.

The gateway must reuse those server-side checks or equivalent shared core functions. It must not trust the old global WEB_API_TOKEN as a multi-teacher identity.

## 5. Architecture

### Components

1. Channel adapters
   - Telegram adapter: existing Python polling process; parses link, question, confirmation, cancellation, and status commands.
   - Zalo OA adapter: receives Zalo POST webhook events, verifies the request, normalizes events, and sends replies through Zalo OpenAPI.
   - Both adapters send requests to the gateway using a server-to-server secret and never receive Firebase Admin credentials.

2. SmartPlan Assistant Gateway
   - Consolidated POST route: /api/assistant.
   - Web calls use Firebase ID-token authentication for link-code creation and share management.
   - Channel calls use an HMAC/service signature plus channel account and user identifiers.
   - Resolves a channel-specific link before dispatching any tool.
   - Validates tool input, ownership, share grants, confirmation, idempotency, and audit logging.

3. Tool registry
   - Typed tool definitions.
   - Each tool receives an authenticated AssistantActor.
   - No generic collection name, Firestore query string, or Admin SDK handle is exposed to the model.

4. Job layer
   - Short reads return synchronously.
   - Generation, export, bulk grading, and multi-recipient messaging create assistantJobs.
   - The originating adapter polls or receives job status and returns a final result.
   - Job execution rechecks actor, scope, request hash, and confirmation before side effects.

5. Storage

Server-only collections:

- assistantLinkCodes/{codeHash}
- channelLinks/{linkId}
- assistantShares/{shareId}
- assistantConfirmations/{confirmationId}
- assistantAuditLogs/{logId}
- assistantJobs/{jobId}

Client Firestore rules deny direct client reads/writes to these collections. Admin-side code validates every access.

## 6. Channel delivery policy

- Assistant replies are sent only after an inbound interaction and only within each platform's rules.
- Zalo OA outbound teacher/parent notifications require an approved message type or template, resolved recipients, and explicit confirmation.
- Do not promise arbitrary proactive Zalo messages. The seven-day advisory window and any template/platform limits are enforced by the adapter.

## 7. Account linking flow

1. Teacher opens SmartPlan while authenticated.
2. Settings calls POST /api/assistant with action createLinkCode and the Firebase ID token.
3. Gateway stores only a hash of a random code, teacher UID, creation time, expiration, and unused state. Expiration is 10 minutes. The code is single-use.
4. Teacher sends /link CODE to the bot in a private chat.
5. Bot sends the code plus Telegram numeric IDs to the gateway.
6. Gateway atomically consumes the code and creates or updates channelLinks/{linkId}, keyed by channel identity.
7. Bot confirms only teacher display name and link status. It never echoes the raw code after use.
8. Unlink or revoke marks the link inactive immediately. Later requests fail closed.

Replay, expired codes, mismatched private/group chat, and already-linked accounts return safe errors without revealing account existence.

## 8. Data access and sharing

Every normalized request includes:

- `channel`: `telegram` or `zalo_oa`.
- `channelAccountId`: Telegram bot identity or Zalo OA ID.
- `channelUserId`: Telegram numeric userId or OA-scoped Zalo UID.

Default query scope:

- teacherId equals actor.firebaseUid for classes, students, assignments, submissions, profiles, lesson plans, exams, and grading sessions.
- Never query by a caller-supplied teacher ID.
- Exclude studentSecrets, studentLinks internals, API keys, raw provider errors, private storage tokens, and unapproved teacher notes.

Explicit sharing:

- Owner creates a grant for class or lessonPlan.
- Grant fields: resourceType, resourceId, ownerUid, granteeUid, role (read or write), status, createdAt, revokedAt.
- Class sharing exposes roster, assignments, submission status, and approved teacher-safe results only.
- Lesson sharing exposes lesson content and permitted export actions only.
- Revocation takes precedence over cached context.
- No workspace-wide sharing in phase one.

## 9. Tool contract

### Read tools

- listClasses
- getClassSummary
- listStudents
- getStudentTeacherSummary
- listAssignments
- getAssignmentSubmissionSummary
- getStudentSubmissionHistory
- getApprovedGradeSummary
- searchLessonPlans
- getLessonPlan
- searchExams
- getAdaptiveProgressSummary
- getAssistantJobStatus

Read responses include source collection, scoped resource, and observedAt timestamp. Counts distinguish submitted, grading, graded, error, missing, and unknown. Empty results are stated as empty; the model must not infer zero from a failed query.

### Confirmed tools

- draftLesson
- patchLessonSection
- exportLesson
- uploadLessonToDrive
- createAssignment
- startAssignmentGrading
- approveGrade
- editGrade
- sendTeacherMessage
- sendParentMessage
- revokeStudentAccess
- replaceDriveFile

Each tool returns a preview before side effect. The preview states target, scope, recipients, files, estimated AI cost where known, and irreversible effects.

## 10. Confirmation, idempotency, and audit

Confirmation fields:

- channel
- channelAccountId
- channelUserId
- id
- actorUid
- channelAccountId
- channelUserId
- channelChatId (when the channel provides one)
- toolName
- requestHash
- preview
- expiresAt
- status: pending, confirmed, cancelled, expired, or executed

Confirmation accepts only the same linked channel identity (channel + channelAccountId + channelUserId, with optional chat) and matching request hash. A second confirmation or replay returns the existing result and does not repeat the side effect.

Audit records include actor UID, channel account/user IDs, tool, resource IDs, result status, confirmation ID, request hash, error class, and timestamps. Never store raw API keys, PINs, full student submissions, or private download tokens in logs.

## 11. Error behavior

- Unknown class, student, or lesson name: return disambiguation choices; do not guess.
- Missing permission: return a permission result, not a fabricated empty result.
- Stale data: include observed time and ask for refresh when a write depends on it.
- Timeout: create a job or return retryable status; never claim completion.
- Invalid AI output: keep source data unchanged, record failure, and offer bounded retry.
- Partial bulk action: return per-item status and idempotency keys.
- Provider/API errors: redact secrets and internal stack traces.

## 12. Alternatives

Selected: gateway plus thin bot. This centralizes authorization and domain rules in SmartPlan, keeps Telegram replaceable, and supports explicit audit.

Rejected: Python bot with direct Firebase Admin. It duplicates Rules and creates a second source of truth.

Rejected: browser automation. It depends on UI layout and authenticated sessions and cannot provide a reliable authorization boundary.

## 13. Acceptance criteria

1. Two linked teachers cannot read each other's private class, student, assignment, submission, grade, or lesson data.
2. A shared class or lesson is readable only after an owner-created active grant.
3. Revoking a link or share blocks the next request; cached answers are not reused.
4. Every write, edit, outbound send, Drive replacement, grading launch, or AI-costing job requires confirmation.
5. Confirmation replay cannot repeat a side effect.
6. Read answers report exact counts and observed time; failed reads never become zeros.
7. Student PINs, tokens, raw teacher notes, private URLs, and secret collections never appear in Telegram output or audit logs.
8. Existing web classroom and grading flows remain unchanged.
9. Linking, read tools, confirmation, job retry, and permission boundaries have tests.
10. Real-account QA uses at least two teacher accounts, one shared class, one private class, one revoked link, one confirmed write, one cancelled write, and one timeout.
11. Zalo OA canary receives a signed webhook, normalizes a teacher interaction, replies through OpenAPI, rejects a mismatched OA/UID link, and enforces the approved-message/confirmation policy.

## 14. Rollout

- Phase 0: link/revoke and read-only class/assignment summaries.
- Phase 1: all read tools and explicit share grants.
- Phase 2: lesson draft/export/Drive upload.
- Phase 3: assignments, grading, approvals, and messages.
- Phase 4: bulk jobs, quotas, dashboards, and broader sharing.

No production write action is enabled until the two-teacher permission matrix passes.

## 15. Fixed decisions

- One shared Telegram bot plus one Zalo OA adapter.
- Multiple teachers.
- Channel-specific one-time Firebase linking.
- Private-by-default data.
- Explicit class/lesson sharing.
- Reads automatic.
- Every write/edit/send requires confirmation.
- Students and parents remain web-portal users in first release; any future Zalo/Telegram outbound notification needs approved platform message policy and confirmation.


## 16. Zalo OA acceptance and canary cases

- Receive a valid Zalo OA POST webhook and normalize it to the shared assistant envelope.
- Reject invalid signature, malformed event, unknown OA ID, and a Zalo UID linked to another OA.
- Reply through Zalo OpenAPI using the same assistant core authorization and redaction rules as Telegram.
- Allow an assistant reply after a teacher interaction; reject or queue outbound notifications when the platform window or approved message type/template is unavailable.
- Confirm that identical names or phone numbers across Telegram and Zalo never merge identities.
