# Nộp bài đã chấm cho học sinh chưa nộp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút "Nộp bài đã chấm" cho học sinh chưa nộp, AI quét điểm giáo viên ghi tay, tự động duyệt điểm và tính vào thống kê/báo cáo.

**Architecture:** Bổ sung nút UI tại danh sách học sinh chưa nộp trong `AssignmentPanel.tsx`, truyền cờ `handMarked` qua `ActorSubmissionUpload.tsx` và `api/_submission-actors.ts` vào `SubmissionDoc.handMarkedPaper`. Trong `api/grade-homework.ts`, khi có `handMarkedPaper`, AI quét điểm ghi tay `teacherMarkedScore`, dùng làm điểm bài, tự duyệt `teacherApproved: true`, đồng bộ minh chứng hồ sơ và công bố bản chấm tay.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Firebase Firestore/Storage, Gemini AI Vision, Vitest.

---

### Task 1: Mở rộng types và backend lưu `handMarkedPaper`

**Files:**
- Modify: `src/lib/classroom/types.ts`
- Modify: `src/services/submissionActorsApi.ts`
- Modify: `api/_submission-actors.ts`
- Test: `api/__tests__/submission-actors-feedback.test.ts`

- [ ] **Step 1: Thêm cờ `handMarkedPaper` vào type `SubmissionDoc` và `submitActorSubmission`**

Trong `src/lib/classroom/types.ts`:
Thêm thuộc tính optional:
```ts
export interface SubmissionDoc {
  ...
  handMarkedPaper?: boolean;
}
```

Trong `src/services/submissionActorsApi.ts`:
Thêm `handMarked?: boolean` vào payload của `submitActorSubmission`:
```ts
export const submitActorSubmission = (
  credentials: SubmissionActorCredentials,
  data: {
    assignmentId: string | null;
    uploadGrantId: string;
    supplementOf?: string;
    note?: string;
    textContent?: string;
    handMarked?: boolean;
  },
) => call<{ submission: SubmissionDoc }>('submitActorSubmission', credentials, data);
```

- [ ] **Step 2: Cập nhật `api/_submission-actors.ts` để lưu `handMarkedPaper`**

Trong `api/_submission-actors.ts`, tại nơi khởi tạo `created = { ... }`:
```ts
const isTeacherHandMarked = actor.role === 'teacher' && body.handMarked === true;
created = {
  id: submissionId,
  teacherId: actor.teacherId,
  classId: actor.classId,
  studentId: actor.studentId,
  assignmentId,
  ...(supplementOf ? { supplementOf } : {}),
  ...evidence,
  note: text(body.note).slice(0, 2000),
  status: 'submitted',
  submittedBy: actorStamp(actor, now),
  ...(isTeacherHandMarked ? { handMarkedPaper: true } : {}),
  createdAt: now,
  updatedAt: now,
};
```

- [ ] **Step 3: Viết unit test xác minh cờ `handMarkedPaper`**

Thêm test vào `api/__tests__/submission-actors-feedback.test.ts`:
Kiểm tra khi GV gọi `submitActorSubmission` với `handMarked: true`, `submission.handMarkedPaper === true`. Khi học sinh gửi `handMarked: true`, cờ này bị bỏ qua (chỉ GV mới được set).

- [ ] **Step 4: Chạy test kiểm tra**

Chạy: `npx vitest run api/__tests__/submission-actors-feedback.test.ts`
Expected: PASS

---

### Task 2: Cập nhật AI Grading Engine nhận diện bài chấm tay và tự duyệt điểm

**Files:**
- Modify: `api/grade-homework.ts`
- Test: `api/__tests__/grade-homework.variants.test.ts`

- [ ] **Step 1: Kích hoạt `teacherMarkedPaper` khi bài có cờ `handMarkedPaper`**

Trong `api/grade-homework.ts`:
Tại nơi lấy `GradeContext` cho bài nộp (`gradeOneSubmission`):
```ts
if (previous.handMarkedPaper) {
  gradeCtx.teacherMarkedPaper = true;
}
```

- [ ] **Step 2: Gán điểm chính thức từ `teacherMarkedScore`, tự duyệt điểm và đồng bộ minh chứng**

Trong `api/grade-homework.ts`:
Khi xử lý kết quả AI chấm:
```ts
const isTeacherHandMarked = Boolean(previous.handMarkedPaper);
const hasHandMarkedScore = Boolean(gradeCtx.teacherMarkedPaper && parsed.grade.teacherMarkedScore);
const finalScore = hasHandMarkedScore ? parsed.grade.teacherMarkedScore!.score : parsed.grade.score;
const finalMaxScore = hasHandMarkedScore ? parsed.grade.teacherMarkedScore!.maxScore : parsed.grade.maxScore;

const grade: SubmissionGrade = {
  score: finalScore,
  maxScore: finalMaxScore,
  feedback: parsed.grade.feedbackForStudent,
  noteForTeacher: parsed.grade.noteForTeacher,
  strengths: parsed.grade.strengths,
  weaknesses: parsed.grade.weaknesses,
  questionResults: parsed.grade.questionResults.map(q => bindQuestionPhotoMarks(q, studentImageUrls)),
  weakTopics: parsed.grade.weakTopics,
  gradedWithoutAnswerKey: parsed.grade.gradedWithoutAnswerKey,
  ...(hasHandMarkedScore ? { paperScore: parsed.grade.teacherMarkedScore } : {}),
  gradedAt: now,
  teacherApproved: isTeacherHandMarked ? true : false,
  ...(isTeacherHandMarked ? { approvalSource: 'teacher' } : {}),
  ...(gradingRecovery ? { gradingRecovery } : {}),
  ...(transcription ? { transcription } : {}),
};
```

Sau khi `commitAiGradeIfClaimed` thành công:
Nếu `isTeacherHandMarked`:
1. Tự động đồng bộ minh chứng:
```ts
await syncApprovedGradeEvidence(db, {
  submissionId,
  assignmentId: previous.assignmentId,
  grade,
  owner: { studentId: previous.studentId, classId: previous.classId, teacherId: previous.teacherId },
  now,
  approved: true,
}).catch(err => {
  console.warn('[grade-homework] Lỗi syncApprovedGradeEvidence bài chấm tay:', err);
});
```
2. Cập nhật submission `handMarkedPublished: true` để học sinh và phụ huynh xem được.

- [ ] **Step 3: Viết test cho luồng bài chấm tay tự lấy điểm và tự duyệt**

Trong `api/__tests__/grade-homework.variants.test.ts`:
Viết test case: khi bài nộp có `handMarkedPaper: true` và ảnh có điểm viết tay 9/10, AI trả về `teacherMarkedScore: { score: 9, maxScore: 10 }`, bài nộp lưu điểm 9/10 và `teacherApproved: true`.

- [ ] **Step 4: Chạy test kiểm tra**

Chạy: `npx vitest run api/__tests__/grade-homework.variants.test.ts`
Expected: PASS

---

### Task 3: Bổ sung nút UI "Nộp bài đã chấm" và form nộp

**Files:**
- Modify: `src/components/features/classroom/ActorSubmissionUpload.tsx`
- Modify: `src/components/features/classroom/AssignmentPanel.tsx`
- Test: `src/components/features/classroom/ActorSubmissionUpload.test.tsx`

- [ ] **Step 1: Cập nhật `ActorSubmissionUpload.tsx` nhận prop `handMarked`**

Trong `src/components/features/classroom/ActorSubmissionUpload.tsx`:
- Props thêm: `handMarked?: boolean`.
- Title: `{supplementOf ? 'Bổ sung vào bài đã nộp' : handMarked ? 'Nộp bài đã chấm tay' : 'Nộp bài hộ học sinh'}`.
- Nút bấm: `{busy ? 'Đang nộp / đọc bài…' : handMarked ? 'Nộp bài đã chấm' : 'Nộp bài'}`.
- Khi gọi `submitActorSubmission`, truyền thêm `handMarked`.

- [ ] **Step 2: Thêm nút "Nộp bài đã chấm" trong danh sách `chuaNop` của `AssignmentPanel.tsx`**

Trong `src/components/features/classroom/AssignmentPanel.tsx`:
1. Thêm state trong `BaiNopTheoLop`: `const [proxyHandMarked, setProxyHandMarked] = useState(false);`
2. Tại mỗi học sinh chưa nộp:
```tsx
<span data-column="notes" className="teacher-submission-cell">
  {assignment && !assignment.submissionLocked && assignment.type !== 'exam' && assignment.deliveryMode !== 'online' && (
    <div className="flex items-center gap-1">
      <button type="button" className="min-h-11 whitespace-nowrap rounded-lg border px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50" onClick={() => { setProxyStudent(hs.studentId); setProxyBase(''); setProxyHandMarked(false); }}>Nộp hộ</button>
      <button type="button" className="min-h-11 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100" onClick={() => { setProxyStudent(hs.studentId); setProxyBase(''); setProxyHandMarked(true); }}>Nộp bài đã chấm</button>
    </div>
  )}
</span>
```
3. Truyền `handMarked={proxyHandMarked}` vào `<ActorSubmissionUpload />`.

- [ ] **Step 3: Chạy test UI của `ActorSubmissionUpload`**

Chạy: `npx vitest run src/components/features/classroom/ActorSubmissionUpload.test.tsx`
Expected: PASS

---

### Task 4: Kiểm tra toàn diện & Build verification

**Files:** Toàn bộ dự án

- [ ] **Step 1: Chạy toàn bộ test liên quan**

Chạy: `npx vitest run api/__tests__/submission-actors-feedback.test.ts api/__tests__/grade-homework.variants.test.ts src/components/features/classroom/ActorSubmissionUpload.test.tsx`
Expected: PASS

- [ ] **Step 2: Chạy Typecheck & Build**

Chạy: `npm run build`
Expected: 0 errors.
