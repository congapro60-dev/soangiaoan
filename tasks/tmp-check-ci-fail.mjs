async function getFailDetails() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/commits/32901a3/check-runs', {
    headers: { 'User-Agent': 'node' }
  });
  const data = await res.json();
  const verify = (data.check_runs || []).find(r => r.name === 'verify');
  console.log('OUTPUT:', JSON.stringify(verify?.output, null, 2));
}

getFailDetails().catch(console.error);
