import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('Gate D mini — nhóm xoay tua tự động')) {
  h = h.replace(
    '**Thầy xác nhận đồng ý kết hợp (28/10) — đợt này đóng.**',
    '**Thầy xác nhận đồng ý kết hợp (28/10) — đợt này đóng.**\n\n## Gate D mini — nhóm xoay tua tự động (29/10, thầy duyệt + commit `a9d61b4`→`bbc901c`)\n- **Đặc tả**: `tasks/gate-d-mini-nhom-xoay-tua.md` — R1 thẻ nhiệm vụ mở rộng khi nhóm xong sớm (progress ≥ 100%), R2 nhãn nhóm chậm chỉ-GV (quá 80% thời lượng, progress < 50%), R3 không tự di chuyển HS.\n- **Đã làm**: `grouping.ts` thêm `isGroupDone`/`isGroupSlow` (thuần, có test); `StudentLiveView.tsx` thêm thẻ DEEP (câu VD đề trần từ `sourceContent.exercises`, hiện khi nhóm HS đã gửi đủ, không nộp máy) + subscribe `subscribeToMyLiveGroup`/`subscribeToLiveGroupProgress`; `TeacherLiveView.tsx` thêm nhãn "Nhóm chậm — chỉ giáo viên" (dùng timeline beat + groupProgress).\n- **Test**: vitest v4 **305/305 PASS** (+5 test Gate D mini); build 0 TS.\n- **QA Production**: phiên live tạo + HS join + GV nav chặng nhóm ✓; thẻ DEEP chưa xác minh được trên script vì HS phải tự đăng nhập phiên live qua trang live (script chỉ đăng nhập lớp qua /lop). Tính năng hoạt động theo unit test + build; cần GV điều hành thật để chốt.\n- Fix dọc đường: TDZ `Cannot access before initialization` do derived R1 dùng `v4Contract` trước khai báo (đã chuyển); `studentAdaptiveLibraryOpen` 404 do normalizeAdaptiveLesson server thiếu default `lessonKind` (đã thêm, commit `df7ca78`).',
  );
  if (!h.includes('Gate D mini — nhóm xoay tua tự động')) throw new Error('handoff failed');
  writeFileSync('HANDOFF.md', h, 'utf8');
}
console.log('HANDOFF updated');
