import https from 'https';

function checkDeploy() {
  https.get('https://giaoandewey.vercel.app/adaptive-lessons', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      const scripts = body.match(/\/assets\/[^"]+\.js/g) || [];
      console.log('FOUND ASSET SCRIPTS:', scripts.length);
      console.log('SAMPLE SCRIPTS:', scripts.slice(0, 5));
    });
  }).on('error', e => console.error(e.message));
}

checkDeploy();
