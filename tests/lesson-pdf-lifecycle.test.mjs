import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import * as crypto from 'node:crypto';
import katex from 'katex';

// Run: node --experimental-vm-modules --test tests/lesson-pdf-lifecycle.test.mjs
const source = await readFile(new URL('../lib/lesson/import/pdf.js', import.meta.url), 'utf8');
const bytes = new TextEncoder().encode('%PDF-1.4\nfixture');

async function parser({ pages = ['Toán ∑'], loadError, cleanupError } = {}) {
  let destroyed = 0;
  const context = createContext({ TextEncoder, Uint8Array, ArrayBuffer, Buffer });
  const pdfjs = {
    getDocument() {
      return {
        promise: loadError ? Promise.reject(loadError) : Promise.resolve({
          numPages: pages.length,
          async getPage(number) {
            const page = pages[number - 1];
            if (page instanceof Error) throw page;
            return {
              async getTextContent() {
                if (page?.textError) throw page.textError;
                return { items: page ? [{ str: page, transform: [10, 0, 0, 10, 10, 700], width: 100, height: 10 }] : [] };
              }
            };
          }
        }),
        async destroy() {
          destroyed++;
          if (cleanupError) throw cleanupError;
        }
      };
    }
  };
  const dependencies = {
    'node:crypto': crypto,
    katex: { default: katex },
    'pdfjs-dist/legacy/build/pdf.mjs': pdfjs,
    'pdfjs-dist/legacy/build/pdf.worker.mjs': { WorkerMessageHandler: {} }
  };
  const parserModule = new SourceTextModule(source, { context });
  await parserModule.link(specifier => {
    const exports = dependencies[specifier];
    assert.ok(exports, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await parserModule.evaluate();
  return { parse: options => parserModule.namespace.importPdf({ bytes, originalName: 'fixture.pdf' }, options), destroyed: () => destroyed };
}

test('PDF transport is destroyed once after success, load failure and page-limit return', async () => {
  for (const [settings, options, code] of [
    [{}, {}, null],
    [{ loadError: Object.assign(new Error('Invalid PDF'), { name: 'InvalidPDFException' }) }, {}, 'CORRUPTED_PDF'],
    [{ pages: ['a', 'b'] }, { maxPages: 1 }, 'MAX_PAGES_EXCEEDED']
  ]) {
    const p = await parser(settings);
    const result = await p.parse(options);
    assert.equal(code ? result.errors[0].code : result.ok, code || true);
    assert.equal(p.destroyed(), 1);
  }
});

test('PDF limits measure Vietnamese and math symbols as UTF-8 bytes', async () => {
  for (const [options, code] of [
    [{ maxPageTextBytes: 8 }, 'MAX_PAGE_TEXT_EXCEEDED'],
    [{ maxTotalTextBytes: 16 }, 'MAX_TOTAL_TEXT_EXCEEDED']
  ]) {
    const p = await parser({ pages: ['Toán ∑', 'Toán ∑'] });
    const result = await p.parse(options);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, code);
    assert.equal(p.destroyed(), 1);
  }
});

test('PDF partial page failures preserve safe uncertainty and readable pages', async () => {
  const p = await parser({ pages: [new Error('private parser detail'), 'Readable', { textError: new Error('private text detail') }] });
  const result = await p.parse();
  assert.equal(result.ok, true);
  assert.equal(result.text, 'Readable');
  assert.deepEqual(Array.from(result.uncertainties, row => row.page), [1, 3]);
  assert.ok(result.uncertainties.every(row => row.kind === 'page_read_error' && row.pdfLocation.pageNumber === row.page));
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(p.destroyed(), 1);
});

test('PDF all-page failures fail closed while scanned pages still require OCR', async () => {
  const bad = await parser({ pages: [new Error('bad page'), { textError: new Error('bad text') }] });
  const result = await bad.parse();
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'PDF_PAGE_READ_ERROR');
  assert.equal(bad.destroyed(), 1);
  const scan = await parser({ pages: [''] });
  const scanned = await scan.parse();
  assert.equal(scanned.ok, true);
  assert.equal(scanned.uncertainties[0].kind, 'ocr_required');
  assert.equal(scan.destroyed(), 1);
});

test('PDF cleanup failure cannot replace extraction or its primary error', async () => {
  for (const loadError of [undefined, Object.assign(new Error('Password'), { name: 'PasswordException' })]) {
    const p = await parser({ loadError, cleanupError: new Error('destroy failed') });
    const result = await p.parse();
    assert.equal(loadError ? result.errors[0].code : result.ok, loadError ? 'ENCRYPTED_PDF' : true);
    assert.equal(p.destroyed(), 1);
  }
});
