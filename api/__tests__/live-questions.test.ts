import { describe, expect, it } from 'vitest';

// Đọc trực tiếp api/_live-questions.ts — kiểm các phần thuần bằng source scan
// (rate limit + idempotency + không lưu định danh) vì module import firebase-admin.
import { readFileSync } from 'node:fs';

const source = readFileSync('api/_live-questions.ts', 'utf8');

describe('COMM-AQ-01 — server câu hỏi ẩn danh (audit source)', () => {
  it('KHÔNG ghi uid/studentName/device/IP vào doc câu hỏi', () => {
    const setCall = source.slice(source.indexOf("questionsRef.doc(questionId).set("));
    const docBody = setCall.slice(0, setCall.indexOf('});'));
    expect(docBody).not.toMatch(/participantUid|studentName|deviceId|userIp|uid/);
    expect(docBody).toContain('questionId');
    expect(docBody).toContain('body: questionBody');
  });

  it('KHÔNG lưu bảng ánh xạ question → student (không collection mapping)', () => {
    expect(source).not.toMatch(/questionMapping|questionOwner|questionToStudent/);
  });

  it('log server không kèm uid', () => {
    const logLine = source.split('\n').find((l) => l.includes('[live-question] accepted'));
    expect(logLine).toBeDefined();
    expect(logLine).not.toContain('uid');
  });

  it('rate limit 5 câu/phút theo uid, chỉ giữ timestamp', () => {
    expect(source).toContain('RATE_MAX_PER_WINDOW = 5');
    expect(source).toContain('allowSend(uid, now)');
  });

  it('idempotency theo clientNonce trong cửa sổ 10 phút', () => {
    expect(source).toContain('NONCE_WINDOW_MS = 10 * 60_000');
    expect(source).toContain("where('clientNonce', '==', clientNonce)");
  });

  it('quyền gửi: HS phải gắn lớp của phiên (studentLinks đọc tại boundary rồi bỏ)', () => {
    expect(source).toContain("db.collection('studentLinks').doc(uid)");
    expect(source).toContain('link.classId !== session.classId');
  });

  it('Publish gate: câu mới không tự lên TV — publish chỉ do GV gọi riêng', () => {
    expect(source).toContain("handleLiveQuestionModeration");
    expect(source).toContain("collection('publishedQuestions').doc(questionId)");
  });

  it('GV điều hành: chỉ teacherUid của phiên được publish/đổi trạng thái', () => {
    expect(source).toContain('data.teacherUid !== uid');
  });
});
