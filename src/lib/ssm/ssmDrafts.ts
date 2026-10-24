/**
 * Soạn sẵn nội dung để giáo viên DÁN vào SSM: lịch báo giảng, BTVN, nhận xét môn học.
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
  /** % trung bình các bài đã chấm chính thức (0-100); null khi chưa có bài nào. */
  averagePercent: number | null;
  /** Số bài đã chấm chính thức. */
  officialCount: number;
  /** Xu hướng kết quả qua các bài chấm gần nhất. */
  trend: 'up' | 'down' | 'flat' | 'not_enough_data';
  /** Số bài còn chưa nộp. */
  missingCount: number;
  strengths: readonly string[];
  areasToPractice: readonly string[];
}

/**
 * Nhận xét môn theo giọng giáo viên thật trên SSM: gọi "con", xưng "thầy cô", 3-5 câu liền mạch
 * gồm mức điểm + xu hướng + phần cần luyện + việc còn thiếu + câu động viên.
 * Không dùng nhãn biểu mẫu ("Điểm mạnh:", "Cần rèn thêm:") và không chốt cùng một câu cho mọi em
 * — mỗi câu đều có định lượng/dữ liệu riêng của em để văn bản tự nhiên, không ra "ngôn ngữ AI".
 */
export const buildSubjectComment = (c: CommentSource): string => {
  const sentences: string[] = [];
  const avg = c.averagePercent === null || c.officialCount === 0 ? null : Math.round(c.averagePercent);
  const tier = avg === null ? null : avg >= 80 ? 3 : avg >= 65 ? 2 : avg >= 50 ? 1 : 0;

  if (tier === null) {
    sentences.push('Hiện chưa có đủ bài chấm chính thức để nhận xét tổng quát, thầy cô sẽ cập nhật khi có kết quả.');
  } else if (tier === 3) {
    sentences.push(`Con nắm chắc kiến thức, làm bài có hệ thống (trung bình các bài chấm đạt khoảng ${avg}%).`);
  } else if (tier === 2) {
    sentences.push(`Con nắm được kiến thức cơ bản, làm bài khá ổn (trung bình khoảng ${avg}%), còn vài phần cần củng cố thêm.`);
  } else if (tier === 1) {
    sentences.push(`Con đã có nền tảng nhưng kết quả còn chưa cao (trung bình khoảng ${avg}%), cần luyện đều hơn.`);
  } else {
    sentences.push(`Kết quả của con hiện còn thấp (trung bình khoảng ${avg}%), cần nhắc con ôn lại phần cơ bản hằng ngày.`);
  }

  if (c.trend === 'up') sentences.push('So với đầu kỳ con tiến bộ rõ rệt, cần giữ nhịp học này.');
  else if (c.trend === 'down') sentences.push('Dạo gần đây kết quả đang đi xuống, con cần ôn lại sớm phần đã hổng.');

  if (c.strengths.length > 0) sentences.push(`Con thể hiện thế mạnh ở ${c.strengths.join(', ')}.`);
  if (c.areasToPractice.length > 0) sentences.push(`Phần ${c.areasToPractice.join(', ')} cần luyện lại cho vững.`);

  if (c.missingCount > 0) sentences.push(`Còn ${c.missingCount} bài chưa nộp, con hoàn tất để thầy cô nắm đủ sức học của mình.`);

  if (tier === 3) sentences.push('Thầy cô tin con sẽ giữ vững phong độ và mạnh dạn thử sức các phần nâng cao hơn.');
  else if (tier === 2) sentences.push('Giữ nhịp luyện tập đều như hiện tại, con sẽ tiến bộ thêm nhiều.');
  else if (tier === 1) sentences.push('Mỗi ngày ôn một chút phần chưa vững, con sẽ tiến bộ nhanh hơn.');
  else if (tier === 0) sentences.push('Con đừng nản, ôn từ phần cơ bản trở lên; có chỗ khó cứ hỏi thầy cô.');

  return sentences.join(' ');
};
