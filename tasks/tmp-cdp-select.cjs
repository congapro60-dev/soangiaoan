// Đọc 2 chunk lazy: AdaptiveLessonBuilderPage (logic nạp dropdown giáo án nguồn) + LibraryTab.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'tmp-giaoan-routes.txt');

const grab = (label, js, needle, before = 800, after = 1600) => {
  const out = [];
  let i = -1;
  while ((i = js.indexOf(needle, i + 1)) >= 0 && out.length < 6) {
    out.push(label + '[' + i + ']: ' + js.slice(Math.max(0, i - before), i + after).replace(/\s+/g, ' '));
  }
  return out;
};

(async () => {
  const report = [];
  for (const name of ['AdaptiveLessonBuilderPage-fjWxVjbl.js', 'LibraryTab-tvLVSaGm.js']) {
    const js = await (await fetch('https://giaoandewey.vercel.app/assets/' + name)).text();
    report.push('########## ' + name + ' len=' + js.length);
    report.push(...grab('THUVIEN', js, 'Thư viện bài dạy', 300, 300));
    report.push(...grab('CHON_GIAOAN', js, 'Chọn giáo án nguồn', 2500, 500));
    report.push(...grab('LESSONPLANS', js, "collection(db", 200, 900));
    report.push(...grab('WHERE', js, "where(", 200, 400));
    report.push(...grab('GIAOAN_FMT', js, 'Bài học phân hoá', 300, 300));
  }
  fs.writeFileSync(OUT, report.join('\n\n'), 'utf8');
  console.log(report.join('\n\n').slice(0, 12000));
  console.log('SAVED ' + OUT);
  process.exitCode = 0;
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exitCode = 1; });
