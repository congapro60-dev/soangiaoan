/**
 * Tải hộ file mẫu điểm LO của SSM khi giáo viên dán LINK (browser bị CORS chặn cdn-ssm).
 * Chỉ tải file TĨNH công khai ở `cdn-ssm.edufit.vn/export/evaluation/…xlsx` — KHÔNG đụng SSM,
 * KHÔNG vé đăng nhập. `resolveTemplateUrl` khoá host + đường dẫn để không thành proxy tải URL bậy.
 * Yêu cầu đăng nhập giáo viên để tránh mở đường tải cho người lạ.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { resolveTemplateUrl } from '../src/lib/ssm/templateLink.js';

type Body = Record<string, unknown>;

const MAX_BYTES = 5_000_000;

const isTeacher = async (idToken: unknown): Promise<boolean> => {
  if (typeof idToken !== 'string' || !idToken) return false;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.firebase?.sign_in_provider !== 'anonymous';
  } catch {
    return false;
  }
};

export const handleSsmTemplateAction = async (body: Body, res: VercelResponse): Promise<boolean> => {
  if (String(body.action || '') !== 'ssmFetchTemplate') return false;

  if (!(await isTeacher(body.idToken))) {
    res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
    return true;
  }
  const url = resolveTemplateUrl(typeof body.link === 'string' ? body.link : '');
  if (!url) {
    res.status(422).json({ error: 'Link không hợp lệ — dán link file điểm LO từ SSM (cdn-ssm.edufit.vn).' });
    return true;
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { redirect: 'follow' });
  } catch {
    res.status(502).json({ error: 'Không tải được file từ SSM — kiểm tra lại link.' });
    return true;
  }
  if (upstream.status === 403 || upstream.status === 404) {
    res.status(404).json({ error: 'Chưa có file này trên SSM — hãy bấm "Xuất Excel" bài đó trên SSM trước.' });
    return true;
  }
  if (!upstream.ok) {
    res.status(502).json({ error: `SSM trả lỗi ${upstream.status}.` });
    return true;
  }
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    res.status(413).json({ error: 'File quá lớn.' });
    return true;
  }
  const filename = decodeURIComponent(url.split('/').pop() || 'diem-LO.xlsx');
  res.status(200).json({ base64: buffer.toString('base64'), filename });
  return true;
};
