import { GradingResult, GradingWarning, TemplateFile, ParsedExamBundle } from '../types';
import { gradingUtils } from './gradingUtils';

export interface SmartGradingInput {
  bundle?: ParsedExamBundle;
  examFiles?: TemplateFile[];
  studentFiles: TemplateFile[];
  settings: any;
  maxScore: number;
  onProgress?: (done: number, total: number, currentName: string) => void;
}

export interface SmartGradingResult {
  results: GradingResult[];
  warnings: GradingWarning[];
}

const buildBundleMasterContent = (bundle: ParsedExamBundle): string => {
  const mcq = bundle.questions.filter(q => q.type === 'multiple_choice');
  const tf = bundle.questions.filter(q => q.type === 'true_false');
  const sa = bundle.questions.filter(q => q.type === 'short_answer');
  const essay = bundle.questions.filter(q => q.type === 'essay');

  const parts: string[] = [`ĐỀ THI: ${bundle.title}`];

  if (mcq.length > 0) {
    parts.push('\nPHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN:');
    mcq.forEach((q, i) => {
      parts.push(`Câu ${i + 1}: ${q.content}${q.options ? '\n' + q.options.join('\n') : ''} — Đáp án: ${q.correctAnswer || '?'}`);
    });
  }
  if (tf.length > 0) {
    parts.push('\nPHẦN II. ĐÚNG/SAI:');
    tf.forEach((q, i) => {
      parts.push(`Câu ${mcq.length + i + 1}: ${q.content}${q.options ? '\n' + q.options.join('\n') : ''} — Đáp án: ${q.correctAnswer || '?'}`);
    });
  }
  if (sa.length > 0) {
    parts.push('\nPHẦN III. TRẢ LỜI NGẮN:');
    sa.forEach((q, i) => {
      parts.push(`Câu ${mcq.length + tf.length + i + 1}: ${q.content} — Đáp án: ${q.correctAnswer || '?'}`);
    });
  }
  if (essay.length > 0) {
    parts.push('\nPHẦN IV. TỰ LUẬN:');
    essay.forEach((q, i) => {
      parts.push(`Câu ${mcq.length + tf.length + sa.length + i + 1} (${q.points}đ): ${q.content}`);
    });
  }

  parts.push('\nĐÁP ÁN:');
  bundle.questions.forEach(q => {
    if (q.correctAnswer) parts.push(`${q.id}: ${q.correctAnswer}`);
  });

  return parts.join('\n');
};

export const runSmartGrading = async (input: SmartGradingInput): Promise<SmartGradingResult> => {
  const { bundle, examFiles, studentFiles, settings, maxScore, onProgress } = input;
  const warnings: GradingWarning[] = [];
  const results: GradingResult[] = [];

  // Step 1 — Build master content
  let masterContent = '';
  if (bundle) {
    masterContent = buildBundleMasterContent(bundle);
  } else if (examFiles && examFiles.length > 0) {
    masterContent = examFiles.map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n');
  } else {
    warnings.push({ level: 'error', message: 'Chưa cung cấp đề thi hoặc đáp án' });
    return { results, warnings };
  }

  // Step 2 — Validate student files
  if (studentFiles.length === 0) {
    warnings.push({ level: 'error', message: 'Chưa upload bài làm học sinh' });
    return { results, warnings };
  }

  // Step 3 — Grade each student file sequentially
  const masterFile: TemplateFile = {
    id: 'smart-master',
    name: bundle ? bundle.title : (examFiles?.[0]?.name ?? 'master'),
    type: 'text',
    content: masterContent,
    category: 'test',
  };

  let done = 0;
  const total = studentFiles.length;

  for (const sf of studentFiles) {
    onProgress?.(done, total, sf.name);
    try {
      const graded = await gradingUtils.gradeSubmission(masterFile, sf, settings, maxScore);

      const name = String(graded.studentName || 'Ẩn danh');
      if (name === 'Ẩn danh') {
        warnings.push({
          level: 'warning',
          studentId: sf.name,
          message: `Không tìm thấy tên học sinh trong "${sf.name}" — đã ghi là "Ẩn danh"`,
          suggestion: 'Kiểm tra lại file bài làm',
        });
      }
      if ((graded.score ?? 0) === 0 && (graded.maxScore ?? 0) > 0) {
        warnings.push({
          level: 'info',
          studentId: sf.name,
          message: `"${name !== 'Ẩn danh' ? name : sf.name}" được 0 điểm — có thể bài làm trống hoặc không nhận diện được`,
        });
      }

      results.push({
        id: crypto.randomUUID(),
        studentName: name,
        score: graded.score ?? 0,
        maxScore: graded.maxScore ?? maxScore,
        strengths: graded.strengths ?? [],
        weaknesses: graded.weaknesses ?? [],
        improvementPlan: graded.improvementPlan ?? '',
        details: graded.details ?? '',
        status: 'completed',
        fileName: sf.name,
      });
    } catch (err) {
      warnings.push({
        level: 'error',
        studentId: sf.name,
        message: `Lỗi chấm bài "${sf.name}": ${(err as Error).message}`,
        suggestion: 'Thử lại hoặc chuyển sang chấm thủ công',
      });
    }
    done++;
  }

  // Step 4 — Post-process warnings
  const zeroCount = results.filter(r => r.score === 0).length;
  if (results.length > 0 && zeroCount / results.length > 0.5) {
    warnings.push({
      level: 'warning',
      message: `Hơn 50% học sinh được 0 điểm — kiểm tra lại đáp án`,
    });
  }

  // Detect duplicate student names (excluding 'Ẩn danh')
  const nameCount: Record<string, number> = {};
  for (const r of results) {
    if (r.studentName && r.studentName !== 'Ẩn danh') {
      nameCount[r.studentName] = (nameCount[r.studentName] ?? 0) + 1;
    }
  }
  for (const [name, count] of Object.entries(nameCount)) {
    if (count > 1) {
      warnings.push({
        level: 'warning',
        message: `Trùng tên: ${name} — xuất hiện ${count} lần`,
      });
    }
  }

  return { results, warnings };
};
