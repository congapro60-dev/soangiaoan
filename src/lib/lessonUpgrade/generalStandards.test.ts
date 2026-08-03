import { describe, it, expect } from 'vitest';
import { auditGeneralStandards, detectSubject } from './generalStandards';

const find = (content: string, id: string) =>
  auditGeneralStandards(content).find((f) => f.id === id)!;

describe('detectSubject', () => {
  it('nhận môn từ dòng khai báo', () => {
    expect(detectSubject('Môn: Ngữ văn — Lớp 10')).toBe('ngu-van');
    expect(detectSubject('Môn học | Lịch sử')).toBe('lich-su');
  });

  it('không nhầm "liên môn" là dòng khai báo môn', () => {
    expect(detectSubject('Tích hợp liên môn Vật lí. Bài: Hàm số bậc hai và đồ thị.')).toBe('toan');
  });

  it('nội dung Toán luôn thắng — không tắt nhầm lớp kiểm Toán', () => {
    expect(detectSubject('Giải phương trình bậc hai, vẽ đồ thị hàm số.')).toBe('toan');
  });

  it('nhận môn qua từ khóa nội dung khi không khai báo', () => {
    const content = 'Phân tích tác phẩm, nhân vật trữ tình và các biện pháp tu từ trong bài. Thể thơ tự do.';
    expect(detectSubject(content)).toBe('ngu-van');
  });

  it('mặc định về Toán khi không đủ căn cứ', () => {
    expect(detectSubject('Giáo án tiết 1.')).toBe('toan');
  });
});

describe('auditGeneralStandards — checklist toàn trường', () => {
  it('trả về đúng 10 tiêu chí, tất cả scope "all"', () => {
    const findings = auditGeneralStandards('nội dung bất kỳ');
    expect(findings).toHaveLength(10);
    expect(findings.every((f) => f.scope === 'all')).toBe(true);
  });

  it('student-profile PASS khi có sĩ số và nhóm năng lực', () => {
    const f = find('Sĩ số 42. Lớp chia 3 nhóm năng lực, có học sinh yếu và học sinh giỏi.', 'student-profile');
    expect(f.status).toBe('pass');
  });

  it('student-profile WARN khi chỉ có sĩ số', () => {
    expect(find('Sĩ số 42 học sinh.', 'student-profile').status).toBe('warn');
  });

  it('student-profile FAIL khi không có thông tin lớp', () => {
    expect(find('Hoạt động 1: khởi động.', 'student-profile').status).toBe('fail');
  });

  it('plan-metadata PASS khi đủ 5 trường', () => {
    const content = 'Trường THPT Chuyên. Lớp: 10A1. Giáo viên soạn: Nguyễn Văn A. Ngày soạn 12/08. Tiết 25 theo PPCT.';
    const f = find(content, 'plan-metadata');
    expect(f.status).toBe('pass');
    expect(f.danielson).toBeUndefined();
  });

  it('plan-metadata liệt kê đúng trường còn thiếu', () => {
    const f = find('Trường THPT Chuyên. Lớp: 10A1. Tiết 25 theo PPCT.', 'plan-metadata');
    expect(f.status).toBe('warn');
    expect(f.evidence).toMatch(/người soạn/);
    expect(f.evidence).toMatch(/ngày\/tuần/);
  });

  it('activity-format-variety PASS khi có từ 3 hình thức', () => {
    const f = find('HS làm cá nhân, sau đó thảo luận nhóm, cuối cùng cả lớp chốt.', 'activity-format-variety');
    expect(f.status).toBe('pass');
    expect(f.danielson).toBe('1e');
  });

  it('activity-format-variety FAIL khi chỉ một hình thức', () => {
    expect(find('HS làm việc cá nhân suốt tiết.', 'activity-format-variety').status).toBe('fail');
  });

  it('safe-environment PASS khi có cam kết an toàn tâm lí', () => {
    expect(find('GV nhắc: trả lời sai cũng không sao, cả lớp tôn trọng ý kiến của bạn.', 'safe-environment').status).toBe('pass');
  });

  it('safe-environment WARN (không FAIL) khi thiếu', () => {
    expect(find('Hoạt động 1: khởi động.', 'safe-environment').status).toBe('warn');
  });

  it('differentiation-dimensions PASS khi nêu từ 2 trục quanh chỗ phân hóa', () => {
    const content = 'Phân hóa theo nội dung: nhóm yếu làm bài rút gọn. Phân hóa sản phẩm: nhóm giỏi trình bày poster.';
    const f = find(content, 'differentiation-dimensions');
    expect(f.status).toBe('pass');
    expect(f.evidence).toMatch(/nội dung/);
    expect(f.evidence).toMatch(/sản phẩm/);
  });

  it('differentiation-dimensions không ăn nhầm "sản phẩm dự kiến" ở xa', () => {
    const content =
      'Có phân hóa cho học sinh.' + ' x'.repeat(400) + ' Sản phẩm dự kiến: HS nêu được định nghĩa.';
    const f = find(content, 'differentiation-dimensions');
    expect(f.status).toBe('warn');
    expect(f.evidence).toMatch(/không nói rõ/);
  });

  it('differentiation-dimensions FAIL khi không nhắc phân hóa', () => {
    expect(find('Cả lớp làm chung một bộ bài tập.', 'differentiation-dimensions').status).toBe('fail');
  });

  it('reflection-prompt PASS với vé ra cửa 3-2-1', () => {
    expect(find('Sơ kết: HS viết vé ra cửa 3-2-1 về điều đã học.', 'reflection-prompt').status).toBe('pass');
  });

  it('reflection-prompt FAIL khi chỉ hỏi lại kiến thức', () => {
    expect(find('Củng cố: GV nhắc lại công thức vừa học.', 'reflection-prompt').status).toBe('fail');
  });

  it('global-citizenship PASS khi có bối cảnh toàn cầu', () => {
    expect(find('Ngữ liệu: số liệu biến đổi khí hậu toàn cầu.', 'global-citizenship').status).toBe('pass');
  });

  it('digital-citizenship phân biệt "dùng công cụ số" với năng lực công dân số', () => {
    const toolsOnly = find('HS dùng GeoGebra vẽ đồ thị.', 'digital-citizenship');
    expect(toolsOnly.status).toBe('warn');
    expect(toolsOnly.evidence).toMatch(/chưa chạm/);

    const real = find('HS dùng GeoGebra và phải ghi rõ trích dẫn nguồn dữ liệu.', 'digital-citizenship');
    expect(real.status).toBe('pass');
  });

  it('formative-assessment PASS khi có từ 2 hình thức', () => {
    const f = find('GV vấn đáp nhanh, sau đó HS lên bảng trình bày.', 'formative-assessment');
    expect(f.status).toBe('pass');
    expect(f.danielson).toBe('1f');
  });

  it('formative-assessment FAIL khi không có hoạt động đánh giá', () => {
    expect(find('GV giảng, HS ghi chép.', 'formative-assessment').status).toBe('fail');
  });

  it('resources-listed PASS khi có cả tài nguyên số và đồ dùng', () => {
    const f = find('Thiết bị dạy học: máy chiếu, slide, phiếu học tập, bảng nhóm.', 'resources-listed');
    expect(f.status).toBe('pass');
    expect(f.danielson).toBe('1d');
  });

  it('resources-listed WARN khi thiếu một nhóm', () => {
    const f = find('Thiết bị dạy học: máy chiếu và slide bài giảng.', 'resources-listed');
    expect(f.status).toBe('warn');
    expect(f.evidence).toMatch(/chưa có đồ dùng vật lí/);
  });
});
