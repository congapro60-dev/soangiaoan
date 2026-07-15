import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import fs from 'node:fs';
import { buildSchoolFormDocument } from './buildSchoolFormDocx';
import { parseToanLesson } from './parseToanLesson';
import type { ToanLessonModel } from './parseToanLesson';

const baseModel = (): ToanLessonModel => ({
  title: 'KHDH',
  header: { lop: '10A', tenBai: 'PT đường thẳng', mon: 'Toán', giaoVien: 'GV A', tuan: '20', namHoc: '2025 - 2026' },
  nangLuc: ['Tư duy và lập luận toán học'],
  mucTieu: [{ muc: 'Cơ bản', noiDung: 'Viết PTTQ' }],
  phanHoa: ['Bài 1 SGK — Bài 2 — Bài 5'],
  taiLieu: ['SGK trang 70'],
  activities: [
    { title: 'KHỞI ĐỘNG', thoiLuong: '5 phút', rows: [{ thoiGian: '8h00', gvHs: '**GV:** nêu bài toán', noiDung: 'Định lý: $ax+by+c=0$' }] },
    { title: 'HOẠT ĐỘNG 2', thoiLuong: '15 phút', rows: [{ thoiGian: '8h05', gvHs: 'GV hỏi', noiDung: 'Ví dụ' }] },
  ],
  btvn: ['Bài 1 trang 72'],
  soKet: ['Exit ticket'],
});

const buildXml = async (m: ToanLessonModel): Promise<string> => {
  const buf = await Packer.toBuffer(buildSchoolFormDocument(m));
  const zip = await JSZip.loadAsync(buf);
  return zip.file('word/document.xml')!.async('string');
};

describe('buildSchoolFormDocx', () => {
  it('dùng font Arial + đúng các mã màu pastel của template', async () => {
    const xml = await buildXml(baseModel());
    expect(xml).toContain('Arial');
    for (const fill of ['C9DAF8', 'CFE2F3', 'E6B8AF', 'D9EAD3', 'B4A7D6', 'EAD1DC']) {
      expect(xml.toUpperCase()).toContain(fill);
    }
  });

  it('khổ Letter NGANG (landscape)', async () => {
    const xml = await buildXml(baseModel());
    expect(xml).toMatch(/w:orient="landscape"/);
    expect(xml).toContain('w:w="15840"');
  });

  it('công thức $...$ render thành OMML native (nằm trong <m:oMath>, không phải <w:t> thường)', async () => {
    const xml = await buildXml(baseModel());
    expect(xml).toContain('<m:oMath');
    // "ax+by+c=0" phải nằm trong <m:t> của OMML, KHÔNG phải trong <w:t> run thường.
    expect(xml).toMatch(/<m:t[^>]*>[^<]*ax\+by\+c=0/);
    expect(xml).not.toMatch(/<w:t[^>]*>[^<]*ax\+by\+c=0/);
  });

  it('bảng hoạt động có đủ 3 tiêu đề cột', async () => {
    const xml = await buildXml(baseModel());
    expect(xml).toContain('Thời gian thực');
    expect(xml).toContain('Giáo viên và Học sinh');
    expect(xml).toContain('Nội dung');
  });

  it('số con dấu digit trong text KHÔNG bị nuốt thành công thức', async () => {
    const m = baseModel();
    m.btvn = ['Bài 1, 2 trang 72 SGK'];
    const xml = await buildXml(m);
    expect(xml).toContain('Bài 1, 2 trang 72 SGK');
  });

  it('emit file để render QA (nếu chạy local)', async () => {
    const SP = process.env.SP;
    if (!SP || !fs.existsSync(SP)) return;
    const md = fs.existsSync(SP + '/schoolform_sample.md') ? fs.readFileSync(SP + '/schoolform_sample.md', 'utf8') : '';
    if (!md) return;
    const buf = await Packer.toBuffer(buildSchoolFormDocument(parseToanLesson(md)));
    fs.writeFileSync(SP + '/schoolform_out.docx', buf);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
