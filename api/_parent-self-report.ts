/**
 * Báo cáo TỰ CHỌN khoảng ngày cho phụ huynh (ngoài các kì giáo viên công bố): phụ huynh chọn "từ ngày … đến ngày …",
 * máy chủ dựng lại bằng CÙNG hàm `buildPeriodParentReport` mà giáo viên dùng — chỉ có bài đã duyệt (qua `buildParentSafeReport`),
 * không đáp án, không ghi chú nội bộ. Không có nhận xét của giáo viên (không gọi AI, không tốn ví).
 */
import type { VercelResponse } from '@vercel/node';
import { PARENT_BRANDING_DOC, PARENT_CONFIG_SUB, PARENT_PIN_RULE, PARENT_REPORTS_SUB, isValidParentPin, parentDeviceOf, sanitizeBranding, type ParentBrandingData, type ParentDevice } from '../src/lib/classroom/parentAccess.js';
import { STUDENT_PROFILES_COL, type StudentProfileDoc } from '../src/lib/classroom/types.js';
import { buildPeriodParentReport } from '../src/lib/classroom/parentReportBuilder.js';
import { dmy, periodError, type ReportPeriod } from '../src/lib/classroom/reportPeriod.js';
import { studentScoreView } from '../src/lib/classroom/scoreBook.js';
import { loadStudentRecordsForClass } from './_classroom-teacher.js';
import { readBook } from './_score-book.js';
import { resolveParentStudent, verifyParentPin } from './_parent-auth.js';
import { recordParentActivity } from './_parent-activity.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

/** Khoảng tối đa một lần xem (≈ một năm học) — chặn yêu cầu quét cả kho dữ liệu. */
export const MAX_SELF_REPORT_DAYS = 400;

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Nhận diện trường/giáo viên: đọc tài liệu nhỏ `parentConfig/branding` (giáo viên công bố là lưu). Lớp công bố từ trước khi có tài liệu này
 * thì quét báo cáo đã công bố của em MỘT lần rồi lưu lại — các lần sau chỉ đọc 1 tài liệu.
 */
const brandingFor = async (classRef: FirebaseFirestore.DocumentReference, studentId: string): Promise<ParentBrandingData | null> => {
  const ref = classRef.collection(PARENT_CONFIG_SUB).doc(PARENT_BRANDING_DOC);
  const saved = await ref.get();
  if (saved.exists) return sanitizeBranding(saved.data());
  const snap = await classRef.collection(PARENT_REPORTS_SUB).where('studentId', '==', studentId).get();
  const latest = snap.docs.map(d => d.data()).sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))[0];
  let branding: ParentBrandingData | null = null;
  try { branding = sanitizeBranding((JSON.parse(String(latest?.inputJson || 'null')) as { branding?: unknown } | null)?.branding); } catch { /* bản hỏng → không có nhận diện */ }
  await ref.set({ ...(branding ?? {}), updatedAt: new Date().toISOString() });
  return branding;
};

export const handleParentCustomReport = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const pin = body.pin;
  if (!isValidParentPin(pin)) return void res.status(400).json({ error: PARENT_PIN_RULE });
  const period: ReportPeriod = { kind: 'custom', from: String(body.from || ''), to: String(body.to || '') };
  const invalid = periodError(period);
  if (invalid) return void res.status(400).json({ error: invalid });
  if (daysBetween(period.from, period.to) > MAX_SELF_REPORT_DAYS) {
    return void res.status(400).json({ error: `Khoảng thời gian tối đa ${MAX_SELF_REPORT_DAYS} ngày. Hãy chọn khoảng ngắn hơn.` });
  }
  const target = await resolveParentStudent(db, body, res);
  if (!target) return;
  const { classDoc, studentId, studentSnap } = target;
  const device: ParentDevice = parentDeviceOf(body.device);
  // PIN còn là mã giáo viên cấp thì phụ huynh chưa được xem gì (phải đặt PIN riêng trước, như các báo cáo đã công bố).
  if (!(await verifyParentPin(db, target, pin, res, { device, requireParentSet: true }))) return;

  const classData = classDoc.data();
  const student = studentSnap.data() || {};
  const [records, book, profileSnap, branding] = await Promise.all([
    loadStudentRecordsForClass(db, classDoc.id, classData, studentId),
    readBook(db, classDoc.id),
    db.collection(STUDENT_PROFILES_COL).doc(studentId).get(),
    brandingFor(classDoc.ref, studentId),
  ]);
  const built = buildPeriodParentReport({
    studentId,
    studentName: String(student.name || ''),
    className: String(classData.name || ''),
    studentCode: typeof student.code === 'string' ? student.code : undefined,
    classGrade: typeof classData.grade === 'string' ? classData.grade : undefined,
    program: null,
    assignments: records.assignments,
    submissions: records.submissions,
    profile: profileSnap.exists ? (profileSnap.data() as StudentProfileDoc) : null,
    scoreView: studentScoreView(book, studentId),
  }, period);

  // kind 'custom' → tiêu đề đúng khoảng phụ huynh chọn, lọc năng lực theo học kì mà khoảng chạm tới (như báo cáo giáo viên).
  const input = { ...built.printInput, ...(branding ? { branding } : {}) };
  await recordParentActivity(db, classDoc.ref, studentId, 'custom', { device, detail: `${dmy(period.from)} – ${dmy(period.to)}` });
  res.status(200).json({ input });
};
