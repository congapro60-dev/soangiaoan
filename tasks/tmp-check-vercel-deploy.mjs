async function checkVercelDeploy() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/commits/32901a3/check-runs', {
    headers: { 'User-Agent': 'node' }
  });
  console.log('STATUS:', res.status);
  const data = await res.json();
  console.log('CHECK RUNS:', (data.check_runs || []).map(r => ({ name: r.name, status: r.status, conclusion: r.conclusion })));
}

checkVercelDeploy().catch(console.error);
