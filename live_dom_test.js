import puppeteer from 'puppeteer';
import http from 'http';

// Helper to check if local server is running on port 3000
function checkLocalhost3000() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: 'localhost',
        port: 3000,
        method: 'HEAD',
        timeout: 1000,
      },
      (res) => {
        res.resume(); // Consuming the response frees up standard socket resources
        resolve(res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 304);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

(async () => {
  console.log('=== KHỞI ĐỘNG PUPPETEER E2E TEST ===');

  // 1. Determine Target URL
  const isLocalActive = await checkLocalhost3000();
  const targetUrl = isLocalActive ? 'http://localhost:3000' : 'https://giaoandewey.vercel.app/';
  console.log(`[Target] Đang kết nối tới: ${targetUrl}`);
  if (!isLocalActive) {
    console.log('[Notice] Không phát hiện localhost:3000 đang chạy. Tự động chuyển sang môi trường Production Vercel.');
  }

  let browser;
  try {
    // 2. Launch Puppeteer Browser (Now safely wrapped in try-catch to prevent resource leaks)
    console.log('[Puppeteer] Đang khởi động trình duyệt Chromium...');
    const isHeadless = process.env.HEADLESS !== 'false' && process.env.CI === 'true'; // Configurable headless mode
    
    browser = await puppeteer.launch({
      headless: isHeadless ? 'new' : false,
      slowMo: isHeadless ? 0 : 250, // YÊU CẦU 2: Tăng slowMo lên 250 để dễ quan sát
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // 3. Navigate
    console.log(`[Puppeteer] Đang mở trang web: ${targetUrl} ...`); // YÊU CẦU 4: Thêm log 'Đang mở trang web...'
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Puppeteer] Đã tải xong mã nguồn DOM trang web thành công.');

    // 4. Handle Demo Login
    console.log('[Puppeteer] Đang quét giao diện để tìm nút đăng nhập...');
    const demoBtnSelector = 'button';
    
    // Wait for login buttons to appear
    await page.waitForSelector(demoBtnSelector, { timeout: 10000 });
    console.log('[Puppeteer] Đã quét thấy các nút bấm trên màn hình đăng nhập.');

    // Find the button with the specific demo text
    const buttons = await page.$$(demoBtnSelector);
    let foundDemoBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Chế độ dùng thử')) {
        foundDemoBtn = btn;
        break;
      }
    }

    if (foundDemoBtn) {
      console.log('[Puppeteer] Đã tìm thấy nút đăng nhập "Chế độ dùng thử (Demo / Developer Mode)".'); // YÊU CẦU 4: Log thấy nút Đăng nhập
      console.log('[Puppeteer] Đang thực hiện click chuột tự động vào nút dùng thử...');
      await foundDemoBtn.click();
    } else if (buttons.length > 0) {
      console.log('[Puppeteer] [Cảnh báo] Không tìm thấy nút đăng nhập văn bản cụ thể. Thử click nút phụ dưới cùng...');
      await buttons[buttons.length - 1].click();
    } else {
      throw new Error('Không tìm thấy bất kỳ nút bấm nào trên màn hình đăng nhập.');
    }

    // 5. Wait for Login Redirect & UI Load
    console.log('[Puppeteer] Đang đợi hệ thống xác thực chuyển hướng và kết nối database...');
    // Wait for Sidebar layout/menu element to appear (e.g. tag <aside> or header)
    await page.waitForSelector('aside, header, main', { timeout: 15000 });
    console.log('[Puppeteer] Đăng nhập thành công! Hệ thống đã tải xong Dashboard chính.');

    // 6. Navigation Flow (Updated texts to match Sidebar.tsx component labels)
    const tabs = [
      { name: 'Soạn giáo án', text: 'Soạn giáo án' },
      { name: 'Thư viện', text: 'Thư viện' },
      { name: 'AI Tutor', text: 'AI Tutor' },
      { name: 'Tổng quan', text: 'Tổng quan' }
    ];

    console.log('[Puppeteer] Bắt đầu quá trình tự động điều hướng Sidebar...');
    for (const tab of tabs) {
      console.log(`[Puppeteer] Đang chuyển sang tab: "${tab.name}"...`);
      // Find sidebar item by text and click it
      const sidebarLinks = await page.$$('aside a, aside button, nav button, aside li');
      let clicked = false;
      for (const link of sidebarLinks) {
        const text = await page.evaluate(el => el.textContent, link);
        if (text && text.toLowerCase().includes(tab.text.toLowerCase())) {
          console.log(`[Puppeteer] Đã phát hiện mục "${tab.name}" trên Sidebar. Đang click...`);
          await link.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        console.log(`[Puppeteer] [Cảnh báo] Không click được bằng menu chính. Đang tìm rộng hơn trên các thẻ button...`);
        const allButtons = await page.$$('button');
        for (const btn of allButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.toLowerCase().includes(tab.text.toLowerCase())) {
            await btn.click();
            clicked = true;
            break;
          }
        }
      }

      if (!clicked) {
        throw new Error(`Lỗi: Không tìm thấy tab "${tab.name}" để chuyển tiếp.`);
      }
      
      // Wait 2 seconds per tab for visualization (skipped in headless automation)
      if (!isHeadless) {
        console.log(`[Puppeteer] Đang dừng 2 giây để bạn quan sát tab "${tab.name}" hoạt động...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log('[Puppeteer] Hoàn thành luồng tự động điều hướng mẫu.');

    // 7. Pause at final screen
    if (!isHeadless) {
      console.log('[Puppeteer] Đợi 10 giây để quan sát kết quả trực quan trước khi kết thúc...'); // YÊU CẦU 3: Delay 10 giây ở màn cuối
      await new Promise(r => setTimeout(r, 10000));
    }

  } catch (error) {
    console.error('[Puppeteer] [LỖI TỰ ĐỘNG HÓA] Gặp lỗi nghiêm trọng:', error.message);
    process.exitCode = 1; // FIXED: Set exit code 1 to indicate failure to CI/runners
  } finally {
    // 8. Graceful Exit (Checks if browser was successfully initialized before closing)
    if (browser) {
      // YÊU CẦU 1: Comment dòng close để không bao giờ tự tắt trình duyệt
      console.log('[Puppeteer] [GIỮ TRÌNH DUYỆT] Dòng lệnh browser.close() đã được vô hiệu hóa theo yêu cầu. Bạn có thể tự do xem trang web.');
      // await browser.close();
    }
    console.log('=== KẾT THÚC PUPPETEER E2E TEST ===');
  }
})();
