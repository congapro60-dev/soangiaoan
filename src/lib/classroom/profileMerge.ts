import type { MasteryLevel, ProfileTopic } from './types';

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
 *  3. **Làm đúng thì hồ sơ phải gỡ nhãn ra.** Chủ đề không còn bị nêu ở bài mới sẽ tiến dần
 *     weak → developing → solid, để hồ sơ phản ánh hiện tại chứ không phải quá khứ.
 */

/** Số bài KHÁC NHAU cùng nêu một chủ đề thì mới được kết luận là yếu. */
export const NGUONG_YEU = 2;

const chuanHoaChuDe = (topic: string): string => topic.normalize('NFC').replace(/\s+/g, ' ').trim();

const capDo = (soBangChung: number): MasteryLevel => {
  if (soBangChung >= NGUONG_YEU) return 'weak';
  return soBangChung >= 1 ? 'developing' : 'solid';
};

export interface MergeInput {
  existing: ProfileTopic[];
  /** Chủ đề bài vừa chấm nêu ra là em còn yếu. */
  weakTopics: string[];
  submissionId: string;
  now: string;
}

export const mergeTopics = ({ existing, weakTopics, submissionId, now }: MergeInput): ProfileTopic[] => {
  const moi = new Set(weakTopics.map(chuanHoaChuDe).filter(Boolean));
  const theoTen = new Map<string, ProfileTopic>();

  for (const topic of existing) {
    const ten = chuanHoaChuDe(topic.topic);
    if (!ten) continue;
    theoTen.set(ten, {
      ...topic,
      topic: ten,
      evidenceSubmissionIds: [...new Set(topic.evidenceSubmissionIds || [])],
    });
  }

  // Chủ đề bài mới nêu: thêm bằng chứng.
  for (const ten of moi) {
    const cu = theoTen.get(ten);
    const bangChung = [...new Set([...(cu?.evidenceSubmissionIds || []), submissionId])];
    theoTen.set(ten, {
      topic: ten,
      level: capDo(bangChung.length),
      evidenceSubmissionIds: bangChung,
      updatedAt: now,
    });
  }

  // Chủ đề bài mới KHÔNG nêu: gỡ bớt một mức, hết bằng chứng thì bỏ hẳn khỏi hồ sơ.
  for (const [ten, topic] of theoTen) {
    if (moi.has(ten)) continue;
    const bangChung = topic.evidenceSubmissionIds.slice(0, -1);
    if (bangChung.length === 0) {
      theoTen.delete(ten);
      continue;
    }
    theoTen.set(ten, {
      ...topic,
      level: capDo(bangChung.length),
      evidenceSubmissionIds: bangChung,
      updatedAt: now,
    });
  }

  return [...theoTen.values()].sort((a, b) => {
    const uu: Record<MasteryLevel, number> = { weak: 0, developing: 1, solid: 2 };
    return uu[a.level] - uu[b.level] || a.topic.localeCompare(b.topic, 'vi');
  });
};

/**
 * Gỡ bằng chứng của một bài khỏi hồ sơ — dùng khi giáo viên BỎ duyệt điểm bài đó.
 * Bỏ duyệt mà vẫn để kết luận nằm lại là để nguyên cái nhãn mà mình vừa nói là không đáng tin.
 */
export const removeEvidence = (existing: ProfileTopic[], submissionId: string, now: string): ProfileTopic[] =>
  existing
    .map(topic => {
      const bangChung = (topic.evidenceSubmissionIds || []).filter(id => id !== submissionId);
      if (bangChung.length === topic.evidenceSubmissionIds.length) return topic;
      return { ...topic, evidenceSubmissionIds: bangChung, level: capDo(bangChung.length), updatedAt: now };
    })
    .filter(topic => topic.evidenceSubmissionIds.length > 0);
