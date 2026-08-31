import { describe, expect, it } from 'vitest';
import {
  auditLesson,
  buildCanonicalDraft,
  getAllSourceKeys,
  publishSequentially,
  summarizeReports,
  type SaveCallback,
} from './sequentialPublication';
import { getAllBanToanV4Contracts, getBanToanV4Contract, getBanToanV4DisplayTitle } from './lessonAdapter';
import { validateV4Contract } from './validateContract';
import type { AdaptiveLesson } from '../../adaptive/types';

describe('sequentialPublication', () => {
  // ── Pure: 48 lessons ready from generator ────────────────────────────

  describe('48 source keys exist and all contracts validate', () => {
    it('returns exactly 48 source keys', () => {
      const keys = getAllSourceKeys();
      expect(keys).toHaveLength(48);
    });

    it('every sourceKey has a valid contract', () => {
      for (const key of getAllSourceKeys()) {
        const contract = getBanToanV4Contract(key);
        expect(contract).toBeDefined();
        expect(contract.sourceKey).toBe(key);
        expect(contract.durationSeconds).toBe(2400);
      }
    });

    it('all 48 contracts pass validateV4Contract', () => {
      for (const contract of getAllBanToanV4Contracts()) {
        const result = validateV4Contract(contract);
        expect(result.ok).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
  });

  describe('48 canonical drafts pass audit', () => {
    it('builds and audits all 48 drafts successfully', () => {
      const keys = getAllSourceKeys();
      expect(keys).toHaveLength(48);

      const failures: Array<{ key: string; issues: string[] }> = [];
      for (const key of keys) {
        const draft = buildCanonicalDraft(key, 'test-teacher');
        const audit = auditLesson(draft, key);
        if (!audit.passed) {
          failures.push({
            key,
            issues: audit.issues.map((i) => `${i.code}: ${i.message}`),
          });
        }
      }

      if (failures.length > 0) {
        const summary = failures
          .map((f) => `  ${f.key}: ${f.issues.join('; ')}`)
          .join('\n');
        throw new Error(`${failures.length} bài audit fail:\n${summary}`);
      }

      expect(failures).toHaveLength(0);
    });
  });

  // ── Pure: audit contract-level checks ────────────────────────────────

  describe('audit catches contract violations', () => {
    it('reports sourceKey mismatch when curriculumRef differs', () => {
      const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
      // Tamper: change curriculumRef
      const tampered = {
        ...draft,
        curriculumRef: { ...draft.curriculumRef, lessonCode: '99-9-99' },
      };
      const audit = auditLesson(tampered, '10-5-31');
      expect(audit.passed).toBe(false);
      expect(audit.issues.some((i) => i.code === 'SOURCE_KEY_MISMATCH')).toBe(true);
    });

    it('reports duration mismatch', () => {
      const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing tampered data
      const tampered = { ...draft, durationMinutes: 35 } as unknown as AdaptiveLesson;
      const audit = auditLesson(tampered, '10-5-31');
      expect(audit.passed).toBe(false);
      expect(audit.issues.some((i) => i.code === 'DURATION_NOT_40')).toBe(true);
    });

  it('reports missing routes when unit routes are incomplete', () => {
      const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
      const tampered = {
        ...draft,
        knowledgeUnits: draft.knowledgeUnits.map((u) => ({
          ...u,
          routes: u.routes.filter((r) => r.route !== 'challenge'),
        })),
      };
      const audit = auditLesson(tampered, '10-5-31');
      expect(audit.passed).toBe(false);
    expect(audit.issues.some((i) => i.code === 'UNIT_MISSING_ROUTES')).toBe(true);
  });

  it('reports a route example that no longer matches the source example', () => {
    const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
    const tampered = {
      ...draft,
      knowledgeUnits: draft.knowledgeUnits.map((unit) => ({
        ...unit,
        routes: unit.routes.map((route) => route.route === 'standard'
          ? { ...route, workedExamples: [{ ...route.workedExamples[0], problem: 'Bài toán không thuộc nguồn.' }] }
          : route),
      })),
    };
    const audit = auditLesson(tampered, '10-5-31');
    expect(audit.passed).toBe(false);
    expect(audit.issues.some((i) => i.code === 'WORKED_EXAMPLE_NOT_FROM_SOURCE')).toBe(true);
  });

  it('reports an AI Error whose correction no longer matches the canonical source', () => {
    const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
    const tampered = {
      ...draft,
      objectives: draft.objectives.map((objective) => objective.commonMisconceptions?.length
        ? { ...objective, commonMisconceptions: objective.commonMisconceptions.map((item) => ({ ...item, remediationHint: 'Đáp án bịa.' })) }
        : objective),
    };
    const audit = auditLesson(tampered, '10-5-31');
    expect(audit.passed).toBe(false);
    expect(audit.issues.some((i) => i.code === 'AI_ERROR_CONTENT_MISMATCH')).toBe(true);
  });

  it('reports assessment content that no longer matches the source questions', () => {
    const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
    const tampered = {
      ...draft,
      diagnosticTest: {
        ...draft.diagnosticTest,
        questions: draft.diagnosticTest.questions.map((question, index) => index === 0
          ? { ...question, correctAnswer: 'Đáp án khác nguồn.' }
          : question),
      },
      knowledgeUnits: draft.knowledgeUnits.map((unit) => ({
        ...unit,
        quickCheck: {
          ...unit.quickCheck,
          questions: unit.quickCheck.questions.map((question, index) => index === 0
            ? { ...question, prompt: 'Câu hỏi khác nguồn.' }
            : question),
        },
      })),
      exitTicket: {
        ...draft.exitTicket,
        questions: draft.exitTicket.questions.map((question, index) => index === 1
          ? { ...question, correctAnswer: 'Đáp án exit khác nguồn.' }
          : question),
      },
    };
    const audit = auditLesson(tampered, '10-5-31');
    expect(audit.passed).toBe(false);
    expect(audit.issues.some((i) => i.code === 'DIAGNOSTIC_NOT_FROM_SOURCE')).toBe(true);
    expect(audit.issues.some((i) => i.code === 'QUICK_CHECK_NOT_FROM_SOURCE')).toBe(true);
    expect(audit.issues.some((i) => i.code === 'EXIT_TICKET_NOT_FROM_SOURCE')).toBe(true);
  });

  it('reports a lesson with no knowledge unit instead of letting it pass by count checks', () => {
    const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
    const audit = auditLesson({ ...draft, knowledgeUnits: [] }, '10-5-31');
    expect(audit.passed).toBe(false);
    expect(audit.issues.some((i) => i.code === 'KNOWLEDGE_UNIT_MISSING')).toBe(true);
  });
  });

  // ── Pure: sequential order ───────────────────────────────────────────

  describe('sequential publication order', () => {
    it('publishes in sourceKey metadata order', async () => {
      const publishedOrder: string[] = [];
      const save: SaveCallback = async (lesson) => {
        const key = lesson.curriculumRef?.lessonCode ?? lesson.id;
        publishedOrder.push(key);
      };

      const existingLessons = new Map<string, AdaptiveLesson>();
      const result = await publishSequentially({
        existingLessons,
        teacherId: 'teacher-seq',
        save,
      });

      expect(result).toHaveLength(48);
      expect(publishedOrder).toHaveLength(48);

      // Verify order matches getAllSourceKeys()
      const expectedOrder = getAllSourceKeys();
      expect(publishedOrder).toEqual(expectedOrder);
    });
  });

  // ── Pure: error isolation ────────────────────────────────────────────

  describe('error isolation', () => {
    it('continues publishing after one lesson fails save', async () => {
      const publishedOrder: string[] = [];
      let callCount = 0;
      const save: SaveCallback = async (lesson) => {
        callCount++;
        if (callCount === 5) {
          throw new Error('Simulated save failure');
        }
        publishedOrder.push(lesson.curriculumRef?.lessonCode ?? lesson.id);
      };

      const existingLessons = new Map<string, AdaptiveLesson>();
      const result = await publishSequentially({
        existingLessons,
        teacherId: 'teacher-error',
        save,
      });

      // 48 results: 47 published + 1 error
      expect(result).toHaveLength(48);
      const stats = summarizeReports(result);
      expect(stats.published).toBe(47);
      expect(stats.errors).toBe(1);

      // The 5th key should be the error
      const errorReport = result.find((r) => r.status === 'error');
      expect(errorReport).toBeDefined();
      expect(errorReport?.sourceKey).toBe(getAllSourceKeys()[4]);

      // Remaining lessons still published
      expect(publishedOrder).toHaveLength(47);
    });

    it('continues after audit failure on one lesson', async () => {
      const publishedOrder: string[] = [];
      const save: SaveCallback = async (lesson) => {
        publishedOrder.push(lesson.curriculumRef?.lessonCode ?? lesson.id);
      };

      // Create a map with one tampered lesson
      const existingLessons = new Map<string, AdaptiveLesson>();
      const tamperedDraft = buildCanonicalDraft('10-5-31', 'teacher-1');
      tamperedDraft.curriculumRef = { ...tamperedDraft.curriculumRef, lessonCode: 'WRONG' };
      existingLessons.set('10-5-31', tamperedDraft);

      const result = await publishSequentially({
        existingLessons,
        teacherId: 'teacher-audit-error',
        save,
      });

      expect(result).toHaveLength(48);
      const stats = summarizeReports(result);
      // 10-5-31 should fail audit, rest should publish
      expect(stats.published).toBe(47);
      expect(stats.failed).toBe(1);
      const failedReport = result.find((r) => r.sourceKey === '10-5-31');
      expect(failedReport?.status).toBe('audit_failed');
      expect(failedReport?.issues.some((i) => i.code === 'SOURCE_KEY_MISMATCH' || i.code === 'FOREIGN_SOURCE_IDENTITY')).toBe(true);
    });
  });

  // ── Pure: skip published ─────────────────────────────────────────────

  describe('skip published', () => {
    it('skips already-published lessons', async () => {
      const publishedOrder: string[] = [];
      const save: SaveCallback = async (lesson) => {
        publishedOrder.push(lesson.curriculumRef?.lessonCode ?? lesson.id);
      };

      // Pre-publish 3 lessons
      const existingLessons = new Map<string, AdaptiveLesson>();
      for (const key of ['10-5-31', '10-5-37', '11-6-35']) {
        const draft = buildCanonicalDraft(key, 'teacher-1');
        existingLessons.set(key, { ...draft, status: 'published' });
      }

      const result = await publishSequentially({
        existingLessons,
        teacherId: 'teacher-skip',
        save,
      });

      expect(result).toHaveLength(48);
      const stats = summarizeReports(result);
      expect(stats.skipped).toBe(3);
      expect(stats.published).toBe(45);

      // Published lessons should not include the 3 skipped
      expect(publishedOrder).not.toContain('10-5-31');
      expect(publishedOrder).not.toContain('10-5-37');
      expect(publishedOrder).not.toContain('11-6-35');
    });

  it('always skips already-published lessons so rerun cannot overwrite them', async () => {
      const publishedOrder: string[] = [];
      const save: SaveCallback = async (lesson) => {
        publishedOrder.push(lesson.curriculumRef?.lessonCode ?? lesson.id);
      };

      // Pre-publish 1 lesson
      const existingLessons = new Map<string, AdaptiveLesson>();
      const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
      existingLessons.set('10-5-31', { ...draft, status: 'published' });

      const result = await publishSequentially({
      existingLessons,
      teacherId: 'teacher-noskip',
      save,
    });

      const stats = summarizeReports(result);
      expect(stats.skipped).toBe(1);
      expect(stats.published).toBe(47);
      expect(publishedOrder).not.toContain('10-5-31');
    });
  });

  it('normalizes an existing draft to the canonical searchable title before publishing', async () => {
    const existing = buildCanonicalDraft('10-5-31', 'teacher-1');
    const legacyTitle = `${existing.title} · V4`;
    const existingLessons = new Map<string, AdaptiveLesson>([
      ['10-5-31', { ...existing, title: legacyTitle }],
    ]);
    let saved: AdaptiveLesson | undefined;

    const result = await publishSequentially({
      existingLessons,
      teacherId: 'teacher-1',
      sourceKeys: ['10-5-31'],
      save: async (lesson) => { saved = lesson; },
    });

    expect(result[0]?.status).toBe('published');
    expect(saved?.title).toBe(getBanToanV4DisplayTitle('10-5-31'));
  });

  // ── Pure: block foreign/malformed content ────────────────────────────

  describe('block foreign/malformed content', () => {
  it('blocks lesson with foreign curriculum identity', async () => {
      const save: SaveCallback = async () => {};

      const existingLessons = new Map<string, AdaptiveLesson>();
      const foreignDraft = buildCanonicalDraft('10-5-31', 'teacher-1');
      foreignDraft.curriculumRef = {
        ...foreignDraft.curriculumRef,
        lessonCode: 'FOREIGN-KEY',
      };
      existingLessons.set('10-5-31', foreignDraft);

      const result = await publishSequentially({
        existingLessons,
        teacherId: 'teacher-foreign',
        save,
      });

      const report10_5_31 = result.find((r) => r.sourceKey === '10-5-31');
      expect(report10_5_31?.status).toBe('audit_failed');
    expect(report10_5_31?.issues.some((i) => i.code === 'FOREIGN_SOURCE_IDENTITY')).toBe(true);
  });

  it('blocks a lesson owned by a different teacher instead of overwriting it', async () => {
    const save: SaveCallback = async () => { throw new Error('save must not be called'); };
    const existingLessons = new Map<string, AdaptiveLesson>();
    const foreignOwnerDraft = buildCanonicalDraft('10-5-31', 'teacher-other');
    existingLessons.set('10-5-31', foreignOwnerDraft);

    const result = await publishSequentially({
      existingLessons,
      teacherId: 'teacher-current',
      save,
      sourceKeys: ['10-5-31'],
    });

    expect(result[0]?.status).toBe('audit_failed');
    expect(result[0]?.issues.some((i) => i.code === 'FOREIGN_TEACHER_IDENTITY')).toBe(true);
  });

    it('creates canonical draft when no existing lesson', async () => {
      const save: SaveCallback = async () => {};

      const existingLessons = new Map<string, AdaptiveLesson>();
      // Don't add anything — all lessons are new
      const result = await publishSequentially({
        existingLessons,
        teacherId: 'teacher-new',
        save,
      });

      // All 48 should be published (new canonical drafts)
      const stats = summarizeReports(result);
      expect(stats.published).toBe(48);
    });

    it('blocks lesson with tampered content that fails audit', async () => {
      const save: SaveCallback = async () => {};

      const existingLessons = new Map<string, AdaptiveLesson>();
      const tampered = buildCanonicalDraft('10-5-31', 'teacher-1');
      // Tamper: remove diagnostic questions
      tampered.diagnosticTest = { ...tampered.diagnosticTest, questions: [] };
      existingLessons.set('10-5-31', tampered);

      const result = await publishSequentially({
      existingLessons,
      teacherId: 'teacher-1',
      save,
      });

      const report = result.find((r) => r.sourceKey === '10-5-31');
      expect(report?.status).toBe('audit_failed');
      expect(report?.issues.some((i) => i.code === 'DIAGNOSTIC_UNDER_5')).toBe(true);
    });
  });

  // ── Pure: summarizeReports ───────────────────────────────────────────

  describe('summarizeReports', () => {
    it('counts all statuses correctly', () => {
      const result = summarizeReports([
        { sourceKey: 'a', status: 'published', issues: [] },
        { sourceKey: 'b', status: 'published', issues: [] },
        { sourceKey: 'c', status: 'skipped_already_published', issues: [] },
        { sourceKey: 'd', status: 'audit_failed', issues: [{ code: 'X', message: 'Y' }] },
        { sourceKey: 'e', status: 'error', issues: [{ code: 'Z', message: 'W' }] },
      ]);
      expect(result).toEqual({
        total: 5,
        published: 2,
        skipped: 1,
        failed: 1,
        errors: 1,
      });
    });
  });
});
