/**
 * Kiểm thử vòng tròn với CHÍNH file mẫu của trường:
 * điền → xuất → đọc lại bằng SheetJS → giá trị phải nằm đúng ô.
 *
 * Đây là thứ chứng minh bộ vá XML hoạt động. Nếu ai đó đổi file mẫu mà quên
 * cập nhật HANG_CHAM_DIEM, test này gãy ngay.
 */
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  HANG_CHAM_DIEM,
  datOTrongXml,
  docFileExcel,
  oSheetChamDiem,
  tenFileXuat,
  xuatTheoMau,
} from './excel';
import { bienBanRong, type BienBanDuGio } from './types';

const DUONG_DAN = 'public/mau/bien-ban-du-gio.xlsx';
let mau: ArrayBuffer;

const layMau = async () => mau.slice(0);

beforeAll(async () => {
  const buf = await readFile(DUONG_DAN);
  mau = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
});

const bienBanThu = (): BienBanDuGio => ({
  ...bienBanRong('u1'),
  gvHoTen: 'Nguyễn Văn A',
  lop: '11 Oxford',
  tuan: '12',
  bai: 'Cấp số nhân & "dấu <" trong bất đẳng thức',
  ngay: '2026-04-05',
  nguoiDu: 'Mr. Cường',
  namHocKy: 'Kì 2; năm 2025-2026',
  dongQuanSat: [
    { thoiGian: '9h00', hoatDong: 'Mở đầu', cuaGiaoVien: 'Nêu tình huống lãi kép', cuaHocSinh: 'HS thảo luận cặp', ghiChu: 'Nên chiếu đề lên bảng' },
    { thoiGian: '9h15', hoatDong: 'Hình thành', cuaGiaoVien: 'Dẫn công thức', cuaHocSinh: 'Khôi lên bảng', ghiChu: '' },
  ],
  diemChot: { '1a': 3, '3b': 2.5, '3c': null },
  chamNguong: { '3b': 'GV có chia nhóm nhưng quá ngắn, chưa ra kết quả.' },
  ketQua: {
    '1a': { diem: 3, tinCay: 'cao', bangChung: ['GV sửa lỗi dấu ngoặc cho HS'], lyDo: 'Kiến thức chính xác', cauHoi: [] },
    '3b': { diem: 2.5, tinCay: 'vua', bangChung: ['GV hỏi "Tại sao?" rồi tự trả lời'], lyDo: 'Chưa đủ thời gian chờ', cauHoi: [] },
  },
});

describe('datOTrongXml', () => {
  const xml =
    '<worksheet><sheetData><row r="1"><c r="A1" s="5" t="s"><v>3</v></c></row><row r="3"/></sheetData></worksheet>';

  it('ghi đè ô có sẵn và GIỮ NGUYÊN style s=', () => {
    const ra = datOTrongXml(xml, { A1: 'xin chào' });
    expect(ra).toContain('s="5"');
    expect(ra).toContain('t="inlineStr"');
    expect(ra).toContain('<t xml:space="preserve">xin chào</t>');
    expect(ra).not.toContain('<v>3</v>');
  });

  it('ghi số thì không bọc inlineStr', () => {
    expect(datOTrongXml(xml, { A1: 2.5 })).toContain('<c r="A1" s="5"><v>2.5</v></c>');
  });

  it('thoát ký tự XML để không làm hỏng file', () => {
    const ra = datOTrongXml(xml, { A1: 'a < b & c > d "x"' });
    expect(ra).toContain('a &lt; b &amp; c &gt; d &quot;x&quot;');
  });

  it('chèn được ô chưa tồn tại, đúng thứ tự cột', () => {
    const ra = datOTrongXml('<sheetData><row r="1"><c r="C1"/></row></sheetData>', { B1: 'x' });
    expect(ra.indexOf('r="B1"')).toBeLessThan(ra.indexOf('r="C1"'));
  });

  it('tạo được hàng chưa tồn tại', () => {
    const ra = datOTrongXml('<sheetData><row r="1"><c r="A1"/></row></sheetData>', { A9: 'x' });
    expect(ra).toContain('r="A9"');
  });

  it('giá trị rỗng để ô trống, KHÔNG ghi số 0', () => {
    const ra = datOTrongXml(xml, { A1: '' });
    expect(ra).toContain('<c r="A1" s="5"/>');
    expect(ra).not.toContain('<v>0</v>');
  });
});

describe('oSheetChamDiem', () => {
  it('thành tố không đánh giá để ô điểm TRỐNG, không phải 0', () => {
    const o = oSheetChamDiem(bienBanThu());
    expect(o['G' + HANG_CHAM_DIEM['1a']]).toBe(3);
    expect(o['G' + HANG_CHAM_DIEM['3b']]).toBe(2.5);
    expect(o['G' + HANG_CHAM_DIEM['3c']]).toBe('');
    expect(o['G' + HANG_CHAM_DIEM['2a']]).toBe('');
  });

  it('minh chứng chạm ngưỡng được ghi kèm vào cột bằng chứng', () => {
    const o = oSheetChamDiem(bienBanThu());
    expect(String(o['H' + HANG_CHAM_DIEM['3b']])).toContain('Chạm ngưỡng: GV có chia nhóm');
  });
});

describe('xuất rồi đọc lại file mẫu thật', () => {
  it('giữ đủ 2 sheet và điền đúng ô', async () => {
    const blob = await xuatTheoMau(bienBanThu(), layMau);
    const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });

    expect(wb.SheetNames).toHaveLength(2);
    expect(wb.SheetNames[0]).toBe('Nguyễn Văn A');

    const s1 = wb.Sheets[wb.SheetNames[0]];
    expect(s1.B2.v).toBe('11 Oxford');
    expect(s1.B3.v).toBe('12');
    expect(String(s1.C3.v)).toContain('Mr. Cường');
    expect(String(s1.B4.v)).toContain('dấu <');
    expect(s1.A8.v).toBe('9h00');
    expect(s1.C8.v).toBe('Nêu tình huống lãi kép');
    expect(s1.E8.v).toBe('Nên chiếu đề lên bảng');
    expect(s1.B9.v).toBe('Hình thành');

    const s2 = wb.Sheets[wb.SheetNames[1]];
    expect(s2['G' + HANG_CHAM_DIEM['1a']].v).toBe(3);
    expect(s2['G' + HANG_CHAM_DIEM['3b']].v).toBe(2.5);
    expect(s2['G' + HANG_CHAM_DIEM['3c']]).toBeUndefined();
    expect(String(s2['H' + HANG_CHAM_DIEM['1a']].v)).toContain('GV sửa lỗi dấu ngoặc');
  });

  it('giữ nguyên định dạng của mẫu: ô gộp và tiêu đề cột không mất', async () => {
    const goc = XLSX.read(mau.slice(0), { type: 'array' });
    const blob = await xuatTheoMau(bienBanThu(), layMau);
    const ra = XLSX.read(await blob.arrayBuffer(), { type: 'array' });

    const s2g = goc.Sheets[goc.SheetNames[1]];
    const s2r = ra.Sheets[ra.SheetNames[1]];
    expect(s2r['!merges']?.length).toBe(s2g['!merges']?.length);
    // Tiêu đề cột và chữ rubric không bị đụng tới.
    expect(s2r.G3.v).toBe('Điểm');
    expect(s2r.C3.v).toBe(s2g.C3.v);
    expect(s2r.C4.v).toBe(s2g.C4.v);
  });
});

describe('docFileExcel', () => {
  it('đọc lại được biên bản vừa xuất (vòng tròn khép kín)', async () => {
    const goc = bienBanThu();
    const blob = await xuatTheoMau(goc, layMau);
    const doc = docFileExcel(await blob.arrayBuffer(), 'u2');

    expect(doc.userId).toBe('u2');
    expect(doc.gvHoTen).toBe('Nguyễn Văn A');
    expect(doc.lop).toBe('11 Oxford');
    expect(doc.nguoiDu).toBe('Mr. Cường');
    expect(doc.namHocKy).toBe('Kì 2; năm 2025-2026');
    expect(doc.dongQuanSat).toHaveLength(2);
    expect(doc.dongQuanSat[0].cuaHocSinh).toBe('HS thảo luận cặp');
    expect(doc.diemChot['1a']).toBe(3);
    expect(doc.diemChot['3b']).toBe(2.5);
    // Không đánh giá thì không được biến thành 0.
    expect(doc.diemChot['3c']).toBeUndefined();
  });

  it('đọc được chính file mẫu gốc của trường', () => {
    const doc = docFileExcel(mau.slice(0), 'u1');
    expect(doc.lop).toBe('10Victoria');
    expect(doc.tuan).toBe('23');
    expect(doc.nguoiDu).toBe('Mr. Cường');
    // Mẫu gốc lưu tiếng Việt dạng NFD; docFileExcel phải chuẩn hóa về NFC,
    // nếu không phép so chuỗi này trượt dù hai bên nhìn y hệt nhau.
    expect(doc.bai).toContain('Khoảng cách');
    expect(doc.bai).toBe(doc.bai.normalize('NFC'));
    expect(doc.dongQuanSat.length).toBeGreaterThan(3);
    // Mẫu gốc có sẵn cột bằng chứng nhưng chưa chấm điểm nào.
    expect(Object.keys(doc.diemChot)).toHaveLength(0);
    expect(Object.keys(doc.ketQua).length).toBeGreaterThan(5);
  });
});

describe('tenFileXuat', () => {
  it('bỏ ký tự cấm trong tên file Windows', () => {
    const bb = { ...bienBanRong('u1'), gvHoTen: 'A/B:C', ngay: '2026-04-05' };
    expect(tenFileXuat(bb)).toBe('Bien ban du gio - ABC - 2026-04-05.xlsx');
  });
});
