import { describe, expect, it } from 'vitest';
import { createSourceBundle } from '../../lessonGen/sourceIngestion';
import { buildSourceVerificationRecords } from '../../lessonGen/sourceVerification';
import { buildSourceModel } from './sourceModel';

describe('V8.3.2 source model provenance', () => {
  it('retains physical line locators and links mathematical claims to reviewed excerpts', async () => {
    const bundle = await createSourceBundle({ id: 'teacher-1', name: 'day-so.md', mimeType: 'text/markdown',
      role: 'teacher_lesson', durationMinutes: 40,
      content: 'Bài 5. Dãy số\n\nCho u_n = 2n + 1.\n| n | 1 | 2 |\nTổng kết.' });
    const records = buildSourceVerificationRecords(bundle).map(record => ({ ...record,
      status: record.kind === 'math_expression' ? 'verified' as const : 'needs_review' as const }));
    const model = buildSourceModel(bundle, records);
    expect(model.sourceHash).toBe(bundle.sourceHash);
    expect(model.blocks.map(block => [block.text, block.locator.line])).toEqual([
      ['Bài 5. Dãy số', 1], ['Cho u_n = 2n + 1.', 3], ['| n | 1 | 2 |', 4], ['Tổng kết.', 5],
    ]);
    expect(model.blocks[1]).toMatchObject({ sourceId: 'teacher-1', sourceRole: 'teacher_lesson',
      locator: { kind: 'extracted_line', line: 3 }, extractionConfidence: null });
    expect(model.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceBlockId: 'teacher-1:line:1', kind: 'math_expression',
        excerpt: 'Cho u_n = 2n + 1.', status: 'verified' }),
      expect.objectContaining({ sourceBlockId: 'teacher-1:line:2', kind: 'table_or_figure',
        excerpt: '| n | 1 | 2 |', status: 'needs_review' }),
    ]));
    expect(model.claims).toHaveLength(2);
    expect(model.issues).toEqual([]);
  });

  it('does not let a forged record turn a claim into verified evidence', async () => {
    const bundle = await createSourceBundle({ id: 'source', name: 'lesson.txt', mimeType: 'text/plain',
      role: 'teacher_lesson', durationMinutes: 40, content: 'u_n = 2n + 1' });
    const forged = buildSourceVerificationRecords(bundle).map(record => ({ ...record,
      status: 'verified' as const, excerpt: 'u_n = 999' }));
    const model = buildSourceModel(bundle, forged);
    expect(model.claims[0]).toMatchObject({ excerpt: 'u_n = 2n + 1', status: 'needs_review' });
  });

  it('does not accept duplicate review IDs as verified claim evidence', async () => {
    const bundle = await createSourceBundle({ id: 'source', name: 'lesson.txt', mimeType: 'text/plain',
      role: 'teacher_lesson', durationMinutes: 40, content: 'u_n = 2n + 1' });
    const review = buildSourceVerificationRecords(bundle).find(record => record.kind === 'math_expression')!;
    const model = buildSourceModel(bundle, [{ ...review, status: 'needs_review' }, { ...review, status: 'verified' }]);
    expect(model.issues).toContain(`SOURCE_REVIEW_ID_DUPLICATE:${review.id}`);
    expect(model.claims[0].status).toBe('needs_review');
  });

  it('reports unreadable scans and duplicate source IDs without inventing blocks', async () => {
    const bundle = await createSourceBundle([
      { id: 'same', name: 'scan.png', mimeType: 'image/png', role: 'teacher_lesson', content: 'data:image/png;base64,AAAA' },
      { id: 'same', name: 'notes.txt', mimeType: 'text/plain', role: 'reference', content: 'Nội dung đọc được' },
    ]);
    const model = buildSourceModel(bundle, buildSourceVerificationRecords(bundle));
    expect(model.issues).toEqual(expect.arrayContaining(['SOURCE_CONTENT_UNREADABLE:same', 'SOURCE_ID_DUPLICATE:same']));
    expect(model.blocks).toHaveLength(1);
    expect(model.blocks[0].text).toBe('Nội dung đọc được');
    expect(model.claims).toHaveLength(0);
  });
});
