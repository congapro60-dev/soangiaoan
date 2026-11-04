async function pollVercel() {
  console.log('Polling Vercel deployment for commit ef77f2b...');
  for (let i = 0; i < 20; i++) {
    const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
      headers: { 'User-Agent': 'node' }
    });
    const deps = await res.json();
    const d = deps.find(x => x.sha && x.sha.startsWith('ef77f2b'));
    if (d) {
      console.log('FOUND DEPLOYMENT:', d.id, d.environment);
      const stRes = await fetch(`https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/${d.id}/statuses`, {
        headers: { 'User-Agent': 'node' }
      });
      const st = await stRes.json();
      console.log('STATUS:', st[0]?.state, st[0]?.environment_url);
      if (st[0]?.state === 'success') {
        return st[0]?.environment_url;
      }
    }
    await new Promise(r => setTimeout(r, 8000));
  }
}

pollVercel().catch(console.error);
