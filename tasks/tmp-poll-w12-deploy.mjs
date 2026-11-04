async function pollVercel() {
  console.log('Polling Vercel deployment for commit 7188930...');
  for (let i = 0; i < 15; i++) {
    const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
      headers: { 'User-Agent': 'node' }
    });
    const deps = await res.json();
    const d = deps.find(x => x.sha && x.sha.startsWith('7188930'));
    if (d) {
      console.log('FOUND DEPLOYMENT:', d.id, d.environment);
      const stRes = await fetch(`https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/${d.id}/statuses`, {
        headers: { 'User-Agent': 'node' }
      });
      const st = await stRes.json();
      console.log(`[Attempt ${i+1}] State: ${st[0]?.state} | URL: ${st[0]?.environment_url}`);
      if (st[0]?.state === 'success') {
        return st[0]?.environment_url;
      }
    } else {
      console.log(`[Attempt ${i+1}] No deployment found yet for 7188930...`);
    }
    await new Promise(r => setTimeout(r, 6000));
  }
}

pollVercel().then(url => {
  if (url) console.log('DEPLOYMENT READY:', url);
  else console.log('DEPLOYMENT STILL PENDING OR NOT FOUND');
}).catch(console.error);
