export default [
  {
    "key": "12-13-94",
    "grade": 12,
    "week": 13,
    "period": 94,
    "lessonType": "formation",
    "timelineKey": "default",
    "date": "2026-11-04",
    "timeMap": [
      [
        "HĐ 1 Khởi động — tình huống trục thực nghiệm",
        "P0–P3",
        "S0 + S1"
      ],
      [
        "HĐ 1.2 Mục tiêu M/S/C",
        "P3–P5",
        "S2"
      ],
      [
        "HĐ 2.1 Hình thành kiến thức + làm mẫu",
        "P5–P10",
        "S3"
      ],
      [
        "HĐ 2.2 AI Error + chốt quy tắc",
        "P10–P13",
        "S4 + S5"
      ],
      [
        "HĐ 3 Luyện tập phân hoá 3 luồng",
        "P14–P21",
        "S6"
      ],
      [
        "HĐ 3.2 Post-check & ĐGTX",
        "P21–P24",
        "S7"
      ],
      [
        "HĐ 4 Kiểm tra nhanh",
        "P24–P29",
        "S8"
      ],
      [
        "HĐ 4.2 Ứng dụng thực tế",
        "P29–P37",
        "S9"
      ],
      [
        "HĐ 5 Exit Ticket & tổng kết",
        "P37–P40",
        "S10"
      ]
    ],
    "title": "Tính chất tuyến tính và cộng đoạn tích phân",
    "goals": {
      "must": "Nắm vững tính chất tuyến tính: ∫ [k f(x) ± m g(x)] dx = k ∫ f(x) dx ± m ∫ g(x) dx; tính chất cộng đoạn: ∫_a^b = ∫_a^c + ∫_c^b (chèn cận c).",
      "should": "Áp dụng tính chất chèn cận để tính tích phân các hàm số phân nhánh và hàm số chứa dấu giá trị tuyệt đối.",
      "could": "Chứng minh bất đẳng thức tích phân: nếu f(x) ≤ g(x) trên [a; b] thì ∫_a^b f(x) dx ≤ ∫_a^b g(x) dx."
    },
    "opening": "Tính tổng lượng điện tiêu thụ của cả một thành phố trong ngày bằng cách cộng lượng điện của từng khu dân cư và từng ca trực — đó là tính chất tuyến tính và cộng đoạn tích phân.",
    "focusQuestion": "Điểm chèn c trong công thức ∫_a^b = ∫_a^c + ∫_c^b có bắt buộc phải nằm giữa a và b không?",
    "axis": "**Mô hình tính lượng nước xả qua đập thủy điện Hòa Bình qua hai ca trực:**\n- Lưu lượng nước xả qua tổ máy thủy điện trong 24 giờ chia làm 2 giai đoạn:\n  - Ca 1 (từ $t = 0$ đến $t = 8$ giờ): $q_1(t) = 100 + 10t$ ($m^3/s$).\n  - Ca 2 (từ $t = 8$ đến $t = 24$ giờ): $q_2(t) = 180$ ($m^3/s$ không đổi).\n- Tổng lượng nước xả trong cả ngày ($0 \\to 24$ giờ):\n  $$V = \\int_0^{24} q(t) dt = \\int_0^8 q_1(t) dt + \\int_8^{24} q_2(t) dt.$$\n- Tính từng tích phân thành phần:\n  - $V_1 = \\int_0^8 (100 + 10t) dt = (100t + 5t^2)\\Big|_0^8 = 800 + 320 = 1120$ đơn vị.\n  - $V_2 = \\int_8^{24} 180 dt = 180(24 - 8) = 180 \\cdot 16 = 2880$ đơn vị.\n- Tổng lượng nước xả: $V = 1120 + 2880 = 4000$ đơn vị thể tích.\n- **Tính chất cộng đoạn:** $\\int_a^b f(x) dx = \\int_a^c f(x) dx + \\int_c^b f(x) dx$ đúng với mọi điểm $c$ bất kỳ thuộc tập xác định.",
    "s1": {
      "title": "Tổng lượng nước xả qua hai ca trực",
      "context": "Hàm lưu lượng gãy khúc tại điểm t = 8 giờ. Ta tách thành hai tích phân từ 0 đến 8 và từ 8 đến 24.",
      "question": "Tổng lượng nước xả trong cả ngày tính bằng công thức nào?",
      "options": [
        "∫_0^8 q1(t) dt + ∫_8^24 q2(t) dt",
        "∫_0^24 [q1(t) + q2(t)] dt",
        "Chỉ cần tính ∫_8^24 q2(t) dt"
      ],
      "correct": 0,
      "why": "Theo tính chất cộng đoạn của tích phân, tích phân trên đoạn [0; 24] bằng tổng tích phân trên [0; 8] và [8; 24].",
      "discuss": [
        "`[PHÁT HIỆN]` Điểm nối t = 8 có cần liên tục không?",
        "`[SO SÁNH]` Tính chất cộng đoạn tích phân tương ứng với tính chất cộng đoạn thẳng nào?"
      ],
      "cue": "Vẽ đồ thị lưu lượng gồm hai đoạn thẳng nối nhau tại điểm x = 8.",
      "lookFor": "HS nhận ra công thức chèn cận tích phân."
    },
    "s3": {
      "title": "Hệ thống các tính chất cơ bản của tích phân",
      "steps": [
        "Tính chất 1 (Hằng số đưa ra ngoài): $\\int_a^b k f(x) dx = k \\int_a^b f(x) dx$ ($k$ là hằng số thực).",
        "Tính chất 2 (Tuyến tính tổng/hiệu): $\\int_a^b [f(x) \\pm g(x)] dx = \\int_a^b f(x) dx \\pm \\int_a^b g(x) dx$.",
        "Tính chất 3 (Cộng đoạn / chèn cận): $\\int_a^b f(x) dx = \\int_a^c f(x) dx + \\int_c^b f(x) dx$ ($c$ tùy ý).",
        "Tính chất 4 (Bảo toàn thứ tự): Nếu $f(x) \\ge 0$ trên $[a; b]$ ($a < b$) thì $\\int_a^b f(x) dx \\ge 0$."
      ],
      "ask": [
        "`[SUY LUẬN]` Biểu thức ∫_1^5 f(x) dx - ∫_2^5 f(x) dx rút gọn thành gì?",
        "`[PHÁT HIỆN]` Khi nào thì phải chèn cận để tính tích phân có dấu giá trị tuyệt đối |x - a|?"
      ],
      "cue": "Quy tắc chèn cận: đuôi của tích phân trước là đầu của tích phân sau.",
      "close": "Tích phân có tính tuyến tính và cộng đoạn; muốn phá trị tuyệt đối bắt buộc phải chèn nghiệm của biểu thức."
    },
    "s4": {
      "bat": "AI giải: Cho ∫_1^2 f(x) dx = 3 và ∫_1^4 f(x) dx = 7. Tính ∫_2^4 f(x) dx. AI viết: ∫_2^4 = ∫_1^2 + ∫_1^4 = 3 + 7 = 10.",
      "chung": "Áp dụng sai công thức cộng đoạn. Công thức đúng: ∫_1^4 = ∫_1^2 + ∫_2^4. Do đó ∫_2^4 = ∫_1^4 - ∫_1^2.",
      "sua": "Sửa lại: ∫_2^4 f(x) dx = ∫_1^4 f(x) dx - ∫_1^2 f(x) dx = 7 - 3 = 4.",
      "cue": "Nhắc lại: Chèn cận 2 vào giữa 1 và 4: Đoạn lớn bằng tổng hai đoạn nhỏ.",
      "lookFor": "HS chỉ ra phép trừ thay vì phép cộng."
    },
    "s6": {
      "hints": {
        "M": "áp dụng ∫_a^b = ∫_a^c + ∫_c^b; chú ý cận dưới và cận trên nối tiếp nhau.",
        "S": "tách tích phân tổng thành tổng hai tích phân; đưa hệ số k ra ngoài.",
        "C": "tìm nghiệm của biểu thức trong dấu giá trị tuyệt đối rồi chèn nghiệm đó làm cận trung gian."
      },
      "lookFor": "HS M chèn đúng cận; HS S đưa đúng hệ số ra ngoài; HS C phá đúng trị tuyệt đối."
    },
    "postCheck": {
      "q": "Cho $\\int_0^3 f(x) dx = 5$ và $\\int_0^3 g(x) dx = 2$. Tính $I = \\int_0^3 [3f(x) - 4g(x)] dx$.",
      "a": "Theo tính chất tuyến tính: $I = 3 \\int_0^3 f(x) dx - 4 \\int_0^3 g(x) dx = 3(5) - 4(2) = 15 - 8 = 7$.",
      "ds": [
        {
          "t": "\"∫_a^b f(x) dx = ∫_a^c f(x) dx + ∫_c^b f(x) dx với mọi c\"",
          "v": "Đúng"
        },
        {
          "t": "\"∫_a^b [f(x) · g(x)] dx = [∫_a^b f(x) dx] · [∫_a^b g(x) dx]\"",
          "v": "Sai — tích phân của tích không bằng tích các tích phân"
        },
        {
          "t": "\"∫_a^b k dx = k(b - a)\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra kết quả tính 15 - 8 = 7."
    },
    "s8Close": "Tuyến tính: ∫(3f - 4g) = 3∫f - 4∫g; Cộng đoạn: ∫_a^b = ∫_a^c + ∫_c^b; Trị tuyệt đối: chèn nghiệm.",
    "s9": {
      "title": "Hệ thống tính cước viễn thông và điện năng bậc thang",
      "bullets": [
        "Biểu giá điện sinh hoạt bậc thang (bậc 1 đến bậc 6) là hàm số từng khúc liên tục.",
        "Hệ thống phần mềm EVN tính hóa đơn tiền điện hàng tháng bằng phương pháp cộng đoạn tích phân từng mức tiêu thụ.",
        "Toán học tích phân bậc thang đảm bảo tính minh bạch và công bằng tài chính."
      ],
      "cue": "Hỏi: \"Tại sao dùng càng nhiều điện thì đơn giá tiền điện cho mỗi kWh vượt định mức lại càng tăng cao?\""
    },
    "exit": [
      "Nêu tính chất tuyến tính của tích phân.",
      "Nêu 1 bẫy (nhầm tích phân của tích bằng tích hai tích phân).",
      "Tự đánh giá M / S / C.",
      "Cho ∫_1^3 f = 2, ∫_3^5 f = 4. Tính ∫_1^5 f."
    ],
    "exitCue": "Nhìn lại tình huống xả nước thủy điện Hòa Bình.",
    "after": "- Chuẩn bị bài tiếp theo: Tính chất đổi cận và tính chất hàm số chẵn lẻ.",
    "snapshot": {
      "focus": "Nắm vững các tính chất cơ bản của tích phân: tính chất tuyến tính, tính chất cộng đoạn (chèn cận), tính chất bảo toàn thứ tự và kỹ thuật xử lý hàm chứa trị tuyệt đối.",
      "formulas": [
        "\\int_a^b [k f(x) \\pm m g(x)] dx = k \\int_a^b f(x) dx \\pm m \\int_a^b g(x) dx",
        "\\int_a^b f(x) dx = \\int_a^c f(x) dx + \\int_c^b f(x) dx \\quad (\\forall c)",
        "f(x) \\le g(x) \\implies \\int_a^b f(x) dx \\le \\int_a^b g(x) dx \\quad (a < b)"
      ],
      "boardKnowledge": [
        "I. Tính chất tuyến tính: Đưa hằng số ra ngoài; Tích phân của tổng/hiệu bằng tổng/hiệu các tích phân.",
        "II. Tính chất cộng đoạn: Nối cận liên tiếp: [a -> c] + [c -> b] = [a -> b].",
        "III. Dấu trị tuyệt đối |f(x)|: Tìm nghiệm f(x)=0 trên [a; b], chèn nghiệm làm cận rồi phá dấu."
      ],
      "examples": [
        {
          "question": "Cho ∫_0^2 f(x) dx = 3 và ∫_2^5 f(x) dx = 7. Tính ∫_0^5 f(x) dx và ∫_5^0 f(x) dx.",
          "solution": "Áp dụng cộng đoạn: ∫_0^5 f(x) dx = ∫_0^2 + ∫_2^5 = 3 + 7 = 10. Đổi cận: ∫_5^0 f(x) dx = - ∫_0^5 f(x) dx = -10."
        },
        {
          "question": "Tính tích phân: I = ∫_0^3 |x - 2| dx.",
          "solution": "Nghiệm x = 2 thuộc [0; 3]. Chèn cận 2: I = ∫_0^2 (2 - x) dx + ∫_2^3 (x - 2) dx = (2x - x²/2)|_0^2 + (x²/2 - 2x)|_2^3 = (4 - 2) + [(9/2 - 6) - (2 - 4)] = 2 + [-3/2 + 2] = 2 + 1/2 = 5/2 = 2,5."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Nếu ∫_1^4 f(x) dx = 6 thì ∫_1^4 3 f(x) dx bằng bao nhiêu?",
          "answer": "Bằng 3 · 6 = 18."
        },
        {
          "level": "NB",
          "question": "Tính ∫_1^5 f(x) dx biết ∫_1^3 f = 4 và ∫_3^5 f = 5.",
          "answer": "Bằng 4 + 5 = 9."
        },
        {
          "level": "TH",
          "question": "Cho ∫_0^1 f(x) dx = 2, ∫_0^1 g(x) dx = -3. Tính I = ∫_0^1 [2f(x) + g(x)] dx.",
          "answer": "I = 2(2) + (-3) = 4 - 3 = 1."
        },
        {
          "level": "TH",
          "question": "Cho ∫_1^6 f(x) dx = 12 và ∫_3^6 f(x) dx = 8. Tính ∫_1^3 f(x) dx.",
          "answer": "∫_1^3 = ∫_1^6 - ∫_3^6 = 12 - 8 = 4."
        },
        {
          "level": "VD",
          "question": "Tính tích phân: I = ∫_{-1}^2 |2x - 1| dx.",
          "answer": "Nghiệm x = 1/2. I = ∫_{-1}^{1/2} (1 - 2x) dx + ∫_{1/2}^2 (2x - 1) dx = (x - x²)|_{-1}^{1/2} + (x² - x)|_{1/2}^2 = [1/4 - (-2)] + [(4 - 2) - (-1/4)] = 9/4 + 9/4 = 18/4 = 9/2."
        },
        {
          "level": "VD",
          "question": "Cho hàm số f(x) liên tục thỏa mãn ∫_0^6 f(x) dx = 10. Tính I = ∫_0^2 f(3x) dx.",
          "answer": "Đặt u = 3x => du = 3 dx <=> dx = du/3. Đổi cận: x = 0 => u = 0; x = 2 => u = 6. Khi đó I = ∫_0^6 f(u) (du/3) = (1/3) ∫_0^6 f(u) du = 10/3."
        }
      ],
      "quick": [
        {
          "question": "Có bao giờ ∫_a^b [f(x) · g(x)] dx = [∫_a^b f(x) dx] · [∫_a^b g(x) dx] không?",
          "solution": "Hầu như không bao giờ bằng nhau (chỉ là trường hợp ngẫu nhiên vô cùng hy hữu), tích phân không nhân phân phối được."
        },
        {
          "question": "Nếu a > b thì tính chất cộng đoạn có còn đúng không?",
          "solution": "Vẫn đúng hoàn toàn, công thức ∫_a^b = ∫_a^c + ∫_c^b đúng với mọi vị trí của a, b, c."
        }
      ],
      "mistakes": [
        "Tự ý nhân hai tích phân với nhau khi gặp tích phân của một tích.",
        "Cộng nhầm cận: lấy ∫_1^3 + ∫_2^4 thành ∫_1^4 (hai khoảng chia không khớp nhau).",
        "Quên đổi dấu biểu thức khi phá trị tuyệt đối trên miền âm."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI viết: Cho ∫_0^1 f(x) dx = 2 và ∫_0^1 g(x) dx = 3. Tính ∫_0^1 f(x)g(x) dx = [∫_0^1 f(x) dx] · [∫_0^1 g(x) dx] = 2 · 3 = 6.",
      "correction": "Tích phân của tích KHÔNG BẰNG tích của hai tích phân. Tính chất tuyến tính chỉ áp dụng cho tổng và hiệu, tuyệt đối không có tính chất cho phép nhân hai hàm số. Sửa lại: Không thể tính được tích phân ∫_0^1 f(x)g(x) dx chỉ dựa vào hai tích phân thành phần.",
      "proof": "Ví dụ phản chứng đơn giản: Chọn f(x) = x, g(x) = x trên [0; 1]. Ta có ∫_0^1 x dx = 1/2, tích hai tích phân là (1/2) · (1/2) = 1/4. Nhưng tích phân của tích là ∫_0^1 x² dx = 1/3 ≠ 1/4.",
      "whyAiError": "Mô hình học máy mở rộng mù quáng tính chất tuyến tính của phép cộng sang phép nhân.",
      "teacherPrompt": "AI tính tích phân của tích bằng tích hai tích phân và ra kết quả 6. Em hãy chỉ lỗi sai đại số và giải thích sửa lại.",
      "studentProduct": "Ghi “Lỗi đại số: tích phân không nhân phân phối được”, chỉ ra phản chứng ∫ x² ≠ (∫ x)²",
      "boardPrompt": "AI nhân hai tích phân thành phần để tính tích phân của tích. Phép toán này có được thừa nhận trong giải tích không?",
      "libraryTitle": "Lỗi AI nhân phân phối tích phân của một tích hàm số"
    }
  },
  {
    "key": "12-13-95",
    "grade": 12,
    "week": 13,
    "period": 95,
    "lessonType": "formation",
    "timelineKey": "default",
    "date": "2026-11-04",
    "timeMap": [
      [
        "HĐ 1 Khởi động — tình huống trục thực nghiệm",
        "P0–P3",
        "S0 + S1"
      ],
      [
        "HĐ 1.2 Mục tiêu M/S/C",
        "P3–P5",
        "S2"
      ],
      [
        "HĐ 2.1 Hình thành kiến thức + làm mẫu",
        "P5–P10",
        "S3"
      ],
      [
        "HĐ 2.2 AI Error + chốt quy tắc",
        "P10–P13",
        "S4 + S5"
      ],
      [
        "HĐ 3 Luyện tập phân hoá 3 luồng",
        "P14–P21",
        "S6"
      ],
      [
        "HĐ 3.2 Post-check & ĐGTX",
        "P21–P24",
        "S7"
      ],
      [
        "HĐ 4 Kiểm tra nhanh",
        "P24–P29",
        "S8"
      ],
      [
        "HĐ 4.2 Ứng dụng thực tế",
        "P29–P37",
        "S9"
      ],
      [
        "HĐ 5 Exit Ticket & tổng kết",
        "P37–P40",
        "S10"
      ]
    ],
    "title": "Tính chất đổi cận và hàm số chẵn lẻ",
    "goals": {
      "must": "Nắm vững quy tắc đổi cận trong phương pháp đổi biến số tích phân và tính chất tích phân hàm chẵn, hàm lẻ trên đoạn đối xứng [-a; a].",
      "should": "Chứng minh và áp dụng nhanh: f(x) là hàm lẻ trên [-a; a] thì ∫_{-a}^a f(x) dx = 0; f(x) là hàm chẵn thì ∫_{-a}^a f(x) dx = 2 ∫_0^a f(x) dx.",
      "could": "Vận dụng tính chất tích phân đặc biệt: ∫_0^a f(x) dx = ∫_0^a f(a - x) dx để giải các bài toán tích phân lượng giác kinh điển."
    },
    "opening": "Tính tích phân một biểu thức cực kỳ phức tạp trên đoạn [-2026; 2026] chỉ trong 1 giây mà không cần tìm nguyên hàm — đó là sức mạnh kỳ diệu của tính chất hàm số chẵn lẻ đối xứng.",
    "focusQuestion": "Tại sao tích phân của một hàm số lẻ trên đoạn đối xứng [-a; a] luôn luôn bằng 0?",
    "axis": "**Mô hình cân bằng mô-men lực quay trên thanh đòn bẩy đối xứng:**\n- Một thanh đòn bẩy đặt trên trục hoành từ $x = -2$ đến $x = 2$ (mét).\n- Mật độ lực phân bố lệch theo hàm số lẻ:\n  $$f(x) = x^3 + \\sin x \\quad (\\text{Newton/mét}).$$\n- Nhận xét tính đối xứng: $f(-x) = (-x)^3 + \\sin(-x) = -x^3 - \\sin x = -f(x)$ (đây là **hàm số lẻ**).\n- Đồ thị nhận gốc tọa độ $O$ làm tâm đối xứng:\n  - Phần phía bên phải ($x \\in [0; 2]$) có diện tích $S$.\n  - Phần phía bên trái ($x \\in [-2; 0]$) có hình dạng giống hệt nhưng nằm phía dưới trục hoành, đóng góp giá trị $-S$.\n- **Tổng đại số tích phân trên toàn đoạn:**\n  $$\\int_{-2}^2 (x^3 + \\sin x) dx = \\int_{-2}^0 f(x) dx + \\int_0^2 f(x) dx = -S + S = 0.$$\n- Mô-men lực hai bên tự triệt tiêu hoàn toàn, thanh đòn bẩy đạt trạng thái cân bằng tuyệt đối.\n- **Định lý hàm lẻ:** Nếu $f(x)$ là hàm số lẻ liên tục trên đoạn đối xứng $[-a; a]$ thì:\n  $$\\int_{-a}^a f(x) dx = 0.$$",
    "s1": {
      "title": "Thanh đòn bẩy tự cân bằng",
      "context": "Hàm mật độ lực f(x) = x³ + sin x là hàm số lẻ trên đoạn [-2; 2].",
      "question": "Tích phân ∫_{-2}^2 (x³ + sin x) dx có giá trị bằng bao nhiêu?",
      "options": [
        "Bằng 0 (tự triệt tiêu do tính đối xứng lẻ)",
        "Bằng 16",
        "Không xác định"
      ],
      "correct": 0,
      "why": "Vì f(x) là hàm số lẻ và đoạn lấy tích phân đối xứng qua gốc tọa độ [-2; 2] nên tích phân bằng 0.",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu f(x) = x² là hàm chẵn thì tích phân trên [-2; 2] bằng bao nhiêu lần tích phân trên [0; 2]?",
        "`[SO SÁNH]` Tại sao khi đổi biến số tích phân BẮT BUỘC phải đổi cận?"
      ],
      "cue": "Vẽ đồ thị hàm lẻ đối xứng qua gốc O, hai miền diện tích triệt tiêu nhau.",
      "lookFor": "HS nhận ra tính chất hàm lẻ trên đoạn đối xứng bằng 0."
    },
    "s3": {
      "title": "Định lý tích phân hàm chẵn, hàm lẻ và quy tắc đổi cận",
      "steps": [
        "Quy tắc đổi cận: Khi đổi biến $u = u(x)$, bắt buộc đổi cận: $x = a \\implies u = u(a)$; $x = b \\implies u = u(b)$.",
        "Định lý Hàm Lẻ: Nếu $f(-x) = -f(x)$ thì $\\int_{-a}^a f(x) dx = 0$.",
        "Định lý Hàm Chẵn: Nếu $f(-x) = f(x)$ thì $\\int_{-a}^a f(x) dx = 2 \\int_0^a f(x) dx$.",
        "Công thức đảo cận $f(a - x)$: $\\int_0^a f(x) dx = \\int_0^a f(a - x) dx$."
      ],
      "ask": [
        "`[SUY LUẬN]` Hàm số nào vừa chẵn vừa lẻ trên toàn trục số?",
        "`[PHÁT HIỆN]` Nếu đổi biến số tích phân mà quên đổi cận thì kết quả sẽ sai lệch như thế nào?"
      ],
      "cue": "Bảng đối chiếu hàm chẵn (đối xứng qua Oy) và hàm lẻ (đối xứng qua O).",
      "close": "Hàm lẻ trên [-a; a] bằng 0; Hàm chẵn bằng 2 lần [0; a]; Đổi biến tích phân là BẮT BUỘC phải đổi cận."
    },
    "s4": {
      "bat": "AI giải: Tính I = ∫_0^1 2x(x² + 1)³ dx. Đặt u = x² + 1 => du = 2x dx. AI viết I = ∫_0^1 u³ du = u⁴/4 |_0^1 = 1/4.",
      "chung": "Sai lầm kinh điển: Quên đổi cận. Cận 0 và 1 là của biến x, khi chuyển sang biến u thì cận phải là u(0) = 1 và u(1) = 2. Để nguyên cận cũ dẫn đến sai kết quả hoàn toàn.",
      "sua": "Phải đổi cận: x = 0 => u = 1; x = 1 => u = 2. Tích phân đúng là ∫_1^2 u³ du = u⁴/4 |_1^2 = (16 - 1)/4 = 15/4.",
      "cue": "Khẩu quyết nằm lòng: \"Đổi biến là phải ĐỔI CẬN\".",
      "lookFor": "HS phát hiện ngay lỗi quên đổi cận khi đổi biến."
    },
    "s6": {
      "hints": {
        "M": "lập bảng đổi cận: dòng x, dòng u; thay cận dưới và cận trên vào biểu thức u.",
        "S": "nhận diện hàm lẻ (f(-x) = -f(x)) trên đoạn [-a; a] để kết luận ngay tích phân bằng 0.",
        "C": "áp dụng I = ∫_0^a f(x)dx = ∫_0^a f(a-x)dx rồi cộng 2I để khử biểu thức phức tạp."
      },
      "lookFor": "HS M đổi cận đúng; HS S tính nhanh hàm lẻ; HS C giải bài toán tích phân đối xứng."
    },
    "postCheck": {
      "q": "Tính nhanh tích phân: $I = \\int_{-\\pi/4}^{\\pi/4} \\dfrac{\\sin^3 x}{x^2 + 1} dx$.",
      "a": "Hàm số $f(x) = \\dfrac{\\sin^3 x}{x^2 + 1}$ thỏa mãn $f(-x) = \\dfrac{\\sin^3(-x)}{(-x)^2 + 1} = -f(x)$ là hàm số lẻ. Đoạn $[-\\pi/4; \\pi/4]$ đối xứng qua 0 nên $I = 0$.",
      "ds": [
        {
          "t": "\"Đổi biến số tích phân xác định bắt buộc phải đổi cận\"",
          "v": "Đúng"
        },
        {
          "t": "\"Tích phân hàm chẵn trên [-a; a] luôn luôn bằng 0\"",
          "v": "Sai — hàm lẻ mới bằng 0, hàm chẵn bằng 2 lần"
        },
        {
          "t": "\"∫_{-1}^1 x^5 dx = 0\"",
          "v": "Đúng (x^5 là hàm lẻ)"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra nhận diện hàm lẻ ra kết quả 0."
    },
    "s8Close": "Đổi biến -> Đổi cận; Hàm lẻ trên [-a; a] = 0; Hàm chẵn trên [-a; a] = 2∫_0^a; ∫_0^a f(x) = ∫_0^a f(a-x).",
    "s9": {
      "title": "Xử lý ảnh thị giác máy tính và bộ lọc đối xứng Gaussian",
      "bullets": [
        "Bộ lọc làm nét và xóa mờ ảnh trong Photoshop sử dụng ma trận nhân chập có hàm phân bố chẵn Gauss.",
        "Tính đối xứng chẵn giúp giảm 50% khối lượng tính toán ma trận vi tích phân của card đồ họa GPU.",
        "Toán học đối xứng tăng tốc độ kết xuất hình ảnh thời gian thực trong game 3D."
      ],
      "cue": "Hỏi: \"Làm thế nào camera điện thoại làm mờ hậu cảnh (chụp chân dung xóa phông) chỉ trong tích tắc?\""
    },
    "exit": [
      "Phát biểu định lý tích phân hàm chẵn và hàm lẻ trên [-a; a].",
      "Nêu 1 bẫy (đổi biến nhưng quên đổi cận).",
      "Tự đánh giá M / S / C.",
      "Tính tích phân ∫_{-2}^2 x² dx bằng cách nhân đôi tích phân trên [0; 2]."
    ],
    "exitCue": "Nhìn lại hình ảnh đòn bẩy đối xứng tự cân bằng.",
    "after": "- Chuẩn bị bài tiếp theo: Luyện tập tính tích phân cơ bản.",
    "snapshot": {
      "focus": "Nắm vững quy tắc đổi cận khi đổi biến số tích phân; vận dụng định lý tích phân của hàm số chẵn và hàm số lẻ trên đoạn đối xứng; kỹ thuật tích phân đối xứng liên hợp.",
      "formulas": [
        "\\int_a^b f(u(x)) u'(x) dx = \\int_{u(a)}^{u(b)} f(u) du",
        "f(-x) = -f(x) \\implies \\int_{-a}^a f(x) dx = 0",
        "f(-x) = f(x) \\implies \\int_{-a}^a f(x) dx = 2 \\int_0^a f(x) dx",
        "\\int_0^a f(x) dx = \\int_0^a f(a - x) dx"
      ],
      "boardKnowledge": [
        "I. Đổi biến tích phân: Bắt buộc đổi cận (x = a -> u = u(a), x = b -> u = u(b)). KHÔNG cần trả lại biến x.",
        "II. Hàm lẻ trên [-a; a]: f(-x) = -f(x) -> Tích phân bằng 0 ngay lập tức.",
        "III. Hàm chẵn trên [-a; a]: f(-x) = f(x) -> Bằng 2 lần tích phân từ 0 đến a."
      ],
      "examples": [
        {
          "question": "Tính tích phân: I = ∫_0^1 x√(1 - x²) dx.",
          "solution": "Đặt u = √(1 - x²) => u² = 1 - x² => 2u du = -2x dx <=> x dx = -u du. Đổi cận: x = 0 => u = 1; x = 1 => u = 0. Khi đó I = ∫_1^0 u (-u du) = ∫_0^1 u² du = u³/3 |_0^1 = 1/3."
        },
        {
          "question": "Tính tích phân: I = ∫_{-1}^1 (2x³ - 3x² + x - 5) dx.",
          "solution": "Tách phần lẻ và chẵn: Các số hạng lẻ (2x³ + x) có tích phân trên [-1; 1] bằng 0. Các số hạng chẵn: I = 2 ∫_0^1 (-3x² - 5) dx = 2 (-x³ - 5x)|_0^1 = 2 (-1 - 5) = -12."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Tích phân ∫_{-3}^3 x²⁰²⁵ dx có giá trị bằng bao nhiêu?",
          "answer": "Bằng 0 vì x²⁰²⁵ là hàm số lẻ trên đoạn đối xứng [-3; 3]."
        },
        {
          "level": "NB",
          "question": "Khi đặt u = 2x + 1 trong tích phân cận từ 0 đến 2, cận của u là từ mấy đến mấy?",
          "answer": "Cận dưới u(0) = 1, cận trên u(2) = 5 (cận từ 1 đến 5)."
        },
        {
          "level": "TH",
          "question": "Biết f(x) là hàm chẵn trên [-2; 2] và ∫_0^2 f(x) dx = 4. Tính ∫_{-2}^2 f(x) dx.",
          "answer": "∫_{-2}^2 f(x) dx = 2 · 4 = 8."
        },
        {
          "level": "TH",
          "question": "Tính I = ∫_{-π/2}^{π/2} cos x dx bằng tính chất hàm chẵn.",
          "answer": "cos x là hàm chẵn nên I = 2 ∫_0^{π/2} cos x dx = 2 sin x |_0^{π/2} = 2(1 - 0) = 2."
        },
        {
          "level": "VD",
          "question": "Tính tích phân: I = ∫_0^{\\pi/2} \\dfrac{\\sin x}{\\sin x + \\cos x} dx.",
          "answer": "Đặt x = π/2 - t => dx = -dt. Đổi cận: x = 0 => t = π/2; x = π/2 => t = 0. Khi đó I = ∫_0^{π/2} [cos t / (cos t + sin t)] dt. Cộng hai tích phân: 2I = ∫_0^{π/2} [(sin x + cos x)/(sin x + cos x)] dx = ∫_0^{π/2} 1 dx = π/2 => I = π/4."
        },
        {
          "level": "VD",
          "question": "Tính tích phân: I = ∫_{-1}^1 \\dfrac{x^4}{e^x + 1} dx.",
          "answer": "Đặt x = -t => dx = -dt. Đổi cận ra I = ∫_{-1}^1 [t⁴ / (e^{-t} + 1)] dt = ∫_{-1}^1 [t⁴ e^t / (e^t + 1)] dt. Cộng lại: 2I = ∫_{-1}^1 [x⁴(e^x + 1)/(e^x + 1)] dx = ∫_{-1}^1 x⁴ dx = 2 ∫_0^1 x⁴ dx = 2/5 => I = 1/5."
        }
      ],
      "quick": [
        {
          "question": "Tại sao trong tích phân xác định ta không cần bước trả lại biến x sau khi đổi biến?",
          "solution": "Vì tích phân chỉ phụ thuộc vào hàm số và các cận số, sau khi đổi cận theo biến u thì giá trị tính theo u chính là giá trị cuối cùng của bài toán."
        },
        {
          "question": "Tích của hai hàm số lẻ là hàm chẵn hay hàm lẻ?",
          "solution": "Là hàm chẵn ((-f)(-g) = fg)."
        }
      ],
      "mistakes": [
        "Quên đổi cận khi thực hiện phép đổi biến số tích phân.",
        "Nhầm tính chất: cho rằng hàm chẵn có tích phân bằng 0.",
        "Đổi cận bị ngược thứ tự cận (cận nhỏ đặt ở trên, cận lớn đặt ở dưới mà quên đổi dấu tích phân)."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI giải: Tính I = ∫_0^2 2x(x² + 1) dx. Đặt u = x² + 1 => du = 2x dx. AI giữ nguyên cận: I = ∫_0^2 u du = u²/2 |_0^2 = (4 - 0)/2 = 2.",
      "correction": "AI quên hoàn toàn bước đổi cận. Cận 0 và 2 là của biến x. Khi đổi sang u = x² + 1 thì cận đúng phải là: x = 0 => u = 1; x = 2 => u = 5. Sửa lại: Tích phân chuẩn là ∫_1^5 u du = u²/2 |_1^5 = (25 - 1)/2 = 12.",
      "proof": "Giải bằng cách khai triển trực tiếp không đổi biến: I = ∫_0^2 (2x³ + 2x) dx = (x⁴/2 + x²)|_0^2 = (16/2 + 4) - 0 = 8 + 4 = 12. Kết quả 12 trùng khớp với phép đổi cận chuẩn, kết quả 2 của AI là sai hoàn toàn.",
      "whyAiError": "Mô hình nhầm lẫn giữa nguyên hàm (không có cận, phải trả lại biến) và tích phân xác định (có cận, bắt buộc đổi cận).",
      "teacherPrompt": "AI tính tích phân bằng đổi biến nhưng giữ nguyên cận x = 0 và x = 2. Em hãy chỉ lỗi sai và sửa lại bước đổi cận đúng.",
      "studentProduct": "Ghi “Lỗi đại số: quên đổi cận khi đổi biến số”, đổi cận thành u ∈ [1; 5] và tính ra kết quả 12.",
      "boardPrompt": "AI không đổi cận khi đặt ẩn phụ u. Khi đổi biến tích phân có bắt buộc đổi cận không?",
      "libraryTitle": "Lỗi AI quên đổi cận khi tính tích phân xác định bằng đổi biến số"
    }
  },
  {
    "key": "12-13-96",
    "grade": 12,
    "week": 13,
    "period": 96,
    "lessonType": "practice",
    "timelineKey": "default",
    "date": "2026-11-04",
    "timeMap": [
      [
        "HĐ 1 Khởi động — tình huống trục thực nghiệm",
        "P0–P3",
        "S0 + S1"
      ],
      [
        "HĐ 1.2 Mục tiêu M/S/C",
        "P3–P5",
        "S2"
      ],
      [
        "HĐ 2.1 Hình thành kiến thức + làm mẫu",
        "P5–P10",
        "S3"
      ],
      [
        "HĐ 2.2 AI Error + chốt quy tắc",
        "P10–P13",
        "S4 + S5"
      ],
      [
        "HĐ 3 Luyện tập phân hoá 3 luồng",
        "P14–P21",
        "S6"
      ],
      [
        "HĐ 3.2 Post-check & ĐGTX",
        "P21–P24",
        "S7"
      ],
      [
        "HĐ 4 Kiểm tra nhanh",
        "P24–P29",
        "S8"
      ],
      [
        "HĐ 4.2 Ứng dụng thực tế",
        "P29–P37",
        "S9"
      ],
      [
        "HĐ 5 Exit Ticket & tổng kết",
        "P37–P40",
        "S10"
      ]
    ],
    "title": "Luyện tập tính tích phân cơ bản",
    "goals": {
      "must": "Tính thành thạo các tích phân cơ bản của hàm đa thức, phân thức, hàm mũ và lượng giác bằng công thức Newton - Leibniz.",
      "should": "Kết hợp linh hoạt phương pháp đổi biến số và nguyên hàm từng phần có gắn cận số cụ thể.",
      "could": "Giải quyết các bài toán tích phân chứa tham số m và ứng dụng tính diện tích, quãng đường thực tế."
    },
    "opening": "Hôm nay ta tổng ôn và rèn luyện kỹ năng giải nhanh, chính xác tuyệt đối các dạng tích phân then chốt trong đề thi tốt nghiệp THPT.",
    "focusQuestion": "Công thức tích phân từng phần có gắn cận khác với công thức nguyên hàm từng phần ở điểm nào?",
    "axis": "**Mô hình công thức tích phân từng phần có gắn cận:**\n- Xuất phát từ công thức nguyên hàm từng phần $\\int u dv = uv - \\int v du$.\n- Khi gắn hai cận $a$ và $b$, công thức trở thành:\n  $$\\int_a^b u dv = u \\cdot v \\Big|_a^b - \\int_a^b v du.$$\n- **Áp dụng tính tích phân điển hình:** $I = \\int_0^1 x e^x dx$.\n  - Đặt $u = x \\implies du = dx$.\n  - Đặt $dv = e^x dx \\implies v = e^x$.\n  - Ráp cận vào công thức:\n    $$I = x e^x \\Big|_0^1 - \\int_0^1 e^x dx = (1 \\cdot e^1 - 0 \\cdot e^0) - e^x \\Big|_0^1 = e - (e^1 - e^0) = e - e + 1 = 1.$$\n- **Nhận xét quan trọng:**\n  - Cụm $uv$ được thế cận trực tiếp: $u(b)v(b) - u(a)v(a)$.\n  - Tích phân còn lại $\\int_a^b v du$ giữ nguyên hai cận $a$ và $b$ ban đầu.",
    "s1": {
      "title": "Tích phân từng phần có cận x e^x",
      "context": "Biểu thức tích giữa x và e^x trên đoạn [0; 1]. Ta chọn u = x, dv = e^x dx.",
      "question": "Giá trị tích phân I = ∫_0^1 x e^x dx bằng bao nhiêu?",
      "options": [
        "Bằng 1",
        "Bằng e - 1",
        "Bằng e"
      ],
      "correct": 0,
      "why": "x e^x |_0^1 - e^x |_0^1 = (e - 0) - (e - 1) = 1.",
      "discuss": [
        "`[PHÁT HIỆN]` Cụm uv|_0^1 thế cận như thế nào?",
        "`[SO SÁNH]` Tích phân từng phần có cần đổi cận như phương pháp đổi biến không?"
      ],
      "cue": "Viết rõ hai bước thế cận: thế cận cho cụm uv và tính tích phân v du.",
      "lookFor": "HS thế đúng cận cho cả uv và tích phân thứ hai."
    },
    "s3": {
      "title": "Cẩm nang phối hợp các phương pháp tính tích phân",
      "steps": [
        "Chiến lược 1 (Trực tiếp): Dùng bảng nguyên hàm cơ bản và tính chất tuyến tính $\\to$ thế cận Newton - Leibniz.",
        "Chiến lược 2 (Đổi biến số): Đặt $u = u(x) \\to$ BẮT BUỘC ĐỔI CẬN $\\to$ tính tích phân theo biến mới $u$.",
        "Chiến lược 3 (Từng phần): $\\int_a^b u dv = uv|_a^b - \\int_a^b v du$ (thế cận cho $uv$ ngay, không cần đổi cận).",
        "Chiến lược 4 (Phân thức hữu tỉ): Chia đa thức nếu bậc tử $\\ge$ bậc mẫu $\\to$ tách thành phân thức đơn giản mẫu bậc nhất."
      ],
      "ask": [
        "`[SUY LUẬN]` Khi gặp ∫_1^e (ln x / x) dx ta dùng đổi biến hay từng phần?",
        "`[PHÁT HIỆN]` Cả hai cách đều ra cùng kết quả không?"
      ],
      "cue": "Sơ đồ cây lựa chọn phương pháp tính tích phân.",
      "close": "Có đạo hàm đi kèm -> Đổi biến; Hai họ hàm khác nhau -> Từng phần; Đa thức/phân thức -> Tách phân số."
    },
    "s4": {
      "bat": "AI giải: Tính I = ∫_1^e ln x dx. AI chọn u = ln x, dv = dx => v = x. AI viết: I = x ln x - ∫_1^e x (1/x) dx = x ln x - x = (e - e) - (0 - 1) = 1 nhưng quên ghi cận ở bước x ln x.",
      "chung": "Bỏ quên ký hiệu cận ở cụm u·v. Trong tích phân từng phần, cụm u·v phải có ký hiệu gạch đứng thế cận u·v|_a^b, không được viết như một hàm số lơ lửng.",
      "sua": "Viết chuẩn mực: I = x ln x |_1^e - ∫_1^e dx = (e ln e - 1 ln 1) - x|_1^e = (e - 0) - (e - 1) = 1.",
      "cue": "Nhắc lại: Biểu thức tích phân có cận thì mọi thành phần đều phải gắn cận.",
      "lookFor": "HS trình bày chuẩn mực dấu thế cận."
    },
    "s6": {
      "hints": {
        "M": "thế cận cẩn thận cho cụm uv; tính riêng từng phần rồi trừ cho nhau.",
        "S": "nhớ tách phân thức bậc tử ≥ bậc mẫu bằng phép chia đa thức.",
        "C": "với tích phân luân hồi, chuyển vế I rồi chia 2 trước khi thế cận."
      },
      "lookFor": "HS M thế cận đúng; HS S chia đa thức chuẩn; HS C tính được tích phân luân hồi."
    },
    "postCheck": {
      "q": "Tính tích phân: $I = \\int_0^1 \\dfrac{1}{2x + 1} dx$.",
      "a": "Nguyên hàm là $\\dfrac{1}{2} \\ln|2x + 1|$. Thế cận: $I = \\dfrac{1}{2} (\\ln 3 - \\ln 1) = \\dfrac{1}{2} \\ln 3 = \\ln\\sqrt{3}$.",
      "ds": [
        {
          "t": "\"∫_a^b u dv = u·v|_a^b - ∫_a^b v du\"",
          "v": "Đúng"
        },
        {
          "t": "\"∫_0^1 1/(2x+1) dx = ln 3\"",
          "v": "Sai — thiếu hệ số 1/2"
        },
        {
          "t": "\"Tích phân từng phần không phải đổi cận\"",
          "v": "Đúng (vì biến vẫn là x)"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra hệ số 1/2 của ln 3."
    },
    "s8Close": "uv|_a^b - ∫_a^b v du; Đổi biến phải đổi cận; Phân thức thì chia bậc; Hệ số 1/a của hàm bậc nhất ax+b.",
    "s9": {
      "title": "Tính toán hiệu suất tấm pin năng lượng mặt trời",
      "bullets": [
        "Cường độ bức xạ mặt trời thay đổi liên tục theo hình sin từ bình minh đến hoàng hôn.",
        "Kỹ sư năng lượng tính tổng công suất điện phát ra trong ngày bằng tích phân xác định của hàm bức xạ.",
        "Tối ưu hóa góc nghiêng của tấm pin mặt trời dựa trên việc cực đại hóa giá trị tích phân này."
      ],
      "cue": "Hỏi: \"Làm thế nào tính được góc lắp đặt pin mặt trời tối ưu nhất cho từng tỉnh thành ở Việt Nam?\""
    },
    "exit": [
      "Nêu công thức tích phân từng phần có gắn cận.",
      "Nêu 1 bẫy (quên hệ số 1/a khi nguyên hàm 1/(ax+b)).",
      "Tự đánh giá M / S / C.",
      "Tính ∫_0^1 2x dx."
    ],
    "exitCue": "Nhìn lại đồ thị bức xạ năng lượng mặt trời.",
    "after": "- Chuẩn bị tiết tự chọn: Kỹ thuật tính nhanh tích phân.",
    "snapshot": {
      "focus": "Luyện tập tổng hợp các kỹ thuật tính tích phân cơ bản: công thức Newton - Leibniz, tích phân từng phần có gắn cận, đổi biến số và xử lý phân thức hữu tỉ.",
      "formulas": [
        "\\int_a^b u dv = u \\cdot v \\Big|_a^b - \\int_a^b v du",
        "\\int_a^b \\dfrac{dx}{ax + b} = \\dfrac{1}{a} \\ln|ax + b| \\Big|_a^b",
        "\\int_a^b e^{kx} dx = \\dfrac{1}{k} e^{kx} \\Big|_a^b"
      ],
      "boardKnowledge": [
        "I. Ba kỹ năng vàng: (1) Bảng công thức cơ bản; (2) Đổi biến số (nhớ đổi cận); (3) Từng phần (thế cận uv).",
        "II. Phân thức hữu tỉ: Bậc tử ≥ mẫu -> Chia đa thức; Mẫu có 2 nghiệm -> Tách A/(x-x1) + B/(x-x2).",
        "III. Bẫy hệ số: Luôn kiểm tra chia cho a khi trong hàm có dạng f(ax + b)."
      ],
      "examples": [
        {
          "question": "Tính tích phân: I = ∫_0^1 (2x + 1) e^x dx.",
          "solution": "u = 2x + 1 => du = 2 dx; dv = e^x dx => v = e^x. I = (2x + 1)e^x |_0^1 - ∫_0^1 2 e^x dx = (3e - 1) - 2(e - 1) = 3e - 1 - 2e + 2 = e + 1."
        },
        {
          "question": "Tính tích phân: I = ∫_2^3 [1 / (x² - 1)] dx.",
          "solution": "Tách phân thức: 1/(x² - 1) = (1/2)[1/(x - 1) - 1/(x + 1)]. I = (1/2) ln|(x - 1)/(x + 1)| |_2^3 = (1/2) [ln(2/4) - ln(1/3)] = (1/2) ln(1/2 : 1/3) = (1/2) ln(3/2)."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Tính tích phân I = ∫_0^1 (3x² + 2x) dx.",
          "answer": "F(x) = x³ + x². I = (1 + 1) - 0 = 2."
        },
        {
          "level": "NB",
          "question": "Trong công thức ∫_a^b u dv = uv|_a^b - ∫_a^b v du, cụm uv được thế cận như thế nào?",
          "answer": "Thế cận: u(b)v(b) - u(a)v(a)."
        },
        {
          "level": "TH",
          "question": "Tính tích phân: I = ∫_0^{\\pi/2} x \\cos x dx.",
          "answer": "u = x => du = dx; dv = cos x dx => v = sin x. I = x sin x |_0^{\\pi/2} - ∫_0^{\\pi/2} sin x dx = (\\pi/2 · 1 - 0) - (-cos x)|_0^{\\pi/2} = \\pi/2 - (0 - (-1)) = \\pi/2 - 1."
        },
        {
          "level": "TH",
          "question": "Tính tích phân: I = ∫_1^2 (2x + 1)/x dx.",
          "answer": "Tách phân thức: I = ∫_1^2 (2 + 1/x) dx = (2x + ln|x|)|_1^2 = (4 + ln 2) - (2 + 0) = 2 + ln 2."
        },
        {
          "level": "VD",
          "question": "Tính tích phân: I = ∫_0^1 [x / (x + 1)²] dx.",
          "answer": "Thêm bớt ở tử: x = (x + 1) - 1. Khi đó x/(x+1)² = 1/(x+1) - 1/(x+1)². I = [ln(x+1) + 1/(x+1)]|_0^1 = (ln 2 + 1/2) - (0 + 1) = ln 2 - 1/2."
        },
        {
          "level": "VD",
          "question": "Cho ∫_0^1 (2x + 1) e^x dx = a·e + b với a, b là các số nguyên. Tính tổng a + b.",
          "answer": "Theo ví dụ mẫu, I = e + 1. Do đó a = 1, b = 1. Tổng a + b = 1 + 1 = 2."
        }
      ],
      "quick": [
        {
          "question": "Có thể bấm máy tính cầm tay để kiểm tra kết quả tích phân xác định không?",
          "solution": "Hoàn toàn được, phím tích phân trên máy tính CASIO/Vinacal cho kết quả xấp xỉ cực nhanh để dò đáp án đúng."
        },
        {
          "question": "Tại sao khi mẫu có nghiệm kép (x + a)² ta không tách thành hai phân số mẫu bậc nhất?",
          "solution": "Vì mẫu nghiệm kép chỉ có một thừa số, ta phải dùng kỹ thuật thêm bớt ở tử để tách thành 1/(x+a) và 1/(x+a)²."
        }
      ],
      "mistakes": [
        "Quên hệ số 1/2 khi nguyên hàm 1/(2x + 1).",
        "Thế sai cận trong cụm uv của tích phân từng phần.",
        "Nhầm ln(a/b) = ln a / ln b thay vì ln a - ln b."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI giải: Tính I = ∫_0^1 dx / (3x + 1). Nguyên hàm F(x) = ln|3x + 1|. Thế cận: I = ln 4 - ln 1 = ln 4.",
      "correction": "Công thức nguyên hàm chuẩn của hàm bậc nhất có hệ số góc: ∫ dx / (ax + b) = (1/a) ln|ax + b| + C. AI đã quên chia cho hệ số a = 3. Sửa lại: Kết quả đúng là (1/3) ln 4 = (2/3) ln 2.",
      "proof": "Đạo hàm kiểm tra lại: [ln(3x + 1)]' = 3 / (3x + 1), thừa ra số 3 so với biểu thức 1 / (3x + 1) của đề bài. Đạo hàm của [(1/3) ln(3x + 1)]' = (1/3) · [3 / (3x + 1)] = 1 / (3x + 1) mới chính xác.",
      "whyAiError": "Mô hình quên nhân hệ số 1/a khi áp dụng công thức vi phân hàm hợp bậc nhất.",
      "teacherPrompt": "AI tính ∫ dx / (3x + 1) ra ln 4. Em hãy chỉ lỗi sai đại số và sửa lại: hệ số nhân phía trước logarit là bao nhiêu?",
      "studentProduct": "Ghi “Lỗi đại số: quên hệ số 1/a = 1/3”, sửa kết quả thành (1/3) ln 4.",
      "boardPrompt": "AI tính nguyên hàm 1/(3x+1) mà không có hệ số 1/3. Công thức chuẩn của 1/(ax+b) là gì?",
      "libraryTitle": "Lỗi AI quên hệ số một phần a khi tính tích phân hàm phân thức bậc nhất"
    }
  },
  {
    "key": "12-13-97",
    "grade": 12,
    "week": 13,
    "period": 97,
    "lessonType": "practice",
    "timelineKey": "default",
    "date": "2026-11-04",
    "timeMap": [
      [
        "HĐ 1 Khởi động — tình huống trục thực nghiệm",
        "P0–P3",
        "S0 + S1"
      ],
      [
        "HĐ 1.2 Mục tiêu M/S/C",
        "P3–P5",
        "S2"
      ],
      [
        "HĐ 2.1 Hình thành kiến thức + làm mẫu",
        "P5–P10",
        "S3"
      ],
      [
        "HĐ 2.2 AI Error + chốt quy tắc",
        "P10–P13",
        "S4 + S5"
      ],
      [
        "HĐ 3 Luyện tập phân hoá 3 luồng",
        "P14–P21",
        "S6"
      ],
      [
        "HĐ 3.2 Post-check & ĐGTX",
        "P21–P24",
        "S7"
      ],
      [
        "HĐ 4 Kiểm tra nhanh",
        "P24–P29",
        "S8"
      ],
      [
        "HĐ 4.2 Ứng dụng thực tế",
        "P29–P37",
        "S9"
      ],
      [
        "HĐ 5 Exit Ticket & tổng kết",
        "P37–P40",
        "S10"
      ]
    ],
    "title": "Tự chọn: Kỹ thuật tính nhanh tích phân",
    "goals": {
      "must": "Nắm vững các kỹ thuật tính nhanh tích phân trắc nghiệm: phương pháp bảng D-I, kỹ thuật đồng nhất hệ số và công thức Walli lượng giác cơ bản.",
      "should": "Sử dụng máy tính cầm tay (Casio fx-580VNX/880BTG) để giải tích phân chứa tham số a, b qua kỹ thuật gán biến (STO) và giải hệ.",
      "could": "Vận dụng tính chất đặc biệt f(x) + f(a + b - x) = k để giải trong 10 giây các câu hỏi tích phân phân hóa cực cao."
    },
    "opening": "Trong bài thi trắc nghiệm tốt nghiệp THPT, mỗi câu tích phân chỉ có 1,8 phút — hôm nay ta trang bị các tuyệt chiêu bấm máy và mẹo giải nhanh siêu tốc.",
    "focusQuestion": "Làm thế nào để tìm được hai số nguyên a, b trong biểu thức kết quả I = a ln 2 + b ln 3 bằng máy tính Casio?",
    "axis": "**Kỹ thuật giải tích phân chứa tham số bằng hệ phương trình máy tính Casio:**\n- Cho tích phân: $I = \\int_1^2 \\dfrac{3x + 1}{x^2 + x} dx = a \\ln 2 + b \\ln 3$ với $a, b \\in \\mathbb{Z}$.\n- **Bước 1 (Tính và lưu tích phân):**\n  - Bấm máy tính tính tích phân $I$: Bấm $\\int_1^2 \\dfrac{3x+1}{x^2+x} dx \\approx 1{,}791759...$\n  - Bấm gán vào biến: **STO -> A** (biến $A$ lưu giá trị đúng của $I$).\n- **Bước 2 (Thiết lập phương trình):**\n  - Ta có: $a \\ln 2 + b \\ln 3 = A \\implies a = \\dfrac{A - b \\ln 3}{\\ln 2}$.\n- **Bước 3 (Dò bảng Table):**\n  - Vào chế độ **Table** (Menu 8 trên fx-580VNX).\n  - Nhập hàm: $f(x) = \\dfrac{A - x \\ln 3}{\\ln 2}$ (ở đây $x$ đóng vai trò là số nguyên $b$).\n  - Cho $x$ chạy từ $-5$ đến $5$, bước nhảy $1$.\n  - Dò cột $f(x)$: Ta thấy ngay tại $x = 1$ ($b = 1$) thì $f(x) = 1$ ($a = 1$) là số nguyên đẹp!\n- **Kết luận tức thì:** $a = 1, b = 1 \\implies a + b = 2$ chỉ sau 30 giây bấm máy mà không cần tách phân thức đại số.",
    "s1": {
      "title": "Tìm tham số a, b bằng máy tính Casio",
      "context": "Tích phân I = a ln 2 + b ln 3. Ta lưu giá trị I vào biến A và dùng Table quét tìm số nguyên.",
      "question": "Khi lập hàm f(x) = (A - x ln 3)/ln 2, ta đang coi tham số nào là biến x?",
      "options": [
        "Tham số b",
        "Tham số a",
        "Cả hai tham số"
      ],
      "correct": 0,
      "why": "Ta coi b là biến x nguyên chạy trong Table, khi đó giá trị f(x) nhận được tương ứng chính là tham số a.",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu a, b là phân số có mẫu số 2 thì bước nhảy Step trong Table nên chọn là bao nhiêu?",
        "`[SO SÁNH]` Cách dò Table này có ưu thế gì so với giải tay phân tích A/(x) + B/(x+1)?"
      ],
      "cue": "Bấm máy trực tiếp trên màn hình máy chiếu fx-580VNX.",
      "lookFor": "HS bấm đúng STO A và nhập đúng hàm f(x) trong Table."
    },
    "s3": {
      "title": "Hệ thống 3 kỹ thuật tính nhanh siêu tốc",
      "steps": [
        "Kỹ thuật 1 (Bảng D-I đa thức × mũ/lượng): Cột đạo hàm triệt tiêu về 0, cột nguyên hàm lặp, nhân chéo đan dấu.",
        "Kỹ thuật 2 (Table Casio tìm hệ số): Lưu tích phân vào $A \\to$ rút một ẩn theo ẩn kia $a = g(b) \\to$ quét Table tìm cặp số nguyên.",
        "Kỹ thuật 3 (Hàm bù đối xứng): Nếu $f(x) + f(a + b - x) = k$ thì $\\int_a^b f(x) dx = \\dfrac{k(b - a)}{2}$.",
        "Kỹ thuật 4 (Kiểm tra đạo hàm 4 đáp án): Đạo hàm của đáp án tại điểm $x_0$ phải bằng giá trị hàm số dưới dấu tích phân tại $x_0$."
      ],
      "ask": [
        "`[SUY LUẬN]` Tại sao công thức hàm bù đối xứng lại có mẫu số 2?",
        "`[PHÁT HIỆN]` Khi nào thì máy tính bị tràn bộ nhớ hoặc tính quá lâu?"
      ],
      "cue": "Bảng tóm tắt các mẹo trắc nghiệm tích phân.",
      "close": "Bảng D-I cho từng phần; Table cho tham số nguyên; Hàm bù đối xứng cho câu hỏi vận dụng cao."
    },
    "s4": {
      "bat": "AI giải: Khi dùng máy tính tính tích phân I = ∫_0^π sin(2x) dx, AI để máy tính ở chế độ đo góc ĐỘ (Deg) và bấm ra kết quả sai lệch hoàn toàn.",
      "chung": "Sai lầm chí mạng khi bấm máy tích phân hàm lượng giác. Toàn bộ các công thức giải tích đạo hàm và tích phân lượng giác CHỈ ĐÚNG khi đơn vị góc là RADIAN (Rad). Để chế độ Deg máy tính sẽ tính sai hoàn toàn.",
      "sua": "Quy tắc bắt buộc: Trước khi bấm tích phân hàm lượng giác, luôn bấm Shift -> Menu -> 2 -> 2 để chuyển máy tính về chế độ RADIAN (chữ R trên màn hình). Kết quả chuẩn: I = 0.",
      "cue": "Nhắc khẩu quyết: \"Giải tích lượng giác bắt buộc phải có chữ R trên màn hình\".",
      "lookFor": "HS kiểm tra chế độ Radian trên máy tính trước khi bấm."
    },
    "s6": {
      "hints": {
        "M": "chuyển máy sang Radian (Shift Menu 2 2); bấm phím tích phân; bấm STO A.",
        "S": "dùng Table nhập f(x) = (A - x ln 3)/ln 2; Start -5, End 5, Step 1.",
        "C": "nhận diện hàm bù f(x) + f(a+b-x) = k để ghi ngay kết quả k(b-a)/2."
      },
      "lookFor": "HS M chuyển đúng Radian; HS S dò đúng Table; HS C áp dụng công thức hàm bù."
    },
    "postCheck": {
      "q": "Cho hàm số $f(x)$ liên tục thỏa mãn $f(x) + f(2 - x) = 4$. Tính $I = \\int_0^2 f(x) dx$.",
      "a": "Áp dụng công thức tính nhanh hàm bù đối xứng: $I = \\dfrac{k(b - a)}{2} = \\dfrac{4(2 - 0)}{2} = 4$.",
      "ds": [
        {
          "t": "\"Tính tích phân lượng giác trên Casio bắt buộc để chế độ Radian (R)\"",
          "v": "Đúng"
        },
        {
          "t": "\"Nếu f(x) + f(a+b-x) = k thì ∫_a^b f(x) dx = k(b - a)/2\"",
          "v": "Đúng"
        },
        {
          "t": "\"Table chỉ tìm được khi a, b là số nguyên dương\"",
          "v": "Sai — tìm được cả số nguyên âm và phân số"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra áp dụng công thức tính nhanh ra 4."
    },
    "s8Close": "Luôn để Radian; Bảng D-I cho từng phần; STO A + Table cho tham số; f(x)+f(a+b-x)=k -> k(b-a)/2.",
    "s9": {
      "title": "Tối ưu hóa thuật toán số trong vi mạch xử lý DSP",
      "bullets": [
        "Các chip xử lý tín hiệu số DSP dùng các bảng tra cứu (LUT) và thuật toán xấp xỉ nhanh để tính tích phân thời gian thực.",
        "Kỹ thuật tính nhanh giảm hàng triệu chu kỳ xung nhịp CPU trong xử lý hình ảnh y tế CT/MRI.",
        "Toán học giải tích kết hợp công nghệ tính toán số là cốt lõi của kỹ thuật hiện đại."
      ],
      "cue": "Hỏi: \"Làm thế nào máy quét cắt lớp CT có thể tái tạo hình ảnh 3D lục phủ ngũ tạng chỉ sau vài giây quét?\""
    },
    "exit": [
      "Nêu công thức tính nhanh hàm bù đối xứng.",
      "Nêu 1 bẫy (quên đổi máy tính sang chế độ Radian khi bấm tích phân lượng giác).",
      "Tự đánh giá M / S / C.",
      "Cho f(x) + f(4 - x) = 6. Tính ∫_0^4 f(x) dx."
    ],
    "exitCue": "Nhìn lại hình ảnh máy quét CT y tế.",
    "after": "- Hoàn thành bài tập tự chọn; chuẩn bị ôn tập kiểm tra học kỳ 1.",
    "snapshot": {
      "focus": "Trang bị các kỹ thuật giải nhanh tích phân trắc nghiệm: phương pháp bảng D-I, kỹ thuật dò Table Casio tìm tham số nguyên, công thức hàm bù đối xứng và tránh bẫy máy tính.",
      "formulas": [
        "f(x) + f(a + b - x) = k \\implies \\int_a^b f(x) dx = \\dfrac{k(b - a)}{2}",
        "a \\ln 2 + b \\ln 3 = A \\implies a = \\dfrac{A - b \\ln 3}{\\ln 2} \\quad (\\text{quét Table } b \\in \\mathbb{Z})",
        "\\int_0^{\\pi/2} \\dfrac{\\sin^n x}{\\sin^n x + \\cos^n x} dx = \\dfrac{\\pi}{4}"
      ],
      "boardKnowledge": [
        "I. Bấm máy Casio: Bắt buộc chế độ RADIAN (Shift Menu 2 2); Dùng STO lưu biến A; Dùng Table Menu 8.",
        "II. Bảng D-I: Cột Đạo hàm đạo hàm đến 0; Cột Tích phân; Nhân chéo đan dấu (+, -, +, -).",
        "III. Công thức hàm bù: ∫_a^b f(x) dx = k(b - a)/2 khi f(x) + f(a+b-x) = k."
      ],
      "examples": [
        {
          "question": "Dùng bảng D-I tính tích phân: I = ∫_0^1 x² e^x dx.",
          "solution": "Cột D: x² -> 2x -> 2 -> 0. Cột I: e^x -> e^x -> e^x -> e^x. Nhân chéo: I = (x² e^x - 2x e^x + 2 e^x)|_0^1 = [(1 - 2 + 2)e] - [0 - 0 + 2] = e - 2."
        },
        {
          "question": "Tính nhanh tích phân: I = ∫_0^{\\pi/2} \\dfrac{\\sin^{2026} x}{\\sin^{2026} x + \\cos^{2026} x} dx.",
          "solution": "Đặt f(x) là biểu thức dưới dấu tích phân. Ta có f(x) + f(π/2 - x) = 1 (hàm bù đối xứng với k = 1). Khi đó I = 1 · (π/2 - 0) / 2 = π/4."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Khi bấm tích phân hàm lượng giác trên máy tính, màn hình phải hiển thị chữ gì?",
          "answer": "Phải hiển thị chữ R (chế độ Radian)."
        },
        {
          "level": "NB",
          "question": "Nếu f(x) + f(6 - x) = 10 thì ∫_0^6 f(x) dx bằng bao nhiêu?",
          "answer": "Bằng 10 · (6 - 0) / 2 = 30."
        },
        {
          "level": "TH",
          "question": "Dùng bảng D-I tính tích phân I = ∫_0^1 x e^(2x) dx.",
          "answer": "D: x -> 1 -> 0; I: e^(2x) -> e^(2x)/2 -> e^(2x)/4. I = [x e^(2x)/2 - e^(2x)/4]|_0^1 = (e²/2 - e²/4) - (0 - 1/4) = e²/4 + 1/4 = (e² + 1)/4."
        },
        {
          "level": "TH",
          "question": "Cho ∫_0^1 (2x + 1)/(x + 1) dx = a + b ln 2. Tìm a và b.",
          "answer": "Tách tử: (2x+1)/(x+1) = 2 - 1/(x+1). Tích phân = (2x - ln|x+1|)|_0^1 = 2 - ln 2. Do đó a = 2, b = -1."
        },
        {
          "level": "VD",
          "question": "Cho I = ∫_0^1 \\dfrac{x^3 + 2x}{x + 1} dx = a/b + c ln 2 với a/b tối giản. Tính a + b + c.",
          "answer": "Chia đa thức: (x³ + 2x) : (x + 1) = x² - x + 3 dư -3. Tích phân = (x³/3 - x²/2 + 3x - 3 ln|x+1|)|_0^1 = (1/3 - 1/2 + 3) - 3 ln 2 = 17/6 - 3 ln 2. Vậy a = 17, b = 6, c = -3. Tổng a + b + c = 17 + 6 - 3 = 20."
        },
        {
          "level": "VD",
          "question": "Tính tích phân: I = ∫_0^2 \\dfrac{x^{2026}}{x^{2026} + (2 - x)^{2026}} dx.",
          "answer": "Hàm số thỏa mãn f(x) + f(2 - x) = 1 với a = 0, b = 2, k = 1. Theo công thức tính nhanh: I = 1 · (2 - 0) / 2 = 1."
        }
      ],
      "quick": [
        {
          "question": "Có bao giờ kết quả tích phân của hàm số dương lại cho ra số âm không?",
          "solution": "Nếu cận dưới nhỏ hơn cận trên thì tích phân hàm dương luôn dương. Nếu ra âm chắc chắn bấm nhầm thứ tự cận hoặc sai chế độ góc."
        },
        {
          "question": "Tại sao kỹ thuật Table lại hiệu quả đối với các bài toán chống bấm máy Casio?",
          "solution": "Vì người ra đề thường giấu kết quả dưới dạng a ln 2 + b ln 3, nhưng biểu thức này vẫn là phương trình bậc nhất 2 ẩn mà Table quét được trong vài giây."
        }
      ],
      "mistakes": [
        "Để máy tính ở chế độ độ (Deg) khi tính tích phân hàm lượng giác.",
        "Nhập sai bước nhảy Step trong Table khiến bỏ sót nghiệm nguyên.",
        "Áp dụng công thức hàm bù đối xứng khi f(x) + f(a+b-x) không phải là hằng số."
      ]
    },
    "aiError": {
      "category": "Lỗi khái niệm",
      "wrongSolution": "AI giải: Khi tính I = ∫_0^π cos(x) dx trên máy tính Casio, AI để màn hình ở chế độ DEG và bấm ra I ≈ 0,0548 rồi kết luận tích phân bằng 0,0548.",
      "correction": "Trong giải tích toán học, mọi công thức đạo hàm và tích phân hàm lượng giác đều xây dựng trên đơn vị đo góc Radian. Bấm máy ở chế độ Deg làm sai lệch hoàn toàn góc tính toán. Sửa lại: Chuyển máy về chế độ Radian (Shift Menu 2 2), bấm lại ra I = sin(π) - sin(0) = 0.",
      "proof": "Giải bằng tay theo định lý: ∫_0^π cos x dx = sin x |_0^π = sin(π rad) - sin(0 rad) = 0 - 0 = 0. Giá trị 0,0548 của AI xuất phát từ việc máy hiểu nhầm là tích phân từ 0 đến π độ (khoảng 3,14 độ).",
      "whyAiError": "Mô hình không nhận thức được sự phụ thuộc bắt buộc của giải tích vi tích phân vào hệ đo góc Radian.",
      "teacherPrompt": "AI để máy tính ở chế độ DEG và tính tích phân lượng giác ra 0,0548. Em hãy chỉ lỗi khái niệm và nêu thao tác sửa lại chế độ góc chuẩn.",
      "studentProduct": "Ghi “Lỗi khái niệm: tích phân lượng giác bắt buộc dùng Radian”, đổi sang Radian và sửa kết quả thành 0.",
      "boardPrompt": "AI tính tích phân lượng giác ở chế độ DEG ra kết quả sai. Chế độ góc bắt buộc trên máy tính là gì?",
      "libraryTitle": "Lỗi AI để sai đơn vị đo góc DEG khi tính tích phân hàm lượng giác bằng máy tính"
    }
  }
];
