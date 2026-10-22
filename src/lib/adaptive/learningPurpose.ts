export type LearningPurpose = 'preparation' | 'remediation' | 'self_paced';

export interface LearningPurposePlan {
  purpose: LearningPurpose;
  label: string;
  description: string;
}

const PLANS: Record<LearningPurpose, LearningPurposePlan> = {
  preparation: {
    purpose: 'preparation',
    label: 'Chuẩn bị trước bài',
    description: 'Quan sát, dự đoán và kiểm tra kiến thức tiền đề trong vài phút.',
  },
  remediation: {
    purpose: 'remediation',
    label: 'Ôn tập và bù lỗ hổng',
    description: 'Tìm đúng chỗ vướng, học lại mảnh cần thiết rồi làm câu tương đương.',
  },
  self_paced: {
    purpose: 'self_paced',
    label: 'Học trọn bài theo nhịp riêng',
    description: 'Học từng mảnh, dừng lại và tiếp tục khi thuận tiện.',
  },
};

export const getLearningPurposePlan = (purpose: LearningPurpose): LearningPurposePlan =>
  PLANS[purpose] || PLANS.self_paced;

export const learningPurposeOptions = Object.values(PLANS);
