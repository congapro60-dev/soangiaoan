import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { buildProductionCanaryWorker } from '../scripts/qa/canary-bundle.mjs';
import {
  createPdfTextFixture,
  createPdfImageOnlyFixture,
  createPdfMalformedFixture,
  createPdfEncryptedFixture
} from '../tasks/canary/synthetic-fixtures.mjs';
import { validateCanaryReport } from './helpers/parser-canary.mjs';
import {
  DOCX_MAX_BYTES,
  DOCX_MAX_ENTRIES,
  DOCX_MAX_DECOMPRESSED_BYTES,
  DOCX_MAX_ENTRY_BYTES,
  DOCX_MAX_RATIO
} from '../lib/lesson/import/docx.js';
import {
  PDF_MAX_BYTES,
  PDF_MAX_PAGES,
  PDF_MAX_TOTAL_TEXT_BYTES,
  PDF_MAX_PAGE_TEXT_BYTES
} from '../lib/lesson/import/pdf.js';

const require = createRequire(import.meta.url);
const miniflarePkgPath = require.resolve('miniflare', { paths: [require.resolve('wrangler')] });
const { Miniflare } = await import(pathToFileURL(miniflarePkgPath).href);

/**
 * Creates a fully valid in-memory canary report fixture for self-contained unit testing.
 * Does not depend on stale disk artifacts or prior test runs.
 *
 * @param {string} [timestamp]
 * @returns {Record<string, any>}
 */
function createSampleValidReport(timestamp = new Date().toISOString()) {
  const docxEqHash = 'a'.repeat(64);
  const docxUnsupHash = 'b'.repeat(64);
  const pdfTextHash = 'c'.repeat(64);

  return {
    timestamp,
    engine: 'workerd',
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    versions: {
      node: 'v25.8.2',
      platform: 'win32',
      arch: 'x64',
      miniflare: '4.20260515.0',
      wrangler: '4.92.0',
      esbuild: '0.27.3',
      pdfjsDist: '4.10.38',
      fflate: '0.8.3',
      katex: '0.18.9'
    },
    limits: {
      docx: {
        maxBytes: DOCX_MAX_BYTES,
        maxDecompressedBytes: DOCX_MAX_DECOMPRESSED_BYTES,
        maxEntryBytes: DOCX_MAX_ENTRY_BYTES,
        maxEntries: DOCX_MAX_ENTRIES,
        maxRatio: DOCX_MAX_RATIO
      },
      pdf: {
        maxBytes: PDF_MAX_BYTES,
        maxPages: PDF_MAX_PAGES,
        maxTotalTextBytes: PDF_MAX_TOTAL_TEXT_BYTES,
        maxPageTextBytes: PDF_MAX_PAGE_TEXT_BYTES
      }
    },
    productionCanary: {
      runtimeInfo: {
        runtime: 'workerd',
        userAgent: 'Cloudflare-Workers',
        isPdfjsAvailable: true,
        hasWorkerMessageHandler: true
      },
      docxEquation: {
        ok: true,
        segmentsCount: 6,
        mathSegmentsCount: 2,
        sha256: docxEqHash
      },
      docxUnsupported: {
        ok: true,
        segmentsCount: 3,
        uncertainties: [
          { kind: 'unsupported_drawing' },
          { kind: 'unsupported_object' },
          { kind: 'unsupported_word_content' },
          { kind: 'unsupported_word_content' }
        ],
        sha256: docxUnsupHash
      },
      docxSerializationRoundtripCheck: {
        allSegmentsHadXmlLocationBefore: true,
        allSegmentsLostXmlLocationAfterRoundtrip: true,
        enumerableCheck: true
      },
      docxRepeatRunStability: {
        ok: true,
        iterations: 5,
        totalDurationMs: 30,
        runs: [
          { iteration: 1, hash: docxEqHash },
          { iteration: 2, hash: docxEqHash },
          { iteration: 3, hash: docxEqHash },
          { iteration: 4, hash: docxEqHash },
          { iteration: 5, hash: docxEqHash }
        ]
      },
      pdfProductionResult: {
        ok: true,
        status: 'needs_review',
        segmentsCount: 4,
        sha256: pdfTextHash,
        errors: [],
        workerHandlerObserved: true
      }
    },
    staticWorkerMessageHandlerExperiment: {
      pdfText: {
        ok: true,
        segmentsCount: 4,
        sha256: pdfTextHash,
        pdfLocationSerializationLoss: true
      },
      pdfImageOnly: {
        ok: true,
        segmentsCount: 0,
        ocrRequiredEmitted: true,
        uncertainties: [
          { kind: 'ocr_required', page: 1, message: 'OCR required' }
        ]
      },
      pdfMixed: {
        ok: true,
        segmentsCount: 2,
        extractedPages: [1, 3],
        ocrRequiredPages: [2]
      },
      pdfMalformed: {
        ok: false,
        status: 'error',
        errors: [{ code: 'CORRUPTED_PDF' }]
      },
      pdfEncrypted: {
        ok: false,
        status: 'error',
        errors: [{ code: 'ENCRYPTED_PDF' }]
      },
      pdfRepeatRunStability: {
        ok: true,
        iterations: 5,
        totalDurationMs: 35,
        runs: [
          { iteration: 1, hash: pdfTextHash },
          { iteration: 2, hash: pdfTextHash },
          { iteration: 3, hash: pdfTextHash },
          { iteration: 4, hash: pdfTextHash },
          { iteration: 5, hash: pdfTextHash }
        ]
      }
    },
    summary: {
      status: 'complete',
      docxStatus: 'operational',
      docxAssertions: {
        equationExtraction: true,
        unsupportedObjectHandling: true,
        xmlLocationNonenumerableLoss: true,
        repeatRunStability: true
      },
      pdfProductionStatus: 'operational_static_worker',
      pdfProductionAssertions: {
        statusAccepted: true,
        errorsEmpty: true,
        segmentsExtracted: true,
        sha256Valid: true,
        workerHandlerObserved: true
      },
      pdfExperimentStatus: 'operational_with_static_bundle',
      pdfExperimentAssertions: {
        textExtraction: true,
        scannedOcrUncertainty: true,
        mixedPagesExtractionAndOcr: true,
        malformedCorruptedHandled: true,
        encryptedHandled: true,
        repeatRunStability: true
      },
      runtimeAssertions: {
        userAgentObserved: true,
        engineMatchesWorkerd: true,
        limitsMatchParser: true
      },
      xmlLocationNonenumerableLossConfirmed: true,
      ocrUncertaintyEmittedOnScannedPdf: true
    }
  };
}

test('harness regression: self-contained valid report passes validation', () => {
  const report = createSampleValidReport();
  const res = validateCanaryReport(report);
  assert.equal(res.ok, true);
  assert.equal(res.error, undefined);
});

test('production canary uses the static worker handler in real workerd', async () => {
  const bundle = await buildProductionCanaryWorker();
  const miniflare = new Miniflare({
    modules: [{ type: 'ESModule', path: 'worker.js', contents: bundle.code }],
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat']
  });

  try {
    const runtime = await (await miniflare.dispatchFetch('http://localhost/runtime-info')).json();
    assert.equal(runtime.isPdfjsAvailable, true);
    assert.equal(runtime.hasWorkerMessageHandler, true);

    const textBytes = createPdfTextFixture();
    const expectedHash = (await import('node:crypto')).createHash('sha256').update(textBytes).digest('hex');
    const text = await (await miniflare.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST', body: textBytes
    })).json();
    assert.equal(text.ok, true);
    assert.equal(text.extraction.sha256, expectedHash);
    assert.ok(text.extraction.segments.length > 0);

    const imageOnly = await (await miniflare.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST', body: createPdfImageOnlyFixture()
    })).json();
    assert.equal(imageOnly.ok, true);
    assert.ok(imageOnly.extraction.uncertainties.some(item => item.kind === 'ocr_required'));

    for (const [fixture, code] of [[createPdfMalformedFixture(), 'CORRUPTED_PDF'], [createPdfEncryptedFixture(), 'ENCRYPTED_PDF']]) {
      const result = await (await miniflare.dispatchFetch('http://localhost/parse-pdf', { method: 'POST', body: fixture })).json();
      assert.equal(result.ok, false);
      assert.equal(result.extraction.errors[0].code, code);
    }
  } finally {
    await miniflare.dispose();
  }
});

test('harness regression: validateCanaryReport rejects missing or non-object reports', () => {
  assert.equal(validateCanaryReport(null).ok, false);
  assert.equal(validateCanaryReport(undefined).ok, false);
  assert.equal(validateCanaryReport({}).ok, false);
  assert.ok(validateCanaryReport(null).error.includes('missing'));
});

test('harness regression: validateCanaryReport rejects invalid timestamp string (not-a-date)', () => {
  const report = createSampleValidReport();
  report.timestamp = 'not-a-date';
  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('not a valid date'));
});

test('harness regression: validateCanaryReport rejects stale report older than execution start', () => {
  const startTime = Date.now();
  const staleTimestamp = new Date(startTime - 5000).toISOString();
  const report = createSampleValidReport(staleTimestamp);
  const res = validateCanaryReport(report, startTime);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('stale'));
});

test('harness regression: coordinator repro - contradictory docx/pdf failure with invalid date must fail', () => {
  const report = createSampleValidReport();
  report.productionCanary.docxEquation.ok = false;
  report.staticWorkerMessageHandlerExperiment.pdfText.ok = false;
  report.timestamp = 'not-a-date';

  const res = validateCanaryReport(report, Date.now());
  assert.equal(res.ok, false);
});

test('harness regression: contradictory payload - docxEquation.ok false with summary complete is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.docxEquation.ok = false;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('docxEquation.ok is not true'));
});

test('harness regression: contradictory payload - experimental pdfText.ok false with summary complete is rejected', () => {
  const report = createSampleValidReport();
  report.staticWorkerMessageHandlerExperiment.pdfText.ok = false;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('pdfText.ok is not true'));
});

test('harness regression: contradictory payload - production PDF fake failure (ok:false) is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.pdfProductionResult.ok = false;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('ok is not true'));
});

test('harness regression: contradictory payload - production PDF invalid status is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.pdfProductionResult.status = 'error';

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('invalid status'));
});

test('harness regression: contradictory payload - production PDF non-empty errors is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.pdfProductionResult.errors = [
    { code: 'PDF_PARSE_ERROR', message: 'Fake error' }
  ];

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('must have empty errors'));
});

test('harness regression: contradictory payload - production PDF bad segmentsCount is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.pdfProductionResult.segmentsCount = 0;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('invalid segmentsCount'));
});

test('harness regression: contradictory payload - production PDF bad sha256 is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.pdfProductionResult.sha256 = 'not-a-hash';

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('invalid sha256'));
});

test('harness regression: contradictory payload - missing workerHandler is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.runtimeInfo.hasWorkerMessageHandler = false;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('hasWorkerMessageHandler is not true'));
});

test('harness regression: contradictory summary - stale pdfProductionStatus is rejected', () => {
  const report = createSampleValidReport();
  report.summary.pdfProductionStatus = 'failed_fake_worker_resolution';

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('expected "operational_static_worker"'));
});

test('harness regression: contradictory summary - failed pdfProductionAssertions is rejected', () => {
  const report = createSampleValidReport();
  report.summary.pdfProductionAssertions.statusAccepted = false;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('summary.pdfProductionAssertions are false'));
});

test('harness regression: contradictory payload - docx xmlLocation roundtrip retention is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.docxSerializationRoundtripCheck.allSegmentsLostXmlLocationAfterRoundtrip = false;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('allSegmentsLostXmlLocationAfterRoundtrip is not true'));
});

test('harness regression: contradictory payload - docx repeat run hash divergence is rejected', () => {
  const report = createSampleValidReport();
  report.productionCanary.docxRepeatRunStability.runs[2].hash = 'x'.repeat(64);

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('output hashes are inconsistent'));
});

test('harness regression: contradictory payload - scanned image-only PDF without OCR uncertainty is rejected', () => {
  const report = createSampleValidReport();
  report.staticWorkerMessageHandlerExperiment.pdfImageOnly.ocrRequiredEmitted = false;
  report.staticWorkerMessageHandlerExperiment.pdfImageOnly.uncertainties = [];

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('ocrRequiredEmitted is not true'));
});

test('harness regression: contradictory payload - mixed PDF missing required page extractions is rejected', () => {
  const report = createSampleValidReport();
  report.staticWorkerMessageHandlerExperiment.pdfMixed.extractedPages = [1]; // missing page 3

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('extractedPages must include 1 and 3'));
});

test('harness regression: contradictory payload - missing or invalid workerd userAgent is rejected', () => {
  const reportNoUserAgent = createSampleValidReport();
  delete reportNoUserAgent.productionCanary.runtimeInfo.userAgent;
  assert.equal(validateCanaryReport(reportNoUserAgent).ok, false);

  const reportBrowser = createSampleValidReport();
  reportBrowser.productionCanary.runtimeInfo.userAgent = 'Mozilla/5.0 Chrome/120.0';
  const res = validateCanaryReport(reportBrowser);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('Invalid or missing workerd userAgent'));
});

test('harness regression: contradictory payload - wrong DOCX bounds (15/60/2048) are rejected', () => {
  const report = createSampleValidReport();
  report.limits.docx.maxBytes = 15 * 1024 * 1024;
  report.limits.docx.maxDecompressedBytes = 60 * 1024 * 1024;
  report.limits.docx.maxEntries = 2048;

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('limits do not match'));
});

test('harness regression: contradictory summary - summary status failed is rejected even if evidence is ok', () => {
  const report = createSampleValidReport();
  report.summary.status = 'failed';

  const res = validateCanaryReport(report);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('summary status is "failed"'));
});
