import { spawn } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const isolatedScript = path.join(__dirname, 'canary-isolated-process.mjs');
const reportPath = path.join(projectRoot, 'tasks/canary/canary-report.json');

const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Validates a canary audit report to ensure all observed runtime outcomes and bounds are genuine.
 * Derives outcomes strictly from assertions - never accepts default fallbacks, stale results,
 * or summary flags that contradict underlying observed evidence.
 *
 * @param {Record<string, any> | null} report
 * @param {number} [startTime]
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateCanaryReport(report, startTime) {
  if (!report || typeof report !== 'object') {
    return { ok: false, error: 'Report is missing, empty, or not a JSON object.' };
  }

  // 1. Timestamp validation (must be finite date, not NaN or invalid string)
  if (!report.timestamp || typeof report.timestamp !== 'string') {
    return { ok: false, error: 'Report is missing execution timestamp string.' };
  }
  const reportTime = new Date(report.timestamp).getTime();
  if (!Number.isFinite(reportTime)) {
    return { ok: false, error: `Report timestamp "${report.timestamp}" is not a valid date.` };
  }
  if (startTime && reportTime < startTime - 1000) {
    return { ok: false, error: `Report is stale (generated at ${report.timestamp}, before execution start at ${new Date(startTime).toISOString()}).` };
  }

  // 2. Compatibility date and flags
  if (report.engine !== 'workerd') {
    return { ok: false, error: `Invalid runtime engine "${report.engine}", expected "workerd".` };
  }
  if (report.compatibilityDate !== '2026-05-15') {
    return { ok: false, error: `Invalid compatibilityDate "${report.compatibilityDate}", expected "2026-05-15".` };
  }
  if (!Array.isArray(report.compatibilityFlags) || !report.compatibilityFlags.includes('nodejs_compat')) {
    return { ok: false, error: 'Report is missing "nodejs_compat" in compatibilityFlags.' };
  }

  // 3. Workerd runtime userAgent must be genuinely observed (no default fallback)
  const prodRuntime = report.productionCanary?.runtimeInfo;
  if (!prodRuntime || typeof prodRuntime !== 'object') {
    return { ok: false, error: 'Report is missing productionCanary.runtimeInfo.' };
  }
  if (prodRuntime.runtime !== 'workerd') {
    return { ok: false, error: `Invalid production runtime "${prodRuntime.runtime}", expected "workerd".` };
  }
  const userAgent = prodRuntime.userAgent;
  if (typeof userAgent !== 'string' || !userAgent.includes('Cloudflare-Workers')) {
    return { ok: false, error: `Invalid or missing workerd userAgent: "${userAgent}".` };
  }
  if (prodRuntime.hasWorkerMessageHandler !== true) {
    return { ok: false, error: 'productionCanary.runtimeInfo.hasWorkerMessageHandler is not true.' };
  }

  // 4. DOCX limits must match actual parser constants (10MiB / 50MiB / 1000 entries / 20MiB / 100:1)
  const docxLimits = report.limits?.docx;
  if (!docxLimits ||
      docxLimits.maxBytes !== 10 * 1024 * 1024 ||
      docxLimits.maxDecompressedBytes !== 50 * 1024 * 1024 ||
      docxLimits.maxEntries !== 1000 ||
      docxLimits.maxEntryBytes !== 20 * 1024 * 1024 ||
      docxLimits.maxRatio !== 100) {
    return { ok: false, error: `Report DOCX limits do not match actual parser constants: ${JSON.stringify(docxLimits)}` };
  }

  // 5. PDF limits must match actual parser constants (10MiB / 100 pages / 5MiB / 1MiB)
  const pdfLimits = report.limits?.pdf;
  if (!pdfLimits ||
      pdfLimits.maxBytes !== 10 * 1024 * 1024 ||
      pdfLimits.maxPages !== 100 ||
      pdfLimits.maxTotalTextBytes !== 5 * 1024 * 1024 ||
      pdfLimits.maxPageTextBytes !== 1 * 1024 * 1024) {
    return { ok: false, error: `Report PDF limits do not match actual parser constants: ${JSON.stringify(pdfLimits)}` };
  }

  // 6. Production DOCX Equation extraction
  const docxEq = report.productionCanary?.docxEquation;
  if (!docxEq || docxEq.ok !== true) {
    return { ok: false, error: 'productionCanary.docxEquation.ok is not true.' };
  }
  if (typeof docxEq.segmentsCount !== 'number' || docxEq.segmentsCount <= 0) {
    return { ok: false, error: `productionCanary.docxEquation invalid segmentsCount: ${docxEq?.segmentsCount}.` };
  }
  if (typeof docxEq.mathSegmentsCount !== 'number' || docxEq.mathSegmentsCount <= 0) {
    return { ok: false, error: `productionCanary.docxEquation invalid mathSegmentsCount: ${docxEq?.mathSegmentsCount}.` };
  }
  if (typeof docxEq.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(docxEq.sha256)) {
    return { ok: false, error: `productionCanary.docxEquation invalid sha256: ${docxEq?.sha256}.` };
  }

  // 7. Production DOCX Unsupported Objects handling
  const docxUnsup = report.productionCanary?.docxUnsupported;
  if (!docxUnsup || docxUnsup.ok !== true) {
    return { ok: false, error: 'productionCanary.docxUnsupported.ok is not true.' };
  }
  if (!Array.isArray(docxUnsup.uncertainties) || docxUnsup.uncertainties.length < 4) {
    return { ok: false, error: `productionCanary.docxUnsupported insufficient uncertainties: ${docxUnsup?.uncertainties?.length}.` };
  }
  const unsupKinds = new Set(docxUnsup.uncertainties.map(u => u.kind));
  if (!unsupKinds.has('unsupported_drawing') || !unsupKinds.has('unsupported_object') || !unsupKinds.has('unsupported_word_content')) {
    return { ok: false, error: `productionCanary.docxUnsupported missing expected uncertainty kinds: ${[...unsupKinds]}.` };
  }
  if (typeof docxUnsup.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(docxUnsup.sha256)) {
    return { ok: false, error: `productionCanary.docxUnsupported invalid sha256: ${docxUnsup?.sha256}.` };
  }

  // 8. Production DOCX JSON Roundtrip check (xmlLocation nonenumerable loss)
  const docxRoundtrip = report.productionCanary?.docxSerializationRoundtripCheck;
  if (!docxRoundtrip) {
    return { ok: false, error: 'productionCanary.docxSerializationRoundtripCheck is missing.' };
  }
  if (docxRoundtrip.allSegmentsHadXmlLocationBefore !== true) {
    return { ok: false, error: 'docxSerializationRoundtripCheck.allSegmentsHadXmlLocationBefore is not true.' };
  }
  if (docxRoundtrip.allSegmentsLostXmlLocationAfterRoundtrip !== true) {
    return { ok: false, error: 'docxSerializationRoundtripCheck.allSegmentsLostXmlLocationAfterRoundtrip is not true.' };
  }
  if (docxRoundtrip.enumerableCheck !== true) {
    return { ok: false, error: 'docxSerializationRoundtripCheck.enumerableCheck is not true (must be non-enumerable).' };
  }

  // 9. Production DOCX Repeat-Run Stability
  const docxStability = report.productionCanary?.docxRepeatRunStability;
  if (!docxStability || docxStability.ok !== true) {
    return { ok: false, error: 'productionCanary.docxRepeatRunStability.ok is not true.' };
  }
  if (docxStability.iterations !== 5 || !Array.isArray(docxStability.runs) || docxStability.runs.length !== 5) {
    return { ok: false, error: `productionCanary.docxRepeatRunStability expected 5 runs, got ${docxStability?.runs?.length}.` };
  }
  const firstDocxHash = docxStability.runs[0]?.hash;
  if (!firstDocxHash || firstDocxHash !== docxEq.sha256 || !docxStability.runs.every(r => r.hash === firstDocxHash)) {
    return { ok: false, error: 'productionCanary.docxRepeatRunStability output hashes are inconsistent across runs.' };
  }

  // 10. Production PDF Static Worker Handler check
  const pdfProd = report.productionCanary?.pdfProductionResult;
  if (!pdfProd || typeof pdfProd !== 'object') {
    return { ok: false, error: 'productionCanary.pdfProductionResult is missing or not an object.' };
  }
  if (pdfProd.ok !== true) {
    return { ok: false, error: `productionCanary.pdfProductionResult.ok is not true (received ${pdfProd.ok}).` };
  }
  if (pdfProd.status !== 'needs_review' && pdfProd.status !== 'ok') {
    return { ok: false, error: `productionCanary.pdfProductionResult invalid status "${pdfProd.status}", expected "needs_review" or "ok".` };
  }
  if (Array.isArray(pdfProd.errors) && pdfProd.errors.length > 0) {
    return { ok: false, error: `productionCanary.pdfProductionResult must have empty errors, got ${JSON.stringify(pdfProd.errors)}.` };
  }
  if (typeof pdfProd.segmentsCount !== 'number' || pdfProd.segmentsCount <= 0) {
    return { ok: false, error: `productionCanary.pdfProductionResult invalid segmentsCount: ${pdfProd.segmentsCount}.` };
  }
  if (typeof pdfProd.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(pdfProd.sha256)) {
    return { ok: false, error: `productionCanary.pdfProductionResult invalid sha256: ${pdfProd.sha256}.` };
  }
  if (pdfProd.workerHandlerObserved !== true) {
    return { ok: false, error: 'productionCanary.pdfProductionResult.workerHandlerObserved is not true.' };
  }

  // 11. Static WorkerMessageHandler Experiment - Text PDF extraction
  const expText = report.staticWorkerMessageHandlerExperiment?.pdfText;
  if (!expText || expText.ok !== true) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfText.ok is not true.' };
  }
  if (typeof expText.segmentsCount !== 'number' || expText.segmentsCount <= 0) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfText invalid segmentsCount: ${expText?.segmentsCount}.` };
  }
  if (typeof expText.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(expText.sha256)) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfText invalid sha256: ${expText?.sha256}.` };
  }
  if (expText.pdfLocationSerializationLoss !== true) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfText.pdfLocationSerializationLoss is not true.' };
  }

  // 12. Static WorkerMessageHandler Experiment - Scanned image-only PDF (OCR required)
  const expImg = report.staticWorkerMessageHandlerExperiment?.pdfImageOnly;
  if (!expImg || expImg.ok !== true) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfImageOnly.ok is not true.' };
  }
  if (expImg.segmentsCount !== 0) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfImageOnly segmentsCount must be 0, got ${expImg.segmentsCount}.` };
  }
  if (expImg.ocrRequiredEmitted !== true) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfImageOnly.ocrRequiredEmitted is not true.' };
  }
  const hasOcrUncertainty = Array.isArray(expImg.uncertainties) &&
    expImg.uncertainties.some(u => u.kind === 'ocr_required' && u.page === 1);
  if (!hasOcrUncertainty) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfImageOnly missing ocr_required uncertainty on page 1.' };
  }

  // 13. Static WorkerMessageHandler Experiment - Mixed PDF
  const expMixed = report.staticWorkerMessageHandlerExperiment?.pdfMixed;
  if (!expMixed || expMixed.ok !== true) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfMixed.ok is not true.' };
  }
  if (expMixed.segmentsCount !== 2) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfMixed expected 2 segments, got ${expMixed.segmentsCount}.` };
  }
  if (!Array.isArray(expMixed.extractedPages) || !expMixed.extractedPages.includes(1) || !expMixed.extractedPages.includes(3)) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfMixed extractedPages must include 1 and 3, got: ${JSON.stringify(expMixed.extractedPages)}.` };
  }
  if (!Array.isArray(expMixed.ocrRequiredPages) || !expMixed.ocrRequiredPages.includes(2)) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfMixed ocrRequiredPages must include 2, got: ${JSON.stringify(expMixed.ocrRequiredPages)}.` };
  }

  // 14. Static WorkerMessageHandler Experiment - Malformed PDF
  const expMal = report.staticWorkerMessageHandlerExperiment?.pdfMalformed;
  if (!expMal || expMal.ok !== false || expMal.status !== 'error') {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfMalformed must fail closed with ok: false and status: error.' };
  }
  if (expMal.errors?.[0]?.code !== 'CORRUPTED_PDF') {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfMalformed expected error 'CORRUPTED_PDF', got '${expMal?.errors?.[0]?.code}'.` };
  }

  // 15. Static WorkerMessageHandler Experiment - Encrypted PDF
  const expEnc = report.staticWorkerMessageHandlerExperiment?.pdfEncrypted;
  if (!expEnc || expEnc.ok !== false || expEnc.status !== 'error') {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfEncrypted must fail closed with ok: false and status: error.' };
  }
  if (expEnc.errors?.[0]?.code !== 'ENCRYPTED_PDF') {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfEncrypted expected error 'ENCRYPTED_PDF', got '${expEnc?.errors?.[0]?.code}'.` };
  }

  // 16. Static WorkerMessageHandler Experiment - Repeat-Run Stability
  const expStability = report.staticWorkerMessageHandlerExperiment?.pdfRepeatRunStability;
  if (!expStability || expStability.ok !== true) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfRepeatRunStability.ok is not true.' };
  }
  if (expStability.iterations !== 5 || !Array.isArray(expStability.runs) || expStability.runs.length !== 5) {
    return { ok: false, error: `staticWorkerMessageHandlerExperiment.pdfRepeatRunStability expected 5 runs, got ${expStability?.runs?.length}.` };
  }
  const firstExpHash = expStability.runs[0]?.hash;
  if (!firstExpHash || firstExpHash !== expText.sha256 || !expStability.runs.every(r => r.hash === firstExpHash)) {
    return { ok: false, error: 'staticWorkerMessageHandlerExperiment.pdfRepeatRunStability output hashes are inconsistent across runs.' };
  }

  // 17. Summary Cross-Check (verifying summary is NOT blindly trusted but matches the observed evidence)
  if (!report.summary || typeof report.summary !== 'object') {
    return { ok: false, error: 'Report is missing summary assertion object.' };
  }
  if (report.summary.status !== 'complete') {
    return { ok: false, error: `Canary summary status is "${report.summary.status}", expected "complete".` };
  }
  if (report.summary.docxStatus !== 'operational') {
    return { ok: false, error: `DOCX status is "${report.summary.docxStatus}", expected "operational".` };
  }
  if (report.summary.pdfProductionStatus !== 'operational_static_worker') {
    return { ok: false, error: `PDF production status is "${report.summary.pdfProductionStatus}", expected "operational_static_worker".` };
  }
  const pdfProdAssertions = report.summary.pdfProductionAssertions;
  if (!pdfProdAssertions || typeof pdfProdAssertions !== 'object') {
    return { ok: false, error: 'Report is missing summary.pdfProductionAssertions.' };
  }
  if (pdfProdAssertions.statusAccepted !== true ||
      pdfProdAssertions.errorsEmpty !== true ||
      pdfProdAssertions.segmentsExtracted !== true ||
      pdfProdAssertions.sha256Valid !== true ||
      pdfProdAssertions.workerHandlerObserved !== true) {
    return { ok: false, error: 'One or more summary.pdfProductionAssertions are false or missing.' };
  }
  if (report.summary.pdfExperimentStatus !== 'operational_with_static_bundle') {
    return { ok: false, error: `PDF experiment status is "${report.summary.pdfExperimentStatus}", expected "operational_with_static_bundle".` };
  }
  if (report.summary.xmlLocationNonenumerableLossConfirmed !== true) {
    return { ok: false, error: 'xmlLocation nonenumerable loss was not confirmed in summary.' };
  }
  if (report.summary.ocrUncertaintyEmittedOnScannedPdf !== true) {
    return { ok: false, error: 'OCR uncertainty on scanned image-only PDF was not emitted in summary.' };
  }

  return { ok: true };
}

/**
 * Executes the parser canary in an isolated external Node.js child process with timeout guards.
 *
 * @param {number} [timeoutMs]
 * @returns {Promise<{ exitCode: number | null, signal: string | null, stdout: string, stderr: string, durationMs: number, report: Record<string, any> | null, passed: boolean, validationError?: string }>}
 */
export async function runParserCanary(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startTime = Date.now();

  // Remove any stale report file before execution starts to prevent false PASS on premature exit
  if (existsSync(reportPath)) {
    try {
      rmSync(reportPath, { force: true });
    } catch {
      // Ignore removal error
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [isolatedScript], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: '--no-warnings'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let hasExited = false;
    let escalationTimer = null;

    child.on('exit', () => {
      hasExited = true;
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        escalationTimer = null;
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      console.error(`[CANARY TIMEOUT] Child process exceeded timeout of ${timeoutMs}ms. Sending SIGTERM...`);
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }

      escalationTimer = setTimeout(() => {
        if (!hasExited) {
          console.error('[CANARY TIMEOUT] Child process unresponsive after SIGTERM. Sending SIGKILL...');
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }
      }, 3000);
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      const str = chunk.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on('data', chunk => {
      const str = chunk.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        escalationTimer = null;
      }

      const durationMs = Date.now() - startTime;

      let report = null;
      if (existsSync(reportPath)) {
        try {
          report = JSON.parse(readFileSync(reportPath, 'utf-8'));
        } catch {
          report = null;
        }
      }

      if (timedOut) {
        reject(new Error(`Parser canary execution timed out after ${timeoutMs}ms (signal: ${signal})`));
        return;
      }

      const validation = validateCanaryReport(report, startTime);
      const passed = code === 0 && validation.ok === true;

      resolve({
        exitCode: code,
        signal,
        stdout,
        stderr,
        durationMs,
        report,
        passed,
        validationError: validation.ok ? undefined : validation.error
      });
    });

    child.on('error', err => {
      clearTimeout(timer);
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        escalationTimer = null;
      }
      reject(err);
    });
  });
}

export function printSummary(result) {
  const { report, durationMs, exitCode, passed, validationError } = result;

  console.log('\n================================================================================');
  console.log('                 ISOLATED PARSER RUNTIME CANARY AUDIT REPORT                   ');
  console.log('================================================================================\n');

  if (!report) {
    console.error('ERROR: No valid canary report was generated.');
    if (validationError) {
      console.error(`Validation Error: ${validationError}`);
    }
    return;
  }

  const userAgent = report.productionCanary?.runtimeInfo?.userAgent;

  console.log('1. RUNTIME MODULE IDENTITY & VERSIONS');
  console.log('--------------------------------------------------------------------------------');
  console.log(`- Runtime Engine        : ${report.engine} (Miniflare v${report.versions.miniflare} via Wrangler v${report.versions.wrangler})`);
  console.log(`- Compatibility Date    : ${report.compatibilityDate}`);
  console.log(`- Compatibility Flags   : ${report.compatibilityFlags.join(', ')}`);
  console.log(`- Node.js Environment   : ${report.versions.node} (${report.versions.platform} ${report.versions.arch})`);
  console.log(`- Bundler               : esbuild v${report.versions.esbuild}`);
  console.log(`- Parser Dependencies   : pdfjs-dist v${report.versions.pdfjsDist}, fflate v${report.versions.fflate}, KaTeX v${report.versions.katex}`);
  console.log(`- Workerd User Agent    : ${userAgent || '[UNRESOLVED: NOT DETECTED]'}`);
  console.log(`- Total Canary Duration : ${durationMs}ms\n`);

  console.log('2. PRODUCTION DOCX PARSER IN WORKERD');
  console.log('--------------------------------------------------------------------------------');
  const docxEq = report.productionCanary?.docxEquation;
  const docxUnsup = report.productionCanary?.docxUnsupported;
  const docxRoundtrip = report.productionCanary?.docxSerializationRoundtripCheck;
  const docxStability = report.productionCanary?.docxRepeatRunStability;

  console.log(`- Equation Fixture Status : ${docxEq?.ok ? 'PASS' : 'FAIL'} (${docxEq?.segmentsCount} segments, ${docxEq?.mathSegmentsCount} display math segments)`);
  console.log(`- Deterministic Hash      : ${docxEq?.sha256}`);
  console.log(`- Unsupported Object Test : ${docxUnsup?.ok ? 'PASS' : 'FAIL'} (${docxUnsup?.uncertainties?.length} uncertainties captured)`);
  if (docxUnsup?.uncertainties) {
    for (const u of docxUnsup.uncertainties) {
      console.log(`  * [${u.kind}] ${u.tag || ''} - ${u.message}`);
    }
  }
  console.log(`- JSON Roundtrip Check    : xmlLocation nonenumerable loss CONFIRMED`);
  console.log(`  * Before serialization  : xmlLocation present on segments (${docxRoundtrip?.allSegmentsHadXmlLocationBefore ? 'YES' : 'NO'})`);
  console.log(`  * After JSON.parse      : xmlLocation stripped by JSON.stringify (${docxRoundtrip?.allSegmentsLostXmlLocationAfterRoundtrip ? 'YES' : 'NO'})`);
  console.log(`  * Enumerable flag check : enumerable === false (${docxRoundtrip?.enumerableCheck ? 'YES' : 'NO'})`);
  console.log(`- Repeat-Run Stability    : ${docxStability?.iterations} iterations executed in ${docxStability?.totalDurationMs}ms (average ${Math.round((docxStability?.totalDurationMs || 0) / (docxStability?.iterations || 1))}ms/run) [latency & deterministic output hash consistent; heap lifecycle uninstrumented]\n`);

  console.log('3. PRODUCTION PDF PARSER IN WORKERD (STATIC WORKER HANDLER)');
  console.log('--------------------------------------------------------------------------------');
  const pdfProd = report.productionCanary?.pdfProductionResult;
  console.log(`- Bundle Size              : ${report.productionCanary?.bundleBytes} bytes`);
  console.log(`- Production Parser Status : ${pdfProd?.status?.toUpperCase()} (ok: ${pdfProd?.ok})`);
  console.log(`- Text Segments Extracted  : ${pdfProd?.segmentsCount}`);
  console.log(`- Deterministic Hash       : ${pdfProd?.sha256}`);
  console.log(`- Worker Handler Observed  : ${report.productionCanary?.runtimeInfo?.hasWorkerMessageHandler ? 'YES' : 'NO'}`);
  console.log(`- Errors                   : ${!pdfProd?.errors || pdfProd?.errors?.length === 0 ? 'None (clean extraction)' : JSON.stringify(pdfProd?.errors)}\n`);

  console.log('4. STATIC WorkerMessageHandler BUNDLE EXPERIMENT IN WORKERD');
  console.log('--------------------------------------------------------------------------------');
  const exp = report.staticWorkerMessageHandlerExperiment;
  const expStability = exp?.pdfRepeatRunStability;

  console.log(`- Bundle Size               : ${exp?.bundleBytes} bytes`);
  console.log(`- Bundle Strategy           : Static globalThis.pdfjsWorker = WorkerMessageHandler (Zero production edits)`);
  console.log(`- Text Extraction Fixture   : ${exp?.pdfText?.ok ? 'PASS' : 'FAIL'} (${exp?.pdfText?.segmentsCount} segments extracted, hash: ${exp?.pdfText?.sha256})`);
  console.log(`- Scanned Image-Only PDF    : ${exp?.pdfImageOnly?.ok ? 'PASS' : 'FAIL'} (0 segments, OCR_REQUIRED emitted: ${exp?.pdfImageOnly?.ocrRequiredEmitted})`);
  if (exp?.pdfImageOnly?.uncertainties) {
    for (const u of exp.pdfImageOnly.uncertainties) {
      console.log(`  * [${u.kind}] Page ${u.page}: ${u.message}`);
    }
  }
  console.log(`- Mixed Document (3 pages)  : ${exp?.pdfMixed?.ok ? 'PASS' : 'FAIL'} (Extracted pages: [${exp?.pdfMixed?.extractedPages?.join(', ')}], OCR pages: [${exp?.pdfMixed?.ocrRequiredPages?.join(', ')}])`);
  console.log(`- Malformed PDF Corrupt Test: ${exp?.pdfMalformed?.status === 'error' && exp?.pdfMalformed?.errors?.[0]?.code === 'CORRUPTED_PDF' ? 'PASS' : 'FAIL'} (Expected Error: ${exp?.pdfMalformed?.errors?.[0]?.code})`);
  console.log(`- Encrypted PDF Protect Test: ${exp?.pdfEncrypted?.status === 'error' && exp?.pdfEncrypted?.errors?.[0]?.code === 'ENCRYPTED_PDF' ? 'PASS' : 'FAIL'} (Expected Error: ${exp?.pdfEncrypted?.errors?.[0]?.code})`);
  console.log(`- Repeat-Run Stability      : ${expStability?.iterations} iterations in ${expStability?.totalDurationMs}ms (average ${Math.round((expStability?.totalDurationMs || 0) / (expStability?.iterations || 1))}ms/run) [latency & deterministic output hash consistent; heap lifecycle uninstrumented]\n`);

  console.log('5. BOUNDED LIMITS & ARCHITECTURAL LIMITS (PARSER & RUNTIME SOURCED)');
  console.log('--------------------------------------------------------------------------------');
  const docxL = report.limits?.docx;
  const pdfL = report.limits?.pdf;

  console.log(`- DOCX Bounds  : MAX_BYTES = ${docxL ? docxL.maxBytes / (1024 * 1024) : 10}MiB (${docxL?.maxBytes}B), MAX_DECOMPRESSED = ${docxL ? docxL.maxDecompressedBytes / (1024 * 1024) : 50}MiB (${docxL?.maxDecompressedBytes}B), MAX_ENTRY = ${docxL ? docxL.maxEntryBytes / (1024 * 1024) : 20}MiB, MAX_ENTRIES = ${docxL?.maxEntries ?? 1000}, MAX_RATIO = ${docxL?.maxRatio ?? 100}:1`);
  console.log(`- PDF Bounds   : MAX_BYTES = ${pdfL ? pdfL.maxBytes / (1024 * 1024) : 10}MiB (${pdfL?.maxBytes}B), MAX_PAGES = ${pdfL?.maxPages ?? 100}, MAX_TOTAL_TEXT = ${pdfL ? pdfL.maxTotalTextBytes / (1024 * 1024) : 5}MiB, MAX_PAGE_TEXT = ${pdfL ? pdfL.maxPageTextBytes / (1024 * 1024) : 1}MiB`);
  console.log('- Execution    : Sequential, isolated workerd instance, timeout-guarded external process.');
  console.log(`- Overall Audit: ${passed ? 'ALL ASSERTIONS PASSED' : `FAILED (${validationError || 'Assertion failure'})`}`);
  console.log('================================================================================\n');
}

// Auto-run when executed directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runParserCanary()
    .then(result => {
      printSummary(result);
      if (result.exitCode !== 0 || !result.passed) {
        console.error(`\n[CANARY FAILED]: ${result.validationError || `Child process exited with code ${result.exitCode}`}`);
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('[CANARY RUNNER FATAL ERROR]', err);
      process.exit(1);
    });
}
