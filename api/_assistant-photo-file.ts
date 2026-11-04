/**
 * Tải ảnh Zalo về Buffer — dùng chung cho luồng NỘP BÀI và luồng GIẢI ĐỀ TỪ ẢNH.
 *
 * VÌ SAO CẦN (sự cố 3–4/11): HS gửi ảnh bài làm nhưng bot báo lỗi và web không có ảnh.
 * Nguyên nhân nhận ảnh quá mong manh:
 *  - CDN Zalo có lúc trả content-type lạ (`image/jpg`, `application/octet-stream`) hoặc thiếu
 *    hẳn header → code cũ loại ngay với "ảnh quá lớn hoặc sai định dạng" dù ảnh hoàn toàn tốt.
 *  - Mạng chập chờn: 1 lần fetch lỗi là mất ảnh luôn, không thử lại.
 * Cách xử lý: đọc MAGIC BYTES để biết đúng định dạng thật, nhận thêm alias `image/jpg`,
 * thử lại 1 lần, timeout 30s. Log CHỈ metadata (status/header/số byte) — không log URL/nội dung.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

/** Đọc định dạng thật từ magic bytes. Trả '' khi không nhận ra. */
export const sniffImageMime = (buffer: Buffer): string => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  return '';
};

/**
 * Tải ảnh, xác định mime thật. Trả null khi: tải hỏng sau 2 lần thử, quá lớn, rỗng,
 * hoặc không phải ảnh. Caller PHẢI có câu trả lời hướng dẫn — không được im lặng.
 */
export const downloadImage = async (
  photoUrl: string,
  maxBytes = MAX_BYTES,
): Promise<{ buffer: Buffer; mimeType: string } | null> => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(photoUrl, { signal: AbortSignal.timeout(30_000), redirect: 'follow' });
      if (!res.ok) {
        console.error(`[photo-download] HTTP ${res.status} attempt=${attempt}`);
        continue;
      }
      const header = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const array = await res.arrayBuffer();
      const size = array.byteLength;
      if (size < 1 || size >= maxBytes) {
        console.error(`[photo-download] size=${size} limit=${maxBytes} attempt=${attempt}`);
        return null;
      }
      const buffer = Buffer.from(array);
      const sniffed = sniffImageMime(buffer);
      const normalized = MIME_ALIASES[header] || header;
      // Magic bytes đáng tin hơn header CDN; header chỉ dùng khi không nhận ra magic.
      const mimeType = sniffed || (IMAGE_MIMES.includes(normalized) ? normalized : '');
      console.log(`[photo-download] attempt=${attempt} header=${header || '-'} sniffed=${sniffed || '-'} bytes=${size} mime=${mimeType || 'unknown'}`);
      if (!mimeType) return null;
      return { buffer, mimeType };
    } catch (error) {
      console.error(`[photo-download] attempt=${attempt} error=${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`);
    }
  }
  return null;
};
