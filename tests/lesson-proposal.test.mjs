import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonProposal } from '../lib/lesson/proposal.js';

const extraction = (text, overrides = {}) => ({
  schemaVersion: '1.0.0', id: 'extract-1', originalName: 'Toan 11 Day so.docx',
  sha256: 'a'.repeat(64), status: 'needs_review', bytes: Buffer.byteLength(text),
  segments: [{ id: 'seg-1', kind: 'heading', text, start: 0, end: text.length, lineStart: 1, lineEnd: 1 }],
  uncertainties: [], warnings: [], ...overrides
});

test('buildLessonProposal recognizes grade 11 sequences and maps collaboration to a lesson arc', () => {
  const result = buildLessonProposal({ extraction: extraction('Toán 11 - Dãy số: u_n, số hạng, hệ thức truy hồi. Học sinh làm việc theo nhóm và tự kiểm tra.'), sourceId: 'src-1', parserRevision: 'p5', extractionHash: 'b'.repeat(64) });
  assert.equal(result.status, 'needs_review');
  assert.deepEqual(result.source, { id: 'src-1', sha256: 'a'.repeat(64), parserRevision: 'p5', extractionHash: 'b'.repeat(64) });
  assert.deepEqual(result.detection, { subject: 'math', grade: 11, topic: 'sequences', confidence: 0.95, signals: ['MATH_SUBJECT', 'GRADE_11', 'SEQUENCES', 'GROUP_LANGUAGE'] });
  assert.deepEqual(result.recommendation, { map: 'historical', rule: 'relay', participation: 'group', alternatives: [{ map: 'academy', rule: 'campaign', participation: 'individual', reasonCode: 'LOWER_COORDINATION_LOAD' }] });
  assert.equal(result.proposedActivities.reduce((sum, activity) => sum + activity.minutes, 0), 40);
  assert.deepEqual(result.proposedActivities.map(activity => activity.phase), ['experience', 'guided', 'practice', 'recheck', 'exit', 'reflection']);
  assert.equal(result.requiresTeacherReview, true);
});

test('buildLessonProposal stays conservative for generic text and exposes uncertainty', () => {
  const result = buildLessonProposal({ extraction: extraction('Một chủ đề chưa rõ, có một trang quét cần OCR.', { originalName: 'lesson.pdf', uncertainties: [{ code: 'OCR_REQUIRED', pageNumber: 1 }] }), sourceId: 'src-2', parserRevision: 'pdf-1', extractionHash: 'c'.repeat(64) });
  assert.equal(result.detection.subject, 'unknown');
  assert.equal(result.detection.grade, null);
  assert.equal(result.detection.topic, 'unknown');
  assert.equal(result.recommendation.map, 'modern');
  assert.equal(result.recommendation.rule, 'campaign');
  assert.equal(result.recommendation.participation, 'individual');
  assert.deepEqual(result.uncertainties, ['OCR_REQUIRED', 'SUBJECT_UNCERTAIN', 'GRADE_UNCERTAIN', 'TOPIC_UNCERTAIN']);
  assert.equal(result.requiresTeacherReview, true);
});

test('source lesson timing recognizes a named group activity without requiring a fixed phrase', () => {
  const result = buildLessonProposal({ extraction: extraction('Toán 11 — Dãy số. Khởi động 4 phút, nhóm 10 phút, cá nhân phân hóa 7 phút.'), sourceId: 'src-1', parserRevision: 'p5', extractionHash: 'b'.repeat(64) });
  assert.ok(result.detection.signals.includes('GROUP_LANGUAGE'));
  assert.equal(result.recommendation.participation, 'group');
  assert.equal(result.proposedActivities.find(activity => activity.phase === 'practice').participation, 'group');
});

test('buildLessonProposal rejects missing source identity and malformed extraction', () => {
  assert.throws(() => buildLessonProposal({ extraction: null, sourceId: 'src' }), /EXTRACTION_REQUIRED/);
  assert.throws(() => buildLessonProposal({ extraction: extraction('x'), sourceId: '' }), /SOURCE_ID_REQUIRED/);
  assert.throws(() => buildLessonProposal({ extraction: extraction('x'), sourceId: 'src', parserRevision: 'p', extractionHash: 'bad' }), /EXTRACTION_HASH_REQUIRED/);
});
