async function checkAllCssChunks() {
  const url = 'https://giaoandewey.vercel.app';
  const indexJs = await (await fetch(url + '/assets/index-C7ExATBd.js')).text();

  const cssChunks = Array.from(indexJs.matchAll(/assets\/[A-Za-z0-9-_]+\.css/g)).map(m => m[0]);
  const uniqueCss = [...new Set(cssChunks)];
  console.log('CSS CHUNKS REFERENCED IN INDEX:', uniqueCss);

  for (const c of uniqueCss) {
    const text = await (await fetch(url + '/' + c)).text();
    console.log(`[${c}] math-diagram: ${text.includes('math-diagram')}, student-paper: ${text.includes('student-paper-photo')}, live-btn: ${text.includes('live-btn')}`);
  }
}

checkAllCssChunks().catch(console.error);
