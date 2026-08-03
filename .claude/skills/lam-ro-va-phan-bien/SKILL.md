---
name: lam-ro-va-phan-bien
description: "BẮT BUỘC dùng trước mọi nhiệm vụ không tầm thường (3 bước trở lên, quyết định kiến trúc, thêm tính năng, đổi mô hình dữ liệu/quyền) VÀ trước mọi lần sửa lỗi — kể cả khi người dùng đã chỉ rõ lỗi ở đâu, vì bản báo lỗi có thể mô tả sai hiện tượng hoặc chẩn đoán sai nguyên nhân. Cũng dùng khi CHÍNH MÌNH báo lỗi/kết quả cho người dùng. Ba thì: hỏi cho đến khi tự tin 95%, soi bằng con mắt top 0.1%, rồi trình bày lại vấn đề theo hướng thách thức góc nhìn ban đầu. Dùng cả khi người dùng nói 'làm luôn đi' — chỉ rút gọn, không bỏ."
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

## Thì 0 — Khi được BÁO LỖI

**Báo lỗi luôn phải chạy skill này. Không có ngoại lệ.**

Một bản báo lỗi là **lời khẳng định cần kiểm chứng**, không phải dữ kiện. Nó mang sẵn ba tầng có thể sai,
và tầng nào sai thì sửa xong vẫn hỏng:

| Tầng | Sai ở đâu | Hậu quả nếu tin ngay |
|---|---|---|
| **Hiện tượng** | thứ người báo nhìn thấy | sửa đúng chỗ nhìn thấy, gốc bệnh còn nguyên |
| **Chẩn đoán** | "tại vì file X" | sửa file X, lỗi vẫn còn, lại đổ cho chỗ khác |
| **Đề xuất sửa** | "cứ đổi Y thành Z" | vá đúng cách người báo nghĩ, hỏng thứ họ chưa nghĩ tới |

Trước khi gõ dòng code đầu tiên, **tự tái lập lỗi** và tự trả lời:

- **Lỗi này có thật không?** Tự chạy lại, tự nhìn thông báo gốc. Không nhận mô tả thay cho bằng chứng.
- **Có đúng là nguyên nhân đó không?** Người báo nêu nguyên nhân — đó là **giả thuyết của họ**, kiểm rồi hãy tin.
- **Người báo có đang mô tả nhầm không?** Họ nói "nhiều lỗi" có thể là **một** lỗi hiện sáu lần. Họ chỉ vào file A
  có thể vì đó là file họ vừa mở, không phải file có lỗi.
- **Cái gì họ CHƯA thấy?** Lỗi thật thường nằm ngoài khung nhìn của người báo.
- **Sửa xong thì nhìn vào đâu để biết đã hết?** Chưa trả lời được là chưa hiểu lỗi.

Ca thật ngay trong dự án này (2026-07-31): bản brief gửi sang nói file `mathStandards.test.ts` đang sửa dở —
kiểm ra thì là `mathStandards.bai19.test.ts`, file kia không hề đổi. Cũng bản đó cảnh báo CRLF sẽ làm diff
phình từ 10 lên 340 dòng — kiểm ra thì `core.autocrlf=true` đã xử lý sẵn, diff đúng 10 dòng. **Hai chi tiết sai
trong một bản báo lỗi vốn đã chẩn đoán đúng phần gốc.** Tin thẳng là đi sửa hai thứ không tồn tại.

Sau khi đã tái lập được lỗi, ranh giới còn lại là **số hướng sửa**:

- Chỉ có **một** cách sửa hợp lý → sửa, khỏi chạy tiếp ba thì.
- Có **từ hai hướng trở lên khác nhau về nghiệp vụ** → chạy thì 1, dù nguyên nhân đã rõ mười mươi.

Ca thật: CI đỏ vì luật `time-continuity` bắt fail một fixture cũ. Nguyên nhân rõ ràng, nhưng hai hướng sửa
cho kết quả khác hẳn — **sửa fixture cho khớp luật** (cổng chất lượng giữ răng) hay **hạ luật xuống medium**
(giáo án ghi giờ đồng hồ vẫn qua cổng). Đó là quyết định của chủ dự án. Đã bị xếp nhầm vào diện "lỗi rõ ràng"
nên tự quyết rồi mới giải thích, thay vì hỏi trước.

Phép thử một câu: *"Có cách sửa thứ hai mà người khác sẽ chọn không?"* Còn phân vân tức là có.

---

## Khi CHÍNH MÌNH báo lỗi cho người dùng

Áp đúng ba thì đó lên báo cáo của mình. Người dùng sẽ hành động dựa trên nó, nên nó phải chịu được soi.

**Bắt buộc có:**
- **Bằng chứng gốc, không phải lời kể.** Dán thông báo lỗi thật, số ca test thật, mã lỗi thật.
- **Tách rõ ba thứ**: cái ĐÃ QUAN SÁT được / cái đang SUY LUẬN / cái còn ĐANG ĐOÁN. Không trộn ba thứ thành một giọng chắc nịch.
- **Mức chắc chắn**, khi chưa chắc: *"đã tái lập được"* khác hẳn *"nhiều khả năng do"*.
- **Cách tự kiểm**: nêu đúng lệnh để người dùng tự chạy lại mà thấy, đừng bắt tin suông.

**Cấm:**
- Báo "đã sửa xong" khi chưa chạy lại đúng thứ CI/người dùng chạy.
- Giấu phần chưa làm được, hoặc gói nó vào chữ "về cơ bản đã ổn".
- Đổ cho môi trường / cho người khác trước khi loại trừ hết khả năng do chính mình.
- Nói "lỗi lạ", "không rõ vì sao" rồi dừng — chưa tìm ra thì nói thẳng là chưa tìm ra, kèm chỗ đã loại trừ.

**Và tự phản biện chính báo cáo của mình trước khi gửi:** *"Nếu tôi sai ở đây thì sai chỗ nào? Có cách đọc dữ
liệu này theo hướng khác không?"* Nêu luôn cách đọc khác đó nếu nó đứng được.

---

## Không dùng skill này khi

Đổi chữ, chạy lệnh, câu hỏi tra cứu thuần. Hỏi lại cho có ở những việc đó chỉ làm phiền người dùng.

Sửa lỗi **không** nằm trong danh sách này — xem Thì 0.
