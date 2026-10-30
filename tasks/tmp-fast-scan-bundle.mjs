import https from 'https';

const BASE = 'https://congapro60-dev-soangiaoan-jj9bjhadg-congapro60-devs-projects.vercel.app';

https.get(BASE + '/adaptive-lessons', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('HTML FETCH STATUS:', res.statusCode);
    const scripts = body.match(/\/assets\/[^"]+\.js/g) || [];
    console.log('SCRIPTS COUNT:', scripts.length);
    
    // Check all scripts for 10-12-88
    let found = false;
    let pending = scripts.length;
    scripts.forEach(s => {
      https.get(BASE + s, (res2) => {
        let code = '';
        res2.on('data', chunk => code += chunk);
        res2.on('end', () => {
          if (code.includes('10-12-88') || code.includes('gateD101288')) {
            console.log(`FOUND in ${s}! (has 10-12-88: ${code.includes('10-12-88')}, has gateD101288: ${code.includes('gateD101288')})`);
            found = true;
          }
          pending--;
          if (pending === 0) {
            console.log('SCAN FINISHED. FOUND KEY IN BUNDLE?', found);
          }
        });
      });
    });
  });
});
