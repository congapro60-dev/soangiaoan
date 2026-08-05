/**
 * Kiểm thử firestore.rules cho nhóm collection "sở hữu cá nhân":
 * lessonPlans · userTemplates · userSettings · distributions · savedExams · gradingSessions.
 *
 *   npm run test:rules
 *
 * Chạy trên Firestore emulator (firebase emulators:exec). Không chạm production.
 *
 * Cả nhóm dùng chung một khuôn: `allow read, write: if uid == resource.data.userId`
 * cộng một `allow create` riêng đọc `request.resource.data.userId` (vì lúc create
 * chưa có `resource`). Test ở đây bám đúng khuôn đó, cộng các ca lệch khuôn.
 *
 * MỘT SỐ CA CỐ Ý ASSERT SUCCEEDS CHO HÀNH VI KHÔNG AN TOÀN — xem describe
 * "lỗ hổng đã biết". Chúng ghi lại hành vi HIỆN TẠI của production để lần sau
 * ai vá rules sẽ thấy test đỏ và biết mình vừa đổi đúng thứ định đổi.
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

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'sohuucanhan-rules-test',
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
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    // lessonPlans dùng field `userId` + cờ `isPublic` cho thư viện cộng đồng.
    await setDoc(doc(db, 'lessonPlans/ga-cua-toi'), {
      userId: UID_TOI, isPublic: false, title: 'Giáo án riêng',
    });
    await setDoc(doc(db, 'lessonPlans/ga-nguoi-khac'), {
      userId: UID_NGUOI_KHAC, isPublic: false, title: 'Giáo án riêng của người khác',
    });
    await setDoc(doc(db, 'lessonPlans/ga-cong-khai'), {
      userId: UID_NGUOI_KHAC, isPublic: true, title: 'Giáo án chia sẻ',
    });

    // Bốn collection còn lại không có khái niệm công khai — chỉ owner.
    for (const col of ['userTemplates', 'distributions', 'savedExams', 'gradingSessions']) {
      await setDoc(doc(db, `${col}/cua-toi`), { userId: UID_TOI, ten: 'của tôi' });
      await setDoc(doc(db, `${col}/cua-nguoi-khac`), { userId: UID_NGUOI_KHAC, ten: 'của người khác' });
    }

    // userSettings định danh bằng document id, không bằng field.
    await setDoc(doc(db, `userSettings/${UID_TOI}`), { theme: 'dark' });
    await setDoc(doc(db, `userSettings/${UID_NGUOI_KHAC}`), { theme: 'light' });
  });
});

const dbCuaToi = () => testEnv.authenticatedContext(UID_TOI, { email: 'toi@gmail.com' }).firestore();
const dbNguoiKhac = () =>
  testEnv.authenticatedContext(UID_NGUOI_KHAC, { email: 'khac@gmail.com' }).firestore();
const dbAnDanh = () => testEnv.unauthenticatedContext().firestore();

describe('lessonPlans · đọc một giáo án', () => {
  it('1. Chủ sở hữu đọc giáo án riêng của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaToi(), 'lessonPlans/ga-cua-toi')));
  });

  it('2. Người đăng nhập khác đọc giáo án riêng của tôi → DENY', async () => {
    await assertFails(getDoc(doc(dbNguoiKhac(), 'lessonPlans/ga-cua-toi')));
  });

  it('3. Chưa đăng nhập đọc giáo án riêng → DENY', async () => {
    await assertFails(getDoc(doc(dbAnDanh(), 'lessonPlans/ga-cua-toi')));
  });

  it('4. Chưa đăng nhập đọc giáo án isPublic → ALLOW (thư viện cộng đồng)', async () => {
    await assertSucceeds(getDoc(doc(dbAnDanh(), 'lessonPlans/ga-cong-khai')));
  });
});

describe('lessonPlans · tạo, sửa, xoá', () => {
  it('5. Tạo giáo án mang userId của mình → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbCuaToi(), 'lessonPlans/ga-moi'), { userId: UID_TOI, isPublic: false, title: 'Mới' }),
    );
  });

  it('6. Tạo giáo án gán userId cho người khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbCuaToi(), 'lessonPlans/ga-moi'), { userId: UID_NGUOI_KHAC, isPublic: false, title: 'Mạo danh' }),
    );
  });

  it('7. Chưa đăng nhập tạo giáo án → DENY', async () => {
    await assertFails(
      setDoc(doc(dbAnDanh(), 'lessonPlans/ga-moi'), { userId: UID_TOI, isPublic: false, title: 'Mới' }),
    );
  });

  it('8. Sửa giáo án riêng của người khác → DENY', async () => {
    await assertFails(updateDoc(doc(dbCuaToi(), 'lessonPlans/ga-nguoi-khac'), { title: 'sửa trộm' }));
  });

  it('9. Sửa giáo án ĐÃ CÔNG KHAI của người khác → DENY (đọc được không có nghĩa là ghi được)', async () => {
    await assertFails(updateDoc(doc(dbCuaToi(), 'lessonPlans/ga-cong-khai'), { title: 'sửa trộm' }));
  });

  it('10. Xoá giáo án của người khác → DENY; xoá của mình → ALLOW', async () => {
    await assertFails(deleteDoc(doc(dbCuaToi(), 'lessonPlans/ga-nguoi-khac')));
    await assertSucceeds(deleteDoc(doc(dbCuaToi(), 'lessonPlans/ga-cua-toi')));
  });
});

/**
 * LỖ HỔNG ĐÃ BIẾT — chưa vá, cố ý ghi lại bằng assertSucceeds.
 *
 * `allow list: if request.auth != null` (firestore.rules:10) đứng ngang hàng với
 * `allow read` chứ không phải hẹp hơn. Các luật Firestore ghép bằng OR, nên
 * `allow read` chặt hơn ở dòng dưới KHÔNG cứu được: bất kỳ ai đã đăng nhập đều
 * liệt kê được TOÀN BỘ lessonPlans, kể cả giáo án riêng tư của người lạ.
 *
 * Đối chiếu: `duGio` cố ý KHÔNG sao chép khuôn này (xem comment firestore.rules:398).
 * Vá đúng là bỏ dòng `allow list` và để client buộc phải lọc theo userId/isPublic —
 * việc đó đổi hành vi truy vấn của Thư viện nên cần một phiên riêng.
 *
 * Khi vá xong: hai ca dưới sẽ đỏ. Đổi `assertSucceeds` → `assertFails` và xoá
 * khối comment này.
 */
describe('lessonPlans · lỗ hổng đã biết: allow list quá rộng', () => {
  it('11. [LỖ HỔNG] Người đăng nhập bất kỳ liệt kê toàn bộ lessonPlans → hiện tại ALLOW', async () => {
    await assertSucceeds(getDocs(query(collection(dbNguoiKhac(), 'lessonPlans'))));
  });

  it('12. [LỖ HỔNG] Người lạ lọc đúng userId của tôi để lấy giáo án riêng → hiện tại ALLOW', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbNguoiKhac(), 'lessonPlans'), where('userId', '==', UID_TOI))),
    );
  });

  it('13. Chưa đăng nhập vẫn KHÔNG liệt kê được toàn bộ → DENY', async () => {
    await assertFails(getDocs(query(collection(dbAnDanh(), 'lessonPlans'))));
  });
});

// Bốn collection cùng khuôn "chỉ owner, không có công khai". Chạy chung một bảng
// để thêm collection mới sau này chỉ tốn một dòng.
describe.each([
  'userTemplates',
  'distributions',
  'savedExams',
  'gradingSessions',
])('%s · chỉ chủ sở hữu', col => {
  it('14. Chủ sở hữu đọc → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaToi(), `${col}/cua-toi`)));
  });

  it('15. Người đăng nhập khác đọc → DENY', async () => {
    await assertFails(getDoc(doc(dbNguoiKhac(), `${col}/cua-toi`)));
  });

  it('16. Chưa đăng nhập đọc → DENY', async () => {
    await assertFails(getDoc(doc(dbAnDanh(), `${col}/cua-toi`)));
  });

  it('17. Liệt kê cả collection → DENY (không có luật list mở)', async () => {
    await assertFails(getDocs(query(collection(dbNguoiKhac(), col))));
  });

  it('18. Tạo bản ghi mang userId của mình → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbCuaToi(), `${col}/moi`), { userId: UID_TOI, ten: 'mới' }));
  });

  it('19. Tạo bản ghi gán userId cho người khác → DENY', async () => {
    await assertFails(setDoc(doc(dbCuaToi(), `${col}/moi`), { userId: UID_NGUOI_KHAC, ten: 'mạo danh' }));
  });

  it('20. Chưa đăng nhập tạo → DENY', async () => {
    await assertFails(setDoc(doc(dbAnDanh(), `${col}/moi`), { userId: UID_TOI, ten: 'mới' }));
  });

  it('21. Chủ sở hữu sửa → ALLOW; người khác sửa → DENY', async () => {
    await assertFails(updateDoc(doc(dbNguoiKhac(), `${col}/cua-toi`), { ten: 'sửa trộm' }));
    await assertSucceeds(updateDoc(doc(dbCuaToi(), `${col}/cua-toi`), { ten: 'đã sửa' }));
  });

  it('22. Chủ sở hữu xoá → ALLOW; người khác xoá → DENY', async () => {
    await assertFails(deleteDoc(doc(dbNguoiKhac(), `${col}/cua-toi`)));
    await assertSucceeds(deleteDoc(doc(dbCuaToi(), `${col}/cua-toi`)));
  });
});

// userSettings định danh bằng document id = uid, không bằng field userId như nhóm trên.
// Hệ quả: không có đường "tạo doc mang uid người khác" — sai id là chặn ngay.
describe('userSettings · định danh bằng document id', () => {
  it('23. Chủ sở hữu đọc cài đặt của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbCuaToi(), `userSettings/${UID_TOI}`)));
  });

  it('24. Đọc cài đặt của người khác → DENY', async () => {
    await assertFails(getDoc(doc(dbCuaToi(), `userSettings/${UID_NGUOI_KHAC}`)));
  });

  it('25. Chưa đăng nhập đọc → DENY', async () => {
    await assertFails(getDoc(doc(dbAnDanh(), `userSettings/${UID_TOI}`)));
  });

  it('26. Chủ sở hữu ghi cài đặt của mình → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbCuaToi(), `userSettings/${UID_TOI}`), { theme: 'light' }));
  });

  it('27. Ghi đè cài đặt của người khác → DENY', async () => {
    await assertFails(setDoc(doc(dbCuaToi(), `userSettings/${UID_NGUOI_KHAC}`), { theme: 'dark' }));
  });

  it('28. Xoá cài đặt của người khác → DENY', async () => {
    await assertFails(deleteDoc(doc(dbCuaToi(), `userSettings/${UID_NGUOI_KHAC}`)));
  });
});
