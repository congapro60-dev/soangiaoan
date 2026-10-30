async function checkLiveLessonCss() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const html = await (await fetch(url + '/?cb=' + Date.now())).text();
  const cssMatches = Array.from(html.matchAll(/assets\/[A-Za-z0-9-_]+\.css/g)).map(m => m[0]);
  console.log('CSS FILES:', cssMatches);

  for (const c of cssMatches) {
    const text = await (await fetch(url + '/' + c)).text();
    if (text.includes('math-diagram-container') || text.includes('math-diagram-toolbar') || text.includes('student-paper-photo')) {
      console.log('FOUND CSS IN:', c);
      return;
    }
  }
  console.log('CSS classes not found in index CSS files.');
}

checkLiveLessonCss().catch(console.error);
