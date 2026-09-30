/**
 * Hồ sơ năng lực HS tự điền cùng GV — tab "Năng lực toán học" của file mẫu trường, mỗi năng lực một dòng:
 * HS tự bôi mức + kế hoạch (Mục tiêu, Phương án tự đề xuất, Thời gian thực hiện, Khó khăn, Tiến độ);
 * GV chốt mức + Ý kiến của giáo viên hướng dẫn, và sửa được cả phần của HS.
 * Lưu `competencyPortfolios/{classId}__{studentId}`, chỉ đi qua máy chủ. THUẦN — dùng chung client & API.
 */
import { COMPETENCY_LEVELS, competencyIdSet, type CompetencyGrade, type CompetencyLevel } from './framework.js';

export const COMPETENCY_PORTFOLIOS_COL = 'competencyPortfolios';

/** Đúng danh sách chọn cột "Tiến độ" trong file mẫu. */
export const PORTFOLIO_PROGRESS = ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành'] as const;
export type PortfolioProgress = (typeof PORTFOLIO_PROGRESS)[number];

/** Các ô HS được sửa. */
export const STUDENT_FIELDS = ['selfLevel', 'goal', 'plan', 'timeframe', 'difficulty', 'progress'] as const;
/** GV sửa được tất cả, thêm hai ô riêng của GV. */
export const TEACHER_FIELDS = [...STUDENT_FIELDS, 'teacherLevel', 'teacherComment'] as const;

export interface PortfolioEntry {
  selfLevel?: CompetencyLevel | null;
  goal?: string;
  plan?: string;
  timeframe?: string;
  difficulty?: string;
  progress?: PortfolioProgress;
  /** Mức GV chốt; không có thì dùng mức app đề xuất từ bài đã duyệt. */
  teacherLevel?: CompetencyLevel | null;
  teacherComment?: string;
}

export interface CompetencyPortfolioDoc {
  classId: string;
  studentId: string;
  entries: Record<string, PortfolioEntry>;
  updatedAt?: string;
  updatedBy?: string;
  updatedByRole?: 'student' | 'teacher';
}

export const portfolioDocId = (classId: string, studentId: string): string => `${classId}__${studentId}`;

const MAX_TEXT = 500;
const LEVELS = new Set<string>(COMPETENCY_LEVELS);

/** "Thời gian thực hiện" theo năm học chứa ngày `today` (tháng 8 → tháng 7 năm sau), dạng như file mẫu. */
export const schoolYearMonths = (today: string): string[] => {
  const [y, m] = today.split('-').map(Number);
  const startYear = m >= 8 ? y : y - 1;
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((7 + i) % 12) + 1;
    return `tháng ${month}/${month >= 8 ? startYear : startYear + 1}`;
  });
};

/** Các tháng của năm học từ tháng hiện tại trở đi (hạn cho mục tiêu mới). */
export const upcomingMonths = (today: string): string[] => {
  const [y, m] = today.split('-').map(Number);
  return schoolYearMonths(today).filter(label => {
    const [mm, yy] = label.replace('tháng ', '').split('/').map(Number);
    return yy * 12 + mm >= y * 12 + m;
  });
};

const cleanText = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : undefined;

const cleanLevel = (value: unknown): CompetencyLevel | null | undefined => {
  if (value === null || value === '') return null;
  return typeof value === 'string' && LEVELS.has(value) ? value as CompetencyLevel : undefined;
};

/**
 * Lọc bản sửa gửi lên: chỉ năng lực của đúng khối, chỉ các ô vai trò đó được sửa, giá trị hợp lệ.
 * Ô không gửi thì giữ nguyên; gửi rỗng/null là xoá.
 */
export const sanitizePortfolioPatch = (
  raw: unknown,
  grade: CompetencyGrade,
  role: 'student' | 'teacher',
): Record<string, PortfolioEntry> => {
  const allowedIds = competencyIdSet(grade);
  const fields: readonly string[] = role === 'teacher' ? TEACHER_FIELDS : STUDENT_FIELDS;
  const out: Record<string, PortfolioEntry> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedIds.has(id) || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const input = value as Record<string, unknown>;
    const entry: PortfolioEntry = {};
    for (const field of fields) {
      if (!(field in input)) continue;
      const v = input[field];
      if (field === 'selfLevel' || field === 'teacherLevel') {
        const level = cleanLevel(v);
        if (level !== undefined) entry[field] = level;
      } else if (field === 'progress') {
        if (typeof v === 'string' && (PORTFOLIO_PROGRESS as readonly string[]).includes(v)) entry.progress = v as PortfolioProgress;
      } else {
        const text = cleanText(v);
        if (text !== undefined) (entry as Record<string, unknown>)[field] = text;
      }
    }
    if (Object.keys(entry).length > 0) out[id] = entry;
  }
  return out;
};

/** Gộp bản sửa đã lọc vào hồ sơ đang có (theo từng ô). */
export const mergePortfolio = (
  current: Record<string, PortfolioEntry>,
  patch: Record<string, PortfolioEntry>,
): Record<string, PortfolioEntry> => {
  const next: Record<string, PortfolioEntry> = { ...current };
  for (const [id, entry] of Object.entries(patch)) next[id] = { ...(next[id] ?? {}), ...entry };
  return next;
};

export const normalizePortfolio = (classId: string, studentId: string, raw: unknown): CompetencyPortfolioDoc => {
  const data = raw && typeof raw === 'object' ? raw as Partial<CompetencyPortfolioDoc> : {};
  const entries = data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries) ? data.entries : {};
  return {
    classId,
    studentId,
    entries: entries as Record<string, PortfolioEntry>,
    ...(typeof data.updatedAt === 'string' ? { updatedAt: data.updatedAt } : {}),
    ...(typeof data.updatedBy === 'string' ? { updatedBy: data.updatedBy } : {}),
    ...(data.updatedByRole === 'student' || data.updatedByRole === 'teacher' ? { updatedByRole: data.updatedByRole } : {}),
  };
};
