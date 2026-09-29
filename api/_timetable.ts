/**
 * Tải hộ thời khoá biểu xuất bản của Prime Timetable khi giáo viên dán LINK
 * (primetimetable.com không cho trình duyệt đọc chéo trang).
 * Chỉ gọi đúng `primetimetable.com/api/v2/timetables/{id}/` — id đã lọc bằng `primeTimetableId`,
 * nên không thành proxy tải URL bậy. Yêu cầu đăng nhập giáo viên.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { primeTimetableId } from '../src/lib/schedule/primeTimetable.js';

type Body = Record<string, unknown>;

const MAX_BYTES = 10_000_000;
/** Chỉ giữ phần app đọc tới — bỏ phòng học, kiểu thẻ, bố cục xem… cho nhẹ đường truyền. */
const KEEP = ['id', 'name', 'days', 'periods', 'subjects', 'teachers', 'classes', 'activities'] as const;

const isTeacher = async (idToken: unknown): Promise<boolean> => {
  if (typeof idToken !== 'string' || !idToken) return false;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.firebase?.sign_in_provider !== 'anonymous';
  } catch {
    return false;
  }
};

export const handleTimetableAction = async (body: Body, res: VercelResponse): Promise<boolean> => {
  if (String(body.action || '') !== 'fetchPrimeTimetable') return false;

  if (!(await isTeacher(body.idToken))) {
    res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
    return true;
  }
  const id = primeTimetableId(typeof body.link === 'string' ? body.link : '');
  if (!id) {
    res.status(422).json({ error: 'Link không hợp lệ — dán link xem thời khoá biểu của Prime Timetable (primetimetable.com/publish/?id=…).' });
    return true;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://primetimetable.com/api/v2/timetables/${id}/`, { headers: { Accept: 'application/json' } });
  } catch {
    res.status(502).json({ error: 'Không tải được thời khoá biểu — kiểm tra lại link.' });
    return true;
  }
  if (upstream.status === 403 || upstream.status === 404) {
    res.status(404).json({ error: 'Không thấy thời khoá biểu này — có thể trường chưa bật chế độ xem công khai hoặc đã gỡ.' });
    return true;
  }
  if (!upstream.ok) {
    res.status(502).json({ error: `Prime Timetable trả lỗi ${upstream.status}.` });
    return true;
  }
  const text = await upstream.text();
  if (text.length > MAX_BYTES) {
    res.status(413).json({ error: 'Thời khoá biểu quá lớn.' });
    return true;
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    res.status(502).json({ error: 'Dữ liệu thời khoá biểu không đọc được.' });
    return true;
  }
  res.status(200).json({ timetable: Object.fromEntries(KEEP.map((k) => [k, data[k]])) });
  return true;
};
