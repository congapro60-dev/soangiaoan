# Kế hoạch — Chi phí AI theo tính năng (tab Quản trị)

> Nhánh `feat/chi-phi-ai-theo-tinh-nang`, worktree riêng dựng từ `origin/main` `ad23f31`. Không đụng nhánh `feat/toan-final-template` đang dở.

## Mục tiêu

Tab **Quản trị**, mục 4, hiện thêm bảng **chi phí AI theo tính năng** (chấm bài, bài luyện thêm, gợi ý hướng dẫn chấm…), cùng khoảng ngày với bảng theo giáo viên. Để biết tính năng nào tốn tiền nhất rồi mới tối ưu (xem `docs/QUY_TRINH_DA_AI.md` mục 6).

## Giả định (đổi được dễ, nên không hỏi trước)

- Chỉ tính lượt dùng **khóa chung**, bỏ `keySource === 'own'` — giống hệt `aggregateUsage`, để tổng hai bảng khớp nhau.
- Cùng khoảng ngày, cùng một lần bấm "Tính tiền"; không thêm lần đọc Firestore nào.
- Nhãn tiếng Việt dùng `featureLabel()` có sẵn ở `src/lib/ai/featureLabels.ts`.

## Việc

- [ ] `src/lib/admin/billing.ts`: thêm hàm thuần `aggregateByFeature(records)` — bỏ lượt khóa riêng; gộp theo `feature` (rỗng → `unknown`); cộng lượt, token, `costUsd` qua `costUsdOfCall`, đếm `unpricedCalls`; sắp tiền giảm dần.
  - verify: test mới trong `src/lib/admin/billing.test.ts` — bỏ lượt `own`; gộp đúng theo feature; lượt chưa có giá; thứ tự; **tổng `costUsd` bằng tổng của `aggregateUsage`** trên cùng dữ liệu.
- [ ] `api/_admin.ts` `handleUsage`: trả thêm `byFeature` trong cùng response. Không thêm endpoint (giới hạn 12 Vercel Function).
  - verify: test API quản trị (nếu có) vẫn pass; thêm assert `byFeature` nếu file test có sẵn ca usage.
- [ ] `src/components/tabs/AdminTab.tsx` mục 4: bảng "Theo tính năng" dưới bảng giáo viên — Tính năng, Lượt, Token, Chi phí ước tính (VNĐ theo tỷ giá đang dùng ở mục 3), tỷ lệ % trên tổng; ghi rõ "ước tính", nhắc số lượt chưa có giá nếu có.
  - verify: `npm run build` không lỗi TypeScript.
- [ ] Nghiệm thu: `npx vitest run src/lib/admin/billing.test.ts api/__tests__`, `npm run lint`, `npm run lint:api`, `npm run build`.
- [ ] Cập nhật `HANDOFF.md` (đổi gì/vì sao, còn dở, bẫy, lệnh nghiệm thu), commit, push nhánh. Không gộp `main` khi chưa có lệnh.

## Ngoài phạm vi

- Không đổi cách ghi `aiUsage`, không bù dữ liệu cũ, không đổi CSV bảng kê theo giáo viên.
- Không thêm biểu đồ; bảng số là đủ để quyết định tối ưu chỗ nào.
