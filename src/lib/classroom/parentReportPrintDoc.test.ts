import { describe, expect, it } from 'vitest';
import { buildParentReportPrintDoc, keyTakeaways } from './parentReportPrintDoc';
import type { ParentSafeReport } from './parentSafeReport';

const report: ParentSafeReport = {
  studentId: 'student-1',
  studentName: 'Nguyễn Minh An',
  className: '11 Columbus',
  results: [
    { assignmentId: 'a1', title: 'Hàm số', status: 'official', score: 8, maxScore: 10 },
    { assignmentId: 'a2', title: 'Xác suất', status: 'pending', score: null, maxScore: null },
  ],
  officialCount: 1,
  officialAveragePercent: 80,
  pendingCount: 1,
  missingCount: 0,
  strengths: ['Hàm số'],
  areasToPractice: ['Xác suất'],
  progress: { trend: 'up', firstPercent: 60, latestPercent: 80 },
  overallSummary: 'Con học rất tốt, tiếp tục phát huy.',
  parentActions: ['Hỏi con mỗi ngày'],
  teacherActions: ['Giao bài luyện đúng phần yếu'],
};

describe('buildParentReportPrintDoc', () => {
  it('dựng nội dung báo cáo với thông tin học sinh và mọi mục an toàn', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus', studentCode: 'GB0117', generatedOn: '18/09/2026' });
    expect(html).toContain('parent-report-pdf-root'); // style đã scope
    expect(html).toContain('Nguyễn Minh An');
    expect(html).toContain('GB0117');
    expect(html).toContain('18/09/2026');
    expect(html).toContain('Con học rất tốt, tiếp tục phát huy.');
    expect(html).toContain('Hỏi con mỗi ngày');
    expect(html).toContain('Giao bài luyện đúng phần yếu');
    expect(html).toContain('Mới có 1 bài đã chấm'); // mới 1 bài → không nhận định xu hướng
    expect(html).not.toContain('Đang tiến bộ');
    expect(html).toContain('8/10'); // điểm bài official
    expect(html).toContain('80.0%'); // điểm trung bình
  });

  it('escape ký tự HTML trong dữ liệu động để không vỡ trang', () => {
    const html = buildParentReportPrintDoc({
      report: { ...report, strengths: ['<script>alert(1)</script>'] },
      studentName: 'A & B <x>',
      className: '11',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &lt;x&gt;');
  });

  it('không kèm ghi chú nội bộ hay đáp án (chỉ nhận ParentSafeReport)', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus' });
    expect(html).not.toContain('noteForTeacher');
    expect(html).not.toContain('expectedAnswer');
  });

  it('hiện mục Năng lực Toán học khi có hồ sơ, nhóm theo mức', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'Nguyễn Minh An', className: '11 Columbus',
      competency: {
        grade: '11', assessed: 2, total: 5,
        items: [
          { area: 'Đại số', topic: 'Hàm số', level: 'Tốt' },
          { area: 'Xác suất', topic: 'Biến cố', level: 'Đạt yêu cầu' },
        ],
      },
    });
    expect(html).toContain('Năng lực Toán học');
    expect(html).toContain('2/5'); // tiến độ đánh giá
    expect(html).toContain('Tốt');
    expect(html).toContain('Hàm số');
    expect(html).toContain('Đạt yêu cầu');
  });

  it('bỏ mục Năng lực Toán học khi không có hồ sơ (competency vắng)', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus' });
    expect(html).not.toContain('Năng lực Toán học');
  });

  it('hiện mục Điểm thi định kì với MOET (thang 10) + TDS (kèm điểm chữ)', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'Nguyễn Minh An', className: '11 Columbus',
      exams: {
        moet: [{ label: 'Khảo sát đầu năm', score: 2.35 }, { label: 'Giữa học kì I', score: 6 }],
        tds: [{ label: 'Quý 1', score: 7, letter: 'B' }],
      },
    });
    expect(html).toContain('Điểm thi định kì');
    expect(html).toContain('Khảo sát đầu năm');
    expect(html).toContain('2.35/10');
    expect(html).toContain('Quý 1');
    expect(html).toContain('>B<'); // điểm chữ
  });

  it('bỏ mục Điểm thi định kì khi không có điểm', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus', exams: { moet: [], tds: [] }, hs1: [] });
    expect(html).not.toContain('Điểm thi định kì');
    expect(html).not.toContain('hệ số 1');
  });

  it('điểm hệ số 1 vào cùng mục, kèm ngày và điểm trung bình — kể cả khi chưa có điểm thi', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'Nguyễn Minh An', className: '11 Columbus',
      hs1: [{ label: 'KT 15 phút lần 1', date: '2026-09-20', score: 8 }, { label: 'Miệng', date: '2026-09-22', score: 9.5 }],
    });
    expect(html).toContain('Điểm kiểm tra &amp; thi định kì');
    expect(html).toContain('Điểm trên lớp (thang 10, có hệ số) · TB 8.75');
    expect(html).toContain('KT 15 phút lần 1');
    expect(html).toContain('20/09/2026');
    expect(html).toContain('9.5/10');
  });

  it('báo cáo theo kì: tiêu đề + khoảng, nhận xét giáo viên (đã escape), so sánh, biểu đồ theo tháng', () => {
    const html = buildParentReportPrintDoc({
      report,
      studentName: 'An',
      className: '10A',
      period: { title: 'Báo cáo cuối học kì I — năm học 2026–2027', range: 'Từ 01/09/2026 đến 15/01/2027', kind: 'ck1' },
      comparison: { before: { label: 'Nửa đầu', avgPercent: 60, count: 3 }, after: { label: 'Nửa sau', avgPercent: 75, count: 4 } },
      monthly: [{ month: '2026-09', label: 'T9', avgPercent: 60, count: 3 }, { month: '2026-10', label: 'T10', avgPercent: 75, count: 4 }],
      teacherComment: 'Con tiến bộ <rõ>.' + String.fromCharCode(10) + 'Cần luyện thêm.',
    });
    expect(html).toContain('Báo cáo cuối học kì I — năm học 2026–2027');
    expect(html).toContain('Từ 01/09/2026 đến 15/01/2027');
    expect(html).toContain('Nhận xét của giáo viên');
    expect(html).toContain('Con tiến bộ &lt;rõ&gt;.<br/>Cần luyện thêm.');
    expect(html).toContain('Tiến bộ 15.0 điểm phần trăm');
    expect(html).toContain('Điểm trung bình theo tháng');
  });

  it('không có kì / nhận xét thì giữ bản chung như trước', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'An', className: '10A' });
    expect(html).toContain('Báo cáo học tập môn Toán');
    expect(html).not.toContain('Nhận xét của giáo viên');
    expect(html).not.toContain('So sánh để thấy tiến bộ');
  });

  it('có kết quả theo YCCĐ thì thay danh sách chủ đề: nhóm theo chủ đề, mức, ghi chú đã escape, số câu căn cứ', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'An', className: '10A',
      requirements: [
        { id: 'T10.03', level: 'chua', evidence: 3, percent: 33.3, note: 'Nhầm giao với hợp <b>' },
        { id: 'T10.01', level: 'vung', evidence: 2, percent: 100, note: '' },
      ],
    });
    expect(html).toContain('Kết quả theo yêu cầu cần đạt');
    expect(html).not.toContain('✅ Điểm mạnh');
    expect(html.indexOf('Đại số · Mệnh đề')).toBeLessThan(html.indexOf('Đại số · Tập hợp và các phép toán trên tập hợp'));
    expect(html).toContain('Nhầm giao với hợp &lt;b&gt;');
    expect(html).toContain('Căn cứ: 3 câu · đạt 33%');
    expect(html).toContain('Chưa đạt: 1');
  });

  it('chưa có kết quả theo YCCĐ: danh sách chủ đề cũ, mỗi cột tối đa 6 dòng', () => {
    const many = { ...report, strengths: Array.from({ length: 10 }, (_, i) => `Mạnh ${i}`), areasToPractice: [] };
    const html = buildParentReportPrintDoc({ report: many, studentName: 'An', className: '10A', requirements: [] });
    expect(html).toContain('Mạnh 5');
    expect(html).not.toContain('Mạnh 6');
  });
});


describe('báo cáo phụ huynh — bản web, tóm tắt nhanh, nhận diện trường, minh họa', () => {
  const base = { studentName: 'An', className: '10A' };
  const requirements = [
    { id: 'T10.01', level: 'vung', evidence: 3, percent: 92, note: 'Phát biểu đúng mệnh đề đảo.' },
    { id: 'T10.04', level: 'dang', evidence: 4, percent: 65, note: 'Còn nhầm khi tìm phần bù.' },
    { id: 'T10.05', level: 'chua', evidence: 2, percent: 30, note: 'Chưa lập được sơ đồ Ven.' },
  ] as const;

  it('tóm tắt nhanh: điểm mạnh = dòng Vững cao nhất, cần chú ý = dòng yếu nhất, việc nhà = gợi ý đầu', () => {
    expect(keyTakeaways(report, requirements)).toEqual([
      { tone: 'good', label: 'Điểm mạnh', text: 'Phát biểu đúng mệnh đề đảo.' },
      // dòng "Chưa đạt" chỉ có 2 câu căn cứ nên không được lấy làm kết luận; lấy dòng yếu nhất ĐỦ căn cứ
      { tone: 'focus', label: 'Cần chú ý', text: 'Còn nhầm khi tìm phần bù.' },
      { tone: 'home', label: 'Phụ huynh có thể làm', text: 'Hỏi con mỗi ngày' },
    ]);
  });

  it('chưa có yêu cầu cần đạt thì lấy chủ đề chung của báo cáo; thiếu dữ liệu thì bỏ ô đó', () => {
    expect(keyTakeaways(report, null).map(item => item.text)).toEqual(['Hàm số', 'Cần rèn thêm: Xác suất.', 'Hỏi con mỗi ngày']);
    expect(keyTakeaways({ strengths: [], areasToPractice: [], parentActions: [] }, null)).toEqual([]);
  });

  it('bản in có ô ký tên; bản web thì không, và có luật co giãn cho điện thoại', () => {
    const print = buildParentReportPrintDoc({ ...base, report });
    const web = buildParentReportPrintDoc({ ...base, report }, 'web');
    expect(print).toContain('class="signature"');
    expect(print).not.toContain('@media (max-width: 640px)');
    expect(web).not.toContain('class="signature"');
    expect(web).toContain('@media (max-width: 640px)');
    expect(web).toContain('Tóm tắt nhanh');
  });

  it('yêu cầu cần đạt: nhận xét dễ hiểu đứng trước, câu chữ chương trình đứng sau', () => {
    const html = buildParentReportPrintDoc({ ...base, report, requirements: [...requirements] });
    expect(html.indexOf('Phát biểu đúng mệnh đề đảo.')).toBeLessThan(html.indexOf('Theo chương trình:'));
  });

  it('nhận diện trường: tên trường, giáo viên, logo hợp lệ hiện ra; logo lạ bị bỏ, không chèn được mã', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    const ok = buildParentReportPrintDoc({ ...base, report, branding: { schoolName: 'Trường <A>', teacherName: 'Cô Lan', logoDataUrl: logo } });
    expect(ok).toContain('Trường &lt;A&gt;');
    expect(ok).toContain('<div class="sig-name">Cô Lan</div>');
    expect(ok.indexOf('Trường &lt;A&gt;')).toBeLessThan(ok.indexOf('Cô Lan'));
    expect(ok).toContain(`src="${logo}"`);
    const bad = buildParentReportPrintDoc({ ...base, report, branding: { schoolName: 'T', logoDataUrl: 'javascript:alert(1)' } });
    expect(bad).not.toContain('<img');
    const evil = buildParentReportPrintDoc({ ...base, report, branding: { logoDataUrl: 'data:image/png;base64,AAA" onerror="x' } });
    expect(evil).not.toContain('<img');
  });

  it('có dải minh họa đầu báo cáo và biểu tượng ở đầu mục; không còn emoji', () => {
    const html = buildParentReportPrintDoc({ ...base, report, teacherComment: 'Tốt' });
    expect(html).toContain('class="hero"');
    expect(html).toContain('class="ico"');
    expect(html).not.toMatch(/[✅🎯🤝🎓]/u);
  });

  it('hai tầng: tóm tắt ở trên, chi tiết ở dưới; web thu gọn bằng <details>, bản in có dải ngăn cách', () => {
    const web = buildParentReportPrintDoc({ ...base, report, teacherComment: 'Tốt' }, 'web');
    const print = buildParentReportPrintDoc({ ...base, report, teacherComment: 'Tốt' });
    for (const html of [web, print]) {
      expect(html.indexOf('Tóm tắt nhanh')).toBeLessThan(html.indexOf('Chi tiết báo cáo'));
      expect(html.indexOf('Nhận xét của giáo viên')).toBeLessThan(html.indexOf('Chi tiết báo cáo'));
      expect(html.indexOf('Chi tiết báo cáo')).toBeLessThan(html.indexOf('Tổng quan bằng số'));
      expect(html.indexOf('Chi tiết báo cáo')).toBeLessThan(html.indexOf('Kết quả từng bài'));
    }
    expect(web).toContain('<details class="more"');
    expect(print).not.toContain('<details');
    expect(print).toContain('more-banner');
  });

  it('tên giáo viên đứng CUỐI báo cáo (web: thẻ có chữ cái đầu; in: dưới dòng ký), không còn ở đầu trang', () => {
    const input = { ...base, report, branding: { schoolName: 'Trường A', teacherName: 'Vũ Việt Cường' } };
    const web = buildParentReportPrintDoc(input, 'web');
    const print = buildParentReportPrintDoc(input);
    expect(web).toContain('class="avatar">VC<');
    expect(web.lastIndexOf('Vũ Việt Cường')).toBeGreaterThan(web.indexOf('Chi tiết báo cáo'));
    expect(web.indexOf('Vũ Việt Cường')).toBeGreaterThan(web.indexOf('Cùng đồng hành với con'));
    expect(print.indexOf('<div class="sig-name">')).toBeGreaterThan(print.indexOf('Kết quả từng bài'));
    expect(buildParentReportPrintDoc({ ...base, report }, 'web')).not.toContain('<div class="teacher-foot">');
  });

  it('độ tin cậy: ghi số bài; dưới 3 bài không nhận định xu hướng; yêu cầu dưới 3 câu căn cứ ghi "Chưa đủ căn cứ"', () => {
    const one = { ...report, results: [report.results[0]], officialCount: 1 };
    const few = buildParentReportPrintDoc({ ...base, report: one });
    expect(few).toContain('Mới có 1 bài đã chấm');
    expect(few).toContain('Cần thêm bài để nhận định');
    expect(few).toContain('Cần ít nhất 3 bài đã chấm để vẽ xu hướng');
    const three = buildParentReportPrintDoc({ ...base, report: { ...report, results: [report.results[0], report.results[0], report.results[0]] } });
    expect(three).toContain('Dựa trên 3 bài đã chấm');
    expect(three).toContain('Đang tiến bộ');
    const thin = buildParentReportPrintDoc({ ...base, report, requirements: [{ id: 'T10.05', level: 'chua', evidence: 2, percent: 30, note: 'Chưa lập được sơ đồ Ven.' }] });
    expect(thin).toContain('Chưa đủ căn cứ');
    expect(thin).not.toContain('Chưa đạt: 1');
    expect(keyTakeaways(report, [{ id: 'T10.05', level: 'chua', evidence: 2, percent: 30, note: 'x' }]).find(item => item.tone === 'focus')?.text).toBe('Cần rèn thêm: Xác suất.');
  });

  it('mục đồng hành không nhắc lại gợi ý đã có ở Tóm tắt nhanh', () => {
    const two = { ...report, parentActions: ['Gợi ý A', 'Gợi ý B'] };
    const html = buildParentReportPrintDoc({ ...base, report: two });
    expect(html.split('Gợi ý A').length - 1).toBe(1);
    expect(html).toContain('Gợi ý B');
  });

  it('bản đồ theo bài SGK: ngay dưới đoạn tổng quan, trước nhận xét; thay "Tóm tắt nhanh"; ưu tiên ôn + thẻ từng bài', () => {
    for (const variant of ['web', 'print'] as const) {
      const html = buildParentReportPrintDoc({ ...base, report, teacherComment: 'Tốt', requirements: [...requirements] }, variant);
      expect(html).toContain('Bản đồ theo bài SGK');
      expect(html.indexOf('class="lead"')).toBeLessThan(html.indexOf('Bản đồ theo bài SGK'));
      expect(html.indexOf('Bản đồ theo bài SGK')).toBeLessThan(html.indexOf('Nhận xét của giáo viên'));
      expect(html).not.toContain('Tóm tắt nhanh');
      expect(html).toContain('SGK Toán 10</span>');
      expect(html.match(/class="lm-card /g)).toHaveLength(2);
      expect(html).toContain('<span class="lm-bai nw">Bài 2</span><span class="lm-lv nw">Đang hình thành</span>');
      expect(html).toMatch(/Ưu tiên ôn trước<\/p><ol><li><b class="nw">Bài 2<\/b> — Tập hợp/);
      // Gợi ý đầu không còn bị chuyển lên "Tóm tắt nhanh" → mục đồng hành in đủ.
      expect(html).toContain('Hỏi con mỗi ngày');
    }
  });

  it('bản đồ: mọi bài đã đủ căn cứ đều Vững thì báo "chưa có bài nào cần ôn gấp"; không có YCCĐ thì không có bản đồ', () => {
    const html = buildParentReportPrintDoc({ ...base, report, requirements: [requirements[0]] }, 'web');
    expect(html).toContain('Chưa có bài nào cần ôn gấp');
    const none = buildParentReportPrintDoc({ ...base, report, requirements: [] }, 'web');
    expect(none).not.toContain('Bản đồ theo bài SGK');
    expect(none).toContain('Tóm tắt nhanh');
  });

  it('xuống dòng theo cụm: nhãn mức, chú thích, mã học sinh là khối không ngắt; chú thích mỗi mức một mục riêng', () => {
    const html = buildParentReportPrintDoc({ ...base, studentCode: 'GB0231', report, requirements: [...requirements] }, 'web');
    expect(html).toContain('<span class="nw">Mã HS GB0231</span>');
    expect(html).toContain('<span class="nw">Đang hình thành 50–79%</span>');
    expect(html).toContain('<li><i class="lm-d lm-dang"></i>Đang hình thành: 50–79%</li>');
    expect(html).toContain('.lm-legend li { display:flex; align-items:center; gap:7px; margin:0; white-space:nowrap;');
    expect(html).toContain('.lm-legend { flex-direction:column;');
    expect(html).toContain('.nw { white-space:nowrap; }');
  });

  it('thẻ bài ghi rõ số câu đến từ bài kiểm tra định kì', () => {
    const html = buildParentReportPrintDoc({ ...base, report, requirements: [{ id: 'T10.04', level: 'dang', evidence: 3, percent: 66.7, note: '', questions: [
      { code: 'b1q1', score: 1, max: 1 }, { code: 'b1q2', score: 1, max: 1 }, { code: 'b2q1', score: 0, max: 1, test: true },
    ] }] }, 'web');
    expect(html).toContain('<span class="nw">3&nbsp;câu làm căn cứ</span><span class="nw">trong đó 1&nbsp;câu bài kiểm tra</span>');
  });
});

