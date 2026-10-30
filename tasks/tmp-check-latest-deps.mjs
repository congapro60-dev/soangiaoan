async function checkLatestDeploy() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
    headers: { 'User-Agent': 'node' }
  });
  const deps = await res.json();
  console.log('TOP 5 DEPLOYMENTS:');
  for (const d of deps.slice(0, 5)) {
    const stRes = await fetch(`https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/${d.id}/statuses`, {
      headers: { 'User-Agent': 'node' }
    });
    const st = await stRes.json();
    console.log(`- ID: ${d.id} | SHA: ${d.sha.slice(0, 7)} | Env: ${d.environment} | State: ${st[0]?.state} | URL: ${st[0]?.environment_url}`);
  }
}

checkLatestDeploy().catch(console.error);
