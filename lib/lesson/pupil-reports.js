import { createHash, randomUUID } from 'node:crypto';

const CATEGORIES = new Set(['question_repeated', 'content', 'progress', 'display', 'other']);
const STATUSES = new Set(['new', 'reviewed', 'resolved', 'archived', 'restore']);
export const MAX_ROOM_REPORTS = 1000;
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const sha = value => createHash('sha256').update(value).digest('hex');
const changed = result => Number(result?.meta?.changes ?? result?.changes ?? 0);
const confirmation = row => ({ reportId: row.id, status: 'received' });
const teacherGuard = `EXISTS(SELECT 1 FROM rooms r LEFT JOIN room_memberships m ON m.room_id=r.id AND m.account_id=? LEFT JOIN system_hosts sh ON sh.account_id=? WHERE r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id AND (r.owner_account_id=? OR (m.role IN ('owner','cohost') AND m.revoked_at IS NULL)) AND sh.revoked_at IS NULL)`;

export function createPupilReportService({ db, lessonService, now = () => Date.now() }) {
  const query = (sql, ...args) => db.prepare(sql).bind(...args);
  const priorReport = (id, learnerId, requestId) => query('SELECT id,fingerprint FROM lesson_pupil_reports WHERE session_id=? AND learner_id=? AND request_id=?', id, learnerId, requestId).first();
  return {
    async submit(input) {
      const allowed = ['id', 'learnerToken', 'actingLearnerId', 'requestId', 'category', 'description', 'taskId'];
      if (!input || Object.keys(input).some(key => !allowed.includes(key)) || !validId(input.id) || !validId(input.requestId) || input.requestId.length > 80 || !CATEGORIES.has(input.category) || typeof input.description !== 'string' || [...input.description.trim()].length < 10 || input.description.trim().length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.description) || input.taskId !== undefined && !validId(input.taskId) || input.actingLearnerId !== undefined && !validId(input.actingLearnerId)) throw Error('INVALID_BODY');
      const { id, learnerToken, actingLearnerId, requestId, category, taskId } = input;
      if (typeof learnerToken !== 'string' || !learnerToken || learnerToken.length > 256) throw Error('FORBIDDEN');
      const description = input.description.trim();
      if (description.includes(learnerToken) || /\bBearer\s+[A-Za-z0-9_.-]{12,}|\bsk-[A-Za-z0-9_-]{16,}/i.test(description)) throw Error('REPORT_SENSITIVE_TEXT');
      const { view, revision } = await lessonService.getSession({ id, learnerToken, actingLearnerId });
      if (!view?.learnerId) throw Error('FORBIDDEN');
      const learnerId = view.learnerId;
      const fingerprint = sha(JSON.stringify({ category, description, taskId: taskId ?? null }));
      const replay = row => { if (row.fingerprint !== fingerprint) throw Error('REQUEST_ID_CONFLICT'); return confirmation(row); };
      const prior = await priorReport(id, learnerId, requestId);
      if (prior) return replay(prior);
      let activityId = view.currentActivity?.id || null;
      if (taskId) {
        if (view.practice?.task?.id === taskId) activityId = view.practice.activityId;
        else if (view.classEvent?.own?.task?.id !== taskId && !(view.tasks || []).some(task => task.id === taskId)) throw Error('INVALID_REPORT_CONTEXT');
      }
      const time = now(), tokenHash = sha(learnerToken), reportId = randomUUID();
      // The INSERT owns quota and authority checks, including concurrent requests across Workers.
      const credential = actingLearnerId !== undefined
        ? `EXISTS(SELECT 1 FROM lesson_devices d JOIN lesson_device_members dm ON dm.device_id=d.id AND dm.session_id=d.session_id JOIN rooms ir ON ir.id=s.room_id LEFT JOIN room_memberships im ON im.room_id=ir.id AND im.account_id=d.issued_by LEFT JOIN system_hosts ish ON ish.account_id=d.issued_by WHERE d.session_id=s.id AND d.token_hash=? AND d.kind='B' AND d.revoked_at IS NULL AND d.expires_at>? AND dm.learner_id=l.learner_id AND dm.class_member_id=l.class_member_id AND ish.revoked_at IS NULL AND (ir.owner_account_id=d.issued_by OR (im.role IN ('owner','cohost') AND im.revoked_at IS NULL)))`
        : `(l.token_hash=? OR (s.status='concluded' AND EXISTS(SELECT 1 FROM lesson_class_login_sessions cs WHERE cs.member_id=l.class_member_id AND cs.token_hash=? AND cs.expires_at>?)))`;
      const credentials = actingLearnerId !== undefined ? [tokenHash, time] : [tokenHash, tokenHash, time];
      const inserted = await query(`INSERT INTO lesson_pupil_reports(id,session_id,learner_id,request_id,fingerprint,category,description,package_hash,activity_id,task_id,status,created_at,updated_at)
        SELECT ?,s.id,l.learner_id,?,?,?,?,s.package_hash,?,?,'new',?,? FROM lesson_sessions s
        JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id
        JOIN lesson_learners l ON l.session_id=s.id AND l.learner_id=? AND l.present=1
        WHERE s.id=? AND s.revision=? AND ${credential}
        AND (s.class_id IS NULL OR EXISTS(SELECT 1 FROM lesson_class_members cm JOIN lesson_classes cc ON cc.id=cm.class_id WHERE cm.id=l.class_member_id AND cm.class_id=s.class_id AND cm.revoked_at IS NULL AND cc.deleted_at IS NULL AND cc.owner_account_id=s.owner_account_id))
        AND (SELECT count(*) FROM lesson_pupil_reports WHERE session_id=s.id AND learner_id=l.learner_id AND created_at>?)<3
        AND (SELECT count(*) FROM lesson_pupil_reports WHERE session_id=s.id)<?
        ON CONFLICT(session_id,learner_id,request_id) DO NOTHING`, reportId, requestId, fingerprint, category, description, activityId, taskId || null, time, time, learnerId, id, revision, ...credentials, time - 60000, MAX_ROOM_REPORTS).run();
      if (changed(inserted)) return confirmation({ id: reportId });
      const concurrent = await priorReport(id, learnerId, requestId);
      if (concurrent) return replay(concurrent);
      await lessonService.getSession({ id, learnerToken, actingLearnerId });
      const count = await query('SELECT count(*) total, sum(CASE WHEN learner_id=? AND created_at>? THEN 1 ELSE 0 END) recent FROM lesson_pupil_reports WHERE session_id=?', learnerId, time - 60000, id).first();
      if (count.total >= MAX_ROOM_REPORTS) throw Error('REPORT_ROOM_LIMIT');
      if (count.recent >= 3) throw Error('REPORT_RATE_LIMIT');
      throw Error('REPORT_CONTEXT_CHANGED');
    },
    async list({ id, accountId }) {
      if (!validId(id)) throw Error('INVALID_BODY');
      const { state } = await lessonService.assessmentContext({ id, accountId });
      const rows = await query(`SELECT p.* FROM lesson_pupil_reports p JOIN lesson_sessions s ON s.id=p.session_id WHERE s.id=? AND ${teacherGuard} ORDER BY p.created_at DESC,p.id LIMIT ?`, id, accountId, accountId, accountId, MAX_ROOM_REPORTS).all();
      return { reports: (rows.results || []).map(row => {
        const activityIndex = (state.package?.activities || []).findIndex(activity => activity.id === row.activity_id);
        const taskIndex = (state.package?.tasks || []).findIndex(task => task.id === row.task_id);
        return { id: row.id, category: row.category, description: row.description, packageHash: row.package_hash, activityId: row.activity_id, activityLabel: activityIndex >= 0 ? `Hoạt động ${activityIndex + 1}` : 'Phòng chờ', taskId: row.task_id, taskLabel: taskIndex >= 0 ? `Câu hỏi ${taskIndex + 1} trong học liệu` : row.task_id ? 'Câu hỏi luyện tập' : null, learnerName: state.roster?.[row.learner_id]?.name || 'Học sinh', status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
      }) };
    },
    async update({ id, accountId, reportId, status }) {
      if (!validId(id) || !validId(reportId) || !STATUSES.has(status)) throw Error('INVALID_BODY');
      await lessonService.assessmentContext({ id, accountId });
      const result = await query(`UPDATE lesson_pupil_reports SET
        previous_status=CASE WHEN ?='archived' AND status!='archived' THEN status ELSE previous_status END,
        status=CASE WHEN ?='restore' THEN COALESCE(previous_status,'new') ELSE ? END,updated_at=?
        WHERE id=? AND session_id=? AND (?='archived' OR (?='restore' AND status='archived') OR (?!='restore' AND status!='archived'))
        AND EXISTS(SELECT 1 FROM lesson_sessions s WHERE s.id=lesson_pupil_reports.session_id AND ${teacherGuard})`, status, status, status, now(), reportId, id, status, status, status, accountId, accountId, accountId).run();
      if (!changed(result)) throw Error('REPORT_NOT_FOUND');
      return { ok: true };
    },
  };
}
