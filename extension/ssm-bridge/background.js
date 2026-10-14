// Service worker: nhận yêu cầu từ app, lấy phiên SSM từ tab SSM đang mở, gọi API SSM, trả JSON.
// Đợt 1 CHỈ ĐỌC + gắn file Excel đã điền (attachLoFile): mọi lệnh GET trong danh sách cố định,
// không có lệnh tự do. attachLoFile chỉ ĐIỀN file vào trang SSM — giáo viên tự bấm Lưu.
// Vé đăng nhập chỉ dùng trong hàm callSsm, không bao giờ trả về app hay ghi log.
//
// HẠNG MỤC 5 (Token Cache & Auto-Wake):
// - Ưu tiên đọc token đã cache trong chrome.storage.session (do ssm-session.js lưu).
// - Nếu chưa có cache hoặc token hết hạn: tự mở ngầm 1 tab SSM nền (active: false)
//   để lấy token, thay vì báo lỗi "Chưa mở SSM".

const API = 'https://api-ssm.edufit.vn/api/';
const APP_ORIGINS = ['https://giaoandewey.vercel.app', 'http://localhost:3000'];
const MAX_BODY = 2_000_000;
// Token cache quá 12 tiếng thì coi như cũ — thử validate trước khi dùng.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const posInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** op → đường dẫn API. Trả null khi tham số không hợp lệ. */
const OPS = {
  ping: () => '',
  profile: () => 'v1/profile',
  // HẠNG MỤC 1: app gửi file Excel đã điền điểm (base64) → gắn vào ô input file trên tab SSM.
  // Op này không gọi API SSM nên path là chuỗi rỗng đặc biệt, xử lý riêng trong handle().
  attachLoFile: () => '__attach__',
  autofillSsm: () => '__autofill__',
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

/** Đọc token đã cache trong chrome.storage.session (do ssm-session.js lưu). */
const readCachedSession = async () => {
  try {
    const { ssmToken, ssmWorkspace, ssmCachedAt } = await chrome.storage.session.get(
      ['ssmToken', 'ssmWorkspace', 'ssmCachedAt']
    );
    if (!ssmToken || !ssmWorkspace) return null;
    if (Date.now() - (ssmCachedAt || 0) > CACHE_TTL_MS) return null;
    return { token: ssmToken, workspace: ssmWorkspace };
  } catch {
    return null;
  }
};

const saveCachedSession = async (token, workspace) => {
  try {
    await chrome.storage.session.set({ ssmToken: token, ssmWorkspace: workspace, ssmCachedAt: Date.now() });
  } catch {
    // Bỏ qua khi storage bị chặn — lần sau đọc lại từ tab.
  }
};

/** Gọi thử API profile để kiểm tra token còn hạn không. */
const validateSession = async (session) => {
  try {
    const response = await fetch(API + 'v1/profile', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'vi',
        Authorization: `Bearer ${session.token}`,
        workspace: session.workspace,
      },
    });
    return response.status !== 401;
  } catch {
    // Không kết nối được mạng: giữ nguyên cache, để callSsm báo lỗi mạng sau.
    return true;
  }
};

/** Hỏi phiên đăng nhập từ tab SSM đang mở (qua content script ssm-session.js). */
const readSessionFromTab = async (tab) => {
  try {
    const session = await chrome.tabs.sendMessage(tab.id, { kind: 'ssm-session' });
    if (!session?.token || !session.workspace) return { error: 'Tab SSM chưa đăng nhập — đăng nhập SSM rồi thử lại.' };
    await saveCachedSession(session.token, session.workspace);
    return { session };
  } catch {
    return { error: 'Tab SSM mở trước khi cài tiện ích — tải lại (F5) tab SSM rồi thử lại.' };
  }
};

/**
 * Tự mở ngầm 1 tab SSM nền để lấy token khi người dùng quên mở tab SSM.
 * Tab nền (active: false) không làm phiền — đóng ngay sau khi lấy được phiên.
 */
const wakeSsmInBackground = async () => {
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: 'https://ssm.edufit.vn/', active: false });
  } catch {
    return { error: 'Không mở được tab SSM ngầm — mở ssm.edufit.vn trong một tab Edge và đăng nhập.' };
  }
  // Đợi trang tải xong (tối đa ~15s) để content script kịp đọc localStorage.
  const ready = await new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 15000);
    const listener = (tabId, info) => {
      if (tabId === tab.id && info.status === 'complete' && !done) {
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        // Thêm 1s cho content script khởi động.
        setTimeout(() => resolve(true), 1000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  try {
    if (!ready) return { error: 'Tab SSM ngầm tải quá lâu — mở ssm.edufit.vn trong một tab Edge và đăng nhập.' };
    const result = await readSessionFromTab(tab);
    return result;
  } finally {
    // Dọn tab nền sau khi xong việc.
    try { await chrome.tabs.remove(tab.id); } catch { /* tab đã đóng */ }
  }
};

/**
 * HẠNG MỤC 1 (1-Click Excel Relay): nhận file Excel đã điền điểm từ app (base64),
 * gửi cho content script ssm-autofill.js gắn vào ô <input type="file"> trên tab SSM.
 * Chỉ ĐIỀN và TÔ VIỀN — giáo viên tự bấm Lưu trên SSM.
 */
const attachFileToSsmTab = async (params) => {
  const fileData = params?.fileData;
  const fileName = params?.fileName || 'diem-lo-da-dien.xlsx';
  if (!fileData || typeof fileData !== 'string') return { ok: false, error: 'Thiếu dữ liệu file Excel.' };
  if (fileData.length > MAX_BODY * 2) return { ok: false, error: 'File Excel quá lớn.' };
  let tab = await findSsmTab();
  if (!tab?.id) {
    // Thử tự mở tab SSM ngầm rồi gắn file (kế thừa Auto-Wake của Hạng mục 5).
    const wake = await wakeSsmInBackground();
    if (wake.error) return { ok: false, error: wake.error };
    tab = await findSsmTab();
    if (!tab?.id) return { ok: false, error: 'Không mở được tab SSM.' };
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { kind: 'ssm-attach-file', fileData, fileName });
    if (!result?.ok) return { ok: false, error: result?.error || 'Không gắn được file lên trang SSM.' };
    return { ok: true, data: { attached: true } };
  } catch {
    return { ok: false, error: 'Tab SSM chưa tải xong tiện ích — tải lại (F5) tab SSM rồi thử lại.' };
  }
};

const autofillSsmTab = async (params) => {
  const fields = params?.fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    return { ok: false, error: 'Thieu danh sach noi dung can dien.' };
  }
  const tab = await findSsmTab();
  if (!tab?.id) return { ok: false, error: 'Chua mo trang SSM.' };
  try {
    const result = await chrome.tabs.sendMessage(tab.id, {
      kind: 'ssm-autofill',
      params: { fields, fieldSelector: params?.fieldSelector },
    });
    if (!result?.ok) return { ok: false, error: result?.error || 'Khong dien duoc.' };
    return { ok: true, data: result.data };
  } catch {
    return { ok: false, error: 'Tab SSM chua tai xong.' };
  }
};

const readSession = async () => {
  // 1. Ưu tiên token đã cache — không cần tab SSM mở.
  const cached = await readCachedSession();
  if (cached && await validateSession(cached)) return { session: cached };

  // 2. Thử đọc từ tab SSM đang mở.
  const tab = await findSsmTab();
  if (tab?.id) return readSessionFromTab(tab);

  // 3. Tự mở ngầm tab SSM nền để lấy token (Hạng mục 5: Auto-Wake).
  return wakeSsmInBackground();
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
  if (response.status === 401) {
    // Token hết hạn: xoá cache để lần sau lấy lại từ tab.
    try { await chrome.storage.session.remove(['ssmToken', 'ssmWorkspace', 'ssmCachedAt']); } catch { /* bỏ qua */ }
    return { ok: false, status: 401, error: 'Phiên SSM hết hạn — đăng nhập lại SSM.' };
  }
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
  // HẠNG MỤC 1: gắn file Excel vào trang SSM — không cần gọi API, chỉ cần tab SSM mở.
  if (message.op === 'attachLoFile') return attachFileToSsmTab(message.params);
  if (message.op === 'autofillSsm') return autofillSsmTab(message.params);
  const { session, error } = await readSession();
  if (error) return { ok: false, error };
  return callSsm(path, session);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.kind !== 'ssm-request') return false;
  handle(message, sender).then(sendResponse, () => sendResponse({ ok: false, error: 'Lỗi tiện ích SSM.' }));
  return true;
});
