// Pre-flight read-only (chạy từ thư mục gốc project, đọc .env.probe do preflight-zalo.ps1 pull): 
// đếm object geometry/ trong Storage. KHÔNG in secret. Exit 0 = PASS.
const fs = require('fs');
const admin = require('firebase-admin');
const t = fs.readFileSync('.env.probe', 'utf8');
const i = t.indexOf('FIREBASE_SERVICE_ACCOUNT_KEY=');
const raw = t.slice(i + 'FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
const field = (name) => {
  const m = new RegExp('"' + name + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(raw);
  if (!m) return null;
  return m[1].replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\"/g, '"');
};
const projectId = field('project_id');
const clientEmail = field('client_email');
const privateKey = field('private_key');
admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }), storageBucket: projectId + '.firebasestorage.app' });
(async () => {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'geometry/', maxResults: 20 });
  console.log('STORAGE_CHECK=PASS geometry_objects=' + files.length);
  for (const f of files.slice(0, 8)) {
    const md = (f.metadata || {});
    console.log('   ', md.name, (md.size || '?') + 'B', md.timeCreated);
  }
  process.exit(0);
})().catch(e => { console.log('STORAGE_CHECK=FAIL ' + String(e.message).slice(0, 100)); process.exit(1); });
