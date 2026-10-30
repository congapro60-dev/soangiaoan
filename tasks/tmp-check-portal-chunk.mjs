import https from 'https';

function checkLiveChunk() {
  https.get('https://giaoandewey.vercel.app/adaptive-lessons', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const match = body.match(/\/assets\/AdaptiveLessonPortalPage-[^"]+\.js/);
      if (match) {
        console.log('PORTAL CHUNK:', match[0]);
        https.get('https://giaoandewey.vercel.app' + match[0], (res2) => {
          let chunkBody = '';
          res2.on('data', c => chunkBody += c);
          res2.on('end', () => {
            console.log('CHUNK SIZE:', chunkBody.length);
            console.log('CONTAINS 10-12-88?', chunkBody.includes('10-12-88'));
            console.log('CONTAINS gateD101288?', chunkBody.includes('gateD101288'));
          });
        });
      } else {
        console.log('AdaptiveLessonPortalPage chunk not found in HTML');
      }
    });
  });
}

checkLiveChunk();
