import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

test('QA v40: anh nang da chuyen webp, khong con tham chieu PNG trong production', async () => {
    for (const f of ['app.js', 'style.css', 'campaign-data.js']) {
        const s = await readFile(resolve('public', f), 'utf8');
        assert(!s.includes('mascots.png'), f + ' khong con tham chieu mascots.png');
        assert(!s.includes('station.png') && !s.includes('station-interior.png'), f + ' khong con tham chieu station PNG');
    }
    const lib = await readFile(resolve('lib/campaign.js'), 'utf8');
    assert(!lib.includes('mascots.png'), 'lib/campaign.js khong con mascots.png');
    for (const f of ['station.webp', 'station-interior.webp', 'mascots.webp']) {
        const st = await readFile(resolve('public/assets', f));
        assert.ok(st.length > 50000 && st.length < 900000, f + ' co mat va nho hon 900KB');
        // WebP magic: RIFF....WEBP
        assert.equal(st.slice(0, 4).toString('ascii'), 'RIFF', f + ' la file webp hop le');
        assert.equal(st.slice(8, 12).toString('ascii'), 'WEBP', f + ' la file webp hop le');
    }
    const pc = await readFile(resolve('lib/product-content.js'), 'utf8');
    assert(pc.includes('mascots.webp'), 'product-content sprites webp');
});

test('QA v40: tong ket tiet trong app.js (reviewTopics + lessonSummary + CSV)', async () => {
    const app = await readFile(resolve('public/app.js'), 'utf8');
    assert(app.includes('function reviewTopics(r) {'), 'reviewTopics defined');
    assert(app.includes('function lessonSummary() {'), 'lessonSummary defined');
    assert(app.includes('lessonSummary() + \'</section><section class="team-dossiers">'), 'summary rendered on the started board');
    assert(app.includes("'Chủ đề cần ôn (từ bỏ)','Chưa tới'"), 'CSV has the two new columns');
    assert(app.includes('const t=reviewTopics(r)||{review:\'\',pending:\'\'}'), 'CSV rows use reviewTopics');
    const css = await readFile(resolve('public/style.css'), 'utf8');
    assert(css.includes('.lesson-summary'), 'styles for lesson summary');
});

test('QA v40: reviewTopics phan loai dung theo outcomes (chay bang node -e wiring)', async () => {
    // wiring test: mount reviewTopics + lessonSummary trong sandbox giai lap tu app.js
    const src = await readFile(resolve('public/app.js'), 'utf8');
    const start = src.indexOf('function reviewTopics(r) {');
    const end = src.indexOf('function lessonClock() {');
    assert(start > 0 && end > start, 'region found');
    const code = src.slice(start, end);
    const sandbox = {
        window: { SignalCampaign: { topics: [{ id: 'quadratic', name: 'Phương trình bậc hai' }, { id: 'sets', name: 'Tập hợp' }] } },
        sorted: () => [
            { team: 'Doi A', completed: 2, race: { campaign: { plan: [{ topic: 'quadratic' }, { topic: 'sets' }] }, outcomes: [{ station: 0, skipped: false, digit: 3 }, { station: 1, skipped: true }] } },
            { team: 'Doi B', completed: 0, race: { campaign: { plan: [{ topic: 'quadratic' }, { topic: 'sets' }] }, outcomes: [{ station: 0, skipped: true, bypassed: true }] } }
        ],
        esc: v => String(v)
    };
    const fn = new Function('window', 'sorted', 'esc', code + '; return { reviewTopics, lessonSummary: typeof lessonSummary === "function" ? lessonSummary : null };');
    const { reviewTopics } = fn(sandbox.window, sandbox.sorted, sandbox.esc);
    const a = reviewTopics(sandbox.sorted()[0]);
    assert.equal(a.review, 'Tập hợp (trạm 2)', 'skipped -> can on');
    assert.equal(a.pending, '', 'station da co outcome -> khong pending');
    const b = reviewTopics(sandbox.sorted()[1]);
    assert.equal(b.bypassed, 'Phương trình bậc hai (trạm 1)', 'bypassed -> khong gap');
    assert.equal(b.pending, 'Tập hợp (trạm 2)', 'chua co outcome -> chua toi');
});
