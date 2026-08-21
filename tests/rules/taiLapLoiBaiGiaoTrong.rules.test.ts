/**
 * Tái lập lỗi "Missing or insufficient permissions" người dùng báo 2026-08-21 khi mở bảng
 * bài giao, SAU KHI đã vá phần nuốt lỗi.
 *
 * Chạy ĐÚNG truy vấn app gọi: where('classId','==',X), không kèm orderBy.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const UID_GV = 'uid-gv';
const UID_HS = 'uid-hs';
const HS = 'student-1';
const LOP = 'class-1';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'baigiao-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'classes', LOP), {
      id: LOP, teacherId: UID_GV, name: '10Olinda', track: '', grade: '10',
      joinCode: 'ACDEFG', studentCount: 18, createdAt: 'x', updatedAt: 'x',
    });
    await setDoc(doc(db, 'studentLinks', UID_HS), {
      uid: UID_HS, studentId: HS, classId: LOP, teacherId: UID_GV, createdAt: 'x',
    });
    await setDoc(doc(db, 'submissions', 'sub_1'), {
      id: 'sub_1', teacherId: UID_GV, classId: LOP, studentId: HS, assignmentId: 'asg_1',
      fileUrls: ['https://x/a.jpg'], note: '', status: 'submitted', createdAt: 'x', updatedAt: 'x',
    });
    await setDoc(doc(db, 'assignments', 'asg_1'), {
      id: 'asg_1', teacherId: UID_GV, classId: LOP, title: 'BTVN Đại số',
      description: '', type: 'upload', isOpen: true, createdAt: 'x', updatedAt: 'x',
      answerKey: 'x', rubric: '', maxScore: 10,
    });
  });
});

const dbGV = () => testEnv.authenticatedContext(UID_GV, { email: 'gv@gmail.com' }).firestore();
const dbHS = () => testEnv.authenticatedContext(UID_HS, {}).firestore();

describe('giáo viên mở bảng bài giao', () => {
  it('LỖI CŨ: thiếu ràng buộc teacherId thì Firestore TỪ CHỐI, dù dữ liệu hợp lệ', async () => {
    // Firestore không chấm luật trên từng document trả về — nó đòi truy vấn tự chứng minh được.
    // Luật đòi teacherId == uid, truy vấn chỉ lọc classId, nên bị từ chối.
    const q = query(collection(dbGV(), 'assignments'), where('classId', '==', LOP));
    await assertFails(getDocs(q));
  });

  it('CÁCH SỬA: thêm teacherId vào chính truy vấn → chạy', async () => {
    const q = query(
      collection(dbGV(), 'assignments'),
      where('teacherId', '==', UID_GV),
      where('classId', '==', LOP),
    );
    await assertSucceeds(getDocs(q));
  });

  it('giáo viên khác KHÔNG đọc được bài của lớp này', async () => {
    const db = testEnv.authenticatedContext('uid-nguoi-la', { email: 'la@gmail.com' }).firestore();
    await assertFails(getDocs(query(collection(db, 'assignments'), where('classId', '==', LOP))));
  });
});

// Mọi truy vấn THẬT mà client gọi — soi từng cái, vì Firestore đòi truy vấn tự chứng minh
// được là thoả luật, chứ không chấm từng document trả về.
describe('soi TẤT CẢ truy vấn client đang dùng', () => {
  it('giáo viên: danh sách bài nộp của một bài giao', async () => {
    await assertSucceeds(getDocs(query(
      collection(dbGV(), 'submissions'),
      where('teacherId', '==', UID_GV),
      where('assignmentId', '==', 'asg_1'),
    )));
  });

  it('giáo viên: bài nộp của một học sinh (bảng báo cáo)', async () => {
    await assertSucceeds(getDocs(query(
      collection(dbGV(), 'submissions'),
      where('teacherId', '==', UID_GV),
      where('studentId', '==', HS),
    )));
  });

  it('giáo viên: danh sách lớp của mình', async () => {
    await assertSucceeds(getDocs(query(
      collection(dbGV(), 'classes'),
      where('teacherId', '==', UID_GV),
    )));
  });

  it('học sinh: bài được giao đang mở của lớp mình', async () => {
    await assertSucceeds(getDocs(query(
      collection(dbHS(), 'assignments'),
      where('classId', '==', LOP),
      where('isOpen', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50),
    )));
  });

  it('học sinh: bài nộp của chính mình', async () => {
    await assertSucceeds(getDocs(query(
      collection(dbHS(), 'submissions'),
      where('studentId', '==', HS),
      orderBy('createdAt', 'desc'),
      limit(50),
    )));
  });
});

// Xem lại và sửa nội dung bài ĐÃ giao. Thiếu đường này thì cơ chế "đáp án AI giải ra phải để
// giáo viên soát" chỉ đúng đúng một lần lúc bấm Giao bài.
describe('sửa và xoá bài đã giao', () => {
  it('giáo viên sửa được đáp án và hướng dẫn chấm', async () => {
    await assertSucceeds(updateDoc(doc(dbGV(), 'assignments', 'asg_1'), {
      answerKey: 'Câu 5 sửa lại: x = 3',
      rubric: 'Sai dấu trừ 0,25',
      updatedAt: 'y',
    }));
  });

  it('giáo viên xoá được bài của mình', async () => {
    await assertSucceeds(deleteDoc(doc(dbGV(), 'assignments', 'asg_1')));
  });

  it('KHÔNG được đổi chủ bài sang người khác', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'assignments', 'asg_1'), { teacherId: 'uid-nguoi-la' }));
  });

  it('KHÔNG được chuyển bài sang lớp khác', async () => {
    await assertFails(updateDoc(doc(dbGV(), 'assignments', 'asg_1'), { classId: 'class-khac' }));
  });

  it('người lạ không sửa được', async () => {
    const db = testEnv.authenticatedContext('uid-nguoi-la', { email: 'la@gmail.com' }).firestore();
    await assertFails(updateDoc(doc(db, 'assignments', 'asg_1'), { answerKey: 'pha hoai' }));
  });

  it('học sinh không xoá được bài giao', async () => {
    await assertFails(deleteDoc(doc(dbHS(), 'assignments', 'asg_1')));
  });
});
