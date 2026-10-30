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
import { latexToUnicodeMath } from './_assistant-math-text.js';
import { switchRoleGuideReply } from './_assistant-ph-hs-link.js';

export const MENU_REPLIES = {
  header: '📋 Chọn mục cần xem (nhắn số):',
  needChoice: '👉 Nhắn số mục để chọn.\n\nNhắn 0 để xem lại menu.',
  invalid: '⚠️ Chưa có mục này trong danh sách.\n\nNhắn 0 để xem lại menu.',
  noData: 'ℹ️ Chưa có dữ liệu cho mục này.',
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
export type MenuRole = 'parent' | 'student';

/** Nhãn mục 5 theo vai trò: PH nhận việc cần làm ở nhà, HS nhận gợi ý tự học. */
export const menuItem5Label = (role: MenuRole): string => (role === 'student' ? 'Gợi ý tự học ở nhà' : MENU_ITEMS[4].label);

export const menuText = (studentName: string, className: string, role: MenuRole = 'parent'): string =>
  [`Xin chào! Đây là trợ lý lớp ${className} — hồ sơ của ${studentName}.`,
    MENU_REPLIES.header,
    ...MENU_ITEMS.map(item => `${item.key}. ${item.key === '5' ? menuItem5Label(role) : item.label}`),
    // Việc 4 — mục 8: HS nộp bài, PH nộp bài hộ con.
    role === 'student'
      ? '8. Nộp bài bằng ảnh (chọn bài → gửi ảnh → nhắn xong)'
      : '8. Nộp bài bằng ảnh (chụp bài làm nộp hộ con)',
    // Mục 9 "Đổi vai trò" (chốt chủ dự án 29/10): hướng dẫn chuyển HS/PH/GV, mỗi lần đổi bắt nhập mã.
    '9. Đổi vai trò (HS/PH/GV)',
    '10. Hướng dẫn sử dụng các tính năng',
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

/** Nhận xét rút gọn cho tin nhắn: bỏ ký hiệu định dạng, gọn 1 dòng, tối đa ~80 ký tự. */
const shortFeedback = (feedback: string): string => {
  // GV có thể gõ công thức LaTeX trong nhận xét; Zalo không render nên phải đổi sang Unicode.
  const flat = latexToUnicodeMath(feedback).replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? `${flat.slice(0, 79).trimEnd()}…` : flat;
};

/** Nhắc xem lại menu — LUÔN ở cuối mỗi tin để PH không phải nhớ cú pháp. */
export const MENU_HINT = 'Nhắn 0 để xem lại menu.';

/**
 * Link web gửi qua bot phải là tin THUẦN (không markdown) để URL render thành link bấm được.
 * PH → cổng phụ huynh /ph/<mã lớp>; HS → cổng học sinh /lop/<mã lớp>. Vào bằng mã lớp + PIN,
 * giống hệt cách liên kết bot — không cần tài khoản.
 */
export const WEB_PORTAL_BASE = 'https://giaoandewey.vercel.app';
export const webLinkText = (role: MenuRole, joinCode: string): string => (role === 'student'
  ? [`Nộp bài / làm bài tập trên web:`,
    `${WEB_PORTAL_BASE}/lop/${joinCode}`,
    '',
    'Mở link, chọn tên của em và nhập mã PIN học sinh (do thầy cô cấp).',
    '',
    MENU_HINT].join('\n')
  : [`Xem báo cáo học tập của con trên web:`,
    `${WEB_PORTAL_BASE}/ph/${joinCode}`,
    '',
    'Mở link, chọn tên con và nhập mã PIN phụ huynh (do thầy cô cấp).',
    '',
    MENU_HINT].join('\n'));

/**
 * URL cổng web theo vai. Trả '' khi không có mã lớp — thà không có link còn hơn
 * gửi link sai lớp. `joinCode` LUÔN lấy từ `classes/{classId}` của chính link
 * người nhắn (xem loadParentReport), không bao giờ nhận từ nội dung tin nhắn.
 */
export const webPortalUrl = (role: MenuRole, joinCode: string): string => {
  const code = String(joinCode ?? '').trim();
  if (!code) return '';
  return `${WEB_PORTAL_BASE}/${role === 'student' ? 'lop' : 'ph'}/${encodeURIComponent(code)}`;
};

/**
 * Chèn link lớp vào NGAY TRƯỚC câu "Nhắn 0 để xem lại menu" của câu trả lời AI,
 * để HS luôn bấm được vào web. Không có mã lớp thì trả nguyên văn (không link sai).
 *
 * `sendStyled` cắt tin ở 2000 ký tự, mà link nằm gần cuối → phải chừa chỗ cho link,
 * nếu không câu trả lời dài sẽ bị cắt mất đúng phần HS cần bấm.
 */
export const withWebPortalLink = (text: string, role: MenuRole, joinCode: string): string => {
  const url = webPortalUrl(role, joinCode);
  if (!url) return text;
  const block = role === 'student'
    ? `Xem bài và nộp bài trên web:\n${url}`
    : `Xem báo cáo học tập trên web:\n${url}`;
  const tail = `\n\n${block}\n\n${MENU_HINT}`;
  // 2000 là trần cứng của Zalo sendMessage; chừa thêm biên an toàn cho dấu xuống dòng.
  const room = 2000 - tail.length;
  const body = text.length > room ? `${text.slice(0, Math.max(0, room - 1)).trimEnd()}…` : text;
  const idx = body.lastIndexOf(MENU_HINT);
  if (idx === -1) return `${body}${tail}`;
  return `${body.slice(0, idx).trimEnd()}${tail}`;
};

/** Sinh nội dung 1 mục menu từ báo cáo PH an toàn (không cần thêm truy vấn). */
// '8' (việc 4) chỉ tới được từ parseMenuChoice của HS — menuSectionBody tự trả lời theo vai trò.
export const menuSectionText = (key: MenuKey | '8', report: ParentSafeReport, periodicIds: ReadonlySet<string> = new Set(), role: MenuRole = 'parent'): string => {
  const body = menuSectionBody(key, report, periodicIds, role);
  return `${body}\n\n${MENU_HINT}`;
};

const menuSectionBody = (key: MenuKey | '8', report: ParentSafeReport, periodicIds: ReadonlySet<string>, role: MenuRole): string => {
  const name = report.studentName;
  const isPeriodic = (assignmentId: string) => periodicIds.has(assignmentId);
  switch (key) {
    case '1':
      return [`📊 Tổng quan của ${name} — lớp ${report.className}`,
        `• Đã chấm: ${report.officialCount} bài`,
        `• Đang chờ chấm: ${report.pendingCount} bài`,
        `• Chưa nộp: ${report.missingCount} bài`,
        `• Xu hướng: ${trendText(report)}`,
        '',
        report.overallSummary].join('\n');
    case '2': {
      // Mục 2 = BTVN các ngày (KHÔNG gồm bài kiểm tra định kì — bài đó ở mục 7).
      const graded = report.results.filter(item => item.status === 'official' && !isPeriodic(item.assignmentId));
      if (!graded.length) return `ℹ️ Chưa có bài tập nào được chấm cho ${name}.`;
      // Bản HS: kèm nhận xét GV cho từng bài đã duyệt (chỉ có trên báo cáo role=student).
      // Giảm xuống 5 bài để tin không phình; PH giữ nguyên 8 bài, không có nhận xét.
      const forStudent = role === 'student';
      const lines = graded.slice(0, forStudent ? 5 : 8).map(item => {
        const score = `• ${item.title}: ${scoreText(item.score, item.maxScore)}`;
        return forStudent && item.feedback ? `${score}\n  💬 ${shortFeedback(item.feedback)}` : score;
      });
      return [`📝 Bài tập đã chấm của ${name} (${graded.length} bài):`, ...lines, '', '👉 Xem bài kiểm tra định kỳ: nhắn 7.'].join('\n');
    }
    case '3': {
      const todo = report.results.filter(item => item.status === 'not_submitted' || item.status === 'pending' || item.status === 'grading' || item.status === 'error');
      if (!todo.length) return `🎉 ${name} không còn bài nào đang chờ nộp hay chờ chấm.`;
      const lines = todo.slice(0, 8).map(item => {
        const tag = item.status === 'not_submitted' ? 'chưa nộp' : item.status === 'grading' ? 'đang chấm' : item.status === 'error' ? 'lỗi xử lý' : 'chờ chấm';
        return `• ${item.title} — [${tag}]${item.dueAt ? ` (hạn: ${item.dueAt.slice(0, 10)})` : ''}`;
      });
      return [`⏳ Bài đang chờ của ${name} (${todo.length} bài):`, ...lines].join('\n');
    }
    case '4': {
      const strong = report.strengths.length ? report.strengths.slice(0, 4).map(item => `• ${item}`) : ['• Chưa đủ dữ liệu để xác định điểm mạnh.'];
      const weak = report.areasToPractice.length ? report.areasToPractice.slice(0, 4).map(item => `• ${item}`) : ['• Chưa đủ dữ liệu để xác định phần cần luyện.'];
      return [`🌟 Điểm mạnh của ${name}:`, ...strong, '', '🎯 Cần luyện thêm:', ...weak].join('\n');
    }
    case '5': {
      // HS tự luyện: dùng `areasToPractice` (dữ liệu có thật, cùng nguồn mục 4) thay cho
      // `parentActions` vốn viết theo góc nhìn người lớn ("nhắc con...").
      if (role === 'student') {
        if (!report.areasToPractice.length) return 'ℹ️ Chưa có gợi ý tự học riêng — em có thể hỏi thầy cô khi cần nhé.';
        return [`💡 Gợi ý tự học của ${name}:`, ...report.areasToPractice.slice(0, 5).map(item => `• ${item}`)].join('\n');
      }
      if (!report.parentActions.length) return 'ℹ️ Chưa có gợi ý riêng — phụ huynh nhắn thầy cô để được tư vấn thêm.';
      return [`🏡 Việc phụ huynh có thể làm ở nhà (${name}):`, ...report.parentActions.slice(0, 5).map(item => `• ${item}`)].join('\n');
    }
    case '6':
      return [`🔗 Tài khoản Zalo này đang liên kết với ${name} — lớp ${report.className}.`,
        '• Mục 1–5 và 7: xem dữ liệu học tập của học sinh này.',
        role === 'student'
          ? '• Gửi ảnh bài làm để tự chấm: nhắn 8.'
          : '• Gửi ảnh bài làm nộp hộ con: nhắn 8.',
        '• Xem báo cáo hoặc nộp bài trên web: nhắn web.',
        '• Muốn đổi em khác: nhắn <mã lớp> <PIN> phụ huynh.',
        '• Quên mã PIN: nhắn /khoiphuc <mã học sinh> <số điện thoại>.'].join('\n');
    case '7': {
      // Bài kiểm tra định kì — nhận diện bằng `assignment.periodicTest`, cùng cờ app và portal HS đang dùng.
      const periodic = report.results.filter(item => isPeriodic(item.assignmentId));
      if (!periodic.length) return `ℹ️ Chưa có bài kiểm tra định kì nào cho ${name}.`;
      const graded = periodic.filter(item => item.status === 'official' && item.score !== null && item.maxScore);
      const lines = periodic.slice(0, 8).map(item => {
        if (item.status === 'official') {
          return `• ${item.title}: ${scoreText(item.score, item.maxScore)}`;
        }
        const tag = item.status === 'not_submitted' ? 'chưa nộp' : item.status === 'grading' ? 'đang chấm' : item.status === 'error' ? 'lỗi xử lý' : 'chờ chấm';
        return `• ${item.title} — [${tag}]${item.dueAt ? ` (hạn: ${item.dueAt.slice(0, 10)})` : ''}`;
      });
      return [`📑 Bài kiểm tra định kì của ${name} (${periodic.length} bài):`, ...lines].join('\n');
    }
    case '8':
      // Việc 4 — nộp bài bằng ảnh. Cả HS và PH nộp bài hộ con.
      return role === 'student'
        ? ['📸 Nộp bài bằng ảnh: nhắn chấm để xem danh sách bài cần nộp.', '👥 Nộp hộ bạn cùng lớp: nhắn "nộp hộ".', '', MENU_HINT].join('\n')
        : ['📸 Nộp bài bằng ảnh cho con: nhắn chấm để xem danh sách bài cần nộp.', '', MENU_HINT].join('\n');
  }
};

export type MenuChoice = { kind: 'menu' } | { kind: 'section'; key: MenuKey } | { kind: 'link' } | { kind: 'switchRole' } | { kind: 'help' } | { kind: 'status' } | { kind: 'invalid' };

/** Chỉ nhận đúng 1 ký tự số; '0' = xem lại menu; 'web'/'link' = nhận link web portal; '8' = nộp bài bằng ảnh (HS); hỗ trợ các từ khóa cứu cánh: help, huy, status. */
export const parseMenuChoice = (raw: string): MenuChoice => {
  const token = raw.normalize('NFC').trim();
  if (token === '0' || token === '' || /^(menu|m|hủy|huy)$/i.test(token)) return { kind: 'menu' };
  if (/^(web|website|link)$/i.test(token)) return { kind: 'link' };
  // Mục 9 "Đổi vai trò" (chốt chủ dự án 29/10) — nhận cả số 9 lệnh gõ "đổi vai"/"doi vai"/"đổi con"/"doi con".
  if (token === '9' || /^(đổi vai|doi vai|đổi con|doi con)$/i.test(token)) return { kind: 'switchRole' };
  // Mục 10 "Hướng dẫn sử dụng" — nhận cả số 10 hoặc từ khóa hd/help/hướng dẫn/trợ giúp.
  if (token === '10' || /^(trợ giúp|tro giup|help|\/help|hướng dẫn|huong dan|hd)$/i.test(token)) return { kind: 'help' };
  if (/^(kiểm tra|kiem tra|status|\/status)$/i.test(token)) return { kind: 'status' };
  if (/^[1-8]$/.test(token)) return { kind: 'section', key: token as MenuKey };
  return { kind: 'invalid' };
};

/** Nạp dữ liệu cần cho báo cáo — toàn bộ theo (classId, studentId) từ link. */
export interface ParentReportBundle { report: ParentSafeReport; periodicIds: Set<string>; joinCode: string }
export const loadParentReport = async (
  db: FirebaseFirestore.Firestore,
  classId: string,
  studentId: string,
  role: MenuRole = 'parent',
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
    // Bản HS được kèm nhận xét GV cho từng bài đã duyệt; bản PH giữ nguyên (không có feedback).
    includeFeedback: role === 'student',
  });
  return { report, periodicIds, joinCode: String(cls.joinCode ?? '') };
};

/** Trả lời đầy đủ cho 1 tin nhắn của người đã liên kết (menu hoặc mục 1–7). */
export const parentMenuReply = async (
  db: FirebaseFirestore.Firestore,
  classId: string,
  studentId: string,
  raw: string,
  role: MenuRole = 'parent',
): Promise<string> => {
  const choice = parseMenuChoice(raw);
  const bundle = await loadParentReport(db, classId, studentId, role);
  if (!bundle) return MENU_REPLIES.noData;
  const { report, periodicIds, joinCode } = bundle;
  if (choice.kind === 'menu') return menuText(report.studentName, report.className, role);
  // Tin link web: URL phải nằm trong text THUẦN để Zalo render thành link bấm được.
  if (choice.kind === 'link') return joinCode ? webLinkText(role, joinCode) : MENU_REPLIES.noData;
  // Mục 9 "Đổi vai trò": hướng dẫn mẫu xác nhận — KHÔNG cần dữ liệu báo cáo, trả trước cho gọn.
  if (choice.kind === 'switchRole') return switchRoleGuideReply(role);
  if (choice.kind === 'invalid' || choice.kind === 'help' || choice.kind === 'status') return MENU_REPLIES.invalid;
  return menuSectionText(choice.key, report, periodicIds, role);
};
