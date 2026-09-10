import type { LiveCue } from '../../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues';
import type {
  Checkpoint,
  LiveLessonV4Contract,
  TimelineBlock,
  V4ResponseType,
} from './types';
import { validateV4Contract } from './validateContract';
import type {
  LiveLessonDefinition,
  LiveLessonIntent,
  LiveLessonScreen,
  LiveResponseStep,
  LiveResponseType,
} from '../types';
import { LiveLessonDefinitionError } from '../types';
import { validateLiveLessonDefinition } from '../definition';

const responseTypeMap: Record<V4ResponseType, LiveResponseType> = {
  choice: 'choice',
  text: 'text',
  boolean: 'boolean',
  route: 'route',
  hint: 'hint',
  exit_ticket: 'exit_ticket',
};

const checkpointScreenMap: Record<string, string> = {
  // IDs legacy (48 bài adapter Ban Toán)
  'cp-guiding-question': 'HS1',
  'cp-student-goal': 'HS2',
  'cp-diagnostic': 'HS3',
  'cp-ai-error': 'HS4',
  'cp-group-product': 'HS5',
  'cp-route-choice': 'HS6',
  'cp-post-check': 'HS7',
  'cp-quick-check': 'HS8',
  'cp-exit-ticket': 'HS10',
  // IDs canonical (bài thủ công P31) — nếu thiếu, cổng HS rơi về HS0 "Sẵn sàng"
  // trong lúc HS đang thực sự làm việc.
  'cp-teacher-synthesis': 'HS2',
  'cp-model': 'HS3',
  'cp-postcheck': 'HS7',
  'cp-postcheck-m': 'HS7',
  'cp-postcheck-s': 'HS7',
  'cp-postcheck-c': 'HS7',
  'cp-route': 'HS6',
};

const studentScreens: LiveLessonScreen[] = [
  { id: 'HS0', label: 'Sẵn sàng', action: 'Theo dõi TV và chờ giáo viên mở bước phản hồi.' },
  { id: 'HS1', label: 'Câu hỏi định hướng', action: 'Chọn hoặc viết điều em muốn biết từ tình huống.' },
  { id: 'HS2', label: 'Mục tiêu cá nhân', action: 'Chọn 1–2 mục tiêu và minh chứng em muốn tạo ra.' },
  { id: 'HS3', label: 'Kiểm tra điểm xuất phát', action: 'Trả lời ngắn; mở thuật ngữ hoặc khung câu khi cần.' },
  { id: 'HS4', label: 'AI Error', action: 'Tìm lỗi, phân loại, sửa lời giải và chứng minh vào vở.' },
  { id: 'HS5', label: 'Sản phẩm nhóm', action: 'Trao đổi trực tiếp; đặt thiết bị xuống khi cùng giải thích.' },
  { id: 'HS6', label: 'Tuyến M/S/C', action: 'Chọn cửa vào theo bằng chứng hiện tại; có thể đổi tuyến.' },
  { id: 'HS7', label: 'Post-check cá nhân', action: 'Tự giải dữ kiện mới và gửi bằng chứng của riêng em.' },
  { id: 'HS8', label: 'Quick check', action: 'Trả lời nhanh, đọc phản hồi và sửa một lỗi nếu có.' },
  { id: 'HS9', label: 'Tự đánh giá', action: 'Đối chiếu mục tiêu cá nhân với sản phẩm cuối tiết.' },
  { id: 'HS10', label: 'Exit ticket', action: 'Viết một kết luận có căn cứ và điều cần kiểm chứng tiếp.' },
];

const tvScreenMeta: Record<string, { label: string; title: string }> = {
  S0: { label: 'MỞ ĐẦU', title: 'BẮT ĐẦU KHI SẴN SÀNG' },
  S1: { label: 'CÂU HỎI', title: 'CÂU HỎI ĐỊNH HƯỚNG' },
  S2: { label: 'MỤC TIÊU', title: 'MỤC TIÊU DO LỚP TỔNG HỢP' },
  S3: { label: 'HÌNH THÀNH', title: 'CÔNG CỤ TOÁN HỌC' },
  S4: { label: 'TƯ DUY PHẢN BIỆN', title: 'THINK → AI → VERIFY' },
  S5: { label: 'HỢP TÁC', title: 'CÂU HỎI NHÓM' },
  S6: { label: 'PHÂN HÓA', title: 'NHIỆM VỤ CÓ LỰA CHỌN' },
  S7: { label: 'ĐÁNH GIÁ LẠI', title: 'POST-CHECK CÁ NHÂN' },
  S8: { label: 'KIỂM TRA', title: 'KIỂM TRA NHANH' },
  S9: { label: 'PHẢN TƯ', title: 'ĐỐI CHIẾU MỤC TIÊU' },
  S10: { label: 'KẾT THÚC', title: 'EXIT TICKET' },
};

function throwInvalidContract(contract: LiveLessonV4Contract): never {
  const result = validateV4Contract(contract);
  const detail = result.errors.map((error) => `${error.code}: ${error.message}`).join(' | ');
  throw new LiveLessonDefinitionError('V4_CONTRACT_INVALID', detail || 'V4 contract không hợp lệ.');
}

function getCheckpointById(contract: LiveLessonV4Contract, checkpointId: string): Checkpoint | undefined {
  return contract.checkpoints.find((checkpoint) => checkpoint.id === checkpointId);
}

function buildResponseSteps(contract: LiveLessonV4Contract): LiveResponseStep[] {
  return contract.checkpoints.map((checkpoint) => {
    const responseTypes: LiveResponseType[] = checkpoint.id === 'cp-ai-error'
      ? ['choice', 'text']
      : [responseTypeMap[checkpoint.responseType]];
    return {
      id: checkpoint.id,
      label: checkpoint.prompt,
      screenId: checkpointScreenMap[checkpoint.id] ?? 'HS0',
      responseTypes,
      ...(checkpoint.responseType === 'text' || checkpoint.responseType === 'exit_ticket' ? { maxTextLength: 500 } : {}),
    };
  });
}

function publicScreenBody(contract: LiveLessonV4Contract, screenId: string): string {
  const sourceFormulas = contract.sourceContent?.formulas?.filter(Boolean) ?? [];
  const sourceQuickChecks = contract.sourceContent?.quickChecks ?? [];
  switch (screenId) {
    case 'S0':
      return `Hôm nay: ${contract.title}\nQuan sát, đặt câu hỏi và chưa cần biết đáp án.`;
    case 'S1':
      return contract.objectives.teacherSynthesisPrompt;
    case 'S2':
      return `Mục tiêu chung\n${contract.objectives.math.map((objective) => `• ${objective.text}`).join('\n')}`;
    case 'S3':
      return `Công cụ Toán học\n${sourceFormulas.length > 0 ? sourceFormulas.join('\n') : contract.curriculumBridges.map((bridge) => bridge.example).join('\n')}`;
    case 'S4':
      return `Lời giải cần kiểm:\n${contract.aiError.faultyStatement}\n\nTìm lỗi · phân loại · sửa · chứng minh.`;
    case 'S5':
      return `Câu hỏi nhóm\n${contract.groupingCheckpoints[0]?.sharedQuestion ?? 'Cùng giải thích bằng căn cứ.'}`;
    case 'S6':
      return 'Ba cửa vào cùng một đích đến:\nM — Củng cố\nS — Chuẩn\nC — Thử thách';
    case 'S7':
      return `Tự làm dữ kiện mới\n${contract.checkpoints.find((checkpoint) => checkpoint.id === 'cp-post-check')?.prompt ?? 'Tự giải và nêu căn cứ.'}`;
    case 'S8':
      return `Kiểm tra nhanh\n${sourceQuickChecks.length > 0
        ? sourceQuickChecks.map((item, index) => `${index + 1}. ${item.question}`).join('\n')
        : contract.checkpoints.find((checkpoint) => checkpoint.id === 'cp-quick-check')?.prompt ?? 'Trả lời và kiểm chứng.'}`;
    case 'S9':
      return 'Đối chiếu mục tiêu\nEm đã có bằng chứng nào? Điều gì cần kiểm chứng tiếp?';
    case 'S10':
      return `Exit ticket\n${contract.checkpoints.find((checkpoint) => checkpoint.id === 'cp-exit-ticket')?.prompt ?? 'Nêu kết luận có căn cứ.'}`;
    default:
      return 'Theo dõi hướng dẫn của giáo viên.';
  }
}

// Dòng hành động công khai trên TV: một câu nói việc HS làm ngay lúc này. Đây là
// chữ chiếu cho cả lớp đọc nên luôn viết thành câu, không dùng tốc ký bảng.
function publicScreenAction(screenId: string): string {
  switch (screenId) {
    case 'S0': return 'Quan sát và nghĩ 30 giây, rồi nói dự đoán với bạn bên cạnh. Chưa cần mở máy.';
    case 'S1': return 'Trên máy của em: chọn hoặc viết điều em muốn biết từ tình huống này.';
    case 'S2': return 'Trên máy của em: chọn 1–2 mục tiêu em muốn đạt được cuối tiết.';
    case 'S3': return 'Ghi mô hình và từ khoá vào vở. Bấm vào thuật ngữ trên máy nếu chưa rõ nghĩa.';
    case 'S4': return 'Trên máy: chọn loại lỗi trước khi thảo luận. Sau đó ghi bước sửa vào vở.';
    case 'S5': return 'Đặt thiết bị xuống khi cả nhóm cùng giải thích. Mỗi bạn nói được một căn cứ.';
    case 'S6': return 'Chọn tuyến trên máy, làm bài, dùng nhiều nhất một gợi ý rồi tự hoàn thiện.';
    case 'S7': return 'Tự làm và gửi câu trả lời của riêng em. Bước này không hỏi nhóm.';
    case 'S8': return 'Trả lời nhanh trên máy, đọc phản hồi và sửa lại một lỗi nếu có.';
    case 'S9': return 'Đối chiếu với mục tiêu em viết đầu tiết. Sửa lại vở nếu cần.';
    case 'S10': return 'Gửi exit ticket trên máy của em, rồi giữ vở mở.';
    default: return 'Theo dõi hướng dẫn của thầy cô và chuẩn bị cho bước tiếp theo.';
  }
}

function buildTvScreens(contract: LiveLessonV4Contract): LiveLessonScreen[] {
  // Bài thủ công khai báo nội dung TV theo từng cue ⇒ dùng trực tiếp, không ép
  // vào cung bậc screenId cố định (tránh dùng lại một screenId cho nhiều hoạt động).
  if (contract.publicTvScreens?.length) {
    return contract.publicTvScreens.map((screen) => ({
      id: screen.screenId,
      label: screen.label,
      title: screen.title,
      body: screen.body,
      ...(screen.action?.trim() ? { action: screen.action.trim() } : {}),
    }));
  }
  const screenIds = [...new Set(contract.timeline.map((block) => block.tvScreenId))];
  return screenIds.map((id) => ({
    id,
    label: tvScreenMeta[id]?.label ?? 'LIVE CLASSROOM',
    title: tvScreenMeta[id]?.title ?? id,
    body: publicScreenBody(contract, id),
    action: publicScreenAction(id),
  }));
}

// WALT lấy đúng tên bài đang học; WILF lấy các mục tiêu Toán đã khai báo trong
// contract. Không sinh thêm nội dung mới và không tự dịch sang tiếng Anh.
function buildIntent(contract: LiveLessonV4Contract): LiveLessonIntent {
  return {
    walt: contract.title,
    wilf: contract.objectives.math.map((objective) => objective.text),
  };
}

function notebookText(block: TimelineBlock): string {
  if (block.id === 'P00' || block.id === 'P19') return 'Chưa cần chép; chuẩn bị trao đổi.';
  if (block.id === 'P38') return 'Viết một kết luận có căn cứ và điều cần kiểm chứng tiếp.';
  return 'Ghi từ khóa, bước làm hoặc bằng chứng ngắn vào vở.';
}

function buildCues(contract: LiveLessonV4Contract, responseSteps: LiveResponseStep[]): LiveCue[] {
  const stepIds = new Set(responseSteps.map((step) => step.id));
  const cues = contract.timeline.map((block): LiveCue => ({
    id: block.id,
    atSeconds: block.startSeconds,
    label: block.label,
    tvScreenId: block.tvScreenId,
    teacher: block.teacherScript,
    student: block.studentAction ?? 'Theo dõi và tạo bằng chứng học tập.',
    boardLarge: block.boardLarge ?? '',
    boardSide: block.boardSide ?? '',
    notebook: notebookText(block),
    observerEvidence: getCheckpointById(contract, block.checkpointId ?? '')?.evidenceSignal ?? 'Nhịp học được giữ theo timeline 40 phút.',
    ...(block.checkpointId && stepIds.has(block.checkpointId) ? { responseStepId: block.checkpointId } : {}),
  }));
  const last = contract.timeline[contract.timeline.length - 1];
  if (!last || last.endSeconds !== contract.durationSeconds) {
    throw new LiveLessonDefinitionError('V4_TIMELINE_INVALID', 'Timeline V4 phải kết thúc đúng 2400 giây.');
  }
  cues.push({
    id: 'P40',
    atSeconds: contract.durationSeconds,
    label: 'P40 · Kết thúc',
    tvScreenId: last.tvScreenId,
    teacher: 'Đóng phiên sau khi học sinh hoàn tất exit ticket.',
    student: 'Hoàn tất exit ticket và chờ giáo viên kết thúc phiên.',
    boardLarge: last.boardLarge ?? '',
    boardSide: last.boardSide ?? '',
    notebook: 'Giữ vở mở để giáo viên quét nhanh nếu cần.',
    observerEvidence: 'Phiên kết thúc đúng 40 phút; bằng chứng cuối tiết đã được tạo.',
  });
  return cues;
}

/**
 * Chuyển contract V4 thuần dữ liệu thành định nghĩa runtime mà ba cổng hiện tại dùng.
 * Runtime TV/HS chỉ nhận screen/step public; teacherScript và board plan chỉ nằm trong cue GV.
 */
export function buildLiveLessonDefinitionFromV4(
  contract: LiveLessonV4Contract,
  lessonId = contract.lessonId,
): LiveLessonDefinition {
  if (!validateV4Contract(contract).ok) throwInvalidContract(contract);
  const responseSteps = buildResponseSteps(contract);
  const definition: LiveLessonDefinition = {
    id: contract.id,
    lessonId,
    title: contract.title,
    durationSeconds: contract.durationSeconds,
    cues: buildCues(contract, responseSteps),
    tvScreens: buildTvScreens(contract),
    studentScreens: studentScreens.map((screen) => ({ ...screen })),
    allowedStepIds: responseSteps.map((step) => step.id),
    aiErrorStepId: contract.aiError.stepId === 'P16' ? 'cp-ai-error' : contract.aiError.stepId,
    aiErrorOfTheWeek: {
      id: contract.aiError.id,
      category: contract.aiError.category,
      correction: contract.aiError.correction,
      proof: contract.aiError.proof,
    },
    responseSteps,
    intent: buildIntent(contract),
  };
  return validateLiveLessonDefinition(definition);
}
