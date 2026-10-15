import { PRODUCT_THEMES } from '../product-content.js';

// Lớp 1 của mạch truyện: hồ sơ riêng từng thế giới (manh mối, nhân vật, biến cố, kết).
// Lớp 2: nhịp theo loại tiết (hình thành / luyện tập / ôn tập) qua `openings`, và nhịp theo pha qua `cues`.
// Mọi câu viết sẵn, không gọi AI lúc học; tối đa 2 câu; không nhắc điểm hay thứ hạng.
const worlds = {
  modern: {
    clue: 'hồ sơ tín hiệu cuối cùng',
    openings: {
      formation: 'Sau cơn bão, thành phố cảng Hải Lam tối đèn và thanh tra Mai trao cho em hồ sơ đầu tiên. Em học cách đọc mật mã để lần ra nguồn phát tín hiệu.',
      practice: 'Thanh tra Mai đã dạy em đọc mật mã, nhưng mỗi khu phố lại giấu tín hiệu theo một kiểu khác. Em luyện tay qua từng hồ sơ trước khi chuyến tàu đêm rời bến.',
      review: 'Các hồ sơ em giải ở những chặng trước đang nằm rời trên bàn thanh tra Mai. Em ghép chúng lại thành một bản đồ để tìm nguồn tín hiệu cuối cùng của Hải Lam.',
    },
    cues: {
      experience: 'Ông Tư gác đèn bến cảng đưa em một mảnh của hồ sơ tín hiệu cuối cùng, chữ đã nhòe vì nước mưa. Em quan sát thật kỹ rồi ghi lại điều mình muốn thử trước.',
      guided: 'Kho hồ sơ còn một ngăn khóa, và hồ sơ tín hiệu cuối cùng nằm bên trong. Em thử từng bước, mở gợi ý khi cần và tự soát lại cách làm của mình.',
      formation: 'Tại trạm điện, các dòng mật mã trong hồ sơ tín hiệu cuối cùng bắt đầu lặp lại theo một quy luật. Em tìm ra quy luật đó và giải thích vì sao nó đúng.',
      practice: 'Mỗi khu phố gửi về một bản sao khác của hồ sơ tín hiệu cuối cùng. Em giải từng bản; khi làm nhóm, em nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Trên đài quan sát, hồ sơ tín hiệu cuối cùng chỉ mở cho người tự tay kiểm chứng. Em làm một mình; chỗ nào chưa chắc, em cứ nói rõ để được hỗ trợ.',
      exit: 'Em kẹp lời giải của mình vào hồ sơ tín hiệu cuối cùng trước khi nộp về tòa thị chính. Ghi cả cách làm lẫn câu hỏi em còn muốn hỏi.',
      reflection: 'Thanh tra Mai hỏi: lần mở hồ sơ tín hiệu cuối cùng, em đã đổi cách nghĩ ở đâu? Em kể lại một lần mình sửa cách làm và điều khiến em đổi ý.',
    },
    ending: 'Đèn Hải Lam sáng dần từ bến cảng đến tòa thị chính, và chuyến tàu đêm rời bến đúng giờ. Em giữ lại sổ ghi chép để mở hồ sơ tiếp theo.',
    partialEnding: 'Hải Lam đã sáng lại vài khu phố, nhưng còn một tuyến liên lạc chưa nối. Em giữ manh mối đã kiểm tra để tiếp tục ở chuyến sau.',
  },
  historical: {
    clue: 'dấu vết năm ấn tín',
    openings: {
      formation: 'Sương mù phủ kín Long Thành, năm ấn tín thất lạc và lão thư lại Bá Tùng nhờ em dẫn sứ đoàn. Em học cách đọc dấu ấn để mở lối cho đoàn dân.',
      practice: 'Em đã biết đọc dấu ấn, nhưng mỗi trạm canh lại khắc theo một lối riêng. Cô lái đò Ngân chở em qua từng bến để luyện cho chắc tay.',
      review: 'Những dấu ấn em tìm được ở các chặng trước đang chờ được ghép lại tại long điện. Em lần lại từng bến, từng kho để năm ấn cùng sáng.',
    },
    cues: {
      experience: 'Ở bến đò, cô Ngân chỉ cho em dấu vết năm ấn tín khắc mờ trên mạn thuyền. Em quan sát, chọn điều cần thử và ghi lại thắc mắc của mình.',
      guided: 'Cửa kho quân lương còn một chốt ấn chưa giải, đúng chỗ dấu vết năm ấn tín dừng lại. Em thử từng bước, dùng gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Bên thủy môn, dấu vết năm ấn tín xếp thành một quy luật. Em tìm mối liên hệ giữa các dấu và giải thích vì sao cách nối của mình hợp lý.',
      practice: 'Lão Bá Tùng gửi thêm những bản khắc mới mang dấu vết năm ấn tín. Em giải từng bản; khi làm nhóm, hãy góp ý của mình trước khi cả sứ đoàn thống nhất.',
      recheck: 'Lính canh vọng lâu chỉ mở cổng cho người tự đọc được dấu vết năm ấn tín. Em làm một mình và nói rõ chỗ nào mình còn cần hỗ trợ.',
      exit: 'Em ghi lời giải bên dấu vết năm ấn tín rồi đặt vào hộp gỗ ở long điện. Giữ cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại dấu vết năm ấn tín, em đã đổi cách nghĩ ở bến nào? Hãy kể một lần em sửa cách làm và điều khiến em đổi ý.',
    },
    ending: 'Năm ấn cùng sáng, sương tan và đoàn dân đi qua cổng thành an toàn. Em giữ lại sổ ghi chép của sứ đoàn cho hành trình sau.',
    partialEnding: 'Long Thành còn vài dấu ấn chưa tìm thấy, đèn dẫn đường mới sáng một phần. Em giữ lại dấu ấn đã kiểm tra để tiếp tục lần sau.',
  },
  future: {
    clue: 'mã đồng bộ Aurora',
    openings: {
      formation: 'Mạng lưới Aurora mắc kẹt trong một vòng lặp thời gian, và trí tuệ trạm Lumi gọi em vào phi đội. Em học cách đọc tín hiệu lệch trước khi vòng lặp khép lại.',
      practice: 'Chỉ huy Kha giao cho em các điểm lệch mới, mỗi điểm lặp lại theo một nhịp khác. Em luyện đồng bộ từng điểm cho đến khi Lumi báo ổn định.',
      review: 'Các nút năng lượng em sửa ở những chặng trước còn rời rạc. Em nối chúng thành một chuỗi để Aurora gửi được tín hiệu dẫn đường.',
    },
    cues: {
      experience: 'Ở bãi hạ cánh, Lumi chiếu lên một đoạn mã đồng bộ Aurora bị nhiễu. Em quan sát, đoán quy luật và ghi lại điều mình muốn kiểm tra.',
      guided: 'Kho dữ liệu còn một ô lỗi chặn mã đồng bộ Aurora. Em thử từng bước, mở gợi ý của Lumi khi cần rồi tự kiểm tra lại.',
      formation: 'Trong lò năng lượng, mã đồng bộ Aurora hiện ra theo một nhịp lặp. Em tìm quy luật của nhịp đó và giải thích vì sao nó đúng.',
      practice: 'Chỉ huy Kha gửi thêm các đoạn mã đồng bộ Aurora từ những thời điểm khác nhau. Em giải từng đoạn; khi làm nhóm, em nêu ý mình trước rồi cả phi đội cùng chốt.',
      recheck: 'Kính thiên văn chỉ nhận mã đồng bộ Aurora do chính tay em kiểm chứng. Em tự làm, chỗ nào chưa chắc thì nói rõ để được hỗ trợ.',
      exit: 'Em gửi lời giải kèm mã đồng bộ Aurora vào nhật ký cổng truyền tin. Ghi cả cách làm và câu hỏi em còn muốn tìm hiểu.',
      reflection: 'Lumi hỏi: khi giải mã đồng bộ Aurora, em đã đổi cách nghĩ ở đâu? Em kể một lần mình sửa cách làm và lý do.',
    },
    ending: 'Vòng lặp mở ra và Aurora phát tín hiệu dẫn đường về mọi trạm. Em lưu nhật ký phi đội để dùng cho sứ mệnh sau.',
    partialEnding: 'Aurora còn một điểm lệch cần kiểm chứng, nên vòng lặp mới tạm dừng. Em lưu các điểm đã đồng bộ để tiếp tục ở chuyến bay sau.',
  },
  dewey: {
    clue: 'mảnh mật mã chiếc rương tri thức',
    openings: {
      formation: 'Sáng ngày hội, chiếc rương tri thức bị khóa và cô thủ thư Sao nhờ em tìm năm mảnh mật mã. Em học cách đọc mật mã trước khi tiếng chuông vang lên.',
      practice: 'Em đã biết đọc mật mã, nhưng mỗi góc trường lại giấu một kiểu khóa khác. Em luyện mở từng khóa để kịp giờ khai hội.',
      review: 'Những mảnh mật mã em tìm được ở các chặng trước đang nằm rải khắp sân trường. Em gom lại và ghép chúng để mở chiếc rương tri thức.',
    },
    cues: {
      experience: 'Ở cổng trường, em nhặt được mảnh mật mã chiếc rương tri thức đầu tiên kẹp trong cuốn sổ cũ. Em quan sát và ghi lại điều mình muốn thử trước.',
      guided: 'Sân thể thao còn một ô khóa đang giữ mảnh mật mã chiếc rương tri thức. Em thử từng bước, mở gợi ý khi cần rồi tự soát lại.',
      formation: 'Trong không gian STEM, các mảnh mật mã chiếc rương tri thức xếp theo một quy luật. Em tìm quy luật và giải thích cách mình nối các mảnh.',
      practice: 'Thư viện gửi thêm những thẻ đố có mảnh mật mã chiếc rương tri thức. Em giải từng thẻ; khi làm nhóm, hãy nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Trước cửa vườn học tập, mảnh mật mã chiếc rương tri thức chỉ mở cho người tự kiểm chứng. Em làm một mình và nói rõ chỗ cần hỗ trợ nếu chưa chắc.',
      exit: 'Em để lời giải của mình bên mảnh mật mã chiếc rương tri thức trong hộp thư của cô Sao. Ghi cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại mảnh mật mã chiếc rương tri thức, em đã đổi cách nghĩ ở đâu? Hãy kể một lần em sửa cách làm và điều khiến em đổi ý.',
    },
    ending: 'Tiếng chuông vang lên đúng lúc chiếc rương tri thức mở nắp, và ngày hội bắt đầu. Em giữ lại sổ thám hiểm để dùng cho lần sau.',
    partialEnding: 'Chiếc rương tri thức còn một mảnh mật mã chưa ghép nên mới hé nắp. Em giữ các mảnh đã kiểm tra để tiếp tục ở buổi sau.',
  },
  pastoral: {
    clue: 'bản ghi đường nước mùa hội',
    openings: {
      formation: 'Mưa lớn làm lỡ mùa hội bên sông, và bà Tám giữ guồng nhờ em đọc lại đường nước. Em học cách đọc bản ghi để đưa vật dụng qua sông kịp ngày hội.',
      practice: 'Em đã biết đọc đường nước, nhưng mỗi đoạn sông lại chảy một kiểu. Cậu Tí chèo thuyền đưa em qua từng khúc để luyện cho quen tay.',
      review: 'Các đoạn đường nước em sửa ở những chặng trước cần được nối thành một dòng. Em đi lại từ bến nước đến nhà hội để ghép chúng lại.',
    },
    cues: {
      experience: 'Ở bến nước, bà Tám đưa em bản ghi đường nước mùa hội đã ướt mép. Em quan sát, chọn điều cần thử và ghi lại thắc mắc.',
      guided: 'Kho thóc còn một ngăn nước tràn đúng chỗ bản ghi đường nước mùa hội bị đứt. Em thử từng bước, dùng gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Bên guồng nước, bản ghi đường nước mùa hội lặp lại theo từng vòng quay. Em tìm quy luật của vòng quay và giải thích vì sao nó đúng.',
      practice: 'Cối gió gửi thêm những đoạn bản ghi đường nước mùa hội mới. Em giải từng đoạn; khi làm nhóm, em nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Trước cửa nhà hội, bản ghi đường nước mùa hội cần em tự kiểm chứng một lần. Em làm một mình và nói rõ phần nào còn cần hỗ trợ.',
      exit: 'Em ghi lời giải vào bản ghi đường nước mùa hội rồi treo ở nhà hội. Giữ cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại bản ghi đường nước mùa hội, em đã đổi cách nghĩ ở khúc sông nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Guồng nước quay đều, nhà hội sáng đèn và mùa vui trở lại với cả làng. Em giữ lại bản ghi để mùa sau dùng tiếp.',
    partialEnding: 'Bên sông còn một đường nước cần kiểm tra nên nhà hội mới sáng một nửa. Em giữ đoạn đã sửa để tiếp tục lần sau.',
  },
  cube: {
    clue: 'mã tọa độ các khối đảo',
    openings: {
      formation: 'Các khối đảo trôi lệch khỏi lưới, và kiến trúc sư Lập trao cho em chiếc thước tọa độ. Em học cách đọc mã để dựng lại những nhịp cầu rời.',
      practice: 'Rô-bốt Cubi đã dạy em đọc tọa độ, nhưng mỗi khối đảo lại lệch một kiểu. Em luyện đưa từng khối về lưới cho chắc tay.',
      review: 'Những nhịp cầu em nối ở các chặng trước còn đứng rời nhau. Em ghép chúng thành một tuyến để đưa cả quần đảo về đúng lưới.',
    },
    cues: {
      experience: 'Ở bến khối, Cubi chiếu lên một dòng mã tọa độ các khối đảo bị lệch. Em quan sát, đoán quy luật và ghi lại điều cần thử.',
      guided: 'Vườn tọa độ còn một ô trống chặn mã tọa độ các khối đảo. Em thử từng bước, mở gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Trên cầu lập phương, mã tọa độ các khối đảo hiện ra theo một quy luật. Em tìm quy luật đó và giải thích cách nối của mình.',
      practice: 'Kiến trúc sư Lập gửi thêm các bản mã tọa độ các khối đảo mới. Em giải từng bản; khi làm nhóm, em nêu ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Lõi hình học chỉ nhận mã tọa độ các khối đảo do em tự kiểm chứng. Em làm một mình và nói rõ chỗ nào còn cần hỗ trợ.',
      exit: 'Em khắc lời giải cạnh mã tọa độ các khối đảo trên đài không gian. Ghi cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại mã tọa độ các khối đảo, em đã đổi cách nghĩ ở nhịp cầu nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Các khối đảo khớp vào lưới, nhịp cầu nối liền và đảo trở về đúng vị trí. Em giữ lại bản vẽ để dựng tiếp ở lần sau.',
    partialEnding: 'Các khối đảo còn một nhịp cầu chưa nối nên đảo mới về lưới một phần. Em giữ các tọa độ đã kiểm tra để tiếp tục.',
  },
  ring: {
    clue: 'sơ đồ các nút giao vòng bo',
    openings: {
      formation: 'Tuyến tàu điện vòng của thành phố bị đứt, và chị Vân điều phối nhờ em đọc lại sơ đồ. Em học cách đọc các nút giao trước khi tín hiệu tắt.',
      practice: 'Em đã biết đọc nút giao, nhưng mỗi khu phố nối vòng theo một kiểu. Em luyện nối từng đoạn cho đến khi tàu chạy êm.',
      review: 'Những đoạn vòng em sửa ở các chặng trước cần được khép lại. Em đi một vòng từ cổng đến quảng trường để nối chúng thành tuyến liền.',
    },
    cues: {
      experience: 'Ở cổng vòng, chị Vân trải sơ đồ các nút giao vòng bo đã rách một góc. Em quan sát và ghi lại điều mình muốn thử trước.',
      guided: 'Nút trung tâm còn một chốt kẹt trên sơ đồ các nút giao vòng bo. Em thử từng bước, mở gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Ở phố cầu, sơ đồ các nút giao vòng bo lặp lại theo một nhịp. Em tìm quy luật đó và giải thích vì sao cách nối của mình hợp lý.',
      practice: 'Vòng ngoài gửi thêm những đoạn sơ đồ các nút giao vòng bo mới. Em giải từng đoạn; khi làm nhóm, em nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Trạm vòng ngoài chỉ mở khi em tự kiểm chứng sơ đồ các nút giao vòng bo. Em làm một mình và nói rõ chỗ cần hỗ trợ nếu chưa chắc.',
      exit: 'Em ghim lời giải lên sơ đồ các nút giao vòng bo ở quảng trường. Ghi cả cách làm lẫn câu hỏi em muốn hỏi thêm.',
      reflection: 'Nhìn lại sơ đồ các nút giao vòng bo, em đã đổi cách nghĩ ở nút nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Tàu điện chạy trọn một vòng, mọi khu phố gặp lại nhau ở quảng trường. Em giữ sơ đồ để sửa tiếp các tuyến mới.',
    partialEnding: 'Vòng bo còn một đoạn đường chưa khép, tàu mới chạy được nửa vòng. Em giữ các nút đã kiểm tra để tiếp tục.',
  },
  zones: {
    clue: 'bản đồ tín hiệu năm khu',
    openings: {
      formation: 'Một trận mưa dữ liệu cắt đứt năm khu, và điều phối viên Lam trao cho em bản đồ trống. Em học cách đọc tín hiệu để không khu nào bị bỏ lại.',
      practice: 'Em đã biết đọc tín hiệu, nhưng mỗi khu lại nhiễu theo một kiểu. Em luyện nối từng tuyến tiếp tế cho thật chắc.',
      review: 'Các tuyến em nối ở những chặng trước đang rời nhau giữa năm khu. Em ghép chúng lại để trung tâm thấy cả bức tranh.',
    },
    cues: {
      experience: 'Ở khu Bắc, chị Lam đưa em bản đồ tín hiệu năm khu còn chập chờn. Em quan sát, chọn điều cần thử và ghi lại thắc mắc.',
      guided: 'Khu Đông còn một trạm im lặng trên bản đồ tín hiệu năm khu. Em thử từng bước, dùng gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Ở khu Nam, bản đồ tín hiệu năm khu cho thấy một quy luật lặp lại. Em tìm quy luật đó và giải thích vì sao nó đúng.',
      practice: 'Khu Tây gửi thêm những mảnh bản đồ tín hiệu năm khu mới. Em giải từng mảnh; khi làm nhóm, em nêu ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Trung tâm chỉ nhận bản đồ tín hiệu năm khu do chính em kiểm chứng. Em làm một mình và nói rõ phần nào còn cần hỗ trợ.',
      exit: 'Em ghi lời giải lên bản đồ tín hiệu năm khu rồi gửi về trung tâm. Giữ cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại bản đồ tín hiệu năm khu, em đã đổi cách nghĩ ở khu nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Năm khu cùng bắt được tín hiệu và mở cổng chung ở trung tâm. Em giữ bản đồ để chuẩn bị cho đợt tiếp tế sau.',
    partialEnding: 'Năm khu còn một tuyến tín hiệu đang chờ nối. Em giữ các tuyến đã kiểm tra để tiếp tục ở chặng sau.',
  },
  academy: {
    clue: 'bảng quy tắc Hỗn Nguyên',
    openings: {
      formation: 'Các phòng học của Học viện Hỗn Nguyên trộn lẫn quy tắc, và thầy hiệu trưởng Nguyên nhờ em gỡ rối. Em học cách đọc quy tắc trước khi cửa học viện khép lại.',
      practice: 'Em đã biết đọc quy tắc, nhưng mỗi phòng lại rối theo một kiểu. Em luyện gỡ từng phòng cho đến khi bảng quy tắc rõ ràng.',
      review: 'Những quy tắc em gỡ ở các chặng trước đang nằm rải khắp các phòng. Em mang chúng về hội trường để ghép thành bảng quy tắc chung.',
    },
    cues: {
      experience: 'Ở cổng học viện, thầy Nguyên chỉ cho em một dòng trên bảng quy tắc Hỗn Nguyên bị xóa mờ. Em quan sát và ghi lại điều muốn thử trước.',
      guided: 'Phòng hàm số còn một ô sai trên bảng quy tắc Hỗn Nguyên. Em thử từng bước, mở gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Ở phòng hình, các dòng của bảng quy tắc Hỗn Nguyên xếp theo một trật tự. Em tìm trật tự đó và giải thích vì sao nó đúng.',
      practice: 'Phòng dữ liệu gửi thêm những đoạn của bảng quy tắc Hỗn Nguyên. Em giải từng đoạn; khi làm nhóm, em nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Cửa hội trường chỉ mở khi em tự kiểm chứng bảng quy tắc Hỗn Nguyên. Em làm một mình và nói rõ chỗ cần hỗ trợ nếu chưa chắc.',
      exit: 'Em viết lời giải bên lề bảng quy tắc Hỗn Nguyên rồi nộp cho thầy Nguyên. Ghi cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại bảng quy tắc Hỗn Nguyên, em đã đổi cách nghĩ ở phòng nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Các phòng học trở lại trật tự và Học viện Hỗn Nguyên mở cửa đón lớp mới. Em giữ bảng quy tắc để dùng cho năm học sau.',
    partialEnding: 'Học viện còn một quy tắc chưa được làm rõ nên vài phòng vẫn tạm khóa. Em giữ phần đã gỡ để tiếp tục lần sau.',
  },
  survival: {
    clue: 'tín hiệu hải đăng giữa quần đảo',
    openings: {
      formation: 'Thủy triều đổi hướng làm đứt đường tiếp tế, và ông Biển giữ hải đăng trao cho em chiếc đèn tín hiệu. Em học cách đọc ánh đèn để không ai bị bỏ lại.',
      practice: 'Cô hoa tiêu Sóng đã dạy em đọc ánh đèn, nhưng mỗi đảo lại nháy một kiểu. Em luyện đọc từng nhịp trước đợt thủy triều tới.',
      review: 'Các tuyến em mở ở những chặng trước còn đứt quãng giữa các đảo. Em nối chúng thành một tuyến sinh tồn liền mạch.',
    },
    cues: {
      experience: 'Ở đảo gốc, ông Biển chỉ cho em tín hiệu hải đăng giữa quần đảo nháy theo nhịp lạ. Em quan sát, chọn điều cần thử và ghi lại thắc mắc.',
      guided: 'Đảo nước còn một trạm tắt đèn, làm đứt tín hiệu hải đăng giữa quần đảo. Em thử từng bước, dùng gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Ở đảo gió, tín hiệu hải đăng giữa quần đảo lặp lại theo một quy luật. Em tìm quy luật đó và giải thích vì sao nó đúng.',
      practice: 'Cô Sóng gửi thêm những nhịp tín hiệu hải đăng giữa quần đảo từ các đảo xa. Em giải từng nhịp; khi làm nhóm, em nêu ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Ở đảo đá, tín hiệu hải đăng giữa quần đảo cần em tự kiểm chứng trước khi trời tối. Em làm một mình và nói rõ phần nào còn cần hỗ trợ.',
      exit: 'Em ghi lời giải vào nhật ký tín hiệu hải đăng giữa quần đảo. Giữ cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại tín hiệu hải đăng giữa quần đảo, em đã đổi cách nghĩ ở đảo nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Hải đăng sáng rực, các đảo nhìn thấy nhau và không ai bị bỏ lại. Em giữ nhật ký tín hiệu cho mùa gió sau.',
    partialEnding: 'Quần đảo còn một tuyến tiếp tế cần kiểm chứng nên hải đăng mới sáng một phần. Em giữ các nhịp đã đọc để tiếp tục.',
  },
  galaxy: {
    clue: 'bản ghi quỹ đạo đoàn tàu sao',
    openings: {
      formation: 'Các trạm sao lệch khỏi quỹ đạo, và phi công Vega mời em lên buồng lái. Em học cách đọc quỹ đạo để đưa đoàn tàu về bến.',
      practice: 'Em đã biết đọc quỹ đạo, nhưng mỗi vành đai lại kéo tàu theo một kiểu. Trạm trưởng Orion giao em luyện từng chặng bay.',
      review: 'Những chặng bay em hoàn thành trước đây còn rời rạc trên màn hình. Em nối chúng thành một quỹ đạo trọn vẹn về bến thiên hà.',
    },
    cues: {
      experience: 'Ở bến sao, Vega mở bản ghi quỹ đạo đoàn tàu sao bị nhiễu. Em quan sát, đoán quy luật và ghi lại điều cần thử.',
      guided: 'Vành đai còn một điểm lệch trong bản ghi quỹ đạo đoàn tàu sao. Em thử từng bước, mở gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Ở trạm sao, bản ghi quỹ đạo đoàn tàu sao hiện ra theo một nhịp đều. Em tìm quy luật đó và giải thích vì sao nó đúng.',
      practice: 'Trạm trưởng Orion gửi thêm những đoạn bản ghi quỹ đạo đoàn tàu sao. Em giải từng đoạn; khi làm nhóm, em nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Cổng quỹ đạo chỉ mở khi em tự kiểm chứng bản ghi quỹ đạo đoàn tàu sao. Em làm một mình và nói rõ chỗ cần hỗ trợ nếu chưa chắc.',
      exit: 'Em lưu lời giải vào bản ghi quỹ đạo đoàn tàu sao ở bến thiên hà. Ghi cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại bản ghi quỹ đạo đoàn tàu sao, em đã đổi cách nghĩ ở chặng nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Đoàn tàu sao bay trọn quỹ đạo và về bến thiên hà an toàn. Em giữ bản ghi để chuẩn bị cho chuyến bay sau.',
    partialEnding: 'Đoàn tàu sao còn một quỹ đạo cần kiểm tra nên mới dừng ở trạm giữa. Em giữ các chặng đã bay để tiếp tục.',
  },
  maze: {
    clue: 'mảnh mã của lối ra chung',
    openings: {
      formation: 'Mê cung khóa chéo mọi lối đi, và chú cú gác cửa Dạ đưa em chiếc đèn lồng. Em học cách đọc mã trước khi mê cung đổi cửa.',
      practice: 'Em đã biết đọc mã, nhưng mỗi phòng lại khóa theo một kiểu. Em luyện mở từng cửa để đi sâu hơn vào mê cung.',
      review: 'Những mảnh mã em tìm ở các chặng trước đang nằm rải trong nhiều phòng. Em gom chúng lại để mở lối ra chung cho mọi đội.',
    },
    cues: {
      experience: 'Ở cổng mê cung, cú Dạ chỉ cho em mảnh mã của lối ra chung khắc trên tường. Em quan sát và ghi lại điều muốn thử trước.',
      guided: 'Phòng số còn một ổ khóa giữ mảnh mã của lối ra chung. Em thử từng bước, mở gợi ý khi cần rồi tự kiểm tra.',
      formation: 'Ở phòng hình, các mảnh mã của lối ra chung xếp theo một quy luật. Em tìm quy luật đó và giải thích cách nối của mình.',
      practice: 'Phòng mã gửi thêm những mảnh mã của lối ra chung. Em giải từng mảnh; khi làm nhóm, em nói ý mình trước rồi cả đội cùng chốt.',
      recheck: 'Cửa cuối chỉ mở khi em tự kiểm chứng mảnh mã của lối ra chung. Em làm một mình và nói rõ chỗ cần hỗ trợ nếu chưa chắc.',
      exit: 'Em ghi lời giải cạnh mảnh mã của lối ra chung trước khi bước ra. Giữ cả cách làm lẫn câu hỏi em muốn quay lại.',
      reflection: 'Nhìn lại mảnh mã của lối ra chung, em đã đổi cách nghĩ ở phòng nào? Em kể một lần mình sửa cách làm.',
    },
    ending: 'Mê cung sáng đèn và tấm bản đồ lối ra được trao cho mọi đội. Em giữ bản đồ để khám phá những phòng mới.',
    partialEnding: 'Mê cung còn một mảnh mã chưa ghép nên lối ra mới hé mở. Em giữ các mảnh đã kiểm tra để tiếp tục lần sau.',
  },
};
const reading = {
  modern: { title: 'UNESCO — Hoi An Ancient Town', url: 'https://whc.unesco.org/en/list/948', use: 'optional_teacher_context' },
  historical: { title: 'UNESCO — Central Sector of the Imperial Citadel of Thang Long — Hanoi', url: 'https://whc.unesco.org/en/list/1328', use: 'optional_teacher_context' },
};
export const LESSON_ARCS = Object.freeze(['formation', 'practice', 'review']);

export const STORY_PROFILES = Object.freeze(Object.fromEntries(Object.entries(PRODUCT_THEMES).map(([id, theme]) => {
  const w = worlds[id];
  return [id, Object.freeze({
    title: theme.title, goal: theme.goal, places: Object.freeze([...theme.places]), clue: w.clue,
    opening: w.openings.formation,
    openings: Object.freeze({ ...w.openings }),
    cues: Object.freeze({ ...w.cues }),
    ending: w.ending,
    partialEnding: w.partialEnding,
    culture: Object.freeze({ kind: 'fiction', notice: 'Thế giới, nhân vật và biến cố là hư cấu; nguồn đọc thêm không xác nhận tình tiết trong truyện.',
      furtherReading: Object.freeze(reading[id] ? [Object.freeze({ ...reading[id] })] : []) }),
  })];
})));

// Loại tiết suy từ gói bài: ôn tập (câu hỏi trọng tâm "ôn tập/hệ thống" hoặc ≥4 mục tiêu không có pha hình thành),
// hình thành (có pha formation), còn lại là luyện tập.
export function lessonArc(pkg) {
  const activities = Array.isArray(pkg?.activities) ? pkg.activities : [];
  const formation = activities.some(a => a?.phase === 'formation');
  if (/ôn tập|hệ thống/iu.test(String(pkg?.essentialQuestion || '')) || (!formation && (pkg?.objectives?.length || 0) >= 4)) return 'review';
  return formation ? 'formation' : 'practice';
}

export function storyCue({ theme = 'modern', phase, concluded = false, complete = false, arc } = {}) {
  const profile = typeof theme === 'string' && Object.hasOwn(STORY_PROFILES, theme) ? STORY_PROFILES[theme] : STORY_PROFILES.modern;
  if (concluded === true) return complete === true ? profile.ending : profile.partialEnding;
  if (typeof phase === 'string' && Object.hasOwn(profile.cues, phase)) return profile.cues[phase];
  return typeof arc === 'string' && Object.hasOwn(profile.openings, arc) ? profile.openings[arc] : profile.opening;
}
