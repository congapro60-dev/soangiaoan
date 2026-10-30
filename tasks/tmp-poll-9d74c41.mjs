async function pollVercel() {
  console.log('Polling Vercel deployment for commit 9d74c41...');
  for (let i = 0; i < 20; i++) {
    const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
      headers: { 'User-Agent': 'node' }
    });
    const deps = await res.json();
    const d = deps.find(x => x.sha && x.sha.startsWith('9d74c41') && x.environment.includes('giaoandewey'));
    if (d) {
      const stRes = await fetch(`https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/${d.id}/statuses`, {
        headers: { 'User-Agent': 'node' }
      });
      const st = await stRes.json();
      console.log(`[Attempt ${i+1}] State: ${st[0]?.state} | URL: ${st[0]?.environment_url}`);
      if (st[0]?.state === 'success') {
        return st[0]?.environment_url;
      }
    } else {
      console.log(`[Attempt ${i+1}] Waiting for deployment 9d74c41...`);
    }
    await new Promise(r => setTimeout(r, 6000));
  }
}

pollVercel().then(url => {
  if (url) console.log('DEPLOYMENT READY:', url);
  else console.log('DEPLOYMENT TIMEOUT');
}).catch(console.error);
