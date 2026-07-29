/**
 * Khung giảng dạy Danielson — bản dịch chính thức của trường.
 *
 * NGUỒN: "các yêu cầu về Toán cần đạt/VN_Danielson Framework For Teaching_bản
 * đầy đủ.docx" — bản giáo viên được đào tạo. Tên thành tố, mô tả 4 mức, các
 * thành tố cốt lõi và câu hỏi suy ngẫm đều lấy nguyên văn từ đó.
 *
 * File "Mẫu biên bản dự giờ.xlsx" của trường dùng bản RÚT GỌN 15 cấu phần
 * (bỏ 2b và cả Phần IV) vì một tiết dự giờ không quan sát được những mục đó.
 * Bộ rút gọn giữ ở BO_DU_GIO; dữ liệu vẫn đủ 22 để dùng khi đánh giá toàn diện.
 */

export type SoPhan = 1 | 2 | 3 | 4;

export type MaThanhTo =
  | "1a"
  | "1b"
  | "1c"
  | "1d"
  | "1e"
  | "1f"
  | "2a"
  | "2b"
  | "2c"
  | "2d"
  | "2e"
  | "3a"
  | "3b"
  | "3c"
  | "3d"
  | "3e"
  | "4a"
  | "4b"
  | "4c"
  | "4d"
  | "4e"
  | "4f";

export interface ThanhTo {
  ma: MaThanhTo;
  ten: string;
  phan: SoPhan;
}

/** Bốn mức của khung, theo đúng thứ tự điểm 1 → 4. */
export const TEN_MUC = ["Chưa đạt", "Cơ bản", "Tốt", "Xuất sắc"] as const;

export const COMPONENTS: readonly ThanhTo[] = [
  { ma: "1a", ten: "Áp dụng kiến thức về nội dung giảng dạy và phương pháp sư phạm", phan: 1 },
  { ma: "1b", ten: "Hiểu và tôn trọng học sinh", phan: 1 },
  { ma: "1c", ten: "Đặt mục tiêu giảng dạy", phan: 1 },
  { ma: "1d", ten: "Sử dụng học liệu hiệu quả", phan: 1 },
  { ma: "1e", ten: "Cấu trúc bài giảng chặt chẽ", phan: 1 },
  { ma: "1f", ten: "Thiết kế và phân tích bài đánh giá", phan: 1 },
  { ma: "2a", ten: "Xây dựng môi trường học tập dựa trên sự tôn trọng & quan tâm", phan: 2 },
  { ma: "2b", ten: "Xây dựng văn hóa học tập", phan: 2 },
  { ma: "2c", ten: "Xây dựng môi trường học tập tự giác", phan: 2 },
  { ma: "2d", ten: "Khuyến khích hành vi tích cực của học sinh", phan: 2 },
  { ma: "2e", ten: "Tổ chức không gian học tập", phan: 2 },
  { ma: "3a", ten: "Làm rõ mục tiêu và nội dung kiến thức", phan: 3 },
  { ma: "3b", ten: "Sử dụng kĩ thuật đặt câu hỏi và trao đổi/thảo luận", phan: 3 },
  { ma: "3c", ten: "Giúp học sinh tham gia tích cực", phan: 3 },
  { ma: "3d", ten: "Đánh giá học tập", phan: 3 },
  { ma: "3e", ten: "Linh hoạt đáp ứng nhu cầu của học sinh", phan: 3 },
  { ma: "4a", ten: "Tham gia vào các hoạt động đánh giá, tổng kết", phan: 4 },
  { ma: "4b", ten: "Lưu lại quá trình học tập và tiến bộ của HS", phan: 4 },
  { ma: "4c", ten: "Huy động sự tham gia của gia đình và xã hội", phan: 4 },
  { ma: "4d", ten: "Đóng góp vào cộng đồng và văn hóa trường học", phan: 4 },
  { ma: "4e", ten: "Nâng cao năng lực chuyên môn", phan: 4 },
  { ma: "4f", ten: "Hành động vì lợi ích của học sinh", phan: 4 },
];

/** Bộ 15 cấu phần trường dùng khi dự giờ một tiết dạy — khớp file Excel mẫu. */
export const BO_DU_GIO: readonly MaThanhTo[] = [
  "1a",
  "1b",
  "1c",
  "1d",
  "1e",
  "1f",
  "2a",
  "2c",
  "2d",
  "2e",
  "3a",
  "3b",
  "3c",
  "3d",
  "3e",
];

/** Mô tả 4 mức, nguyên văn khung. Chỉ số 0 = Chưa đạt … 3 = Xuất sắc. */
export const RUBRIC: Record<MaThanhTo, readonly [string, string, string, string]> = {
  "1a": [
    "GV thiếu kiến thức về nội dung giảng dạy và phương pháp sư phạm để giúp HS nắm được nội dung bài học.",
    "Kiến thức về nội dung giảng dạy và phương pháp sư phạm của GV phần nào giúp HS nắm được nội dung bài học.",
    "Kiến thức về nội dung giảng dạy và phương pháp sư phạm của GV giúp HS nắm được nội dung bài học.",
    "Kiến thức về nội dung giảng dạy và phương pháp sư phạm của GV giúp HS nắm vững & đi sâu tìm hiểu về nội dung bài học, tăng tính tự chủ của HS và các hoạt động trí tuệ như sự tò mò khám phá, suy luận, đánh giá.",
  ],
  "1b": [
    "GV thiếu sự hiểu biết cần thiết về HS để giúp HS học tốt hoặc tiến bộ.",
    "Hiểu biết của GV về đặc điểm, thế mạnh và nhu cầu của HS phần nào giúp HS học tập và tiến bộ.",
    "Hiểu biết của GV về HS giúp HS học tập và tiến bộ và giúp GV tận dụng các điểm mạnh của HS.",
    "GV có sự hiểu biết sâu sắc về HS, giúp HS học tập & tiến bộ, đạt thành tựu trong cả học tập & cuộc sống.",
  ],
  "1c": [
    "Không xác định mục tiêu giảng dạy hoặc mục tiêu giảng dạy không có độ thử thách cần thiết hoặc không phù hợp.",
    "Mục tiêu giảng dạy có độ thử thách vừa phải và phù hợp với hầu hết các HS trong lớp.",
    "Mục tiêu giảng dạy có độ thử thách cần thiết và phù hợp với HS.",
    "Mục tiêu giảng dạy thể hiện yêu cầu cao với các nội dung kiến thức quan trọng và giúp HS phát huy tính tự chủ, sự tò mò khám phá và dám chấp nhận mạo hiểm để khám phá những kiến thức mới (khám phá, thử nghiệm và chấp nhận mắc lỗi).",
  ],
  "1d": [
    "GV không biết hoặc không sử dụng phù hợp & hiệu quả các tài liệu giảng dạy và các học liệu khác để giúp HS học tập & tiến bộ.",
    "GV hiểu và sử dụng các tài liệu giảng dạy và các học liệu khác để giúp HS học tập & tiến bộ, nhưng các tài liệu này chỉ là một phần nhỏ trong số các tài liệu GV có thể sử dụng.",
    "GV hiểu rõ về các tài liệu giảng dạy & các học liệu khác, từ đó có các lựa chọn phù hợp để giúp HS học tập & tiến bộ.",
    "GV lựa chọn kĩ lưỡng & thận trọng các tài liệu giảng dạy và các học liệu khác để đáp ứng nhu cầu của từng cá nhân HS, phát huy tính tự chủ và các hoạt động trí tuệ của HS.",
  ],
  "1e": [
    "Thiết kế các hoạt động học tập không hỗ trợ HS nắm bắt các kiến thức quan trọng.",
    "Các hoạt động học tập có sự kết nối tương đối chặt chẽ trong cấu trúc trong từng bài và các bài với nhau, phần nào giúp HS đạt được mục tiêu học tập đề ra.",
    "Các hoạt động học tập thu hút HS và mang tính thử thách; được thiết kế phù hợp với nhu cầu của HS.",
    "Hoạt động học tập đề cao nhu cầu riêng biệt của từng HS, đảm bảo tất cả HS đều đạt mục tiêu đã đề ra và nâng cao ý thức tự chịu trách nhiệm về việc học của HS.",
  ],
  "1f": [
    "Không có kế hoạch đánh giá HS hoặc bài đánh giá  không chỉ ra được là HS đã đạt mục tiêu đề ra hay chưa.",
    "Bài đánh giá phần nào giúp GV xác định là HS đã đạt hay đang trong quá trình tiến đến mục tiêu đề ra.",
    "Lập kế hoạch đánh giá cho suốt quá trình giảng dạy và bài đánh giá cung cấp thông tin chính xác và kịp thời cho GV và HS.",
    "Thông qua các bài đánh giá đa dạng & linh hoạt, HS có cơ hội thể hiện kiến thức và tự phân tích, đánh giá tiến bộ của bản thân.",
  ],
  "2a": [
    "HS không cảm thấy an toàn và được tôn trọng. Môi trường học tập tiêu cực, thiếu tôn trọng, thiếu quan tâm, không phù hợp, các mâu thuẫn không được giải quyết.",
    "Môi trường học tập phần nào thể hiện sự quan tâm và tôn trọng.",
    "Môi trường học tập thể hiện các mối quan hệ tích cực được gây dựng và củng cố theo chủ đích của nhà trường.",
    "HS tham gia tích cực vào xây dựng một môi trường học tập nơi mọi thành viên đều có ý thức cộng đồng, luôn cảm thấy an toàn, được tôn trọng và gắn kết chặt chẽ với nhau.",
  ],
  "2b": [
    "Văn hóa lớp học không hỗ trợ hoặc giúp ích cho việc học tập và trưởng thành của HS.",
    "Văn hóa lớp học phần nào giúp ích cho việc học tập và trưởng thành của HS.",
    "The culture of the",
    "class is characterized",
  ],
  "2c": [
    "Thiếu nề nếp, nội quy hoặc quy trình lớp học không hiệu quả gây cản trở quá trình học tập và trưởng thành của HS.",
    "Nề nếp, quy trình lớp học chủ yếu do GV xây dựng và quản lý, tạo cơ hội học tập và phát triển cho HS",
    "Nề nếp, nội quy, quy trình lớp học hiệu quả và chủ yếu do HS tự quản lý, giúp tối ưu hóa cơ hội học tập và phát triển của HS.",
    "HS được tham gia ý kiến và tích cực tham gia vào việc xây dựng và điều chỉnh các nề nếp, quy trình giúp tạo ra một môi trường học tập thân thiện, tôn trọng và thúc đẩy sự trưởng thành của mỗi cá nhân trong tập thể.",
  ],
  "2d": [
    "Không có nhiều bằng chứng rõ ràng về việc GV làm mẫu, dạy hoặc hướng dẫn các hành vi tích cực cho HS.",
    "GV làm mẫu các hành vi tích cực và thỉnh thoảng dạy lại cho HS.",
    "HS thể hiện các hành vi tích cực do GV làm mẫu và củng cố, giúp HS tự đánh giá và điều chỉnh hành vi chứ không chỉ tuân thủ.",
    "HS luôn thể hiện các hành vi tích cực và chủ động xây dựng tập thể lớp vững mạnh.",
  ],
  "2e": [
    "Không gian học tập không an toàn, khó tiếp cận và/hoặc không hỗ trợ việc học tập và trưởng thành của HS.",
    "Không gian học tập an toàn, dễ tiếp cận; việc bố trí và sử dụng đồ dùng, học liệu phần nào hỗ trợ việc học tập và tiến bộ của HS.",
    "Không gian học tập được thiết kế bài bản để phù hợp với nhu cầu của từng cá nhân HS trong khi vẫn đảm bảo các hoạt động chung.",
    "Không gian học tập do các thành viên của cộng đồng học tập cùng thiết kế tỉ mỉ và điều chỉnh theo nhu cầu của từng cá nhân để thuận tiện cho các hoạt động phối hợp và tạo sự thoải mái, dễ chịu, hỗ trợ việc học tập và tiến bộ của tất cả HS.",
  ],
  "3a": [
    "Truyền đạt mục tiêu và nội dung không rõ ràng hoặc gây nhầm lẫn và ảnh hưởng đến việc học tập của HS.",
    "Truyền đạt mục tiêu và nội dung hầu hết rõ ràng và chính xác, phần nào hỗ trợ việc học tập của HS.",
    "Truyền đạt mục tiêu và nội dung rõ ràng và chính xác tới HS, giúp HS tham gia tích cực vào các hoạt động học tập, đồng thời làm mẫu cho HS về cách sử dụng ngôn ngữ chuẩn mực.",
    "Truyền đạt mục tiêu và nội dung không rõ ràng hoặc gây nhầm lẫn và ảnh hưởng đến việc học tập của HS.",
  ],
  "3b": [
    "Không hoặc ít đặt câu hỏi, trao đổi/thảo luận, hoặc câu hỏi, trao đổi/thảo luận không hỗ trợ việc học tập và tiến bộ của HS.",
    "Chủ yếu là GV đặt câu hỏi và trao đổi/thảo luận, giúp hỗ trợ việc học tập và tiến bộ của HS.",
    "Cả GV và HS cùng tham gia đặt câu hỏi và trao đổi/thảo luận, giúp HS phát huy tư duy phản biện, suy luận và đánh giá.",
    "HS chủ động đặt câu hỏi và trao đổi/thảo luận để nâng cao kiến thức, kĩ năng suy luận và thói quen tự đánh giá của bản thân và người khác.",
  ],
  "3c": [
    "Hoạt động học tập không đòi hỏi sự vận động trí tuệ của HS.",
    "Hoạt động học tập phần nào kích thích hoạt động trí tuệ của HS, đòi hỏi HS phải tư duy.",
    "Hoạt động học tập kích thích trí tò mò, đam mê khám phá và tư duy bậc cao (không chỉ nhớ và hiểu mà còn biết phân tích, thẩm định, sáng tạo) của HS. HS thể hiện ý kiến và diễn đạt câu trả lời bằng nhiều cách khác nhau.",
    "HS chủ động tăng thử thách hoặc độ khó của hoạt động học tập. HS biết tư duy phản biện về các vấn đề và tìm ra giải pháp. HS đề xuất các sửa đổi để hoạt động bổ ích và phù hợp hơn.",
  ],
  "3d": [
    "Không sử dụng đánh giá thường xuyên trong bài giảng hoặc nếu sử dụng thì không phù hợp với mục tiêu bài học.",
    "Đánh giá thường xuyên phần nào hỗ trợ việc học tập và tiến bộ của HS.",
    "GV và HS dùng đánh giá thường xuyên để xác định mức độ hiểu bài, mức độ tiến bộ và đưa ra phản hồi phù hợp.",
    "HS chủ động đánh giá sự tiến bộ của bản thân theo các tiêu chí đã được xác định rõ để đạt được mục tiêu học tập và xác định điểm mạnh, điểm yếu, kế hoạch cải thiện.",
  ],
  "3e": [
    "GV không điều chỉnh hoạt động học tập ngay cả khi được quyền làm điều đó, và không đáp ứng nhu cầu của HS.",
    "GV thực hiện một số điều chỉnh với các hoạt động học tập và đáp ứng nhu cầu của HS, đạt hiệu quả nhất định.",
    "Các điều chỉnh và sự quan tâm đáp ứng nhu cầu HS của GV giúp HS hiểu rõ kiến thức hơn và/hoặc dẫn tới các hoạt động học tập mới.",
    "Bằng cách tự giám sát và tự đánh giá, HS nói lên nhu cầu, đặt câu hỏi và đưa ra các gợi ý, đề xuất điều chỉnh, sửa đổi hoặc tạo ra các cơ hội học tập mới.",
  ],
  "4a": [
    "GV không có hoạt động đánh giá, tổng kết nào hoặc đánh giá sai mức độ thành công của bài giảng.",
    "Hoạt động đánh giá, tổng kết của GV giúp đánh giá chính xác mức độ thành công của bài giảng nhưng không thực hiện các phân tích và thay đổi cần thiết.",
    "Hoạt động đánh giá, tổng kết của GV, dựa trên sự cân nhắc các bằng chứng về kết quả học tập và tiến bộ của HS, giúp đánh giá chính xác mức độ thành công của bài giảng và dẫn tới các thay đổi, điều chỉnh cần thiết.",
    "GV thường xuyên, liên tục thực hiện các hoạt động đánh giá, tổng kết dựa trên nhiều bằng chứng khác nhau, dẫn tới việc sáng tạo nhiều ý tưởng và phương pháp mới giúp hỗ trợ những HS thực sự cần để học tập tốt hơn.",
  ],
  "4b": [
    "GV không có biện pháp lưu lại quá trình tiến bộ của HS hoặc cách lưu gây khó khăn cho việc thông báo tình hình học tập tới HS và PH.",
    "GV lưu lại một số mặt trong tình hình học tập và tiến bộ của HS và dễ hiểu, dễ tiếp cận với cả HS và PH.",
    "GV lưu lại quá trình tiến bộ của HS hướng tới việc nắm vững các kiến thức đã học, đạt được các mục tiêu học tập và trưởng thành; HS tiếp cận được các thông tin và tự đánh giá được tiến bộ của mình.",
    "HS quản lý quá trình tiến bộ của mình theo hướng nắm vững các kiến thức đã học và đạt được các mục tiêu học tập và trưởng thành; HS thường xuyên phân tích và thảo luận về tình hình học tập của mình với GV và gia đình.",
  ],
  "4c": [
    "GV không vận động sự tham gia của gia đình HS hoặc cộng đồng, huy động không thường xuyên hoặc ứng xử thiếu tôn trọng.",
    "GV có cố gắng vận động sự tham gia của gia đình HS và cộng đồng và ứng xử phù hợp.",
    "GV vận động sự tham gia của gia đình HS và cộng đồng một cách lịch sự, ứng xử phù hợp văn hóa, cung cấp đầy đủ các thông tin cần thiết để các bên tham gia hiểu được cuộc sống học tập trong lớp.",
    "Nỗ lực của GV nhằm vận động sự tham gia thường xuyên, liên tục của gia đình & xã hội thể hiện vai trò tích cực của GV trong việc học tập của HS và giúp xây dựng các mối quan hệ giúp HS phát huy năng lực học tập, phát triển nhân cách.",
  ],
  "4d": [
    "GV không tham gia tích cực vào cộng đồng trường học hoặc tác động tiêu cực tới văn hóa học tập và các giá trị mà nhà trường theo đuổi.",
    "GV có đóng góp khiêm tốn vào văn hóa trường học, hỗ trợ việc phát triển chuyên môn và bảo vệ các giá trị mà nhà trường theo đuổi.",
    "GV chủ động đóng góp vào việc tổ chức và dẫn dắt các sự kiện, chương trình hoặc hoạt động giúp nâng cao văn hóa học tập trong trường và đưa các giá trị của trường vào thực tế cuộc sống bằng cách nêu gương và ứng xử mẫu mực.",
    "GV đóng vai trò dẫn đầu trong việc xác định, làm mẫu, tự chịu trách nhiệm và vận động đồng nghiệp chịu trách nhiệm về các giá trị cốt lõi và văn hóa học tập trong trường, hướng tới mục tiêu đáp ứng tốt nhất nhu cầu của HS & PH.",
  ],
  "4e": [
    "GV không tham gia học hỏi và phát triển chuyên môn để nâng cao kiến thức, kĩ năng, tư duy, hoặc tham gia nhưng không nhiệt tình.",
    "GV tham gia học hỏi và phát triển chuyên môn để nâng cao kiến thức, kĩ năng, tư duy, chủ yếu là trong các hoạt động được người khác tổ chức hoặc chỉ đạo.",
    "GV tự tổ chức các hoạt động học hỏi, phát triển chuyên môn cùng với đồng nghiệp, thể hiện trí tò mò, lòng ham học hỏi, nhiệt tình tham gia sinh hoạt chuyên môn để nâng cao kiến thức, kĩ năng và tư duy.",
    "GV thể hiện sự tự chủ trong việc chủ động dẫn dắt, tổ chức các hoạt động phát triển chuyên môn cho bản thân và đồng nghiệp, đề ra các định hướng, hỗ trợ các GV khác tham gia học tập và sáng tạo.",
  ],
  "4f": [
    "GV ứng xử không phù hợp nguyên tắc đạo đức và không nắm được nhu cầu của HS hoặc đưa ra các quyết định không phục vụ lợi ích cao nhất của HS.",
    "GV ứng xử hợp đạo lý và có ý thức đưa ra các quyết định vì lợi ích cao nhất của HS, PH và đồng nghiệp.",
    "GV nêu gương thực hiện các tiêu chuẩn đạo đức cao và ra quyết định hợp lý thay mặt cho HS, PH và đồng nghiệp.",
    "GV đóng vai trò tiên phong dẫn đầu trong việc xác định và giữ vững các tiêu chuẩn cao về đạo đức và đưa ra các quyết định hợp lý, sáng suốt, tôn vinh giá trị vốn có và nhân phẩm của mỗi HS cũng như nhấn mạnh tầm quan trọng của việc đáp ứng nhu cầu thực sự của từng HS.",
  ],
};

/** Các thành tố cốt lõi — dùng để neo bằng chứng. Rỗng khi khung không có mục chi tiết. */
export const COT_LOI: Record<MaThanhTo, readonly string[]> = {
  "1a": [
    "Kiến thức chuyên ngành",
    "GV nắm vững kiến thức về chuyên ngành /bộ môn mình dạy, bao gồm các cấu trúc, khái niệm và kĩ năng cơ bản, các mối quan hệ tiền đề (vd: phải học phép cộng trước khi học phép nhân), phương pháp tìm hiểu.",
    "Kiến thức sư phạm",
    "GV truyền đạt kiến thức theo cách dễ hiểu, dễ tiếp thu cho HS bằng cách kết nối các kiến thức đã học, trình bày rõ ràng, dễ hiểu và thực hiện các phương pháp sư phạm hiệu quả nhất.",
    "Kiến thức về các mối quan hệ và kĩ năng liên môn",
    "GV lồng ghép các kết nối liên môn vào phương pháp dạy học “tạo bước đệm - GV hướng dẫn HS ở các bước đầu để nắm kiến thức, ở các bước sau khi HS đã nắm được thì GV không hỗ trợ nữa mà để HS tự làm”, giúp HS tích cực tham gia bài học, xây dựng các kiến thức và kĩ năng liên môn cơ bản và đặt ra nhiều bối cảnh khác nhau cho việc học tập của HS.",
  ],
  "1b": [
    "Tôn trọng đặc điểm riêng của từng HS: Các trải nghiệm trong cuộc sống và vốn kiến thức của từng HS là nền tảng cho sự hình thành cá tính, mục tiêu, tri thức và tính cách.",
    "Nắm được mức độ kiến thức & kĩ năng của HS: Hoạt động học tập cần thể hiện những gì HS có thể làm được và phù hợp với mức độ kiến thức và kĩ năng hiện tại của HS.",
    "Kiến thức về sự phát triển toàn diện của trẻ em: Xây dựng môi trường và hoạt động học tập giúp phát triển nhận thức, sức khỏe thể chất, cảm xúc & xã hội của HS, nâng cao năng lực học tập và tính tự giác của HS.",
    "Hiểu về quá trình tiếp thu kiến thức & sự khác biệt về khả năng tiếp thu giữa các HS: Qúa trình học tập cần sự tham gia tích cực về nhận thức và sự hỗ trợ phù hợp tùy theo đặc điểm và nhu cầu của từng HS.",
  ],
  "1c": [
    "Giá trị và sự phù hợp: Mục tiêu giảng dạy thể hiện việc học tập và thành thạo các nội dung kiến thức quan trọng và tạo điều kiện thiết thực để hỗ trợ việc học tập và trưởng thành của HS.",
    "Phù hợp với các tiêu chuẩn của cấp lớp: Mục tiêu giảng dạy thể hiện các tiêu chuẩn phù hợp của cấp lớp và kì vọng cao cho mỗi HS.",
    "Mục tiêu rõ ràng: Mục tiêu giảng dạy thể hiện rõ HS sẽ học những gì, tại sao những kiến thức đó quan trọng, và HS cần làm gì để xây dựng và thể hiện sự thành thạo các kiến thức và kĩ năng đó.",
    "Kết hợp các yếu tố tạo nên sự phát triển toàn diện của HS: Mục tiêu giảng dạy cần kết hợp các nội dung học thuật và cảm xúc-xã hội để bổ trợ lẫn nhau.",
  ],
  "1d": [
    "Tài liệu giảng dạy: GV sử dụng tài liệu giảng dạy chất lượng cao để đảm bảo HS tiếp thu được các kiến thức khó và phù hợp với nhu cầu của từng HS, HS tham gia tích cực và nắm vững kiến thức.",
    "Công nghệ và học liệu số: Học liệu dựa trên công nghệ và học liệu số là công cụ hữu ích cho phương pháp dạy học cá nhân hóa, cơ hội học tập bình đẳng, khám phá, kết nối và phát triển bản thân.",
    "Hỗ trợ học sinh: GV tìm kiếm và cung cấp các học liệu và biện pháp hỗ trợ bổ sung phù hợp để HS dễ tiếp thu kiến thức và đáp ứng nhu cầu của từng HS.",
  ],
  "1e": [
    "Bài tập và hoạt động: Bài tập và hoạt động phù hợp với mục tiêu học tập, khuyến khích tư duy cấp độ cao và sự tự chủ của HS, đồng thời giúp HS nắm vững kiến thức.",
    "Học tập linh hoạt: Điều chỉnh các phương pháp giảng dạy cho phù hợp với nhu cầu của từng cá nhân HS để đảm bảo kiến thức vừa sức với HS cũng như hỗ trợ phù hợp.",
    "Phối hợp nhóm: Làm việc nhóm là một phần quan trọng trong quá trình học tập và phát triển của trẻ. Hoạt động nhóm cần được chuẩn bị kĩ lưỡng để tối đa hóa cơ hội cho mọi HS và phát huy các ưu điểm của HS.",
  ],
  "1f": [],
  "2a": [
    "Mối quan hệ tích cực: Các tương tác GV-HS và HS-HS thể hiện sự quan tâm và tôn trọng và bảo vệ phẩm giá của từng thành viên trong cộng đồng.",
    "Cảm giác thân thuộc, gần gũi: GV và HS cùng nhau xây dựng một cộng đồng với đặc trưng và mối quan tâm riêng của mình, đồng thời tôn trọng bản sắc riêng của từng cá nhân.",
    "Tôn trọng văn hóa: Các tương tác trong lớp học đảm bảo sự tôn trọng văn hóa của từng cá nhân dựa trên nhận thức văn hóa và sự hiểu biết của GV về các động lực xã hội và tác động của chúng đối với môi trường học tập.",
    "Giải quyết mâu thuẫn theo cách tích cực: Xây dựng một phương pháp rõ ràng và phù hợp về văn hóa để giải quyết mâu thuẫn và sử dụng hiệu quả để giải quyết mâu thuẫn và khôi phục niềm tin.",
  ],
  "2b": [
    "Mục tiêu và động lực: GV và HS cùng có một cam kết chung về học tập tốt và phát triển nhân cách.",
    "Chuẩn bị cho việc học tập: GV làm mẫu, khuyến khích, hướng dẫn cụ thể và củng cố trí tò mò, tư duy phản biện, suy luận và đánh giá để nâng cao năng lực học tập và sự phát triển về cảm xúc-xã hội của HS.",
    "Sự tự chủ & lòng tự hào của HS: HS đưa ra các lựa chọn có căn cứ, tích cực học tập, tự hào về các thành tích đạt được, và đề xuất các biện pháp để làm cho lớp học vui vẻ, hiệu quả và chủ động hơn.",
    "Hỗ trợ và kiên trì: GV và HS động viên nhau kiên trì, quyết tâm và hỗ trợ nhau bằng các biện pháp phù hợp khi gặp khó khăn.",
  ],
  "2c": [
    "Phối hợp hiệu quả: GV làm mẫu, hướng dẫn và củng cố kĩ năng phối hợp để HS tự thực hiện nhiệm vụ, phối hợp với nhau theo nhóm và hỗ trợ nhau để cùng đạt kết quả tốt.",
    "Sự tự giác & tinh thần trách nhiệm: Xây dựng nề nếp lớp học để HS có ý thức nhận trách nhiệm và phát triển các kĩ năng, thói quen và tư duy giúp hình thành tính tự giác/tự lập của HS.",
    "Tạo cơ hội tiếp cận học liệu và hỗ trợ bình đẳng: Tạo điều kiện để tất cả HS được sử dụng học liệu và hỗ trợ hiệu quả, bình đẳng.",
    "Thực hiện nhiệm vụ ngoài thời gian giảng bài: GV thực hiện các nhiệm vụ khác không phục vụ cho mục tiêu của bài giảngtrong tiết học (sao cho không làm mất hoặc mất ít thời gian học hoặc gây gián đoạn việc thực hiện bài học.",
  ],
  "2d": [],
  "2e": [
    "An toàn và thuận tiện: Không gian học tập an toàn và thuận tiện cho tất cả HS và được điều chỉnh bởi GV và HS nếu cần thiết để phù hợp với nhu cầu của từng HS.",
    "Thiết kế không gian phù hợp cho học tập: Không gian học tập được thiết kế tỉ mỉ và có thể điều chỉnh nếu cần để thuận tiện cho các hoạt động học tập.",
    "Đồng sáng tạo và sở hữu chung: HS tham gia vào quá trình thiết kế và điều chỉnh không gian học tập để có ý thức về sự sở hữu.",
  ],
  "3a": [
    "3a Làm rõ mục tiêu và nội dung kiến thức",
    "Mục tiêu học tập và tiêu chí đánh giá: GV nêu rõ mục tiêu của từng hoạt động học tập và lập kế hoạch giảng dạy cho HS để phù hợp với các tiêu chí đánh giá.",
    "Kì vọng cụ thể: Nêu rõ các việc HS cần làm trong từng bước, đồng thời nêu rõ và nhấn mạnh kì vọng trong suốt quá trình.",
    "Giảng nội dung kiến thức: Giảng theo phương pháp “tạo bước đệm”, trình bày theo nhiều cách lôi cuốn với HS và thường xuyên kiểm tra xem HS có hiểu bài không.",
    "Sử dụng ngôn ngữ học thuật: GV và HS sử dụng ngôn ngữ nói và viết chuẩn liên quan đến nội dung bài học, đồng thời phù hợp với cấp lớp.",
  ],
  "3b": [
    "Tư duy phản biện và nắm vững kiến thức: Khi đặt câu hỏi và trao đổi/thảo luận, HS cần có tư duy phản biện, đưa ra nhiều câu trả lời, qua đó giúp các em nắm vững kiến thức, hiểu hơn về bản thân cũng như thế giới xung quanh.",
    "Suy luận và đánh giá: Khi đặt câu hỏi và trao đổi/thảo luận, HS cần suy luận, xem lại những kiến thức đã học, chứng minh cho ý kiến của mình và đưa ra ý tưởng cho các vấn đề cần tìm hiểu trong tương lai.",
    "Sự tham gia tích cực của HS: Thông qua các câu hỏi và thảo luận, HS thể hiện trí tò mò, lôi cuốn các bạn khác cùng tham gia và phản biện các ý kiến một cách lịch sự và khiêm tốn.",
  ],
  "3c": [],
  "3d": [
    "Tiêu chí đánh giá rõ ràng: Các mục tiêu phối hợp, các đặc điểm của bài làm tốt và quy định các tiêu chí đánh giá được truyền thông rõ ràng cho HS và PH.",
    "Kiểm tra mức độ tiếp thu của HS: GV & HS thường xuyên kiểm tra, giám sát tình hình học tập và áp dụng các phương pháp cụ thể để thu được bằng chứng về mức độ hiểu bài của HS.",
    "Phản hồi kịp thời, mang tính xây dựng: Phản hồi mang tính xây dựng của nhiều bên, bao gồm của chính HS; phản hồi cần cụ thể và tập trung vào những điểm tốt mà HS đã làm được.",
  ],
  "3e": [
    "Điều chỉnh có cơ sở: Khi cần thiết, GV điều chỉnh hoặc hủy bỏ các hoạt động đã lên kế hoạch từ trước và thay bằng các hoạt động phù hợp hơn với kiến thức hoặc sự quan tâm của HS.",
    "Tư duy cởi mở và đáp ứng nhu cầu của HS: GV cởi mở tiếp nhận các hành động, câu hỏi và các tình huống phát sinh ngoài dự kiến ở trong và ngoài lớp học và biến chúng thành các cơ hội học tập cho HS, giúp HS tự tìm hiểu kiến thức mới và tìm kiếm các cơ hội mới.",
    "Quyết tâm và kiên trì: GV cần kiên trì để đảm bảo hiệu quả giảng dạy cho dù HS có thể gặp khó khăn, và nếu cần có thể sử dụng các phương pháp khác để HS dễ tiếp cận hơn.",
  ],
  "4a": [
    "Tự đánh giá hoạt động dạy học: GV dựa trên các hoạt động học tập và bài đánh giá để xác định tác động của các hoạt động giảng dạy đối với kết quả học tập của HS và đánh giá hiệu quả của hoạt động học tập.",
    "Phân tích và phát hiện: Dựa trên kết quả tự đánh giá, GV sử dụng các phương pháp hoặc quan điểm mới, xem xét lại các ý tưởng và quan điểm của mình và tìm hiểu các phương pháp mới để nâng cao hiệu quả học tập của HS.",
    "Không ngừng ứng dụng và cải tiến: GV kiên trì giúp HS nâng cao thành tích học tập bằng cách lập kế hoạch, thử nghiệm và áp dụng các phương pháp mới để nâng cao hiệu quả dạy học dựa trên các đánh giá và phân tích.",
  ],
  "4b": [
    "Qúa trình học tập hướng tới mục tiêu: GV lưu lại quá trình học tập và tiến bộ của HS hướng tới các mục tiêu đã đề ra và thông tin đến HS, PH và các bên tham gia vào quá trình giáo dục HS.",
    "Cùng chịu trách nhiệm: Với sự hỗ trợ của GV, HS dựa trên các dữ liệu đã lưu để theo dõi tình hình học tập của mình và mức độ hoàn thành các mục tiêu học tập, đồng thời thường xuyên phân tích và trao đổi với GV và gia đình để tiến gần đến các mục tiêu đó.",
    "Lưu trữ hồ sơ chính xác: GV liên tục thu thập, cập nhật và chia sẻ các dữ liệu chính xác, dễ hiểu và rõ ràng với HS & PH.",
  ],
  "4c": [
    "Ứng xử phù hợp và tôn trọng văn hóa: GV giao tiếp với phụ huynh và cộng đồng sao cho thể hiện sự tôn trọng các giá trị và nền tảng văn hóa của đối tượng giao tiếp.",
    "Giá trị cộng đồng: Các hoạt động và môi trường học tập cần kế thừa và phát huy các giá trị của cộng đồng, tạo ra một tầm nhìn chung về mục tiêu học tập của HS.",
    "Chương trình giảng dạy: Thông tin cho phụ huynh về chương trình giảng dạy và tạo điều kiện để phụ huynh đóng góp ý kiến và phản hồi.",
    "Tham gia vào các hoạt động học tập: GV gắn các hoạt động bên ngoài trường học và cuộc sống thực tế của HS với hoạt động học tập tại trường và tích cực xây dựng các mối quan hệ để củng cố sự gắn kết đó.",
  ],
  "4d": [
    "Sự tin tưởng và tinh thần hợp tác: GV xây dựng mối quan hệ gần gũi với HS và đồng nghiệp để nâng cao năng lực chuyên môn, sự phối hợp, tin tưởng lẫn nhau và giúp HS tiến bộ.",
    "Văn hóa truy vấn và sáng tạo: GV đóng góp vào sự phát triển văn hóa trường học bằng cách thể hiện các giá trị cốt lõi, xác định nguyên nhân của các vấn đề tồn tại và thực hiện các biện pháp tích cực để giải quyết các vấn đề đó.",
    "Đóng góp vào sự phát triển của trường học: GV nâng cao vai trò của mình bên ngoài lớp học bằng cách dẫn dắt và đóng góp vào các sự kiện, dự án và sáng kiến của trường.",
  ],
  "4e": [
    "Chủ động và không ngừng học hỏi: GV xác định những mặt cần cải thiện về phẩm chất và chuyên môn, chủ động tìm kiếm cơ hội phát triển và nâng cao kiến thức.",
    "Nâng cao nhận thức văn hóa: GV học hỏi nâng cao hiểu biết về học sinh và cộng đồng nơi mình sinh sống và giảng dạy, áp dụng các kiến thức thu được vào thực tế và phát triển văn hóa trường học.",
    "Nâng cao kiến thức và kĩ năng: GV học hỏi để nâng cao kiến thức chuyên môn và sư phạm và trao đổi các kiến thức mới với đồng nghiệp.",
    "Nhận và tiếp thu ý kiến phản hồi: GV chủ động lấy và đưa ý kiến phản hồi, nhận xét và phối hợp để đáp ứng tốt các ý kiến phản hồi, nhận xét.",
  ],
  "4f": [
    "Quan tâm, trung thực và Integrity trong mọi hành động: GV luôn thể hiện sự quan tâm, trung thực và integrity với HS, PH và đồng nghiệp.",
    "Đưa ra các quyết định hợp đạo lý: GV lựa chọn đưa ra các quyết định phù hợp, đặc biệt là trong các tình huống khó khăn, để đảm bảo lợi ích cao nhất cho HS và PH.",
    "Bảo vệ quyền lợi: GV là người bảo vệ quyền lợi HS, PH và đồng nghiệp và chủ động thực hiện các hoạt động thay mặt cho HS, PH và đồng nghiệp.",
  ],
};

/** Câu hỏi suy ngẫm của khung — dùng làm câu hỏi đối thoại sau tiết dạy. */
export const SUY_NGAM: Record<MaThanhTo, readonly string[]> = {
  "1a": [
    "Kế hoạch dạy học và cách trình bày của GV thể hiện sự hiểu biết về mối quan hệ tiền đề giữa các nội dung & khái niệm như thế nào?",
    "GV trình bày nội dung và áp dụng các phương pháp học tập chuyên biệt của môn học như thế nào để giúp HS hiểu sâu sắc hơn về nội dung đó?",
    "GV làm thế nào để giúp HS kết nối liên môn hoặc xây dựng các kĩ năng liên môn?",
  ],
  "1b": [
    "Tính cách và văn hóa của HS được lồng ghép và thể hiện trong các hoạt động và môi trường học tập như thế nào?",
    "GV vận dụng hiểu biết về kiến thức và trải nghiệm sẵn có của HS như thế nào để giúp từng HS học tốt?",
    "Làm thế nào để phát huy các ưu điểm về học tập, cảm xúc-xã hội để nâng cao thành tích của HS?",
    "Hiểu biết của GV về quá trình tiếp thu kiến thức và sự khác biệt về khả năng tiếp thu kiến thức của HS được thể hiện như thế nào trong lập kế hoạch và chuẩn bị bài giảng?",
  ],
  "1c": [
    "Mục tiêu giảng dạy thể hiện các nội dung học tập phù hợp và hữu ích nhất cho HS như thế nào?",
    "Làm sao để mục tiêu giảng dạy phù hợp với các tiêu chuẩn của cấp lớp để đảm bảo giảng dạy hiệu quả cho mọi đối tượng HS?",
    "GV sử dụng các mục tiêu giảng dạy rõ ràng, cụ thể như thế nào để xác định rõ mục đích của từng hoạt động học tập?",
    "Nêu một vài ví dụ về cách GV kết hợp các mục tiêu giảng dạy và phát triển cảm xúc-xã hội để gia tăng cơ hội học tập cho HS?",
  ],
  "1d": [
    "GV sử dụng các tài liệu giảng dạy như thế nào để đáp ứng nhu cầu của từng cá nhân HS và tăng cường các hoạt động trí tuệ của HS?",
    "Công nghệ và học liệu kĩ thuật số hỗ trợ phương pháp dạy học cá nhân hóa, sự kết nối, khám phá và hoạt động trí tuệ của HS như thế nào?",
    "GV cung cấp học liệu và hỗ trợ HS như thế nào để HS dễ tiếp thu và nâng cao tính tự chủ của HS?",
  ],
  "1e": [
    "Làm thế nào để các nhiệm vụ và hoạt động hỗ trợ tối ưu cho HS tiếp thu các nội dung giảng dạy?",
    "GV sử dụng các phương pháp và cách tiếp cận cá nhân hóa như thế nào để HS học tập tốt?",
    "GV phân chia HS thành các nhóm dạy riêng như thế nào để phát huy được thế mạnh của HS, khuyến khích HS giao tiếp và hợp tác?",
    "Bài giảng và hoạt động học tập được sắp xếp và cấu trúc như thế nào để nâng cao hiệu quả học tập và tính tự chủ của HS?",
    "Làm thế nào để tạo cơ hội cho HS thể hiện mức độ thành thạo các kiến thức được học?",
    "Làm thế nào để xây dựng các tiêu chí và tiêu chuẩn đánh giá rõ ràng, cụ thể và truyền đạt các tiêu chí, tiêu chuẩn đó như thế nào đến HS?",
    "GV thiết kế bài đánh giá thường xuyên như thế nào để từ đó có thể điều chỉnh phương pháp giảng dạy cho phù hợp và giúp nâng cao tính tự chủ của HS?",
    "GV phân tích và áp dụng dữ liệu đánh giá như thế nào để làm cơ sở cho việc điều chỉnh phương pháp giảng dạy?",
  ],
  "1f": [],
  "2a": [
    "GV có thể xây dựng mối quan hệ một cách có chủ đích với HS và giữa các HS như thế nào?",
    "Dựa vào đâu để đánh giá là HS cảm nhận được giá trị chung mà bản sắc riêng vẫn được tôn trọng?",
    "GV thể hiện năng lực văn hóa như thế nào để tạo ra một môi trường giáo dục hòa nhập cho tất cả HS?",
    "GV làm gì để duy trì mối quan hệ tích cực và tôn trọng mà vẫn giải quyết được các mâu thuẫn, bất đồng của HS?",
  ],
  "2b": [
    "GV và HS thể hiện sự kiên trì, quyết tâm nắm bắt kiến thức và phát triển bản thân như thế nào?",
    "Bằng chứng nào cho thấy GV đã làm mẫu và dạy kĩ càng cho HS các kĩ năng giúp HS học tốt?",
    "Có những cách nào để HS thể hiện quyền được lựa chọn trong lớp học?",
    "Có những cách nào để GV hỗ trợ HS và cùng nhau thể hiện sự quyết tâm thực hiện các công việc khó?",
  ],
  "2c": [
    "GV dạy và sử dụng các hoạt động phối hợp trong lớp học như thế nào?",
    "Bằng chứng nào cho thấy GV đã dạy các quy trình giúp nâng cao ý thức trách nhiệm và tự chủ của HS và các quy trình đó phù hợp với nhu cầu của HS?",
    "GV phân phát học liệu, học phẩm và hỗ trợ như thế nào để đảm bảo bình đẳng cho tất cả HS?",
    "GV thực hiện các nhiệm vụ ngoài thời gian giảng bài như thế nào để không ảnh hưởng đến thời lượng giảng bài?",
    "Bằng cách nào để có thể thấy là các quy tắc lớp học đã được xây dựng với sự đóng góp tích cực và liên tục của HS?",
    "GV làm mẫu và dạy các thói quen, đức tính giúp phát triển các hành vi tích cực của HS như thế nào?",
    "Bằng chứng nào cho thấy HS giám sát và đánh giá, rút kinh nghiệm hành vi của mình và tác động của hành vi của mình đến các bạn cùng lớp và việc học tập của bản thân?",
  ],
  "2d": [],
  "2e": [
    "GV và HS điều chỉnh không gian học tập như thế nào cho an toàn và dễ tiếp cận với mọi HS?",
    "Dựa vào đâu có thể thấy không gian học tập đã được thiết kế phù hợp và hỗ trợ nội dung giảng dạy và thuận tiện cho HS?",
    "Sử dụng ý kiến đóng góp của HS như thế nào để tạo ra cảm giác sở hữu chung với không gian học tập?",
  ],
  "3a": [
    "GV truyền đạt mục đích và giá trị của hoạt động học tập như thế nào để HS tiến bộ cả về học tập và phát triển nhân cách?",
    "HS thể hiện đã hiểu các kỳ vọng của hoạt động học tập và quy trình thực hiện hoạt động học tập bằng cách nào?",
    "HS thể hiện nội dung đã được dạy giúp các em nâng cao kiến thức như thế nào?",
    "GV và HS sử dụng ngôn ngữ học thuật chính xác và chặt chẽ để truyền đạt và trao đổi về nội dung kiến thức như thế nào?",
  ],
  "3b": [
    "Bằng cách nào HS thể hiện việc đặt câu hỏi và thảo luận giúp các em tư duy phản biện và hiểu sâu kiến thức?",
    "Việc đặt câu hỏi và thảo luận giúp HS chứng minh cho suy luận và xem xét lại các kiến thức đã học như thế nào?",
    "HS làm thế nào để đưa các bạn khác vào cuộc hội thoại/thảo luận một cách lịch sự và hiệu quả?",
    "HS làm gì để thể hiện sự tự chủ trong việc điều chỉnh các nhiệm vụ học tập trở nên lôi cuốn và phù hợp hơn?",
    "GV làm gì để đảm bảo sự phối hợp giữa HS có thể giúp HS hiểu sâu sắc kiến thức và thu được các kiến thức mới?",
    "Sử dụng tài liệu học tập và đồ dùng như thế nào để hỗ trợ khả năng học sâu của tất cả HS?",
    "Dựa vào đâu để thấy cấu trúc bài học tạo điều kiện tối đa cho HS tư duy và củng cố kiến thức được học?",
  ],
  "3c": [],
  "3d": [
    "GV xây dựng và truyền đạt rõ ràng các tiêu chuẩn đánh giá bài làm tốt của HS như thế nào?",
    "Bằng chứng nào cho thấy HS tự kiểm tra kiến thức của mình để đánh giá mức độ đạt được mục tiêu?",
    "HS nhận và sử dụng phản hồi chất lượng cao như thế nào để nâng cao hiệu quả học tập?",
  ],
  "3e": [
    "Bằng chứng nào cho thấy GV thực hiện các điều chỉnh hoạt động học tập trong khi giảng dạy để đáp ứng đúng nhu cầu của HS?",
    "GV làm thế nào để đưa các thắc mắc và những điều HS quan tâm vào hoạt động học tập để giúp HS hiểu rõ kiến thức và thúc đẩy trí tò mò của HS?",
    "GV và HS thể hiện quyết tâm dạy và học tốt khi gặp khó khăn bằng cách nào?",
  ],
  "4a": [
    "GV sử dụng bằng chứng từ các nguồn khác nhau như thế nào để phân tích hoạt động dạy học của mình và hiệu quả bài giảng?",
    "Bằng chứng nào cho thấy GV sử dụng kết quả tự đánh giá làm cơ sở cho việc tiếp thu các kiến thức và kĩ năng mới một cách có chủ đích?",
    "GV sử dụng việc tự đánh giá và ý tưởng mới như thế nào để thể hiện cam kết cải tiến liên tục?",
  ],
  "4b": [
    "Làm thế nào để biết GV và HS có một hệ thống theo dõi mức độ hoàn thành mục tiêu học tập rõ ràng, dễ hiểu?",
    "GV, HS và những người hỗ trợ HS chia sẻ trách nhiệm quản lý sự tiến bộ của HS như thế nào?",
    "GV làm thế nào để đảm bảo ghi chép và lưu hồ sơ của HS một cách chính xác, rõ ràng, dễ hiểu?",
  ],
  "4c": [
    "GV tương tác như thế nào để thể hiện sự tôn trọng các giá trị của gia đình HS và cộng đồng địa phương?",
    "Làm thế nào để xây dựng mục tiêu giúp HS học tập tốt dựa trên các quy tắc và giá trị của cộng đồng nơi đó?",
    "Dựa vào đâu để thấy GV thường xuyên sử dụng các biện pháp thông tin về tình hình học tập của HS cho PH để nhận ý kiến đóng góp và phản hồi.",
    "GV liên hệ trải nghiệm thực tế của HS để huy động sự tham gia của PH và cộng đồng vào các hoạt động học tập một cách phù hợp như thế nào?",
  ],
  "4d": [
    "Dựa vào đâu để biết GV đã xây dựng mối quan hệ chặt chẽ giúp tạo ra niềm tin với HS và đồng nghiệp?",
    "GV làm thể nào để nêu gương về ý thức học tập nâng cao kiến thức?",
    "GV làm thế nào để thể hiện vai trò dẫn dắt trong việc xây dựng và thực hiện các sự kiện, dự án và sáng kiến cho HS và đồng nghiệp?",
  ],
  "4e": [
    "Bằng chứng nào cho thấy GV tôn trọng các khác biệt văn hóa và có ý thức nâng cao và thể hiện năng lực văn hóa?",
    "GV làm thế nào để tìm kiếm cơ hội phát triển chuyên môn để đáp ứng tốt hơn nhu cầu của HS?",
    "GV thể hiện sự chủ động điều chỉnh/tinh chỉnh kiến thức và kĩ năng như thế nào?",
    "GV thể hiện cam kết xin và tiếp thu phản hồi chất lượng cao như thế nào?",
  ],
  "4f": [
    "Bằng chứng nào cho thấy GV quan tâm, trung thực và integrity và đóng vai trò dẫn dắt, vận động người khác cùng thực hiện các phẩm chất này?",
    "GV làm thế nào để đảm bảo rằng các quyết định mình đưa ra là phục vụ cho lợi ích cao nhất của HS, PH và đồng nghiệp?",
    "GV làm gì để nêu gương và dẫn dắt, vận động người khác bảo vệ quyền lợi cho HS, PH và đồng nghiệp?",
  ],
};

export const TEN_PHAN: Record<SoPhan, string> = {
  1: "Phần I · Lập kế hoạch và chuẩn bị",
  2: "Phần II · Môi trường học tập",
  3: "Phần III · Hoạt động học tập",
  4: "Phần IV · Đạo đức giảng dạy",
};

/** Nguồn minh chứng của từng phần — hiện ngay dưới tiêu đề phần trong giao diện. */
export const NGUON_PHAN: Record<SoPhan, string> = {
  1: "căn cứ giáo án",
  2: "quan sát trực tiếp",
  3: "quan sát trực tiếp",
  4: "hồ sơ & đối thoại · không tính vào điểm tiết dạy",
};

export const TRONG_SO: Record<SoPhan, number> = { 1: 0.2, 2: 0.35, 3: 0.45, 4: 0 };
