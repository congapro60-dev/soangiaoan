# Duyệt tự động bài cần soát + cờ cảnh báo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bỏ 3 chặn duyệt cho bài "máy đọc chưa chắc / lệch sổ điểm" (cờ vẫn hiện ở dòng bài để thầy soát), và tắt cờ tự nhiên sau khi thầy chấm lại.

**Architecture:** Thuần lib: gỡ điều kiện `needsTeacherCheck` khỏi 2 hàm duyệt tự động trong `autoGrade.ts`, cho `hasUncertainRead` tôn trọng `editedByTeacher`, nới `classBacklog.toApprove`. UI chỉ sửa 1 hàm `chamDuyetTatCa` (bỏ ô tick opt-in). Cờ hiển thị dùng chip có sẵn — không code UI mới. Server `grade-homework.ts` không đụng (cron tự hưởng qua lib).

**Tech Stack:** React + TypeScript + Vitest. PowerShell 5.1: KHÔNG dùng `&&`; test lẻ chạy trực tiếp, test full >120s dùng `background: true`.

**Spec:** `docs/superpowers/specs/2026-10-24-auto-approve-review-flag-design.md` (thầy đã duyệt)

**Lưu ý chạy test:** đứng tại worktree `C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader`, dùng vitest trực tiếp: `npx vitest run <file>`. Full suite + build ở Task 6, chạy `background: true`.

---

## File Structure

| File | Việc | Vì sao |
|---|---|---|
| `src/lib/classroom/autoGrade.ts` | Gỡ 2 chặn `!needsTeacherCheck` + sửa header chính sách | Core — cron + duyệt-luôn-sau-chấm |
| `src/lib/classroom/submissionSelection.ts` | `hasUncertainRead` bỏ qua bài `editedByTeacher`; `classBacklog.toApprove` không lọc uncertain | Cờ tắt sau chấm lại + nút duyệt loạt |
| `src/components/features/classroom/AssignmentPanel.tsx` | `chamDuyetTatCa`: bỏ ô tick, duyệt cả uncertain, đổi text thông báo | UI chính sách một-đường |
| `src/lib/classroom/autoGrade.test.ts` | Đảo expectation các case cần soát | Chính sách mới |
| `src/lib/classroom/submissionSelection.test.ts` | Thêm case `editedByTeacher`; đổi case `classBacklog` | Chính sách mới |
| `src/lib/classroom/manualGrade.test.ts` | Thêm case khoá "examCheck rời khỏi grade sau sửa tay" | Thầy sửa tay → hết lệch sổ |
| `src/lib/ssm/loClassScores.test.ts` | Thêm case "điểm mới thay điểm cũ sau sửa tay + duyệt" | Khoá thống kê tự cập nhật |
| `api/__tests__/grade-homework.auto.test.ts` | Đảo expectation bài `chua-chac` | Khoá chuỗi end-to-end qua handler cron |

Không đụng: `api/grade-homework.ts`, `api/classroom.ts`, `src/lib/classroom/manualGrade.ts`, `src/lib/classroom/examVariants.ts`, `StudentReport.tsx`, `ClassStudentProgressMatrix.tsx`, `StudentPortalPage.tsx`.

---

### Task 1: Bỏ chặn duyệt tự động trong `autoGrade.ts` (thuần, TDD)

**Files:**
- Modify: `src/lib/classroom/autoGrade.test.ts:38-65`
- Modify: `src/lib/classroom/autoGrade.ts:1-7, 46-60`

- [ ] **Step 1.1: Sửa test — đảo 3 expectation theo chính sách mới**

Trong `src/lib/classroom/autoGrade.test.ts`, thay toàn bộ 3 case sau bằng nội dung mới (giữ nguyên helpers `NOW`, `ago`, `grade`, `sub` ở đầu file):

Case cũ dòng 38-46 (tên "duyệt bài đã chấm quá 60 phút tính từ lúc chấm; bài máy đọc chưa chắc giữ lại") — thay bằng:

```typescript
  it('duyệt bài đã chấm quá 60 phút tính từ lúc chấm; cả bài đọc chưa chắc cũng được duyệt', () => {
    const plan = planAutoSweep([
      sub('duyet', 'A', ago(300), { status: 'graded', grade: grade(false, ago(70)) }),
      sub('moi-cham', 'B', ago(300), { status: 'graded', grade: grade(false, ago(10)) }),
      sub('chua-chac', 'C', ago(300), { status: 'graded', grade: grade(false, ago(70), 0.3) }),
      sub('da-duyet', 'D', ago(300), { status: 'graded', grade: grade(true, ago(70)) }),
    ], NOW);
    expect(plan.toApprove.map(s => s.id).sort()).toEqual(['chua-chac', 'duyet']);
  });
```

Case cũ dòng 48-54 (tên "bài máy vừa tự chấm: duyệt luôn nếu đọc chắc; lớp tắt thì không chạy") — thay dòng 50 (`expect(canAutoApproveFreshGrade(... 0.2))).toBe(false);`) bằng:

```typescript
    expect(canAutoApproveFreshGrade(sub('y', 'A', ago(70), { status: 'graded', grade: grade(false, ago(0), 0.2) }))).toBe(true);
```

(2 dòng sau đó về `autoGradeEnabledFor` và `AUTO_GRADE_AFTER_MS` giữ nguyên.)

Case cũ dòng 56-65 (tên "bài kiểm tra định kì lệch điểm giáo viên (sổ điểm) không tự duyệt; khớp thì duyệt như thường") — thay bằng:

```typescript
  it('bài kiểm tra định kì lệch điểm giáo viên (sổ điểm) cũng được tự duyệt như bài khớp', () => {
    const lech = { ...grade(false, ago(70)), examCheck: { sheetLabel: 'Giữa học kì I', sheetScore: 8, diff: 1.5, mismatch: true } };
    const khop = { ...grade(false, ago(70)), examCheck: { sheetLabel: 'Giữa học kì I', sheetScore: 7, diff: 0, mismatch: false } };
    const plan = planAutoSweep([
      sub('lech', 'A', ago(300), { status: 'graded', grade: lech }),
      sub('khop', 'B', ago(300), { status: 'graded', grade: khop }),
    ], NOW);
    expect(plan.toApprove.map(s => s.id).sort()).toEqual(['khop', 'lech']);
    expect(canAutoApproveFreshGrade(sub('x', 'A', ago(70), { status: 'graded', grade: lech }))).toBe(true);
  });
```

- [ ] **Step 1.2: Chạy test xác nhận RED**

Run: `npx vitest run src/lib/classroom/autoGrade.test.ts`
Expected: FAIL ở đúng 3 case vừa sửa (`toApprove` thiếu bài cần soát; `canAutoApproveFreshGrade` vẫn false).

- [ ] **Step 1.3: Sửa `autoGrade.ts` — gỡ chặn + đổi comment**

Trong `src/lib/classroom/autoGrade.ts`:

1. Sửa import dòng 9 — bỏ `needsTeacherCheck`:

```typescript
import { currentSubmissionsForAssignment, isStaleGradingTimestamp } from './submissionSelection.js';
```

2. Thay header comment dòng 1-7:

```typescript
/**
 * TỰ CHẤM + TỰ DUYỆT SAU 60 PHÚT — thuần, dùng chung máy chủ + giao diện.
 *
 * Chính sách chủ dự án (2026-10-24) thay chính sách giữ lại bài nghi ngờ của 2026-09-25:
 * bài học sinh nộp mà sau 60 phút giáo viên chưa chấm thì AI tự chấm; bài đã chấm mà sau 60 phút
 * chưa duyệt thì tự duyệt — KỂ CẢ bài máy đọc chưa chắc hoặc lệch điểm sổ (bài kiểm tra định kì).
 * Bài cần soát được duyệt kèm cờ ("Đọc chưa rõ" / "Lệch điểm GV") ở dòng bài để giáo viên
 * chấm lại; sau khi thầy sửa tay (editedByTeacher) thì cờ tự tắt. Áp dụng mọi lớp, giáo viên
 * TẮT được cho lớp mình.
 */
```

3. `planAutoSweep.toApprove` (dòng 46-51) — bỏ điều kiện tại dòng 50:

```typescript
    toApprove: current.filter(submission =>
      submission.status === 'graded'
      && Boolean(submission.grade)
      && submission.grade?.teacherApproved !== true
      && olderThanWindow(submission.grade?.gradedAt || submission.updatedAt, nowMs)),
```

4. `canAutoApproveFreshGrade` (dòng 55-60) — sửa cả comment + gỡ điều kiện:

```typescript
/** Bài vừa được máy tự chấm xong: duyệt luôn (bài đọc chưa chắc thì cờ nhắc thầy ở dòng bài). */
export const canAutoApproveFreshGrade = (submission: SubmissionDoc): boolean =>
  submission.status === 'graded'
  && Boolean(submission.grade)
  && submission.grade?.teacherApproved !== true;
```

- [ ] **Step 1.4: Chạy test xác nhận GREEN**

Run: `npx vitest run src/lib/classroom/autoGrade.test.ts`
Expected: PASS toàn bộ (5 case).

- [ ] **Step 1.5: Commit**

```powershell
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" add src/lib/classroom/autoGrade.ts src/lib/classroom/autoGrade.test.ts
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" commit -m "feat(auto-grade): duyet tu dong ca bai can soat, giu co canh bao o dong bai"
```

---

### Task 2: `hasUncertainRead` tôn trọng tay thầy + `classBacklog.toApprove` nới (TDD)

**Files:**
- Modify: `src/lib/classroom/submissionSelection.test.ts:148-198`
- Modify: `src/lib/classroom/submissionSelection.ts:29-47, 152-162`

- [ ] **Step 2.1: Sửa test — thêm case `editedByTeacher`, đổi case `classBacklog`**

Trong `src/lib/classroom/submissionSelection.test.ts`:

1. Describe `hasUncertainRead` (dòng 148-173) — thêm case mới vào cuối describe (trước dòng `});` đóng):

```typescript
  it('thầy đã sửa tay (editedByTeacher) thì máy hết kéo cờ dù câu cũ còn điểm thấp', () => {
    expect(hasUncertainRead({ ...grade([qr({ confidence: 0.3 })]), editedByTeacher: true } as SubmissionGrade)).toBe(false);
    expect(hasUncertainRead({ ...grade([qr({ status: 'unreadable' })]), editedByTeacher: true } as SubmissionGrade)).toBe(false);
  });
```

2. Describe `classBacklog` (case "gom mọi bài giao..." dòng 181-198) — đổi 2 dòng assert:

```typescript
    expect(backlog.toApprove.map(s => s.id).sort()).toEqual(['b', 'c']);
    expect(backlog.uncertain.map(s => s.id)).toEqual(['c']);
```

(dòng cũ `expect(backlog.toApprove.map(s => s.id)).toEqual(['b']);`)

- [ ] **Step 2.2: Chạy test xác nhận RED**

Run: `npx vitest run src/lib/classroom/submissionSelection.test.ts`
Expected: FAIL 2 chỗ — case mới `editedByTeacher` vẫn true; case `classBacklog` `toApprove` chỉ có `['b']`.

- [ ] **Step 2.3: Implement trong `submissionSelection.ts`**

1. Thay `hasUncertainRead` (dòng 29-40) — thêm nhánh bỏ qua bài thầy đã sửa:

```typescript
/**
 * Máy đọc bài "chưa chắc": có câu không đọc rõ, có câu tự đánh dấu cần giáo viên soát, hoặc độ
 * chắc chắn đọc chữ thấp. Dùng để hiện nhãn nhắc GV mở ra kiểm — bắt lỗi AI đọc nhầm công thức.
 * Bài giáo viên đã sửa tay (editedByTeacher) coi như thầy đã soát chốt: máy không kéo cờ nữa.
 */
export const hasUncertainRead = (grade?: SubmissionGrade): boolean => {
  if (grade?.editedByTeacher) return false;
  const results = grade?.questionResults;
  if (!Array.isArray(results)) return false;
  return results.some(question =>
    question?.status === 'unreadable'
    || question?.needsTeacherReview === true
    || (typeof question?.confidence === 'number' && question.confidence < READ_CONFIDENCE_FLOOR));
};
```

2. Thay comment của `needsTeacherCheck` (dòng 42-47) — giữ nguyên thân hàm:

```typescript
/**
 * Bài đăng ký cờ "cần thầy soát": máy đọc chưa chắc, HOẶC (bài kiểm tra định kì) tổng điểm AI lệch
 * điểm giáo viên trong sổ. Không chặn duyệt nữa (chính sách 2026-10-24) — chỉ dùng để hiện cờ
 * cảnh báo ở dòng bài, và nhóm "cần soát" trong việc tồn của lớp.
 */
```

3. `classBacklog` — thay nguyên khối từ dòng 152 (`const waiting = ...`) đến dòng 161 (`assignmentCount ...`) bằng:

```typescript
  const waiting = current.filter(submission => submission.status === 'graded'
    && Boolean(submission.grade)
    && submission.grade?.teacherApproved !== true);
  return {
    toGrade,
    errored,
    // Chính sách 2026-10-24: bài cần soát cũng được duyệt — toApprove gồm toàn bộ bài chờ duyệt,
    // uncertain chỉ còn vai trò đếm/hiện cờ.
    toApprove: waiting,
    uncertain: waiting.filter(submission => needsTeacherCheck(submission.grade)),
    assignmentCount: new Set([...toGrade, ...errored, ...waiting].map(submission => submission.assignmentId)).size,
  };
};
```

- [ ] **Step 2.4: Chạy test xác nhận GREEN**

Run: `npx vitest run src/lib/classroom/submissionSelection.test.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 2.5: Commit**

```powershell
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" add src/lib/classroom/submissionSelection.ts src/lib/classroom/submissionSelection.test.ts
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" commit -m "feat(selection): co canh bao tat khi thay sua tay; toApprove gom bai can soat"
```

---

### Task 3: Khoá hành vi "chấm lại → cờ tắt, điểm mới vào thống kê" (test-only)

**Files:**
- Test: `src/lib/classroom/manualGrade.test.ts` (thêm describe mới, cuối file)
- Test: `src/lib/ssm/loClassScores.test.ts` (thêm case mới)

Cả hai đều khoá hành vi CÓ SẴN, KHÔNG đụng code production: `buildManualGrade` (`manualGrade.ts:86-116`) đã dựng grade mới không chép `examCheck`; `buildClassLoScores` là hàm thuần — gọi lại với dữ liệu mới là tính lại từ đầu (gate `teacherApproved` đã được test tại `loClassScores.test.ts:21`).

- [ ] **Step 3.1: Thêm describe vào cuối `manualGrade.test.ts`**

Imports đầu file cần thêm `needsTeacherCheck` và type `SubmissionGrade`:

```typescript
import { needsTeacherCheck } from './submissionSelection';
```

(đã có `import type { QuestionResult, SubmissionDoc } from './types';` — thêm `type SubmissionGrade` vào destructuring: `import type { QuestionResult, SubmissionDoc, SubmissionGrade } from './types';`)

Cuối file:

```typescript
describe('sửa tay tắt cờ lệch sổ điểm', () => {
  it('lượt AI có examCheck.mismatch — grade thầy sửa không còn examCheck, needsTeacherCheck false', () => {
    const aiGrade = {
      score: 8, maxScore: 10, feedback: 'AI chấm', strengths: [], weaknesses: [],
      teacherApproved: true, approvalSource: 'auto_timeout', gradedAt: '2026-10-24T00:00:00.000Z',
      examCheck: { sheetLabel: 'Giữa học kì I', sheetScore: 7, diff: 1, mismatch: true },
    } as unknown as SubmissionGrade;
    const update = buildManualGradeUpdate(submission(aiGrade), {
      score: 7, maxScore: 10, feedback: 'Thầy chốt', weakTopics: [],
    }, '2026-10-24T01:00:00.000Z');

    expect(update['grade.examCheck']).toBeUndefined();
    expect(update['grade.teacherApproved']).toBe(false);
    expect(update['grade.editedByTeacher']).toBe(true);
    // Cờ (nếu nhìn grade mới trọn vẹn) phải tắt:
    expect(needsTeacherCheck({
      score: 7, maxScore: 10, teacherApproved: false, editedByTeacher: true, gradedAt: '2026-10-24T01:00:00.000Z',
    } as unknown as SubmissionGrade)).toBe(false);
  });
});
```

- [ ] **Step 3.2: Chạy test manual — PASS NGAY là bình thường**

Run: `npx vitest run src/lib/classroom/manualGrade.test.ts`
Expected: PASS toàn bộ (ca này khoá hành vi có sẵn, không phải TDD RED — nếu FAIL thì buildManualGrade đang chép examCheck làm grade: kiểm lại).

- [ ] **Step 3.3: Thêm case khoá vào `loClassScores.test.ts`**

Trong `src/lib/ssm/loClassScores.test.ts`, thêm case mới vào describe `buildClassLoScores` (sau case "bài CHƯA duyệt không tính", dòng 21-25):

```typescript
  it('thầy sửa điểm + duyệt lại → điểm mới thay điểm cũ khi gọi lại với dữ liệu mới', () => {
    const truoc = buildClassLoScores(11, roster, submissions, assignments);
    const sauSua = buildClassLoScores(11, roster, [
      { studentId: 's1', assignmentId: 'a1', createdAt: '2026-09-01', grade: { score: 5.5, maxScore: 10, teacherApproved: true, editedByTeacher: true } },
      { studentId: 's2', assignmentId: 'a1', createdAt: '2026-09-01', grade: { score: 6, maxScore: 10, teacherApproved: false } },
    ], assignments);
    expect(truoc.find((s) => s.maHS === 'HS001')?.scoreByCompetency[COMP]).toBe(8);
    expect(sauSua.find((s) => s.maHS === 'HS001')?.scoreByCompetency[COMP]).toBe(5.5);
  });
```

- [ ] **Step 3.4: Chạy test loClassScores — PASS ngay (khoá hành vi thuần)**

Run: `npx vitest run src/lib/ssm/loClassScores.test.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 3.5: Commit**

```powershell
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" add src/lib/classroom/manualGrade.test.ts src/lib/ssm/loClassScores.test.ts
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" commit -m "test(remake): khoa chuoi sua tay - tat co - thong ke nhan diem moi"
```

---

### Task 4: Khoá chuỗi end-to-end qua handler cron (test-only)

**Files:**
- Test: `api/__tests__/grade-homework.auto.test.ts:131-143`

Task 1 đã gỡ chặn core — handler cron (`POST /api/grade-homework?cron=auto`) dùng `planAutoSweep` nên sẽ tự hưởng. Test này chốt hành vi qua handler thật, bảo vệ không ai chèn lại chặn uncertain trong tương lai.

- [ ] **Step 4.1: Đổi expectation case "duyệt bài chờ duyệt quá 60 phút..." (dòng 131-143)**

Thay toàn bộ case bằng:

```typescript
  it('duyệt quá 60 phút cả bài thường lẫn bài chưa chắc; chấm + duyệt bài chờ chấm quá 60 phút', async () => {
    const state = seed();
    h.db = makeDb(state);
    const result = await call('Bearer bi-mat');
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ approved: 3, graded: 1, failed: 0, remaining: 0 });
    const s = state.submissions;
    expect(s['cho-duyet'].grade).toMatchObject({ teacherApproved: true, approvalSource: 'auto_timeout' });
    expect(s['chua-chac'].grade).toMatchObject({ teacherApproved: true, approvalSource: 'auto_timeout' });
    expect(s['cho-cham']).toMatchObject({ status: 'graded', grade: expect.objectContaining({ score: 8, teacherApproved: true, approvalSource: 'auto_timeout' }) });
    expect(s['moi-cham'].grade).toMatchObject({ teacherApproved: false });
    expect(s['moi-nop'].status).toBe('submitted');
  });
```

(Đối chiếu: seed có `'chua-chac'` — grade confidence 0.2, `:99` — trước đây bị giữ lại, nay được cron duyệt.)

- [ ] **Step 4.2: Chạy test xác nhận PASS**

Run: `npx vitest run api/__tests__/grade-homework.auto.test.ts`
Expected: PASS toàn bộ (3 case: curl auth, cron duyệt, lớp tắt). Nếu FAIL `approved: 3` — kiểm `planAutoSweep` đã bỏ chặn đúng ở Task 1 chưa.

- [ ] **Step 4.3: Commit**

```powershell
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" add api/__tests__/grade-homework.auto.test.ts
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" commit -m "test(grade-homework): cron duyet ca bai chua chac qua handler that"
```

---

### Task 5: UI "Chấm & duyệt tất cả" — bỏ ô tick, duyệt cả cần soát

**Files:**
- Modify: `src/components/features/classroom/AssignmentPanel.tsx:1007-1060`

Không có harness test UI cho AssignmentPanel — verify bằng `npm run build` (Task 6). Không dựng harness mới (YAGNI).

- [ ] **Step 5.1: Sửa `chamDuyetTatCa` (dòng 997-1069)**

1. Phần Swal (dòng 1005-1024) — bỏ hàng li "giữ lại để thầy cô xem" + ô input checkbox; đoạn `html` mới (thay toàn bộ khối `const result = await Swal.fire({...});`):

```typescript
    const result = await Swal.fire({
      icon: 'question',
      title: 'Chấm & duyệt tất cả bài còn tồn?',
      html: `<p>Áp dụng cho <b>${assignmentCount} bài giao</b> của lớp ${className} (chỉ lượt nộp mới nhất của mỗi em):</p>
        <ul style="text-align:left;margin:8px 0 0 18px;list-style:disc">
          ${toGrade.length > 0 ? `<li>Chấm AI <b>${toGrade.length}</b> bài chưa chấm${tonDong.errored.length > 0 ? ` (gồm ${tonDong.errored.length} bài chấm lỗi — thử lại)` : ''} (mỗi bài một lượt AI).</li>` : ''}
          <li>Duyệt <b>${toApprove.length}</b> bài đã chấm${toGrade.length > 0 ? ' và các bài vừa chấm xong' : ''} — học sinh, phụ huynh thấy điểm chính thức.</li>
          ${uncertain.length > 0 ? `<li><b>${uncertain.length}</b> bài máy đọc chưa chắc cũng được duyệt — dòng bài có cờ "Lệch điểm GV" hoặc "Đọc chưa rõ" để thầy cô soát lại sau.</li>` : ''}
        </ul>
        <p style="margin-top:8px;font-size:12px;color:#64748b">Bài đã duyệt giữ nguyên.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Chấm & duyệt',
      cancelButtonText: 'Thôi',
      confirmButtonColor: '#4f46e5',
    });
    if (!result.isConfirmed) return;
```

2. Sau Swal — bỏ biến `duyetCaChuaChac` (dòng 1026). Đổi dòng chọn danh sách duyệt (dòng 1048):

```typescript
      const canDuyet = [...tonSau.toApprove, ...tonSau.uncertain];
```

3. Bỏ biến `conChuaChac` (dòng 1058); đổi chính đoạn toast (dòng 1058-1062):

```typescript
      showToast(
        `Đã chấm ${daCham} bài, duyệt ${daDuyet} bài${loiCham + loiDuyet > 0 ? `; ${loiCham + loiDuyet} bài lỗi cần thử lại` : ''}${tonSau.uncertain.length > 0 ? `; cờ vàng ở ${tonSau.uncertain.length} bài cần thầy cô soát lại` : ''}.`,
        loiCham + loiDuyet > 0 ? 'warning' : 'success',
      );
```

- [ ] **Step 5.2: Tự kiểm tra không còn tham chiếu sót**

Run: `Select-String -Path "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader\src\components\features\classroom\AssignmentPanel.tsx" -Pattern 'duyetCaChuaChac|conChuaChac|trừ khi tick' | Measure-Object | Select-Object -ExpandProperty Count`
Expected: `0`.

- [ ] **Step 5.3: Commit**

```powershell
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" add src/components/features/classroom/AssignmentPanel.tsx
git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" commit -m "feat(classroom-ui): cham & duyet tat ca duyet luon bai can soat, bo o tick"
```

---

### Task 6: Full verify + merge

**Files:** không sửa code; chạy kiểm.

- [ ] **Step 6.1: Full test suite**

Run (background, >120s): `npx vitest run src api`
Expected: 0 fail. (Baseline đợt trước: 174+ test xanh sau khi hợp cả `api`.)

- [ ] **Step 6.2: Build**

Run (background, >120s): `npm run build`
Expected: zero TypeScript error, build success.

- [ ] **Step 6.3: Xoá artefact build sót (nếu xuất hiện)**

Run (nếu file tồn tại): `Remove-Item "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader\tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue`
Expected: working tree sạch những `{spec,plan} mới + code thay đổi`.

- [ ] **Step 6.4: Kiểm lại mapa thay đổi**

Run: `git -C "C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-grader" diff 82d0b54 HEAD --stat`
Expected: đúng 7 file (autoGrade.ts, submissionSelection.ts, AssignmentPanel.tsx + 4 test-file).

- [ ] **Step 6.5: Báo thầy — chờ quyết merge/deploy**

Không tự merge `origin main` — chờ thầy duyệt (quy ước: merge fast-forward lên main qua feature branch, không force-push).

---

## Self-review của plan (đã chạy với fresh eyes)

1. **Spec coverage:** Mục 1 spec → Task 1 (cron + fresh auto) + Task 2 (classBacklog) + Task 5 (UI bỏ tick); mục 2 (chip) → không code mới, khoá dữ liệu thuần ở Task 1-2; không harness UI nên không có test chip render (spec ghi "nếu harness sẵn" — không sẵn, đã ghi rõ tại Task 5); mục 3 → Task 2 (editedByTeacher) + Task 3 (examCheck rời grade + thống kê điểm mới) + Task 4 (chuỗi cron end-to-end). Nghiệm thu spec #1-8 đều có task/chứng cứ tương ứng. ✅
2. **Placeholder scan:** mọi step có code/lệnh → kết quả mong đợi cụ thể; không TBD/TODO/“tương tự Task N”. ✅
3. **Type consistency:** `needsTeacherCheck(submission.grade)` giữ thân hàm; `olderThanWindow`, `READ_CONFIDENCE_FLOOR` là hằng có sẵn trong file; `buildClassLoScores(11, roster, submissions, assignments)` khớp gọi hiện có (`loClassScores.test.ts:16`); `update['grade.examCheck']` khớp patch field-dot của `buildManualGradeUpdate`. ✅
4. **Rủi ro sót:** Task 6 kiểm đúng 8 file thay đổi (7 code/test + spec đã commit riêng `82d0b54`). ✅
