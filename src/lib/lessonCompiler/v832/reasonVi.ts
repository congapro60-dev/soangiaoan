// Dịch các chuỗi reason/rationale tiếng Anh nằm sẵn trong dữ liệu Lesson IR V8.3.2
// (fixture/gói đã biên soạn) sang tiếng Việt cho thầy/cô đọc trong Studio.
// Chuỗi lạ trả về nguyên văn — UI không bao giờ mất thông tin.

const TRANSLATIONS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Handoff timing for ([\w-]+) is a V8\.3\.2 migration planning assumption; V8\.2\.1 source did not separately budget entry\/recall seconds\.?$/i,
    m => `Thời gian chuyển bước "${m[1]}" là giả định khi chuyển lên V8.3.2; nguồn V8.2.1 không tách riêng số giây vào bài và thu hồi.`],
  [/^V8\.3\.2 recheck mapping for ([\w-]+) was synthesized from the legacy sequence; confirm that the selected next checkpoint is pedagogically intended\.?$/i,
    m => `Điểm kiểm tra sau bước "${m[1]}" được dựng lại từ tiến trình nguồn cũ khi chuyển V8.3.2; thầy/cô xác nhận điểm kiểm tra này đúng ý sư phạm.`],
  [/^No verified current-class learner profile is embedded in the legacy package; keep class-specific claims unknown until teacher supplies\/approves evidence\.?$/i,
    () => 'Gói bài cũ không kèm hồ sơ học sinh đã xác minh của lớp hiện hành; mọi nhận định phụ thuộc lớp ở trạng thái "chưa rõ" cho đến khi thầy/cô cung cấp và duyệt minh chứng.'],
  [/^The legacy lesson package does not include a verified current-class learner profile for V8\.3\.2 planning\.?$/i,
    () => 'Gói bài cũ không có hồ sơ học sinh đã xác minh của lớp hiện hành để lập kế hoạch V8.3.2.'],
  [/^Exact entry\/work\/recall seconds for ([\w-]+) were authored in Stage 2 to implement the approved choreography repair; confirm classroom timing before Ready-to-Teach\.?$/i,
    m => `Số giây vào bài/làm bài/thu hồi của bước "${m[1]}" được đặt lại ở Giai đoạn 2 để thực hiện phương án sửa tiến trình đã duyệt; thầy/cô xác nhận thời lượng thật trên lớp trước khi chốt "Sẵn sàng dạy".`],
  [/^Learner evidence ([\w-]+) is unknown and requires teacher confirmation\.?$/i,
    m => `Minh chứng học sinh ${m[1]} đang ở trạng thái "chưa rõ" — cần thầy/cô xác nhận.`],
  [/^RESOLVED in Stage 2 by source-priority reconciliation and source-grounded LI\/SC evidence mapping\.?$/i,
    () => 'ĐÃ GIẢI QUYẾT ở Giai đoạn 2 bằng cách đối chiếu ưu tiên theo nguồn và ánh xạ minh chứng LI/SC bám nguồn.'],
  // Các dòng phân loại kiểu DSL trong inspection/rationale
  [/^has mathematical question evidence: (\[[^\]]*\])$/i,
    m => `Có minh chứng câu hỏi toán học: ${m[1]}`],
  [/^pure coordination\/standardisation\/reflection phase: ([\w-]+)$/i,
    m => `Bước phối hợp/chuẩn hoá/chốt kết: ${m[1]}`],
  [/^pure goal\/reflection coordination with non-mathematical question evidence: ([\w-]+)$/i,
    m => `Bước mục tiêu/chốt kết (không có câu hỏi toán học): ${m[1]}`],
  [/^main learning phase: ([\w-]+)$/i,
    m => `Bước học chính: ${m[1]}`],
  [/^high cognitive demand: ([\w-]+)$/i,
    m => `Mức độ nhận thức cao: ${m[1]}`],
  [/^has student questionInstances$/i,
    () => 'Có các câu hỏi dành cho học sinh'],
];

export const translateV832Reason = (reason: string): string => {
  const trimmed = reason.trim();
  for (const [pattern, translate] of TRANSLATIONS) {
    const match = trimmed.match(pattern);
    if (match) return translate(match);
  }
  return reason;
};
