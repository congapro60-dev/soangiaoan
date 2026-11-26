import { Bot, ShieldAlert } from 'lucide-react';

/**
 * Hướng dẫn giáo viên TỰ TẠO bot Zalo cho lớp mình (chủ máy yêu cầu 26/11/2026).
 * Lý do: gói miễn phí của Zalo Bot Platform chỉ cho mỗi bot 50 người dùng và 3.000 tin/tháng, nên một bot chung
 * không đủ cho mọi lớp. Các bước lấy từ bot.zaloplatforms.com/docs/create-bot và /docs/authorize (đọc 26/11/2026).
 * Phần kết nối bot riêng với SmartPlan chưa có — nói thẳng, không hứa ngày, không bảo gửi mã bot cho ai.
 */
const STEPS: Array<{ title: string; detail: string }> = [
  { title: 'Mở Zalo trên điện thoại', detail: 'Dùng tài khoản Zalo của chính thầy cô. Bot tạo ra sẽ thuộc tài khoản này.' },
  { title: 'Tìm "Zalo Bot Manager"', detail: 'Gõ Zalo Bot Manager vào ô tìm kiếm, mở tài khoản chính thức có tên này.' },
  { title: 'Chọn "Tạo bot"', detail: 'Trong menu ở cửa sổ chat, chọn Tạo bot. Zalo mở ứng dụng Zalo Bot Creator.' },
  { title: 'Đặt tên bot', detail: 'Tên bắt buộc bắt đầu bằng chữ "Bot", ví dụ: Bot Toán 10A1 cô Hạnh. Điền các thông tin còn lại rồi nhấn Tạo Bot.' },
  { title: 'Nhận mã bot (Bot Token)', detail: 'Tạo xong, Zalo gửi thông tin bot và mã Bot Token qua tin nhắn vào tài khoản Zalo của thầy cô. Mã có dạng 12345689:abc-xyz và không tự hết hạn.' },
];

export const ZaloBotSelfGuide = () => (
  <details className="group rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
      <div>
        <h4 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Tự tạo bot Zalo cho lớp của thầy cô</h4>
        <p className="mt-1 text-sm text-slate-500">Khoảng 5 phút, miễn phí. Bấm để xem từng bước.</p>
      </div>
      <Bot className="h-5 w-5 shrink-0 text-[var(--dewey-blue)]" />
    </summary>

    <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
      <p>
        Mỗi bot ở gói miễn phí của Zalo nhắn được với tối đa <strong>50 người</strong> và gửi tối đa <strong>3.000 tin mỗi tháng</strong>.
        Một tài khoản Zalo tạo được tối đa 3 bot. Vì vậy mỗi thầy cô nên có bot riêng cho lớp mình.
      </p>

      <ol className="space-y-2">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--dewey-blue)] text-xs font-black text-white">{index + 1}</span>
            <span><strong>{step.title}.</strong> {step.detail}</span>
          </li>
        ))}
      </ol>

      <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
        <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
        <span>
          <strong>Giữ kín mã Bot Token.</strong> Ai có mã này là điều khiển được bot và nhắn tin cho học sinh, phụ huynh dưới tên bot.
          Không gửi mã qua Zalo, email hay ảnh chụp màn hình cho bất kỳ ai, kể cả người tự xưng là quản trị SmartPlan.
          Lỡ lộ mã: vào Zalo Bot Creator, chọn thiết lập để cài lại mã. Zalo gửi mã mới qua tin nhắn, mã cũ hết dùng được.
        </span>
      </div>

      <p className="rounded-2xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-[13px]">
        <strong>Kết nối bot với SmartPlan:</strong> tính năng dán mã bot vào đây để bot đọc điểm, nhận bài và trả lời học sinh của lớp
        đang được hoàn thiện. Khi có, ô dán mã sẽ hiện ngay dưới hướng dẫn này. Trong lúc chờ, thầy cô cứ tạo bot sẵn và cất mã ở nơi an toàn.
      </p>

      <p className="text-[11px] font-medium leading-4 text-slate-400">
        Theo tài liệu chính thức của Zalo Bot Platform (bot.zaloplatforms.com), tra ngày 26/11/2026. Zalo có thể đổi giao diện hoặc hạn mức.
      </p>
    </div>
  </details>
);
