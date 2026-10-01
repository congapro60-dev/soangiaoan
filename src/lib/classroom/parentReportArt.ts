/**
 * Hình minh họa vector cho báo cáo phụ huynh — nhúng thẳng vào HTML (không ảnh ngoài, không phụ thuộc mạng),
 * nên hiện đúng cả trong PDF lẫn trang xem của phụ huynh.
 *
 * - `heroSvg`: dải minh họa đầu báo cáo (parabol, biểu đồ Ven, tam giác vuông, cột tăng dần, kí hiệu Toán).
 * - `sectionIcon` / `strandIcon`: biểu tượng nét 24×24 đặt trong ô vuông ở đầu mục và đầu mảng kiến thức.
 */

export type SectionIconName =
  | 'comment' | 'chart' | 'trend' | 'exam' | 'target' | 'medal' | 'list' | 'heart' | 'star' | 'flag' | 'home' | 'school';

const ICON_PATHS: Record<SectionIconName, string> = {
  comment: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
  chart: '<path d="M5 20v-8M12 20V5M19 20v-6M3 20h18"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  exam: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 14l2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  medal: '<circle cx="12" cy="9" r="5"/><path d="M8.6 13.4L7 21l5-3 5 3-1.6-7.6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.1"/><circle cx="4.5" cy="12" r="1.1"/><circle cx="4.5" cy="18" r="1.1"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  flag: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  school: '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5"/>',
};

const svgWrap = (inner: string, size: number): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const sectionIcon = (name: SectionIconName, size = 18): string => svgWrap(ICON_PATHS[name], size);

const STRAND_GLYPHS: Array<{ match: string; inner: string }> = [
  { match: 'Đại số', inner: '<text x="12" y="17.5" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor" stroke="none" font-family="Georgia,serif">x²</text>' },
  { match: 'Hình học', inner: '<path d="M12 4l9 16H3z"/><path d="M12 4v16"/>' },
  { match: 'Thống kê', inner: '<path d="M5 20v-7M10 20V6M15 20v-9M20 20V9M3 20h18"/>' },
];

/** Biểu tượng của một mảng kiến thức (Đại số / Hình học và Đo lường / Thống kê và Xác suất); mảng lạ dùng kí hiệu Σ. */
export const strandIcon = (strand: string, size = 16): string => {
  const glyph = STRAND_GLYPHS.find(item => strand.startsWith(item.match))?.inner
    ?? '<text x="12" y="18" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor" stroke="none" font-family="Georgia,serif">Σ</text>';
  return svgWrap(glyph, size);
};

/**
 * Dải minh họa đầu báo cáo. Nền chuyển màu từ xanh navy sang xanh ngọc; hình Toán vẽ nét trắng mờ.
 * `slice` để dải phủ kín bề ngang mà không méo trên điện thoại.
 */
export const heroSvg = (): string => `<svg class="hero" viewBox="0 0 720 124" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Hình minh họa môn Toán" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="pr-hero-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17375e"/><stop offset=".55" stop-color="#1d6fa5"/><stop offset="1" stop-color="#14a3a3"/></linearGradient></defs>
<rect width="720" height="124" rx="14" fill="url(#pr-hero-bg)"/>
<circle cx="640" cy="18" r="70" fill="#ffffff" fill-opacity=".07"/><circle cx="60" cy="130" r="64" fill="#ffffff" fill-opacity=".07"/>
<g fill="none" stroke="#ffffff" stroke-opacity=".85" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
<path d="M34 104h118M93 16v96" stroke-opacity=".5" stroke-width="1.6"/><path d="M52 26Q93 150 134 26"/>
<circle cx="236" cy="62" r="34" stroke-opacity=".8"/><circle cx="274" cy="62" r="34" stroke-opacity=".8"/>
<path d="M356 100V40l74 60z"/><path d="M356 88h12v12" stroke-width="1.6"/>
<path d="M486 104V74M520 104V54M554 104V38M588 104V22" stroke-width="9" stroke-opacity=".55"/><path d="M474 80l34-26 34-8 34-24" stroke-width="2.4"/>
</g>
<g fill="#ffffff" fill-opacity=".8" font-family="Georgia,'Times New Roman',serif" font-weight="700">
<text x="224" y="66" font-size="15" text-anchor="middle">A</text><text x="286" y="66" font-size="15" text-anchor="middle">B</text>
<text x="368" y="36" font-size="15">a² + b² = c²</text>
<text x="630" y="70" font-size="40" fill-opacity=".55">π</text><text x="668" y="108" font-size="30" fill-opacity=".45">∑</text>
</g>
</svg>`;

/** Chỉ nhận ảnh dạng data URL (png/jpeg/webp, base64) — logo do giáo viên tải lên; chuỗi lạ bị bỏ để không chèn được mã. */
export const safeLogoDataUrl = (value: unknown): string | null =>
  typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 150_000
    ? value
    : null;
