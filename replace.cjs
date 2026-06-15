const fs = require('fs');
const file = 'src/hooks/useLessonCreator.ts';
let content = fs.readFileSync(file, 'utf8');

const OLD_STRING = "const prompt = `\n          BẠN LÀ MỘT CHUYÊN GIA GIÁO DỤC CAO CẤP.";

const NEW_CONTENT = `        const agentContext = {
          title: currentPlan.title || '',
          subject: subject,
          grade: currentPlan.grade || '',
          week: currentPlan.week || '',
          requirement: singleRequirement,
          templateFormat: isAdaptiveReadyDefault ? 'Adaptive' : (builtinFormat === 'cv5512' ? 'CV5512' : 'Claude'),
          templateContext: templateContext + '\\n' + skeletonPromptSection,
          additionalRequirements: isAdaptiveReadyDefault ? \`
          ===== YÊU CẦU RIÊNG CHO KIỂU MẶC ĐỊNH MỚI — GIÁO ÁN ĐẸP, SẴN SÀNG TẠO BÀI HỌC PHÂN HOÁ =====
          - Bắt buộc dùng đúng cấu trúc trong MẪU GIÁO ÁN MẶC ĐỊNH ở trên, đặc biệt là UI/UX 7:3 và khung Bước 0 đến Bước 5.
          - Đây vẫn là giáo án chính thức trong Soạn giáo án: phải trình bày đẹp, rõ ràng, có thể xem/sửa/lưu/xuất Word/PDF như các mẫu còn lại.
          - Trọng tâm nội dung là tạo giáo án có thể chuyển đổi sang AdaptiveLesson độc lập: diagnosticTest, knowledgeUnits, routes, quickCheck, notebook, practiceTasks, remediation loop, exit/reflection, simulation/external tools.
          - Phần đầu giờ phải là Bước 0 Pre-test của chính bài học, không phải kiểm tra bài cũ; tối thiểu 5 câu đa dạng và có giải thích từng phương án/tiêu chí.
          - Bước 3 phải đúng cấu trúc luyện tập thích ứng theo Trung bình/Khá/Giỏi và định dạng THPTQG: 3 câu trắc nghiệm, 1 bối cảnh đúng/sai 4 ý, 1 câu trả lời ngắn, kèm loop hỗ trợ 4 tầng.
          - Phải nêu rõ học liệu số, mô phỏng ưu tiên dùng mã TikZ chuẩn cho hình phẳng; nếu có hình học không gian thì phải mô tả mô phỏng 3D xoay/zoom được bằng tọa độ XYZ để hệ thống tự vẽ; đồng thời có Vở Ghi Chép tự động, đồng hồ kép, mục lục thông minh và Time-Filler.
          - Bắt buộc có mục “THẺ CHUYỂN ĐỔI ADAPTIVE” với AdaptiveLessonCard, AdaptiveObjectives, AdaptiveDiagnosticTest, AdaptiveKnowledgeUnits, AdaptiveExitTicket, AdaptivePacingAndRemediation. Mục này là nguồn dữ liệu chính để chuyển trực tiếp sang bài học phân hoá, nên phải cụ thể như dữ liệu đóng gói, không placeholder.
          - Nội dung học sinh đọc ở các bước học không được lẫn thuật ngữ kỹ thuật như schema, UI/UX, bố cục 7:3; chỉ để các thuật ngữ đó trong phần thiết kế/hồ sơ chuyển đổi.
          - Không bắt buộc Danielson, WALT/WILF hay mẫu Công văn 5512 trong kiểu mặc định này, nhưng chất lượng trình bày phải tương đương một giáo án xuất file hoàn chỉnh.
          ===== HẾT YÊU CẦU RIÊNG KIỂU MẶC ĐỊNH =====
          \` : \`===== YÊU CẦU ĐỊNH DẠNG NỘI DUNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
          A. CẤU TRÚC GIÁO ÁN (GIỮ NGUYÊN BẢN MẪU, CHỈ THÊM CHI TIẾT):
          - Phần đầu: WALT và WILF phải chia làm 3 tiêu chí KHÁC NHAU tương ứng 3 mức độ (🌶️ Cơ bản, 🌶️🌶️ Nâng cao, 🌶️🌶️🌶️ Thách thức). TUYỆT ĐỐI KHÔNG lặp lại 1 tiêu chí 3 lần.
          - TỔNG THỜI LƯỢNG: 40 PHÚT. TẤT CẢ 5 HĐ (HĐ1 đến HĐ5) đều PHẢI có kịch bản đối thoại chi tiết (5-8 lượt thoại), KHÔNG ĐƯỢC viết sơ sài ở HĐ1, HĐ4, HĐ5:
            + HĐ1 (Mở đầu): GV đặt câu hỏi khơi gợi WALT/WILF.
            + HĐ2 (Hình thành KT): Diễn giải từng bước tư duy của HS.
            + HĐ3 (Luyện tập): Tối thiểu 3 bài tập (3 mức 🌶️). Cột 3 ghi lời giải.
            + HĐ4 (Vận dụng): Có hội thoại hướng dẫn thực tế.
            + HĐ5 (Sơ kết): Hội thoại HS tự kiểm tra mục tiêu đầu giờ.
          - KHUNG SƯ PHẠM CIS (CHỌN LỌC): Để đảm bảo thời gian, CHỌN NGẪU NHIÊN 1 HOẶC 2 KỸ THUẬT sau để lồng ghép (KHÔNG dùng cả 5 vào 1 bài):
            1. "Thông tin viên" (HĐ1): Dùng ảnh/vấn đề thực tế.
            2. "Thực đơn Toán học" (HĐ3): Giao bài tập theo dạng Menu. Bố trí "Phao cứu sinh".
            3. "Chuyên gia & Phản biện" (HĐ2/HĐ3): HS đóng vai chất vấn "Tại sao?".
            4. "Check-var Công nghệ" (HĐ2): Dùng Desmos/Casio cố tình đưa lỗi sai.
            5. "Vé ra cửa 3-2-1" (HĐ5): Cuối giờ ghi 3 từ khóa, 2 kỹ năng, 1 câu hỏi.
          - TRƯỚC MỖI BẢNG, BẮT BUỘC ghi dòng "**Mục tiêu:**".
          - MỖI HOẠT ĐỘNG trình bày BẢNG MARKDOWN 3 CỘT: 
            | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
          - YÊU CẦU KHÔNG NHẦM CỘT CỦA BẢNG: 
            + Đề bài tập/Menu, lời giải chi tiết phải nằm ở Cột 3 (Nội dung ghi bảng).
            + Lời nói/Hành động của thầy cô ("Phao cứu sinh", "Quét radar") CHỈ NẰM Ở Cột 1.
            + Lời nói/Hành động của học sinh CHỈ NẰM Ở Cột 2.
          - YÊU CẦU ĐỘ CHI TIẾT CỰC CAO (MINUTE-BY-MINUTE):
            + MỖI HOẠT ĐỘNG (Kể cả HĐ1, HĐ4, HĐ5) PHẢI CÓ 5-8 LƯỢT THOẠI QUA LẠI.
            + Cột GV phải dùng hệ thống câu hỏi dẫn dắt (Scaffolding) đi từ dễ đến khó. Chèn các thẻ \\\`[Quét Radar]\\\`, \\\`[Mistake of the Day]\\\`, \\\`[Chấm chéo]\\\`.
          - LỒNG GHÉP 3 TUYÊN NGÔN DEWEY (BẮT BUỘC): dùng thẻ \\\`[💡 Tuyên ngôn: ...]\\\` để chỉ rõ câu nói/hành động nào đáp ứng tuyên ngôn nào.

          B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
          Sau nội dung giáo án, PHẢI thêm phần:
          "## Đánh giá của tổ trưởng chuyên môn"
          BẮT BUỘC trình bày dưới dạng BẢNG MARKDOWN 3 CỘT (Tiêu chí | Điểm | Nhận xét).
          YÊU CẦU ĐỐI VỚI CỘT NHẬN XÉT: Phải viết chi tiết, cụ thể như một tổ trưởng chuyên môn thực thụ (ít nhất 2-3 câu mỗi tiêu chí). CHỈ RÕ giáo án đã làm tốt chỗ nào. TUYỆT ĐỐI KHÔNG viết chung chung.
          Tự chấm điểm theo khung Danielson Miền 1 (Thang 1-4, 4 là Tốt nhất) cho 6 tiêu chí.

          C. VÍ DỤ MẪU (BẮT BUỘC BẮT CHƯỚC PHONG CÁCH NÀY CHO TẤT CẢ CÁC HOẠT ĐỘNG):
          \\\`\\\`\\\`markdown
          ## 🚀 HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~15 phút)
          **Mục tiêu:** Học sinh tự khám phá ra công thức tổng quát và tính chất cơ bản.

          | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
          |---|---|---|
          | **[Quét Radar]** *Quan sát biểu cảm học sinh để xem mức độ hiểu bài.* | | |
          | **GV:** "Các em hãy nhìn vào bảng hệ số ta vừa lập ở HĐ1. Ai phát hiện ra quy luật của các con số này?" | **HS1:** "Thưa thầy, các hệ số này chính là các số trong tam giác Pascal ạ!" | **1. Định lý:** <br/> Công thức tổng quát: <br/> $(a+b)^n = \\sum_{k=0}^{n} C_n^k a^{n-k} b^k$ |
          | **[💡 Tuyên ngôn Dạy và học chất lượng cao: GV đóng vai trò người xúc tác, không áp đặt kiến thức]** <br/> **GV:** "Tuyệt vời! Vậy hệ số của số hạng thứ $k+1$ chính là gì?" | **HS2:** "Nó tương ứng với tổ hợp $C_n^k$ ạ!" | *Lưu ý:* Có $(n+1)$ số hạng. |
          | **GV:** Chốt: "Đây chính là Định lý Nhị thức Newton!" | **HS:** Ghi chép công thức vào vở. | |
          \\\`\\\`\\\`
          ===== HẾT YÊU CẦU ĐỊNH DẠNG =====\`,
          mathRestrictions: mathRestrictions,
          referenceContext: \`\${activeDist ? \`PHÂN PHỐI CHƯƠNG TRÌNH:\\n\${activeDist.content}\` : ''}\\n\${lessonDocsContent ? \`TÀI LIỆU THAM KHẢO:\\n\${lessonDocsContent}\` : ''}\`,
          settings: data.settings,
          onStreamChunk: (chunk: string) => {
            setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(chunk) }));
          },
          onStatusChange: (status: string) => {
            showToast(status, 'info');
          }
        };

        try {
          const finalContent = await import('../lib/agents').then(m => m.runMultiAgentPipeline(agentContext));
          const skeletonValidation = validateMarkdownAgainstSkeleton(finalContent, activeSkeleton);
          if (activeSkeleton && skeletonValidation.issues.length > 0) {
            console.warn('Phase 2A Markdown Skeleton validation warnings:', skeletonValidation);
            showToast(\`Đã tạo giáo án, nhưng cần rà soát skeleton mẫu (\${Math.round(skeletonValidation.score * 100)}%): \${skeletonValidation.issues[0].message}\`, 'warning');
          } else {
            showToast('Đã khởi tạo giáo án cấp độ Senior!');
          }
        } catch (e) {
          console.error(e);
          showToast('Có lỗi xảy ra trong quá trình sinh giáo án', 'error');
        }`;

// replace lines 697 to 800
const lines = content.split('\n');
lines.splice(696, 104, NEW_CONTENT);
fs.writeFileSync(file, lines.join('\n'));
console.log('done!');
