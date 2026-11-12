import { describe, expect, it } from 'vitest';
import { projectParentView } from '../_submission-actors';
import { assignmentSolutionInput } from '../_assignment-solutions';
import { workedSolutionVersion } from '../_worked-solutions';
import type { ParentGuide, StudentAssignmentView } from '../../src/lib/classroom/types';

const view = { id: 'a1', title: 'Bài 1' } as unknown as StudentAssignmentView;
const base = { id: 'a1', classId: 'c1', teacherId: 't1', title: 'Bài 1', answerKey: '42', sourceText: 'Tính 6 × 7', questionCatalog: [] };
const versionOf = (data: Record<string, unknown>, examCode = '') => workedSolutionVersion(assignmentSolutionInput(data as never, examCode));
const guideFor = (version: string, status: ParentGuide['status'] = 'published', examCode?: string): ParentGuide => ({
  version, status, generatedAt: 't', publishedAt: 't', goal: 'Hiểu phép nhân', askFirst: ['Con nhớ bảng nhân không?'],
  steps: ['Đọc đề', 'Nhân 6 với 7'], commonMistakes: ['Nhầm phép cộng'], askTeacher: 'Khi con vẫn sai sau hai lần thử.',
  ...(examCode ? { examCode } : {}),
});

describe('projectParentView: hướng dẫn phụ huynh không rò sang học sinh', () => {
  it('phụ huynh thấy bản đã đăng khớp nội dung hiện tại, không kèm trường nội bộ', () => {
    const data = { ...base, parentGuide: guideFor(versionOf(base)) };
    const shown = projectParentView(view, data, 'parent');
    expect(shown.parentGuidePublic?.goal).toBe('Hiểu phép nhân');
    expect(shown.parentGuidePublic).not.toHaveProperty('version');
  });
  it('học sinh không nhận hướng dẫn, kể cả bản đã đăng', () => {
    const data = { ...base, parentGuide: guideFor(versionOf(base)) };
    expect(projectParentView(view, data, 'student')).not.toHaveProperty('parentGuidePublic');
  });
  it('bản nháp không hiện với phụ huynh', () => {
    const data = { ...base, parentGuide: guideFor(versionOf(base), 'draft') };
    expect(projectParentView(view, data, 'parent')).not.toHaveProperty('parentGuidePublic');
  });
  it('bài đổi đáp án thì bản đã đăng bị ẩn cho tới khi soạn lại', () => {
    const data = { ...base, parentGuide: guideFor(versionOf(base)) };
    expect(projectParentView(view, { ...data, answerKey: '43' }, 'parent')).not.toHaveProperty('parentGuidePublic');
  });
  it('bản theo mã đề kiểm đúng mã đã soạn', () => {
    const withVariants = { ...base, examVariants: [{ code: '1202', sourceText: 'Đề 1202', answerKey: '7' }, { code: '1203', sourceText: 'Đề 1203', answerKey: '8' }] };
    const data = { ...withVariants, parentGuide: guideFor(versionOf(withVariants, '1202'), 'published', '1202') };
    expect(projectParentView(view, data, 'parent').parentGuidePublic).toBeDefined();
  });
});
