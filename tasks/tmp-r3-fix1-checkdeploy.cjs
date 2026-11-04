// R3 fix1 — kiểm Production đã build bản chứa 'gateD78' chưa
const APP = 'https://giaoandewey.vercel.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const html = await (await fetch(APP + '/', { cache: 'no-store' })).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  // lazy chunks: Vite nhúng path tương đối trong bundle chính
  const seeds = assets.slice();
  for (let i = 0; i < 2; i++) {
    for (const a of [...seeds]) {
      if (!a.startsWith('/assets/')) continue;
      try {
        const body = await (await fetch(APP + a, { cache: 'no-store' })).text();
        for (const m of body.matchAll(/([\w./-]*assets\/[\w.-]+\.js)/g)) seeds.push(m[1].startsWith('/') ? m[1] : '/src/' + m[1]);
      } catch {}
    }
  }
  const uniq = [...new Set(seeds)].filter((a) => a.includes('assets/'));
  console.log('assets:', uniq.length);
  for (const a of uniq) {
    const url = a.startsWith('http') ? a : APP + (a.startsWith('/') ? a : '/assets/' + a.replace(/^.*assets\//, ''));
    try {
      const body = await (await fetch(url, { cache: 'no-store' })).text();
      const has = body.includes('gateD78');
      if (has || body.includes('banToan')) console.log(url.slice(APP.length), '| gateD78:', has, '| banToan:', body.includes('banToan'), '| size:', body.length);
      if (has) { console.log('NEW BUNDLE LIVE ✓'); process.exit(0); }
    } catch {}
  }
  console.log('CHƯA thấy gateD78 — build cũ vẫn live');
  process.exit(2);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
