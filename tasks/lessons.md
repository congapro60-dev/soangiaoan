# Lessons Learned

> Updated after every correction. Reviewed at session start.

---

## TypeScript

- **setBulkProgress reset must include all fields** — `{ current: 0, total: 0, currentTitle: '' }` not just `{ current: 0, total: 0 }`. Local Vite build passes but GitHub CI (strict tsc) catches it. Always run `npx tsc --noEmit` before committing. *(2026-04-21)*

- **`replace_all: false` fails when string appears twice** — When using Edit tool, if `old_string` matches more than once the edit fails. Add more surrounding context to make it unique. *(2026-04-21)*

## Firebase

- **`browserSessionPersistence` logs users out on tab close** — Use `browserLocalPersistence` (Firebase default) unless logout-on-close is intentional. *(2026-04-21)*

- **Firestore writes need try/catch + user feedback** — Silent failures destroy trust. Always wrap `setDoc`/`deleteDoc` in try/catch and show error toast on failure. *(2026-04-21)*

## React / State

- **Rename in view mode must sync to Firestore** — When updating `data.gradingSessions` via `setData`, also call `persistSession(updatedSession)` to write through to Firestore. Local state update alone is lost on reload. *(2026-04-21)*

- **Bulk loop needs cancel ref reset at start** — Set `cancelBulkRef.current = false` before the loop begins, otherwise a previous cancel bleeds into the next run. *(2026-04-21)*

## Git Workflow

- **NEVER push to `main` without explicit user order** — All development stays on feature branch. Only push to `main` when user explicitly says "push to main" / "merge" / "ra lệnh". The stop-hook warning is not a reason to push to main automatically. *(2026-04-28)*

## UX Patterns

- **API key banner must name the active provider** — Generic "no API key" message is confusing when user has keys for other providers. Check active provider specifically. *(2026-04-21)*

- **Empty states are mandatory** — Every list/grid must handle `length === 0` with icon + message + CTA. Blank space = broken to new users. *(2026-04-21)*

- **File upload needs size guard** — No size limit = browser hangs on large files with no feedback. Default max: 20MB with clear error toast. *(2026-04-21)*
