// Kiểm tra bundle production đã chứa code mới chưa (TvSlowGroups + gated subscribe)
const html = await (await fetch('https://giaoandewey.vercel.app/?cb=' + Date.now())).text();
// lazy chunks được import động — lấy tất cả .js được nhắc trong html
const refs = [...html.matchAll(/["'`]([^"'`\s]+\.js)["'`]/g)].map((m) => m[1]);
console.log('refs trong html:', refs.slice(0, 12).join('\n'));
// thử các tên chunk phổ biến
const fs = await import('node:fs');
const local = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.js'));
const llLocal = local.find((f) => /LiveLessonPage/.test(f));
console.log('local LiveLessonPage:', llLocal);
const remoteTry = await fetch('https://giaoandewey.vercel.app/assets/' + llLocal, { method: 'GET' });
console.log('GET chunk local-tên trên remote:', remoteTry.status);
if (remoteTry.status === 200) {
  const src = await remoteTry.text();
  console.log('chứa "TvSlowGroups"?', src.includes('Nhóm chậm — chỉ giáo viên'));
  console.log('chứa "showStats) { setGroupCounters(null)"?', src.includes('setGroupCounters(null)'));
}
