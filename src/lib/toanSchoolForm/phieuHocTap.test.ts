import { describe, it, expect } from 'vitest';
import { trichPhieuHocTap } from './phieuHocTap';
import { parseToanLesson } from './parseToanLesson';

const GIAO_AN = `# KẾ HOẠCH DẠY HỌC

## SƠ KẾT
- Vé ra cửa 3-2-1

## BTVN
- Bài 1 trang 72

## PHỤ LỤC

### PHIẾU 1 – KHẢO SÁT HÀM SỐ
Hàm số bậc hai (Tiết 1 – dùng ở Hoạt động 2)

Khổ: dọc

Họ và tên: ......... Lớp: .........

A. Nhiệm vụ

| Nhiệm vụ | Yêu cầu | Lời giải |
|---|---|---|
| NV1 | Lập bảng biến thiên của $y=x^2-4x+3$ | |
| NV2 | Tìm giá trị lớn nhất | |

### PHIẾU 2 – LUYỆN TẬP
Hàm số bậc hai (Tiết 1 – dùng ở Hoạt động 3)

Khổ: ngang

| Bài | Đề | Hướng dẫn | Lời giải | Điểm |
|---|---|---|---|---|
| 1 | Vẽ đồ thị | Lập bảng | | |
`;

describe('parseToanLesson — phụ lục (ca đang hỏng trước đây)', () => {
  const m = parseToanLesson(GIAO_AN);

  it('tách đúng số phiếu', () => {
    expect(m.phuLuc).toHaveLength(2);
    expect(m.phuLuc.map(p => p.so)).toEqual(['1', '2']);
    expect(m.phuLuc[0].ten).toBe('KHẢO SÁT HÀM SỐ');
  });

  it('GIỮ ĐƯỢC bảng nhiệm vụ — trước đây mất sạch vì listItems bỏ qua bảng', () => {
    const bang = m.phuLuc[0].khoi.find(b => b.kind === 'table');
    expect(bang).toBeDefined();
    expect(bang).toMatchObject({ header: ['Nhiệm vụ', 'Yêu cầu', 'Lời giải'] });
    expect(JSON.stringify(bang)).toContain('NV1');
  });

  it('nội dung phiếu KHÔNG rơi nhầm sang mục Sơ kết', () => {
    expect(m.soKet).toEqual(['Vé ra cửa 3-2-1']);
    expect(m.btvn).toEqual(['Bài 1 trang 72']);
  });

  it('đọc khổ giấy AI khai', () => {
    expect(m.phuLuc[0].khoGiay).toBe('doc');
    expect(m.phuLuc[1].khoGiay).toBe('ngang');
  });

  it('trích được hoạt động sử dụng từ dòng phụ đề', () => {
    expect(m.phuLuc[0].hoatDong).toBe('Hoạt động 2');
    expect(m.phuLuc[1].hoatDong).toBe('Hoạt động 3');
  });

  it('không in lại dòng họ tên của AI — bộ dựng tự phát sinh một dòng chuẩn', () => {
    expect(JSON.stringify(m.phuLuc[0].khoi)).not.toContain('Họ và tên');
  });

  it('AI quên khai khổ mà bảng từ 4 cột thì tự suy ra ngang', () => {
    const md = GIAO_AN.replace('Khổ: ngang\n\n', '');
    expect(parseToanLesson(md).phuLuc[1].khoGiay).toBe('ngang');
  });

  it('AI quên khai khổ, bảng hẹp thì để dọc', () => {
    const md = GIAO_AN.replace('Khổ: dọc\n\n', '');
    expect(parseToanLesson(md).phuLuc[0].khoGiay).toBe('doc');
  });
});

describe('trichPhieuHocTap — nút phiếu lấy sẵn, không gọi AI', () => {
  it('dựng lại markdown đủ hai phiếu, có bảng và dòng họ tên', () => {
    const md = trichPhieuHocTap(GIAO_AN)!;
    expect(md).toContain('## PHIẾU 1 — KHẢO SÁT HÀM SỐ');
    expect(md).toContain('## PHIẾU 2 — LUYỆN TẬP');
    expect(md).toContain('| Nhiệm vụ | Yêu cầu | Lời giải |');
    expect(md).toContain('NV1');
    expect((md.match(/Họ và tên:/g) || []).length).toBe(2);
  });

  it('giữ nguyên công thức để KaTeX render', () => {
    expect(trichPhieuHocTap(GIAO_AN)).toContain('$y=x^2-4x+3$');
  });

  it('giáo án KHÔNG có phụ lục thì trả null để rơi về đường AI', () => {
    expect(trichPhieuHocTap('# Giáo án\n\n## BTVN\n- Bài 1')).toBeNull();
  });

  it('nội dung rỗng thì trả null', () => {
    expect(trichPhieuHocTap('')).toBeNull();
    expect(trichPhieuHocTap('   ')).toBeNull();
  });
});
