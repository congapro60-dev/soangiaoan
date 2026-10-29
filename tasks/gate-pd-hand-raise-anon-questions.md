# GATE P+D — CHỨC NĂNG 1: ALWAYS-ON HAND RAISE · CÂU HỎI ẨN DANH · UNDERSTANDING PULSE
## Pha A — đặc tả triển khai cho V8.8 (mã COMM-AQ-01) — 29/10/2026

> **Trước khi code.** Đặc tả nguồn: `tasks/spec-hand-raise.md` (thầy duyệt yêu cầu).
> Quyết định khóa cứng: **mọi câu HS gõ/gửi đều ẨN DANH tuyệt đối, không có tùy chọn gửi có tên; giơ tay là hành động riêng CÓ tên; hai chức năng không liên kết định danh.**
> Sau khi thầy duyệt bản này mới sang Pha B (code + test + QA live).

---

## 1. AUDIT HIỆN TRẠNG (đã kiểm tra code, 29/10)

| Thành phần | Hiện có | Vị trí | Ghi chú |
|---|---|---|---|
| Định danh phiên live | `participantUid` (auth ẩn danh) + `studentLinks/{uid}` gắn lớp + login session có `studentName` | `StudentLiveView.tsx`, `studentPortalApi.ts` | Tên HS lấy được ở client, đã dùng cho màn live |
| Ghi dữ liệu HS trực tiếp vào phiên | `groupMemberships/{uid}`, `responses/{uid}__{stepId}`, `preferences/{uid}` — rule kiểm `request.auth.uid == participantUid` | `firestore.rules` 728–876 | Mẫu sẵn cho hand raise (CÓ tên) |
| Ghi qua server (Admin SDK) | `getAdminDb()` + `verifyIdToken` trong Vercel functions | `api/_exam-core.ts`, `api/classroom.ts` → `handleStudentWorkspaceAction` | Hạ tầng dùng để ghi câu hỏi ẩn danh mà không lưu định danh |
| Màn HS | `StudentLiveView` — các `student-slot` (language, notices, assignment, group-picker, response…) | `StudentLiveView.tsx` 660–770 | Thêm 1 slot mới cho thanh 2 nút, không đụng draft bài |
| Màn GV thật | `mode=tv-control` → `TvLiveView` + `TvPresenterControls` (+ `TvSlowGroups`, `LiveActivityPublisher`); `TeacherLiveView` KHÔNG bao giờ render | `LiveLessonPage.tsx` 231–286 | Mọi panel GV phải đặt ở đây |
| Panel thống kê | `TvStatsPanel` (chỉ số + counts), toggle "Hiện kết quả lớp" | `TvStatsPanel.tsx` | Thêm tab/khối "Câu hỏi ẩn danh" cạnh đây |
| Public projection cho HS/TV | `public/state`, `public/stats`, `public/groupProgress` — đọc được khi active | `firestore.rules` 853–909 | Câu hỏi ĐÃ CÔNG BỐ cần projection công khai tương tự |
| Coach | `coachPresence.ts` (v84) — chưa có backlog câu hỏi | `src/lib/lessonRuntime/v84/` | Coach backlog làm tối thiểu ở Pha B (đọc cùng dữ liệu GV, không tính điểm) |
| Hiểu bài / tự đánh giá | Chưa có pulse riêng; đã có `StudentGoalReflection` (phản tư mục tiêu) | `StudentLiveView.tsx` 714–716 | Pulse là bước chuyển mới, không đụng reflection hiện có |

---

## 2. THIẾT KẾ — 3 dữ liệu tách biệt tuyệt đối

### 2.1. GIƠ TAY — CÓ tên (client ghi trực tiếp, như groupMemberships)

```
liveLessonSessions/{sessionId}/handRaises/{participantUid}
  participantUid: string   (= auth.uid, == doc id)
  classId: string
  studentName: string      (lấy từ login session HS — hiện để GV gọi)
  action: 'raise' | 'lower'
  updatedAt: timestamp
```

- Rules (mô phỏng `groupMemberships`): create/update chỉ khi `request.auth.uid == participantUid` + HS gắn lớp + phiên active; get: GV owner hoặc chính HS; **list: chỉ GV owner**.
- HS bấm ✋ → ghi `raise`; bấm lại → `lower` (idempotent theo doc id — bấm nhiều lần không tạo bản ghi trùng).
- Hàng đợi GV = danh sách doc có `action == 'raise'`, sắp theo `updatedAt`.
- Không dùng chung eventId/correlationId với câu hỏi ẩn danh (khóa cứng, hai collection riêng, không có trường tham chiếu chéo).

### 2.2. CÂU HỎI ẨN DANH — KHÔNG định danh (ghi qua server, KHÔNG qua client)

```
liveLessonSessions/{sessionId}/questions/{questionId}          ← REVIEW QUEUE, chỉ GV đọc
  questionId: string        (random opaque, KHÔNG liên quan uid/handRaise)
  classId: string
  activityId?: string       (ngữ cảnh bài học, KHÔNG phải HS)
  body: string              (≤ 500 ký tự)
  clientNonce: string       (chống trùng khi retry — không định danh)
  status: 'new' | 'reviewing' | 'answered' | 'deferred' | 'hidden'
  serverReceivedAt: timestamp

liveLessonSessions/{sessionId}/public/publishedQuestions/{questionId}  ← ĐÃ CÔNG BỐ, cả lớp đọc
  questionId, activityId?, body, publishedAt: timestamp
```

- **Luồng gửi**: HS gọi `POST /api/classroom` action `liveAnonymousQuestion` (idToken + sessionId + body + clientNonce). Server:
  1. `verifyIdToken` → uid; kiểm `studentLinks/{uid}` classId == classId của phiên; phiên active.
  2. Kiểm rate-limit in-memory (≤ 5 câu/phút/uid, không lưu persistent).
  3. Ghi doc vào `questions/{randomId}` **không có bất kỳ field định danh nào** (không uid, không tên, không deviceId, không IP, không timestamp trùng khớp giờ bấm tay).
  4. Server **không log uid kèm nội dung** — log chỉ đếm số câu/thành công.
- **Publish gate**: câu mới chỉ nằm ở `questions/` (GV đọc qua Admin SDK/list owner). GV bấm "Công bố" → action `livePublishQuestion` (idToken GV) → server copy sang `public/publishedQuestions/{qid}` → TV/HS mới thấy. GV "Ẩn" → xóa doc public (bản review giữ status `hidden`).
- Rules client: `questions/{...}` — `allow read: if llv3SessionOwner()`, `allow write: if false` (chỉ Admin SDK). `public/publishedQuestions/{...}` — `allow get, list: if llv3ActiveSession()`, `allow write: if false`.
- **Idempotency**: `clientNonce` lưu trong doc review; server từ chối trùng nonce trong 10 phút.
- Không có bảng ánh xạ `questionId → studentId` ở bất kỳ đâu (server tạo questionId random độc lập).

### 2.3. UNDERSTANDING PULSE — dữ liệu cá nhân theo lesson contract (CÓ tên, riêng biệt với câu hỏi)

```
liveLessonSessions/{sessionId}/pulses/{participantUid}__{cueId}
  participantUid, classId, cueId
  selfReport: 'understood' | 'need_example' | 'unclear'
  updatedAt: timestamp
```

- Bật theo **override client** `PULSE_CUE_IDS_BY_KEY` (như `SELF_STUDY_WEEK11_OVERRIDE`) — **không sửa snapshot** đã duyệt.
- Khi `publicState.cueId` ∈ danh sách: hiện mini-check 3 nút (10–30 giây) + ô phản tư tùy chọn:
  - "Điều em còn băn khoăn là…" → gửi vào **luồng câu hỏi ẩn danh** (cùng API 2.2, không kèm uid).
  - "✋ Giơ tay" → hành động giơ tay thường.
- GV xem tổng hợp đếm theo lựa chọn ("12 lượt chọn cần thêm ví dụ") — không suy số HS.
- Không tính điểm, không bật hint tự động, không chặn chuyển chặng, GV bỏ qua được.

---

## 3. UI

### Màn HS (`StudentLiveView`) — slot mới `ask-bar`, luôn hiện mọi trạng thái
- 2 nút gọn: `✋ Giơ tay` / `Đang giơ tay · Hạ tay` và `❓ Đặt câu hỏi ẩn danh`.
- Modal hỏi: nhãn bắt buộc "Đặt câu hỏi ẩn danh", gợi ý "Em muốn hỏi điều gì?", dòng "Câu hỏi của em sẽ không hiển thị tên." + "Đừng ghi tên hoặc thông tin riêng tư của em/bạn vào câu hỏi.", nút Gửi; trạng thái `Đang gửi…` / `Đã nhận câu hỏi ẩn danh.` / lỗi.
- Không có tùy chọn "gửi có tên". Modal đóng không mất draft bài (modal riêng, không unmount slot response).
- Pulse: khối mini-check hiện trong slot riêng khi đúng chặng; bỏ qua được.

### Màn GV thật (`presenterControls` trong tv-control)
- Dải gọn: `✋ N bạn đang giơ tay` + 3 tên đầu, mở được danh sách đầy đủ; N=0 thì ẩn.
- Khối "Câu hỏi ẩn danh" (mở/thu, không che đề): mỗi câu `#05 · hoạt động · Trạng thái` + nội dung; actions `Công bố · Đã trả lời · Để sau · Ẩn nội dung · Xóa`. Câu mới KHÔNG tự lên TV.
- Màn TV (TvLiveView) hiển thị câu ĐÃ CÔNG BỐ: nội dung + mã ẩn danh `#05`, không tên.

### Coach (tối thiểu Pha B)
- Backlog câu hỏi theo trạng thái + đếm tổng; không có nút truy người gửi; không suy số HS.

---

## 4. NHỮNG ĐIỀU KHÔNG LÀM (khóa theo spec mục 6)
1. Không checkbox ẩn danh — ẩn danh bất biến. 2. Không hiện tên người gửi cạnh câu hỏi. 3. Không nút "Xem người gửi". 4. Không gộp 2 event thành messageEvent mang userId. 5. Không công bố trực tiếp không qua gate. 6. Không dùng % tự báo hiểu làm mastery. 7. Không ép pulse sau từng câu nhỏ. 8. Không leaderboard. 9. Không phá layout laptop. 10. **Không tuyên bố "không thể truy vết tuyệt đối"** — hạ tầng (idToken boundary, log Vercel) vẫn tồn tại; sản phẩm chỉ cam kết *không tạo/giữ liên kết định danh với nội dung câu hỏi*.

---

## 5. KIỂM TRA Gate P (privacy) / Gate D (dạy được)

### Gate P — ẩn danh được thực thi ở data model
- [ ] Stored question doc không có identity field; audit bằng cách đọc doc thật trên production.
- [ ] Server không lưu mapping question→student; code review phần `liveAnonymousQuestion`.
- [ ] Không join/correlation questionId ↔ handRaiseId (2 collection, không trường tham chiếu).
- [ ] HS giơ tay rồi hỏi ngay sau đó → UI/export/payload không lộ người gửi.
- [ ] Rules: client không write được `questions/`; chỉ GV đọc review queue; public chỉ thấy isPublished/copy.
- [ ] Export hiện tại không thêm câu hỏi ẩn danh kèm roster.
- [ ] Ghi rõ caveat hạ tầng vào acceptance (không claim untraceability).

### Gate D — không cản nhịp dạy
- [ ] 2 nút không che math input/nút nộp (slot riêng, cao ≤ 56px, mobile safe-area).
- [ ] Modal hỏi không mất draft bài (kiểm gửi dở → mở modal → đóng → draft còn).
- [ ] Panel GV không che đề chính; mở/thu được.
- [ ] Pulse không bắt buộc, không chặn chuyển chặng, không tính điểm, không tự bật hint.
- [ ] Hồi quy desktop: vitest components + pages PASS; mở thử 1 trang thật.

## 6. PHÂN VIỆC PHA B (khi được duyệt)
1. Rules + 2 action server (`liveAnonymousQuestion`, `livePublishQuestion`) + rate-limit.
2. Service client (`liveQuestionService`: submitAnonymousQuestion, subscribeHandRaises…) + rules tests.
3. UI HS (ask-bar + modal + pulse) — kèm unit test không hồi quy.
4. UI GV (dải giơ tay + panel câu hỏi + publish) + TV overlay câu công bố.
5. Test: unit (schema/semantics), rules, component; QA live 1 phiên thật (2 trình duyệt Edge 9222/9223); báo cáo PASS/NOT_RUN từng nhóm như spec mục 7.

Ước lượng: 3–4 phiên làm + 1 phiên QA live.
