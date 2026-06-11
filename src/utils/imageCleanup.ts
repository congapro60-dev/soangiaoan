/**
 * Tối ưu hoá dữ liệu pixel Canvas để tăng cường khả năng OCR.
 * Biến đổi ảnh xám/nhiễu thành độ tương phản cao (đen/trắng nét).
 */
export const applyCleanFilterToCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Áp dụng thuật toán tăng tương phản mảng tuyến tính (Linear Contrast Stretching)
  // để làm trắng nền (nền giấy xám) và làm đen chữ viết tay/in.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Tính cường độ sáng (Luminance)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let v = 0;
    // Ngưỡng sáng: Nếu sáng hơn 180 (xám nhạt/trắng) -> Trắng tinh
    if (lum > 180) {
      v = 255;
    } 
    // Ngưỡng tối: Nếu tối hơn 100 (xám đậm/đen) -> Đen thui
    else if (lum < 100) {
      v = 0;
    } 
    // Vùng giữa: Kéo giãn tuyến tính (làm mượt gradient nhẹ)
    else {
      v = ((lum - 100) / 80) * 255;
    }

    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    // data[i+3] (Alpha) giữ nguyên
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Xử lý một ảnh Base64 (Ảnh chụp bài làm/Đề thi).
 * Trả về chuỗi Base64 đã được tối ưu.
 */
export const cleanImageBase64 = (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(dataUrl);
      }
      ctx.drawImage(img, 0, 0);
      applyCleanFilterToCanvas(canvas, ctx);
      // Nén lại dưới dạng JPEG 90%
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};
