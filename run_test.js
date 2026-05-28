import puppeteer from 'puppeteer';
import readline from 'readline';

function askUserInput(page, stepName, errorMessage) {
  return new Promise((resolve) => {
    console.log('\n======================================================');
    console.log('\x1b[33m%s\x1b[0m', `⚠️  [CẢNH BÁO]: Tôi đang bị vướng ở bước [${stepName}].`);
    console.log('\x1b[33m%s\x1b[0m', `Lý do lỗi: ${errorMessage}`);
    console.log('Trình duyệt đã được giữ nguyên hiện trường.');
    console.log('Xin mời Trưởng nhóm chụp ảnh màn hình hoặc hướng dẫn bằng lệnh để tôi chạy tiếp từ đây!');
    console.log('Các lựa chọn lệnh:');
    console.log('  - Nhấn ENTER (hoặc gõ "retry") để thử chạy lại bước này');
    console.log('  - Gõ "skip" để bỏ qua bước này và đi tiếp bước sau');
    console.log('  - Gõ bất kỳ lệnh JavaScript nào để thực thi trực tiếp trên tab hiện tại');
    console.log('======================================================\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('👉 Nhập lệnh của bạn: ', async (input) => {
      rl.close();
      const command = input.trim();
      if (command === 'retry' || command === '') {
        console.log('🔄 Đang thử lại bước này...');
        resolve({ action: 'retry' });
      } else if (command === 'skip') {
        console.log('⏭️ Bỏ qua bước này...');
        resolve({ action: 'skip' });
      } else {
        console.log(`💻 Đang thực thi JavaScript tùy chỉnh: "${command}"...`);
        try {
          const result = await page.evaluate((cmd) => {
            try {
              return eval(cmd);
            } catch (e) {
              return `Lỗi eval: ${e.message}`;
            }
          }, command);
          console.log(`📝 Kết quả thực thi JS:`, result);
        } catch (e) {
          console.error(`❌ Lỗi khi gửi lệnh JS sang browser:`, e.message);
        }
        
        // Loop back to allow multiple interactive commands until the user types retry or skip
        const followUp = await askUserInput(page, stepName, `Đã thực thi xong lệnh JS: "${command}"`);
        resolve(followUp);
      }
    });
  });
}

async function runStepWithRetry(page, stepName, actionFn) {
  while (true) {
    try {
      await actionFn();
      break; // Success! Exit the retry loop.
    } catch (error) {
      const response = await askUserInput(page, stepName, error.message);
      if (response.action === 'skip') {
        break; // Skip the step
      }
      // If action is 'retry', loop and run actionFn again
    }
  }
}

async function connectWithRetry(url, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await puppeteer.connect({ browserURL: url, defaultViewport: null });
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Timeout: Không thể móc nối vào Chrome. Hãy chắc chắn Chrome đã được mở ở cổng debug 9222.');
}

(async () => {
  console.log('=== KẾT NỐI VÀ CHẠY E2E TỰ ĐỘNG HÓA TẠO BÀI HỌC PHÂN HÓA: BA ĐƯỜNG CONIC ===');

  const port = 9222;
  let browser;
  let page;

  try {
    // 1. Connect to the existing Chrome Debug Session
    console.log(`[Setup] Đang móc nối vào trình duyệt Chrome trên cổng debug ${port}...`);
    browser = await connectWithRetry(`http://127.0.0.1:${port}`);
    console.log('✅ Đã kết nối vào trình duyệt Chrome đang chạy ở chế độ Debug!');

    // 2. Scan open tabs to inherit state
    console.log('[Setup] Đang quét các tab hiện tại để kế thừa hiện trường...');
    const pages = await browser.pages();
    for (const p of pages) {
      const url = p.url();
      if (url.includes('giaoandewey.vercel.app') && !url.includes('/adaptive-portal/')) {
        page = p;
        console.log(`[Đang phân tích]: Phát hiện tab đang mở sẵn: ${url}. Móc nối vào tab này để kế thừa hiện trường!`);
        break;
      }
    }

    if (!page) {
      page = await browser.newPage();
      console.log('🆕 Không có tab Dewey nào đang mở. Đã mở tab kiểm thử mới.');
    }

    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);
    await page.setViewport({ width: 1440, height: 900 });

    // Listen to console and page errors
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser Console ${type.toUpperCase()}] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      console.error('[Browser Runtime Page Error]', err.toString());
    });

    const targetUrl = 'https://giaoandewey.vercel.app';

    // STEP 1: Đăng nhập / Truy cập Dashboard
    await runStepWithRetry(page, 'Mở trang & Đăng nhập', async () => {
      const url = page.url();
      if (!url.includes('giaoandewey.vercel.app')) {
        console.log(`[Đang phân tích]: Trang hiện tại là "${url}", chuẩn bị điều hướng tới ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } else if (url.includes('/adaptive/student') || url.includes('/adaptive-portal')) {
        console.log(`[Đang phân tích]: Nhận thấy tab đang ở Cổng học sinh: ${url}. Đang quay trở lại Dashboard của Giáo viên...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } else {
        console.log(`[Đang phân tích]: Kế thừa tab đang hiển thị tại địa chỉ: ${url}`);
      }

      // Check if we need to log in
      const hasLoginButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => (btn.textContent || '').includes('Đăng nhập') || (btn.textContent || '').includes('Chế độ dùng thử'));
      });

      if (hasLoginButton) {
        console.log('[Đang phân tích]: Phát hiện màn hình đăng nhập. Đang tìm nút Chế độ dùng thử...');
        const buttons = await page.$$('button');
        let demoBtn = null;
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('Chế độ dùng thử')) {
            demoBtn = btn;
            break;
          }
        }
        if (demoBtn) {
          console.log('[Đang phân tích]: Đã tìm thấy nút "Chế độ dùng thử". Tiến hành click đăng nhập...');
          await page.evaluate(el => el.click(), demoBtn);
        } else {
          throw new Error('Không tìm thấy nút "Chế độ dùng thử". Vui lòng tự đăng nhập thủ công.');
        }
      }

      console.log('[Đang phân tích]: Đang đợi giao diện Dashboard (Thanh bên hoặc Vùng chính) hiển thị...');
      await page.waitForSelector('aside, header, main', { timeout: 20000 });
      console.log('✅ Đã truy cập Dashboard thành công!');
    });

    // STEP 2: Tiêm API Key
    await runStepWithRetry(page, 'Tiêm Gemini API Key vào LocalStorage', async () => {
      const envApiKey = process.env.GEMINI_API_KEY || '';
      if (envApiKey) {
        console.log(`[Đang phân tích]: Đang tiêm API Key độ dài=${envApiKey.length} vào localStorage...`);
        const localDataStr = await page.evaluate(() => localStorage.getItem('smart_lesson_plan_data'));
        let parsed = {};
        if (localDataStr) {
          try { parsed = JSON.parse(localDataStr); } catch (e) {}
        }
        parsed.settings = parsed.settings || {};
        parsed.settings.geminiApiKey = envApiKey;
        parsed.settings.selectedModel = 'gemini-3.5-flash';
        await page.evaluate((dataStr) => localStorage.setItem('smart_lesson_plan_data', dataStr), JSON.stringify(parsed));
        console.log(`[Đang phân tích]: Đã tiêm thành công! Đang tải lại trang để React áp dụng khóa mới...`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('aside, header, main', { timeout: 20000 });
        console.log('✅ Khởi động lại trang với API Key chuẩn thành công!');
      } else {
        console.log('ℹ️ Không phát hiện biến môi trường GEMINI_API_KEY. Bỏ qua bước tiêm khóa.');
      }
    });

    // STEP 3: Chuyển sang tab Quản lý bài học
    await runStepWithRetry(page, 'Điều hướng sang Quản lý bài học', async () => {
      const url = page.url();
      if (url.includes('/adaptive-builder') || url.includes('/adaptive-portal')) {
        console.log('[Đang phân tích]: Đang ở sẵn trong module Differentiated Lesson. Bỏ qua bước chuyển tab.');
        return;
      }
      
      console.log('[Đang phân tích]: Đang ở Dashboard. Quét thanh menu để tìm nút "Quản lý bài học"...');
      const sidebarLinks = await page.$$('aside button, aside a, nav button, aside li');
      let clickedTab = false;
      for (const link of sidebarLinks) {
        const text = await page.evaluate(el => el.textContent, link);
        if (text && text.toLowerCase().includes('quản lý bài học')) {
          console.log('[Đang phân tích]: Nhìn thấy mục "Quản lý bài học". Đang click chuyển tab...');
          await page.evaluate(el => el.click(), link);
          clickedTab = true;
          break;
        }
      }

      if (!clickedTab) {
        throw new Error('Không tìm thấy mục "Quản lý bài học" trên sidebar.');
      }
      await new Promise(r => setTimeout(r, 2000));
    });

    // STEP 4: Click tạo bài học mới
    await runStepWithRetry(page, 'Click nút Tạo bài học phân hoá mới', async () => {
      const url = page.url();
      if (url.includes('/adaptive-builder')) {
        console.log('[Đang phân tích]: Đang ở sẵn trang Builder. Bỏ qua nút tạo mới.');
        return;
      }

      console.log('[Đang phân tích]: Quét màn hình để tìm nút "Tạo từ giáo án nguồn" hoặc "Tạo bài học phân hoá"...');
      const listButtons = await page.$$('button');
      let foundCreateBtn = false;
      for (const btn of listButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('Tạo từ giáo án nguồn') || text.includes('Tạo bài học phân hoá mới') || text.includes('Tạo bài học phân hoá'))) {
          console.log('[Đang phân tích]: Nhìn thấy nút tạo mới bài học phân hoá. Chuẩn bị click...');
          await page.evaluate(el => el.click(), btn);
          foundCreateBtn = true;
          break;
        }
      }

      if (!foundCreateBtn) {
        throw new Error('Không tìm thấy nút "Tạo bài học phân hoá mới" trên danh sách.');
      }
      await new Promise(r => setTimeout(r, 2000));
    });

    // STEP 5: Chọn giáo án nguồn
    await runStepWithRetry(page, 'Chọn giáo án nguồn "Ba đường conic"', async () => {
      const url = page.url();
      if (url.includes('/adaptive-builder/') && !url.includes('/adaptive-builder/new')) {
        console.log('[Đang phân tích]: Đang ở trang chỉnh sửa bài học hiện có. Bỏ qua bước chọn giáo án nguồn.');
        return;
      }

      console.log('[Đang phân tích]: Đợi hộp chọn (Dropdown) giáo án nguồn xuất hiện...');
      await page.waitForSelector('select', { timeout: 15000 });
      
      const selectEl = await page.$('select');
      const options = await page.evaluate((el) => {
        return Array.from(el.options).map((opt) => ({
          text: opt.textContent || '',
          value: opt.value || ''
        }));
      }, selectEl);
      
      console.log('[Đang phân tích]: Các giáo án trong thư viện của bạn:', options.map(o => o.text));
      
      const conicOption = options.find(opt => opt.text.toLowerCase().includes('conic') || opt.text.toLowerCase().includes('ba đường conic'));
      if (!conicOption) {
        throw new Error('Không tìm thấy giáo án "Ba đường conic" trong thư viện của bạn.');
      }
      
      console.log(`[Đang phân tích]: Nhìn thấy giáo án "${conicOption.text}". Đang chọn...`);
      await page.select('select', conicOption.value);
      await new Promise(r => setTimeout(r, 1500));
    });

    // STEP 6: Kích hoạt rà soát AI
    await runStepWithRetry(page, 'Kích hoạt rà soát AI', async () => {
      const url = page.url();
      if (url.includes('/adaptive-builder/') && !url.includes('/adaptive-builder/new')) {
        console.log('[Đang phân tích]: Giáo án đã thiết kế sẵn. Bỏ qua bước rà soát.');
        return;
      }

      console.log('[Đang phân tích]: Tìm nút "AI rà soát giáo án đã chọn"...');
      const buttonsAfterSelect = await page.$$('button');
      let foundReviewBtn = null;
      for (const btn of buttonsAfterSelect) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('AI rà soát giáo án đã chọn')) {
          foundReviewBtn = btn;
          break;
        }
      }
      
      if (!foundReviewBtn) {
        throw new Error('Không tìm thấy nút "AI rà soát giáo án đã chọn".');
      }
      
      console.log('[Đang phân tích]: Nhìn thấy nút rà soát. Đang click để kích hoạt AI...');
      await page.evaluate(el => el.click(), foundReviewBtn);
      await new Promise(r => setTimeout(r, 2000));
    });

    // STEP 7: Chờ AI rà soát và tạo cấu trúc
    await runStepWithRetry(page, 'Tạo cấu trúc bài học phân hoá', async () => {
      const url = page.url();
      if (url.includes('/adaptive-builder/') && !url.includes('/adaptive-builder/new')) {
        console.log('[Đang phân tích]: Cấu trúc đã được lưu. Bỏ qua bước tạo cấu trúc.');
        return;
      }

      console.log('[Đang phân tích]: Chờ nút "Duyệt bản rà soát & tạo cấu trúc bài học" được bật sáng (tối đa 180s)...');
      let approveBtn = null;
      const maxRetries = 180;
      for (let i = 0; i < maxRetries; i++) {
        const btns = await page.$$('button');
        for (const btn of btns) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('Duyệt bản rà soát & tạo cấu trúc bài học')) {
            const isDisabled = await page.evaluate(el => el.disabled, btn);
            if (!isDisabled) {
              approveBtn = btn;
              break;
            }
          }
        }
        if (approveBtn) break;
        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (!approveBtn) {
        throw new Error('Quá thời gian rà soát AI. Không tìm thấy nút duyệt cấu trúc bài học.');
      }
      
      console.log('[Đang phân tích]: Đã thấy nút tạo cấu trúc hoạt động! Đang click tạo bài học phân hoá...');
      await page.evaluate(el => el.click(), approveBtn);
    });

    // STEP 8: Chờ thiết kế nội dung & chuyển tab 4
    await runStepWithRetry(page, 'Chuyển sang Bước 4: Hoàn tất & Xuất bản', async () => {
      const url = page.url();
      if (url.includes('/adaptive-portal/')) {
        console.log('[Đang phân tích]: Đã chuyển sang trang học sinh. Bỏ qua bước này.');
        return;
      }

      console.log('[Đang phân tích]: Chờ AI hoàn thành thiết kế nội dung các tuyến học (tối đa 120s)...');
      let step4Btn = null;
      const maxStepsRetries = 120;
      for (let i = 0; i < maxStepsRetries; i++) {
        const btns = await page.$$('button');
        for (const btn of btns) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('Bước 4') && text.includes('Hoàn tất & Xuất bản')) {
            step4Btn = btn;
            break;
          }
        }
        if (step4Btn) break;
        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (!step4Btn) {
        throw new Error('Thời gian sinh nội dung quá lâu hoặc lỗi. Không thấy Bước 4 xuất hiện.');
      }
      
      console.log('[Đang phân tích]: Đã sinh bài học hoàn thành! Đang click mở tab "Bước 4: Hoàn tất & Xuất bản"...');
      await page.evaluate(el => el.click(), step4Btn);
      await new Promise(r => setTimeout(r, 2000));
    });

    // STEP 9: Click Xuất bản
    await runStepWithRetry(page, 'Nhấp nút Xuất bản để lưu Firestore', async () => {
      const url = page.url();
      if (url.includes('/adaptive-portal/')) {
        console.log('[Đang phân tích]: Bài học đã được xuất bản thành công trước đó. Bỏ qua.');
        return;
      }

      console.log('[Đang phân tích]: Tìm nút "Xuất bản" ở chân trang Bước 4...');
      const finalBtns = await page.$$('button');
      let saveBtn = null;
      for (const btn of finalBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.trim() === 'Xuất bản') {
          saveBtn = btn;
          break;
        }
      }
      
      if (!saveBtn) {
        throw new Error('Không tìm thấy nút "Xuất bản" trên màn hình Hoàn tất.');
      }
      
      console.log('[Đang phân tích]: Đã thấy nút "Xuất bản". Tiến hành nhấp để đẩy dữ liệu lên Firestore...');
      await page.evaluate(el => el.click(), saveBtn);
      console.log('[Đang phân tích]: Đang chờ 5 giây để Firestore cập nhật...');
      await new Promise(r => setTimeout(r, 5000));
    });

    // STEP 10: Xác minh và chuyển sang Cổng học sinh
    await runStepWithRetry(page, 'Chuyển hướng sang Cổng học sinh', async () => {
      const hasErrorPanel = await page.evaluate(() => {
        return document.body.textContent.includes('Không lưu được bài học phân hoá') ||
               document.body.textContent.includes('Error') ||
               document.body.textContent.includes('FirebaseError');
      });
      
      if (hasErrorPanel) {
        throw new Error('Phát hiện cảnh báo lỗi Firebase / API trên giao diện giáo viên.');
      }

      console.log('\n======================================================');
      console.log('\x1b[32m%s\x1b[0m', '✔ [SUCCESS] VAI TRÒ GIÁO VIÊN: TẠO VÀ XUẤT BẢN THÀNH CÔNG RỰC RỠ!');
      console.log('======================================================\n');

      console.log('\n======================================================');
      console.log('🧑‍🎓 BẮT ĐẦU CHUYỂN SANG VAI TRÒ HỌC SINH...');
      console.log('======================================================\n');

      console.log('[Đang phân tích]: Đang quét toàn bộ các tab mở trên Chrome để tìm tab Cổng học sinh...');
      let studentPage = null;
      
      // Wait up to 10 seconds for the new tab to open and load
      for (let i = 0; i < 10; i++) {
        const pages = await browser.pages();
        for (const p of pages) {
          const u = p.url();
          if (u.includes('/adaptive-portal/')) {
            studentPage = p;
            break;
          }
        }
        if (studentPage) break;
        await new Promise(r => setTimeout(r, 1000));
      }

      if (studentPage) {
        console.log(`[Đang phân tích]: Phát hiện tab Học sinh đang chạy tại: ${studentPage.url()}`);
        page = studentPage; // Reassign global page variable to the new student portal tab
        await page.bringToFront(); // Bring the new student portal tab to the front
        console.log('✅ Đã kết nối thành công sang tab Học sinh và đưa lên làm tab chính!');
      } else {
        console.log('[Đang phân tích]: Không thấy tab học sinh mở tự động. Đang lấy teacherId để tự mở...');
        const teacherId = await page.evaluate(() => {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('firebase:authUser:')) {
              const val = localStorage.getItem(key);
              try {
                const parsed = JSON.parse(val);
                return parsed.uid || '';
              } catch (e) {}
            }
          }
          return '';
        });

        if (!teacherId) {
          throw new Error('Không tìm thấy teacherId trong localStorage.');
        }

        const studentPortalUrl = `${targetUrl}/adaptive-portal`;
        console.log(`[Đang phân tích]: Đang chuyển hướng tab hiện tại sang: ${studentPortalUrl}`);
        await page.goto(studentPortalUrl, { waitUntil: 'domcontentloaded' });
      }

      // Setup console listeners for the new page
      page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
          console.log(`[Browser Console ${type.toUpperCase()}] ${msg.text()}`);
        }
      });

      page.on('pageerror', err => {
        console.error('[Browser Runtime Page Error]', err.toString());
      });

      await page.setDefaultNavigationTimeout(0);
      await page.setDefaultTimeout(0);
      
      console.log('✅ Đã tải xong Student Portal.');
    });

    // STEP 11: Nhập thông tin học sinh
    await runStepWithRetry(page, 'Nhập thông tin học sinh', async () => {
      console.log('[Đang phân tích]: Kiểm tra form đăng ký thông tin học sinh...');
      await page.waitForSelector('input[placeholder*="Nguyễn Minh Anh"]', { timeout: 30000 });

      console.log('[Đang phân tích]: Điền họ tên, lớp và mã học sinh bằng cơ chế tương thích React...');
      await page.evaluate(() => {
        const nameInput = document.querySelector('input[placeholder*="Nguyễn Minh Anh"]');
        const classInput = document.querySelector('input[placeholder*="11A1"]');
        const codeInput = document.querySelector('input[placeholder*="11A1-025"]');
        
        const setVal = (el, val) => {
          if (!el) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };

        setVal(nameInput, 'Học sinh thử nghiệm E2E');
        setVal(classInput, '10A1');
        setVal(codeInput, 'HS-E2E-999');
      });
      console.log('✅ Điền thông tin học sinh thành công!');
    });

    // STEP 12: Bắt đầu học
    await runStepWithRetry(page, 'Bấm nút Bắt đầu học', async () => {
      const startLearnBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Bắt đầu học'));
      });
      if (!startLearnBtn) {
        throw new Error('Không tìm thấy nút "Bắt đầu học" trên cổng học sinh.');
      }
      console.log('[Đang phân tích]: Nhìn thấy nút "Vào học". Đang tiến hành nhấp vào học...');
      await page.evaluate(el => el.click(), startLearnBtn);
      await new Promise(r => setTimeout(r, 3000));
    });

    // STEP 13: Đợi Diagnostic Test
    await runStepWithRetry(page, 'Đợi bài test đầu giờ xuất hiện', async () => {
      console.log('[Đang phân tích]: Đang chờ các câu hỏi kiểm tra năng lực đầu giờ tải xong...');
      await page.waitForSelector('input[type="radio"]', { timeout: 30000 });
      console.log('✅ Giao diện Test đầu giờ đã sẵn sàng!');
    });

    // STEP 14: Tự động trả lời câu hỏi và nộp bài
    await runStepWithRetry(page, 'Làm bài và nộp test đầu giờ', async () => {
      console.log('[Đang phân tích]: Đang tự động quét và hoàn thành câu hỏi kiểm tra...');
      await page.evaluate(() => {
        const questionContainers = Array.from(document.querySelectorAll('div.rounded-2xl.border.border-slate-100'));
        questionContainers.forEach((container) => {
          const firstOption = container.querySelector('input[type="radio"]');
          if (firstOption) {
            firstOption.click();
          } else {
            const textarea = container.querySelector('textarea');
            if (textarea) {
              textarea.value = 'Đáp án tự động bằng Puppeteer E2E';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        });
      });
      
      await new Promise(r => setTimeout(r, 2000));

      const submitTestBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Nộp test'));
      });
      if (!submitTestBtn) {
        throw new Error('Không tìm thấy nút nộp bài test đầu giờ.');
      }
      console.log('[Đang phân tích]: Click nộp bài test để AI nhận dạng năng lực và phân tuyến...');
      await submitTestBtn.click();
    });

    // STEP 15: Chờ bài Dewey cá nhân hóa
    await runStepWithRetry(page, 'Đợi tải bài học cá nhân hóa Dewey', async () => {
      console.log('[Đang phân tích]: Đang đợi hệ thống xử lý API rà soát và tải bài học cá nhân hóa qua Iframe (tối đa 120s)...');
      await page.waitForSelector('iframe', { timeout: 120000 });
      
      console.log('\n======================================================');
      console.log('\x1b[32m%s\x1b[0m', '✔ [SUCCESS] VAI TRÒ HỌC SINH: NHẬN TUYẾN HỌC & TẢI BÀI HỌC DEWEY THÀNH CÔNG RỰC RỠ!');
      console.log('======================================================\n');
      console.log('💡 TRÌNH DUYỆT ĐƯỢC GIỮ NGUYÊN HOÀN TOÀN ĐỂ TRƯỞNG NHÓM QUAN SÁT HIỆN TRƯỜNG.');
    });

  } catch (error) {
    console.log('\n======================================================');
    console.error('\x1b[31m%s\x1b[0m', `❌ [FAILED] KIỂM THỬ THẤT BẠI TẠI BƯỚC KHỞI CHẠY KẾT NỐI!`);
    console.error('\x1b[31m%s\x1b[0m', `Lý do: ${error.message}`);
    console.log('======================================================\n');
    process.exit(1);
  }
})();
