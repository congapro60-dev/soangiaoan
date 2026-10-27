# Prompt Codex - Deploy v36 (27/10/2026)

## Goal

Release v36 to the ChatGPT Site: commit + push the v36 changes (3 leftover
campaign-wording fixes found by scanning live v35), package a NEW archive
release-20261027-v36.tar.gz, then deploy it natively.

## Confirmed facts (verified 27/10/2026, do NOT redo)

- Worktree: C:\Users\ADMIN\.codex\worktrees\universal-content-release, branch
  codex/universal-content-release, HEAD = f73d029a36714bbf71e789d9b49f7424cde31f3e
  ("Update Site source" = v35, currently live as version 35, deployment
  appgdep_6ae0bbc0175c8191862d2eea418c8864).
- Expected working tree BEFORE anything: exactly 5 modified files
  (HANDOFF.md, public/app.js, tasks/lessons.md, tasks/todo.md,
  tests/race-choose.test.mjs) + exactly 2 untracked files
  (tasks/codex-prompt-v35-resume.md, tasks/codex-prompt-v36.md).
  If git status differs -> STOP and report.
- Those 7 files are ALL of v36. Commit all of them, nothing else.
- Already verified independently: node --check public/app.js clean;
  tests/race-choose.test.mjs 19/19; full suite 1436/1436 PASS, 0 fail;
  npm run build pass. Do NOT rerun the suite or the build.
- v36 content (already in the tree, do NOT edit source):
  1. F3b-1 terrainInfo map cell tooltip: campaign branch says
     "Chon buoc di chuyen khi den luot ..." instead of dice wording.
  2. F3b-2 bonusPanel roll-button fallback: campaign label is
     "Chon buoc di chuyen" instead of "Lan xuc xac".
  3. F3b-3 updateRaceClock turn labels (2 spots): campaign says
     "Chon buoc di chuyen" for both individual and team mode.

## PTY note (IMPORTANT, already solved)

codex ConPTY cannot spawn the WindowsApps Store pwsh alias (Access denied,
os error 5). The launcher must prepend a real pwsh shim to PATH first:

    $env:PATH = 'C:\Users\ADMIN\AppData\Local\Temp\opencode\shims;' + $env:PATH

That shim is a copy of C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
named pwsh.exe. With it, exec_command(tty:true) works. Without it, PTY fails.

## Steps

1. Commit the 7 files above with message "Update Site source".
2. Package the archive: C:\Users\ADMIN\.codex\sites-release\release-20261027-v36.tar.gz
   (new file, do not overwrite the v35 archive).
3. Run the native deploy of that archive exactly as documented in the sites
   workflow (exec_command tty:true, wait for the ready sentinel, send the write
   credential JSON on stdin via write_stdin, poll until completion).
4. get_site must then report version_number 36.
5. Fill the HANDOFF.md V36 record: change "DANG DEPLOY" to "DA PHAT HANH" and
   replace every placeholder with the real values (version_number,
   deployment_id, commit_sha, archive path, exact byte size). Do not commit
   HANDOFF.md afterwards.
6. Final message must report: version_number, deployment id (starts with
   appgdep_), commit sha, archive path and exact byte size.

## If a previous attempt died mid-way (429 usage limit)

Check state first, then resume from where it stopped. Never redo a finished step:
- git log -1: if HEAD moved past f73d029 with message "Update Site source" ->
  commit + push already done; skip to packaging/deploy.
- If C:\Users\ADMIN\.codex\sites-release\release-20261027-v36.tar.gz already
  exists -> do NOT repackage; go to native deploy with that exact archive.
- If get_site already reports version_number 36 -> report and stop (just fill
  the HANDOFF record).

Do not edit source files. Do not touch lib/exam/** or demo room 7E42C2.
