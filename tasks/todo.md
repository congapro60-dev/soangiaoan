# Fix luồng điểm LO: SSM đổi API shape (QA 24/10/2026)

## Vấn đề
- SSM panel bấm "Tải bảng điểm từ SSM" → luôn "0 LO, 0 học sinh", không lỗi.
- Bắt network trang chấm IA1 thật (`ssm.edufit.vn/.../evaluate/9681/criteria/2219/assessment-form/15328/subject/12/quarter/15`) cho thấy SSM đã đổi luồng API:
  1. `class-subject-assessment?af&crit&class` → giờ CHỈ trả metadata (`quarter_has_branch_id`, `result_assessment_form_id`, `is_approved`…), KHÔNG còn `assessment_forms` lẫn `students`.
  2. Cây LO + thang điểm: `GET v2/evaluation/criteria-has-assessment-form/{criteriaId}?assessment_form_id={formId}` (proxy cũ gọi `{formId}` → 422; thang giờ nằm ở ROOT của response).
  3. Học sinh + điểm: `GET v2/evaluation/student-by-subject?af&crit&class&subject_id` (endpoint mới, chưa map).
- Shape confirm từ response thật (24/10/2026):
  - criteria-tree: `{data: { ..., assessment_forms: {data: {id, name:'IA1', ratio, focal_points: {data:[…]}}}, scoring_scale: {data: {id:21, name:'Thang4_26-27', score_configs: {data:[{id:84, point:"N", is_number:false, is_calculate_score:0},{id:85, point:4, is_number:true,…}…]}}}}}`.
  - students: `{class_id, subject_id, students: [{id, full_name(string), code, point(null khi chưa chấm)}]}`.

## Plan
1. [x] Chẩn đoán bằng network SSM thật (bắt xong, có response lưu `Temp\opencode\criteria-tree.network-response`, `students.network-response`)
2. [x] `api/_ssm-proxy.ts`: map đúng `criteriaAssessment` (criteriaId + formId) + thêm op `studentBySubject`
3. [x] `src/lib/ssm/ssmBridge.ts`: `readSsmCriteriaAssessment(criteriaId, formId)` + thêm `readSsmStudentsBySubject`
4. [x] `src/lib/ssm/loSsmParser.ts`: scale từ root (fallback legacy assessment_forms) + thêm `mergeSsmLoad(meta, tree, students)`
5. [x] `SsmPanel.tsx`: load & verify dùng 3 endpoints qua `fetchSsmCriteriaPayload` + `mergeSsmLoad`
6. [x] Tests: thêm fixture shape mới (META_V2/TREE_V2/STUDENTS_V2) + test mergeSsmLoad — 9/9 pass
7. [ ] `npm run build` zero TS errors + chạy vitest parser
8. [ ] Commit + push → QA lại trên preview (tải IA1 → gợi ý AI → xem trước diff → đẩy → đọc lại verify)

## Verify
- Bước 7: build + test pass.
- Bước 8: panel hiển thị "Đã tải từ SSM: N LO, 26 học sinh" (N>0), diff preview chính xác, đẩy xong SSM hiện điểm trên web SSM.
