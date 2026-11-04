# KẾ HOẠCH DẠY HỌC — Biểu diễn miền nghiệm của bất phương trình (Toán 10 · Tuần 5 · Tiết 32)

| Lớp | 10 | Tên bài học | Biểu diễn miền nghiệm của bất phương trình | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-5-32.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Vẽ đúng đường biên (nét liền/nét đứt theo dấu) và xác định miền nghiệm bằng một điểm thử.
- **Should (Trọng tâm – Thông hiểu):** Thực hiện trọn 3 bước cho bất phương trình có dấu ngặt và dấu không ngặt; kiểm tra lại bằng một điểm ngoài miền.
- **Could (Nâng cao – Vận dụng):** Tạo bất phương trình theo yêu cầu miền (chứa/không chứa điểm cho trước) và phản biện hình vẽ sai phía.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Vẽ "bản đồ phương án" cho xe bánh mì với mô hình $3x + 2y \le 30$.**

- **Đường biên:** $3x + 2y = 30$ đi qua $(10; 0)$ và $(0; 15)$.
- **Điểm thử $O(0;0)$:** $3\cdot0 + 2\cdot0 = 0 \le 30$ **đúng** → miền nghiệm là nửa mặt phẳng **chứa gốc tọa độ** (phía dưới đường biên).
- **Vì dấu $\le$** nên đường biên vẽ **nét liền** (lấy cả biên).
- **Kiểm chứng tay:** $(4; 9)$: $12 + 18 = 30 \le 30$ → nằm **trên** biên, vẫn thuộc miền. $(8; 6)$: $24 + 12 = 36 > 30$ → nằm **ngoài** miền.

| Điểm | Giá trị $3x + 2y$ | Thuộc miền? |
|---|---|---|
| $(0; 0)$ | 0 | Có |
| $(4; 9)$ | 30 | Có (trên biên) |
| $(8; 6)$ | 36 | Không |

**Bẫy của bài:** dùng dấu $\le$ nhưng vẽ nét đứt; tô nhầm phía (chọn phía chứa điểm thử sai).

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Mô hình 3x + 2y ≤ 30. GV chiếu mặt phẳng tọa độ trống và hỏi HS cần vẽ gì trước.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Bước đầu tiên để biểu diễn miền nghiệm của 3x + 2y ≤ 30 là gì?*
  - (A) Tô ngay nửa mặt phẳng phía trên
  - (B) Vẽ đường biên 3x + 2y = 30
  - (C) Tính trung bình của x và y
  - **Correct: (B)** — Phải có đường biên thì mới xác định được hai nửa mặt phẳng; sau đó mới dùng điểm thử để chọn phía.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Đường biên đi qua hai điểm nào?
  2. `[SO SÁNH]` Nếu dấu là "<" thay vì "≤" thì hình vẽ khác ở đâu?
- **TeacherCue (lớp yếu):** Chỉ vào hai trục: "cho x = 0 tìm y, cho y = 0 tìm x" — hai điểm là đủ để vẽ đường thẳng.
- **LookFor:** HS nêu được 2 điểm thuộc đường biên và nhắc tới điểm thử.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Vẽ đúng đường biên (nét liền/nét đứt theo dấu) và xác định miền nghiệm bằng một điểm thử.
- **Should:** Thực hiện trọn 3 bước cho bất phương trình có dấu ngặt và dấu không ngặt; kiểm tra lại bằng một điểm ngoài miền.
- **Could:** Tạo bất phương trình theo yêu cầu miền (chứa/không chứa điểm cho trước) và phản biện hình vẽ sai phía.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Làm thế nào để nhìn thấy tất cả các phương án thỏa một bất phương trình?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Vẽ đường biên $ax + by = c$: nét liền nếu dấu $\le, \ge$; nét đứt nếu dấu $<, >$.
- **Bước 2:** Chọn một điểm thử không thuộc đường biên (thường là $O(0;0)$) và thay vào bất phương trình.
- **Bước 3:** Nếu mệnh đề đúng → chọn nửa mặt phẳng chứa điểm thử; nếu sai → chọn nửa còn lại; tô/đánh dấu miền.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao dấu $<$ phải vẽ nét đứt?
  2. `[PHÁT HIỆN]` Với $3x - 2y > 6$, thử $O(0;0)$ được gì và chọn phía nào?
- **TeacherCue (lớp yếu):** Khung 3 ô: "biên → thử → tô". Nhắc: điểm thử sai thì tô phía **đối diện** điểm thử.
- **Chốt:** Miền nghiệm là một nửa mặt phẳng (kể cả biên với $\le, \ge$); điểm thử quyết định phía.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI trình bày: "Miền nghiệm của 3x + 2y ≤ 30 là nửa mặt phẳng phía trên đường thẳng 3x + 2y = 30. Vì bất phương trình có dấu ≤ nên ta vẽ đường biên bằng nét đứt để thể hiện rằng biên không được tính.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI vẽ nét đứt cho dấu ≤ và tô phía trên đường biên.
  2. Bằng chứng: Thử $O(0;0)$: $0 \le 30$ đúng nên miền phải chứa gốc; $O$ nằm phía dưới đường biên. AI tô phía trên nên chứa điểm $(0;16)$: $0 + 32 = 32 > 30$ — điểm này không thỏa.
  3. Sửa: Vẽ nét liền và tô nửa mặt phẳng chứa gốc tọa độ.
- **TeacherCue:** Cho HS yếu kiểm tra một điểm ở phía AI tô để thấy mâu thuẫn.
- **LookFor:** HS dùng điểm thử để bác bỏ hình vẽ, không chỉ nói "sai".

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "vẽ biên bằng hai điểm chặn trục, rồi thử O(0;0)."
  - **S:** "kiểm tra lại bằng một điểm ở phía đối diện để chắc chắn."
  - **C:** "thiết kế bất phương trình từ miền cho trước, nhớ chọn dấu đúng."

- **Luồng M (Must) — hint: vẽ biên bằng hai điểm chặn trục, rồi thử O(0;0).**
1. Với 2x + y < 1, đường biên vẽ nét liền hay nét đứt?
   - **Đáp án:** Nét đứt, vì dấu < không lấy đường biên.
2. Nêu ba bước biểu diễn miền nghiệm của bất phương trình bậc nhất hai ẩn.
   - **Đáp án:** Vẽ đường biên (nét liền/đứt theo dấu); chọn điểm thử và thay vào; chọn nửa mặt phẳng theo kết quả rồi tô.

- **Luồng S (Should) — hint: kiểm tra lại bằng một điểm ở phía đối diện để chắc chắn.**
1. Biểu diễn miền nghiệm của −x + y ≥ 2.
   - **Đáp án:** Đường −x + y = 2 nét liền; thử O(0; 0): 0 ≥ 2 sai → chọn phía không chứa gốc; điểm (0; 3) thỏa nên thuộc miền.
2. Điểm (2; 1) có thuộc miền nghiệm của x + y ≤ 3 không?
   - **Đáp án:** Có: 2 + 1 = 3 ≤ 3 đúng; điểm nằm ngay trên đường biên (vẫn thuộc vì dấu ≤).

- **Luồng C (Could) — hint: thiết kế bất phương trình từ miền cho trước, nhớ chọn dấu đúng.**
1. Tạo một bất phương trình có miền nghiệm chứa gốc tọa độ nhưng không chứa điểm (2; 2).
   - **Đáp án:** Ví dụ x + y ≤ 1: gốc cho 0 ≤ 1 đúng; (2; 2) cho 4 ≤ 1 sai. (Chỉ cần chọn hằng số nhỏ hơn 4 và không âm.)
2. Một bạn vẽ nét đứt cho x − y ≤ 0. Hãy sửa và giải thích.
   - **Đáp án:** Phải vẽ nét liền vì dấu ≤ lấy cả đường biên x − y = 0; các điểm trên đường (ví dụ (1; 1), (0; 0)) đều là nghiệm.

- **LookFor:** HS M vẽ đúng nét; HS S phát hiện lỗi nhờ điểm ngoài miền; HS C giải thích được quan hệ dấu ↔ nét vẽ.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Biểu diễn miền nghiệm của $-x + y \ge 2$: nét vẽ và phía chọn? → Đường $-x + y = 2$ nét **liền** (dấu ≥); thử $O(0;0)$: $0 \ge 2$ sai → chọn phía **không** chứa gốc; kiểm $(0;3)$: $3 \ge 2$ đúng.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Dấu < luôn vẽ nét liền" → **Sai**
  - "Điểm thử sai thì chọn phía đối diện" → **Đúng**
  - "Điểm trên đường biên thuộc miền nghiệm của ≤" → **Đúng**
- **TeacherCue:** Chiếu 2 hình vẽ của HS và cùng kiểm bằng điểm thử.

- **Câu 1:** Vì sao dấu < phải vẽ nét đứt? → Vì các điểm trên đường biên cho vế trái bằng vế phải, không thỏa bất đẳng thức ngặt — nên biên không thuộc miền.
- **Câu 2:** Khi điểm thử O(0;0) cho mệnh đề sai thì chọn phía nào? → Chọn nửa mặt phẳng đối diện với O (không chứa gốc tọa độ).
- **Chốt nhanh:** Biên → thử → tô; dấu quyết định nét.

- Mọi điểm trong miền là một phương án mua được; càng gần biên càng dùng gần hết 150 nghìn.
- (8; 6) nằm ngoài miền (36 > 30) — không mua được.
- (4; 9) nằm trên biên — mua đúng 150 nghìn, không dư.
- **TeacherCue:** Hỏi HS: "Muốn mua nhiều bánh nhất có thể thì đi dọc biên tới đâu?" → (10; 0).

- **Exit Ticket (4 mục):**
  1. Nêu 3 bước biểu diễn miền nghiệm.
  2. Nêu 1 bẫy (nét đứt cho ≤; tô sai phía).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Với 3x + 2y ≤ 30, điểm (8; 6) có thuộc miền không? Vì sao?
- **TeacherCue (lớp yếu):** Mở lại khung "biên → thử → tô" ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Với 2x + y < 1, đường biên vẽ nét liền hay nét đứt?
   - **Đáp án:** Nét đứt, vì dấu < không lấy đường biên.
2. `[NB]` Nêu ba bước biểu diễn miền nghiệm của bất phương trình bậc nhất hai ẩn.
   - **Đáp án:** Vẽ đường biên (nét liền/đứt theo dấu); chọn điểm thử và thay vào; chọn nửa mặt phẳng theo kết quả rồi tô.
3. `[TH]` Biểu diễn miền nghiệm của −x + y ≥ 2.
   - **Đáp án:** Đường −x + y = 2 nét liền; thử O(0; 0): 0 ≥ 2 sai → chọn phía không chứa gốc; điểm (0; 3) thỏa nên thuộc miền.
4. `[TH]` Điểm (2; 1) có thuộc miền nghiệm của x + y ≤ 3 không?
   - **Đáp án:** Có: 2 + 1 = 3 ≤ 3 đúng; điểm nằm ngay trên đường biên (vẫn thuộc vì dấu ≤).
5. `[VD]` Tạo một bất phương trình có miền nghiệm chứa gốc tọa độ nhưng không chứa điểm (2; 2).
   - **Đáp án:** Ví dụ x + y ≤ 1: gốc cho 0 ≤ 1 đúng; (2; 2) cho 4 ≤ 1 sai. (Chỉ cần chọn hằng số nhỏ hơn 4 và không âm.)
6. `[VD]` Một bạn vẽ nét đứt cho x − y ≤ 0. Hãy sửa và giải thích.
   - **Đáp án:** Phải vẽ nét liền vì dấu ≤ lấy cả đường biên x − y = 0; các điểm trên đường (ví dụ (1; 1), (0; 0)) đều là nghiệm.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Vẽ nét đứt cho dấu ≤ hoặc ≥.
- Tô phía chứa điểm thử dù điểm thử cho mệnh đề sai.
- Quên kiểm tra lại bằng một điểm ngoài miền.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
