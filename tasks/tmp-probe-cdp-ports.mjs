import http from 'http';

function probePort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ port, ok: true, data: JSON.parse(data) });
        } catch (e) {
          resolve({ port, ok: false, error: e.message });
        }
      });
    });
    req.on('error', (err) => resolve({ port, ok: false, error: err.message }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ port, ok: false, error: 'timeout' });
    });
  });
}

async function main() {
  const r9222 = await probePort(9222);
  console.log('PORT 9222:', r9222);
  const r5173 = await probePort(5173);
  console.log('PORT 5173:', r5173);
  const r3000 = await probePort(3000);
  console.log('PORT 3000:', r3000);
}

main();
