const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';

(async () => {
  try {
    const gv = await puppeteer.connect({
      browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl,
      defaultViewport: null,
      protocolTimeout: 300000
    });

    // 1. Tạo phiên live từ tài khoản GV
    console.log('1. Opening adaptive-lessons as GV...');
    const gvp = await gv.newPage();
    await gvp.setViewport({ width: 1440, height: 1000 });
    await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);

    await gvp.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
      if (tab) tab.click();
    });
    await sleep(5000);

    for (let i = 0; i < 12; i++) {
      const ok = await gvp.evaluate(() => {
        const norm = (r) => (r.innerText || '').replace(/\s+/g, ' ');
        const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => {
          const t = norm(r);
          return t.indexOf('Các số đặc trưng đo xu thế trung tâm — Tiết 2') >= 0 && t.indexOf('Lớp 11') >= 0;
        });
        if (!tr) return false;
        const btn = Array.from(tr.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (ok) break;
      await sleep(2000);
    }
    await sleep(3000);

    for (let i = 0; i < 15; i++) {
      const ok = await gvp.evaluate((cid) => {
        const sel = document.querySelector('[role="dialog"] select');
        if (!sel) return false;
        const opt = Array.from(sel.options).find((o) => o.value === cid);
        if (!opt) return false;
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, CLASS_ID);
      if (ok) break;
      await sleep(1500);
    }
    await sleep(1500);

    for (let i = 0; i < 10; i++) {
      const ok = await gvp.evaluate(() => {
        const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').indexOf('Tạo phiên tiết trực tiếp') >= 0 && !x.disabled);
        if (b) { b.click(); return true; }
        return false;
      });
      if (ok) break;
      await sleep(1500);
    }

    let sessionId = null, studentLink = null;
    for (let i = 0; i < 20; i++) {
      await sleep(1500);
      const found = await gvp.evaluate(() => {
        const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.indexOf('mode=student') >= 0);
        const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
        return { link: a ? a.href : null, id: m ? m[1] : null };
      });
      if (found.id && found.link) { sessionId = found.id; studentLink = found.link; break; }
    }
    console.log('SESSION CREATED:', sessionId);
    console.log('STUDENT LINK:', studentLink);
    await gvp.close();

    if (!studentLink) {
      console.error('Failed to create live session');
      process.exit(1);
    }

    // 2. Mở tab mới với viewport Mobile (iPhone 14: 390x844)
    console.log('2. Opening student page in mobile viewport 390x844...');
    const hp = await gv.newPage();
    await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(6000);

    // HS login: Tuệ Minh PIN 2750
    for (let i = 0; i < 10; i++) {
      const hasSel = await hp.evaluate(() => Boolean(document.querySelector('select')));
      if (hasSel) break;
      await sleep(1500);
    }

    await hp.evaluate(() => {
      const sel = document.querySelector('select');
      if (!sel) return;
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);

    await hp.evaluate(() => {
      const inp = document.querySelector('input[type="password"]');
      if (inp) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1000);

    await hp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled);
      if (b) b.click();
    });
    console.log('Student logged in, waiting for Live UI render...');
    await sleep(8000);

    // Kiểm tra các thành phần của ASS-MDP-01 trên mobile DOM
    const audit = await hp.evaluate(() => {
      const details = document.querySelector('details');
      const uploader = document.querySelector('.student-paper-photo') || document.querySelector('[aria-label="Chụp ảnh bài làm giấy"]');
      const zoomContainer = document.querySelector('.math-diagram-container');
      const zoomButtons = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => b.getAttribute('aria-label') || b.innerText);
      
      // Touch target measurement
      const btns = Array.from(document.querySelectorAll('button'));
      const smallBtns = btns.filter(b => {
        const rect = b.getBoundingClientRect();
        return (rect.width > 0 && rect.width < 40) || (rect.height > 0 && rect.height < 40);
      });

      // Inputs font size check
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const fontSizes = inputs.map(el => window.getComputedStyle(el).fontSize);

      return {
        hasDetails: !!details,
        hasUploader: !!uploader,
        uploaderText: uploader ? uploader.innerText : null,
        hasZoomContainer: !!zoomContainer,
        zoomButtons,
        totalButtons: btns.length,
        smallButtonCount: smallBtns.length,
        inputFontSizes: fontSizes.slice(0, 5),
        bodySnippet: document.body.innerText.slice(0, 300)
      };
    });

    console.log('AUDIT RESULT ON LIVE MOBILE:', audit);

    // Chụp ảnh giao diện mobile thực tế
    await hp.screenshot({ path: 'tasks/tmp-live-mobile-proof.png', fullPage: false });
    console.log('SAVED tasks/tmp-live-mobile-proof.png');

    // Mở chi tiết đề bài để kiểm tra MathFigureZoom
    await hp.evaluate(() => {
      const details = document.querySelector('details');
      if (details) details.open = true;
    });
    await sleep(1500);

    const zoomAudit = await hp.evaluate(() => {
      const z = document.querySelector('.math-diagram-container');
      const btns = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => ({
        label: b.getAttribute('aria-label'),
        text: b.innerText,
        rect: b.getBoundingClientRect()
      }));
      return { hasZoom: !!z, buttons: btns };
    });
    console.log('ZOOM TOOLBAR AUDIT:', zoomAudit);

    await hp.screenshot({ path: 'tasks/tmp-live-mobile-zoom-open.png', fullPage: false });
    console.log('SAVED tasks/tmp-live-mobile-zoom-open.png');

    await hp.close();
    console.log('TEST COMPLETED SUCCESSFULLY');
  } catch (err) {
    console.error('ERROR during live run:', err);
    process.exit(1);
  }
})();
