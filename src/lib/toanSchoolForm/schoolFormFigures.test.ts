import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { parseToanLesson } from './parseToanLesson';
import { buildSchoolFormDocument, figureKey, type FigureImages } from './buildSchoolFormDocx';
import { buildSchoolFormHtml } from './buildSchoolFormHtml';
import { phieuToMarkdown } from './phieuHocTap';

const AI_URL = 'https://firebasestorage.googleapis.com/v0/b/demo/o/ai-images%2Fa.png?alt=media&token=t';
const PHIEU_URL = 'https://cdn.example/p.png';
const TIKZ = '\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}';
const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```';

const LESSON = [
  '# KẾ HOẠCH DẠY HỌC — Hàm số',
  '## II. TIẾN TRÌNH HOẠT ĐỘNG',
  '### HOẠT ĐỘNG 1: KHỞI ĐỘNG (5 phút)',
  '| Thời gian | GV và HS | Nội dung |',
  '|---|---|---|',
  '| 8h00 | GV hỏi | Xem Hình 1 bên dưới |',
  '',
  fence('aiimg', AI_URL),
  '',
  fence('tikz', TIKZ),
  '',
  fence('aiimg', 'khu chợ ngoài trời chưa sinh ảnh'),
  '',
  '## PHỤ LỤC',
  '### PHIẾU 1 – LUYỆN TẬP',
  'Hàm số (Tiết 1 – dùng ở Hoạt động 1)',
  '',
  fence('aiimg', PHIEU_URL),
].join('\n');

// PNG 1×1 hợp lệ — đủ để docx nhúng một ImageRun.
const PNG_1PX = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));

const docXml = async (images: FigureImages): Promise<string> => {
  const buf = await Packer.toBuffer(buildSchoolFormDocument(parseToanLesson(LESSON), images));
  return (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string');
};

describe('form trường Toán — hình (TikZ / ảnh AI)', () => {
  it('parser gom hình ngoài bảng vào đúng hoạt động, bỏ aiimg chưa resolve', () => {
    const m = parseToanLesson(LESSON);
    expect(m.activities[0].hinh).toEqual([
      { type: 'aiimg', clean: AI_URL },
      { type: 'tikz', clean: TIKZ },
    ]);
  });

  it('parser giữ hình trong phiếu học tập', () => {
    const m = parseToanLesson(LESSON);
    expect(m.phuLuc[0].khoi).toContainEqual({ kind: 'figure', figure: { type: 'aiimg', clean: PHIEU_URL } });
  });

  it('Word: có ảnh thì nhúng ImageRun, thiếu ảnh thì ghi chú thích (không hỏng file)', async () => {
    const images: FigureImages = new Map([[figureKey({ type: 'aiimg', clean: AI_URL }), { data: PNG_1PX, width: 1, height: 1 }]]);
    const xml = await docXml(images);
    expect((xml.match(/<w:drawing>/g) || []).length).toBe(1);
    // TikZ + ảnh phiếu chưa render → 2 dòng chú thích.
    expect((xml.match(/Hình minh họa chưa tải được/g) || []).length).toBe(2);
  });

  it('HTML/PDF: ảnh AI dùng thẳng URL, TikZ dùng SVG từ Kroki', () => {
    const html = buildSchoolFormHtml(parseToanLesson(LESSON));
    expect(html).toContain(`<img src="${AI_URL.replace(/&/g, '&amp;')}"`);
    expect(html).toContain(`<img src="${PHIEU_URL}"`);
    expect(html).toMatch(/<img src="https:\/\/kroki\.io\/tikz\/svg\//);
  });

  it('trích phiếu ra markdown giữ lại khối hình', () => {
    const md = phieuToMarkdown(parseToanLesson(LESSON).phuLuc[0]);
    expect(md).toContain(fence('aiimg', PHIEU_URL));
  });
});
