async function getEnvNames() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
    headers: { 'User-Agent': 'node' }
  });
  const deps = await res.json();
  console.log('TOTAL DEPLOYMENTS:', deps.length);
  const sample = deps.slice(0, 10).map(d => ({
    id: d.id,
    sha: d.sha.slice(0, 7),
    env: d.environment,
    created_at: d.created_at
  }));
  console.table(sample);
}

getEnvNames().catch(console.error);
