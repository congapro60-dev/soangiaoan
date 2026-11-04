import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const tabs = JSON.parse(body);
      console.log('TABS COUNT:', tabs.length);
      tabs.slice(0, 10).forEach((t, i) => {
        console.log(`[${i}] ${t.title} -> ${t.url} (id: ${t.id})`);
      });
    } catch (e) {
      console.error('Parse err:', e);
    }
  });
}).on('error', console.error);
