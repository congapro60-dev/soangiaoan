import http from 'http';

function put(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:9222${path}`, { method: 'PUT' }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const target = await put('/json/new?https://smartplan-ai-v88.vercel.app');
  console.log('OPENED TAB:', target);
}

run().catch(console.error);
