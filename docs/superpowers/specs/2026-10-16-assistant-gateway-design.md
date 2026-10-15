# Assistant Gateway — Telegram đa giáo viên

Status: approved-for-plan
Version: 2026-10-16

## Source of truth

- User: one shared Telegram bot, multiple teachers.
- User: each teacher links Firebase account with a one-time code.
- User: reads run automatically; every write, edit, send, or destructive action requires confirmation.
- User: data is private by default; explicit sharing is allowed per class or lesson.
- Repository: src/hooks/useChat.ts, src/App.tsx, api/classroom.ts, api/grade-homework.ts, firestore.rules.
- Bot: C:\Users\ADMIN\Downloads\edu-lesson-automation\lesson-bot\app\telegram_bot.py and bot_api_server.py.

## 1. Objective

Build a multi-tenant Telegram assistant for SmartPlan. A teacher can ask about their own classes, students, lesson plans, homework submissions, grades, exams, adaptive progress, and AI jobs. The teacher can request generation or mutations. The assistant executes only through server-side tools, enforces ownership and sharing, asks for explicit confirmation before every write, and records an audit event.

The result is a thin Telegram transport plus a SmartPlan Assistant Gateway. The model never receives unrestricted Firestore access, Firebase Admin credentials, or a generic query primitive.

## 2. Users and identity

### Teacher

- Authenticated SmartPlan Firebase user.
- Links one or more private Telegram chats through a short-lived one-time code.
- Reads owned data automatically.
- Reads explicitly shared classes or lesson plans according to a share grant.
- Confirms every mutation, outbound message, destructive action, or billable AI job.

### Student and parent

- No direct Telegram access in the first release.
- Existing student portal and parent-safe projections remain the source of truth.
- Student PINs, studentSecrets, raw teacher notes, private download tokens, and private class URLs never enter assistant responses.

### Telegram identity

Use Telegram numeric userId as the stable identity. Do not use display name or username for authorization. Link commands are accepted only in private chats in phase one. Group chats are denied until a separate group policy exists.

## 3. Scope

### In scope

- One shared Telegram bot for multiple teachers.
- Web-generated one-time linking code.
- Server-side identity resolution.
- Read tools for classes, students, assignments, submissions, grades, lesson plans, exams, adaptive progress, and job status.
- Explicit share grants for individual classes and lesson plans.
- Confirmation records bound to teacher, Telegram chat, request hash, and expiration.
- Audit records for reads that expose student data and every write.
- Draft lesson generation, export, Drive upload, assignment creation, grading launch, grade approval/edit, and outbound teacher/parent message as confirmed tools.
- Long-running job status through Telegram.

### Out of scope for first release

- Direct Telegram access for students or parents.
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

1. Telegram transport
   - Existing Python polling process.
   - Parses link, question, confirmation, cancellation, and status commands.
   - Sends requests to the gateway using a server-to-server secret.
   - Never receives Firebase Admin credentials.

2. SmartPlan Assistant Gateway
   - Consolidated POST route: /api/assistant.
   - Web calls use Firebase ID-token authentication for link-code creation and share management.
   - Telegram calls use an HMAC service signature plus Telegram user/chat identifiers.
   - Resolves Telegram link before dispatching any tool.
   - Validates tool input, ownership, share grants, confirmation, idempotency, and audit logging.

3. Tool registry
   - Typed tool definitions.
   - Each tool receives an authenticated AssistantActor.
   - No generic collection name, Firestore query string, or Admin SDK handle is exposed to the model.

4. Job layer
   - Short reads return synchronously.
   - Generation, export, bulk grading, and multi-recipient messaging create assistantJobs.
   - Telegram polls job status and receives a final result.
   - Job execution rechecks actor, scope, request hash, and confirmation before side effects.

5. Storage

Server-only collections:

- assistantLinkCodes/{codeHash}
- telegramLinks/{telegramUserId}
- assistantShares/{shareId}
- assistantConfirmations/{confirmationId}
- assistantAuditLogs/{logId}
- assistantJobs/{jobId}

Client Firestore rules deny direct client reads/writes to these collections. Admin-side code validates every access.

## 6. Account linking flow

1. Teacher opens SmartPlan while authenticated.
2. Settings calls POST /api/assistant with action createLinkCode and the Firebase ID token.
3. Gateway stores only a hash of a random code, teacher UID, creation time, expiration, and unused state. Expiration is 10 minutes. The code is single-use.
4. Teacher sends /link CODE to the bot in a private chat.
5. Bot sends the code plus Telegram numeric IDs to the gateway.
6. Gateway atomically consumes the code and creates or updates telegramLinks/{telegramUserId}.
7. Bot confirms only teacher display name and link status. It never echoes the raw code after use.
8. Unlink or revoke marks the link inactive immediately. Later requests fail closed.

Replay, expired codes, mismatched private/group chat, and already-linked accounts return safe errors without revealing account existence.

## 7. Data access and sharing

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

## 8. Tool contract

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

## 9. Confirmation, idempotency, and audit

Confirmation fields:

- id
- actorUid
- telegramUserId
- chatId
- toolName
- requestHash
- preview
- expiresAt
- status: pending, confirmed, cancelled, expired, or executed

Confirmation accepts only the same linked Telegram identity and matching request hash. A second confirmation or replay returns the existing result and does not repeat the side effect.

Audit records include actor UID, Telegram IDs, tool, resource IDs, result status, confirmation ID, request hash, error class, and timestamps. Never store raw API keys, PINs, full student submissions, or private download tokens in logs.

## 10. Error behavior

- Unknown class, student, or lesson name: return disambiguation choices; do not guess.
- Missing permission: return a permission result, not a fabricated empty result.
- Stale data: include observed time and ask for refresh when a write depends on it.
- Timeout: create a job or return retryable status; never claim completion.
- Invalid AI output: keep source data unchanged, record failure, and offer bounded retry.
- Partial bulk action: return per-item status and idempotency keys.
- Provider/API errors: redact secrets and internal stack traces.

## 11. Alternatives

Selected: gateway plus thin bot. This centralizes authorization and domain rules in SmartPlan, keeps Telegram replaceable, and supports explicit audit.

Rejected: Python bot with direct Firebase Admin. It duplicates Rules and creates a second source of truth.

Rejected: browser automation. It depends on UI layout and authenticated sessions and cannot provide a reliable authorization boundary.

## 12. Acceptance criteria

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

## 13. Rollout

- Phase 0: link/revoke and read-only class/assignment summaries.
- Phase 1: all read tools and explicit share grants.
- Phase 2: lesson draft/export/Drive upload.
- Phase 3: assignments, grading, approvals, and messages.
- Phase 4: bulk jobs, quotas, dashboards, and broader sharing.

No production write action is enabled until the two-teacher permission matrix passes.

## 14. Fixed decisions

- One shared Telegram bot.
- Multiple teachers.
- One-time Firebase linking.
- Private-by-default data.
- Explicit class/lesson sharing.
- Reads automatic.
- Every write/edit/send requires confirmation.
- Students and parents remain web-portal users in first release.

