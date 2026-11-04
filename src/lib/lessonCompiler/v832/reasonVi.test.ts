import { describe, expect, it } from 'vitest';
import { translateV832Reason } from './reasonVi';

describe('translateV832Reason', () => {
  it('dịch mẫu Handoff timing kèm mã bề mặt', () => {
    expect(translateV832Reason('Handoff timing for explore is a V8.3.2 migration planning assumption; V8.2.1 source did not separately budget entry/recall seconds.'))
      .toBe('Thời gian chuyển bước "explore" là giả định khi chuyển lên V8.3.2; nguồn V8.2.1 không tách riêng số giây vào bài và thu hồi.');
  });

  it('dịch mẫu recheck mapping kèm mã hoạt động', () => {
    expect(translateV832Reason('V8.3.2 recheck mapping for practice was synthesized from the legacy sequence; confirm that the selected next checkpoint is pedagogically intended.'))
      .toBe('Điểm kiểm tra sau bước "practice" được dựng lại từ tiến trình nguồn cũ khi chuyển V8.3.2; thầy/cô xác nhận điểm kiểm tra này đúng ý sư phạm.');
  });

  it('dịch mẫu hồ sơ học sinh nhúng trong gói cũ', () => {
    expect(translateV832Reason('No verified current-class learner profile is embedded in the legacy package; keep class-specific claims unknown until teacher supplies/approves evidence.'))
      .toBe('Gói bài cũ không kèm hồ sơ học sinh đã xác minh của lớp hiện hành; mọi nhận định phụ thuộc lớp ở trạng thái "chưa rõ" cho đến khi thầy/cô cung cấp và duyệt minh chứng.');
  });

  it('dịch mẫu hồ sơ học sinh thiếu cho V8.3.2 planning', () => {
    expect(translateV832Reason('The legacy lesson package does not include a verified current-class learner profile for V8.3.2 planning.'))
      .toBe('Gói bài cũ không có hồ sơ học sinh đã xác minh của lớp hiện hành để lập kế hoạch V8.3.2.');
  });

  it('dịch mẫu số giây entry/work/recall', () => {
    expect(translateV832Reason('Exact entry/work/recall seconds for problem were authored in Stage 2 to implement the approved choreography repair; confirm classroom timing before Ready-to-Teach.'))
      .toBe('Số giây vào bài/làm bài/thu hồi của bước "problem" được đặt lại ở Giai đoạn 2 để thực hiện phương án sửa tiến trình đã duyệt; thầy/cô xác nhận thời lượng thật trên lớp trước khi chốt "Sẵn sàng dạy".');
  });

  it('dịch mẫu minh chứng học sinh chưa rõ', () => {
    expect(translateV832Reason('Learner evidence LE-UNKNOWN-CLASS is unknown and requires teacher confirmation.'))
      .toBe('Minh chứng học sinh LE-UNKNOWN-CLASS đang ở trạng thái "chưa rõ" — cần thầy/cô xác nhận.');
  });

  it('dịch mẫu đã giải quyết ở Giai đoạn 2', () => {
    expect(translateV832Reason('RESOLVED in Stage 2 by source-priority reconciliation and source-grounded LI/SC evidence mapping.'))
      .toBe('ĐÃ GIẢI QUYẾT ở Giai đoạn 2 bằng cách đối chiếu ưu tiên theo nguồn và ánh xạ minh chứng LI/SC bám nguồn.');
  });

  it('dịch các dòng phân loại DSL', () => {
    expect(translateV832Reason("has mathematical question evidence: ['compare']"))
      .toBe("Có minh chứng câu hỏi toán học: ['compare']");
    expect(translateV832Reason('pure coordination/standardisation/reflection phase: title'))
      .toBe('Bước phối hợp/chuẩn hoá/chốt kết: title');
    expect(translateV832Reason('main learning phase: warmup'))
      .toBe('Bước học chính: warmup');
    expect(translateV832Reason('high cognitive demand: analyze'))
      .toBe('Mức độ nhận thức cao: analyze');
    expect(translateV832Reason('has student questionInstances'))
      .toBe('Có các câu hỏi dành cho học sinh');
    expect(translateV832Reason('pure goal/reflection coordination with non-mathematical question evidence: personal_goal'))
      .toBe('Bước mục tiêu/chốt kết (không có câu hỏi toán học): personal_goal');
  });

  it('giữ nguyên văn chuỗi lạ', () => {
    const unknown = 'Migrated from the legacy source choreography; Menelaus also contains substantial practice-strategy work.';
    expect(translateV832Reason(unknown)).toBe(unknown);
  });
});
