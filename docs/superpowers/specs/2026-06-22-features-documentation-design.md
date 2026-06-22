# Design Specification: Web Application Features Documentation

**Date:** 2026-06-22  
**Author:** Antigravity (Google Deepmind)  
**Target:** docs/features/*  
**Status:** Approved by User  

---

## 1. Overview & Goal

The user wants to create a comprehensive set of documentation files describing the functionality, code structure, data models, and testing scenarios for each of the core features of the "Giao An Dewey" web application. 
The primary goals are:
- **Easy Retrieval & Modification:** Mapping which files, hooks, and utilities govern which functional aspects of the application.
- **Debugging & Error Finding:** Detailing common gotchas, failure points, and debug procedures for each feature.
- **Rapid Testing (QA):** Providing checkable test scripts/scenarios that can be executed manually or used as a blueprint for automated E2E tests.

---

## 2. Approach: Hybrid Specification & QA Blueprint (Approach 3)

We will create one markdown file per feature under a new directory: `docs/features/`.
Each file will follow a uniform structural template:

1.  **Cách hoạt động (User Flow & Business Logic):** High-level functional description, user steps, and goals.
2.  **Cấu trúc Code & File liên quan (Architecture & File Mapping):** Direct maps to components, hooks, utilities, and DB tables/documents.
3.  **Nội dung & Luồng dữ liệu (Data & Logic Flow):** TypeScript interfaces, AI prompts, APIs, and formats.
4.  **Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points):** Exact manual test cases with expected outputs and known issues.

---

## 3. List of Feature Documents

We will generate 11 files, numbered and named as follows:

| Filename | Feature Tab / Module | Key Focus Areas |
|---|---|---|
| `docs/features/01-dashboard.md` | DashboardTab | Recent plans, quick stats, navigation. |
| `docs/features/02-creator-lesson-plan.md` | CreatorTab, useLessonCreator | Planning->Content->Format agent pipeline, Text-to-Slide, Worksheets (A4), Word (OMML)/PDF/LaTeX exports. |
| `docs/features/03-library.md` | LibraryTab | Personal & Community search, duplication, details, sharing, pagination. |
| `docs/features/04-testing-exam.md` | TestingTab, examUtils | Smart grid, questions compiled, Math OCR, PDF/Word exports, LaTeX. |
| `docs/features/05-grading.md` | GradingTab, gradingUtils | Upload student work (Image), AI Step-by-Step grading, rubric definition, class analysis. |
| `docs/features/06-exams.md` | ExamsTab | Classroom code exams, student test taking, exam list. |
| `docs/features/07-adaptive-learning.md` | AdaptiveLearningTab, AdaptiveLessonBuilderPage, AdaptiveStudentPortalPage | Adaptive paths, nodes, preview portal, learning analytics. |
| `docs/features/08-ai-tools.md` | AIToolsTab | System prompt builders (Prompt Architect), custom prompts. |
| `docs/features/09-classes.md` | ClassesTab | Student rosters, class codes. |
| `docs/features/10-chat-copilot.md` | ChatTab, FloatingChatWidget | Co-pilot chat assistant, context injection, editor auto-updates. |
| `docs/features/11-templates-skeletons.md` | TemplatesTab, documentSkeleton | Manual editor for template skeletons, skeleton validation logic, export guardrails. |

---

## 4. Quality Standards

To make this documentation highly effective:
- **No placeholders:** Every file mapping, interface, and test step must exist in the codebase.
- **Accurate Code References:** Double-check filenames, hook hooks, and API routes to ensure they match the current code (e.g. `MathOcrUploader.tsx` in `src/components/features/testing/`, not creator).
- **Clear QA Checklists:** Provide concrete, step-by-step actions a manual tester can perform on the UI to verify stability.
- **Traceable Error Guides:** List the exact issues that have been patched historically (e.g., cell widths in 2-column tables, SVG TikZ render in docx, missing key warnings).

## 5. Ngôn ngữ & Tiêu chuẩn hiển thị

- **Ngôn ngữ bắt buộc:** Toàn bộ 11 file tài liệu chức năng sẽ được viết **100% bằng tiếng Việt** (ngoại trừ các thuật ngữ kỹ thuật, tên file, tên biến, interface hoặc mã code).
- **Độ rõ ràng:** Sử dụng câu văn ngắn gọn, dễ hiểu, cấu trúc danh sách liệt kê để giáo viên hoặc kiểm thử viên người Việt dễ dàng thao tác.

---

## 6. Các bước tiếp theo

1. Người dùng phê duyệt Đặc tả Thiết kế này.
2. Cam kết đặc tả này vào `docs/superpowers/specs/2026-06-22-features-documentation-design.md`.
3. Chuyển sang skill `writing-plans` để lập kế hoạch chi tiết cho từng file tài liệu.
4. Triển khai viết lần lượt cả 11 file bằng tiếng Việt.

