// Chrome 9222: chạy hàm production trên đúng JPEG nén được tải lên.
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/utils/imageCompress.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const page = await browser.newPage();
try {
  const result = await page.evaluate(async (data, source) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + data;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1152; canvas.height = 1536;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const exports = {}; new Function('exports', source)(exports);
    const answers = exports.detectAnswers(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const fileAnswers = await exports.detectAnswersFromFiles([new File([blob], 'paper.jpg', { type: 'image/jpeg' })]);
    return { answers, filePathMatches: JSON.stringify(answers) === JSON.stringify(fileAnswers) };
  }, fs.readFileSync('tasks/omr-sample/bai-tuan-nam.jpg').toString('base64'), source);
  console.log(JSON.stringify(result, null, 2));
  const expected = { 1: 'A', 2: 'C', 3: 'B', 4: 'A', 5: 'B', 11: 'B', 12: 'C' };
  const matched = result.answers.filter(a => a.confidence >= .8 && expected[a.questionNo] === a.answer).length;
  if (matched < 6 || !result.filePathMatches || result.answers.length !== 40) throw new Error('OMR sample check failed');
} finally { await page.close(); await browser.disconnect(); }
