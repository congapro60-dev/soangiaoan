/**
 * Máy chủ chạy trên Google Cloud Run: phục vụ trang web (dist/) và các hàm `api/` viết theo kiểu Vercel.
 * Mỗi hàm giữ nguyên chữ ký (req, res) của Vercel; lớp này chỉ bù phần Vercel tự làm:
 * đọc body theo Content-Type, req.query dạng phẳng, req.cookies. Cùng một địa chỉ cho web và api
 * nên cookie phụ huynh vẫn là cookie cùng site.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adaptiveProgress from '../api/adaptive-progress.js';
import aiRelay from '../api/ai-relay.js';
import assistant from '../api/assistant.js';
import classroom from '../api/classroom.js';
import exam from '../api/exam.js';
import exportLesson from '../api/export-lesson.js';
import generateSimulation from '../api/generate-simulation.js';
import gradeHomework from '../api/grade-homework.js';
import renderWord from '../api/render-word.js';
import firebaseAdminHealth from '../api/health/firebase-admin.js';

type Handler = (req: never, res: never) => unknown;

/** `bodyParser: false` (assistant): hàm tự đọc luồng thô để kiểm chữ ký webhook. */
const routes: Array<[string, Handler, { rawStream?: boolean }]> = [
  ['adaptive-progress', adaptiveProgress as Handler, {}],
  ['ai-relay', aiRelay as Handler, {}],
  ['assistant', assistant as Handler, { rawStream: true }],
  ['classroom', classroom as Handler, {}],
  ['exam', exam as Handler, {}],
  ['export-lesson', exportLesson as Handler, {}],
  ['generate-simulation', generateSimulation as Handler, {}],
  ['grade-homework', gradeHomework as Handler, {}],
  ['render-word', renderWord as Handler, {}],
  ['health/firebase-admin', firebaseAdminHealth as Handler, {}],
];

const MAX_BODY_BYTES = 30 * 1024 * 1024;

const readBody = (req: Request): Promise<Buffer> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  let size = 0;
  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error('Dữ liệu gửi lên quá lớn.'), { status: 413 })); req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

/** Giống Vercel: JSON → object, form → object, text → chuỗi, còn lại → Buffer; body rỗng → undefined. */
const parseBody = (raw: Buffer, contentType: string): unknown => {
  if (raw.length === 0) return undefined;
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (type === 'application/json' || type.endsWith('+json')) {
    try { return JSON.parse(raw.toString('utf8')); } catch { throw Object.assign(new Error('Invalid JSON body'), { status: 400 }); }
  }
  if (type === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(raw.toString('utf8')));
  if (type.startsWith('text/')) return raw.toString('utf8');
  return raw;
};

const parseCookies = (header: string | undefined): Record<string, string> => Object.fromEntries(
  String(header || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const at = part.indexOf('=');
    const key = at < 0 ? part : part.slice(0, at);
    const value = at < 0 ? '' : part.slice(at + 1);
    try { return [key, decodeURIComponent(value)]; } catch { return [key, value]; }
  }),
);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
// Vercel đưa req.query dạng phẳng (chuỗi hoặc mảng chuỗi), không lồng object.
app.set('query parser', (query: string) => {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
});

for (const [name, handler, options] of routes) {
  app.all(`/api/${name}`, async (req: Request, res: Response, next: NextFunction) => {
    try {
      Object.defineProperty(req, 'cookies', { value: parseCookies(req.headers.cookie), configurable: true });
      if (!options.rawStream) {
        const raw = await readBody(req);
        Object.defineProperty(req, 'body', { value: parseBody(raw, String(req.headers['content-type'] || '')), writable: true, configurable: true });
      }
      await (handler as (req: Request, res: Response) => unknown)(req, res);
    } catch (error) {
      next(error);
    }
  });
}

app.use('/api', (_req: Request, res: Response) => { res.status(404).json({ error: 'Không có đường dẫn API này.' }); });

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
// Tệp có mã băm (assets/) cache lâu; index.html luôn lấy bản mới để bản triển khai mới có hiệu lực ngay.
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '365d', fallthrough: false }));
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.get(/.*/, (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'index.html'));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 500;
  console.error('[server] lỗi chưa bắt', error);
  if (res.headersSent) { res.end(); return; }
  res.status(status).json({ error: status === 500 ? 'Lỗi máy chủ.' : (error as Error).message });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.info(`[server] nghe cổng ${port}`));
