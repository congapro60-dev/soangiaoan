import { describe, expect, it } from 'vitest';
import { storagePathFromUrl, uniqueStoragePaths } from '../_classroom-storage';

const BUCKET = 'smartplan-ai-14200.firebasestorage.app';

describe('classroom storage path parsing', () => {
  it('giải mã đúng URL download chuẩn của Firebase', () => {
    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/homework%2Fstudent-1%2Fsub-1-a.jpg?alt=media&token=abc`;
    expect(storagePathFromUrl(url, BUCKET)).toBe('homework/student-1/sub-1-a.jpg');
  });

  it('hỗ trợ gs:// nhưng không nhận nhầm bucket khác', () => {
    expect(storagePathFromUrl(`gs://${BUCKET}/assignments/teacher-1/de.pdf`, BUCKET)).toBe('assignments/teacher-1/de.pdf');
    expect(storagePathFromUrl('gs://other-bucket/assignments/teacher-1/de.pdf', BUCKET)).toBeNull();
  });

  it('không lấy path từ URL ngoài hoặc URL hỏng', () => {
    expect(storagePathFromUrl('https://example.com/v0/b/smartplan-ai-14200.firebasestorage.app/o/a', BUCKET)).toBeNull();
    expect(storagePathFromUrl('not-a-url', BUCKET)).toBeNull();
  });

  it('loại URL trùng để không xoá cùng object hai lần', () => {
    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/homework%2Fs%2Fa.jpg?alt=media`;
    expect(uniqueStoragePaths([url, url], BUCKET)).toEqual(['homework/s/a.jpg']);
  });
});
