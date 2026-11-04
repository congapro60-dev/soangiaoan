async function checkLiveLessonChunk() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const indexJs = await (await fetch(url + '/assets/index-C7ExATBd.js')).text();

  // Find dynamic import chunks
  const chunks = Array.from(indexJs.matchAll(/assets\/[A-Za-z0-9-_]+\.js/g)).map(m => m[0]);
  const uniqueChunks = [...new Set(chunks)];
  console.log('CHUNKS COUNT in index:', uniqueChunks.length);

  for (const c of uniqueChunks) {
    const text = await (await fetch(url + '/' + c)).text();
    if (text.includes('clampScale') || text.includes('MathFigureZoom') || text.includes('StudentPaperPhotoUploader')) {
      console.log('MATCH FOUND IN CHUNK:', c);
      return;
    }
  }
  console.log('No chunk matched yet.');
}

checkLiveLessonChunk().catch(console.error);
