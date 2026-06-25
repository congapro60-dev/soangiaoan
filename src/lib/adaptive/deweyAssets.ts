import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { encodeKroki } from '../krokiRender';
import type { AdaptiveLesson } from './types';
import type { DeweyConversionAssets } from './adaptiveToDewey';

/**
 * Bọc mã TikZ thành tài liệu LaTeX standalone rồi tạo URL Kroki trả SVG.
 * Trả '' nếu mã không hợp lệ (thiếu môi trường tikzpicture) để tránh ảnh vỡ (Kroki 400).
 */
export const buildTikzKrokiUrl = (tikzRaw: string): string => {
  let tikz = tikzRaw.trim();

  // Sửa ca double-escape: nếu có "\\begin{tikzpicture}" (hai gạch chéo) mà không có bản một gạch
  // → toàn bộ mã bị escape thừa một lớp (lỗi khi qua JSON) → gỡ một lớp.
  if (/\\\\begin\{tikzpicture\}/.test(tikz) && !/(^|[^\\])\\begin\{tikzpicture\}/.test(tikz)) {
    tikz = tikz.replace(/\\\\/g, '\\');
  }

  // Bắt buộc có môi trường tikzpicture đầy đủ; thiếu thì bỏ (vd AI chỉ trả vài lệnh \draw rời → 400).
  if (!/\\begin\{tikzpicture\}/.test(tikz) || !/\\end\{tikzpicture\}/.test(tikz)) return '';

  let payload = tikz.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  if (!payload.includes('\\documentclass')) {
    payload = `\\documentclass[tikz,border=2mm]{standalone}\n\\usepackage[dvipsnames]{xcolor}\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\begin{document}\n${payload}\n\\end{document}`;
  }
  return `https://kroki.io/tikz/svg/${encodeKroki(payload)}`;
};

/**
 * Nạp trước (bất đồng bộ) HTML mô phỏng từ Firestore + URL ảnh TikZ cho từng mảnh,
 * để hàm convert đồng bộ `adaptiveLessonToDeweyContent` nhúng được hình vào bài Dewey.
 * Mọi lỗi đều nuốt im lặng — thiếu hình thì bài vẫn render đủ chữ.
 */
export const loadDeweyAssets = async (lesson: AdaptiveLesson): Promise<DeweyConversionAssets> => {
  const simulationHtmlByUnitId: Record<string, string> = {};
  const tikzImgUrlByUnitId: Record<string, string> = {};
  await Promise.all((lesson.knowledgeUnits || []).map(async unit => {
    if (unit.tikzCode?.trim()) {
      try {
        const url = buildTikzKrokiUrl(unit.tikzCode.trim());
        if (url) tikzImgUrlByUnitId[unit.id] = url;
      } catch { /* bỏ qua */ }
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
  return { simulationHtmlByUnitId, tikzImgUrlByUnitId };
};
