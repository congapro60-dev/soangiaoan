import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(body);
    tabs.forEach((t, i) => console.log(`[${i}] ${t.title} -> ${t.url}`));
  });
});
