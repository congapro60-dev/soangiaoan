async function getAnnotations() {
  const res = await fetch('https://api.github.com/repos/congapro60-dev/soangiaoan/check-runs/123887048044/annotations', {
    headers: { 'User-Agent': 'node' }
  });
  const data = await res.json();
  console.log('ANNOTATIONS:', data.map(a => ({
    path: a.path,
    message: a.message,
    title: a.title,
    raw_details: a.raw_details
  })));
}

getAnnotations().catch(console.error);
