# Prompt Codex - Deploy v35 (27/10/2026)

## Goal

Release v35 to the ChatGPT Site: commit + push the v35 changes (3 fixes for the
QA FAILs found on live v34) and package a NEW archive
release-20261027-v35.tar.gz, then deploy it natively.

## Confirmed facts (verified 27/10/2026, do NOT redo)

- Worktree: C:\Users\ADMIN\.codex\worktrees\universal-content-release, branch
  codex/universal-content-release, HEAD = 9aea0a1acf70a7f817feba31f65deb55be480d9b
  ("Update Site source" = v34, currently live as version 34, deployment
  appgdep_6ae096897df88191b16636da5b042ec2).
- Expected working tree BEFORE anything: exactly 5 modified files
  (HANDOFF.md, public/app.js, tasks/lessons.md, tasks/todo.md,
  tests/race-choose.test.mjs) + exactly 2 untracked files
  (tasks/codex-qa-v34-live.md, tasks/codex-prompt-v35.md).
  tasks/qa-* is git-ignored on purpose. If git status differs -> STOP and report.
- Those 7 files are ALL of v35. Commit all of them, nothing else.
- Already verified independently: node --check public/app.js clean;
  tests/race-choose.test.mjs 18/18; full suite 1435/1435 PASS, 0 fail;
  npm run build pass. Do NOT rerun the suite or the build.
- v35 content (already in the tree, do NOT edit source):
  1. F1: buySkill() calls render() right after apply(d) (stale mana text fix).
  2. F2: teamDetail() noMana flag -> " - Het ma luc" label in summary + body,
     travel notice is mode-aware.
  3. F3: campaign wording (gate button label, bonus keep-steps text, rules
     reward list, out-of-mana helper mentions pact +40).

## If a previous attempt died mid-way (429 usage limit)

Check state first, then resume from where it stopped. Never redo a finished step:
- git log -1: if HEAD moved past 9aea0a1 with message "Update Site source" ->
  commit + push already done; skip to packaging/deploy.
- If C:\Users\ADMIN\.codex\sites-release\release-20261027-v35.tar.gz already
  exists -> do NOT repackage; go to native deploy with that exact archive.
- If get_site already reports version_number 35 -> report and stop (just fill
  the HANDOFF record).

## Steps

1. git status must match the expected tree above; else STOP for comparison.
2. Run the same sites workflow used for v33/v34 (saveSource = commit with
   message "Update Site source" + push + verify pushed==head, then package):
   node C:/Users/ADMIN/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/scripts/site-workflow.mjs
   with the publish/archive path set to:
   C:\Users\ADMIN\.codex\sites-release\release-20261027-v35.tar.gz
   - The new archive MUST be exactly this path and name.
   - If it reports remote/source mismatch -> STOP for comparison, do not decide alone.
3. get_site to confirm the pre-deploy state (version_number 34 expected here).
4. Native save/deploy of v35 from release-20261027-v35.tar.gz. Do NOT create an
   archive with a different name. Do NOT rerun the packaging twice.
5. Report fully: version_number (must be 35), deployment_id, commit_sha,
   archive size in bytes, archive path.
6. Fill the V35 release record in HANDOFF.md (placeholders say "cho deploy") and
   change the Trang thai line "DANG DEPLOY" to "DA PHAT HANH".
   - HANDOFF being dirty after deploy is accepted, same as v33/v34 (the
     post-deploy record is NOT part of the published archive). Do NOT commit it
     manually.

## Forbidden

- No source edits beyond what is already in the tree; no manual commits outside
  the workflow; no force push.
- Do not touch lib/exam/** or demo room 7E42C2.
- Do not use any archive other than release-20261027-v35.tar.gz.
- Keep WIP, logs, credentials out of the source snapshot.
