const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const body = await (await fetch(APP + '/assets/index-BO_VquYr.js', { cache: 'no-store' })).text();
  const m1 = [...new Set([...body.matchAll(/[\w./-]*assets\/[\w.-]+\.js/g)].map((x) => x[0]))];
  console.log('asset refs:', m1.slice(0, 30).join('\n') || '(none)');
  const m2 = [...new Set([...body.matchAll(/"([\w-]+-[A-Za-z0-9_-]{8})\.js"/g)].map((x) => x[1]))];
  console.log('chunk names:', m2.join(',') || '(none)');
  console.log('banToan refs:', body.includes('banToan'), '| lessonSpecs:', body.includes('lessonSpecs'), '| snapshot-like (54d92529 OR f10723f4):', body.includes('54d92529') || body.includes('f10723f4'));
})();
