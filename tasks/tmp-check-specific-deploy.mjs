async function checkSpecificDeploy() {
  const url = 'https://giaoandewey-feh9yzjrd-congapro60-devs-projects.vercel.app';
  const html = await (await fetch(url + '/?cb=' + Date.now())).text();
  const scriptMatches = Array.from(html.matchAll(/src="([^"]+\.js)"/g)).map(m => m[1]);
  console.log('Script matches:', scriptMatches);

  const indexJsUrl = scriptMatches.find(s => s.includes('assets/index-'));
  if (indexJsUrl) {
    const fullUrl = `${url}${indexJsUrl}`;
    console.log('Fetching:', fullUrl);
    const indexJs = await (await fetch(fullUrl)).text();
    const cssMatches = Array.from(indexJs.matchAll(/assets\/[A-Za-z0-9-_]+\.css/g)).map(m => m[0]);
    console.log('CSS matches in index:', cssMatches);

    for (const c of [...new Set(cssMatches)]) {
      const cssText = await (await fetch(`${url}/${c}`)).text();
      console.log(`[${c}] math-diagram-container: ${cssText.includes('math-diagram-container')}, student-paper-photo: ${cssText.includes('student-paper-photo')}`);
    }
  }
}

checkSpecificDeploy().catch(console.error);
