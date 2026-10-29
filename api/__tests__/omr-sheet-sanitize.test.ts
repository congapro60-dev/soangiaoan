import { describe, expect, it } from 'vitest';
import { sanitizeOmrSheet } from '../_submission-actors';

const good = {
  form: 'k12', alignment: 0.9, examCode: '102', studentCode: null, extra: 'bỏ',
  mcq: [{ q: 1, answer: 'B', confidence: 0.95 }, { q: 2, answer: null, confidence: 0.95 }],
  trueFalse: [{ q: 1, items: { a: 'Đ', b: 'S', c: null, d: 'S' }, confidence: 0.95 }],
  shortAnswer: [{ q: 1, answer: '-1,5', confidence: 0.95 }, { q: 2, answer: null, confidence: 0.95 }],
};

describe('kiểm khuôn kết quả dò phiếu tô từ máy em', () => {
  it('giữ đúng các trường đã khai, bỏ trường lạ', () => {
    const out = sanitizeOmrSheet(good)!;
    expect(out).not.toHaveProperty('extra');
    expect(out).toMatchObject({ form: 'k12', examCode: '102', mcq: good.mcq, shortAnswer: good.shortAnswer });
  });

  it.each([
    ['mẫu phiếu lạ', { form: 'k9' }],
    ['mã đề không phải 3 chữ số', { examCode: '10a' }],
    ['đáp án ngoài A–D', { mcq: [{ q: 1, answer: 'E', confidence: 1 }] }],
    ['câu ngoài 1–40', { mcq: [{ q: 41, answer: 'A', confidence: 1 }] }],
    ['Đúng/Sai sai chữ', { trueFalse: [{ q: 1, items: { a: 'X', b: null, c: null, d: null }, confidence: 1 }] }],
    ['trả lời ngắn quá dài / có chữ', { shortAnswer: [{ q: 1, answer: '12345', confidence: 1 }] }],
    ['độ tin ngoài 0–1', { mcq: [{ q: 1, answer: 'A', confidence: 2 }] }],
  ])('%s → bỏ cả phiếu (chấm như cũ)', (_name, patch) => {
    expect(sanitizeOmrSheet({ ...good, ...patch })).toBeUndefined();
  });

  it('không gửi → undefined', () => expect(sanitizeOmrSheet(undefined)).toBeUndefined());
});
