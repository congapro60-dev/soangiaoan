---
title: "MATH DIAGRAM STANDARD — Quy chuẩn biểu diễn trực quan Toán THCS & THPT"
version: "1.0.0"
status: "Bộ chuẩn thực hành đề xuất — không phải văn bản quy phạm pháp luật"
updated: "2026-10-29"
language: "vi-VN"
audience: ["AI tạo hình", "AI tạo slide", "AI tạo đề kiểm tra", "giáo viên Toán THCS", "giáo viên Toán THPT", "nhà phát triển phần mềm giáo dục"]
grade_range: "6-12"
source_priority: ["Đề bài và toán học chính xác", "Chương trình và SGK đang dùng", "Quy ước biểu diễn toán học", "Thiết kế dễ đọc", "Thẩm mỹ"]
---

# MATH DIAGRAM STANDARD — BỘ QUY CHUẨN VẼ HÌNH VÀ BIỂU DIỄN TRỰC QUAN TOÁN HỌC THCS–THPT

**Bản đầy đủ 1.0.0 — Cập nhật ngày 29/10/2026**  
**Phạm vi:** Toán lớp 6–12, cả hình học phẳng, hình học không gian, đồ thị hàm số, số học và đại số trực quan, tọa độ, vectơ, thống kê, xác suất, bảng biến thiên, hình khai triển, mô hình động, học liệu trên bảng/slide/đề kiểm tra/PDF và hệ thống AI tạo hình.

> **CHỈ DẪN CHO AI ĐỌC TỆP NÀY:** Đây là một đặc tả vận hành. Khi nhận nhiệm vụ tạo, sửa, kiểm tra hoặc xuất hình Toán học cho lớp 6–12, hãy áp dụng các quy tắc có liên quan, ưu tiên tính đúng đắn toán học hơn mọi mục tiêu thẩm mỹ. Không biến khuyến nghị thiết kế thành định lý; không tự suy diễn thêm giả thiết; không dùng hình vẽ làm bằng chứng cho điều chưa chứng minh. Nếu thông tin còn thiếu, chỉ dùng cấu hình mặc định khi nó không bổ sung quan hệ toán học mới. Nếu hai yêu cầu xung đột, thực hiện quy tắc phân xử ở Mục 2.

---

## MỤC LỤC

1. Mục đích, phạm vi và ranh giới pháp lý
2. Thứ tự ưu tiên, phân cấp quy tắc và nguyên tắc cốt lõi
3. Đặc tả dữ liệu, ký hiệu và độ chính xác
4. Quy tắc vẽ hình học phẳng
5. Các phép biến hình và mô hình động 2D
6. Hình học không gian, phép chiếu và hình khối
7. Mô hình 3D tương tác, cạnh khuất và camera
8. Mặt phẳng tọa độ, trục số và tập hợp
9. Đồ thị hàm số: quy tắc nền tảng
10. Đồ thị các họ hàm số và các ngoại lệ quan trọng
11. Bảng biến thiên, bảng dấu, miền nghiệm và vùng diện tích
12. Hình minh họa số học, đại số, giải tích và tối ưu hóa
13. Thống kê: bảng số liệu, biểu đồ, đồ thị và box plot
14. Xác suất, tổ hợp, cây xác suất và Bayes
15. Ma trận nội dung trực quan theo khối lớp 6–12
16. Hệ thống ký hiệu và chuẩn công thức
17. Tiêu chuẩn hình thức: màu, nét, chữ, bố cục
18. Tiêu chuẩn sư phạm và biểu diễn theo trạng thái học tập
19. Xuất file, tương thích công cụ và khả năng sửa
20. Kiến trúc AI tạo hình: dữ liệu → ràng buộc → dựng → kiểm định
21. Bộ thử nghiệm, lỗi thường gặp, tiêu chí nghiệm thu
22. Mẫu lệnh dùng ngay cho AI và ví dụ đặc tả
23. Checklist hoàn chỉnh trước xuất bản
24. Nguồn tham chiếu và quản trị phiên bản

---

## 1. MỤC ĐÍCH, PHẠM VI VÀ RANH GIỚI PHÁP LÝ

### 1.1. Mục tiêu

Một hình Toán học tốt cần đạt đồng thời:

1. **Chính xác về toán học:** mọi đối tượng, quan hệ, vị trí, miền xác định và dấu hiệu hình học đều tương thích đề bài.
2. **Đúng quy ước:** tên điểm, nét thấy/khuất, các ký hiệu góc và vectơ, đầu mút mở/đóng, trục tọa độ được dùng nhất quán.
3. **Dễ đọc:** phân biệt được nét chính và phụ, không che nhãn, điểm, giao tuyến; đủ độ tương phản.
4. **Đúng mục tiêu sư phạm:** hình chỉ tiết lộ lượng thông tin mà người học cần thấy ở thời điểm tương ứng; không làm lộ đáp án ngoài ý muốn.
5. **Dễ tái sử dụng:** đối tượng có thể sửa được, có thể xuất SVG/PDF/PNG/PPTX/GeoGebra/mã nguồn phù hợp.
6. **Đủ thông tin để kiểm định:** biết hình nào là minh họa không theo tỉ lệ, hình nào phải đúng tọa độ và hình nào là hình động.

### 1.2. Căn cứ chương trình

- Tham chiếu chương trình giáo dục phổ thông môn Toán ban hành kèm **Thông tư 32/2018/TT-BGDĐT ngày 26/12/2018**, cùng các văn bản sửa đổi đang có hiệu lực được xác minh vào thời điểm triển khai.
- Nội dung Toán phổ thông được tổ chức quanh ba mạch lớn: **Số, Đại số và một số yếu tố giải tích; Hình học và Đo lường; Thống kê và Xác suất**; đồng thời có hoạt động thực hành/trải nghiệm và, ở THPT, các chuyên đề học tập.
- Thông tư **17/2025/TT-BGDĐT** điều chỉnh một số nội dung chương trình chung; các thông tin công bố chính thức liên quan văn bản này không liệt kê môn Toán trong nhóm môn cần sửa nội dung do thay đổi hành chính năm 2025. **Không suy luận rằng mọi điều khoản của chương trình bất biến vĩnh viễn.**
- Công văn **5208/BGDĐT-GDPT ngày 07/08/2026** hướng dẫn thực hiện nhiệm vụ giáo dục phổ thông 2026–2027; dự thảo văn bản chưa ban hành không được coi là quy phạm đã có hiệu lực.
- Không mặc định mọi trường đang học cùng một bộ SGK hoặc phân phối chương trình; phải theo **bộ SGK, khối, bài, mục tiêu và yêu cầu cần đạt cụ thể** khi được cung cấp.

### 1.3. Phân định tính bắt buộc

| Mã | Loại | Mức độ | Giải thích |
|---|---|---|---|
| MATH | Tính chất toán học, dữ liệu đề bài | BẮT BUỘC | Không được sai, dù hình 'đẹp hơn' nếu sửa |
| CURR | Kiến thức, ký hiệu, mức yêu cầu phù hợp bài học | BẮT BUỘC TRONG NGỮ CẢNH | Không đưa nội dung vượt bài mà không có chủ đích |
| CONV | Quy ước biểu diễn | PHẢI NHẤT QUÁN | Có thể có biến thể được chấp nhận, cần ghi rõ |
| A11Y | Độ đọc, tương phản, khả năng tiếp cận | RẤT QUAN TRỌNG | Hình phải truyền được thông tin cần thiết |
| DESIGN | Cỡ nét, màu, bố cục | ĐỀ XUẤT | Thông số được phép điều chỉnh tùy phương tiện |
| TOOL | Phụ thuộc công cụ | ĐIỀU KIỆN | Kiểm tra phần mềm/hệ thống hiện dùng |

**Không có một văn bản duy nhất quy định tất cả hình Toán Việt Nam phải có cùng màu, font, số pixel và góc nghiêng.** Thông số trong tài liệu này là chuẩn thiết kế nội bộ đề xuất, không được giới thiệu là quy định bắt buộc của Bộ GD&ĐT.

---

## 2. THỨ TỰ ƯU TIÊN, PHÂN CẤP QUY TẮC VÀ NGUYÊN TẮC CỐT LÕI

### 2.1. Ưu tiên khi xung đột

`ĐÚNG TOÁN HỌC > ĐÚNG ĐỀ/SGK/MỤC TIÊU > ĐÚNG QUY ƯỚC > DỄ ĐỌC > THẨM MỸ > TIẾT KIỆM THAO TÁC`.

Một số áp dụng:

- Nếu kéo nhãn A ra xa làm đẹp hơn thì có thể làm; nếu kéo **điểm A** ra khỏi đường thẳng đề cho thì không thể.
- Nếu ép hình vuông dưới phép chiếu không gian phải có góc vuông 90° trên giấy, điều đó có thể phá phép chiếu; phải ưu tiên tính đúng của hình không gian.
- Nếu nền tối đẹp nhưng nét khuất khó phân biệt thì tăng tương phản hoặc thay nền.
- Nếu đường cong tạo ra từ nội suy mượt nhưng đi qua một điểm **không thuộc miền xác định**, phải tách nhánh và đánh dấu lỗ.

### 2.2. Các nguyên tắc nền tảng

- **Dựng theo quan hệ, không dựng theo 'phỏng đoán hình'.** Dữ liệu nguồn phải lưu điểm, đường, mặt, giao, ràng buộc trước khi tô vẽ.
- **Không ngụ ý thêm kết luận:** không vẽ tam giác trông cân/đều hoặc tam giác vuông nếu đề không bảo đảm, trừ khi hình minh họa được ghi rõ là một trường hợp cụ thể không dùng để suy luận tổng quát.
- **Hình để minh họa khác hình để đo:** hình minh họa không theo tỉ lệ có thể biến dạng độ dài/góc nhưng không được phá các quan hệ bất biến bắt buộc; hình cần đo phải bảo toàn thang đo đã công bố.
- **Mọi ký hiệu mang nghĩa toán học:** vạch bằng nhau, cung góc, dấu song song, hình vuông góc không phải trang trí.
- **Không chứng minh từ vẻ ngoài:** 'nhìn có vẻ bằng' không cho phép suy ra bằng nhau.
- **Cảnh giác với trường hợp đặc biệt:** hình dựng cho mệnh đề tổng quát phải tránh vô tình rơi vào một trường hợp đối xứng, đồng quy, thẳng hàng, vuông góc hay bằng nhau ngoài giả thiết nếu các quan hệ ấy gây hiểu sai.
- **Có nhãn trạng thái:** hình ban đầu, hình đang xây dựng, hình gợi ý, hình lời giải cần phân biệt.
- **Dùng định nghĩa toán học để dẫn hình:** ví dụ xác suất có điều kiện phải dựa trên không gian mẫu và biến cố, không tô theo cảm tính.

### 2.3. Khi yêu cầu còn mơ hồ

- Thiếu tên điểm: đặt theo thứ tự thông dụng, nhưng không xung đột ký hiệu đã có.
- Thiếu kích thước: chọn tỉ lệ thuận tiện cho minh họa và ghi 'hình minh họa, không theo tỉ lệ' khi cần.
- Thiếu góc nhìn 3D: chọn phép chiếu song song/orthographic hoặc oblique phù hợp học đường; không thay bằng phối cảnh gây mất tính song song nếu mục tiêu là chứng minh quan hệ song song.
- Thiếu miền đồ thị: suy ra miền xác định đại số, chọn viewport phù hợp đặc điểm hàm chứ không tự cắt miền xác định.
- Thiếu mức độ tiết lộ đáp án: mặc định **hình ban đầu không chứa đường phụ/kết luận cần học sinh tự tìm**.
- Không biết loại biểu đồ: chọn theo bản chất dữ liệu, không tùy tiện chọn biểu đồ đẹp nhất.

---

## 3. ĐẶC TẢ DỮ LIỆU, KÝ HIỆU VÀ ĐỘ CHÍNH XÁC

### 3.1. Phân biệt mô hình toán học và hình ảnh hiển thị

Mọi hình cần được quản lý hai lớp:

- **Lớp ngữ nghĩa:** `point`, `line`, `ray`, `segment`, `circle`, `arc`, `polygon`, `plane`, `solid`, `function`, `dataset`, `event`, `constraint`, `proofState`.
- **Lớp trình bày:** hình chiếu, tọa độ màn hình, màu, độ dày, kiểu nét, vị trí nhãn, layer, animation.

Không được sửa dữ liệu hình học để giải quyết xung đột nhãn hiển thị. Chỉ được sửa **vị trí nhãn**, viewport, camera hoặc thứ tự lớp mà không phá ràng buộc.

### 3.2. Ràng buộc cơ bản

- `incident(P, l)`: P thuộc l.
- `collinear(A, B, C)`: A, B, C thẳng hàng.
- `between(A, M, B)`: M nằm giữa A và B (cùng thứ tự đoạn).
- `parallel(l, m)`: song song (lưu ý phân biệt 2D và 3D).
- `perpendicular(l, m)`: vuông góc theo định nghĩa tương ứng.
- `concurrent(l1,l2,l3)`: đồng quy khi đề cho/đã suy ra.
- `equalLength(AB, CD)`: độ dài bằng nhau.
- `equalAngle(ABC, DEF)`: góc bằng nhau.
- `midpoint(M, A, B)`: M thuộc AB và MA = MB.
- `tangent(l, C, T)`: tiếp tuyến tại T.
- `circleCenterRadius(C,O,R)`: tập điểm cách O đúng R.
- `domain(f, D)`: miền xác định thật của hàm f.
- `openEndpoint`/`closedEndpoint`: điểm có/không thuộc miền.

### 3.3. Số chính xác và sai số

- Ưu tiên lưu tọa độ **chính xác** dưới dạng số nguyên, hữu tỉ, biểu thức căn, phân số và biểu thức đại số; chỉ đổi sang số thực khi render.
- Không làm tròn tọa độ trong logic. Ví dụ x = √2 không đồng nhất với x = 1,41.
- Trong kiểm tra hình số bằng floating-point: dùng sai số tương đối và tuyệt đối thích hợp theo tỉ lệ hình; không kết luận 'song song' chỉ dựa vào chênh lệch góc rất nhỏ.
- Phân biệt `EXACT`, `APPROXIMATE`, `ILLUSTRATIVE`, `NOT_TO_SCALE`.
- Ký hiệu `≈` cho số gần đúng, `=` chỉ khi thực sự bằng.
- Khi có đơn vị đo, ghi nhất quán `cm`, `m`, `cm²`, `m³`, `°`, `rad`; không ghi giá trị đo mà thiếu đơn vị nếu bài cần đơn vị.

### 3.4. Không được đảo ngược điều kiện

- Nếu A nằm trên tia Ox thì không nhất thiết A nằm giữa O và một điểm X bất kỳ.
- Nếu hai đoạn có độ dài bằng nhau trên không gian 3D, hình chiếu của chúng không nhất thiết dài bằng nhau.
- Nếu hai đoạn hình chiếu cắt nhau, hai đoạn 3D chưa chắc cắt nhau.
- Nếu hai đường đối xứng trên hình, không suy ra bài cho đối xứng khi chưa có dữ kiện.

---

## 4. QUY TẮC VẼ HÌNH HỌC PHẲNG

### 4.1. Điểm, đường, đoạn và tia

| Đối tượng | Ký hiệu | Cách dựng đúng | Lỗi cần tránh |
|---|---|---|---|
| Điểm | `A`, `B`, `M`, `O`, `H` | Chấm nhỏ/điểm mốc rõ, nhãn cạnh bên | Nhãn trôi xa hoặc chấm lệch đường |
| Đường thẳng | `a`, `b`, `d`, `(AB)` | Kéo dài hai chiều nếu có thể, cắt khung có chủ ý | Vẽ thành đoạn nhưng gọi là đường thẳng |
| Đoạn thẳng | `AB` | Có hai đầu mút A, B, không mũi tên | Tự kéo dài thành tia |
| Tia | `Ax` hoặc `AB` | Gốc A, kéo dài đúng một chiều | Tia hướng ngược, gốc sai |
| Vectơ | `\overrightarrow{AB}` | Mũi tên từ A đến B | Mũi tên ngược hoặc hai đầu |
| Đường tròn | `(O;R)` | Tập điểm cách O bán kính R | Tâm lệch vòng tròn |
| Cung | `\widehat{AB}` | Chỉ rõ cung nhỏ/lớn nếu có thể nhầm | Tự chọn cung lớn khi đề yêu cầu cung nhỏ |

**Quy tắc nhãn:** chữ in hoa đặt tên điểm; tên đường thường dùng chữ thường hoặc hai điểm; tâm O, chân đường cao H, trung điểm M, giao điểm I chỉ là lựa chọn phổ biến, không phải bắt buộc. Nếu SGK/đề đã chọn tên, phải giữ nguyên.

### 4.2. Tam giác và đa giác

1. Đỉnh liệt kê theo thứ tự quanh đường biên, trừ khi đề bài chỉ định thứ tự khác.
2. Dựng các cạnh đúng đối tượng; không tự làm tam giác cân, đều, vuông, đối xứng nếu không có giả thiết.
3. Tam giác có góc tù phải thể hiện góc tù đúng đỉnh; đường cao có thể nằm ngoài tam giác và phải kéo dài cạnh liên quan khi dựng chân đường cao.
4. Với tam giác vuông, ký hiệu vuông góc ở đúng góc vuông và hai cạnh góc vuông gặp nhau đúng đỉnh.
5. Với tam giác cân/đều, ký hiệu cạnh bằng nhau và trục đối xứng (nếu cần); không đánh dấu mơ hồ.
6. Đa giác lồi/lõm phải đúng bản chất; không làm đa giác tự cắt trừ khi là đối tượng cần biểu diễn.
7. Với đường chéo, bảo đảm hai đầu của đường chéo là đỉnh không kề nhau.
8. Với đường trung tuyến, chân nằm ở **trung điểm cạnh đối diện**; phân giác chia góc thành hai góc bằng nhau; đường cao vuông góc cạnh/đường thẳng chứa cạnh; trung trực qua trung điểm và vuông góc đoạn.
9. Phân biệt **trọng tâm G, trực tâm H, tâm ngoại tiếp O, tâm nội tiếp I**: không cho các tâm trùng nhau trong tam giác bất kỳ nếu đề không bảo đảm; riêng tam giác đều chúng trùng nhau.
10. Nếu dựng từ định lý Ceva, Menelaus, Thalès, đường Simson hoặc bài nâng cao, cần thực thi đúng vị trí điểm trên đoạn, trên tia kéo dài hay trên đường thẳng chứa cạnh.

### 4.3. Ký hiệu quan hệ

- Hai đoạn bằng nhau: dùng **cùng số vạch** trên các đoạn cùng nhóm; nhóm khác nhau dùng 2, 3 vạch khác nhóm.
- Hai góc bằng nhau: dùng cùng số cung góc hoặc cùng dấu hiệu; không vô tình chỉ bằng màu.
- Góc vuông: ký hiệu hình vuông nhỏ trong miền góc phù hợp.
- Hai đường song song: có thể dùng cùng số mũi tên nhỏ trên đoạn đại diện; mũi tên này không đồng nhất với mũi tên của vectơ.
- Hai góc đối đỉnh, đồng vị, so le trong, trong cùng phía: phải xét đúng **vị trí các miền góc**, không đảo nhãn.
- Chấm giao điểm: chỉ chấm nơi có giao điểm thật. Nếu hai nét chỉ đè lên nhau do lớp vẽ hoặc hình 3D, không chấm như giao điểm thật.

### 4.4. Góc và phép đo góc

- Ký hiệu `\angle ABC`, hoặc `\widehat{ABC}`, đỉnh là **B**; tránh ghi thứ tự sai.
- Góc có hướng, góc lượng giác cần xác định tia đầu, tia cuối, chiều quay và đơn vị radian/độ.
- Với các góc lớn hơn 180°/góc phản, phải dùng cung đúng miền góc, không mặc định góc nhỏ.
- Dùng cung góc bán kính vừa phải, không cắt chữ, các vạch góc.
- Nếu góc hiển thị chỉ là hình minh họa không theo tỉ lệ, có thể ghi số đo được cho, nhưng không làm đồ thị trông quá mâu thuẫn khiến HS khó hiểu; khi đo góc bằng thước phải dựng đúng góc.

### 4.5. Đường tròn, dây, cát tuyến và tiếp tuyến

- Tâm O đúng vị trí hình học; mọi bán kính từ O đến điểm thuộc đường tròn bằng nhau theo mô hình.
- Dây AB có cả A và B trên đường tròn; đường kính AB còn phải đi qua tâm O.
- Tiếp tuyến tại T phải chỉ chung một điểm với đường tròn (trong hình học Euclid phẳng), bán kính OT vuông góc tiếp tuyến.
- Cát tuyến có hai giao điểm phân biệt khi thực sự cắt đường tròn; tiếp tuyến không được vẽ xuyên qua đường tròn.
- Góc ở tâm, góc nội tiếp, góc tạo bởi tiếp tuyến và dây phải có đỉnh đúng vị trí theo định nghĩa.
- Phân biệt góc ở tâm chắn cung nào; với cung lớn/nhỏ, cần thêm nhãn hoặc chiều tô.
- Với hai đường tròn: tách các trường hợp ngoài nhau, tiếp xúc ngoài, cắt nhau, tiếp xúc trong, chứa nhau; số giao điểm phải phù hợp với khoảng cách tâm và các bán kính.
- Các đường tròn đồng tâm phải có cùng một tâm; vành khăn gồm phần giữa hai đường tròn đồng tâm, không lẫn toàn bộ đĩa.

### 4.6. Tứ giác đặc biệt và họa tiết hình học

| Hình | Yêu cầu bất biến |
|---|---|
| Hình thang | Ít nhất một cặp cạnh đối song song; tùy định nghĩa SGK dùng cho hình thang cân/vuông |
| Hình bình hành | Hai cặp cạnh đối song song; đường chéo cắt nhau tại trung điểm mỗi đường |
| Hình chữ nhật | Bốn góc vuông; các cạnh đối song song/bằng nhau |
| Hình thoi | Bốn cạnh bằng nhau; hai đường chéo vuông góc và cắt nhau tại trung điểm |
| Hình vuông | Bốn cạnh bằng nhau, bốn góc vuông; tránh biểu diễn thành hình chữ nhật không đều trong hình 2D chuẩn |
| Đa giác đều | Các cạnh và góc bằng nhau; tâm/trục quay phù hợp |

Lưu ý: Venn/đồ hình lồng nhau **không** phải phép thay thế cho chứng minh quan hệ giữa các lớp hình nếu sơ đồ vẽ khiến người đọc hiểu nhầm các định nghĩa.

### 4.7. Phép dựng, Thalès, đồng dạng, tỉ số

- Khi cho `D∈AB`, `E∈AC`, `DE∥BC`, vẽ D trên AB, E trên AC, DE song song BC và đúng thứ tự điểm; không đổi D và E.
- Với điểm thuộc **đường thẳng** AB nhưng ngoài **đoạn** AB, phải kéo dài đúng phía; ký hiệu `D∈(AB)` không đồng nhất `D∈[AB]` trong diễn đạt ý nghĩa đoạn.
- Hình đồng dạng chỉ bảo toàn góc và tỉ số cạnh tương ứng; không cần cùng kích thước.
- Phải giữ đúng thứ tự tương ứng trong `△ABC ∼ △DEF`: A↔D, B↔E, C↔F.
- Với Menelaus: phân biệt điểm nằm trong đoạn và trên phần kéo dài; không tự đặt ba điểm trong ba cạnh khi điều kiện hình học thực yêu cầu một điểm ngoài cạnh.
- Với đường tròn ngoại tiếp/nội tiếp: điểm tiếp xúc, giao điểm và tâm phải đúng.

### 4.8. Kích thước, đo lường, thực hành

- Bài đọc thước/thước đo góc: có đơn vị chia và điểm gốc trùng đúng số 0.
- Hình có kích thước ghi bằng mũi tên kích thước/đường dóng cần bố trí không nhầm với vectơ.
- Khi ghi diện tích/chu vi: dùng `cm²`, `m²` cho diện tích; `cm`, `m` cho độ dài; không tô nhầm biên thay vì miền.
- Hình tỉ lệ, mô hình đồng dạng, bản đồ thu nhỏ: ghi rõ hệ số tỉ lệ `1:n` hoặc hệ số vị tự; bảo toàn tỉ số chiều dài.
- Đo góc/đo chiều dài chỉ được gán ý nghĩa định lượng nếu hình đủ chính xác để đo.

---

## 5. CÁC PHÉP BIẾN HÌNH VÀ MÔ HÌNH ĐỘNG 2D

### 5.1. Đối xứng trục

- Trục đối xứng là đường thẳng được xác định; ảnh A' của A thỏa đường nối AA' vuông góc trục và trung điểm AA' nằm trên trục.
- Điểm nằm trên trục bất động; nếu nhãn trùng phải tránh nhân đôi không cần thiết.
- Hình đối xứng không được quay hoặc tịnh tiến thay cho phản xạ.
- Nếu dùng hoạt họa, giữ lại đường nối điểm-ảnh và chân vuông góc như đối tượng phụ theo từng bước.

### 5.2. Đối xứng tâm, phép quay

- Phép đối xứng tâm O: O là trung điểm AA'; tương đương quay 180° quanh O trong mặt phẳng.
- Phép quay tâm O góc α: bảo toàn khoảng cách OA=OA', xác định đúng chiều kim đồng hồ/ngược chiều kim đồng hồ theo quy ước.
- Góc quay trong hệ tọa độ Descartes thông thường là dương theo chiều ngược kim đồng hồ, nếu không có quy ước khác.

### 5.3. Tịnh tiến và vị tự

- Phép tịnh tiến theo vectơ v: mọi điểm dịch cùng một vectơ; không thay đổi độ dài, góc, hướng.
- Phép vị tự tâm O hệ số k: `\overrightarrow{OA'}=k\overrightarrow{OA}`; k<0 thì ảnh nằm phía đối diện tâm; nếu k=0 làm co về O và cần xử lý trường hợp suy biến.
- Không dùng phép kéo giãn độc lập x, y khi muốn mô tả phép vị tự hoặc phép đồng dạng.

### 5.4. Hình khai triển (nets)

- Số mặt, kích thước, cạnh ghép và quan hệ kề nhau phải đúng.
- Hình lập phương: sáu hình vuông bằng nhau, cấu trúc khai triển phải gấp được thành lập phương, không chồng mặt.
- Lăng trụ đứng: mặt xung quanh là các hình chữ nhật có kích thước đúng, hai đáy đồng dạng bằng nhau thực sự.
- Hình trụ: hai hình tròn bằng nhau và một hình chữ nhật có một cạnh bằng chu vi đáy `2πr`, cạnh kia bằng chiều cao h.
- Hình nón: một hình tròn đáy và một hình quạt tròn bán kính bằng đường sinh `l`, độ dài cung bằng chu vi đáy `2πr`.
- Hình chóp đều: mặt bên là các tam giác cân thích hợp, cùng đỉnh chóp khi gấp; lưu ý đường cao mặt bên khác đường cao khối chóp.
- Trong hình động, hiệu ứng gấp/mở không được kéo méo mặt, sai cạnh bản lề hoặc xuyên nhau.

---
## 6. HÌNH HỌC KHÔNG GIAN, PHÉP CHIẾU VÀ HÌNH KHỐI

### 6.1. Bản chất hình biểu diễn

Trong hình học không gian học đường, hình 3D thường được thể hiện trên mặt phẳng bằng **phép chiếu song song**; khi chọn một phép chiếu song song không suy biến thích hợp trên các đối tượng được xét:

- Tính **thẳng hàng** được bảo toàn.
- Tính **song song** của các đường được bảo toàn theo nghĩa ảnh là hai đường song song hoặc trùng nhau, miễn là chúng không suy biến thành điểm trong hướng chiếu.
- **Tỉ số có hướng** của các đoạn thẳng trên cùng một đường thẳng được bảo toàn; tỉ số độ dài của các đoạn trên các đường song song cũng được bảo toàn trong trường hợp tương ứng không suy biến.
- **Trung điểm** được bảo toàn.
- **Độ dài tuyệt đối, số đo góc, vuông góc, diện tích thật của mặt**, nói chung, **không được bảo toàn**.
- Hai đường **chéo nhau** trong 3D có thể có ảnh phẳng cắt nhau; điểm ảnh giao nhau không chứng minh chúng cắt nhau thực.
- Một đường thẳng song song với phương chiếu có thể cho ảnh là một **điểm**; do đó mọi khẳng định 'ảnh của đường luôn là đường' phải kèm điều kiện không suy biến.

**Hệ quả:** hình vuông trên mặt phẳng nghiêng có thể hiện thành hình bình hành; đường tròn nghiêng có thể hiện thành elip; trong hình chiếu vuông góc, đường tròn song song mặt phẳng chiếu hiện đúng tròn, còn nếu mặt phẳng tròn chứa hướng nhìn có thể suy biến thành đoạn thẳng. Không được tuyên bố 'mọi hình tròn trong không gian luôn thành elip' mà thiếu ngoại lệ.

**Phân biệt hai chế độ:**

- `PARALLEL_PROJECTION / ORTHOGRAPHIC`: ưu tiên cho hình biểu diễn và bài toán song song, tỉ số, giao tuyến.
- `PERSPECTIVE_CAMERA`: cho trải nghiệm 3D tự nhiên; đường song song trong thế giới có thể hội tụ trên màn hình; nếu người học cần suy luận hình học affine, không dùng ảnh phối cảnh làm cơ sở để khẳng định quan hệ song song biểu kiến.

### 6.2. Nét thấy, nét khuất và đường phụ

| Vai trò | Nét gợi ý | Điều kiện |
|---|---|---|
| Cạnh trước, biên thấy | Liền đậm | Trước mặt quan sát, không bị mặt che |
| Cạnh sau, phần khuất | Đứt đều | Bị mặt khối chắn trong phương nhìn hiện tại |
| Đường dựng phụ | Liền mảnh hoặc nét phụ có chủ đích | Không nhầm với cạnh chính |
| Đường cao/đoạn vuông góc | Mảnh, nhấn khi cần | Ký hiệu vuông góc đúng ngữ nghĩa |
| Giao tuyến cần xác định | Màu nhấn khi được phép lộ | Phải chính là giao giữa hai mặt |
| Mặt phẳng phụ | Đường viền tinh và tô mờ | Không che chữ hoặc cấu trúc phía sau |
| Phần kéo dài đường | Mảnh/đứt phân biệt | Không ngụ ý có cạnh hình khối ở đoạn kéo dài |

**Nét đứt có nhiều vai trò có thể gây nhập nhằng:** không đồng nhất 'nét đứt' với 'cạnh khuất' trong mọi hình; đường dựng phụ có thể dùng nét đứt. Nếu hai ý nghĩa đồng thời xuất hiện, dùng chú giải hoặc phân biệt màu + chiều dày + kiểu gạch.

### 6.3. Hình chóp tam giác và tứ giác

- Hình chóp `S.ABC` có đáy là tam giác ABC; đỉnh S **không thuộc** mặt phẳng ABC; ba mặt bên lần lượt `SAB`, `SBC`, `SCA`.
- Hình chóp `S.ABCD` có đáy ABCD là tứ giác; ký hiệu đỉnh theo vòng quanh đáy.
- Đỉnh S nên được đặt đủ cách xa đường bao đáy trong ảnh để cạnh không gần trùng, nhưng không đổi tọa độ thật nếu mô hình đã xác định.
- Hình chóp **đều**: đáy là đa giác đều, hình chiếu vuông góc của đỉnh lên đáy là tâm của đáy; cạnh bên bằng nhau; mặt bên cân. Hình chóp đều không mặc nhiên có mọi cạnh bằng nhau (điều đó là trường hợp đặc biệt, chẳng hạn tứ diện đều).
- Chân đường cao H của hình chóp bất kỳ không mặc nhiên trùng tâm/trọng tâm đáy. Chỉ gán theo đúng giả thiết.
- Nếu `SA ⟂ (ABC)` thì chân đường cao là **A**, không chuyển thành tâm O để làm hình cân đối.
- Nếu đề cho đáy là hình bình hành/hình chữ nhật/hình vuông, phải dựng đúng tính chất trong **3D thực**, không bắt cạnh ảnh hiển thị vuông góc đối với hình chiếu nghiêng.

### 6.4. Lăng trụ, hình hộp, hình lập phương

- Lăng trụ có hai đáy là hai đa giác bằng nhau nằm trên hai mặt phẳng song song; các cạnh bên song song và bằng nhau.
- Hình lăng trụ đứng có cạnh bên vuông góc đáy (trong không gian thực); ảnh 2D có thể không vuông góc.
- Hình hộp là lăng trụ có đáy hình bình hành; sáu mặt là hình bình hành.
- Hình hộp chữ nhật có ba kích thước vuông góc trong thế giới thực; hình biểu diễn thường thành các hình bình hành.
- Hình lập phương có 12 cạnh bằng nhau thực; hình chiếu có thể cho ba nhóm cạnh nhìn thấy với chiều dài khác nhau.
- Đặt tên đỉnh theo đúng hệ thống: `ABCD.A'B'C'D'` với A' tương ứng A; không nối chéo nhầm giữa hai đáy.
- Nếu mô hình cần chứng minh hai đường thẳng song song, giữ vector phương và đánh dấu đúng đường.

### 6.5. Hình trụ, hình nón, hình cầu

**Hình trụ tròn xoay:**
- Hai đáy là hai hình tròn cùng bán kính trong hai mặt phẳng song song; trục vuông góc với đáy; đường sinh song song trục.
- Ở hình chiếu song song thông thường, hai đáy được vẽ elip giống nhau; phần khuất của đường elip thường dùng nét đứt, tùy góc nhìn.
- Hình trụ đứng không được mặc nhiên vẽ như hình nón cụt; hai đường sinh biên nên song song theo loại phép chiếu đang dùng.

**Hình nón tròn xoay:**
- Một đỉnh, một đáy tròn; trục đi qua đỉnh và tâm đáy, vuông góc đáy.
- Phải phân biệt bán kính r, chiều cao h và **đường sinh l**: `l² = h² + r²` cho nón tròn xoay.
- Đường sinh biên là tiếp tuyến đường bao chiếu phù hợp; không tùy tiện nối từ đỉnh đến hai điểm không tạo đúng đường bao thấy được.

**Hình cầu:**
- Mọi điểm trên mặt cầu cách tâm một khoảng R; hình bao của hình cầu dưới chiếu vuông góc là đường tròn.
- Đường xích đạo, vĩ tuyến và thiết diện nếu hiển thị có thể thành elip; phần khuất cần thể hiện đúng khi cần đọc 3D.
- Phân biệt **mặt cầu** (bề mặt) với **khối cầu** (phần bên trong và biên).

### 6.6. Giao điểm, giao tuyến, thiết diện và đường chéo nhau

- Giao tuyến hai mặt phẳng là đường thẳng thực thuộc cả hai mặt; nếu song song riêng biệt không có giao tuyến.
- Giao điểm đường thẳng và mặt phẳng phải nằm đồng thời trên đường và mặt. Nếu đường thuộc hẳn mặt phẳng, giao là cả đường, không tự chọn một điểm.
- Thiết diện của khối đa diện bởi mặt phẳng cắt phải có các đỉnh nằm trên **các cạnh hoặc mặt** tương ứng; các cạnh của thiết diện nằm trong mặt cắt **và mặt của khối**.
- Đường nối hai điểm chỉ là cạnh thiết diện khi hai điểm nằm trên cùng một mặt của khối và đoạn nối đúng phần giao; không nối chỉ vì gần nhau trên ảnh.
- Đối với đoạn/cạnh bị che, hệ thống được phép chia thành nhiều **đoạn thấy và đoạn khuất**; không bắt toàn cạnh có một kiểu nét khi thực tế bị che từng phần.
- Với hai đường chéo nhau: vẽ sao cho có thể phân biệt chiều sâu bằng che khuất/lớp, không đặt chấm giao trên ảnh nếu không có giao điểm 3D.
- Với các bài đồng phẳng, đồng quy, ba đường thẳng cùng đi qua một điểm: chỉ vẽ kết luận khi đã là giả thiết/được chứng minh/trong trạng thái hiển thị lời giải.

### 6.7. Góc và khoảng cách không gian

- Góc giữa hai đường thẳng: phải dựng hai đường song song tương ứng **qua một điểm** nếu chúng không giao nhau; góc đo trong không gian thực, không phải từ góc giữa hai nét ảnh.
- Góc giữa đường thẳng và mặt phẳng là góc nhọn hoặc vuông giữa đường thẳng và hình chiếu vuông góc của nó lên mặt phẳng (theo định nghĩa áp dụng); không ghi một góc ảnh chiếu tùy ý.
- Góc nhị diện phải dựng đúng giao tuyến và hai nửa mặt phẳng; góc phẳng nhị diện cần hai tia cùng vuông góc cạnh nhị diện trong hai mặt.
- Khoảng cách từ điểm đến mặt phẳng: chân H thuộc mặt phẳng và `PH ⟂ (α)`; hình chiếu có thể không hiển thị thành 90°.
- Khoảng cách giữa hai đường chéo nhau: đoạn vuông góc chung có hai đầu nằm trên hai đường, vuông góc **cả hai**.
- Không dùng độ dài pixel của hình biểu diễn để tính khoảng cách không gian.

---

## 7. MÔ HÌNH 3D TƯƠNG TÁC, CẠNH KHUẤT VÀ CAMERA

### 7.1. Mô hình thực và camera

Mô hình 3D phải được dựng bằng tọa độ thế giới `(x,y,z)` và các ràng buộc; **camera** chỉ biến đổi vị trí quan sát. Khi xoay hình bằng chuột:

1. Không được làm đổi độ dài, góc hay quan hệ thật của mô hình.
2. Tính lại phần mặt quay ra/tránh camera, đường bao, cạnh khuất và vị trí nhãn.
3. Không giữ nguyên đồ họa nét khuất từ ảnh chụp trước khi xoay.
4. Không làm nhãn và các đường phụ xoay sai trục; vị trí nhãn nên bám điểm tham chiếu.
5. Có thể có chế độ hiển thị xuyên khối (`x-ray`) nhưng phải ghi rõ; chế độ này không đồng nghĩa với nét thấy/khuất vật lý.

### 7.2. Tương tác giáo dục

- Kéo xoay tự do, phóng to/thu nhỏ, reset góc nhìn, xem từ trên/cạnh/trước, bật/tắt mặt và cạnh, tùy chỉnh trong suốt.
- Chọn điểm/cạnh/mặt phải có phản hồi nổi bật, không thay đổi tên thực thể.
- Khi kéo thả một **điểm tự do**, mọi điểm phụ thuộc phải cập nhật theo quan hệ đã định; khi kéo điểm bị ràng buộc trên đường thì không được ra khỏi đường.
- Với điểm giao được xác định bằng hai đối tượng, cần cập nhật lại giao điểm; nếu giao không còn tồn tại, không giữ tọa độ giao cũ.
- Khi mô hình suy biến (ba điểm thẳng hàng không xác định mặt phẳng duy nhất, bán kính bằng 0, hai mặt trùng nhau...), phải cảnh báo thay vì vẽ hình bất hợp thức.
- Đảm bảo điều khiển được bằng chuột, cảm ứng và nếu có thể bằng bàn phím; cung cấp mô tả văn bản cho thao tác khó.

### 7.3. Thuật toán che khuất được đề xuất

- Lấy các đỉnh, cạnh và mặt trong hệ tọa độ thế giới.
- Tính phép biến đổi camera, phép chiếu màn hình.
- Kiểm tra mặt trước/sau và **depth test**/ray casting hoặc kỹ thuật giao tuyến theo chiều sâu để nhận diện cạnh bị che.
- Chia cạnh thành các khoảng hiển thị và bị khuất; render theo từng khoảng.
- Với mặt trong suốt, xác định chế độ hiển thị qua mặt và ưu tiên đọc hiểu thay vì mô phỏng ánh sáng cầu kỳ.
- Sắp xếp nhãn sau bước dựng hình theo thuật toán chống va chạm.
- Kiểm tra hình sau mỗi lần thay camera và mỗi lần kéo đối tượng.

### 7.4. Trường hợp không nên dùng phối cảnh

- Khi bài dạy đòi hỏi HS đọc trực tiếp quan hệ song song trên hình 2D.
- Khi cần bảo toàn tỉ số, trung điểm theo hình chiếu song song.
- Khi học sinh dễ nhầm đường 3D chéo nhau thành cắt nhau vì ảnh phối cảnh.

Có thể có hai tab/chế độ: **Hình biểu diễn** (phép chiếu song song chuẩn học đường) và **Xem 3D** (phối cảnh trực quan). Không trộn lẫn quy tắc của hai chế độ.

---

## 8. MẶT PHẲNG TỌA ĐỘ, TRỤC SỐ VÀ TẬP HỢP

### 8.1. Trục số và biểu diễn khoảng

- Trục số có chiều dương tăng về bên phải, trừ khi có chú giải khác; gốc `0` hoặc `O` phải có nhãn.
- Các đơn vị bằng nhau trên cùng trục cách đều nhau; số âm nằm trái 0, số dương nằm phải 0.
- Vẽ các điểm `a`, `b`, `0`, `1`, `-1` theo thứ tự thật của giá trị; chú ý `-3 < -1`.
- Khoảng `(a,b)`: hai đầu mút không thuộc; dùng vòng tròn rỗng/ngoặc phù hợp.
- Đoạn `[a,b]`: cả hai đầu mút thuộc; dùng chấm đặc/ngoặc vuông.
- Nửa khoảng `(a,b]`, `[a,b)`: mỗi đầu biểu diễn đúng quan hệ bao hàm.
- Với `(-∞,a)`, `(-∞,a]`, `(a,+∞)`, `[a,+∞)`: vô cực **không có đầu mút** và luôn dùng dấu ngoặc tròn tại vô cực trong ký hiệu khoảng.
- Giao, hợp của các khoảng cần vẽ màu, hatching hoặc nhiều hàng tách biệt tránh nhầm; không gộp khoảng rời thành một đoạn liền.
- Với số vô tỉ/biểu thức căn, dùng biểu thức chính xác ở nhãn nếu cần; không thay bằng số thập phân làm tròn mà không ghi `≈`.

### 8.2. Mặt phẳng Oxy

- Thông thường `Ox` ngang sang phải, `Oy` thẳng đứng đi lên; gốc `O` trùng giao điểm hai trục.
- Điểm `M(x;y)` đặt tại giao của đường qua x và y tương ứng; khi hai thang đo khác nhau, phải thể hiện độ chia riêng.
- Lưới nền phải nhạt hơn trục và đồ thị; vạch chia đều theo từng trục.
- Không tự đặt `1` tại hai khoảng cách ảnh bằng nhau nếu hai trục đã khai báo tỉ lệ khác nhau.
- Khi vẽ hình tròn, góc, phép quay và minh họa độ dài Euclid trong Oxy, dùng **tỉ lệ đơn vị ngang/dọc bằng nhau** hoặc chú thích biến dạng và tuyệt đối không yêu cầu đo từ hình bị biến dạng.
- Không nối các điểm theo thứ tự nhập thành một đường liên tục nếu dữ liệu chỉ là các điểm rời rạc.

### 8.3. Hệ trục Oxyz

- Ba trục `Ox`, `Oy`, `Oz` có chung gốc O, đôi một vuông góc trong không gian thực; hình chiếu 2D thường **không có ba góc 90°**.
- Không bắt buộc luôn đặt `Ox` sang phải, `Oy` chéo trái, `Oz` hướng lên; đó chỉ là một bố trí học đường gợi ý. Phải duy trì hệ tọa độ tay phải nếu đang dùng quy ước định hướng đó.
- Dùng tọa độ điểm `A(x;y;z)` hoặc quy cách dấu phân tách đang dùng trong tài liệu; không đảo x/y/z khi đổi góc nhìn.
- Đơn vị trên các trục phải được khai báo nếu cần đo; với số liệu vật lý ba đại lượng khác đơn vị cần phân biệt mô hình 3D từ biểu đồ dữ liệu 3D.
- Đường thẳng, mặt phẳng và mặt cầu dựng theo phương trình/điểm-vectơ pháp tuyến thực, không vẽ theo phỏng đoán chỉ từ hình 2D.

### 8.4. Sơ đồ tập hợp, Venn và quan hệ logic

- Đường bao tập hợp biểu diễn tập điểm/phần tử thuộc tập, không đơn thuần là hình trang trí.
- Nếu `A ⊆ B`, toàn bộ miền A nằm trong B; nếu A và B rời nhau, không có vùng giao.
- `A∪B`: tô phần thuộc ít nhất một tập; `A∩B`: tô phần thuộc cả hai; `A\B`: tô phần thuộc A nhưng không B; `A^c`: phần ngoài A **trong tập vũ trụ U**.
- Với ba tập, phải kiểm tra đủ 8 miền logic nếu bài cần phân biệt; không bỏ sót miền giao ba tập.
- Không mặc định Venn circles có diện tích tỉ lệ số phần tử; nếu cần **biểu đồ Venn theo diện tích**, cần thuật toán đặc biệt, định nghĩa sai số và thông báo xấp xỉ.
- Với tập rỗng không thể hiện một phần tử minh họa bên trong.
- Trong sơ đồ Euler, chỉ vẽ các miền thực sự tồn tại; khi cần đủ các tổ hợp giao, dùng Venn.

### 8.5. Miền nghiệm bất phương trình bậc nhất hai ẩn

- Đường biên `ax+by=c` phải dựng đúng từ phương trình.
- Bất phương trình nghiêm ngặt `<, >`: đường biên **không thuộc** miền nghiệm; thường dùng nét đứt/nhạt.
- Bất phương trình không nghiêm ngặt `≤, ≥`: đường biên **thuộc** miền nghiệm; thường dùng nét liền.
- Dùng điểm thử không nằm trên đường biên (thường chọn O nếu phù hợp) để quyết định nửa mặt phẳng tô; không tô theo vị trí 'bên trên' một cách máy móc khi phương trình tổng quát.
- Với hệ bất phương trình, chỉ tô **giao** tất cả các miền nghiệm; nếu dùng nhiều lớp màu, cần có một lớp kết quả chung dễ đọc.
- Đỉnh miền nghiệm là giao của các đường biên tương ứng khi các đường ấy thuộc/giới hạn miền; kiểm tra miền rỗng, không bị chặn, đoạn biên bị loại.
- Trong bài toán quy hoạch tuyến tính, đường mục tiêu `z=ax+by` là một họ đường mức; tối ưu tại đỉnh chỉ khi miền và giả thiết bảo đảm, không vẽ biểu diễn một đỉnh tối ưu nếu chưa kiểm tra.

---

## 9. ĐỒ THỊ HÀM SỐ: QUY TẮC NỀN TẢNG

### 9.1. Những thuộc tính phải biết trước khi vẽ

1. Phương trình hay hàm số gốc và biến độc lập/phụ thuộc.
2. **Tập xác định D**; các miền bị cấm, điều kiện mẫu khác 0, logarit dương, căn chẵn không âm, v.v.
3. Các nghiệm/giao trục, điểm đầu mút, điểm loại trừ (lỗ), điểm không liên tục.
4. Cực trị, tính đơn điệu, đối xứng, tuần hoàn, giới hạn và tiệm cận nếu liên quan.
5. Miền hiển thị (`viewport`) được chọn theo đặc trưng toán học.
6. Đơn vị các trục và thang đo; nếu độ/x không phải đơn vị hình học thì ghi rõ.
7. Hình có phải mô tả **một hàm y=f(x)** hay quan hệ ẩn như đường tròn, elip, hypebol.

### 9.2. Trục, nhãn và lưới

- Hiển thị O, x, y, chiều dương, các vạch 1, −1 nếu giúp đọc.
- Hai trục có thể có thang đo khác nhau, nhất là với đồ thị kinh tế/đo lường; phải hiển thị rõ mức chia và đơn vị.
- Không đặt cùng một số hai lần đè lên trục; gốc `O` không nên bị nhầm chữ số `0` trong đề.
- Đường đồ thị dày hơn lưới, khác trục; nhãn `y=f(x)` hoặc `(C)` không che đường cong.
- Khi minh họa hàm lượng giác, nên vạch các mốc theo `π/2`, `π`, `3π/2`, `2π`; không dùng số độ trên trục được ghi là radian.

### 9.3. Lấy mẫu và nối đường

- Không nối điểm nằm ở hai **nhánh cách nhau bởi một điểm không xác định hoặc tiệm cận đứng**.
- Lấy mẫu thích nghi: vùng cong nhiều/dao động nhanh cần mật độ cao hơn; vùng gần tiệm cận cần cắt nét có kiểm soát.
- Với đường thẳng, đường bậc hai, có thể dựng chính xác theo hình học hoặc đường Bézier phù hợp nhưng phải bảo đảm đúng điểm đặc biệt.
- Với hàm không trơn (|x|, hàm từng đoạn, căn có điểm đầu, dấu, hàm sàn), dùng các đoạn riêng, không 'làm mượt' qua góc nhọn/điểm gián đoạn.
- Đường cong chỉ được cắt tại khung hiển thị; tránh tạo ra 'đầu mút giả' khiến người xem tưởng đồ thị kết thúc tại biên khung.

### 9.4. Điểm mở, điểm kín và điểm không xác định

- Dấu **chấm đặc** tại điểm được bao gồm (nếu cần biểu diễn rõ thuộc/không thuộc).
- Dấu **vòng tròn rỗng** ở đầu mút không bao gồm hoặc lỗ của đồ thị.
- Một điểm `x=a` có thể có giới hạn hai phía, nhưng `f(a)` khác giới hạn: vòng rỗng tại giá trị giới hạn, chấm đặc tại `(a,f(a))`.
- Không dùng chấm đặc tại tiệm cận hay điểm loại trừ.
- Khi dùng đồ thị của Desmos hoặc phần mềm khác, có thể phải **thêm riêng chấm rỗng**; không mặc định phần mềm tự hiển thị lỗ.

### 9.5. Tiệm cận, giới hạn

- Tiệm cận đứng `x=a` khi có ít nhất một giới hạn một phía vô cực thích hợp; **không** kết luận chỉ vì mẫu bằng 0.
- Tiệm cận ngang `y=L` khi `lim_{x→+∞} f(x)=L` hoặc `lim_{x→−∞} f(x)=L`; các phía có thể có tiệm cận ngang khác nhau.
- Tiệm cận xiên `y=ax+b` với `a ≠ 0` khi `f(x)-(ax+b)→0` ở một đầu vô cực liên quan.
- Đường đồ thị có thể **cắt** tiệm cận ngang hoặc xiên; không đặt quy tắc cấm cắt.
- Nét tiệm cận thường mảnh, đứt và có nhãn phương trình; không để trùng với nét thể hiện phần khuất không gian gây nhầm.

### 9.6. Chọn viewport hợp lý

Tự động chọn cửa sổ theo dữ liệu: tìm nghiệm/giao trục, cực trị, tiệm cận, giá trị đặc biệt; sau đó thêm biên an toàn. Nếu gần điểm tiệm cận có giá trị rất lớn, cần giới hạn khung dọc để tránh nén toàn bộ phần quan trọng.

**Không** mặc định mọi đồ thị đều dùng `x∈[-10,10]`, `y∈[-10,10]`; với hàm nhỏ, lớn, dịch chuyển, logarit, hàm mũ hoặc cực trị ngoài khoảng đó, khung cố định có thể cho hình không có giá trị dạy học.

### 9.7. Đồ thị từ dữ liệu so với đồ thị hàm

- **Đồ thị hàm:** được xác định bởi công thức hoặc quy luật toán học, có thể dựng liên tục trên các khoảng xác định nếu điều kiện cho phép.
- **Đường nối số liệu:** chỉ nối khi trục x có thứ tự và ý nghĩa nội suy/diễn biến theo biến liên tục hoặc theo thời gian; không được suy luận đường cong thật chỉ từ ít điểm mẫu.
- **Biểu đồ phân tán:** giữ nguyên các điểm dữ liệu, không nối thành đường hàm nếu chưa có mô hình phù hợp.

---

## 10. ĐỒ THỊ CÁC HỌ HÀM SỐ VÀ CÁC NGOẠI LỆ QUAN TRỌNG

| Họ hàm / quan hệ | Điểm cần kiểm định | Lỗi AI thường gặp |
|---|---|---|
| `y=ax+b` (`a≠0`) | Độ dốc, giao trục, đi qua hai điểm kiểm chứng | Đảo dấu a làm đường dốc sai |
| `y=ax²+bx+c` (`a≠0`) | Đỉnh, trục đối xứng, hướng mở, giao Ox theo Δ | Vẽ hai nghiệm khi Δ<0; đặt sai đỉnh |
| `y=ax³+bx²+cx+d` | Giao trục, cực trị thực, điểm uốn nếu cần | Bịa thêm cực trị khi đạo hàm không có hai nghiệm phân biệt |
| `y=ax⁴+bx²+c` | Hàm chẵn, đối xứng trục Oy, đúng số cực trị | Vẽ lệch đối xứng |
| `y=(ax+b)/(cx+d)` | Tập xác định, tiệm cận, lỗ/điểm suy biến | Cứ c x + d =0 là tiệm cận đứng |
| Phân thức tổng quát | Rút gọn có điều kiện, lỗ, tiệm cận | Tự lấp lỗ sau khi khử nhân tử |
| `y=|g(x)|` | Phần âm của g phản xạ lên phía trên Ox | Vẽ chữ V ở mọi vị trí, dù g phức tạp |
| `y=√g(x)` | `g(x)≥0`, `y≥0`, điểm đầu hợp lệ | Vẽ qua miền g<0 |
| `y=1/√g(x)` | `g(x)>0`, không có điểm ở g=0 | Cho chấm đặc đầu đoạn |
| `y=log_a x` | `a>0,a≠1,x>0`, qua (1,0), tiệm cận x=0 | Vẽ cả x≤0 |
| `y=a^x` | `a>0,a≠1`, luôn y>0, qua (0,1) | Cắt trục Ox khi không có dịch chuyển |
| `sin x`, `cos x` | Chu kỳ 2π, biên độ 1, chẵn/lẻ đúng | Nhầm độ với rad; sai mốc 0 |
| `tan x` | Chu kỳ π, tiệm cận x=π/2+kπ | Nối qua tiệm cận |
| `cot x` | Chu kỳ π, tiệm cận x=kπ | Nối qua tiệm cận |
| Hàm từng đoạn | Điều kiện từng nhánh, đầu mút | Chấm đặc và rỗng đảo |
| Hàm dấu/sàn/phần lẻ | Bước nhảy, miền, điểm tại số nguyên | Nội suy mượt bậc thang |
| Đường tròn/ellipse/hyperbola/parabola | Phương trình conic, tâm/tiêu điểm/tiệm cận | Nhầm đồ thị ẩn với một hàm y=f(x) |

### 10.1. Bậc nhất và bậc hai (lớp 8–10 tùy bài)

- Với `y=ax+b`, lấy hai điểm kiểm chứng độc lập, tránh chọn hai điểm trùng khi a nhỏ.
- Với `y=ax²+bx+c`, `x_đỉnh=-b/(2a)` và `y_đỉnh=f(x_đỉnh)`; trục đối xứng `x=x_đỉnh`; hướng mở do dấu a.
- `Δ=b²-4ac`: Δ>0 cắt Ox tại 2 điểm; Δ=0 tiếp xúc Ox; Δ<0 không cắt Ox.
- Đừng ghi hàm `y=x²` có đỉnh tại (1,0) hoặc parabol hẹp/vênh do lệch trục.

### 10.2. Bậc ba và bậc bốn lớp 12

- Dựa vào đạo hàm để xác định số cực trị và khoảng đơn điệu trước khi chọn nét cong.
- Với hàm bậc ba có đạo hàm bậc hai Δ≤0 phù hợp, không xuất hiện hai cực trị phân biệt; có thể có điểm dừng không phải cực trị.
- Với hàm bậc bốn trùng phương, đồ thị đối xứng qua Oy; số cực trị tùy a, b; không tự đặt dạng W/M nếu điều kiện chưa phù hợp.
- Bảng biến thiên đi kèm phải **khớp tuyệt đối** với các cực trị và nhánh đồ thị.

### 10.3. Phân thức hữu tỉ: phân biệt lỗ và tiệm cận

**Ví dụ bắt buộc để thử AI:**

`f(x)=(x²−1)/(x−1), x≠1`  
Vì `f(x)=x+1` **chỉ trên miền x≠1**, hình là đường `y=x+1` có **lỗ tại (1,2)**. Không có tiệm cận đứng `x=1`. AI sai nếu vẽ cả đường thẳng liền hoặc thêm đường tiệm cận đứng.

**Ví dụ khác:**

`g(x)=1/(x−2)`: miền `x≠2`, tiệm cận đứng `x=2`, tiệm cận ngang `y=0`; hai nhánh không được nối băng qua x=2.

**Lưu ý mở rộng:** nếu mẫu bằng 0 nhưng tử cũng bằng 0, phải xét nhân tử chung và giới hạn để quyết định là lỗ hay tiệm cận; có trường hợp cả hai yếu tố xuất hiện theo bội số khác nhau. Luôn xét **biểu thức gốc và miền xác định gốc**, không chỉ biểu thức rút gọn.

### 10.4. Căn, trị tuyệt đối, mũ và lôgarit

- Hàm căn `√(x−a)` bắt đầu tại x=a, y=0 với chấm đặc nếu miền là `[a,+∞)`.
- `√(x²−1)` có hai nhánh xác định `(-∞,-1]∪[1,+∞)`, **không** nối qua `(-1,1)`.
- `|x|` có góc nhọn tại O; không làm tròn đỉnh bằng smoothing.
- `e^x` và `a^x` (a>0,a≠1) không cắt trục Ox trong dạng cơ bản; nếu có tịnh tiến dọc, kiểm tra tiệm cận mới.
- `log_a x` có x>0, đường qua (1,0), tăng khi a>1, giảm khi 0<a<1; các phép biến đổi `log_a(g(x))` đòi điều kiện g(x)>0.

### 10.5. Hàm lượng giác và lượng giác hình học

- Mặc định dùng **radian** cho đồ thị lớp 11 nếu bài không quy định khác; trên trục x biểu diễn các bội của π, 2π.
- `sin x` đi qua (0,0) theo chiều tăng tại O; `cos x` đi qua (0,1); không đảo hai hình.
- `tan x` qua O và tăng trên từng nhánh; `cot x` giảm trên từng nhánh cơ bản.
- `a sin(bx+c)+d`: biên độ `|a|`, chu kỳ `2π/|b|` (b≠0), trục trung bình y=d; kiểm tra pha c/b.
- Không được tự nối điểm cuối và đầu chu kỳ qua chỗ gián đoạn của tan/cot.
- Trên đường tròn lượng giác: góc dương ngược chiều kim đồng hồ, góc âm theo chiều kim đồng hồ trong hệ chuẩn; phân biệt sin là tung độ, cos là hoành độ của điểm trên đường tròn đơn vị.

### 10.6. Quan hệ conic và tọa độ phẳng

- Parabol: đỉnh, trục, tiêu điểm, đường chuẩn và các tham số phải khớp dạng phương trình đang dùng.
- Elip: hai tiêu điểm thực nằm trên trục lớn, `a²=b²+c²` theo ký hiệu thường dùng; trục lớn không thể ngắn hơn trục nhỏ.
- Hypebol: hai nhánh không nối nhau; các tiệm cận đúng độ dốc. Không nhầm conic với đồ thị phân thức tịnh tiến.
- Đường tròn `(x−a)²+(y−b)²=R²`: tâm `(a,b)`, bán kính R>0; đặt tỉ lệ x/y bằng nhau khi muốn nhìn đúng tròn.
- Nên hiển thị thẻ ghi **quan hệ ẩn** cho conic khi nó không thể biểu diễn toàn phần bởi một hàm đơn trị y=f(x).

### 10.7. Tích phân và biểu diễn diện tích lớp 12

- Miền tô giữa hai đồ thị chỉ gồm các x trong khoảng tích phân được yêu cầu; xác định đồ thị nào nằm trên theo từng khoảng.
- Nếu hai đồ thị đổi thứ tự, miền diện tích hình học phải chia theo giao điểm và dùng giá trị tuyệt đối hoặc tổ hợp tích phân đúng; không tô nhầm diện tích có dấu thành diện tích thông thường.
- Với tích phân xác định `∫_a^b f(x) dx`, biểu diễn **diện tích đại số có dấu** nếu phần nằm dưới Ox; không viết 'diện tích' luôn bằng tích phân khi f đổi dấu.
- Đầu mút a,b đúng; các đường thẳng x=a và x=b nếu được yêu cầu cần hiển thị rõ.
- Đồ thị nguyên hàm phải phản ánh hằng số cộng C (các đường có thể tịnh tiến dọc), không mặc định chỉ có một nguyên hàm.

---

## 11. BẢNG BIẾN THIÊN, BẢNG DẤU, MIỀN NGHIỆM VÀ VÙNG DIỆN TÍCH

### 11.1. Bảng biến thiên (BBT)

BBT không phải một hình đường cong tùy ý. Cần các hàng tối thiểu (theo bối cảnh):

- Hàng `x`: các mốc hữu hạn thực, vô cực, điểm loại khỏi miền xác định, điểm tới hạn.
- Hàng `f'(x)` hoặc dấu của đạo hàm: `+`, `−`, `0`, dấu không xác định; phân biệt các khoảng.
- Hàng `f(x)`: các giá trị/giới hạn và mũi tên tăng/giảm tương ứng.
- Vạch đôi/tách cột nếu cần thể hiện điểm không thuộc miền xác định.

**Quy tắc bắt buộc:**

1. Dấu `f'>0` tương ứng mũi tên đi lên từ trái sang phải; `f'<0` là đi xuống.
2. Điểm đạo hàm bằng 0 không mặc nhiên là cực trị; dấu đạo hàm có thể không đổi.
3. Tại điểm không thuộc D, không có `f(a)`; phải dùng giới hạn một phía hoặc dấu cách phù hợp.
4. Nếu `lim_{x→a−}f(x)=+∞` và `lim_{x→a+}f(x)=−∞` thì hai nhánh xung quanh cột loại phải khớp.
5. Giá trị cực đại/cực tiểu của đồ thị phải khớp hàng `f(x)`; không được để BBT và hình vẽ mâu thuẫn.
6. Cực trị địa phương khác giá trị lớn nhất/nhỏ nhất toàn cục; không gắn nhãn nhầm.

### 11.2. Bảng xét dấu

- Phải liệt kê nghiệm thực và điểm không xác định theo thứ tự tăng dần.
- Nghiệm bội chẵn của nhân tử có thể khiến dấu không đổi khi qua nghiệm; bội lẻ đổi dấu, nếu các điều kiện khác không làm thay đổi quy tắc.
- Điểm bằng 0 và điểm loại khỏi miền không được dùng cùng ký hiệu mà thiếu chú giải.
- Bảng dấu tích/thương phải tính theo dấu nhân tử và điều kiện xác định gốc.

### 11.3. Hình biểu diễn nghiệm của phương trình/hệ phương trình

- Nghiệm giao của hai đồ thị là các điểm mà **cả hai biểu thức đều xác định** và có cùng tọa độ.
- Không đánh dấu giao điểm ở tiệm cận, tại điểm bị loại hoặc giao do lỗi lấy mẫu.
- Với tiếp xúc: phân biệt một nghiệm kép với hai nghiệm giao gần nhau.
- Với phương trình có tham số m, nếu hiển thị thanh trượt, mọi nghiệm và số giao phải cập nhật chính xác theo m; không giữ nhãn giá trị cũ.

### 11.4. Đồ thị bất phương trình một biến và hai biến

- Một biến: biểu diễn trên trục số, đầu mút mở/đóng theo dấu.
- Hai biến: tô nửa mặt phẳng/miền giao, biên đúng kiểu nét.
- Nếu miền kết quả rỗng, hiển thị 'vô nghiệm' thay vì tô tùy ý.
- Với nhiều bất phương trình, việc chồng các vùng trong suốt có thể tạo màu khó đọc; cần lớp kết quả duy nhất hoặc đường viền kết quả nổi bật.

---
## 12. HÌNH MINH HỌA SỐ HỌC, ĐẠI SỐ, GIẢI TÍCH VÀ TỐI ƯU HÓA

### 12.1. Biểu diễn số và phép tính

- **Số tự nhiên/số nguyên:** trục số, tia số, mô hình bước nhảy cộng/trừ. Bước nhảy qua 0 phải đúng, dấu và chiều phải chính xác.
- **Phân số:** hình tròn chia phần, dải hình chữ nhật, hình lưới hoặc trục số; các phần dùng để so sánh phân số **phải bằng nhau về diện tích/độ dài** khi mô hình biểu thị các phần bằng nhau. Một hình tròn 'chia năm' bằng năm múi có góc khác nhau là sai nếu mỗi múi biểu diễn `1/5`.
- **Số thập phân và phần trăm:** mô hình lưới 10×10, thanh tỷ lệ; `30%` phải tô 30/100 ô (hoặc tỷ lệ diện tích đúng), không tô theo cảm giác.
- **Tỉ số, tỉ lệ thức:** sơ đồ đoạn thẳng phải giữ đúng độ dài tương đối nếu mục tiêu là so sánh bằng mô hình. Không gán `a:b=2:3` mà vẽ đoạn a dài hơn b.
- **Ước, bội, số nguyên tố:** cây phân tích thừa số phải dẫn đến đúng tích và các lá là số nguyên tố; không vẽ sơ đồ khiến 1 bị hiểu là số nguyên tố.
- **Lũy thừa, căn bậc hai:** hình vuông cạnh a minh họa `a²`; không dùng một hình vuông diện tích âm; căn bậc hai số thực phải đúng miền.
- **Giá trị tuyệt đối:** trên trục số, `|a|` là khoảng cách từ a đến 0 (độ dài không âm), không phải khoảng cách có hướng.

### 12.2. Đại số trực quan

- Dùng **ô đại số (algebra tiles)** để mô tả hằng đẳng thức nếu cần; mỗi ô được gán diện tích chính xác tương ứng và miền độ dài phải dương nếu mô tả chiều dài hình học thực.
- Ví dụ `(a+b)²`: hình vuông cạnh a+b được chia thành `a²`, `ab`, `ab`, `b²`; không thiếu một ô `ab`.
- Với `(a-b)²`, nếu dùng thao tác cắt ghép, phải nêu giả thiết `a≥b≥0` trong mô hình độ dài; đẳng thức đại số vẫn đúng với số thực bất kỳ.
- Biểu diễn phương trình bằng cân thăng bằng phải giữ ý nghĩa cộng/trừ như nhau hai vế; không minh họa phép chia 0.
- Sơ đồ quy trình biến đổi phương trình phải ghi rõ phép biến đổi **tương đương** hay chỉ suy ra một chiều; khi bình phương hai vế có thể tạo nghiệm ngoại lai, phải kiểm tra điều kiện.

### 12.3. Dãy số và quy luật

- Dãy số là các điểm rời rạc `(n,u_n)` với n nguyên tự nhiên thuộc tập chỉ số; **không** nối thành một đường liên tục nếu mục tiêu là đồ thị dãy rời rạc.
- Nếu thêm đường nối để nhìn xu thế, phải ghi rõ chỉ là đường dẫn mắt, không biến đối tượng thành hàm liên tục trên mọi x thực.
- Cấp số cộng `u_n=u_1+(n−1)d`: điểm `(n,u_n)` nằm trên một đường thẳng khi xét phần mở rộng liên tục, nhưng bản chất dãy vẫn rời rạc.
- Cấp số nhân `u_n=u_1 q^{n−1}`: điểm là các dấu rời, có thể đổi dấu luân phiên nếu q<0; không luôn vẽ dãy tăng mũ dương.
- Với tổng cấp số nhân qua diện tích các hình nhỏ dần, tổng diện tích các phần phải khớp ý nghĩa hội tụ; tránh trường hợp q ngoài khoảng hội tụ nhưng vẫn vẽ hình thu nhỏ.

### 12.4. Mô hình thực tiễn và đồ thị ứng dụng

- Ghi rõ đại lượng, đơn vị, gốc thời gian và điều kiện mô hình (ví dụ vận tốc m/s, thời gian s).
- Không vẽ đường biểu diễn đoạn ngoài miền ứng dụng thực: doanh thu với số lượng sản phẩm âm có thể không có ý nghĩa.
- Nếu trục tung không bắt đầu từ 0 đối với biểu đồ cột, phải cảnh giác vì tạo so sánh sai; với biểu đồ đường, gốc khác 0 có thể thích hợp nếu ghi rõ.
- Phân biệt quan hệ **tuyến tính**, **tỷ lệ thuận** và **hàm bậc nhất**: y=ax+b có b≠0 không phải đồ thị của quan hệ tỷ lệ thuận y=ax.
- Trong tối ưu hóa, kiểm tra miền khả thi, đơn vị, dấu mục tiêu, nghiệm biên và tính liên tục/rời rạc của biến.

### 12.5. Bất đẳng thức và giá trị tuyệt đối

- Đồ thị của `|x-a|≤r` với r≥0 là đoạn `[a-r,a+r]`; `<r` là khoảng mở; nếu r<0, miền có thể rỗng tùy bất đẳng thức.
- Với bất đẳng thức bậc hai `ax²+bx+c>0`, bảng dấu phải phụ thuộc a và số nghiệm thực; không mặc định miền nghiệm luôn là một khoảng.
- Khi thực hiện thao tác nhân/chia bất đẳng thức với số âm, dấu phải đảo chiều; hình trục số phải cập nhật đúng.
- Nếu căn hoặc logarit xuất hiện trong bất đẳng thức, giải điều kiện xác định trước rồi giao tập kết quả.

### 12.6. Phép đếm và tổ hợp

- Sơ đồ cây liệt kê phải thể hiện đầy đủ nhánh hợp lệ và không lặp kết quả khi các lựa chọn phân biệt.
- Hoán vị/chỉnh hợp: thứ tự quan trọng; tổ hợp: thứ tự không quan trọng. Không vẽ các nhánh `(A,B)` và `(B,A)` như hai kết quả khác nếu bài đang đếm tập hợp chọn 2 người không xét thứ tự.
- Sơ đồ ô vuông/đường đi lưới: số nhánh và điều kiện cấm phải đúng; không tự nối hai đỉnh không kề lưới.

---

## 13. THỐNG KÊ: BẢNG SỐ LIỆU, BIỂU ĐỒ, ĐỒ THỊ VÀ BOX PLOT

### 13.1. Lựa chọn biểu đồ theo bản chất biến

| Bài toán | Biểu diễn nên dùng | Chú ý |
|---|---|---|
| So sánh tần số các nhóm rời rạc | Biểu đồ cột | Các cột cách nhau có chủ đích |
| So sánh 2 hoặc nhiều nhóm theo danh mục | Cột kép/cột nhóm | Cùng hệ trục, chú giải rõ |
| Tỷ trọng của toàn bộ | Biểu đồ quạt tròn | Tổng phải đúng 100% (sau làm tròn có chú thích) |
| Dữ liệu thay đổi theo thời gian | Biểu đồ đoạn thẳng/đường | Trục thời gian đúng thứ tự/khoảng thời gian |
| Biến định lượng liên tục đã ghép lớp | Histogram | Các cột sát nhau; diện tích cột là tần số với bề rộng lớp không bằng nhau |
| Phân bố tích lũy | Đường lũy tích (ogive) | Tần số/tần suất tích lũy không giảm |
| Trung vị, tứ phân vị, ngoại lệ | Biểu đồ hộp (box plot) | Quy tắc râu và ngoại lệ phải được khai báo |
| Quan hệ 2 biến định lượng | Scatter plot | Không tự tạo tương quan nhân quả |
| Phân bố xác suất rời rạc | Biểu đồ cột xác suất | Các xác suất không âm và tổng bằng 1 |

**Phân biệt:** Một số kiểu như histogram/ogive/box plot có thể được đưa vào tài liệu mở rộng hoặc ở mức cụ thể tùy lớp/bộ sách; không mặc định là yêu cầu dạy chính thức ở mọi lớp. Mục tiêu là để AI chọn biểu diễn đúng khi xuất hiện trong nhiệm vụ Toán THCS/THPT, kể cả chuyên đề.

### 13.2. Bảng số liệu

- Luôn có tiêu đề, đơn vị, nhóm biến, số quan sát n và kỳ/thời điểm nếu dữ liệu theo thời gian.
- Phân biệt **tần số** (số lượng), **tần suất** (tỷ lệ) và **tần suất %**. Không dùng nhãn `%` cho số đếm nguyên.
- Sắp xếp nhóm dữ liệu theo bản chất: nhóm thứ bậc cần thứ tự; danh mục độc lập có thể sắp theo yêu cầu bài.
- Số liệu rỗng/không có phải phân biệt với số 0 thật; dấu `—` trong bảng không được tính như 0.
- Quy tắc làm tròn cần nhất quán; tổng các phần trăm làm tròn có thể thành 99,9% hoặc 100,1%, cần ghi rõ.
- Không chế số liệu để biểu đồ đẹp. Với số liệu thực tế, ghi nguồn, năm đo, đơn vị và ngày truy cập nếu có.

### 13.3. Biểu đồ cột

- Tên danh mục ở trục ngang (trong biểu đồ cột đứng), giá trị ở trục dọc; thanh ngang có thể đảo trục cho nhãn dài.
- Bề rộng các cột nên bằng nhau khi biểu diễn cùng loại danh mục; khoảng cách đều hoặc có nhóm logic.
- **Trục giá trị của cột nên bắt đầu từ 0** vì chiều dài/chiều cao cột mã hóa độ lớn. Nếu cắt trục, phải chỉ báo rõ sự gián đoạn và cân nhắc không dùng dạng cột.
- Không làm tròn số rồi để chiều cao cột mâu thuẫn nhãn giá trị.
- Cột kép/cột nhóm phải có cùng thang giá trị, tách nhóm đủ rõ và chú giải tương ứng.
- Không dùng hiệu ứng 3D làm méo chiều cao/độ rộng cột và gây khó so sánh.

### 13.4. Biểu đồ đoạn thẳng và đường theo thời gian

- Dữ liệu ngày/tháng/năm có khoảng cách thời gian khác nhau cần đặt các điểm x theo **khoảng thời gian thực**, nếu trục là trục thời gian liên tục.
- Dữ liệu theo kỳ đều nhau có thể đặt các điểm cách đều; phải ghi rõ các kỳ.
- Không làm mượt tạo ra cực đại, cực tiểu nằm giữa các mốc nếu không có mô hình nội suy hợp lệ.
- Đánh dấu điểm quan sát; nét nối chỉ hỗ trợ xu hướng giữa các thời điểm, không khẳng định các giá trị trung gian đã đo.
- Không đặt trục thời gian theo thứ tự chữ cái hoặc đảo chiều thời gian trừ khi chủ đích.

### 13.5. Biểu đồ quạt tròn

- Góc quạt ứng với tỷ lệ p là `360°×p` (p ở dạng 0–1); tổng các góc là 360°.
- Các lát quạt không âm và không chồng; nhãn gắn đúng lát.
- Nếu số 0%, không cần dành lát diện tích dương.
- Tránh quá nhiều lát rất nhỏ; khi cần dùng nhãn ngoài và đường dóng.
- Không dùng phối cảnh bánh 3D (pie 3D) khi mục đích là so sánh tỷ trọng chính xác vì phối cảnh làm biến dạng góc/diện tích nhận thức.
- Biểu đồ quạt biểu thị **cơ cấu của một tổng**; không dùng khi các tỷ lệ không cùng mẫu số.

### 13.6. Histogram và dữ liệu ghép nhóm

- Lớp số liệu `[a_i,a_{i+1})` phải có biên chung phù hợp, không chồng lớp và không bỏ khoảng trống vô cớ.
- Nếu các lớp có độ rộng bằng nhau, chiều cao có thể theo tần số hoặc tần suất.
- Nếu độ rộng lớp khác nhau và muốn mã hóa tần số bằng **diện tích**, chiều cao phải tỷ lệ **mật độ tần số = tần số/độ rộng lớp**; không lấy luôn tần số làm chiều cao rồi so sánh diện tích.
- Với giá trị đại diện nhóm, dùng trung điểm lớp theo quy ước bài nếu cần tính xấp xỉ; không coi trung điểm là mọi quan sát thực.
- Tần số tích lũy phải không giảm, tại lớp cuối bằng n; đường tần suất tích lũy kết thúc ở 100% trong mô hình đầy đủ.

### 13.7. Biểu đồ hộp và tứ phân vị

- Một biểu đồ hộp căn bản cần `min`, `Q1`, `median`, `Q3`, `max` hoặc dữ liệu râu/xác định ngoại lệ theo phương pháp đã chọn.
- `Q1≤median≤Q3` và `min≤Q1≤Q3≤max` với box plot min–max; nếu dùng quy tắc râu 1,5×IQR, đầu râu có thể không phải min/max và các điểm ngoài râu hiển thị tách biệt.
- Phải ghi rõ **quy tắc tính Q1/Q3**, nhất là khi n chẵn/lẻ hoặc dùng nội suy; các phần mềm khác nhau có thể cho kết quả khác nhau.
- Với số liệu ghép nhóm, tứ phân vị là **ước lượng** theo cách nội suy trên lớp; không được mô tả như tứ phân vị chính xác của dữ liệu gốc khi chỉ có bảng ghép nhóm.
- Mở rộng khả năng so sánh nhiều biểu đồ hộp trên **cùng một trục**, không đặt khác thang đo gây lừa mắt.

### 13.8. Scatter plot và đường hồi quy

- Chấm từng cặp quan sát `(x_i,y_i)` chính xác; không nối các điểm theo thứ tự nhập.
- Nếu dùng đường hồi quy, ghi đây là **mô hình ước lượng** chứ không phải đường đi qua mọi điểm.
- Không suy luận quan hệ nhân quả chỉ từ tương quan đồ thị.
- Nếu biểu diễn hệ số tương quan, kiểm tra phạm vi `−1≤r≤1` và dữ liệu dùng để tính.
- Nếu biểu diễn số liệu thực tế, phải giữ ngày, nguồn và phiên bản dữ liệu.

---

## 14. XÁC SUẤT, TỔ HỢP, CÂY XÁC SUẤT VÀ BAYES

### 14.1. Không gian mẫu và biến cố

- Ký hiệu không gian mẫu `Ω`, biến cố A, B theo nhất quán của giáo án; mọi nhánh kết quả đơn nằm trong Ω.
- Nếu các kết quả đồng khả năng, số trường hợp thuận lợi phải được đếm đúng; nếu không đồng khả năng thì không sử dụng máy móc `|A|/|Ω|`.
- Đối với hai biến cố độc lập, chỉ đánh dấu độc lập khi có điều kiện hoặc chứng minh; không suy ra từ việc hai vòng Venn không giao (điều đó mô tả xung khắc, không phải độc lập nói chung).
- Biến cố đối `A^c` phải được định nghĩa tương đối trong Ω; `P(A)+P(A^c)=1`.

### 14.2. Sơ đồ cây

- Mỗi nhánh mang nhãn biến cố và xác suất **có điều kiện** theo nút cha.
- Từ mỗi nút không kết thúc, tổng xác suất trên các nhánh con bao trùm toàn bộ khả năng phải bằng 1.
- Xác suất đường đi bằng tích các xác suất có điều kiện theo cạnh; xác suất biến cố tổng hợp là tổng các đường đi **rời nhau** tương ứng.
- Trong mô hình rút không hoàn lại, xác suất các nhánh giai đoạn sau phải cập nhật theo vật đã lấy; không giữ xác suất lần đầu như rút có hoàn lại.
- Với cây tổ hợp không gán xác suất, đừng tự điền các xác suất bằng nhau nếu chưa được cho.
- Tên nhánh nên đặt bên cạnh, không che đường và không đảo từ nút này sang nút khác.

### 14.3. Bảng tần số và bảng 2×2

- Bảng 2×2 gồm tổng hàng, tổng cột và tổng mẫu phải khớp; không ghép nhãn điều kiện theo chiều ngược.
- Khi tính `P(A|B) = P(A∩B)/P(B)` yêu cầu `P(B)>0`.
- Minh họa trên Venn: vùng điều kiện B là **không gian tham chiếu mới**; phần thành công là A∩B; không lấy tỷ lệ A∩B trên toàn bộ Ω rồi gọi là `P(A|B)`.
- Nếu dùng bảng 1000 người minh họa xác suất, các tổng và xác suất phải khớp; không chọn số tròn đẹp nhưng sai điều kiện.

### 14.4. Xác suất toàn phần và Bayes

- Phân hoạch `B_1,...,B_n` phải đôi một xung khắc và hợp bằng Ω (trừ phần xác suất 0 nếu bài có quy ước khác); `P(B_i)≥0`, tổng bằng 1.
- `P(A)=Σ_i P(A|B_i)P(B_i)` với điều kiện các xác suất được xác định thích hợp.
- `P(B_j|A)=P(A|B_j)P(B_j)/P(A)` yêu cầu `P(A)>0`.
- Khi biểu diễn hai giai đoạn, phân biệt **xác suất tiên nghiệm**, **khả năng quan sát dữ liệu** và **xác suất hậu nghiệm**; không ghi nhầm `P(A|B)` với `P(B|A)`.
- Một sơ đồ alluvial/Sankey nếu dùng cho xác suất phải có bề rộng dòng theo xác suất và dòng bảo toàn tổng; trong giáo án phổ thông, cây xác suất rõ nhãn thường dễ kiểm tra hơn.

### 14.5. Quy tắc cảnh báo sai khác biệt quan trọng

- **Xung khắc ≠ độc lập:** với hai biến cố có xác suất dương, xung khắc thường không độc lập.
- **Không hoàn lại ≠ có hoàn lại:** xác suất nhánh sau thay đổi ở trường hợp không hoàn lại.
- **Biến cố đối ≠ biến cố còn lại tùy ý:** phải xét toàn bộ Ω.
- **Tỷ lệ trong mẫu ≠ xác suất chắc chắn:** dữ liệu thống kê có thể chỉ là ước lượng.
- **Sơ đồ cây với hai nhánh không mặc nhiên là 50–50:** cần căn cứ mô hình xác suất.

---

## 15. MA TRẬN NỘI DUNG TRỰC QUAN THEO KHỐI LỚP 6–12

> **Cách hiểu:** Bảng dưới định hướng những *dạng hình/biểu diễn AI nên hỗ trợ* đối với các chủ đề thường có trong Chương trình GDPT 2018 và các SGK hiện hành. Đây **không phải danh mục thay thế nguyên văn yêu cầu cần đạt**, không có nghĩa mọi ý dưới đây đều phải dạy ở mọi bộ SGK, mọi tuần hoặc mọi trình độ. Luôn đối chiếu SGK và kế hoạch giáo dục đang áp dụng; các mục ghi **[MR]** là mở rộng, ví dụ nâng cao hoặc ngoài yêu cầu bắt buộc ở một số ngữ cảnh.

### 15.1. Lớp 6 — THCS: trực quan số học, các hình phẳng cơ bản, đối xứng và dữ liệu

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Số tự nhiên/nguyên | Trục số, tia số, mũi tên bước nhảy | Thứ tự giá trị, dấu số âm |
| Phân số, số thập phân | Thanh phân số, hình tròn chia đều, trục số | Các phần bằng nhau đúng diện tích |
| Bội/ước | Cây phân tích thừa số, sơ đồ nhóm | Không gán 1 là số nguyên tố |
| Điểm, đường, đoạn, tia | Hình đường thẳng, điểm thuộc/không thuộc, trung điểm | Điểm, tia, thứ tự trên đoạn |
| Góc | Cung góc, thước đo góc, phân loại góc | Góc và số đo đúng |
| Đa giác, hình phẳng | Tam giác, chữ nhật, hình thoi, bình hành, thang cân, lục giác đều tùy bài | Thuộc tính hình đúng |
| Chu vi/diện tích | Mô hình chia ghép hình, lưới ô vuông | Diện tích và độ dài không lẫn |
| Đối xứng | Trục đối xứng, tâm đối xứng của hình | Điểm và ảnh đúng phép |
| Thống kê | Bảng số liệu, tranh biểu tượng, biểu đồ cột/cột kép phù hợp bài | Đơn vị biểu tượng, chiều cao cột |
| Xác suất thực nghiệm | Kết quả gieo xúc xắc, vòng quay, bảng tần suất | Tỷ lệ phải dựa trên số lần thử |

**Không bắt buộc** đưa đạo hàm, đồ thị lượng giác hay mô hình 3D phức tạp vào hình cơ bản lớp 6.

### 15.2. Lớp 7 — THCS: số hữu tỉ, quan hệ song song, tam giác và dữ liệu

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Số hữu tỉ/vô tỉ, số thực | Trục số, vị trí xấp xỉ căn | Phân biệt đúng/chính xác và gần đúng |
| Góc/đường song song | Góc đối đỉnh, đồng vị, so le trong, cùng phía | Vị trí góc và đường cắt |
| Tam giác | Tam giác bằng nhau, cân, vuông, đường trung trực | Thứ tự tương ứng đỉnh |
| Hình khối cơ bản | Hộp chữ nhật, lập phương, lăng trụ đứng và hình khai triển | Mặt, cạnh, đỉnh và diện tích đúng |
| Quan hệ đại lượng | Biểu đồ/tables cho tỷ lệ thuận/nghịch khi phù hợp | Không nhầm y=ax với y=ax+b |
| Thống kê | Biểu đồ quạt tròn, đoạn thẳng, bảng dữ liệu | Góc quạt tổng 360°, thời gian đúng |
| Xác suất | Sơ đồ liệt kê kết quả/biến cố cơ bản | Đếm đầy đủ kết quả có thể xảy ra |

### 15.3. Lớp 8 — THCS: hàm bậc nhất, Thalès, đồng dạng, chóp đều

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Biểu thức đại số/hằng đẳng thức | Ô đại số, hình cắt ghép | Các ô đúng diện tích |
| Hàm số bậc nhất | Oxy, đường thẳng, giao trục | Đúng hệ số góc và b |
| Phương trình | Trục số, giao tuyến hàm nếu phù hợp | Nghiệm đúng phương trình |
| Tứ giác | Bình hành, hình thoi, hình chữ nhật, vuông | Tính chất đối xứng, song song |
| Định lý Thalès | Các đường song song cắt cạnh tam giác | Đúng điểm thuộc cạnh/kéo dài |
| Tam giác đồng dạng | Hai tam giác, cặp góc/cạnh tương ứng | Thứ tự tam giác đúng |
| Hình chóp tam giác đều/tứ giác đều | Phối cảnh học đường, hình khai triển, mặt bên | Đáy đều, mặt bên và đường cao đúng |
| Thống kê | Bảng, biểu đồ cột/đường/quạt và phân tích | Loại dữ liệu/phần trăm đúng |
| Xác suất | Không gian mẫu và biến cố cơ bản | Không suy ra đồng khả năng vô cớ |

### 15.4. Lớp 9 — THCS: hàm bậc hai, đường tròn và khối tròn xoay

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Hệ phương trình bậc nhất hai ẩn | Hai đường thẳng, giao/ song song/ trùng | Phân biệt 0/1/vô số nghiệm |
| Bất phương trình một ẩn | Trục số, dấu mở/đóng | Miền nghiệm và đầu mút |
| Hàm `y=ax²` | Parabol đỉnh O, trục Oy | Dấu a quyết định mở lên/xuống |
| Góc và đường tròn | Góc nội tiếp, ở tâm, tiếp tuyến, dây, cung | Chắn cung đúng; tiếp tuyến vuông bán kính |
| Hệ thức lượng tam giác vuông | Tam giác vuông, đường cao, lượng giác | Cạnh đối/kề theo góc đang xét |
| Hình trụ, nón, cầu | 3D học đường, hình khai triển, diện tích/thể tích | Bán kính/chiều cao/đường sinh không nhầm |
| Thống kê/xác suất | Biểu đồ, bảng dữ liệu, cây đếm phù hợp bài | Tổng và mẫu số đúng |

### 15.5. Lớp 10 — THPT: tập hợp, vectơ, miền nghiệm, tọa độ, conic, thống kê

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Mệnh đề, tập hợp | Venn/Euler, trục số, khoảng | Quan hệ bao hàm; mở/đóng |
| BPT và hệ BPT bậc nhất hai ẩn | Đường biên, nửa mặt phẳng, miền khả thi | Tô phía đúng; nét biên đúng |
| Hệ thức lượng tam giác | Tam giác, góc 0–180°, tam giác bất kỳ | Góc/cạnh đối diện chuẩn |
| Vectơ | Mũi tên, quy tắc hình bình hành, phép cộng/trừ, tích vô hướng | Hướng, điểm đầu/cuối, vô hướng/vectơ |
| Số gần đúng/sai số | Trục khoảng sai số, thanh khoảng tin cậy [MR theo bài] | Không dùng dấu = với xấp xỉ |
| Hàm số, đồ thị | Bậc nhất, bậc hai, phép tịnh tiến | Đỉnh, miền, nghiệm |
| Tọa độ Oxy | Đường thẳng, đường tròn, ba conic | Phương trình và hình đúng, thang đo |
| Thống kê không ghép nhóm | Bảng dữ liệu, trung bình/trung vị, độ phân tán | Giữ dữ liệu và thuật toán tứ phân vị |
| Tổ hợp/xác suất cổ điển | Cây đếm, bảng kết quả, Venn | Phân biệt tổ hợp/chỉnh hợp |

### 15.6. Lớp 11 — THPT: lượng giác, dãy số, không gian tổng hợp, giới hạn và thống kê ghép nhóm

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Góc lượng giác và lượng giác | Đường tròn đơn vị, các đồ thị sin/cos/tan/cot | Độ/radian, chu kỳ, tiệm cận |
| Dãy số, cấp số cộng/nhân | Điểm rời trên Oxy, sơ đồ mẫu hình | Không nối thành hàm liên tục vô cớ |
| Mẫu số liệu ghép nhóm | Bảng phân lớp, đại diện lớp, biểu đồ phù hợp | Giữ biên lớp và các xấp xỉ |
| Quan hệ song song trong không gian | Chóp/lăng trụ/hộp, giao điểm, giao tuyến, thiết diện, phép chiếu song song | Bảo toàn thẳng hàng, song song, tỉ số trong điều kiện tương ứng |
| Giới hạn và liên tục | Đồ thị một phía, lỗ, nhảy, tiệm cận | Điểm thuộc khác giới hạn |
| Hàm mũ và lôgarit | Đồ thị, miền xác định, tiệm cận | Cơ số và miền đúng |
| Quan hệ vuông góc trong không gian | Đường/mặt vuông góc, góc và khoảng cách | Không đo góc bằng ảnh chiếu |
| Đạo hàm | Tiếp tuyến, hệ số góc, tốc độ thay đổi | Tiếp tuyến qua đúng tiếp điểm, slope f'(a) |
| Xác suất | Quy tắc xác suất của các biến cố phù hợp bài | Không nhầm độc lập, xung khắc |

### 15.7. Lớp 12 — THPT: khảo sát hàm, Oxyz, tích phân, thống kê ghép nhóm và xác suất có điều kiện

| Mảng | Hình/biểu diễn cần hỗ trợ | Ràng buộc trọng yếu |
|---|---|---|
| Ứng dụng đạo hàm khảo sát | Đồ thị bậc ba/bậc bốn/phân thức, cực trị, BBT, tiệm cận | BBT khớp đồ thị; lỗ ≠ tiệm cận |
| Vectơ và tọa độ Oxyz | Vectơ trong không gian, hệ trục ba chiều, điểm/mặt | Đúng tọa độ, thứ tự trục và hình chiếu |
| Dữ liệu ghép nhóm | Khoảng biến thiên, IQR, phương sai, độ lệch chuẩn | Phân biệt ước lượng với thống kê dữ liệu gốc |
| Nguyên hàm, tích phân | Đồ thị, miền diện tích, vùng giữa hai đường | Diện tích hình học vs tích phân có dấu |
| Phương pháp tọa độ trong không gian | Mặt phẳng, đường thẳng, góc, khoảng cách, mặt cầu | Kiểm tra phương trình và mọi giao tuyến |
| Xác suất có điều kiện | Cây xác suất, bảng 2×2, công thức toàn phần, Bayes | Nhầm `P(A|B)` và `P(B|A)` là lỗi nghiêm trọng |
| Chuyên đề học tập (nếu có) | Biến ngẫu nhiên rời rạc, tối ưu, tài chính, mô hình thực tế | Ghi rõ là chuyên đề, không áp vào lớp đại trà vô điều kiện |

### 15.8. Ma trận chọn loại hình theo tác vụ

| Tác vụ của người học | Loại hình phù hợp | Hình không phù hợp nếu không giải thích |
|---|---|---|
| Xác định trung điểm | Đoạn thẳng có vị trí và hai vạch bằng nhau | Đoạn lệch với hai nửa không bằng nhau |
| Tìm giao tuyến | Hình khối có hai mặt và hai điểm chung | Hình cắt qua vật thể tùy ý |
| Khảo sát hàm phân thức | Hình đồ thị và các đường tiệm cận/lỗ | Một nét nối liên tục qua mẫu bằng 0 |
| So sánh hai mẫu thống kê | Biểu đồ chung trục, box plot/ bảng thích hợp | Hai hình khác thang đo không ghi |
| Tìm xác suất hậu nghiệm | Cây hoặc bảng 2×2 kèm xác suất | Sơ đồ hai vòng không ghi điều kiện |
| Minh họa hình tròn và góc thực | Hình có tỉ lệ trục 1:1 | Hệ trục dãn méo làm hình tròn thành elip |
| Diễn biến số liệu theo thời gian | Đường/đoạn thẳng theo mốc x đúng | Quạt tròn cho chuỗi thời gian không cùng mẫu |
| Minh họa dãy số | Các chấm rời `(n,u_n)` | Vẽ đường liên tục và gọi là đồ thị dãy |

---

## 16. HỆ THỐNG KÝ HIỆU VÀ CHUẨN CÔNG THỨC

### 16.1. Quy tắc chữ và ký hiệu

- Điểm: chữ hoa Latin (`A`, `B`, `C`, `M`, `N`, `O`, `H`) hoặc ký hiệu được đề quy định.
- Đường thẳng: chữ thường (`a`, `b`, `d`) hoặc `(AB)`/`AB` theo ngữ cảnh.
- Mặt phẳng: `(P)`, `(Q)`, `(ABC)` hoặc `(α)`, `(β)`; không nhầm tên mặt với một điểm.
- Tên khối chóp: `S.ABC`, `S.ABCD`; lăng trụ `ABC.A'B'C'`; hình hộp `ABCD.A'B'C'D'`.
- Đường tròn: `(O;R)`; đường tròn đơn vị tâm O bán kính 1.
- Vectơ: `\vec{a}`, `\overrightarrow{AB}`. Độ dài `|\vec a|` hoặc `\|\vec a\|` tùy quy cách; **không dùng dấu mũi tên cho độ dài vô hướng**.
- Số học: `\mathbb{N}`, `\mathbb{Z}`, `\mathbb{Q}`, `\mathbb{R}`; nếu dùng N gồm/không gồm 0 phải khai báo. `\mathbb{N}^*` thường chỉ số tự nhiên dương trong sách Việt Nam nhưng không suy diễn nếu văn bản khác quy ước.
- Quan hệ: `\in`, `\notin`, `\subseteq`, `\cup`, `\cap`, `\setminus`, `\varnothing`, `\parallel`, `\perp`, `\cong`, `\sim`.
- Biểu thức logic: `\Rightarrow` (suy ra), `\Leftrightarrow` (tương đương); không thay dấu hai chiều bằng mũi tên một chiều khi biến đổi chưa tương đương.
- Phép gần đúng: `\approx` thay cho `=` khi làm tròn.
- Lượng giác: `\sin`, `\cos`, `\tan`, `\cot` (hoặc `\operatorname{cot}`), `\pi`.
- Đạo hàm/tích phân: `f'(x)`, `\frac{dy}{dx}`, `\int_a^b f(x)\,dx`.
- Xác suất: `P(A)`, `P(A\mid B)`, `P(A\cap B)`; dùng dấu điều kiện dọc rõ ràng.

### 16.2. Quy ước ghi tọa độ và khoảng

- Trong tài liệu tiếng Việt, có thể ghi tọa độ `A(x;y)` hoặc `A(x;y;z)` để tránh xung đột dấu phẩy thập phân; dùng nhất quán trong cùng tài liệu.
- Với ký hiệu quốc tế `A(x,y)` được phép nếu không lẫn dấu phẩy thập phân; không máy móc chuyển đổi nếu chuẩn của người dùng khác.
- Khoảng trên trục số theo ký hiệu `(a,b)`, `[a,b]`; trong SGK có thể có biến thể ký hiệu khoảng bằng `]a;b[` ở một số truyền thống trình bày. Hệ thống cần nhận diện đầu mút mở/đóng theo ngữ nghĩa, không chỉ theo ký tự.
- Nếu dùng dấu thập phân `2,5`, không đồng thời dùng dấu phẩy đó để phân tách tọa độ mà gây nhập nhằng.
- Với phương trình mặt phẳng: `(P): ax+by+cz+d=0`, vectơ pháp tuyến `(a,b,c)≠(0,0,0)`.

### 16.3. Tiêu chuẩn TeX/LaTeX trong học liệu

- Mọi công thức Toán phải xuất bằng engine hiển thị toán (MathJax, KaTeX, LaTeX, hoặc phương thức tương đương) với font ký hiệu đúng.
- Không chụp công thức thành ảnh bitmap thấp độ phân giải nếu cần chỉnh sửa/zoom.
- Dùng `\frac` cho phân số trong biểu thức chính thức, `\sqrt` cho căn, `\overrightarrow` cho vectơ hai điểm; dấu trừ dùng dấu toán học, không để mất khoảng cách.
- Phân biệt chữ biến toán học nghiêng và chữ mô tả đơn vị/điều kiện ở dạng chữ thẳng.
- Nếu công cụ không hỗ trợ một lệnh TeX, phải đổi sang lệnh tương đương kiểm chứng được thay vì xuất chữ sai font.
- Nội dung phương trình, bảng và nhãn dùng một nguồn dữ liệu chung, tránh **nhãn là x=2 nhưng đường lại vẽ x=3**.

---
## 17. TIÊU CHUẨN HÌNH THỨC: MÀU, NÉT, CHỮ, BỐ CỤC

> Các giá trị dưới đây là **bộ thông số khởi tạo đề xuất**, KHÔNG phải văn bản bắt buộc của Bộ GD&ĐT. Tùy kích thước và môi trường, hệ thống được phép điều chỉnh nếu không làm mất khả năng đọc.

### 17.1. Bảng màu đề xuất (nền sáng)

| Vai trò | Màu HEX | Điều kiện |
|---|---|---|
| Nét chính, trục, nhãn chính | `#1F2937` | Rõ trên nền trắng |
| Hình/đường đang nghiên cứu | `#006D77` | Nhấn mạnh đối tượng trung tâm |
| Đối tượng phụ hoặc hướng dẫn | `#B65F00` | Dùng có chủ ý, không quá nhiều |
| Nét khuất, chú giải ít ưu tiên | `#6B7280` | Phân biệt nhờ cả nét đứt, không chỉ màu |
| Cảnh báo hoặc giả thiết mâu thuẫn | `#B42318` | Không dùng màu đỏ như trang trí |
| Lưới/tuyến phụ rất nhẹ | `#E5E7EB` | Không bắt buộc đọc để hiểu nội dung |
| Nền | `#FFFFFF` | Có thể đổi nền nếu kiểm tra tương phản |

**Quy tắc màu:**

1. Không phụ thuộc duy nhất vào màu để thể hiện điều kiện đúng/sai, song song, bằng nhau, đường đã biết/chưa biết.
2. Dùng đồng thời nét liền/đứt, hình dạng điểm, nhãn hay ký hiệu khi cần phân biệt.
3. Ưu tiên 1 màu nét trung tính + 1–2 màu chức năng cho hình học thông thường.
4. Không tô kín quá đậm các mặt phẳng gây mất khả năng nhìn cạnh phía sau.
5. Tránh dùng đỏ–xanh lá làm cặp phân biệt duy nhất vì người khiếm sắc có thể khó nhận biết.
6. Với bản in đen trắng, kiểm tra hình còn đọc được sau chuyển grayscale.

### 17.2. Độ tương phản và khả năng tiếp cận

- Đối với **thành phần đồ họa mang thông tin cần thiết**, tham chiếu **WCAG 2.2, SC 1.4.11**: mức tương phản thường tối thiểu **3:1** so với vùng màu liền kề trong phạm vi áp dụng; chú ý ngoại lệ và trường hợp thông tin đã được cung cấp tương đương bằng văn bản.
- Với **chữ thông thường**, tham chiếu **WCAG 2.2, SC 1.4.3**: tối thiểu **4,5:1**; chữ lớn có thể dùng ngưỡng **3:1**, trong phạm vi quy định và ngoại lệ của WCAG.
- Cung cấp mô tả văn bản/alt text với hình ảnh chứa thông tin học tập; mô tả nên nêu đối tượng và quan hệ chính, không chỉ nói 'một hình tam giác'.
- Nếu người học cần đọc hình khi phòng có ánh sáng hoặc từ xa, có thể cần tương phản và cỡ chữ cao hơn tiêu chí web.

### 17.3. Thông số nét và chấm điểm

| Thành phần | Mặc định tham khảo trên SVG cỡ trung bình | Ghi chú |
|---|---:|---|
| Nét hình chính | 1,8–2,5 px | Thường đậm hơn nét phụ |
| Đồ thị hàm số | 2,2–3,0 px | Ưu tiên nhìn thấy đường cong |
| Nét khuất | 1,2–1,8 px | Nét đứt đều, khoảng gạch phù hợp |
| Đường dựng phụ | 0,8–1,3 px | Không giành ưu thế thị giác |
| Chấm điểm | Đường kính 5–7 px | Tùy tỷ lệ hình và slide |
| Khoảng nhãn–điểm | 6–12 px | Không đặt cố định khi thay viewport |
| Độ trong suốt mặt phẳng | Thường alpha 10–25% | Có thể tăng/giảm theo nền |
| Lưới | 0,6–1,0 px | Nhạt hơn trục và đồ thị |

**Lưu ý kỹ thuật:** px chỉ là đơn vị hiển thị tham chiếu; khi in A4 hoặc đặt SVG vào slide cần xét tỷ lệ phóng cuối cùng. Độ dày nét nên điều chỉnh khi thu phóng nhưng không làm sai vị trí hình học.

### 17.4. Cỡ chữ

- **Trên slide trình chiếu:** nhãn quan trọng nên ở mức đọc được từ cuối lớp, thường tối thiểu khoảng 18–24 pt cho chữ thuần trong bố cục slide đầy đủ; không áp máy móc số pt cho nhãn SVG nhỏ nằm bên trong hình mà chưa xem cỡ trình chiếu cuối.
- **Trên đề/phiếu A4:** chữ/nhãn thường trong khoảng 10–12 pt khi in thực; không để nhãn nhỏ đến mức học sinh không phân biệt được A/H/M.
- **Văn bản bổ trợ cho hình:** chọn một kiểu chữ có đủ ký tự Toán Việt và không lỗi dấu; ưu tiên các bộ font tương thích phổ biến.
- Tránh dùng chữ nghiêng tùy ý cho đoạn văn, nhưng ký hiệu biến toán học có thể theo font toán nghiêng thông dụng.

### 17.5. Thuật toán đặt nhãn

1. Xác định điểm neo thật hoặc đối tượng neo; mỗi nhãn gắn với một đối tượng duy nhất.
2. Tạo các ứng viên `NE, NW, SE, SW, above, below, right, left` quanh điểm.
3. Chấm điểm cho từng ứng viên theo: khoảng cách tới điểm, va chạm nét, va chạm nhãn, cắt hình, nằm ngoài viewport.
4. Chọn phương án chi phí thấp nhất; nếu cần, dịch hình trong khung hoặc đổi bố cục, **không dịch điểm thật**.
5. Với đồ thị động/3D, tính lại khi vị trí đối tượng hoặc camera thay đổi; hạn chế nhãn nhảy liên tục giữa các khung khi thay đổi nhỏ.
6. Với điểm trùng nhau thật, có thể hiển thị nhãn ghép `A≡B`/tooltip thay vì hai nhãn đè.
7. Không đặt nhãn tại đúng giao điểm khi nó che chấm/vạch cần quan sát.

### 17.6. Khung và khoảng trắng

- Dự chừa biên 5–10% vùng hình cho các nhãn, nhưng phải cân bằng với độ phóng.
- Điểm quan trọng không được nằm sát mép và bị cắt nhãn; có thể cắt một phần đường thẳng vô hạn để diễn tả còn kéo dài.
- Một hình chính nên có phân cấp thị giác: đối tượng chính → các điểm mốc → đối tượng phụ → lưới/chú giải.
- Tránh đặt quá 7–10 nhãn gần nhau trong một góc hẹp mà không dùng mức hiển thị theo bước.
- Không thêm bóng đổ, đổ nổi 3D hoặc gradient chỉ để đẹp nếu gây sai tỷ lệ/ẩn cạnh.

### 17.7. Phong cách khuyến nghị theo mục đích

| Bối cảnh | Thiết kế phù hợp |
|---|---|
| Đề kiểm tra A4 đen trắng | Nét đơn sắc, kiểu vạch khác nhau, nhãn chính xác, hình vector |
| Slide lớp 6–7 | Hình lớn, ít nhãn, màu có chức năng, thao tác trực quan |
| Slide hình phẳng lớp 8–10 | Các bước dựng tuần tự, nhãn rõ, giữ cố định khung |
| Slide hình không gian lớp 11 | Tách mặt/cạnh phụ; khuất–thấy rõ; tránh chằng chịt |
| Slide khảo sát hàm lớp 12 | BBT và đồ thị khớp; tiệm cận rõ, viewport hợp lý |
| Mô phỏng tương tác | Màu chức năng, trạng thái kéo/thả, reset, tooltip, khả năng phát hiện suy biến |
| Học liệu STEM/ứng dụng | Có đơn vị, giả thiết mô hình, dữ liệu nguồn và cảnh báo gần đúng |

---

## 18. TIÊU CHUẨN SƯ PHẠM VÀ BIỂU DIỄN THEO TRẠNG THÁI HỌC TẬP

### 18.1. Hình là công cụ học tập, không chỉ là tranh minh họa

- Một đối tượng trực quan có thể phục vụ: **khởi động phát sinh vấn đề**, khám phá, hình thành khái niệm, thực hành, vận dụng, phản tư.
- Hình ở trạng thái đầu không được tự động vẽ mọi đường phụ hay hiện kết quả cần tìm.
- Nếu một bài có câu hỏi gợi mở, các thành phần thiết yếu để đọc câu hỏi phải hiện trên màn hình; không cất toàn bộ chỉ dẫn trong speaker notes.
- Khi hình thay đổi qua các bước, đối tượng cũ phải giữ nguyên định danh và quan hệ, trừ khi hoạt động đang chủ ý thay đổi giả thiết.
- Nếu một điểm xuất hiện ở bước 4, đừng đưa nhãn/đường nối phụ thuộc điểm đó vào bước 1 khi chưa có lý do.

### 18.2. Các trạng thái hiển thị đề xuất

1. `INITIAL`: hiện giả thiết, dữ liệu cần thiết, tên điểm ban đầu.
2. `QUESTION`: hiện câu hỏi/nhiệm vụ, có thể làm nổi đối tượng cần quan sát nhưng không bật lời giải.
3. `STUDENT_CONSTRUCTION`: học sinh kéo, đặt điểm, dựng đường; hệ thống giữ ràng buộc.
4. `HINT_1`, `HINT_2`: gợi ý có kiểm soát, không nhảy tới kết quả.
5. `TEACHER_REVEAL`: hiện đường phụ/kết quả sau khi giáo viên kích hoạt.
6. `JUSTIFICATION`: liên kết hình với lập luận và các tính chất đã biết.
7. `FINAL`: tổng hợp, tô đối tượng đã chứng minh/tìm được.

### 18.3. Bài tập phân tầng

- **MUST:** ít đối tượng, nhãn trực tiếp, câu hỏi phát hiện quan hệ và xác định đối tượng.
- **SHOULD:** thêm đường phụ hợp lý, yêu cầu giải thích, xét nhiều trường hợp.
- **COULD:** hình biến thiên, phản ví dụ, tổng quát hóa, chứng minh điều kiện đảo hoặc trường hợp suy biến.
- Các tầng có thể dùng chung mô hình gốc, nhưng không tự hiển thị kết quả ở tầng cao ngay từ đầu.

### 18.4. Tránh tạo ngộ nhận qua hình

- Không dùng tam giác cân làm hình minh họa duy nhất cho một định lý đúng với tam giác thường mà không có cảnh báo.
- Không cho học sinh đo góc vuông hay bằng nhau bằng mắt trên hình không gian chiếu xiên.
- Không tô diện tích biểu diễn xác suất khi diện tích các miền không tương ứng xác suất, trừ khi chỉ là minh họa định tính và có ghi chú.
- Không dùng hình mẫu thuận lợi để khiến một phát biểu sai trông có vẻ đúng; nên có phản ví dụ.
- Không đặt các điểm thành hàng khiến học sinh đoán ngay đáp án khi nhiệm vụ là khám phá sự thẳng hàng chưa chứng minh.

### 18.5. Các tiêu chí AfL (Assessment for Learning)

- **Collect:** câu hỏi yêu cầu HS chỉ ra vị trí, đặt một điểm, đọc giá trị, hoặc đánh dấu một thuộc tính trên hình.
- **Interpret:** AI/GV xác định kiểu sai cụ thể (nhầm vectơ với đoạn, nhầm lỗ với tiệm cận, nhầm góc ảnh với góc 3D).
- **Decide:** chọn gợi ý hoặc hình phản ví dụ phù hợp.
- **Act:** cập nhật hình/hoạt động, giữ lại chứng cứ và giải thích cho học sinh.

---

## 19. XUẤT FILE, TƯƠNG THÍCH CÔNG CỤ VÀ KHẢ NĂNG SỬA

### 19.1. Các dạng đầu ra

| Định dạng | Khi nào dùng | Yêu cầu kiểm tra |
|---|---|---|
| SVG | Hình phẳng, đồ thị, biểu đồ cho PPT/website | Giữ vector, font/ký hiệu, bounding box, nhãn |
| PDF vector | Đề, phiếu học tập, tài liệu in | Font nhúng/đúng nét, không clip công thức |
| PNG | Công cụ không hỗ trợ vector | Đủ DPI theo kích thước in, chữ không răng cưa |
| PPTX | Slide sửa được | Đối tượng hình và chữ đúng vị trí, không bị mất ký hiệu |
| GGB/GeoGebra | Dựng động, kéo thả | Mỗi đối tượng có ràng buộc thực, không chỉ là ảnh |
| HTML/Canvas/WebGL | Mô phỏng tương tác 2D/3D | Thao tác thật, resize, reset, cập nhật cạnh khuất |
| TikZ/PGF hoặc Asymptote | Hình in, mã nguồn tái tạo | Source compile thành hình đúng, không lỗi gói |
| Python/Matplotlib | Biểu đồ và đồ thị tự động | Mã tái tạo, đơn vị trục, dữ liệu nguồn |

**Quan trọng:** Một ảnh PNG chụp mô phỏng 3D **không** trở thành mô hình xoay kéo được. Nếu đầu ra yêu cầu tương tác, phải cung cấp mô hình/phần mềm tương tác thực.

### 19.2. Quy tắc tính tương thích

- Xuất hình vector bằng đường/path và text thật nếu công cụ đầu nhận hỗ trợ.
- Với ký hiệu phức tạp dễ bị lỗi font khi chuyển máy, cân nhắc nhúng font trong PDF hoặc chuyển đúng **phần chữ công thức** sang path khi cần giữ giao diện, nhưng sẽ giảm khả năng sửa chữ.
- Tránh biến toàn hình thành một ảnh bitmap khi người dùng cần kéo từng điểm, ẩn đường phụ hoặc chỉnh màu.
- Đảm bảo tên file không lỗi Unicode tiếng Việt; lưu UTF-8 và có tên dự phòng không dấu khi tích hợp tự động.
- Đơn vị hình học trên SVG và PPTX không được nhầm giữa px và pt; kiểm tra sau khi chèn vào file.
- Với GeoGebra, việc xuất đồ họa 2D và đồ họa 3D có thể có các giới hạn khác nhau; **không mặc định mọi chế độ 3D đều xuất trực tiếp SVG đầy đủ như 2D**.

### 19.3. Kiểm tra sau khi xuất

1. Mở file bằng ứng dụng đầu cuối thật, không chỉ xem ảnh preview.
2. Kiểm tra dấu tiếng Việt, căn, phân số, dấu vectơ, dấu song song/vuông góc.
3. Kiểm tra các nhãn không bị đổi vị trí do font/substitution.
4. Kiểm tra không có trang trắng, phần hình bị cắt, trục biến mất, sai tỉ lệ, nét đứt biến thành nét liền.
5. Nếu in đen trắng, kiểm tra độ phân biệt các lớp ký hiệu.
6. Nếu mô hình tương tác, kéo xoay và thay dữ liệu để phát hiện đối tượng phụ không cập nhật.

### 19.4. Công cụ có thể dùng

- **GeoGebra:** hình học động 2D, 3D, phương trình, dựng mặt phẳng/khối, tùy chỉnh kiểu nét và nhãn; hỗ trợ kéo xoay 3D.
- **Desmos:** đồ thị hàm, miền giới hạn, hệ trục, biên bất phương trình, bảng số liệu và một số hoạt động tương tác; một số điểm khuyết cần vẽ dấu riêng.
- **TikZ/PGF:** nguồn LaTeX vector, phù hợp đề in có ký hiệu chính xác.
- **Asymptote:** mô tả hình toán học bằng mã, đặc biệt hữu ích cho hình phức tạp/3D.
- **Matplotlib:** thống kê và đồ thị từ dữ liệu bằng Python; phù hợp quy trình tái tạo và kiểm tra số.

Không công cụ nào được miễn việc kiểm tra ý nghĩa toán học chỉ vì 'phần mềm vẽ ra'.

---

## 20. KIẾN TRÚC AI TẠO HÌNH: DỮ LIỆU → RÀNG BUỘC → DỰNG → KIỂM ĐỊNH

### 20.1. Pipeline bắt buộc

```text
INPUT (đề / SGK / ngữ cảnh / mức lớp / loại hình / mục tiêu sư phạm)
   |
   v
PARSE & CLASSIFY (nhận diện đối tượng, biến, mệnh đề, các trường hợp)
   |
   v
MATH MODEL (định nghĩa hình, phương trình, dữ liệu, tập xác định)
   |
   v
CONSTRAINT SOLVER (kiểm tra tồn tại, phụ thuộc, hình không suy biến)
   |
   v
SCENE / GRAPH SPEC (chọn phép chiếu, thang đo, layers, các trạng thái)
   |
   v
RENDER 2D / 3D / CHART (nét, màu, nhãn, viewport)
   |
   v
MATH VALIDATION -> RENDER VALIDATION -> PEDAGOGICAL/A11Y VALIDATION
   |
   +---- FAIL P0/P1 ---> FIX & REGENERATE / REPORT UNSATISFIABLE
   |
   v
EXPORT + VIEW IN TARGET SOFTWARE + QA + SOURCE/STATE MANIFEST
```

### 20.2. Cấu trúc dữ liệu tối thiểu

- `metadata`: `grade`, `topic`, `lesson`, `outputType`, `assessmentOrTeaching`, `source`, `sourceDate`, `language`.
- `math`: `objects`, `constraints`, `formulas`, `domain`, `units`, `derivedObjects`, `exclusions`.
- `view`: `dimension=2|3`, `projectionType`, `camera`, `bounds`, `equalAspect`, `grid`, `axes`.
- `style`: `palette`, `strokeRole`, `pointMarker`, `labelPolicy`, `opacity`, `textSizes`.
- `instruction`: `pedagogicalPhase`, `showAnswer`, `revealStep`, `learnerActions`.
- `validation`: `tolerances`, `mathChecks`, `renderChecks`, `a11yChecks`, `status`, `evidence`.
- `export`: `formats`, `includeSource`, `editable`, `files`.

### 20.3. Xử lý mâu thuẫn/không tồn tại

- Ví dụ đề yêu cầu 'tam giác ABC vuông tại A và có AB²+AC²≠BC²' là mâu thuẫn; cần báo lỗi nguồn thay vì bẻ cong hình.
- Ví dụ ba điểm A, B, C trùng/thẳng hàng khi cần dựng đường tròn qua ba điểm; không cố vẽ một đường tròn xác định duy nhất.
- Ví dụ hai đường song song trong mặt phẳng muốn có đúng một giao điểm: báo vô nghiệm trong hình Euclid phẳng.
- Ví dụ tọa độ r, h của hình nón có r<0 hoặc h<0 dưới vai trò kích thước hình học: báo dữ liệu không hợp lệ; nếu là biến đại số có dấu phải phân biệt ý nghĩa.
- Ví dụ f(x)=1/(x-1) nhưng nhãn lại cho x=1 thuộc D: đánh dấu nguồn mâu thuẫn.

### 20.4. Mức lỗi và cách xử lý

| Mức | Định nghĩa | Hành vi |
|---|---|---|
| P0 — BLOCKER | Sai quan hệ, tọa độ, điều kiện xác định, dữ liệu, kết luận toán học | **Không xuất là hình hoàn chỉnh**; sửa hoặc báo mâu thuẫn |
| P1 — MAJOR | Hình gây hiểu sai nghiêm trọng: cạnh thấy/khuất sai, dấu góc gây hiểu sai, nhãn đặt nhầm | Sửa trước khi công bố |
| P2 — MINOR | Va chạm nhãn nhỏ, nét phụ hơi sát, màu chưa đẹp | Chỉnh hoặc ghi chú nếu có giới hạn |
| P3 — ENHANCEMENT | Căn lề, thẩm mỹ, khả năng chỉnh sửa nâng cao | Ưu tiên theo chi phí và nhu cầu |

**Trạng thái:** `BLOCKED`, `NEEDS_TEACHER_CONFIRMATION`, `READY_FOR_REVIEW`, `READY_TO_TEACH`, `PUBLISHED`. Không ghi `READY_TO_TEACH` hoặc `PUBLISHED` khi tồn tại P0/P1 chưa xử lý hoặc xác nhận quan trọng chưa được cấp.

### 20.5. Tiêu chí validation theo loại hình

**Hình 2D:**
- kiểm tra điểm thuộc bằng phương trình/định thức;
- kiểm tra song song qua định thức vector phương bằng 0;
- kiểm tra vuông góc qua tích vô hướng bằng 0;
- kiểm tra khoảng cách/bằng nhau bằng metric;
- kiểm tra các điểm và nhãn trong viewport;
- kiểm tra các góc thực sự khi mục tiêu là đo.

**Hình 3D:**
- kiểm tra các điểm đồng phẳng theo tích hỗn tạp thích hợp;
- kiểm tra đường thẳng và mặt phẳng song song/vuông góc theo vector;
- kiểm tra hệ mặt và cạnh tạo khối nhất quán;
- kiểm tra mặt cắt, giao tuyến, phần khuất theo camera;
- khi phép chiếu suy biến, thông báo và đổi camera nếu được phép.

**Đồ thị:**
- phân tích miền xác định/điểm loại;
- so sánh nghiệm, cực trị, tính đơn điệu từ toán học với hình;
- phát hiện nhánh bị nối ngang qua gián đoạn;
- phát hiện trục/tỉ lệ không khớp nhãn;
- kiểm tra đường cong có sai lệch tối đa dưới ngưỡng trên miền hợp lệ;
- kiểm tra BBT, bảng dấu, tiệm cận, đầu mút.

**Thống kê:**
- tổng tần số và tỷ lệ;
- chiều cao/góc/diện tích biểu đồ phản ánh số liệu;
- nhãn và đơn vị;
- tứ phân vị/độ phân tán theo đúng thuật toán;
- nguồn dữ liệu, mốc thời gian.

**Xác suất:**
- mọi xác suất trong `[0,1]`;
- tổng xác suất nhánh phù hợp bằng 1;
- các xác suất điều kiện đúng mẫu số;
- phép nhân đường đi và phép cộng biến cố rời nhau đúng;
- biểu đồ không làm xung khắc thành độc lập.

### 20.6. Phần cần có sự xác nhận của giáo viên

- Khi đề thiếu giả thiết cần xác định hình, chọn một trường hợp đặc biệt có thể gây ngộ nhận;
- Khi ký hiệu của SGK/bộ đề khác quy ước mặc định;
- Khi hình có thể làm lộ đáp án hoặc phát sinh giải thích sớm;
- Khi nội dung chuyên đề vượt yêu cầu cần đạt của lớp;
- Khi bản đồ số liệu thực tế chưa xác minh nguồn, năm, số liệu;
- Khi tứ phân vị có nhiều quy ước có thể cho kết quả khác nhau.

---

## 21. BỘ THỬ NGHIỆM, LỖI THƯỜNG GẶP, TIÊU CHÍ NGHIỆM THU

### 21.1. Bộ kiểm thử P0 (toán học)

| ID | Tình huống | Tiêu chí PASS | Fail mẫu |
|---|---|---|---|
| M01 | `M` trung điểm `AB` | `M∈AB`, `AM=MB` | M lệch AB |
| M02 | `AB∥CD` | Vector phương song song | Chỉ nhìn gần song song |
| M03 | `AB⊥CD` trong 2D | Tích vô hướng =0 | Dấu vuông ở góc không vuông |
| M04 | `A,M,B` theo thứ tự | M giữa A,B | M nằm trên tia ngoài AB |
| M05 | Tiếp tuyến `(O)` tại T | `OT⊥t`, T thuộc đường tròn, tiếp xúc đúng | Đường thẳng cắt 2 điểm |
| M06 | Tam giác vuông tại A | Góc A đúng, dấu tại A | Dấu ở B |
| M07 | Tứ giác ABCD lồi | Các cạnh không tự cắt | Nhầm A–C–B–D |
| M08 | Phép đối xứng trục | Trục là trung trực AA' | Ảnh chỉ dịch ngang |
| M09 | Hình chóp `S.ABC` | S không thuộc mặt đáy | S nằm trong mặt phẳng ABC |
| M10 | Hình chóp đều | H đúng tâm đa giác đều đáy | Chân đường cao sai |
| M11 | Lăng trụ đứng | Cạnh bên ⟂ đáy thực, hai đáy bằng nhau | Sai tương ứng đỉnh |
| M12 | Hình chiếu song song | Thẳng hàng/song song/tỉ số thích hợp được bảo toàn | Vẽ đáy song song thành hình thang do phối cảnh mà không nói rõ |
| M13 | Hai đường chéo nhau | Không tạo 'giao điểm' 3D giả | Đánh dấu giao của hai nét ảnh |
| M14 | Thiết diện | Mỗi cạnh thiết diện đúng mặt chung | Nối điểm xuyên mặt |
| M15 | Vectơ AB | Chiều A→B đúng | Mũi tên B→A |
| M16 | Oxyz | Điểm theo đúng (x,y,z) | Đổi x và y khi xoay camera |
| M17 | `y=x²` | Đỉnh O, hướng mở lên, đối xứng Oy | Đỉnh lệch hoặc mở xuống |
| M18 | `y=−x²` | Đỉnh O, mở xuống | Mở lên |
| M19 | `(x²−1)/(x−1)` | Đường x+1 có lỗ (1,2), x≠1 | Đường liền/tiệm cận đứng |
| M20 | `1/(x−2)` | Hai nhánh tách, TC x=2, y=0 | Nối ngang qua x=2 |
| M21 | `√(x−3)` | Chỉ x≥3, điểm (3,0) đặc | Vẽ x<3 |
| M22 | `log_2 x` | x>0, qua (1,0), tăng | Vẽ nhánh x<0 |
| M23 | `sin x` | Đúng qua O và chu kỳ 2π | Nhầm cos |
| M24 | `tan x` | Tách nhánh tại π/2+kπ | Vẽ đường nối qua điểm không xác định |
| M25 | Hàm từng đoạn | Đầu mở/đóng đúng | Đảo chấm kín/rỗng |
| M26 | Miền `x+y<1` | Đường biên đứt, nửa mặt phẳng đúng | Tô phía sai hoặc nét liền |
| M27 | Hệ bất phương trình | Chỉ vùng giao nghiệm | Tô hợp các miền |
| M28 | BBT của hàm có cực trị | Dấu đạo hàm và mũi tên khớp | Đồ thị tăng nhưng BBT giảm |
| M29 | Biểu đồ quạt | Tổng góc 360°, tỷ lệ đúng | Các lát cộng 110% |
| M30 | Biểu đồ cột | Chiều cao theo thang trục; nền 0 phù hợp | Cột bằng nhau dù số khác |
| M31 | Histogram độ rộng lớp khác | Diện tích tỷ lệ tần số | Chiều cao = tần số dẫn sai diện tích |
| M32 | Dãy số `u_n` | Chấm tại các n nguyên, không biến thành đồ thị liên tục | Nối thành hàm tùy ý |
| M33 | Bayes | `P(B|A)` từ `P(A|B)` đúng công thức | Đổi điều kiện |
| M34 | Cây xác suất | Tổng nhánh con=1 | Tổng=1,2 |
| M35 | Venn 3 tập | Tô đúng A∩B∩C | Bỏ vùng giao ba tập |
| M36 | Tứ phân vị | Phương pháp tính có khai báo | Dùng Q1 của quy tắc khác không nói |
| M37 | Diện tích giữa hai đường | Đổi thứ tự trên/dưới đúng từng khoảng | Tính diện tích âm |
| M38 | Tỉ lệ trục Oxy dùng đo góc | Hai đơn vị ngang/dọc bằng nhau | Góc hình méo vẫn ghi đo trực tiếp |
| M39 | Phép quay 90° | Góc, tâm, chiều quay chính xác | Quay cùng chiều khi đề yêu cầu ngược |
| M40 | Hình khai triển nón | Độ dài cung quạt bằng 2πr | Vẽ quạt 90° tùy ý |

### 21.2. Bộ kiểm thử P1 (biểu diễn và UX)

| ID | Hành vi | PASS |
|---|---|---|
| V01 | Nét khuất trên chóp | Tách đúng các phần theo camera |
| V02 | Đồ thị gần tiệm cận | Không có đoạn nối giả |
| V03 | Nhãn O và 0 gần gốc | Không chồng khó đọc |
| V04 | Nhiều giao tuyến | Đủ layer và không che tên điểm |
| V05 | In đen trắng | Vẫn phân biệt quan hệ bằng kiểu nét/dấu |
| V06 | Slide 16:9 | Không clipping, nhãn đủ lớn |
| V07 | PDF/Word | Font Toán không lỗi, ký hiệu nguyên vẹn |
| V08 | 3D xoay 180° | Nét thấy/khuất được tính lại |
| V09 | Kéo một điểm ràng buộc | Điểm không rời đường/mặt gốc |
| V10 | Khôi phục hình ban đầu | Đúng trạng thái và camera ban đầu |
| V11 | Giá trị tùy biến trong bảng/đồ thị | Nhãn, trục và hình cập nhật đồng bộ |
| V12 | Tô vùng diện tích | Không che đồ thị và giao điểm chính |
| V13 | Học sinh xem ban đầu | Không thấy đáp án chưa được công bố |
| V14 | Hiệu ứng từng bước | Các điểm chỉ xuất hiện khi đến bước hợp lý |
| V15 | Mô hình có độ tương phản thấp | Được cải thiện hoặc cảnh báo |

### 21.3. Lỗi có tính hệ thống phải chủ động phát hiện

1. Vẽ hình theo mắt mà không mô hình hóa quan hệ.
2. Nhầm `đường thẳng AB` với đoạn `AB`; hoặc mở rộng sai phía của tia.
3. Vẽ trung điểm/đường cao/trung trực chỉ gần đúng rồi lấy hình để chứng minh.
4. Làm tam giác cân/vuông trong trường hợp bất kỳ.
5. Thêm dấu hai đoạn bằng nhau như yếu tố trang trí.
6. Đặt giao điểm trên ảnh chiếu của hai đường 3D chéo nhau.
7. Đường cao chóp đều đặt vào trọng tâm sai của đáy hoặc chọn sai chân theo giả thiết.
8. Dùng phép phối cảnh làm mất tính song song nhưng gọi đó là phép chiếu song song.
9. Không tính lại cạnh khuất khi xoay 3D.
10. Nối đường cong qua tiệm cận/điểm không xác định.
11. Rút gọn phân thức rồi quên điểm loại từ biểu thức gốc.
12. Đặt chấm đặc ở đầu mút bị loại.
13. Vẽ đồ thị dãy số thành đường liên tục không giải thích.
14. Tô nhầm nửa mặt phẳng nghiệm hoặc tô hợp thay vì giao.
15. Vẽ BBT không ăn khớp đồ thị.
16. Làm méo trục số hoặc mặt phẳng tọa độ gây sai phép đo.
17. Trục tung cột không bắt đầu từ 0 mà không cảnh báo.
18. Góc quạt không đúng tỷ lệ; tổng tỷ lệ không bằng 100%.
19. Dùng cột histogram cao theo tần số khi bề rộng nhóm khác nhau.
20. Dùng quy tắc tứ phân vị khác SGK mà không công bố.
21. Nhầm xác suất có điều kiện và xác suất giao; nhầm đảo điều kiện Bayes.
22. Quên cập nhật đơn vị, ngày/năm khi dùng dữ liệu thực tiễn.
23. Chữ nhỏ, nhãn trùng nhau, hình bị cắt, màu không phân biệt trong bản in.
24. Ẩn toàn bộ câu hỏi trên speaker notes, khiến học sinh không biết nhiệm vụ.
25. Lộ lời giải trước khi học sinh thực hiện nhiệm vụ khám phá.

---

## 22. MẪU LỆNH DÙNG NGAY CHO AI VÀ VÍ DỤ ĐẶC TẢ

### 22.1. System instruction đề xuất

```text
VAI TRÒ: Bạn là Math Diagram Engine cho Toán THCS và THPT Việt Nam (lớp 6–12).
Bạn PHẢI tuân theo tài liệu MATH_DIAGRAM_STANDARD_THCS_THPT_V1_0_2026-10-29.md.

THỨ TỰ ƯU TIÊN:
1) Dữ liệu toán học và giả thiết thật
2) Yêu cầu cần đạt / SGK / bài học / mục tiêu sư phạm
3) Quy ước hình học và trực quan
4) Khả năng đọc, khả năng tiếp cận
5) Thẩm mỹ

QUY TRÌNH:
A. Phân tích đề bài thành đối tượng, quan hệ, công thức, miền xác định, trạng thái hiển thị.
B. Xác minh mọi ràng buộc trước khi vẽ. Nếu mâu thuẫn, báo rõ; không đoán sửa đề.
C. Tạo scene specification có thể tái tạo. Không dùng ảnh minh họa AI như nguồn sự thật tọa độ.
D. Chọn góc nhìn, hệ trục, kiểu nét, màu sắc, viewport thích hợp.
E. Kiểm tra toán học, render, khả năng đọc và sư phạm độc lập.
F. Chỉ xuất hình khi không còn P0/P1; nếu chưa rõ một giả thiết quan trọng, trả NEEDS_TEACHER_CONFIRMATION.
G. Xuất file có thể sửa khi được yêu cầu, giữ nguồn và minh chứng kiểm định.

CẤM:
- Thêm dấu bằng nhau, vuông góc, song song chưa xác lập.
- Nối đồ thị qua điểm không xác định.
- Đánh dấu giao của hai nét ảnh chéo nhau như giao điểm 3D thật.
- Đo chiều dài/góc thực từ hình chiếu xiên hoặc hình sai tỉ lệ.
- Làm lộ lời giải ở trạng thái hình ban đầu khi không được yêu cầu.
- Tự bịa dữ liệu thống kê hay nguồn tham khảo.
```

### 22.2. Mẫu user request khi giao việc

```text
Hãy tạo hình Toán học theo chuẩn đính kèm.
Khối lớp: [6–12]
Bài/chủ đề: [...]
Bộ SGK nếu có: [...]
Đề bài và giả thiết nguyên văn: [...]
Loại hình: [2D / 3D / đồ thị / bảng / thống kê / xác suất / mô phỏng]
Mục đích: [slide dạy học / đề kiểm tra / phiếu / app 3D]
Trạng thái hiển thị: [ban đầu / gợi ý / lời giải / có tương tác]
Định dạng cần xuất: [SVG/PDF/PNG/PPTX/HTML/GGB]
Ràng buộc đặc biệt: [không lộ đáp án, đen trắng, tỉ lệ, chỉnh sửa ...]

Yêu cầu: tự kiểm tra đúng toán học, nêu các giả thiết còn thiếu (nếu có),
không thay đổi nội dung đề. Báo trạng thái nghiệm thu PASS/BLOCKED.
```

### 22.3. Ví dụ scene specification 2D (JSON tham khảo)

```json
{
  "version": "1.0.0",
  "diagramType": "euclidean-2d",
  "grade": 8,
  "topic": "Thales trong tam giác",
  "mathObjects": [
    {"id": "A", "type": "point", "xy": [0, 4]},
    {"id": "B", "type": "point", "xy": [-3, 0]},
    {"id": "C", "type": "point", "xy": [4, 0]},
    {"id": "D", "type": "point", "definition": "A+0.4*(B-A)"},
    {"id": "E", "type": "point", "definition": "A+0.4*(C-A)"},
    {"id": "ABC", "type": "polygon", "vertices": ["A", "B", "C"]},
    {"id": "DE", "type": "segment", "endpoints": ["D", "E"]}
  ],
  "constraints": [
    "D belongs to segment AB",
    "E belongs to segment AC",
    "AD/AB = AE/AC = 0.4",
    "DE parallel BC"
  ],
  "view": {"projection": "2d", "equalAspect": true},
  "style": {"main": "#1F2937", "highlight": "#006D77"},
  "pedagogy": {"phase": "initial", "showAnswer": false},
  "validation": {"math": "required", "labels": "required"}
}
```

**Lưu ý:** ví dụ mô tả `definition` là một biểu thức minh họa cấu trúc, không phải cú pháp chuẩn có thể thực thi trong mọi công cụ. Bộ dựng thực tế phải định nghĩa rõ bộ phân tích biểu thức hoặc thay bằng ID của thao tác hình học.

### 22.4. Ví dụ đồ thị có lỗ và kiểm thử (JSON tham khảo)

```json
{
  "version": "1.0.0",
  "diagramType": "function-graph",
  "grade": 12,
  "expressionOriginal": "(x^2 - 1)/(x - 1)",
  "domain": "R\\{1}",
  "simplifiedOnDomain": "x+1",
  "excludedPoints": [{"x": 1, "y": 2, "marker": "open-circle"}],
  "verticalAsymptotes": [],
  "requiredAssertions": [
    "not-in-domain(1)",
    "hole(1,2)",
    "not-vertical-asymptote(1)"
  ],
  "view": {"xMin": -4, "xMax": 5, "yMin": -3, "yMax": 6},
  "validation": {"math": "required", "render": "required"}
}
```

### 22.5. Ví dụ hình 3D có cạnh khuất (JSON tham khảo)

```json
{
  "version": "1.0.0",
  "diagramType": "solid-3d",
  "grade": 11,
  "topic": "Hình chóp tam giác",
  "vertices": {
    "A": [0, 0, 0],
    "B": [4, 0, 0],
    "C": [1, 3, 0],
    "S": [1.5, 1, 4]
  },
  "faces": [["A", "B", "C"], ["S", "A", "B"], ["S", "B", "C"], ["S", "C", "A"]],
  "constraints": ["S is not in plane ABC"],
  "view": {
    "mode": "parallel-projection",
    "camera": "auto-select-visible-edges",
    "showHiddenEdges": "dashed",
    "recomputeHiddenEdgesOnRotate": true
  },
  "interaction": ["rotate", "zoom", "reset", "toggle-auxiliary-edges"],
  "validation": ["math", "depth-occlusion", "label-collision", "projection-type"]
}
```

### 22.6. Ví dụ sơ đồ Bayes

Bài toán mẫu: Một lớp có 60% học sinh nhóm A và 40% nhóm B. Tỉ lệ đạt bài kiểm tra trong hai nhóm lần lượt là 80% và 50%. Cây xác suất đúng:

```text
Bắt đầu
├── Nhóm A: 0.6
│   ├── Đạt: 0.8        -> P(A∩Đạt)=0.48
│   └── Không đạt: 0.2  -> P(A∩Không đạt)=0.12
└── Nhóm B: 0.4
    ├── Đạt: 0.5        -> P(B∩Đạt)=0.20
    └── Không đạt: 0.5  -> P(B∩Không đạt)=0.20

P(Đạt)=0.48+0.20=0.68
P(A|Đạt)=0.48/0.68 = 12/17 ≈ 0.7059
```

AI phải giữ các xác suất trên nhánh theo đúng điều kiện, không dán `0.48` cho nhánh sau A mà không nói đó là xác suất giao ở lá.

---
## 23. CHECKLIST HOÀN CHỈNH TRƯỚC XUẤT BẢN

### 23.1. Toán học và ràng buộc (bắt buộc)

- [ ] M01. Đã xác định loại hình: 2D / 3D / đồ thị / trục số / tập hợp / thống kê / xác suất / bảng.
- [ ] M02. Đã đọc đúng đề bài, mức lớp, tên điểm, dữ liệu và điều kiện.
- [ ] M03. Không có quan hệ hình học được thêm mà không có giả thiết/định nghĩa/chứng minh.
- [ ] M04. Các điểm thuộc đường, mặt, đường tròn/đường cong đều chính xác.
- [ ] M05. Giao điểm, giao tuyến, thiết diện đúng cả về vị trí lẫn đối tượng sở hữu.
- [ ] M06. Hai đường song song/vuông góc được dựng theo quan hệ toán học thực.
- [ ] M07. Các điểm trung điểm, chân đường cao, chân chiếu và điểm chia tỉ số chính xác.
- [ ] M08. Hình đặc biệt thật sự thỏa các điều kiện của nó.
- [ ] M09. Mô hình 3D nhất quán, không đánh nhầm giao do phép chiếu.
- [ ] M10. Góc, khoảng cách và diện tích không bị suy ra từ hình chiếu xiên.
- [ ] M11. Đồ thị có miền xác định đúng, không thêm điểm không thuộc D.
- [ ] M12. Các nhánh đồ thị không nối qua lỗ, nhảy hoặc tiệm cận đứng.
- [ ] M13. Tiệm cận, giao trục, cực trị và tính đơn điệu chính xác.
- [ ] M14. Bảng biến thiên/bảng dấu ăn khớp dữ liệu hàm số.
- [ ] M15. Dữ liệu thống kê, tần số, tỷ trọng và đơn vị đúng.
- [ ] M16. Quy tắc xác suất, tổng nhánh, xác suất điều kiện và Bayes đúng.
- [ ] M17. Các con số gần đúng có ký hiệu/phương pháp làm tròn hợp lệ.
- [ ] M18. Hình khai triển có thể gấp đúng mô hình hình khối.

### 23.2. Biểu diễn và nhãn

- [ ] R01. Tên đỉnh/điểm/cạnh/trục/đường thống nhất từ đầu đến cuối.
- [ ] R02. Không nhầm đường thẳng, đoạn thẳng, tia và vectơ.
- [ ] R03. Các vạch bằng nhau, dấu góc, song song và vuông góc được gán có nghĩa.
- [ ] R04. Có phân biệt nét thấy/khuất, đường dựng phụ và tiệm cận nếu đồng hiện.
- [ ] R05. Với hình 3D có xoay, che khuất cập nhật theo góc nhìn.
- [ ] R06. Trục số, trục Oxy/Oxyz, thang đo, chiều dương và đơn vị rõ.
- [ ] R07. Điểm mở/đóng và miền nghiệm biên nghiêm/nghiêm ngặt chính xác.
- [ ] R08. Nhãn không đè điểm, cạnh, giao tuyến, đầu mút, dấu góc.
- [ ] R09. Không có phần hình/nhãn bị cắt ngoài khung ngoài ý muốn.
- [ ] R10. Kích thước thực tế khi in/trình chiếu vẫn đọc được.

### 23.3. Sư phạm và xuất file

- [ ] P01. Đúng yêu cầu cần đạt, đúng SGK/bài học theo đầu vào.
- [ ] P02. Hình ban đầu không làm lộ lời giải ngoài ý muốn.
- [ ] P03. Tất cả nhiệm vụ/câu hỏi cần HS đọc đều được hiển thị ở phần HS thấy.
- [ ] P04. Các bước dựng theo trình tự có logic; đối tượng chỉ xuất hiện khi cần.
- [ ] P05. Có hỗ trợ gợi ý/hiện đáp án có kiểm soát nếu là hình động.
- [ ] P06. Màu, nét, nhãn đáp ứng khả năng đọc và không chỉ mã hóa bằng màu.
- [ ] P07. Có mô tả thay thế/ghi chú đối tượng nếu cần hỗ trợ tiếp cận.
- [ ] P08. File xuất đúng định dạng người dùng cần; được mở kiểm tra trong phần mềm đích.
- [ ] P09. Khi cần chỉnh sửa, đã lưu nguồn hình và đối tượng thay vì chỉ ảnh chụp.
- [ ] P10. Mọi kiểm tra P0/P1 đã PASS; trạng thái công bố phản ánh sự thật.

### 23.4. Phân loại kết quả cuối

- `PASS`: không phát hiện lỗi toán học/biểu diễn nghiêm trọng, kiểm tra hiển thị hoàn tất.
- `PASS_WITH_NOTES`: đúng toán học, còn ghi chú nhỏ P2/P3 không ảnh hưởng hiểu bài.
- `NEEDS_TEACHER_CONFIRMATION`: còn thiếu thông tin quyết định cách biểu diễn hay mức tiết lộ.
- `BLOCKED`: phát hiện lỗi P0/P1 hoặc điều kiện toán học mâu thuẫn chưa được xử lý.

**Mẫu báo cáo QA:**

```text
Math Diagram QA Report
Version: 1.0.0
Date: 2026-10-29
Grade / Topic: ...
Input source: ...
Math constraints verified: ... / ...
Rendering checks passed: ... / ...
Label collisions: 0 critical
Graph domain/asymptotes checked: yes/no/not applicable
3D depth/hidden-edge checked: yes/no/not applicable
Statistics/probability validation: yes/no/not applicable
Pedagogical reveal gate: pass/block/not applicable
Export formats tested: ...
Issues: [ID / severity / evidence / correction]
Final status: PASS | PASS_WITH_NOTES | NEEDS_TEACHER_CONFIRMATION | BLOCKED
```

---

## 24. NGUỒN THAM CHIẾU VÀ QUẢN TRỊ PHIÊN BẢN

### 24.1. Nguồn chính sách, chương trình và SGK

**[S01]** Bộ Giáo dục và Đào tạo / Cơ sở dữ liệu văn bản quy phạm pháp luật — **Thông tư 32/2018/TT-BGDĐT**, chương trình giáo dục phổ thông ban hành ngày **26/12/2018**. Chú ý theo dõi văn bản sửa đổi/hợp nhất khi áp dụng.  
URL: https://vbpl.moj.gov.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721

**[S02]** Cổng thông tin Chính phủ — **Thông tư 17/2025/TT-BGDĐT**, ngày **12/09/2025**, có hiệu lực cùng ngày theo thông tin văn bản. Tham chiếu để kiểm tra trạng thái cập nhật chương trình.  
URL: https://chinhphu.vn/?docid=215347&pageid=27160

**[S03]** Sở GD&ĐT Hà Nội — bài thông tin nội dung sửa đổi theo Thông tư 17/2025 và những nhóm môn có điều chỉnh.  
URL: https://www.hanoi.edu.vn/pho-bien-giao-duc-phap-luat/sua-doi-bo-sung-mot-so-noi-dung-trong-chuong-trinh-giao-duc-pho-thong/ctmb/1117/16548

**[S04]** Cổng thông tin Chính phủ — **Công văn 5208/BGDĐT-GDPT**, ban hành ngày **07/08/2026**, hướng dẫn nhiệm vụ giáo dục phổ thông năm học **2026–2027**.  
URL: https://xaydungchinhsach.chinhphu.vn/cong-van-so-5208-bgddt-gdpt-huong-dan-thuc-hien-nhiem-vu-giao-duc-pho-thong-nam-hoc-2026-2027-119260808110247193.htm

**[S05]** Cổng thông tin Chính phủ — **dự thảo** sửa đổi chương trình công bố ngày **21/08/2026**. Đây là **dự thảo**, chỉ dùng để theo dõi, **không** coi là văn bản đang có hiệu lực nếu chưa được ban hành.  
URL: https://xaydungchinhsach.chinhphu.vn/toan-van-du-thao-thong-tu-sua-doi-bo-sung-mot-so-noi-dung-trong-chuong-trinh-giao-duc-pho-thong-119260820174117596.htm

**[S06]** Cơ sở giáo dục thuộc hệ thống trường học — toàn văn Chương trình GDPT môn Toán đính kèm Thông tư 32/2018/TT-BGDĐT; sử dụng để tra cứu riêng nội dung lớp 6–12 và yêu cầu cần đạt.  
URL: https://thcsandong.haiphong.edu.vn/van-ban-bo-gddt/chuong-trinh-giao-duc-pho-thong-mon-toan-ban-hanh-kem-theo-thong-tu-so-322018tt/vbctmb/20343/91425

**[S07]** SGK Toán 11 *Kết nối tri thức* — **Bài 14, Phép chiếu song song**; tham chiếu các tính chất hình biểu diễn không gian.  
URL: https://www.sgkvn.com/lop-11-14/ket-noi-tri-thuc-voi-cuoc-song-3/chuong-iv-quan-he-song-song-trong-khong-gian-3442/bai-14-phep-chieu-song-song-12660.html

**[S08]** SGK Toán 8 *Kết nối tri thức* — Bài 15, Định lí Thalès trong tam giác; minh họa tính nhất quán điểm thuộc và song song.  
URL: https://www.sgkvn.com/lop-8-11/ket-noi-tri-thuc-voi-cuoc-song-3/chuong-iv-dinh-li-thales-2124/bai-15-dinh-li-thales-trong-tam-giac-7171.html

### 24.2. Tài liệu chính thức về công cụ

**[T01]** GeoGebra Manual — 3D Graphics View: đối tượng 3D, phép chiếu, trục, xoay/zoom.  
URL: https://geogebra.github.io/docs/manual/en/3D_Graphics_View/

**[T02]** GeoGebra Manual — Style Bar: chỉnh màu, kiểu nét, kiểu nhãn, font.  
URL: https://geogebra.github.io/docs/manual/en/Style_Bar/

**[T03]** GeoGebra Manual — Labels and Captions: nhãn, giá trị, chú thích, LaTeX.  
URL: https://geogebra.github.io/docs/manual/en/Labels_and_Captions/

**[T04]** GeoGebra Manual — 3D Graphics Tools: dựng hình chóp, lăng trụ, hình hộp, nón, cầu, mặt phẳng và giao.  
URL: https://geogebra.github.io/docs/manual/en/tools/3D_Graphics_Tools/

**[T05]** Desmos Help — Graph Settings; trang được ghi cập nhật **10/09/2026** tại thời điểm tra cứu: viewport, lưới, bước chia, nhãn trục, độ/radian.  
URL: https://help.desmos.com/hc/en-us/articles/4405296853517-Graph-Settings

**[T06]** Desmos Help — Inequalities and Restrictions; trang được ghi cập nhật **21/10/2026** tại thời điểm tra cứu: biên nghiêm/nghiêm ngặt, hạn chế miền.  
URL: https://help.desmos.com/hc/en-us/articles/4407885334285-Inequalities-and-Restrictions

**[T07]** Desmos Help — Graph and Connect Coordinate Points: điểm mở, bảng điểm, kết nối điểm.  
URL: https://help.desmos.com/hc/en-us/articles/4405411436173-Graph-and-Connect-Coordinate-Points

**[T08]** Desmos Help — Graphing Calculator User Guide; trang được ghi cập nhật **26/10/2026** tại thời điểm tra cứu.  
URL: https://help.desmos.com/hc/en-us/articles/202529279-Desmos-Graphing-Calculator-User-Guide

### 24.3. Hướng dẫn khả năng tiếp cận

**[A01]** W3C — WCAG 2.2, Success Criterion 1.4.11: **Non-text Contrast**; các thành phần đồ họa mang thông tin cần hiểu, tiêu chí 3:1 trong phạm vi áp dụng.  
URL: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

**[A02]** W3C — WCAG 2.2, Success Criterion 1.4.3: **Contrast (Minimum)**; 4,5:1 cho chữ thường, 3:1 cho chữ lớn theo định nghĩa và ngoại lệ của chuẩn.  
URL: https://www.w3.org/TR/WCAG22/

### 24.4. Phân biệt nguồn và quy tắc nội bộ

- `[S]` là căn cứ chương trình/SGK; `[T]` mô tả khả năng và hành vi công cụ; `[A]` là chuẩn khả năng tiếp cận.
- Các quy tắc thiết kế như bảng màu HEX, nét 1,8–2,5 px, nhãn 6–12 px, trạng thái kiểm tra P0–P3 và pipeline AI là **khuyến nghị thiết kế/kiến trúc của tài liệu này**, không phải trích dẫn nguyên văn của các nguồn trên.
- Bài học, đề kiểm tra và quy định nội bộ có thể bổ sung yêu cầu chi tiết hơn, nhưng không được phá tính đúng đắn toán học.
- Dữ liệu thực tiễn thay đổi theo thời gian (đơn giá, dân số, kết quả khảo sát, lịch năm học) phải kiểm tra **nguồn và ngày dữ liệu**, không dùng số liệu cũ để tự động cập nhật biểu đồ.
- Khi chuyển giao tệp này cho AI khác, giữ nguyên ngày phiên bản; nếu làm việc sau **29/10/2026**, phải đối chiếu lại các văn bản và tài liệu công cụ có thể thay đổi.

### 24.5. Lịch sử phiên bản

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 1.0.0 | 29/10/2026 | Tích hợp toàn bộ bộ chuẩn hình phẳng, hình không gian, đồ thị; mở rộng Toán 6–12: trục số, Venn, bất phương trình, phép biến hình, dãy số, bảng biến thiên, thống kê, xác suất, xác suất có điều kiện, đồ họa 3D và pipeline QA AI |

---

## KẾT LUẬN VẬN HÀNH CHO AI

**Một hình Toán học chỉ được coi là 'đạt' khi mô hình toán học đúng, quy ước biểu diễn không gây hiểu sai, người học có thể đọc được và các kiểm tra thích hợp đã hoàn tất.**

Không đánh đồng *vẻ đẹp hình ảnh*, *độ chính xác hình học* và *tính hợp lý sư phạm*: một hình có thể đẹp nhưng sai toán; một hình đúng toán nhưng nhãn quá nhỏ; một hình đúng và dễ đọc nhưng không phù hợp khi nó tiết lộ đáp án trước thời điểm học sinh khám phá.

Khi còn xung đột, hãy áp dụng lại nguyên tắc:

**CHÍNH XÁC → ĐÚNG NGỮ CẢNH → NHẤT QUÁN → DỄ ĐỌC → THẨM MỸ → TƯƠNG TÁC/CHỈNH SỬA.**

**HẾT TÀI LIỆU.**
