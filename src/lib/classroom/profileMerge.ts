import type { MasteryLevel, ProfileEvidenceRef, ProfileEvidenceType, ProfileTopic } from './types.js';

/**
 * Gộp kết quả một bài đã chấm vào hồ sơ tích luỹ của học sinh.
 *
 * Ba ràng buộc đạo đức, cưỡng chế bằng code chứ không để trong tài liệu:
 *
 *  1. **Không có bằng chứng thì không có kết luận.** Mỗi chủ đề phải kèm ít nhất một `submissionId`.
 *     Chủ đề nào hết bằng chứng thì bị gỡ khỏi hồ sơ.
 *  2. **Một bài không đủ để kết luận em yếu.** Sai một lần là `developing`; phải sai từ hai bài
 *     KHÁC NHAU mới thành `weak`. OCR ảnh vở chụp thiếu sáng sai là chuyện thường, và một lỗi
 *     đọc nhầm không được biến thành nhãn dán lâu dài.
 *  3. **Không đánh đồng không được hỏi với làm đúng.** Bài mới không nhắc một topic chỉ có
 *     nghĩa là bài đó không đánh giá topic ấy; chỉ một bằng chứng strength rõ ràng mới tạo solid.
 */

/** Số bài KHÁC NHAU cùng nêu một chủ đề thì mới được kết luận là yếu. */
export const NGUONG_YEU = 2;

const chuanHoaChuDe = (topic: string): string => topic.normalize('NFC').replace(/\s+/g, ' ').trim();

const capDo = (soBangChungYeu: number): MasteryLevel => {
  if (soBangChungYeu >= NGUONG_YEU) return 'weak';
  if (soBangChungYeu >= 1) return 'developing';
  return 'solid';
};

const evidenceKey = (ref: ProfileEvidenceRef): string =>
  ref.assignmentId ? `assignment:${ref.assignmentId}` : `submission:${ref.submissionId}`;

const normalizeEvidenceRefs = (topic: ProfileTopic): ProfileEvidenceRef[] => {
  // Hồ sơ cũ có thể đồng thời có evidenceSubmissionIds và evidenceRefs. Không được chọn
  // một bên rồi làm mất nửa lịch sử. Cùng một submission chỉ là một ref; nếu có bản enriched
  // với assignmentId thì ưu tiên bản đó để lần duyệt lại không bị đếm đôi.
  const legacyRefs: ProfileEvidenceRef[] = (topic.evidenceSubmissionIds || []).map(submissionId => ({
    submissionId,
    evidenceType: 'homework' as const,
    assessedAt: topic.updatedAt,
  }));
  // Legacy order remains stable for predictable profile writes; enriched refs replace the
  // matching legacy value in-place and any genuinely new ref is appended.
  const raw = [...legacyRefs, ...(Array.isArray(topic.evidenceRefs) ? topic.evidenceRefs : [])];

  const bySubmission = new Map<string, ProfileEvidenceRef>();
  for (const item of raw) {
    if (!item || typeof item.submissionId !== 'string' || !item.submissionId.trim()) continue;
    // Chỉ gắn field optional khi có giá trị hợp lệ. Firestore Admin SDK từ chối cả document
    // nếu bất kỳ field nào mang giá trị undefined ("Cannot use undefined as a Firestore value
    // ... in field topics.0.evidenceRefs.0.confidence"), nên builder canonical không được để
    // lọt key optional rỗng. Giữ confidence 0 hợp lệ và loại NaN/Infinity.
    const ref: ProfileEvidenceRef = {
      submissionId: item.submissionId,
      evidenceType: item.evidenceType || 'homework',
      assessedAt: item.assessedAt || topic.updatedAt,
    };
    if (typeof item.assignmentId === 'string' && item.assignmentId.trim()) {
      ref.assignmentId = item.assignmentId;
    }
    if (typeof item.confidence === 'number' && Number.isFinite(item.confidence)) {
      ref.confidence = item.confidence;
    }
    const previous = bySubmission.get(ref.submissionId);
    if (!previous || (!previous.assignmentId && ref.assignmentId)) bySubmission.set(ref.submissionId, ref);
  }
  return [...bySubmission.values()];
};

const buildTopic = (topic: string, refs: ProfileEvidenceRef[], now: string): ProfileTopic => {
  const evidenceRefs = normalizeEvidenceRefs({
    topic,
    level: 'solid',
    evidenceSubmissionIds: refs.map(ref => ref.submissionId),
    evidenceRefs: refs,
    updatedAt: now,
  });
  const weakEvidence = evidenceRefs.filter(ref => ref.evidenceType !== 'strength' && ref.evidenceType !== 'practice');
  const uniqueWeak = new Set(weakEvidence.map(evidenceKey)).size;
  return {
    topic,
    level: capDo(uniqueWeak),
    evidenceSubmissionIds: evidenceRefs.map(ref => ref.submissionId),
    evidenceRefs,
    updatedAt: now,
  };
};

export interface MergeInput {
  existing: ProfileTopic[];
  /** Chủ đề bài vừa chấm nêu ra là em còn yếu. */
  weakTopics: string[];
  /** Điểm mạnh được AI/giáo viên nêu rõ trong đúng bài này. */
  strengths?: string[];
  submissionId: string;
  /** Có thì dùng để coi các lần nộp lại cùng bài là một bằng chứng. */
  assignmentId?: string;
  evidenceType?: ProfileEvidenceType;
  now: string;
}

export const mergeTopics = ({ existing, weakTopics, strengths = [], submissionId, assignmentId, evidenceType = 'homework', now }: MergeInput): ProfileTopic[] => {
  const moi = new Set(weakTopics.map(chuanHoaChuDe).filter(Boolean));
  const diemManh = new Set(strengths.map(chuanHoaChuDe).filter(topic => topic && !moi.has(topic)));
  const theoTen = new Map<string, ProfileTopic>();

  for (const topic of existing) {
    const ten = chuanHoaChuDe(topic.topic);
    if (!ten) continue;
    const refs = normalizeEvidenceRefs(topic);
    if (refs.length > 0) theoTen.set(ten, buildTopic(ten, refs, topic.updatedAt || now));
  }

  const add = (ten: string, kind: ProfileEvidenceType) => {
    const cu = theoTen.get(ten);
    const refs = normalizeEvidenceRefs(cu || { topic: ten, level: 'solid', evidenceSubmissionIds: [], updatedAt: now });
    const ref: ProfileEvidenceRef = { submissionId, assignmentId, evidenceType: kind, assessedAt: now };
    const withoutCurrent = refs.filter(item => assignmentId
      ? item.assignmentId !== assignmentId && !(item.submissionId === submissionId && !item.assignmentId)
      : item.submissionId !== submissionId);
    theoTen.set(ten, buildTopic(ten, [...withoutCurrent, ref], now));
  };

  for (const ten of moi) add(ten, evidenceType);
  for (const ten of diemManh) add(ten, 'strength');

  return [...theoTen.values()].sort((a, b) => {
    const uu: Record<MasteryLevel, number> = { weak: 0, developing: 1, solid: 2 };
    return uu[a.level] - uu[b.level] || a.topic.localeCompare(b.topic, 'vi');
  });
};

/**
 * Gỡ bằng chứng của một bài khỏi hồ sơ — dùng khi giáo viên BỎ duyệt điểm bài đó.
 * Bỏ duyệt mà vẫn để kết luận nằm lại là để nguyên cái nhãn mà mình vừa nói là không đáng tin.
 */
export const removeEvidence = (existing: ProfileTopic[], submissionId: string, now: string, _assignmentId?: string): ProfileTopic[] =>
  existing
    .map(topic => {
      const refs = normalizeEvidenceRefs(topic);
      // Xoá đúng lượt nộp, không xoá cả assignment: lượt nộp cũ có thể đã bị thay bằng
      // submission mới nhưng vẫn mang cùng assignmentId.
      const conLai = refs.filter(ref => ref.submissionId !== submissionId);
      if (conLai.length === refs.length) return topic;
      return buildTopic(chuanHoaChuDe(topic.topic), conLai, now);
    })
    .filter(topic => normalizeEvidenceRefs(topic).length > 0);

/**
 * Đồng bộ hồ sơ theo MỘT bài nộp, dùng cho cả lúc duyệt điểm lẫn lúc giáo viên sửa tay.
 *
 * Luôn GỠ HẾT dấu vết cũ của bài này trước rồi mới gộp lại theo danh sách chủ đề hiện tại.
 * Thiếu bước gỡ thì sửa chủ đề lần hai sẽ chồng lên lần một: giáo viên bỏ nhãn "yếu phương
 * trình" mà nhãn đó vẫn nằm nguyên trong hồ sơ, vì `mergeTopics` chỉ biết thêm chứ không biết
 * bài này trước đây từng nêu chủ đề gì.
 *
 * Gọi lại nhiều lần với cùng dữ liệu cho ra cùng kết quả.
 */
export interface ApplyEvidenceInput {
  existing: ProfileTopic[];
  weakTopics: string[];
  strengths?: string[];
  submissionId: string;
  assignmentId?: string;
  /** false = bỏ duyệt hoặc xoá bài: chỉ gỡ, không gộp lại. */
  approved: boolean;
  now: string;
}

/**
 * Thêm bằng chứng cho các chủ đề nêu ra, KHÔNG làm tụt chủ đề khác.
 *
 * Khác `mergeTopics` đúng ở chỗ đó. Phép làm tụt chỉ đúng khi có bài MỚI nộp mà không nêu chủ
 * đề cũ — nghĩa là em ấy đã làm đúng chỗ đó. Còn khi giáo viên sửa lại một bài đã chấm thì
 * không có bài mới nào cả, làm tụt kết luận rút từ bài khác là bịa.
 */
const addEvidence = (existing: ProfileTopic[], weakTopics: string[], strengths: string[], submissionId: string, assignmentId: string | undefined, now: string): ProfileTopic[] => {
  const theoTen = new Map(existing.map(t => [chuanHoaChuDe(t.topic), t]));

  for (const ten of new Set(weakTopics.map(chuanHoaChuDe).filter(Boolean))) {
    const cu = theoTen.get(ten);
    const refs = normalizeEvidenceRefs(cu || { topic: ten, level: 'solid', evidenceSubmissionIds: [], updatedAt: now });
    const key = evidenceKey({ submissionId, assignmentId, assessedAt: now });
    theoTen.set(ten, buildTopic(ten, [...refs.filter(ref => evidenceKey(ref) !== key), { submissionId, assignmentId, evidenceType: 'homework', assessedAt: now }], now));
  }
  for (const ten of new Set(strengths.map(chuanHoaChuDe).filter(topic => topic && !weakTopics.map(chuanHoaChuDe).includes(topic)))) {
    const cu = theoTen.get(ten);
    const refs = normalizeEvidenceRefs(cu || { topic: ten, level: 'solid', evidenceSubmissionIds: [], updatedAt: now });
    const key = evidenceKey({ submissionId, assignmentId, assessedAt: now });
    theoTen.set(ten, buildTopic(ten, [...refs.filter(ref => evidenceKey(ref) !== key), { submissionId, assignmentId, evidenceType: 'strength', assessedAt: now }], now));
  }

  return [...theoTen.values()].sort((a, b) => {
    const uu: Record<MasteryLevel, number> = { weak: 0, developing: 1, solid: 2 };
    return uu[a.level] - uu[b.level] || a.topic.localeCompare(b.topic, 'vi');
  });
};

export const applyEvidence = ({ existing, weakTopics, strengths = [], submissionId, assignmentId, approved, now }: ApplyEvidenceInput): ProfileTopic[] => {
  // Bài này đã từng được tính vào hồ sơ chưa? Chỉ gỡ evidence của chính attempt/assignment này.
  const daTungTinh = existing.some(t => normalizeEvidenceRefs(t).some(ref =>
    assignmentId ? ref.assignmentId === assignmentId : ref.submissionId === submissionId,
  ));
  const sach = removeEvidence(existing, submissionId, now, assignmentId);
  if (!approved) return sach;

  return daTungTinh
    ? addEvidence(sach, weakTopics, strengths, submissionId, assignmentId, now)
    : mergeTopics({ existing: sach, weakTopics, strengths, submissionId, assignmentId, now });
};

export interface PracticeEvidenceInput {
  existing: ProfileTopic[];
  /** Chỉ các chủ đề mà practice set thực sự được sinh ra để luyện. */
  topics: string[];
  attemptId: string;
  /** Tỉ lệ điểm practice, chỉ là formative confidence chứ không phải mastery. */
  confidence: number;
  now: string;
}

/**
 * Gắn dấu vết practice vào đúng topic đã có trong hồ sơ mà không tự tạo topic mới,
 * không đổi level và không cho practice trở thành bằng chứng yếu/strength chính thức.
 * Cùng attemptId được thay thế để retry/finalize idempotent.
 */
export const applyPracticeEvidence = ({ existing, topics, attemptId, confidence, now }: PracticeEvidenceInput): ProfileTopic[] => {
  const targets = new Set(topics.map(chuanHoaChuDe).filter(Boolean));
  const safeConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;

  return existing.map(topic => {
    const name = chuanHoaChuDe(topic.topic);
    if (!targets.has(name)) return topic;

    const refs = normalizeEvidenceRefs(topic);
    if (refs.length === 0) return topic;
    const nextRefs: ProfileEvidenceRef[] = [
      ...refs.filter(ref => ref.submissionId !== attemptId),
      { submissionId: attemptId, evidenceType: 'practice', assessedAt: now, confidence: safeConfidence },
    ];
    return {
      ...topic,
      topic: name,
      evidenceSubmissionIds: nextRefs.map(ref => ref.submissionId),
      evidenceRefs: nextRefs,
      updatedAt: now,
    };
  });
};
