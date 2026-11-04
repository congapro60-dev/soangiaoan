import http from 'http';

function getDeployments() {
  const req = http.request({
    hostname: '127.0.0.1',
    port: 9222,
    path: '/json/list',
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('CHROME TABS ON 9222:');
      const tabs = JSON.parse(data);
      tabs.filter(t => t.url.includes('vercel.app')).forEach(t => console.log(`  - ${t.title} -> ${t.url}`));
    });
  });
  req.on('error', (e) => console.error(e.message));
  req.end();
}

getDeployments();
