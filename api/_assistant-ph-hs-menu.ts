/**
 * Phase 2 — Menu 1–7 cho PH/HS ĐÃ liên kết.
 *
 * Nguyên tắc (chốt 25/10):
 * - Menu CHỈ hiện cho người đã có link role=parent|student active. Người chưa từng liên kết
 *   (bạn bè, người lạ, PH thật nhưng chưa nhập PIN) KHÔNG bao giờ thấy menu — chỉ nhận hướng dẫn
 *   nhập PIN, tối đa 1 tin/5 phút (cooldown người lạ đã có ở Phase 1).
 * - Mọi số liệu đều đọc theo (classId, studentId) lấy TỪ LINK, không nhận tham số từ người nhắn —
 *   không có đường nào để xem dữ liệu em khác.
 * - Báo cáo dùng `buildParentSafeReport` (đã lọc theo ngôn ngữ PH, không lộ nội dung lớp).
 */
import { buildParentSafeReport } from '../src/lib/classroom/parentSafeReport.js';
import type { ParentSafeReport } from '../src/lib/classroom/parentSafeReport.js';

export const MENU_REPLIES = {
  header: 'Chọn mục (nhắn số):',
  needChoice: 'Nhắn số 1–7 để chọn mục. Nhắn 0 để xem lại menu.',
  invalid: 'Chưa có mục này. Nhắn 0 để xem lại menu.',
  noData: 'Chưa có dữ liệu cho mục này.',
} as const;

export const MENU_ITEMS = [
  { key: '1', label: 'Tổng quan học tập' },
  { key: '2', label: 'Điểm / bài đã chấm' },
  { key: '3', label: 'Bài chưa nộp / đang chờ' },
  { key: '4', label: 'Điểm mạnh & cần luyện' },
  { key: '5', label: 'Việc phụ huynh làm ở nhà' },
  { key: '6', label: 'Liên kết & trạng thái tài khoản' },
  { key: '7', label: 'Bài kiểm tra định kì' },
] as const;

export type MenuKey = typeof MENU_ITEMS[number]['key'];

export const menuText = (studentName: string, className: string): string =>
  [`Xin chào! Đây là trợ lý lớp ${className} — hồ sơ của ${studentName}.`,
    MENU_REPLIES.header,
    ...MENU_ITEMS.map(item => `${item.key}. ${item.label}`),
    '0. Xem lại menu'].join('\n');

const percent = (value: number | null): string => (value == null ? 'chưa đủ dữ liệu' : `${Math.round(value)}%`);

const trendText = (report: ParentSafeReport): string => {
  switch (report.progress.trend) {
    case 'up': return 'đang tiến bộ';
    case 'down': return 'đang giảm so với trước';
    case 'flat': return 'giữ mức ổn định';
    default: return 'chưa đủ lần chấm để so sánh';
  }
};

/** Điểm dạng "9.5/10" — KHÔNG kèm % (chủ dự án chốt 25/10: % làm tin nhắn rối). */
const scoreText = (score: number | null | undefined, maxScore: number | null | undefined): string =>
  `${score ?? '-'}/${maxScore ?? '-'}`;

/** Nhắc xem lại menu — LUÔN ở cuối mỗi tin để PH không phải nhớ cú pháp. */
const MENU_HINT = 'Nhắn 0 để xem lại menu.';

/** Sinh nội dung 1 mục menu từ báo cáo PH an toàn (không cần thêm truy vấn). */
export const menuSectionText = (key: MenuKey, report: ParentSafeReport, periodicIds: ReadonlySet<string> = new Set()): string => {
  const body = menuSectionBody(key, report, periodicIds);
  return `${body}\n\n${MENU_HINT}`;
};

const menuSectionBody = (key: MenuKey, report: ParentSafeReport, periodicIds: ReadonlySet<string>): string => {
  const name = report.studentName;
  const isPeriodic = (assignmentId: string) => periodicIds.has(assignmentId);
  switch (key) {
    case '1':
      return [`Tổng quan của ${name} — lớp ${report.className}`,
        `• Đã chấm: ${report.officialCount} bài`,
        `• Đang chờ chấm: ${report.pendingCount} bài`,
        `• Chưa nộp: ${report.missingCount} bài`,
        `• Xu hướng: ${trendText(report)}`,
        '',
        report.overallSummary].join('\n');
    case '2': {
      // Mục 2 = BTVN các ngày (KHÔNG gồm bài kiểm tra định kì — bài đó ở mục 7).
      const graded = report.results.filter(item => item.status === 'official' && !isPeriodic(item.assignmentId));
      if (!graded.length) return `Chưa có bài tập nào được chấm cho ${name}.`;
      const lines = graded.slice(0, 8).map(item => `• ${item.title}: ${scoreText(item.score, item.maxScore)}`);
      return [`Bài tập đã chấm của ${name} (${graded.length}):`, ...lines, '', 'Bài kiểm tra định kì: nhắn 7.'].join('\n');
    }
    case '3': {
      const todo = report.results.filter(item => item.status === 'not_submitted' || item.status === 'pending' || item.status === 'grading' || item.status === 'error');
      if (!todo.length) return `${name} không còn bài nào đang chờ nộp hay chờ chấm.`;
      const lines = todo.slice(0, 8).map(item => {
        const tag = item.status === 'not_submitted' ? 'chưa nộp' : item.status === 'grading' ? 'đang chấm' : item.status === 'error' ? 'lỗi xử lý, cần liên hệ thầy cô' : 'chờ chấm';
        return `• ${item.title} — ${tag}${item.dueAt ? ` (hạn ${item.dueAt.slice(0, 10)})` : ''}`;
      });
      return [`Bài đang chờ của ${name} (${todo.length}):`, ...lines].join('\n');
    }
    case '4': {
      const strong = report.strengths.length ? report.strengths.slice(0, 4).map(item => `• ${item}`) : ['• Chưa đủ dữ liệu để xác định điểm mạnh.'];
      const weak = report.areasToPractice.length ? report.areasToPractice.slice(0, 4).map(item => `• ${item}`) : ['• Chưa đủ dữ liệu để xác định phần cần luyện.'];
      return [`Điểm mạnh của ${name}:`, ...strong, '', 'Cần luyện thêm:', ...weak].join('\n');
    }
    case '5': {
      if (!report.parentActions.length) return 'Chưa có gợi ý riêng — nhắn thầy cô để được tư vấn thêm.';
      return [`Việc phụ huynh có thể làm ở nhà (${name}):`, ...report.parentActions.slice(0, 5).map(item => `• ${item}`)].join('\n');
    }
    case '6':
      return [`Tài khoản Zalo này đang liên kết với ${name} — lớp ${report.className}.`,
        'Mục 1–5 và 7 xem dữ liệu của chính học sinh này.',
        'Muốn đổi em khác: nhắn `<mã lớp> <PIN> phụ huynh`.',
        'Quên PIN: nhắn `/khoiphuc <mã học sinh> <số điện thoại>`.'].join('\n');
    case '7': {
      // Bài kiểm tra định kì — nhận diện bằng `assignment.periodicTest`, cùng cờ app và portal HS đang dùng.
      const periodic = report.results.filter(item => isPeriodic(item.assignmentId));
      if (!periodic.length) return `Chưa có bài kiểm tra định kì nào cho ${name}.`;
      const graded = periodic.filter(item => item.status === 'official' && item.score !== null && item.maxScore);
      const lines = periodic.slice(0, 8).map(item => {
        if (item.status === 'official') {
          return `• ${item.title}: ${scoreText(item.score, item.maxScore)}`;
        }
        const tag = item.status === 'not_submitted' ? 'chưa nộp' : item.status === 'grading' ? 'đang chấm' : item.status === 'error' ? 'lỗi xử lý, cần liên hệ thầy cô' : 'chờ chấm';
        return `• ${item.title} — ${tag}${item.dueAt ? ` (hạn ${item.dueAt.slice(0, 10)})` : ''}`;
      });
      return [`Bài kiểm tra định kì của ${name} (${periodic.length} bài):`, ...lines].join('\n');
    }
  }
};

export type MenuChoice = { kind: 'menu' } | { kind: 'section'; key: MenuKey } | { kind: 'invalid' };

/** Chỉ nhận đúng 1 ký tự số; '0' = xem lại menu. */
export const parseMenuChoice = (raw: string): MenuChoice => {
  const token = raw.normalize('NFC').trim();
  if (token === '0' || token === '' || /^(menu|m)$/i.test(token)) return { kind: 'menu' };
  if (/^[1-7]$/.test(token)) return { kind: 'section', key: token as MenuKey };
  return { kind: 'invalid' };
};

/** Nạp dữ liệu cần cho báo cáo — toàn bộ theo (classId, studentId) từ link. */
export interface ParentReportBundle { report: ParentSafeReport; periodicIds: Set<string> }
export const loadParentReport = async (
  db: FirebaseFirestore.Firestore,
  classId: string,
  studentId: string,
): Promise<ParentReportBundle | null> => {
  const classSnap = await db.collection('classes').doc(classId).get();
  const cls = (classSnap.data() as any) ?? {};
  const studentSnap = await db.collection('classes').doc(classId).collection('students').doc(studentId).get();
  const student = (studentSnap.data() as any) ?? null;
  if (!student) return null;
  const [assignmentsSnap, submissionsSnap, profileSnap] = await Promise.all([
    db.collection('assignments').where('classId', '==', classId).get(),
    db.collection('submissions').where('classId', '==', classId).where('studentId', '==', studentId).get(),
    db.collection('studentProfiles').doc(studentId).get(),
  ]);
  const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  const submissions = submissionsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  // Bài kiểm tra định kì = assignment có `periodicTest` (cùng cờ app/portal HS dùng), KHÔNG đoán theo tên.
  const periodicIds = new Set(assignments.filter((item: any) => item.periodicTest).map((item: any) => String(item.id)));
  const report = buildParentSafeReport({
    studentId,
    studentName: String(student.name ?? ''),
    className: String(cls.name ?? ''),
    assignments,
    submissions,
    profile: (profileSnap.data() as any) ?? null,
  });
  return { report, periodicIds };
};

/** Trả lời đầy đủ cho 1 tin nhắn của người đã liên kết (menu hoặc mục 1–7). */
export const parentMenuReply = async (
  db: FirebaseFirestore.Firestore,
  classId: string,
  studentId: string,
  raw: string,
): Promise<string> => {
  const choice = parseMenuChoice(raw);
  const bundle = await loadParentReport(db, classId, studentId);
  if (!bundle) return MENU_REPLIES.noData;
  const { report, periodicIds } = bundle;
  if (choice.kind === 'menu') return menuText(report.studentName, report.className);
  if (choice.kind === 'invalid') return MENU_REPLIES.invalid;
  return menuSectionText(choice.key, report, periodicIds);
};
