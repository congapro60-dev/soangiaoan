/**
 * Khung huấn luyện & cố vấn của trường — dùng cho buổi trao đổi sau tiết dạy.
 *
 * NGUỒN: thư mục "Huấn luyện và cố vấn" —
 *   - Leadership_ Coaching and Mentoring.pdf (bộ tập huấn song ngữ)
 *   - VN Coaching Leadership.png, VN Mentoring Leadership.png
 *
 * Vì sao tách khỏi khungDanielson.ts và nguyenTacChamDiem.ts: khung nói ĐIỀU GÌ
 * được đánh giá, quy tắc chấm nói CHẤM THẾ NÀO, còn file này nói NÓI THẾ NÀO
 * với giáo viên sau khi đã chấm. Ba việc khác nhau, đổi độc lập.
 *
 * Mục tiêu tập huấn ghi rõ: "Sử dụng minh chứng từ Khung Danielson để định
 * hướng các cuộc trao đổi huấn luyện" và "thực hiện cuộc trò chuyện huấn luyện
 * hiệu quả thông qua kỹ thuật ĐẶT CÂU HỎI thay vì đưa ra lời khuyên trực tiếp".
 */

/** Chu trình dự giờ phát triển chuyên môn — 7 bước. */
export const CHU_TRINH_DU_GIO = [
  'Khởi động việc quan sát',
  'Cuộc họp lên kế hoạch',
  'Quan sát & thu thập bằng chứng',
  'Tổ chức bằng chứng và chia sẻ',
  'Phân tích bởi quan sát viên & giáo viên',
  'Cuộc họp phản tư',
  'Áp dụng kiến thức mới',
] as const;

/** Năm bước của một cuộc trò chuyện huấn luyện, kèm câu hỏi mẫu. */
export interface BuocTroChuyen {
  ten: string;
  mucDich: string;
  cauHoiMau: string[];
}

export const CAU_TRUC_TRO_CHUYEN: readonly BuocTroChuyen[] = [
  {
    ten: 'Tập trung',
    mucDich: 'Làm rõ mục đích của cuộc trò chuyện.',
    cauHoiMau: [
      'Bạn muốn chúng ta tập trung vào điều gì?',
      'Điều gì là quan trọng nhất đối với học sinh của bạn lúc này?',
    ],
  },
  {
    ten: 'Khám phá',
    mucDich: 'Tìm hiểu suy nghĩ và minh chứng của giáo viên.',
    cauHoiMau: [
      'Bạn mong muốn học sinh đạt được điều gì?',
      'Bạn có những minh chứng nào về việc học của học sinh?',
    ],
  },
  {
    ten: 'Phản tư',
    mucDich: 'Đi sâu vào suy ngẫm và nhận thức.',
    cauHoiMau: ['Điều gì đã diễn ra tốt? Theo bạn vì sao?', 'Điều gì là thử thách nhất?'],
  },
  {
    ten: 'Lập kế hoạch',
    mucDich: 'Xác định lựa chọn và quyết định bước tiếp theo.',
    cauHoiMau: ['Có chiến lược nào bạn muốn thử?', 'Bước tiếp theo của bạn sẽ là gì?'],
  },
  {
    ten: 'Theo dõi',
    mucDich: 'Hỗ trợ, kiểm tra tiến độ và ghi nhận sự phát triển.',
    cauHoiMau: ['Tiến triển thế nào?', 'Điều này đã tác động ra sao tới học sinh?'],
  },
];

/** Tư duy huấn luyện — ràng buộc giọng điệu cho cả người dùng lẫn AI. */
export const TU_DUY_HUAN_LUYEN = [
  'Luôn tò mò, không phán xét: đặt thêm câu hỏi thay vì đưa ra câu trả lời.',
  'Xây dựng lòng tin: tạo không gian an toàn cho những cuộc trò chuyện thẳng thắn.',
  'Dựa vào minh chứng: mọi nhận định neo vào quan sát cụ thể kiểm chứng được.',
  'Hợp tác: làm việc CÙNG giáo viên, không làm thay họ.',
  'Tin vào tiềm năng: ai cũng có thể phát triển.',
];

export const MEO_TRO_CHUYEN_KHO = [
  'Giữ bình tĩnh và tôn trọng — điều chỉnh cảm xúc, giữ cuộc trò chuyện chuyên nghiệp.',
  'Lắng nghe trước, hiểu trước khi phản hồi.',
  'Dựa vào minh chứng, không dựa vào ý kiến.',
  'Tách hành vi khỏi con người — bàn về việc đã làm, không bàn về con người.',
  'Tập trung vào giải pháp và sự phát triển, hướng về phía trước.',
  'Kết thúc bằng niềm tin và sự hỗ trợ.',
];

/**
 * Cặp "thay vì / hãy hỏi" — lấy nguyên văn từ trang Tư duy huấn luyện.
 * Đây là thứ đổi được một câu phán xét thành một câu mở ra suy nghĩ.
 */
export const THAY_VI_HAY_HOI: readonly { thayVi: string; hayHoi: string }[] = [
  { thayVi: 'Sửa nó như thế nào?', hayHoi: 'Điều gì đang xảy ra?' },
  { thayVi: 'Điều gì sai?', hayHoi: 'Giáo viên cần khám phá ra điều gì?' },
  {
    thayVi: 'Kỹ năng đặt câu hỏi của bạn cần được cải thiện.',
    hayHoi: 'Tôi nhận thấy học sinh hầu hết trả lời bằng vài cụm từ ngắn. Bạn nhận thấy điều gì về loại câu hỏi mình đã hỏi?',
  },
  { thayVi: 'Tại sao điều đó không hiệu quả?', hayHoi: 'Bạn đang tránh né điều gì?' },
  { thayVi: 'Bạn nên…', hayHoi: 'Bạn có thể tự hỗ trợ sự phát triển của mình như thế nào?' },
];

/** Câu hỏi huấn luyện mạnh mẽ — dùng khi bí, hoặc để đối chiếu câu AI sinh ra. */
export const CAU_HOI_MANH_ME = [
  'Điều gì khiến bạn tự hào nhất sau bài học vừa qua? Vì sao?',
  'Bạn có những minh chứng nào về việc học của học sinh?',
  'Bạn nhận thấy điều gì về học sinh của mình?',
  'Thách thức lớn nhất bạn đang gặp phải là gì?',
  'Bạn đã thử những chiến lược nào?',
  'Còn cách tiếp cận nào khác bạn có thể thử?',
  'Bước nhỏ tiếp theo bạn có thể thực hiện là gì?',
  'Làm sao bạn biết điều đó đã tạo ra sự khác biệt?',
];

/**
 * Huấn luyện khác cố vấn. Ghi lại vì hai việc này hay bị gộp làm một, mà cách
 * nói chuyện thì khác hẳn nhau.
 */
export const HUAN_LUYEN_VS_CO_VAN = {
  huanLuyen: {
    ten: 'Huấn luyện',
    lamGi: 'Giúp giáo viên tự thay đổi những gì họ đang làm.',
    tapTrung: 'Bài học hôm nay',
  },
  coVan: {
    ten: 'Cố vấn',
    lamGi: 'Giúp giáo viên trở thành người tốt hơn.',
    tapTrung: 'Nhà giáo của ngày mai',
  },
} as const;

/**
 * Khuôn một lượt huấn luyện dựa trên minh chứng, lấy từ ví dụ 3b trong tài
 * liệu tập huấn: nêu quan sát trung tính → hỏi giáo viên tự nhận ra → hỏi về
 * tác động tới học sinh. Tuyệt đối không có câu phán xét ở giữa.
 */
export const KHUON_DUA_TREN_MINH_CHUNG = {
  buoc1: 'Nêu quan sát trung tính, bắt đầu bằng "Tôi nhận thấy…", trích đúng điều đã ghi trong biên bản.',
  buoc2: 'Hỏi giáo viên tự nhận ra: "Bạn nhận thấy điều gì về…?"',
  buoc3: 'Hỏi về tác động tới học sinh: "Điều đó có thể tạo ra tác động nào tới…?"',
};
