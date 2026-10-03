# Mode Runtime: Partial Integration

Uncommitted work preserved. No subagents, commits, pushes or deployment.

Implemented: route-level mode config validation; noncampaign begin seeds engine state and shared-device unit ids; authenticated mode-state/issue/progress/tick with canonical reducer verification and room revision CAS; reset removes modeUnit; student mode public serialization; teacher response includes mode objective/history/answers; initial separate student mode screen; hint purchase draft flush and polling question-identity rerender.

NOT COMPLETE: createCampaign itself does not yet merge modeConfig; setup has no participation/rule/roster controls; playMode compatibility for explicit participation needs completion; campaign engine seeding remains absent; teacher mode rendering and CSV extensions absent; help/report draft flush and event-derived report penalty absent; leaver synchronization absent; late arrivals are spectators without an engine roster entry. Mode UI needs browser verification, used-challenge handling and canonical action binding review. Begin maps units to devices by join order; no explicit learner-device assignment UX.

Tests: new real VM/SQLite route test passes eight noncampaign rules with short answers, replay conflict, stale guards, concurrent CAS and reset. Nine-rule unified route coverage, pairs/26/group device assignments, all math formats, pause and leaver route tests remain pending. Existing campaign and community tests passed; no community cadence change made.

Serial evidence: focused mode test PASS; npm test 82 passed / 1 failed (host-dashboard source-pattern expectation); typecheck failed in excluded app/hosts/host-dashboard.tsx; build returned EPERM for dist (cause not established); lint 0 errors / 3163 warnings including generated .sites-runtime files; git diff --check passed with CRLF notices. Host source appeared to change during verification; excluded files were not edited by this writer.

Host account UI, arena full concurrency tests and browser/mobile QA remain pending. Do not publish or treat this as full completion.
