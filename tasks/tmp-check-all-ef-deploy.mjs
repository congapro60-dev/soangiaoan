async function getDeweyDeploy() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
    headers: { 'User-Agent': 'node' }
  });
  const deps = await res.json();
  const efDeps = deps.filter(x => x.sha && x.sha.startsWith('ef77f2b'));
  console.log('DEPLOYMENTS FOR ef77f2b:', efDeps.map(d => ({ id: d.id, env: d.environment })));

  for (const d of efDeps) {
    const stRes = await fetch(`https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/${d.id}/statuses`, {
      headers: { 'User-Agent': 'node' }
    });
    const st = await stRes.json();
    console.log(`[${d.environment}] status:`, st[0]?.state, st[0]?.environment_url);
  }
}

getDeweyDeploy().catch(console.error);
