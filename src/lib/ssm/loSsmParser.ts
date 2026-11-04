/**
 * Đọc JSON trả về từ API SSM (qua tiện ích, CHỈ ĐỌC) thành cấu trúc app dùng: cây LO, thang điểm,
 * học sinh + điểm đã có. Cấu trúc đối chiếu trực tiếp từ mã JS công khai của SSM
 * (umi.e3306a2c + chunk grading 8173 + services 521, tải về 2026-10-22). Thuần, không mạng.
 *
 * Quan trọng: trong payload GHI, `scoring_setting_id` là id của MỘT HÀNG THANG ĐIỂM
 * (score_configs) — không phải id LO. `point` là chuỗi điểm của hàng thang đó.
 * Ô điểm đã có trên SSM lưu `point_id` (= id hàng thang) + `grading_student_id`.
 */
import type { LoInfo } from './loMapping';

/** Một hàng trong thang SSM (score_configs). `point` là chuỗi ("4", "3.5"…); N = hàng isNumber=false, point=null. */
export interface SsmScoreConfig {
  id: number;
  point: string;
  isNumber: boolean;
  isCalculateScore: boolean;
}

/** Một LO trên SSM, đã dẹt về danh sách phẳng kèm mã + mô tả để ghép năng lực. */
export interface SsmLoColumn extends LoInfo {
  loId: number;
  focalPointId: number;
  powerStandardId: number;
}

/** Học sinh của bài đánh giá + điểm đã có sẵn trên SSM (để GV đối chiếu trước khi ghi đè). */
export interface SsmStudent {
  id: number;
  maHS: string;
  name: string;
  /** (fp_ps_lo) → point_id đang lưu; thiếu = ô chưa chấm. */
  existingPointId: Map<string, number>;
  /** (fp_ps_lo) → grading_student_id để sửa đúng dòng kết quả cũ. */
  existingGradingId: Map<string, number>;
}

/** Kết quả của 1 lần tải class-subject-assessment. */
export interface SsmCriteriaLoad {
  quarterHasBranchId: number | null;
  resultAssessmentFormId: number | null;
  /** SSM chốt xong bài đánh giá này rồi thì app phải cấm ghi đè. */
  isApproved: boolean;
  canEdit: boolean;
  scale: SsmScoreConfig[];
  los: SsmLoColumn[];
  students: SsmStudent[];
}

/** 4 quý của lớp×môn: `GET /v3/evaluation/classes/{classId}/subjects/{subjectId}/quarters`. */
export interface SsmQuarter {
  id: number;
  name: string;
  /** assessment_forms gốc kèm criteria_id để bước sau gọi class-subject-assessment. */
  forms: Array<{ id: number; assessmentName: string; criteriaId: number | null }>;
}

const isObj = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const str = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value));

/**
 * Bóc bọc phân trang `{data: …}` (có thể nhiều tầng, mảng trần cũng được).
 * Django/Laravel SSM dùng lẫn lộn trong CÙNG response nên phải bóc tại chỗ này.
 */
const unwrapData = (val: unknown): unknown => {
  let curr = val;
  while (isObj(curr) && !Array.isArray(curr) && 'data' in curr) {
    curr = curr.data;
  }
  return curr;
};

const toArr = (val: unknown): unknown[] => {
  const unwrapped = unwrapData(val);
  return Array.isArray(unwrapped) ? unwrapped : [];
};

const toObj = (val: unknown): Record<string, unknown> => {
  const unwrapped = unwrapData(val);
  return isObj(unwrapped) && !Array.isArray(unwrapped) ? unwrapped : {};
};

const pick = (node: unknown, key: string): unknown => (isObj(node) ? node[key] : undefined);

interface RawLo {
  id: number;
  code: string;
  name: string;
  fpId: number;
  psId: number;
}

/** Cây FP → PS → LO, dẹt thành danh sách LO phẳng. */
const flattenLos = (focalPoints: unknown): RawLo[] =>
  toArr(focalPoints).flatMap((fp) => {
    if (!isObj(fp)) return [];
    const fpId = num(fp.id);
    if (fpId === null) return [];
    return toArr(pick(fp, 'power_standards')).flatMap((ps) => {
      if (!isObj(ps)) return [];
      const psId = num(ps.id);
      if (psId === null) return [];
      return toArr(pick(ps, 'learning_outcomes')).flatMap((lo) => {
        if (!isObj(lo)) return [];
        const id = num(lo.id);
        const code = str(lo.code);
        if (id === null || !code) return [];
        return [{ id, code, name: str(lo.name), fpId, psId }];
      });
    });
  });

const parseScale = (assessmentForm: unknown): SsmScoreConfig[] => {
  const formObj = toObj(assessmentForm);
  const sc = unwrapData(pick(formObj, 'scoring_scale'));
  const scObj = Array.isArray(sc) ? toObj(sc[0]) : toObj(sc);
  const configs = toArr(pick(scObj, 'score_configs'));
  return configs
    .filter(isObj)
    .map((row): SsmScoreConfig | null => {
      const id = num(row.id);
      const rawPoint = row.point;
      const valid = id !== null && (typeof rawPoint === 'number' || typeof rawPoint === 'string' || rawPoint === null);
      return valid
        ? {
            id: id as number,
            point: String(rawPoint),
            isNumber: row.is_number === true,
            isCalculateScore: row.is_calculate_score === true || row.is_calculate_score === 1,
          }
        : null;
    })
    .filter((row): row is SsmScoreConfig => row !== null);
};

const loKey = (fpId: number, psId: number, loId: number): string => `${fpId}_${psId}_${loId}`;

/** Chuyển `students[].point` của SSM thành map điểm đã có cho từng em. */
const parseExistingPoints = (point: unknown): { pointIds: Map<string, number>; gradingIds: Map<string, number> } => {
  const pointIds = new Map<string, number>();
  const gradingIds = new Map<string, number>();
  const ptObj = toObj(point);
  for (const fp of toArr(pick(ptObj, 'focal_points'))) {
    if (!isObj(fp)) continue;
    const fpId = num(fp.id);
    if (fpId === null) continue;
    for (const ps of toArr(pick(fp, 'power_standards'))) {
      if (!isObj(ps)) continue;
      const psId = num(ps.id);
      if (psId === null) continue;
      for (const lo of toArr(pick(ps, 'learning_outcomes'))) {
        if (!isObj(lo)) continue;
        const loId = num(lo.id);
        if (loId === null) continue;
        const pointId = num(lo.point_id);
        if (pointId !== null) pointIds.set(loKey(fpId, psId, loId), pointId);
        const gradingId = num(lo.grading_student_id);
        if (gradingId !== null) gradingIds.set(loKey(fpId, psId, loId), gradingId);
      }
    }
  }
  return { pointIds, gradingIds };
};

const studentName = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  if (isObj(raw)) return str((raw as { vi?: unknown }).vi);
  return '';
};

/**
 * Parse toàn bộ response `GET /v2/evaluation/class-subject-assessment?assessment_form_id&criteria_id&class_id`.
 * Ném lỗi tiếng Việt khi JSON không đúng hình để UI báo "SSM trả dữ liệu khác dự đoán".
 */
export const parseSsmCriteriaLoad = (payload: unknown): SsmCriteriaLoad => {
  const root = toObj(payload);
  if (!isObj(root) || Object.keys(root).length === 0) {
    throw new Error('SSM trả dữ liệu không đúng cấu trúc — cập nhật tiện ích rồi thử lại.');
  }
  const assessmentForm = toObj(pick(root, 'assessment_forms'));
  const scale = parseScale(assessmentForm);
  const students = toArr(pick(root, 'students')).flatMap((raw) => {
    if (!isObj(raw)) return [];
    const id = num(raw.id);
    if (id === null) return [];
    const { pointIds, gradingIds } = parseExistingPoints(pick(raw, 'point'));
    return [{ id, maHS: str(raw.code).trim(), name: studentName(raw.full_name) || str(raw.name), existingPointId: pointIds, existingGradingId: gradingIds }];
  });
  const los: SsmLoColumn[] = flattenLos(pick(assessmentForm, 'focal_points')).map((lo) => ({
    loId: lo.id, loCode: lo.code, text: lo.name, focalPointId: lo.fpId, powerStandardId: lo.psId,
  }));
  return {
    quarterHasBranchId: num(pick(root, 'quarter_has_branch_id')),
    resultAssessmentFormId: num(pick(root, 'result_assessment_form_id')),
    isApproved: pick(root, 'is_approved') === true,
    canEdit: pick(root, 'can_edit') !== false,
    scale,
    los,
    students,
  };
};

/** Hàng thang ứng với một mức app muốn ghi. `N` = hàng isNumber=false (chưa đánh giá). */
export const findScaleRow = (scale: readonly SsmScoreConfig[], mark: string): SsmScoreConfig | null => {
  if (mark === 'N') return scale.find((row) => !row.isNumber) ?? null;
  return scale.find((row) => row.isNumber && row.point === mark) ?? null;
};

export interface SsmSubject {
  id: number;
  name: string;
}

export const parseSsmSubjects = (payload: unknown): SsmSubject[] =>
  toArr(isObj(payload) ? pick(payload, 'data') : payload)
    .flatMap((item) => {
      if (!isObj(item)) return [];
      const id = num(item.id);
      const name = str(item.name || item.subject_name);
      return id !== null && name ? [{ id, name }] : [];
    });

export const parseSsmQuarters = (payload: unknown): SsmQuarter[] =>
  toArr(isObj(payload) ? pick(payload, 'data') : payload)
    .flatMap((q) => {
      if (!isObj(q)) return [];
      const id = num(q.id);
      if (id === null) return [];
      const name = str(q.name);
      if (!name) return [];
      const forms = toArr(q.assessment_forms)
        .flatMap((f) => {
          if (!isObj(f)) return [];
          const fid = num(f.id);
          const fname = str(f.assessment_name);
          if (fid === null || !fname) return [];
          return [{ id: fid, assessmentName: fname, criteriaId: num(f.criteria_id) }];
        });
      return [{ id, name, forms }];
    });
