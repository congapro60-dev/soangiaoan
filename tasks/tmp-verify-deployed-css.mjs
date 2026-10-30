async function verifyDeployedCss() {
  const url = 'https://congapro60-dev-soangiaoan-3vkspp18y-congapro60-devs-projects.vercel.app';
  const html = await (await fetch(url)).text();
  const indexJsMatch = html.match(/assets\/index-[A-Za-z0-9-_]+\.js/);
  console.log('Index JS:', indexJsMatch?.[0]);

  const indexJs = await (await fetch(`${url}/${indexJsMatch[0]}`)).text();
  const cssMatches = Array.from(indexJs.matchAll(/assets\/[A-Za-z0-9-_]+\.css/g)).map(m => m[0]);
  console.log('CSS referenced:', cssMatches);

  let hasMathDiagram = false;
  let hasStudentPhoto = false;

  for (const c of cssMatches) {
    const text = await (await fetch(`${url}/${c}`)).text();
    if (text.includes('math-diagram-container')) hasMathDiagram = true;
    if (text.includes('student-paper-photo')) hasStudentPhoto = true;
  }

  console.log('DEPLOYED CSS VERIFICATION:');
  console.log('- has math-diagram-container:', hasMathDiagram);
  console.log('- has student-paper-photo:', hasStudentPhoto);
}

verifyDeployedCss().catch(console.error);
