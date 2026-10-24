/**
 * Bảng ghép LO của SSM với năng lực khung app — VIẾT TAY, không suy đoán, không gọi AI.
 *
 * Vì sao không để AI ghép: QA 25/10/2026, lớp 10Olinda, model được đưa đúng khung lớp 10
 * nhưng vẫn ghép 6 LO về cùng một năng lực "vectơ", khiến 18/19 ô điểm dồn vào một cột.
 * Mã LO của SSM ổn định theo chương trình (34344 luôn là "mệnh đề"…), nên ánh xạ cố định vừa
 * đúng vừa kiểm lại được. Bảng này do chủ dự án duyệt từng dòng.
 *
 * Khoá là mã LO đọc từ tiêu đề cột SSM (`LO_DIS_TO_34344`). LO không có trong bảng ⇒ để trống
 * ("N") và giáo viên tự điền — thà trống còn hơn ghi sai điểm vào SSM của trường.
 */
import type { LoMapping } from './loMapping';

/**
 * Mã LO → id năng lực khung app.
 * - Khối 10: 1-1, mỗi LO một năng lực riêng.
 * - Khối 11: 34745 và 34746 cùng về `g11-ham-va-pt-luong-giac` (chủ dự án chốt 25/10:
 *   khung lớp 11 gộp chung "hàm số lượng giác và phương trình lượng giác").
 * - Khối 12: 5 LO khảo sát hàm số (34383–34387) cùng về `g12-khao-sat-ham-so`; các LO vectơ
 *   không gian chưa có năng lực tương ứng trong khung nên để trống.
 */
const LO_TO_COMPETENCY: Readonly<Record<string, string>> = {
  // ── Khối 10 (SSM 10Olinda: IA1 form 15320, F1 form 15319) ──
  LO_DIS_TO_34344: 'g10-tap-hop-va-menh-de',
  LO_DIS_TO_34345: 'g10-phep-toan-tren-tap-hop',
  LO_DIS_TO_34346: 'g10-bpt-bac-nhat-hai-an',
  LO_DIS_TO_34352: 'g10-gia-tri-luong-giac-0-180',
  LO_DIS_TO_34353: 'g10-he-thuc-luong-tam-giac',
  LO_DIS_TO_34354: 'g10-vecto-va-phep-toan',

  // ── Khối 11 (SSM 11Columbus: IA1 form 15328, F1 form 15317) ──
  LO_DIS_TO_34745: 'g11-ham-va-pt-luong-giac',
  LO_DIS_TO_34746: 'g11-ham-va-pt-luong-giac',
  LO_DIS_TO_34756: 'g11-duong-thang-mat-phang-kg',
  LO_DIS_TO_34757: 'g11-quan-he-song-song',

  // ── Khối 12 (SSM 12 VN Toán 1: IA1 form 15336) ──
  LO_DIS_TO_34383: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34384: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34385: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34386: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34387: 'g12-khao-sat-ham-so',
};

/**
 * Bảng ghép cho các LO đã đọc từ SSM. Chỉ giữ mã LO có mặt trong bảng; id năng lực nào không
 * thuộc khung của khối hiện tại thì bỏ (chặn ghép chéo khối khi dữ liệu bị lẫn).
 */
export const fixedLoMapping = (
  loCodes: Iterable<string>,
  validCompetencyIds: Iterable<string>,
): LoMapping => {
  const valid = new Set(validCompetencyIds);
  const mapping: LoMapping = {};
  for (const loCode of loCodes) {
    const competencyId = LO_TO_COMPETENCY[loCode];
    if (competencyId && valid.has(competencyId)) mapping[loCode] = [competencyId];
  }
  return mapping;
};
