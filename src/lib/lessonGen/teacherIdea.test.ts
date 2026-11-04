import { describe, expect, it } from 'vitest';
import { buildTeacherIdeaSource } from './teacherIdea';

describe('buildTeacherIdeaSource', () => {
  it('keeps teacher-authored fields in a readable source record', () => {
    const content = buildTeacherIdeaSource({
      subject: 'Toán', grade: '11', title: 'Giới hạn của dãy số', archetype: 'knowledge_formation',
      durationMinutes: 40, must: 'Nêu được định nghĩa.', should: 'Tính được giới hạn.', could: 'Giải thích được cách chọn định lý.',
      content: 'Dãy số và các ví dụ trong giáo án.', interaction: 'Dự đoán, thảo luận cặp đôi, Exit Ticket.', differentiation: 'Luyện thêm và thử thách.',
    });

    expect(content).toContain('Tên bài: Giới hạn của dãy số');
    expect(content).toContain('Loại tiết: Hình thành kiến thức');
    expect(content).toContain('Mục tiêu MUST:\nNêu được định nghĩa.');
    expect(content).toContain('Phân hóa mong muốn:\nLuyện thêm và thử thách.');
  });
});
