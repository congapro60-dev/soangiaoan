async function checkProductionLiveChunk() {
  const url = 'https://giaoandewey.vercel.app';
  const html = await (await fetch(url + '/?cb=' + Date.now())).text();
  const m = html.match(/assets\/index-[A-Za-z0-9-_]+\.js/);
  console.log('Production Index JS:', m?.[0]);

  if (m) {
    const indexJs = await (await fetch(url + '/' + m[0])).text();
    // Search for LiveLessonPage in indexJs
    const livePageMatch = indexJs.match(/assets\/LiveLessonPage-[A-Za-z0-9-_]+\.js/);
    console.log('Production LiveLessonPage chunk:', livePageMatch?.[0]);
    if (livePageMatch) {
      const liveJs = await (await fetch(url + '/' + livePageMatch[0])).text();
      console.log('Production LiveLesson has StudentPaperPhotoUploader:', liveJs.includes('Chụp ảnh bài làm'));
      console.log('Production LiveLesson has MathFigureZoom:', liveJs.includes('Nội dung chung') && liveJs.includes('Phóng to'));
    }
  }
}

checkProductionLiveChunk().catch(console.error);
