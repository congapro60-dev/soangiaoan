export interface TeacherIdeaInput {
  subject: string;
  grade: string;
  title: string;
  archetype: 'knowledge_formation' | 'practice_review' | 'application_transfer';
  durationMinutes: number;
  must: string;
  should: string;
  could: string;
  content: string;
  interaction: string;
  differentiation: string;
}

const archetypeLabel: Record<TeacherIdeaInput['archetype'], string> = {
  knowledge_formation: 'Hình thành kiến thức',
  practice_review: 'Luyện tập / ôn tập',
  application_transfer: 'Vận dụng / chuyển giao',
};

export const buildTeacherIdeaSource = (input: TeacherIdeaInput): string => [
  `Môn: ${input.subject.trim()}`,
  `Lớp: ${input.grade.trim()}`,
  `Tên bài: ${input.title.trim()}`,
  `Loại tiết: ${archetypeLabel[input.archetype]}`,
  `Thời lượng: ${input.durationMinutes} phút`,
  '',
  'Mục tiêu MUST:', input.must.trim(),
  'Mục tiêu SHOULD:', input.should.trim(),
  'Mục tiêu COULD:', input.could.trim(),
  '',
  'Nội dung giáo viên cung cấp:', input.content.trim(),
  '',
  'Tương tác mong muốn:', input.interaction.trim(),
  'Phân hóa mong muốn:', input.differentiation.trim(),
].join('\n');
