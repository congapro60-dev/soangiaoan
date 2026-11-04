async function searchAllChunksForZoom() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const indexJs = await (await fetch(url + '/assets/index-C7ExATBd.js')).text();

  const allJs = Array.from(indexJs.matchAll(/assets\/[A-Za-z0-9-_]+\.js/g)).map(m => m[0]);
  const unique = [...new Set(allJs)];

  const results = await Promise.all(unique.map(async file => {
    try {
      const t = await (await fetch(url + '/' + file)).text();
      return {
        file,
        hasZoom: t.includes('clampScale') || t.includes('math-diagram-container') || t.includes('Khung hình học / đề bài'),
        hasUpload: t.includes('StudentPaperPhotoUploader') || t.includes('Chụp ảnh bài làm')
      };
    } catch {
      return { file, hasZoom: false, hasUpload: false };
    }
  }));

  console.log('CHUNKS WITH ZOOM OR UPLOAD:');
  console.log(results.filter(r => r.hasZoom || r.hasUpload));
}

searchAllChunksForZoom().catch(console.error);
