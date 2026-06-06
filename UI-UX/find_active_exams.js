import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtWzHYQWUahuteQ_6fnWHiwf1Iuxy4Z8c",
  authDomain: "smartplan-ai-14200.firebaseapp.com",
  projectId: "smartplan-ai-14200",
  storageBucket: "smartplan-ai-14200.firebasestorage.app",
  messagingSenderId: "1030734458631",
  appId: "1:1030734458631:web:ec22242e491ea567fc5fa2",
  measurementId: "G-JQ4QX69VL6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAnonymousWrite() {
  console.log('Đang thử đăng nhập ẩn danh...');
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log(`Đăng nhập ẩn danh thành công! UID: ${user.uid}`);
    
    // Thử tạo một đề thi với teacherId = UID ẩn danh
    console.log('Thử ghi đè thi vào Firestore...');
    const examId = `exam-test-${Date.now()}`;
    const mockExam = {
      id: examId,
      code: "TEST99",
      title: "Đề thi thử nghiệm ẩn danh",
      subjectId: "toan",
      teacherId: user.uid,
      teacherName: "Giáo viên ẩn danh",
      questions: [
        {
          id: "q1",
          type: "essay",
          content: "Câu hỏi tự luận thử nghiệm",
          points: 10
        }
      ],
      durationMinutes: 45,
      maxScore: 10,
      isActive: true,
      allowReview: true,
      shuffleQuestions: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tfScoringMode: "all_or_nothing"
    };

    await setDoc(doc(db, 'exams', examId), mockExam);
    console.log('Ghi đề thi thành công!');
  } catch (error) {
    console.error('Thử nghiệm thất bại:', error);
  }
}

testAnonymousWrite();
