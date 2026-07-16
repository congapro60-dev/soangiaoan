// Cổng chất lượng SLIDE (deterministic) — chấm JSON slide TRƯỚC khi render/xuất PPTX.
// Nguồn tiêu chí: skill `ultimate-slides` + `academic-os/.../typography.md` (đọc từ
// ~/.gemini/config/skills). Bắt các lỗi content-level quan sát được trong dữ liệu slide:
// tiêu đề quá dài (dễ wrap/widow), quá nhiều bullet, bullet quá dài, mật độ chữ cao,
// thiếu gợi ý hình ảnh. Không cần render PNG / vision model — hợp kiến trúc "JSON → template
// cố định" của app. Cùng pattern với `mathStandards`/`toanLessonQuality`: audit → repair brief.

export interface SlideDraft {
  type?: string;
  title?: string;
  points?: string[];
  visualSuggestion?: string;
  speakerNotes?: string;
}

export type SlideFindingSeverity = 'high' | 'medium';

export interface SlideFinding {
  /** Vị trí slide (0-based) trong mảng. */
  slideIndex: number;
  slideTitle: string;
  /** id ổn định, kebab-case — dùng cho UI/kiểm thử. */
  id: string;
  message: string;
  severity: SlideFindingSeverity;
}

// Ngưỡng (hiệu chỉnh theo output thực tế của app: tiêu đề VIẾT HOA, tối đa 4-5 points/slide).
export const SLIDE_LIMITS = {
  maxTitleChars: 64,
  maxBullets: 6,
  maxBulletChars: 160,
  maxTotalPointChars: 480,
} as const;

/** Độ dài "chữ" của một point, KHÔNG tính vùng công thức LaTeX ($...$, $$...$$). */
const textLength = (s: string): number => s.replace(/\${1,2}[^$]*\${1,2}/g, '').trim().length;

const isContentSlide = (type?: string): boolean => {
  const t = (type || '').toLowerCase();
  return t !== 'walt' && t !== 'wrapup';
};

/** Chấm 1 slide → danh sách finding (rỗng nếu đạt). */
export const auditSlide = (slide: SlideDraft, index: number): SlideFinding[] => {
  const findings: SlideFinding[] = [];
  const title = (slide.title || '').trim();
  const points = Array.isArray(slide.points) ? slide.points.filter((p) => typeof p === 'string') : [];
  const push = (id: string, message: string, severity: SlideFindingSeverity) =>
    findings.push({ slideIndex: index, slideTitle: title || `Slide ${index + 1}`, id, message, severity });

  if (title.length > SLIDE_LIMITS.maxTitleChars) {
    push('title-too-long', `Tiêu đề dài ${title.length} ký tự (>${SLIDE_LIMITS.maxTitleChars}) — dễ wrap/widow.`, 'high');
  }

  if (points.length > SLIDE_LIMITS.maxBullets) {
    push('too-many-bullets', `Có ${points.length} bullet (>${SLIDE_LIMITS.maxBullets}) — slide quá tải, nên tách slide.`, 'high');
  }

  const longBullets = points.filter((p) => textLength(p) > SLIDE_LIMITS.maxBulletChars).length;
  if (longBullets > 0) {
    push('bullet-too-long', `${longBullets} bullet dài >${SLIDE_LIMITS.maxBulletChars} ký tự — cần rút gọn/tách ý.`, 'high');
  }

  const totalChars = points.reduce((sum, p) => sum + textLength(p), 0);
  if (totalChars > SLIDE_LIMITS.maxTotalPointChars) {
    push('text-density', `Tổng ${totalChars} ký tự nội dung (>${SLIDE_LIMITS.maxTotalPointChars}) — mật độ chữ quá cao.`, 'high');
  }

  if (isContentSlide(slide.type) && points.length > 0 && !(slide.visualSuggestion || '').trim()) {
    push('missing-visual', 'Thiếu "visualSuggestion" (gợi ý hình ảnh minh họa).', 'medium');
  }

  return findings;
};

export interface SlideAuditResult {
  findings: SlideFinding[];
  /** Các finding severity 'high' — cần sửa trước khi giao. */
  blocking: SlideFinding[];
}

/** Chấm cả mảng slide. `blocking` là các lỗi high cần đưa vào repair loop. */
export const auditSlides = (slides: SlideDraft[]): SlideAuditResult => {
  const findings = (Array.isArray(slides) ? slides : []).flatMap((s, i) => auditSlide(s || {}, i));
  const blocking = findings.filter((f) => f.severity === 'high');
  return { findings, blocking };
};

/**
 * Brief sửa tập trung: liệt kê ĐÚNG các slide có lỗi + hướng sửa, yêu cầu AI trả lại TOÀN BỘ
 * mảng slide đã sửa (giữ nguyên số lượng/thứ tự/schema). Trả về '' nếu không có lỗi blocking.
 */
export const buildSlideRepairBrief = (slides: SlideDraft[], blocking: SlideFinding[]): string => {
  if (blocking.length === 0) return '';
  const bySlide = new Map<number, SlideFinding[]>();
  for (const f of blocking) {
    const arr = bySlide.get(f.slideIndex) || [];
    arr.push(f);
    bySlide.set(f.slideIndex, arr);
  }
  const issues = [...bySlide.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, fs]) => {
      const title = fs[0].slideTitle;
      const lines = fs.map((f) => `   - ${f.message}`).join('\n');
      return `Slide ${idx + 1} ("${title}"):\n${lines}`;
    })
    .join('\n');

  return `BẠN LÀ GIÁM ĐỐC NGHỆ THUẬT TRÌNH CHIẾU. Bản thảo slide dưới đây có một số slide vi phạm quy tắc thiết kế.
Hãy SỬA đúng các slide được nêu, GIỮ NGUYÊN số lượng slide, thứ tự và schema JSON. KHÔNG đổi chủ đề, KHÔNG bịa nội dung mới.

QUY TẮC SỬA:
- Tiêu đề: ngắn gọn (≤ ${SLIDE_LIMITS.maxTitleChars} ký tự), không để một từ rơi lẻ xuống dòng (widow).
- Mỗi slide tối đa ${SLIDE_LIMITS.maxBullets} bullet; nếu quá tải, gộp/rút gọn ý (KHÔNG tự thêm slide mới).
- Mỗi bullet ngắn gọn (≤ ${SLIDE_LIMITS.maxBulletChars} ký tự chữ); tách ý dài thành nhiều bullet ngắn.
- Giảm mật độ chữ để slide "thở"; ưu tiên cụm từ khóa thay vì câu dài.
- Bổ sung "visualSuggestion" (tiếng Việt) nếu còn trống.
- GIỮ NGUYÊN công thức LaTeX ($...$, $$...$$) — không viết lại thành chữ thường.

CÁC SLIDE CẦN SỬA:
${issues}

BẢN THẢO SLIDE HIỆN TẠI (JSON):
${JSON.stringify(slides)}

CHỈ TRẢ VỀ JSON MẢNG slide đã sửa (đúng ${slides.length} phần tử, đúng schema), KHÔNG bọc \`\`\`json, KHÔNG kèm lời giải thích.`;
};
