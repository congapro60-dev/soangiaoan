# Hướng dẫn Kỹ thuật: Logic xử lý AI Co-pilot & Báo cáo Năng lực (Dành cho Cline)

Tài liệu này cung cấp sơ đồ logic, cấu trúc dữ liệu và prompt engineering để triển khai các tính năng AI chuyên sâu trong **Giao An Dewey**.

---

## 1. AI Co-pilot Editor (SCREEN_18)

Mô hình này chuyển đổi từ Chatbot sang Trợ lý ngữ cảnh tích hợp trực tiếp vào trình soạn thảo.

### A. Logic "Context-Awareness" (Nhận diện ngữ cảnh)
Cline cần theo dõi vị trí con trỏ (cursor) hoặc khối văn bản đang chọn để gửi bối cảnh cho AI:

```javascript
const getAIContext = (editorState) => {
  const currentSection = editorState.getCurrentSection(); // e.g., "Mục tiêu bài học"
  const selectionText = editorState.getSelectionText();
  
  return {
    section: currentSection,
    content_before: editorState.getTextBefore(500),
    selected_text: selectionText,
    action_type: selectionText ? "TRANSFORM" : "SUGGEST" 
  };
};
```

### B. Prompt Engineering cho Sidebar Ngữ cảnh
Khi người dùng ở mục **"Mục tiêu bài học"**, Sidebar sẽ hiển thị các động từ Bloom. Prompt gửi cho AI:
- **System Prompt:** "Bạn là chuyên gia sư phạm. Hãy gợi ý mục tiêu bài học theo thang đo Bloom (Biết, Hiểu, Vận dụng...). Phản hồi dưới dạng JSON gồm danh sách các động từ và ví dụ cụ thể."
- **User Intent:** "Gợi ý mục tiêu cho bài 'Hàm số bậc nhất' lớp 10."

### C. Tính năng "Ghost Text" (Autocomplete)
Sử dụng Stream API để hiển thị văn bản gợi ý mờ. Nếu người dùng nhấn `Tab`, chèn văn bản đó vào vị trí hiện tại.

---

## 2. Báo cáo Năng lực & Phân tích AI (SCREEN_10)

Hệ thống này cần tổng hợp dữ liệu từ kết quả làm bài của học sinh để đưa ra nhận xét định tính.

### A. Cấu trúc dữ liệu đầu vào cho AI (Input)
Đừng gửi điểm số thô. Hãy gửi dữ liệu đã được phân loại theo chủ đề kiến thức:

```json
{
  "student_results": [
    { "topic": "Hình học Vector", "score": 4.5, "completion_rate": "100%" },
    { "topic": "Giải quyết vấn đề", "score": 8.0, "completion_rate": "90%" }
  ],
  "historical_trend": "Improving in problem-solving, stagnant in geometry."
}
```

### B. Logic xử lý Biểu đồ Radar (Radar Chart)
Cline sử dụng thư viện như `Recharts` hoặc `Chart.js`.
- **Trục tọa độ:** Kiến thức, Kỹ năng, Phẩm chất, Thái độ, Năng lực đặc thù.
- **Dữ liệu:** Map từ điểm trung bình của các bài tập tương ứng với từng nhóm năng lực.

### C. Prompt nhận xét tự động (AI Insights)
"Dựa trên dữ liệu JSON phía trên, hãy viết 1 đoạn nhận xét ngắn gọn (tối đa 3 câu) về điểm mạnh và điểm cần cải thiện của học sinh. Lưu ý dùng ngôn ngữ khích lệ nhưng khách quan."

---

## 3. Quy trình tích hợp cho Cline

1. **State Management:** Sử dụng `useContext` hoặc `Redux` để quản lý `currentLessonData` và `studentPerformanceData`.
2. **Streaming UI:** Đảm bảo khi AI đang "viết" nhận xét hoặc soạn bài, giao diện có hiệu ứng skeleton hoặc cursor nhấp nháy để người dùng biết hệ thống đang xử lý.
3. **Error Handling:** Nếu API AI quá tải, cho phép giáo viên tự nhập liệu và lưu nháp cục bộ (LocalStorage).

---
*Tài liệu này hỗ trợ kết nối SCREEN_18 và SCREEN_10 với logic thực tế.*