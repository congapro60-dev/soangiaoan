import https from 'https';

https.get('https://giaoandewey.vercel.app/adaptive-lessons', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const scripts = body.match(/\/assets\/[^"]+\.js/g) || [];
    console.log('ALL SCRIPT ASSETS:', scripts);
  });
});
