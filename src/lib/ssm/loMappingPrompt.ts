/**
 * Dựng prompt để AI ghép LO (chuẩn đầu ra SSM) với năng lực khung app, và đọc kết quả về.
 * Thuần. AI CHỈ chọn trong danh sách năng lực đưa vào — không bịa id; giáo viên sửa lại được.
 */
import type { Competency } from '../classroom/competency/framework';
import type { LoInfo, LoMapping } from './loMapping';

export const buildLoMappingPrompt = (
  grade: number,
  los: readonly LoInfo[],
  competencies: readonly Competency[],
): string => {
  const loLines = los.map((lo, i) => `${i + 1}. [${lo.loCode}] ${lo.text}`).join('\n');
  const compLines = competencies
    .map((c) => `- ${c.id} — ${c.topic}: ${c.competency}`)
    .join('\n');
  return [
    `Bạn ghép mỗi "chuẩn đầu ra" (LO) của môn Toán lớp ${grade} với các NĂNG LỰC trong khung của trường.`,
    '',
    'DANH SÁCH LO:',
    loLines,
    '',
    'DANH SÁCH NĂNG LỰC (chỉ được chọn id trong đây):',
    compLines,
    '',
    'Quy tắc:',
    '- Mỗi LO ghép với 0, 1 hoặc nhiều năng lực có nội dung TRÙNG chủ đề. Không chắc thì để mảng rỗng.',
    '- CHỈ dùng id năng lực có trong danh sách trên. Không bịa id, không tự thêm năng lực.',
    '- Không suy diễn xa: LO về "vectơ trong không gian" không ghép với năng lực "vectơ trong mặt phẳng".',
    '',
    'Trả về DUY NHẤT một JSON, khoá là mã LO, giá trị là mảng id năng lực. Không giải thích thêm.',
    'Ví dụ: {"LO_DIS_TO_100": ["g11-day-so-cap-so"], "LO_DIS_TO_101": []}',
  ].join('\n');
};

/** Đọc JSON AI trả về; chỉ giữ mã LO hợp lệ và id năng lực hợp lệ. Hỏng thì trả bảng rỗng. */
export const parseLoMappingResponse = (
  text: string,
  validLoCodes: Iterable<string>,
  validCompetencyIds: Iterable<string>,
): LoMapping => {
  const loSet = new Set(validLoCodes);
  const compSet = new Set(validCompetencyIds);
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(json[0]);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null) return {};
  const mapping: LoMapping = {};
  for (const [loCode, ids] of Object.entries(parsed as Record<string, unknown>)) {
    if (!loSet.has(loCode) || !Array.isArray(ids)) continue;
    const clean = [...new Set(ids)].filter((id): id is string => typeof id === 'string' && compSet.has(id));
    if (clean.length > 0) mapping[loCode] = clean;
  }
  return mapping;
};
