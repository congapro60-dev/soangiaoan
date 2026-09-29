/**
 * Ghép LO (chuẩn đầu ra của SSM) với năng lực trong khung app, rồi suy ra điểm gợi ý cho từng em.
 * Thuần, không gọi mạng, không đụng SSM.
 *
 * Luồng: AI ghép MỘT LẦN cho mỗi bài đánh giá → `LoMapping` (LO → các năng lực khung app).
 * Giáo viên sửa bảng ghép nếu cần. Sau đó điểm mỗi em tính MÁY MÓC từ bài đã duyệt:
 * lấy điểm đại diện (thang 10) của các năng lực được ghép, trung bình, rồi quy về thang 4 SSM.
 */
import type { LoMark } from './loScore';
import { toScale4 } from './loScore';

/** Bảng ghép: mã LO → danh sách id năng lực khung app. Rỗng = chưa ghép (điểm để "N"). */
export type LoMapping = Record<string, string[]>;

/** Một LO đọc từ file mẫu SSM, kèm mô tả để AI/giáo viên ghép. */
export interface LoInfo {
  loCode: string;
  /** Mô tả LO (bỏ tiền tố mã), để hiển thị và cho AI ghép. */
  text: string;
}

/** Điểm năng lực đã tổng hợp của một em (từ `aggregateCompetencies`). */
export interface StudentCompetencyScores {
  maHS: string;
  /** competencyId → điểm thang 10; chỉ chứa năng lực CÓ minh chứng. */
  scoreByCompetency: Record<string, number>;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Điểm gợi ý của MỘT em cho MỘT LO: trung bình điểm (thang 10) các năng lực được ghép mà em có
 * minh chứng; không có minh chứng nào → "N". `toScale4` lo phần quy thang + kẹp mức.
 */
export const suggestMark = (
  competencyIds: readonly string[],
  scoreByCompetency: Readonly<Record<string, number>>,
): LoMark => {
  const scores = competencyIds
    .map((id) => scoreByCompetency[id])
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
  if (scores.length === 0) return 'N';
  const avg = round1(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  return toScale4(avg);
};

/**
 * Bảng điểm gợi ý cho cả lớp: Mã HS → (mã LO → mức). Mọi ô LO đều có mặt (mặc định "N"),
 * để giáo viên thấy rõ ô nào máy chưa có căn cứ và tự điền.
 */
export const suggestGrid = (
  los: readonly LoInfo[],
  mapping: LoMapping,
  students: readonly StudentCompetencyScores[],
): Map<string, Map<string, LoMark>> => {
  const grid = new Map<string, Map<string, LoMark>>();
  for (const student of students) {
    const row = new Map<string, LoMark>();
    for (const lo of los) {
      row.set(lo.loCode, suggestMark(mapping[lo.loCode] ?? [], student.scoreByCompetency));
    }
    grid.set(student.maHS, row);
  }
  return grid;
};

/** Tách mã LO và phần mô tả từ chuỗi tiêu đề dòng 6 ("LO_DIS_TO_123:\nHiểu A" → mã + "Hiểu A"). */
export const parseLoInfo = (header: string): LoInfo | null => {
  const m = header.match(/^(LO_[A-Za-z0-9_]+?)\s*:\s*([\s\S]*)$/);
  return m ? { loCode: m[1], text: m[2].replace(/\s+/g, ' ').trim() } : null;
};
