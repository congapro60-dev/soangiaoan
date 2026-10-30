// Kiểm chunks Production (deploy 6307e4e): AdaptiveStudentPortalPage + studentPortalApi
async function main() {
  const html = await (await fetch('https://giaoandewey.vercel.app/?cb=' + Date.now())).text();
  const idx = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  console.log('INDEX LIVE:', idx);
  const js = await (await fetch('https://giaoandewey.vercel.app/' + idx)).text();
  // Tìm các chunk trong index
  const chunks = [...js.matchAll(/"([^"]*AdaptiveStudentPortalPage[^"]*)"/g)].map(m => m[1]);
  console.log('portal chunk refs:', [...new Set(chunks)]);
  const api = [...js.matchAll(/"([^"]*studentPortalApi[^"]*)"/g)].map(m => m[1]);
  console.log('api chunk refs:', [...new Set(api)]);
  for (const c of [...new Set([...chunks, ...api])]) {
    const src = await (await fetch('https://giaoandewey.vercel.app/assets/' + c.replace(/^assets\//, ''))).text();
    console.log(c.slice(0, 60), '| libLessonId:', src.includes('libraryLessonId'), '| libOpen:', src.includes('studentAdaptiveLibraryOpen'), '| libSubmit:', src.includes('studentAdaptiveLibrarySubmit'));
  }
}
main().catch((e) => console.log('ERR', e.message));
