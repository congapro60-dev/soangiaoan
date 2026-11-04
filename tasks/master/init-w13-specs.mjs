import fs from 'node:fs';

const SNAP_FILE = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const snap = JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8'));

const w13Items = [
  // Khối 10 (8 bài)
  { key: '10-13-96', grade: 10, week: 13, period: 96, title: 'Báo cáo dự án thống kê thực nghiệm 1', kind: 'practice', lessonType: 'practice' },
  { key: '10-13-97', grade: 10, week: 13, period: 97, title: 'Báo cáo dự án thống kê thực nghiệm 2', kind: 'practice', lessonType: 'practice' },
  { key: '10-13-98', grade: 10, week: 13, period: 98, title: 'Luyện tập tích của một vectơ với một số', kind: 'practice', lessonType: 'practice' },
  { key: '10-13-99', grade: 10, week: 13, period: 99, title: 'Tọa độ của vectơ và các phép toán', kind: 'formation', lessonType: 'formation' },
  { key: '10-13-100', grade: 10, week: 13, period: 100, title: 'Biểu thức tọa độ và độ dài vectơ', kind: 'formation', lessonType: 'formation' },
  { key: '10-13-101', grade: 10, week: 13, period: 101, title: 'Luyện tập tọa độ vectơ trong mặt phẳng', kind: 'practice', lessonType: 'practice' },
  { key: '10-13-102', grade: 10, week: 13, period: 102, title: 'Tự chọn: Ứng dụng tọa độ vectơ giải toán', kind: 'practice', lessonType: 'practice' },
  { key: '10-13-103', grade: 10, week: 13, period: 103, title: 'Tự chọn: Bài toán định vị và chuyển động', kind: 'practice', lessonType: 'practice' },

  // Khối 11 (8 bài)
  { key: '11-13-90', grade: 11, week: 13, period: 90, title: 'Giới hạn vô cực của dãy số', kind: 'formation', lessonType: 'formation' },
  { key: '11-13-91', grade: 11, week: 13, period: 91, title: 'Luyện tập giới hạn của dãy số', kind: 'practice', lessonType: 'practice' },
  { key: '11-13-92', grade: 11, week: 13, period: 92, title: 'Giới hạn hữu hạn của hàm số tại một điểm', kind: 'formation', lessonType: 'formation' },
  { key: '11-13-93', grade: 11, week: 13, period: 93, title: 'Giới hạn một bên của hàm số', kind: 'formation', lessonType: 'formation' },
  { key: '11-13-94', grade: 11, week: 13, period: 94, title: 'Phép chiếu song song và hình biểu diễn', kind: 'formation', lessonType: 'formation' },
  { key: '11-13-95', grade: 11, week: 13, period: 95, title: 'Luyện tập phép chiếu song song', kind: 'practice', lessonType: 'practice' },
  { key: '11-13-96', grade: 11, week: 13, period: 96, title: 'Tự chọn: Khử dạng vô định của giới hạn', kind: 'practice', lessonType: 'practice' },
  { key: '11-13-97', grade: 11, week: 13, period: 97, title: 'Tự chọn: Hình biểu diễn của khối đa diện', kind: 'practice', lessonType: 'practice' },

  // Khối 12 (8 bài)
  { key: '12-13-90', grade: 12, week: 13, period: 90, title: 'Luyện tập phương pháp đổi biến số nguyên hàm', kind: 'practice', lessonType: 'practice' },
  { key: '12-13-91', grade: 12, week: 13, period: 91, title: 'Luyện tập phương pháp nguyên hàm từng phần', kind: 'practice', lessonType: 'practice' },
  { key: '12-13-92', grade: 12, week: 13, period: 92, title: 'Diện tích hình thang cong và tích phân', kind: 'formation', lessonType: 'formation' },
  { key: '12-13-93', grade: 12, week: 13, period: 93, title: 'Định nghĩa tích phân và công thức Newton', kind: 'formation', lessonType: 'formation' },
  { key: '12-13-94', grade: 12, week: 13, period: 94, title: 'Tính chất tuyến tính và cộng đoạn tích phân', kind: 'formation', lessonType: 'formation' },
  { key: '12-13-95', grade: 12, week: 13, period: 95, title: 'Tính chất đổi cận và hàm số chẵn lẻ', kind: 'formation', lessonType: 'formation' },
  { key: '12-13-96', grade: 12, week: 13, period: 96, title: 'Luyện tập tính tích phân cơ bản', kind: 'practice', lessonType: 'practice' },
  { key: '12-13-97', grade: 12, week: 13, period: 97, title: 'Tự chọn: Kỹ thuật tính nhanh tích phân', kind: 'practice', lessonType: 'practice' },
];

for (const item of w13Items) {
  const existing = snap.lessonSpecs.find((x) => x.key === item.key);
  if (!existing) {
    snap.lessonSpecs.push({
      key: item.key,
      grade: item.grade,
      week: item.week,
      period: item.period,
      title: item.title,
      kind: item.kind,
      lessonType: item.lessonType,
      focus: '',
      formulas: [],
      boardKnowledge: [],
      examples: [
        { question: 'Q1', solution: 'A1' },
        { question: 'Q2', solution: 'A2' },
      ],
      exercises: [
        { level: 'NB', question: 'E1', answer: 'Ans1' },
        { level: 'NB', question: 'E2', answer: 'Ans2' },
        { level: 'TH', question: 'E3', answer: 'Ans3' },
        { level: 'TH', question: 'E4', answer: 'Ans4' },
        { level: 'VD', question: 'E5', answer: 'Ans5' },
        { level: 'VD', question: 'E6', answer: 'Ans6' },
      ],
      quick: [
        { question: 'Quick1', solution: 'Sol1' },
        { question: 'Quick2', solution: 'Sol2' },
      ],
      mistakes: ['Mistake 1'],
      selfChoice: false,
      timelineKey: 'default',
    });
    console.log(`Đã thêm khung spec cho ${item.key}`);
  }
}

fs.writeFileSync(SNAP_FILE, JSON.stringify(snap, null, 2) + '\n', 'utf8');
console.log(`Tổng số specs hiện tại trong batch2: ${snap.lessonSpecs.length}`);
