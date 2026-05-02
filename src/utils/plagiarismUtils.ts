import { GradingResult, AppData } from '../types';
import { callAI } from '../lib/aiProviders';

type Settings = AppData['settings'];

// ── Public types ──────────────────────────────────────────────────────────────

/** Một đoạn văn/công thức được phát hiện là trùng giữa hai bài làm. */
export interface SharedSegment {
  textA: string;           // trích dẫn chính xác từ báo cáo học sinh A
  textB: string;           // trích dẫn chính xác từ báo cáo học sinh B
  isWrongReasoning: boolean; // true = cùng lỗi sai → cảnh báo đỏ
  reason: string;          // giải thích ngắn tại sao đánh dấu
}

/** Một cặp học sinh bị nghi ngờ sao chép. */
export interface SuspiciousPair {
  studentAId: string;
  studentBId: string;
  studentAName: string;
  studentBName: string;
  level: 'red' | 'yellow';
  similarityPercent: number; // 0–100
  sharedSegments: SharedSegment[];
}

/** Kết quả toàn bộ đợt kiểm tra sao chép cho một buổi chấm. */
export interface PlagiarismReport {
  checkedPairs: number;
  redFlags: SuspiciousPair[];   // cùng lỗi sai bất thường
  yellowFlags: SuspiciousPair[]; // chỉ giống bước đúng thông thường
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Tỷ lệ Jaccard shingle tối thiểu để đưa một cặp vào danh sách candidate. */
const JACCARD_THRESHOLD = 0.20;

/** Số cặp tối đa trong một lần gọi AI (để tránh vượt token limit). */
const BATCH_SIZE = 6;

/** Số ký tự trích từ mỗi báo cáo gửi lên AI (tiết kiệm token). */
const DETAILS_MAX_CHARS = 1500;

// ── Jaccard shingle similarity ────────────────────────────────────────────────

/**
 * Tính Jaccard similarity trên tập k-character shingles.
 * Robust hơn word-level Jaccard với văn bản tiếng Việt.
 */
function shingleSimilarity(a: string, b: string, k = 4): number {
  const buildSet = (s: string): Set<string> => {
    const set = new Set<string>();
    const norm = s.toLowerCase().replace(/\s+/g, ' ').trim();
    for (let i = 0; i <= norm.length - k; i++) {
      set.add(norm.slice(i, i + k));
    }
    return set;
  };

  const sa = buildSet(a);
  const sb = buildSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;

  let intersection = 0;
  sa.forEach(s => { if (sb.has(s)) intersection++; });
  return intersection / (sa.size + sb.size - intersection);
}

// ── AI batch analysis ─────────────────────────────────────────────────────────

async function analyzeBatch(
  pairs: Array<[GradingResult, GradingResult]>,
  settings: Settings
): Promise<SuspiciousPair[]> {
  const payload = pairs.map(([a, b], idx) => ({
    index: idx,
    A: { id: a.id, name: a.studentName, report: a.details.slice(0, DETAILS_MAX_CHARS) },
    B: { id: b.id, name: b.studentName, report: b.details.slice(0, DETAILS_MAX_CHARS) },
  }));

  const prompt = `Bạn là chuyên gia phát hiện gian lận thi cử. Tôi cung cấp ${pairs.length} cặp báo cáo chấm điểm bài làm học sinh từ CÙNG MỘT đề kiểm tra.

NHIỆM VỤ: Với mỗi cặp, xác định mức độ nghi ngờ sao chép:
- "red": Cả hai cùng mắc MỘT LỖI BIẾN ĐỔI CÔNG THỨC SAI giống hệt nhau, hoặc cùng có suy luận bất thường/hiếm gặp trùng khớp. Đây là dấu hiệu mạnh nhất của việc sao chép.
- "yellow": Chỉ giống nhau ở các BƯỚC GIẢI ĐÚNG thông thường (học sinh khác nhau có thể tự tìm ra) — ít đáng lo ngại.
- "clean": Không có điểm tương đồng đáng ngờ nào.

LƯU Ý QUAN TRỌNG:
- Không đánh dấu "red" nếu sự trùng lặp đến từ các phương pháp chuẩn, đáp án đúng, hoặc câu trích dẫn đề bài.
- CHỈ đánh dấu "red" khi phát hiện lỗi sai đặc thù/hiếm xuất hiện ở CẢ HAI bài.

Dữ liệu:
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Trả về JSON array (KHÔNG kèm giải thích hay markdown ngoài code block):
\`\`\`json
[
  {
    "index": 0,
    "level": "red",
    "similarityPercent": 85,
    "sharedSegments": [
      {
        "textA": "đoạn trích chính xác từ báo cáo A",
        "textB": "đoạn trích chính xác từ báo cáo B",
        "isWrongReasoning": true,
        "reason": "Cả hai cùng biến đổi sai x²-4 = (x-2)² thay vì (x-2)(x+2)"
      }
    ]
  }
]
\`\`\``;

  const text = await callAI(prompt, settings);

  // Extract JSON array from response
  const codeBlock = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  const jsonStr = codeBlock ? codeBlock[1] : text.match(/\[[\s\S]*\]/)?.[0];
  if (!jsonStr) return [];

  let parsed: any[];
  try { parsed = JSON.parse(jsonStr); }
  catch { return []; }

  return parsed
    .filter((item: any) => item.level === 'red' || item.level === 'yellow')
    .map((item: any): SuspiciousPair => {
      const [a, b] = pairs[item.index];
      return {
        studentAId: a.id,
        studentBId: b.id,
        studentAName: a.studentName,
        studentBName: b.studentName,
        level: item.level,
        similarityPercent: Math.min(100, Math.max(0, Number(item.similarityPercent) || 0)),
        sharedSegments: Array.isArray(item.sharedSegments)
          ? item.sharedSegments.map((seg: any) => ({
              textA: String(seg.textA || ''),
              textB: String(seg.textB || ''),
              isWrongReasoning: Boolean(seg.isWrongReasoning),
              reason: String(seg.reason || ''),
            }))
          : [],
      };
    });
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Phát hiện sao chép trong toàn bộ danh sách bài làm của một buổi chấm.
 *
 * Luồng xử lý:
 *  1. Lọc bài đã chấm xong.
 *  2. Sinh tất cả các cặp O(n²).
 *  3. Jaccard shingle pre-filter: loại cặp similarity < 20%.
 *  4. Batch AI: phân tích semantic từng nhóm 6 cặp candidate.
 *  5. Trả về PlagiarismReport phân loại red/yellow.
 */
export async function detectPlagiarism(
  results: GradingResult[],
  settings: Settings
): Promise<PlagiarismReport> {
  const completed = results.filter(r => r.status === 'completed' && r.details.trim().length > 0);

  // Generate all unique pairs
  const allPairs: Array<[GradingResult, GradingResult]> = [];
  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      allPairs.push([completed[i], completed[j]]);
    }
  }

  // Jaccard pre-filter — keep only candidate pairs
  const candidates = allPairs.filter(
    ([a, b]) => shingleSimilarity(a.details, b.details) >= JACCARD_THRESHOLD
  );

  if (candidates.length === 0) {
    return { checkedPairs: allPairs.length, redFlags: [], yellowFlags: [] };
  }

  // Batch AI analysis
  const redFlags: SuspiciousPair[] = [];
  const yellowFlags: SuspiciousPair[] = [];

  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const batch = candidates.slice(start, start + BATCH_SIZE);
    const batchResults = await analyzeBatch(batch, settings);
    for (const r of batchResults) {
      if (r.level === 'red') redFlags.push(r);
      else yellowFlags.push(r);
    }
  }

  // Sort by similarity descending
  const bySimilarity = (a: SuspiciousPair, b: SuspiciousPair) =>
    b.similarityPercent - a.similarityPercent;
  redFlags.sort(bySimilarity);
  yellowFlags.sort(bySimilarity);

  return { checkedPairs: allPairs.length, redFlags, yellowFlags };
}
