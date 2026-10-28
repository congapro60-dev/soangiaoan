# Prompt Codex - Deploy v37+v38 (28/10/2026)

## Goal

Release v37+v38 to the ChatGPT Site: the source is ALREADY committed locally
(2 commits), so package a NEW archive release-20261028-v38.tar.gz from the
current tree, then deploy it natively and verify version 38.

## Confirmed facts (verified 28/10/2026, do NOT redo)

- Worktree: C:\Users\ADMIN\.codex\worktrees\universal-content-release, branch
  codex/universal-content-release, HEAD = 3b22f700c3542d6091cc68f2c38008a6739b1123
  ("v38: AI question bank per teacher matrix with approval flow").
  HEAD also contains v37 (182bfe5, teacher class console + progressive skill
  shop). Currently live: version 36.
- Expected working tree BEFORE anything: no modified files + exactly 1
  untracked file (tasks/codex-prompt-v38.md - this prompt itself, do not
  commit it). If git status differs -> STOP and report.
- v37+v38 content is ALREADY committed. Do NOT commit again, do NOT edit any
  source file, do NOT rerun tests or the build (verified: 1449/1449 tests,
  build pass, local smoke 22/22 PASS on wrangler).
- Constraint: do not touch lib/exam/** or demo room 7E42C2.

## PTY note (IMPORTANT, already solved)

codex ConPTY cannot spawn the WindowsApps Store pwsh alias (Access denied,
os error 5). The launcher must prepend a real pwsh shim to PATH first:

    $env:PATH = 'C:\Users\ADMIN\AppData\Local\Temp\opencode\shims;' + $env:PATH

That shim is a copy of powershell.exe named pwsh.exe. With it,
exec_command(tty:true) works. Without it, PTY fails.

## Steps

1. Package the archive:
   C:\Users\ADMIN\.codex\sites-release\release-20261028-v38.tar.gz
   (new file, do not overwrite the v36 archive).
2. Run the native deploy of that archive exactly as documented in the sites
   workflow (exec_command tty:true, wait for the ready sentinel, send the
   write credential JSON on stdin via write_stdin, poll until completion).
3. get_site must then report version_number 38.
4. Fill the HANDOFF.md V38 record (top section): change "DANG DEPLOY" to
   "DA PHAT HANH" and replace every placeholder with real values
   (version_number 38, deployment_id starting with appgdep_, commit_sha
   3b22f700c3542d6091cc68f2c38008a6739b1123, archive path, exact byte size).
   Do not commit HANDOFF.md afterwards.
5. Final message must report: version_number, deployment id, commit sha,
   archive path and exact byte size.

## If a previous attempt died mid-way

Check state first, then resume from where it stopped. Never redo a finished
step:
- If C:\Users\ADMIN\.codex\sites-release\release-20261028-v38.tar.gz already
  exists -> do NOT repackage; go to native deploy with that exact archive.
- If get_site already reports version_number 38 -> report and stop (just fill
  the HANDOFF record if placeholders remain).
