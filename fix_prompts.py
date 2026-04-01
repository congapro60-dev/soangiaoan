import sys
sys.stdout.reconfigure(encoding='utf-8')

src = 'src/App.tsx'

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# I want to replace everything from `const prompt = \`` directly under `const lessonDocsContent = lessonDocs.map(f => f.content).join('\\n---\\n');`
# up to the line BEFORE `const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));`

marker_start1 = "const lessonDocsContent = lessonDocs.map(f => f.content).join('\\n---\\n');"
marker_end1   = "const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));"

idx_start1 = content.find(marker_start1)
idx_end1   = content.find(marker_end1, idx_start1)

if idx_start1 != -1 and idx_end1 != -1:
    clean_prompt1 = """        const prompt = `
          Bạn là một chuyên gia giáo dục cao cấp. Hãy soạn một giáo án chi tiết và chuyên nghiệp cho môn học: ${subject}.
          Tiêu đề bài học: ${currentPlan.title}.
          
          ${templateContext}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO CHO BÀI HỌC:\\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG TỪ GIÁO VIÊN: ${singleRequirement}` : ''}

          Yêu cầu chung:
          1. TỔNG HỢP KIẾN THỨC: Hãy sử dụng kiến thức cập nhật nhất từ internet để làm phong phú nội dung bài giảng.

          2. ĐỊNH DẠNG MARKDOWN - QUY TẮC BẮT BUỘC TỐI QUAN TRỌNG:
             a) QUY TẮC SỐ 1 VỀ BẢNG 3 CỘT: Mỗi hàng bảng PHẢI nằm trên ĐÚNG 1 DÒNG. TUYỆT ĐỐI KHÔNG xuống dòng bằng Enter trong ô bảng.
                - Để ngăn cách nội dung trong ô: Dùng "<br/>" (chính xác như vậy, không có dấu cách trong thẻ)
                - Sai: | cell1 | GV: hỏi câu 1 \\n GV: hỏi câu 2 | cell3 |   ← SAI (\\n phá vỡ bảng)
                - Đúng: | cell1 | GV: hỏi câu 1<br/>GV: hỏi câu 2 | cell3 | ← ĐÚNG
             b) TUYỆT ĐỐI KHÔNG chèn hình ảnh ![...](url) vào trong ô bảng - ảnh chỉ được phép giữa các bảng.
             c) Mỗi hoạt động cách nhau 1 dòng trắng.
             d) KHÔNG dùng thẻ HTML như <br> (dạng không tự đóng), <div>, <span>.

          3. CÔNG THỨC TOÁN HỌC:
             - Công thức inline: $...$ (ví dụ: $x^2 + y^2 = r^2$)
             - Công thức block độc lập (ngoài bảng): $$...$$
             - Trong ô bảng: chỉ dùng $...$ (không dùng $$)

          4. HÌNH ẢNH: Chỉ chèn hình ảnh vào ĐOẠN VĂN ngoài bảng. KHÔNG chèn hình ảnh vào trong bảng. Giới hạn tối đa 1 hình cho cả bài (phần mở rộng hoặc kết). Không để hình vào phần kiến thức Toán. Hình dùng API: ![Mô tả](https://image.pollinations.ai/prompt/{mô_tả_tiếng_anh}?width=600&height=300&nologo=true)

          5. MỤC TIÊU HOẠT ĐỘNG: Viết theo dạng "Tôi có thể...". Ví dụ:
             - "Tôi có thể phát biểu được công thức khai triển nhị thức Newton."
             - "Tôi có thể vận dụng công thức để tính hệ số trong khai triển cho n = 4, 5."

          6. KHUNG ĐÁNH GIÁ DANIELSON: Người dùng đã tải lên file Danielson ở phần "Tiêu chí và Quy định". Hãy đọc kĩ nội dung file đó và trích dẫn chính xác và cụ thể tên Miền + Các Chỉ số phụ (chữ cái a, b, c...) khi viết mục "Đối chiếu khung đánh giá Danielson". (Ví dụ: Miền 3b - Đặt câu hỏi và thảo luận, Miền 3c - Lôi cuốn học sinh...).

          7. CHI TIẾT: Đảm bảo đầy đủ các bước lên lớp, mục tiêu, hoạt động học tập và đánh giá.

          8. VÍ DỤ CÚ PHÁP BẢNG 3 CỘT ĐÚNG (BẮT BUỘC THEO MẪU NÀY):
          | 5 phút | GV: Hỏi "Công thức $\\\\binom{n}{k}$ có ý nghĩa gì?"<br/>HS dự kiến: "Là số tổ hợp chọn k phần tử từ n phần tử"<br/>GV: Xác nhận và mở rộng sang khai triển nhị thức | **I. Công thức:**<br/>$(a+b)^n = \\\\sum_{k=0}^{n} \\\\binom{n}{k} a^{n-k}b^k$<br/>**Ví dụ:** $(a+b)^4 = a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4$ |
          => Mỗi hàng bảng chỉ 1 dòng. Dùng <br/> (không có khoảng trắng bên trong) để ngăn cách nội dung trong ô.
          ${subject === 'Toán học' || subject.toLowerCase().includes('toán') ? `
          
===========================================================
YÊU CẦU ĐẶC BIỆT CHO GIÁO ÁN MÔN TOÁN - BẮT BUỘC TUÂN THỦ
===========================================================

A. THÔNG TIN CHUNG (Mục I)
- Thời lượng: 40 phút/tiết
- Gồm 3 phần bắt buộc:
  1. NĂNG LỰC CỐT LÕI: Liệt kê các năng lực đặc thù môn Toán đạt được
  2. MỤC TIÊU PHÂN HÓA (3 đối tượng):
     - Học sinh Trung bình: Mục tiêu tối thiểu cần đạt
     - Học sinh Khá: Mục tiêu ở mức vận dụng
     - Học sinh Giỏi: Mục tiêu ở mức vận dụng cao, sáng tạo
  3. CHUẨN BỊ: Công cụ, dụng cụ, phương tiện cụ thể.

B. CẤU TRÚC BẮT BUỘC của giáo án theo thứ tự:
  I.   THÔNG TIN CHUNG
  II.  TIẾN TRÌNH DẠY HỌC, gồm:
       1. Hoạt động KHỞI ĐỘNG/TRẢI NGHIỆM
       2. Xác định MỤC TIÊU HỌC TẬP (GV cho HS phát biểu mục tiêu)
       3. [Câu hỏi ĐỊNH HƯỚNG cho cả bài - dẫn ra từ hoạt động khởi động]
       4. Các Hoạt động HÌNH THÀNH KIẾN THỨC (chia nhỏ để giải quyết câu hỏi định hướng)
       5. Hoạt động LUYỆN TẬP
  III. CƠ HỘI HỌC TẬP MỞ RỘNG (TÙY CHỌN)
  IV.  SƠ KẾT
  V.   BÀI TẬP VỀ NHÀ

C. CÁCH TRÌNH BÀY TỪNG HOẠT ĐỘNG (BẮT BUỘC):
Mỗi hoạt động đều được trình bày theo thứ tự sau (KHÔNG được gộp chung):
  [TÊN HOẠT ĐỘNG - in đậm, có số thứ tự]
  - Mục tiêu: (mục tiêu riêng của hoạt động này)
  - Đối chiếu khung đánh giá Danielson: (ghi rõ miền năng lực Danielson)

  Sau đó là BẢNG 3 CỘT (mỗi hoạt động 1 bảng riêng biệt, KHÔNG gộp):
  | Thời gian | Hoạt động của Giáo viên và Học sinh | Nội dung ghi bảng/chiếu PPT |
  |-----------|--------------------------------------|------------------------------|
  - Cột THỜI GIAN: Ghi rõ số phút (ví dụ: 3 phút, 5 phút).
  - Cột HOẠT ĐỘNG CỦA GV & HS: Ghi các CÂU HỎI định hướng, câu trả lời dự kiến. Chú ý ngăn cách bằng <br/>. Đặt câu hỏi phải thúc đẩy tư duy.
  - Cột NỘI DUNG GHI BẢNG/CHIẾU PPT: Nội dung lý thuyết, công thức dùng MathType ($...$), ví dụ minh họa và đáp án.

D. QUY TẮC NỘI DUNG:
  1. CÂU HỎI ĐỊNH HƯỚNG: Đặt SAU hoạt động khởi động, chỉ ra vấn đề cốt lõi cần giải quyết cho cả bài học.
  2. HOẠT ĐỘNG KHỞI ĐỘNG: Đưa ra bài toán thực tiễn mang tính "CÔNG DÂN TOÀN CẦU".
  3. KIỂM TRA NHANH: Sau mỗi phần lý thuyết/công thức phải có câu hỏi kiểm tra nhanh (chờ kết quả check-in bằng biểu đồ tay v.v).
  4. LUYỆN TẬP: Đưa 3 bài tập phân hóa:
     - Bài 1 (Trung bình): Áp dụng công thức
     - Bài 2 (Khá): Vận dụng có biến tấu
     - Bài 3 (Giỏi): Vận dụng cao, kết hợp nhiều kiến thức.
  5. YẾU TỐ BẮT BUỘC (Đánh dấu vào từng hoạt động):
     - [🌐 Công dân toàn cầu]: Các vấn đề liên quan đời sống, thực tiễn chung.
     - [💻 Công dân kỹ thuật số]: Ứng dụng công nghệ, máy tính bỏ túi.
     - [⭐ Dạy học chất lượng cao]: Hoạt động suy ngẫm, thảo luận.

E. PHÂN BỔ THỜI GIAN
  - Khởi động: 5 phút | Xác định mục tiêu: 2 phút | Hình thành kiến thức: 15-18 phút | Luyện tập: 12-15 phút | Mở rộng: 3 phút | Sơ kết: 3-5 phút

F. KIỂM TRA CUỐI: Trước khi trả kết quả, AI tự kiểm tra:
  ✓ Có Bảng 3 Cột không có dấu Enter xuống dòng (chỉ dùng <br/>) không?
  ✓ Đủ [Câu hỏi ĐỊNH HƯỚNG cho cả bài] không?
  ✓ Mục tiêu theo format "Tôi có thể" không?
===========================================================
          ` : ''}
        `;
"""
    content = content[:idx_start1 + len(marker_start1) + 1] + clean_prompt1 + "        " + content[idx_end1:]
    print("Replaced single prompt.")


# Now the bulk mode one:
marker_start2 = "// Bulk mode"
marker_end2 = "const response = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));"

idx_start2 = content.find(marker_start2)
idx_end2 = content.find(marker_end2, idx_start2)

if idx_start2 != -1 and idx_end2 != -1:
    clean_prompt2 = """// Bulk mode
        const prompt = `
          Bạn là một chuyên gia giáo dục cao cấp.
          DỰA TRÊN PHÂN PHỐI CHƯƠNG TRÌNH SAU:\\n${distributionFile?.content}
          
          YÊU CẦU SOẠN THẢO HÀNG LOẠT: ${bulkCommand}
          MÔN HỌC: ${subject}
          
          ${templateContext}
          
          Hãy soạn các giáo án theo yêu cầu trên. 
          QUAN TRỌNG: Trả về kết quả dưới dạng một mảng JSON các đối tượng, mỗi đối tượng có 2 trường: "title" (tiêu đề bài học) và "content" (nội dung giáo án bằng Markdown).
          Ví dụ: [{"title": "Bài 1...", "content": "..."}, {"title": "Bài 2...", "content": "..."}]
          Chỉ trả về JSON, không kèm theo văn bản giải thích nào khác.
        `;
"""
    content = content[:idx_start2] + clean_prompt2 + "        " + content[idx_end2:]
    print("Replaced bulk prompt.")

with open(src, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Replacement complete.")
