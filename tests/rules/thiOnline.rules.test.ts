/**
 * Kiểm thử firestore.rules cho thi online và hai collection dùng chung:
 * exams · examSubmissions · lessonSimulations · externalTools.
 *
 *   npm run test:rules
 *
 * Chạy trên Firestore emulator (firebase emulators:exec). Không chạm production.
 *
 * Điểm nhạy nhất của cả file: document `exams` CHỨA ĐÁP ÁN. Học sinh không bao
 * giờ được đọc thẳng nó — đề đã lược đáp án đi qua /api/exam-public. Ca 4 và 5
 * là hàng rào chặn việc "nới cho học sinh đọc đề cho tiện".
 *
 * examSubmissions phải cho học sinh nặc danh vừa tạo vừa sửa bài, nên hàng rào
 * nằm ở chỗ khác: bài chỉ sửa được khi CÒN in_progress, mọi trường định danh
 * phải giữ nguyên, và học sinh không tự đặt được status 'graded'.
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
const UID_ADMIN = 'uid-admin';
const MA_DE = 'ABC123';
// Rules bắt clientNonce >= 24 ký tự để subId khó đoán — link kết quả dựa vào đó.
const NONCE = 'nonce-du-dai-cho-24-ky-tu-tro-len';

let testEnv: RulesTestEnvironment;

const baiLamMau = (ghiDe: Record<string, unknown> = {}) => ({
  id: 'bai-lam-1',
  examId: 'de-cua-gv',
  examCode: MA_DE,
  studentName: 'Lê Văn C',
  studentClass: '10A1',
  startedAt: '2026-08-01T01:00:00.000Z',
  answers: [],
  maxScore: 10,
  tabSwitches: 0,
  clientNonce: NONCE,
  status: 'in_progress',
  ...ghiDe,
});

const congCuMau = (toolId: string, ghiDe: Record<string, unknown> = {}) => ({
  toolId,
  title: 'GeoGebra đồ thị hàm số',
  description: 'Vẽ đồ thị tương tác',
  url: 'https://www.geogebra.org/calculator',
  sourceDomain: 'geogebra.org',
  tags: ['toan', 'do-thi'],
  heightPreset: 'standard',
  sandboxPreset: 'geogebra',
  status: 'active',
  createdAt: '2026-08-01T01:00:00.000Z',
  updatedAt: '2026-08-01T01:00:00.000Z',
  ...ghiDe,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'thionline-rules-test',
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
    await setDoc(doc(db, 'exams/de-cua-gv'), {
      teacherId: UID_GV, code: MA_DE, isActive: true, title: 'Kiểm tra 15 phút',
      questions: [{ noiDung: '2+2=?', dapAn: '4' }],
    });
    await setDoc(doc(db, 'exams/de-da-dong'), {
      teacherId: UID_GV, code: 'DONG99', isActive: false, title: 'Đề đã đóng',
    });

    await setDoc(doc(db, 'examSubmissions/bai-lam-1'), baiLamMau());
    await setDoc(doc(db, 'examSubmissions/bai-da-nop'), baiLamMau({
      id: 'bai-da-nop', status: 'submitted', submittedAt: '2026-08-01T01:20:00.000Z', totalScore: 8,
    }));

    await setDoc(doc(db, 'lessonSimulations/mo-phong-1'), {
      createdBy: UID_GV, lessonId: 'bai-1', html: '<div>mô phỏng</div>',
    });

    await setDoc(doc(db, 'externalTools/tool-active'), congCuMau('tool-active'));
    await setDoc(doc(db, 'externalTools/tool-cho-duyet'), congCuMau('tool-cho-duyet', { status: 'pending' }));
  });
});

const dbGV = () => testEnv.authenticatedContext(UID_GV, { email: 'gv@gmail.com' }).firestore();
const dbGVKhac = () => testEnv.authenticatedContext(UID_GV_KHAC, { email: 'gvkhac@gmail.com' }).firestore();
const dbAdmin = () => testEnv.authenticatedContext(UID_ADMIN, { email: 'admin@gmail.com', admin: true }).firestore();
const dbHS = () => testEnv.unauthenticatedContext().firestore();

describe('exams · đề thi chứa đáp án', () => {
  it('1. Giáo viên chủ đề đọc đề của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), 'exams/de-cua-gv')));
  });

  it('2. Giáo viên chủ đề lọc danh sách đề theo teacherId → ALLOW', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbGV(), 'exams'), where('teacherId', '==', UID_GV))),
    );
  });

  it('3. Giáo viên khác đọc đề của tôi → DENY', async () => {
    await assertFails(getDoc(doc(dbGVKhac(), 'exams/de-cua-gv')));
  });

  it('4. Học sinh nặc danh đọc thẳng đề → DENY (chống xem đáp án qua DevTools)', async () => {
    await assertFails(getDoc(doc(dbHS(), 'exams/de-cua-gv')));
  });

  it('5. Học sinh nặc danh dò đề bằng mã đề → DENY', async () => {
    await assertFails(getDocs(query(collection(dbHS(), 'exams'), where('code', '==', MA_DE))));
  });

  it('6. Tạo đề mang teacherId của mình → ALLOW; gán cho người khác → DENY', async () => {
    await assertSucceeds(
      setDoc(doc(dbGVKhac(), 'exams/de-moi'), { teacherId: UID_GV_KHAC, code: 'X1', isActive: true }),
    );
    await assertFails(
      setDoc(doc(dbGVKhac(), 'exams/de-moi-2'), { teacherId: UID_GV, code: 'X2', isActive: true }),
    );
  });

  it('7. Giáo viên khác đóng/xoá đề của tôi → DENY', async () => {
    await assertFails(updateDoc(doc(dbGVKhac(), 'exams/de-cua-gv'), { isActive: false }));
    await assertFails(deleteDoc(doc(dbGVKhac(), 'exams/de-cua-gv')));
  });
});

describe('examSubmissions · học sinh nặc danh vào thi', () => {
  it('8. Tạo bài làm hợp lệ trên đề đang mở → ALLOW', async () => {
    await assertSucceeds(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({ id: 'bai-moi' })),
    );
  });

  it('9. Document id không khớp field id → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({ id: 'id-khac' })),
    );
  });

  it('10. Vào thi đề ĐÃ ĐÓNG (isActive = false) → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({
        id: 'bai-moi', examId: 'de-da-dong', examCode: 'DONG99',
      })),
    );
  });

  it('11. examCode không khớp mã của đề → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({ id: 'bai-moi', examCode: 'SAI999' })),
    );
  });

  it('12. clientNonce ngắn hơn 24 ký tự → DENY (subId phải khó đoán)', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({ id: 'bai-moi', clientNonce: 'ngan' })),
    );
  });

  it('13. Tạo bài đã ở trạng thái submitted → DENY (phải bắt đầu từ in_progress)', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({ id: 'bai-moi', status: 'submitted' })),
    );
  });

  it('14. Tạo bài với tên học sinh rỗng → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/bai-moi'), baiLamMau({ id: 'bai-moi', studentName: '' })),
    );
  });

  it('14b. Học sinh không được ghi trực tiếp attempt thuộc lớp — phải qua API server', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'examSubmissions/class-attempt'), baiLamMau({
        id: 'class-attempt', classId: 'lop-1', assignmentId: 'assignment-1',
      })),
    );
  });
});

describe('examSubmissions · học sinh làm bài và nộp', () => {
  it('15. Ghi đáp án khi bài còn in_progress → ALLOW', async () => {
    await assertSucceeds(
      updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), { answers: [{ cau: 1, chon: 'A' }] }),
    );
  });

  it('16. Nộp bài (in_progress → submitted) → ALLOW', async () => {
    await assertSucceeds(
      updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), {
        status: 'submitted', submittedAt: '2026-08-01T01:20:00.000Z', totalScore: 7,
      }),
    );
  });

  it('17. Học sinh tự đặt status = graded → DENY (chỉ giáo viên/AI chấm)', async () => {
    await assertFails(
      updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), { status: 'graded', totalScore: 10 }),
    );
  });

  it('18. totalScore vượt maxScore → DENY', async () => {
    await assertFails(
      updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), { status: 'submitted', totalScore: 99 }),
    );
  });

  it('19. Đổi tên học sinh sau khi đã tạo → DENY', async () => {
    await assertFails(
      updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), { studentName: 'Người khác' }),
    );
  });

  it('20. Đổi maxScore để nới trần điểm → DENY', async () => {
    await assertFails(updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), { maxScore: 100 }));
  });

  it('21. Chuyển bài sang đề khác → DENY', async () => {
    await assertFails(updateDoc(doc(dbHS(), 'examSubmissions/bai-lam-1'), { examId: 'de-da-dong' }));
  });

  it('22. Sửa lại bài ĐÃ NỘP → DENY', async () => {
    await assertFails(
      updateDoc(doc(dbHS(), 'examSubmissions/bai-da-nop'), { answers: [{ cau: 1, chon: 'B' }] }),
    );
  });

  it('23. Học sinh xoá bài làm để thi lại → DENY', async () => {
    await assertFails(deleteDoc(doc(dbHS(), 'examSubmissions/bai-lam-1')));
  });
});

describe('examSubmissions · đọc kết quả', () => {
  it('24. Đọc bài ĐÃ NỘP qua link kết quả → ALLOW (subId khó đoán là hàng rào)', async () => {
    await assertSucceeds(getDoc(doc(dbHS(), 'examSubmissions/bai-da-nop')));
  });

  it('25. Đọc bài người khác đang làm dở → DENY (chống nhìn bài)', async () => {
    await assertFails(getDoc(doc(dbHS(), 'examSubmissions/bai-lam-1')));
  });

  it('26. Giáo viên chủ đề đọc bài đang làm dở → ALLOW (trang theo dõi)', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), 'examSubmissions/bai-lam-1')));
  });

  it('27. Giáo viên KHÔNG phải chủ đề đọc bài → DENY', async () => {
    await assertFails(getDoc(doc(dbGVKhac(), 'examSubmissions/bai-lam-1')));
  });

  it('28. Giáo viên chủ đề chấm bài (đặt graded) → ALLOW', async () => {
    await assertSucceeds(
      updateDoc(doc(dbGV(), 'examSubmissions/bai-da-nop'), { status: 'graded', totalScore: 9 }),
    );
  });

  it('29. Giáo viên khác chấm bài đề của tôi → DENY', async () => {
    await assertFails(
      updateDoc(doc(dbGVKhac(), 'examSubmissions/bai-da-nop'), { status: 'graded', totalScore: 1 }),
    );
  });

  it('30. Giáo viên chủ đề xoá bài → ALLOW; giáo viên khác xoá → DENY', async () => {
    await assertFails(deleteDoc(doc(dbGVKhac(), 'examSubmissions/bai-lam-1')));
    await assertSucceeds(deleteDoc(doc(dbGV(), 'examSubmissions/bai-lam-1')));
  });
});

// `allow read: if true` ở đây là CỐ Ý — HTML chạy trong iframe đã sandbox nên
// đọc công khai là an toàn. Hàng rào thật nằm ở phía ghi.
describe('lessonSimulations · mô phỏng bài học', () => {
  it('31. Ai cũng đọc được mô phỏng → ALLOW (cố ý, HTML đã sandbox iframe)', async () => {
    await assertSucceeds(getDoc(doc(dbHS(), 'lessonSimulations/mo-phong-1')));
  });

  it('32. Người chưa đăng nhập tạo mô phỏng → DENY', async () => {
    await assertFails(
      setDoc(doc(dbHS(), 'lessonSimulations/mp-moi'), {
        createdBy: UID_GV, lessonId: 'bai-1', html: '<div>x</div>',
      }),
    );
  });

  it('33. Tạo mô phỏng gán createdBy cho người khác → DENY', async () => {
    await assertFails(
      setDoc(doc(dbGVKhac(), 'lessonSimulations/mp-moi'), {
        createdBy: UID_GV, lessonId: 'bai-1', html: '<div>x</div>',
      }),
    );
  });

  it('34. HTML vượt trần 200.000 ký tự → DENY', async () => {
    await assertFails(
      setDoc(doc(dbGV(), 'lessonSimulations/mp-moi'), {
        createdBy: UID_GV, lessonId: 'bai-1', html: 'x'.repeat(200_001),
      }),
    );
  });

  it('35. Người khác sửa/xoá mô phỏng của tôi → DENY', async () => {
    await assertFails(updateDoc(doc(dbGVKhac(), 'lessonSimulations/mo-phong-1'), { html: '<script>x</script>' }));
    await assertFails(deleteDoc(doc(dbGVKhac(), 'lessonSimulations/mo-phong-1')));
  });

  it('36. Chủ sở hữu sửa mô phỏng của mình → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbGV(), 'lessonSimulations/mo-phong-1'), { html: '<div>đã sửa</div>' }));
  });
});

// externalTools chỉ admin (custom claim `admin`) mới ghi được. Claim này gán
// ngoài app — app không bao giờ được tự cấp.
describe('externalTools · registry công cụ ngoài', () => {
  it('37. Giáo viên thường đọc công cụ đã active → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), 'externalTools/tool-active')));
  });

  it('38. Giáo viên thường đọc công cụ đang chờ duyệt → DENY', async () => {
    await assertFails(getDoc(doc(dbGV(), 'externalTools/tool-cho-duyet')));
  });

  it('39. Giáo viên thường lọc status == active → ALLOW; liệt kê không lọc → DENY', async () => {
    await assertSucceeds(
      getDocs(query(collection(dbGV(), 'externalTools'), where('status', '==', 'active'))),
    );
    await assertFails(getDocs(query(collection(dbGV(), 'externalTools'))));
  });

  it('40. Admin đọc cả công cụ chờ duyệt → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbAdmin(), 'externalTools/tool-cho-duyet')));
  });

  it('41. Giáo viên thường tự thêm công cụ → DENY', async () => {
    await assertFails(setDoc(doc(dbGV(), 'externalTools/tool-moi'), congCuMau('tool-moi')));
  });

  it('42. Admin thêm công cụ hợp lệ → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbAdmin(), 'externalTools/tool-moi'), congCuMau('tool-moi')));
  });

  it('43. toolId không khớp document id → DENY', async () => {
    await assertFails(setDoc(doc(dbAdmin(), 'externalTools/tool-moi'), congCuMau('id-khac')));
  });

  it('44. URL http:// thay vì https:// → DENY (iframe nhúng phải là https)', async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), 'externalTools/tool-moi'), congCuMau('tool-moi', { url: 'http://vi-du.vn' })),
    );
  });

  it('45. Thêm field ngoài schema (hasOnly) → DENY', async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), 'externalTools/tool-moi'), congCuMau('tool-moi', { scriptTuChon: 'alert(1)' })),
    );
  });

  it('46. sandboxPreset ngoài ba giá trị cho phép → DENY', async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), 'externalTools/tool-moi'), congCuMau('tool-moi', { sandboxPreset: 'khong-sandbox' })),
    );
  });

  it('47. Giáo viên thường tự duyệt công cụ (pending → active) → DENY', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'externalTools/tool-cho-duyet'), { status: 'active' }));
  });

  it('48. Giáo viên thường xoá công cụ → DENY; admin xoá → ALLOW', async () => {
    await assertFails(deleteDoc(doc(dbGV(), 'externalTools/tool-active')));
    await assertSucceeds(deleteDoc(doc(dbAdmin(), 'externalTools/tool-active')));
  });
});
