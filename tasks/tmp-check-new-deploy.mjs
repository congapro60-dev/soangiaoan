async function checkLiveDeploy() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const html = await (await fetch(url + '/?cb=' + Date.now())).text();
  const m = html.match(/assets\/index-[A-Za-z0-9-_]+\.js/);
  console.log('Index JS on new deployment:', m?.[0]);

  if (m) {
    const js = await (await fetch(url + '/' + m[0])).text();
    console.log('Contains clampScale:', js.includes('clampScale'));
    console.log('Contains MathFigureZoom:', js.includes('MathFigureZoom'));
    console.log('Contains StudentPaperPhotoUploader:', js.includes('StudentPaperPhotoUploader') || js.includes('Chụp ảnh bài làm'));
  }
}

checkLiveDeploy().catch(console.error);
