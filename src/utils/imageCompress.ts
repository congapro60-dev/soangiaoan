// Nén ảnh bài làm học sinh trước khi tải lên Firebase Storage.
//
// Vì sao cần: điện thoại hiện đại chụp JPEG 3–12MB trong khi storage.rules chỉ nhận
// `request.resource.size < 6 * 1024 * 1024`, và ảnh khổ lớn làm lượt gọi AI chấm tốn token hơn
// nhiều mà không tăng độ chính xác đọc chữ. Resize về tối đa MAX_CANH pixel là đủ máy đọc.

export const MAX_CANH = 1600;
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
  const duLieu = await docDataUrlTuFile(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const anh = new Image();
    anh.onload = () => resolve(anh);
    anh.onerror = () => reject(new LoiKhongGiaiMaDuoc());
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
