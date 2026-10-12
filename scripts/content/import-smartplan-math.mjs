import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { unzipSync, strFromU8 } from 'fflate';
import { hashPackage } from '../../lib/lesson/schema.js';

const structuredLocator = 'giao an manus tao/_qa/ban_toan_rebuild/banToanContent.ts';
const docDir = 'giao an manus tao/TDS/Khoi 11/Tuan 06';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function extractStructuredLessons(text) {
  if (typeof text !== 'string' || text.length > 5 * 1024 * 1024) throw new Error('Rejected source size');
  const tree = ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true);
  if (tree.parseDiagnostics.length) throw new Error('Rejected invalid TypeScript source');
  function value(n, depth = 0) {
    if (depth > 40) throw new Error('Rejected AST depth');
    const child = n => value(n, depth + 1);
    if (ts.isStringLiteral(n)) return n.text;
    // ponytail: trusted local templates retain raw LaTeX; no general TS execution.
    if (ts.isNoSubstitutionTemplateLiteral(n)) return n.rawText ?? n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(child);
    if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.map(p => {
      if (!ts.isPropertyAssignment(p) || (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) || ['__proto__', 'prototype', 'constructor'].includes(p.name.text)) throw new Error('Rejected property');
      return [p.name.text, child(p.initializer)];
    }));
    if (ts.isTemplateExpression(n)) return (n.head.rawText ?? n.head.text) + n.templateSpans.map(s => child(s.expression) + (s.literal.rawText ?? s.literal.text)).join('');
    if (ts.isTaggedTemplateExpression(n) && n.tag.getText(tree) === 'String.raw' && ts.isNoSubstitutionTemplateLiteral(n.template)) return child(n.template);
    if (ts.isCallExpression(n)) {
      const name = n.expression.getText(tree);
      if (!['m', 'e', 'x'].includes(name)) throw new Error('Unsupported call');
      const a = n.arguments.map(child);
      if (name === 'm' && a.length === 1 && typeof a[0] === 'string') return `$${a[0]}$`;
      if (name === 'e' && a.length === 2 && a.every(v => typeof v === 'string')) return { question: a[0], solution: a[1], sourceRef: 'GV tự thiết kế' };
      if (name === 'x' && a.length === 3 && a.every(v => typeof v === 'string') && ['NB', 'TH', 'VD'].includes(a[0])) return { level: a[0], question: a[1], answer: a[2], sourceRef: 'GV tự thiết kế' };
    }
    throw new Error(`Unsupported AST ${ts.SyntaxKind[n.kind]}`);
  }
  const lessons = [];
  function visit(n) {
    if (ts.isCallExpression(n) && n.expression.getText(tree) === 'd' && n.arguments[0]?.getText(tree) === '11' && n.arguments[1]?.getText(tree) === '6') {
      const a = n.arguments.map(v => value(v));
      if (a.length < 10 || a.length > 11 || !Number.isInteger(a[2]) || a[2] < 34 || a[2] > 41 || typeof a[3] !== 'string' || typeof a[4] !== 'string' || a.slice(5, 10).some(v => !Array.isArray(v))) throw new Error('Rejected lesson shape');
      lessons.push({ period: a[2], title: a[3], focus: a[4], formulas: a[5], examples: a[6], exercises: a[7], quick: a[8], mistakes: a[9], line: tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1 });
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  if (new Set(lessons.map(l => l.period)).size !== lessons.length) throw new Error('Rejected duplicate period');
  return lessons;
}

function docObjectives(bytes, period) {
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Rejected DOCX size');
  const zip = unzipSync(bytes, { filter: f => f.name === 'word/document.xml' && f.originalSize <= 20 * 1024 * 1024 });
  if (!zip['word/document.xml']) throw new Error('Rejected missing/oversize document XML');
  const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, v) => String.fromCodePoint(+v));
  const xml = strFromU8(zip['word/document.xml']);
  const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map(m => [...m[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(t => decode(t[1])).join(''));
  const start = paragraphs.indexOf('2. Mục tiêu học tập'), end = paragraphs.indexOf('Phân hóa mục tiêu:', start);
  if (start < 0 || end <= start) throw new Error('Rejected missing objective section');
  const section = paragraphs.slice(start, end);
  const yearIndex = paragraphs.indexOf('Năm học');
  if (paragraphs[yearIndex + 1] !== '2026 - 2027') throw new Error('Rejected unexpected source year');
  return {
    guidingQuestion: section.find(p => p.startsWith('Câu hỏi định hướng'))?.replace(/^Câu hỏi định hướng của bài — /, ''),
    objectives: ['Must', 'Should', 'Could'].map(priority => {
      const i = section.findIndex(p => p.startsWith(`${priority} (`));
      if (i < 0 || !section[i + 1]?.startsWith('Tôi có thể')) throw new Error('Rejected missing objective');
      return { id: `sp-g11-w6-p${period}-${priority.toLowerCase()}`, level: priority.toLowerCase(), statement: section[i + 1], provenance: { sourceId: `sp-docx-p${period}`, locator: `word/document.xml / I.2 / ${priority}`, verification: 'teacher_review_required' } };
    })
  };
}

export async function importMathBank(root) {
  const source = await readFile(join(root, structuredLocator)), files = await readdir(join(root, docDir));
  const structured = extractStructuredLessons(source.toString('utf8'));
  if (structured.length !== 8 || structured.some((l, i) => l.period !== 34 + i)) throw new Error('Rejected missing Week6 lessons');
  const lessons = [];
  for (const { line, ...data } of structured) {
    const { period } = data, matches = files.filter(f => f.startsWith(`g11_w6_p${period}_`) && f.endsWith('.docx'));
    if (matches.length !== 1) throw new Error('Rejected ambiguous DOCX period');
    const name = matches[0], doc = await readFile(join(root, docDir, name));
    lessons.push({ id: `sp-g11-w6-p${period}`, grade: 11, week: 6, ...data, status: 'draft', kind: [35, 36, 37, 40, 41].includes(period) ? 'practice' : 'formation', selfChoice: [40, 41].includes(period), ...docObjectives(doc, period), sourceRefs: [
      { id: 'sp-structured', kind: 'external', locator: `${structuredLocator}:${line} / d(11,6,${period})`, hash: sha(source), label: 'SmartPlan Ban Toán — dữ liệu cấu trúc', verification: 'teacher_review_required' },
      { id: `sp-docx-p${period}`, kind: 'external', locator: `${docDir}/${name}`, hash: sha(doc), label: `Giáo án Ban Toán 11 — tuần 6, tiết ${period}`, verification: 'teacher_review_required' }
    ], sourceYear: '2026-2027', importNotes: ['LaTeX lấy từ structuredTS; không nối phẳng OMML để lấy phân số.', 'NB/TH/VD là mức câu hỏi gốc, không tự ánh xạ Must/Should/Could.'] });
  }
  const bank = { schemaVersion: '1.0.0', id: 'smartplan-math-week6', status: 'draft', subject: 'math', grade: 11, week: 6, sourceYear: '2026-2027', curriculumAuthority: 'teacher_review_required', reviewRequirements: ['GV đối soát lời giải và độ phù hợp mục tiêu trước dùng.', 'PPCT2026-2027 có objectives trống; không tự gán mã T11.xx.', 'Unitplan có nhãn2025-2026 khác PPCT và DOCX2026-2027; chưa dùng làm nguồn chính thức.', 'Các đáp án dạng gợi ý/chưa hoàn chỉnh giữ nguyên để GV hoàn thiện; không tự chấm máy.'], lessons };
  return { ...bank, contentHash: hashPackage(bank) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/content/import-smartplan-math.mjs <SmartPlan-root> [bank-output]');
  const bank = await importMathBank(resolve(process.argv[2]));
  await writeFile(resolve(process.argv[3] || 'content/smartplan-math-week6.json'), JSON.stringify(bank, null, 2) + '\n');
  console.log(JSON.stringify({ lessons: bank.lessons.length, questions: bank.lessons.reduce((n, l) => n + l.examples.length + l.exercises.length + l.quick.length, 0), contentHash: bank.contentHash, status: bank.status }));
}
