import { GradingResult, AppData } from '../types';
import { callAI } from '../lib/aiProviders';

type Settings = AppData['settings'];

// ── Public types ──────────────────────────────────────────────────────────────

/** Một đoạn văn/công thức được phát hiện là trùng giữa hai bài làm. */
export interface SharedSegment {
  textA: string;           // trích dẫn chính xác từ bài nộp / báo cáo học sinh A
  textB: string;           // trích dẫn chính xác từ bài nộp / báo cáo học sinh B
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
  /** true nếu cả hai bài đều có rawText (văn bản gốc) — kết quả đáng tin hơn */
  hasRawText: boolean;
}

/** Kết quả toàn bộ đợt kiểm tra sao chép cho một buổi chấm. */
export interface PlagiarismReport {
  checkedPairs: number;
  redFlags: SuspiciousPair[];    // cùng lỗi sai bất thường
  yellowFlags: SuspiciousPair[]; // chỉ giống bước đúng thông thường
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Ngưỡng Jaccard tối thiểu để đưa một cặp vào Tầng 2 (AI).
 * Dùng rawText → 0.30, fallback details → 0.20 (AI văn phong khuôn mẫu hơn).
 */
const JACCARD_THRESHOLD_RAW = 0.30;
const JACCARD_THRESHOLD_DETAILS = 0.20;

/** Số cặp tối đa trong một lần gọi AI (giới hạn token). */
const BATCH_SIZE = 5;

/** Số ký tự tối đa của raw text gửi lên AI mỗi bài. */
const RAW_TEXT_MAX_CHARS = 2000;

/** Số ký tự tối đa của details gửi lên AI mỗi bài. */
const DETAILS_MAX_CHARS = 800;

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

/** Chọn text tốt nhất để chạy Jaccard và trả về cả flag hasRaw. */
function getComparisonTexts(a: GradingResult, b: GradingResult): {
  textA: string;
  textB: string;
  hasRawText: boolean;
  threshold: number;
} {
  if (a.rawText && b.rawText) {
    return {
      textA: a.rawText,
      textB: b.rawText,
      hasRawText: true,
      threshold: JACCARD_THRESHOLD_RAW,
    };
  }
  // Fallback: dùng details (kém chính xác hơn, ngưỡng thấp hơn)
  return {
    textA: a.details,
    textB: b.details,
    hasRawText: false,
    threshold: JACCARD_THRESHOLD_DETAILS,
  };
}

// ── AI batch analysis ─────────────────────────────────────────────────────────

async function analyzeBatch(
  pairs: Array<{ a: GradingResult; b: GradingResult; hasRawText: boolean }>,
  settings: Settings
): Promise<SuspiciousPair[]> {
  const payload = pairs.map(({ a, b, hasRawText }, idx) => {
    const base = { index: idx, hasRawText };

    if (hasRawText) {
      return {
        ...base,
        A: {
          id: a.id,
          name: a.studentName,
          rawText: a.rawText!.slice(0, RAW_TEXT_MAX_CHARS),
          errorSummary: a.weaknesses.join('; '),
        },
        B: {
          id: b.id,
          name: b.studentName,
          rawText: b.rawText!.slice(0, RAW_TEXT_MAX_CHARS),
          errorSummary: b.weaknesses.join('; '),
        },
      };
    }

    // Fallback khi không có raw text (bài nộp dạng ảnh)
    return {
      ...base,
      note: 'Không có văn bản gốc (bài nộp dạng ảnh) — chỉ có báo cáo AI',
      A: {
        id: a.id,
        name: a.studentName,
        aiReport: a.details.slice(0, DETAILS_MAX_CHARS),
        errorSummary: a.weaknesses.join('; '),
      },
      B: {
        id: b.id,
        name: b.studentName,
        aiReport: b.details.slice(0, DETAILS_MAX_CHARS),
        errorSummary: b.weaknesses.join('; '),
      },
    };
  });

  const prompt = `Bạn là chuyên gia phát hiện gian lận thi cử. Tôi cung cấp ${pairs.length} cặp bài làm học sinh từ CÙNG MỘT đề kiểm tra.

Với mỗi cặp có rawText (văn bản gốc bài nộp), hãy so sánh trực tiếp nội dung bài làm.
Với cặp không có rawText (bài ảnh), chỉ dựa vào báo cáo AI và tóm tắt lỗi sai.

TIÊU CHÍ ĐÁNH GIÁ:
- "red": Cả hai cùng mắc MỘT LỖI BIẾN ĐỔI SAI giống hệt (ví dụ: cùng sai x²-4=(x-2)²), hoặc cùng có suy luận logic bất thường/hiếm gặp trùng khớp. Đây là bằng chứng mạnh của việc sao chép.
- "yellow": Chỉ giống ở các BƯỚC ĐÚNG THÔNG THƯỜNG mà nhiều học sinh độc lập đều có thể tự viết ra.
- "clean": Không có điểm tương đồng đáng ngờ.

QUAN TRỌNG:
- KHÔNG đánh "red" nếu sự trùng lặp đến từ công thức chuẩn, đáp án đúng, hoặc cấu trúc bài giải thông thường.
- CHỈ "red" khi LỖI SAI ĐẶC THÙ/HIẾM GẶP xuất hiện ở CẢ HAI bài.
- Trích dẫn chính xác từ văn bản gốc (rawText) khi có, hoặc từ aiReport khi không có rawText.

Dữ liệu:
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Trả về JSON array (KHÔNG kèm text ngoài code block):
\`\`\`json
[
  {
    "index": 0,
    "level": "red",
    "similarityPercent": 85,
    "sharedSegments": [
      {
        "textA": "đoạn trích chính xác từ bài A",
        "textB": "đoạn trích chính xác từ bài B",
        "isWrongReasoning": true,
        "reason": "Cả hai cùng biến đổi sai x²-4 = (x-2)² thay vì (x-2)(x+2)"
      }
    ]
  }
]
\`\`\``;

  const text = await callAI(prompt, settings);

  // Extract JSON array
  const codeBlock = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  const jsonStr = codeBlock ? codeBlock[1] : text.match(/\[[\s\S]*\]/)?.[0];
  if (!jsonStr) return [];

  let parsed: any[];
  try { parsed = JSON.parse(jsonStr); }
  catch { return []; }

  return parsed
    .filter((item: any) => item.level === 'red' || item.level === 'yellow')
    .map((item: any): SuspiciousPair => {
      const { a, b, hasRawText } = pairs[item.index];
      return {
        studentAId: a.id,
        studentBId: b.id,
        studentAName: a.studentName,
        studentBName: b.studentName,
        level: item.level,
        similarityPercent: Math.min(100, Math.max(0, Number(item.similarityPercent) || 0)),
        hasRawText,
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
 *  2. Sinh tất cả cặp O(n²).
 *  3. Tầng 1 — Jaccard shingle pre-filter:
 *     - Có rawText → so sánh văn bản gốc, ngưỡng 30%
 *     - Không có rawText → so sánh details, ngưỡng 20%
 *  4. Tầng 2 — AI batch (5 cặp/lần): AI phân biệt "cùng sai hiếm gặp" (🔴) vs
 *     "cùng đúng thông thường" (🟡/bỏ qua), dựa trên rawText + weaknesses.
 *  5. Trả về PlagiarismReport phân loại red/yellow, sort theo similarity%.
 */
export async function detectPlagiarism(
  results: GradingResult[],
  settings: Settings
): Promise<PlagiarismReport> {
  const completed = results.filter(
    r => r.status === 'completed' && r.details.trim().length > 0
  );

  // Generate all unique pairs
  type Pair = { a: GradingResult; b: GradingResult; hasRawText: boolean };
  const allPairs: Pair[] = [];
  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      allPairs.push({
        a: completed[i],
        b: completed[j],
        hasRawText: !!(completed[i].rawText && completed[j].rawText),
      });
    }
  }

  // Tầng 1: Jaccard pre-filter
  const candidates = allPairs.filter(({ a, b }) => {
    const { textA, textB, threshold } = getComparisonTexts(a, b);
    return shingleSimilarity(textA, textB) >= threshold;
  });

  if (candidates.length === 0) {
    return { checkedPairs: allPairs.length, redFlags: [], yellowFlags: [] };
  }

  // Tầng 2: AI batch — sequential (không parallel) để tránh rate-limit timeout
  const redFlags: SuspiciousPair[] = [];
  const yellowFlags: SuspiciousPair[] = [];

  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const batch = candidates.slice(start, start + BATCH_SIZE);
    const batchResults = await analyzeBatch(batch, settings);
    for (const r of batchResults) {
      (r.level === 'red' ? redFlags : yellowFlags).push(r);
    }
  }

  const bySimilarity = (a: SuspiciousPair, b: SuspiciousPair) =>
    b.similarityPercent - a.similarityPercent;
  redFlags.sort(bySimilarity);
  yellowFlags.sort(bySimilarity);

  return { checkedPairs: allPairs.length, redFlags, yellowFlags };
}
