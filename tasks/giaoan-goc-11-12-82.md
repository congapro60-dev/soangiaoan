<!-- Nguồn: Kế thừa và phát triển từ giáo án Tiết 1 (Firestore f2ab004b-553f-4867-a403-2e390ee7bbf6) theo PPCT tds-g11-82 (Tuần 12, Period 82) -->

# KẾ HOẠCH DẠY HỌC — CÁC SỐ ĐẶC TRƯNG ĐO XU THẾ TRUNG TÂM (Tiết 2: Tứ phân vị và Mốt của mẫu số liệu ghép nhóm)

| Lớp | 11 | Tên bài học | Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt của mẫu số liệu ghép nhóm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

## I. THÔNG TIN CHUNG

**1. Tiêu chuẩn năng lực cốt lõi**
- Năng lực tư duy và lập luận toán học: Suy luận công thức nội suy tuyến tính tìm tứ phân vị $Q_1, Q_3$ và công thức mốt $M_o$; giải thích mối liên hệ giữa trung vị $M_e$ và $Q_2$; phân tích ý nghĩa phân đoạn 25%–50%–75% dữ liệu.
- Năng lực mô hình hóa toán học: Ứng dụng tứ phân vị để xác định ngưỡng thời gian sử dụng thiết bị số của 25% nhóm thấp nhất và 25% nhóm cao nhất; dùng mốt để tìm khoảng thời gian phổ biến nhất.
- Năng lực giải quyết vấn đề toán học: Thiết lập quy trình 3 bước xác định nhóm chứa $Q_1, Q_3$ và nhóm chứa mốt; tính toán chính xác và nhận định các tình huống bẫy tần số biên.
- Năng lực giao tiếp toán học: Diễn đạt chuẩn xác các thuật ngữ: tứ phân vị thứ nhất, tứ phân vị thứ ba, nhóm chứa mốt, chênh lệch tần số lân cận.

**2. Mục tiêu học tập**

Sau tiết học, tôi có thể:

| Mức độ | Mục tiêu |
|---|---|
| Must (Cơ bản) | Tôi có thể xác định đúng nhóm chứa tứ phân vị $Q_1, Q_3$ (dựa vào $\frac{n}{4}, \frac{3n}{4}$ và tần số tích lũy) và nhóm chứa mốt (nhóm có tần số lớn nhất). [Bloom: Nhớ – Hiểu] |
| Should (Trọng tâm) | Tôi có thể áp dụng chính xác công thức để tính $Q_1, Q_3$ và mốt $M_o$ của mẫu số liệu ghép nhóm, đồng thời nêu rõ ý nghĩa thực tiễn của các số đo. [Bloom: Áp dụng] |
| Could (Nâng cao) | Tôi có thể so sánh bộ 5 số đặc trưng ($x_{\min}, Q_1, Q_2, Q_3, x_{\max}$) và mốt $M_o$ để nhận xét tính đối xứng hay lệch của tập số liệu, giải bài toán tìm tần số chưa biết khi cho trước $Q_1$ hoặc $M_o$. [Bloom: Phân tích – Đánh giá] |

**3. Phân hóa mục tiêu**

| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Xác định đúng nhóm chứa $Q_1, Q_3, M_o$ và tính đúng các giá trị theo bảng mẫu cho sẵn với các bước hướng dẫn cụ thể. | Tính trọn vẹn $Q_1, Q_3, M_o$ từ bảng khảo sát thực tế; nêu ý nghĩa phân vị 25% và 75% trong bối cảnh thực tế. | Phân tích các trường hợp đặc biệt: nhóm chứa mốt là nhóm đầu hoặc nhóm cuối; giải bài toán tham số tìm tần số ẩn. |

**4. Tài liệu dạy học**
- Sách giáo khoa Toán 11 tập 1 (bài Các số đặc trưng đo xu thế trung tâm).
- Phiếu học tập phân hoá 3 luồng (M: Cơ bản, S: Trọng tâm, C: Vận dụng cao).
- Bảng con cá nhân, bút lông bảng.
- Bộ slide bài giảng TV tương tác V8.8 và đồng hồ đếm ngược P-timer.

---

## II. TIẾN TRÌNH HOẠT ĐỘNG (40 phút)

### PHA 1: MỞ ĐẦU & KẾT NỐI (0–7 phút, P0–P7)

- **0–3′ (P0–P3): Mở đầu & Khởi động**
  - GV chiếu lại bảng khảo sát thời gian sử dụng Internet trong ngày của 40 học sinh khối 11 từ Tiết 1:
    - $[0; 2)$: $m_1 = 6$, $cf_1 = 6$
    - $[2; 4)$: $m_2 = 14$, $cf_2 = 20$
    - $[4; 6)$: $m_3 = 15$, $cf_3 = 35$
    - $[6; 8)$: $m_4 = 5$, $cf_4 = 40$
  - Nhắc lại kết quả Tiết 1: $\bar{x} = 3{,}95$ giờ, $M_e = Q_2 = 4{,}0$ giờ.
  - Câu hỏi gợi mở: *"Trung vị chia đôi dữ liệu. Nếu nhà trường muốn lọc ra 25% học sinh ít dùng thiết bị nhất để khen thưởng thói quen tốt và 25% dùng nhiều nhất để tư vấn tâm lý, ta tìm mốc thời gian đó như thế nào?"*
- **3–7′ (P3–P7): Câu hỏi định hướng**
  - HS suy nghĩ 30 giây rồi thảo luận cặp đôi.
  - Đại diện HS phát biểu: Cần chia dữ liệu làm 4 phần bằng nhau $\rightarrow$ Cần tìm các tứ phân vị $Q_1$ và $Q_3$.

### PHA 2: HÌNH THÀNH KIẾN THỨC (7–17 phút, P7–P17)

- **7–9′ (P7–P9): Mục tiêu do lớp tổng hợp**
  - Công bố 3 mục tiêu Must – Should – Could của tiết học.
- **9–14′ (P9–P14): Công cụ toán học (Tứ phân vị và Mốt)**
  - **Tứ phân vị thứ nhất $Q_1$**:
    - Vị trí $\frac{n}{4}$. Nhóm $[a_p; a_{p+1})$ chứa $Q_1$ là nhóm đầu tiên có $cf_p \ge \frac{n}{4}$.
    - Công thức: $Q_1 = a_p + \frac{\frac{n}{4} - C}{m_p} \cdot h$ (với $C = cf_{p-1}$, $h = a_{p+1} - a_p$).
    - Với tập số liệu 40 HS: $\frac{40}{4} = 10 \rightarrow$ Nhóm chứa $Q_1$ là $[2; 4)$ ($cf_2 = 20$).
      $$Q_1 = 2 + \frac{10 - 6}{14} \cdot 2 = 2 + \frac{8}{14} \approx 2{,}57\text{ (giờ)}$$
  - **Tứ phân vị thứ ba $Q_3$**:
    - Vị trí $\frac{3n}{4}$. Nhóm $[a_k; a_{k+1})$ chứa $Q_3$ là nhóm đầu tiên có $cf_k \ge \frac{3n}{4}$.
    - Công thức: $Q_3 = a_k + \frac{\frac{3n}{4} - C}{m_k} \cdot h$ (với $C = cf_{k-1}$).
    - Với tập số liệu 40 HS: $\frac{120}{4} = 30 \rightarrow$ Nhóm chứa $Q_3$ là $[4; 6)$ ($cf_3 = 35$, $C = 20$).
      $$Q_3 = 4 + \frac{30 - 20}{15} \cdot 2 = 4 + \frac{20}{15} \approx 5{,}33\text{ (giờ)}$$
  - **Mốt $M_o$**:
    - Nhóm chứa mốt là nhóm có tần số lớn nhất: $[4; 6)$ có $m_3 = 15$.
    - Công thức: $M_o = a_j + \frac{m_j - m_{j-1}}{(m_j - m_{j-1}) + (m_j - m_{j+1})} \cdot h$.
      $$M_o = 4 + \frac{15 - 14}{(15 - 14) + (15 - 5)} \cdot 2 = 4 + \frac{1}{1 + 10} \cdot 2 = 4 + \frac{2}{11} \approx 4{,}18\text{ (giờ)}$$
- **14–17′ (P14–P17): Think → AI → Verify (AI Error)**
  - *Tình huống AI sai*: Một ứng dụng AI giải bài toán tìm $Q_1$ của mẫu 40 HS trên như sau:
    "Vì cỡ mẫu $n = 40$ nên vị trí thứ $10$ rơi vào nhóm $[2; 4)$. Áp dụng công thức: $Q_1 = 2 + \frac{10 - 0}{14} \cdot 2 \approx 3{,}43$ giờ."
  - *Học sinh bắt lỗi*: AI đã quên trừ đi tần số tích lũy của nhóm trước ($C = cf_1 = 6$), coi $C = 0$.
  - *Sửa đúng*: $Q_1 = 2 + \frac{10 - 6}{14} \cdot 2 \approx 2{,}57$ giờ.

### PHA 3: LUYỆN TẬP PHÂN HOÁ (17–31 phút, P17–P31)

- **17–18′ (P17–P18): Câu hỏi nhóm định hướng**
  - Thảo luận theo cụm bàn: So sánh $Q_1, Q_2, Q_3$ và $M_o$.
- **18–26′ (P18–P26): Nhiệm vụ có lựa chọn (3 luồng M / S / C)**
  - **Luồng M (Cơ bản)**: Tính $Q_1, Q_3, M_o$ cho mẫu số liệu thời gian chạy bộ của 30 học sinh.
  - **Luồng S (Trọng tâm)**: Khảo sát tiền điện sinh hoạt tháng của 50 hộ gia đình, tính đầy đủ $Q_1, Q_3, M_o$ và rút ra nhận xét.
  - **Luồng C (Nâng cao)**: Bài toán ngược: Cho bảng số liệu có tần số ẩn $x$ ở nhóm $[40; 60)$, biết mốt $M_o = 48$, tìm $x$ và tính tứ phân vị.
- **26–31′ (P26–P31): Post-check cá nhân**
  - Học sinh làm bài kiểm tra cá nhân 5 phút để xác nhận năng lực đạt được.

### PHA 4: ĐÁNH GIÁ & TỔNG KẾT (31–40 phút, P31–P40)

- **31–34′ (P31–P34): Quick-check (Kiểm tra nhanh)**
  - 2 câu trắc nghiệm nhanh trên hệ thống: xác định nhóm chứa $Q_3$ và công thức tính mốt.
- **34–35′ (P34–P35): Đối chiếu mục tiêu**
  - Học sinh đối chiếu lại mục tiêu ban đầu xem đã hoàn thành Must/Should/Could.
- **35–38′ (P35–P38): Exit Ticket**
  - 1 câu hỏi phản tư: Trong thực tế, khi nào nên dùng mốt thay vì số trung bình?
- **38–40′ (P38–P40): Kết thúc tiết & Dặn dò**
  - GV tổng kết tiết học, giao bài tập về nhà trong sách bài tập.
