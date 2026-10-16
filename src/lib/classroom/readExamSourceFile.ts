import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
// Nạp fileUtils để chạy phần cài worker của pdf.js (một chỗ duy nhất trong app).
import '../../utils/fileUtils';
import { docxXmlToText, pdfItemsToText, type PdfTextItem, type VariantSourceFile } from './examVariants';

/**
 * Đọc file đề/đáp án của bài kiểm tra định kì thành CHỮ để tách mã đề (trình duyệt).
 *
 * Khác `readSourceFile`: Word đọc thẳng `word/document.xml` để GIỮ BẢNG (bảng đáp án các mã) và chữ công thức;
 * PDF dùng lớp chữ (không render ảnh) — dòng "Mã đề …" và bảng đáp án là chữ thường, đọc được.
 * File không có chữ (ảnh, PDF scan, .doc đời cũ) trả chữ rỗng để bộ tách báo giáo viên.
 */
export const readExamSourceFile = async (file: File): Promise<VariantSourceFile> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'docx') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.file('word/document.xml')?.async('string');
    return { name: file.name, text: xml ? docxXmlToText(xml) : '' };
  }
  if (ext === 'pdf') {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const content = await (await pdf.getPage(index)).getTextContent();
      pages.push(pdfItemsToText(content.items as PdfTextItem[]));
    }
    const text = pages.join('\n').trim();
    return text.length >= 50 ? { name: file.name, text, pages } : { name: file.name, text: '' };
  }
  return { name: file.name, text: '' };
};

/** Số trang tối đa gửi AI khi giải đề MỘT mã (máy chủ cũng chỉ nhận chừng này ảnh). */
export const MAX_SOLVE_PAGES = 6;

/**
 * Ảnh các trang PDF của một mã đề — để AI giải đề đọc ĐƯỢC hình, đồ thị, bảng (lớp chữ của PDF Toán làm mất công thức
 * và không có hình). Đề Word không có ảnh trang → mảng rỗng, AI chỉ có chữ.
 */
export const renderVariantPages = async (
  refs: readonly { file: string; pages: number[] }[],
  files: ReadonlyMap<string, File>,
): Promise<{ images: string[]; truncated: boolean }> => {
  const { pdfToImages } = await import('../../utils/examImportUtils');
  const images: string[] = [];
  let truncated = false;
  for (const ref of refs) {
    const file = files.get(ref.file);
    if (!file) continue;
    const room = MAX_SOLVE_PAGES - images.length;
    if (room <= 0) { truncated = true; break; }
    if (ref.pages.length > room) truncated = true;
    images.push(...await pdfToImages(file, undefined, false, ref.pages.slice(0, room)));
  }
  return { images, truncated };
};
