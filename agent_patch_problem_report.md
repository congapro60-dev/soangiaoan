# BÁO CÁO VẤN ĐỀ KỸ THUẬT: AI Agent sửa giáo án

**Gửi:** Claude Code (Kiến trúc sư)
**Từ:** Antigravity + User
**Về:** Chiến lược cập nhật Editor khi dùng AI Agent trong FloatingChatWidget

---

## 1. Vấn đề đang xảy ra (Bug đã gặp trong thực tế)

Người dùng mở giáo án "Quy tắc đếm" (5 hoạt động, ~2000 chữ) trong tab Creator. 
Người dùng bật Floating Chat Widget, gõ lệnh: **"Bổ sung thêm câu hỏi định hướng vào Hoạt động 1".**

**Điều AI làm:**
1. Đọc toàn bộ giáo án gốc (2000 chữ).
2. Viết lại Hoạt động 1 với nội dung mới (đúng yêu cầu).
3. **LỖI:** Với Hoạt động 2 → 5 (không có thay đổi), AI viết tắt bằng các placeholder:
   - `*(Giữ nguyên như bản gốc)*`
   - `[Nội dung cũ]`
   - `...`
4. Hệ thống nhận `<UPDATE_EDITOR>` và ghi đè toàn bộ lên Editor.

**Kết quả:** Giáo án bị mất gần như hoàn toàn — chỉ còn Hoạt động 1 có nội dung thật, 4 hoạt động còn lại hiển thị placeholder vô nghĩa.

**Bản vá tạm thời của Antigravity:** Thêm lệnh cấm trong prompt (`TUYỆT ĐỐI KHÔNG dùng placeholder... LỖI NGHIÊM TRỌNG`). Tuy nhiên cách này không đủ đáng tin cậy về lâu dài vì LLM vẫn có thể "lười" tùy theo độ dài giáo án.

---

## 2. Nguyên nhân gốc rễ (Root Cause)

Chiến lược hiện tại là **"Full Rewrite"**: AI phải viết lại 100% giáo án mỗi khi có thay đổi dù nhỏ.

Đây là chiến lược kém vì 3 lý do:
1. **LLM laziness:** Với văn bản dài (>1500 chữ), LLM thường dùng placeholder để "tiết kiệm" token thay vì sao chép đầy đủ phần không thay đổi.
2. **Tốn token / chậm:** Mỗi lần sửa 1 câu lại phải sinh ra cả bài giáo án 2000 chữ → lãng phí API và mất 15-20 giây.
3. **Rủi ro mất dữ liệu:** Nếu AI cắt ngắn output (do giới hạn token), toàn bộ phần bị cắt sẽ biến mất khỏi giáo án.

---

## 3. Câu hỏi đặt ra cho Claude Code

**Yêu cầu của người dùng rất rõ ràng:** "Tôi chỉ muốn AI sửa, bổ sung, hay thêm vào chứ KHÔNG PHẢI viết lại cả giáo án."

**Antigravity đề xuất 2 giải pháp sau, nhờ Claude Code đánh giá và chọn:**

---

### Giải pháp A: "Surgical Patch" (Vá ngoại khoa)
**Cơ chế:** Thay vì trả về full document, AI chỉ trả về đoạn cần thay đổi theo format sau:

```
<PATCH>
<FIND>đoạn văn gốc cần thay thế hoặc tìm kiếm</FIND>
<REPLACE>nội dung mới thay thế vào đúng vị trí đó</REPLACE>
</PATCH>
```

hoặc để chèn thêm:
```
<PATCH>
<INSERT_AFTER>đoạn văn làm mốc (sau dòng này)</INSERT_AFTER>
<CONTENT>nội dung cần chèn vào</CONTENT>
</PATCH>
```

**Frontend xử lý:** Dùng `String.replace(find, replace)` hoặc `indexOf(anchor) + splice()` để áp patch vào giáo án gốc đang có trong state.

**Ưu điểm:**
- AI chỉ cần sinh ra đoạn nhỏ → nhanh, ít token, không thể "lười".
- Dữ liệu gốc không bao giờ bị mất vì hệ thống tự áp lên bản gốc.

**Nhược điểm:**
- Nếu AI tìm sai đoạn văn mốc (FIND), patch sẽ thất bại.
- Cần xử lý edge case: FIND không tìm thấy trong document.

---

### Giải pháp B: "Server-side Diff/Merge" (So sánh & Gộp)
**Cơ chế:** Vẫn dùng Full Rewrite nhưng thêm bước kiểm tra:
1. AI trả về full document mới (trong `<UPDATE_EDITOR>`).
2. Frontend chạy một hàm diff đơn giản so sánh `oldContent` vs `newContent`.
3. Nếu phát hiện có đoạn nào trong `newContent` **ngắn hơn đáng kể** so với `oldContent` ở cùng vị trí → từ chối cập nhật đoạn đó, giữ nguyên nội dung gốc.

**Ưu điểm:** Không phải thay đổi prompt nhiều.

**Nhược điểm:** Phức tạp khi implement diff, nhiều edge case, thư viện diff cho Markdown khá nặng.

---

## 4. Đề nghị Claude Code

1. Đánh giá xem **Giải pháp A (Surgical Patch)** có khả thi với codebase hiện tại không?
2. Nếu có, đề xuất schema cho thẻ `<PATCH>` và cách implement hàm `applyPatch(originalContent, patchXml)` trong TypeScript.
3. Nếu không, đề xuất giải pháp thứ 3 mà Claude thấy tốt hơn.

**Constraint:** Không muốn thêm thư viện nặng. Codebase đang dùng Vite + React + TypeScript.
