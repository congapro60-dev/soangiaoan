// Nén ảnh bài làm học sinh trước khi tải lên Firebase Storage.
//
// Vì sao cần: điện thoại hiện đại chụp JPEG 3–12MB trong khi storage.rules chỉ nhận
// `request.resource.size < 6 * 1024 * 1024`, và ảnh khổ lớn làm lượt gọi AI chấm tốn token hơn
// nhiều mà không tăng độ chính xác đọc chữ. Resize về tối đa MAX_CANH pixel là đủ máy đọc.
//
// 1536 = 2 × 768: Gemini chia ảnh thành ô vuông 768px, nên ảnh dài cạnh ≤ 1536px chỉ tốn
// 4 ô (≈1.032 token) thay vì 6 ô (≈1.548) của mốc 1600 cũ — tiết kiệm ~33% token ảnh mà
// vẫn giữ gần như trọn độ sắc nét (nét bút đỏ của giáo viên vẫn đọc được).
import type { OmrSheet } from '../lib/omr/omrSheet';

export const MAX_CANH = 1536;
export const JPEG_QUALITY = 0.82;
/** Phải khớp mốc 6MB trong storage.rules (`homework/{uid}` và `student-uploads`). */
export const GIOI_HAN_BYTE_STORAGE = 6 * 1024 * 1024;

export interface KichThuoc {
  w: number;
  h: number;
}

/** Tính kích thước mới giữ nguyên tỉ lệ; ảnh nhỏ hơn max giữ nguyên, không phóng to. */
export const tinhKichThuocMoi = (
  rong: number,
  cao: number,
  maxCanh: number = MAX_CANH,
): KichThuoc => {
  const canhLonNhat = Math.max(rong, cao);
  if (!Number.isFinite(canhLonNhat) || canhLonNhat <= 0 || canhLonNhat <= maxCanh) {
    return { w: rong, h: cao };
  }
  const tiLe = maxCanh / canhLonNhat;
  return {
    w: Math.max(1, Math.round(rong * tiLe)),
    h: Math.max(1, Math.round(cao * tiLe)),
  };
};

export class LoiKhongGiaiMaDuoc extends Error {
  constructor() {
    super('Trình duyệt không giải mã được ảnh này.');
    this.name = 'LoiKhongGiaiMaDuoc';
  }
}

export const docDataUrlTuFile = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Không đọc được ảnh (${file instanceof File ? file.name : 'tệp'}).`));
    reader.readAsDataURL(file);
  });

type NguonVe = ImageBitmap | HTMLImageElement;

const giaiMaAnh = async (file: File): Promise<NguonVe> => {
  if (typeof createImageBitmap === 'function') {
    try {
      // from-image để tôn trọng xoay EXIF — ảnh chụp dọc otherwise bị nằm ngang sau khi nén.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // HEIC hoặc định dạng trình duyệt không hiểu → rơi xuống đường Image bên dưới để bắt lỗi đồng bộ.
    }
  }
  const duLieu = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const anh = new Image();
    anh.onload = () => { URL.revokeObjectURL(duLieu); resolve(anh); };
    anh.onerror = () => { URL.revokeObjectURL(duLieu); reject(new LoiKhongGiaiMaDuoc()); };
    anh.src = duLieu;
  });
};

const kichThuocCua = (nguon: NguonVe): KichThuoc =>
  'naturalWidth' in nguon
    ? { w: nguon.naturalWidth, h: nguon.naturalHeight }
    : { w: nguon.width, h: nguon.height };

/**
 * Trả về data URL sẵn sàng upload: ưu tiên bản JPEG đã resize;
 * ảnh không giải mã được (HEIC) thì dùng nguyên bản gốc nếu còn dưới ngưỡng rules,
 * vượt ngưỡng thì ném lỗi có hướng dẫn cụ thể cho học sinh.
 */
export const nenAnhBaiLam = async (file: File): Promise<string> => {
  let nguon: NguonVe;
  try {
    nguon = await giaiMaAnh(file);
  } catch {
    if (file.size < GIOI_HAN_BYTE_STORAGE) return docDataUrlTuFile(file);
    throw new Error(
      'Ảnh ở định dạng HEIC và quá nặng để tải lên. Em vào Cài đặt → Máy ảnh → Định dạng, chọn "Tương thích nhất" rồi chụp lại bài nhé.',
    );
  }

  const goc = kichThuocCua(nguon);
  const moi = tinhKichThuocMoi(goc.w, goc.h);
  const canvas = document.createElement('canvas');
  canvas.width = moi.w;
  canvas.height = moi.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in nguon) nguon.close();
    throw new Error('Trình duyệt này chưa hỗ trợ xử lý ảnh. Thử trình duyệt khác giúp em nhé.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, moi.w, moi.h);
  ctx.drawImage(nguon as CanvasImageSource, 0, 0, moi.w, moi.h);
  const ketQua = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if ('close' in nguon) nguon.close();
  return ketQua;
};

/**
 * Nén thẳng ra File (KHÔNG đi qua base64) — nhanh hơn nhiều trên điện thoại.
 *
 * `nenAnhBaiLam` trả data URL rồi code phải `atob` + `Uint8Array.from` ngược lại: với ảnh
 * 2–3 MB là hàng triệu ký tự base64, thao tác đó chạy trên main thread và làm Safari
 * iOS "treo" (không vẽ được khung hình). Ở đây dùng `canvas.toBlob` → Blob → File, không
 * có chuỗi base64 nào.
 *
 * Nén xong mà ảnh rỗng/hỏng (ví dụ HEIC mà trình duyệt không giải mã được) thì GIỮ bản
 * gốc — tốt hơn là tải lên một tấm ảnh trắng.
 */
export const nenAnhBaiLamToFile = async (file: File): Promise<File> => {
  let nguon: NguonVe;
  try {
    nguon = await giaiMaAnh(file);
  } catch {
    if (file.size < GIOI_HAN_BYTE_STORAGE) return file;
    throw new Error(
      'Ảnh ở định dạng HEIC và quá nặng để tải lên. Em vào Cài đặt → Máy ảnh → Định dạng, chọn "Tương thích nhất" rồi chụp lại bài nhé.',
    );
  }

  const goc = kichThuocCua(nguon);
  const moi = tinhKichThuocMoi(goc.w, goc.h);
  const canvas = document.createElement('canvas');
  canvas.width = moi.w;
  canvas.height = moi.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in nguon) nguon.close();
    throw new Error('Trình duyệt này chưa hỗ trợ xử lý ảnh. Thử trình duyệt khác giúp em nhé.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, moi.w, moi.h);
  ctx.drawImage(nguon as CanvasImageSource, 0, 0, moi.w, moi.h);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if ('close' in nguon) nguon.close();
  // Ảnh nén ra quá nhỏ = giải mã hỏng (ảnh trắng). Giữ bản gốc cho an toàn.
  if (!blob || blob.size < 1024) return file;
  const ten = file.name.replace(/\.[^.]+$/, '') || 'anh';
  return new File([blob], `${ten}.jpg`, { type: 'image/jpeg' });
};

export interface DetectedAnswer {
  questionNo: number;
  answer: 'A' | 'B' | 'C' | 'D' | null;
  confidence: number;
}

/** ponytail: chỉ lưới 4 × 10 A–D của phiếu này; mẫu khác trả [] và giữ chấm cũ. */
export function detectAnswers(image: Pick<ImageData, 'width' | 'height' | 'data'>): DetectedAnswer[] {
  const { width: w, height: h, data: pixels } = image;
  if (w < 200 || h < 200 || pixels.length !== w * h * 4) return [];
  const gray = new Uint8Array(w * h), mask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
    gray[i] = r > g + 15 && r > b + 10 ? 255 : Math.round((r + g + b) / 3);
    mask[i] = gray[i] < 145 ? 1 : 0;
  }
  const cells: { x: number; y: number; d: number }[] = [];
  const queue = new Int32Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    let head = 0, tail = 1, x0 = w, y0 = h, x1 = 0, y1 = 0;
    queue[0] = i; mask[i] = 0;
    while (head < tail) {
      const k = queue[head++], x = k % w, y = Math.floor(k / w);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (n >= 0 && mask[n]) { mask[n] = 0; queue[tail++] = n; }
      }
    }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    if (cw >= w * .009 && cw <= w * .025 && ch >= cw * .7 && ch <= cw * 1.4) cells.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: (cw + ch) / 2 });
  }
  const rows: { x: number; y: number; d: number; gap: number; slope: number }[] = [];
  const scale = w / 1152;
  for (const a of cells) for (const b of cells) {
    const gap = b.x - a.x;
    if (a.y < h * .25 || gap < 46 * scale || gap > 51 * scale || Math.abs(b.y - a.y) > a.d * .3) continue;
    const slope = (b.y - a.y) / gap;
    const near = (k: number) => cells.some(v => Math.abs(v.x - a.x - k * gap) < a.d * .3 && Math.abs(v.y - a.y - slope * k * gap) < a.d * .3);
    if (near(-1) || [0, 1, 2, 3].filter(near).length < 3) continue;
    rows.push({ ...a, gap, slope });
  }
  const groups: typeof rows[] = [];
  for (const row of rows.sort((a, b) => a.y - b.y)) {
    let group = groups.find(g => Math.abs(g[0].x - row.x) < row.d * .7 && Math.abs(g[0].y - row.y) < 250 * scale);
    if (!group) { group = []; groups.push(group); }
    if (!group.some(v => Math.abs(v.y - row.y) < row.d * .5)) group.push(row);
  }
  const rowPitch = (g: typeof rows) => {
    const gaps = g.slice(1).map((r, i) => (r.y - g[i].y) / Math.max(1, Math.round((r.y - g[i].y) / (24 * scale)))).sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)];
  };
  const blocks = groups.filter(g => g.length >= 6 && g.length <= 10).filter(g => {
    const pitch = rowPitch(g);
    return pitch >= 23 * scale && pitch <= 25 * scale && g.every(r => (r.y - g[0].y) / pitch < 9.2 && Math.abs((r.y - g[0].y) / pitch - Math.round((r.y - g[0].y) / pitch)) < .2);
  }).sort((a, b) => a[0].x - b[0].x);
  if (blocks.length !== 4 || blocks.some(g => Math.abs(g[0].y - blocks[0][0].y) > 20 * scale)) return [];
  return blocks.flatMap((group, block) => {
    const first = group[0], last = group[group.length - 1], pitch = rowPitch(group);
    return Array.from({ length: 10 }, (_, row) => {
      const t = row * pitch / (last.y - first.y), x = first.x + (last.x - first.x) * t, y = first.y + row * pitch;
      const scores = Array.from({ length: 4 }, (_, col) => {
        const cx = x + col * first.gap, cy = y + col * first.gap * first.slope, radius = first.d * .29;
        let n = 0, dark = 0;
        for (let dy = -Math.floor(radius); dy <= radius; dy++) for (let dx = -Math.floor(radius); dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const px = Math.round(cx + dx), py = Math.round(cy + dy);
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          n++; if (gray[py * w + px] < 130) dark++;
        }
        return n ? dark / n : 0;
      });
      const ranked = scores.map((score, col) => ({ score, col })).sort((a, b) => b.score - a.score);
      const top = ranked[0], margin = top.score - ranked[1].score;
      return { questionNo: block * 10 + row + 1, answer: top.score >= .3 ? 'ABCD'[top.col] as DetectedAnswer['answer'] : null,
        confidence: top.score >= .8 && margin > .35 ? .95 : 0 };
    });
  });
}

/** Đọc chính File tải lên, không đi qua chuỗi base64. */
export const detectAnswersFromFiles = async (files: readonly File[]): Promise<DetectedAnswer[]> => {
  let found: DetectedAnswer[] = [];
  for (const file of files.filter(f => f.type.startsWith('image/'))) {
    let source: NguonVe | undefined;
    try {
      source = await giaiMaAnh(file);
      const original = kichThuocCua(source), size = tinhKichThuocMoi(original.w, original.h), canvas = document.createElement('canvas');
      canvas.width = size.w; canvas.height = size.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size.w, size.h);
      ctx.drawImage(source, 0, 0, size.w, size.h);
      const answers = detectAnswers(ctx.getImageData(0, 0, size.w, size.h));
      if (answers.length) {
        if (found.length) return []; // Hai phiếu: không tự đoán thứ tự câu để ghép.
        found = answers;
      }
    } catch { /* Ảnh không đọc được giữ đường chấm cũ. */ }
    finally { if (source && 'close' in source) source.close(); }
  }
  return found;
};

export interface KetQuaQuetPhieu {
  /** Ảnh để tải lên: phiếu tô đã nắn phẳng + san sáng; ảnh tối/không đều đã san sáng; còn lại giữ nguyên. */
  files: File[];
  /** Kết quả máy dò phiếu tô mẫu Bộ 2025 (đúng một phiếu), hoặc null. */
  omrSheet: OmrSheet | null;
  /** Bộ dò cũ (phiếu 4 khối × 10 câu không ô định vị) — chỉ dùng khi không nhận ra phiếu mẫu. */
  detectedAnswers: DetectedAnswer[];
}

/**
 * "Scan" ảnh bài làm và dò phiếu tô ngay trên máy em, trước khi tải lên — không gọi AI.
 * Ảnh hỏng/không giải mã được thì giữ nguyên tệp gốc: không bao giờ làm mất bài.
 */
export const quetAnhVaPhieu = async (files: readonly File[]): Promise<KetQuaQuetPhieu> => {
  const { prepareImage, locateSheet, readSheet, scanImage, needsLightFix } = await import('../lib/omr/omrSheet');
  const out: File[] = [];
  const sheets: OmrSheet[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) { out.push(file); continue; }
    let source: NguonVe | undefined;
    try {
      source = await giaiMaAnh(file);
      const size = tinhKichThuocMoi(kichThuocCua(source).w, kichThuocCua(source).h);
      const canvas = document.createElement('canvas');
      canvas.width = size.w; canvas.height = size.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { out.push(file); continue; }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size.w, size.h);
      ctx.drawImage(source, 0, 0, size.w, size.h);
      const p = prepareImage(ctx.getImageData(0, 0, size.w, size.h));
      const loc = locateSheet(p);
      if (loc) sheets.push(readSheet(p, loc));
      if (!loc && !needsLightFix(p)) { out.push(file); continue; }
      const scanned = scanImage(p, loc);
      canvas.width = scanned.width; canvas.height = scanned.height;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(scanned.data), scanned.width, scanned.height), 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
      const ten = file.name.replace(/\.[^.]+$/, '') || 'anh';
      out.push(blob && blob.size >= 1024 ? new File([blob], `${ten}-scan.jpg`, { type: 'image/jpeg' }) : file);
    } catch {
      out.push(file);
    } finally {
      if (source && 'close' in source) source.close();
    }
  }
  // Hai phiếu trong một bài: không tự ghép thứ tự câu.
  const omrSheet = sheets.length === 1 ? sheets[0] : null;
  return { files: out, omrSheet, detectedAnswers: omrSheet ? [] : await detectAnswersFromFiles(out) };
};

/** Data URL (pdf.js, canvas cũ) → File. Chỉ dùng khi không còn cách nào khác. */
export const dataUrlToFile = (dataUrl: string, name: string): File => {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || '').trim());
  if (!match) throw new Error('Không tạo được ảnh bài làm. Chọn ảnh rồi thử lại.');
  return new File([Uint8Array.from(atob(match[2]), value => value.charCodeAt(0))], name, { type: match[1] });
};

/** Dịch lỗi nộp bài (Storage/Firestore/mạng) thành câu tiếng Việt nói đúng nguyên nhân. */
export const dichLoiNopBai = (error: unknown): string => {
  const ma = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';

  if (ma.includes('unauthenticated')) {
    return 'Phiên học đã hết hạn. Tải lại trang rồi đăng nhập mã lớp lại nhé.';
  }
  if (ma.includes('storage/unauthorized')) {
    return 'Máy chủ từ chối ảnh này — thường vì ảnh vượt quá dung lượng cho phép. Chụp sát trang vở để ảnh nhỏ hơn rồi nộp lại nhé.';
  }
  if (ma.includes('permission-denied')) {
    return 'Máy không ghi nhận được bài nộp vì phiên học không còn hiệu lực. Tải lại trang và đăng nhập lại nhé.';
  }
  if (ma.includes('retry-limit-exceeded') || ma.includes('network')) {
    return 'Mạng chập chờn nên ảnh chưa tới được máy chủ. Kiểm tra Wi-Fi/4G rồi bấm nộp lại nhé.';
  }
  if (ma.includes('canceled')) {
    return 'Việc tải ảnh vừa bị dừng giữa chừng. Bấm nộp lại nhé.';
  }
  if (ma.includes('quota-exceeded')) {
    return 'Bộ nhớ lưu trữ của lớp đã đầy. Em báo thầy cô kiểm tra lại nhé.';
  }
  if (ma !== '') {
    return 'Không tải được ảnh lên máy chủ. Kiểm tra kết nối mạng rồi thử lại nhé.';
  }
  return error instanceof Error && error.message
    ? error.message
    : 'Không nộp được bài. Thử lại giúp em nhé.';
};
