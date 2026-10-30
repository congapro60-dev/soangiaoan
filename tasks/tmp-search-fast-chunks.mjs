async function checkLiveLessonImports() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const indexJs = await (await fetch(url + '/assets/index-C7ExATBd.js')).text();

  // Look for LiveLesson in indexJs
  const liveMatch = indexJs.match(/LiveLessonPage[^"]*["']([^"']+\.js)["']/);
  console.log('LiveLessonPage import match:', liveMatch?.[1]);

  const allJs = Array.from(indexJs.matchAll(/assets\/[A-Za-z0-9-_]+\.js/g)).map(m => m[0]);
  const unique = [...new Set(allJs)];
  
  // Search in parallel batches of 15
  for (let i = 0; i < unique.length; i += 15) {
    const batch = unique.slice(i, i + 15);
    const results = await Promise.all(batch.map(async file => {
      try {
        const t = await (await fetch(url + '/' + file)).text();
        return {
          file,
          hasZoom: t.includes('clampScale') || t.includes('MathFigureZoom'),
          hasUpload: t.includes('StudentPaperPhotoUploader') || t.includes('Chụp ảnh bài làm')
        };
      } catch {
        return { file, hasZoom: false, hasUpload: false };
      }
    }));
    const found = results.find(r => r.hasZoom || r.hasUpload);
    if (found) {
      console.log('FOUND IN CHUNK:', found);
      return;
    }
  }
  console.log('DONE SEARCHING: not in these chunks');
}

checkLiveLessonImports().catch(console.error);
