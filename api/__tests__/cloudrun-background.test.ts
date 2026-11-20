import { describe, expect, it } from 'vitest';
import { runHoldingBackground } from '../../server/background';
import { chayNgam } from '../_grading-core';
import { sortPhotosBySentAt } from '../_assistant-ph-hs-photo';

// Lỗi thật 18/11 trên Cloud Run: chấm nền chạy sau khi trả webhook nên bị hạ CPU, báo "Chưa tải đủ ảnh".
const fakeRes = () => {
  const ended: unknown[][] = [];
  const res = { end: (...args: unknown[]) => { ended.push(args); return res; } };
  return { res: res as never, ended };
};
const later = <T>(ms: number, value: T) => new Promise<T>(resolve => setTimeout(() => resolve(value), ms));

describe('waitUntil cho Cloud Run', () => {
  it('ngoài route giữ việc nền thì chayNgam vẫn trả false (caller tự chờ như cũ)', () => {
    expect(chayNgam(Promise.resolve())).toBe(false);
  });
  it('chỉ gửi phản hồi khi việc nền (cả việc sinh thêm) đã xong', async () => {
    const { res, ended } = fakeRes();
    const log: string[] = [];
    await runHoldingBackground(res, async () => {
      expect(chayNgam(later(30, null).then(() => {
        log.push('chấm xong');
        chayNgam(later(20, null).then(() => log.push('báo phụ huynh')));
      }))).toBe(true);
      (res as { end: (body: string) => void }).end('ok');
      expect(ended).toHaveLength(0);
    });
    expect(log).toEqual(['chấm xong', 'báo phụ huynh']);
    expect(ended).toEqual([['ok']]);
  });
  it('việc nền lỗi hoặc quá hạn vẫn trả phản hồi', async () => {
    const { res, ended } = fakeRes();
    await runHoldingBackground(res, async () => {
      chayNgam(Promise.reject(new Error('lỗi')));
      chayNgam(later(5_000, null));
      (res as { end: (body: string) => void }).end('ok');
    }, 50);
    expect(ended).toEqual([['ok']]);
  });
});

describe('thứ tự ảnh nộp qua bot', () => {
  it('sắp theo giờ gửi của Zalo, không theo lúc tải xong, và đánh số lại tên tệp', () => {
    const photos = sortPhotosBySentAt([
      { url: 'c', name: '', mimeType: 'image/jpeg', size: 1, sentAt: 3000 },
      { url: 'a', name: '', mimeType: 'image/jpeg', size: 1, sentAt: 1000 },
      { url: 'b', name: '', mimeType: 'image/png', size: 1, sentAt: 2000 },
    ]);
    expect(photos.map(p => p.url)).toEqual(['a', 'b', 'c']);
    expect(photos.map(p => p.name)).toEqual(['zalo-01.jpeg', 'zalo-02.png', 'zalo-03.jpeg']);
  });
});

describe('chữ hiển thị trong luồng nộp ảnh (QA 19/11)', () => {
  it('trạng thái bài nộp bằng tiếng Việt và dung lượng ảnh nhỏ ghi KB', async () => {
    const { submissionStatusLabel, photoSizeText, photoAcceptedReply } = await import('../_assistant-ph-hs-photo');
    expect(['graded', 'error', 'grading', 'submitted', 'teacher_review', 'lạ'].map(submissionStatusLabel))
      .toEqual(['đã chấm', 'chưa chấm được', 'đang chấm', 'chờ chấm', 'chờ thầy cô duyệt', 'đã nộp']);
    expect(photoSizeText(36_544)).toBe('36 KB');
    expect(photoSizeText(2_621_440)).toBe('2,5 MB');
    expect(photoAcceptedReply(1, 36_544)).toContain('(36 KB)');
    expect(photoAcceptedReply(1, 36_544)).not.toContain('0.0MB');
  });
});
