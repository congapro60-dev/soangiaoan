export default [
  {
    "key": "12-13-90",
    "grade": 12,
    "week": 13,
    "period": 90,
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
    "title": "Luyện tập phương pháp đổi biến số nguyên hàm",
    "goals": {
      "must": "Nhận diện đúng dạng vi phân u'(x)dx = du để chọn ẩn phụ u = u(x); tính nguyên hàm ∫ f(u(x))u'(x)dx = F(u(x)) + C.",
      "should": "Thành thạo các phép đổi biến chứa căn thức (đặt u = √...), chứa hàm mũ (đặt u = e^x), và hàm lượng giác.",
      "could": "Biến đổi vi phân trực tiếp (nhảy vi phân) mà không cần viết tường minh bước đặt ẩn phụ."
    },
    "opening": "Tính nguyên hàm ∫ 2x√(x² + 1) dx bằng bảng nguyên hàm cơ bản là bất khả thi — nhưng với phép đổi biến số, bài toán trở thành tìm nguyên hàm của √u cực kỳ đơn giản.",
    "focusQuestion": "Dấu hiệu nhận biết rõ nhất để chọn ẩn phụ u trong biểu thức tích dưới dấu nguyên hàm là gì?",
    "axis": "**Mô hình tính điện lượng phóng qua tụ điện biến thiên:**\n- Cường độ dòng điện nạp vào tụ điện giảm theo thời gian:\n  $$i(t) = \\dfrac{2t}{(t^2 + 1)^2} \\quad (\\text{ampe}, t \\ge 0).$$\n- Điện lượng tích lũy $q(t) = \\int i(t) dt = \\int \\dfrac{2t}{(t^2 + 1)^2} dt$.\n- Nhận xét vi phân: $(t^2 + 1)' = 2t \\implies d(t^2 + 1) = 2t dt$.\n- **Đổi biến số:** Đặt $u = t^2 + 1 \\implies du = 2t dt$.\n- Nguyên hàm chuyển thành:\n  $$\\int \\dfrac{du}{u^2} = \\int u^{-2} du = -\\dfrac{1}{u} + C = -\\dfrac{1}{t^2 + 1} + C.$$\n- Điều kiện ban đầu $q(0) = 0 \\implies -1 + C = 0 \\implies C = 1$.\n- Hàm điện tích nạp theo thời gian: $q(t) = 1 - \\dfrac{1}{t^2 + 1}$ (coulomb). Khi $t \\to +\\infty$, $q(t) \\to 1$ C (điện lượng bão hòa).",
    "s1": {
      "title": "Điện lượng nạp theo thời gian t",
      "context": "Biểu thức nguyên hàm ∫ [2t / (t² + 1)²] dt với đạo hàm của mẫu (t² + 1)' = 2t xuất hiện ở tử.",
      "question": "Nếu đặt u = t² + 1 thì nguyên hàm trở thành biểu thức nào?",
      "options": [
        "∫ u⁻² du = -1/u + C",
        "∫ u² du = u³/3 + C",
        "∫ (1/u) du = ln|u| + C"
      ],
      "correct": 0,
      "why": "Vì 2t dt = du nên nguyên hàm là ∫ (1/u²) du = ∫ u⁻² du = -1/u + C = -1/(t² + 1) + C.",
      "discuss": [
        "`[PHÁT HIỆN]` Tại sao không đặt u = t²?",
        "`[SO SÁNH]` Phép đổi biến số và vi phân nhảy bước có gì khác nhau?"
      ],
      "cue": "Khoanh tròn cụm đạo hàm 2t dt và cụm biểu thức u = t² + 1.",
      "lookFor": "HS nhận ra sự khớp nối giữa 2t dt và du."
    },
    "s3": {
      "title": "Quy trình 3 bước đổi biến số nguyên hàm",
      "steps": [
        "Bước 1: Chọn ẩn phụ $u = u(x)$ thích hợp (chứa căn, biểu thức dưới mẫu, hoặc trong hàm hợp $f(u)$).",
        "Bước 2: Tính vi phân $du = u'(x) dx$ và biểu diễn toàn bộ tích phân theo biến $u$ và $du$.",
        "Bước 3: Tìm nguyên hàm theo biến $u$: $\\int f(u) du = F(u) + C$, sau đó trả lại biến cũ $x$: $F(u(x)) + C$."
      ],
      "ask": [
        "`[SUY LUẬN]` Trong biểu thức ∫ (ln x / x) dx, ta nên đặt u bằng gì?",
        "`[PHÁT HIỆN]` Nếu sau khi đổi biến mà vẫn còn sót biến x thì phải xử lý ra sao?"
      ],
      "cue": "Bảng các cặp đổi biến kinh điển: (f(x), f'(x)dx); (√u, u = căn); (ln x, dx/x); (e^x, e^x dx).",
      "close": "Đặt u sao cho du = u'(x)dx hấp thụ toàn bộ phần biến x còn lại trong biểu thức."
    },
    "s4": {
      "bat": "AI giải: Tính ∫ 2x√(x² + 1) dx. AI đặt u = x² + 1 => du = 2x dx. AI tính nguyên hàm ra: (2/3) u^(3/2) + C rồi dừng lại kết luận.",
      "chung": "Quên bước trả về biến x ban đầu. Kết quả của bài toán nguyên hàm theo biến x bắt buộc phải là một hàm số theo x, không thể để ẩn phụ u.",
      "sua": "Phải thay lại u = x² + 1: Kết quả cuối cùng là (2/3) (x² + 1)√(x² + 1) + C.",
      "cue": "Ghi nhớ: \"Đổi biến thì phải trả biến\".",
      "lookFor": "HS chỉ ra lỗi chưa trả biến u về biến x."
    },
    "s6": {
      "hints": {
        "M": "đặt u là biểu thức trong căn hoặc trong ngoặc lũy thừa; tính vi phân du.",
        "S": "nhớ rút gọn hệ số tự do trước khi tra bảng nguyên hàm cơ bản.",
        "C": "với căn bậc hai u = √g(x) thì bình phương u² = g(x) rồi lấy vi phân 2u du = g'(x)dx để khử căn hoàn toàn."
      },
      "lookFor": "HS M đặt đúng u; HS S tính đúng vi phân; HS C trả lại biến x chính xác."
    },
    "postCheck": {
      "q": "Tính nguyên hàm: $I = \\int \\dfrac{\\ln x}{x} dx$.",
      "a": "Đặt $u = \\ln x \\implies du = \\dfrac{1}{x} dx$. Nguyên hàm: $\\int u du = \\dfrac{u^2}{2} + C = \\dfrac{\\ln^2 x}{2} + C$.",
      "ds": [
        {
          "t": "\"Nguyên hàm đổi biến số phải trả lại biến x ban đầu\"",
          "v": "Đúng"
        },
        {
          "t": "\"∫ (1/x) ln x dx = ln²(x) + C\"",
          "v": "Sai — thiếu hệ số 1/2"
        },
        {
          "t": "\"Đặt u = √x thì vi phân du = dx / (2√x)\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra hệ số 1/2 ở ln² x."
    },
    "s8Close": "Chọn u -> Tính du = u'dx -> Đổi toàn bộ sang biến u -> Tìm nguyên hàm -> Trả lại biến x.",
    "s9": {
      "title": "Xử lý tín hiệu số và nén âm thanh MP3",
      "bullets": [
        "Thuật toán biến đổi Fourier rời rạc (DFT) trong nén MP3 chuyển tín hiệu miền thời gian sang miền tần số bằng phép đổi biến tích phân.",
        "Phép đổi biến Jacobian giúp chuẩn hóa năng lượng sóng âm thanh mà không làm méo tiếng.",
        "Toán học đổi biến số là lõi xử lý của các bộ lọc âm thanh trên tai nghe chống ồn."
      ],
      "cue": "Hỏi: \"Làm thế nào tai nghe chống ồn có thể triệt tiêu tiếng ồn môi trường chỉ trong một phần nghìn giây?\""
    },
    "exit": [
      "Nêu 3 bước của phương pháp đổi biến số nguyên hàm.",
      "Nêu 1 bẫy (quên trả lại biến x vào kết quả).",
      "Tự đánh giá M / S / C.",
      "Tính nguyên hàm ∫ e^(2x) dx bằng đổi biến u = 2x."
    ],
    "exitCue": "Nhìn lại đồ thị nạp điện lượng theo thời gian.",
    "after": "- Chuẩn bị bài tiếp theo: Luyện tập phương pháp nguyên hàm từng phần.",
    "snapshot": {
      "focus": "Luyện tập chuyên sâu kỹ năng tính nguyên hàm bằng phương pháp đổi biến số loại 1; nhận diện cấu trúc vi phân và thành thạo phép trả biến x.",
      "formulas": [
        "\\int f(u(x)) u'(x) dx = \\int f(u) du = F(u) + C = F(u(x)) + C",
        "u = \\sqrt{g(x)} \\implies u^2 = g(x) \\implies 2u du = g'(x) dx",
        "\\int \\dfrac{u'(x)}{u(x)} dx = \\ln |u(x)| + C"
      ],
      "boardKnowledge": [
        "I. Dấu hiệu đổi biến: Tích f(u(x)) · u'(x) dx có mặt đạo hàm của biểu thức trong ngoặc/căn.",
        "II. Các dạng kinh điển: u = căn thức; u = mẫu số; u = ln x (khi có dx/x); u = e^x.",
        "III. Quy tắc vàng: Bắt buộc đổi triệt để sang biến u, tìm xong nguyên hàm PHẢI trả lại biến x."
      ],
      "examples": [
        {
          "question": "Tính nguyên hàm: I = ∫ 3x²(x³ + 1)⁴ dx.",
          "solution": "Đặt u = x³ + 1 => du = 3x² dx. Khi đó I = ∫ u⁴ du = u⁵/5 + C = (x³ + 1)⁵/5 + C."
        },
        {
          "question": "Tính nguyên hàm: I = ∫ [x / √(x² + 4)] dx.",
          "solution": "Đặt u = √(x² + 4) => u² = x² + 4 => 2u du = 2x dx <=> x dx = u du. Khi đó I = ∫ (u du / u) = ∫ du = u + C = √(x² + 4) + C."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Tính vi phân du khi đặt u = 3x - 1.",
          "answer": "du = 3 dx."
        },
        {
          "level": "NB",
          "question": "Biểu thức (cos x dx) là vi phân của hàm số lượng giác nào?",
          "answer": "Là vi phân của sin x (d(sin x) = cos x dx)."
        },
        {
          "level": "TH",
          "question": "Tính nguyên hàm: I = ∫ (2x + 1) e^(x² + x) dx.",
          "answer": "Đặt u = x² + x => du = (2x + 1)dx. I = ∫ e^u du = e^u + C = e^(x² + x) + C."
        },
        {
          "level": "TH",
          "question": "Tính nguyên hàm: I = ∫ sin² x cos x dx.",
          "answer": "Đặt u = sin x => du = cos x dx. I = ∫ u² du = u³/3 + C = (sin³ x)/3 + C."
        },
        {
          "level": "VD",
          "question": "Tính nguyên hàm: I = ∫ [1 / (x ln² x)] dx.",
          "answer": "Đặt u = ln x => du = dx/x. I = ∫ (1/u²) du = -1/u + C = -1/(ln x) + C."
        },
        {
          "level": "VD",
          "question": "Tính nguyên hàm: I = ∫ [x³ / √(x² + 1)] dx.",
          "answer": "Đặt u = √(x² + 1) => u² = x² + 1 => x² = u² - 1 và x dx = u du. I = ∫ [(u² - 1) u du / u] = ∫ (u² - 1) du = u³/3 - u + C = [(x² + 1)√(x² + 1)]/3 - √(x² + 1) + C."
        }
      ],
      "quick": [
        {
          "question": "Nếu đặt ẩn phụ mà biểu thức vẫn còn chứa cả x và u thì nguyên hàm có tính được không?",
          "solution": "Chưa tính được, phải biểu diễn nốt phần x còn lại theo u hoặc chọn cách đổi biến khác."
        },
        {
          "question": "Có bao nhiêu cách tính nguyên hàm ∫ sin x cos x dx?",
          "solution": "Có 3 cách: đặt u = sin x ra (sin² x)/2; đặt u = cos x ra -(cos² x)/2; hoặc dùng góc nhân đôi (1/2) sin 2x ra -(cos 2x)/4 (các kết quả sai khác nhau một hằng số C)."
        }
      ],
      "mistakes": [
        "Quên tính vi phân đạo hàm du = u'dx (chỉ viết du = dx).",
        "Không trả biến u về biến x ở bước kết luận.",
        "Thiếu hằng số tích hợp + C."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI viết: Tính ∫ (2x + 1)⁴ dx. AI đặt u = 2x + 1 => du = dx. Do đó ∫ u⁴ du = u⁵/5 + C = (2x + 1)⁵/5 + C.",
      "correction": "Đạo hàm của u = 2x + 1 là u' = 2, do đó vi phân đúng là du = 2 dx <=> dx = du / 2. Sửa lại: Phải có hệ số 1/2: Kết quả chuẩn là (1/2) · (2x + 1)⁵/5 + C = (2x + 1)⁵/10 + C.",
      "proof": "Đạo hàm kiểm tra lại: [(2x+1)⁵/5]' = 5(2x+1)⁴ · 2 / 5 = 2(2x+1)⁴, thừa ra số 2 so với đề bài. Với kết quả đúng [(2x+1)⁵/10]' = 10(2x+1)⁴ / 10 = (2x+1)⁴.",
      "whyAiError": "Mô hình quên nhân đạo hàm của hàm số bậc nhất khi tính vi phân du, mặc định xem hệ số góc bằng 1.",
      "teacherPrompt": "AI tính vi phân du = dx khi u = 2x + 1. Em hãy chỉ lỗi sai đại số và sửa lại: hệ số vi phân đúng là bao nhiêu?",
      "studentProduct": "Ghi “Lỗi đại số: thiếu hệ số đạo hàm du = 2dx”, sửa thành (2x + 1)⁵/10 + C.",
      "boardPrompt": "AI viết du = dx khi đặt u = 2x + 1. Đạo hàm của u cho vi phân như thế nào?",
      "libraryTitle": "Lỗi AI quên hệ số vi phân khi đổi biến hàm số bậc nhất"
    }
  },
  {
    "key": "12-13-91",
    "grade": 12,
    "week": 13,
    "period": 91,
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
    "title": "Luyện tập phương pháp nguyên hàm từng phần",
    "goals": {
      "must": "Nắm vững công thức nguyên hàm từng phần ∫ u dv = u·v - ∫ v du và quy tắc ưu tiên chọn u: \"Nhất log, nhì đa, tam lượng, tứ mũ\".",
      "should": "Tính đúng các nguyên hàm tích hợp: đa thức × mũ, đa thức × lượng giác, và đa thức × logarit.",
      "could": "Giải quyết các nguyên hàm từng phần lặp (nguyên hàm luân hồi như ∫ e^x cos x dx) và phương pháp bảng vi tích phân."
    },
    "opening": "Khi biểu thức dưới dấu nguyên hàm là tích của hai hàm số khác họ hoàn toàn (như x · e^x hoặc x · sin x), phương pháp đổi biến bị vô hiệu hóa — ta cần đến công cụ nguyên hàm từng phần.",
    "focusQuestion": "Tại sao trong quy tắc chọn u, hàm logarit lại được xếp ở vị trí ưu tiên số 1?",
    "axis": "**Mô hình tính công sinh bởi lực biến thiên phân rã phóng xạ:**\n- Một hạt mang điện chuyển động dưới tác dụng của lực biến thiên theo hàm:\n  $$F(x) = x \\cdot e^{-x} \\quad (\\text{Newton}, x \\ge 0 \\text{ mét}).$$\n- Công cơ học sinh ra khi dịch chuyển hạt: $W(x) = \\int F(x) dx = \\int x e^{-x} dx$.\n- **Áp dụng công thức nguyên hàm từng phần:**\n  - Chọn $u = x$ (đa thức) $\\implies du = dx$.\n  - Chọn $dv = e^{-x} dx \\implies v = \\int e^{-x} dx = -e^{-x}$.\n- Ráp vào công thức $\\int u dv = u v - \\int v du$:\n  $$W(x) = x (-e^{-x}) - \\int (-e^{-x}) dx = -x e^{-x} + \\int e^{-x} dx = -x e^{-x} - e^{-x} + C = -(x + 1)e^{-x} + C.$$\n- Khi $x = 0$, công $W(0) = 0 \\implies -1 + C = 0 \\implies C = 1$.\n- Công tổng thể: $W(x) = 1 - (x + 1)e^{-x}$ (Joule). Khi $x \\to +\\infty$, $W(x) \\to 1$ J.",
    "s1": {
      "title": "Phân tích tích phân công lực x e^(-x)",
      "context": "Biểu thức tích giữa đa thức x và hàm số mũ e^(-x). Ta chọn u = x và dv = e^(-x) dx.",
      "question": "Hàm v tìm được từ dv = e^(-x) dx là biểu thức nào?",
      "options": [
        "v = -e^(-x)",
        "v = e^(-x)",
        "v = -e^x"
      ],
      "correct": 0,
      "why": "Vì đạo hàm (-e^(-x))' = -(-1) e^(-x) = e^(-x) nên v = -e^(-x).",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu chọn u = e^(-x) và dv = x dx thì tích phân mới ∫ v du sẽ ra sao?",
        "`[SO SÁNH]` Tại sao phải chọn u để đạo hàm du trở nên đơn giản hơn?"
      ],
      "cue": "Chú ý dấu trừ khi lấy nguyên hàm của hàm số mũ có cơ số âm e^(-x).",
      "lookFor": "HS tìm đúng v = -e^(-x) có dấu âm."
    },
    "s3": {
      "title": "Khẩu quyết và công thức nguyên hàm từng phần",
      "steps": [
        "Công thức cốt lõi: $\\int u dv = u \\cdot v - \\int v du$.",
        "Khẩu quyết chọn $u$: \"Nhất log (\\ln x), Nhì đa (đa thức $P(x)$), Tam lượng ($\\sin, \\cos$), Tứ mũ ($e^x, a^x$)\".",
        "Quy tắc chọn $dv$: Phần còn lại của biểu thức cùng với $dx$. Tìm $v$ bằng cách lấy một nguyên hàm đơn giản (chọn $C = 0$).",
        "Kiểm tra: Tích phân mới $\\int v du$ phải đơn giản hơn tích phân ban đầu $\\int u dv$."
      ],
      "ask": [
        "`[SUY LUẬN]` Với ∫ x ln x dx, ta chọn u là x hay ln x?",
        "`[PHÁT HIỆN]` Khi nào thì phải thực hiện nguyên hàm từng phần 2 lần?"
      ],
      "cue": "Bảng sơ đồ mũi tên tích chéo u·v và tích ngang ∫ v du.",
      "close": "Nhất log, nhì đa, tam lượng, tứ mũ: Hàm ưu tiên đứng trước chọn làm u, phần còn lại là dv."
    },
    "s4": {
      "bat": "AI giải: Tính ∫ x ln x dx. AI chọn u = x => du = dx, dv = ln x dx => v = 1/x. Khi đó ∫ x ln x dx = x(1/x) - ∫ (1/x) dx = 1 - ln|x| + C.",
      "chung": "Sai nghiêm trọng: dv = ln x dx thì v phải là nguyên hàm của ln x, nhưng AI lại lấy đạo hàm của ln x ra 1/x. Vi phạm quy tắc ưu tiên: ln x phải chọn làm u.",
      "sua": "Khẩu quyết \"Nhất log\": Bắt buộc chọn u = ln x => du = dx/x; dv = x dx => v = x²/2. Kết quả: (x²/2) ln x - x²/4 + C.",
      "cue": "Nhắc lại: Từ dv muốn tìm v phải lấy NGUYÊN HÀM, không được lấy đạo hàm.",
      "lookFor": "HS phát hiện lỗi lấy đạo hàm thay vì nguyên hàm cho dv."
    },
    "s6": {
      "hints": {
        "M": "chọn u theo đúng thứ tự ưu tiên; tính du bằng đạo hàm, tìm v bằng nguyên hàm.",
        "S": "áp dụng đúng dấu trừ: - ∫ v du; cẩn thận khi v có dấu trừ sẵn.",
        "C": "dùng phương pháp bảng đường chéo (D-I table) khi gặp đa thức bậc cao nhân e^x hoặc sin x."
      },
      "lookFor": "HS M chọn đúng u, dv; HS S ráp đúng công thức; HS C tính nhanh bằng bảng D-I."
    },
    "postCheck": {
      "q": "Tính nguyên hàm: $I = \\int (2x + 1) e^x dx$.",
      "a": "Đặt $u = 2x + 1 \\implies du = 2dx$; $dv = e^x dx \\implies v = e^x$. Áp dụng: $I = (2x + 1)e^x - \\int 2e^x dx = (2x + 1)e^x - 2e^x + C = (2x - 1)e^x + C$.",
      "ds": [
        {
          "t": "\"Thứ tự ưu tiên chọn u: Nhất log, nhì đa, tam lượng, tứ mũ\"",
          "v": "Đúng"
        },
        {
          "t": "\"Từ dv tìm v ta lấy đạo hàm của dv\"",
          "v": "Sai — phải lấy nguyên hàm"
        },
        {
          "t": "\"∫ x cos x dx = x sin x + cos x + C\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra rút gọn (2x - 1)e^x."
    },
    "s8Close": "∫ u dv = uv - ∫ v du; Nhất log, nhì đa, tam lượng, tứ mũ; dv -> lấy nguyên hàm ra v.",
    "s9": {
      "title": "Kỳ vọng toán học trong Lý thuyết xác suất và Trí tuệ nhân tạo",
      "bullets": [
        "Công thức tính giá trị kỳ vọng của biến ngẫu nhiên liên tục E[X] = ∫ x f(x) dx có cấu trúc nguyên hàm từng phần.",
        "Mô hình học sâu Deep Learning dùng tích phân từng phần để chứng minh định lý lan truyền ngược Gradient.",
        "Toán giải tích từng phần đảm bảo các mạng nơ-ron học hội tụ chính xác."
      ],
      "cue": "Hỏi: \"Làm thế nào AI tính được điểm xác suất trung bình của hàng triệu hình ảnh nhận diện?\""
    },
    "exit": [
      "Đọc thuộc câu khẩu quyết chọn ẩn u trong nguyên hàm từng phần.",
      "Nêu 1 bẫy (nhầm lấy đạo hàm khi tìm v từ dv).",
      "Tự đánh giá M / S / C.",
      "Tính ∫ ln x dx bằng nguyên hàm từng phần (chọn u = ln x, dv = dx)."
    ],
    "exitCue": "Nhìn lại bài toán công của lực phóng xạ mở đầu.",
    "after": "- Chuẩn bị bài tiếp theo: Diện tích hình thang cong và khái niệm tích phân.",
    "snapshot": {
      "focus": "Luyện tập thành thạo phương pháp nguyên hàm từng phần; áp dụng quy tắc ưu tiên chọn u; xử lý các dạng tích phân từng phần hai lần và nguyên hàm luân hồi.",
      "formulas": [
        "\\int u dv = u \\cdot v - \\int v du",
        "\\text{Thứ tự chọn } u: \\ln x \\to P(x) \\to \\sin x / \\cos x \\to e^x",
        "\\int P_n(x) e^{ax} dx: \\text{ từng phần } n \\text{ lần (hoặc dùng bảng D-I)}"
      ],
      "boardKnowledge": [
        "I. Công thức: ∫ u dv = uv - ∫ v du (xuất phát từ đạo hàm của tích (uv)' = u'v + uv').",
        "II. Chiến lược chọn: u đạo hàm ra đơn giản hơn (du = u'dx); dv dễ tìm nguyên hàm v.",
        "III. Bảng D-I: Cột Đạo hàm (D) đến 0, cột Tích phân (I), đan dấu (+, -, +, -)."
      ],
      "examples": [
        {
          "question": "Tính nguyên hàm: I = ∫ x sin x dx.",
          "solution": "Đặt u = x => du = dx; dv = sin x dx => v = -cos x. Áp dụng công thức: I = -x cos x - ∫ (-cos x) dx = -x cos x + sin x + C."
        },
        {
          "question": "Tính nguyên hàm: I = ∫ ln x dx.",
          "solution": "Đặt u = ln x => du = dx/x; dv = dx => v = x. Khi đó I = x ln x - ∫ x (dx/x) = x ln x - ∫ dx = x ln x - x + C."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Trong biểu thức ∫ (3x - 1) e^x dx, nên chọn u là hàm số nào?",
          "answer": "Chọn u = 3x - 1 (đa thức)."
        },
        {
          "level": "NB",
          "question": "Nếu dv = cos x dx thì hàm số v bằng bao nhiêu?",
          "answer": "v = sin x."
        },
        {
          "level": "TH",
          "question": "Tính nguyên hàm: I = ∫ x e^(2x) dx.",
          "answer": "u = x => du = dx; dv = e^(2x)dx => v = e^(2x)/2. I = (x/2)e^(2x) - (1/2)∫ e^(2x)dx = (x/2)e^(2x) - (1/4)e^(2x) + C."
        },
        {
          "level": "TH",
          "question": "Tính nguyên hàm: I = ∫ x ln(2x) dx.",
          "answer": "u = ln(2x) => du = dx/x; dv = x dx => v = x²/2. I = (x²/2)ln(2x) - ∫ (x²/2)(dx/x) = (x²/2)ln(2x) - x²/4 + C."
        },
        {
          "level": "VD",
          "question": "Tính nguyên hàm: I = ∫ x² cos x dx.",
          "answer": "Bảng D-I: D: x² -> 2x -> 2 -> 0; I: cos x -> sin x -> -cos x -> -sin x. Dấu +, -, +. I = x² sin x - 2x(-cos x) + 2(-sin x) + C = (x² - 2)sin x + 2x cos x + C."
        },
        {
          "level": "VD",
          "question": "Tính nguyên hàm luân hồi: I = ∫ e^x cos x dx.",
          "answer": "u = cos x => du = -sin x dx; dv = e^x dx => v = e^x. I = e^x cos x + ∫ e^x sin x dx. Từng phần lần 2 với u1 = sin x: ∫ e^x sin x dx = e^x sin x - ∫ e^x cos x dx = e^x sin x - I. Do đó I = e^x cos x + e^x sin x - I <=> 2I = e^x(cos x + sin x) <=> I = (1/2) e^x (cos x + sin x) + C."
        }
      ],
      "quick": [
        {
          "question": "Có thể chọn hằng số C khác 0 khi tìm v từ dv không?",
          "solution": "Có thể, công thức vẫn đúng với mọi C, nhưng chọn C = 0 giúp biểu thức đơn giản nhất."
        },
        {
          "question": "Tại sao khi gặp ∫ x² e^x dx ta nên dùng bảng D-I thay vì viết tay từng phần?",
          "solution": "Vì phương pháp bảng D-I giúp tránh nhầm lẫn dấu âm và tiết kiệm hơn 70% thời gian tính toán."
        }
      ],
      "mistakes": [
        "Nhầm lẫn giữa đạo hàm và nguyên hàm khi tìm v từ dv.",
        "Sai dấu trong phép tính: viết nhầm - ∫ v du thành + ∫ v du.",
        "Chọn sai thứ tự ưu tiên: chọn u = x trong bài toán chứa ln x."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI viết: Tính ∫ x cos x dx. Đặt u = x => du = dx, dv = cos x dx => v = sin x. Áp dụng: uv - ∫ v du = x sin x - ∫ sin x dx = x sin x - cos x + C.",
      "correction": "Nguyên hàm của sin x là -cos x. Do đó - ∫ sin x dx = -(-cos x) = +cos x. AI đã sai dấu khi lấy nguyên hàm. Sửa lại: Kết quả đúng là x sin x + cos x + C.",
      "proof": "Đạo hàm kiểm tra lại: (x sin x - cos x)' = sin x + x cos x - (-sin x) = 2 sin x + x cos x (sai). Trong khi (x sin x + cos x)' = sin x + x cos x - sin x = x cos x (đúng với đề bài).",
      "whyAiError": "Mô hình nhầm lẫn dấu trong nguyên hàm hàm lượng giác: ∫ sin x dx = -cos x chứ không phải +cos x.",
      "teacherPrompt": "AI tính - ∫ sin x dx thành -cos x. Em hãy chỉ lỗi sai dấu và sửa lại kết quả nguyên hàm chuẩn.",
      "studentProduct": "Ghi “Lỗi đại số: nguyên hàm sin x là -cos x”, sửa dấu thành x sin x + cos x + C.",
      "boardPrompt": "AI tính dấu trừ thành -cos x khi nguyên hàm sin x. Dấu chuẩn của biểu thức là gì?",
      "libraryTitle": "Lỗi AI sai dấu khi lấy nguyên hàm hàm lượng giác trong từng phần"
    }
  },
  {
    "key": "12-13-92",
    "grade": 12,
    "week": 13,
    "period": 92,
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
    "title": "Diện tích hình thang cong và tích phân",
    "goals": {
      "must": "Hiểu bài toán thực tế dẫn đến khái niệm tích phân: tính diện tích hình thang cong bằng phương pháp tổng Riemann xấp xỉ.",
      "should": "Nắm được giới hạn của tổng diện tích các hình chữ nhật nhỏ khi số khoảng chia tiến ra vô cực.",
      "could": "Mô tả ý nghĩa hình học của tích phân xác định ∫_a^b f(x) dx là diện tích phần mặt phẳng giới hạn bởi đồ thị hàm số."
    },
    "opening": "Tính diện tích mảnh đất có một cạnh uốn cong theo bờ sông tự nhiên là bài toán bế tắc đối với hình học Euclid cổ đại — hôm nay ta tìm hiểu cách giải tích tích phân giải quyết bài toán này.",
    "focusQuestion": "Tại sao việc chia nhỏ hình thang cong thành hàng nghìn hình chữ nhật hẹp lại cho ta diện tích chính xác tuyệt đối khi lấy giới hạn?",
    "axis": "**Mô hình tính diện tích thửa ruộng ven sông theo đường cong parabol:**\n- Bờ sông uốn lượn theo hàm số: $y = f(x) = x^2$ từ bờ cọc $x = 0$ đến $x = 1$ (đơn vị: 10 mét).\n- Cần tính diện tích hình thang cong giới hạn bởi đồ thị $y = x^2$, trục hoành $Ox$, và đường thẳng $x = 1$.\n- **Phương pháp chia nhỏ của Archimedes - Riemann:**\n  - Chia đoạn $[0; 1]$ thành $n$ đoạn bằng nhau, mỗi đoạn có độ rộng $\\Delta x = \\dfrac{1}{n}$.\n  - Các điểm chia: $x_k = \\dfrac{k}{n}$ ($k = 0, 1, \\dots, n$).\n  - Dựng các hình chữ nhật có đáy $\\Delta x$ và chiều cao $f(x_k) = \\left(\\dfrac{k}{n}\\right)^2$.\n- Tổng diện tích $n$ hình chữ nhật (tổng Riemann trên):\n  $$S_n = \\sum_{k=1}^n f(x_k) \\Delta x = \\sum_{k=1}^n \\left(\\dfrac{k}{n}\\right)^2 \\cdot \\dfrac{1}{n} = \\dfrac{1}{n^3} \\sum_{k=1}^n k^2 = \\dfrac{1}{n^3} \\cdot \\dfrac{n(n+1)(2n+1)}{6}.$$\n- Rút gọn: $S_n = \\dfrac{2n^3 + 3n^2 + n}{6n^3} = \\dfrac{1}{3} + \\dfrac{1}{2n} + \\dfrac{1}{6n^2}$.\n- **Cho số khoảng chia $n \\to +\\infty$:**\n  $$S = \\lim_{n \\to +\\infty} S_n = \\lim_{n \\to +\\infty} \\left(\\dfrac{1}{3} + \\dfrac{1}{2n} + \\dfrac{1}{6n^2}\\right) = \\dfrac{1}{3} \\approx 0{,}333 \\text{ (33,3 m}^2\\text{)}.$$\n- Con số $1/3$ này chính là **tích phân xác định** $\\int_0^1 x^2 dx = \\dfrac{1}{3}$.",
    "s1": {
      "title": "Diện tích thửa ruộng uốn cong ven sông",
      "context": "Chia đoạn [0; 1] thành n phần nhỏ. Khi n tăng từ 10 lên 100 rồi 1000, tổng diện tích xấp xỉ tiến dần về một số cố định.",
      "question": "Khi số khoảng chia n tiến ra vô cực, diện tích chính xác của thửa ruộng bằng bao nhiêu?",
      "options": [
        "1/3 (đơn vị diện tích)",
        "1/2",
        "Không xác định vì chia vô hạn"
      ],
      "correct": 0,
      "why": "Giới hạn của tổng diện tích khi n -> +∞ là lim (1/3 + 1/2n + 1/6n²) = 1/3.",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu tính bằng tổng Riemann dưới thì giới hạn có ra cùng 1/3 không?",
        "`[SO SÁNH]` Diện tích tam giác thẳng có đáy 1, cao 1 là 1/2, tại sao parabol lại ra 1/3?"
      ],
      "cue": "Vẽ đồ thị parabol y = x² và các cột hình chữ nhật bậc thang ngày càng mảnh mịn.",
      "lookFor": "HS thấy tổng diện tích bậc thang tiến về diện tích hình cong."
    },
    "s3": {
      "title": "Định nghĩa hình thang cong và tích phân xác định",
      "steps": [
        "Khái niệm hình thang cong: Hình phẳng giới hạn bởi đồ thị hàm số liên tục $y = f(x) \\ge 0$, trục hoành $y = 0$, và hai đường thẳng $x = a, x = b$.",
        "Tổng tích phân Riemann: $S_n = \\sum_{k=1}^n f(\\xi_k) \\Delta x_k$ (tổng diện tích các cột chữ nhật).",
        "Định nghĩa tích phân: Giới hạn hữu hạn của tổng Riemann khi đường kính phân hoạch tiến về 0: $I = \\lim_{\\max \\Delta x_k \\to 0} S_n = \\int_a^b f(x) dx$.",
        "Ý nghĩa hình học: Khi $f(x) \\ge 0$, $\\int_a^b f(x) dx$ biểu thị đúng diện tích $S$ của hình thang cong."
      ],
      "ask": [
        "`[SUY LUẬN]` Nếu đồ thị f(x) nằm phía dưới trục hoành (f(x) < 0) thì tích phân mang dấu gì?",
        "`[PHÁT HIỆN]` Tại sao ký hiệu tích phân ∫ lại có hình chữ S kéo dài?"
      ],
      "cue": "Chữ S kéo dài tượng trưng cho \"Summa\" (Tổng) trong tiếng Latinh.",
      "close": "Tích phân xác định là giới hạn của tổng diện tích vô số hình chữ nhật vô cùng hẹp."
    },
    "s4": {
      "bat": "AI giải: Đồ thị hàm số y = f(x) nằm dưới trục hoành từ a đến b. AI kết luận: Diện tích hình phẳng bằng ∫_a^b f(x) dx.",
      "chung": "Diện tích hình học thực tế luôn luôn là một số dương. Khi f(x) < 0 thì tích phân mang dấu âm, do đó diện tích phải bằng -∫_a^b f(x) dx hoặc ∫_a^b |f(x)| dx.",
      "sua": "Công thức diện tích hình phẳng chuẩn tổng quát: S = ∫_a^b |f(x)| dx. Với f(x) ≤ 0 thì S = -∫_a^b f(x) dx.",
      "cue": "Nhắc lại: Tích phân có thể âm, nhưng diện tích hình học không bao giờ âm.",
      "lookFor": "HS phân biệt giá trị đại số của tích phân và diện tích hình học."
    },
    "s6": {
      "hints": {
        "M": "hình thang cong có 4 biên: y = f(x), y = 0, x = a, x = b; diện tích bằng tích phân khi f(x) ≥ 0.",
        "S": "nhớ công thức tổng bình phương: 1² + 2² + ... + n² = n(n+1)(2n+1)/6.",
        "C": "chia đoạn không đều và chứng minh giới hạn độc lập với cách chọn điểm mẫu ξk."
      },
      "lookFor": "HS M nhận diện đúng 4 biên; HS S tính đúng giới hạn 1/3; HS C hiểu ý nghĩa Riemann."
    },
    "postCheck": {
      "q": "Cho hàm số $y = 2x$ liên tục trên $[0; 3]$. Dùng hình học thuần túy (diện tích tam giác) tính $\\int_0^3 2x dx$.",
      "a": "Hình thang cong là tam giác vuông có cạnh đáy $b = 3$ và chiều cao $h = 2 \\cdot 3 = 6$. Diện tích: $S = (1/2) \\cdot 3 \\cdot 6 = 9$. Vậy $\\int_0^3 2x dx = 9$.",
      "ds": [
        {
          "t": "\"Ký hiệu tích phân ∫ xuất phát từ chữ S (Summa)\"",
          "v": "Đúng"
        },
        {
          "t": "\"Tích phân của hàm số f(x) liên tục luôn bằng diện tích hình phẳng\"",
          "v": "Sai — chỉ đúng khi f(x) ≥ 0"
        },
        {
          "t": "\"Tích phân ∫_a^a f(x) dx luôn luôn bằng 0\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra kết quả diện tích tam giác vuông bằng 9."
    },
    "s8Close": "Chia nhỏ hình thang cong -> Lấy tổng Riemann -> Giới hạn n -> ∞ ra tích phân; f ≥ 0 thì S = ∫ f.",
    "s9": {
      "title": "Đo thể tích dầu mỏ trong bồn chứa hình elip",
      "bullets": [
        "Bồn chứa dầu ngầm công nghiệp có đáy cong theo phương trình elip, không thể đo bằng thước cuộn thông thường.",
        "Cảm biến laser chia bề mặt thành hàng triệu vi phân diện tích rồi tính tích phân thể tích tức thời.",
        "Quản lý kho xăng dầu toàn quốc dựa trên các thuật toán tích phân Riemann nhúng trong vi mạch."
      ],
      "cue": "Hỏi: \"Làm thế nào cây xăng biết chính xác bồn chứa dưới lòng đất còn bao nhiêu lít xăng?\""
    },
    "exit": [
      "Nêu ý nghĩa hình học của tích phân ∫_a^b f(x) dx khi f(x) ≥ 0.",
      "Nêu 1 bẫy (nhầm tích phân âm với diện tích hình học).",
      "Tự đánh giá M / S / C.",
      "Hình thang cong giới hạn bởi y = x, y = 0, x = 0, x = 2 có diện tích bằng bao nhiêu?"
    ],
    "exitCue": "Nhìn lại hình ảnh chia nhỏ mảnh ruộng ven sông.",
    "after": "- Chuẩn bị bài tiếp theo: Định nghĩa tích phân và công thức Newton - Leibniz.",
    "snapshot": {
      "focus": "Hình thành khái niệm tích phân xác định thông qua bài toán diện tích hình thang cong; hiểu phương pháp tổng tích phân Riemann và ý nghĩa hình học của tích phân.",
      "formulas": [
        "S_n = \\sum_{k=1}^n f(x_k) \\Delta x \\implies \\lim_{n \\to +\\infty} S_n = \\int_a^b f(x) dx",
        "S = \\int_a^b f(x) dx \\quad (\\text{khi } f(x) \\ge 0 \\text{ trên } [a; b])",
        "\\int_a^a f(x) dx = 0; \\quad \\int_a^b f(x) dx = -\\int_b^a f(x) dx"
      ],
      "boardKnowledge": [
        "I. Bài toán diện tích: Chia nhỏ thành n hình chữ nhật -> Tổng diện tích Riemann -> Giới hạn vô cực.",
        "II. Định nghĩa tích phân: Con số giới hạn duy nhất ký hiệu là ∫_a^b f(x) dx (a: cận dưới, b: cận trên).",
        "III. Ý nghĩa hình học: Là diện tích đại số của miền phẳng kẹp giữa đồ thị và trục Ox."
      ],
      "examples": [
        {
          "question": "Dùng công thức diện tích hình thang, tính tích phân: I = ∫_1^4 (x + 1) dx.",
          "solution": "Đồ thị là đoạn thẳng từ (1; 2) đến (4; 5). Miền phẳng là hình thang vuông có đáy nhỏ y1 = 2, đáy lớn y2 = 5, chiều cao h = 4 - 1 = 3. Diện tích S = (2 + 5) · 3 / 2 = 21/2 = 10,5. Vậy I = 10,5."
        },
        {
          "question": "Dùng ý nghĩa hình học hình tròn, tính tích phân: I = ∫_0^2 √(4 - x²) dx.",
          "solution": "Phương trình y = √(4 - x²) <=> x² + y² = 4 (với y ≥ 0). Đây là nửa trên của hình tròn tâm O bán kính R = 2. Cận từ 0 đến 2 tương ứng với 1/4 hình tròn. Diện tích S = (1/4) π R² = (1/4) π · 4 = π. Vậy I = π."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Tích phân ∫_2^2 (x² + 5) dx có giá trị bằng bao nhiêu?",
          "answer": "Bằng 0 (hai cận bằng nhau)."
        },
        {
          "level": "NB",
          "question": "Trong ký hiệu ∫_1^3 f(x) dx, số 1 gọi là gì và số 3 gọi là gì?",
          "answer": "Số 1 là cận dưới, số 3 là cận trên."
        },
        {
          "level": "TH",
          "question": "Tính I = ∫_0^5 3 dx bằng ý nghĩa hình học.",
          "answer": "Miền phẳng là hình chữ nhật đáy rộng 5, cao 3. Diện tích = 3 · 5 = 15. Vậy I = 15."
        },
        {
          "level": "TH",
          "question": "Nếu hàm số f(x) liên tục và f(x) ≤ 0 trên [a; b] thì mối liên hệ giữa diện tích hình phẳng S và tích phân ∫_a^b f(x) dx là gì?",
          "answer": "S = - ∫_a^b f(x) dx (diện tích bằng số đối của tích phân)."
        },
        {
          "level": "VD",
          "question": "Tính diện tích hình phẳng giới hạn bởi nửa trên đường tròn y = √(9 - x²) và trục hoành trên đoạn [-3; 3].",
          "answer": "Đây là diện tích của nửa hình tròn bán kính R = 3: S = (1/2) π R² = (1/2) π · 9 = 9π/2."
        },
        {
          "level": "VD",
          "question": "Cho hàm số f(x) = x khi 0 ≤ x ≤ 1 và f(x) = 2 - x khi 1 < x ≤ 2. Tính ∫_0^2 f(x) dx bằng hình học.",
          "answer": "Đồ thị tạo thành tam giác cân có đáy trên trục Ox từ 0 đến 2 (độ dài 2) và đỉnh tại (1; 1) có chiều cao h = 1. Diện tích S = (1/2) · 2 · 1 = 1. Vậy tích phân bằng 1."
        }
      ],
      "quick": [
        {
          "question": "Tích phân xác định có phụ thuộc vào ký hiệu biến lấy tích phân không?",
          "solution": "Không, ∫_a^b f(x) dx = ∫_a^b f(t) dt = ∫_a^b f(u) du (chỉ phụ thuộc vào hàm f và hai cận a, b)."
        },
        {
          "question": "Có bao giờ diện tích của một hình phẳng bị giới hạn lại là một số âm không?",
          "solution": "Không bao giờ, diện tích hình học luôn luôn không âm."
        }
      ],
      "mistakes": [
        "Cho rằng tích phân luôn luôn bằng diện tích (quên điều kiện f(x) ≥ 0).",
        "Đổi chỗ hai cận mà không đổi dấu tích phân.",
        "Nhầm lẫn giữa tích phân bất định (nguyên hàm ra hàm số + C) và tích phân xác định (ra một số cụ thể)."
      ]
    },
    "aiError": {
      "category": "Lỗi khái niệm",
      "wrongSolution": "AI viết: Tính diện tích hình phẳng giới hạn bởi đồ thị y = x³ và trục hoành trên đoạn [-1; 1]: AI tính S = ∫_{-1}^1 x³ dx = 0.",
      "correction": "Tích phân ∫_{-1}^1 x³ dx = 0 vì hàm số lẻ, hai phần đồ thị đối xứng qua gốc O triệt tiêu nhau. Nhưng DIỆN TÍCH HÌNH PHẲNG là tổng độ lớn diện tích hai miền, không thể bằng 0. Sửa lại: S = ∫_{-1}^1 |x³| dx = 2 ∫_0^1 x³ dx = 2 · (1/4) = 1/2.",
      "proof": "Miền bên trái trên [-1; 0] có diện tích S1 = - ∫_{-1}^0 x³ dx = 1/4. Miền bên phải trên [0; 1] có diện tích S2 = ∫_0^1 x³ dx = 1/4. Tổng diện tích S = S1 + S2 = 1/2 > 0.",
      "whyAiError": "Mô hình đánh đồng giá trị đại số của tích phân với diện tích hình học mà quên lấy dấu giá trị tuyệt đối.",
      "teacherPrompt": "AI tính diện tích kẹp giữa y = x³ từ -1 đến 1 ra bằng 0. Em hãy chỉ lỗi sai khái niệm và sửa lại công thức tính diện tích đúng.",
      "studentProduct": "Ghi “Lỗi khái niệm: diện tích phải lấy tích phân trị tuyệt đối”, sửa kết quả diện tích thành 1/2.",
      "boardPrompt": "AI tính diện tích miền phẳng kẹp giữa x³ từ -1 đến 1 ra bằng 0. Công thức diện tích đúng cần bổ sung điều gì?",
      "libraryTitle": "Lỗi AI đánh đồng tích phân triệt tiêu với diện tích hình phẳng bằng không"
    }
  },
  {
    "key": "12-13-93",
    "grade": 12,
    "week": 13,
    "period": 93,
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
    "title": "Định nghĩa tích phân và công thức Newton",
    "goals": {
      "must": "Nắm vững định nghĩa tích phân xác định và công thức Newton - Leibniz: ∫_a^b f(x) dx = F(b) - F(a) = F(x)|_a^b.",
      "should": "Tính thành thạo tích phân của các hàm số sơ cấp cơ bản bằng cách tìm nguyên hàm rồi thế cận.",
      "could": "Chứng minh công thức Newton - Leibniz bằng định lý giá trị trung bình; giải thích mối liên hệ giữa đạo hàm và tích phân."
    },
    "opening": "Tính tổng hàng tỷ hình chữ nhật Riemann cực kỳ gian khổ — nhưng Newton và Leibniz đã phát hiện ra bí mật vĩ đại: chỉ cần tìm nguyên hàm rồi lấy hiệu hai đầu mút.",
    "focusQuestion": "Tại sao hằng số C hoàn toàn biến mất khi áp dụng công thức Newton - Leibniz?",
    "axis": "**Mô hình tính quãng đường ô tô phanh gấp dừng lại:**\n- Khi đạp phanh khẩn cấp, vận tốc của ô tô giảm theo thời gian:\n  $$v(t) = 20 - 4t \\quad (\\text{m/s}, 0 \\le t \\le 5 \\text{ giây}).$$\n- Sau $t = 5$ giây, $v(5) = 20 - 4(5) = 0$ m/s (xe dừng hẳn).\n- Quãng đường phanh xe $s$ chính là tích phân của vận tốc từ $t = 0$ đến $t = 5$:\n  $$s = \\int_0^5 v(t) dt = \\int_0^5 (20 - 4t) dt.$$\n- **Áp dụng công thức Newton - Leibniz:**\n  - Một nguyên hàm của $v(t) = 20 - 4t$ là $F(t) = 20t - 2t^2$.\n  - Ký hiệu thế cận: $F(t) \\Big|_0^5 = F(5) - F(0)$.\n  - Tính giá trị tại cận trên: $F(5) = 20(5) - 2(5)^2 = 100 - 50 = 50$ mét.\n  - Tính giá trị tại cận dưới: $F(0) = 20(0) - 2(0)^2 = 0$ mét.\n  - Quãng đường phanh an toàn: $s = 50 - 0 = 50$ mét.\n- **Sự biến mất của $C$:** Nếu chọn $F(t) + C$ thì $[F(b) + C] - [F(a) + C] = F(b) - F(a) + (C - C) = F(b) - F(a)$. Hằng số $C$ luôn triệt tiêu.",
    "s1": {
      "title": "Quãng đường phanh xe 50 mét",
      "context": "Nguyên hàm của v(t) = 20 - 4t là F(t) = 20t - 2t². Ta thế cận t từ 0 đến 5.",
      "question": "Giá trị F(5) - F(0) cho kết quả bao nhiêu mét?",
      "options": [
        "50 mét",
        "100 mét",
        "25 mét"
      ],
      "correct": 0,
      "why": "F(5) = 20·5 - 2·25 = 50; F(0) = 0. Hiệu số F(5) - F(0) = 50 mét.",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu cộng thêm C = 100 vào nguyên hàm thì hiệu số có đổi không?",
        "`[SO SÁNH]` Công thức Newton-Leibniz biến bài toán hình học diện tích thành bài toán đại số gì?"
      ],
      "cue": "Viết ký hiệu thế cận F(x)|_a^b với gạch đứng ở bên phải.",
      "lookFor": "HS thế đúng cận trên trừ cận dưới: F(b) - F(a)."
    },
    "s3": {
      "title": "Định nghĩa và công thức Newton - Leibniz",
      "steps": [
        "Định lý cơ bản của Giải tích: Cho $f(x)$ liên tục trên đoạn $[a; b]$. Nếu $F(x)$ là một nguyên hàm bất kỳ của $f(x)$ trên $[a; b]$ thì:",
        "$$\\int_a^b f(x) dx = F(b) - F(a) = F(x) \\Big|_a^b.$$",
        "Quy trình tính 3 bước: (1) Tìm một nguyên hàm $F(x)$ (chọn $C = 0$); (2) Viết ký hiệu gạch đứng thế cận $F(x)|_a^b$; (3) Lấy $F(b) - F(a)$.",
        "Tính chất cận: $\\int_a^b f(x) dx = -\\int_b^a f(x) dx$ và $\\int_a^a f(x) dx = 0$."
      ],
      "ask": [
        "`[SUY LUẬN]` Đạo hàm của tích phân theo cận trên d/dx [∫_a^x f(t) dt] bằng gì?",
        "`[PHÁT HIỆN]` Vì sao bắt buộc phải lấy F(cận trên) trừ F(cận dưới)?"
      ],
      "cue": "Bảng đối chiếu Newton (Anh) và Leibniz (Đức) cùng độc lập phát minh công thức.",
      "close": "Tích phân bằng F(cận trên) trừ F(cận dưới); hằng số C luôn tự động triệt tiêu."
    },
    "s4": {
      "bat": "AI giải: Tính I = ∫_1^2 3x² dx. Nguyên hàm là x³. AI thế cận: I = F(1) - F(2) = 1³ - 2³ = 1 - 8 = -7.",
      "chung": "Thế ngược thứ tự cận: Công thức Newton - Leibniz bắt buộc phải lấy F tại CẬN TRÊN trừ F tại CẬN DƯỚI: F(b) - F(a), không được lấy F(a) - F(b).",
      "sua": "Thế cận đúng: I = F(2) - F(1) = 2³ - 1³ = 8 - 1 = 7.",
      "cue": "Khẩu quyết: \"Trên trừ Dưới, không lấy Dưới trừ Trên\".",
      "lookFor": "HS phát hiện lỗi đảo ngược thứ tự cận trên và cận dưới."
    },
    "s6": {
      "hints": {
        "M": "tìm nguyên hàm F(x) trước; viết gạch đứng thế cận; tính F(b) rồi trừ F(a).",
        "S": "chú ý các hàm phân thức chứa ln: ln|b| - ln|a| = ln|b/a|.",
        "C": "tính tích phân của hàm chứa dấu giá trị tuyệt đối bằng cách chia khoảng xét dấu."
      },
      "lookFor": "HS M tính đúng F(b)-F(a); HS S rút gọn logarit chuẩn; HS C phá đúng trị tuyệt đối."
    },
    "postCheck": {
      "q": "Tính tích phân: $I = \\int_0^{\\pi} \\sin x dx$.",
      "a": "Nguyên hàm của $\\sin x$ là $-\\cos x$. Ta có: $I = -\\cos x \\Big|_0^{\\pi} = -\\cos(\\pi) - [-\\cos(0)] = -(-1) - (-1) = 1 + 1 = 2$.",
      "ds": [
        {
          "t": "\"Công thức Newton - Leibniz: ∫_a^b f(x) dx = F(b) - F(a)\"",
          "v": "Đúng"
        },
        {
          "t": "\"Nguyên hàm F(x) trong công thức Newton bắt buộc phải cộng C\"",
          "v": "Sai — C luôn triệt tiêu nên chọn C = 0"
        },
        {
          "t": "\"∫_0^1 e^x dx = e - 1\"",
          "v": "Đúng (e¹ - e⁰ = e - 1)"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, chú ý dấu âm kép -(-1) = +1."
    },
    "s8Close": "∫_a^b f(x) dx = F(b) - F(a); Cận trên trừ cận dưới; Chọn C = 0 cho tiện.",
    "s9": {
      "title": "Hệ thống định vị GPS và tính quãng đường tên lửa vũ trụ",
      "bullets": [
        "Máy thu GPS giải tích phân gia tốc hai lần liên tiếp theo công thức Newton - Leibniz để tính tọa độ tức thời của vệ tinh.",
        "Bộ điều khiển tên lửa SpaceX Falcon 9 tính toán lượng nhiên liệu tiêu hao chính xác từng mili-giây.",
        "Công thức Newton - Leibniz là trụ cột toán học đưa loài người bay vào không gian."
      ],
      "cue": "Hỏi: \"Làm thế nào phi thuyền tự động biết được vị trí chính xác của nó khi bay xa khỏi Trái Đất?\""
    },
    "exit": [
      "Phát biểu công thức Newton - Leibniz.",
      "Nêu 1 bẫy (lấy F(dưới) trừ F(trên) làm sai dấu kết quả).",
      "Tự đánh giá M / S / C.",
      "Tính ∫_1^3 2x dx."
    ],
    "exitCue": "Nhìn lại tình huống phanh xe ô tô 50m.",
    "after": "- Chuẩn bị bài tiếp theo: Tính chất tuyến tính và tính chất cộng đoạn của tích phân.",
    "snapshot": {
      "focus": "Hình thành định nghĩa tích phân xác định và công thức Newton - Leibniz; rèn luyện kỹ năng tìm nguyên hàm, thế cận trên trừ cận dưới và tính toán số học.",
      "formulas": [
        "\\int_a^b f(x) dx = F(b) - F(a) = F(x) \\Big|_a^b \\quad (F'(x) = f(x))",
        "\\int_a^b c dx = c(b - a)",
        "\\int_a^b x^n dx = \\dfrac{b^{n+1} - a^{n+1}}{n+1} \\quad (n \\ne -1)"
      ],
      "boardKnowledge": [
        "I. Công thức Newton - Leibniz: Cầu nối thần kỳ giữa phép tính vi phân và tích phân.",
        "II. Quy tắc thế cận: F(x)|_a^b = F(b) - F(a) (Cận Trên trừ Cận Dưới).",
        "III. Hằng số C: Luôn tự triệt tiêu trong phép trừ (F(b)+C) - (F(a)+C)."
      ],
      "examples": [
        {
          "question": "Tính tích phân: I = ∫_1^2 (3x² - 2x + 1) dx.",
          "solution": "Nguyên hàm F(x) = x³ - x² + x. Thế cận: F(2) = 2³ - 2² + 2 = 6; F(1) = 1³ - 1² + 1 = 1. Kết quả: I = 6 - 1 = 5."
        },
        {
          "question": "Tính tích phân: I = ∫_1^e (1/x) dx.",
          "solution": "Nguyên hàm là ln|x|. Thế cận: I = ln|e| - ln|1| = 1 - 0 = 1."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Tính tích phân I = ∫_0^2 4 dx.",
          "answer": "I = 4 · (2 - 0) = 8."
        },
        {
          "level": "NB",
          "question": "Công thức Newton - Leibniz lấy F(a) trừ F(b) hay F(b) trừ F(a)?",
          "answer": "Lấy F(b) trừ F(a) (cận trên trừ cận dưới)."
        },
        {
          "level": "TH",
          "question": "Tính tích phân: I = ∫_0^1 (2x + 3) dx.",
          "answer": "F(x) = x² + 3x. I = F(1) - F(0) = (1 + 3) - 0 = 4."
        },
        {
          "level": "TH",
          "question": "Tính tích phân: I = ∫_0^1 e^(2x) dx.",
          "answer": "F(x) = e^(2x)/2. I = e² / 2 - e⁰ / 2 = (e² - 1)/2."
        },
        {
          "level": "VD",
          "question": "Tính tích phân: I = ∫_0^2 |x - 1| dx.",
          "answer": "Chia thành 2 đoạn: ∫_0^1 (1 - x) dx + ∫_1^2 (x - 1) dx = (x - x²/2)|_0^1 + (x²/2 - x)|_1^2 = 1/2 + 1/2 = 1."
        },
        {
          "level": "VD",
          "question": "Tìm m dương để tích phân ∫_0^m (2x - 3) dx = 4.",
          "answer": "Ta có F(x) = x² - 3x. F(m) - F(0) = m² - 3m = 4 <=> m² - 3m - 4 = 0 <=> m = 4 hoặc m = -1. Vì m > 0 nên chọn m = 4."
        }
      ],
      "quick": [
        {
          "question": "Nếu f(x) ≥ 0 trên [a; b] với a < b thì tích phân ∫_a^b f(x) dx có thể âm được không?",
          "solution": "Không thể âm, tích phân luôn ≥ 0."
        },
        {
          "question": "Tại sao Newton và Leibniz được coi là hai cha đẻ độc lập của giải tích?",
          "solution": "Vì Newton tìm ra giải tích thông qua cơ học quang học ở Anh, còn Leibniz tìm ra thông qua hình học đại số ở Đức với hệ ký hiệu d và ∫ còn dùng đến ngày nay."
        }
      ],
      "mistakes": [
        "Thế ngược cận: lấy F(a) - F(b) làm đổi dấu kết quả.",
        "Quên dấu trừ khi nguyên hàm hàm lượng giác cos sang sin hoặc sin sang -cos.",
        "Nhầm ln(0) = 0 (ln 0 không xác định)."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI giải: Tính I = ∫_0^1 (x - 1) dx. Nguyên hàm F(x) = x²/2 - x. AI tính F(1) = 1/2 - 1 = -1/2, F(0) = 0. AI kết luận vì tích phân là diện tích nên I = |-1/2| = 1/2.",
      "correction": "Tích phân xác định là một đại lượng đại số có dấu, nó hoàn toàn có thể nhận giá trị âm khi đồ thị nằm dưới trục Ox. Đề bài yêu cầu tính tích phân chứ không hỏi diện tích. Sửa lại: Giá trị của tích phân đúng là I = -1/2.",
      "proof": "Theo công thức Newton - Leibniz: ∫_0^1 (x - 1) dx = (x²/2 - x)|_0^1 = (1/2 - 1) - 0 = -1/2. Không được tự ý lấy giá trị tuyệt đối.",
      "whyAiError": "Mô hình nhầm lẫn yêu cầu tính tích phân đại số với yêu cầu tính diện tích hình học.",
      "teacherPrompt": "AI tự ý đổi dấu tích phân từ -1/2 thành 1/2 vì cho rằng tích phân là diện tích. Em hãy chỉ lỗi sai và sửa lại kết quả chính xác.",
      "studentProduct": "Ghi “Lỗi đại số: tích phân có thể âm, không được tự ý lấy trị tuyệt đối”, giữ nguyên kết quả -1/2.",
      "boardPrompt": "AI tự ý lấy trị tuyệt đối kết quả tích phân vì nghĩ tích phân không được âm. Tích phân xác định có được nhận giá trị âm không?",
      "libraryTitle": "Lỗi AI tự ý lấy giá trị tuyệt đối biến tích phân âm thành dương"
    }
  }
];
