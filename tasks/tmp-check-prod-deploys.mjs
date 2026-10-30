async function getProdDeploy() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
    headers: { 'User-Agent': 'node' }
  });
  const deps = await res.json();
  const prod = deps.filter(d => d.environment === 'Production');
  console.log('RECENT PRODUCTION DEPLOYMENTS:');
  for (const d of prod.slice(0, 5)) {
    const stRes = await fetch(`https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/${d.id}/statuses`, {
      headers: { 'User-Agent': 'node' }
    });
    const st = await stRes.json();
    console.log(`- SHA: ${d.sha.slice(0, 7)} | Status: ${st[0]?.state} | URL: ${st[0]?.environment_url}`);
  }
}

getProdDeploy().catch(console.error);
