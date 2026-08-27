import { describe, expect, it } from 'vitest';
import { getG10P31V4Contract } from '../../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import { projectStudent, projectTeacher, projectTv } from './lessonProjection';
import type { PublicTvState, StudentLanguageView } from './types';

const PUBLIC_STATE: PublicTvState = {
  cueId: 'P16',
  screenId: 'S4',
  status: 'running',
  showStats: true,
  participantCount: 32,
  submittedCount: 21,
  routeCounts: { M: 8, S: 17, C: 7 },
  errorCategoryCounts: {
    Conceptual: 2,
    Algebraic: 4,
    Logical: 11,
    'Missing condition': 4,
  },
  groupProgress: { G1: 0.5, G2: 0.75 },
  updatedAt: 1_787_827_200_000,
};

const STUDENT_LANGUAGE_VIEW: StudentLanguageView = {
  language: 'en',
  supportMode: 'bilingual',
  showGlossary: true,
  showSentenceFrames: true,
  curriculumBridgeIds: ['bridge-halfplane'],
};

describe('lessonProjection', () => {
  it('projects TV data without private teacher, student, language, support, or raw response data', () => {
    const contract = getG10P31V4Contract();
    const tv = projectTv(contract, 'P16', {
      ...PUBLIC_STATE,
      studentId: 'student-private-01',
      rawText: 'Em chọn tiếng Anh vì em cần hỗ trợ riêng',
      languageChoice: 'en',
      languageSupportPlan: 'tier intensive private support plan',
      privateReason: 'private grouping reason',
    });
    const json = JSON.stringify(tv);

    expect(json).not.toContain(contract.timeline.find((block) => block.id === 'P16')?.teacherScript);
    expect(json).not.toContain('private support plan');
    expect(json).not.toContain('languageChoice');
    expect(json).not.toContain('student-private-01');
    expect(json).not.toContain('Em chọn tiếng Anh');
    expect(json).not.toContain('private grouping reason');
  });

  it('projects scaffold for students and script for teachers', () => {
    const contract = getG10P31V4Contract();
    const student = projectStudent(contract, 'P20', STUDENT_LANGUAGE_VIEW);
    const teacher = projectTeacher(contract, 'P20');

    expect(student.scaffoldSets.map((set) => set.id)).toEqual(['scaffold-M', 'scaffold-S', 'scaffold-C']);
    expect(student.languageView).toEqual(STUDENT_LANGUAGE_VIEW);
    expect(teacher.script).toContain('cùng câu hỏi lớn');
    expect(teacher.board.large).toContain('3 tiêu chí');
  });
});
