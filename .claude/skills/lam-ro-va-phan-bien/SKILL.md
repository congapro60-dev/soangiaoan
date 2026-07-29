---
name: lam-ro-va-phan-bien
description: "BẮT BUỘC dùng trước mọi nhiệm vụ không tầm thường (3 bước trở lên, quyết định kiến trúc, thêm tính năng, đổi mô hình dữ liệu/quyền). Ba thì: hỏi cho đến khi tự tin 95%, soi bằng con mắt top 0.1%, rồi trình bày lại vấn đề theo hướng thách thức góc nhìn ban đầu của người dùng. Dùng cả khi người dùng nói 'làm luôn đi' — chỉ rút gọn, không bỏ."
---

# Làm rõ và phản biện

Ba thì, chạy theo đúng thứ tự. Mục đích không phải thủ tục, mà là **chặn việc xây đúng thứ sai**.

---

## Thì 1 — Hỏi cho đến khi tự tin 95%

Hỏi **từng câu một**, không đổ một loạt. Mỗi câu phải là câu mà **câu trả lời khác nhau sẽ dẫn tới việc làm khác nhau**. Câu nào tự tra được trong repo thì tự tra, đừng hỏi.

Trước khi hỏi, tự trả lời: *"Nếu đoán sai chỗ này thì tôi phải làm lại bao nhiêu?"* Làm lại rẻ thì đoán và nói rõ giả định. Làm lại đắt — mô hình dữ liệu, quyền truy cập, hợp đồng API, thứ đã lên production — thì hỏi.

Nêu rõ mức tự tin hiện tại và **cái gì đang thiếu**:

> Tôi đang ~70%. Chưa rõ hai chỗ: (a) …, (b) …. Chỗ (a) tôi đoán được, chỗ (b) đoán sai thì phải viết lại toàn bộ X.

**Ba câu gần như luôn đáng hỏi:**
- Ai là người dùng thật, và họ đang làm việc đó **bằng cách nào** hiện tại?
- Cái gì là **thành công**? Nhìn vào đâu để biết đã xong?
- Cái gì **không được vỡ**? Đâu là ranh giới không đụng vào?

**Dừng hỏi khi:** đã biết đủ để viết tiêu chí nghiệm thu kiểm chứng được. Chưa viết được tiêu chí nghĩa là chưa đủ 95%.

---

## Thì 2 — Người top 0.1% sẽ nghĩ gì

Không phải "làm cho kỹ hơn". Là **đổi hẳn hệ quy chiếu**. Tự hỏi:

- **Người giỏi nhất sẽ KHÔNG làm gì ở đây?** Thường họ nổi bật vì thứ họ bỏ đi, không phải thứ họ thêm vào.
- **Chỗ nào tôi đang xây giải pháp cho một vấn đề chưa được chứng minh là có thật?**
- **Cái gì sẽ hỏng lúc 2 giờ sáng?** Ai bị gọi dậy? Họ có đủ thông tin để sửa không?
- **Sáu tháng nữa người kế nhiệm mở file này ra, chỗ nào làm họ chửi?**
- **Ràng buộc thật nằm ở đâu?** Thường không phải ở code — mà ở thói quen, ở lòng tin, ở việc ai chịu trách nhiệm.
- **Nếu chỉ được làm 20% khối lượng này, làm phần nào để giữ 80% giá trị?**

Với phần mềm dùng trong tổ chức, ràng buộc thật gần như luôn là **con người**: quy trình mới có được ai làm theo không, dữ liệu nhạy cảm rơi vào tay ai, người bị đánh giá có thấy công bằng không. Code chỉ là phần dễ.

---

## Thì 3 — Trình bày lại theo cách thách thức góc nhìn ban đầu

Không phải phản đối cho có. Là **đặt lại bài toán** để lộ ra giả định đang bị ngầm chấp nhận.

Khuôn:

> **Bạn đang hỏi:** \<yêu cầu nguyên văn\>
> **Câu đó ngầm giả định:** \<giả định A, B\>
> **Nếu giả định đó sai thì:** \<hệ quả\>
> **Cách đặt lại vấn đề:** \<phát biểu khác, cùng mục tiêu cuối, đường đi khác\>
> **Vì sao đáng cân nhắc:** \<lợi ích cụ thể\>
> **Tôi vẫn khuyên làm theo bạn nếu:** \<điều kiện\>

**Quy tắc:** thách thức xong thì **vẫn phải đưa khuyến nghị rõ ràng**, không bỏ lửng cho người dùng tự chọn giữa hai đường ngang nhau. Nói thẳng nên đi đường nào và vì sao.

**Người dùng khẳng định lại lựa chọn ban đầu → làm theo, đầy đủ, không cằn nhằn thêm lần nữa.** Đã nêu một lần là đủ.

---

## Khi người dùng giục "làm luôn đi"

Rút gọn chứ không bỏ. Tối thiểu:

1. Một dòng nêu mức tự tin và giả định đang dùng.
2. Một đoạn ngắn cho thì 2 và 3 — chỉ nêu **điểm sắc nhất**, không dàn trải.
3. Bắt tay làm ngay.

Nhiệm vụ đắt để làm lại (đụng production, đổi mô hình quyền, xoá dữ liệu) thì **không được rút gọn thì 1**.

---

## Không dùng skill này khi

Sửa lỗi rõ ràng, đổi chữ, chạy lệnh, câu hỏi tra cứu. Hỏi lại cho có ở những việc đó chỉ làm phiền người dùng.
