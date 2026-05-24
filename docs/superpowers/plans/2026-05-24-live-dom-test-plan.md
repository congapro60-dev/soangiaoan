# Puppeteer E2E Live DOM Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Puppeteer, create a standalone E2E automated script `live_dom_test.js`, configure E2E run scripts in `package.json`, and verify everything runs.

**Architecture:** A standalone Node.js ES Modules script that launches Chromium in interactive mode (`headless: false`, `slowMo: 100`), checks if localhost:3000 is open (fallback to Dewey Vercel production deployment), performs a mock demo login, navigates key tabs of the sidebar, logs step-by-step actions in the terminal, and exits.

**Tech Stack:** Puppeteer, Node.js, npm.

---

### Task 1: Install Puppeteer Dependency

**Files:**
- Modify: `package.json` (indirectly via npm command)

- [ ] **Step 1: Install `puppeteer` package as a devDependency**

  Run command: `npm install puppeteer --save-dev`

- [ ] **Step 2: Verify `package.json` is updated**

  Check that `puppeteer` is listed under `devDependencies` in `package.json`.

---

### Task 2: Implement E2E Test Script `live_dom_test.js`

**Files:**
- Create: `live_dom_test.js`

- [ ] **Step 1: Create `live_dom_test.js` file**

  Write the complete code for `live_dom_test.js` under the root workspace:

  ```javascript
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

    // 2. Launch Puppeteer Browser
    console.log('[Puppeteer] Đang mở trình duyệt Chromium...');
    const browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
      // 3. Navigate
      console.log(`[Puppeteer] Đang điều hướng đến: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // 4. Handle Demo Login
      console.log('[Puppeteer] Tìm nút "Chế độ dùng thử (Demo / Developer Mode)"...');
      const demoBtnSelector = 'button';
      
      // Wait for login buttons to appear
      await page.waitForSelector(demoBtnSelector, { timeout: 10000 });

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
        console.log('[Puppeteer] Đã tìm thấy nút dùng thử! Tiến hành Click...');
        await foundDemoBtn.click();
      } else {
        console.log('[Puppeteer] [Cảnh báo] Không tìm thấy nút dùng thử bằng văn bản. Thử click trực tiếp nút phụ dưới cùng...');
        // Fallback selector or click first button
        await buttons[buttons.length - 1].click();
      }

      // 5. Wait for Login Redirect & UI Load
      console.log('[Puppeteer] Đang đợi chuyển hướng đăng nhập và tải giao diện chính...');
      // Wait for Sidebar layout/menu element to appear (e.g. tag <aside> or header)
      await page.waitForSelector('aside, header, main', { timeout: 15000 });
      console.log('[Puppeteer] Đăng nhập thành công! Đã vào Dashboard.');

      // 6. Navigation Flow
      const tabs = [
        { name: 'Soạn giáo án', text: 'Soạn giáo án' },
        { name: 'Thư viện', text: 'Thư viện' },
        { name: 'Trợ lý AI', text: 'Trợ lý AI' },
        { name: 'Dashboard', text: 'Dashboard' }
      ];

      for (const tab of tabs) {
        console.log(`[Puppeteer] Chuẩn bị chuyển sang tab: "${tab.name}"...`);
        // Find sidebar item by text and click it
        const sidebarLinks = await page.$$('aside a, aside button, nav button, aside li');
        let clicked = false;
        for (const link of sidebarLinks) {
          const text = await page.evaluate(el => el.textContent, link);
          if (text && text.toLowerCase().includes(tab.text.toLowerCase())) {
            console.log(`[Puppeteer] Đã tìm thấy mục "${tab.name}" trên Sidebar. Đang click...`);
            await link.click();
            clicked = true;
            break;
          }
        }

        if (!clicked) {
          console.log(`[Puppeteer] [Cảnh báo] Không thể click vào tab "${tab.name}" bằng selector chính. Thử tìm rộng hơn...`);
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
        
        // Wait 2 seconds per tab for visualization
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log('[Puppeteer] Hoàn thành luồng điều hướng mẫu.');

      // 7. Pause at final screen
      console.log('[Puppeteer] Đợi 5 giây để quan sát kết quả trực quan trước khi kết thúc...');
      await new Promise(r => setTimeout(r, 5000));

    } catch (error) {
      console.error('[Puppeteer] Gặp lỗi trong quá trình tự động hóa:', error.message);
    } finally {
      // 8. Graceful Exit
      console.log('[Puppeteer] Đang đóng trình duyệt...');
      await browser.close();
      console.log('=== KẾT THÚC PUPPETEER E2E TEST ===');
    }
  })();
  ```

---

### Task 3: Configure E2E Scripts in `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `test:e2e` to script list**

  Add `"test:e2e": "node live_dom_test.js"` under the `"scripts"` field in `package.json`.

---

### Task 4: Run & Verify E2E Test

**Files:**
- None (Execution Task)

- [ ] **Step 1: Run E2E script and verify browser launches**

  Run: `npm run test:e2e`
  Expected:
  - Command executes without errors.
  - Browser launches on screen (since `headless: false` is configured).
  - Connects to Vercel (or localhost:3000 if dev server is active in another shell).
  - Performs the automation flow smoothly.
