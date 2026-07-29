/**
 * Tầng thứ ba của khung Danielson — 77 TIÊU CHÍ CON.
 *
 * NGUỒN: sheet "Chi tiết khung đánh giá" trong file kế hoạch tự thúc đẩy chuyên
 * môn của trường ("Huấn luyện và cố vấn/... Kế hoạch tự thúc đẩy chuyên môn.xlsx").
 *
 * VÌ SAO CẦN TẦNG NÀY: biên bản dự giờ chấm ở tầng THÀNH TỐ (22 mục) cho khớp
 * file Excel biên bản của trường, nhưng bản tự đánh giá và kế hoạch thúc đẩy của
 * giáo viên lại nhắm vào tầng TIÊU CHÍ CON (ví dụ "1e.3 Phối hợp nhóm"). Không có
 * tầng này thì không nối được kết quả dự giờ sang kế hoạch phát triển, và mọi đề
 * xuất cải thiện chỉ dừng ở mức định tính.
 *
 * Cách dùng: điểm vẫn chốt ở tầng thành tố; BẰNG CHỨNG thì gán xuống tiêu chí con
 * để cộng dồn được qua nhiều lần dự giờ.
 */
import type { MaThanhTo } from './khungDanielson';

export interface TieuChiCon {
  /** Dạng "3a.2". */
  ma: string;
  thanhTo: MaThanhTo;
  ten: string;
  /** Định nghĩa ngắn của trường về tiêu chí này. */
  dinhNghia: string;
  /** Mô tả 4 mức. */
  muc: readonly string[];
  /**
   * true = mô tả 4 mức KHÔNG phải văn bản chính thức của trường mà do soạn bổ
   * sung, vì cả hai nguồn gốc đều bỏ trống mục này.
   *
   * Giữ cờ này để giao diện nói rõ với người dùng, và để khi trường ban hành
   * bản chính thức thì biết chỗ nào cần thay. KHÔNG dùng làm căn cứ tranh luận
   * về điểm số của một giáo viên cụ thể.
   */
  tuBoSung?: true;
}

export const TIEU_CHI_CON: readonly TieuChiCon[] = [
  {
    ma: "1a.1",
    thanhTo: "1a",
    ten: "Kiến thức chuyên ngành",
    dinhNghia: "GV nắm vững kiến thức về chuyên ngành /bộ môn mình dạy, bao gồm các cấu trúc, khái niệm và kĩ năng cơ bản, các mối quan hệ tiền đề (vd: phải học phép cộng trước khi học phép nhân), phương pháp tìm hiểu.",
    muc: [
      "Kế hoạch bài học và công tác chuẩn bị có lỗi về nội dung kiến thức hoặc thể hiện GV chưa hiểu rõ về nội dung đó.",
      "Kế hoạch bài học và công tác chuẩn bị cho thấy GV phần nào hiểu các khái niệm cơ bản của môn học và mối quan hệ giữa các khái niệm đó với nhau.",
      "Kế hoạch bài học và công tác chuẩn bị cho thấy GV nắm vững nội dung giảng dạy và cấu trúc của môn học.",
      "Kế hoạch bài học và công tác chuẩn bị cho thấy GV có kiến thức sâu rộng về các khái niệm cơ bản và mối quan hệ giữa các khái niệm đó cũng như các phát hiện/xu hướng mới trong lĩnh vực đó.",
    ],
  },
  {
    ma: "1a.2",
    thanhTo: "1a",
    ten: "Kiến thức sư phạm",
    dinhNghia: "GV truyền đạt kiến thức theo cách dễ hiểu, dễ tiếp thu cho HS bằng cách kết nối các kiến thức đã học, trình bày rõ ràng, dễ hiểu và thực hiện các phương pháp sư phạm hiệu quả nhất.",
    muc: [
      "Kế hoạch bài học và chương học thiếu kiến thức tiền đề và những nhầm lẫn HS có thể mắc.",
      "Kế hoạch bài học và chương học có phương pháp giảng dạy và phần trình bày tương đối phù hợp, quan tâm đến các kiến thức tiền đề cần thiết để HS hiểu nội dung kiến thức.",
      "Kế hoạch bài học và chương học có phương pháp và phần trình bày đa dạng phù hợp với môn học, sử dụng kết hợp các phương pháp sư phạm, thể hiện rõ mối quan hệ tiền đề giữa các nội dung và khái niệm.",
      "Trong các bài học và chương học được xây dựng mới hoặc chỉnh sửa từ bản gốc, các phương pháp giảng dạy và trình bày được lựa chọn cẩn thận, hợp lý để phù hợp với nội dung giảng dạy và các hoạt động trí tuệ cấp độ cao, phát triển kĩ năng và tư duy phản biện.",
    ],
  },
  {
    ma: "1a.3",
    thanhTo: "1a",
    ten: "Kiến thức về các mối quan hệ và kĩ năng liên môn",
    dinhNghia: "GV lồng ghép các kết nối liên môn vào phương pháp dạy học “tạo bước đệm - GV hướng dẫn HS ở các bước đầu để nắm kiến thức, ở các bước sau khi HS đã nắm được thì GV không hỗ trợ nữa mà để HS tự làm”, giúp HS tích cực tham gia bài học, xây dựng các kiến thức và kĩ năng liên môn cơ bản và đặt ra nhiều bối cảnh khác nhau cho việc học tập của HS.",
    muc: [
      "Kế hoạch bài học và công tác chuẩn bị không thể hiện mối quan hệ liên môn.",
      "Kế hoạch bài học và công tác chuẩn bị thể hiện một số kết nối phù hợp với các khái niệm ở các môn học khác và với các kĩ năng áp dụng được ở nhiều môn học.",
      "Kế hoạch bài học và công tác chuẩn bị thể hiện kiến thức về các mối quan hệ & kĩ năng liên môn và ứng dụng thực tế của chúng.",
      "Bài học và chương học được xây dựng mới hoặc chỉnh sửa từ bản gốc thể hiện rõ sự kết nối với các khái niệm của các môn học khác, nhấn mạnh các kĩ năng áp dụng được ở nhiều môn học và ứng dụng thực tế của chúng.",
    ],
  },
  {
    ma: "1b.1",
    thanhTo: "1b",
    ten: "Tôn trọng đặc điểm riêng của từng HS",
    dinhNghia: "Các trải nghiệm trong cuộc sống và vốn kiến thức của từng HS là nền tảng cho sự hình thành cá tính, mục tiêu, tri thức và tính cách.",
    muc: [
      "GV không biết hoặc không quan tâm lắm đến chủng tộc, văn hóa hoặc đặc điểm của HS.",
      "GV vận dụng hiểu biết về chủng tộc, văn hóa và đặc điểm của HS vào việc lập kế hoạch & chuẩn bị bài giảng nhưng đạt kết quả hạn chế.",
      "Sự hiểu biết của GV về chủng tộc, văn hóa và đặc điểm của HS được thể hiện tốt trong việc lập kế hoạch & chuẩn bị bài giảng.",
      "GV biết và tôn trọng chủng tộc, văn hóa và đặc điểm riêng của từng HS và dựa vào đó để thiết kế các hoạt động học tập phù hợp về văn hóa và gần gũi với HS.",
    ],
  },
  {
    ma: "1b.2",
    thanhTo: "1b",
    ten: "Nắm được mức độ kiến thức & kĩ năng của HS",
    dinhNghia: "Hoạt động học tập cần thể hiện những gì HS có thể làm được và phù hợp với mức độ kiến thức và kĩ năng hiện tại của HS.",
    muc: [
      "GV không xác minh thông tin về kiến thức, kĩ năng và tư duy sẵn có của HS.",
      "GV áp dụng sự hiểu biết về mức độ kiến thức, kĩ năng & tư duy của HS liên quan đến học tập nhưng đạt kết quả hạn chế.",
      "Sự hiểu biết của GV về mức độ kiến thức, kĩ năng & tư duy của HS liên quan đến học tập được thể hiện tốt trong việc lập kế hoạch & chuẩn bị bài giảng.",
      "Sự hiểu biết sâu sắc của GV về kiến thức, kĩ năng và tư duy của từng HS giúp cho HS được hướng dẫn từng bước theo phương pháp “tạo bước đệm” (GV hướng dẫn HS ở các bước đầu để nắm kiến thức, ở các bước sau khi HS đã nắm được thì GV không hỗ trợ nữa mà để HS tự làm) khi cần thiết, đáp ứng các kỳ vọng cao, và được khuyến khích phát huy tối đa năng lực của bản thân.",
    ],
  },
  {
    ma: "1b.3",
    thanhTo: "1b",
    ten: "Kiến thức về sự phát triển toàn diện của trẻ em",
    dinhNghia: "Xây dựng môi trường và hoạt động học tập giúp phát triển nhận thức, sức khỏe thể chất, cảm xúc & xã hội của HS, nâng cao năng lực học tập và tính tự giác của HS.",
    muc: [
      "GV không quan tâm hoặc không hiểu về sự phát triển nhận thức, cảm xúc-xã hội và nhân cách của HS.",
      "GV thể hiện sự hiểu biết về sự phát triển nhận thức, cảm xúc-xã hội và nhân cách của HS trong việc lập kế hoạch & chuẩn bị bài giảng, nhưng với kết quả hạn chế.",
      "Sự hiểu biết của GV về sự phát triển nhận thức, cảm xúc-xã hội và nhân cách của HS được thể hiện tốt trong việc lập kế hoạch & chuẩn bị bài giảng.",
      "GV hiểu sâu sắc về sự phát triển nhận thức, cảm xúc-xã hội và nhân cách của HS, nêu gương và dạy cho HS các thói quen và tư duy giúp HS có ý thức nhận trách nhiệm cho các hành động của bản thân.",
    ],
  },
  {
    ma: "1b.4",
    thanhTo: "1b",
    ten: "Hiểu về quá trình tiếp thu kiến thức & sự khác biệt về khả năng tiếp thu giữa các HS",
    dinhNghia: "Qúa trình học tập cần sự tham gia tích cực về nhận thức và sự hỗ trợ phù hợp tùy theo đặc điểm và nhu cầu của từng HS.",
    muc: [
      "GV thiếu hiểu biết về quá trình học tập và phát triển của HS nói chung và sự khác biệt của từng cá nhân HS trong lớp nói riêng.",
      "GV hiểu biết hạn chế về quá trình học tập và sự khác biệt trong học tập của từng cá nhân.",
      "GV có hiểu biết đúng đắn về cách thức học tập của HS cũng như sự khác nhau trong cách học của HS và thể hiện rõ nét hiểu biết đó trong việc lập kế hoạch & chuẩn bị bài giảng.",
      "Trong các bài học được xây dựng mới hoặc chỉnh sửa từ bản gốc, GV áp dụng sự hiểu biết sâu sắc về quá trình học tập và sự khác biệt về khả năng học tập của từng HS để xây dựng các hoạt động hấp dẫn & hiệu quả.",
    ],
  },
  {
    ma: "1c.1",
    thanhTo: "1c",
    ten: "Giá trị và sự phù hợp",
    dinhNghia: "Mục tiêu giảng dạy thể hiện việc học tập và thành thạo các nội dung kiến thức quan trọng và tạo điều kiện thiết thực để hỗ trợ việc học tập và trưởng thành của HS.",
    muc: [
      "Mục tiêu giảng dạy không phù hợp hoặc không thiết thực hoặc không thể hiện các nội dung học tập quan trọng.",
      "Mục tiêu giảng dạy tương đối phù hợp và phần nào thể hiện các nội dung học tập và trưởng thành (tức là sự phát triển toàn diện về trí tuệ & tinh thần, thể chất) quan trọng",
      "Mục tiêu giảng dạy hầu hết là phù hợp và thể hiện các nội dung học tập và trưởng thành quan trọng.",
      "Tất cả mục tiêu giảng dạy đều thể hiện các nội dung học tập quan trọng, phù hợp và khuyến khích tư duy phản biện.",
    ],
  },
  {
    ma: "1c.2",
    thanhTo: "1c",
    ten: "Phù hợp với các tiêu chuẩn của cấp lớp",
    dinhNghia: "Mục tiêu giảng dạy thể hiện các tiêu chuẩn phù hợp của cấp lớp và kì vọng cao cho mỗi HS.",
    muc: [
      "Mục tiêu giảng dạy không phù hợp với tiêu chuẩn của cấp lớp.",
      "Mục tiêu giảng dạy phần nào phù hớp với tiêu chuẩn của cấp lớp.",
      "Mục tiêu giảng dạy phần lớn phù hợp với tiêu chuẩn của cấp lớp.",
      "Tất cả mục tiêu giảng dạy đều phù hợp với tiêu chuẩn của cấp lớp, khuyến khích sự tham gia của tất cả HS và khuyến khích HS dám chấp nhận mạo hiểm để khám phá những kiến thức mới.",
    ],
  },
  {
    ma: "1c.3",
    thanhTo: "1c",
    ten: "Mục tiêu rõ ràng",
    dinhNghia: "Mục tiêu giảng dạy thể hiện rõ HS sẽ học những gì, tại sao những kiến thức đó quan trọng, và HS cần làm gì để xây dựng và thể hiện sự thành thạo các kiến thức và kĩ năng đó.",
    muc: [
      "Mục tiêu giảng dạy không rõ ràng hoặc lấy các hoạt động học tập làm mục tiêu.",
      "Mục tiêu giảng dạy tương đối rõ ràng và mô tả một phần những nội dung mà HS sẽ học.",
      "Mục tiêu giảng dạy hầu hết đều rõ ràng và cụ thể, HS hiểu mình sẽ học gì và học như thế nào.",
      "Tất cả mục tiêu giảng dạy đều rõ ràng, cụ thể và gia tăng cơ hội học tập cho HS.",
    ],
  },
  {
    ma: "1c.4",
    thanhTo: "1c",
    ten: "Kết hợp các yếu tố tạo nên sự phát triển toàn diện của HS",
    dinhNghia: "Mục tiêu giảng dạy cần kết hợp các nội dung học thuật và cảm xúc-xã hội để bổ trợ lẫn nhau.",
    muc: [
      "Mục tiêu giảng dạy không thể hiện các mục tiêu nhỏ để đạt các mục tiêu lớn.",
      "Mục tiêu giảng dạy bao gồm các mục tiêu khác ngoài kiến thức & kĩ năng được dạy, và đạt kết quả hạn chế.",
      "Mục tiêu giảng dạy thể hiện các mục tiêu nhỏ với thứ tự ưu tiên, phù hợp với giai đoạn phát triển của HS, và bao gồm các mục tiêu về học tập, cảm xúc-xã hội và phát triển nhân cách.",
      "Mục tiêu giảng dạy kết hợp hài hòa các mục tiêu về học tập, cảm xúc-xã hội và phát triển nhân cách chứ không tách rời.",
    ],
  },
  {
    ma: "1d.1",
    thanhTo: "1d",
    ten: "Tài liệu giảng dạy",
    dinhNghia: "GV sử dụng tài liệu giảng dạy chất lượng cao để đảm bảo HS tiếp thu được các kiến thức khó và phù hợp với nhu cầu của từng HS, HS tham gia tích cực và nắm vững kiến thức.",
    muc: [
      "Nếu có sẵn tài liệu giảng dạy, GV không sử dụng hoặc học cách sử dụng các tài liệu đó hiệu quả. Nếu không có sẵn tài liệu giảng dạy, GV sử dụng các tài liệu không phù hợp hoặc không hiệu quả do mình tự soạn, không hỗ trợ cho việc dạy học và thu hút HS vào bài học.",
      "Nếu có sẵn tài liệu giảng dạy, GV sử dụng tài liệu tương đối hiệu quả, hiểu một chút về đặc điểm & cấu trúc của tài liệu, đôi khi có thể phát hiện và điều chỉnh, bổ sung những nội dung còn thiếu trong tài liệu. Nếu không có sẵn tài liệu giảng dạy, GV lựa chọn và sử dụng các tài liệu phần nào phù hợp với các tiêu chuẩn áp dụng để làm công cụ chính phục vụ giảng dạy và hỗ trợ HS học tập và trưởng thành.",
      "Nếu có sẵn tài liệu giảng dạy, GV nghiên cứu kĩ tài liệu để đưa ra các lựa chọn phù hợp với nhu cầu của HS giúp tăng hiệu quả của chương trình học. Nếu không có sẵn tài liệu giảng dạy, GV nghiên cứu nhiều tài liệu có chất lượng, đáp ứng yêu cầu cao về chuyên môn để đưa ra các lựa chọn theo nhu cầu cụ thể của HS, giúp tăng hiệu quả của các tài liệu đó.",
      "Nếu có sẵn tài liệu giảng dạy, GV sử dụng tài liệu một cách hiệu quả, đồng thời kết hợp với các tài liệu khác khi cần thiết để giúp HS đạt mục tiêu học tập, giúp gia tăng cơ hội học tập và trưởng thành của HS, khuyến khích các hoạt động trí tuệ ở cấp độ cao, nâng cao tính tự chủ của HS. Nếu không có sẵn tài liệu giảng dạy, GV tìm hiểu, nghiên cứu và sử dụng hiệu quả nhiều tài liệu có chất lượng, đồng thời kết hợp với các tài liệu khác khi cần thiết để giúp HS đạt mục tiêu học tập, giúp gia tăng cơ hội học tập và trưởng thành của HS, khuyến khích các hoạt động trí tuệ ở cấp độ cao.",
    ],
  },
  {
    ma: "1d.2",
    thanhTo: "1d",
    ten: "Công nghệ và học liệu số",
    dinhNghia: "Học liệu dựa trên công nghệ và học liệu số là công cụ hữu ích cho phương pháp dạy học cá nhân hóa, cơ hội học tập bình đẳng, khám phá, kết nối và phát triển bản thân.",
    muc: [
      "GV không tìm kiếm các học liệu kĩ thuật số phù hợp để hỗ trợ HS học tập và trưởng thành.",
      "GV sử dụng công nghệ và có các học liệu kĩ thuật số giúp hỗ trợ phần nào việc học tập của HS nhưng chủ yếu chỉ để thay cho các học liệu khác.",
      "GV sử dụng công nghệ và học liệu kĩ thuật số hiệu quả để hỗ trợ HS học tập và khám phá, tạo ra sự gắn kết trong tập thể và giúp HS trưởng thành.",
      "GV sử dụng công nghệ và học liệu kĩ thuật số để hỗ trợ hoạt động trí tuệ của HS, phương pháp giảng dạy cá nhân hóa để HS học tập và trưởng thành.",
    ],
  },
  {
    ma: "1d.3",
    thanhTo: "1d",
    ten: "Hỗ trợ học sinh",
    dinhNghia: "GV tìm kiếm và cung cấp các học liệu và biện pháp hỗ trợ bổ sung phù hợp để HS dễ tiếp thu kiến thức và đáp ứng nhu cầu của từng HS.",
    muc: [
      "GV không tìm hiểu hoặc tìm kiếm học liệu để hỗ trợ nhu cầu cá nhân của HS.",
      "GV tìm kiếm một số học liệu và biện pháp hỗ trợ phù hợp với nhu cầu của HS.",
      "GV cung cấp học liệu và hỗ trợ phù hợp với nhu cầu của từng cá nhân HS và sự khác biệt về khả năng & phương pháp học tập của từng HS, giúp cho mọi HS đều hiểu bài và đạt mục tiêu học tập.",
      "GV cung cấp hoặc đề xuất các học liệu và biện pháp hỗ trợ giúp nâng cao tính tự chủ của HS và tăng hiệu quả sử dụng học liệu để hỗ trợ việc học tập và trưởng thành của bản thân.",
    ],
  },
  {
    ma: "1e.1",
    thanhTo: "1e",
    ten: "Bài tập và hoạt động",
    dinhNghia: "Bài tập và hoạt động phù hợp với mục tiêu học tập, khuyến khích tư duy cấp độ cao và sự tự chủ của HS, đồng thời giúp HS nắm vững kiến thức.",
    muc: [
      "Bài tập và hoạt động không hứng thú với HS, không có tính thử thách với HS và/hoặc không phù hợp với mục tiêu giảng dạy.",
      "Bài tập và hoạt động phần nào phù hợp với mục tiêu giảng dạy và ít mang tính thử thách về trí tuệ với HS.",
      "Bài tập và hoạt động phù hợp với mục tiêu học tập và khuyến khích HS tư duy ở cấp độ cao hơn.",
      "Bài tập và hoạt động giúp phát huy tính tự chủ của HS và tạo cơ hội thiết thực để HS nắm bắt các kiến thức cần thiết.",
    ],
  },
  {
    ma: "1e.2",
    thanhTo: "1e",
    ten: "Học tập linh hoạt",
    dinhNghia: "Điều chỉnh các phương pháp giảng dạy cho phù hợp với nhu cầu của từng cá nhân HS để đảm bảo kiến thức vừa sức với HS cũng như hỗ trợ phù hợp.",
    muc: [
      "Chỉ có duy nhất một biện pháp hoặc hoạt động để HS học bài.",
      "Có nhiều cách để HS học và nhiều phương pháp được sử dụng trong bài học và phần nào mang lại hiệu quả.",
      "Điều chỉnh các phương pháp và cách tiếp cận để phù hợp với nhu cầu đa dạng của HS, giúp HS học tập tốt.",
      "HS có cơ hội nâng cao kiến thức bên ngoài phạm vi bài học. GV và HS cùng thiết kế hoạt động học tập khi phù hợp.",
    ],
  },
  {
    ma: "1e.3",
    thanhTo: "1e",
    ten: "Phối hợp nhóm",
    dinhNghia: "Làm việc nhóm là một phần quan trọng trong quá trình học tập và phát triển của trẻ. Hoạt động nhóm cần được chuẩn bị kĩ lưỡng để tối đa hóa cơ hội cho mọi HS và phát huy các ưu điểm của HS.",
    muc: [
      "Không phân nhóm HS hoặc phân nhóm không phù hợp.",
      "Cách phân nhóm HS phần nào phù hợp với hoạt động học tập hoặc mục tiêu học tập.",
      "Tổ chức các nhóm học tập để hỗ trợ tối đa việc học tập của HS và phát huy thế mạnh của HS.",
      "Việc phối hợp nhóm thông qua các nhóm học tập do GV thiết kế và HS lựa chọn là hoạt động then chốt giúp HS học tập và trưởng thành.",
    ],
  },
  {
    ma: "1e.4",
    thanhTo: "1e",
    ten: "Cấu trúc và thứ tự sắp xếp",
    dinhNghia: "Các bài và chương học được tổ chức hợp lý và sắp xếp logic để tạo thuận lợi cho quá trình học tập của HS.",
    muc: [
      "Kế hoạch học tập không có cấu trúc hoặc sắp xếp theo thứ tự phù hợp.",
      "Kế hoạch học tập có cấu trúc tương đối phù hợp nhưng có thể chưa phù hợp trong thời gian cho phép.",
      "Kế hoạch học tập có cấu trúc phù hợp và được sắp xếp giúp HS học tốt đồng thời tổng kết, ôn lại những kiến thức đã học.",
      "Kế hoạch học tập có cấu trúc phù hợp và được sắp xếp giúp HS phát huy tính tự chủ trong học tập.",
    ],
  },
  {
    ma: "1f.1",
    thanhTo: "1f",
    ten: "Phù hợp với mục tiêu giảng dạy",
    dinhNghia: "Bài đánh giá là sự phản ánh rõ ràng, chính xác mức độ nắm vững kiến thức và giúp GV đánh giá mức độ hoàn thành mục tiêu giảng dạy.",
    muc: [
      "Biện pháp đánh giá không phù hợp với mục tiêu giảng dạy.",
      "Biện pháp đánh giá phần nào phù hợp với mục tiêu giảng dạy nhưng không đánh giá được toàn diện.",
      "Biện pháp đánh giá thể hiện đầy đủ và khách quan mức độ nắm vững kiến thức của HS và mức độ đạt mục tiêu, đồng thời cho thấy những lỗi sai cụ thể mà HS mắc phải.",
      "HS có nhiều cơ hội để thể hiện mức độ nắm vững kiến thức; biện pháp đánh giá giúp GV phát hiện các lỗi sai của HS và tại sao có các lỗi đó.",
    ],
  },
  {
    ma: "1f.2",
    thanhTo: "1f",
    ten: "Tiêu chí và tiêu chuẩn",
    dinhNghia: "Các tiêu chí và tiêu chuẩn đánh giá phù hợp, được công bố rõ ràng và được xây dựng dựa trên ý kiến của HS nếu có thể.",
    muc: [
      "Biện pháp đánh giá thiếu các tiêu chí đánh giá chính xác năng lực HS.",
      "Có tiêu chí và tiêu chuẩn đánh giá nhưng không rõ ràng hoặc gây khó hiểu, nhầm lẫn.",
      "Có đủ tiêu chí và tiêu chuẩn đánh giá rõ ràng, và HS hiểu rõ về các tiêu chí, tiêu chuẩn đó.",
      "Tiêu chí và tiêu chuẩn đánh giá rõ ràng, và HS được góp phần vào việc xây dựng các tiêu chí, tiêu chuẩn đó.",
    ],
  },
  {
    ma: "1f.3",
    thanhTo: "1f",
    ten: "Lên kế hoạch đánh giá thường xuyên",
    dinhNghia: "GV lập kế hoạch đánh giá thường xuyên để đánh giá tiến bộ của HS, mức độ hoàn thành mục tiêu giảng dạy và giúp HS đánh giá được tình hình học tập của bản thân.",
    muc: [
      "Không có kế hoạch đánh giá thường xuyên.",
      "GV lên kế hoạch một số biện pháp đánh giá và phần nào phản ánh được tình hình học tập của HS trong suốt bài học.",
      "Các hoạt động đánh giá thường xuyên phản ánh chính xác tình hình học tập của HS. Kế hoạch bài học cho thấy khả năng có thể điều chỉnh tùy theo dữ liệu đánh giá thường xuyên.",
      "Các hoạt động đánh giá thường xuyên cung cấp thông tin chính xác và kịp thời cho GV & HS, giúp HS có thể tự điều chỉnh phương pháp học tập mà không cần GV hỗ trợ nhiều.",
    ],
  },
  {
    ma: "1f.4",
    thanhTo: "1f",
    ten: "Phân tích và áp dụng",
    dinhNghia: "GV thường xuyên sử dụng dữ liệu đánh giá HS làm cơ sở để lập kế hoạch dạy học và hỗ trợ phương pháp dạy học cá nhân hóa.",
    muc: [
      "Kết quả đánh giá không liên quan hoặc không được sử dụng để phục vụ cho việc lập kế hoạch giảng dạy tiếp theo.",
      "Kết quả đánh giá được sử dụng để phục vụ cho việc lập kế hoạch giảng dạy tiếp theo cho một số HS, một số nhóm HS hoặc cả lớp.",
      "Kết quả đánh giá từ các bài trước được GV sử dụng như một công cụ quan trọng để lập kế hoạch bài học tiếp theo.",
      "Kết quả đánh giá luôn là cơ sở vững chắc cho việc lập kế hoạch và chuẩn bị bài giảng, đồng thời là kim chỉ nam cho GV khi lựa chọn phương pháp giảng dạy cho HS.",
    ],
  },
  {
    ma: "2a.1",
    thanhTo: "2a",
    ten: "Mối quan hệ tích cực",
    dinhNghia: "Các tương tác GV-HS và HS-HS thể hiện sự quan tâm và tôn trọng và bảo vệ phẩm giá của từng thành viên trong cộng đồng.",
    muc: [
      "Các tương tác trong lớp học giữa GV và HS và giữa HS với nhau không tích cực, không quan tâm, không phù hợp hoặc không tính đến đặc điểm riêng hoặc mức độ trưởng thành của HS.",
      "Các tương tác trong lớp học giữa GV và HS và giữa HS với nhau thể hiện sự quan tâm và tôn trọng dù không thường xuyên nhưng vẫn tạo cơ sở để xây dựng các mối quan hệ tích cực.",
      "Các tương tác trong lớp học giữa GV và HS và giữa HS với nhau thể hiện sự quan tâm và tôn trọng cá tính, chủng tộc và nền tảng văn hóa của HS.",
      "Các tương tác trong lớp học phù hợp với văn hóa của HS; năng lực văn hóa và nhận thức phản biện của GV giúp tạo ra các mối quan hệ tích cực; HS tích cực tham gia vào việc xây dựng và duy trì các mối quan hệ tích cực.",
    ],
  },
  {
    ma: "2a.2",
    thanhTo: "2a",
    ten: "Cảm giác thân thuộc, gần gũi",
    dinhNghia: "GV và HS cùng nhau xây dựng một cộng đồng với đặc trưng và mối quan tâm riêng của mình, đồng thời tôn trọng bản sắc riêng của từng cá nhân.",
    muc: [
      "Các giao tiếp ngôn ngữ và phi ngôn ngữ của HS cho thấy HS cảm thấy lạc lõng, không an toàn hoặc không hòa nhập được vào tập thể lớp.",
      "Các giao tiếp ngôn ngữ và phi ngôn ngữ của HS cho thấy nhiều HS cảm thấy hòa nhập tốt với tập thể lớp và bản sắc riêng của mình được tôn trọng.",
      "Các giao tiếp ngôn ngữ và phi ngôn ngữ của HS cho thấy hầu hết HS đều hòa nhập vào tập thể lớp, nơi bản sắc chung của tập thể và bản sắc riêng của từng cá nhân đều được tôn trọng.",
      "Sự tham gia tích cực của HS vào các hoạt động học tập & hoạt động tập thể cho thấy HS đang cùng nhau xây dựng một tập thể vừa thể hiện đặc trưng và sở thích chung của cả lớp vừa tôn trọng bản sắc riêng của từng cá nhân.",
    ],
  },
  {
    ma: "2a.3",
    thanhTo: "2a",
    ten: "Tôn trọng văn hóa",
    dinhNghia: "Các tương tác trong lớp học đảm bảo sự tôn trọng văn hóa của từng cá nhân dựa trên nhận thức văn hóa và sự hiểu biết của GV về các động lực xã hội và tác động của chúng đối với môi trường học tập.",
    muc: [
      "Môi trường học tập không thể hiện bản sắc về chủng tộc và văn hóa của HS.",
      "Môi trường học tập thể hiện và tôn trọng một số mặt của bản sắc chủng tộc và văn hóa chung và riêng của HS.",
      "Môi trường học tập thể hiện bản sắc chủng tộc và văn hóa của HS, đồng thời phát hiện và tôn trọng sự khác biệt trong các đặc điểm riêng của HS và GV.",
      "HS giúp tạo ra bản sắc riêng cho lớp mình, là tổng hòa bản sắc của tất cả thành viên trong lớp, tôn vinh bản sắc văn hóa & chủng tộc của từng HS, tôn vinh sự đa dạng, tôn trọng các động lực về văn hóa & chủng tộc khi vui chơi với các bạn.",
    ],
  },
  {
    ma: "2a.4",
    thanhTo: "2a",
    ten: "Giải quyết mâu thuẫn theo cách tích cực",
    dinhNghia: "Xây dựng một phương pháp rõ ràng và phù hợp về văn hóa để giải quyết mâu thuẫn và sử dụng hiệu quả để giải quyết mâu thuẫn và khôi phục niềm tin.",
    muc: [
      "Các mâu thuẫn và ứng xử thiếu tôn trọng xảy ra trong lớp học và không được đề cập hoặc giải quyết.",
      "Các mâu thuẫn và ứng xử thiếu tôn trọng được GV giải quyết đạt kết quả nhưng chưa ổn định.",
      "GV xây dựng cách giải quyết mâu thuẫn phù hợp về văn hóa và sử dụng cách đó hiệu quả để giải quyết mâu thuẫn và lấy lại niềm tin.",
      "HS có trách nhiệm giải quyết mâu thuẫn và tuân thủ các quy trình hoặc quy tắc đã thiết lập để giải quyết mâu thuẫn và lấy lại niềm tin.",
    ],
  },
  {
    ma: "2b.1",
    thanhTo: "2b",
    ten: "Mục tiêu và động lực",
    dinhNghia: "GV và HS cùng có một cam kết chung về học tập tốt và phát triển nhân cách.",
    muc: [
      "HS không có hoặc không có đủ ý thức về mục tiêu đối với hoạt động/nhiệm vụ hoặc lí do thực hiện hoạt động/nhiệm vụ là để đáp ứng yêu cầu từ bên ngoài chứ không xuất phát từ ý chí của HS.",
      "GV nêu tầm quan trọng của nội dung bài học, mục đích cuối cùng của việc học tập nói chung và sự cần thiết phải phát triển bản thân và đạt được một số kết quả.",
      "GV và HS tin tưởng sâu sắc vào tầm quan trọng của học tập và phát triển bản thân và điều đó tạo động lực cho HS nỗ lực và thành công.",
      "GV và HS thể hiện sự kiên trì, quyết tâm nắm bắt kiến thức và có ý thức về mục tiêu học tập; GV và HS đề cao cả việc nắm bắt kiến thức và phát triển bản thân.",
    ],
  },
  {
    ma: "2b.2",
    thanhTo: "2b",
    ten: "Chuẩn bị cho việc học tập",
    dinhNghia: "GV làm mẫu, khuyến khích, hướng dẫn cụ thể và củng cố trí tò mò, tư duy phản biện, suy luận và đánh giá để nâng cao năng lực học tập và sự phát triển về cảm xúc-xã hội của HS.",
    muc: [
      "Bỏ qua hoặc không khuyến khích sự tò mò của HS. Không yêu cầu HS tư duy phản biện hoặc suy luận và đánh giá.",
      "GV đôi khi khuyến khích trí tò mò, tư duy phản biện, suy luận và đánh giá của HS.",
      "GV khuyến khích và chủ động phát triển trí tò mò, tư duy phản biện, suy luận và đánh giá của HS.",
      "Trí tò mò, tư duy phản biện, suy luận và đánh giá của HS được thể hiện rõ trong lớp học và tác động trực tiếp đến phương pháp giảng dạy, hiệu quả học tập và tiến bộ của HS.",
    ],
  },
  {
    ma: "2b.3",
    thanhTo: "2b",
    ten: "Sự tự chủ & lòng tự hào của HS",
    dinhNghia: "HS đưa ra các lựa chọn có căn cứ, tích cực học tập, tự hào về các thành tích đạt được, và đề xuất các biện pháp để làm cho lớp học vui vẻ, hiệu quả và chủ động hơn.",
    muc: [
      "HS không có hoặc không có đủ sự tự chủ trong các hoạt động học tập hoặc trong quá trình học tập tại lớp.",
      "HS có một số cơ hội được phép tự chủ nhưng không được duy trì thường xuyên.",
      "HS có nhiều cơ hội được tự chủ. GV chủ động xây dựng và khuyến khích sự tự chủ của HS.",
      "HS thể hiện sự tự chủ trong học tập và chủ động đề xuất các phương pháp giúp lớp học vui vẻ, thoải mái nhưng vẫn đảm bảo học tập nghiêm túc và tự giác.",
    ],
  },
  {
    ma: "2b.4",
    thanhTo: "2b",
    ten: "Hỗ trợ và kiên trì",
    dinhNghia: "GV và HS động viên nhau kiên trì, quyết tâm và hỗ trợ nhau bằng các biện pháp phù hợp khi gặp khó khăn.",
    muc: [
      "GV nói với HS là nhiệm vụ/hoạt động quá khó với cả lớp hoặc một số em hoặc HS không có đủ kiên trì, quyết tâm để thực hiện tốt; HS được phép bỏ qua nhiệm vụ/hoạt động.",
      "GV khuyến khích HS tự tin, thích ứng, kiên trì và phối hợp nhóm, qua đó củng cố niềm tin là ai cũng có thể nắm bắt kiến thức nếu chăm chỉ và kiên trì, quyết tâm.",
      "GV chủ động xây dựng và khuyến khích sự tự tin, thích ứng, kiên trì và phối hợp nhóm giúp nâng cao sự quyết tâm của HS.",
      "HS động viên, khuyến khích lẫn nhau và hỗ trợ nhau khi thực hiện các nhiệm vụ khó.",
    ],
  },
  {
    ma: "2c.1",
    thanhTo: "2c",
    ten: "Phối hợp hiệu quả",
    dinhNghia: "GV làm mẫu, hướng dẫn và củng cố kĩ năng phối hợp để HS tự thực hiện nhiệm vụ, phối hợp với nhau theo nhóm và hỗ trợ nhau để cùng đạt kết quả tốt.",
    muc: [
      "HS không tham gia hiệu quả vào hoạt động nhóm.",
      "HS tham gia khá tích cực vào hoạt động nhóm.",
      "HS tham gia tích cực vào hoạt động nhóm nhỏ, tự giác phối hợp với các bạn.",
      "HS chủ động sử dụng thời gian hoạt động nhóm của mình đúng mục đích và phù hợp với nhu cầu của bản thân và cả nhóm.",
    ],
  },
  {
    ma: "2c.2",
    thanhTo: "2c",
    ten: "Sự tự giác & tinh thần trách nhiệm",
    dinhNghia: "Xây dựng nề nếp lớp học để HS có ý thức nhận trách nhiệm và phát triển các kĩ năng, thói quen và tư duy giúp hình thành tính tự giác/tự lập của HS.",
    muc: [
      "Nề nếp, nội quy không giúp HS phát huy tính tự chủ và trach nhiệm.",
      "Nề nếp, nội quy phần nào giúp HS phát huy tính tự chủ và trach nhiệm.",
      "Nề nếp và quy trình giúp HS học tập chủ động và tự chịu trách nhiệm về việc học tập của mình.",
      "HS tự chịu trách nhiệm việc thực hiện, quản lý các nề nếp, quy trình và chủ động đề xuất các điều chỉnh cần thiết để hỗ trợ việc học tập và trưởng thành của mình.",
    ],
  },
  {
    ma: "2c.3",
    thanhTo: "2c",
    ten: "Tạo cơ hội tiếp cận học liệu và hỗ trợ bình đẳng",
    dinhNghia: "Tạo điều kiện để tất cả HS được sử dụng học liệu và hỗ trợ hiệu quả, bình đẳng.",
    muc: [
      "HS không được tiếp cận học liệu và hỗ trợ hiệu quả, bình đẳng.",
      "Học liệu và biện pháp hỗ trợ được quản lý và thực hiện tương đối hiệu quả nhưng vẫn chưa đảm bảo bình đẳng cho mọi HS.",
      "Học liệu và biện pháp hỗ trợ được thực hiện hiệu quả; mọi HS đều được sử dụng học liệu, thiết bị và được hỗ trợ khi cần.",
      "Học liệu và biện pháp hỗ trợ được thực hiện công bằng, bình đẳng. HS chủ động tiếp cận học liệu, thiết bị khi cần sử dụng và đề xuất các biện pháp hỗ trợ bổ sung để đáp ứng nhu cầu học tập của bản thân.",
    ],
  },
  {
    ma: "2c.4",
    thanhTo: "2c",
    ten: "Thực hiện nhiệm vụ ngoài thời gian giảng bài",
    dinhNghia: "GV thực hiện các nhiệm vụ khác không phục vụ cho mục tiêu của bài giảng trong tiết học sao cho không làm mất hoặc mất ít thời gian học giảng bài hoặc gây gián đoạn việc thực hiện bài học.",
    muc: [
      "Không hoàn thành hoặc hoàn thành không tốt các hoạt động ngoài thời gian giảng bài, gây ảnh hưởng đến thời lượng giảng bài hoặc gây tổn hại đến HS.",
      "Hoàn thành tương đối tốt các hoạt động ngoài thời gian giảng bài nhưng vẫn làm giảm thời lượng giảng bài.",
      "Hoàn thành tốt hầu hết các hoạt động ngoài thời gian giảng bài, ảnh hưởng ít đến thời lượng giảng bài.",
      "Hoàn thành tốt các hoạt động ngoài thời gian giảng bài, không làm giảm thời lượng giảng bài.",
    ],
  },
  {
    ma: "2d.1",
    thanhTo: "2d",
    ten: "Các quy tắc cho cộng đồng học tập",
    dinhNghia: "HS đóng vai trò tích cực trong việc thiết lập và duy trì các quy tắc cho cộng đồng, được thường xuyên kiểm tra, đánh giá việc thực hiện các quy tắc của từng cá nhân và tập thể.",
    muc: [
      "Không có quy tắc/kỳ vọng rõ ràng và/hoặc không xử lý các hành vi tiêu cực.",
      "Có xây dựng các quy tắc/kỳ vọng để khuyến khích hành vi tích cực nhưng kết quả còn hạn chế.",
      "Xây dựng và thống nhất các quy tắc/kỳ vọng.",
      "HS tích cực góp phần xây dựng và duy trì các quy tắc/kỳ vọng, thường xuyên tự đánh giá, rút kinh nghiệm từng cá nhân và cả lớp.",
    ],
  },
  {
    ma: "2d.2",
    thanhTo: "2d",
    ten: "Làm mẫu và dạy các thói quen tốt",
    dinhNghia: "GV làm mẫu và dạy, củng cố cho HS các thói quen giúp học tốt, các hành vi chuẩn mực và trách nhiệm công dân.",
    muc: [
      "Không làm mẫu hoặc dạy các thói quen, đức tính tốt.",
      "GV dạy hoặc làm mẫu các thói quen, đức tính tốt nhưng kết quả còn hạn chế.",
      "GV làm mẫu, dạy và củng cố các thói quen, đức tính tốt giúp HS học tập tốt, ứng xử phù hợp các chuẩn mực đạo đức và trách nhiệm công dân.",
      "HS chủ động trao đổi và củng cố các thói quen, đức tính tốt giúp xây dựng một môi trường học tập an toàn và hiệu quả.",
    ],
  },
  {
    ma: "2d.3",
    thanhTo: "2d",
    ten: "Tự giám sát và trách nhiệm chung",
    dinhNghia: "HS tự giám sát hành vi của mình, đánh giá tác động của hành vi của mình đến các bạn khác và hỗ trợ lẫn nhau.",
    muc: [
      "HS không chịu trách nhiệm về hành vi của mình và không nhận thức được tác động của các hành vi đó đối với người khác.",
      "GV khuyến khích HS tự giám sát hành vi của mình và của các bạn khác, chịu trách nhiệm chung, nhưng kết quả còn hạn chế.",
      "HS tự giám sát tốt hành vi của mình và quan tâm đến tác động của các hành vi đó đối với các bạn khác.",
      "HS tự giám sát tốt hành vi của mình và hỗ trợ lẫn nhau thực hiện các hành vi tích cực.",
    ],
  },
  {
    ma: "2e.1",
    thanhTo: "2e",
    ten: "An toàn và thuận tiện",
    dinhNghia: ": Không gian học tập an toàn và thuận tiện cho tất cả HS và được điều chỉnh bởi GV và HS nếu cần thiết để phù hợp với nhu cầu của từng HS.",
    muc: [
      "Không gian học tập ảnh hưởng đến sự an toàn của HS hoặc một số HS không tiếp cận được.",
      "Không gian nhìn chung là an toàn và dễ tiếp cận nhưng vẫn còn một số hạn chế chưa được khắc phục.",
      "Không gian học tập an toàn và dễ tiếp cận cho mọi HS.",
      "GV và HS cùng thực hiện việc bố trí không gian phù hợp với nhu cầu của từng cá nhân.",
    ],
  },
  {
    ma: "2e.2",
    thanhTo: "2e",
    ten: "Thiết kế không gian phù hợp cho học tập",
    dinhNghia: "Không gian học tập được thiết kế tỉ mỉ và có thể điều chỉnh nếu cần để thuận tiện cho các hoạt động học tập.",
    muc: [
      "Thiết kế không gian lớp học không thuận lợi cho việc học tập và phát triển của HS.",
      "Thiết kế không gian lớp học không cản trở việc học tập nhưng cũng không góp phần tăng hiệu quả học tập của HS.",
      "Thiết kế không gian lớp học thuận lợi cho việc học tập và phát triển của HS và phù hợp với các mục tiêu và hoạt động trong lớp học.",
      "Thiết kế không gian lớp học hỗ trợ tối ưu việc học tập và phát triển của HS và được điều chỉnh hợp lý để phù hợp với các mục tiêu và hoạt động trong lớp học.",
    ],
  },
  {
    ma: "2e.3",
    thanhTo: "2e",
    ten: "Đồng sáng tạo và sở hữu chung",
    dinhNghia: "HS tham gia vào quá trình thiết kế và điều chỉnh không gian học tập để có ý thức về sự sở hữu.",
    muc: [
      "HS không góp phần xây dựng hoặc sắp xếp không gian học tập và không thể hiện sự tự hào hoặc ý thức sở hữu không gian chung.",
      "HS tham gia một chút vào việc xây dựng không gian học tập và phần nào thể hiện ý thức sở hữu không gian chung.",
      "HS tham gia vào việc xây dựng không gian học tập và thể hiện ý thức sở hữu không gian chung.",
      "HS chủ động thiết kế không gian học tập, thể hiện sự tự hào và ý thức sở hữu, đồng thời sắp xếp lại không gian để tạo ra môi trường học tập đẹp đẽ, vui tươi.",
    ],
  },
  {
    ma: "3a.1",
    thanhTo: "3a",
    ten: "Mục tiêu học tập và tiêu chí đánh giá",
    dinhNghia: "GV nêu rõ mục tiêu của từng hoạt động học tập và lập kế hoạch giảng dạy cho HS để phù hợp với các tiêu chí đánh giá.",
    muc: [
      "GV không thông báo cho HS các nội dung sẽ học.",
      "GV giải thích mục đích bài học/hoạt động nhưng chung chung, không cụ thể, rõ ràng.",
      "GV thông báo rõ ràng cho HS các nội dung sẽ học, tại sao cần học và liên hệ các nội dung đó với các mục tiêu lớn hơn, HS sẽ học như thế nào, và lợi ích sẽ nhận được khi hoàn thành tốt hoạt động.",
      "HS có thể giải thích mục đích và sự cần thiết của nội dung sẽ học và liên hệ với các mục tiêu lớn hơn, cả trong chương trình học và trong cuộc sống.",
    ],
  },
  {
    ma: "3a.2",
    thanhTo: "3a",
    ten: "Kì vọng cụ thể",
    dinhNghia: "Nêu rõ các việc HS cần làm trong từng bước, đồng thời nêu rõ và nhấn mạnh kì vọng trong suốt quá trình.",
    muc: [
      "GV không giải thích rõ ràng, đầy đủ về hoạt động học tập khiến HS không tham gia tích cực.",
      "Các kỳ vọng về hoạt động học tập được truyền đạt tương đối rõ ràng với HS.",
      "GV giải thích rõ ràng và làm mẫu hoạt động học tập, nếu có thể, đồng thời liên tục hỗ trợ và duy trì sự tham gia tích cực của HS.",
      "GV và HS dự đoán và tìm cách khắc phục các khó khăn có thể xảy ra trong hoạt động học tập. HS áp dụng hoặc đề xuất các phương pháp, cách làm hoặc quy trình khác khi thực hiện hoạt động học tập.",
    ],
  },
  {
    ma: "3a.3",
    thanhTo: "3a",
    ten: "Giảng nội dung kiến thức",
    dinhNghia: "Giảng theo phương pháp “tạo bước đệm”, trình bày theo nhiều cách lôi cuốn với HS và thường xuyên kiểm tra xem HS có hiểu bài không.",
    muc: [
      "GV nhầm lẫn nghiêm trọng về kiến thức hoặc không giảng rõ ràng khiến HS hiểu sai kiến thức.",
      "GV mắc lỗi nhỏ về kiến thức hoặc cách giải thích gây nhầm lẫn, đồng thời hạn chế tương tác với HS.",
      "GV giảng đúng kiến thức, tạo bước đệm phù hợp và phù hợp với các trải nghiệm của HS; GV giảng theo nhiều cách đa dạng và lôi cuốn.",
      "HS thảo luận và trình bày rõ ràng, chính xác về nội dung được học; việc HS trao đổi, trình bày về kiến thức và ứng dụng của kiến thức được học thể hiện HS có tư duy phản biện, trí tò mò và hiểu rõ mục đích và sự cần thiết của nội dung.",
    ],
  },
  {
    ma: "3a.4",
    thanhTo: "3a",
    ten: "Sử dụng ngôn ngữ học thuật",
    dinhNghia: "GV và HS sử dụng ngôn ngữ nói và viết chuẩn liên quan đến nội dung bài học, đồng thời phù hợp với cấp lớp.",
    muc: [
      "GV sử dụng ngôn ngữ học thuật không chính xác trong khi diễn đạt.",
      "GV sử dụng ngôn ngữ học thuật nhìn chung chính xác nhưng cần giải thích thêm hoặc quá đơn giản nên ảnh hưởng đến việc tiếp thu kiến thức của HS.",
      "Ngôn ngữ và từ vựng về nội dung kiến thức của GV chính xác, có độ khó phù hợp về học thuật và phù hợp với HS và bài học, là chuẩn mực để HS học tập.",
      "GV và HS sử dụng thường xuyên và hiệu quả bộ ngôn ngữ và từ vựng phong phú và chuẩn mực.",
    ],
  },
  {
    ma: "3b.1",
    thanhTo: "3b",
    ten: "Tư duy phản biện và nắm vững kiến thức",
    dinhNghia: "Khi đặt câu hỏi và trao đổi/thảo luận, HS cần có tư duy phản biện, đưa ra nhiều câu trả lời, qua đó giúp các em nắm vững kiến thức, hiểu hơn về bản thân cũng như thế giới xung quanh.",
    // BỔ SUNG — không phải văn bản chính thức của trường.
    // Cả "Chi tiết khung đánh giá.xlsx" lẫn "Khung đánh giá giờ học.pdf" đều bỏ
    // trống 4 mức của mục này. Soạn theo: (a) định nghĩa ở trên, (b) tiến trình
    // 1→4 của thành tố cha 3b (nhắc lại → GV dẫn → cùng làm → HS chủ động),
    // (c) văn phong hai mục anh em 3b.2 và 3b.3 vốn có bản chính thức.
    // Trường ban hành bản chính thức thì thay vào đây và bỏ cờ tuBoSung.
    tuBoSung: true,
    muc: [
      "Câu hỏi và thảo luận chỉ yêu cầu HS nhắc lại kiến thức và chỉ chấp nhận một đáp án đúng, không đòi hỏi HS phải tư duy phản biện.",
      "Có câu hỏi mở cho phép nhiều cách trả lời, nhưng GV thường tự đưa ra kết luận nên HS ít có cơ hội thực sự phản biện hay đào sâu kiến thức.",
      "Câu hỏi và thảo luận thường xuyên đòi hỏi HS tư duy phản biện, đưa ra và so sánh nhiều cách trả lời khác nhau, qua đó HS nắm vững kiến thức của bài.",
      "HS tự đặt ra những câu hỏi có nhiều hướng trả lời, tranh luận về các cách hiểu khác nhau và liên hệ kiến thức với bản thân cũng như thế giới xung quanh.",
    ],
  },
  {
    ma: "3b.2",
    thanhTo: "3b",
    ten: "Suy luận và đánh giá",
    dinhNghia: "Khi đặt câu hỏi và trao đổi/thảo luận, HS cần suy luận, xem lại những kiến thức đã học, chứng minh cho ý kiến của mình và đưa ra ý tưởng cho các vấn đề cần tìm hiểu trong tương lai.",
    muc: [
      "Cách đặt câu hỏi và trao đổi, thảo luận không khuyến khích hoặc yêu cầu HS giải thích suy nghĩ của mình.",
      "Cách đặt câu hỏi và trao đổi, thảo luận khuyến khích hoặc yêu cầu HS giải thích suy nghĩ của mình và xem xét lại các kiến thức đã học, nhưng HS chưa thường xuyên làm được như vậy.",
      "Thông qua đặt câu hỏi và thảo luận, HS được suy luận, xem lại các kiến thức đã học, chứng minh cho suy nghĩ của mình và làm tốt các hoạt động đó.",
      "HS dùng câu hỏi và thảo luận để phản biện ý tưởng của các bạn khác một cách lịch sự và khiêm tốn, chứng minh cho lập luận của mình và cùng nhau xây dựng các ý tưởng và phương pháp truy vấn mới.",
    ],
  },
  {
    ma: "3b.3",
    thanhTo: "3b",
    ten: "Sự tham gia tích cực của HS",
    dinhNghia: "hông qua các câu hỏi và thảo luận, HS thể hiện trí tò mò, lôi cuốn các bạn khác cùng tham gia và phản biện các ý kiến một cách lịch sự và khiêm tốn.",
    muc: [
      "Chỉ GV và một số HS được chọn đặt câu hỏi và thảo luận với nhau. HS không trao đổi hoặc đặt câu hỏi với nhau.",
      "GV gọi nhiều HS hoặc khuyến khích HS đối đáp trực tiếp với nhau, nhưng chỉ một vài HS trả lời hoặc tham gia vào thảo luận.",
      "GV tổ chức cho HS tham gia thảo luận. HS tham gia nhiệt tình và đặt câu hỏi cho các bạn khác.",
      "HS đặt câu hỏi, khởi xướng thảo luận và tự điều phối để đảm bảo tất cả HS đều được nêu ý kiến của mình.",
    ],
  },
  {
    ma: "3c.1",
    thanhTo: "3c",
    ten: "Hoạt động học tập phong phú",
    dinhNghia: "HS thể hiện sự chủ động và tư duy phản biện khi hoàn thành các nhiệm vụ và hoạt động yêu cầu hàm lượng trí tuệ cao.",
    muc: [
      "Nhiệm vụ không phù hợp với HS trong lớp, nhiều HS không tham gia, hoặc hoạt động chỉ yêu cầu nhớ lại các kiến thức đã học hoặc chỉ sử dụng một cách tiếp cận duy nhất.",
      "HS phần nào tham gia vào các nhiệm vụ đòi hỏi tư duy chứ không chỉ đơn thuần nhớ lại các nội dung đã học; một số nhiệm vụ có nhiều đáp án đúng hoặc nhiều phương pháp tiếp cận khác nhau.",
      "Tất cả HS đều tham gia vào các hoạt động khuyến khích sự tự chủ và tư duy phản biện; nhiệm vụ yêu cầu mức độ hoạt động trí tuệ cao và HS giải thích cách suy nghĩ của mình.",
      "GV đưa ra các lựa chọn hoặc HS chủ động điều chỉnh các nhiệm vụ học tập để trở nên phù hợp, hiệu quả hoặc tăng mức độ khó.",
    ],
  },
  {
    ma: "3c.2",
    thanhTo: "3c",
    ten: "Phối hợp và hoạt động nhóm",
    dinhNghia: "Phối hợp và làm việc nhóm là một yếu tố quan trọng trong học tập. HS được chủ động phối hợp một cách sáng tạo mà không cần theo một khuôn khổ định sẵn, qua đó nâng cao hiệu quả học tập và làm cho hoạt động học tập trở nên lôi cuốn, hấp dẫn và thiết thực.",
    muc: [
      "HS không phối hợp với nhau hoặc không phối hợp hiệu quả, và/hoặc cách phân nhóm không phù hợp với nhiệm vụ.",
      "HS phối hợp trong giờ học theo cách thức phù hợp với các hoạt động và mục tiêu học tập và phần nào hỗ trợ việc học tập của từng HS; HS phối hợp tốt với nhau trong các hoạt động nhóm.",
      "Hoạt động phối hợp của HS là yếu tố chính của học tập và tham gia vào bài học, các nhóm được phân chia một cách phù hợp để hỗ trợ việc học tập và tham gia vào bài học của HS; GV dạy và khuyến khích cách thực hiện hoạt động nhóm hiệu quả.",
      "HS chủ động phối hợp theo các cách thức mới hoặc không được lên kế hoạch từ trước để nâng cao kiến thức; HS chủ động đóng vai như những nguồn học liệu để bổ trợ kiến thức cho nhau, làm cho việc học tập lôi cuốn, thú vị và hiệu quả hơn.",
    ],
  },
  {
    ma: "3c.3",
    thanhTo: "3c",
    ten: "Sử dụng các giáo cụ và học liệu",
    dinhNghia: "Sử dụng hiệu quả các giáo cụ và học liệu để lôi cuốn HS và giúp HS nắm vững kiến thức",
    muc: [
      "Tài liệu học tập và đồ dùng không được HS sử dụng đúng cách hoặc hiệu quả, không hỗ trợ việc học tập của HS và/hoặc không được phân bổ đồng đều giữa các HS.",
      "Tài liệu học tập và đồ dùng được HS sử dụng tương đối hiệu quả để hỗ trợ việc học tập, được phân bổ đồng đều giữa các HS.",
      "Tài liệu học tập và đồ dùng được sử dụng hiệu quả để hỗ trợ hoạt động trí tuệ và học sâu của HS; Tài liệu học tập và đồ dùng phong phú để mọi HS đều được sử dụng một cách bình đẳng.",
      "HS chủ động sử dụng tài liệu học tập và đồ dùng bằng cách chỉnh sửa cho phù hợp với nhu cầu riêng của mình; HS đề xuất các chỉnh sửa hoặc bổ sung cần thiết để tài liệu và đồ dùng phù hợp hơn hoặc có độ khó cao hơn.",
    ],
  },
  {
    ma: "3c.4",
    thanhTo: "3c",
    ten: "Khuyến khích tư duy và đánh giá",
    dinhNghia: "Các bài học, hoạt động, nhiệm vụ và lộ trình giảng dạy đều tạo cơ hội cho HS tư duy, đánh giá kết quả và củng cố kiến thức",
    muc: [
      "Tốc độ bài học quá chậm hoặc quá nhanh, hoặc GV không tạo điều kiện để HS tư duy và tự đánh giá; HS không có thời gian để tự đánh giá hoặc củng cố kiến thức",
      "Tốc độ bài học phù hợp để tạo điều kiện cho HS tư duy và tự đánh giá, giúp HS tham gia bài học và tiếp thu kiến thức.",
      "Tốc độ bài học phù hợp tạo điều kiện cho hoạt động trí tuệ ở mức độ cao và khả năng học sâu; HS được tạo điều kiện để tư duy, tự đánh giá và củng cố kiến thức hiệu quả.",
      "GV tạo điều kiện hoặc HS chủ động thể hiện sự tự chủ và sử dụng hiệu quả các phương pháp tự đánh giá; HS có thể xác định và yêu cầu được đáp ứng nhu cầu được tiếp tục học tập và tự đánh giá để củng cố kiến thức đã học và thu nhận kiến thức mới.",
    ],
  },
  {
    ma: "3d.1",
    thanhTo: "3d",
    ten: "Tiêu chí đánh giá rõ ràng",
    dinhNghia: "Các mục tiêu phối hợp, các đặc điểm của bài làm tốt và quy định các tiêu chí đánh giá được truyền thông rõ ràng cho HS và PH.",
    muc: [
      "GV không thông báo tiêu chí đánh giá, mô tả bài làm/sản phẩm tốt cần bao gồm những gì hay giải thích HS dựa vào đâu để biết mình đã làm tốt.",
      "HS phần nào hiểu cách tự xác định mức độ tiến bộ và cách GV đánh giá bài làm/sản phẩm của mình.",
      "Tiêu chí bài làm/sản phẩm tốt và học tập tốt được thông báo rõ ràng với HS và là cơ sở để HS tự đánh giá.",
      "HS và các bên hỗ trợ HS tham gia tích cực vào việc xây dựng các tiêu chí đánh giá học tập tốt sao phù hợp và khuyến khích HS phấn đấu nâng cao thành tích, đồng thời hiểu rõ cách thức đánh giá sự tiến bộ của HS.",
    ],
  },
  {
    ma: "3d.2",
    thanhTo: "3d",
    ten: "Kiểm tra mức độ tiếp thu của HS",
    dinhNghia: "GV & HS thường xuyên kiểm tra, giám sát tình hình học tập và áp dụng các phương pháp cụ thể để thu được bằng chứng về mức độ hiểu bài của HS.",
    muc: [
      "GV không tìm hiểu xem HS có đạt được tiến bộ so với mục tiêu đã đề ra hay không và không tạo điều kiện cho HS tự giám sát sự tiến bộ của bản thân.",
      "GV có kiểm tra mức độ tiếp thu của HS và giúp HS tự đánh giá nhưng còn hạn chế hoặc chưa đạt hiệu quả tốt.",
      "GV sử dụng câu hỏi và biện pháp đánh giá để xác định mức độ tiếp thu kiến thức của HS, làm mẫu các phương pháp tự đánh giá để HS có thể tự kiểm tra tiến bộ của mình so với mục tiêu đề ra.",
      "HS chủ động giám sát mức độ tiếp thu kiến thức của mình thông qua các nhiệm vụ đã được xây dựng từ trước, các bài đánh giá và phương pháp tự đánh giá, qua đó nắm được mức độ tiến bộ của mình, xác định các lộ trình và mục tiêu mới hoặc thay thế phù hợp.",
    ],
  },
  {
    ma: "3d.3",
    thanhTo: "3d",
    ten: "Phản hồi kịp thời, mang tính xây dựng",
    dinhNghia: "Phản hồi mang tính xây dựng của nhiều bên, bao gồm của chính HS; phản hồi cần cụ thể và tập trung vào những điểm tốt mà HS đã làm được.",
    muc: [
      "HS không nhận được phản hồi hoặc chỉ nhận được phản hồi chung chung hoặc chỉ dành cho một số HS.",
      "GV cho phản hồi nhưng phản hồi không rõ ràng hoặc không hướng tới việc giúp HS khắc phục khuyết điểm hoặc nắm được kiến thức.",
      "HS nhận được phản hồi kịp thời, mang tính xây dựng của GV hoặc của người khác giúp nâng cao hiệu quả học tập.",
      "HS tự đưa ra lựa chọn và chịu trách nhiệm về việc học tập của mình dựa trên các phản hồi có chất lượng, giúp HS khắc phục khuyết điểm từ nhiều nguồn khác nhau.",
    ],
  },
  {
    ma: "3e.1",
    thanhTo: "3e",
    ten: "Điều chỉnh có cơ sở",
    dinhNghia: "Khi cần thiết, GV điều chỉnh hoặc hủy bỏ các hoạt động đã lên kế hoạch từ trước và thay bằng các hoạt động phù hợp hơn với kiến thức hoặc sự quan tâm của HS",
    muc: [
      "GV không nhận ra hoặc bỏ qua các dấu hiệu HS không tích cực tham gia bài học hoặc không hiểu bài.",
      "GV có ý thức điều chỉnh hoạt động học tập theo các dấu hiệu quan sát được về tình hình lớp học nhưng chưa thật sự hiệu quả.",
      "GV điều chỉnh hoạt động học tập hiệu quả theo các dấu hiệu quan sát được trong lớp học trong khi giảng dạy và phù hợp với nhu cầu cụ thể của từng HS.",
      "HS nêu lên nhu cầu của mình và tự chịu trách nhiệm về việc học tập của mình bằng cách thực hiện các điều chỉnh, sửa đổi cần thiết đối với các hoạt động học tập với sự hỗ trợ và động viên của GV.",
    ],
  },
  {
    ma: "3e.2",
    thanhTo: "3e",
    ten: "Tư duy cởi mở và đáp ứng nhu cầu của HS",
    dinhNghia: "GV cởi mở tiếp nhận các hành động, câu hỏi và các tình huống phát sinh ngoài dự kiến ở trong và ngoài lớp học và biến chúng thành các cơ hội học tập cho HS, giúp HS tự tìm hiểu kiến thức mới và tìm kiếm các cơ hội mới.",
    muc: [
      "GV bỏ qua hoặc không giải quyết thấu đáo các thắc mắc hoặc khó khăn của HS.",
      "GV có ý thức đưa các nội dung HS thắc mắc vào hoạt động học tập và đáp ứng sở thích của HS nhưng kết quả còn hạn chế.",
      "GV đưa các nội dung HS còn thắc mắc và sở thích/quan tâm của HS vào hoạt động học tập để giúp HS hiểu rõ kiến thức, thúc đẩy trí tò mò và sự tự chủ của HS.",
      "HS nhận biết các cơ hội học tập mới và chủ động tự mình, hoặc cùng với các bạn khắc, hoặc với sự hỗ trợ của GV hoặc những người khác trong hoặc bên ngoài trường học, nắm bắt các cơ hội đó.",
    ],
  },
  {
    ma: "3e.3",
    thanhTo: "3e",
    ten: "Quyết tâm và kiên trì",
    dinhNghia: "GV cần kiên trì để đảm bảo hiệu quả giảng dạy cho dù HS có thể gặp khó khăn, và nếu cần có thể sử dụng các phương pháp khác để HS dễ tiếp cận hơn.",
    muc: [
      "GV không thể hiện tinh thần trách nhiệm với việc tiếp thu kiến thức và thành tích học tập của HS và hoặc không nắm rõ cách hỗ trợ HS.",
      "GV thể hiện trách nhiệm và quyết tâm đạt hiệu quả giảng dạy nhưng không chắc chắn hoặc chỉ đạt kết quả hạn chế trong việc giúp giải quyết các khó khăn trong học tập của HS.",
      "GV sử dụng nhiều phương pháp khác nhau, kiên trì thực hiện các phương pháp và lộ trình khác nhau để giúp tháo gỡ khó khăn cho HS.",
      "HS thể hiện sự quyết tâm và kiên trì khi gặp khó khăn; HS chủ động tìm kiếm và nhận được sự hỗ trợ hiệu quả của GV và những người khác.",
    ],
  },
  {
    ma: "4a.1",
    thanhTo: "4a",
    ten: "Tự đánh giá hoạt động dạy học",
    dinhNghia: "GV dựa trên các hoạt động học tập và bài đánh giá để xác định tác động của các hoạt động giảng dạy đối với kết quả học tập của HS và đánh giá hiệu quả của hoạt động học tập.",
    muc: [
      "GV không đánh giá lại các hoạt động đã thực hiện hoặc đưa ra kết luận không chính xác hoặc không đầy đủ về hiệu quả giảng dạy của mình.",
      "GV nhận định đúng phần nào nhưng không đầy đủ về mức độ hiệu quả của hoạt động giảng dạy hoặc tác động mong muốn đối với việc học tập và tiến bộ của HS.",
      "GV dựa vào các bằng chứng thu được từ bài học, bao gồm cả bài làm của HS, để đánh giá hiệu quả của từng nội dung giảng dạy cụ thể và tác động của chúng đối với việc học tập và tiến bộ của HS.",
      "GV đánh giá bài học dựa trên nhiều bằng chứng khác nhau, từ đó phân tích chính xác và đầy đủ hoạt động giảng dạy, phân tích tác động cụ thể của cách thiết kế hoặc cách thực hiện từng nội dung giảng dạy đối với việc học tập và tiến bộ của HS.",
    ],
  },
  {
    ma: "4a.2",
    thanhTo: "4a",
    ten: "Phân tích và phát hiện",
    dinhNghia: "Dựa trên kết quả tự đánh giá, GV sử dụng các phương pháp hoặc quan điểm mới, xem xét lại các ý tưởng và quan điểm của mình và tìm hiểu các phương pháp mới để nâng cao hiệu quả học tập của HS.",
    muc: [
      "GV không hoặc không biết cách phân tích tác động của mình đối với kết quả học tập của HS và/hoặc không đưa ra các gợi ý giúp HS tiến bộ.",
      "GV phân tích một số nội dung giảng dạy nhưng không tính đến các phương pháp thay thế các phương pháp đang áp dụng, nhận biết tác động của tư duy và quan điểm của mình đối với HS, và/hoặc không sẵn lòng thử nghiệm các phương pháp hoặc ý tưởng mới.",
      "GV phân tích tác động của hành vi và quan điểm của mình đối với việc học tập của HS, tìm hiểu các quan điểm và phương pháp thay thế, xây dựng các kiến thức và kĩ năng mới giúp nâng cao hiệu quả học tập của HS.",
      "GV phân tích kĩ lưỡng tác động của việc làm, hành vi, giá trị, quan điểm của mình đối việc việc học tập của HS và thường xuyên học hỏi các kiến thức và kĩ năng mới giúp nâng cao hiệu quả học tập của HS, với trọng tâm là giúp các HS đang gặp khó khăn tiến bộ.",
    ],
  },
  {
    ma: "4a.3",
    thanhTo: "4a",
    ten: "Không ngừng ứng dụng và cải tiến",
    dinhNghia: "GV kiên trì giúp HS nâng cao thành tích học tập bằng cách lập kế hoạch, thử nghiệm và áp dụng các phương pháp mới để nâng cao hiệu quả dạy học dựa trên các đánh giá và phân tích.",
    muc: [
      "GV không có kế hoạch tìm kiếm hoặc xem xét các cơ hội nâng cao nghiệp vụ.",
      "Sau khi tiến hành đánh giá, rút kinh nghiệm, GV lên kế hoạch cho các hoạt động tiếp theo để hỗ trợ việc học tập và tiến bộ của HS.",
      "Sau khi tiến hành đánh giá, rút kinh nghiệm, GV xây dựng các lộ trình khác nhau cho các kế hoạch tiếp theo; thể hiện cam kết, quyết tâm giúp tất cả HS học tốt; lên kế hoạch và thực hiện các hành động cải tiến.",
      "Sau khi tiến hành đánh giá, rút kinh nghiệm, GV tập trung xây dựng kế hoạch hành động để giúp HS đạt kết quả tốt, thể hiện quyết tâm vượt qua khó khăn thử thách, thực hiện các ý tưởng, phương pháp mới và tiếp tục đánh giá, phân tích kết quả.",
    ],
  },
  {
    ma: "4b.1",
    thanhTo: "4b",
    ten: "Qúa trình học tập hướng tới mục tiêu",
    dinhNghia: "GV lưu lại quá trình học tập và tiến bộ của HS hướng tới các mục tiêu đã đề ra và thông tin đến HS, PH và các bên tham gia vào quá trình giáo dục HS.",
    muc: [
      "GV không theo dõi chặt chẽ tiến bộ của HS hoặc theo dõi nhưng không tập trung vào việc nắm vững các kiến thức đã học hoặc hoàn thành các mục tiêu đề ra.",
      "GV theo dõi tiến bộ của HS trong việc nắm vững kiến thức và đạt mục tiêu nhưng chưa toàn diện hoặc không có tác dụng hỗ trợ HS và những người hỗ trợ HS (PH và các GV khác).",
      "GV duy trì một hệ thống rõ ràng, minh bạch theo dõi tiến bộ của HS trong việc nắm vững kiến thức và đạt mục tiêu và truyền đạt các thông tin đó một cách rõ ràng, dễ hiểu, giúp ích cho HS và nhưng người hỗ trợ.",
      "HS luôn nhận thức được mức độ hoàn thành mục tiêu của mình, có thể nhận biết, đánh giá và thảo luận về ưu điểm, nhu cầu học tập của mình theo các thông tin về mức độ tiến bộ nhận được từ GV.",
    ],
  },
  {
    ma: "4b.2",
    thanhTo: "4b",
    ten: "Cùng chịu trách nhiệm",
    dinhNghia: "Với sự hỗ trợ của GV, HS dựa trên các dữ liệu đã lưu để theo dõi tình hình học tập của mình và mức độ hoàn thành các mục tiêu học tập, đồng thời thường xuyên phân tích và trao đổi với GV và gia đình để tiến gần đến các mục tiêu đó.",
    muc: [
      "GV không lôi cuốn sự tham gia của HS hoặc những người hỗ trợ HS trong việc đặt mục tiêu và giám sát tình hình hoàn thành mục tiêu của HS.",
      "GV có ý thức lôi cuốn HS và những người hỗ trợ HS trong việc đặt mục tiêu và giám sát tình hình hoàn thành mục tiêu của HS, nhưng kết quả còn hạn chế.",
      "GV lôi cuốn HS và những người hỗ trợ HS trong việc đặt mục tiêu và giám sát tình hình hoàn thành mục tiêu của HS; HS chủ động phân tích tình hình học tập và ghi nhận các kết quả đạt được.",
      "HS và những người hỗ trợ HS tham gia tích cực vào toàn bộ quá trình đặt mục tiêu, giám sát việc hoàn thành mục tiêu, đánh giá tình hình và ghi nhận các kết quả đạt được.",
    ],
  },
  {
    ma: "4b.3",
    thanhTo: "4b",
    ten: "Lưu trữ hồ sơ chính xác",
    dinhNghia: "GV liên tục thu thập, cập nhật và chia sẻ các dữ liệu chính xác, dễ hiểu và rõ ràng với HS & PH.",
    muc: [
      "GV không có biện pháp theo dõi tình hình học tập của HS hoặc không có hồ sơ lưu nào khác, hoặc hệ thống lưu trữ không chính xác, rối rắm, không tiếp cận được.",
      "GV có biện pháp theo dõi tình hình học tập của HS và các hồ sơ lưu khác mà HS và những người hỗ trợ HS được quyền tiếp cận, nhưng chưa hoàn toàn chính xác hoặc chưa đầy đủ.",
      "GV có biện pháp theo dõi tình hình học tập của HS và các hồ sơ khác một cách chính xác, dễ tiếp cận và sử dụng chúng hiệu quả.",
      "Hệ thống theo dõi, quản lý của GV chính xác và hiệu quả; HS có thể đóng góp thông tin và tham gia vào việc lưu trữ bằng chứng về việc học tập của mình cũng như các hồ sơ lưu trữ khác.",
    ],
  },
  {
    ma: "4c.1",
    thanhTo: "4c",
    ten: "Ứng xử phù hợp và tôn trọng văn hóa",
    dinhNghia: "GV giao tiếp với phụ huynh và cộng đồng sao cho thể hiện sự tôn trọng các giá trị và nền tảng văn hóa của đối tượng giao tiếp.",
    muc: [
      "GV không vận động gia đình HS hoặc ứng xử thiếu tôn trọng hoặc thể hiện định kiến cá nhân.",
      "GV nỗ lực vận động PH và cộng đồng theo cách văn minh, lịch sự, thể hiện sự tôn trọng văn hóa và nhiệt tình học hỏi.",
      "GV nỗ lực vận động PH và cộng đồng theo cách văn minh, lịch sự, thể hiện sự tôn trọng văn hóa, tinh thần học hỏi, phù hợp với các giá trị và nền tảng văn hóa của PH và cộng đồng.",
      "GV, HS và PH phối hợp với nhau để hỗ trợ HS học tập tốt, tôn trọng sự đóng góp của tất cả các bên, với trọng tâm là đáp ứng nhu cầu của HS.",
    ],
  },
  {
    ma: "4c.2",
    thanhTo: "4c",
    ten: "Giá trị cộng đồng",
    dinhNghia: "Các hoạt động và môi trường học tập cần kế thừa và phát huy các giá trị của cộng đồng, tạo ra một tầm nhìn chung về mục tiêu học tập của HS",
    muc: [
      "GV không tính đến các giá trị riêng của gia đình HS khi xây dựng hoạt động học tập hoặc môi trường học tập.",
      "GV có cố gắng vận động gia đình HS và cộng đồng đóng góp vào bản sắc và các giá trị chung của cộng đồng trường học.",
      "GV vận động gia đình HS cùng xây dựng các yếu tố của cộng đồng học tập, thể hiện các giá trị của cộng đồng bên ngoài trường học.",
      "GV, HS và PH phối hợp cùng nhau xây dựng một cộng đồng học tập tôn trọng bản sắc và giá trị của tất cả các thành viên.",
    ],
  },
  {
    ma: "4c.3",
    thanhTo: "4c",
    ten: "Chương trình giảng dạy",
    dinhNghia: "Thông tin cho phụ huynh về chương trình giảng dạy và tạo điều kiện để phụ huynh đóng góp ý kiến và phản hồi.",
    muc: [
      "GV không cung cấp hoặc cung cấp không đủ thông tin về các tiêu chuẩn, chương trình học, kỳ vọng học tập cho PH.",
      "GV cung cấp các thông tin cơ bản về các tiêu chuẩn, chương trình học, kỳ vọng học tập; nhưng thông tin còn hạn chế, khó tiếp cận hoặc không đầy đủ.",
      "GV thường xuyên cập nhật các thông tin chi tiết, dễ hiểu, dễ tiếp cận về các tiêu chuẩn, chương trình học và/hoặc kỳ vọng học tập, và lấy ý kiến phản hồi của PH.",
      "GV phối hợp với PH để đảm bảo tất cả những người hỗ trợ HS hiểu rõ chương trình giảng dạy và có cơ hội tham gia tích cực vào việc xây dựng chương trình giảng dạy.",
    ],
  },
  {
    ma: "4c.4",
    thanhTo: "4c",
    ten: "Tham gia vào các hoạt động học tập",
    dinhNghia: "GV gắn các hoạt động bên ngoài trường học và cuộc sống thực tế của HS với hoạt động học tập tại trường và tích cực xây dựng các mối quan hệ để củng cố sự gắn kết đó.",
    muc: [
      "GV không tạo điều kiện cho PH tham gia vào các hoạt động học tập với HS.",
      "GV mời PH tham gia vào hoạt động học tập với HS nhưng kết quả còn hạn chế.",
      "GV đưa PH vào hoạt động học tập bằng cách tạo cơ hội cho PH hỗ trợ HS và tham gia vào cộng đồng học tập.",
      "GV coi PH là đối tác quan trọng trong hoạt động học tập và đưa PH tham gia vào các hoạt động học tập.",
    ],
  },
  {
    ma: "4d.1",
    thanhTo: "4d",
    ten: "Sự tin tưởng và tinh thần hợp tác",
    dinhNghia: "GV xây dựng mối quan hệ gần gũi với HS và đồng nghiệp để nâng cao năng lực chuyên môn, sự phối hợp, tin tưởng lẫn nhau và giúp HS tiến bộ",
    muc: [
      "GV có mối quan hệ tiêu cực hoặc bất hòa với đồng nghiệp.",
      "GV hòa đồng, thân thiện với đồng nghiệp nhưng chưa tạo được sự tin tưởng hoặc mối quan hệ hợp tác với đồng nghiệp.",
      "GV có mối quan hệ hợp tác và hỗ trợ với đồng nghiệp dựa trên sự tôn trọng và tin tưởng lẫn nhau.",
      "GV chủ động xây dựng niềm tin với đồng nghiệp và xây dựng mối quan hệ hợp tác với mục tiêu giúp HS học tốt.",
    ],
  },
  {
    ma: "4d.2",
    thanhTo: "4d",
    ten: "Văn hóa truy vấn và sáng tạo",
    dinhNghia: "GV đóng góp vào sự phát triển văn hóa trường học bằng cách thể hiện các giá trị cốt lõi, xác định nguyên nhân của các vấn đề tồn tại và thực hiện các biện pháp tích cực để giải quyết các vấn đề đó.",
    muc: [
      "GV không tham gia các hoạt động học tập chuyên môn hoặc chỉ tham gia khi được yêu cầu, đóng góp ít hoặc đóng góp tiêu cực vào các hoạt động đó.",
      "GV tham gia các hoạt động học tập chuyên môn với đồng nghiệp khi được mời và thỉnh thoảng có đóng góp vào sự thành công của hoạt động.",
      "GV thường xuyên và chủ động tham gia và đóng góp tích cực vào hoạt động học tập chuyên môn.",
      "GV đóng vai trò dẫn dắt trong việc tổ chức và đảm bảo sự thành công của các hoạt động học tập chuyên môn, nêu gương và thức đẩy văn hóa học tập trong toàn trường.",
    ],
  },
  {
    ma: "4d.3",
    thanhTo: "4d",
    ten: "Đóng góp vào sự phát triển của trường học",
    dinhNghia: "GV nâng cao vai trò của mình bên ngoài lớp học bằng cách dẫn dắt và đóng góp vào các sự kiện, dự án và sáng kiến của trường.",
    muc: [
      "GV không tham gia vào các sự kiện, dự án hoặc sáng kiến của trường.",
      "GV tham gia vào các sự kiện, dự án hoặc sáng kiến của trường theo yêu cầu.",
      "GV đóng góp tích cực vào các sự kiện, dự án hoặc sáng kiến của trường.",
      "GV đóng vai trò dẫn dắt trong các sự kiện, dự án hoặc sáng kiến của trường, góp phần vào thành công chung của nhà trường.",
    ],
  },
  {
    ma: "4e.1",
    thanhTo: "4e",
    ten: "Chủ động và không ngừng học hỏi",
    dinhNghia: "GV xác định những mặt cần cải thiện về phẩm chất và chuyên môn, chủ động tìm kiếm cơ hội phát triển và nâng cao kiến thức.",
    muc: [
      "GV không hứng thú tham gia các hoạt động học tập chuyên môn và không chủ động phát triển chuyên môn.",
      "GV tham gia vào các hoạt động học tập chuyên môn được đề xuất hoặc sẵn có và chủ động tìm kiếm cơ hội phát triển chuyên môn.",
      "GV thường xuyên tìm kiếm và xác định các cơ hội tốt để học hỏi và phát triển, xác định các mặt về nghiệp vụ và kiến thức cần cải thiện, từ đó xúc tiến các hoạt động phát triển chuyên môn của cá nhân hoặc tập thể.",
      "GV đóng vai trò dẫn dắt, định hướng việc học tập của bản thân và người khác một cách phù hợp dựa trên phương pháp học tập truy vấn, chú trọng đáp ứng nhu cầu HS.",
    ],
  },
  {
    ma: "4e.2",
    thanhTo: "4e",
    ten: "Nâng cao nhận thức văn hóa",
    dinhNghia: "GV học hỏi nâng cao hiểu biết về học sinh và cộng đồng nơi mình sinh sống và giảng dạy, áp dụng các kiến thức thu được vào thực tế và phát triển văn hóa trường học.",
    muc: [
      "GV không có hoặc không đủ kiến thức hoặc nhận thức văn hóa và/hoặc không nhìn nhận tích cực về sự khác biệt văn hóa.",
      "GV có một chút kiến thức văn hóa, đang trong quá trình tìm hiểu về các giá trị và quan điểm của các nền văn hóa khác, và bắt đầu tham gia vào các hoạt động tự đánh giá cần thiết để nâng cao năng lực văn hóa.",
      "GV chấp nhận và tôn trọng sự khác biệt văn hóa và chủ động tìm hiểu tác động của văn hóa, định kiến và bất công xã hội đối với việc học tập của HS.",
      "GV thể hiện năng lực văn hóa, thường xuyên đánh giá và nâng cao kiến thức và kĩ năng của bản thân và vận động người khác trong trường thực hiện các biện pháp nâng cao nhận thức về tôn trọng sự khác biệt và loại bỏ sự bất công hoặc phân biệt đối xử.",
    ],
  },
  {
    ma: "4e.3",
    thanhTo: "4e",
    ten: "Nâng cao kiến thức và kĩ năng",
    dinhNghia: "GV học hỏi để nâng cao kiến thức chuyên môn và sư phạm và trao đổi các kiến thức mới với đồng nghiệp.",
    muc: [
      "GV không cập nhật về kiến thức và phương pháp giảng dạy.",
      "GV tham gia vào các hoạt động giúp nâng cao kiến thức và phương pháp giảng dạy và hiểu rõ hơn về chương trình học.",
      "GV chủ động nâng cao kiến thức về nội dung giảng dạy và chương trình học (độc lập hoặc phối hợp với đồng nghiệp).",
      "GV chủ động, tích cực và thực hiện hiệu quả việc tìm hiểu và không ngừng nâng cao, tinh chỉnh kiến thức về nội dung giảng dạy, phương pháp sư phạm và chương trình học.",
    ],
  },
  {
    ma: "4e.4",
    thanhTo: "4e",
    ten: "Nhận và tiếp thu ý kiến phản hồi",
    dinhNghia: "GV chủ động lấy và đưa ý kiến phản hồi, nhận xét và phối hợp để đáp ứng tốt các ý kiến phản hồi, nhận xét.",
    muc: [
      "GV không tham gia thảo luận về phản hồi của người khác về hiệu quả công việc của mình hoặc bỏ qua phản hồi.",
      "GV lấy, chấp nhận và tiếp thu phản hồi của đồng nghiệp.",
      "GV xin phản hồi của đồng nghiệp, tích cực phân tích hiệu quả công việc và phối hợp với đồng nghiệp để hiểu và tiếp thu ý kiến phản hồi.",
      "GV đóng vai trò dẫn dắt, vận động mọi người cùng tham gia xây dựng văn hóa học tập để lớn mạnh, đồng thời nêu gương về quy trình cho, nhận và tiếp thu phản hồi.",
    ],
  },
  {
    ma: "4f.1",
    thanhTo: "4f",
    ten: "Quan tâm, trung thực và Integrity trong mọi hành động",
    dinhNghia: "GV luôn thể hiện sự quan tâm, trung thực và integrity với HS, PH và đồng nghiệp.",
    muc: [
      "Hành động của GV thể hiện sự thiếu quan tâm hoặc thiếu trung thực.",
      "GV hành động một cách trung thực, quan tâm và integrity.",
      "GV được biết tới và kính trọng như hình mẫu về sự quan tâm, trung thực và integrity.",
      "GV dẫn đầu trong việc nêu gương về sự quan tâm, trung thực và integrity; GV vận động HS và các GV khác xây dựng các đức tính này.",
    ],
  },
  {
    ma: "4f.2",
    thanhTo: "4f",
    ten: "Đưa ra các quyết định hợp đạo lý",
    dinhNghia: "GV lựa chọn đưa ra các quyết định phù hợp, đặc biệt là trong các tình huống khó khăn, để đảm bảo lợi ích cao nhất cho HS và PH.",
    muc: [
      "GV đưa ra các quyết định không hợp lý, vội vàng hoặc nóng nảy, hoặc chỉ phục vụ cho bản thân.",
      "GV có ý thức đưa ra các quyết định sáng suốt, hợp lý, phù hợp với lợi ích cao nhất của HS và vận động những người khác trong quá trình ra quyết định khi có thể.",
      "GV đưa ra các quyết định sáng suốt, hợp lý, phù hợp với lợi ích cao nhất của HS ngay cả trong những tình huống khó khăn hoặc khi có sự mâu thuẫn về ưu tiên hoặc giá trị của các bên tham gia.",
      "GV dẫn đầu trong trường về việc nêu gương thực hiện các quyết định sáng suốt phục vụ cho lợi ích cao nhất của HS, PH và đồng nghiệp; hỗ trợ HS và đồng nghiệp xây dựng năng lực ra quyết định sáng suốt, phù hợp.",
    ],
  },
  {
    ma: "4f.3",
    thanhTo: "4f",
    ten: "Bảo vệ quyền lợi",
    dinhNghia: "GV là người bảo vệ quyền lợi HS, PH và đồng nghiệp và chủ động thực hiện các hoạt động thay mặt cho HS, PH và đồng nghiệp.",
    muc: [
      "GV không hành động vì lợi ích của HS khi cần hành động.",
      "GV đáp ứng nhu cầu của HS thông qua hành động của mình nhưng không làm thường xuyên hoặc kết quả còn hạn chế.",
      "GV bảo vệ quyền lợi cho tất cả HS trong và ngoài lớp học, hành động vì lợi ích của HS phù hợp với các giá trị của nhà trường và cộng đồng cho dù không có nhiều người làm như thế hoặc ủng hộ việc đó, hoặc không theo các quy định hiện hành.",
      "GV là hình mẫu về bảo vệ quyền lợi của HS và đóng vai trò dẫn dắt trong xác định và thay đổi các chính sách và hoạt động không phù hợp với các giá trị của cộng đồng hoặc không có lợi cho HS.",
    ],
  },
];

/** Tra nhanh theo mã, ví dụ TIEU_CHI_CON_THEO_MA["3a.2"]. */
export const TIEU_CHI_CON_THEO_MA: Record<string, TieuChiCon> = Object.fromEntries(
  TIEU_CHI_CON.map(t => [t.ma, t]),
);

/** Các tiêu chí con của một thành tố, giữ nguyên thứ tự trong khung. */
export function tieuChiConCua(thanhTo: MaThanhTo): TieuChiCon[] {
  return TIEU_CHI_CON.filter(t => t.thanhTo === thanhTo);
}
