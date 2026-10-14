# Đánh giá bài chữa — model thật, dữ liệu tổng hợp

Model ag/gemini-3.8-flash-low qua9router hiện có. Prompt lấy từ buildCorrectionReviewPrompt source. Ảnh tự tạo cho3ca, không dữ liệu HS; không gọi production evaluator hoặc thay điểm. Ba ca cùng dạng phương trình không thay QA tài khoản thật hoặc kiểm nhiều dạng Toán.

### Câu 1: Giải phương trình $2x - 3 = 5$

**So sánh bài cũ và bài chữa:**
- Bài gốc em viết $2x = 5 - 3 = 2 \Rightarrow x = 3$, sai do chuyển vế $-3$ không đổi dấu.
- Bài chữa mới: em đã sửa thành $2x = 5 + 3 = 8 \Rightarrow x = 4$. Bước này hoàn toàn chính xác theo quy tắc chuyển vế: khi chuyển một số hạng từ vế này sang vế kia của phương trình, ta phải đổi dấu số hạng đó ($-3$ đổi thành $+3$).

**Hoàn thiện lời giải chuẩn:**
Để bài trình bày chặt chẽ, nên viết tách từng dòng tương đương và có kết luận:
$$\begin{aligned}
2x - 3 &= 5 \\
2x &= 5 + 3 \\
2x &= 8 \\
x &= 4
\end{aligned}$$
Vậy nghiệm của phương trình là $x = 4$.

**Bước kiểm tra tiếp theo:**
Em hãy thay trực tiếp $x = 4$ vào vế trái của phương trình ban đầu:
$$\text{VT} = 2 \cdot 4 - 3 = 8 - 3 = 5 = \text{VP}$$
Hai vế bằng nhau, kết quả chắc chắn đúng.

Outcome: achieved

Checks: JSON hai trường, không score; đúng câu/kết quả; feedback>350ký tự, nêu kiểm tra.

## wrong — needs_work

### Câu 1: Giải phương trình $2x - 3 = 5$

**Bước đã sửa đúng:**
Em đã sửa đúng quy tắc chuyển vế: Chuyển $-3$ từ vế trái sang vế phải thành $+3$. Phép tính $2x = 5 + 3 = 8$ chính xác vì khi chuyển một hạng tử qua dấu bằng, ta phải đổi dấu hạng tử đó.

**Lỗi còn lại và hướng dẫn:**
Bước tìm $x$ chưa hoàn thiện: Em viết $x = 8$.

*Lý do:* Ở bước trên ta có $2x = 8$, nghĩa là $2$ nhân với $x$ bằng $8$. Muốn tìm $x$, ta phải chia cả hai vế cho hệ số $2$, không thể bỏ số $2$ đi.

*Cách trình bày chuẩn:*
$$\begin{aligned}
2x - 3 &= 5 \\
2x &= 5 + 3 \\
2x &= 8 \\
x &= 8 : 2 \\
x &= 4
\end{aligned}$$

*Kết luận:* Vậy nghiệm của phương trình là $x = 4$.

**Bước kiểm tra tiếp theo:**
Em hãy thay thử $x = 4$ ngược lại vào vế trái của đề bài: $2 \cdot 4 - 3 = 8 - 3 = 5$ (đúng bằng vế phải). Hãy thử thay $x = 8$ vào để tự thấy vì sao kết quả cũ chưa đúng.

## unreadable — uncertain

### Đánh giá bài chữa

Ảnh bài chữa tải lên hoàn toàn trắng, không có nội dung chữ viết để đối chiếu với Câu 1 đã chấm.

Em vui lòng chụp lại và gửi rõ ràng phần bài chữa của mình để được nhận xét chi tiết.

Việc kiểm tra tiếp theo: Gửi lại ảnh chụp bài làm hoàn thiện của phương trình $2x - 3 = 5$.
