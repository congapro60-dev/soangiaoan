/**
 * Server Proxy cho SSM (Edufit): web gọi tới server qua action 'ssmProxy',
 * server gọi thẳng sang `https://api-ssm.edufit.vn/api/` bằng token + workspace của giáo viên.
 * Không cần cài Extension trình duyệt, không lo lỗi CORS, không lo service worker ngủ.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';

type Body = Record<string, unknown>;

const SSM_API_BASE = 'https://api-ssm.edufit.vn/api/';
const MAX_BODY_BYTES = 2_000_000;

const posInt = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const isTeacher = async (idToken: unknown): Promise<boolean> => {
  if (typeof idToken !== 'string' || !idToken) return false;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.firebase?.sign_in_provider !== 'anonymous';
  } catch {
    return false;
  }
};

interface ProxyTarget {
  path: string;
  method?: 'GET' | 'POST';
  payload?: unknown;
}

const buildTarget = (op: string, params: Record<string, unknown> | undefined): ProxyTarget | null => {
  switch (op) {
    case 'profile':
      return { path: 'v1/profile' };
    case 'schoolYears':
      return { path: 'v1/school-years-branch?skip_paginate=true&is_active=all' };
    case 'teacherClasses': {
      const year = posInt(params?.schoolYearId);
      return year ? { path: `v1/class-teacher?school_year_id=${year}` } : null;
    }
    case 'classStudents': {
      const classId = posInt(params?.classId);
      return classId ? { path: `v1/students/class/${classId}?skipPagination=true&page=1&limit=500` } : null;
    }
    case 'subjectClass': {
      const classId = posInt(params?.classId);
      const yearId = posInt(params?.schoolYearId);
      return classId && yearId ? { path: `v1/subject-class?class_id=${classId}&school_year_id=${yearId}` } : null;
    }
    case 'evaluationQuarters': {
      const classId = posInt(params?.classId);
      const subjectId = posInt(params?.subjectId);
      const yearId = posInt(params?.schoolYearId);
      return classId && subjectId && yearId
        ? { path: `v3/evaluation/classes/${classId}/subjects/${subjectId}/quarters?school_year_id=${yearId}` }
        : null;
    }
    case 'criteriaAssessment': {
      // SSM V2 (10/2026): cây LO + thang nằm ở criteria-has-assessment-form/{criteriaId}?assessment_form_id={formId}.
      // Giữ fallback path cũ {formId} cho luồng còn thiếu criteriaId.
      const criteriaId = posInt(params?.criteriaId);
      const formId = posInt(params?.assessmentFormId);
      if (criteriaId && formId) {
        return { path: `v2/evaluation/criteria-has-assessment-form/${criteriaId}?assessment_form_id=${formId}` };
      }
      return formId ? { path: `v2/evaluation/criteria-has-assessment-form/${formId}` } : null;
    }
    case 'studentBySubject': {
      // SSM V2 (10/2026): học sinh + điểm hiện có của bài đánh giá (class-subject-assessment không còn trả students).
      const formId = posInt(params?.assessmentFormId);
      const criteriaId = posInt(params?.criteriaId);
      const classId = posInt(params?.classId);
      const subjectId = posInt(params?.subjectId);
      return formId && criteriaId && classId && subjectId
        ? { path: `v2/evaluation/student-by-subject?assessment_form_id=${formId}&criteria_id=${criteriaId}&class_id=${classId}&subject_id=${subjectId}` }
        : null;
    }
    case 'classSubjectAssessment': {
      const formId = posInt(params?.assessmentFormId);
      const criteriaId = posInt(params?.criteriaId);
      const classId = posInt(params?.classId);
      return formId && criteriaId && classId
        ? { path: `v2/evaluation/class-subject-assessment?assessment_form_id=${formId}&criteria_id=${criteriaId}&class_id=${classId}` }
        : null;
    }
    case 'writeLoGrades': {
      const formId = posInt(params?.assessmentFormId);
      const resultId = posInt(params?.resultAssessmentFormId);
      const body = params?.body as Record<string, unknown> | undefined;
      if ((!formId && !resultId) || !body || typeof body !== 'object') return null;
      const { class_id, criteria_id, quarter_has_branch_id, students } = body;
      if (!posInt(class_id) || !posInt(criteria_id) || !posInt(quarter_has_branch_id) || !Array.isArray(students) || students.length === 0) {
        return null;
      }
      return {
        path: resultId
          ? `v2/evaluation/update-result-grading-student/${resultId}`
          : `v2/evaluation/grading-student-by-assessment-form/${formId}`,
        method: 'POST',
        payload: body,
      };
    }
    default:
      return null;
  }
};

export const handleSsmProxyAction = async (body: Body, res: VercelResponse): Promise<boolean> => {
  if (String(body.action || '') !== 'ssmProxy') return false;

  if (!(await isTeacher(body.idToken))) {
    res.status(401).json({ ok: false, error: 'Cần đăng nhập tài khoản giáo viên.' });
    return true;
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const workspace = typeof body.workspace === 'string' ? body.workspace.trim() : '';
  if (!token) {
    res.status(400).json({ ok: false, error: 'Thiếu mã kết nối (access_token) của SSM.' });
    return true;
  }

  const op = typeof body.op === 'string' ? body.op.trim() : '';
  const params = body.params && typeof body.params === 'object' ? (body.params as Record<string, unknown>) : undefined;

  const target = buildTarget(op, params);
  if (!target) {
    res.status(422).json({ ok: false, error: 'Lệnh SSM hoặc tham số không hợp lệ.' });
    return true;
  }

  const payloadStr = target.payload ? JSON.stringify(target.payload) : undefined;
  if (payloadStr && payloadStr.length > MAX_BODY_BYTES) {
    res.status(413).json({ ok: false, error: 'Dữ liệu gửi lên quá lớn.' });
    return true;
  }

  try {
    const upstream = await fetch(SSM_API_BASE + target.path, {
      method: target.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'vi',
        Authorization: `Bearer ${token}`,
        ...(workspace ? { workspace } : {}),
        ...(payloadStr ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payloadStr,
      signal: AbortSignal.timeout(20000),
    });

    if (upstream.status === 401) {
      res.status(200).json({ ok: false, status: 401, error: 'Phiên kết nối SSM đã hết hạn. Hãy cập nhật lại mã kết nối SSM.' });
      return true;
    }

    if (!upstream.ok) {
      const raw = await upstream.text().catch(() => '');
      let detail = raw.slice(0, 500);
      try {
        const j = JSON.parse(raw) as unknown;
        detail = JSON.stringify(j).slice(0, 1200);
      } catch {
        /* giữ nguyên text gốc */
      }
      res.status(200).json({ ok: false, status: upstream.status, error: `SSM trả lỗi ${upstream.status}${detail ? `: ${detail}` : '.'}` });
      return true;
    }

    const json = await upstream.json();
    if (op === 'profile' && json && typeof json === 'object') {
      const respData = { ...json, ssmWorkspace: workspace };
      if (json.data && typeof json.data === 'object') {
        (json.data as Record<string, unknown>).ssmWorkspace = workspace;
      }
      res.status(200).json({ ok: true, data: respData });
      return true;
    }
    res.status(200).json({ ok: true, data: json });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ ok: false, error: `Không thể kết nối máy chủ SSM: ${msg}` });
    return true;
  }
};
