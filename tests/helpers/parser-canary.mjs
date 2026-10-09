/**
 * Isolated Parser Canary Test Helper
 * Provides programmatic access to the workerd/Miniflare parser canary runner and synthetic fixtures.
 */
export { runParserCanary, validateCanaryReport, printSummary } from '../../scripts/qa/parser-canary.mjs';
export {
  createDocxArchive,
  createDocxEquationFixture,
  createDocxUnsupportedObjectFixture,
  createPdfDocument,
  createPdfTextFixture,
  createPdfImageOnlyFixture,
  createPdfMixedFixture,
  createPdfMalformedFixture,
  createPdfEncryptedFixture,
  writeAllFixtures
} from '../../tasks/canary/synthetic-fixtures.mjs';
export {
  buildProductionCanaryWorker,
  buildExperimentCanaryWorker
} from '../../scripts/qa/canary-bundle.mjs';
