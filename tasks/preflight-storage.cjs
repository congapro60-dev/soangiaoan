// Pre-flight read-only: đếm object geometry/ trong Storage (đọc .env.probe). KHÔNG in secret.
// In ra con số để script .ps1 so sánh TRƯỚC/SAU — nếu chỉ đếm tổng thì ảnh cũ làm PASS giả.
const fs = require('fs');
const admin = require('firebase-admin');
const t = fs.readFileSync('.env.probe', 'utf8');
const i = t.indexOf('FIREBASE_SERVICE_ACCOUNT_KEY=');
if (i < 0) { console.log('STORAGE_CHECK=FAIL thieu FIREBASE_SERVICE_ACCOUNT_KEY'); process.exit(1); }
const raw = t.slice(i + 'FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
const field = (name) => {
  const m = new RegExp('"' + name + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(raw);
  if (!m) return null;
  return m[1].replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\"/g, '"');
};
const projectId = field('project_id');
const clientEmail = field('client_email');
const privateKey = field('private_key');
if (!projectId || !clientEmail || !privateKey) { console.log('STORAGE_CHECK=FAIL thieu truong service account'); process.exit(1); }
admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  storageBucket: projectId + '.firebasestorage.app',
});
(async () => {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'geometry/', maxResults: 200 });
  const sorted = files.map(f => ({ md: f.metadata || {} }))
    .sort((a, b) => String(b.md.timeCreated).localeCompare(String(a.md.timeCreated)));
  // Dòng máy đọc được: COUNT=<n> NEWEST=<ISO>
  console.log('COUNT=' + sorted.length);
  if (sorted.length) console.log('NEWEST=' + String(sorted[0].md.timeCreated));
  console.log('STORAGE_CHECK=PASS geometry_objects=' + sorted.length);
  process.exit(0);
})().catch(e => { console.log('STORAGE_CHECK=FAIL ' + String(e.message).slice(0, 100)); process.exit(1); });
