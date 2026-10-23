import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (message: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean;

const EXT_ID = 'ext-ssm';
let listener: Listener;
const tabsQuery = vi.fn();
const tabsSendMessage = vi.fn();
const tabsCreate = vi.fn();
const tabsRemove = vi.fn();
const storageGet = vi.fn();
const storageSet = vi.fn();
const storageRemove = vi.fn();
const fetchMock = vi.fn();

const appSender = { id: EXT_ID, origin: 'https://giaoandewey.vercel.app' };

const ask = (message: Record<string, unknown>, sender: object = appSender) =>
  new Promise<Record<string, unknown>>(resolve => {
    listener({ kind: 'ssm-request', ...message, params: { expectedEmails: ['teacher@example.test'], ...(message.params as object || {}) } }, sender, r => resolve(r as Record<string, unknown>));
  });

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

beforeAll(async () => {
  vi.stubGlobal('chrome', {
    runtime: {
      id: EXT_ID,
      getManifest: () => ({ version: '0.2.0' }),
      onMessage: { addListener: (fn: Listener) => { listener = fn; } },
    },
    tabs: {
      query: tabsQuery,
      sendMessage: tabsSendMessage,
      create: tabsCreate,
      remove: tabsRemove,
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    storage: {
      session: { get: storageGet, set: storageSet, remove: storageRemove },
    },
  });
  vi.stubGlobal('fetch', fetchMock);
  await import('./background.js');
});

beforeEach(() => {
  tabsQuery.mockReset().mockResolvedValue([{ id: 7, status: 'complete' }]);
  tabsSendMessage.mockReset().mockResolvedValue({ token: 'tok-abc', workspace: 'branch_23' });
  tabsCreate.mockReset().mockResolvedValue({ id: 99 });
  tabsRemove.mockReset().mockResolvedValue(undefined);
  // Mặc định: chưa có cache → đọc từ tab như cũ.
  storageGet.mockReset().mockResolvedValue({});
  storageSet.mockReset().mockResolvedValue(undefined);
  storageRemove.mockReset().mockResolvedValue(undefined);
  fetchMock.mockReset().mockImplementation(async url => String(url).endsWith('/profile') ? jsonResponse(200,{data:{email:'teacher@example.test'}}) : jsonResponse(200, { data: [{ id: 1, name: '11Columbus' }] }));
});

describe('cầu nối SSM — service worker', () => {
  it('gọi đúng API với vé SSM + header workspace như trang SSM', async () => {
    const res = await ask({ op: 'teacherClasses', params: { schoolYearId: 6 } });
    expect(res).toEqual({ ok: true, data: { data: [{ id: 1, name: '11Columbus' }] } });
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe('https://api-ssm.edufit.vn/api/v1/class-teacher?school_year_id=6');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok-abc', workspace: 'branch_23' });
  });

  it('không bao giờ trả vé về cho app', async () => {
    const res = await ask({ op: 'profile' });
    expect(JSON.stringify(res)).not.toContain('tok-abc');
  });

  it('chỉ nhận yêu cầu từ trang app', async () => {
    const res = await ask({ op: 'profile' }, { id: EXT_ID, origin: 'https://evil.example' });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bỏ qua tin không phải từ chính tiện ích', () => {
    expect(listener({ kind: 'ssm-request', op: 'profile' }, { id: 'other-ext', origin: appSender.origin }, () => {})).toBe(false);
  });

  it('từ chối lệnh lạ và tham số hỏng, không gọi mạng', async () => {
    expect((await ask({ op: 'deleteEverything' })).ok).toBe(false);
    expect((await ask({ op: 'classStudents', params: { classId: '1/../../v1/logout' } })).ok).toBe(false);
    expect((await ask({ op: 'teacherClasses', params: { schoolYearId: -1 } })).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ping trả phiên bản, không cần tab SSM', async () => {
    tabsQuery.mockResolvedValue([]);
    expect(await ask({ op: 'ping' })).toEqual({ ok: true, data: { version: '0.2.0' } });
  });

  it('báo rõ khi tab chưa có tiện ích / chưa đăng nhập', async () => {
    tabsSendMessage.mockRejectedValue(new Error('no receiver'));
    expect((await ask({ op: 'profile' })).error).toMatch(/tải lại \(F5\) tab SSM/);
    tabsSendMessage.mockResolvedValue({ token: '', workspace: '' });
    expect((await ask({ op: 'profile' })).error).toMatch(/chưa đăng nhập/);
  });

  it('401 → báo phiên hết hạn và xoá cache', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }));
    const res = await ask({ op: 'profile' });
    expect(res).toMatchObject({ ok: false, status: 401 });
    expect(res.error).toMatch(/hết hạn/);
    expect(storageRemove).toHaveBeenCalled();
  });

  it('đường dẫn học sinh theo lớp', async () => {
    await ask({ op: 'classStudents', params: { classId: 9681 } });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('https://api-ssm.edufit.vn/api/v1/students/class/9681?skipPagination=true&page=1&limit=500');
  });

  it('đọc quý điểm LO: đúng path v3 với class×subject×năm', async () => {
    await ask({ op: 'evaluationQuarters', params: { classId: 9681, subjectId: 12, schoolYearId: 6 } });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('https://api-ssm.edufit.vn/api/v3/evaluation/classes/9681/subjects/12/quarters?school_year_id=6');
    expect((await ask({ op: 'evaluationQuarters', params: { classId: 9681, subjectId: 12 } })).ok).toBe(false);
    expect((await ask({ op: 'evaluationQuarters', params: { classId: -1, subjectId: 12, schoolYearId: 6 } })).ok).toBe(false);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/v3/')).length).toBe(1);
  });

  it('đọc môn học của lớp: subject-class đúng path v1', async () => {
    await ask({ op: 'subjectClass', params: { classId: 9681, schoolYearId: 6 } });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('https://api-ssm.edufit.vn/api/v1/subject-class?class_id=9681&school_year_id=6');
    expect((await ask({ op: 'subjectClass', params: { classId: 9681 } })).ok).toBe(false);
  });

  it('đọc cây LO: path v2 theo assessment form', async () => {
    await ask({ op: 'criteriaAssessment', params: { assessmentFormId: 42 } });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('https://api-ssm.edufit.vn/api/v2/evaluation/criteria-has-assessment-form/42');
    expect((await ask({ op: 'criteriaAssessment', params: { assessmentFormId: 'x/../y' } })).ok).toBe(false);
  });

  it('đọc trạng thái chấm: class-subject-assessment đủ 3 tham số', async () => {
    await ask({ op: 'classSubjectAssessment', params: { assessmentFormId: 42, criteriaId: 7, classId: 9681 } });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('https://api-ssm.edufit.vn/api/v2/evaluation/class-subject-assessment?assessment_form_id=42&criteria_id=7&class_id=9681');
    expect((await ask({ op: 'classSubjectAssessment', params: { assessmentFormId: 42, criteriaId: 7 } })).ok).toBe(false);
  });

  it('ghi điểm LO: thêm mới khi chưa có resultAssessmentFormId', async () => {
    const validBody = {
      class_id: 9681,
      criteria_id: 7,
      quarter_has_branch_id: 5871,
      students: [{ id: 551, name: 'Minh', result: [{ learning_outcome_id: 34745, scoring_setting_id: 902, is_number: true, point: '4' }] }],
    };
    const res = await ask({ op: 'writeLoGrades', params: { assessmentFormId: 42, body: validBody } });
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe('https://api-ssm.edufit.vn/api/v2/evaluation/grading-student-by-assessment-form/42');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(validBody);
  });

  it('ghi điểm LO: cập nhật khi đã có resultAssessmentFormId', async () => {
    const validBody = {
      class_id: 9681,
      criteria_id: 7,
      quarter_has_branch_id: 5871,
      students: [{ id: 551, name: 'Minh', result: [{ learning_outcome_id: 34745, scoring_setting_id: 902, is_number: true, point: '4', grading_student_id: 123 }] }],
    };
    const res = await ask({ op: 'writeLoGrades', params: { resultAssessmentFormId: 88, body: validBody } });
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe('https://api-ssm.edufit.vn/api/v2/evaluation/update-result-grading-student/88');
    expect(init.method).toBe('POST');
  });

  it('ghi điểm LO: từ chối body sai hoặc thiếu trường bắt buộc', async () => {
    const badBody = { class_id: 9681, students: [] };
    const res = await ask({ op: 'writeLoGrades', params: { assessmentFormId: 42, body: badBody } });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/thiếu/);
  });

  describe('Hạng mục 5: Token Cache & Auto-Wake', () => {
    it('a live tab wins over a valid cache from another account', async () => {
      storageGet.mockResolvedValue({ ssmToken: 'old-account', ssmWorkspace: 'old-tenant', ssmCachedAt: Date.now() });
      tabsSendMessage.mockResolvedValue({ token: 'current-account', workspace: 'current-tenant' });
      await ask({ op: 'profile' });
      expect(tabsSendMessage).toHaveBeenCalledWith(7, { kind: 'ssm-session' });
      expect(fetchMock.mock.calls.at(-1)?.[1].headers).toMatchObject({ Authorization: 'Bearer current-account', workspace: 'current-tenant' });
    });
    it('requires matching account identity before reading a roster or attaching a file', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { data: { email: 'other@example.test' } }));
      expect((await ask({ op: 'classStudents', params: { classId: 9681, expectedEmails: ['teacher@example.test'] } })).ok).toBe(false);
      expect((await ask({ op: 'attachLoFile', params: { fileData: 'AA==', fileName: 'scores.xlsx', expectedEmails: ['teacher@example.test'] } })).ok).toBe(false);
      expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/profile'))).toBe(true);
      expect(tabsSendMessage.mock.calls.every(([, message]) => message.kind === 'ssm-session')).toBe(true);
    });
    it('dùng token cache khi còn hạn — không cần tab SSM', async () => {
      storageGet.mockResolvedValue({
        ssmToken: 'cached-tok',
        ssmWorkspace: 'cached-ws',
        ssmCachedAt: Date.now(),
      });
      // validateSession gọi v1/profile → trả 200 là token còn hạn.
      fetchMock.mockResolvedValue(jsonResponse(200, { data: { email: 'teacher@example.test' } }));
      tabsQuery.mockResolvedValue([]); // không có tab SSM nào
      const res = await ask({ op: 'profile' });
      expect(res.ok).toBe(true);
      expect(tabsCreate).not.toHaveBeenCalled();
      // Header dùng token từ cache.
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall[1].headers.Authorization).toBe('Bearer cached-tok');
    });

    it('tenant mismatch blocks roster and never sends the selected class request', async () => {
      expect((await ask({op:'classStudents',params:{classId:1,expectedWorkspace:'other-branch'}})).ok).toBe(false);
      expect(fetchMock.mock.calls.every(([url])=>String(url).endsWith('/profile'))).toBe(true);
    });
    it('token cache hết hạn → tự mở tab SSM ngầm', async () => {
      storageGet.mockResolvedValue({
        ssmToken: 'old-tok',
        ssmWorkspace: 'old-ws',
        ssmCachedAt: Date.now() - 13 * 60 * 60 * 1000, // quá 12h
      });
      tabsQuery.mockResolvedValue([]); // không có tab SSM
      // Giả lập tab nền tải xong ngay.
      const { tabs } = chrome as unknown as { tabs: { onUpdated: { addListener: (fn: (id: number, info: { status: string }) => void) => void } } };
      tabsCreate.mockImplementation(async () => {
        setTimeout(() => {
          const l = (tabs.onUpdated.addListener as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
          l?.(99, { status: 'complete' });
        }, 10);
        return { id: 99 };
      });
      const res = await ask({ op: 'profile' });
      expect(tabsCreate).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
      expect(tabsRemove).toHaveBeenCalledWith(99);
      expect(res.ok).toBe(true);
    });
    it('write op with no SSM tab opens a VISIBLE SSM tab and asks the teacher to open the form — no hidden tab, no fake success', async () => {
      tabsQuery.mockResolvedValue([]);
      tabsCreate.mockResolvedValue({ id: 99 });
      const result = await ask({ op: 'attachLoFile', params: { fileData: 'AA==', fileName: 'scores.xlsx', expectedEmails: ['teacher@example.test'] } });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('vào đúng trang cần điền');
      expect(tabsCreate).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
      expect(tabsSendMessage).not.toHaveBeenCalledWith(99, expect.objectContaining({ kind: 'ssm-attach-file' }));
    });
  });
});
