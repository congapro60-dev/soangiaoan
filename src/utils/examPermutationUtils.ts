import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ExamQuestion } from '../types';

export const shuffleExamQuestions = (questions: ExamQuestion[], permutationsCount: number = 4) => {
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const permutations: { code: string; questions: ExamQuestion[] }[] = [];

  for (let i = 1; i <= permutationsCount; i++) {
    const code = (100 + i).toString();
    const shuffledQuestions = shuffleArray(questions).map(q => {
      if (q.type !== 'multiple_choice' || !q.options || q.options.length === 0) {
        return { ...q };
      }

      // Xác định phương án đúng hiện tại
      const correctIndex = q.options.findIndex(opt => opt.startsWith(q.correctAnswer + '.') || opt.startsWith(q.correctAnswer + ' '));
      const correctContent = correctIndex >= 0 ? q.options[correctIndex] : null;

      const shuffledOptions = shuffleArray(q.options);
      
      let newCorrectAnswer = q.correctAnswer;
      const newOptions = shuffledOptions.map((opt, idx) => {
        const label = String.fromCharCode(65 + idx); // A, B, C, D
        const content = opt.replace(/^[A-D][. ]\s*/, '');
        if (opt === correctContent) {
          newCorrectAnswer = label;
        }
        return `${label}. ${content}`;
      });

      return {
        ...q,
        options: newOptions,
        correctAnswer: newCorrectAnswer
      };
    });

    permutations.push({ code, questions: shuffledQuestions });
  }

  return permutations;
};

export const exportExamZip = async (
  questions: ExamQuestion[], 
  baseTitle: string, 
  permutationsCount: number = 4,
  showToast: (msg: string, type?: string) => void
) => {
  if (!questions || questions.length === 0) {
    showToast('Không có câu hỏi để xuất', 'warning');
    return;
  }

  showToast(`Đang tạo ${permutationsCount} mã đề...`, 'info');
  const permutations = shuffleExamQuestions(questions, permutationsCount);
  
  const zip = new JSZip();
  const folder = zip.folder(`Bo_De_${baseTitle || 'Thi'}`.replace(/\s+/g, '_'));

  for (const { code, questions: shuffled } of permutations) {
    const examLines: string[] = [
      `SỞ GIÁO DỤC VÀ ĐÀO TẠO`,
      `TRƯỜNG .................`,
      `ĐỀ KIỂM TRA`,
      `MÃ ĐỀ: ${code}`,
      `Thời gian làm bài: 45 phút`,
      `---------------------------------`,
      ``
    ];
    
    const answerLines: string[] = [
      `ĐÁP ÁN MÃ ĐỀ: ${code}`,
      `---------------------------------`,
      ``
    ];

    shuffled.forEach((q, idx) => {
      examLines.push(`Câu ${idx + 1}: ${q.content}`);
      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => examLines.push(opt));
      }
      examLines.push('');
      answerLines.push(`Câu ${idx + 1}: ${q.correctAnswer}`);
    });

    const docName = `Ma_De_${code}.txt`;
    const ansName = `Dap_An_${code}.txt`;
    
    folder?.file(docName, examLines.join('\n'));
    folder?.file(ansName, answerLines.join('\n'));
  }

  try {
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${baseTitle ? baseTitle.replace(/\s+/g, '_') : 'De_Thi'}_Zip.zip`);
    showToast('Tải ZIP thành công!', 'success');
  } catch (error) {
    console.error(error);
    showToast('Lỗi khi tạo file ZIP', 'error');
  }
};
