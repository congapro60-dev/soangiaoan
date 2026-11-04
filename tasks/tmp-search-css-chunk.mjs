async function searchCssInLiveLessonChunk() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const chunkText = await (await fetch(url + '/assets/LiveLessonPage-CD_6G9Ml.js')).text();

  const cssInChunk = Array.from(chunkText.matchAll(/assets\/[A-Za-z0-9-_]+\.css/g)).map(m => m[0]);
  console.log('CSS imported inside LiveLessonPage:', cssInChunk);

  for (const c of cssInChunk) {
    const t = await (await fetch(url + '/' + c)).text();
    console.log(c, 'has math-diagram-container:', t.includes('math-diagram-container'));
    console.log(c, 'has student-paper-photo:', t.includes('student-paper-photo'));
  }
}

searchCssInLiveLessonChunk().catch(console.error);
