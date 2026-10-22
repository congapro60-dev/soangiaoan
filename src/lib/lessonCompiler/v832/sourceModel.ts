import { sourceTextIsReadable, type LessonSourceBundle, type LessonSourceRole } from '../../lessonGen/sourceIngestion.js';
import { buildSourceVerificationRecords, type SourceVerificationKind,
  type SourceVerificationRecord, type SourceVerificationStatus } from '../../lessonGen/sourceVerification.js';

export interface ExtractedSourceBlock {
  id: string;
  sourceId: string;
  sourceRole: LessonSourceRole;
  text: string;
  locator: { kind: 'extracted_line'; value: string; line: number };
  /** A text extractor has not supplied calibrated confidence; null is not a score. */
  extractionConfidence: number | null;
}

export interface SourceClaim {
  id: string;
  sourceId: string;
  sourceBlockId: string;
  kind: Exclude<SourceVerificationKind, 'canonical_gap'>;
  excerpt: string;
  /** Excerpt review only. This does not certify canonical mathematical truth. */
  status: SourceVerificationStatus;
}

export interface SourceModel {
  sourceHash: string;
  blocks: ExtractedSourceBlock[];
  claims: SourceClaim[];
  issues: string[];
}

export const buildSourceModel = (
  bundle: LessonSourceBundle,
  reviews: readonly SourceVerificationRecord[],
): SourceModel => {
  const blocks: ExtractedSourceBlock[] = [];
  const claims: SourceClaim[] = [];
  const issues: string[] = [];
  const seenSourceIds = new Set<string>();
  const duplicateReviewIds = new Set<string>();
  const seenReviewIds = new Set<string>();
  for (const review of reviews) {
    if (seenReviewIds.has(review.id)) {
      duplicateReviewIds.add(review.id);
      issues.push(`SOURCE_REVIEW_ID_DUPLICATE:${review.id}`);
    }
    seenReviewIds.add(review.id);
  }
  const reviewed = new Map(reviews.map(record => [record.id, record]));
  const expected = buildSourceVerificationRecords(bundle);

  for (const source of bundle.sources) {
    if (seenSourceIds.has(source.id)) issues.push(`SOURCE_ID_DUPLICATE:${source.id}`);
    seenSourceIds.add(source.id);
    if (!sourceTextIsReadable(source.content)) {
      issues.push(`SOURCE_CONTENT_UNREADABLE:${source.id}`);
      continue;
    }
    let nonEmptyIndex = 0;
    source.content.split(/\r?\n/).forEach((raw, index) => {
      const text = raw.trim();
      if (!text) return;
      blocks.push({ id: `${source.id}:line:${nonEmptyIndex}`, sourceId: source.id,
        sourceRole: source.role, text,
        locator: { kind: 'extracted_line', value: source.name, line: index + 1 },
        extractionConfidence: null });
      nonEmptyIndex += 1;
    });
  }

  for (const required of expected) {
    if (required.kind === 'canonical_gap') continue;
    const sourceBlockId = `${required.sourceId}:line:${required.id.slice(required.id.lastIndexOf(':') + 1)}`;
    const block = blocks.find(item => item.id === sourceBlockId && item.text === required.excerpt);
    if (!block) {
      issues.push(`SOURCE_CLAIM_BLOCK_MISSING:${required.id}`);
      continue;
    }
    const actual = reviewed.get(required.id);
    const exactMatch = !duplicateReviewIds.has(required.id)
      && actual?.sourceId === required.sourceId && actual.kind === required.kind
      && actual.excerpt === required.excerpt && actual.locator.kind === required.locator.kind
      && actual.locator.value === required.locator.value;
    claims.push({ id: required.id, sourceId: required.sourceId, sourceBlockId,
      kind: required.kind, excerpt: required.excerpt,
      status: exactMatch ? actual.status : 'needs_review' });
  }

  return { sourceHash: bundle.sourceHash, blocks, claims, issues };
};
