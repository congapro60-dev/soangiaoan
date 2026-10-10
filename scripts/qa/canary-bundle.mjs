import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const esbuildPath = require.resolve('esbuild', { paths: [require.resolve('wrangler')] });
const esbuild = await import(pathToFileURL(esbuildPath).href);

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');

/**
 * Builds the production parser worker bundle.
 * Uses exact production parser files without any monkey-patching or modifications.
 *
 * @returns {Promise<{ code: string, bytes: number }>}
 */
export async function buildProductionCanaryWorker() {
  const result = await esbuild.build({
    stdin: {
      contents: `
        import {
          importDocx,
          validateDocxExtraction,
          detectCapability as detectDocxCapability,
          DOCX_MAX_BYTES,
          DOCX_MAX_ENTRIES,
          DOCX_MAX_DECOMPRESSED_BYTES,
          DOCX_MAX_ENTRY_BYTES,
          DOCX_MAX_RATIO
        } from './lib/lesson/import/docx.js';
           import {
             importPdf,
             isPdfjsAvailable,
             isPdfjsWorkerHandlerAvailable,
          detectCapability as detectPdfCapability,
          PDF_MAX_BYTES,
          PDF_MAX_PAGES,
          PDF_MAX_TOTAL_TEXT_BYTES,
          PDF_MAX_PAGE_TEXT_BYTES
        } from './lib/lesson/import/pdf.js';

        export default {
          async fetch(request, env, ctx) {
            const url = new URL(request.url);

            if (url.pathname === '/runtime-info') {
              return Response.json({
                runtime: 'workerd',
                userAgent: navigator.userAgent,
                 isPdfjsAvailable: isPdfjsAvailable(),
                 hasWorkerMessageHandler: isPdfjsWorkerHandlerAvailable(),
                process: {
                  version: typeof process !== 'undefined' ? process.version : null,
                  versions: typeof process !== 'undefined' ? process.versions : null,
                  release: typeof process !== 'undefined' ? process.release : null
                },
                globals: {
                  hasWorker: typeof Worker !== 'undefined',
                  hasImageData: typeof ImageData !== 'undefined',
                  hasDOMParser: typeof DOMParser !== 'undefined',
                  hasHTMLCanvasElement: typeof HTMLCanvasElement !== 'undefined'
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
                }
              });
            }

            if (url.pathname === '/parse-docx') {
              try {
                const body = await request.arrayBuffer();
                const bytes = new Uint8Array(body);
                const extraction = importDocx(bytes);

                // Check xmlLocation on segments before JSON serialization
                const segmentInspection = (extraction.segments || []).map(seg => ({
                  id: seg.id,
                  kind: seg.kind,
                  hasXmlLocation: Boolean(seg.xmlLocation),
                  xmlLocationKeys: seg.xmlLocation ? Object.keys(seg.xmlLocation) : [],
                  xmlLocationEnumerable: Object.prototype.propertyIsEnumerable.call(seg, 'xmlLocation'),
                  xmlLocationValue: seg.xmlLocation ? { ...seg.xmlLocation } : null
                }));

                // JSON Roundtrip check
                const jsonSerialized = JSON.stringify(extraction);
                const roundtripped = JSON.parse(jsonSerialized);
                const roundtripSegments = (roundtripped.segments || []).map(seg => ({
                  id: seg.id,
                  hasXmlLocation: Boolean(seg.xmlLocation)
                }));

                const allSegmentsLostXmlLocation = segmentInspection.every(s => s.hasXmlLocation) &&
                  roundtripSegments.every(s => !s.hasXmlLocation);

                return Response.json({
                  ok: true,
                  extraction,
                  serializationCheck: {
                    allSegmentsHadXmlLocationBefore: segmentInspection.every(s => s.hasXmlLocation),
                    allSegmentsLostXmlLocationAfterRoundtrip: allSegmentsLostXmlLocation,
                    segmentDetails: segmentInspection
                  }
                });
              } catch (err) {
                return Response.json({
                  ok: false,
                  errorName: err.name,
                  errorMessage: err.message,
                  stack: err.stack
                }, { status: 500 });
              }
            }

            if (url.pathname === '/parse-pdf') {
              try {
                const body = await request.arrayBuffer();
                const bytes = new Uint8Array(body);
                const originalName = request.headers.get('x-file-name') || 'document.pdf';
                const extraction = await importPdf({ bytes, originalName });

                return Response.json({
                  ok: extraction.ok === true,
                  extraction
                });
              } catch (err) {
                return Response.json({
                  ok: false,
                  errorName: err.name,
                  errorMessage: err.message,
                  stack: err.stack
                }, { status: 500 });
              }
            }

            if (url.pathname === '/repeat-run-stability' || url.pathname === '/repeated-cleanup') {
              try {
                const body = await request.arrayBuffer();
                const bytes = new Uint8Array(body);
                const iterations = Number(url.searchParams.get('iterations') || '5');
                const results = [];
                const startTotal = Date.now();

                for (let i = 0; i < iterations; i++) {
                  const iterStart = Date.now();
                  const ext = importDocx(bytes);
                  results.push({
                    iteration: i + 1,
                    durationMs: Date.now() - iterStart,
                    segmentsCount: ext.segments?.length || 0,
                    hash: ext.sha256
                  });
                }

                return Response.json({
                  ok: true,
                  iterations,
                  totalDurationMs: Date.now() - startTotal,
                  runs: results,
                  stabilityNote: 'Latency and output hash consistency over sequential invocations; does not measure worker isolate heap lifecycle.'
                });
              } catch (err) {
                return Response.json({
                  ok: false,
                  errorName: err.name,
                  errorMessage: err.message
                }, { status: 500 });
              }
            }

            return new Response('Not found', { status: 404 });
          }
        };
      `,
      resolveDir: projectRoot,
      sourcefile: 'production-canary-worker.js'
    },
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    external: ['node:*', 'cloudflare:*'],
    write: false
  });

  return {
    code: result.outputFiles[0].text,
    bytes: result.outputFiles[0].contents.length
  };
}

/**
 * Builds the experimental worker bundle with static WorkerMessageHandler.
 * Does NOT modify production lib/lesson/import/pdf.js!
 * Evaluates whether providing WorkerMessageHandler statically allows pdfjs-dist
 * to function inside workerd without dynamic import of "pdf.worker.mjs".
 *
 * @returns {Promise<{ code: string, bytes: number }>}
 */
export async function buildExperimentCanaryWorker() {
  const result = await esbuild.build({
    stdin: {
      contents: `
        // Statically bundle and expose WorkerMessageHandler to bypass dynamic import("pdf.worker.mjs")
        import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
        globalThis.pdfjsWorker = pdfjsWorker;

        import {
          importPdf,
          isPdfjsAvailable,
          PDF_MAX_BYTES,
          PDF_MAX_PAGES,
          PDF_MAX_TOTAL_TEXT_BYTES,
          PDF_MAX_PAGE_TEXT_BYTES
        } from './lib/lesson/import/pdf.js';
        import {
          DOCX_MAX_BYTES,
          DOCX_MAX_ENTRIES,
          DOCX_MAX_DECOMPRESSED_BYTES,
          DOCX_MAX_ENTRY_BYTES,
          DOCX_MAX_RATIO
        } from './lib/lesson/import/docx.js';

        export default {
          async fetch(request) {
            const url = new URL(request.url);

            if (url.pathname === '/runtime-info') {
              return Response.json({
                runtime: 'workerd-experiment',
                userAgent: navigator.userAgent,
                isPdfjsAvailable: isPdfjsAvailable(),
                hasGlobalWorkerMessageHandler: Boolean(globalThis.pdfjsWorker?.WorkerMessageHandler),
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
                }
              });
            }

            if (url.pathname === '/parse-pdf') {
              try {
                const body = await request.arrayBuffer();
                const bytes = new Uint8Array(body);
                const originalName = request.headers.get('x-file-name') || 'document.pdf';
                const extraction = await importPdf({ bytes, originalName });

                // Check pdfLocation on segments before JSON serialization
                const segmentInspection = (extraction.segments || []).map(seg => ({
                  id: seg.id,
                  kind: seg.kind,
                  pageNumber: seg.pdfLocation?.pageNumber ?? null,
                  hasPdfLocation: Boolean(seg.pdfLocation),
                  pdfLocationEnumerable: Object.prototype.propertyIsEnumerable.call(seg, 'pdfLocation'),
                  pdfLocationValue: seg.pdfLocation ? { ...seg.pdfLocation } : null
                }));

                const jsonSerialized = JSON.stringify(extraction);
                const roundtripped = JSON.parse(jsonSerialized);
                const roundtripSegments = (roundtripped.segments || []).map(seg => ({
                  id: seg.id,
                  hasPdfLocation: Boolean(seg.pdfLocation)
                }));

                return Response.json({
                  ok: true,
                  extraction,
                  serializationCheck: {
                    segmentInspection,
                    roundtripSegments,
                    pdfLocationLostInRoundtrip: segmentInspection.every(s => s.hasPdfLocation) &&
                      roundtripSegments.every(s => !s.hasPdfLocation)
                  }
                });
              } catch (err) {
                return Response.json({
                  ok: false,
                  errorName: err.name,
                  errorMessage: err.message,
                  stack: err.stack
                }, { status: 500 });
              }
            }

            if (url.pathname === '/repeat-run-stability' || url.pathname === '/repeated-cleanup') {
              try {
                const body = await request.arrayBuffer();
                const bytes = new Uint8Array(body);
                const iterations = Number(url.searchParams.get('iterations') || '5');
                const results = [];
                const startTotal = Date.now();

                for (let i = 0; i < iterations; i++) {
                  const iterStart = Date.now();
                  const ext = await importPdf({ bytes, originalName: 'cleanup.pdf' });
                  results.push({
                    iteration: i + 1,
                    durationMs: Date.now() - iterStart,
                    segmentsCount: ext.segments?.length || 0,
                    hash: ext.sha256
                  });
                }

                return Response.json({
                  ok: true,
                  iterations,
                  totalDurationMs: Date.now() - startTotal,
                  runs: results,
                  stabilityNote: 'Latency and output hash consistency over sequential invocations; does not measure worker isolate heap lifecycle.'
                });
              } catch (err) {
                return Response.json({
                  ok: false,
                  errorName: err.name,
                  errorMessage: err.message
                }, { status: 500 });
              }
            }

            return new Response('Not found', { status: 404 });
          }
        };
      `,
      resolveDir: projectRoot,
      sourcefile: 'experiment-canary-worker.js'
    },
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    external: ['node:*', 'cloudflare:*'],
    write: false
  });

  return {
    code: result.outputFiles[0].text,
    bytes: result.outputFiles[0].contents.length
  };
}
