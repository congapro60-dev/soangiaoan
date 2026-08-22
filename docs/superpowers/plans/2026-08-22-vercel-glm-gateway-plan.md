# Vercel AI Gateway GLM 5.2 Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, server-managed GLM 5.2 provider to SmartPlan AI for authenticated text and streaming requests.

**Architecture:** The browser selects a fixed `vercel-gateway` provider and sends only a Firebase ID token plus prompt to `/api/grade-homework (action: aiGateway)`. The Vercel function verifies the token, reads `AI_GATEWAY_API_KEY`, calls the OpenAI-compatible Vercel AI Gateway with `zai/glm-5.2`, and returns JSON or SSE. Existing vision calls fail clearly instead of silently routing images to a text-only model.

**Tech Stack:** React + TypeScript + Vite, Vercel Node functions, Firebase Admin Auth, OpenAI-compatible SDK, Vitest.

---

### Task 1: Lock the gateway contract with tests

**Files:**
- Create: `api/__tests__/ai-gateway-core.test.ts`
- Create: `api/__tests__/ai-gateway-handler.test.ts`
- Create: `src/lib/vercelGateway.test.ts`
- Create: `src/lib/aiProviders.vercelGateway.test.ts`

- [x] Test Bearer parsing, prompt normalization, fixed model, server-key resolution, handler auth/config/provider responses, SSE parsing, server-provider sentinel, and vision rejection.
- [x] Run the targeted tests once before the implementation to observe the expected missing-module failures.

### Task 2: Implement the server gateway contract

**Files:**
- Create: `src/lib/vercelGatewayConfig.ts`
- Create: `api/_ai-gateway-core.ts`
- Create: `api/ai-gateway.ts`

- [x] Define the fixed endpoint/model/output constants and prompt guard.
- [x] Verify Firebase ID tokens through the existing Firebase Admin initializer.
- [x] Read only `AI_GATEWAY_API_KEY` from `process.env` and never include it in response payloads.
- [x] Implement non-streaming JSON and streaming SSE responses with stable user-facing errors.

### Task 3: Connect the provider to the app

**Files:**
- Modify: `src/config/apiLimits.ts`
- Modify: `src/types.ts`
- Modify: `src/lib/aiProviders.ts`
- Create: `src/lib/vercelGateway.ts`
- Modify: `src/components/modals/SettingsModal.tsx`
- Modify: `src/App.tsx`

- [x] Add the `vercel-gateway` provider and fixed GLM 5.2 Settings entry.
- [x] Send the Firebase token to the server route for text and streaming calls.
- [x] Keep the current default provider and all existing user-key providers unchanged.
- [x] Block vision calls with an explicit message.
- [x] Suppress the normal “missing API key” banner for the server-managed provider.

### Task 4: Verify and hand off

**Files:**
- Modify: `tasks/todo.md`

- [x] Run targeted tests and the complete `npm test` suite.
- [x] Run `npm run lint` and `npm run build`.
- [x] Inspect `git diff` for accidental secrets and unrelated changes.
- [x] Record the required Vercel environment variable and live smoke-test steps without writing the secret into the repository.
- [ ] Run the live Vercel smoke test after the owner configures `AI_GATEWAY_API_KEY`.
