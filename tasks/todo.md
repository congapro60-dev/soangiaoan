# Task Board

> Created per session. Checked off as completed.

---

## Template (copy for each new task)

```
## [Task Name] — [Date]

### Plan
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Verification
- [ ] npm run build passes
- [ ] Feature works end-to-end
- [ ] Edge cases handled

### Result
_Summary after completion_
```

---

## Active Task: None

---


## Completed Sessions

### Puppeteer E2E Live DOM Test — 2026-05-27

- [x] Task 1: Install Puppeteer Dependency
- [x] Task 2: Create E2E Test Script `live_dom_test.js`
- [x] Task 3: Configure E2E script in `package.json`
- [x] Task 4: Run E2E Test and Verify Browser Launches
- [x] **Verification**: E2E test runs successfully against Production Vercel using `domcontentloaded` wait strategy. Safely clicks "Chế độ dùng thử", enters Dashboard, and performs sidebar navigation flow.

### QA Audit + Bug Fixes — 2026-04-21

- [x] Full codebase QA audit (18 issues found)
- [x] BUG-001: Firebase session persistence fix
- [x] BUG-002: persistSession try/catch
- [x] BUG-003: Remove console.log from gemini.ts
- [x] BUG-004: File upload size limit (20MB)
- [x] BUG-005: Bulk generation cancel button
- [x] BUG-006: API key banner shows active provider
- [x] BUG-007: Empty states in LibraryTab
- [x] BUG-008: handleRename syncs to Firestore

### Grading AI Improvements — 2026-04-21

- [x] Inline student name editing (double-click)
- [x] Custom max score input
- [x] ETA countdown during batch grading
- [x] Weakness aggregation panel (GradingWeaknessPanel)
- [x] Per-student print/PDF report

### Superpowers + CLAUDE.md Setup — 2026-04-21

- [x] Install obra/superpowers (14 skills)
- [x] Create CLAUDE.md with Anthropic internal workflow
- [x] Create tasks/lessons.md with current learned patterns
