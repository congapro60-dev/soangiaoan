# R17 — Khởi tạo tiết học theo mục đích

13/10/2026. Chủ hệ thống giao triển khai màn khởi tạo4loại đã ghi backlogR16; không phát hành ở lượt này. R15 giữ kế hoạch, R16WIP giữ nguyên.

1. `/lessons/new`: bốn lựa chọn Hình thành kiến thức/Luyện tập/Ôn tập/Kiểm tra, chưa chọn mặc định. Tiếp theo chọn học liệu đã lưu hoặc nhập DOCX/PDF/MD/ý tưởng; khối và thời lượng. Không tự fetchpilot/bàiđầu hoặc tự gọiAI/tạophòng.
2. `/hosts` tất cả nút Tổ chức tiết học dẫn màn mới; các link mở phiên vẫn `/lessons?session=...`. `/lessons` trực tiếp chưa cócontext dẫn khởi tạo, không tự chọn bài Dãy số; thư viện/Studio vẫn mở bằng context hợp lệ.
3. `/lessons?setup=new&purpose=...`: explicitlibraryrow mở đúnggói sauauth; import mở tabNhập, giữ màn trống trước nguồn mới, khởi tạograde/duration/purpose. Không hồi phục phòng/nguồn cũ vào newsetup. Tiêu đề theo nội dung hiện tại, không hardcode.
4. `/exams?setup=new...`: mở tạo đề từ đầu, giữ `/exams?id` vào phòng cũ. Dùng import/cấu hình hiện hữu, không dựng module thi mới.
5. Purposeformation/practice/review validate trong generationsettings, bind consent/fingerprint; prompt thích hợp, không tự sửa nguồn/mục tiêu/đápán hoặc duyệt học liệu. Library chọn gói giữ nguyên nội dung đã duyệt.
6. Test4loại, queryinvalid, nobàiđầu, đúngselectedrow, staleGET/no oldsource/session restore, auth/approvalgiữ; full/typecheck/lint/build/review/native/CUA; dọnQA rồi cậpnhật checklist/HANDOFF.

Tác động: thêm trang/wizard, tích hợpStudio/ExamTeacher và prompt/settings hiện có. Không dependency/migration. Mục đích dạy học tách khỏi map/luật/hình thức/thiết bị.

- [x] Wizard và điểm vào
- [x] Studio newsetup và đúng nội dung/tiêu đề
- [x] Bài kiểm tra khởi tạo mới
- [x] Purpose generation validation/consent/prompt
- [x] QA/review/build và bàn giao
- [ ] Chủ hệ thống duyệt phát hành scopedR16+R17 sau nghiệm thu

Kết quả local13/10:1328fulltestsPASS;47focused sau chỉnh UX cuối; typecheck/buildPASS;lint0/421warnings;438sourcebyte-match; Worker a5b15b02c87ecca3653e23f6c58bc8d88cbcf97ee0f89b6f2d6235144fc75bc6. Native178HTTPtrước browser/8creationchecks+7trashchecks0external; CUAhost→wizard→reviewimportgrade12/80,libraryexplicitselection,examnew,375 đủ4choices+continue. Cleanupactive0. NoAI provider call/noactualclassdata/deploy. Report tasks/codex-r17-report.md.
