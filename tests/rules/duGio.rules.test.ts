/**
 * Kiểm thử firestore.rules cho module dự giờ.
 *
 *   npm run test:rules
 *
 * Chạy trên Firestore emulator (firebase emulators:exec). Không chạm production.
 *
 * Mô hình: sở hữu cá nhân giống lessonPlans. Ai đăng nhập cũng tự lập được
 * biên bản của mình; chỉ mình đọc; muốn chia sẻ thì bật isPublic — và khi
 * chia sẻ thì BẮT BUỘC bỏ trống tên giáo viên được dự giờ.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const UID_TOI = 'uid-toi';
const UID_NGUOI_KHAC = 'uid-nguoi-khac';

let testEnv: RulesTestEnvironment;

/** Biên bản mẫu do UID_TOI lập. Mặc định riêng tư và có tên giáo viên. */
const bienBanMau = (ghiDe: Record<string, unknown> = {}) => ({
  userId: UID_TOI,
  gvHoTen: 'Nguyễn Văn A',
  ngay: new Date('2026-03-10'),
  mon: 'Toán',
  lop: '10A1',
  bai: 'Định lí Vi-ét',
  bienBan: '7:30 GV đứng cửa lớp chào từng HS...',
  isPublic: false,
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
    await setDoc(doc(db, 'duGio/bb-cua-toi'), bienBanMau());
    await setDoc(doc(db, 'duGio/bb-nguoi-khac'), bienBanMau({ userId: UID_NGUOI_KHAC }));
    await setDoc(
      doc(db, 'duGio/bb-chia-se'),
      bienBanMau({ userId: UID_NGUOI_KHAC, isPublic: true, gvHoTen: '' }),
    );
    await setDoc(doc(db, 'lessonPlans/ga1'), { userId: UID_TOI, isPublic: false, title: 'Giáo án A' });
  });
});

const dbCuaToi = () => testEnv.authenticatedContext(UID_TOI, { email: 'toi@gmail.com' }).firestore();
const dbNguoiKhac = () =>
  testEnv.authenticatedContext(UID_NGUOI_KHAC, { email: 'khac@gmail.com' }).firestore();
const dbAnDanh = () => testEnv.unauthenticatedContext().firestore();

describe('duGio · đọc biên bản riêng tư', () => {
  it('1. Chưa đăng nhập → DENY đọc biên bản riêng tư', async () => {
    await assertFails(getDoc(doc(dbAnDanh(), 'duGio/bb-cua-toi')));
  });

  it('2. Chủ sở hữu đọc biên bản của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaToi(), 'duGio/bb-cua-toi')));
  });

  it('3. Người đăng nhập khác đọc biên bản riêng tư của tôi → DENY', async () => {
    await assertFails(getDoc(doc(dbNguoiKhac(), 'duGio/bb-cua-toi')));
  });
});

describe('duGio · biên bản chia sẻ lên thư viện', () => {
  it('4. Người đăng nhập khác đọc biên bản isPublic → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaToi(), 'duGio/bb-chia-se')));
  });

  it('5. Người khác KHÔNG sửa được biên bản đã chia sẻ → DENY', async () => {
    await assertFails(updateDoc(doc(dbCuaToi(), 'duGio/bb-chia-se'), { bai: 'đổi trộm' }));
  });

  it('6. Người khác KHÔNG xoá được biên bản đã chia sẻ → DENY', async () => {
    await assertFails(deleteDoc(doc(dbCuaToi(), 'duGio/bb-chia-se')));
  });
});

describe('duGio · tạo', () => {
  it('7. Đăng nhập, tạo biên bản mang userId của mình → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbCuaToi(), 'duGio/bb-moi'), bienBanMau()));
  });

  it('8. Tạo biên bản gán userId cho người khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbCuaToi(), 'duGio/bb-moi'), bienBanMau({ userId: UID_NGUOI_KHAC })),
    );
  });

  it('9. Chưa đăng nhập → DENY tạo', async () => {
    await assertFails(setDoc(doc(dbAnDanh(), 'duGio/bb-moi'), bienBanMau({ userId: 'ai-do' })));
  });

  it('10. Tạo thiếu trường bắt buộc (bỏ bienBan) → DENY', async () => {
    const { bienBan: _bo, ...thieu } = bienBanMau();
    await assertFails(setDoc(doc(dbCuaToi(), 'duGio/bb-moi'), thieu));
  });
});

// Chia sẻ giữ nguyên tên giáo viên — quyết định của người dùng, ghi ở đây để
// lần sau đọc rules không tưởng là thiếu sót.
describe('duGio · chia sẻ lên thư viện', () => {
  it('11. Tạo thẳng biên bản công khai còn nguyên tên giáo viên → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbCuaToi(), 'duGio/bb-moi'), bienBanMau({ isPublic: true })),
    );
  });

  it('12. Bật isPublic cho biên bản của mình → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbCuaToi(), 'duGio/bb-cua-toi'), { isPublic: true }));
  });

  it('13. Người khác bật isPublic cho biên bản của tôi → DENY', async () => {
    await assertFails(updateDoc(doc(dbNguoiKhac(), 'duGio/bb-cua-toi'), { isPublic: true }));
  });
});

describe('duGio · sửa và xoá', () => {
  it('16. Chủ sở hữu sửa biên bản của mình → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbCuaToi(), 'duGio/bb-cua-toi'), { bienBan: 'ghi thêm' }));
  });

  it('17. Sửa biên bản của người khác → DENY', async () => {
    await assertFails(updateDoc(doc(dbCuaToi(), 'duGio/bb-nguoi-khac'), { bienBan: 'sửa trộm' }));
  });

  it('18. Đổi userId sang người khác → DENY', async () => {
    await assertFails(updateDoc(doc(dbCuaToi(), 'duGio/bb-cua-toi'), { userId: UID_NGUOI_KHAC }));
  });

  it('19. Chủ sở hữu xoá → ALLOW; người khác xoá → DENY', async () => {
    await assertFails(deleteDoc(doc(dbCuaToi(), 'duGio/bb-nguoi-khac')));
    await assertSucceeds(deleteDoc(doc(dbCuaToi(), 'duGio/bb-cua-toi')));
  });
});

// Bước 5 của chu trình: giáo viên tự phân tích. Họ đọc được biên bản về mình
// nhưng CHỈ ghi được đúng ô tuDanhGia — không chạm được vào điểm của người dự.
describe('duGio · giáo viên được dự giờ tự đánh giá', () => {
  const UID_GV = 'uid-giao-vien';
  const dbGV = () => testEnv.authenticatedContext(UID_GV, { email: 'gv@gmail.com' }).firestore();

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(
        doc(ctx.firestore(), 'duGio/bb-co-moi'),
        bienBanMau({ gvUid: UID_GV, tuDanhGia: { diem: {}, ghiChu: {}, hoanThanhLuc: '' } }),
      );
    });
  });

  it('26. Giáo viên được mời đọc biên bản về mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), 'duGio/bb-co-moi')));
  });

  it('27. Giáo viên KHÔNG được mời thì không đọc được → DENY', async () => {
    await assertFails(getDoc(doc(dbGV(), 'duGio/bb-cua-toi')));
  });

  it('28. Giáo viên ghi ô tự đánh giá → ALLOW', async () => {
    await assertSucceeds(
      updateDoc(doc(dbGV(), 'duGio/bb-co-moi'), {
        tuDanhGia: { diem: { '3b': 3 }, ghiChu: { '3b': 'tôi thấy mình hỏi mở nhiều hơn' }, hoanThanhLuc: '2026-04-06' },
      }),
    );
  });

  it('29. Giáo viên sửa điểm của người dự giờ → DENY', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'duGio/bb-co-moi'), { diemChot: { '3b': 4 } }));
  });

  it('30. Giáo viên sửa biên bản quan sát → DENY', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'duGio/bb-co-moi'), { bienBan: 'tôi sửa lại' }));
  });

  it('31. Giáo viên vừa ghi tự đánh giá vừa lén sửa điểm → DENY', async () => {
    await assertFails(
      updateDoc(doc(dbGV(), 'duGio/bb-co-moi'), {
        tuDanhGia: { diem: { '3b': 3 }, ghiChu: {}, hoanThanhLuc: '' },
        diemChot: { '3b': 4 },
      }),
    );
  });

  it('32. Giáo viên tự gán mình làm gvUid của biên bản khác → DENY', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'duGio/bb-cua-toi'), { gvUid: UID_GV }));
  });

  it('33. Giáo viên xoá biên bản về mình → DENY', async () => {
    await assertFails(deleteDoc(doc(dbGV(), 'duGio/bb-co-moi')));
  });

  it('34. Người lạ không phải gvUid thì không đọc được → DENY', async () => {
    await assertFails(getDoc(doc(dbNguoiKhac(), 'duGio/bb-co-moi')));
  });

  it('35. Giáo viên liệt kê biên bản về mình → ALLOW', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbGV(), 'duGio'), where('gvUid', '==', UID_GV))),
    );
  });
});

describe('duGio · truy vấn danh sách', () => {
  it('20. Lọc theo userId của mình → ALLOW', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbCuaToi(), 'duGio'), where('userId', '==', UID_TOI))),
    );
  });

  it('21. List không lọc → DENY (sẽ quét cả biên bản riêng tư của người khác)', async () => {
    await assertFails(getDocs(query(collection(dbCuaToi(), 'duGio'))));
  });

  it('22. Lọc theo userId của người khác → DENY', async () => {
    await assertFails(
      getDocs(query(collection(dbCuaToi(), 'duGio'), where('userId', '==', UID_NGUOI_KHAC))),
    );
  });

  it('23. Thư viện chung: lọc isPublic == true → ALLOW kể cả khi chưa đăng nhập', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbAnDanh(), 'duGio'), where('isPublic', '==', true))),
    );
  });
});

// Lưới an toàn: khối dự giờ nằm trong một file đang phục vụ tính năng chạy
// thật. Nếu sửa hỏng lessonPlans, hai ca này báo ngay.
describe('không phá vỡ tính năng cũ · lessonPlans', () => {
  it('24. Người dùng thường đọc/ghi lessonPlans của chính mình → ALLOW', async () => {
    const db = dbCuaToi();
    await assertSucceeds(getDoc(doc(db, 'lessonPlans/ga1')));
    await assertSucceeds(updateDoc(doc(db, 'lessonPlans/ga1'), { title: 'Giáo án A (sửa)' }));
  });

  it('25. Người dùng thường đọc lessonPlans của người khác khi isPublic = false → DENY', async () => {
    await assertFails(getDoc(doc(dbNguoiKhac(), 'lessonPlans/ga1')));
  });
});
