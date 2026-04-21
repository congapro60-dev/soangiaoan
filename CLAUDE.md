# SmartPlan AI — Claude Working Guidelines

> Combines: Boris Cherny (Anthropic internal), Andrej Karpathy (LLM coding pitfalls), Superpowers skills.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- Check `tasks/lessons.md` at session start for patterns from past mistakes

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

## 4. Verification Before Done

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

- Run `npm run build` — zero TypeScript errors required before declaring done
- Ask yourself: "Would a staff engineer approve this?"

## 5. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing CI — then resolve them
- Go fix failing CI tests without being told how
- Zero context switching required from the user

## 6. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake from recurring
- Review `tasks/lessons.md` at session start

## 7. Subagent Strategy

- Use subagents to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Capture Lessons**: Update `tasks/lessons.md` after any correction

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Surgical by Default**: Don't touch code outside the blast radius of the task.
- **Test Before Merge**: `npm run build` must pass. No exceptions.

---

## Project Context

**App**: SmartPlan AI — Vietnamese teacher assistant web app
**Stack**: React + TypeScript + Vite + Tailwind v4 + Firebase (Auth, Firestore, Storage)
**AI Providers**: Gemini, Claude, OpenAI, Grok, DeepSeek — via `src/lib/aiProviders.ts`
**Key tabs**: Dashboard, Creator (lesson plans), Library, Testing (exams), Grading (AI grading), Exams (online tests), Chat
**Deploy**: Vercel — relay API at `api/gemini-relay.ts`
**Branch**: Always develop on feature branch, push to `main` when done

---

## File Structure Quick Reference

```
src/
  components/
    tabs/          — One file per main tab
    features/      — Sub-components grouped by feature
    modals/        — Modal dialogs
    layout/        — Sidebar, Header
  hooks/           — useAppState, useLessonCreator, useAuth, useExams...
  lib/             — aiProviders, firebase, gemini
  utils/           — gradingUtils, fileUtils, exportUtils...
  types.ts         — All TypeScript interfaces
  App.tsx          — Root component + routing
tasks/
  todo.md          — Current task plan
  lessons.md       — Learned patterns and rules
```


---

## 1. Plan First — Default Behavior

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- Check `tasks/lessons.md` at session start for patterns from past mistakes

## 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at session start for relevant project

## 4. Verification Before Done

- Never mark a task complete without proving it works
- Run `npm run build` — zero TypeScript errors required before declaring done
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **No Broken Windows**: Don't leave TODOs, commented-out code, or partial implementations.
- **Test Before Merge**: `npm run build` must pass. No exceptions.

---

## Project Context

**App**: SmartPlan AI — Vietnamese teacher assistant web app
**Stack**: React + TypeScript + Vite + Tailwind v4 + Firebase (Auth, Firestore, Storage)
**AI Providers**: Gemini, Claude, OpenAI, Grok, DeepSeek — via `src/lib/aiProviders.ts`
**Key tabs**: Dashboard, Creator (lesson plans), Library, Testing (exams), Grading (AI grading), Exams (online tests), Chat
**Deploy**: Vercel — relay API at `api/gemini-relay.ts`
**Branch**: Always develop on feature branch, push to `main` when done

---

## File Structure Quick Reference

```
src/
  components/
    tabs/          — One file per main tab
    features/      — Sub-components grouped by feature
    modals/        — Modal dialogs
    layout/        — Sidebar, Header
  hooks/           — useAppState, useLessonCreator, useAuth, useExams...
  lib/             — aiProviders, firebase, gemini
  utils/           — gradingUtils, fileUtils, exportUtils...
  types.ts         — All TypeScript interfaces
  App.tsx          — Root component + routing
tasks/
  todo.md          — Current task plan
  lessons.md       — Learned patterns and rules
```
