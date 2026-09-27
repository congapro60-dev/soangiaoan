// Service worker: nhận yêu cầu từ app, lấy phiên SSM từ tab SSM đang mở, gọi API SSM, trả JSON.
// Đợt 1 CHỈ ĐỌC: mọi lệnh là GET trong danh sách cố định dưới đây, không có lệnh tự do.
// Vé đăng nhập chỉ dùng trong hàm callSsm, không bao giờ trả về app hay ghi log.

const API = 'https://api-ssm.edufit.vn/api/';
const APP_ORIGINS = ['https://giaoandewey.vercel.app', 'http://localhost:3000'];
const MAX_BODY = 2_000_000;

const posInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** op → đường dẫn API. Trả null khi tham số không hợp lệ. */
const OPS = {
  ping: () => '',
  profile: () => 'v1/profile',
  schoolYears: () => 'v1/school-years-branch?skip_paginate=true&is_active=all',
  teacherClasses: (p) => {
    const year = posInt(p?.schoolYearId);
    return year ? `v1/class-teacher?school_year_id=${year}` : null;
  },
  classStudents: (p) => {
    const classId = posInt(p?.classId);
    // API SSM phân trang mặc định 20 dòng — xin đủ cả lớp.
    return classId ? `v1/students/class/${classId}?skipPagination=true&page=1&limit=500` : null;
  },
};

const findSsmTab = async () => {
  const tabs = await chrome.tabs.query({ url: 'https://ssm.edufit.vn/*' });
  return tabs.find((tab) => tab.status === 'complete') || tabs[0] || null;
};

const readSession = async () => {
  const tab = await findSsmTab();
  if (!tab?.id) return { error: 'Chưa mở SSM — mở ssm.edufit.vn trong một tab Edge và đăng nhập.' };
  try {
    const session = await chrome.tabs.sendMessage(tab.id, { kind: 'ssm-session' });
    if (!session?.token || !session.workspace) return { error: 'Tab SSM chưa đăng nhập — đăng nhập SSM rồi thử lại.' };
    return { session };
  } catch {
    return { error: 'Tab SSM mở trước khi cài tiện ích — tải lại (F5) tab SSM rồi thử lại.' };
  }
};

const callSsm = async (path, session) => {
  let response;
  try {
    response = await fetch(API + path, {
      method: 'GET',
      // Giống hệt trang SSM: thiếu header `workspace` thì API trả danh sách rỗng.
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'vi',
        Authorization: `Bearer ${session.token}`,
        workspace: session.workspace,
      },
    });
  } catch {
    return { ok: false, error: 'Không kết nối được SSM — kiểm tra mạng.' };
  }
  if (response.status === 401) return { ok: false, status: 401, error: 'Phiên SSM hết hạn — đăng nhập lại SSM.' };
  if (!response.ok) return { ok: false, status: response.status, error: `SSM trả lỗi ${response.status}.` };
  const text = await response.text();
  if (text.length > MAX_BODY) return { ok: false, error: 'Dữ liệu SSM quá lớn.' };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'SSM trả dữ liệu không đọc được.' };
  }
};

const handle = async (message, sender) => {
  const origin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
  if (!APP_ORIGINS.includes(origin)) return { ok: false, error: 'Trang này không được phép dùng cầu nối SSM.' };
  const build = OPS[message.op];
  if (!build) return { ok: false, error: 'Lệnh SSM không hợp lệ.' };
  const path = build(message.params);
  if (path === null) return { ok: false, error: 'Tham số không hợp lệ.' };
  if (message.op === 'ping') return { ok: true, data: { version: chrome.runtime.getManifest().version } };
  const { session, error } = await readSession();
  if (error) return { ok: false, error };
  return callSsm(path, session);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.kind !== 'ssm-request') return false;
  handle(message, sender).then(sendResponse, () => sendResponse({ ok: false, error: 'Lỗi tiện ích SSM.' }));
  return true;
});
