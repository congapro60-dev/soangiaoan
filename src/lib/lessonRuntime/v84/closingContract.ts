export type V84ClosingStatus = 'collecting' | 'needs_teacher_review' | 'ready';
type Attendance = 'PRESENT' | 'LATE_JOINED' | 'ABSENT_CONFIRMED' | 'LEFT_CONFIRMED' | 'UNCONFIRMED';
type Evaluation = 'correct' | 'incorrect' | 'unsupported';
type EvidenceType = 'exact_answer' | 'open_response' | 'photo' | 'typed' | 'unknown';
type LocalizedCopy = { vi: string; en: string; ja: string };

export interface V84ClosingInput {
  roomId: string; closingRevision: number; contentHash: string;
  roster: Array<{ studentId: string; name: string; participantUid: string; attendance: Attendance }>;
  exitItems: Array<{ instanceId: string; questionId: string; criterionIds: string[]; supportsExactEvaluation: boolean }>;
  responses: Array<{ studentId: string; participantUid: string; instanceId: string; revision: number; value: string; evaluated: Evaluation; evidenceType: EvidenceType }>;
  selfAssessments: Array<{ studentId: string; participantUid: string; revision: number; criteria: Array<{ criterionId: string; value: 'not_started' | 'progressing' | 'achieved' | 'exceeded' }> }>;
  nextStepOptions: Array<{ id: string; label: LocalizedCopy; taskRef: string }>;
  nextSteps?: Array<{ studentId: string; nextStepId: string; responseRevision: number; taskRef: string }>;
}

export interface V84PublicClosing { closingRevision: number; status: V84ClosingStatus; classProgress: string; nextStepCounts: Record<string, number>; evidenceBasedStatement: string; localeCopy: Record<'vi' | 'en' | 'ja', { title: string; classProgress: string; evidenceBasedStatement: string }> }
export interface V84StudentClosing { status: 'collecting' | 'waiting_for_teacher' | 'ready'; evidenceStatementsByLocale: Record<'vi' | 'en' | 'ja', string[]>; nextActionCopy: LocalizedCopy | null; differentiatedHomework: Array<{ id: string; labelCopy: LocalizedCopy; taskRef: string }>; teacherMessageCopy?: LocalizedCopy }
export interface V84TeacherAnalytics { studentId: string; studentName: string; status: 'ready' | 'needs_teacher_review' | 'collecting'; evidenceItems: Array<{ instanceId: string; revision: number; evaluated: Evaluation; evidenceType: EvidenceType }>; selfAssessmentComparison: { submitted: boolean; matched: boolean | null }; requiresTeacherReview: boolean }
export interface V84ClosingResult { status: V84ClosingStatus; publicClosing: V84PublicClosing; studentClosing: Record<string, V84StudentClosing>; teacherAnalytics: Record<string, V84TeacherAnalytics> }

export const synthesizeV84Closing = (input: V84ClosingInput): V84ClosingResult => {
  if (!Number.isSafeInteger(input.closingRevision) || input.closingRevision < 1) throw new Error('CLOSING_REVISION_INVALID');
  if (!/^[a-f0-9]{64}$/.test(input.contentHash)) throw new Error('CLOSING_HASH_INVALID');
  const studentIds = new Set(input.roster.map(student => student.studentId));
  if (studentIds.size !== input.roster.length) throw new Error('CLOSING_ROSTER_DUPLICATE');
  const responseKeys = new Set<string>();
  for (const response of input.responses) {
    const key = `${response.studentId}:${response.instanceId}`;
    if (responseKeys.has(key)) throw new Error('CLOSING_DUPLICATE_RESPONSE');
    responseKeys.add(key);
    if (!studentIds.has(response.studentId) || !input.exitItems.some(item => item.instanceId === response.instanceId)
      || !Number.isSafeInteger(response.revision) || response.revision < 1) throw new Error('CLOSING_RESPONSE_INVALID');
  }
  const assessments = new Map(input.selfAssessments.map(item => [item.studentId, item]));
  const options = new Map(input.nextStepOptions.map(option => [option.id, option]));
  const nextSteps = new Map<string, { nextStepId: string; responseRevision: number; taskRef: string }>();
  for (const nextStep of input.nextSteps ?? []) {
    if (nextSteps.has(nextStep.studentId) || !studentIds.has(nextStep.studentId)
      || !Number.isSafeInteger(nextStep.responseRevision) || nextStep.responseRevision < 1
      || options.get(nextStep.nextStepId)?.taskRef !== nextStep.taskRef) throw new Error('CLOSING_NEXT_STEP_INVALID');
    nextSteps.set(nextStep.studentId, nextStep);
  }
  const studentClosing: Record<string, V84StudentClosing> = {};
  const teacherAnalytics: Record<string, V84TeacherAnalytics> = {};
  const nextStepCounts: Record<string, number> = {};
  for (const student of input.roster) {
    const responses = input.responses.filter(response => response.studentId === student.studentId);
    const assessment = assessments.get(student.studentId);
    const selected = nextSteps.get(student.studentId);
    const selectedOption = selected ? options.get(selected.nextStepId) ?? null : null;
    const unsupported = responses.some(response => response.evaluated === 'unsupported' || ['photo', 'open_response'].includes(response.evidenceType)
      || !input.exitItems.find(item => item.instanceId === response.instanceId)?.supportsExactEvaluation);
    const requiredCriteria = [...new Set(input.exitItems.flatMap(item => item.criterionIds))];
    const assessmentComplete = Boolean(assessment && requiredCriteria.length > 0
      && requiredCriteria.every(id => assessment.criteria.some(criterion => criterion.criterionId === id)));
    const missing = input.exitItems.length === 0 || responses.length !== input.exitItems.length || !assessmentComplete
      || (options.size > 0 && !selectedOption);
    const needsReview = unsupported || missing || student.attendance === 'UNCONFIRMED';
    const status: V84StudentClosing['status'] = missing ? 'collecting' : needsReview ? 'waiting_for_teacher' : 'ready';
    const matching = assessment ? assessment.criteria.filter(item => item.value === 'achieved' || item.value === 'exceeded').map(item => item.criterionId) : [];
    if (selectedOption) nextStepCounts[selectedOption.id] = (nextStepCounts[selectedOption.id] ?? 0) + 1;
    const task = status === 'ready' ? selectedOption : null;
    const evidenceCopy = (locale: 'vi' | 'en' | 'ja') => responses.map(response => {
      const number = input.exitItems.findIndex(item => item.instanceId === response.instanceId) + 1;
      const kind = response.evaluated === 'correct' && response.evidenceType === 'exact_answer' ? 'correct'
        : response.evaluated === 'incorrect' && response.evidenceType === 'exact_answer' ? 'incorrect' : 'review';
      const text = locale === 'vi'
        ? kind === 'correct' ? 'Câu trả lời trùng đáp án đã lưu.' : kind === 'incorrect' ? 'Cần xem lại câu trả lời cùng thầy/cô.' : 'Bài làm đang chờ thầy/cô xem lại.'
        : locale === 'en' ? kind === 'correct' ? 'The response matches the stored answer.' : kind === 'incorrect' ? 'Check this response with your teacher.' : 'Your teacher will take a look at this work.'
          : kind === 'correct' ? '保存された解答と一致しています。' : kind === 'incorrect' ? '先生と一緒にこの解答を確認しましょう。' : '先生の確認を待っています。';
      return locale === 'vi' ? `Câu ${number}: ${text}` : locale === 'en' ? `Item ${number}: ${text}` : `設問${number}: ${text}`;
    });
    const evidenceStatementsByLocale = { vi: evidenceCopy('vi'), en: evidenceCopy('en'), ja: evidenceCopy('ja') };
    const teacherMessageCopy = { vi: 'Bài làm đang chờ thầy/cô xem lại.', en: 'Your teacher will take a look at this work.', ja: '先生の確認を待っています。' };
    studentClosing[student.studentId] = {
      status, evidenceStatementsByLocale, nextActionCopy: task?.label ?? null,
      differentiatedHomework: task ? [{ id: task.id, labelCopy: task.label, taskRef: task.taskRef }] : [],
      ...(needsReview ? { teacherMessageCopy } : {}),
    };
    // ponytail: comparison covers exact Exit answers only, never a mastery judgement; open evidence needs teacher review.
    const matched = !missing && !unsupported && matching.length > 0 ? matching.every(criterionId => {
      const linked = responses.filter(response => input.exitItems.find(item => item.instanceId === response.instanceId)?.criterionIds.includes(criterionId));
      return linked.length > 0 && linked.every(response => response.evaluated === 'correct');
    }) : null;
    teacherAnalytics[student.studentId] = { studentId: student.studentId, studentName: student.name,
      status: status === 'waiting_for_teacher' ? 'needs_teacher_review' : status,
      evidenceItems: responses.map(response => ({ instanceId: response.instanceId, revision: response.revision, evaluated: response.evaluated, evidenceType: response.evidenceType })),
      selfAssessmentComparison: { submitted: Boolean(assessment), matched }, requiresTeacherReview: needsReview };
  }
  const expectedStudents = input.roster.filter(student => student.attendance !== 'ABSENT_CONFIRMED' && student.attendance !== 'LEFT_CONFIRMED');
  const allReady = expectedStudents.length > 0 && expectedStudents.every(student => studentClosing[student.studentId].status === 'ready');
  const anyEvidence = input.responses.length > 0 || input.selfAssessments.length > 0;
  const status: V84ClosingStatus = allReady ? 'ready' : anyEvidence ? 'needs_teacher_review' : 'collecting';
  return { status,
    publicClosing: { closingRevision: input.closingRevision, status, classProgress: status === 'collecting' ? 'Lớp chưa đủ minh chứng để chốt.' : status === 'ready' ? 'Lớp đã hoàn tất vòng kết thúc.' : 'Lớp còn minh chứng cần thầy/cô xem lại.', nextStepCounts,
      evidenceBasedStatement: status === 'ready' ? 'Tổng kết được tạo từ Phiếu ra lớp và tự đánh giá đã nhận.' : 'Chưa thể kết luận đầy đủ từ dữ liệu hiện có.',
      localeCopy: {
        vi: { title: 'Tổng kết lớp học', classProgress: status === 'collecting' ? 'Lớp chưa đủ minh chứng để chốt.' : status === 'ready' ? 'Lớp đã hoàn tất vòng kết thúc.' : 'Lớp còn minh chứng cần thầy/cô xem lại.', evidenceBasedStatement: status === 'ready' ? 'Tổng kết được tạo từ Phiếu ra lớp và tự đánh giá đã nhận.' : 'Chưa thể kết luận đầy đủ từ dữ liệu hiện có.' },
        en: { title: 'Class summary', classProgress: status === 'collecting' ? 'The class has not yet provided enough evidence to close.' : status === 'ready' ? 'The class has completed the closing activities.' : 'Some evidence needs teacher review.', evidenceBasedStatement: status === 'ready' ? 'This summary uses submitted exit responses and self-assessments.' : 'The available evidence does not support a complete conclusion.' },
        ja: { title: 'クラスのまとめ', classProgress: status === 'collecting' ? 'まとめに必要な学習の証拠がまだ足りません。' : status === 'ready' ? 'クラスはまとめの活動を完了しました。' : '先生の確認が必要な証拠があります。', evidenceBasedStatement: status === 'ready' ? '提出された退室時の回答と自己評価に基づくまとめです。' : '現在の証拠だけでは十分な結論を出せません。' },
      } },
    studentClosing, teacherAnalytics };
};
