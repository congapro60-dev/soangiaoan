/**
 * Kiểm thử firestore.rules cho nhóm học phân hoá / cổng học sinh:
 * adaptiveLessons · personalizationCache · adaptiveSessionProgress ·
 * studentLearningProfiles · fallbackEvents.
 *
 *   npm run test:rules
 *
 * Chạy trên Firestore emulator (firebase emulators:exec). Không chạm production.
 *
 * Nhóm này khác hẳn nhóm sở hữu cá nhân: học sinh vào cổng KHÔNG đăng nhập.
 * Nên rules phải cho ghi nặc danh mà vẫn chặn được người lạ — cách làm là ràng
 * định danh vào chính document id (`progressId == teacherId_lessonId_studentCode`)
 * rồi soi ngược lên `adaptiveLessons/{teacherId}` xem cổng có đang mở đúng bài
 * đó không. Bỏ một mắt xích là mở cửa cho ghi rác vô danh.
 *
 * Document id của adaptiveLessons CHÍNH LÀ teacherId — xem
 * `getAdaptiveLessonDocId = (userId) => userId` ở AdaptiveLearningTab.tsx:142.
 * Mỗi giáo viên chỉ có một bài đang phát; `lesson.id` cho biết bài nào.
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

const UID_GV = 'uid-giao-vien';
const UID_GV_KHAC = 'uid-giao-vien-khac';
const MA_HS = 'hs001';
const ID_BAI = 'bai-ham-so';
const ID_HS = `${UID_GV}_${MA_HS}`;
const ID_TIEN_TRINH = `${UID_GV}_${ID_BAI}_${MA_HS}`;

let testEnv: RulesTestEnvironment;

/** Tiến trình hợp lệ tối thiểu — đủ qua validProgressIdentity + validProgressShape. */
const tienTrinhMau = (ghiDe: Record<string, unknown> = {}) => ({
  id: ID_TIEN_TRINH,
  teacherId: UID_GV,
  lessonId: ID_BAI,
  studentId: ID_HS,
  studentCode: MA_HS,
  lessonTitle: 'Hàm số bậc nhất',
  studentName: 'Trần Thị B',
  route: 'standard',
  status: 'in_progress',
  diagnosticAttempt: { diem: 6 },
  quickCheckAttempts: [],
  objectiveStates: [],
  remediationAttempts: 0,
  startedAt: '2026-08-01T01:00:00.000Z',
  updatedAt: '2026-08-01T01:05:00.000Z',
  ...ghiDe,
});

/** Hồ sơ học tập hợp lệ tối thiểu — document id = studentId. */
const hoSoMau = (ghiDe: Record<string, unknown> = {}) => ({
  id: ID_HS,
  teacherId: UID_GV,
  studentId: ID_HS,
  studentCode: MA_HS,
  studentName: 'Trần Thị B',
  totalSessions: 1,
  averageMastery: 0.6,
  routeHistory: ['standard'],
  objectiveMemory: [],
  misconceptionCounts: {},
  lastLessonId: ID_BAI,
  lastActiveAt: '2026-08-01T01:05:00.000Z',
  createdAt: '2026-08-01T01:00:00.000Z',
  updatedAt: '2026-08-01T01:05:00.000Z',
  ...ghiDe,
});

/** Telemetry hợp lệ — rules dùng hasOnly nên thừa một field là hỏng. */
const suKienMau = (ghiDe: Record<string, unknown> = {}) => ({
  teacherId: UID_GV,
  studentId: ID_HS,
  lessonId: ID_BAI,
  stage: 'firestore',
  timestamp: '2026-08-01T01:05:00.000Z',
  errorCode: 'network',
  source: 'student_portal',
  ...ghiDe,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'hocphanhoa-rules-test',
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
    // Bài của UID_GV: cổng ĐANG MỞ, đang phát bài ID_BAI.
    await setDoc(doc(db, `adaptiveLessons/${UID_GV}`), {
      id: UID_GV,
      teacherId: UID_GV,
      portalEnabled: true,
      lesson: { id: ID_BAI, title: 'Hàm số bậc nhất' },
    });
    // Bài của giáo viên khác: cổng ĐÓNG.
    await setDoc(doc(db, `adaptiveLessons/${UID_GV_KHAC}`), {
      id: UID_GV_KHAC,
      teacherId: UID_GV_KHAC,
      portalEnabled: false,
      lesson: { id: 'bai-khac', title: 'Bài của người khác' },
    });

    await setDoc(doc(db, `adaptiveSessionProgress/${ID_TIEN_TRINH}`), tienTrinhMau());
    await setDoc(doc(db, `studentLearningProfiles/${ID_HS}`), hoSoMau());
    await setDoc(doc(db, 'fallbackEvents/su-kien-cu'), suKienMau());
    await setDoc(doc(db, 'personalizationCache/cache-1'), { noiDung: 'lộ trình đã sinh' });
  });
});

const dbGV = () => testEnv.authenticatedContext(UID_GV, { email: 'gv@gmail.com' }).firestore();
const dbGVKhac = () => testEnv.authenticatedContext(UID_GV_KHAC, { email: 'gvkhac@gmail.com' }).firestore();
const dbHS = () => testEnv.unauthenticatedContext().firestore();

describe('adaptiveLessons · đọc', () => {
  it('1. Giáo viên chủ bài đọc bài của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), `adaptiveLessons/${UID_GV}`)));
  });

  it('2. Học sinh nặc danh đọc bài khi cổng ĐANG MỞ → ALLOW (link cổng là công khai)', async () => {
    await assertSucceeds(getDoc(doc(dbHS(), `adaptiveLessons/${UID_GV}`)));
  });

  it('3. Học sinh nặc danh đọc bài khi cổng ĐÓNG → DENY', async () => {
    await assertFails(getDoc(doc(dbHS(), `adaptiveLessons/${UID_GV_KHAC}`)));
  });
});

/**
 * LỖ HỔNG ĐÃ BIẾT — chưa vá, cố ý ghi lại bằng assertSucceeds.
 *
 * `allow read: if request.auth != null || portalEnabled == true` (firestore.rules:42)
 * không hề so uid với teacherId. Bất kỳ giáo viên nào đã đăng nhập đều đọc được
 * TOÀN BỘ nội dung bài phân hoá của đồng nghiệp, kể cả khi cổng đang đóng.
 *
 * Vá đúng là tách `allow get` cho owner-hoặc-cổng-mở, giống khuôn duGio. Việc đó
 * đổi hành vi tab Quản lý bài học nên cần phiên riêng.
 *
 * Khi vá xong: ca 4 sẽ đỏ. Đổi `assertSucceeds` → `assertFails` và xoá comment này.
 */
describe('adaptiveLessons · lỗ hổng đã biết: đọc chéo giữa giáo viên', () => {
  it('4. [LỖ HỔNG] Giáo viên khác đọc bài đang ĐÓNG cổng của tôi → hiện tại ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGVKhac(), `adaptiveLessons/${UID_GV}`)));
  });
});

describe('adaptiveLessons · tạo, sửa, xoá', () => {
  it('5. Giáo viên tạo bài mang teacherId của mình → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbGVKhac(), 'adaptiveLessons/bai-moi'), {
        teacherId: UID_GV_KHAC, portalEnabled: false, lesson: { id: 'x' },
      }),
    );
  });

  it('6. Giáo viên tạo bài gán teacherId cho người khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbGVKhac(), 'adaptiveLessons/bai-moi'), {
        teacherId: UID_GV, portalEnabled: false, lesson: { id: 'x' },
      }),
    );
  });

  it('7. Học sinh nặc danh tạo bài → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'adaptiveLessons/bai-moi'), {
        teacherId: UID_GV, portalEnabled: true, lesson: { id: 'x' },
      }),
    );
  });

  it('8. Giáo viên khác BẬT cổng cho bài của tôi → DENY', async () => {
    await assertFails(updateDoc(doc(dbGVKhac(), `adaptiveLessons/${UID_GV}`), { portalEnabled: true }));
  });

  it('9. Học sinh nặc danh sửa nội dung bài → DENY', async () => {
    await assertFails(updateDoc(doc(dbHS(), `adaptiveLessons/${UID_GV}`), { lesson: { id: 'giả' } }));
  });

  it('10. Giáo viên khác xoá bài của tôi → DENY; chủ bài xoá → ALLOW', async () => {
    await assertFails(deleteDoc(doc(dbGVKhac(), `adaptiveLessons/${UID_GV}`)));
    await assertSucceeds(deleteDoc(doc(dbGV(), `adaptiveLessons/${UID_GV}`)));
  });
});

/**
 * LỖ HỔNG ĐÃ BIẾT — chưa vá, cố ý ghi lại bằng assertSucceeds.
 *
 * `match /personalizationCache/{cacheId} { allow read, write: if true; }`
 * (firestore.rules:55-58) mở toàn diện cho cả người chưa đăng nhập.
 *
 * Hệ quả thật: cacheKey do client sinh và đoán được, nên người lạ ghi đè được
 * nội dung lộ trình mà HỌC SINH SẼ ĐỌC. Đây không phải rò rỉ dữ liệu, mà là
 * chèn nội dung vào bài học của trẻ — nặng hơn.
 *
 * Vá đúng phải thêm `teacherId` vào document rồi ràng theo nó (đã ghi ở
 * HANDOFF.md mục 3). Việc đó đổi schema cache nên cần phiên riêng.
 *
 * Khi vá xong: ba ca dưới sẽ đỏ. Sửa kỳ vọng và xoá comment này.
 */
describe('personalizationCache · lỗ hổng đã biết: ai cũng đọc/ghi được', () => {
  it('11. [LỖ HỔNG] Người chưa đăng nhập đọc cache → hiện tại ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbHS(), 'personalizationCache/cache-1')));
  });

  it('12. [LỖ HỔNG] Người chưa đăng nhập GHI ĐÈ cache học sinh sẽ đọc → hiện tại ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbHS(), 'personalizationCache/cache-1'), { noiDung: 'nội dung do người lạ chèn' }),
    );
  });

  it('13. [LỖ HỔNG] Người chưa đăng nhập xoá cache → hiện tại ALLOW', async () => {
    await assertSucceeds(deleteDoc(doc(dbHS(), 'personalizationCache/cache-1')));
  });
});

// Học sinh không đăng nhập vẫn phải ghi được tiến trình. Hàng rào duy nhất là
// định danh phải tự khớp với document id VÀ cổng phải đang mở đúng bài đó.
describe('adaptiveSessionProgress · học sinh nặc danh ghi tiến trình', () => {
  const idMoi = `${UID_GV}_${ID_BAI}_hs002`;

  it('14. Ghi tiến trình đúng định danh, cổng đang mở → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${idMoi}`), tienTrinhMau({
        id: idMoi, studentCode: 'hs002', studentId: `${UID_GV}_hs002`,
      })),
    );
  });

  it('15. Document id không khớp teacherId_lessonId_studentCode → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'adaptiveSessionProgress/id-tu-bia'), tienTrinhMau({ id: 'id-tu-bia' })),
    );
  });

  it('16. studentId không phải teacherId_studentCode → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${idMoi}`), tienTrinhMau({
        id: idMoi, studentCode: 'hs002', studentId: 'hs002-tu-do',
      })),
    );
  });

  it('17. Ghi vào bài của giáo viên có cổng ĐÓNG → DENY', async () => {
    const id = `${UID_GV_KHAC}_bai-khac_hs003`;
    await assertFails(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${id}`), tienTrinhMau({
        id, teacherId: UID_GV_KHAC, lessonId: 'bai-khac',
        studentCode: 'hs003', studentId: `${UID_GV_KHAC}_hs003`,
      })),
    );
  });

  it('18. Cổng mở nhưng lessonId KHÔNG phải bài đang phát → DENY', async () => {
    const id = `${UID_GV}_bai-cu_hs004`;
    await assertFails(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${id}`), tienTrinhMau({
        id, lessonId: 'bai-cu', studentCode: 'hs004', studentId: `${UID_GV}_hs004`,
      })),
    );
  });

  it('19. route ngoài ba giá trị cho phép → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${idMoi}`), tienTrinhMau({
        id: idMoi, studentCode: 'hs002', studentId: `${UID_GV}_hs002`, route: 'sieu-kho',
      })),
    );
  });

  it('20. quickCheckAttempts vượt trần 20 phần tử → DENY (chống bơm phình document)', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${idMoi}`), tienTrinhMau({
        id: idMoi, studentCode: 'hs002', studentId: `${UID_GV}_hs002`,
        quickCheckAttempts: Array.from({ length: 21 }, (_, i) => ({ lan: i })),
      })),
    );
  });

  it('21. Học sinh nặc danh sửa tiến trình của mình → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`), tienTrinhMau({
        status: 'completed', updatedAt: '2026-08-01T02:00:00.000Z',
      })),
    );
  });

  it('22. Sửa tiến trình rồi đổi luôn teacherId sang giáo viên khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`), tienTrinhMau({
        teacherId: UID_GV_KHAC,
      })),
    );
  });

  it('23. Học sinh nặc danh XOÁ tiến trình → DENY', async () => {
    await assertFails(deleteDoc(doc(dbHS(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`)));
  });
});

describe('adaptiveSessionProgress · giáo viên theo dõi lớp', () => {
  it('24. Giáo viên chủ bài đọc tiến trình học sinh mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`)));
  });

  it('25. Giáo viên khác đọc tiến trình lớp tôi → DENY', async () => {
    await assertFails(getDoc(doc(dbGVKhac(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`)));
  });

  it('26. Học sinh nặc danh ĐỌC tiến trình → DENY (ghi được không có nghĩa là đọc được)', async () => {
    await assertFails(getDoc(doc(dbHS(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`)));
  });

  it('27. Giáo viên lọc tiến trình theo teacherId của mình → ALLOW', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbGV(), 'adaptiveSessionProgress'), where('teacherId', '==', UID_GV))),
    );
  });

  it('28. Giáo viên khác lọc theo teacherId của tôi → DENY', async () => {
    await assertFails(
      getDocs(query(collection(dbGVKhac(), 'adaptiveSessionProgress'), where('teacherId', '==', UID_GV))),
    );
  });

  it('29. Giáo viên chủ bài xoá tiến trình → ALLOW', async () => {
    await assertSucceeds(deleteDoc(doc(dbGV(), `adaptiveSessionProgress/${ID_TIEN_TRINH}`)));
  });
});

describe('studentLearningProfiles · hồ sơ học tập dài hạn', () => {
  const idMoi = `${UID_GV}_hs009`;

  it('30. Học sinh nặc danh tạo hồ sơ đúng định danh, cổng mở → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbHS(), `studentLearningProfiles/${idMoi}`), hoSoMau({
        id: idMoi, studentId: idMoi, studentCode: 'hs009',
      })),
    );
  });

  it('31. Document id không phải teacherId_studentCode → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'studentLearningProfiles/id-tu-bia'), hoSoMau({
        id: 'id-tu-bia', studentId: 'id-tu-bia',
      })),
    );
  });

  it('32. lastLessonId không phải bài đang phát → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `studentLearningProfiles/${idMoi}`), hoSoMau({
        id: idMoi, studentId: idMoi, studentCode: 'hs009', lastLessonId: 'bai-da-tat',
      })),
    );
  });

  it('33. routeHistory vượt trần 20 phần tử → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `studentLearningProfiles/${idMoi}`), hoSoMau({
        id: idMoi, studentId: idMoi, studentCode: 'hs009',
        routeHistory: Array.from({ length: 21 }, () => 'standard'),
      })),
    );
  });

  it('34. Giáo viên chủ hồ sơ đọc → ALLOW; giáo viên khác đọc → DENY', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), `studentLearningProfiles/${ID_HS}`)));
    await assertFails(getDoc(doc(dbGVKhac(), `studentLearningProfiles/${ID_HS}`)));
  });

  it('35. Học sinh nặc danh ĐỌC hồ sơ → DENY', async () => {
    await assertFails(getDoc(doc(dbHS(), `studentLearningProfiles/${ID_HS}`)));
  });

  it('36. Sửa hồ sơ rồi đổi teacherId sang giáo viên khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), `studentLearningProfiles/${ID_HS}`), hoSoMau({ teacherId: UID_GV_KHAC })),
    );
  });

  it('37. Học sinh nặc danh xoá hồ sơ → DENY', async () => {
    await assertFails(deleteDoc(doc(dbHS(), `studentLearningProfiles/${ID_HS}`)));
  });
});

// Telemetry đã redact PII: rules dùng hasOnly nên bất kỳ field thừa nào cũng bị
// chặn — đó chính là hàng rào giữ cho không ai lén đẩy dữ liệu học sinh vào đây.
describe('fallbackEvents · telemetry chỉ ghi, không sửa', () => {
  it('38. Học sinh nặc danh ghi sự kiện đúng schema, cổng mở → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbHS(), 'fallbackEvents/su-kien-moi'), suKienMau()));
  });

  it('39. Thêm một field ngoài schema (hasOnly) → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'fallbackEvents/su-kien-moi'), suKienMau({ studentName: 'Trần Thị B' })),
    );
  });

  it('40. studentId không mang tiền tố teacherId_ → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'fallbackEvents/su-kien-moi'), suKienMau({ studentId: 'hs-tu-do' })),
    );
  });

  it('41. errorCode ngoài danh sách cho phép → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'fallbackEvents/su-kien-moi'), suKienMau({ errorCode: 'tu-bia' })),
    );
  });

  it('42. source khác student_portal → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'fallbackEvents/su-kien-moi'), suKienMau({ source: 'admin' })),
    );
  });

  it('43. Ghi telemetry cho bài có cổng ĐÓNG → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'fallbackEvents/su-kien-moi'), suKienMau({
        teacherId: UID_GV_KHAC, studentId: `${UID_GV_KHAC}_hs001`, lessonId: 'bai-khac',
      })),
    );
  });

  it('44. Sửa sự kiện đã ghi → DENY kể cả với giáo viên chủ bài', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'fallbackEvents/su-kien-cu'), { errorCode: 'unknown' }));
    await assertFails(updateDoc(doc(dbHS(), 'fallbackEvents/su-kien-cu'), { errorCode: 'unknown' }));
  });

  it('45. Xoá sự kiện → DENY kể cả với giáo viên chủ bài', async () => {
    await assertFails(deleteDoc(doc(dbGV(), 'fallbackEvents/su-kien-cu')));
  });

  it('46. Giáo viên chủ bài đọc telemetry của mình → ALLOW; giáo viên khác → DENY', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), 'fallbackEvents/su-kien-cu')));
    await assertFails(getDoc(doc(dbGVKhac(), 'fallbackEvents/su-kien-cu')));
  });

  it('47. Học sinh nặc danh đọc lại telemetry → DENY', async () => {
    await assertFails(getDoc(doc(dbHS(), 'fallbackEvents/su-kien-cu')));
  });
});
