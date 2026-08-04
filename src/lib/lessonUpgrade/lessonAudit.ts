// Ghép hai tầng rà soát giáo án cho tab "Nâng cấp giáo án":
//  1. Tầng toàn trường (`generalStandards`) — Checklist tự kiểm tra giáo án, chạy cho MỌI môn.
//  2. Tầng Toán TDS (`mathStandards`) — 4 bước, Polya, 2 lộ trình gợi ý... CHỈ chạy khi giáo án
//     không được nhận diện là môn khác.
//
// Trước đây tab Nâng cấp gọi thẳng `auditMathStandards`, nên giáo án Văn/Sử cũng bị chấm theo
// tiêu chí Toán. `auditMathStandards` vẫn giữ nguyên cho luồng sinh giáo án Toán
// (`toanLessonQuality`), nơi môn học đã biết chắc.

import { auditGeneralStandards, detectSubject, SUBJECT_LABEL } from './generalStandards';
import type { SubjectId } from './generalStandards';
import { auditMathStandards } from './mathStandards';
import { DANIELSON_LABEL } from './standardsTypes';
import type { DanielsonCode, FindingStatus, LessonType, StandardsFinding } from './standardsTypes';

export interface LessonAuditResult {
  subject: SubjectId;
  subjectLabel: string;
  /** Lớp kiểm Toán TDS có được bật hay không. */
  mathLayerApplied: boolean;
  lessonType: LessonType;
  findings: StandardsFinding[];
  /** Số tiêu chí quan trọng (severity high) đang FAIL. */
  criticalFailures: number;
}

/**
 * Chấm một giáo án bất kỳ. `forceSubject`/`forceType` để ép khi đã biết chắc (dùng cho kiểm thử
 * và cho các luồng đã xác định môn từ trước).
 */
export const auditLesson = (
  content: string,
  opts: { forceSubject?: SubjectId; forceType?: LessonType } = {},
): LessonAuditResult => {
  const subject = opts.forceSubject ?? detectSubject(content || '');
  const mathLayerApplied = subject === 'toan';

  const findings = auditGeneralStandards(content || '');
  let lessonType: LessonType = 'unknown';

  if (mathLayerApplied) {
    const math = auditMathStandards(content || '', opts.forceType);
    lessonType = math.lessonType;
    findings.push(...math.findings);
  }

  return {
    subject,
    subjectLabel: SUBJECT_LABEL[subject],
    mathLayerApplied,
    lessonType,
    findings,
    criticalFailures: findings.filter((f) => f.severity === 'high' && f.status === 'fail').length,
  };
};

const STATUS_ICON: Record<FindingStatus, string> = { pass: '✅', warn: '🟡', fail: '❌' };
const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  practice: 'tiết luyện tập / hình thành kĩ năng',
  knowledge: 'tiết hình thành kiến thức',
  flipped: 'lớp học đảo ngược',
  unknown: 'chưa xác định loại tiết',
};

const danielsonNote = (code?: DanielsonCode): string =>
  code ? ` _(Danielson ${code} — ${DANIELSON_LABEL[code]})_` : '';

/**
 * Xuất báo cáo rà soát dạng Markdown (đạt/chưa đạt + bằng chứng + hướng sửa). Dùng cho panel
 * trên tab Nâng cấp và cho phần "NỘI DUNG ĐÃ BỔ SUNG" chèn vào file .docx gốc.
 */
export const formatLessonReport = (result: LessonAuditResult): string => {
  const passed = result.findings.filter((f) => f.status === 'pass').length;
  const total = result.findings.length;
  const scope = result.mathLayerApplied
    ? `${result.subjectLabel} — ${LESSON_TYPE_LABEL[result.lessonType]}`
    : `${result.subjectLabel} — chỉ áp bộ tiêu chí toàn trường`;

  const lines: string[] = [];
  lines.push(`## Rà soát giáo án — ${scope}`);
  lines.push(
    `**Đạt ${passed}/${total} tiêu chí.** ${
      result.criticalFailures > 0
        ? `Còn ${result.criticalFailures} tiêu chí quan trọng chưa đạt.`
        : 'Không còn tiêu chí quan trọng nào chưa đạt.'
    }`,
  );
  lines.push('');
  for (const f of result.findings) {
    lines.push(`- ${STATUS_ICON[f.status]} **${f.title}**${danielsonNote(f.danielson)} — ${f.evidence}`);
    if (f.status !== 'pass' && f.suggestion) lines.push(`  - Hướng sửa: ${f.suggestion}`);
  }
  return lines.join('\n');
};

/** Một sản phẩm AI đã sinh, được giáo viên giữ lại để gộp vào file Word bổ sung. */
export interface SupplementItem {
  id: string;
  label: string;
  content: string;
}

/**
 * Ghép báo cáo rà soát với các sản phẩm trong giỏ thành MỘT khối markdown để chèn vào cuối
 * file .docx gốc. Trước đây chỉ mục N được gộp, các sản phẩm khác phải xuất thành file rời.
 */
export const buildSupplementMarkdown = (report: string, items: SupplementItem[]): string => {
  const blocks = items
    .filter((it) => it.content.trim())
    .map((it) => `\n\n## ${it.id}. ${it.label}\n\n${it.content.trim()}`);
  return report + blocks.join('');
};
