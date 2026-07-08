import { describe, expect, it } from 'vitest';
import { runAdaptivePipeline, validateAdaptiveLessonPublishReadiness } from './adaptiveFromLessonPlan';
import type { AdaptiveLessonSource } from './adaptiveFromLessonPlan';
import type { AdaptiveLesson } from './types';

const buildMinimalLesson = (): AdaptiveLesson => {
  const objectiveId = 'obj-1';
  const question = {
    id: 'q-1',
    type: 'multiple_choice' as const,
    prompt: 'Tính giá trị của biểu thức $2+2$ trong tình huống đã cho.',
    options: ['$4$', '$-4$', '19', '$S_{10}$'],
    correctAnswer: '$4$',
    explanation: 'Vì $2+2=4$, nên đáp án đúng là $4$.',
    objectiveIds: [objectiveId],
    difficulty: 'easy' as const,
    points: 1,
  };

  return {
    id: 'lesson-1',
    title: 'Bài kiểm tra publish readiness',
    subjectId: 'math',
    grade: '10',
    durationMinutes: 40,
    status: 'draft',
    teacherId: 'teacher-1',
    createdAt: '2026-06-11T00:00:00.000Z',
    updatedAt: '2026-06-11T00:00:00.000Z',
    preparation: {
      readingInstructions: 'Đọc lại định nghĩa và ví dụ trong giáo án nguồn.',
      guidingQuestions: ['Biểu thức đã cho yêu cầu phép tính nào?'],
      estimatedMinutes: 5,
    },
    fiveStepFlow: {
      steps: [
        { id: 's1', name: 'Kết nối', purpose: 'Khởi động', estimatedMinutes: 3, teacherRole: 'Nêu vấn đề', studentAction: 'Trả lời', systemSupport: 'Hiển thị' },
      ],
    },
    objectives: [{
      id: objectiveId,
      code: 'OBJ1',
      title: 'Tính được giá trị biểu thức đơn giản',
      description: 'Học sinh tính được giá trị biểu thức có số liệu cụ thể.',
      bloomLevel: 'apply',
      masteryThreshold: 0.7,
      prerequisiteObjectiveIds: [],
      commonMisconceptions: [],
    }],
    knowledgeUnits: [],
    diagnosticTest: {
      id: 'diag-1',
      title: 'Chẩn đoán đầu giờ',
      purpose: 'diagnostic',
      durationMinutes: 7,
      questions: [question],
    },
    exitTicket: {
      id: 'exit-1',
      title: 'Vé ra cửa',
      purpose: 'exit_ticket',
      durationMinutes: 5,
      questions: [question],
    },
  };
};

describe('validateAdaptiveLessonPublishReadiness', () => {
  it('accepts short math and numeric multiple-choice options when they are real answer choices', () => {
    const issues = validateAdaptiveLessonPublishReadiness(buildMinimalLesson());

    expect(issues.filter((issue) => issue.code === 'invalid_question_options')).toEqual([]);
  });
});

// ─── Regression: nội dung GIÁO VIÊN ĐÃ DUYỆT (bản rà soát) phải tới ĐÚNG prompt sinh bài ───
// Trước fix: blueprint slice(0,4000), unit slice(0,2500), assessments/practice không nhận gì
// → mục 3 (pre-test), mục 6 (mảnh), mục 7 (luyện tập) đã duyệt bị cắt cụt/vứt bỏ.
describe('runAdaptivePipeline — bám sát bản rà soát đã duyệt', () => {
  // Bản rà soát giả theo đúng định dạng 11 mục, có "độn" mục 2 dài để mục 3/6/7 nằm NGOÀI 4000 ký tự đầu.
  const padding = 'Nội dung độn giao diện. '.repeat(200); // ~4800 ký tự
  const reviewedPlan = `# Ba đường Conic

## 1. Nhận xét rà soát nhanh
- Giáo án nguồn thuộc loại: giáo án thường

## 2. Thiết kế UI/UX bài học
${padding}

## 3. Bước 0 — Pre-test chẩn đoán 5 phút
| Câu | Nội dung |
| 1 | PRETEST_DA_DUYET_cau_elip_tieu_cu |

## 4. Quy tắc phân tuyến sau Pre-test
- Điểm 5/5 → Challenge

## 5. Bước 1 — Khởi động & Gắn kết
- Câu chuyện: KHOI_DONG_DA_DUYET_quy_dao_thien_the

## 6. Bước 2 — Kiến tạo tri thức Socratic
### Mảnh kiến thức 1: Định nghĩa Elip và hệ thức a2=b2+c2
- Câu hỏi dẫn dắt: MANH_ELIP_DA_DUYET_cau_hoi_MF1_MF2
- Học liệu trực quan (LOẠI + MÔ TẢ): SVG kéo điểm M trên elip

### Mảnh kiến thức 2: Tâm sai của ba đường Conic
- Câu hỏi dẫn dắt: MANH_TAMSAI_DA_DUYET_so_sanh_e
- Học liệu trực quan (LOẠI + MÔ TẢ): đồ thị động theo e

## 7. Bước 3 — Áp dụng luyện tập thích ứng
### Mức Trung bình
- Phần 1: LUYENTAP_DA_DUYET_tinh_tieu_cu

## 8. Bước 4 — Mở rộng thực tiễn
- Bài toán: chảo parabol

## 9. Bước 5 — Tổng kết và Time-Filler
- Checklist mục tiêu
`;

  const source: AdaptiveLessonSource = {
    title: 'Ba đường Conic',
    content: 'Giáo án nguồn về ba đường conic trong mặt phẳng tọa độ.',
    grade: '10',
    week: '30',
    sourceLabel: 'Test',
  };

  const blueprintJson = JSON.stringify({
    title: 'Ba đường Conic',
    objectives: [
      { title: 'Nhận biết elip', bloom: 'understand', threshold: 0.7 },
      { title: 'Tính tiêu cự', bloom: 'apply', threshold: 0.75 },
      { title: 'So sánh tâm sai', bloom: 'analyze', threshold: 0.75 },
    ],
    engage: { story_hook: '' },
    unit_outline: [
      { title: 'Định nghĩa Elip và hệ thức a2=b2+c2', objective_index: 0 },
      { title: 'Tâm sai của ba đường Conic', objective_index: 2 },
      { title: 'Phương trình chính tắc', objective_index: 1 },
    ],
  });

  it('mục 3/6/7 đã duyệt phải xuất hiện trong đúng prompt; block mảnh khớp đúng mảnh', async () => {
    const prompts: string[] = [];
    const callAIFn = async (prompt: string): Promise<string> => {
      prompts.push(prompt);
      if (prompt.includes('Tạo khung bài học phân hoá')) return blueprintJson;
      return '{}'; // các bước khác: trả JSON rỗng — pipeline degrade an toàn
    };

    // generateSimulations: false → không sinh sim; units không có tikz_code → không fetch Kroki.
    await runAdaptivePipeline(source, reviewedPlan, callAIFn, 'teacher-1', undefined, { generateSimulations: false });

    const blueprintPrompt = prompts.find(p => p.includes('Tạo khung bài học phân hoá')) || '';
    const assessmentsPrompt = prompts.find(p => p.includes('pre-test và exit ticket')) || '';
    const practicePrompt = prompts.find(p => p.includes('bộ luyện tập 3 gói')) || '';
    const unitElipPrompt = prompts.find(p => p.includes('MẢNH KIẾN THỨC 1/') && p.includes('Định nghĩa Elip')) || '';
    const unitTamsaiPrompt = prompts.find(p => p.includes('MẢNH KIẾN THỨC 2/') && p.includes('Tâm sai')) || '';

    // Blueprint nhận danh sách mảnh đã duyệt (mục 6) dù nó nằm ngoài 4000 ký tự đầu
    expect(blueprintPrompt).toContain('MANH_ELIP_DA_DUYET');
    expect(blueprintPrompt).toContain('KHOI_DONG_DA_DUYET');
    // Assessments nhận bảng pre-test đã duyệt (mục 3)
    expect(assessmentsPrompt).toContain('PRETEST_DA_DUYET');
    // Practice nhận phần luyện tập đã duyệt (mục 7)
    expect(practicePrompt).toContain('LUYENTAP_DA_DUYET');
    // Mỗi mảnh nhận ĐÚNG block của nó, không phải đầu bản rà soát hay block mảnh khác
    expect(unitElipPrompt).toContain('MANH_ELIP_DA_DUYET');
    expect(unitElipPrompt).not.toContain('MANH_TAMSAI_DA_DUYET');
    expect(unitTamsaiPrompt).toContain('MANH_TAMSAI_DA_DUYET');
    expect(unitTamsaiPrompt).not.toContain('MANH_ELIP_DA_DUYET');
  });
});
