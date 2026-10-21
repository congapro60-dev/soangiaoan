import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '../..');
const buildRoot = resolve(process.env.TAKEOVER_BUILD_ROOT || join(root, '.sites-runtime/takeover-candidate-20261011'));
const assets = join(buildRoot, 'dist/client');
const port = 5203;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.md': 'text/plain' };
const manifest = {};
for (const file of ['lesson-map.html', 'strategic-map.js', 'map3d.js']) manifest[file] = createHash('sha256').update(await readFile(join(assets, file))).digest('hex');
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R4 — Bản đồ mô phỏng</title><style>html,body{margin:0;height:100%;font:14px system-ui;background:#07120d;color:white}header{position:absolute;top:0;left:0;right:0;z-index:2;min-height:48px;background:#081521;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:4px 8px;box-sizing:border-box}header button,header select{min-height:44px;max-width:150px}header small{font-size:12px}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><header><strong>R4 · Mô phỏng</strong><select id="view" aria-label="Kiểu mô phỏng"><option value="personal">Cá nhân</option><option value="team">Đội</option><option value="tv">TV</option><option value="exam">Kiểm tra</option></select><select id="world" aria-label="Thế giới"><option value="historical">Cổ trang</option><option value="modern">Hiện đại</option><option value="future">Tương lai</option><option value="dewey">Dewey</option><option value="pastoral">Đồng quê</option><option value="galaxy">Ngân hà</option><option value="zones">Vùng bí ẩn</option><option value="academy">Học viện</option><option value="cube">Khối</option><option value="survival">Sinh tồn</option><option value="ring">Vành đai</option><option value="maze">Mê cung</option></select><button id="extension" type="button" aria-pressed="false">Mở rộng: khóa</button><small id="status" role="status">50 linh vật giả · chỉ kiểm hình ảnh, không chứng minh backend.</small></header><iframe id="map" src="/lesson-map.html" title="Bản đồ ba làn mô phỏng"></iframe><script>
const frame=document.getElementById('map'),view=document.getElementById('view'),world=document.getElementById('world'),toggle=document.getElementById('extension'),status=document.getElementById('status');
const params=new URLSearchParams(location.search);view.value=['personal','team','tv','exam'].includes(params.get('view'))?params.get('view'):'personal';world.value=params.get('world')||'historical';if(!world.value)world.value='historical';let branch=['support','core','extension'].includes(params.get('branch'))?params.get('branch'):'support',extension=params.get('extension')==='1';
function payload(){const own=view.value==='personal'||view.value==='exam';const peers=view.value==='team'?[{id:'synthetic-team',mascot:1,position:14}]:Array.from({length:50},(_,i)=>({id:'synthetic-'+i,mascot:i===0?1:i%8,position:i===0?14:(i*7)%72,own:own&&i===0}));const map={totalPosition:72,peers,activityIds:Array.from({length:9},(_,i)=>'gate-'+i),gateStars:Array.from({length:9},(_,i)=>({activityId:'gate-'+i,stars:i===0?2:0}))};if(view.value==='personal'){map.ownBranch=branch;map.availableBranches=extension?['support','core','extension']:['support','core'];}return{map,world:world.value,sessionKey:'r4-render-'+view.value+'-'+world.value,topInset:document.querySelector('header').offsetHeight+4,branchSelection:view.value==='personal',...(view.value==='exam'?{examJourney:{phase:'review',stations:Array.from({length:9},(_,i)=>({id:'q'+i,label:'Câu '+(i+1),answered:i<2})),selectedStationId:'q0'}}:{})};}
function send(){frame.contentWindow.postMessage({type:'lesson-map:update',payload:payload()},location.origin);toggle.setAttribute('aria-pressed',String(extension));toggle.textContent='Mở rộng: '+(extension?'mở':'khóa');}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;if(event.data?.type==='lesson-map:ready')send();if(event.data?.type==='lesson-map:branch'){const next=event.data.payload?.branch;if(view.value!=='personal'||!payload().map.availableBranches.includes(next))return;branch=next;status.textContent='Đổi làn mô phỏng: '+next+' · chưa gọi backend.';send();}});
view.onchange=world.onchange=send;toggle.onclick=()=>{extension=!extension;send();};
</script></body></html>`;

const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/qa/stop' && req.method === 'POST') { res.end('Stopped local rendering fixture'); server.close(); return; }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    if (url.pathname === '/qa/manifest') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ fixture: 'synthetic rendering only; no backend/auth proof', buildRoot, assets, files: manifest })); return; }
    const file = resolve(assets, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(assets + sep) || !mime[extname(file)] || !(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[extname(file)] + (['.js', '.html', '.css', '.md'].includes(extname(file)) ? '; charset=utf-8' : ''));
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ url: `http://127.0.0.1:${port}/?world=historical&branch=support`, fixture: 'synthetic rendering only; no backend/auth proof', files: manifest })));
