import { extractBase64FromImage, extractTextFromPDF, extractTextFromWord } from '../../utils/fileUtils';

/**
 * Đọc file đáp án / hướng dẫn chấm giáo viên tải lên.
 *
 * Ưu tiên rút ra CHỮ, vì chữ chỉ tốn công đọc một lần rồi dùng chung cho cả lớp. Ảnh chụp hay
 * bản scan không có chữ thì phải gửi kèm ảnh vào MỖI lượt chấm — cùng một đáp án nhưng tốn gấp
 * nhiều lần, nên chỗ nào rút được chữ thì luôn rút.
 */

const DUOI_ANH = new Set(['png', 'jpg', 'jpeg', 'webp']);
/** Dưới ngưỡng này coi như PDF scan, không có lớp chữ. */
const NGUONG_CHU = 50;

export interface SourceFileResult {
  /** Chữ rút được. Rỗng nghĩa là phải dùng tới ảnh. */
  text: string;
  /** Ảnh dạng data URL, chỉ có khi không rút được chữ. */
  images: string[];
  /** Lý do để hiện cho giáo viên hiểu vì sao ô chữ trống. */
  note: string;
}

const duoiFile = (name: string): string => name.split('.').pop()?.toLowerCase() || '';

export interface ReadSourceOptions {
  /**
   * PDF Toán: lấy ẢNH trang làm nguồn chính thay vì lớp chữ pdf.js.
   *
   * Lớp chữ của PDF (nhất là PDF xuất từ LaTeX/Word có công thức) khi rút bằng
   * `getTextContent` thường NÁT hoặc MẤT công thức — dấu căn, phân số, mũ, vectơ biến thành
   * chuỗi rời rạc. Gemini Vision đọc ảnh trang render lại chính xác hơn nhiều. Bật cờ này ở
   * luồng lớp học (giải đáp án) để AI đọc đúng đề; các luồng khác giữ hành vi cũ.
   */
  renderPdfPages?: boolean;
}

export const readSourceFile = async (file: File, options: ReadSourceOptions = {}): Promise<SourceFileResult> => {
  const duoi = duoiFile(file.name);

  if (DUOI_ANH.has(duoi)) {
    return {
      text: '',
      images: [await extractBase64FromImage(file)],
      note: `${file.name} là ảnh nên không rút được chữ. Ảnh sẽ được gửi kèm mỗi lượt chấm — tốn hơn bản có chữ.`,
    };
  }

  if (duoi === 'pdf') {
    // Khi cần đọc đúng công thức: render trang thành ảnh cho AI đọc, KHÔNG tin lớp chữ pdf.js.
    if (options.renderPdfPages) {
      const { pdfToImages } = await import('../../utils/examImportUtils');
      const images = await pdfToImages(file).catch(() => [] as string[]);
      if (images.length > 0) {
        return {
          text: '',
          images,
          note: `${file.name}: đã render ${images.length} trang thành ảnh để AI đọc ĐÚNG công thức (lớp chữ PDF thường làm hỏng công thức Toán). Soát lại rồi hãy giao bài.`,
        };
      }
      // Không render được ảnh: đành dùng lớp chữ làm phương án cuối, cảnh báo công thức có thể thiếu.
      const chu = (await extractTextFromPDF(file).catch(() => '')).trim();
      if (chu.length >= NGUONG_CHU) {
        return { text: chu, images: [], note: `${file.name}: chưa render được ảnh trang, tạm dùng lớp chữ — CÔNG THỨC CÓ THỂ THIẾU, soát thật kỹ.` };
      }
      return { text: '', images: [], note: `${file.name}: không đọc được. Chụp từng trang thành ảnh rồi tải lên, hoặc gõ tay đáp án.` };
    }

    const text = await extractTextFromPDF(file);
    if (text.trim().length >= NGUONG_CHU) {
      return { text: text.trim(), images: [], note: `Đã đọc chữ từ ${file.name}. Soát lại rồi hãy giao bài.` };
    }
    // PDF scan không có lớp chữ: chuyển tối đa vài trang thành ảnh để AI vẫn có thể đọc đề/
    // đáp án. File PDF gốc vẫn được giữ riêng để học sinh và giáo viên mở lại khi cần.
    const { pdfToImages } = await import('../../utils/examImportUtils');
    const images = await pdfToImages(file);
    if (images.length > 0) {
      return {
        text: '',
        images,
        note: `${file.name} là PDF scan; đã chuyển ${images.length} trang thành ảnh để AI đối chiếu.`,
      };
    }
    return {
      text: '',
      images: [],
      note: `${file.name} là PDF scan nhưng không chuyển được trang nào thành ảnh. Chụp lại thành ảnh rồi tải lên, hoặc gõ tay đáp án.`,
    };
  }

  if (duoi === 'doc' || duoi === 'docx') {
    const text = await extractTextFromWord(file);
    if (text.trim().length > 0) {
      return { text: text.trim(), images: [], note: `Đã đọc chữ từ ${file.name}. Soát lại rồi hãy giao bài.` };
    }
    return { text: '', images: [], note: `Không đọc được nội dung trong ${file.name}.` };
  }

  return { text: '', images: [], note: `Chưa hỗ trợ định dạng .${duoi}. Dùng PDF, Word hoặc ảnh.` };
};
