import { describe, expect, it } from 'vitest';
import {
  answerClarifyRow, awaitsClarification, buildClarifyRows, canonicalAnswer, clarifyEnabledFor, clarifyKindFor, isUncertainQuestion,
  pendingClarifyCount, skipClarifyRow,
} from './clarification';
import type { QuestionResult } from './types';

const row = (patch: Partial<QuestionResult> = {}): QuestionResult => ({
  questionNumber: 'Phần I – Câu 1', status: 'correct', score: 0.25, maxScore: 0.25, studentAnswer: 'B', expectedAnswer: 'B',
  errorType: 'Không có', explanation: 'đúng', correction: '', nextPractice: '', confidence: 0.95, needsTeacherReview: false, ...patch,
});

describe('câu máy đọc chưa chắc', () => {
  it('không đọc được / tự đánh dấu cần soát / độ chắc thấp → chưa chắc; rõ ràng → không; câu bỏ qua theo lệnh GV → không', () => {
    expect(isUncertainQuestion(row())).toBe(false);
    expect(isUncertainQuestion(row({ status: 'unreadable' }))).toBe(true);
    expect(isUncertainQuestion(row({ needsTeacherReview: true }))).toBe(true);
    expect(isUncertainQuestion(row({ confidence: 0.4 }))).toBe(true);
    expect(isUncertainQuestion(row({ confidence: 0.6 }))).toBe(false);
    expect(isUncertainQuestion(row({ status: 'unreadable', ignoredByTeacherInstruction: true }))).toBe(false);
  });

  it('công tắc của lớp mặc định TẮT', () => {
    expect(clarifyEnabledFor({})).toBe(false);
    expect(clarifyEnabledFor(null)).toBe(false);
    expect(clarifyEnabledFor({ askStudentClarification: true })).toBe(true);
  });
});

describe('cách làm rõ từng câu', () => {
  it('theo dạng đáp án chuẩn: một chữ cái → chọn, a–d Đ/S → đúng-sai, một con số → gõ số (kể cả câu tự luận có đáp số)', () => {
    expect(clarifyKindFor(row({ expectedAnswer: 'C' }))).toBe('mcq');
    expect(clarifyKindFor(row({ expectedAnswer: 'a) Đ; b) S; c) Đ; d) S' }))).toBe('true_false');
    expect(clarifyKindFor(row({ expectedAnswer: 'Đúng' }))).toBe('true_false');
    expect(clarifyKindFor(row({ expectedAnswer: '-1,5' }))).toBe('short');
    expect(clarifyKindFor(row({ questionNumber: 'Tự luận – Bài 2', expectedAnswer: '12' }))).toBe('short');
  });

  it('đáp án chuẩn không theo khuôn: xem nhãn phần của đề; vẫn không rõ → tự luận (chụp lại)', () => {
    expect(clarifyKindFor(row({ questionNumber: 'Phần I – Câu 3', expectedAnswer: '' }))).toBe('mcq');
    expect(clarifyKindFor(row({ questionNumber: 'Phần II – Câu 1', expectedAnswer: '' }))).toBe('true_false');
    expect(clarifyKindFor(row({ questionNumber: 'Phần III – Câu 2', expectedAnswer: 'x^2+1' }))).toBe('short');
    expect(clarifyKindFor(row({ questionNumber: 'Tự luận – Bài 1', expectedAnswer: 'Giải hệ phương trình ra x = 2' }))).toBe('photo');
    expect(clarifyKindFor(row({ questionNumber: 'Bài 4', expectedAnswer: 'Chứng minh …' }))).toBe('photo');
  });

  it('buildClarifyRows chỉ đánh dấu câu chưa chắc, ghi lại máy đã đọc ra gì, kèm các ý Đúng/Sai', () => {
    const { rows, asked } = buildClarifyRows([
      row(),
      row({ questionNumber: 'Phần I – Câu 2', status: 'unreadable', studentAnswer: 'B hoặc D', expectedAnswer: 'D', needsTeacherReview: true }),
      row({ questionNumber: 'Phần II – Câu 1', expectedAnswer: 'a) Đ; b) S; c) Đ; d) S', studentAnswer: 'không rõ', confidence: 0.3 }),
      row({ questionNumber: 'Tự luận – Bài 1', expectedAnswer: 'chứng minh', status: 'unreadable', needsTeacherReview: true }),
    ]);
    expect(asked).toBe(2);
    expect(rows[0].clarify).toBeUndefined();
    expect(rows[1].clarify).toMatchObject({ kind: 'mcq', state: 'open', reading: 'B hoặc D' });
    expect(rows[2].clarify).toMatchObject({ kind: 'true_false', state: 'open', parts: ['a', 'b', 'c', 'd'] });
    expect(rows[3].clarify).toBeUndefined(); // tự luận: chưa hỏi chụp lại ở giai đoạn 1
    expect(pendingClarifyCount(rows)).toBe(2);
    expect(awaitsClarification(rows)).toBe(true);
    // Gọi lại không đè câu đã xử lý
    const answered = answerClarifyRow(rows[1], 'D', '2026-10-09T00:00:00Z')!;
    expect(buildClarifyRows([answered]).rows[0]).toBe(answered);
  });
});

describe('chuẩn hoá đáp án em gõ', () => {
  it('trắc nghiệm: một chữ A–D (viết thường, có ngoặc đều được); chữ khác bị từ chối', () => {
    expect(canonicalAnswer('mcq', ' b ')).toEqual({ ok: true, value: 'B' });
    expect(canonicalAnswer('mcq', '(c)')).toEqual({ ok: true, value: 'C' });
    expect(canonicalAnswer('mcq', 'E').ok).toBe(false);
    expect(canonicalAnswer('mcq', 'AB').ok).toBe(false);
    expect(canonicalAnswer('mcq', '').ok).toBe(false);
    expect(canonicalAnswer('mcq', 5).ok).toBe(false);
  });

  it('đúng-sai nhiều ý: phải đủ các ý, ra đúng khuôn "a) Đ; b) S…" theo thứ tự', () => {
    const parts = ['a', 'b', 'c', 'd'];
    expect(canonicalAnswer('true_false', 'd) S; a) Đ; c) Đ; b) S', parts)).toEqual({ ok: true, value: 'a) Đ; b) S; c) Đ; d) S' });
    expect(canonicalAnswer('true_false', 'a) Đ; b) S', parts).ok).toBe(false);
    expect(canonicalAnswer('true_false', 'a) X; b) S; c) Đ; d) S', parts).ok).toBe(false);
  });

  it('đúng-sai một ý: Đúng/Sai; trả lời ngắn: một con số (dấu phẩy, âm, phân số), không nhận chữ', () => {
    expect(canonicalAnswer('true_false', 'sai')).toEqual({ ok: true, value: 'Sai' });
    expect(canonicalAnswer('true_false', 'có')).toMatchObject({ ok: false });
    expect(canonicalAnswer('short', ' −1,5 ')).toEqual({ ok: true, value: '-1,5' });
    expect(canonicalAnswer('short', '3/4')).toEqual({ ok: true, value: '3/4' });
    expect(canonicalAnswer('short', 'x = 2').ok).toBe(false);
    expect(canonicalAnswer('photo', 'abc').ok).toBe(false);
  });
});

describe('áp đáp án em gõ', () => {
  const open = (patch: Partial<QuestionResult>) => buildClarifyRows([row({ status: 'unreadable', needsTeacherReview: true, studentAnswer: 'B hoặc D', score: 0, ...patch })]).rows[0];

  it('chấm tất định theo đáp án, ghi đáp án vào "Em làm", đóng cờ, đánh dấu em đã tự điền', () => {
    const wrong = answerClarifyRow(open({ expectedAnswer: 'D' }), 'B', 'T')!;
    expect(wrong).toMatchObject({ studentAnswer: 'B', score: 0, status: 'incorrect', needsTeacherReview: false, clarify: { state: 'answered', at: 'T' } });
    const right = answerClarifyRow(open({ expectedAnswer: 'D' }), 'D', 'T')!;
    expect(right).toMatchObject({ studentAnswer: 'D', score: 0.25, status: 'correct', needsTeacherReview: false });
    expect(right.explanation).toContain('tự điền');
  });

  it('đáp án chuẩn không chấm tất định được → giữ cờ cho thầy cô (không đoán điểm)', () => {
    const q = open({ questionNumber: 'Phần I – Câu 5', expectedAnswer: '' });
    const out = answerClarifyRow(q, 'C', 'T')!;
    expect(out).toMatchObject({ studentAnswer: 'C', needsTeacherReview: true, clarify: { state: 'answered' } });
  });

  it('chỉ trả lời được câu đang mở loại gõ: trả lời lần 2, câu tự luận → null', () => {
    const q = open({ expectedAnswer: 'D' });
    const done = answerClarifyRow(q, 'D', 'T')!;
    expect(answerClarifyRow(done, 'A', 'T')).toBeNull();
    expect(answerClarifyRow(open({ questionNumber: 'Tự luận – Bài 1', expectedAnswer: 'chứng minh' }), 'x', 'T')).toBeNull();
  });

  it('em chọn "để thầy cô xem" → câu giữ cờ soát, không hỏi nữa; câu đã xong thì bỏ qua không được', () => {
    const q = open({ expectedAnswer: 'D' });
    const skipped = skipClarifyRow(q, 'T')!;
    expect(skipped).toMatchObject({ needsTeacherReview: true, clarify: { state: 'skipped' } });
    expect(pendingClarifyCount([skipped])).toBe(0);
    expect(skipClarifyRow(answerClarifyRow(q, 'D', 'T')!, 'T')).toBeNull();
  });
});
