import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX\\current_screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper: Click a button by text content
async function clickButtonByText(page, text, delayMs = 1500) {
  console.log(`[Puppeteer] Tìm nút chứa chữ: "${text}"...`);
  const clicked = await page.evaluate((txt) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const found = buttons.find(btn => btn.textContent && btn.textContent.includes(txt));
    if (found) {
      found.click();
      return true;
    }
    return false;
  }, text);

  if (clicked) {
    console.log(`[Puppeteer] Đã click nút: "${text}"`);
    await new Promise(r => setTimeout(r, delayMs));
    return true;
  }
  console.log(`[Puppeteer] KHÔNG tìm thấy nút: "${text}"`);
  return false;
}

async function run() {
  console.log('=== KHỞI ĐỘNG CHỤP ẢNH TOÀN BỘ MÀN HÌNH NÂNG CAO (ESSAY FLOW) ===');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    const url = 'https://giaoandewey.vercel.app/';
    console.log(`[Puppeteer] Đang mở trang web: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 1. Đăng nhập dùng thử
    console.log('[Puppeteer] Đăng nhập dùng thử...');
    await clickButtonByText(page, 'Chế độ dùng thử', 3000);

    // 2. Chụp Cổng học sinh thích ứng (Adaptive Student Portal)
    console.log('[Puppeteer] Mở Cổng học sinh thích ứng...');
    await page.goto('https://giaoandewey.vercel.app/adaptive-portal', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_adaptive_student_portal.png') });
    console.log('[Puppeteer] Đã chụp: 15_adaptive_student_portal.png');

    // 3. Quay lại Dashboard chính và đăng nhập lại để làm tiếp
    console.log('[Puppeteer] Quay lại Dashboard chính...');
    await page.goto('https://giaoandewey.vercel.app/', { waitUntil: 'networkidle2', timeout: 30000 });
    await clickButtonByText(page, 'Chế độ dùng thử', 3000);

    // Chuyển sang tab Thi online
    console.log('[Puppeteer] Chuyển sang tab Thi online...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside nav button'));
      const examsBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('thi online'));
      if (examsBtn) examsBtn.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // 4. Click Tạo đề mới và chọn Soạn thủ công
    await clickButtonByText(page, 'Tạo đề mới', 1500);
    await clickButtonByText(page, 'Soạn thủ công', 2500);

    // Đang ở trong ExamEditorView, điền thông tin đề thi mẫu tự luận
    console.log('[Puppeteer] Nhập thông tin đề thi tự luận...');
    await page.waitForSelector('input[placeholder="VD: Kiểm tra 15 phút Toán 10"]', { timeout: 10000 });
    await page.type('input[placeholder="VD: Kiểm tra 15 phút Toán 10"]', 'Đề kiểm tra Tự luận mẫu (Chụp ảnh UI/UX)');
    
    // Đổi loại câu hỏi thành "Tự luận"
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = 'essay';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector('textarea[placeholder*="Nhập câu hỏi"]', { timeout: 10000 });
    await page.type('textarea[placeholder*="Nhập câu hỏi"]', 'Trình bày quan điểm của em về vai trò của chuyển đổi số trong giáo dục phổ thông hiện nay.');

    console.log('[Puppeteer] Chụp ảnh Trình soạn đề thủ công...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_exam_manual_editor.png') });
    console.log('[Puppeteer] Đã chụp: 16_exam_manual_editor.png');

    // Lưu đề thi
    console.log('[Puppeteer] Lưu đề thi...');
    await clickButtonByText(page, 'Lưu đề thi', 2000);

    // Chờ cho editor đóng lại (không còn thấy ô nhập tiêu đề)
    await page.waitForFunction(() => !document.querySelector('input[placeholder="VD: Kiểm tra 15 phút Toán 10"]'), { timeout: 15000 });
    console.log('[Puppeteer] Editor đã đóng.');
    
    // Chờ cho loader biến mất và danh sách đề thi xuất hiện
    await page.waitForSelector('main div.grid.gap-3 div.bg-white.rounded-2xl', { timeout: 15000 });
    console.log('[Puppeteer] Danh sách đề thi đã tải xong.');
    await new Promise(r => setTimeout(r, 2000));

    // Kích hoạt phát hành đề thi (Click nút phát hành của đề thi đầu tiên ở đầu danh sách)
    console.log('[Puppeteer] Kích hoạt phát hành đề thi...');
    const publishBtnClicked = await page.evaluate(() => {
      const firstCard = document.querySelector('main div.grid.gap-3 div.bg-white.rounded-2xl');
      if (firstCard) {
        const btn = firstCard.querySelector('button[title="Phát hành"]');
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (publishBtnClicked) {
      console.log('[Puppeteer] Đã kích hoạt Phát hành đề thi!');
      await new Promise(r => setTimeout(r, 2000));
    }

    // Lấy mã code của đề thi vừa tạo và click vào Kết quả
    const examInfo = await page.evaluate(() => {
      const firstCard = document.querySelector('main div.grid.gap-3 div.bg-white.rounded-2xl');
      if (firstCard) {
        const codeSpan = firstCard.querySelector('span.font-mono.font-bold');
        const code = codeSpan ? codeSpan.textContent.replace('#', '').trim() : '';
        const resultBtn = Array.from(firstCard.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Kết quả'));
        if (resultBtn) {
          resultBtn.click();
          return { code, clicked: true };
        }
        return { code, clicked: false };
      }
      return null;
    });

    console.log(`[Puppeteer] Mã đề thi hoạt động: ${examInfo?.code}`);
    await new Promise(r => setTimeout(r, 3000));

    // 5. Chụp ảnh trang Cấu hình đề thi (Config)
    console.log('[Puppeteer] Mở Cấu hình đề thi...');
    const configOpened = await page.evaluate(() => {
      const detailContainer = document.querySelector('main');
      if (detailContainer) {
        const buttons = Array.from(detailContainer.querySelectorAll('button'));
        const configBtn = buttons.find(b => b.textContent && b.textContent.includes('Cài đặt'));
        if (configBtn) {
          configBtn.click();
          return true;
        }
      }
      return false;
    });

    if (configOpened) {
      console.log('[Puppeteer] Đã mở Cấu hình đề thi. Chờ 2 giây...');
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_exam_config_page.png') });
      console.log('[Puppeteer] Đã chụp: 17_exam_config_page.png');
      
      // Quay lại chi tiết đề
      console.log('[Puppeteer] Quay lại trang chi tiết từ cài đặt...');
      await page.evaluate(() => {
        const backBtn = Array.from(document.querySelectorAll('main button')).find(b => b.textContent && b.textContent.includes('Quay lại'));
        if (backBtn) backBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // 6. Chụp ảnh trang Chấm bài (Grading)
    console.log('[Puppeteer] Mở trang Chấm thủ công...');
    const gradingOpened = await page.evaluate(() => {
      const detailContainer = document.querySelector('main');
      if (detailContainer) {
        const buttons = Array.from(detailContainer.querySelectorAll('button'));
        const gradeBtn = buttons.find(b => b.textContent && b.textContent.includes('Chấm thủ công'));
        if (gradeBtn) {
          gradeBtn.click();
          return true;
        }
      }
      return false;
    });

    if (gradingOpened) {
      console.log('[Puppeteer] Đã mở Chấm thủ công. Chờ 2 giây...');
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '18_teacher_grading_page.png') });
      console.log('[Puppeteer] Đã chụp: 18_teacher_grading_page.png');
      
      // Quay lại chi tiết đề
      console.log('[Puppeteer] Quay lại trang chi tiết từ chấm bài...');
      await page.evaluate(() => {
        const backBtn = Array.from(document.querySelectorAll('main button')).find(b => b.textContent && b.textContent.includes('Quay lại'));
        if (backBtn) backBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // 7. Học sinh vào thi (StudentExamPage)
    if (examInfo && examInfo.code) {
      const studentExamUrl = `https://giaoandewey.vercel.app/exam/${examInfo.code}`;
      console.log(`[Puppeteer] Học sinh mở link thi: ${studentExamUrl}`);
      await page.goto(studentExamUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '19_student_exam_intro.png') });
      console.log('[Puppeteer] Đã chụp: 19_student_exam_intro.png');

      // Nhập tên và bắt đầu làm bài
      console.log('[Puppeteer] Nhập tên học sinh...');
      await page.waitForSelector('input[placeholder="Nhập tên của bạn..."]', { timeout: 10000 });
      await page.type('input[placeholder="Nhập tên của bạn..."]', 'Nguyễn Đức Anh');
      await page.type('input[placeholder="Ví dụ: 12A1..."]', '10A1');
      
      await clickButtonByText(page, 'BẮT ĐẦU LÀM BÀI', 4000);

      // Chụp màn hình làm bài của học sinh
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '20_student_exam_workspace.png') });
      console.log('[Puppeteer] Đã chụp: 20_student_exam_workspace.png');

      // Điền câu trả lời tự luận
      console.log('[Puppeteer] Nhập bài làm tự luận...');
      await page.type('textarea[placeholder*="Trình bày bài làm"]', 'Theo em, chuyển đổi số đóng vai trò vô cùng quan trọng trong giáo dục phổ thông hiện nay. Nó giúp học sinh tiếp cận nguồn tài liệu học tập phong phú, hỗ trợ giáo viên cá nhân hóa lộ trình học tập của từng học sinh và cải thiện hiệu quả quản lý trường học.');
      await new Promise(r => setTimeout(r, 1000));

      // Nộp bài
      console.log('[Puppeteer] Tiến hành nộp bài...');
      await clickButtonByText(page, 'Nộp bài', 1500);
      await clickButtonByText(page, 'Đồng ý nộp', 5000);

      // Chụp màn hình kết quả thi
      console.log('[Puppeteer] Chụp màn hình kết quả thi...');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '21_student_exam_result.png') });
      console.log('[Puppeteer] Đã chụp: 21_student_exam_result.png');
    } else {
      console.log('[Warning] Không lấy được mã đề thi để chạy luồng thi thử của học sinh.');
    }

    console.log('[Puppeteer] Hoàn thành xuất sắc toàn bộ quy trình!');
  } catch (error) {
    console.error('[Puppeteer] Đã xảy ra lỗi trong quy trình chụp ảnh nâng cao:', error);
  } finally {
    await browser.close();
    console.log('=== KẾT THÚC CHƯƠNG TRÌNH ===');
  }
}

run();
