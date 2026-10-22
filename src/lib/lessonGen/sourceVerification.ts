import { sourceTextIsReadable, type LessonSourceBundle, type LessonSourceRecord } from './sourceIngestion.js';

export type SourceVerificationKind = 'math_expression' | 'table_or_figure' | 'canonical_gap';
export type SourceVerificationStatus = 'needs_review' | 'verified' | 'rejected';

export interface SourceVerificationRecord {
  id: string;
  sourceId: string;
  kind: SourceVerificationKind;
  locator: LessonSourceRecord['locator'];
  excerpt: string;
  status: SourceVerificationStatus;
}

export interface TeacherCanonicalSourceApproval {
  sourceId: string;
  sourceHash: string;
  durationMinutes: number;
  reviewerUid: string;
  approvedAt: string;
}

const mathExpression = /(?:[a-zA-Z]\s*_?\{?n\}?\s*=|[=≤≥≠]|\\(?:frac|sqrt|sum|sin|cos|tan))/;
const tableOrFigure = /(?:\||bảng|hình|đồ thị|biểu đồ)/i;

const record = (source: LessonSourceRecord, kind: SourceVerificationKind, index: number, excerpt: string): SourceVerificationRecord => ({
  id: `${source.id}:${kind}:${index}`,
  sourceId: source.id,
  kind,
  locator: source.locator,
  excerpt,
  status: 'needs_review',
});

export const buildSourceVerificationRecords = (bundle: LessonSourceBundle): SourceVerificationRecord[] => {
  const records: SourceVerificationRecord[] = [];
  for (const source of bundle.sources) {
    const lines = source.content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    lines.forEach((line, index) => {
      if (mathExpression.test(line)) records.push(record(source, 'math_expression', index, line));
      if (tableOrFigure.test(line)) records.push(record(source, 'table_or_figure', index, line));
    });
  }
  if (!bundle.sources.some(source => source.role === 'canonical')) {
    const first = bundle.sources[0];
    if (first) records.push(record(first, 'canonical_gap', records.length, 'Chưa có nguồn canonical xác minh phạm vi và nội dung Toán.'));
  }
  return records;
};

export const canMarkSourceRecordVerified = (record: SourceVerificationRecord): boolean =>
  record.kind !== 'canonical_gap';

export const canFreezeSourceBundle = (
  bundle: LessonSourceBundle,
  records: readonly SourceVerificationRecord[],
  teacherApproval?: TeacherCanonicalSourceApproval | null,
  ownerUid?: string,
): boolean => {
  if (!bundle.sources.length || !bundle.durationMinutes || bundle.durationMinutes <= 0) return false;
  if (bundle.sources.some(source => !sourceTextIsReadable(source.content))) return false;
  const expected = buildSourceVerificationRecords(bundle);
  if (records.length !== expected.length) return false;
  const supplied = new Map(records.map(record => [record.id, record]));
  if (supplied.size !== records.length) return false;
  for (const required of expected) {
    const actual = supplied.get(required.id);
    if (!actual || actual.sourceId !== required.sourceId || actual.kind !== required.kind
      || actual.excerpt !== required.excerpt || actual.locator.kind !== required.locator.kind
      || actual.locator.value !== required.locator.value) return false;
    if (required.kind !== 'canonical_gap' && actual.status !== 'verified') return false;
  }
  if (bundle.sources.some(source => source.role === 'canonical' && source.content.trim())) return true;
  if (!teacherApproval || !ownerUid || teacherApproval.reviewerUid !== ownerUid
    || teacherApproval.sourceHash !== bundle.sourceHash
    || teacherApproval.durationMinutes !== bundle.durationMinutes
    || !Number.isFinite(Date.parse(teacherApproval.approvedAt))) return false;
  return bundle.sources.some(source => source.id === teacherApproval.sourceId
    && (source.role === 'teacher_lesson' || source.role === 'teacher_authored')
    && Boolean(source.content.trim()));
};
