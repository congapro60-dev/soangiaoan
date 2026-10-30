async function getDepStatus() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/7430623426/statuses', {
    headers: { 'User-Agent': 'node' }
  });
  const data = await res.json();
  console.log('PROD DEWEY STATUS:', data.map(s => ({
    state: s.state,
    environment_url: s.environment_url,
    description: s.description
  })));
}

getDepStatus().catch(console.error);
