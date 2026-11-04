/**
 * Đọc phần ĐÁNH DẤU của học sinh nằm trong file PDF bài làm.
 *
 * Vì sao cần: lớp dùng đề in sẵn, học sinh trả lời bằng cách BÔI MÀU / KHOANH / GẠCH CHÂN lên
 * phương án, hoặc gõ thêm chữ lên tờ đề rồi nộp lại đúng file PDF đó. Ảnh render trang (xem
 * `utils/pdfToImages`) thường vẫn thấy màu bôi, nhưng:
 *  - chú thích do một số ứng dụng (iPad, Preview, Edge) tạo ra KHÔNG kèm "appearance stream", nên
 *    khi vẽ lại trang ra canvas sẽ mất sạch dấu — máy chấm thấy tờ đề trắng;
 *  - vùng bôi màu nhạt, ảnh JPEG lại nén, dễ nhoè tới mức máy không chắc em chọn phương án nào.
 * Đọc thẳng toạ độ chú thích rồi lấy đúng lớp chữ nằm dưới vùng đó thì biết chắc em bôi chữ gì.
 *
 * Kết quả là CHUỖI VĂN BẢN ngắn, ghép vào "bài làm dạng chữ" của lượt nộp — không phải một kênh
 * chấm riêng, để máy chấm vẫn chỉ có một nguồn sự thật.
 */

export const NHAN_BAI_LAM_CHU_THICH = 'BÀI LÀM ĐÁNH DẤU TRÊN FILE ĐỀ (máy đọc từ chú thích PDF)';

/** Chú thích chỉ có nghĩa khi nó là dấu của người làm bài, không phải khung/ô của đề in sẵn. */
const LOAI_CO_CHU: Record<string, string> = {
  Highlight: 'bôi màu',
  Underline: 'gạch chân',
  Squiggly: 'gạch lượn',
  StrikeOut: 'gạch ngang',
};

const LOAI_CHI_GHI_CHU: Record<string, string> = {
  FreeText: 'chữ gõ thêm',
  Ink: 'nét vẽ tay',
  Text: 'ghi chú',
};

const SO_CHU_THICH_TOI_DA = 60;
const DAI_MOI_CHU_THICH = 180;

/** Chỉ cần đúng phần API pdf.js mà module này dùng — cho phép test tiêm bản giả. */
export interface PdfjsModule {
  getDocument: (source: { data: ArrayBuffer | Uint8Array }) => { promise: Promise<PdfDocument> };
  Util: { transform: (m1: number[], m2: number[]) => number[] };
}
interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
}
interface PdfPage {
  getViewport: (options: { scale: number }) => {
    transform: number[];
    convertToViewportRectangle: (rect: [number, number, number, number]) => number[];
  };
  getAnnotations: () => Promise<Array<Record<string, unknown>>>;
  getTextContent: () => Promise<{ items: unknown[] }>;
}

export interface HopChu {
  str: string;
  /** Toạ độ đỉnh-trái và đáy-phải trong hệ của viewport (đơn vị CSS px). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Vung {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const giao = (a1: number, a2: number, b1: number, b2: number): number => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

/**
 * Ghép các mẩu chữ nằm dưới một vùng đánh dấu, theo đúng thứ tự đọc (trên xuống, trái sang phải).
 *
 * Chỉ nhận mẩu chữ có phần lớn chiều cao nằm trong vùng (≥ 40%) và có phần giao theo chiều ngang
 * (≥ 20%): vùng bôi thường cao hơn dòng chữ một chút, còn chữ ở dòng trên/dưới thì phải loại.
 */
export const ghepChuTrongVung = (items: readonly HopChu[], vung: Vung): string => {
  const chon = items
    .filter(item => {
      if (!item.str.trim()) return false;
      const caoChu = Math.max(1, item.y2 - item.y1);
      const rongChu = Math.max(1, item.x2 - item.x1);
      const dung = giao(item.y1, item.y2, vung.y1, vung.y2) / caoChu;
      const ngang = giao(item.x1, item.x2, vung.x1, vung.x2) / rongChu;
      return dung >= 0.4 && ngang >= 0.2;
    })
    .sort((a, b) => (Math.abs(a.y1 - b.y1) > 2 ? a.y1 - b.y1 : a.x1 - b.x1));
  return chon.map(item => item.str.trim()).join(' ').replace(/\s+/gu, ' ').trim();
};

const chuanHoaVung = (rect: readonly number[]): Vung | null => {
  if (rect.length < 4) return null;
  const [ax, ay, bx, by] = rect;
  if (![ax, ay, bx, by].every(Number.isFinite)) return null;
  return { x1: Math.min(ax, bx), y1: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) };
};

const catNgan = (value: string): string => value.replace(/\s+/gu, ' ').trim().slice(0, DAI_MOI_CHU_THICH);

export interface ChuThichDaDoc {
  page: number;
  nhan: string;
  text: string;
}

/** Dựng danh sách dòng mô tả; tách riêng để test được mà không cần pdf.js. */
export const moTaChuThich = (danhSach: readonly ChuThichDaDoc[]): string => {
  const daCo = new Set<string>();
  const dong: string[] = [];
  for (const item of danhSach.slice(0, SO_CHU_THICH_TOI_DA)) {
    const text = catNgan(item.text);
    if (!text) continue;
    const khoa = `${item.page}|${item.nhan}|${text}`;
    if (daCo.has(khoa)) continue;
    daCo.add(khoa);
    dong.push(`- Trang ${item.page} · ${item.nhan}: "${text}"`);
  }
  return dong.join('\n');
};

/** Đọc chú thích của file PDF bài làm, trả về khối chữ đã ghép sẵn (rỗng nếu không có dấu nào). */
export const docChuThichPdf = async (
  file: File,
  // `pdfjs` chỉ để test tiêm bản legacy build của pdf.js; production luôn dùng bản mặc định.
  options: { maxPages?: number; pdfjs?: PdfjsModule } = {},
): Promise<string> => {
  const pdfjsLib = options.pdfjs ?? await import('pdfjs-dist');
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const soTrang = Math.min(pdf.numPages, options.maxPages ?? 12);
    const ketQua: ChuThichDaDoc[] = [];
    for (let so = 1; so <= soTrang; so += 1) {
      const page = await pdf.getPage(so);
      const annotations = await page.getAnnotations();
      if (!annotations.length) continue;
      const viewport = page.getViewport({ scale: 1 });
      const noiDung = await page.getTextContent();
      const items: HopChu[] = [];
      for (const raw of noiDung.items) {
        const item = raw as { str?: string; transform?: number[]; width?: number; height?: number };
        if (typeof item.str !== 'string' || !Array.isArray(item.transform)) continue;
        const tr = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const cao = Math.max(Math.abs(tr[3]), Math.abs(tr[2]), Number(item.height) || 0);
        const rong = Number(item.width) || 0;
        // Gốc chữ là đường baseline; đỉnh hộp chữ nằm phía trên baseline.
        items.push({ str: item.str, x1: tr[4], y1: tr[5] - cao, x2: tr[4] + rong, y2: tr[5] });
      }
      for (const annot of annotations) {
        const loai = String((annot as { subtype?: string }).subtype || '');
        const hop = (annot as { rect?: number[] }).rect;
        if (!hop || hop.length < 4) continue;
        const vung = chuanHoaVung(viewport.convertToViewportRectangle(hop as [number, number, number, number]));
        if (!vung) continue;
        // pdf.js để chữ của chú thích trong `contentsObj`, KHÔNG phải `contents` (field này thường
        // undefined với highlight do Word/Acrobat/iPad tạo).
        const contents = catNgan(String((annot as { contentsObj?: { str?: string } }).contentsObj?.str || ''));
        const nhanBoSung = LOAI_CO_CHU[loai];
        if (nhanBoSung) {
          // pdf.js đã tự tính chữ nằm dưới vùng bôi (`overlaidText`); chỉ khi thiếu mới tự ghép.
          const coSan = catNgan(String((annot as { overlaidText?: string }).overlaidText || ''));
          const chu = coSan || ghepChuTrongVung(items, vung);
          if (chu) ketQua.push({ page: so, nhan: nhanBoSung, text: chu });
          if (contents) ketQua.push({ page: so, nhan: `${nhanBoSung} · ghi chú`, text: contents });
          continue;
        }
        const nhanGhiChu = LOAI_CHI_GHI_CHU[loai];
        if (!nhanGhiChu) continue;
        const goTay = Array.isArray((annot as { textContent?: unknown }).textContent)
          ? (annot as { textContent: unknown[] }).textContent.map(value => String(value)).join(' ')
          : '';
        const chu = catNgan(goTay || contents);
        if (chu) ketQua.push({ page: so, nhan: nhanGhiChu, text: chu });
      }
    }
    return moTaChuThich(ketQua);
  } finally {
    await pdf.destroy();
  }
};
