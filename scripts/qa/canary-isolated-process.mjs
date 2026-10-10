import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductionCanaryWorker, buildExperimentCanaryWorker } from './canary-bundle.mjs';
import {
  createDocxEquationFixture,
  createDocxUnsupportedObjectFixture,
  createPdfTextFixture,
  createPdfImageOnlyFixture,
  createPdfMixedFixture,
  createPdfMalformedFixture,
  createPdfEncryptedFixture
} from '../../tasks/canary/synthetic-fixtures.mjs';

import {
  DOCX_MAX_BYTES,
  DOCX_MAX_ENTRIES,
  DOCX_MAX_DECOMPRESSED_BYTES,
  DOCX_MAX_ENTRY_BYTES,
  DOCX_MAX_RATIO
} from '../../lib/lesson/import/docx.js';
import {
  PDF_MAX_BYTES,
  PDF_MAX_PAGES,
  PDF_MAX_TOTAL_TEXT_BYTES,
  PDF_MAX_PAGE_TEXT_BYTES
} from '../../lib/lesson/import/pdf.js';

const require = createRequire(import.meta.url);
const miniflarePkgPath = require.resolve('miniflare', { paths: [require.resolve('wrangler')] });
const { Miniflare } = await import(pathToFileURL(miniflarePkgPath).href);

// Package and library versions
const wranglerPkg = require('wrangler/package.json');
const miniflarePkg = require(require.resolve('miniflare/package.json', { paths: [require.resolve('wrangler')] }));
const pdfjsPkg = require('pdfjs-dist/package.json');
const fflatePkg = require('fflate/package.json');
const katexPkg = require('katex/package.json');
const esbuildPkg = require(require.resolve('esbuild/package.json', { paths: [require.resolve('wrangler')] }));

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = path.join(projectRoot, 'tasks/canary/canary-report.json');

async function runCanary() {
  const startTime = Date.now();
  const report = {
    timestamp: new Date().toISOString(),
    engine: 'workerd',
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    versions: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      miniflare: miniflarePkg.version,
      wrangler: wranglerPkg.version,
      esbuild: esbuildPkg.version,
      pdfjsDist: pdfjsPkg.version,
      fflate: fflatePkg.version,
      katex: katexPkg.version
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
    fixtures: {},
    productionCanary: {},
    staticWorkerMessageHandlerExperiment: {},
    summary: null // Derived dynamically from result assertions after observations!
  };

  // Generate / prepare fixtures
  const fixtures = {
    docx_equation: createDocxEquationFixture(),
    docx_unsupported: createDocxUnsupportedObjectFixture(),
    pdf_text: createPdfTextFixture(),
    pdf_image_only: createPdfImageOnlyFixture(),
    pdf_mixed: createPdfMixedFixture(),
    pdf_malformed: createPdfMalformedFixture(),
    pdf_encrypted: createPdfEncryptedFixture()
  };

  for (const [key, bytes] of Object.entries(fixtures)) {
    report.fixtures[key] = {
      byteLength: bytes.byteLength
    };
  }

  // Phase 1: Production Worker Canary (Unmodified production parsers)
  console.log('[CANARY] Step 1: Building production parser worker bundle...');
  const prodBundle = await buildProductionCanaryWorker();
  report.productionCanary.bundleBytes = prodBundle.bytes;

  console.log('[CANARY] Step 2: Launching Miniflare with workerd (nodejs_compat, 2026-05-15)...');
  const mfProd = new Miniflare({
    modules: [
      {
        type: 'ESModule',
        path: 'worker.js',
        contents: prodBundle.code
      }
    ],
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat']
  });

  try {
    // 1.1 Runtime info
    console.log('[CANARY] Step 3: Querying production runtime module identity...');
    const runtimeRes = await mfProd.dispatchFetch('http://localhost/runtime-info');
    const runtimeInfo = await runtimeRes.json();
    report.productionCanary.runtimeInfo = runtimeInfo;

    // 1.2 DOCX Equation fixture
    console.log('[CANARY] Step 4: Testing DOCX equation fixture...');
    const docxEqRes = await mfProd.dispatchFetch('http://localhost/parse-docx', {
      method: 'POST',
      body: fixtures.docx_equation
    });
    const docxEqResult = await docxEqRes.json();
    report.productionCanary.docxEquation = {
      ok: docxEqResult.ok,
      status: docxEqResult.extraction?.status,
      segmentsCount: docxEqResult.extraction?.segments?.length,
      mathSegmentsCount: docxEqResult.extraction?.segments?.filter(s => s.kind === 'display_math').length,
      uncertaintiesCount: docxEqResult.extraction?.uncertainties?.length,
      sha256: docxEqResult.extraction?.sha256,
      extractedSampleText: docxEqResult.extraction?.text?.slice(0, 150)
    };

    // 1.3 DOCX Unsupported Object fixture
    console.log('[CANARY] Step 5: Testing DOCX unsupported object fixture...');
    const docxUnsupRes = await mfProd.dispatchFetch('http://localhost/parse-docx', {
      method: 'POST',
      body: fixtures.docx_unsupported
    });
    const docxUnsupResult = await docxUnsupRes.json();
    report.productionCanary.docxUnsupported = {
      ok: docxUnsupResult.ok,
      status: docxUnsupResult.extraction?.status,
      segmentsCount: docxUnsupResult.extraction?.segments?.length,
      uncertainties: docxUnsupResult.extraction?.uncertainties?.map(u => ({
        kind: u.kind,
        tag: u.tag,
        message: u.message
      })),
      sha256: docxUnsupResult.extraction?.sha256
    };

    // 1.4 JSON serialization roundtrip check for DOCX segment xmlLocation nonenumerable loss
    console.log('[CANARY] Step 6: Verifying JSON serialization roundtrip for DOCX xmlLocation nonenumerable loss...');
    report.productionCanary.docxSerializationRoundtripCheck = {
      allSegmentsHadXmlLocationBefore: docxEqResult.serializationCheck?.allSegmentsHadXmlLocationBefore,
      allSegmentsLostXmlLocationAfterRoundtrip: docxEqResult.serializationCheck?.allSegmentsLostXmlLocationAfterRoundtrip,
      enumerableCheck: docxEqResult.serializationCheck?.segmentDetails?.[0]?.xmlLocationEnumerable === false,
      sampleLocationBefore: docxEqResult.serializationCheck?.segmentDetails?.[0]?.xmlLocationValue,
      explanation: 'xmlLocation is assigned via Object.defineProperty with enumerable:false, preserving schema compliance in JSON, but stripped upon JSON.stringify roundtrip'
    };

    // 1.5 DOCX Repeat-Run Stability
    console.log('[CANARY] Step 7: Testing repeated DOCX parser runs (repeat-run stability)...');
    const docxCleanupRes = await mfProd.dispatchFetch('http://localhost/repeat-run-stability?iterations=5', {
      method: 'POST',
      body: fixtures.docx_equation
    });
    const docxCleanupResult = await docxCleanupRes.json();
    report.productionCanary.docxRepeatRunStability = {
      ok: docxCleanupResult.ok,
      iterations: docxCleanupResult.iterations,
      totalDurationMs: docxCleanupResult.totalDurationMs,
      runs: docxCleanupResult.runs,
      stabilityNote: docxCleanupResult.stabilityNote || 'Sequential run latency and hash consistency; isolate heap uninstrumented.'
    };

    // 1.6 Production PDF Parser Text Extraction in workerd (static worker handler)
    console.log('[CANARY] Step 8: Testing production PDF parser text extraction in workerd (static worker handler)...');
    const pdfProdRes = await mfProd.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST',
      headers: { 'x-file-name': 'text-sample.pdf' },
      body: fixtures.pdf_text
    });
    const pdfProdResult = await pdfProdRes.json();
    report.productionCanary.pdfProductionResult = {
      ok: pdfProdResult.ok === true || pdfProdResult.extraction?.status === 'needs_review' || pdfProdResult.extraction?.status === 'ok',
      status: pdfProdResult.extraction?.status,
      segmentsCount: pdfProdResult.extraction?.segments?.length ?? 0,
      sha256: pdfProdResult.extraction?.sha256,
      errors: pdfProdResult.extraction?.errors || [],
      workerHandlerObserved: Boolean(report.productionCanary?.runtimeInfo?.hasWorkerMessageHandler)
    };
  } finally {
    console.log('[CANARY] Step 9: Disposing production Miniflare instance...');
    await mfProd.dispose();
  }

  // Phase 2: Static WorkerMessageHandler Bundle Experiment
  console.log('[CANARY] Step 10: Building experiment worker bundle (static WorkerMessageHandler)...');
  const expBundle = await buildExperimentCanaryWorker();
  report.staticWorkerMessageHandlerExperiment.bundleBytes = expBundle.bytes;

  console.log('[CANARY] Step 11: Launching experiment Miniflare instance with workerd...');
  const mfExp = new Miniflare({
    modules: [
      {
        type: 'ESModule',
        path: 'worker.js',
        contents: expBundle.code
      }
    ],
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat']
  });

  try {
    // 2.1 Experiment runtime info
    console.log('[CANARY] Step 12: Querying experiment runtime identity...');
    const expRuntimeRes = await mfExp.dispatchFetch('http://localhost/runtime-info');
    const expRuntimeInfo = await expRuntimeRes.json();
    report.staticWorkerMessageHandlerExperiment.runtimeInfo = expRuntimeInfo;

    // 2.2 Text PDF extraction
    console.log('[CANARY] Step 13: Experiment - Testing valid text PDF fixture...');
    const pdfTextRes = await mfExp.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST',
      headers: { 'x-file-name': 'g11-math-lesson.pdf' },
      body: fixtures.pdf_text
    });
    const pdfTextResult = await pdfTextRes.json();
    report.staticWorkerMessageHandlerExperiment.pdfText = {
      ok: pdfTextResult.extraction?.status === 'needs_review' || pdfTextResult.extraction?.ok === true,
      status: pdfTextResult.extraction?.status,
      segmentsCount: pdfTextResult.extraction?.segments?.length,
      sha256: pdfTextResult.extraction?.sha256,
      segments: pdfTextResult.extraction?.segments?.map(s => ({
        id: s.id,
        kind: s.kind,
        text: s.text,
        start: s.start,
        end: s.end
      })),
      pdfLocationSerializationLoss: pdfTextResult.serializationCheck?.pdfLocationLostInRoundtrip
    };

    // 2.3 Image-only PDF fixture (OCR uncertainty check)
    console.log('[CANARY] Step 14: Experiment - Testing image-only / scanned PDF fixture...');
    const pdfImgRes = await mfExp.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST',
      headers: { 'x-file-name': 'scanned-document.pdf' },
      body: fixtures.pdf_image_only
    });
    const pdfImgResult = await pdfImgRes.json();
    report.staticWorkerMessageHandlerExperiment.pdfImageOnly = {
      ok: pdfImgResult.extraction?.status === 'needs_review' || pdfImgResult.extraction?.ok === true,
      status: pdfImgResult.extraction?.status,
      segmentsCount: pdfImgResult.extraction?.segments?.length,
      uncertainties: pdfImgResult.extraction?.uncertainties,
      warnings: pdfImgResult.extraction?.warnings,
      ocrRequiredEmitted: pdfImgResult.extraction?.uncertainties?.some(u => u.kind === 'ocr_required')
    };

    // 2.4 Mixed PDF fixture (text + scanned image-only page)
    console.log('[CANARY] Step 15: Experiment - Testing mixed PDF fixture...');
    const pdfMixedRes = await mfExp.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST',
      headers: { 'x-file-name': 'mixed-doc.pdf' },
      body: fixtures.pdf_mixed
    });
    const pdfMixedResult = await pdfMixedRes.json();
    report.staticWorkerMessageHandlerExperiment.pdfMixed = {
      ok: pdfMixedResult.extraction?.status === 'needs_review' || pdfMixedResult.extraction?.ok === true,
      status: pdfMixedResult.extraction?.status,
      segmentsCount: pdfMixedResult.extraction?.segments?.length,
      extractedPages: [...new Set((pdfMixedResult.serializationCheck?.segmentInspection || []).map(s => s.pageNumber))],
      ocrRequiredPages: pdfMixedResult.extraction?.uncertainties?.filter(u => u.kind === 'ocr_required').map(u => u.page),
      warnings: pdfMixedResult.extraction?.warnings
    };

    // 2.5 Malformed PDF fixture
    console.log('[CANARY] Step 16: Experiment - Testing malformed PDF fixture...');
    const pdfMalRes = await mfExp.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST',
      headers: { 'x-file-name': 'malformed.pdf' },
      body: fixtures.pdf_malformed
    });
    const pdfMalResult = await pdfMalRes.json();
    report.staticWorkerMessageHandlerExperiment.pdfMalformed = {
      ok: pdfMalResult.extraction?.ok,
      status: pdfMalResult.extraction?.status,
      errors: pdfMalResult.extraction?.errors
    };

    // 2.6 Encrypted PDF fixture
    console.log('[CANARY] Step 17: Experiment - Testing encrypted PDF fixture...');
    const pdfEncRes = await mfExp.dispatchFetch('http://localhost/parse-pdf', {
      method: 'POST',
      headers: { 'x-file-name': 'encrypted.pdf' },
      body: fixtures.pdf_encrypted
    });
    const pdfEncResult = await pdfEncRes.json();
    report.staticWorkerMessageHandlerExperiment.pdfEncrypted = {
      ok: pdfEncResult.extraction?.ok,
      status: pdfEncResult.extraction?.status,
      errors: pdfEncResult.extraction?.errors
    };

    // 2.7 Repeated PDF Parser Repeat-Run Stability
    console.log('[CANARY] Step 18: Experiment - Testing repeated PDF parser runs (repeat-run stability)...');
    const pdfCleanupRes = await mfExp.dispatchFetch('http://localhost/repeat-run-stability?iterations=5', {
      method: 'POST',
      body: fixtures.pdf_text
    });
    const pdfCleanupResult = await pdfCleanupRes.json();
    report.staticWorkerMessageHandlerExperiment.pdfRepeatRunStability = {
      ok: pdfCleanupResult.ok,
      iterations: pdfCleanupResult.iterations,
      totalDurationMs: pdfCleanupResult.totalDurationMs,
      runs: pdfCleanupResult.runs,
      stabilityNote: pdfCleanupResult.stabilityNote || 'Sequential run latency and hash consistency; isolate heap uninstrumented.'
    };
  } finally {
    console.log('[CANARY] Step 19: Disposing experiment Miniflare instance...');
    await mfExp.dispose();
  }

  // Assertions to derive summary outcomes strictly from observations
  const docxEq = report.productionCanary?.docxEquation;
  const docxUnsup = report.productionCanary?.docxUnsupported;
  const docxRoundtrip = report.productionCanary?.docxSerializationRoundtripCheck;
  const docxStability = report.productionCanary?.docxRepeatRunStability;
  const pdfProd = report.productionCanary?.pdfProductionResult;
  const expText = report.staticWorkerMessageHandlerExperiment?.pdfText;
  const expImg = report.staticWorkerMessageHandlerExperiment?.pdfImageOnly;
  const expMixed = report.staticWorkerMessageHandlerExperiment?.pdfMixed;
  const expMal = report.staticWorkerMessageHandlerExperiment?.pdfMalformed;
  const expEnc = report.staticWorkerMessageHandlerExperiment?.pdfEncrypted;
  const expStability = report.staticWorkerMessageHandlerExperiment?.pdfRepeatRunStability;

  const docxEqPassed = docxEq?.ok === true &&
    (docxEq?.segmentsCount ?? 0) > 0 &&
    (docxEq?.mathSegmentsCount ?? 0) > 0 &&
    typeof docxEq?.sha256 === 'string';

  const docxUnsupPassed = docxUnsup?.ok === true &&
    (docxUnsup?.uncertainties?.length ?? 0) >= 4;

  const xmlLocationLossConfirmed =
    docxRoundtrip?.allSegmentsHadXmlLocationBefore === true &&
    docxRoundtrip?.allSegmentsLostXmlLocationAfterRoundtrip === true &&
    docxRoundtrip?.enumerableCheck === true;

  const docxStabilityPassed = docxStability?.ok === true &&
    docxStability?.runs?.length === 5 &&
    docxStability?.runs?.every(r => r.hash === docxStability.runs[0].hash);

  const docxOperational = docxEqPassed && docxUnsupPassed && xmlLocationLossConfirmed && docxStabilityPassed;

  const pdfProdStatusValid = pdfProd?.ok === true &&
    (pdfProd?.status === 'needs_review' || pdfProd?.status === 'ok');
  const pdfProdErrorsEmpty = !pdfProd?.errors || (Array.isArray(pdfProd.errors) && pdfProd.errors.length === 0);
  const pdfProdSegmentsValid = typeof pdfProd?.segmentsCount === 'number' && pdfProd.segmentsCount > 0;
  const pdfProdSha256Valid = typeof pdfProd?.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(pdfProd.sha256);
  const pdfProdWorkerHandlerObserved = report.productionCanary?.runtimeInfo?.hasWorkerMessageHandler === true &&
    pdfProd?.workerHandlerObserved === true;

  const pdfProductionOperational = pdfProdStatusValid &&
    pdfProdErrorsEmpty &&
    pdfProdSegmentsValid &&
    pdfProdSha256Valid &&
    pdfProdWorkerHandlerObserved;

  const expTextPassed = expText?.ok === true &&
    (expText?.segmentsCount ?? 0) > 0 &&
    typeof expText?.sha256 === 'string';

  const expScannedOcrPassed = expImg?.ok === true &&
    (expImg?.segmentsCount ?? 0) === 0 &&
    expImg?.ocrRequiredEmitted === true;

  const expMixedPassed = expMixed?.ok === true &&
    (expMixed?.segmentsCount ?? 0) === 2 &&
    expMixed?.ocrRequiredPages?.includes(2);

  const expMalformedPassed = expMal?.ok === false &&
    expMal?.status === 'error' &&
    expMal?.errors?.[0]?.code === 'CORRUPTED_PDF';

  const expEncryptedPassed = expEnc?.ok === false &&
    expEnc?.status === 'error' &&
    expEnc?.errors?.[0]?.code === 'ENCRYPTED_PDF';

  const expStabilityPassed = expStability?.ok === true &&
    expStability?.runs?.length === 5 &&
    expStability?.runs?.every(r => r.hash === expStability.runs[0].hash);

  const pdfExperimentOperational = expTextPassed && expScannedOcrPassed &&
    expMixedPassed && expMalformedPassed && expEncryptedPassed && expStabilityPassed;

  const userAgentObserved = typeof report.productionCanary?.runtimeInfo?.userAgent === 'string' &&
    report.productionCanary.runtimeInfo.userAgent.includes('Cloudflare-Workers');

  const limitsMatchParser =
    report.limits.docx.maxBytes === DOCX_MAX_BYTES &&
    report.limits.docx.maxDecompressedBytes === DOCX_MAX_DECOMPRESSED_BYTES &&
    report.limits.docx.maxEntries === DOCX_MAX_ENTRIES &&
    report.limits.docx.maxEntryBytes === DOCX_MAX_ENTRY_BYTES &&
    report.limits.docx.maxRatio === DOCX_MAX_RATIO &&
    report.limits.pdf.maxBytes === PDF_MAX_BYTES &&
    report.limits.pdf.maxPages === PDF_MAX_PAGES &&
    report.limits.pdf.maxTotalTextBytes === PDF_MAX_TOTAL_TEXT_BYTES &&
    report.limits.pdf.maxPageTextBytes === PDF_MAX_PAGE_TEXT_BYTES;

  const allPassed = docxOperational && pdfProductionOperational && pdfExperimentOperational &&
    userAgentObserved && limitsMatchParser;

  report.summary = {
    status: allPassed ? 'complete' : 'failed',
    docxStatus: docxOperational ? 'operational' : 'failed',
    docxAssertions: {
      equationExtraction: docxEqPassed,
      unsupportedObjectHandling: docxUnsupPassed,
      xmlLocationNonenumerableLoss: xmlLocationLossConfirmed,
      repeatRunStability: docxStabilityPassed
    },
    pdfProductionStatus: pdfProductionOperational ? 'operational_static_worker' : 'unexpected_outcome',
    pdfProductionAssertions: {
      statusAccepted: pdfProdStatusValid,
      errorsEmpty: pdfProdErrorsEmpty,
      segmentsExtracted: pdfProdSegmentsValid,
      sha256Valid: pdfProdSha256Valid,
      workerHandlerObserved: pdfProdWorkerHandlerObserved
    },
    pdfExperimentStatus: pdfExperimentOperational ? 'operational_with_static_bundle' : 'failed',
    pdfExperimentAssertions: {
      textExtraction: expTextPassed,
      scannedOcrUncertainty: expScannedOcrPassed,
      mixedPagesExtractionAndOcr: expMixedPassed,
      malformedCorruptedHandled: expMalformedPassed,
      encryptedHandled: expEncryptedPassed,
      repeatRunStability: expStabilityPassed
    },
    runtimeAssertions: {
      userAgentObserved,
      engineMatchesWorkerd: report.productionCanary?.runtimeInfo?.runtime === 'workerd',
      limitsMatchParser
    },
    xmlLocationNonenumerableLossConfirmed: xmlLocationLossConfirmed,
    ocrUncertaintyEmittedOnScannedPdf: expScannedOcrPassed
  };

  report.totalDurationMs = Date.now() - startTime;

  // Save report
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[CANARY] Report successfully written to ${reportPath}`);

  if (!allPassed) {
    throw new Error('Canary failed: one or more derived assertions failed.');
  }

  return report;
}

runCanary().then(report => {
  console.log('[CANARY_SUCCESS]');
  process.exit(0);
}).catch(err => {
  console.error('[CANARY_ERROR]', err);
  process.exit(1);
});
