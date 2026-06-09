import fetch from 'node-fetch';

/**
 * Hướng dẫn sử dụng E2E Test:
 * Bạn cần thay thế 3 giá trị dưới đây bằng ID thật từ Firebase của bạn.
 */
const TEACHER_ID = '24YyULmWgBOM6HZCfJ56RN5tiet2';
const LESSON_ID = 'adaptive-math-11-arithmetic-sequence';
const STUDENT_CODE = 'HS_TEST_01'; // Có thể tự do đặt mã học sinh

const API_URL = 'https://giaoandewey.vercel.app/api/adaptive-progress';

async function runE2ETest() {
  console.log(`🚀 Bắt đầu giả lập nộp bài lên: ${API_URL}`);
  
  const studentId = `${TEACHER_ID}_${STUDENT_CODE}`;
  const progressId = `${TEACHER_ID}_${LESSON_ID}_${STUDENT_CODE}`;
  
  const payload = {
    teacherId: TEACHER_ID,
    lessonId: LESSON_ID,
    progressId: progressId,
    studentId: studentId,
    progressRecord: {
      id: progressId,
      teacherId: TEACHER_ID,
      lessonId: LESSON_ID,
      studentId: studentId,
      studentCode: STUDENT_CODE,
      studentName: 'E2E Test Student',
      lessonTitle: 'Bài kiểm tra tự động E2E',
      route: 'standard',
      status: 'completed',
      diagnosticAttempt: { score: 8, maxScore: 10, recommendedRoute: 'standard' },
      quickCheckAttempts: [],
      objectiveStates: [],
      remediationAttempts: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    },
    profileRecord: {
      id: studentId,
      teacherId: TEACHER_ID,
      studentId: studentId,
      studentCode: STUDENT_CODE,
      studentName: 'E2E Test Student',
      totalSessions: 1,
      averageMastery: 0.8,
      routeHistory: ['standard'],
      objectiveMemory: [],
      misconceptionCounts: {},
      lastLessonId: LESSON_ID,
      lastLessonTitle: 'Bài kiểm tra tự động E2E',
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  try {
    console.log('📦 Đang gửi payload:', JSON.stringify(payload, null, 2));
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.text();

    console.log('\n--- KẾT QUẢ ---');
    console.log(`Status Code: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ API OK — Firestore đã nhận dữ liệu học sinh thành công!');
    } else if (response.status === 400) {
      console.log('❌ Lỗi 400: Payload thiếu field — hãy kiểm tra lại Schema.');
    } else if (response.status === 403) {
      console.log('❌ Lỗi 403: Bị chặn. Có thể portalEnabled=false hoặc lessonId/teacherId không khớp thật trên Firestore.');
    } else if (response.status === 500) {
      console.log('❌ Lỗi 500: Server sập. Khả năng cao do thiếu biến môi trường Firebase Admin trên Vercel.');
    } else {
      console.log('⚠️ Trạng thái không xác định:', body);
    }
    
    console.log('Chi tiết Body trả về:', body);
    
  } catch (err) {
    console.error('❌ Lỗi kết nối API:', err);
  }
}

runE2ETest();
