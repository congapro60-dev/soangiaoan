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
   - Workspace path: `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai`
   - Local URL: `http://localhost:5173` (Vite default)
   - Production URL: `https://giaoandewey.vercel.app`
   - Test command: `npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run test`
   - Build command: `npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run build`
   - Run the test command. Wait for it to finish and confirm 100% pass rate.
   - Run the build command. Confirm that the build succeeds. The main index chunk must stay under 1MB (1000KB). A warning >500KB is non-blocking as long as it does not jump significantly from baseline. Large lazy-loaded split chunks >500KB are expected and are not blocking.

2. **Follow the Protocol Document**:
   Read the master QA protocol document located at `QA_TESTING_PROTOCOL.md` in the root of the workspace.
   Read the file using whatever file-reading tool is available in your current environment (`view_file`, `read_file`, `cat`, or equivalent):
   ```bash
   view_file QA_TESTING_PROTOCOL.md
   ```

3. **Execute the Test Scenarios**:
   Systematically go through each module mentioned in the Protocol.
   - If a test requires simulating an API call, you may write a Node.js scratch script in test/ folder if API simulation is needed; do not assume any pre-existing test runner script exists.
   - If you encounter ANY error, **STOP immediately**, report the error context, and ask the user for permission to fix the bug using the bug-fixing protocol outlined in `QA_TESTING_PROTOCOL.md`.

4. **Sign-off Report**:
   Once all tests pass, provide a structured "QA Sign-off Report" to the user detailing exactly what was tested and confirming the system's stability.
   Report must follow this exact Markdown format:
   ```markdown
   ## QA Sign-off Report
   **Status:** [APPROVED | CONDITIONAL | NOT APPROVED]
   
   ### 1. Pre-flight Checks
   - Unit Tests: [X] Pass / [Y] Total
   - Build Status: [Success/Fail]
   - Main Index Chunk Size: [Size] KB
   
   ### 2. Module Verification
   | Module | Status | Evidence Path / Output |
   |--------|--------|------------------------|
   | Creator | [PASS/FAIL] | ... |
   | Library | [PASS/FAIL] | ... |
   | Portal | [PASS/FAIL] | ... |
   
   ### 3. Issues & Action Items
   - [Module] - [Hành động] - [Lỗi] - [File cần sửa]
   
   ### 4. Cleanup & Sign-off
   - Dữ liệu test đã được dọn dẹp: [Yes/No]
   - Đánh giá bởi: [AI Agent Name]
   ```
