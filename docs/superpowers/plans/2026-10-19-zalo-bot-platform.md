# Bot Cuong Vu - Zalo Bot Platform

User approved continuation on 2026-10-19. The requested surface is a private
conversation in personal Zalo, using the official Bot Platform. Bot display
name: Bot Cuong Vu. Earlier business OA implementation is a separate channel.

## Design and constraints

- Receive Bot Platform webhooks through the existing Vercel assistant endpoint
  at `/api/assistant?transport=zalo_bot`; no extra Vercel function or paid host.
- Validate `X-Bot-Api-Secret-Token`, exact configured bot ID, PRIVATE chat, human
  sender, bounded event size/text, message ID and timestamp before dispatch.
- Use a distinct `zalo_bot` identity: bot ID + sender ID + private chat ID.
  Never alias OA links or infer a Firebase user from display name/phone number.
- Reuse Firebase one-use `/link CODE`, read tools, confirmations and audit.
  Webhook requests cannot choose trusted identity, gateway action or recipient.
- Durable event claim before any gateway work or outbound reply. Replayed or
  ambiguous deliveries never automatically retry writes or messages.
- Reply only to the authenticated inbound private chat. No proactive messages,
  groups, contact access, personal-session automation or startup broadcasts.
- Fail closed until server secrets and pilot sender allowlist are configured.
  Credentials are entered in secure settings, never in chat or tracked files.
- Commands: `/help`, `/link`, `/classes`, `/confirm`, `/cancel`, `/status`.
  Natural-language `chat` remains explicitly unavailable until its separate
  dispatcher is implemented; do not describe this transport as a finished AI.
- Bot token stays server-side. No provider token or raw provider error in logs.
  Keep existing Telegram and OA behavior intact.

## Work and checks

- [x] G1: Add channel to gateway auth/types/jobs/confirmation validation and UI
  labels. Tests prove namespaces cannot cross and private linking is enforced.
- [x] G2: Official webhook adapter and existing endpoint integration. Tests use
  fake transport only: wrong/missing secret, disabled config, wrong sender,
  group/bot sender, stale/malformed/duplicate event, same-chat replies, link and
  confirmation routing, token-safe errors, bounded output, no startup sends.
- [x] G3: Review final diff; run assistant tests, `lint`, `lint:api`, build.
- [ ] G4: Configure real Bot Cuong Vu token/secret and sender allowlist, deploy,
  verify actual webhook and owner's private conversation. Await bot creation
  and secure credential setup; no student data or third-party messages in smoke.

## Routing and state

9router is reachable on 2026-10-21. Work stayed on `gpt-6-sol`/native Codex;
no Astra used. No paid API route authorized. Full suite passed before the final
stream and sender-flag hardening; targeted Bot tests passed after it.

The existing bot checkout contains 8 known local OA fixes from earlier work;
preserve them. This change targets the clean assistant-gateway-release checkout.
Production, credentials and private canary remain unverified.

## Sources

- https://docs.zaloplatforms.com/docs/BOT/create_bot
- https://docs.zaloplatforms.com/docs/BOT/webhook
- https://docs.zaloplatforms.com/docs/BOT/apis/getMe
- https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage
- https://docs.zaloplatforms.com/docs/BOT/apis/setWebhook
