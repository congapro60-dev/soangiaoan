/**
 * Kiểm thử firestore.rules cho bộ xương lớp học:
 * classes · students · studentSecrets · studentLinks · assignments · submissions · studentProfiles
 *
 *   npm run test:rules
 *
 * Chạy trên Firestore emulator. Không chạm production.
 *
 * Ba hàng rào quan trọng nhất, mỗi cái có ca riêng:
 *  - Học sinh lớp khác KHÔNG đọc được bài nộp (ca 20).
 *  - Học sinh KHÔNG sửa được điểm của chính mình (ca 24).
 *  - PIN trong `studentSecrets` không client nào đọc được, kể cả giáo viên (ca 9).
 *
 * Danh tính học sinh là uid ẩn danh + document `studentLinks/{uid}` do server ghi.
 * Trong test, `withSecurityRulesDisabled` đóng vai server đó.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const UID_GV = 'uid-giao-vien';
const UID_GV_KHAC = 'uid-giao-vien-khac';
/** uid ẩn danh của hai học sinh đã được server gắn vào lớp. */
const UID_HS_A = 'uid-an-danh-hoc-sinh-a';
const UID_HS_B = 'uid-an-danh-hoc-sinh-b';

const LOP = 'class-11-columbus';
const LOP_KHAC = 'class-10-olinda';
const HS_A = 'student-a';
const HS_B = 'student-b';

let testEnv: RulesTestEnvironment;

const baiNopMau = (ghiDe: Record<string, unknown> = {}) => ({
  id: 'bai-1',
  teacherId: UID_GV,
  classId: LOP,
  studentId: HS_A,
  assignmentId: 'bt-1',
  fileUrls: ['https://storage/bai1.jpg'],
  note: '',
  status: 'submitted',
  createdAt: '2026-08-20T01:00:00.000Z',
  updatedAt: '2026-08-20T01:00:00.000Z',
  ...ghiDe,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'lophoc-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();

    await setDoc(doc(db, `classes/${LOP}`), {
      id: LOP, teacherId: UID_GV, name: '11 Columbus', track: 'Lớp chủ nhiệm',
      grade: '11', joinCode: 'ACDEFG', studentCount: 2,
      createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    });
    await setDoc(doc(db, `classes/${LOP_KHAC}`), {
      id: LOP_KHAC, teacherId: UID_GV, name: '10 Olinda', track: '', grade: '10',
      joinCode: 'GHJKMN', studentCount: 1,
      createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    });

    await setDoc(doc(db, `classes/${LOP}/students/${HS_A}`), {
      id: HS_A, classId: LOP, teacherId: UID_GV, name: 'Đặng Tuệ Minh',
      code: '86773040', status: 'active', progress: 0, createdAt: '2026-08-20T00:00:00.000Z',
    });
    await setDoc(doc(db, `classes/${LOP_KHAC}/students/${HS_B}`), {
      id: HS_B, classId: LOP_KHAC, teacherId: UID_GV, name: 'Vũ Bảo An',
      code: 'S22070256', status: 'active', progress: 0, createdAt: '2026-08-20T00:00:00.000Z',
    });

    await setDoc(doc(db, `classes/${LOP}/studentSecrets/${HS_A}`), {
      studentId: HS_A, classId: LOP, pinHash: 'bam-cua-pin-1234', updatedAt: '2026-08-20T00:00:00.000Z',
    });

    // Server đã gắn phiên: A thuộc 11 Columbus, B thuộc 10 Olinda.
    await setDoc(doc(db, `studentLinks/${UID_HS_A}`), {
      uid: UID_HS_A, studentId: HS_A, classId: LOP, teacherId: UID_GV, createdAt: '2026-08-20T00:30:00.000Z',
    });
    await setDoc(doc(db, `studentLinks/${UID_HS_B}`), {
      uid: UID_HS_B, studentId: HS_B, classId: LOP_KHAC, teacherId: UID_GV, createdAt: '2026-08-20T00:30:00.000Z',
    });

    await setDoc(doc(db, 'assignments/bt-1'), {
      id: 'bt-1', teacherId: UID_GV, classId: LOP, title: 'Phiếu bài tập §2',
      description: '', type: 'upload', isOpen: true,
      createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    });
    await setDoc(doc(db, 'assignments/bt-dong'), {
      id: 'bt-dong', teacherId: UID_GV, classId: LOP, title: 'Bài chưa phát hành',
      description: '', type: 'upload', isOpen: false,
      createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    });
    await setDoc(doc(db, 'practiceKeys/set-1'), {
      setId: 'set-1', studentId: HS_A, classId: LOP, teacherId: UID_GV,
      questions: [{ id: 'q1', expectedAnswer: 'x = 2' }],
    });
    await setDoc(doc(db, 'practiceSets/set-1'), {
      id: 'set-1', studentId: HS_A, classId: LOP, teacherId: UID_GV,
      questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: '' }],
    });

    await setDoc(doc(db, 'submissions/bai-1'), baiNopMau());
    await setDoc(doc(db, 'submissions/bai-da-cham'), baiNopMau({
      id: 'bai-da-cham', status: 'graded',
      grade: {
        score: 8, maxScore: 10, feedback: 'Em làm tốt phần đầu.',
        strengths: [], weaknesses: [], gradedAt: '2026-08-20T02:00:00.000Z', teacherApproved: true,
      },
    }));

    await setDoc(doc(db, `studentProfiles/${HS_A}`), {
      studentId: HS_A, classId: LOP, teacherId: UID_GV, topics: [], updatedAt: '2026-08-20T02:00:00.000Z',
    });
  });
});

const dbGV = () => testEnv.authenticatedContext(UID_GV, { email: 'gv@gmail.com' }).firestore();
const dbGVKhac = () => testEnv.authenticatedContext(UID_GV_KHAC, { email: 'khac@gmail.com' }).firestore();
const dbHsA = () => testEnv.authenticatedContext(UID_HS_A).firestore();
const dbHsB = () => testEnv.authenticatedContext(UID_HS_B).firestore();
const dbLa = () => testEnv.unauthenticatedContext().firestore();

describe('classes · lớp học', () => {
  it('1. Giáo viên đọc lớp của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbGV(), `classes/${LOP}`)));
  });

  it('2. Giáo viên liệt kê lớp có lọc theo teacherId → ALLOW', async () => {
    await assertSucceeds(getDocs(query(collection(dbGV(), 'classes'), where('teacherId', '==', UID_GV))));
  });

  it('3. Liệt kê lớp KHÔNG lọc theo teacherId → DENY', async () => {
    await assertFails(getDocs(collection(dbGV(), 'classes')));
  });

  it('4. Giáo viên khác đọc lớp của tôi → DENY', async () => {
    await assertFails(getDoc(doc(dbGVKhac(), `classes/${LOP}`)));
  });

  it('5. Học sinh trong lớp đọc thông tin lớp mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbHsA(), `classes/${LOP}`)));
  });

  it('6. Học sinh lớp khác đọc lớp này → DENY', async () => {
    await assertFails(getDoc(doc(dbHsB(), `classes/${LOP}`)));
  });

  it('7. Người lạ chưa đăng nhập đọc lớp → DENY', async () => {
    await assertFails(getDoc(doc(dbLa(), `classes/${LOP}`)));
  });

  it('8. Giáo viên đổi chủ sở hữu lớp sang mình → DENY', async () => {
    await assertFails(updateDoc(doc(dbGV(), `classes/${LOP}`), { teacherId: UID_GV_KHAC }));
  });
});

describe('students · danh sách học sinh và PIN', () => {
  it('9. PIN: ngay cả giáo viên chủ lớp cũng KHÔNG đọc được studentSecrets → DENY', async () => {
    await assertFails(getDoc(doc(dbGV(), `classes/${LOP}/studentSecrets/${HS_A}`)));
  });

  it('10. Giáo viên đọc danh sách học sinh lớp mình → ALLOW', async () => {
    await assertSucceeds(getDocs(collection(dbGV(), `classes/${LOP}/students`)));
  });

  it('11. Học sinh đọc chính hồ sơ lớp của mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbHsA(), `classes/${LOP}/students/${HS_A}`)));
  });

  it('12. Học sinh liệt kê cả danh sách lớp → DENY (không rò tên bạn cùng lớp)', async () => {
    await assertFails(getDocs(collection(dbHsA(), `classes/${LOP}/students`)));
  });

  it('13. Học sinh tự sửa tiến độ của mình → DENY', async () => {
    await assertFails(updateDoc(doc(dbHsA(), `classes/${LOP}/students/${HS_A}`), { progress: 100 }));
  });
});

describe('studentLinks · phiên đăng nhập học sinh', () => {
  it('14. Học sinh đọc phiên của chính mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbHsA(), `studentLinks/${UID_HS_A}`)));
  });

  it('15. Học sinh đọc phiên của bạn khác → DENY', async () => {
    await assertFails(getDoc(doc(dbHsA(), `studentLinks/${UID_HS_B}`)));
  });

  it('16. Tự tạo phiên để nhận là học sinh khác → DENY (đường lách hiển nhiên nhất)', async () => {
    await assertFails(setDoc(doc(dbLa(), 'studentLinks/uid-gia-mao'), {
      uid: 'uid-gia-mao', studentId: HS_A, classId: LOP, teacherId: UID_GV, createdAt: '2026-08-20T03:00:00.000Z',
    }));
  });
});

describe('assignments · bài được giao', () => {
  it('17. Học sinh không đọc document assignment gốc nữa → DENY (dùng projection server)', async () => {
    await assertFails(getDoc(doc(dbHsA(), 'assignments/bt-1')));
  });

  it('18. Học sinh đọc bài CHƯA phát hành → DENY', async () => {
    await assertFails(getDoc(doc(dbHsA(), 'assignments/bt-dong')));
  });

  it('19. Học sinh lớp khác đọc bài của lớp này → DENY', async () => {
    await assertFails(getDoc(doc(dbHsB(), 'assignments/bt-1')));
  });

  it('19a. Học sinh không đọc được practice key chứa expectedAnswer → DENY', async () => {
    await assertFails(getDoc(doc(dbHsA(), 'practiceKeys/set-1')));
  });

  it('19b. Học sinh không đọc trực tiếp practice set/attempt → DENY (đi qua API)', async () => {
    await assertFails(getDoc(doc(dbHsA(), 'practiceSets/set-1')));
    await assertFails(getDoc(doc(dbHsA(), 'practiceAttempts/attempt-1')));
  });
});

describe('submissions · bài nộp', () => {
  it('20. Học sinh lớp khác đọc bài nộp của em này → DENY', async () => {
    await assertFails(getDoc(doc(dbHsB(), 'submissions/bai-1')));
  });

  it('21. Học sinh không đọc raw submission vì có note nội bộ → DENY (dùng projection API)', async () => {
    await assertFails(getDoc(doc(dbHsA(), 'submissions/bai-1')));
  });

  it('22. Học sinh nộp bài hợp lệ → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbHsA(), 'submissions/bai-moi'), baiNopMau({ id: 'bai-moi' })));
  });

  it('23. Học sinh nộp bài kèm sẵn điểm → DENY (tự chấm cho mình)', async () => {
    await assertFails(setDoc(doc(dbHsA(), 'submissions/bai-gian'), baiNopMau({
      id: 'bai-gian',
      grade: {
        score: 10, maxScore: 10, feedback: 'tuyệt vời', strengths: [], weaknesses: [],
        gradedAt: '2026-08-20T03:00:00.000Z', teacherApproved: true,
      },
    })));
  });

  it('24. Học sinh sửa điểm bài đã chấm của chính mình → DENY', async () => {
    await assertFails(updateDoc(doc(dbHsA(), 'submissions/bai-da-cham'), {
      grade: {
        score: 10, maxScore: 10, feedback: 'Em làm tốt phần đầu.', strengths: [], weaknesses: [],
        gradedAt: '2026-08-20T02:00:00.000Z', teacherApproved: true,
      },
    }));
  });

  it('25. Học sinh nộp bài đứng tên bạn khác → DENY', async () => {
    await assertFails(setDoc(doc(dbHsB(), 'submissions/bai-mao-danh'), baiNopMau({ id: 'bai-mao-danh' })));
  });

  it('26. Học sinh nộp lại file khi bài chưa chấm → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbHsA(), 'submissions/bai-1'), {
      fileUrls: ['https://storage/bai1-chup-lai.jpg'],
      updatedAt: '2026-08-20T01:30:00.000Z',
    }));
  });

  it('27. Học sinh nộp lại file sau khi đã chấm → DENY', async () => {
    await assertFails(updateDoc(doc(dbHsA(), 'submissions/bai-da-cham'), {
      fileUrls: ['https://storage/thay-bai.jpg'],
      updatedAt: '2026-08-20T03:00:00.000Z',
    }));
  });

  it('28. Nộp lại kèm lén đổi trạng thái sang graded → DENY', async () => {
    await assertFails(updateDoc(doc(dbHsA(), 'submissions/bai-1'), {
      fileUrls: ['https://storage/x.jpg'], status: 'graded', updatedAt: '2026-08-20T01:30:00.000Z',
    }));
  });

  it('29. Giáo viên ghi điểm cho bài nộp → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbGV(), 'submissions/bai-1'), {
      status: 'graded',
      grade: {
        score: 7.5, maxScore: 10, feedback: 'Câu 5 nhầm dấu.', strengths: [], weaknesses: ['dấu khi thay toạ độ'],
        gradedAt: '2026-08-20T04:00:00.000Z', teacherApproved: true,
      },
    }));
  });

  it('30. Giáo viên khác đọc bài nộp của lớp tôi → DENY', async () => {
    await assertFails(getDoc(doc(dbGVKhac(), 'submissions/bai-1')));
  });
});

describe('studentProfiles · hồ sơ tích luỹ', () => {
  it('31. Học sinh đọc hồ sơ của chính mình → ALLOW', async () => {
    await assertSucceeds(getDoc(doc(dbHsA(), `studentProfiles/${HS_A}`)));
  });

  it('32. Học sinh đọc hồ sơ của bạn khác → DENY', async () => {
    await assertFails(getDoc(doc(dbHsB(), `studentProfiles/${HS_A}`)));
  });

  it('33. Học sinh tự sửa hồ sơ năng lực của mình → DENY', async () => {
    await assertFails(updateDoc(doc(dbHsA(), `studentProfiles/${HS_A}`), { topics: [] }));
  });

  it('34. Giáo viên cập nhật hồ sơ → ALLOW', async () => {
    await assertSucceeds(updateDoc(doc(dbGV(), `studentProfiles/${HS_A}`), {
      topics: [{ topic: 'Phương trình đường thẳng', level: 'weak', evidenceSubmissionIds: ['bai-1'], updatedAt: '2026-08-20T04:00:00.000Z' }],
      updatedAt: '2026-08-20T04:00:00.000Z',
    }));
  });

  it('35. Giáo viên xoá lớp của mình → ALLOW', async () => {
    await assertSucceeds(deleteDoc(doc(dbGV(), `classes/${LOP}`)));
  });
});

describe('studentSkillEvidence · ledger server-only', () => {
  it('36. Mọi client đọc/ghi ledger skill trực tiếp → DENY', async () => {
    const payload = {
      studentId: HS_A,
      classId: LOP,
      teacherId: UID_GV,
      evidenceId: 'submission-1:math.line-equation',
      skillId: 'math.line-equation',
      source: 'homework',
    };

    await assertFails(getDoc(doc(dbGV(), 'studentSkillEvidence/e-1')));
    await assertFails(getDocs(collection(dbHsA(), 'studentSkillEvidence')));
    await assertFails(setDoc(doc(dbGV(), 'studentSkillEvidence/e-1'), payload));
    await assertFails(deleteDoc(doc(dbGV(), 'studentSkillEvidence/e-1')));
  });
});

describe('submissionGradeHistory · audit server-only', () => {
  it('client không đọc/ghi/xóa được lịch sử điểm', async () => {
    const payload = {
      id: 'history-1', submissionId: 'bai-da-cham', teacherId: UID_GV,
      classId: LOP, studentId: HS_A, assignmentId: 'bt-1', action: 'manual_edit',
      actorUid: UID_GV, grade: { score: 8, maxScore: 10 }, createdAt: '2026-08-24T10:00:00.000Z',
    };

    await assertFails(getDoc(doc(dbGV(), 'submissionGradeHistory/history-1')));
    await assertFails(getDocs(collection(dbHsA(), 'submissionGradeHistory')));
    await assertFails(setDoc(doc(dbGV(), 'submissionGradeHistory/history-1'), payload));
    await assertFails(updateDoc(doc(dbGV(), 'submissionGradeHistory/history-1'), { action: 'delete' }));
    await assertFails(deleteDoc(doc(dbGV(), 'submissionGradeHistory/history-1')));
  });
});
