/**
 * Soạn sẵn nội dung để giáo viên DÁN vào SSM: lịch báo giảng, BTVN, nhận xét môn cho phụ huynh.
 * Thuần. App không tự ghi vào SSM — chỉ tạo nội dung để cô chép qua.
 */

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface ScheduleLesson {
  title: string;
  detail?: string;
}

/**
 * Nội dung báo giảng một tuần, đúng kiểu HTML ô báo giảng SSM: tiêu đề + gạch đầu dòng mỗi bài.
 * Không tự đặt giờ từng tiết (giờ nằm ở thời khoá biểu SSM) — cô sắp theo buổi khi dán.
 */
export const buildScheduleContent = (
  className: string,
  subjectName: string,
  weekLabel: string,
  lessons: readonly ScheduleLesson[],
): string => {
  const items = lessons
    .map((l) => `<li>${esc(l.title)}${l.detail ? ` — ${esc(l.detail)}` : ''}</li>`)
    .join('');
  return `<h3>${esc(className)} – ${esc(subjectName)}</h3>` +
    `<p><strong>${esc(weekLabel)}</strong></p>` +
    (items ? `<ul>${items}</ul>` : '<p>(Chưa có nội dung cho tuần này)</p>');
};

export interface HomeworkSource {
  title: string;
  description?: string;
  dueAt?: string;
}

export interface HomeworkDraft {
  name: string;
  /** Hạn nộp dạng SSM cần: "YYYY-MM-DD HH:mm:ss" (giờ VN), rỗng nếu bài không đặt hạn. */
  deadline: string;
  contentHtml: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** ISO → "YYYY-MM-DD HH:mm:ss" theo giờ Việt Nam (UTC+7). Rỗng nếu không hợp lệ. */
export const toSsmDeadline = (iso: string | undefined): string => {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t + 7 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

/** BTVN của app → các trường để cô dán vào form BTVN của SSM. */
export const buildHomeworkDraft = (hw: HomeworkSource): HomeworkDraft => ({
  name: hw.title.trim(),
  deadline: toSsmDeadline(hw.dueAt),
  contentHtml: (hw.description ?? '').trim(),
});

export interface CommentSource {
  overallSummary: string;
  strengths: readonly string[];
  areasToPractice: readonly string[];
  parentActions: readonly string[];
}

/**
 * Nhận xét môn cho phụ huynh: gộp từ bản báo cáo an toàn (đã lọc, không lộ số câu/đáp án).
 * Một đoạn liền mạch để cô dán vào ô nhận xét môn học của SSM; cô sửa lại giọng nếu muốn.
 */
export const buildSubjectComment = (c: CommentSource): string => {
  const parts: string[] = [c.overallSummary.trim()];
  if (c.strengths.length > 0) parts.push(`Điểm mạnh: ${c.strengths.join('; ')}.`);
  if (c.areasToPractice.length > 0) parts.push(`Cần rèn thêm: ${c.areasToPractice.join('; ')}.`);
  if (c.parentActions.length > 0) parts.push(c.parentActions[0].trim());
  return parts.filter(Boolean).join(' ');
};
