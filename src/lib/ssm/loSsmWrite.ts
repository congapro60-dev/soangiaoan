/**
 * Xây payload GHI điểm LO cho SSM và so sánh điểm đã có với điểm web tính — THUẦN, không mạng.
 *
 * Nguyên tắc an toàn (SSM không có chế độ nháp cho bảng này — nút Lưu là thật):
 *  - Chỉ tạo result entry cho ô app CÓ điểm (khác 'N'). Ô 'N' của web không đụng tới ô SSM.
 *  - `scoring_setting_id` = id hàng thang đúng mức; thiếu hàng thang thì BỎ ô (không tự bịa).
 *  - Ô đã có điểm trên SSM (existingPointId) mà web muốn ghi mức khác → GV phải thấy rõ trong diff.
 */
import type { LoMark } from './loScore';
import { findScaleRow, type SsmCriteriaLoad, type SsmScoreConfig } from './loSsmParser';
import type { SsmGradeResultEntry, SsmGradeWriteBody } from './ssmBridge';

/** Ô diff một em × một LO. */
export interface LoDiffCell {
  maHS: string;
  loCode: string;
  /** Mức đang có trên SSM; null = ô trống. */
  existing: string | null;
  /** Mức web tính ra; null = web không có căn cứ (không ghi). */
  proposed: string | null;
  /** existing khác proposed (kể cả có↔không có). */
  changed: boolean;
  /** Web muốn GHI đè lên ô SSM đã có điểm khác. */
  overwrite: boolean;
}

export interface LoDiff {
  cells: LoDiffCell[];
  changedCount: number;
  overwriteCount: number;
  /** HS có tên trong file mà SSM không có (không ghi được). */
  unmatchedStudents: string[];
  /** Mức web muốn ghi nhưng thang SSM không có (vd 2,5 khi thang không khai) — BỎ, không bịa. */
  unmappedMarks: string[];
}

const scalePoint = (scale: readonly SsmScoreConfig[], existingId: number | undefined): string | null => {
  if (typeof existingId !== 'number') return null;
  const row = scale.find((s) => s.id === existingId);
  return row ? row.point : null;
};

/**
 * So sánh: `load` = dữ liệu SSM vừa đọc; `marks` = Mã HS → (mã LO → mức web tính).
 * Duyệt theo EM × LO CỦA SSM (không theo grid) — những ngoài phạm vi không xét.
 */
export const diffLoGrid = (
  load: SsmCriteriaLoad,
  marks: ReadonlyMap<string, ReadonlyMap<string, LoMark>>,
): LoDiff => {
  const cells: LoDiffCell[] = [];
  const unmatchedStudents = new Set<string>();
  const unmappedMarks = new Set<string>();
  let changedCount = 0;
  let overwriteCount = 0;

  for (const student of load.students) {
    const studentMarks = marks.get(student.maHS);
    for (const lo of load.los) {
      const key = `${lo.focalPointId}_${lo.powerStandardId}_${lo.loId}`;
      const existingPointId = student.existingPointId.get(key);
      const existing = scalePoint(load.scale, existingPointId);
      const mark = studentMarks?.get(lo.loCode);
      const isMarked = mark !== undefined && mark !== null && mark !== 'N';
      const proposedRow = isMarked ? findScaleRow(load.scale, String(mark)) : null;
      if (isMarked && !proposedRow && !unmappedMarks.has(String(mark))) unmappedMarks.add(String(mark));
      const proposed = proposedRow ? proposedRow.point : null;
      // Không có học sinh này trong grid của app (nhưng có trên SSM) → chỉ báo, không ghi đè.
      if (!studentMarks) unmatchedStudents.add(student.maHS);
      const changed = proposed !== null && proposed !== existing;
      if (changed) {
        changedCount += 1;
        if (existing !== null) overwriteCount += 1;
      }
      cells.push({ maHS: student.maHS, loCode: lo.loCode, existing, proposed, changed, overwrite: changed && existing !== null });
    }
  }
  return { cells, changedCount, overwriteCount, unmatchedStudents: [...unmatchedStudents], unmappedMarks: [...unmappedMarks] };
};

/**
 * Payload GHI chỉ chứa các ô KHÁC (đúng như preview); ô trống của SSM mà web cũng trống → không gửi.
 * Trả null khi không có ô nào khác (không gọi SSM uổng).
 */
export const buildLoWriteBody = (
  load: SsmCriteriaLoad,
  marks: ReadonlyMap<string, ReadonlyMap<string, LoMark>>,
  diff: LoDiff,
): SsmGradeWriteBody | null => {
  if (diff.unmappedMarks.length > 0) return null; // bắt buộc GV xem lại, không ghi nửa vời
  const changedKeys = new Set(diff.cells.filter((c) => c.changed).map((c) => `${c.maHS}|${c.loCode}`));
  if (changedKeys.size === 0) return null;
  if (!load.quarterHasBranchId) return null;

  const students = load.students.flatMap((student) => {
    const studentMarks = marks.get(student.maHS);
    if (!studentMarks) return [];
    const result: SsmGradeResultEntry[] = load.los.flatMap((lo) => {
      if (!changedKeys.has(`${student.maHS}|${lo.loCode}`)) return [];
      const mark = studentMarks.get(lo.loCode) ?? 'N';
      const row = mark !== 'N' ? findScaleRow(load.scale, String(mark)) : null;
      if (!row) return [];
      const key = `${lo.focalPointId}_${lo.powerStandardId}_${lo.loId}`;
      const gradingStudentId = student.existingGradingId.get(key);
      return [{
        learning_outcome_id: lo.loId,
        scoring_setting_id: row.id,
        is_number: row.isNumber,
        point: row.point,
        ...(gradingStudentId !== undefined ? { grading_student_id: gradingStudentId } : {}),
      }];
    });
    if (result.length === 0) return [];
    return [{ id: student.id, name: student.name, result }];
  });
  if (students.length === 0) return null;
  return { class_id: 0, criteria_id: 0, quarter_has_branch_id: load.quarterHasBranchId, students };
};

/** Với body trả về: cập nhật class_id + criteria_id từ dữ liệu thật của lần tải (2 tham số chỉ biết lúc runtime). */
export const withClassAndCriteria = (body: SsmGradeWriteBody, load: SsmCriteriaLoad, classId: number, criteriaId: number): SsmGradeWriteBody => ({
  ...body,
  class_id: classId,
  criteria_id: criteriaId,
});

/**
 * Đọc lại sau khi ghi: điểm các ô đã ghi phải tương ứng đúng hàng thang đã gọi.
 * Trả danh sách ô lệch (rỗng = xác minh đạt).
 */
export const verifyWritten = (loadAfter: SsmCriteriaLoad, body: SsmGradeWriteBody): string[] => {
  const byLo = new Map<number, { code: string; fpId: number; psId: number }>();
  for (const lo of loadAfter.los) byLo.set(lo.loId, { code: lo.loCode, fpId: lo.focalPointId, psId: lo.powerStandardId });
  const stale: string[] = [];
  for (const student of body.students) {
    const after = loadAfter.students.find((s) => s.id === student.id);
    if (!after) { stale.push(`${student.name} — mất khỏi lớp`); continue; }
    for (const entry of student.result) {
      const lo = byLo.get(entry.learning_outcome_id);
      if (!lo) { stale.push(`${student.name} — LO ${entry.learning_outcome_id} không còn`); continue; }
      const key = `${lo.fpId}_${lo.psId}_${entry.learning_outcome_id}`;
      if (after.existingPointId.get(key) !== entry.scoring_setting_id) stale.push(`${student.name} · ${lo.code}`);
    }
  }
  return stale;
};
