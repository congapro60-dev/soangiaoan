import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importText } from '../../lib/lesson/import/text.js';
import { createLessonGenerationService } from '../../lib/lesson/generation-service.js';
import { generateLessonCandidate, lessonAIConfig } from '../../lib/lesson/generation-provider.js';

// Explicit opt-in only. Credentials stay in environment; evidence uses synthetic source.
const config = lessonAIConfig(process.env);
if (!config) throw Error('AI_PROVIDER_NOT_CONFIGURED');
const output = resolve('tasks/canary/generation-' + new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(output, { recursive: true });
const text = [
  '# Toán 11 — Dãy số, tiết 1 (nguồn giả cho kiểm thử)',
  'Thời lượng 40 phút. Mục tiêu T11.18: nhận biết dãy hữu hạn/vô hạn, phân biệt số thứ tự n và giá trị số hạng u_n.',
  'Mục tiêu T11.19: nhận biết bốn cách cho dãy số: liệt kê, công thức tổng quát, truy hồi, diễn đạt bằng lời.',
  'Hội trường 25 hàng ghế. Hàng đầu 18 ghế, mỗi hàng sau thêm 2. Miền n=1..25. u_n=18+2(n-1). u_1=18, u_2=20, u_7=30, u_25=66.',
  'Dãy thực tế có 25 số hạng là hữu hạn. Nếu mô hình mở rộng với n thuộc N* không có giới hạn trên thì là vô hạn.',
  'Bốn biểu diễn: liệt kê 18,20,22,...,66; công thức u_n=18+2(n-1); truy hồi u_1=18,u_n=u_(n-1)+2 cho 2<=n<=25; bằng lời: 25 số hạng, bắt đầu 18, tăng thêm 2.',
  'Khởi động/precheck 4 phút: mỗi em nhận diện hữu hạn/vô hạn và dự đoán cách biểu diễn. GV hình thành kiến thức 8 phút, chốt chỉ số và bốn biểu diễn.',
  'Nhóm 10 phút: ghép bốn biểu diễn, mỗi em giải thích một thẻ. Cá nhân phân hóa 7 phút: sửa công thức sai 18+2n bằng cách kiểm n=1; nhánh hỗ trợ có bảng; mở rộng mô hình khác.',
  'Recheck cá nhân 5 phút kiểm cả hai mục tiêu bằng dãy mới v_n=10+3(n-1), n=1..12; v_4=19. Exit cá nhân 3 phút kiểm hữu hạn và viết/giải thích biểu diễn, không chỉ tự đánh giá.',
  'Dự phòng 3 phút. Hint H1 dữ kiện, H2 chiến lược, H3 bước đầu, H4 ví dụ tương tự; không nêu đáp án nhiệm vụ. Điểm nhóm không chứng minh mastery cá nhân.',
].join('\n\n');
const parsed = importText({ kind: 'markdown', originalName: 'synthetic-day-so.md', text });
const extraction = JSON.parse(JSON.stringify(parsed));
const source = {
  id: 'synthetic-source', status: 'ready', originalName: parsed.originalName, sha256: parsed.sha256,
  parserRevision: 'text-canary-1',
  extractionHash: createHash('sha256').update(JSON.stringify(extraction)).digest('hex'), extraction
};
const database = new DatabaseSync(':memory:');
try {
  for (const file of (await readdir('drizzle')).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort()) database.exec(await readFile('drizzle/' + file, 'utf8'));
  database.exec('PRAGMA foreign_keys=ON');
  database.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').run('synthetic-owner', 'synthetic@example.invalid', 1);
  database.prepare('INSERT INTO lesson_sources(id,owner_account_id,request_id,request_fingerprint,original_name,mime,bytes,sha256,status,parser_revision,extraction_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(source.id, 'synthetic-owner', 'upload', 'a'.repeat(64), source.originalName, 'text/markdown', parsed.bytes, source.sha256, 'ready', source.parserRevision, source.extractionHash, 1, 1);
  const db = { prepare: sql => ({ bind: (...args) => {
    const statement = database.prepare(sql);
    return { first: () => statement.get(...args) || null, run: () => ({ meta: { changes: Number(statement.run(...args).changes) } }) };
  } }) };
  let calls = 0;
  const started = Date.now();
  const service = createLessonGenerationService({
    db, sourceService: { get: async (owner, id) => { if (owner !== 'synthetic-owner' || id !== source.id) throw Error('NOT_FOUND'); return source; } },
    generate: async input => {
      calls++;
      await writeFile(resolve(output, 'request-' + calls + '.json'), JSON.stringify({ settings: input.settings, model: input.model, sourceHash: source.sha256, repairErrors: input.repairErrors }, null, 2));
      const candidate = await generateLessonCandidate(input, { env: process.env });
      await writeFile(resolve(output, 'candidate-' + calls + '.json'), JSON.stringify(candidate, null, 2));
      return candidate;
    }
  });
  const job = await service.start({ ownerAccountId: 'synthetic-owner', sourceId: source.id, requestId: 'live-canary', model: config.model, settings: { slotMinutes: 40, subject: 'math', grade: 11 } });
  const completed = await service.run({ ownerAccountId: 'synthetic-owner', id: job.id });
  await writeFile(resolve(output, 'source.json'), JSON.stringify(source, null, 2));
  await writeFile(resolve(output, 'job.json'), JSON.stringify(completed, null, 2));
  const report = { model: config.model, calls, milliseconds: Date.now() - started, status: completed.status, valid: completed.result?.validation.ok === true, errors: completed.result?.validation.errors || [], errorCode: completed.errorCode, evidence: output };
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (!report.valid) process.exitCode = 1;
} finally { database.close(); }
