# Hướng dẫn Kỹ thuật: Kết nối Ma trận Smart Grid với API Sinh đề (Dành cho Cline)

Tài liệu này cung cấp sơ đồ logic và cấu trúc dữ liệu để Cline có thể triển khai tính năng sinh đề thi dựa trên ma trận nhận thức đã thiết kế tại `SCREEN_25`.

---

## 1. Cấu trúc Dữ liệu Ma trận (Data Schema)

Để API sinh đề hoạt động chính xác, dữ liệu từ giao diện ma trận cần được đóng gói theo cấu trúc sau:

```json
{
  "exam_metadata": {
    "subject": "Toán học",
    "grade": "12",
    "duration": 90,
    "total_points": 10.0
  },
  "matrix_config": [
    {
      "topic_id": "topic_01",
      "topic_name": "Hàm số & Đồ thị",
      "levels": {
        "remember": 4,   // Nhận biết
        "understand": 3, // Thông hiểu
        "apply": 2,      // Vận dụng
        "analyze": 1     // Vận dụng cao
      }
    },
    {
      "topic_id": "topic_02",
      "topic_name": "Khối đa diện",
      "levels": {
        "remember": 2,
        "understand": 2,
        "apply": 1,
        "analyze": 1
      }
    }
  ],
  "constraints": {
    "question_type_ratio": {
      "multiple_choice": 0.8, // 80% trắc nghiệm
      "essay": 0.2           // 20% tự luận
    },
    "difficulty_distribution": "adaptive_by_matrix"
  }
}
```

---

## 2. Luồng Xử lý (Workflow for Cline)

1.  **Thu thập dữ liệu:** Khi người dùng nhấn nút **"Sinh đề AI"**, hãy lấy toàn bộ giá trị từ các ô input trong bảng `Smart Matrix Grid`.
2.  **Validate:** Kiểm tra tổng số câu và tổng điểm có khớp với thiết lập chung không.
3.  **Prompt Engineering (Gửi tới API):** 
    - Chuyển đổi JSON trên thành một prompt chi tiết.
    - *Ví dụ prompt:* "Hãy tạo đề thi môn Toán lớp 12, thời gian 90 phút. Cấu trúc: Chủ đề Hàm số cần 4 câu nhận biết, 3 câu thông hiểu... Yêu cầu định dạng JSON đầu ra gồm câu hỏi, 4 phương án và đáp án giải thích."
4.  **Xử lý Phản hồi (Stream):** Hiển thị trạng thái "Đang sinh câu hỏi..." tại khu vực `Bản xem trước` (Preview area) ở phía dưới màn hình `SCREEN_25`.

---

## 3. Mã giả tích hợp (Pseudo-code)

```javascript
const handleGenerateExam = async (matrixData) => {
  setLoading(true);
  try {
    // 1. Gọi API backend xử lý AI
    const response = await api.post('/generate-exam-by-matrix', matrixData);
    
    // 2. Cập nhật giao diện Preview
    const examContent = response.data;
    renderPreview(examContent);
    
    toast.success("Đã sinh đề thành công theo ma trận!");
  } catch (error) {
    toast.error("Có lỗi khi gọi AI, vui lòng thử lại.");
  } finally {
    setLoading(false);
  }
};
```

---

## 4. Gợi ý cho Cline khi triển khai Component

- **State Management:** Sử dụng `useState` hoặc `useReducer` để quản lý mảng ma trận. Mỗi khi giáo viên thay đổi số lượng câu ở một ô, hãy tự động tính lại dòng "Tổng số câu" và "Tỉ lệ %" ở dưới cùng.
- **Visual Feedback:** Khi nhấn "Sinh đề AI", hãy kích hoạt hiệu ứng loading tại khung Preview để người dùng biết hệ thống đang xử lý.
- **Validation:** Không cho phép nhấn nút "Sinh đề" nếu tổng tỉ lệ ma trận chưa đạt 100% hoặc các ô input có giá trị âm.

---
*Tài liệu này hỗ trợ kết nối màn hình `SCREEN_25` với logic nghiệp vụ thực tế.*