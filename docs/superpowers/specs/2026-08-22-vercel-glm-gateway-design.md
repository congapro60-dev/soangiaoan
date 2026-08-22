# Vercel AI Gateway — GLM 5.2 Design

**Status:** Approved by owner on 2026-08-22

## Goal

Add GLM 5.2 as an optional SmartPlan AI provider using one owner-managed Vercel AI Gateway key, without exposing that key to the browser or changing the existing default provider.

## Scope

- Add a serverless `POST /api/grade-homework (action: aiGateway)` endpoint.
- Require a Firebase ID token in `Authorization: Bearer ...`.
- Read `AI_GATEWAY_API_KEY` only from Vercel server environment variables.
- Allow the fixed model `zai/glm-5.2` through `https://ai-gateway.vercel.sh/v1`.
- Support non-streaming and streaming text requests used by lesson generation and chat.
- Add a visible `Vercel AI Gateway · GLM 5.2` provider in Settings.
- Preserve Gemini, Claude, OpenAI, Grok, DeepSeek, NVIDIA, and Custom API behavior.
- Do not impose an application quota; retain method, auth, body, and prompt validation.

## Explicit non-goals

- Do not put the shared key in client settings, localStorage, Vite environment variables, or the JavaScript bundle.
- Do not change the default provider from Gemini.
- Do not route image/PDF vision calls to GLM 5.2 in this phase; show a clear error and require a vision-capable provider.
- Do not implement automatic fallback or provider-wide cost controls in this phase.
- Do not modify Vercel project environment variables from the repository. The owner must add `AI_GATEWAY_API_KEY` in the Vercel dashboard.

## Architecture and data flow

```text
Settings: select GLM 5.2
        |
        v
src/lib/aiProviders.ts
        |  Firebase currentUser.getIdToken()
        v
POST /api/grade-homework (action: aiGateway)  -- Bearer Firebase ID token --> Firebase Admin verifyIdToken
        |
        |  AI_GATEWAY_API_KEY (server only)
        v
Vercel AI Gateway /v1/chat/completions -- model: zai/glm-5.2
        |
        v
text JSON or SSE chunks -> existing lesson/chat consumers
```

The provider uses a sentinel API-key value locally so existing UI guards continue to recognize the server-managed provider. The sentinel is never sent over the network; only the Firebase ID token is sent to the app's own API route.

## Error handling

- `405`: non-POST request.
- `401`: missing or invalid Firebase token.
- `400`: blank, non-string, or oversized prompt.
- `500`: `AI_GATEWAY_API_KEY` missing on Vercel.
- `502`: provider failure or empty model response.
- Streaming failures are sent as an SSE error event and then closed.

All provider errors are logged server-side without returning raw provider details or the API key to the client.

## Verification

- Unit tests cover token parsing, prompt validation, fixed model/request shape, server-key resolution, handler auth/config/provider behavior, SSE parsing, and vision rejection.
- Run targeted tests, the full Vitest suite, `npm run lint`, and `npm run build`.
- Live Vercel verification requires the owner to add `AI_GATEWAY_API_KEY`; no secret is requested in chat or committed to the repository. After redeploying, select GLM 5.2 in Settings, send one text request, confirm the answer and streaming path, then confirm image/PDF requests show the text-only guidance.
