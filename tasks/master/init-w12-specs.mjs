import fs from 'node:fs';

const SNAP_FILE = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const snap = JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8'));

const newItems = [
  // Khối 10 (5 bài)
  { key: '10-12-89', grade: 10, week: 12, period: 89, title: 'Các số đặc trưng đo xu thế trung tâm', kind: 'practice', lessonType: 'practice' },
  { key: '10-12-90', grade: 10, week: 12, period: 90, title: 'Các số đặc trưng đo mức độ phân tán', kind: 'formation', lessonType: 'formation' },
  { key: '10-12-91', grade: 10, week: 12, period: 91, title: 'Ôn tập chương V', kind: 'practice', lessonType: 'practice' },
  { key: '10-12-92', grade: 10, week: 12, period: 92, title: 'Tổng và hiệu của hai vectơ', kind: 'practice', lessonType: 'practice' },
  { key: '10-12-93', grade: 10, week: 12, period: 93, title: 'Tích của một vectơ với một số', kind: 'formation', lessonType: 'formation' },
  // Khối 11 (5 bài)
  { key: '11-12-83', grade: 11, week: 12, period: 83, title: 'Các số đặc trưng đo xu thế trung tâm', kind: 'practice', lessonType: 'practice' },
  { key: '11-12-84', grade: 11, week: 12, period: 84, title: 'Giới hạn của dãy số', kind: 'formation', lessonType: 'formation' },
  { key: '11-12-85', grade: 11, week: 12, period: 85, title: 'Giới hạn của dãy số', kind: 'formation', lessonType: 'formation' },
  { key: '11-12-86', grade: 11, week: 12, period: 86, title: 'Hai mặt phẳng song song', kind: 'formation', lessonType: 'formation' },
  { key: '11-12-87', grade: 11, week: 12, period: 87, title: 'Hai mặt phẳng song song', kind: 'practice', lessonType: 'practice' },
];

for (const item of newItems) {
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
