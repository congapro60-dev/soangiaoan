import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentAssignmentView, SubmissionDoc } from '../../../lib/classroom/types';
const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[] }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: (initial: unknown) => {
  const index = state.index++;
  return [index < state.values.length ? state.values[index] : typeof initial === 'function' ? (initial as () => unknown)() : initial, () => undefined];
} }));
import { ParentAssignmentWorkspace, shouldPollParentDetail } from './ParentAssignmentWorkspace';
const assignment = { id: 'a', title: 'Bài của con', type: 'upload', createdAt: '', isOpen: true } as StudentAssignmentView;
beforeEach(() => { state.index = 0; });
it('PH giữ trang ảnh xác nhận sau công bố để đọc được dấu trên ảnh mới', () => {
  const image = 'https://example.test/clarified.jpg';
  const submission = { id: 's', studentId: 'child', fileUrls: ['https://example.test/original.jpg'], createdAt: '',
    grade: { teacherApproved: true, questionResults: [{ questionNumber: 'Câu 1', studentAnswer: '2', status: 'incorrect',
      clarify: { state: 'done', photoUrls: [image] }, photoMarks: [{ imageUrl: image, imageIndex: 1, x: .1, y: .1, width: .2, height: .2, confidence: .9 }] }] } } as SubmissionDoc;
  state.values = [[assignment], [submission], '', 1, { assignment, submissions: [submission] }, 'a', null, '', false, 0];
  const html = renderToStaticMarkup(<ParentAssignmentWorkspace credentials={{ role: 'parent', joinCode: 'private', studentId: 'child', pin: 'secret' }} />);
  expect(html).toContain('2/2');
  expect(html).not.toContain('secret');
});
it('PH có thể tải lại cùng bài sau lỗi tạm thời', () => {
  state.values = [[assignment], [], '', 1, undefined, 'a', null, 'Mất mạng', false, 0];
  const html = renderToStaticMarkup(<ParentAssignmentWorkspace credentials={{ role: 'parent', joinCode: 'private', studentId: 'child', pin: 'secret' }} />);
  expect(html).toContain('Thử tải bài lại');
});
it('bài online không hiện đường nộp ảnh hộ ở danh sách hoặc chi tiết', () => {
  const online = { ...assignment, deliveryMode: 'online' as const };
  state.values = [[online], [], '', 1, { assignment: online, submissions: [] }, 'a', '', '', false, 0];
  const html = renderToStaticMarkup(<ParentAssignmentWorkspace credentials={{ role: 'parent', joinCode: 'private', studentId: 'child', pin: 'secret' }} />);
  expect(html).not.toContain('Nộp ảnh hộ');
  expect(html).not.toContain('Nộp bài hộ con');
  expect(html).not.toContain('Chọn tệp bài làm');
});
it('PH sees only published hand-marked files and can submit a correction under parent credentials', () => {
  const submission = { id:'s',studentId:'child',classId:'c',teacherId:'t',assignmentId:'a',status:'graded',fileUrls:[],note:'',createdAt:'',updatedAt:'',grade:{score:8,maxScore:10,teacherApproved:true,feedback:'',strengths:[],weaknesses:[],gradedAt:''},handMarkedPublished:true,handMarkedEvidence:{id:'r',files:[{id:'f',name:'Đã chấm.pdf',mimeType:'application/pdf',size:10,kind:'pdf'}],note:'Bản giấy',submittedBy:{role:'teacher',studentId:'child',at:''},createdAt:''} } as unknown as SubmissionDoc;
  const assignmentHandMarked = { ...assignment, id:'a' };
  state.values = [[assignmentHandMarked], [submission], '', 1, { assignment: assignmentHandMarked, submissions:[submission] }, 'a', null, '', false, 0];
  const html = renderToStaticMarkup(<ParentAssignmentWorkspace credentials={{role:'parent',joinCode:'private',studentId:'child',pin:'secret'}}/>);
  expect(html).toContain('Bản chấm tay của giáo viên'); expect(html).toContain('Đã chấm.pdf'); expect(html).toContain('Nộp hộ bài chữa / làm lại'); expect(html).not.toContain('secret');
});

it('bài GV nộp hộ đã chấm tay: phụ huynh CHƯA được xem ảnh cho tới khi thầy cô bấm công bố', () => {
  const base = { id:'s',studentId:'child',classId:'c',teacherId:'t',assignmentId:'a',status:'graded',fileUrls:['https://storage.test/bai-cham-tay.jpg'],note:'',createdAt:'',updatedAt:'',grade:{score:8,maxScore:10,teacherApproved:true,feedback:'',strengths:[],weaknesses:[],gradedAt:''} };
  const chuaCongBo = { ...base, handMarkedPaper:true, handMarkedPublished:false } as unknown as SubmissionDoc;
  const daCongBo = { ...base, handMarkedPaper:true, handMarkedPublished:true } as unknown as SubmissionDoc;
  const assignmentHandMarked = { ...assignment, id:'a' };
  state.values = [[assignmentHandMarked], [chuaCongBo], '', 1, { assignment: assignmentHandMarked, submissions:[chuaCongBo] }, 'a', null, '', false, 0];
  const html = renderToStaticMarkup(<ParentAssignmentWorkspace credentials={{role:'parent',joinCode:'private',studentId:'child',pin:'secret'}}/>);
  expect(html).toContain('Thầy cô chưa công bố ảnh bài chấm cho phụ huynh xem');
  expect(html).not.toContain('bai-cham-tay.jpg');
  state.values = [[assignmentHandMarked], [daCongBo], '', 1, { assignment: assignmentHandMarked, submissions:[daCongBo] }, 'a', null, '', false, 0];
  state.index = 0;
  const html2 = renderToStaticMarkup(<ParentAssignmentWorkspace credentials={{role:'parent',joinCode:'private',studentId:'child',pin:'secret'}}/>);
  expect(html2).toContain('bai-cham-tay.jpg');
  expect(html2).not.toContain('Thầy cô chưa công bố');
});

describe('phụ huynh · tự làm mới khi chờ chấm', () => {
  const sub = (id: string, createdAt: string, status: SubmissionDoc['status']) => ({ id, createdAt, status } as SubmissionDoc);
  it('chỉ xét lượt mới nhất: bài cũ kẹt "Đã nộp" không làm trang hỏi máy chủ mãi', () => {
    expect(shouldPollParentDetail([sub('cu', '2026-10-01T00:00:00Z', 'submitted'), sub('moi', '2026-10-02T00:00:00Z', 'graded')])).toBe(false);
    expect(shouldPollParentDetail([sub('cu', '2026-10-01T00:00:00Z', 'graded'), sub('moi', '2026-10-02T00:00:00Z', 'grading')])).toBe(true);
    expect(shouldPollParentDetail([])).toBe(false);
  });
});
