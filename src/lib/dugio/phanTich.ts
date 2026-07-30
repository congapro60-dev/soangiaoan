/**
 * Gọi AI phân tích biên bản dự giờ.
 *
 * Theo mô hình BYOK của repo: gọi thẳng aiProviders từ trình duyệt bằng khóa
 * của chính người dùng, KHÔNG thêm serverless function.
 *
 * Chia nhỏ theo lô 2 thành tố mỗi lượt vì callAI() không nhận maxTokens —
 * lô to thì phản hồi dễ bị cắt giữa chừng.
 */
import { callAI } from '../aiProviders';
import type { AppData } from '../../types';

// Repo không xuất riêng type Settings; các file khác cũng lấy theo lối này.
type Settings = AppData['settings'];
import {
  COMPONENTS,
  COT_LOI,
  RUBRIC,
  SUY_NGAM,
  TEN_MUC,
  TEN_PHAN,
  type MaThanhTo,
  type SoPhan,
} from '../../data/khungDanielson';
import {
  CANH_BAO_DIEM_LE,
  CHAM_NGUONG,
  LUONG_HOA_PHAN_III,
  QUY_TAC_PHAN_I,
  Y_NGHIA_MUC,
} from '../../data/nguyenTacChamDiem';
import {
  CAU_TRUC_TRO_CHUYEN,
  KHUON_DUA_TREN_MINH_CHUNG,
  MEO_TRO_CHUYEN_KHO,
  TU_DUY_HUAN_LUYEN,
} from '../../data/huanLuyen';
import { tieuChiConCua } from '../../data/tieuChiCon';
import { docJSON, docJSONdon } from './docJson';
import { thanhToTheoBo } from './tinhDiem';
import { LOAI_PHAN_TICH } from './types';
import type { BienBanDuGio, GopYThanhTo, KetQuaThanhTo, NhanXetTraoDoi } from './types';

/**
 * Một thành tố mỗi lượt gọi. Bản đầu gộp 2 để tiết kiệm lượt, nhưng khi phải
 * chấm từng tiêu chí con kèm bằng chứng riêng thì phản hồi dài gấp mấy lần và
 * bị cắt giữa chừng. Đổi thời gian lấy độ đầy đủ.
 */
const LO = 1;

const mucDo = Object.entries(Y_NGHIA_MUC)
  .map(([n, v]) => `Mức ${n} — ${v.ten}: ${v.dauHieu}${v.trietLy ? ` Triết lí: "${v.trietLy}"` : ''}`)
  .join('\n');

const chamNguong = Object.entries(CHAM_NGUONG)
  .map(([d, v]) => `${d.replace('.', ',')} điểm = ${v.dieuKien} CỘNG THÊM ${v.congThem} Ví dụ: ${v.viDu}`)
  .join('\n');

const LUAT_CHUNG = `Bạn là chuyên gia đánh giá giờ dạy theo Khung giảng dạy Danielson, làm việc với Tổ Toán một trường phổ thông Việt Nam. Nhiệm vụ: đọc BIÊN BẢN DỰ GIỜ, gán bằng chứng vào từng thành tố và đề xuất mức điểm.

Ý NGHĨA BỐN MỨC (cốt lõi: AI LÀ NGƯỜI ĐANG LÀM VIỆC trong tiết học):
${mucDo}

QUY TẮC ĐIỂM LẺ 0,5 — "CHẠM NGƯỠNG":
${chamNguong}
${CANH_BAO_DIEM_LE}
Khi và chỉ khi đề xuất điểm lẻ, PHẢI điền "cham_nguong" bằng hành động cụ thể của mức trên đã quan sát được, trích từ biên bản. Không nêu được thì cho điểm nguyên.

LUẬT BẮT BUỘC:
1. Mọi bằng chứng phải TRÍCH NGUYÊN VĂN từ biên bản. Không viết lại, không thêm chi tiết không có trong biên bản.
2. Biên bản không đủ căn cứ cho một thành tố: đặt "diem": null, "tin_cay": "thap", đưa 1-2 câu hỏi làm rõ. KHÔNG đoán điểm.
3. "Không ghi nhận được" KHÔNG đồng nghĩa với "không có". Không suy diễn ngoài dữ liệu.
4. Mức 3 là chuẩn mực bình thường của tổ, không phải thành tích. Mức 4 đòi hỏi HỌC SINH là chủ thể của hành vi được mô tả.
5. "ly_do" viết 1 câu, nêu rõ vì sao dừng ở mức đó chứ không phải mức liền kề.

CHẤM TỚI TỪNG TIÊU CHÍ CON, không chỉ chấm thành tố. Mỗi tiêu chí con là một mục riêng có điểm riêng, bằng chứng riêng, lí do riêng.

CHỈ trả về JSON hợp lệ, không có văn bản nào khác, không bọc trong khối mã:
{"ket_qua":[{
  "ma":"2a",
  "tin_cay":"cao",
  "cau_hoi":["câu hỏi làm rõ nếu thiếu căn cứ"],
  "tieu_chi_con":[
    {"ma":"2a.1","diem":3,"cham_nguong":"","bang_chung":["trích nguyên văn 1","trích nguyên văn 2"],"ly_do":"vì sao dừng ở mức này chứ không phải mức liền kề"},
    {"ma":"2a.2","diem":null,"cham_nguong":"","bang_chung":[],"ly_do":"biên bản không đủ căn cứ"}
  ]
}]}

YÊU CẦU VỀ ĐỘ ĐẦY ĐỦ — đây là chỗ quan trọng nhất:
- PHẢI trả về ĐỦ mọi tiêu chí con của thành tố, không bỏ mục nào. Mục không đủ căn cứ thì "diem": null kèm "ly_do" nói rõ thiếu gì.
- Mỗi tiêu chí con lấy 1-3 trích dẫn. TRÍCH ĐỦ CÂU, không cắt ngắn cho gọn. Có bao nhiêu bằng chứng thật thì trích bấy nhiêu.
- Cùng một câu trong biên bản được phép làm bằng chứng cho nhiều tiêu chí con khác nhau nếu thật sự liên quan.
- "ly_do" viết 1-2 câu, nêu rõ vì sao mức này chứ không phải mức liền kề.
tin_cay nhận một trong: "cao", "vua", "thap".`;

/** Mô tả một thành tố kèm rubric, thành tố cốt lõi và quy tắc lượng hóa nếu có. */
function moTaThanhTo(ma: MaThanhTo): string {
  const c = COMPONENTS.find(x => x.ma === ma)!;
  const thang = RUBRIC[ma].map((t, i) => `      ${i + 1} ${TEN_MUC[i]}: ${t}`).join('\n');
  const cot = COT_LOI[ma].length ? `\n   Thành tố cốt lõi: ${COT_LOI[ma].join(' | ')}` : '';
  // Danh sách tiêu chí con để AI gán nhãn bằng chứng xuống đúng tầng mà kế
  // hoạch tự thúc đẩy chuyên môn của trường đang dùng.
  const con = tieuChiConCua(ma);
  const dsCon = con.length
    ? `\n   TIÊU CHÍ CON — phải chấm điểm cho TỪNG mục dưới đây:\n${con
        .map(
          t =>
            `      ${t.ma} — ${t.ten}\n         Định nghĩa: ${t.dinhNghia}\n${t.muc
              .map((x, i) => `         Mức ${i + 1} (${TEN_MUC[i]}): ${x}`)
              .join('\n')}`,
        )
        .join('\n')}`
    : '';
  const lh = LUONG_HOA_PHAN_III[ma];
  const dem = lh
    ? `\n   LƯỢNG HÓA BẮT BUỘC (${lh.doLuong}):\n      Mức 2 nếu: ${lh.muc2}\n      Mức 3 nếu: ${lh.muc3}\n      Mức 4 nếu: ${lh.muc4}`
    : '';
  return `${ma} — ${c.ten}${cot}${dsCon}\n   Thang điểm:\n${thang}${dem}`;
}

function nguonTheoPhan(phan: SoPhan, bb: BienBanDuGio, vanBan: string): string {
  if (phan === 1) {
    return `GIÁO ÁN / KẾ HOẠCH BÀI DẠY:\n"""\n${bb.giaoAn}\n"""\n\nBIÊN BẢN DỰ GIỜ (đối chiếu):\n"""\n${vanBan}\n"""\n\nQUY TẮC RIÊNG PHẦN I:\n${QUY_TAC_PHAN_I.map(q => `- ${q}`).join('\n')}`;
  }
  if (phan === 4) {
    return `TỰ PHẢN TƯ CỦA GIÁO VIÊN VÀ HỒ SƠ KÈM THEO:\n"""\n${bb.hoSo}\n"""\n\nBIÊN BẢN DỰ GIỜ (đối chiếu):\n"""\n${vanBan}\n"""\n\nLƯU Ý RIÊNG PHẦN IV: tuyệt đối KHÔNG suy ra 4c, 4d, 4e, 4f từ biên bản dự giờ. Chỉ chấm thành tố có minh chứng hồ sơ nêu ở trên; còn lại đặt diem null và nêu rõ cần loại minh chứng gì.`;
  }
  return `BIÊN BẢN DỰ GIỜ:\n"""\n${vanBan}\n"""`;
}

/** Gộp bảng quan sát + ghi chép tự do thành văn bản nguồn cho AI. */
export function vanBanQuanSat(bb: BienBanDuGio): string {
  const bang = bb.dongQuanSat
    .filter(d => d.hoatDong || d.cuaGiaoVien || d.cuaHocSinh || d.ghiChu)
    .map(d =>
      [
        d.thoiGian && `[${d.thoiGian}]`,
        d.hoatDong && `(${d.hoatDong})`,
        d.cuaGiaoVien && `GV: ${d.cuaGiaoVien}`,
        d.cuaHocSinh && `HS: ${d.cuaHocSinh}`,
        d.ghiChu && `Ghi chú: ${d.ghiChu}`,
      ]
        .filter(Boolean)
        .join(' '),
    )
    .join('\n');
  return [bang, bb.bienBan.trim()].filter(Boolean).join('\n\n');
}

interface DongBangChung {
  trich?: unknown;
  tieu_chi_con?: unknown;
}

interface DongTieuChiCon {
  ma?: unknown;
  diem?: unknown;
  cham_nguong?: unknown;
  bang_chung?: unknown;
  ly_do?: unknown;
}

interface DongKetQua {
  ma?: string;
  diem?: unknown;
  cham_nguong?: unknown;
  tin_cay?: unknown;
  bang_chung?: unknown;
  ly_do?: unknown;
  cau_hoi?: unknown;
  tieu_chi_con?: unknown;
}

/** Kết quả chấm ở tầng tiêu chí con của một thành tố. */
export interface KetQuaTieuChiCon {
  ma: string;
  diem: number | null;
  chamNguong: string;
  bangChung: string[];
  lyDo: string;
}

const chuanDiem = (v: unknown): number | null => {
  const d = typeof v === 'number' ? Math.round(v * 2) / 2 : null;
  return d !== null && d >= 1 && d <= 4 ? d : null;
};

/**
 * Đọc mảng tiêu chí con. Mã lạ thì BỎ — mã sai không làm vỡ gì ngay nhưng phá
 * thống kê cộng dồn về sau, lúc không ai truy được nữa.
 */
export function docTieuChiCon(v: unknown, thanhTo: MaThanhTo): KetQuaTieuChiCon[] {
  const hopLe = new Set(tieuChiConCua(thanhTo).map(t => t.ma));
  return (Array.isArray(v) ? v : [])
    .map((x): KetQuaTieuChiCon | null => {
      const o = x as DongTieuChiCon;
      const ma = typeof o?.ma === 'string' ? o.ma.trim() : '';
      if (!hopLe.has(ma)) return null;
      const diem = chuanDiem(o.diem);
      const cn = typeof o.cham_nguong === 'string' ? o.cham_nguong.trim() : '';
      return {
        ma,
        // Điểm lẻ mà không nêu được hành động chạm ngưỡng thì hạ về mức nguyên
        // dưới — đúng nguyên tắc "không chấm lẻ theo cảm giác" của tổ Toán.
        diem: diem !== null && Math.abs(diem % 1) === 0.5 && !cn ? Math.floor(diem) : diem,
        chamNguong: cn,
        bangChung: chuoiMang(o.bang_chung),
        lyDo: typeof o.ly_do === 'string' ? o.ly_do.trim() : '',
      };
    })
    .filter((x): x is KetQuaTieuChiCon => x !== null);
}

/**
 * Nhận cả hai dạng: mảng chuỗi (hợp đồng cũ) và mảng object có nhãn (mới).
 * Nhãn không thuộc đúng thành tố đang chấm thì BỎ — thà thiếu nhãn còn hơn nhãn
 * sai, vì nhãn sai sẽ làm hỏng thống kê cộng dồn nhiều lần dự giờ về sau.
 */
export function docBangChung(v: unknown, thanhTo: MaThanhTo) {
  const hopLe = new Set(tieuChiConCua(thanhTo).map(t => t.ma));
  const items = Array.isArray(v) ? v.slice(0, 2) : [];
  const coNhan = items
    .map((x): { trich: string; tieuChiCon: string } | null => {
      if (typeof x === 'string') return x.trim() ? { trich: x.trim(), tieuChiCon: '' } : null;
      const o = x as DongBangChung;
      const trich = typeof o?.trich === 'string' ? o.trich.trim() : '';
      if (!trich) return null;
      const nhan = typeof o?.tieu_chi_con === 'string' ? o.tieu_chi_con.trim() : '';
      return { trich, tieuChiCon: hopLe.has(nhan) ? nhan : '' };
    })
    .filter((x): x is { trich: string; tieuChiCon: string } => x !== null);
  return { bangChung: coNhan.map(x => x.trich), bangChungCoNhan: coNhan };
}

const chuoiMang = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];

/**
 * Chấm các thành tố theo lô. `chiCac` để chạy lại riêng vài thành tố hỏng.
 * `onTienDo` báo tiến độ cho giao diện; `onLo` trả kết quả từng lô để hiện dần.
 */
export async function phanTichBienBan(
  bb: BienBanDuGio,
  settings: Settings,
  opts: {
    chiCac?: MaThanhTo[];
    onTienDo?: (moTa: string) => void;
    onLo?: (
      phan: Partial<Record<MaThanhTo, KetQuaThanhTo>>,
      con: Record<string, KetQuaTieuChiCon>,
    ) => void;
  } = {},
): Promise<{
  ketQua: Partial<Record<MaThanhTo, KetQuaThanhTo>>;
  tieuChiCon: Record<string, KetQuaTieuChiCon>;
  hong: MaThanhTo[];
  boQua: string[];
}> {
  const vanBan = vanBanQuanSat(bb);
  const trongBo = new Set(opts.chiCac?.length ? opts.chiCac : thanhToTheoBo(bb.boTieuChi));

  // Phần nào được chấm do LOẠI PHÂN TÍCH quyết định, nhưng vẫn phải có nguồn
  // minh chứng tương ứng — chọn "đầy đủ" mà không dán hồ sơ thì Phần IV bỏ qua,
  // và nói rõ vì sao bỏ chứ không im lặng.
  const loai = LOAI_PHAN_TICH.find(l => l.ma === bb.loaiPhanTich) ?? LOAI_PHAN_TICH[1];
  const boQua: string[] = [];
  const cacPhan: SoPhan[] = [];
  ([1, 2, 3, 4] as SoPhan[]).forEach(p => {
    if (!loai.phan.includes(p)) return;
    if (p === 1 && !bb.giaoAn.trim()) {
      boQua.push(`${TEN_PHAN[1]}: chưa có giáo án`);
      return;
    }
    if (p === 4 && !bb.hoSo.trim()) {
      boQua.push(`${TEN_PHAN[4]}: chưa có hồ sơ tự phản tư`);
      return;
    }
    if ((p === 2 || p === 3) && !vanBan.trim()) {
      boQua.push(`${TEN_PHAN[p]}: chưa có ghi chép quan sát`);
      return;
    }
    cacPhan.push(p);
  });

  const congViec: { phan: SoPhan; lo: MaThanhTo[] }[] = [];
  cacPhan.forEach(phan => {
    const ds = COMPONENTS.filter(c => c.phan === phan && trongBo.has(c.ma)).map(c => c.ma);
    for (let i = 0; i < ds.length; i += LO) congViec.push({ phan, lo: ds.slice(i, i + LO) });
  });

  const ketQua: Partial<Record<MaThanhTo, KetQuaThanhTo>> = {};
  const tieuChiCon: Record<string, KetQuaTieuChiCon> = {};
  const hong: MaThanhTo[] = [];

  for (let i = 0; i < congViec.length; i++) {
    const { phan, lo } = congViec[i];
    opts.onTienDo?.(`${TEN_PHAN[phan]} · ${lo.join(' + ')} — bước ${i + 1}/${congViec.length}`);

    const prompt = `${LUAT_CHUNG}

CÁC THÀNH TỐ CẦN XỬ LÍ (${TEN_PHAN[phan]}):
${lo.map(moTaThanhTo).join('\n\n')}

${nguonTheoPhan(phan, bb, vanBan)}

Trả JSON cho đúng ${lo.length} thành tố trên, kèm ĐẦY ĐỦ mọi tiêu chí con của nó. Không rút gọn để cho vừa — cần đủ và chi tiết.`;

    let items: DongKetQua[] | null = null;
    for (let lan = 0; lan < 2 && !items; lan++) {
      try {
        items = docJSON<DongKetQua>(await callAI(prompt, settings), 'ket_qua').items;
      } catch {
        items = null;
      }
    }

    if (!items) {
      hong.push(...lo);
      continue;
    }

    const cuaLo: Partial<Record<MaThanhTo, KetQuaThanhTo>> = {};
    const conCuaLo: Record<string, KetQuaTieuChiCon> = {};

    items.forEach(r => {
      const ma = r.ma as MaThanhTo;
      if (!COMPONENTS.some(c => c.ma === ma)) return;

      const dsCon = docTieuChiCon(r.tieu_chi_con, ma);
      dsCon.forEach(t => (conCuaLo[t.ma] = t));

      // Điểm thành tố: ưu tiên trung bình các tiêu chí con vì đó là chỗ AI vừa
      // xét chi tiết. Chỉ dùng "diem" cấp thành tố khi AI không trả tiêu chí con.
      const coDiem = dsCon.map(t => t.diem).filter((v): v is number => v !== null);
      const cn = typeof r.cham_nguong === 'string' ? r.cham_nguong.trim() : '';
      const diemThanhTo = coDiem.length
        ? Math.round((coDiem.reduce((a, b) => a + b, 0) / coDiem.length) * 2) / 2
        : (() => {
            const d = chuanDiem(r.diem);
            return d !== null && Math.abs(d % 1) === 0.5 && !cn ? Math.floor(d) : d;
          })();

      // Bằng chứng cấp thành tố gộp từ các tiêu chí con, giữ nhãn để cộng dồn.
      const goc = docBangChung(r.bang_chung, ma);
      const tuCon = dsCon.flatMap(t => t.bangChung.map(x => ({ trich: x, tieuChiCon: t.ma })));
      const coNhan = [...tuCon, ...goc.bangChungCoNhan];

      const tin = r.tin_cay;
      cuaLo[ma] = {
        diem: diemThanhTo,
        chamNguong: cn || dsCon.find(t => t.chamNguong)?.chamNguong || '',
        tinCay: tin === 'cao' || tin === 'vua' ? tin : 'thap',
        bangChung: coNhan.map(x => x.trich),
        bangChungCoNhan: coNhan,
        lyDo:
          (typeof r.ly_do === 'string' && r.ly_do.trim()) ||
          dsCon
            .filter(t => t.lyDo)
            .map(t => `${t.ma}: ${t.lyDo}`)
            .join(' · '),
        cauHoi: chuoiMang(r.cau_hoi),
      };
    });

    lo.forEach(ma => {
      if (!cuaLo[ma]) hong.push(ma);
    });
    Object.assign(ketQua, cuaLo);
    Object.assign(tieuChiCon, conCuaLo);
    opts.onLo?.(cuaLo, conCuaLo);
  }

  return { ketQua, tieuChiCon, hong, boQua };
}

interface DongGopY {
  ma?: string;
  han_che?: unknown;
  cau_hoi_phan_tu?: unknown;
  co_the_lam?: unknown;
}

/** Soạn góp ý cải thiện cho các thành tố người dự giờ đã chốt dưới 3 điểm. */
export async function soanGopY(
  bb: BienBanDuGio,
  can: MaThanhTo[],
  settings: Settings,
  onTienDo?: (moTa: string) => void,
): Promise<Partial<Record<MaThanhTo, GopYThanhTo>>> {
  const vanBan = vanBanQuanSat(bb);
  const ra: Partial<Record<MaThanhTo, GopYThanhTo>> = {};

  for (let i = 0; i < can.length; i += LO) {
    const lo = can.slice(i, i + LO);
    onTienDo?.(`Soạn góp ý · ${lo.join(' + ')} — ${Math.floor(i / LO) + 1}/${Math.ceil(can.length / LO)}`);

    const moTa = lo
      .map(ma => {
        const c = COMPONENTS.find(x => x.ma === ma)!;
        const r = bb.ketQua[ma];
        const hoi = SUY_NGAM[ma].length ? `\n   Câu hỏi suy ngẫm của khung: ${SUY_NGAM[ma].join(' | ')}` : '';
        return `${ma} — ${c.ten} — điểm chốt ${bb.diemChot[ma]}
   Bằng chứng đã ghi nhận: ${r?.bangChung.join(' / ') || 'không có'}
   Lí do chấm: ${r?.lyDo || 'không ghi'}${hoi}`;
      })
      .join('\n');

    const prompt = `Bạn là người dự giờ có kinh nghiệm, viết góp ý cải thiện cho giáo viên môn Toán theo tinh thần huấn luyện, không phán xét. Xưng "thầy/cô".

Với MỖI thành tố dưới đây, viết:
- "han_che": hạn chế cụ thể quan sát được, BẮT BUỘC neo vào bằng chứng đã trích. Tối đa 30 từ.
- "cau_hoi_phan_tu": một câu hỏi mở giúp giáo viên tự nhận ra vấn đề, KHÔNG phải câu hỏi có/không. Tối đa 20 từ. Có thể dựa trên câu hỏi suy ngẫm của khung nếu phù hợp.
- "co_the_lam": đúng 2 việc cụ thể làm được ngay ở tiết sau, gắn với đặc thù dạy Toán, nêu rõ làm gì và vào lúc nào trong tiết. Mỗi việc tối đa 22 từ.

CẤM góp ý chung chung kiểu "cần đa dạng hoá phương pháp", "nên quan tâm HS hơn". Nếu bằng chứng không đủ, đặt "han_che" là "Chưa đủ bằng chứng để góp ý" và để "co_the_lam" rỗng.

THÀNH TỐ CẦN GÓP Ý:
${moTa}

BIÊN BẢN GỐC:
"""
${vanBan}
"""

CHỈ trả JSON, không bọc trong khối mã:
{"gop_y":[{"ma":"3b","han_che":"...","cau_hoi_phan_tu":"...","co_the_lam":["...","..."]}]}`;

    let items: DongGopY[] | null = null;
    for (let lan = 0; lan < 2 && !items; lan++) {
      try {
        items = docJSON<DongGopY>(await callAI(prompt, settings), 'gop_y').items;
      } catch {
        items = null;
      }
    }

    (items || []).forEach(g => {
      const ma = g.ma as MaThanhTo;
      if (!COMPONENTS.some(c => c.ma === ma)) return;
      ra[ma] = {
        hanChe: typeof g.han_che === 'string' ? g.han_che : '',
        cauHoiPhanTu: typeof g.cau_hoi_phan_tu === 'string' ? g.cau_hoi_phan_tu : '',
        coTheLam: chuoiMang(g.co_the_lam),
      };
    });
  }

  return ra;
}

/** Soạn nội dung buổi trao đổi sau tiết dạy. Chia 2 lượt cho khỏi bị cắt. */
export async function soanNhanXet(
  bb: BienBanDuGio,
  settings: Settings,
  onTienDo?: (moTa: string) => void,
): Promise<NhanXetTraoDoi> {
  const vanBan = vanBanQuanSat(bb);
  const bang = COMPONENTS.filter(c => bb.ketQua[c.ma])
    .map(c => {
      const r = bb.ketQua[c.ma]!;
      const d = bb.diemChot[c.ma];
      return `${c.ma} (${c.ten}) — điểm chốt: ${d == null ? 'chưa chấm' : d}; bằng chứng: ${r.bangChung.join(' / ') || 'không có'}`;
    })
    .join('\n');

  const chon = COMPONENTS.filter(c => bb.trongTam[c.ma] && bb.gopY[c.ma]);
  const ghiChu = chon.length
    ? `\n\nNGƯỜI DỰ GIỜ ĐÃ CHỌN TRỌNG TÂM: ${chon
        .map(c => `${c.ma} (${c.ten}) — hạn chế: ${bb.gopY[c.ma]!.hanChe}`)
        .join('; ')}\nBẮT BUỘC lấy đúng trọng tâm này cho trường "trong_tam", không tự chọn thành tố khác.`
    : '';

  const nen = `Bạn là người dự giờ theo Khung Danielson, đang chuẩn bị buổi trao đổi sau tiết dạy với giáo viên môn Toán. Xưng "thầy/cô". Mỗi ý phải neo vào một chi tiết CÓ THẬT trong biên bản; không khen chung chung.

TƯ DUY HUẤN LUYỆN CỦA TRƯỜNG — bắt buộc tuân theo:
${TU_DUY_HUAN_LUYEN.map(t => `- ${t}`).join('\n')}
${MEO_TRO_CHUYEN_KHO.map(t => `- ${t}`).join('\n')}
Mục tiêu là ĐẶT CÂU HỎI để giáo viên tự nhận ra, KHÔNG đưa lời khuyên hay chỉ dẫn trực tiếp. Người dự giờ không cần có sẵn câu trả lời.

KẾT QUẢ CHẤM:
${bang}

BIÊN BẢN GỐC:
"""
${vanBan}
"""${ghiChu}`;

  onTienDo?.('Đang soạn phần điểm mạnh và trọng tâm cải thiện…');
  const p1 = docJSONdon<{ diem_manh?: unknown; trong_tam?: unknown }>(
    await callAI(
      `${nen}

CHỈ trả JSON, không bọc trong khối mã, viết gọn:
{"diem_manh":[{"tieu_de":"ngắn gọn","bang_chung":"trích nguyên văn từ biên bản, đủ câu","y_nghia":"1-2 câu nói rõ vì sao điều này quan trọng với học sinh"}],
"trong_tam":[{"tieu_de":"ngắn gọn","bang_chung":"trích nguyên văn","hanh_dong":["việc cụ thể làm được ngay","việc cụ thể thứ hai","việc thứ ba nếu có"],"do_thanh_cong":"dấu hiệu đếm được để biết đã cải thiện"}]}
diem_manh có 3 phần tử. trong_tam có 2 phần tử, mỗi cái khả thi trong 4 tuần. Viết đầy đủ, KHÔNG rút gọn.`,
      settings,
    ),
  );

  onTienDo?.('Đang soạn câu hỏi huấn luyện…');
  const p2 = docJSONdon<{ cau_hoi_huan_luyen?: unknown; can_lam_ro?: unknown }>(
    await callAI(
      `${nen}

CHỈ trả JSON, không bọc trong khối mã, viết gọn:
{"cau_hoi_huan_luyen":["câu hỏi mở","...","...","...","..."],
"can_lam_ro":["điều biên bản chưa đủ căn cứ, cần hỏi giáo viên","...","..."]}
cau_hoi_huan_luyen có 5 phần tử, can_lam_ro có 3 phần tử. Câu hỏi phải mở, không phải câu hỏi có/không.`,
      settings,
    ),
  );

  // Lượt huấn luyện theo khuôn 3 bước + kịch bản 5 bước. Đây là phần biến kết
  // quả chấm thành thứ NÓI ĐƯỢC trong phòng, thay vì một bản báo cáo.
  onTienDo?.('Đang soạn kịch bản trò chuyện…');
  const canHuanLuyen = chon.length ? chon : COMPONENTS.filter(c => bb.gopY[c.ma]).slice(0, 2);
  const p3 = docJSONdon<{ kich_ban?: Record<string, unknown>; luot?: unknown }>(
    await callAI(
      `${nen}

THÀNH TỐ CẦN ĐƯA VÀO BUỔI TRAO ĐỔI:
${canHuanLuyen.map(c => `${c.ma} — ${c.ten}; bằng chứng: ${bb.ketQua[c.ma]?.bangChung.join(' / ') || 'không có'}`).join('\n') || 'chưa chọn trọng tâm nào'}

KHUÔN MỘT LƯỢT HUẤN LUYỆN DỰA TRÊN MINH CHỨNG:
1. "quan_sat": ${KHUON_DUA_TREN_MINH_CHUNG.buoc1}
2. "cau_hoi_nhan_thuc": ${KHUON_DUA_TREN_MINH_CHUNG.buoc2}
3. "cau_hoi_tac_dong": ${KHUON_DUA_TREN_MINH_CHUNG.buoc3}
4. "tranh_noi": viết CHÍNH XÁC câu phán xét mà người dự giờ hay buột miệng nói ở tình huống này — để họ thấy mà tránh. Ví dụ "Kỹ năng đặt câu hỏi của bạn cần được cải thiện."

KỊCH BẢN 5 BƯỚC, mỗi bước MỘT câu người dự giờ nói ra miệng:
${CAU_TRUC_TRO_CHUYEN.map(b => `- "${b.ten.toLowerCase().replace(/\s/g, '_')}": ${b.mucDich} Mẫu: ${b.cauHoiMau[0]}`).join('\n')}

CHỈ trả JSON, không bọc trong khối mã:
{"kich_ban":{"tap_trung":"...","kham_pha":"...","phan_tu":"...","lap_ke_hoach":"...","theo_doi":"..."},
"luot":[{"ma":"3b","quan_sat":"Tôi nhận thấy…","cau_hoi_nhan_thuc":"Bạn nhận thấy điều gì về…?","cau_hoi_tac_dong":"Điều đó có thể tạo ra tác động nào tới…?","tranh_noi":"…"}]}
Mỗi câu tối đa 30 từ.`,
      settings,
    ),
  );

  const kb = p3.kich_ban;
  const tt = p1.trong_tam as Record<string, unknown> | undefined;
  return {
    kichBan: kb
      ? {
          tapTrung: String(kb.tap_trung ?? ''),
          khamPha: String(kb.kham_pha ?? ''),
          phanTu: String(kb.phan_tu ?? ''),
          lapKeHoach: String(kb.lap_ke_hoach ?? ''),
          theoDoi: String(kb.theo_doi ?? ''),
        }
      : null,
    luotHuanLuyen: (Array.isArray(p3.luot) ? p3.luot : []).map((l: Record<string, unknown>) => ({
      ma: String(l.ma ?? ''),
      quanSat: String(l.quan_sat ?? ''),
      cauHoiNhanThuc: String(l.cau_hoi_nhan_thuc ?? ''),
      cauHoiTacDong: String(l.cau_hoi_tac_dong ?? ''),
      tranhNoi: String(l.tranh_noi ?? ''),
    })),
    diemManh: (Array.isArray(p1.diem_manh) ? p1.diem_manh : []).map((d: Record<string, unknown>) => ({
      tieuDe: String(d.tieu_de ?? ''),
      bangChung: String(d.bang_chung ?? ''),
      yNghia: String(d.y_nghia ?? ''),
    })),
    trongTam: tt
      ? {
          tieuDe: String(tt.tieu_de ?? ''),
          bangChung: String(tt.bang_chung ?? ''),
          hanhDong: chuoiMang(tt.hanh_dong),
          doThanhCong: String(tt.do_thanh_cong ?? ''),
        }
      : null,
    cauHoiHuanLuyen: chuoiMang(p2.cau_hoi_huan_luyen),
    canLamRo: chuoiMang(p2.can_lam_ro),
  };
}
