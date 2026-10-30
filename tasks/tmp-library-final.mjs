// Ghi nhận tính năng Thư viện học lại vào acceptance + HANDOFF + todo
import { readFileSync, writeFileSync } from 'node:fs';

let a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const lib = `
---

## TÍNH NĂNG MỚI · "Thư viện học lại" — list công khai bài tự học phân hoá trên luồng HS · 28/10/2026

**Yêu cầu thầy 28/10** (sau khi chốt batch2): *"để tất cả các bài học phân hoá đều hiện 1 list trên luồng HS, bất kỳ HS nào cũng vào được list đó để xem và chọn bài học lại"* — kết hợp bài tương tác (dạy tiết) + bài tự học (học lại ở nhà).

**Hiện trạng đã khảo sát**: 10 bài tương tác đã có (batch2); 10 bài tự học phân hoá Tuần 11 **đã có sẵn** trên Production (tạo từ cùng giáo án nguồn, cùng adaptive id: ví dụ 12-11-78 → \`adaptive-1792833009074\`) nhưng HS chỉ truy cập được khi GV giao — chưa có list công khai.

**Đã làm** (commit \`8aa6f92\` + \`d71dcc0\`, deploy success cả 2 Vercel):
1. \`adaptiveLessonService.ts\`: \`listPublishedSelfStudyLessons()\` — query \`adaptiveLessons\` where \`portalEnabled == true\` (khớp firestore.rules), lọc \`lessonKind == 'self_study'\` + \`status == 'published'\`, không lọc lớp; sort theo khối/tiết.
2. \`AdaptiveLibraryPage.tsx\` mới — route **\`/adaptive-library\`** (công khai, không cần đăng nhập): tiêu đề "Thư viện học lại", filter khối 10/11/12 + **tìm kiếm theo tên bài**, nhóm theo Lớp, mỗi bài nút "Học lại bài này" → \`/adaptive-portal/:id\` (đường portal đã có, đã QA).
3. Link "Thư viện học lại — chọn bài tự học" đặt trên **header cổng HS** (AdaptiveStudentPortalPage) + link trong StudentPortalDashboard.

**QA trên Production**:
| Khoản | Kết quả | Verdict |
|---|---|---|
| Mở \`/adaptive-library\` | Tiêu đề "Thư viện học lại" ✓; **112 link mở bài**; đủ filter Lớp 10/11/12 | ✓ |
| Tìm kiếm "Khoảng biến thiên" | **1 kết quả đúng** → \`/adaptive-portal/adaptive-1792833009074\` | ✓ |
| Mở bài học lại | Portal hiện "CỔNG HỌC SINH · HỌC TỪNG BƯỚC" + link "Thư viện học lại — chọn bài tự học" ✓; bài "Khoảng biến thiên và khoảng tứ phân vị — Tiết 1" chạy đủ 5 bước | ✓ |
| Nhãn tuần | Bài nguồn Tuần 11 hiển thị nhãn gốc "Dạy thử" (dữ liệu giáo án nguồn) → đã ẩn nhãn tuần không phải số; HS tìm theo tên bài qua ô search | ✓ (giải pháp hiển thị) |

**Lưu ý cho thầy**: mở bài từ thư viện dùng đường portal công khai \`/adaptive-portal/:id\` — nội dung hiển thị nguyên bản bài tự học (khác luồng GV giao — bản đã bỏ đáp án qua máy chủ). Bài tự học vốn là tài liệu HS tự học (có ví dụ giải mẫu), nếu thầy muốn bản học lại cũng bỏ đáp án thì cần làm thêm qua máy chủ (báo riêng).
`;
if (!a.includes('TÍNH NĂNG MỚI · "Thư viện học lại"')) writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + '\n' + lib, 'utf8');

let h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('Thư viện học lại')) {
  h = h.replace(
    'Việc treo: nhóm xoay tua tự động vẫn chờ thầy (nếu có). **Thầy xác nhận đồng ý chốt đợt (28/10) — batch2 chính thức đóng.**',
    'Việc treo: nhóm xoay tua tự động vẫn chờ thầy (nếu có). **Thầy xác nhận đồng ý chốt đợt (28/10) — batch2 chính thức đóng.**\n\n## TÍNH NĂNG MỚI SAU CHỐT ĐỢT — "Thư viện học lại" (28/10, commit `8aa6f92` + `d71dcc0`)\n- **Yêu cầu thầy**: tất cả bài học phân hoá hiện 1 list trên luồng HS, bất kỳ HS nào cũng vào được để xem và chọn bài học lại (kết hợp bài tương tác dạy tiết + bài tự học ở nhà).\n- **Đã làm**: route công khai **`/adaptive-library`** (`AdaptiveLibraryPage.tsx` — filter khối + tìm kiếm theo tên, nhóm theo Lớp) + `listPublishedSelfStudyLessons()` trong `adaptiveLessonService.ts` (query `portalEnabled == true`, lọc self_study + published, không lọc lớp) + link trên header cổng HS và StudentPortalDashboard.\n- **QA Production ĐẠT**: 112 bài tự học hiển thị; search "Khoảng biến thiên" → 1 kết quả → mở portal `/adaptive-portal/adaptive-1792833009074` ✓ (CỔNG HỌC SINH + 5 bước + link quay lại thư viện). Nhãn tuần gốc "Dạy thử" đã ẩn (chỉ hiện khi là số).\n- **Lưu ý**: bài mở từ thư viện là nguyên bản bài tự học (khác luồng GV giao đã strip đáp án) — nếu cần bản học lại strip đáp án thì báo thêm, làm qua máy chủ.\n- 10 cặp bài Tuần 11 (tương tác + tự học) đã đủ để HS học lại ở nhà ngay hôm nay.',
  );
  writeFileSync('HANDOFF.md', h, 'utf8');
}
console.log('acceptance + HANDOFF updated (library feature)');
