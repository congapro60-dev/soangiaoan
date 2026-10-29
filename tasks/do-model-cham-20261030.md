# Đo so sánh model chấm — 29–30/10/2026

Công cụ: Quản trị → "Đo model chấm" (chấm lại bài GHKI đã có điểm GV, KHÔNG ghi vào bài). 54 bài (Columbus 11, Olinda 10, 12LoTrinh1), chế độ chấm nhanh, 4–6 lượt song song. Chuẩn = điểm hiện tại GV đã duyệt.

| Model | Bài chấm được | Lỗi | Lệch TB (thang 10) | Lệch lớn nhất | Bài lệch ≤0,25 | Câu lệch điểm GV/bài | Câu phải hỏi lại/bài | Tiền/bài | Giây/bài |
|---|---|---|---|---|---|---|---|---|---|
| vilao/gemini-3.8-flash@none (đang dùng) | 34/52 | 18 | **0,40** | 1,4 | **59%** | 2,59 | **0,06** | 18₫ | 130 |
| vilao/gemini-3.8-flash@low | 36/53 | 17 | 0,47 | 2,9 | 58% | 2,56 | 0,11 | 18₫ | 127 |
| vilao/deepseek-v4.1-flash | 44/54 | 10 | 1,42 | 5,0 | 16% | 3,14 | 0,70 | 14₫ | 109 |
| xkiro/qwen/qwen3.8-max:free (tầng dự phòng hiện tại) | 1/6 | 5 | 0,75 | — | 0% | 2 | 0 | 0₫ | 161 |
| xkiro/qwen/qwen3-vl-plus:free | 5/7 | 2 | 1,85 | 3,1 | 20% | 0,2 | 7 | 0₫ | 107 |

Không chạy được: xkiro Claude Sonnet 5.5 / GPT-6.1 Sol (quá 180s), xkiro gemini-3.8-flash (503), Gemini thẳng Google (402 — chạm trần chi tiêu).

Lỗi gần hết là quá thời gian 180s/lượt (2 lỗi mỗi model do tải lại trang giữa chừng). Tỉ lệ quá giờ của gemini-flash (~30%) cao hơn hẳn chấm thật (~30s/bài) — nhiều khả năng do chạy 6 lượt song song dồn lên Vilao; CHƯA tách được nguyên nhân.

Kết luận: giữ vilao/gemini-3.8-flash@none làm tầng chính (tốt nhất cả 3 chỉ số). Bật suy nghĩ "low" không cải thiện. Tầng dự phòng xkiro qwen gần như luôn quá giờ → khi Vilao lỗi bài sẽ hỏng; nên đổi tầng dự phòng sang vilao/deepseek-v4.1-flash (kém chính xác hơn nhưng chạy được) hoặc chỉ hiện lỗi cho GV chấm lại — chờ chủ dự án chọn.
