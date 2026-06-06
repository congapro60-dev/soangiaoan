import puppeteer from 'puppeteer';
import path from 'path';

const OUT_DIR = 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX';

const mockExam = {
  id: "demo-exam-123",
  code: "DEWEY10",
  title: "Đề thi thử nghiệm năng lực Dewey",
  subjectId: "literature",
  teacherId: "demo-agent-001",
  teacherName: "Giáo viên Dewey",
  durationMinutes: 45,
  maxScore: 10,
  isActive: true,
  allowReview: true,
  shuffleQuestions: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tfScoringMode: "all_or_nothing",
  questions: [
    {
      id: "q1",
      type: "essay",
      content: "Trình bày suy nghĩ của em về thông điệp 'Xanh Dương Tri Thức'.",
      points: 5
    },
    {
      id: "q2",
      type: "mcq",
      content: "Phương pháp giáo dục cốt lõi tại hệ thống trường Dewey là gì?",
      points: 5,
      options: ["Học qua trải nghiệm", "Học thuộc lòng", "Học lý thuyết", "Học thụ động"],
      answer: "Học qua trải nghiệm"
    }
  ]
};

const mockSubmission = {
  id: "demo-sub-123",
  examId: "demo-exam-123",
  studentName: "Nguyễn Văn A",
  studentClass: "10A1",
  startedAt: new Date(Date.now() - 1800000).toISOString(),
  submittedAt: new Date(Date.now() - 600000).toISOString(),
  status: "submitted",
  tabSwitches: 1,
  maxScore: 10,
  answers: [
    { questionId: "q1", answer: "Em tin rằng màu xanh đại diện cho tri thức." },
    { questionId: "q2", answer: "Học qua trải nghiệm", autoScore: 5 }
  ]
};

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 0. Login first
    console.log('Logging in to Vercel...');
    await page.goto('https://giaoandewey.vercel.app/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chế độ dùng thử'));
      if (btn) btn.click();
    });
    await page.waitForSelector('main', { timeout: 15000 });

    // 1. Exam Config Page
    console.log('Capturing Exam Config Page...');
    await page.goto('https://giaoandewey.vercel.app/exam/demo-exam-123/config', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('Không tìm thấy đề thi') || document.body.innerText.includes('Cài đặt phòng thi'), { timeout: 15000 });
    
    await page.evaluate((exam) => {
      const main = document.querySelector('main') || document.body;
      const key = Object.keys(main).find(k => k.startsWith('__reactFiber$'));
      if (!key) return;
      let fiber = main[key];
      while (fiber) {
        if (fiber.memoizedState) {
          let hook = fiber.memoizedState;
          let hooks = [];
          while (hook) { hooks.push(hook); hook = hook.next; }
          // Look for ExamConfigPage signature: null, false, false, object
          for (let i = 0; i < hooks.length - 3; i++) {
            if (hooks[i].memoizedState === null && 
                hooks[i+1].memoizedState === false && 
                hooks[i+2].memoizedState === false && 
                typeof hooks[i+3].memoizedState === 'object') {
              hooks[i].queue.dispatch(exam); // setExam
              hooks[i+3].queue.dispatch(exam); // setForm
              return;
            }
          }
        }
        fiber = fiber.return;
      }
    }, mockExam);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, '17_exam_config_page.png') });
    console.log('Saved 17_exam_config_page.png');

    // 2. Teacher Grading Page
    console.log('Capturing Teacher Grading Page...');
    await page.goto('https://giaoandewey.vercel.app/exam/demo-exam-123/grade', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('Không tìm thấy đề thi') || document.body.innerText.includes('Chấm bài tự luận'), { timeout: 15000 });
    
    await page.evaluate((exam, sub) => {
      const main = document.querySelector('main') || document.body;
      const key = Object.keys(main).find(k => k.startsWith('__reactFiber$'));
      if (!key) return;
      let fiber = main[key];
      while (fiber) {
        if (fiber.memoizedState) {
          let hook = fiber.memoizedState;
          let hooks = [];
          while (hook) { hooks.push(hook); hook = hook.next; }
          for (let i = 0; i < hooks.length - 4; i++) {
            if (hooks[i].memoizedState === null && 
                Array.isArray(hooks[i+1].memoizedState) && 
                hooks[i+2].memoizedState === false &&
                hooks[i+3].memoizedState === null) {
              hooks[i].queue.dispatch(exam); // setExam
              hooks[i+1].queue.dispatch([sub]); // setSubmissions
              return;
            }
          }
        }
        fiber = fiber.return;
      }
    }, mockExam, mockSubmission);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, '18_teacher_grading_page.png') });
    console.log('Saved 18_teacher_grading_page.png');

    // 3. Student Exam Intro (Does not need login, but we are already logged in, which is fine, actually wait, students don't log in! It's better to use an incognito page or it doesn't matter)
    console.log('Capturing Student Exam Intro...');
    await page.goto('https://giaoandewey.vercel.app/exam/DEWEY10', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('Không tìm thấy đề thi') || document.body.innerText.includes('Bắt đầu làm bài'), { timeout: 15000 });
    
    await page.evaluate((exam) => {
      const main = document.querySelector('main') || document.body;
      const key = Object.keys(main).find(k => k.startsWith('__reactFiber$'));
      if (!key) return;
      let fiber = main[key];
      while (fiber) {
        if (fiber.memoizedState) {
          let hook = fiber.memoizedState;
          let hooks = [];
          while (hook) { hooks.push(hook); hook = hook.next; }
          for (let i = 0; i < hooks.length - 2; i++) {
            if (hooks[i].memoizedState === null && 
                hooks[i+1].memoizedState === false && 
                hooks[i+2].memoizedState === null) {
              hooks[i].queue.dispatch(exam); // setExam
              return;
            }
          }
        }
        fiber = fiber.return;
      }
    }, mockExam);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, '19_student_exam_intro.png') });
    console.log('Saved 19_student_exam_intro.png');

    // 4. Student Exam Workspace
    console.log('Capturing Student Exam Workspace...');
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      if (inputs.length >= 2) {
        inputs[0].value = 'Học sinh Demo';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].value = '10A1';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.textContent && b.textContent.includes('Bắt đầu làm bài'));
      if (startBtn) startBtn.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(OUT_DIR, '20_student_exam_workspace.png') });
    console.log('Saved 20_student_exam_workspace.png');

    // 5. Student Exam Result
    console.log('Capturing Student Exam Result...');
    await page.goto('https://giaoandewey.vercel.app/exam/DEWEY10/result/demo-sub-123', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('Không tìm thấy') || document.body.innerText.includes('Kết quả bài thi'), { timeout: 15000 });
    
    await page.evaluate((exam, sub) => {
      const main = document.querySelector('main') || document.body;
      const key = Object.keys(main).find(k => k.startsWith('__reactFiber$'));
      if (!key) return;
      let fiber = main[key];
      while (fiber) {
        if (fiber.memoizedState) {
          let hook = fiber.memoizedState;
          let hooks = [];
          while (hook) { hooks.push(hook); hook = hook.next; }
          for (let i = 0; i < hooks.length - 2; i++) {
            if (hooks[i].memoizedState === null && 
                hooks[i+1].memoizedState === null && 
                hooks[i+2].memoizedState === false) {
              hooks[i].queue.dispatch(exam); // setExam
              hooks[i+1].queue.dispatch(sub); // setSubmission
              return;
            }
          }
        }
        fiber = fiber.return;
      }
    }, mockExam, mockSubmission);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, '21_student_exam_result.png') });
    console.log('Saved 21_student_exam_result.png');

    console.log('All done!');

  } finally {
    await browser.close();
  }
}

run();
