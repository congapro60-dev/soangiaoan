import { describe, it, expect } from 'vitest';
import { parseToanLesson } from './parseToanLesson';

const SAMPLE = `# KẾ HOẠCH DẠY HỌC — Phương trình đường thẳng (Tiết 1: Hình thành kiến thức)

| Lớp | 10A | Tên bài học | Phương trình đường thẳng | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | Nguyễn Văn A | Tuần học | 20 | Năm học | 2025 - 2026 |

## I. THÔNG TIN CHUNG
**1. Tiêu chuẩn năng lực cốt lõi**
- Tư duy và lập luận toán học
- Mô hình hóa toán học

**2. Mục tiêu học tập**
Sau tiết học, tôi có thể:

| Mức độ | Mục tiêu |
|---|---|
| Cơ bản | Viết được phương trình tổng quát [Bloom: Hiểu] |
| Trọng tâm | Áp dụng vào bài toán [Bloom: Áp dụng] |
| Nâng cao | Chứng minh trường hợp tổng quát [Bloom: Phân tích] |

**3. Phân hóa mục tiêu**

| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Bài 1 SGK | Bài 2 SGK | Bài nâng cao |

**4. Tài liệu dạy học**
- SGK trang 70
- Phiếu số 1

## II. TIẾN TRÌNH HOẠT ĐỘNG

### 1. KHỞI ĐỘNG — Bài toán quy hoạch (5 phút, P1–P5)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| 8h00–8h05 | GV: Nêu bài toán tuyến đường | Bài toán mở đầu |

### 2. HOẠT ĐỘNG 2: Hình thành kiến thức (15 phút, P5–P20)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| 8h05–8h20 | GV: Vì sao cần PT tổng quát? | Định lý: $ax+by+c=0$ |

## HƯỚNG DẪN VỀ NHÀ (BTVN)
- **HS yếu/TB:** Bài 1 trang 72
- **HS giỏi:** Bài 5 chứng minh

## SƠ KẾT / RÚT KINH NGHIỆM
- Exit ticket 2 dòng
`;

describe('parseToanLesson', () => {
  const m = parseToanLesson(SAMPLE);

  it('bảng hành chính → header fields', () => {
    expect(m.header.lop).toBe('10A');
    expect(m.header.tenBai).toBe('Phương trình đường thẳng');
    expect(m.header.mon).toBe('Toán');
    expect(m.header.giaoVien).toBe('Nguyễn Văn A');
    expect(m.header.tuan).toBe('20');
    expect(m.header.namHoc).toBe('2025 - 2026');
  });

  it('THÔNG TIN CHUNG: năng lực, mục tiêu, phân hóa, tài liệu', () => {
    expect(m.nangLuc).toContain('Tư duy và lập luận toán học');
    expect(m.mucTieu).toHaveLength(3);
    expect(m.mucTieu[0].muc).toBe('Cơ bản');
    expect(m.phanHoa.join(' ')).toMatch(/Bài 1 SGK/);
    expect(m.taiLieu).toContain('SGK trang 70');
  });

  it('các hoạt động + bảng 3 cột', () => {
    expect(m.activities.length).toBe(2);
    expect(m.activities[0].title).toMatch(/KHỞI ĐỘNG/i);
    expect(m.activities[0].thoiLuong).toMatch(/5 phút/);
    expect(m.activities[0].rows[0].gvHs).toMatch(/Nêu bài toán/);
    expect(m.activities[1].rows[0].noiDung).toMatch(/ax\+by\+c/);
  });

  it('BTVN & SƠ KẾT', () => {
    expect(m.btvn.length).toBeGreaterThanOrEqual(2);
    expect(m.soKet.join(' ')).toMatch(/Exit ticket/);
  });

  it('tolerant với markdown rỗng', () => {
    const empty = parseToanLesson('');
    expect(empty.activities).toHaveLength(0);
    expect(empty.header.mon).toBe('Toán');
  });
});
