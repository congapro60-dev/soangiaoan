import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import os from 'os';
import path from 'path';
import http from 'http';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

function getChromePath() {
  switch (os.platform()) {
    case 'win32': return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
    case 'darwin': return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux': return '/usr/bin/google-chrome';
    default: throw new Error('Hệ điều hành không được hỗ trợ');
  }
}

function killZombieChrome(port) {
  try {
    if (os.platform() === 'win32') {
      execSync(`FOR /F "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a 2>nul`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
    }
    console.log(`[Setup] Đã giải phóng cổng mạng ${port}.`);
  } catch (e) {}
}

async function connectWithRetry(url, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await puppeteer.connect({ browserURL: url, defaultViewport: null });
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Timeout: Chrome khởi động quá chậm hoặc lỗi kết nối cổng.');
}

function checkLocalhost3000() {
  return new Promise((resolve) => {
    const req = http.request(
      { host: 'localhost', port: 3000, method: 'HEAD', timeout: 1000 },
      (res) => resolve(res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 304)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

(async () => {
  console.log('=== KHỞI ĐỘNG E2E TỰ ĐỘNG HÓA TẠO BÀI HỌC PHÂN HÓA: BA ĐƯỜNG CONIC ===');

  const port = 9222;
  let browser;
  let page;
  let isHooked = false;

  try {
    // 1. Setup Chrome Debug Port & Session
    console.log(`[Setup] Đang quét cổng debug ${port}...`);
    try {
      browser = await connectWithRetry(`http://127.0.0.1:${port}`, 2);
      console.log('✅ Đã kết nối vào trình duyệt Chrome đang chạy ở chế độ Debug!');
      isHooked = true;
    } catch (e) {
      console.log('ℹ️ Không có Chrome debug nào đang chạy. Khởi chạy Chrome mới với bot_profile...');
      killZombieChrome(port);

      const chromePath = getChromePath();
      const userDataDir = path.join(process.cwd(), 'bot_profile');

      console.log(`🚀 Spawn Chrome với profile: ${userDataDir}`);
      const chromeProcess = spawn(chromePath, [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        `--no-first-run`,
        `--no-default-browser-check`,
        '--start-maximized'
      ], { detached: true, stdio: 'ignore' });

      chromeProcess.unref();

      console.log('⏳ Đợi kết nối WebSocket...');
      browser = await connectWithRetry(`http://127.0.0.1:${port}`);
      console.log('✅ Kết nối Chrome WebSocket thành công!');
    }

    // 2. Open page
    page = await browser.newPage();
    console.log('🆕 Đã mở tab kiểm thử mới.');
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

    // 3. Navigate
    const targetUrl = 'https://giaoandewey.vercel.app';
    console.log(`📂 Đang truy cập URL: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('✅ Đã tải xong trang.');

    // 4. Handle login if needed
    const hasLoginButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => {
        const text = btn.textContent || '';
        return text.includes('Đăng nhập') || text.includes('Login');
      });
    });

    if (hasLoginButton) {
      console.log('[Puppeteer] Phát hiện màn hình đăng nhập. Đang tìm nút Chế độ dùng thử...');
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
        console.log('[Puppeteer] Đang click "Chế độ dùng thử (Demo / Developer Mode)"...');
        await demoBtn.click();
      } else {
        console.log('[Puppeteer] Không tìm thấy nút dùng thử. Vui lòng đăng nhập thủ công.');
        await new Promise(r => setTimeout(r, 10000)); // Chờ 10s
      }
    }

    // Wait for Dashboard UI to load
    await page.waitForSelector('aside, header, main', { timeout: 20000 });
    console.log('✅ Đã đăng nhập và truy cập Dashboard.');

    // Automatically inject the valid API Key from environment variable to override any corrupted keys
    const envApiKey = process.env.GEMINI_API_KEY || '';
    if (envApiKey) {
      console.log(`[Puppeteer Setup] Injecting valid Gemini API Key from environment: length=${envApiKey.length}, first4="${envApiKey.slice(0, 4)}"...`);
      const localDataStr = await page.evaluate(() => localStorage.getItem('smart_lesson_plan_data'));
      let parsed = {};
      if (localDataStr) {
        try { parsed = JSON.parse(localDataStr); } catch (e) {}
      }
      parsed.settings = parsed.settings || {};
      parsed.settings.geminiApiKey = envApiKey;
      parsed.settings.selectedModel = 'gemini-3.5-flash'; // Force fast modern model
      await page.evaluate((dataStr) => localStorage.setItem('smart_lesson_plan_data', dataStr), JSON.stringify(parsed));
      console.log(`[Puppeteer Setup] LocalStorage successfully injected with valid Gemini API Key!`);
      
      console.log('[Puppeteer Setup] Đang tải lại trang để React áp dụng khóa API vừa tiêm...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('aside, header, main', { timeout: 20000 });
      console.log('✅ Đã tải lại trang và Dashboard sẵn sàng với API Key sạch!');
    } else {
      console.log('[Puppeteer Setup] Warning: GEMINI_API_KEY environment variable is not set!');
    }

    // 5. Navigate to "Quản lý bài học" tab
    console.log('➡️ Đang chuyển sang tab "Quản lý bài học"...');
    const sidebarLinks = await page.$$('aside button, aside a, nav button, aside li');
    let clickedTab = false;
    for (const link of sidebarLinks) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && text.toLowerCase().includes('quản lý bài học')) {
        await link.click();
        clickedTab = true;
        break;
      }
    }

    if (!clickedTab) {
      throw new Error('Không tìm thấy tab "Quản lý bài học" trên sidebar.');
    }
    await new Promise(r => setTimeout(r, 2000));

    // 6. Click "Tạo bài học phân hoá mới" / "Tạo từ giáo án nguồn"
    console.log('[Puppeteer] Tìm nút "Tạo từ giáo án nguồn" hoặc "Tạo bài học phân hoá"...');
    const listButtons = await page.$$('button');
    let foundCreateBtn = false;
    for (const btn of listButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Tạo từ giáo án nguồn') || text.includes('Tạo bài học phân hoá mới') || text.includes('Tạo bài học phân hoá'))) {
        console.log('[Puppeteer] Đã tìm thấy nút tạo mới. Đang click...');
        await btn.click();
        foundCreateBtn = true;
        break;
      }
    }

    if (!foundCreateBtn) {
      throw new Error('Không tìm thấy nút "Tạo bài học phân hoá mới".');
    }
    await new Promise(r => setTimeout(r, 2000));

    // 7. Select "Ba đường conic" from dropdown
    console.log('[Puppeteer] Đợi select dropdown chọn giáo án nguồn...');
    await page.waitForSelector('select', { timeout: 15000 });
    
    const selectEl = await page.$('select');
    const options = await page.evaluate((el) => {
      return Array.from(el.options).map((opt) => ({
        text: opt.textContent || '',
        value: opt.value || ''
      }));
    }, selectEl);
    
    console.log('[Puppeteer] Các giáo án khả dụng trong thư viện:', options);
    
    const conicOption = options.find(opt => opt.text.toLowerCase().includes('conic') || opt.text.toLowerCase().includes('ba đường conic'));
    if (!conicOption) {
      throw new Error('Không tìm thấy giáo án "Ba đường conic" trong thư viện! Hãy đảm bảo giáo án này đã được tạo và lưu.');
    }
    
    console.log(`[Puppeteer] Đang chọn giáo án: "${conicOption.text}" (value: ${conicOption.value})`);
    await page.select('select', conicOption.value);
    await new Promise(r => setTimeout(r, 1500));

    // 8. Click "AI rà soát giáo án đã chọn"
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
    
    console.log('[Puppeteer] Đang click "AI rà soát giáo án đã chọn"...');
    await foundReviewBtn.click();

    // 9. Wait for "Duyệt bản rà soát & tạo cấu trúc bài học" to be enabled
    console.log('[Puppeteer] Đang chờ AI rà soát giáo án nguồn (tối đa 180 giây)...');
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
      throw new Error('Timeout hoặc lỗi: Không thấy nút "Duyệt bản rà soát & tạo cấu trúc bài học" được kích hoạt.');
    }
    
    console.log('[Puppeteer] Đã hoàn thành AI rà soát! Đang click "Duyệt bản rà soát & tạo cấu trúc bài học"...');
    await approveBtn.click();

    // 10. Wait for step tabs to appear (indicating content generation/regex fallback finished)
    console.log('[Puppeteer] Đang chờ AI thiết kế nội dung chi tiết bài học phân hoá (tối đa 120 giây)...');
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
      throw new Error('Timeout: Không thấy giao diện thiết kế bài học phân hoá (Bước 4) hiển thị.');
    }
    
    console.log('[Puppeteer] Thiết kế bài học hoàn tất! Đang click chuyển sang "Bước 4: Hoàn tất & Xuất bản"...');
    await step4Btn.click();
    await new Promise(r => setTimeout(r, 2000));

    // 11. Click "Xuất bản" to trigger Firestore save
    console.log('[Puppeteer] Tìm nút "Xuất bản"...');
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
      throw new Error('Không tìm thấy nút "Xuất bản".');
    }
    
    const btnText = await page.evaluate(el => el.textContent, saveBtn);
    console.log(`[Puppeteer] Đang tiến hành click nút: "${btnText}"...`);
    await saveBtn.click();

    // 12. Wait to observe result and verify no error alerts or crashes
    console.log('[Puppeteer] Đang chờ 5 giây để quan sát quá trình lưu lên Firestore...');
    await new Promise(r => setTimeout(r, 5000));

    const hasErrorPanel = await page.evaluate(() => {
      return document.body.textContent.includes('Không lưu được bài học phân hoá') ||
             document.body.textContent.includes('Error') ||
             document.body.textContent.includes('FirebaseError');
    });
    
    if (hasErrorPanel) {
      throw new Error('Phát hiện thông báo lỗi trên giao diện sau khi click lưu lên Firestore!');
    }

    console.log('\n======================================================');
    console.log('\x1b[32m%s\x1b[0m', '✔ [SUCCESS] VAI TRÒ GIÁO VIÊN: TẠO VÀ XUẤT BẢN THÀNH CÔNG RỰC RỠ!');
    console.log('======================================================\n');

    // 13. Transition to Student Portal
    console.log('\n======================================================');
    console.log('🧑‍🎓 BẮT ĐẦU CHUYỂN SANG VAI TRÒ HỌC SINH...');
    console.log('======================================================\n');

    let currentUrl = page.url();
    if (!currentUrl.includes('/adaptive-portal/')) {
      // Retrieve teacherId from localStorage
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
        throw new Error('Không thể tìm thấy teacherId từ localStorage của phiên giáo viên!');
      }

      const studentPortalUrl = `${targetUrl}/adaptive/student/${teacherId}`;
      console.log(`📂 Đang chuyển hướng sang Student Portal: ${studentPortalUrl}`);
      await page.goto(studentPortalUrl, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`📂 Đã tự động điều hướng sang trang học sinh: ${currentUrl}`);
    }
    console.log('✅ Đã tải xong Student Portal.');

    // Wait for stage identify input fields
    console.log('[Puppeteer Student] Đang chờ giao diện nhập thông tin học sinh...');
    await page.waitForSelector('input[placeholder*="Nguyễn Minh Anh"]', { timeout: 30000 });

    // Fill student info using page.evaluate to be completely immune to Vietnamese IME (Telex/VNI) typing issues
    console.log('[Puppeteer Student] Đang điền họ tên, lớp và mã học sinh...');
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder*="Nguyễn Minh Anh"]');
      const classInput = document.querySelector('input[placeholder*="11A1"]');
      const codeInput = document.querySelector('input[placeholder*="11A1-025"]');
      
      if (nameInput) {
        nameInput.value = 'Học sinh thử nghiệm E2E';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (classInput) {
        classInput.value = '10A1';
        classInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (codeInput) {
        codeInput.value = 'HS-E2E-999';
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    // Click "Bắt đầu học"
    const startLearnBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Bắt đầu học'));
    });
    if (!startLearnBtn) {
      throw new Error('Không tìm thấy nút "Bắt đầu học"!');
    }
    console.log('[Puppeteer Student] Đang click "Bắt đầu học"...');
    await startLearnBtn.click();
    await new Promise(r => setTimeout(r, 3000));

    // Wait for step 2: Diagnostic Test
    console.log('[Puppeteer Student] Đang chờ bài test đầu giờ...');
    await page.waitForSelector('input[type="radio"]', { timeout: 30000 });

    console.log('[Puppeteer Student] Đang tự động trả lời các câu hỏi trắc nghiệm/tự luận...');
    await page.evaluate(() => {
      const questionContainers = Array.from(document.querySelectorAll('div.rounded-2xl.border.border-slate-100'));
      questionContainers.forEach((container) => {
        // Find first radio option inside container and click it
        const firstOption = container.querySelector('input[type="radio"]');
        if (firstOption) {
          firstOption.click();
        } else {
          // If it's a textarea, type a dummy answer
          const textarea = container.querySelector('textarea');
          if (textarea) {
            textarea.value = 'Đáp án tự động bằng Puppeteer E2E';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
    });

    await new Promise(r => setTimeout(r, 2000));

    // Click "Nộp test và nhận tuyến học"
    const submitTestBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Nộp test'));
    });
    if (!submitTestBtn) {
      throw new Error('Không tìm thấy nút nộp bài test đầu giờ!');
    }
    console.log('[Puppeteer Student] Đang click "Nộp test và nhận tuyến học"...');
    await submitTestBtn.click();

    console.log('[Puppeteer Student] Đang chờ cá nhân hóa bài học và hiển thị bài Dewey (tối đa 120 giây)...');
    await page.waitForSelector('iframe', { timeout: 120000 });
    console.log('\n======================================================');
    console.log('\x1b[32m%s\x1b[0m', '✔ [SUCCESS] VAI TRÒ HỌC SINH: NHẬN TUYẾN HỌC & TẢI BÀI HỌC DEWEY THÀNH CÔNG RỰC RỠ!');
    console.log('======================================================\n');

    if (isHooked) {
      console.log('🧹 Đóng tab kiểm thử (giữ nguyên cửa sổ Chrome của bạn).');
      // await page.close();
    } else {
      console.log('🔌 Đang đóng trình duyệt an toàn (đã vô hiệu hóa để giữ nguyên hiện trường)...');
      // await browser.close();
    }

  } catch (error) {
    console.log('\n======================================================');
    console.error('\x1b[31m%s\x1b[0m', `❌ [FAILED] KIỂM THỬ THẤT BẠI TẠI BƯỚC NÀY!`);
    console.error('\x1b[31m%s\x1b[0m', `Lý do: ${error.message}`);
    console.log('======================================================\n');

    if (page) {
      try {
        console.log('📸 Đang tự động chụp ảnh màn hình lỗi (conic_error_screenshot.png)...');
        await page.screenshot({ path: 'conic_error_screenshot.png', fullPage: true });
        console.log('💾 Đã lưu ảnh chụp lỗi thành công.');
      } catch (screenshotError) {
        console.log('⚠️ Không thể chụp ảnh màn hình lỗi.');
      }
    }

    if (page && isHooked) {
      // try { await page.close(); } catch(e){}
    } else if (browser) {
      // try { await browser.close(); } catch(e){}
    }
    process.exit(1);
  }
})();
