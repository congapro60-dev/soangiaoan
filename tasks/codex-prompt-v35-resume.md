# Resume deploy v35 - owner approved, continue now

## Situation (verified by owner 27/10/2026, do NOT re-verify twice)

- Commit f73d029a36714bbf71e789d9b49f7424cde31f3e "Update Site source"
  (all 7 v35 files) is done and pushed. Do NOT commit again.
- Archive C:\Users\ADMIN\.codex\sites-release\release-20261027-v35.tar.gz
  already exists (49443174 bytes), packaged from that commit.
  Do NOT repackage.
- The ONLY working-tree change vs HEAD is tasks/lessons.md: owner appended
  one new lesson AFTER the commit. This is expected and approved.
  Do NOT commit it, do NOT stash it, do NOT stop over it. Leave uncommitted.
- get_site currently reports version_number 34.

## Task now, in this order

1. Run the NATIVE deploy of the existing archive, exactly as documented in
   tasks/codex-prompt-v35.md (the deploy step with the sites workflow:
   exec_command tty:true, wait for the ready sentinel, send the write
   credential JSON on stdin via write_stdin, poll until completion).
2. After deploy: get_site must report version_number 35.
3. Report in the final message: version_number, deployment id (starts with
   appgdep_), commit sha, archive path and exact byte size.
4. Then fill the HANDOFF.md V35 record: change "DANG DEPLOY" to
   "DA PHAT HANH" and fill every placeholder with the real values above.
   Editing HANDOFF.md is allowed and expected. Do not commit HANDOFF.md.

If the deploy tool returns a usage limit error, report that and stop.
Do not retry more than once within this run.
