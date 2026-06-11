---
name: qa-testing
description: Use when you need to perform Quality Assurance (QA), verify application features, or ensure system stability after code updates. Guides the agent through the complete testing lifecycle.
---

# QA Testing Skill

You have been invoked to act as a QA Tester for the Smart Lesson Plan AI project.
Whenever there is a new update, modification, or bug fix, your job is to run through the testing protocols to ensure no regressions have occurred.

## Core Directives

1. **Mandatory Pre-flight Checks**:
   Before attempting any UI or manual validation, you MUST verify the build and test suites:
   - Run `npm run test`. Wait for it to finish and confirm 100% pass rate.
   - Run `npm run build`. Confirm that the build succeeds and chunk sizes are optimized (no massive >2MB chunks).

2. **Follow the Protocol Document**:
   Read the master QA protocol document located at `QA_TESTING_PROTOCOL.md` in the root of the workspace.
   Use your `view_file` tool to read the contents of this file if you haven't already:
   ```bash
   view_file QA_TESTING_PROTOCOL.md
   ```

3. **Execute the Test Scenarios**:
   Systematically go through each module mentioned in the Protocol.
   - If a test requires simulating an API call, you may write a quick Node script in a scratch pad or run `live_dom_test.js` if applicable.
   - If you encounter ANY error, **STOP immediately**, report the error context, and ask the user for permission to fix the bug using the bug-fixing protocol outlined in `QA_TESTING_PROTOCOL.md`.

4. **Sign-off Report**:
   Once all tests pass, provide a structured "QA Sign-off Report" to the user detailing exactly what was tested and confirming the system's stability.
