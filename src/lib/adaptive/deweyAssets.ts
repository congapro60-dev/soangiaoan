import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { buildTikzKrokiUrl } from '../krokiRender';
import type { AdaptiveLesson } from './types';
import type { DeweyConversionAssets } from './adaptiveToDewey';

// buildTikzKrokiUrl đã chuyển sang ../krokiRender (module thuần — pipeline sinh bài dùng chung
// để validate/retry TikZ mà không kéo firebase). Re-export giữ tương thích import cũ.
export { buildTikzKrokiUrl } from '../krokiRender';

/**
 * Nạp trước (bất đồng bộ) HTML mô phỏng từ Firestore + URL ảnh TikZ cho từng mảnh,
 * để hàm convert đồng bộ `adaptiveLessonToDeweyContent` nhúng được hình vào bài Dewey.
 * Mọi lỗi đều nuốt im lặng — thiếu hình thì bài vẫn render đủ chữ.
 */
/** Render TikZ qua Kroki, fetch về và CHỈ trả SVG nếu hợp lệ (không phải ảnh lỗi). '' nếu lỗi. */
const fetchValidTikzSvg = async (tikzCode: string): Promise<string> => {
  const url = buildTikzKrokiUrl(tikzCode);
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return ''; // Kroki 400 = TikZ sai cú pháp → bỏ
    const svg = await res.text();
    if (!/<svg[\s>]/i.test(svg)) return '';
    // Kroki đôi khi trả 200 kèm SVG báo lỗi → loại bỏ
    if (/(tikz Error|Package\s+\w+\s+Error|Undefined control sequence|Emergency stop|! LaTeX Error|Error\s*\d{3})/i.test(svg)) return '';
    return svg;
  } catch {
    return ''; // CORS/timeout → bỏ ảnh, bài vẫn đủ chữ
  }
};

export const loadDeweyAssets = async (lesson: AdaptiveLesson): Promise<DeweyConversionAssets> => {
  const simulationHtmlByUnitId: Record<string, string> = {};
  const tikzSvgByUnitId: Record<string, string> = {};
  await Promise.all((lesson.knowledgeUnits || []).map(async unit => {
    if (unit.tikzCode?.trim()) {
      const svg = await fetchValidTikzSvg(unit.tikzCode.trim());
      if (svg) tikzSvgByUnitId[unit.id] = svg;
    }
    if (unit.simulationSpec?.html?.srcDoc?.trim()) return; // đã có inline, khỏi gọi Firestore
    const simId = unit.simulationId || `${lesson.id}_${unit.id}`;
    try {
      const snap = await getDoc(doc(db, 'lessonSimulations', simId));
      if (snap.exists()) {
        const data = snap.data() as { html?: unknown };
        if (typeof data.html === 'string' && data.html.trim()) simulationHtmlByUnitId[unit.id] = data.html;
      }
    } catch { /* bỏ qua */ }
  }));
  return { simulationHtmlByUnitId, tikzSvgByUnitId };
};
