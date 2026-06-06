import puppeteer from 'puppeteer';

async function run() {
  console.log('=== INJECT MOCK EXAMS AND TAKE SCREENSHOT ===');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    const url = 'https://giaoandewey.vercel.app/';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Login
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chế độ dùng thử'));
      if (btn) btn.click();
    });
    
    await page.waitForSelector('main', { timeout: 10000 });

    // Chuyển sang Thi online
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside nav button'));
      const examsBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('thi online'));
      if (examsBtn) examsBtn.click();
    });
    
    // Wait for + Tạo đề mới button
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.textContent && b.textContent.includes('Tạo đề mới'));
    }, { timeout: 10000 });

    // Inject mock exams
    console.log('Injecting mock exams...');
    await page.evaluate(() => {
      // Find the "+ Tạo đề mới" button
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Tạo đề mới'));
      if (!btn) throw new Error('Tạo đề mới button not found');

      const key = Object.keys(btn).find(k => k.startsWith('__reactFiber$'));
      if (!key) throw new Error('Fiber key not found');

      let fiber = btn[key];
      let examsTabFiber = null;
      while (fiber) {
        // Find the component with 8 hooks (ExamsTab)
        if (fiber.memoizedState && fiber.memoizedState.queue) {
          // Check if it's the ExamsTab component by counting state hooks
          let count = 0;
          let hook = fiber.memoizedState;
          while (hook && hook.hasOwnProperty('memoizedState')) {
            count++;
            hook = hook.next;
          }
          if (count === 8) {
            examsTabFiber = fiber;
            break;
          }
        }
        fiber = fiber.return;
      }

      if (!examsTabFiber) throw new Error('ExamsTab fiber not found');

      // Hook 1 (index 0) is exams hook
      const examsHook = examsTabFiber.memoizedState;
      
      const mockExams = [
        {
          id: "demo-exam-essay",
          code: "TLDEWEY",
          title: "Đề kiểm tra Tự luận Văn học Dewey (Chụp ảnh UI/UX)",
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
              content: "Trình bày suy nghĩ của em về thông điệp 'Xanh Dương Tri Thức' trong việc xây dựng môi trường học tập tự chủ và sáng tạo.",
              points: 10
            }
          ]
        },
        {
          id: "demo-exam-mcq",
          code: "MCQDEWEY",
          title: "Đề trắc nghiệm Smart Grid Toán 10 (Chụp ảnh UI/UX)",
          subjectId: "math",
          teacherId: "demo-agent-001",
          teacherName: "Giáo viên Dewey",
          durationMinutes: 15,
          maxScore: 10,
          isActive: false,
          allowReview: true,
          shuffleQuestions: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          tfScoringMode: "all_or_nothing",
          questions: [
            {
              id: "q1",
              type: "mcq",
              content: "Cho hàm số y = ax^2 + bx + c. Tìm phát biểu đúng.",
              points: 5,
              options: ["Hàm số đồng biến trên R", "Đồ thị là một parabol", "Đỉnh parabol luôn nằm trên trục hoành", "Hàm số luôn có cực trị"],
              answer: "Đồ thị là một parabol"
            }
          ]
        }
      ];

      // Dispatch to set exams!
      examsHook.queue.dispatch(mockExams);
    });

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX\\exams_injected.png' });
    console.log('Saved exams_injected.png');

  } finally {
    await browser.close();
  }
}

run();
