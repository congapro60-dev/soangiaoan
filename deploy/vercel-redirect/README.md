# Chuyển hướng giaoandewey.vercel.app → Cloud Run

Vercel khoá team từ 14/11/2026 (vượt hạn mức Hobby), tự mở lại khoảng 14/12/2026.
Ba dự án `giaoandewey`, `congapro60-dev-soangiaoan`, `spai-assistant-ph-hs` đã được TẠM DỪNG tay (16/11)
để khi Vercel mở khoá, bản web/bot CŨ không tự chạy lại trên cùng cơ sở dữ liệu.

Sau khi Vercel mở khoá, để link cũ tự nhảy sang web mới (chuyển hướng không tốn CPU hàm):

1. `vercel project unpause giaoandewey --scope congapro60-devs-projects` (hoặc nút Resume trên dashboard).
2. Trong thư mục này: `vercel deploy --prod --scope congapro60-devs-projects` sau khi `vercel link --project giaoandewey`.
3. Thử: mở https://giaoandewey.vercel.app/lop/7W288E phải nhảy sang https://giaoandewey-kzlwaer35a-de.a.run.app/lop/7W288E.

KHÔNG deploy lại app đầy đủ lên Vercel (sẽ hết hạn mức lần nữa và chạy song song với Cloud Run).
Dự án bot `spai-assistant-ph-hs` để tạm dừng luôn: webhook Zalo và poller nhắc việc đã trỏ Cloud Run;
nếu mở lại, cron 07:00 trong vercel.json cũ sẽ gửi trùng bản tin cho phụ huynh.
