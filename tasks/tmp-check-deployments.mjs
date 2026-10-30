async function checkDeployments() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments', {
    headers: { 'User-Agent': 'node' }
  });
  const deps = await res.json();
  console.log('DEPLOYMENTS:', deps.slice(0, 5).map(d => ({
    id: d.id,
    sha: d.sha?.slice(0, 7),
    ref: d.ref,
    created_at: d.created_at,
    environment: d.environment
  })));
}

checkDeployments().catch(console.error);
