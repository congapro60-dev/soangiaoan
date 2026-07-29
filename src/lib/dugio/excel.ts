/**
 * Đọc và ghi biên bản dự giờ theo đúng file mẫu Excel của trường.
 *
 * Vì sao KHÔNG dựng file mới bằng SheetJS: bản cộng đồng của `xlsx` ghi ra
 * không kèm định dạng — mất màu, viền, độ rộng cột, chiều cao dòng. File tải
 * về sẽ đúng nội dung nhưng không còn giống mẫu trường đang dùng.
 *
 * Cách làm ở đây: lấy chính file mẫu làm khuôn, mở như ZIP và chỉ thay GIÁ TRỊ
 * của những ô cần điền. Mọi định dạng của trường giữ nguyên 100%.
 */
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type { MaThanhTo } from '../../data/khungDanielson';
import type { BienBanDuGio, DongQuanSat } from './types';
import { bienBanRong } from './types';

export const DUONG_DAN_MAU = '/mau/bien-ban-du-gio.xlsx';

/** Dòng của từng cấu phần trong sheet "Chấm điểm" của mẫu trường. */
export const HANG_CHAM_DIEM: Partial<Record<MaThanhTo, number>> = {
  '1a': 4, '1b': 5, '1c': 6, '1d': 7, '1e': 8, '1f': 9,
  '2a': 11, '2c': 12, '2d': 13, '2e': 14,
  '3a': 16, '3b': 17, '3c': 18, '3d': 19, '3e': 20,
};

/** Dòng đầu tiên của bảng quan sát trong sheet biên bản (ngay dưới hàng tiêu đề). */
const HANG_QUAN_SAT_DAU = 8;
const HANG_QUAN_SAT_CUOI = 27;

/* ─────────────────────────── ĐỌC FILE LÊN ─────────────────────────── */

/**
 * Chuẩn hóa NFC ngay khi đọc vào.
 *
 * Excel/Word trên máy hay lưu tiếng Việt ở dạng tổ hợp (NFD): "Khoảng" đọc lên
 * trông y hệt chuỗi mình gõ nhưng khác byte, nên mọi phép so sánh, tìm kiếm và
 * đối chiếu prompt AI đều trượt một cách âm thầm. Chặn ngay tại cửa vào.
 */
const chuoi = (v: unknown): string => (v == null ? '' : String(v).normalize('NFC').trim());

/** Bỏ nhãn ở đầu ô kiểu "Người dự giờ: Mr. Cường" → "Mr. Cường". */
const boNhan = (v: unknown): string => chuoi(v).replace(/^[^:]{0,40}:\s*/, '');

/**
 * Đọc file Excel người dùng tải lên, lấy ra phần điền được.
 * Chấp nhận cả file theo mẫu trường lẫn file lệch dòng — dò theo mã cấu phần
 * ở cột B thay vì tin tuyệt đối vào số dòng.
 */
export function docFileExcel(data: ArrayBuffer, userId: string): BienBanDuGio {
  const wb = XLSX.read(data, { type: 'array' });
  const bb = bienBanRong(userId);

  const sBienBan = wb.Sheets[wb.SheetNames[0]];
  if (sBienBan) {
    const o = (ref: string) => sBienBan[ref]?.v;
    bb.gvHoTen = chuoi(wb.SheetNames[0]);
    bb.lop = chuoi(o('B2'));
    bb.tuan = chuoi(o('B3'));
    bb.bai = chuoi(o('B4'));
    bb.ngay = boNhan(o('C2')) || bb.ngay;
    bb.nguoiDu = boNhan(o('C3'));
    bb.namHocKy = boNhan(o('C4'));

    const dong: DongQuanSat[] = [];
    for (let r = HANG_QUAN_SAT_DAU; r <= HANG_QUAN_SAT_CUOI; r++) {
      const d: DongQuanSat = {
        thoiGian: chuoi(o('A' + r)),
        hoatDong: chuoi(o('B' + r)),
        cuaGiaoVien: chuoi(o('C' + r)),
        cuaHocSinh: chuoi(o('D' + r)),
        ghiChu: chuoi(o('E' + r)),
      };
      if (d.thoiGian || d.hoatDong || d.cuaGiaoVien || d.cuaHocSinh || d.ghiChu) dong.push(d);
    }
    bb.dongQuanSat = dong;
  }

  const sCham = wb.Sheets[wb.SheetNames[1]];
  if (sCham) {
    const range = XLSX.utils.decode_range(sCham['!ref'] || 'A1:H30');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const nhan = chuoi(sCham['B' + (r + 1)]?.v);
      const m = nhan.match(/^([1-4][a-f])\b/);
      if (!m) continue;
      const ma = m[1] as MaThanhTo;
      const diem = sCham['G' + (r + 1)]?.v;
      const bc = chuoi(sCham['H' + (r + 1)]?.v);
      if (typeof diem === 'number' && diem >= 1 && diem <= 4) {
        bb.diemChot[ma] = Math.round(diem * 2) / 2;
      }
      if (bc) {
        bb.ketQua[ma] = {
          diem: typeof diem === 'number' ? diem : null,
          tinCay: 'thap',
          bangChung: [bc],
          lyDo: '',
          cauHoi: [],
        };
      }
    }
  }

  return bb;
}

/* ─────────────────────────── GHI RA FILE ─────────────────────────── */

const thoatXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const cotSo = (ref: string): number => {
  const chu = ref.replace(/[0-9]/g, '');
  let n = 0;
  for (const c of chu) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
};

export type GiaTriO = string | number | null;

/**
 * Thay giá trị các ô trong XML của một sheet, giữ nguyên thuộc tính style `s`.
 * Chuỗi ghi dạng inlineStr để khỏi phải đụng vào sharedStrings.xml.
 */
export function datOTrongXml(xml: string, o: Record<string, GiaTriO>): string {
  const theoHang = new Map<number, string[]>();
  Object.keys(o).forEach(ref => {
    const h = Number(ref.replace(/[A-Z]/g, ''));
    if (!theoHang.has(h)) theoHang.set(h, []);
    theoHang.get(h)!.push(ref);
  });

  let ra = xml;

  for (const [hang, refs] of [...theoHang.entries()].sort((a, b) => a[0] - b[0])) {
    refs.sort((a, b) => cotSo(a) - cotSo(b));

    const reHang = new RegExp(`<row[^>]*\\br="${hang}"[^>]*(?:/>|>[\\s\\S]*?</row>)`, '');
    let khoiHang = ra.match(reHang)?.[0];

    if (!khoiHang) {
      // Hàng chưa tồn tại: chèn hàng rỗng vào đúng thứ tự trước </sheetData>.
      const moi = `<row r="${hang}"></row>`;
      const sau = ra.match(new RegExp(`<row[^>]*\\br="(\\d+)"`, 'g')) || [];
      const lonHon = sau
        .map(t => Number(t.match(/r="(\d+)"/)![1]))
        .find(n => n > hang);
      if (lonHon !== undefined) {
        ra = ra.replace(new RegExp(`(<row[^>]*\\br="${lonHon}")`), `${moi}$1`);
      } else {
        ra = ra.replace('</sheetData>', `${moi}</sheetData>`);
      }
      khoiHang = moi;
    }

    let moiHang = khoiHang.replace(/<row([^>]*)\/>/, '<row$1></row>');

    for (const ref of refs) {
      const gt = o[ref];
      const reO = new RegExp(`<c[^>]*\\br="${ref}"[^>]*(?:/>|>[\\s\\S]*?</c>)`, '');
      const cu = moiHang.match(reO)?.[0];
      const style = cu?.match(/\bs="(\d+)"/)?.[1];
      const sAttr = style ? ` s="${style}"` : '';

      let oMoi: string;
      if (gt === null || gt === '') {
        oMoi = `<c r="${ref}"${sAttr}/>`;
      } else if (typeof gt === 'number') {
        oMoi = `<c r="${ref}"${sAttr}><v>${gt}</v></c>`;
      } else {
        oMoi = `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${thoatXml(gt)}</t></is></c>`;
      }

      if (cu) {
        moiHang = moiHang.replace(cu, oMoi);
      } else {
        // Chèn vào đúng vị trí cột để Excel không kêu file hỏng.
        const cacO = [...moiHang.matchAll(/<c[^>]*\br="([A-Z]+\d+)"[^>]*(?:\/>|>[\s\S]*?<\/c>)/g)];
        const sauNo = cacO.find(m => cotSo(m[1]) > cotSo(ref));
        if (sauNo) moiHang = moiHang.replace(sauNo[0], oMoi + sauNo[0]);
        else moiHang = moiHang.replace('</row>', `${oMoi}</row>`);
      }
    }

    ra = ra.replace(khoiHang, moiHang);
  }

  return ra;
}

/** Các ô cần điền cho sheet biên bản. */
export function oSheetBienBan(bb: BienBanDuGio): Record<string, GiaTriO> {
  const o: Record<string, GiaTriO> = {
    B2: bb.lop,
    B3: bb.tuan,
    B4: bb.bai,
    C2: `Ngày và thời gian dự giờ: ${bb.ngay}`,
    C3: `Người dự giờ: ${bb.nguoiDu}`,
    C4: `Năm học & Kỳ học: ${bb.namHocKy}`,
  };
  for (let i = 0; i < HANG_QUAN_SAT_CUOI - HANG_QUAN_SAT_DAU + 1; i++) {
    const r = HANG_QUAN_SAT_DAU + i;
    const d = bb.dongQuanSat[i];
    o['A' + r] = d?.thoiGian ?? '';
    o['B' + r] = d?.hoatDong ?? '';
    o['C' + r] = d?.cuaGiaoVien ?? '';
    o['D' + r] = d?.cuaHocSinh ?? '';
    o['E' + r] = d?.ghiChu ?? '';
  }
  return o;
}

/** Các ô cần điền cho sheet chấm điểm. Không đánh giá thì để TRỐNG, không ghi 0. */
export function oSheetChamDiem(bb: BienBanDuGio): Record<string, GiaTriO> {
  const o: Record<string, GiaTriO> = {};
  (Object.keys(HANG_CHAM_DIEM) as MaThanhTo[]).forEach(ma => {
    const r = HANG_CHAM_DIEM[ma]!;
    const d = bb.diemChot[ma];
    o['G' + r] = typeof d === 'number' ? d : '';

    const kq = bb.ketQua[ma];
    const cn = (bb.chamNguong[ma] || '').trim();
    const phan = [
      kq?.bangChung.length ? kq.bangChung.map(b => '• ' + b).join('\n') : '',
      kq?.lyDo ? `Lí do: ${kq.lyDo}` : '',
      cn ? `Chạm ngưỡng: ${cn}` : '',
    ].filter(Boolean);
    o['H' + r] = phan.join('\n');
  });
  return o;
}

/** Dòng đầu của khối trao đổi, đặt dưới bảng rubric (bảng kết thúc ở dòng 20). */
const HANG_TRAO_DOI_DAU = 23;

/**
 * Khối "nội dung buổi trao đổi" viết xuống dưới bảng chấm điểm.
 *
 * Mẫu Excel của trường không có chỗ cho nhận xét, góp ý hay kịch bản trò chuyện
 * — nên trước đây xuất ra là mất trắng phần này. Viết xuống vùng trống bên dưới
 * thay vì thêm sheet mới: thêm sheet phải sửa workbook.xml, rels và
 * [Content_Types].xml, rủi ro hỏng file cao hơn nhiều so với giá trị thu được.
 */
export function oKhoiTraoDoi(bb: BienBanDuGio): Record<string, GiaTriO> {
  const dong: [string, string][] = [];
  const them = (nhan: string, noiDung: string) => {
    if (noiDung.trim()) dong.push([nhan, noiDung.trim()]);
  };

  const nx = bb.nhanXet;
  if (nx) {
    nx.diemManh.forEach((d, i) =>
      them(`Điểm mạnh ${i + 1}`, [d.tieuDe, d.bangChung && `“${d.bangChung}”`, d.yNghia].filter(Boolean).join(' — ')),
    );
    if (nx.trongTam) {
      them(
        'Trọng tâm cải thiện',
        [
          nx.trongTam.tieuDe,
          nx.trongTam.bangChung && `“${nx.trongTam.bangChung}”`,
          nx.trongTam.hanhDong.length && `Việc cần làm: ${nx.trongTam.hanhDong.join('; ')}`,
          nx.trongTam.doThanhCong && `Dấu hiệu thành công: ${nx.trongTam.doThanhCong}`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
    if (nx.kichBan) {
      them(
        'Kịch bản trao đổi',
        [
          `1. Tập trung: ${nx.kichBan.tapTrung}`,
          `2. Khám phá: ${nx.kichBan.khamPha}`,
          `3. Phản tư: ${nx.kichBan.phanTu}`,
          `4. Lập kế hoạch: ${nx.kichBan.lapKeHoach}`,
          `5. Theo dõi: ${nx.kichBan.theoDoi}`,
        ].join('\n'),
      );
    }
    (nx.luotHuanLuyen || []).forEach(l =>
      them(
        `Lượt huấn luyện ${l.ma}`,
        [
          l.tranhNoi && `ĐỪNG nói: “${l.tranhNoi}”`,
          l.quanSat && `1. Nêu quan sát: “${l.quanSat}”`,
          l.cauHoiNhanThuc && `2. Hỏi để tự nhận ra: “${l.cauHoiNhanThuc}”`,
          l.cauHoiTacDong && `3. Hỏi về tác động: “${l.cauHoiTacDong}”`,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    );
    if (nx.cauHoiHuanLuyen.length) them('Câu hỏi huấn luyện', nx.cauHoiHuanLuyen.map(q => '• ' + q).join('\n'));
    if (nx.canLamRo.length) them('Cần làm rõ với giáo viên', nx.canLamRo.map(q => '• ' + q).join('\n'));
  }

  (Object.keys(bb.gopY) as MaThanhTo[]).forEach(ma => {
    const g = bb.gopY[ma];
    if (!g) return;
    const trongTam = bb.trongTam[ma] ? ' [TRỌNG TÂM]' : '';
    them(
      `Góp ý ${ma}${trongTam}`,
      [
        g.hanChe,
        g.cauHoiPhanTu && `Câu hỏi phản tư: “${g.cauHoiPhanTu}”`,
        g.coTheLam.length && `Có thể làm ngay: ${g.coTheLam.join('; ')}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  });

  const o: Record<string, GiaTriO> = {};
  if (!dong.length) return o;

  o['A' + HANG_TRAO_DOI_DAU] = 'NỘI DUNG BUỔI TRAO ĐỔI SAU TIẾT DẠY';
  dong.forEach(([nhan, noiDung], i) => {
    const r = HANG_TRAO_DOI_DAU + 1 + i;
    o['A' + r] = nhan;
    o['B' + r] = noiDung;
  });
  return o;
}

/**
 * Điền biên bản vào file mẫu và trả về Blob tải xuống.
 * `layMau` cho phép test bơm file mẫu vào thay vì gọi fetch.
 */
export async function xuatTheoMau(
  bb: BienBanDuGio,
  layMau: () => Promise<ArrayBuffer> = async () => {
    const res = await fetch(DUONG_DAN_MAU);
    if (!res.ok) throw new Error(`Không tải được file mẫu (${res.status})`);
    return res.arrayBuffer();
  },
): Promise<Blob> {
  const zip = await JSZip.loadAsync(await layMau());

  const sua = async (ten: string, o: Record<string, GiaTriO>) => {
    const f = zip.file(ten);
    if (!f) return;
    zip.file(ten, datOTrongXml(await f.async('string'), o));
  };

  await sua('xl/worksheets/sheet1.xml', oSheetBienBan(bb));
  await sua('xl/worksheets/sheet2.xml', { ...oSheetChamDiem(bb), ...oKhoiTraoDoi(bb) });

  // Tên sheet đầu trong mẫu là tên giáo viên — giữ đúng thói quen đó.
  const wbFile = zip.file('xl/workbook.xml');
  if (wbFile && bb.gvHoTen.trim()) {
    const xml = await wbFile.async('string');
    zip.file(
      'xl/workbook.xml',
      xml.replace(/(<sheet[^>]*\bname=")[^"]*(")/, `$1${thoatXml(bb.gvHoTen.trim().slice(0, 31))}$2`),
    );
  }

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Mặc định của JSZip là STORE (không nén) → file phình gấp 4 lần bản mẫu.
    // .xlsx vốn là zip có nén; giữ DEFLATE cho file gửi qua email nhẹ như bản gốc.
    compression: 'DEFLATE',
  });
}

export function tenFileXuat(bb: BienBanDuGio): string {
  const sach = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim();
  return `Bien ban du gio - ${sach(bb.gvHoTen) || 'chua ro'} - ${sach(bb.ngay)}.xlsx`;
}
