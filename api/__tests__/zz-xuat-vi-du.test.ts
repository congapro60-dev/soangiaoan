/**
 * CÔNG CỤ XUẤT VÍ DỤ (không phải test hồi quy) — chỉ chạy khi EXPORT_EXAMPLES=1.
 * Chạy: $env:EXPORT_EXAMPLES='1'; npx vitest run api/__tests__/zz-xuat-vi-du.test.ts --reporter=verbose
 */
import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { menuText } from '../_assistant-ph-hs-menu.js';
import { splitForChat } from '../_assistant-natural-reply.js';
import { isPendingListQuestion, isCongratulation, openSessionReply, photoAcceptedReply, photoListReply, gradedReply } from '../_assistant-ph-hs-photo.js';
import { buildSystemPrompt } from '../_assistant-ph-hs-chat.js';

const rule = (title: string) => console.log(`\n${'='.repeat(72)}\n${title}\n${'='.repeat(72)}`);
const show = (parts: string[], prefix = 'TIN') => parts.forEach((p, i) => console.log(`\n--- ${prefix} ${i + 1}/${parts.length} (${p.length} ký tự) ---\n${p}`));

describe.skipIf(process.env.EXPORT_EXAMPLES !== '1')('XUẤT VÍ DỤ', () => {
  it('1. Menu HS', () => {
    rule('1. MENU DÀNH CHO HỌC SINH (nhắn 0)');
    console.log(menuText('Nguyễn Bảo Trâm', '6A1', 'student'));
  });

  it('2. Menu PH', () => {
    rule('2. MENU DÀNH CHO PHỤ HUYNH (nhắn 0)');
    console.log(menuText('Nguyễn Bảo Trâm', '6A1', 'parent'));
  });

  it('9. Xuất file JSON để gửi thật qua Zalo', () => {
    const list1 = photoListReply([
      { id: 'a1', title: 'BTVN tuần 6 — Phân số', dueAt: '2026-11-08', overdue: false, attachments: [{ name: 'de-bai.pdf', url: 'https://firebasestorage.example/de-bai.pdf', type: 'pdf' }] },
      { id: 'a2', title: 'Kiểm tra 15 phút — Số nguyên', dueAt: '2026-11-10', overdue: false, attachments: [] },
    ]);
    const payload = [
      `${menuText('Nguyễn Bảo Trâm', '6A1', 'student')}`,
      list1,
      openSessionReply('BTVN tuần 6 — Phân số', [{ name: 'de-bai.pdf', url: 'https://firebasestorage.example/de-bai.pdf', type: 'pdf' }]),
      photoAcceptedReply(1, 2.4 * 1024 * 1024),
      gradedReply('BTVN tuần 6 — Phân số', 8, 10, true),
    ];
    writeFileSync(process.env.EXPORT_EXAMPLES_OUT || 'samples-zalo.json', JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Đã ghi ${payload.length} tin ra file.`);
  });

  it('3. Chia tin câu trả lời dài', () => {    rule('3. CHIA TIN NHƯ NGƯỜI THẬT (câu trả lời AI dài)');
    const aiText = [
      'Bảo Trâm nè, bài tuần 5 em làm tốt lắm, được 8/10 điểm 👏',
      '',
      'Phần phân số em quy đồng đúng hết, trình bày cũng sạch hơn tuần trước. Riêng câu 3b em quên rút gọn nên bị trừ 1 điểm.',
      '',
      'Mình gửi thêm 2 bài luyện phân số nhé, em làm xong nhắn mình chấm. Cố lên em!',
      '',
      '👉 Xem chi tiết từng câu: nhắn 2.',
      '',
      'Nhắn 0 để xem lại menu.',
    ].join('\n');
    show(splitForChat(aiText, 3));
  });

  it('4. Danh sách bài chờ nộp có file', () => {
    rule('4. DANH SÁCH BÀI CHỜ NỘP (nhắn 8) — có file đính kèm, có bài quá hạn');
    const reply = photoListReply([
      { id: 'a1', title: 'BTVN tuần 6 — Phân số', dueAt: '2026-11-08', overdue: false, attachments: [{ name: 'de-bai.pdf', url: 'https://firebasestorage.example/de-bai.pdf', type: 'pdf' }] },
      { id: 'a2', title: 'Kiểm tra 15 phút — Số nguyên', dueAt: '2026-11-10', overdue: false, attachments: [] },
      { id: 'a3', title: 'BTVN tuần 4 — Hình học', dueAt: '2026-10-30', overdue: true, attachments: [{ name: 'hinh-ve.jpg', url: 'https://firebasestorage.example/hinh.jpg', type: 'image' }] },
    ]);
    console.log(`(${reply.length} ký tự — trần Zalo 2000)`);
    console.log(reply);
  });

  it('5. Chọn bài xong → hướng dẫn nộp', () => {
    rule('5. SAU KHI CHỌN BÀI (nhắn 1) — hướng dẫn + lưu ý');
    console.log(openSessionReply('BTVN tuần 6 — Phân số', [
      { name: 'de-bai.pdf', url: 'https://firebasestorage.example/de-bai.pdf', type: 'pdf' },
    ]));
  });

  it('6. Nhận ảnh + chấm xong', () => {
    rule('6. NHẬN ẢNH + CHẤM XONG');
    console.log('--- Sau khi gửi 1 ảnh ---');
    console.log(photoAcceptedReply(1, 2.4 * 1024 * 1024));
    console.log('\n--- Sau khi nhắn "xong" (đã duyệt 8/10 → có sticker chúc mừng) ---');
    console.log(gradedReply('BTVN tuần 6 — Phân số', 8, 10, true));
    console.log('\n--- Máy chấm xong nhưng CHƯA duyệt (7.5/10) ---');
    console.log(gradedReply('BTVN tuần 6 — Phân số', 7.5, 10, false));
    console.log('\n--- PH nộp hộ bạn (nộp hộ) ---');
    console.log(gradedReply('BTVN tuần 6 — Phân số', 8, 10, true, 'Cường Đẹp'));
  });

  it('7. Nhận diện "bài chưa nộp" + prompt Vip-pro', () => {
    rule('7. TAY CHÂN CHO AI — nhận diện câu hỏi, và prompt persona');
    for (const q of ['còn bài nào chưa nộp không ạ', 'con bai nao chua nop', 'hạn nộp bài tuần này', 'điểm tuần 5 của em bao nhiêu'])
      console.log(`  "${q}" -> ${isPendingListQuestion(q) ? 'TRẢ DỮ LIỆU THẬT' : 'để AI trả lời'}`);
    console.log(`\nChúc mừng khi đã duyệt + >=80%: 8/10=${isCongratulation(8, 10, true)} | 7/10=${isCongratulation(7, 10, true)} | chưa duyệt=${isCongratulation(10, 10, false)}`);
    console.log('\n--- Prompt hệ thống (HS) có tên trợ lý ---');
    process.env.ASSISTANT_NAME = 'Vip-pro';
    const prompt = buildSystemPrompt('DỮ LIỆU GIẢ', 'student', 'Nguyễn Bảo Trâm');
    console.log(prompt.split('\n').slice(0, 4).join('\n'));
    delete process.env.ASSISTANT_NAME;
  });
});
