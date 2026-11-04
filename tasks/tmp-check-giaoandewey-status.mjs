async function checkGiaoandeweyEnv() {
  const stRes = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/deployments/7434154219/statuses', {
    headers: { 'User-Agent': 'node' }
  });
  const st = await stRes.json();
  console.log('GIAOANDEWEY DEPLOYMENT STATUS:');
  console.log('State:', st[0]?.state);
  console.log('URL:', st[0]?.environment_url);
}

checkGiaoandeweyEnv().catch(console.error);
