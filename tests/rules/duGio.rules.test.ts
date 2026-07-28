/**
 * Kiểm thử firestore.rules cho module dự giờ.
 *
 *   npm run test:rules
 *
 * Chạy trên Firestore emulator (firebase emulators:exec). Không chạm production.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const TRUONG = 'thedeweyschools.edu.vn';

const UID_BGH = 'uid-bgh';
const UID_TO_TRUONG = 'uid-to-truong';
const UID_TO_TRUONG_KHAC = 'uid-to-truong-khac';
const UID_GIAO_VIEN = 'uid-giao-vien';

/** Token giả lập: email trường + đã xác minh + custom claim vai_tro. */
const tokenTruong = (local: string, vaiTro?: string) => ({
  email: `${local}@${TRUONG}`,
  email_verified: true,
  ...(vaiTro ? { vai_tro: vaiTro } : {}),
});

let testEnv: RulesTestEnvironment;

/** Biên bản mẫu do UID_TO_TRUONG lập, về giáo viên UID_GIAO_VIEN. */
const bienBanMau = (ghiDe: Record<string, unknown> = {}) => ({
  gvId: 'gv-01',
  gvUid: UID_GIAO_VIEN,
  nguoiDuUid: UID_TO_TRUONG,
  ngay: new Date('2026-03-10'),
  mon: 'Toán',
  lop: '10A1',
  bai: 'Định lí Vi-ét',
  bienBan: '7:30 GV đứng cửa lớp chào từng HS...',
  trangThai: 'nhap',
  ...ghiDe,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'dugio-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Gieo dữ liệu bỏ qua rules để các ca đọc/sửa/xoá có cái mà thao tác.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'duGio/bb1'), bienBanMau());
    await setDoc(doc(db, 'duGio/bb-khac'), bienBanMau({ nguoiDuUid: UID_TO_TRUONG_KHAC }));
    await setDoc(doc(db, 'duGio/bb-da-trao-doi'), bienBanMau({ trangThai: 'da_trao_doi' }));
    await setDoc(doc(db, 'lessonPlans/ga1'), { userId: UID_GIAO_VIEN, isPublic: false, title: 'Giáo án A' });
  });
});

const dbCuaBGH = () => testEnv.authenticatedContext(UID_BGH, tokenTruong('bgh', 'bgh')).firestore();
const dbCuaToTruong = () => testEnv.authenticatedContext(UID_TO_TRUONG, tokenTruong('totruong', 'to_truong')).firestore();
const dbCuaGiaoVien = () => testEnv.authenticatedContext(UID_GIAO_VIEN, tokenTruong('giaovien', 'giao_vien')).firestore();

describe('duGio · chặn truy cập', () => {
  it('1. Không đăng nhập → DENY đọc duGio/bb1', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'duGio/bb1')));
  });

  it('2. Gmail cá nhân ngoài trường (đã verified) → DENY', async () => {
    const db = testEnv
      .authenticatedContext('uid-nguoi-la', { email: 'nguoila@gmail.com', email_verified: true, vai_tro: 'bgh' })
      .firestore();
    await assertFails(getDoc(doc(db, 'duGio/bb1')));
  });

  it('3. Email trường nhưng email_verified = false → DENY', async () => {
    const db = testEnv
      .authenticatedContext('uid-chua-xac-minh', { email: `chuaxacminh@${TRUONG}`, email_verified: false, vai_tro: 'bgh' })
      .firestore();
    await assertFails(getDoc(doc(db, 'duGio/bb1')));
  });

  it('4. Email trường, verified, KHÔNG có claim vai_tro → DENY', async () => {
    const db = testEnv.authenticatedContext('uid-khong-vai-tro', tokenTruong('khongvaitro')).firestore();
    await assertFails(getDoc(doc(db, 'duGio/bb1')));
  });
});

describe('duGio · đọc', () => {
  it('5. to_truong đọc biên bản mình lập → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaToTruong(), 'duGio/bb1')));
  });

  it('6. to_truong đọc biên bản của tổ trưởng khác → DENY', async () => {
    await assertFails(getDoc(doc(dbCuaToTruong(), 'duGio/bb-khac')));
  });

  it('7. bgh đọc biên bản của bất kỳ ai → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaBGH(), 'duGio/bb-khac')));
  });

  // CA CANH CỜ. Khẳng định choGVXemBienBan() đang trả về false.
  // Khi BGH quyết định bật cờ, ca này sẽ FAIL — đó là chủ đích: nó buộc người
  // sửa phải nhận ra mình vừa đổi một CHÍNH SÁCH, không phải một dòng code.
  // Lúc đó đổi assertFails → assertSucceeds và ghi lại quyết định của BGH.
  it('8. giao_vien đọc biên bản về chính mình (da_trao_doi) → DENY (cờ đang tắt)', async () => {
    await assertFails(getDoc(doc(dbCuaGiaoVien(), 'duGio/bb-da-trao-doi')));
  });
});

describe('duGio · tạo', () => {
  it('9. to_truong tạo với nguoiDuUid = mình, trangThai = nhap → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbCuaToTruong(), 'duGio/bb-moi'), bienBanMau()));
  });

  it('10. to_truong tạo với nguoiDuUid của người khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbCuaToTruong(), 'duGio/bb-moi'), bienBanMau({ nguoiDuUid: UID_TO_TRUONG_KHAC })),
    );
  });

  it('11. to_truong tạo thẳng với trangThai = da_chot → DENY', async () => {
    await assertFails(setDoc(doc(dbCuaToTruong(), 'duGio/bb-moi'), bienBanMau({ trangThai: 'da_chot' })));
  });

  it('12. Tạo thiếu trường bắt buộc (bỏ gvId) → DENY', async () => {
    const { gvId: _bo, ...thieu } = bienBanMau();
    await assertFails(setDoc(doc(dbCuaToTruong(), 'duGio/bb-moi'), thieu));
  });
});

describe('duGio · sửa và xoá', () => {
  it('13. to_truong sửa biên bản của mình ở trangThai nhap → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbCuaToTruong(), 'duGio/bb1'), { bienBan: 'ghi chép bổ sung' }));
  });

  it('14. to_truong sửa biên bản đã da_trao_doi → DENY (biên bản đóng băng)', async () => {
    await assertFails(updateDoc(doc(dbCuaToTruong(), 'duGio/bb-da-trao-doi'), { bienBan: 'sửa lại sau khi họp' }));
  });

  it('15. to_truong đổi nguoiDuUid sang người khác → DENY', async () => {
    await assertFails(updateDoc(doc(dbCuaToTruong(), 'duGio/bb1'), { nguoiDuUid: UID_TO_TRUONG_KHAC }));
  });

  it('16. to_truong xoá → DENY; bgh xoá → ALLOW', async () => {
    await assertFails(deleteDoc(doc(dbCuaToTruong(), 'duGio/bb1')));
    await assertSucceeds(deleteDoc(doc(dbCuaBGH(), 'duGio/bb1')));
  });
});

// Lưới an toàn: khối dự giờ được CHÈN vào một file đang phục vụ tính năng chạy
// thật. Nếu chèn sai chỗ làm hỏng lessonPlans, hai ca này báo ngay.
describe('không phá vỡ tính năng cũ · lessonPlans', () => {
  it('17. Người dùng thường đọc/ghi lessonPlans của chính mình → ALLOW', async () => {
    const db = testEnv.authenticatedContext(UID_GIAO_VIEN, { email: 'ai-cung-duoc@gmail.com' }).firestore();
    await assertSucceeds(getDoc(doc(db, 'lessonPlans/ga1')));
    await assertSucceeds(updateDoc(doc(db, 'lessonPlans/ga1'), { title: 'Giáo án A (sửa)' }));
  });

  it('18. Người dùng thường đọc lessonPlans của người khác khi isPublic = false → DENY', async () => {
    const db = testEnv.authenticatedContext('uid-nguoi-khac', { email: 'nguoikhac@gmail.com' }).firestore();
    await assertFails(getDoc(doc(db, 'lessonPlans/ga1')));
  });
});
