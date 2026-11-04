/**
 * Sự cố 3–4/11: HS gửi ảnh bài làm nhưng bot báo lỗi và web không có ảnh.
 * Test này khoá các hành vi chống lỗi của bộ tải ảnh:
 *  - CDN trả `image/jpg` (alias không chuẩn) vẫn nhận.
 *  - CDN trả `application/octet-stream` nhưng magic bytes là JPEG → vẫn nhận.
 *  - Lần tải đầu lỗi mạng → tự thử lại, không mất ảnh.
 *  - Không phải ảnh → null (caller có câu hướng dẫn).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadImage, sniffImageMime } from '../_assistant-photo-file.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const NOT_IMAGE = Buffer.from('anh-bai-lam');

const respond = (contentType: string | null, bytes: Buffer) => ({
  ok: true,
  headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null) },
  arrayBuffer: async () => bytes,
});

describe('sniffImageMime', () => {
  it('nhận JPEG/PNG, không nhận rác', () => {
    expect(sniffImageMime(JPEG)).toBe('image/jpeg');
    expect(sniffImageMime(PNG)).toBe('image/png');
    expect(sniffImageMime(NOT_IMAGE)).toBe('');
  });
});

describe('downloadImage — chịu lỗi định dạng/đường truyền', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('header alias image/jpg vẫn nhận là JPEG', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond('image/jpg', NOT_IMAGE)));
    const file = await downloadImage('https://photo.zalo/a.jpg');
    expect(file?.mimeType).toBe('image/jpeg');
  });

  it('header application/octet-stream nhưng magic bytes JPEG → nhận theo magic', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond('application/octet-stream', JPEG)));
    const file = await downloadImage('https://photo.zalo/b.jpg');
    expect(file?.mimeType).toBe('image/jpeg');
  });

  it('thiếu hẳn content-type nhưng magic bytes PNG → vẫn nhận', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond(null, PNG)));
    const file = await downloadImage('https://photo.zalo/c.png');
    expect(file?.mimeType).toBe('image/png');
  });

  it('lần tải đầu lỗi mạng → tự thử lại và vẫn lấy được ảnh', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(respond('image/jpeg', JPEG));
    vi.stubGlobal('fetch', fetchMock);
    const file = await downloadImage('https://photo.zalo/d.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(file?.mimeType).toBe('image/jpeg');
  });

  it('cả 2 lần đều lỗi → null (caller gửi câu hướng dẫn)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    expect(await downloadImage('https://photo.zalo/e.jpg')).toBeNull();
  });

  it('nội dung không phải ảnh → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond('text/html', NOT_IMAGE)));
    expect(await downloadImage('https://photo.zalo/f.html')).toBeNull();
  });

  it('quá giới hạn dung lượng → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond('image/jpeg', Buffer.alloc(1024))));
    expect(await downloadImage('https://photo.zalo/big.jpg', 512)).toBeNull();
  });
});
