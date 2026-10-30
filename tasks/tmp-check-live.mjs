async function main() {
  const js = await (await fetch('https://giaoandewey.vercel.app/assets/index-hPiihj1Y.js')).text();
  console.log('live chunk có :libraryLessonId:', js.includes(':libraryLessonId'));
  console.log('live chunk có route cũ /adaptive-library/:lessonId:', js.includes('/adaptive-library/:lessonId"'));
  const i = js.indexOf('/adaptive-library');
  console.log('CTX:', i >= 0 ? js.slice(Math.max(0, i - 60), i + 160) : '(none)');
}
main().catch((e) => console.log('ERR', e.message));
