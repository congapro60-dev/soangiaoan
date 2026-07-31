/**
 * THƯ VIỆN NƯỚC ĐI LỚP HỌC — loại giáo án "Giáo án ban Toán".
 *
 * Vì sao có file này: prompt cũ chỉ mô tả SƯ PHẠM và TOÁN, bỏ trống tầng VẬN HÀNH lớp
 * (điều phối, chuyển tiếp, xử lý khi HS chọn sai nhiệm vụ). AI để tự nghĩ thì ra thứ
 * nhàn nhạt kiểu "GV quan sát và hỗ trợ HS" — đọc thì xuôi, cầm lên lớp thì lúng túng.
 *
 * Nguồn: rút từ giáo án Tiết 2 (Bài 19) do chính GV bộ môn soạn và chỉnh tay 2026-07.
 * Đây là nghề đứng lớp thật, không phải lý thuyết — nên chép lại cho AI dùng lại,
 * thay vì bắt nó sáng tác mỗi lần.
 *
 * MỖI MỤC BẮT BUỘC CÓ `viSao`. Cái lý do mới là phần khiến giáo viên khác không bỏ qua
 * bước đó khi dạy thay; thiếu lý do thì nước đi biến thành thủ tục hình thức.
 */

import type { ToanKeHoach } from '../types';

export type ToanMoveGroup =
  | 'cho-va-goi'        // kỹ thuật chờ, gọi HS
  | 'quan-sat'          // GV di chuyển, bao quát lớp
  | 'phan-hoa'          // HS tự chọn mức + xử lý khi chọn sai
  | 'chuyen-tiep'       // khẩu lệnh, phát/thu tài liệu, kéo lớp về
  | 'danh-gia';         // chữa lỗi, phản tư

export interface ToanClassroomMove {
  id: string;
  ten: string;
  nhom: ToanMoveGroup;
  /** Tình huống nào thì dùng nước đi này. */
  khiNao: string;
  /** Làm cụ thể thế nào — lời thoại GV để trong ngoặc kép, dùng gần như nguyên văn được. */
  cachLam: string;
  /** Lý do sư phạm. KHÔNG được bỏ trống. */
  viSao: string;
  /**
   * Loại kế hoạch dùng được nước đi này. Bỏ trống = dùng cho mọi loại.
   * Cần lọc vì 3 nước đi tự-chọn-lộ-trình chỉ đúng với tiết luyện tập; nhét vào tiết hình
   * thành kiến thức (vốn chia NHÓM ĐỒNG MỨC do GV gán) sẽ đẻ ra mâu thuẫn mô hình tổ chức lớp
   * — đúng lỗi mà chính bộ luật này đang cấm.
   */
  apDung?: ToanKeHoach[];
}

export const TOAN_CLASSROOM_MOVES: ToanClassroomMove[] = [
  {
    id: 'wait-time-2-nhip',
    ten: 'Kỹ thuật chờ hai nhịp',
    nhom: 'cho-va-goi',
    khiNao: 'Mỗi lần hỏi cả lớp trả lời đồng loạt bằng bảng con.',
    cachLam:
      'Nhịp 1 — đọc xong đề thì GV im lặng 10–15 giây, CẤM giơ bảng sớm. ' +
      'Nhịp 2 — hô "3, 2, 1, giơ bảng!", rồi chờ tiếp 3–5 giây cho HS nhìn bảng của nhau trước khi GV nhận xét.',
    viSao: 'Nhịp 1 để HS yếu không bị cuống khi thấy bạn giơ bảng trước. Nhịp 2 cho HS tự nhận xét chéo — GV chốt ngay là lớp mất cơ hội tự phát hiện sai.',
  },
  {
    id: 'quet-radar',
    ten: 'Quét Radar',
    nhom: 'quan-sat',
    khiNao: 'Giai đoạn HS làm việc cá nhân hoặc cặp đôi kéo dài trên 8 phút.',
    cachLam: 'GV liên tục đứng và di chuyển, mắt quét khoảng 80% lớp. Xuống hỗ trợ nhóm yếu thì gọn rồi RÚT NHANH, không ngồi lì một chỗ.',
    viSao: 'Ngồi lâu với một em yếu là mất cả lớp — phần còn lại bắt đầu nói chuyện. Di chuyển đều vừa giữ nề nếp vừa cho GV thấy tiến độ chung.',
  },
  {
    id: 'hs-tu-chon-lo-trinh',
    ten: 'HS tự chọn lộ trình (xóa rào cản dán nhãn)',
    nhom: 'phan-hoa',
    khiNao: 'Khi phân hóa nhiệm vụ theo mức độ.',
    cachLam: 'GV KHÔNG gán mức. Đặt sẵn tài liệu cả hai lộ trình trong folder giữa mỗi cụm bàn, HS tự đánh giá năng lực rồi tự rút phần việc.',
    viSao: 'GV gán mức = dán nhãn công khai, HS yếu xấu hổ còn HS giỏi mất động lực thử. Tự chọn giữ được thể diện — nhưng BẮT BUỘC kèm kịch bản khi chọn sai.',
    apDung: ['luyen_tap'],
  },
  {
    id: 'ha-canh-mem',
    ten: 'Hạ cánh mềm (HS chọn nhiệm vụ quá sức)',
    nhom: 'phan-hoa',
    khiNao: 'Qua quan sát thấy HS cắn bút, không viết được gì sau khoảng 3 phút.',
    cachLam:
      'GV KHÔNG thu lại phiếu. Hỏi thăm dò trước: "Khó khăn nhất của em ở nhiệm vụ này là gì?". ' +
      'Nếu HS thật sự bế tắc thì đổi khung, đừng hạ cấp: "Thử thách này khá phức tạp, em giữ thẻ ' +
      'này nghiên cứu thêm ở nhà nhé. Hiện bên [nhiệm vụ cơ bản] đang cần người xử lý gấp — em nhận giúp được không?"',
    viSao:
      'Thu phiếu lại = tuyên bố công khai "em không đủ sức". Đổi khung thành "chỗ kia đang cần em" ' +
      'giữ được thể diện, HS chuyển việc mà không thấy mình bị hạ cấp.',
    apDung: ['luyen_tap'],
  },
  {
    id: 'nang-cap-tai-cho',
    ten: 'Nâng cấp tại chỗ (HS giỏi chọn nhiệm vụ dưới sức)',
    nhom: 'phan-hoa',
    khiNao: 'HS giải xong nhiệm vụ cơ bản quá nhanh (3–4 phút).',
    cachLam:
      'GV KHÔNG ép đổi phiếu. Tung ngay một câu hỏi mở rộng TẠI CHỖ (đổi giả thiết, xét trường hợp ' +
      'đặc biệt, yêu cầu chứng minh). Sau khi HS trả lời được mới mời: "Em hoàn thành xuất sắc phần này. ' +
      'Bên [nhiệm vụ nâng cao] đang có một ca khó, em nhận chứ?"',
    viSao:
      'Ép đổi phiếu ngay thì HS thấy bị phạt vì làm nhanh. Cho trả lời câu khó tại chỗ trước là để ' +
      'chính em ấy tự thấy mình còn dư sức, nên nhận việc khó là lựa chọn của em chứ không phải lệnh của GV.',
    apDung: ['luyen_tap'],
  },
  {
    id: 'de-trai-nghiem-be-tac',
    ten: 'Để HS trải nghiệm bế tắc rồi mới bắc cầu',
    nhom: 'phan-hoa',
    khiNao: 'HS khá/giỏi cố dùng công cụ cồng kềnh hơn trong khi đã có công cụ gọn hơn vừa học.',
    cachLam:
      'GV KHÔNG ngăn ngay. Để HS làm đến lúc thật sự rối (ví dụ sa vào biểu thức quá nhiều ẩn), ' +
      'rồi mới hỏi câu kết nối: "Cách của em đang có quá nhiều ẩn. Thử nhìn lại kết quả ở [nhiệm vụ trước] ' +
      'xem — nếu dùng nó thì biểu thức rút gọn đến mức nào?"',
    viSao:
      'Bảo trước "dùng cách kia đi" thì HS chỉ làm theo lệnh. Để va vào sự phức tạp rồi mới bắc cầu ' +
      'khiến HS CẢM được vì sao công cụ mới tốt hơn — đó mới là thứ nhớ lâu.',
    apDung: ['luyen_tap', 'dao_nguoc'],
  },
  {
    id: 'khau-lenh-chuyen-tiep',
    ten: 'Khẩu lệnh chuyển hoạt động + nêu kỳ vọng',
    nhom: 'chuyen-tiep',
    khiNao: 'Trước mỗi giai đoạn HS làm việc độc lập.',
    cachLam: 'Bật đồng hồ đếm ngược trên màn hình. Nói to ba việc: mục tiêu khoảng thời gian này; kỳ vọng đo được ("mỗi bạn tự tay lập được ít nhất 1 phương trình"); quyền chọn hình thức ("làm cá nhân hoặc trao đổi cặp đôi với bạn cùng bàn"). Kết: "… phút. Bắt đầu!"',
    viSao: 'Kỳ vọng nói bằng con số thì HS tự biết khi nào đạt. Đồng hồ nhìn thấy được giúp HS tự điều tiết tốc độ, GV đỡ phải giục.',
  },
  {
    id: 'khau-lenh-thu-hut',
    ten: 'Khẩu lệnh kéo lớp về',
    nhom: 'chuyen-tiep',
    khiNao: 'Hết giờ làm việc nhóm, cần cả lớp tập trung nghe báo cáo.',
    cachLam:
      'Một câu ngắn, dứt khoát, yêu cầu hành động quan sát được: "Hết giờ. Mời cả lớp đặt bút xuống, ' +
      '100% hướng mắt lên màn hình."',
    viSao:
      'Yêu cầu chung chung ("trật tự nào") không kiểm chứng được nên lớp phớt lờ. Yêu cầu hành động ' +
      'nhìn thấy được (đặt bút, hướng mắt) thì GV biết ngay ai chưa theo.',
  },
  {
    id: 'phat-tai-lieu-khong-on',
    ten: 'Phát tài liệu phân hóa không gây ồn',
    nhom: 'chuyen-tiep',
    khiNao: 'Tiết có nhiều loại phiếu/thẻ khác nhau theo mức độ.',
    cachLam:
      'Để sẵn folder chứa đủ các loại phiếu ngay GIỮA mỗi cụm bàn cho HS tự rút. KHÔNG đặt khay ở ' +
      'góc lớp rồi cho HS đi lấy.',
    viSao:
      'Cho HS di chuyển khắp lớp lấy phiếu là mất 2–3 phút và ồn, lớp khó gom lại. Đặt tài liệu ' +
      'trong tầm tay vẫn giữ được quyền tự chọn mà không phá nhịp tiết học.',
  },
  {
    id: 'vinh-danh-loi-sai',
    ten: 'Vinh danh lỗi sai',
    nhom: 'danh-gia',
    khiNao: 'Bước nhìn lại, sau khi đã chữa bài.',
    cachLam: 'GV chiếu một bài nháp có lỗi điển hình, GIẤU TÊN. Cả lớp phân tích vì sao sai và cách tránh, rồi cảm ơn lỗi sai đó.',
    viSao: 'Giấu tên để HS dám sai thật thay vì giấu. Phân tích một lỗi điển hình có sức nặng hơn nhắc "cẩn thận" mười lần.',
  },
  {
    id: 'cau-hoi-he-qua',
    ten: 'Câu hỏi hệ quả thực tiễn của lỗi',
    nhom: 'danh-gia',
    khiNao: 'Ngay sau khi phân tích một lỗi kỹ thuật (sai dấu, nhầm loại vectơ, quên điều kiện).',
    cachLam:
      'Hỏi hệ quả trong bối cảnh thật của bài: "Nếu lỗi này đi vào [hệ thống thật trong bối cảnh bài toán], ' +
      'hậu quả với [đối tượng chịu ảnh hưởng] sẽ nghiêm trọng thế nào?" Gắn nhãn **[HỆ QUẢ]**.',
    viSao: 'Biến lời nhắc "cẩn thận kẻo sai dấu" — thứ HS nghe đã nhàm — thành câu đáng suy nghĩ, để HS hiểu vì sao độ chính xác quan trọng.',
  },
  {
    id: 'khong-tu-rut-ra-cong-thuc',
    ten: 'Lớp không tự rút ra được công thức',
    nhom: 'phan-hoa',
    khiNao: 'Tiết hình thành kiến thức: đã hỏi 2 câu dẫn dắt mà lớp vẫn im, chưa ai nêu được quy luật.',
    cachLam:
      'GV TUYỆT ĐỐI KHÔNG đọc luôn công thức. Hạ thang một bậc: cho một trường hợp SỐ CỤ THỂ ' +
      '(thay chữ bằng số), để HS làm xong ra kết quả, rồi mới hỏi: "Giờ nếu thay các số này bằng ' +
      'chữ thì em viết được gì?" Vẫn bí thì cho thêm một trường hợp số thứ hai và hỏi: "Hai lần ' +
      'làm vừa rồi giống nhau ở chỗ nào?"',
    viSao:
      'Đọc công thức ra là hỏng toàn bộ mục tiêu tiết hình thành kiến thức — HS chép chứ không hiểu. ' +
      'Hạ xuống số cụ thể vẫn giữ được đường tự khám phá, chỉ là rút ngắn quãng đường.',
    apDung: ['kien_thuc'],
  },
  {
    id: 'hs-khong-chuan-bi-o-nha',
    ten: 'HS không xem video / không làm phiếu ở nhà',
    nhom: 'phan-hoa',
    khiNao: 'Tiết đảo ngược: kiểm tra đầu giờ thấy có em bỏ trống phiếu chuẩn bị.',
    cachLam:
      'KHÔNG phạt và KHÔNG cho ngồi chơi. Xếp em đó vào nhóm với vai NGƯỜI GHI CHÉP, phát phiếu ' +
      'ghi chép để bám theo phần bạn trình bày. Giao xem video như bài về nhà bổ sung. ' +
      'Nếu quá nửa lớp chưa chuẩn bị: GV chiếu lại video tóm tắt 3 phút rồi rút ngắn phần dự án.',
    viSao:
      'Đây là kiểu hỏng phổ biến nhất của lớp học đảo ngược. Không có phương án thì em chưa chuẩn bị ' +
      'sẽ ngồi ngoài cuộc suốt tiết; cho vai ghi chép vẫn giữ em trong mạch bài mà không kéo chậm nhóm.',
    apDung: ['dao_nguoc'],
  },
  {
    id: 'lop-im-lang-khi-tranh-bien',
    ten: 'Không ai phản biện khi tranh biện',
    nhom: 'danh-gia',
    khiNao: 'Tiết đảo ngược: nhóm trình bày xong, GV hỏi "có ai phản bác không?" mà cả lớp im.',
    cachLam:
      'GV không tự phản biện thay. Đổi sang câu hỏi buộc phải chọn phe: "Ai thấy bước 2 của nhóm ' +
      'bạn CHẮC CHẮN đúng thì giơ tay — ai còn phân vân thì để tay xuống." Rồi gọi đúng một em ' +
      'đang phân vân: "Chỗ nào làm em phân vân?" Hoặc GV cài sẵn một lỗi nhỏ vào bài mẫu để lớp có cái mà bắt.',
    viSao:
      'Hỏi "có ai phản bác không" là câu hỏi đóng, im lặng là mặc định an toàn nên lớp sẽ im. ' +
      'Buộc chọn phe khiến mọi HS phải ra quyết định, và em phân vân luôn có sẵn lý do để nói.',
    apDung: ['dao_nguoc'],
  },
];

/** Nhóm → nhãn tiếng Việt để in ra prompt cho dễ đọc. */
const GROUP_LABEL: Record<ToanMoveGroup, string> = {
  'cho-va-goi': 'Chờ và gọi HS',
  'quan-sat': 'Quan sát – bao quát lớp',
  'phan-hoa': 'Phân hóa & xử lý khi HS chọn sai',
  'chuyen-tiep': 'Chuyển tiếp – điều phối',
  'danh-gia': 'Chữa lỗi – phản tư',
};

/**
 * Dựng khối prompt cho thư viện. Cố ý viết GỌN: liệt kê thành menu để AI CHỌN,
 * không phải văn bản để chép nguyên si — nhét quá dài vừa tốn token vừa khiến AI
 * bê cả bối cảnh mẫu sang bài khác (lỗi "lây nhiễm bối cảnh" đã gặp).
 */
export const buildToanClassroomMovesPrompt = (
  keHoach?: ToanKeHoach,
  moves: ToanClassroomMove[] = TOAN_CLASSROOM_MOVES,
): string => {
  // Lọc theo loại kế hoạch: nước đi không khai `apDung` thì dùng chung cho mọi loại.
  const dungDuoc = keHoach ? moves.filter((m) => !m.apDung || m.apDung.includes(keHoach)) : moves;
  const byGroup = new Map<ToanMoveGroup, ToanClassroomMove[]>();
  for (const mv of dungDuoc) {
    const list = byGroup.get(mv.nhom) ?? [];
    list.push(mv);
    byGroup.set(mv.nhom, list);
  }

  const blocks: string[] = [];
  for (const [group, list] of byGroup) {
    blocks.push(`### ${GROUP_LABEL[group]}`);
    for (const mv of list) {
      blocks.push(
        `**${mv.ten}**\n` +
          `- Khi nào: ${mv.khiNao}\n` +
          `- Cách làm: ${mv.cachLam}\n` +
          `- Vì sao: ${mv.viSao}`,
      );
    }
  }

  return `===== THƯ VIỆN NƯỚC ĐI LỚP HỌC (rút từ giáo án GV bộ môn đã dạy thật) =====

Các nước đi ĐIỀU PHỐI LỚP đã kiểm chứng trên lớp thật. Cách dùng:
- CHỌN 3–5 nước đi hợp với tiết đang soạn, viết thẳng vào cột "Giáo viên và Học sinh" đúng thời điểm dùng. KHÔNG liệt kê thành mục riêng.
- KHẨU LỆNH (câu GV nói): dùng gần như nguyên văn, chỉ thay số liệu/tên nhiệm vụ.
- KỊCH BẢN xử lý: giữ nguyên cách xử lý và LÝ DO, viết lại nội dung toán cho đúng bài.
- Kèm lý do ngắn để GV dạy thay hiểu vì sao không được bỏ bước.

⚠ RÀNG BUỘC BẮT BUỘC: nếu tiết học có cơ chế HS TỰ CHỌN mức độ/lộ trình/nhiệm vụ thì PHẢI có ít nhất một kịch bản xử lý khi HS chọn sai — cả chiều chọn quá sức lẫn chiều chọn dưới sức. Cho tự chọn mà không dự phòng là thiết kế dở: trên lớp chắc chắn có em chọn nhầm.

${blocks.join('\n\n')}

===== HẾT THƯ VIỆN NƯỚC ĐI =====`;
};
