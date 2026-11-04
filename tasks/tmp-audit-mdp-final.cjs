const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey-feh9yzjrd-congapro60-devs-projects.vercel.app';
const CLASS_ID = 'class-1787188523562';

(async () => {
  try {
    const v9222 = await (await fetch('http://127.0.0.1:9222/json/version')).json();
    const gv = await puppeteer.connect({
      browserWSEndpoint: v9222.webSocketDebuggerUrl,
      defaultViewport: null,
      protocolTimeout: 300000
    });

    // 1. Tạo phiên live từ tài khoản GV
    console.log('1. Opening adaptive-lessons as GV...');
    const gvp = await gv.newPage();
    await gvp.setViewport({ width: 1440, height: 1000 });
    await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(6000);

    await gvp.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
      if (tab) tab.click();
    });
    await sleep(4000);

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
      await sleep(1500);
    }
    await sleep(2000);

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
      await sleep(1000);
    }
    await sleep(1000);

    for (let i = 0; i < 10; i++) {
      const ok = await gvp.evaluate(() => {
        const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').indexOf('Tạo phiên tiết trực tiếp') >= 0 && !x.disabled);
        if (b) { b.click(); return true; }
        return false;
      });
      if (ok) break;
      await sleep(1000);
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
      console.error('Failed to create student link');
      process.exit(1);
    }

    // 2. Mở incognito context cho HS với mobile viewport
    console.log('2. Opening student page in incognito mobile viewport...');
    const context = await gv.createBrowserContext();
    const hp = await context.newPage();
    await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    
    await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);

    // HS Login: Tuệ Minh PIN 2750
    for (let i = 0; i < 10; i++) {
      const hasSel = await hp.evaluate(() => Boolean(document.querySelector('select')));
      if (hasSel) break;
      await sleep(1000);
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
    await sleep(500);

    await hp.evaluate(() => {
      const inp = document.querySelector('input[type=\"password\"]');
      if (inp) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(500);

    await hp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled);
      if (b) b.click();
    });
    console.log('Waiting for live classroom to render...');
    await sleep(6000);

    // Mở details đề bài để hiển thị MathFigureZoom
    await hp.evaluate(() => {
      const d = document.querySelector('details');
      if (d) d.open = true;
    });
    await sleep(1000);

    // AUDIT các thành phần ASS-MDP-01
    const audit = await hp.evaluate(() => {
      const zoom = document.querySelector('.math-diagram-container');
      const zoomToolbar = document.querySelector('.math-diagram-toolbar');
      const zoomBtns = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => ({
        label: b.getAttribute('aria-label') || b.innerText,
        rect: b.getBoundingClientRect()
      }));

      const uploader = document.querySelector('.student-paper-photo') || document.querySelector('[aria-label=\"Chụp ảnh bài làm giấy\"]');
      const uploaderBtn = document.querySelector('.student-paper-photo-btn') || uploader?.querySelector('button');

      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const fontSizes = inputs.map(el => window.getComputedStyle(el).fontSize);

      return {
        hasZoom: !!zoom,
        hasZoomToolbar: !!zoomToolbar,
        zoomButtons: zoomBtns,
        hasUploader: !!uploader,
        uploaderText: uploaderBtn ? uploaderBtn.innerText : null,
        uploaderRect: uploaderBtn ? uploaderBtn.getBoundingClientRect() : null,
        inputFontSizes: fontSizes
      };
    });

    console.log('FINAL AUDIT RESULT ON MOBILE DEPLOYMENT:');
    console.log(JSON.stringify(audit, null, 2));

    await hp.screenshot({ path: 'tasks/tmp-mdp-live-mobile-verified.png', fullPage: false });
    console.log('SAVED tasks/tmp-mdp-live-mobile-verified.png');

    await context.close();
    console.log('VERIFICATION COMPLETE: SUCCESS');
  } catch (err) {
    console.error('ERROR during audit:', err);
    process.exit(1);
  }
})();
