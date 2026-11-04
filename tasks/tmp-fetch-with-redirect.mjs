import https from 'https';

async function checkRedirect() {
  const res = await fetch('https://congapro60-dev-soangiaoan-jj9bjhadg-congapro60-devs-projects.vercel.app/adaptive-lessons', {
    redirect: 'follow'
  });
  console.log('FINAL URL:', res.url);
  console.log('STATUS:', res.status);
  const text = await res.text();
  console.log('BODY LENGTH:', text.length);
  const scripts = text.match(/\/assets\/[^"]+\.js/g) || [];
  console.log('SCRIPTS COUNT:', scripts.length);

  for (const s of scripts) {
    const sRes = await fetch('https://congapro60-dev-soangiaoan-jj9bjhadg-congapro60-devs-projects.vercel.app' + s);
    const code = await sRes.text();
    if (code.includes('10-12-88') || code.includes('gateD101288')) {
      console.log(`FOUND TARGET IN SCRIPT: ${s} (has 10-12-88: ${code.includes('10-12-88')}, has gateD101288: ${code.includes('gateD101288')})`);
      return;
    }
  }
  console.log('NOT FOUND IN ANY SCRIPTS');
}

checkRedirect().catch(console.error);
