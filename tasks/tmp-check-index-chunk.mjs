import https from 'https';

https.get('https://giaoandewey.vercel.app/assets/index-D5LBvIL2.js', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('INDEX CHUNK SIZE:', body.length);
    console.log('CONTAINS 10-12-88?', body.includes('10-12-88'));
    console.log('CONTAINS gateD101288?', body.includes('gateD101288'));
    console.log('CONTAINS 10-11-80?', body.includes('10-11-80'));
  });
});
