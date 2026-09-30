/// <reference types="node" />
/**
 * GỘP PHIÊN các tài khoản của CÙNG chủ dự án (`ADMIN_EMAILS`): đăng nhập Google bằng mail nào cũng
 * vào chung MỘT uid (tài khoản chính = mail đầu danh sách), nên giáo án, lớp, ví, cài đặt… dùng chung
 * mà không phải sao chép dữ liệu. Máy chủ xác minh token Google của mail phụ rồi cấp custom token
 * của uid chính; claim `linkedEmail` cho client biết mail Google thật đang đứng sau phiên.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { PRIMARY_ADMIN_EMAIL, isAdminEmail } from '../src/lib/admin/adminConfig.js';

type Body = Record<string, unknown>;

export const handleAdminLinkAction = async (body: Body, res: VercelResponse): Promise<boolean> => {
  if (body.action !== 'linkAdminSession') return false;
  try {
    const decoded = await getAuth().verifyIdToken(String(body.idToken || ''));
    const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
    const viaGoogle = decoded.firebase?.sign_in_provider === 'google.com';
    if (decoded.email_verified !== true || !viaGoogle || !isAdminEmail(email) || email === PRIMARY_ADMIN_EMAIL) {
      res.status(403).json({ error: 'Tài khoản này không thuộc nhóm quản trị cần gộp.' });
      return true;
    }
    const primary = await getAuth().getUserByEmail(PRIMARY_ADMIN_EMAIL);
    if (primary.uid === decoded.uid) {
      res.status(403).json({ error: 'Đã là tài khoản chính.' });
      return true;
    }
    const customToken = await getAuth().createCustomToken(primary.uid, { linkedEmail: email });
    res.status(200).json({ customToken, linkedEmail: email, primaryEmail: PRIMARY_ADMIN_EMAIL });
  } catch (error) {
    console.error('[admin-link] lỗi', error);
    res.status(401).json({ error: 'Không gộp được phiên đăng nhập.' });
  }
  return true;
};
