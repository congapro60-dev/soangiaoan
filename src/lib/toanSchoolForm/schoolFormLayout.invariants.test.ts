// Khoá bất biến "hai đường xuất, MỘT chuẩn".
//
// HANDOFF từ lâu khẳng định `COL3` phải khớp `TOAN_ACTIVITY_COL_RATIOS`, nhưng thực tế chỉ
// có comment nhắc chứ KHÔNG có test nào chặn. Nay có ba nơi tiêu thụ cùng bộ số (docx, HTML
// in PDF, và luật style dùng cho đường xuất Word chung) nên phải khoá bằng máy.

import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_COL_RATIOS, ACTIVITY_COL_TWIP, FILL, MARGIN_TWIP,
  PAGE_TWIP, PRINTABLE_TWIP, toPercents,
} from './schoolFormLayout';
import { TOAN_ACTIVITY_COL_RATIOS, TOAN_ACT_HEADER_FILL } from '../../utils/toanStyleRules';
import { buildSchoolFormHtml, SCHOOL_FORM_PRINT_CSS } from './buildSchoolFormHtml';
import type { ToanLessonModel } from './parseToanLesson';

const model = (): ToanLessonModel => ({
  title: 'KHDH',
  header: { lop: '10A', tenBai: 'Hàm số bậc hai', mon: 'Toán', giaoVien: 'GV A', tuan: '20', namHoc: '2025 - 2026' },
  nangLuc: ['Tư duy và lập luận toán học'],
  mucTieu: [{ muc: 'Cơ bản', noiDung: 'Xác định hệ số' }],
  phanHoa: ['Nhóm giỏi làm bài ngược'],
  taiLieu: ['SGK trang 70'],
  activities: [
    { title: 'KHỞI ĐỘNG', thoiLuong: '5 phút', rows: [{ thoiGian: 'P0–P5', gvHs: '**GV:** nêu bài toán', noiDung: 'Đỉnh $I(-b/2a)$' }] },
    { title: 'RÈN LUYỆN', thoiLuong: '12 phút', rows: [{ thoiGian: 'P24–P36', gvHs: 'GV giao bài', noiDung: 'Ý 1' }] },
  ],
  btvn: ['Bài 1 trang 72'],
  soKet: ['Exit ticket'],
});

describe('bất biến bố cục form Toán', () => {
  it('tỉ lệ 3 cột giống nhau giữa schoolFormLayout và toanStyleRules', () => {
    expect([...ACTIVITY_COL_RATIOS]).toEqual([...TOAN_ACTIVITY_COL_RATIOS]);
  });

  it('bộ twip của bản .docx đúng tỉ lệ 15/45/40', () => {
    const total = ACTIVITY_COL_TWIP.reduce((a, b) => a + b, 0);
    ACTIVITY_COL_TWIP.forEach((twip, i) => {
      expect(twip / total).toBeCloseTo(ACTIVITY_COL_RATIOS[i], 3);
    });
  });

  it('bề rộng cột trong HTML dẫn xuất từ cùng bộ tỉ lệ', () => {
    const html = buildSchoolFormHtml(model());
    for (const pct of toPercents(ACTIVITY_COL_RATIOS)) {
      expect(html).toContain(`width:${pct}`);
    }
  });

  it('fill header bảng hoạt động khớp toanStyleRules', () => {
    expect(FILL.tienTrinh.toLowerCase()).toBe(TOAN_ACT_HEADER_FILL.toLowerCase());
  });

  it('PRINTABLE = bề rộng trang trừ hai lề', () => {
    expect(PRINTABLE_TWIP).toBe(PAGE_TWIP.width - MARGIN_TWIP.left - MARGIN_TWIP.right);
  });
});

describe('buildSchoolFormHtml — soi gương bản Word', () => {
  it('đủ và ĐÚNG THỨ TỰ các khối của buildSchoolFormDocument', () => {
    const html = buildSchoolFormHtml(model());
    const order = [
      'KẾ HOẠCH DẠY HỌC', 'I. THÔNG TIN CHUNG', '1. Tiêu chuẩn năng lực cốt lõi',
      '2. Mục tiêu học tập', '3. Tài liệu dạy học', 'II. TIẾN TRÌNH HOẠT ĐỘNG',
      '3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH', 'KHỞI ĐỘNG', 'RÈN LUYỆN', '5. SƠ KẾT', '6. BTVN',
    ];
    let prev = -1;
    for (const label of order) {
      const at = html.indexOf(label);
      expect(at, `thiếu khối: ${label}`).toBeGreaterThan(-1);
      expect(at, `sai thứ tự tại: ${label}`).toBeGreaterThan(prev);
      prev = at;
    }
  });

  it('dùng đúng bộ màu pastel của template', () => {
    const html = buildSchoolFormHtml(model());
    for (const fill of [FILL.ttc, FILL.sub, FILL.tienTrinh, FILL.khoiDong, FILL.hoatDongChinh, FILL.soKet, FILL.btvn]) {
      expect(html).toContain(`#${fill}`);
    }
    // Hoạt động đầu tiên là khởi động, các hoạt động sau dùng màu khác.
    expect(html).toContain(`#${FILL.hoatDong}`);
  });

  it('công thức $...$ render bằng KaTeX, không in ra dấu đô la', () => {
    const html = buildSchoolFormHtml(model());
    expect(html).toContain('katex');
    expect(html).not.toContain('$I(-b/2a)$');
  });

  it('**đậm** thành <b>, không in ra dấu sao', () => {
    const html = buildSchoolFormHtml(model());
    expect(html).toContain('<b>GV:</b>');
    expect(html).not.toContain('**GV:**');
  });

  it('<br/> thành <br>, không in ra chữ', () => {
    const m = model();
    m.activities[0].rows[0].gvHs = 'Dòng 1<br/>Dòng 2';
    const html = buildSchoolFormHtml(m);
    expect(html).toContain('Dòng 1<br>Dòng 2');
    expect(html).not.toContain('&lt;br');
  });

  it('escape HTML trong nội dung giáo án, không cho chèn thẻ', () => {
    const m = model();
    m.activities[0].rows[0].noiDung = 'So sánh a < b và <script>alert(1)</script>';
    const html = buildSchoolFormHtml(m);
    expect(html).toContain('a &lt; b');
    expect(html).not.toContain('<script>');
  });

  it('CSS in chỉ khai HƯỚNG giấy, không khoá khổ giấy người dùng chọn', () => {
    expect(SCHOOL_FORM_PRINT_CSS).toContain('size: landscape');
    expect(SCHOOL_FORM_PRINT_CSS).not.toMatch(/size:\s*(a4|letter|legal|a3)/i);
  });

  it('hàng tiêu đề bảng hoạt động lặp lại khi bảng tràn trang', () => {
    expect(SCHOOL_FORM_PRINT_CSS).toContain('display: table-header-group');
  });
});
