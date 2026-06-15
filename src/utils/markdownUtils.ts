/**
 * Sửa lỗi Markdown từ AI (đặc biệt là lỗi bảng)
 * - Khử các variant <br> lỗi
 * - Tách các dòng bị AI đưa vào nhầm ô bảng
 * - Loại bỏ ảnh bên trong bảng gây vỡ layout
 * - Đảm bảo có dòng trống trước khi bắt đầu bảng
 */
export const cleanMarkdownOutput = (text: string): string => {
  if (!text) return text;

  // Bước 1: Chuẩn hóa thẻ <br> để tương thích với rehype-raw
  let result = text.replace(/<br\s*\/?>/gi, '<br/>');

  // Bước 2: Loại bỏ thẻ ảnh bên trong ô bảng (ảnh làm vỡ cấu trúc bảng markdown)
  result = result.replace(
    /\|([^|\n]*)!\[[^\]]*\]\([^)]*\)([^|\n]*)/g,
    '|$1$2'
  );

  // Bước 3: Sửa các dòng bị AI đẩy xuống hàng mới nhưng bản chất là của hàng cũ
  const lines = result.split('\n');
  const repaired: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const prevIdx = repaired.length - 1;
    const prevLine = prevIdx >= 0 ? repaired[prevIdx] : '';
    const prevTrimmed = prevLine.trim();

    const isTableRow = trimmed.startsWith('|');
    const isSeparator = /^\|[\s\-:|]+\|/.test(trimmed);
    const isEmpty = trimmed === '';
    const prevIsTableRow = prevTrimmed.startsWith('|');
    const prevIsSeparator = /^\|[\s\-:|]+\|/.test(prevTrimmed);

    if (isSeparator) {
      if (!inTable && prevIdx >= 0 && prevTrimmed !== '' && !prevIsTableRow) {
        repaired.push(''); // Bắt buộc thêm dòng trống trước bảng
      }
      inTable = true;
      repaired.push(line);
    } else if (isTableRow) {
      if (!inTable && prevIdx >= 0 && prevTrimmed !== '') {
        repaired.push(''); // Bắt buộc thêm dòng trống trước bảng
      }
      inTable = true;
      repaired.push(line);
    } else if (!isEmpty && inTable && prevIsTableRow && !prevIsSeparator) {
      // Content bị đẩy xuống - chèn ngược lại vào ô của hàng phía trước
      const row = repaired[prevIdx];
      const pipes = row.split('|');
      
      if (pipes.length >= 4) {
        // Cố gắng đoán cột cần chèn (thường là hoạt động hoặc nội dung)
        const isActivityContent = /^(GV|HS|Họ:|Lưu ý|\*{0,2}(GV|HS))/i.test(trimmed);
        if (isActivityContent) {
          pipes[2] = pipes[2] + '<br/>' + trimmed;
        } else {
          pipes[3] = pipes[3] + '<br/>' + trimmed;
        }
        repaired[prevIdx] = pipes.join('|');
      } else {
        const lastPipePos = row.lastIndexOf(' |');
        if (lastPipePos > 0) {
          repaired[prevIdx] = row.slice(0, lastPipePos) + '<br/>' + trimmed + row.slice(lastPipePos);
        } else {
          inTable = false;
          repaired.push(line);
        }
      }
    } else {
      if (isEmpty) inTable = false;
      repaired.push(line);
    }
  }

  result = repaired.join('\n');

  // Bước 4: Thu gọn các dòng trống thừa
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
};
