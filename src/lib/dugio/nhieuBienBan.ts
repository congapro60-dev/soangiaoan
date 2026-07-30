/**
 * Đọc nhiều biên bản dự giờ trong CÙNG một sheet, và ghép với nhiều giáo án.
 *
 * Vì sao không đọc theo số dòng cố định như docFileExcel: khi nhiều buổi dự nằm
 * chung một sheet thì vị trí mỗi khối phụ thuộc số dòng ghi chép của buổi trước.
 * Dò theo HÀNG TIÊU ĐỀ lặp lại ("Thời gian | Hoạt động | …") thì đúng bất kể
 * khối dài ngắn thế nào.
 *
 * Ghép giáo án dùng ba tín hiệu người dùng đã nêu: ngày, tên bài, và thứ tự xuất
 * hiện. Ghép sai thì chấm Phần I sai toàn bộ mà file vẫn trông hợp lệ, nên hàm
 * này KHÔNG tự quyết — nó trả về độ tin cậy để giao diện bắt người xác nhận.
 */
import * as XLSX from 'xlsx';
import type { BienBanDuGio, DongQuanSat } from './types';
import { bienBanRong } from './types';

const chuoi = (v: unknown): string =>
  v == null ? '' : String(v).normalize('NFC').replace(/\s+/g, ' ').trim();

/** Bỏ dấu và hạ chữ thường để so khớp tên bài chịu được sai khác nhỏ. */
export function khongDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Hàng tiêu đề bảng quan sát — mốc để cắt khối. */
function laHangTieuDe(o: string[]): boolean {
  const t = o.map(khongDau);
  return t.some(x => x === 'thoi gian') && t.some(x => x === 'hoat dong');
}

/** Nhãn hành chính nằm phía trên mỗi hàng tiêu đề. */
const NHAN = [
  { khoa: 'lop', nhan: 'lop' },
  { khoa: 'tuan', nhan: 'tuan' },
  { khoa: 'bai', nhan: 'ten bai day' },
] as const;

/** Bỏ nhãn ở đầu ô kiểu "Người dự giờ: Mr. Cường" → "Mr. Cường". */
const boNhan = (v: string): string => v.replace(/^[^:]{0,40}:\s*/, '').trim();

export interface KetQuaDocNhieu {
  bienBan: BienBanDuGio[];
  /** Cảnh báo để hiện cho người dùng, không phải lỗi chặn. */
  canhBao: string[];
}

/**
 * Tách mọi biên bản trong sheet đầu tiên của file.
 *
 * Trả về mảng rỗng kèm cảnh báo khi không tìm thấy hàng tiêu đề nào — tốt hơn là
 * đoán bừa rồi nạp ra biên bản rỗng mà người dùng không biết vì sao.
 */
export function docNhieuBienBan(
  data: ArrayBuffer,
  userId: string,
  tenFile = '',
): KetQuaDocNhieu {
  const wb = XLSX.read(data, { type: 'array' });
  const canhBao: string[] = [];

  // HỢP ĐỒNG với trường: tên sheet biên bản LUÔN chứa "Biên bản …", ví dụ
  // "Biên bản GĐCT 24-25". Nhờ đó lọc được sheet biên bản khỏi sheet chấm điểm,
  // và đọc HẾT các sheet — bản đầu chỉ đọc sheet thứ nhất nên bỏ sót cả một năm.
  const sheetBienBan = wb.SheetNames.filter(n => /bien ban/.test(khongDau(n)));
  const dsSheet = sheetBienBan.length ? sheetBienBan : [wb.SheetNames[0]];
  if (!dsSheet[0]) return { bienBan: [], canhBao: ['File không có sheet nào đọc được.'] };
  if (!sheetBienBan.length) {
    canhBao.push(
      'Không có sheet nào tên chứa "Biên bản" — đang đọc tạm sheet đầu tiên. Kiểm tra lại tên sheet.',
    );
  }

  const gvHoTen = tenGiaoVienTuTenFile(tenFile);
  const ra: BienBanDuGio[] = [];
  dsSheet.forEach(ten => {
    const kq = docMotSheet(wb.Sheets[ten], ten, userId);
    kq.bienBan.forEach(b => {
      if (gvHoTen) b.gvHoTen = gvHoTen;
    });
    ra.push(...kq.bienBan);
    canhBao.push(...kq.canhBao);
  });

  // Báo cả hai chuyện khi cả hai cùng sai: tên sheet lệch hợp đồng VÀ không tìm
  // thấy biên bản nào. Chỉ báo một cái thì người dùng sửa tên sheet rồi vẫn tắc.
  if (!ra.length) {
    canhBao.push(
      'Không tìm thấy hàng tiêu đề nào có "Thời gian" và "Hoạt động". Kiểm tra lại xem đúng file biên bản dự giờ chưa.',
    );
  }
  return { bienBan: ra, canhBao };
}

/**
 * Tên giáo viên nằm trong TÊN FILE, không nằm trong sheet — vì tên sheet theo
 * hợp đồng luôn là "Biên bản …". Quy ước: "Vũ Việt Cường - BIÊN BẢN DỰ GIỜ.xlsx".
 */
export function tenGiaoVienTuTenFile(tenFile: string): string {
  const khongDuoi = tenFile.replace(/\.(xlsx|xls)$/i, '').normalize('NFC');
  const truocGach = khongDuoi.split(/\s+[-–]\s+/)[0];
  const sach = truocGach.replace(/bi[eê]n b[aả]n.*$/i, '').replace(/\s+/g, ' ').trim();
  // Chuỗi quá ngắn hoặc chính là chữ "biên bản" thì coi như không xác định được.
  return sach.length >= 3 && !/^bi[eê]n b[aả]n/i.test(sach) ? sach : '';
}

/** Nhãn kết thúc phần ghi chép của một khối. */
const KET_KHOI = /^nhan xet chung/;

/** "LẦN 1", "Lần 2" — nhãn buổi dự của trường, đặt ở cột A phía trên khối. */
const LA_NHAN_LAN = /^L[ẦA]N\s*\d+/i;

function docMotSheet(
  ws: XLSX.WorkSheet | undefined,
  tenSheet: string,
  userId: string,
): KetQuaDocNhieu {
  const canhBao: string[] = [];
  if (!ws) return { bienBan: [], canhBao };

  const rows: string[][] = XLSX.utils
    .sheet_to_json(ws, { header: 1, defval: '', raw: false })
    .map(r => (r as unknown[]).map(chuoi));

  const mocTieuDe = rows.map((r, i) => (laHangTieuDe(r) ? i : -1)).filter(i => i >= 0);
  if (!mocTieuDe.length) return { bienBan: [], canhBao };

  const ra: BienBanDuGio[] = [];

  mocTieuDe.forEach((moc, k) => {
    const bb = bienBanRong(userId);
    bb.namHocKy = tenSheet;
    // Mẫu của trường đặt TÊN GIÁO VIÊN làm tên sheet ("Vũ"), nhưng file nhiều
    // biên bản lại đặt theo năm học ("Biên bản GĐCT 24-25") — lấy bừa thì ra rác.
    // Tên giáo viên ở file đó nằm trong TÊN FILE, người dùng tự điền.
    if (!/bien ban|cham diem/.test(khongDau(tenSheet))) bb.gvHoTen = tenSheet;
    let coNgay = false;

    // Phần hành chính nằm ngay phía trên hàng tiêu đề. Quét ngược tới hàng tiêu
    // đề của khối trước — không lùi một số dòng cố định, vì số dòng trống giữa
    // các khối không cố định.
    const dauQuet = k === 0 ? 0 : mocTieuDe[k - 1] + 1;
    for (let r = moc - 1; r >= dauQuet; r--) {
      const o = rows[r] || [];
      o.forEach((giaTri, c) => {
        const nhan = khongDau(giaTri).replace(/:$/, '');
        // Nhãn ở một ô, giá trị ở ô kế bên.
        const m = NHAN.find(x => nhan === x.nhan);
        if (m && !bb[m.khoa]) bb[m.khoa] = chuoi(o[c + 1]);
        // Dạng gộp "Người dự giờ: Mr. Cường" trong cùng một ô.
        if (/^ngay va thoi gian du gio/.test(nhan)) {
          const v = boNhan(giaTri);
          if (v) {
            bb.ngay = v;
            coNgay = true;
          }
        }
        if (/^nguoi du gio/.test(nhan)) bb.nguoiDu = boNhan(giaTri) || bb.nguoiDu;
        if (/^nam hoc/.test(nhan)) bb.namHocKy = boNhan(giaTri) || bb.namHocKy;
      });
    }

    // Dòng dữ liệu: từ ngay dưới hàng tiêu đề cho tới khi gặp ĐẦU KHỐI SAU.
    // Dấu hiệu đầu khối sau: hàng tiêu đề mới, hàng có nhãn hành chính, hoặc
    // hàng tiêu đề văn bản "BIÊN BẢN DỰ GIỜ…".
    const hetKhoi = k + 1 < mocTieuDe.length ? mocTieuDe[k + 1] : rows.length;
    const dong: DongQuanSat[] = [];
    for (let r = moc + 1; r < hetKhoi; r++) {
      const o = rows[r] || [];
      if (laHangTieuDe(o)) break;
      const nhanDau = khongDau(chuoi(o[0])).replace(/:$/, '');
      if (NHAN.some(x => nhanDau === x.nhan)) break;
      if (o.some(x => /bien ban du gio/.test(khongDau(x)))) break;
      // "Nhận xét chung:" đóng phần ghi chép; phần sau đó là nhận xét tự do.
      if (KET_KHOI.test(nhanDau)) break;
      // "LẦN 1" là nhãn buổi dự, không phải mốc thời gian trong tiết.
      if (LA_NHAN_LAN.test(chuoi(o[0]))) continue;

      const d: DongQuanSat = {
        thoiGian: chuoi(o[0]),
        hoatDong: chuoi(o[1]),
        cuaGiaoVien: chuoi(o[2]),
        cuaHocSinh: chuoi(o[3]),
        ghiChu: chuoi(o[4]),
      };
      if (d.thoiGian || d.hoatDong || d.cuaGiaoVien || d.cuaHocSinh || d.ghiChu) dong.push(d);
    }

    // Hàng tiêu đề mồ côi: mẫu để sẵn ở đầu sheet, không có phần hành chính nào
    // và gần như không có ghi chép. Bỏ hẳn thay vì sinh ra một biên bản rỗng mà
    // người dùng phải tự đoán là rác.
    if (!bb.lop && !bb.bai && !bb.nguoiDu && dong.length <= 1) return;

    // Ngày rỗng thì để rỗng. bienBanRong() mặc định là hôm nay — giữ nguyên sẽ
    // thành một ngày trông rất thật mà hoàn toàn bịa.
    if (!coNgay) bb.ngay = '';

    // "LẦN 1" / "LẦN 2" nằm ở cột A phía trên khối — nhãn buổi dự của trường.
    for (let r = moc - 1; r >= dauQuet; r--) {
      const lan = chuoi((rows[r] || [])[0]).match(/^L[ẦA]N\s*(\d+)/i);
      if (lan) {
        bb.tuan = bb.tuan || `Lần ${lan[1]}`;
        break;
      }
    }

    bb.dongQuanSat = dong;
    const nhan = bb.bai || bb.lop || `khối ${k + 1}`;
    if (!dong.length) canhBao.push(`Biên bản "${nhan}" (${tenSheet}) không có dòng ghi chép nào.`);
    if (!bb.bai) canhBao.push(`Biên bản "${nhan}" (${tenSheet}) thiếu tên bài dạy — sẽ khó ghép với giáo án.`);
    ra.push(bb);
  });

  return { bienBan: ra, canhBao };
}

/* ──────────────── đọc bảng điểm nhiều lần dự ──────────────── */

export interface LanChamDiem {
  /** Người chấm, ví dụ "GĐCT" hoặc "TTCM". */
  nguoiCham: string;
  /** Nhãn buổi, ví dụ "Lần 1". */
  lan: string;
  /** Điểm theo mã thành tố, chỉ chứa mục đã chấm. */
  diem: Record<string, number>;
  bangChung: Record<string, string>;
}

/**
 * Đọc sheet chấm điểm dạng RỘNG: mỗi buổi dự là một cặp cột (Điểm, Bằng chứng),
 * nhiều người chấm xếp cạnh nhau.
 *
 * Đây là nguồn ĐIỂM NGƯỜI CHẤM để đối chiếu với điểm AI. Không có nó thì không
 * đo được chất lượng AI, chỉ đoán.
 */
export function docBangChamDiem(data: ArrayBuffer): { lan: LanChamDiem[]; canhBao: string[] } {
  const wb = XLSX.read(data, { type: 'array' });
  const ten = wb.SheetNames.find(n => /cham diem/.test(khongDau(n)));
  if (!ten) return { lan: [], canhBao: ['File không có sheet chấm điểm nào.'] };

  const rows: string[][] = XLSX.utils
    .sheet_to_json(wb.Sheets[ten], { header: 1, defval: '', raw: false })
    .map(r => (r as unknown[]).map(chuoi));

  // Hàng tiêu đề là hàng có ô "Điểm"; phía trên nó là hàng nhãn buổi và hàng
  // nhãn người chấm.
  const hangTieuDe = rows.findIndex(r => r.some(x => khongDau(x) === 'diem'));
  if (hangTieuDe < 1) return { lan: [], canhBao: ['Không tìm thấy hàng tiêu đề có ô "Điểm".'] };

  const hNhomLan = rows[hangTieuDe - 1] || [];
  const hNguoiCham = rows[hangTieuDe - 2] || [];

  // Người chấm ghi một lần rồi để trống các cột sau — lấy nhãn gần nhất bên trái.
  const nguoiChamTai = (c: number): string => {
    for (let i = c; i >= 0; i--) if (hNguoiCham[i]) return hNguoiCham[i];
    return 'không rõ';
  };

  const cotDiem = rows[hangTieuDe]
    .map((x, c) => (khongDau(x) === 'diem' ? c : -1))
    .filter(c => c >= 0);

  const lan: LanChamDiem[] = cotDiem.map(c => ({
    nguoiCham: nguoiChamTai(c),
    lan: hNhomLan[c] || `cột ${c + 1}`,
    diem: {},
    bangChung: {},
  }));

  for (let r = hangTieuDe + 1; r < rows.length; r++) {
    const o = rows[r] || [];
    // Mã thành tố nằm ở cột "Cấu phần", dạng "1a Applying Knowledge…".
    const ma = (o[1] || '').match(/^([1-4][a-f])\b/)?.[1];
    if (!ma) continue;
    cotDiem.forEach((c, i) => {
      const d = Number(String(o[c]).replace(',', '.'));
      if (Number.isFinite(d) && d >= 1 && d <= 4) lan[i].diem[ma] = Math.round(d * 2) / 2;
      const bc = chuoi(o[c + 1]);
      if (bc) lan[i].bangChung[ma] = bc;
    });
  }

  const coDiem = lan.filter(l => Object.keys(l.diem).length > 0);
  const canhBao =
    coDiem.length === 0 ? ['Sheet chấm điểm chưa có buổi nào được điền điểm.'] : [];
  return { lan: coDiem, canhBao };
}

/* ─────────────────────── ghép giáo án ─────────────────────── */

/**
 * Tách một tài liệu chứa nhiều giáo án thành từng bản.
 * Cắt tại các mốc tiêu đề thường gặp; không thấy mốc nào thì trả về một bản.
 */
export function tachGiaoAn(vanBan: string): string[] {
  const chu = vanBan.normalize('NFC');
  const moc: number[] = [];
  const re =
    /^[^\S\n]*(?:k[eế]\s*ho[aạ]ch\s*b[aà]i\s*d[aạ]y|gi[aá]o\s*[aá]n|ti[eế]t\s*\d+|b[aà]i\s*\d+)\b/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chu))) moc.push(m.index);

  if (moc.length < 2) return chu.trim() ? [chu.trim()] : [];
  return moc
    .map((v, i) => chu.slice(v, moc[i + 1] ?? chu.length).trim())
    .filter(x => x.length > 80);
}

export interface CapGhep {
  chiSoBienBan: number;
  /** null = không ghép được với giáo án nào. */
  chiSoGiaoAn: number | null;
  /** Tín hiệu đã khớp, để người dùng tự thấy vì sao ghép như vậy. */
  tinHieu: string[];
  /** 'cao' khi khớp ngày hoặc tên bài; 'thap' khi chỉ dựa vào thứ tự. */
  tinCay: 'cao' | 'vua' | 'thap';
}

/** Ngày ở nhiều dạng — lấy về chuỗi số để so khớp thô. */
function chuoiNgay(s: string): string[] {
  const ra: string[] = [];
  const re = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})|(\d{4})-(\d{1,2})-(\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[1]) ra.push(`${+m[1]}-${+m[2]}-${m[3].slice(-2)}`);
    else ra.push(`${+m[6]}-${+m[5]}-${m[4].slice(-2)}`);
  }
  return ra;
}

/**
 * Ghép từng biên bản với một giáo án theo ba tín hiệu: ngày, tên bài, thứ tự.
 *
 * KHÔNG tự động chấp nhận kết quả — trả kèm `tinCay` để giao diện buộc người
 * dùng xác nhận. Ghép sai làm điểm Phần I sai toàn bộ mà không có dấu hiệu nào.
 */
export function ghepGiaoAn(bienBan: BienBanDuGio[], giaoAn: string[]): CapGhep[] {
  const conTrong = new Set(giaoAn.map((_, i) => i));
  const ra: CapGhep[] = [];

  // Vòng 1: khớp bằng tên bài hoặc ngày (tín hiệu mạnh).
  bienBan.forEach((bb, i) => {
    const tenBai = khongDau(bb.bai);
    const ngayBB = chuoiNgay(bb.ngay);
    let tot: { j: number; diem: number; tinHieu: string[] } | null = null;

    conTrong.forEach(j => {
      const ga = giaoAn[j];
      const gaKhongDau = khongDau(ga);
      const tinHieu: string[] = [];
      let diem = 0;
      if (tenBai.length >= 6 && gaKhongDau.includes(tenBai)) {
        diem += 3;
        tinHieu.push('trùng tên bài');
      }
      if (ngayBB.some(n => chuoiNgay(ga).includes(n))) {
        diem += 3;
        tinHieu.push('trùng ngày');
      }
      if (i === j) {
        diem += 1;
        tinHieu.push('cùng thứ tự');
      }
      if (diem > (tot?.diem ?? 0)) tot = { j, diem, tinHieu };
    });

    const t = tot as { j: number; diem: number; tinHieu: string[] } | null;
    if (t && t.diem >= 3) {
      conTrong.delete(t.j);
      ra.push({
        chiSoBienBan: i,
        chiSoGiaoAn: t.j,
        tinHieu: t.tinHieu,
        tinCay: t.diem >= 6 ? 'cao' : 'vua',
      });
    } else {
      ra.push({ chiSoBienBan: i, chiSoGiaoAn: null, tinHieu: [], tinCay: 'thap' });
    }
  });

  // Vòng 2: những biên bản chưa ghép thì gán theo thứ tự còn lại, tin cậy thấp.
  ra.forEach(cap => {
    if (cap.chiSoGiaoAn !== null) return;
    const j = [...conTrong].sort((a, b) => a - b)[0];
    if (j === undefined) return;
    conTrong.delete(j);
    cap.chiSoGiaoAn = j;
    cap.tinHieu = ['chỉ theo thứ tự còn lại'];
    cap.tinCay = 'thap';
  });

  return ra;
}
