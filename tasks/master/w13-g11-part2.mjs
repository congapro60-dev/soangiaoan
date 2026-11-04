export default [
  {
    "key": "11-13-94",
    "grade": 11,
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
    "title": "Phép chiếu song song và hình biểu diễn",
    "goals": {
      "must": "Nắm vững định nghĩa phép chiếu song song: mặt phẳng chiếu, phương chiếu; các tính chất bảo toàn tính thẳng hàng, song song và tỉ số đoạn thẳng cùng phương.",
      "should": "Xác định đúng hình biểu diễn của các hình phẳng quen thuộc (hình bình hành, hình thang, hình tròn thành elip).",
      "could": "Vẽ chính xác hình biểu diễn của khối chóp, khối lăng trụ và dựng thiết diện bằng phép chiếu song song."
    },
    "opening": "Bóng của một khung cửa sổ in trên mặt sàn dưới ánh sáng mặt trời là một ví dụ trực quan nhất về phép chiếu song song — hôm nay ta nghiên cứu các quy tắc toán học của nó.",
    "focusQuestion": "Tính chất hình học nào được bảo toàn và tính chất nào KHÔNG được bảo toàn qua phép chiếu song song?",
    "axis": "**Mô hình bóng đổ của khung giàn giáo dưới ánh nắng mặt trời:**\n- Tia nắng mặt trời là các đường thẳng song song với nhau theo phương chiếu $d$. Mặt phẳng mặt đất là mặt phẳng chiếu $(\\alpha)$ ($d \\not\\parallel (\\alpha)$).\n- Khung giàn giáo hình chữ nhật $ABCD$ nghiêng trong không gian.\n- Chiếu các đỉnh $A, B, C, D$ xuống mặt đất được các bóng $A', B', C', D'$:\n  - Cạnh $AB \\parallel CD$ trong không gian $\\implies$ bóng $A'B' \\parallel C'D'$.\n  - $AB = CD \\implies A'B' = C'D'$.\n  - Do đó tứ giác bóng $A'B'C'D'$ trên mặt đất là một **hình bình hành**.\n- **Tính chất bảo toàn then chốt:**\n  - Bảo toàn tính thẳng hàng và thứ tự các điểm trên đường thẳng.\n  - Bảo toàn tính song song giữa hai đường thẳng.\n  - Bảo toàn tỉ số độ dài của hai đoạn thẳng nằm trên hai đường thẳng song song hoặc trùng nhau.\n- **Tính chất KHÔNG bảo toàn:** Góc (góc vuông biến thành góc nhọn hoặc tù), độ dài tuyệt đối, tỉ số hai đoạn thẳng chéo nhau hoặc cắt nhau không cùng phương.",
    "s1": {
      "title": "Hình bóng của hình vuông trên mặt sàn",
      "context": "Khung tranh hình vuông ABCD đặt nghiêng dưới ánh nắng mặt trời (phép chiếu song song).",
      "question": "Hình chiếu A'B'C'D' trên mặt phẳng sàn nhà chắc chắn là hình gì?",
      "options": [
        "Hình bình hành",
        "Luôn luôn là hình vuông",
        "Hình chữ nhật"
      ],
      "correct": 0,
      "why": "Phép chiếu song song bảo toàn tính song song và độ dài hai cạnh đối bằng nhau nên biến hình vuông thành hình bình hành.",
      "discuss": [
        "`[PHÁT HIỆN]` Khi nào hình chiếu của hình vuông là một đoạn thẳng?",
        "`[SO SÁNH]` Góc vuông có được bảo toàn qua phép chiếu song song không?"
      ],
      "cue": "Vẽ mặt phẳng chiếu và các tia chiếu song song xuyên qua 4 đỉnh của hình vuông.",
      "lookFor": "HS phân biệt tính chất được bảo toàn (song song) và không bảo toàn (góc vuông)."
    },
    "s3": {
      "title": "Các định lý và tính chất của phép chiếu song song",
      "steps": [
        "Định lý 1: Biến đường thẳng không song song với phương chiếu thành đường thẳng; biến tia thành tia, đoạn thẳng thành đoạn thẳng.",
        "Định lý 2: Biến hai đường thẳng song song thành hai đường thẳng song song hoặc trùng nhau.",
        "Định lý 3: Bảo toàn tỉ số độ dài của hai đoạn thẳng cùng nằm trên một đường thẳng hoặc trên hai đường thẳng song song.",
        "Hình biểu diễn: Tam giác biểu diễn tam giác bất kỳ; hình bình hành/chữ nhật/vuông biểu diễn bằng hình bình hành; hình tròn biểu diễn bằng hình elip."
      ],
      "ask": [
        "`[SUY LUẬN]` Trung điểm M của đoạn thẳng AB qua phép chiếu biến thành điểm gì của đoạn A'B'?",
        "`[PHÁT HIỆN]` Tại sao hình tròn lại biểu diễn thành elip?"
      ],
      "cue": "Bảng tổng kết: Giữ nguyên (Song song, Thẳng hàng, Tỉ số đoạn thẳng) / Mất đi (Độ dài, Độ lớn góc, Vuông góc).",
      "close": "Song song và tỉ số đoạn song song được bảo toàn; vuông góc và độ dài tuyệt đối không được bảo toàn."
    },
    "s4": {
      "bat": "AI giải: Cho tam giác vuông cân ABC tại A trong không gian. Khi vẽ hình biểu diễn của tam giác ABC lên mặt phẳng giấy, AI bắt buộc phải vẽ góc A là một góc vuông 90 độ.",
      "chung": "Góc vuông không được bảo toàn qua phép chiếu song song. Vẽ hình biểu diễn tam giác vuông bằng tam giác có góc 90 độ sẽ làm hình vẽ không gian bị méo mó và khó nhìn.",
      "sua": "Quy tắc hình biểu diễn: Hình biểu diễn của một tam giác vuông (hoặc cân, đều) là một tam giác bất kỳ, ta chỉ cần đánh dấu ký hiệu góc vuông vào đỉnh A.",
      "cue": "Nhắc lại: Phép chiếu song song không bảo toàn độ lớn góc.",
      "lookFor": "HS chỉ ra góc vuông không bảo toàn trong hình biểu diễn."
    },
    "s6": {
      "hints": {
        "M": "hình biểu diễn của hình bình hành, chữ nhật, vuông, thoi đều vẽ bằng hình bình hành.",
        "S": "trung điểm của đoạn thẳng luôn biến thành trung điểm của đoạn thẳng hình chiếu.",
        "C": "dựng hình biểu diễn đường tròn nội tiếp hoặc ngoại tiếp đa diện bằng elip tiếp xúc."
      },
      "lookFor": "HS M vẽ đúng hình bình hành; HS S chia đúng trung điểm; HS C vẽ đúng elip."
    },
    "postCheck": {
      "q": "Trong không gian, điểm M là trung điểm đoạn AB. Qua phép chiếu song song, vị trí của M' đối với A'B' như thế nào?",
      "a": "M' là trung điểm của đoạn thẳng A'B' (vì phép chiếu song song bảo toàn tỉ số đoạn thẳng: MA/MB = 1 => M'A'/M'B' = 1).",
      "ds": [
        {
          "t": "\"Phép chiếu song song biến hai đường song song thành hai đường song song hoặc trùng nhau\"",
          "v": "Đúng"
        },
        {
          "t": "\"Hình biểu diễn của hình vuông bắt buộc phải là hình vuông\"",
          "v": "Sai — biểu diễn bằng hình bình hành"
        },
        {
          "t": "\"Phép chiếu song song bảo toàn tỉ số của hai đoạn thẳng cùng phương\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra tính chất bảo toàn trung điểm."
    },
    "s8Close": "Bảo toàn: Thẳng hàng, Song song, Tỉ số cùng phương; Không bảo toàn: Góc vuông, Độ dài.",
    "s9": {
      "title": "Bản vẽ kỹ thuật cơ khí Isometric và đồ họa game 2.5D",
      "bullets": [
        "Bản vẽ kỹ thuật cơ khí tiêu chuẩn dùng phép chiếu trục đo đẳng cự (Isometric) - một dạng phép chiếu song song.",
        "Các tựa game huyền thoại (Diablo, Age of Empires, SimCity) dùng đồ họa Isometric để tạo cảm giác 3D mà không tốn tài nguyên dựng hình.",
        "Mọi tỷ lệ kích thước song song trong game được giữ nguyên khi camera di chuyển."
      ],
      "cue": "Hỏi: \"Tại sao trong game chiến thuật góc nhìn chéo, các tòa nhà ở xa không bị nhỏ đi như mắt người nhìn?\""
    },
    "exit": [
      "Nêu 3 tính chất được bảo toàn qua phép chiếu song song.",
      "Nêu 1 bẫy (cố vẽ góc vuông trong hình biểu diễn).",
      "Tự đánh giá M / S / C.",
      "Hình biểu diễn của hình thang cân là hình gì?"
    ],
    "exitCue": "Nhìn lại bóng khung giàn giáo dưới ánh mặt trời.",
    "after": "- Chuẩn bị bài tiếp theo: Luyện tập phép chiếu song song.",
    "snapshot": {
      "focus": "Hình thành định nghĩa phép chiếu song song, các tính chất bảo toàn cơ bản và quy tắc vẽ hình biểu diễn của các hình phẳng trong không gian.",
      "formulas": [
        "A, B, C \\text{ thẳng hàng, } B \\text{ nằm giữa } A, C \\implies A', B', C' \\text{ thẳng hàng, } B' \\text{ nằm giữa } A', C'",
        "AB \\parallel CD \\implies A'B' \\parallel C'D' \\text{ hoặc trùng nhau}",
        "\\dfrac{A'B'}{C'D'} = \\dfrac{AB}{CD} \\quad (AB \\parallel CD)"
      ],
      "boardKnowledge": [
        "I. Phép chiếu song song: Mặt phẳng chiếu (α), phương chiếu d không song song với (α).",
        "II. Tính chất bảo toàn: Thẳng hàng, thứ tự điểm, song song, tỉ số hai đoạn thẳng cùng phương.",
        "III. Hình biểu diễn: Tam giác -> Tam giác; Hình bình hành/chữ nhật/vuông/thoi -> Hình bình hành; Hình tròn -> Elip."
      ],
      "examples": [
        {
          "question": "Hình biểu diễn của hình thang ABCD có đáy lớn AB = 2CD là hình gì?",
          "solution": "Là hình thang A'B'C'D' có hai đáy A'B' // C'D' và độ dài đáy lớn A'B' = 2C'D' (tính song song và tỉ số đáy được bảo toàn)."
        },
        {
          "question": "Hai đoạn thẳng AB và CD cắt nhau tại trung điểm I của mỗi đoạn. Hình biểu diễn của chúng có tính chất gì?",
          "solution": "Hai đoạn thẳng A'B' và C'D' cắt nhau tại trung điểm I' của mỗi đoạn (bảo toàn giao điểm và trung điểm), tạo thành hình bình hành A'C'B'D'."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Hình biểu diễn của một tam giác đều là hình gì?",
          "answer": "Là một tam giác bất kỳ."
        },
        {
          "level": "NB",
          "question": "Phép chiếu song song có bảo toàn góc vuông không?",
          "answer": "Không bảo toàn góc vuông."
        },
        {
          "level": "TH",
          "question": "Cho tứ giác ABCD là hình thoi. Hình biểu diễn của ABCD là hình gì?",
          "answer": "Là hình bình hành."
        },
        {
          "level": "TH",
          "question": "Nếu đoạn AB song song với phương chiếu d thì hình chiếu của AB trên mặt phẳng chiếu là gì?",
          "answer": "Là một điểm (điểm A' trùng B')."
        },
        {
          "level": "VD",
          "question": "Cho hình chóp S.ABCD có đáy là hình bình hành. Gọi M là trung điểm SC. Dựng hình chiếu của M theo phương chiếu SO lên mặt phẳng đáy (ABCD).",
          "answer": "Trong mp(SAC), tia SO cắt AC tại O (tâm đáy). Kẻ đường thẳng qua M song song với SO cắt AC tại M'. Vì M là trung điểm SC và MM' // SO nên M' là trung điểm của OC. Vậy M' nằm trên đoạn OC với OM' = M'C."
        },
        {
          "level": "VD",
          "question": "Vẽ hình biểu diễn của một hình lục giác đều.",
          "answer": "Lục giác đều ABCDEF gồm hai hình thang cân ABCD và AFED ghép lại. Hình biểu diễn gồm hai hình thang A'B'C'D' và A'F'E'D' có chung đáy lớn A'D' với A'D' = 2B'C' = 2F'E'."
        }
      ],
      "quick": [
        {
          "question": "Có thể dùng hình vuông để biểu diễn hình chữ nhật trong không gian không?",
          "solution": "Được, vì hình vuông cũng là một hình bình hành đặc biệt, nhưng thông thường ta vẽ hình bình hành để trực quan hơn."
        },
        {
          "question": "Phép chiếu song song có bảo toàn diện tích của hình phẳng không?",
          "solution": "Không, diện tích hình chiếu thay đổi theo góc nghiêng của mặt phẳng đối với phương chiếu."
        }
      ],
      "mistakes": [
        "Cố gắng vẽ đúng góc vuông hoặc góc 60 độ trong hình biểu diễn không gian.",
        "Vẽ hai đường thẳng song song trong không gian thành hai đường cắt nhau trên hình biểu diễn.",
        "Sai tỉ số độ dài của hai đoạn thẳng cùng phương."
      ]
    },
    "aiError": {
      "category": "Lỗi quy tắc",
      "wrongSolution": "AI giải: Khi vẽ hình biểu diễn của hình chữ nhật ABCD có AB = 2AD, AI vẽ một hình bình hành A'B'C'D' và đo lấy góc B'A'D' = 90 độ và cạnh A'B' = 2A'D'.",
      "correction": "Góc vuông không được bảo toàn nên không cần và không nên vẽ góc 90 độ. Tuy nhiên tỉ số giữa hai cạnh không song song (AB và AD) CŨNG KHÔNG ĐƯỢC BẢO TOÀN trong phép chiếu song song, do đó không bắt buộc A'B' = 2A'D'. AI đã áp dụng sai quy tắc bảo toàn tỉ số.",
      "proof": "Định lý SGK: Phép chiếu song song CHỈ bảo toàn tỉ số độ dài của hai đoạn thẳng nằm trên hai đường thẳng SONG SONG hoặc CÙNG NẰM TRÊN MỘT ĐƯỜNG THẲNG. AB và AD vuông góc (cắt nhau) nên tỉ số của chúng không được bảo toàn.",
      "whyAiError": "Mô hình mở rộng nhầm lẫn quy tắc bảo toàn tỉ số từ các đoạn thẳng song song sang mọi cặp đoạn thẳng bất kỳ.",
      "teacherPrompt": "AI giữ nguyên tỉ số AB/AD = 2 trên hình biểu diễn. Em hãy chỉ lỗi quy tắc và sửa lại: tỉ số đoạn thẳng chỉ được bảo toàn trong điều kiện nào?",
      "studentProduct": "Ghi “Lỗi quy tắc: chỉ bảo toàn tỉ số hai đoạn thẳng cùng phương”, khẳng định tỉ số hai cạnh kề không bắt buộc bằng 2.",
      "boardPrompt": "AI bắt buộc tỉ số hai cạnh cắt nhau phải bằng nhau trên hình biểu diễn. Điều kiện để tỉ số được bảo toàn là gì?",
      "libraryTitle": "Lỗi AI ngộ nhận phép chiếu song song bảo toàn tỉ số của hai đoạn thẳng cắt nhau"
    }
  },
  {
    "key": "11-13-95",
    "grade": 11,
    "week": 13,
    "period": 95,
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
    "title": "Luyện tập phép chiếu song song",
    "goals": {
      "must": "Vận dụng thành thạo tính chất bảo toàn tính song song, thẳng hàng và tỉ số để giải các bài toán dựng hình biểu diễn.",
      "should": "Dựng được hình biểu diễn của các khối đa diện quen thuộc (lăng trụ, chóp, hộp) và xác định giao điểm bằng phép chiếu.",
      "could": "Giải bài toán tìm thiết diện của hình hộp, hình chóp bằng phương pháp chiếu song song."
    },
    "opening": "Hôm nay ta luyện tập vẽ chuẩn xác hình biểu diễn của các khối không gian phức tạp và ứng dụng phép chiếu song song để xác định thiết diện.",
    "focusQuestion": "Tại sao việc xác định các đường song song trong hình hộp giúp ta vẽ hình biểu diễn nhanh gấp nhiều lần?",
    "axis": "**Dựng hình biểu diễn của khối lăng trụ tam giác $ABC.A'B'C'$:**\n- Đáy $ABC$ là một tam giác bất kỳ trong không gian $\\implies$ hình biểu diễn là một tam giác $A_0 B_0 C_0$.\n- Các cạnh bên $AA', BB', CC'$ song song và bằng nhau trong không gian:\n  - Phép chiếu song song bảo toàn tính song song và tỉ số đoạn thẳng cùng phương.\n  - Do đó trong hình biểu diễn, các đoạn $A_0 A_0', B_0 B_0', C_0 C_0'$ phải **song song và có độ dài bằng nhau**.\n- Nối các đỉnh $A_0', B_0', C_0'$ ta được đáy trên của hình lăng trụ.\n- **Quy tắc nét khuất:**\n  - Cạnh nhìn thấy vẽ bằng nét liền (solid line).\n  - Cạnh bị che khuất vẽ bằng nét đứt (dashed line).",
    "s1": {
      "title": "Dựng các cạnh bên của lăng trụ",
      "context": "Đáy lăng trụ đã vẽ là tam giác ABC. Cạnh bên AA' được vẽ nghiêng một góc tự chọn.",
      "question": "Các cạnh bên BB' và CC' còn lại bắt buộc phải vẽ như thế nào so với AA'?",
      "options": [
        "Song song và có cùng độ dài với AA'",
        "Chỉ cần song song, độ dài tùy ý",
        "Vuông góc với đáy"
      ],
      "correct": 0,
      "why": "Trong không gian các cạnh bên của lăng trụ song song và bằng nhau, tính chất này được bảo toàn qua phép chiếu song song.",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu vẽ BB' dài hơn AA' thì hình biểu diễn sẽ biến thành hình gì?",
        "`[SO SÁNH]` Các cạnh của hình hộp có mấy nhóm song song với nhau?"
      ],
      "cue": "Vẽ tam giác đáy ABC, dựng 3 vectơ bằng nhau xuất phát từ A, B, C.",
      "lookFor": "HS giữ đúng tính song song và độ dài bằng nhau của các cạnh bên."
    },
    "s3": {
      "title": "Hệ thống quy tắc dựng hình biểu diễn khối đa diện",
      "steps": [
        "Quy tắc 1: Xác định mặt đáy và vẽ hình biểu diễn của đáy (dùng hình bình hành cho tứ giác, tam giác cho đáy 3 cạnh).",
        "Quy tắc 2: Dựng các cạnh bên song song và bằng nhau (lăng trụ) hoặc nối đỉnh S với các đỉnh đáy (hình chóp).",
        "Quy tắc 3: Kiểm tra tính song song của các mặt đối diện (hình hộp có 3 cặp mặt đối song song).",
        "Quy tắc 4: Phân biệt nét thấy (nét liền) và nét khuất (nét đứt) tùy theo góc quan sát."
      ],
      "ask": [
        "`[SUY LUẬN]` Trong hình chóp tam giác S.ABC, thường có mấy cạnh bị khuất?",
        "`[PHÁT HIỆN]` Làm thế nào để vẽ hình biểu diễn hình chóp đều?"
      ],
      "cue": "Bảng đối chiếu nét đứt / nét liền trong hình học không gian.",
      "close": "Cạnh đối song song phải vẽ song song; tỉ số cùng phương phải đúng; nét che khuất vẽ bằng nét đứt."
    },
    "s4": {
      "bat": "AI giải: Vẽ hình biểu diễn khối chóp S.ABCD có đáy là hình thoi. AI vẽ đáy thành một hình vuông có 4 góc vuông.",
      "chung": "Vẽ đáy hình thoi thành hình vuông trực diện làm mất tính chiều sâu không gian, các cạnh bên sẽ chồng lấn lên nhau và góc vuông không phải là biểu diễn tự nhiên trong phép chiếu song song.",
      "sua": "Đáy hình thoi phải vẽ thành một hình bình hành nghiêng để tạo góc nhìn không gian 3 chiều rõ ràng.",
      "cue": "Hình thoi luôn biểu diễn bằng hình bình hành nghiêng.",
      "lookFor": "HS nhận ra không vẽ hình đáy ở dạng nhìn trực diện thẳng góc."
    },
    "s6": {
      "hints": {
        "M": "vẽ đáy trước (hình bình hành hoặc tam giác); phân biệt nét đứt nét liền.",
        "S": "dựng các đường trung bình, trung điểm theo đúng tỉ số 1/2.",
        "C": "tìm giao tuyến và thiết diện bằng cách kéo dài các cạnh song song cắt nhau."
      },
      "lookFor": "HS M vẽ đúng lăng trụ; HS S chia đúng tỉ số; HS C tìm được thiết diện."
    },
    "postCheck": {
      "q": "Trong hình biểu diễn của hình hộp ABCD.A'B'C'D', đoạn thẳng AC và BD cắt nhau tại O. O có phải là trung điểm của AC và BD trên hình vẽ không?",
      "a": "Có, vì phép chiếu song song bảo toàn giao điểm và tỉ số đoạn thẳng cùng phương (trung điểm bảo toàn thành trung điểm).",
      "ds": [
        {
          "t": "\"Cạnh bên lăng trụ trên hình vẽ phải song song và bằng nhau\"",
          "v": "Đúng"
        },
        {
          "t": "\"Đường bị che khuất vẽ bằng nét liền\"",
          "v": "Sai — phải vẽ bằng nét đứt"
        },
        {
          "t": "\"Giao điểm của hai đường thẳng được bảo toàn qua phép chiếu song song\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, chú ý quy ước nét vẽ."
    },
    "s8Close": "Đáy vẽ trước; Cạnh bên song song bằng nhau; Nét khuất nét đứt; Bảo toàn tỉ số cùng phương.",
    "s9": {
      "title": "Phần mềm mô hình hóa 3D Blender và SketchUp",
      "bullets": [
        "Giao diện làm việc của kiến trúc sư trong SketchUp luôn có chế độ xem Parallel Projection (chiếu song song).",
        "Chế độ này giúp đo đạc khoảng cách và gióng các cạnh song song chuẩn xác 100% mà không bị biến dạng phối cảnh xa gần.",
        "Là nền tảng để xuất bản vẽ gia công mặt cắt chi tiết trong xây dựng."
      ],
      "cue": "Hỏi: \"Tại sao khi cần đo kích thước chính xác của ngôi nhà trên máy tính, kiến trúc sư phải tắt chế độ nhìn phối cảnh (Perspective)?\""
    },
    "exit": [
      "Nêu các bước dựng hình biểu diễn một hình lăng trụ.",
      "Nêu 1 bẫy (quên vẽ nét đứt cho các cạnh khuất bên trong).",
      "Tự đánh giá M / S / C.",
      "Hình hộp có bao nhiêu cạnh song song với nhau trong mỗi nhóm?"
    ],
    "exitCue": "Nhìn lại hình lăng trụ ABC.A'B'C'.",
    "after": "- Chuẩn bị tiết tự chọn: Khử dạng vô định của giới hạn.",
    "snapshot": {
      "focus": "Luyện tập kỹ năng vẽ hình biểu diễn của các khối đa diện cơ bản (lăng trụ, hộp, chóp); xác định quan hệ song song, giao điểm và thiết diện trên hình biểu diễn.",
      "formulas": [
        "AA' \\parallel BB' \\parallel CC' \\text{ và } AA' = BB' = CC' \\quad (\\text{lăng trụ})",
        "I \\text{ là trung điểm } AB \\implies I' \\text{ là trung điểm } A'B'"
      ],
      "boardKnowledge": [
        "I. Khối lăng trụ: Đáy là tam giác/tứ giác; Cạnh bên song song và bằng nhau.",
        "II. Khối hộp: 6 mặt đều là hình bình hành; 3 nhóm cạnh song song (mỗi nhóm 4 cạnh).",
        "III. Quy ước nét vẽ: Nét liền (nhìn thấy), nét đứt (bị che khuất)."
      ],
      "examples": [
        {
          "question": "Nêu cách vẽ hình biểu diễn của hình chóp tứ giác đều S.ABCD.",
          "solution": "Bước 1: Vẽ đáy ABCD là hình bình hành, xác định tâm O là giao điểm hai đường chéo (vẽ bằng nét đứt). Bước 2: Từ O dựng đường thẳng đứng SO. Bước 3: Nối S với các đỉnh A, B, C, D; phân biệt nét đứt nét liền."
        },
        {
          "question": "Cho hình hộp ABCD.A'B'C'D'. Điểm M thuộc cạnh AB sao cho AM = 2MB. Xác định vị trí điểm M' trên hình biểu diễn.",
          "solution": "Trên đoạn A'B' của hình biểu diễn, lấy điểm M' sao cho A'M' = 2M'B' (vì phép chiếu song song bảo toàn tỉ số trên cùng một đoạn thẳng)."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Hình biểu diễn của đáy hình lăng trụ lục giác đều gồm mấy hình bình hành ghép lại?",
          "answer": "Gồm 2 hình thang cân ghép lại, tức là biểu diễn bằng 2 hình thang có chung đáy lớn."
        },
        {
          "level": "NB",
          "question": "Trong hình lăng trụ tam giác, có mấy cạnh bên?",
          "answer": "Có 3 cạnh bên song song và bằng nhau."
        },
        {
          "level": "TH",
          "question": "Một hình hộp có bao nhiêu đỉnh, bao nhiêu cạnh và bao nhiêu mặt?",
          "answer": "Có 8 đỉnh, 12 cạnh và 6 mặt."
        },
        {
          "level": "TH",
          "question": "Trong hình chóp S.ABCD với đáy ABCD là hình bình hành, giao tuyến của (SAB) và (SCD) được vẽ như thế nào?",
          "answer": "Là đường thẳng d đi qua đỉnh S và song song với AB và CD."
        },
        {
          "level": "VD",
          "question": "Cho hình lăng trụ tam giác ABC.A'B'C'. Gọi G là trọng tâm tam giác ABC. Dựng hình biểu diễn của đoạn thẳng nối A' với G.",
          "answer": "Trên đáy ABC vẽ trung tuyến AI, lấy AG = 2/3 AI (vẽ nét đứt nếu AI khuất). Nối A' với G bằng nét đứt (nằm bên trong khối lăng trụ)."
        },
        {
          "level": "VD",
          "question": "Dựng thiết diện của hình hộp ABCD.A'B'C'D' cắt bởi mặt phẳng đi qua M trên AA' và song song với mặt phẳng (ABCD).",
          "answer": "Mặt phẳng song song với (ABCD) nên cắt các cạnh bên theo các đoạn thẳng song song với các cạnh đáy. Từ M kẻ MN // AB (N trên BB'), NP // BC (P trên CC'), PQ // CD (Q trên DD'). Thiết diện là hình bình hành MNPQ bằng với hai đáy."
        }
      ],
      "quick": [
        {
          "question": "Tại sao các đường trung trực trong tam giác không được vẽ vuông góc trên hình biểu diễn?",
          "solution": "Vì góc vuông không được bảo toàn trong phép chiếu song song."
        },
        {
          "question": "Có bao nhiêu đường chéo trong một hình hộp chữ nhật?",
          "solution": "Có 4 đường chéo cắt nhau tại trung điểm của mỗi đường."
        }
      ],
      "mistakes": [
        "Vẽ sai các cạnh song song thành cắt nhau.",
        "Không dùng nét đứt cho các đoạn nằm bên trong khối đa diện.",
        "Chia sai tỉ số điểm trên cạnh."
      ]
    },
    "aiError": {
      "category": "Lỗi quy tắc",
      "wrongSolution": "AI vẽ: Trong hình chóp S.ABC, AI vẽ toàn bộ 6 cạnh SA, SB, SC, AB, BC, CA đều bằng nét liền (nét thấy).",
      "correction": "Trong hình chóp tam giác S.ABC, luôn có ít nhất một cạnh bị che khuất bởi các mặt bên khác (thường là cạnh đáy nằm phía sau như AC hoặc AB tùy góc nhìn) và bắt buộc phải vẽ bằng NÉT ĐỨT.",
      "proof": "Quy ước biểu diễn không gian: Mọi đường nét bị khuất sau các bề mặt phải vẽ bằng nét đứt (dashed line) để người đọc phân biệt được phần trước và phần sau của vật thể.",
      "whyAiError": "Mô hình không nhận thức được tính chất che khuất quang học ba chiều của các đa diện khép kín.",
      "teacherPrompt": "AI vẽ tất cả các cạnh hình chóp bằng nét liền. Em hãy chỉ lỗi quy ước và sửa lại: quy tắc vẽ nét khuất là gì?",
      "studentProduct": "Ghi “Lỗi quy ước: cạnh bị che khuất phải vẽ nét đứt”, chuyển cạnh khuất thành nét đứt.",
      "boardPrompt": "AI vẽ hình chóp không có nét đứt nào. Quy ước vẽ hình biểu diễn quy định nét khuất như thế nào?",
      "libraryTitle": "Lỗi AI không vẽ nét đứt cho các cạnh bị che khuất trong hình biểu diễn"
    }
  },
  {
    "key": "11-13-96",
    "grade": 11,
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
    "title": "Tự chọn: Khử dạng vô định của giới hạn",
    "goals": {
      "must": "Phân loại chính xác 4 dạng vô định kinh điển: 0/0, ∞/∞, ∞ - ∞, 0 · ∞.",
      "should": "Thành thạo kỹ thuật nhân lượng liên hợp bậc hai, bậc ba và kỹ thuật thêm bớt hằng số để tách giới hạn.",
      "could": "Giải quyết các bài toán giới hạn chứa tham số và các bài toán giới hạn một bên có chứa căn thức."
    },
    "opening": "Dạng vô định là thử thách lớn nhất của giải tích giới hạn — hôm nay ta rèn luyện các vũ khí đặc trị để triệt tiêu mọi dạng vô định 0/0 và ∞ - ∞.",
    "focusQuestion": "Tại sao khi gặp biểu thức vừa chứa căn bậc hai vừa căn bậc ba như √(x+1) + ∛(x-1) - 2 ta phải thêm bớt số 1?",
    "axis": "**Kỹ thuật thêm bớt hằng số khử dạng vô định $0/0$ đa căn thức:**\n- Tính giới hạn: $\\lim_{x \\to 0} \\dfrac{\\sqrt{1 + 2x} - \\sqrt[3]{1 + 3x}}{x^2}$ hoặc $\\lim_{x \\to 0} \\dfrac{\\sqrt{1 + 2x} - \\sqrt[3]{1 + 3x}}{x}$.\n- Xét biểu thức tại $x = 0$: $\\sqrt{1 + 0} = 1$ và $\\sqrt[3]{1 + 0} = 1$. Cả hai căn đều tiến về giá trị $1$.\n- **Kỹ thuật then chốt:** Thêm bớt số $1$ vào tử số để tách thành hai giới hạn quen thuộc:\n  $$\\dfrac{\\sqrt{1 + 2x} - \\sqrt[3]{1 + 3x}}{x} = \\dfrac{\\sqrt{1 + 2x} - 1}{x} - \\dfrac{\\sqrt[3]{1 + 3x} - 1}{x}.$$\n- Tính từng giới hạn thành phần bằng nhân lượng liên hợp:\n  - Giới hạn 1 (liên hợp bậc hai):\n    $$\\lim_{x \\to 0} \\dfrac{(\\sqrt{1 + 2x} - 1)(\\sqrt{1 + 2x} + 1)}{x(\\sqrt{1 + 2x} + 1)} = \\lim_{x \\to 0} \\dfrac{2x}{x(\\sqrt{1 + 2x} + 1)} = \\dfrac{2}{1 + 1} = 1.$$\n  - Giới hạn 2 (liên hợp bậc ba):\n    $$\\lim_{x \\to 0} \\dfrac{1 + 3x - 1}{x[\\sqrt[3]{(1 + 3x)^2} + \\sqrt[3]{1 + 3x} + 1]} = \\dfrac{3}{1 + 1 + 1} = 1.$$\n- Kết quả cuối cùng: $1 - 1 = 0$.",
    "s1": {
      "title": "Thêm bớt số nào vào tử số?",
      "context": "Cần tính lim_{x -> 0} [√(1 + 2x) - ∛(1 + 3x)] / x.",
      "question": "Số hạng hằng số thích hợp cần thêm bớt vào tử số là bao nhiêu?",
      "options": [
        "Số 1 (vì khi thay x = 0 thì căn bằng 1)",
        "Số 0",
        "Số 2"
      ],
      "correct": 0,
      "why": "Tại x = 0 thì √(1+0) = 1 và ∛(1+0) = 1 nên thêm bớt 1 để tách thành (√ - 1) và (∛ - 1).",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu biểu thức là √(4 + x) - ∛(8 + x) thì thêm bớt số mấy?",
        "`[SO SÁNH]` Tại sao không thể nhân liên hợp trực tiếp giữa căn bậc hai và căn bậc ba?"
      ],
      "cue": "Thay x = 0 vào từng căn để tìm giá trị tới hạn của mỗi căn.",
      "lookFor": "HS biết cách thay x0 vào căn để tìm số cần thêm bớt."
    },
    "s3": {
      "title": "Cẩm nang 4 kỹ thuật đặc trị dạng vô định",
      "steps": [
        "Kỹ thuật 1: Phân tích đa thức thành nhân tử (bấm nghiệm / Horner / hằng đẳng thức).",
        "Kỹ thuật 2: Liên hợp bậc 2: $\\sqrt A - B = (A - B^2)/(\\sqrt A + B)$.",
        "Kỹ thuật 3: Liên hợp bậc 3: $\\sqrt[3] A - B = (A - B^3)/(\\sqrt[3]{A^2} + B\\sqrt[3] A + B^2)$.",
        "Kỹ thuật 4: Thêm bớt hằng số $c = f(x_0)$ khi gặp tổng/hiệu các căn khác bậc."
      ],
      "ask": [
        "`[SUY LUẬN]` Horner chia đa thức bậc 3 cho (x - x0) như thế nào?",
        "`[PHÁT HIỆN]` Dạng 0 · ∞ biến đổi về dạng nào quen thuộc?"
      ],
      "cue": "Bảng đối chiếu 4 dạng liên hợp.",
      "close": "Thêm bớt giá trị căn tại x0 -> Tách thành hai phân thức độc lập -> Nhân liên hợp từng phân thức."
    },
    "s4": {
      "bat": "AI giải: Tính lim_{x -> 0} [√(1 + x) - ∛(1 + x)] / x. AI áp dụng hằng đẳng thức a² - b² trực tiếp cho cả hai căn bậc 2 và bậc 3.",
      "chung": "Hai căn thức khác bậc (bậc 2 và bậc 3) không có hằng đẳng thức liên hợp chung trực tiếp. Phải tách rời chúng ra bằng cách thêm bớt số 1.",
      "sua": "Tách tử số thành: [√(1 + x) - 1] - [∛(1 + x) - 1] rồi liên hợp bậc 2 cho nhóm đầu và liên hợp bậc 3 cho nhóm sau.",
      "cue": "Khác bậc căn không gộp liên hợp được, phải chia để trị.",
      "lookFor": "HS nhận diện căn khác bậc phải thêm bớt."
    },
    "s6": {
      "hints": {
        "M": "thay x = x0 để tìm số cần thêm bớt; áp dụng đúng hằng đẳng thức liên hợp bậc 2.",
        "S": "nhớ công thức liên hợp bậc 3 có 3 số hạng ở mẫu: A² + AB + B².",
        "C": "tách thêm bớt đa thức bậc nhất ax + b khi dưới mẫu là x²."
      },
      "lookFor": "HS M thêm bớt đúng số; HS S liên hợp bậc 3 chuẩn; HS C giải được bài toán mẫu x²."
    },
    "postCheck": {
      "q": "Tính giới hạn: $\\lim_{x \\to 1} \\dfrac{\\sqrt{x} - 1}{x - 1}$.",
      "a": "Nhân liên hợp: $\\lim_{x \\to 1} \\dfrac{x - 1}{(x - 1)(\\sqrt x + 1)} = \\lim_{x \\to 1} \\dfrac{1}{\\sqrt x + 1} = \\dfrac{1}{1 + 1} = \\dfrac{1}{2}$.",
      "ds": [
        {
          "t": "\"Liên hợp bậc 3 mẫu gồm 3 số hạng A² + AB + B²\"",
          "v": "Đúng"
        },
        {
          "t": "\"Có thể nhân liên hợp trực tiếp giữa căn bậc hai và căn bậc ba\"",
          "v": "Sai — phải thêm bớt hằng số"
        },
        {
          "t": "\"lim_{x -> 1} (x - 1)/(x² - 1) = 1/2\"",
          "v": "Đúng"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, chú ý rút gọn nhân tử x - 1."
    },
    "s8Close": "Khác bậc căn -> thêm bớt c = f(x0); Bậc 2 mẫu có 2 số hạng; Bậc 3 mẫu có 3 số hạng.",
    "s9": {
      "title": "Ổn định số trong phần mềm đồ họa mô phỏng vật lý",
      "bullets": [
        "Khi tính toán lực hút trọng trường giữa hai thiên thể ở khoảng cách cực gần (r -> 0), phần mềm game thường gặp lỗi chia cho 0 (dạng 0/0).",
        "Lập trình viên áp dụng kỹ thuật xấp xỉ Taylor và khử vô định để tránh sập engine vật lý.",
        "Toán học giải tích đảm bảo thế giới ảo trong game vận hành mượt mà không bị văng vỡ."
      ],
      "cue": "Hỏi: \"Tại sao trong game khi hai nhân vật đè sát vào nhau có thể bị bắn bay lên trời nếu lập trình viên không xử lý tốt giới hạn?\""
    },
    "exit": [
      "Nêu quy tắc thêm bớt hằng số khi gặp căn khác bậc.",
      "Nêu 1 bẫy (nhầm dấu trong lượng liên hợp bậc 3).",
      "Tự đánh giá M / S / C.",
      "Tính lim_{x -> 0} (√(1 + 4x) - 1)/x."
    ],
    "exitCue": "Nhìn lại bài toán thêm bớt số 1 mở đầu.",
    "after": "- Chuẩn bị tiết tự chọn: Hình biểu diễn của khối đa diện.",
    "snapshot": {
      "focus": "Luyện tập chuyên sâu các kỹ thuật khử dạng vô định 0/0 và ∞ - ∞: nhân liên hợp bậc hai, bậc ba; kỹ thuật thêm bớt hằng số và biểu thức phụ.",
      "formulas": [
        "\\sqrt A - B = \\dfrac{A - B^2}{\\sqrt A + B}",
        "\\sqrt[3]{A} - B = \\dfrac{A - B^3}{\\sqrt[3]{A^2} + B\\sqrt[3]{A} + B^2}",
        "\\dfrac{\\sqrt{A} - \\sqrt[3]{B}}{x - x_0} = \\dfrac{\\sqrt{A} - c}{x - x_0} - \\dfrac{\\sqrt[3]{B} - c}{x - x_0} \\quad (c = \\sqrt{A(x_0)} = \\sqrt[3]{B(x_0)})"
      ],
      "boardKnowledge": [
        "I. Phân loại vô định: 0/0 (tại điểm), ∞/∞ (vô cực), ∞ - ∞ (căn thức hiệu), 0 · ∞.",
        "II. Liên hợp bậc 2: Nhân thêm lượng cộng (√A + B).",
        "III. Liên hợp bậc 3: Nhân thêm bình phương thiếu (∛A² + B∛A + B²).",
        "IV. Thêm bớt: Chọn c = f(x0) để tách các căn khác bậc."
      ],
      "examples": [
        {
          "question": "Tính giới hạn: lim_{x -> 2} (x² - 3x + 2) / (x² - 4).",
          "solution": "Tách tử = (x - 2)(x - 1), mẫu = (x - 2)(x + 2). Giới hạn = lim_{x -> 2} (x - 1)/(x + 2) = (2 - 1)/(2 + 2) = 1/4."
        },
        {
          "question": "Tính giới hạn: lim_{x -> 0} [∛(1 + x) - 1] / x.",
          "solution": "Nhân liên hợp bậc 3: lim_{x -> 0} (1 + x - 1) / [x(∛(1+x)² + ∛(1+x) + 1)] = lim 1 / [1 + 1 + 1] = 1/3."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Thay x = 0 vào √(4 + 3x) được giá trị bao nhiêu?",
          "answer": "Được √4 = 2."
        },
        {
          "level": "NB",
          "question": "Biểu thức liên hợp bậc 2 của (√(x + 1) - 2) là gì?",
          "answer": "Là (√(x + 1) + 2)."
        },
        {
          "level": "TH",
          "question": "Tính giới hạn: lim_{x -> 3} (x² - 9)/(x² - 2x - 3).",
          "answer": "(x - 3)(x + 3) / [(x - 3)(x + 1)] = (3 + 3)/(3 + 1) = 6/4 = 3/2."
        },
        {
          "level": "TH",
          "question": "Tính giới hạn: lim_{x -> 0} [√(1 + 6x) - 1]/x.",
          "answer": "Nhân liên hợp: lim 6x / [x(√(1+6x) + 1)] = 6 / 2 = 3."
        },
        {
          "level": "VD",
          "question": "Tính giới hạn: lim_{x -> 0} [√(1 + 2x) - ∛(1 + 3x)] / x².",
          "answer": "Thêm bớt x + 1 vào tử: [√(1+2x) - (x+1)] + [(x+1) - ∛(1+3x)]. Phân tích giới hạn thành phần: √(1+2x) - (x+1) = -x²/(√ + x + 1) -> -1/2. Tương tự nhóm sau ra 1. Tổng giới hạn bằng -1/2 + 1 = 1/2."
        },
        {
          "level": "VD",
          "question": "Tìm a để giới hạn lim_{x -> 1} (x² - ax + 1)/(x - 1) hữu hạn và tính giới hạn đó.",
          "answer": "Tử số phải có nghiệm x = 1: 1 - a + 1 = 0 <=> a = 2. Khi đó tử là x² - 2x + 1 = (x - 1)², giới hạn = lim_{x -> 1} (x - 1) = 0."
        }
      ],
      "quick": [
        {
          "question": "Tại sao công thức liên hợp bậc ba của hiệu lại có dấu cộng ở mẫu số?",
          "solution": "Vì hằng đẳng thức a³ - b³ = (a - b)(a² + ab + b²) nên mẫu là a² + ab + b² mang toàn dấu cộng khi b > 0."
        },
        {
          "question": "Nếu gặp dạng 0/0 nhưng sau khi rút gọn vẫn còn dạng 0/0 thì phải làm gì?",
          "solution": "Tiếp tục phân tích nhân tử hoặc nhân liên hợp lần thứ hai để triệt tiêu nhân tử bậc cao hơn."
        }
      ],
      "mistakes": [
        "Quên dấu ngoặc vuông khi nhân liên hợp dẫn đến sai dấu các số hạng sau.",
        "Nhầm hằng đẳng thức liên hợp bậc 3 thành a³ - b³ = (a - b)(a² - ab + b²).",
        "Thêm bớt sai giá trị hằng số khiến dạng 0/0 không bị triệt tiêu."
      ]
    },
    "aiError": {
      "category": "Lỗi đại số",
      "wrongSolution": "AI viết: Nhân lượng liên hợp bậc 3 cho ∛(1 + x) - 1: Mẫu số là [∛(1 + x)² - ∛(1 + x) + 1] nên giới hạn bằng 1 / (1 - 1 + 1) = 1.",
      "correction": "Hằng đẳng thức chuẩn: a³ - b³ = (a - b)(a² + ab + b²). Lượng liên hợp của (a - b) là (a² + ab + b²) với DẤU CỘNG ở giữa, không phải dấu trừ. Sửa lại: Mẫu số phải là 1 + 1 + 1 = 3, kết quả giới hạn là 1/3.",
      "proof": "Ta có [∛(1+x) - 1][∛(1+x)² + ∛(1+x) + 1] = [∛(1+x)]³ - 1³ = 1 + x - 1 = x. Nếu dùng dấu trừ ở giữa thì tích là a³ + b³ chứ không triệt tiêu được.",
      "whyAiError": "Mô hình nhầm lẫn giữa hai hằng đẳng thức a³ - b³ (liên hợp dấu cộng) và a³ + b³ (liên hợp dấu trừ).",
      "teacherPrompt": "AI dùng dấu trừ trong lượng liên hợp của hiệu hai căn bậc ba. Em hãy chỉ lỗi đại số và sửa lại công thức đúng.",
      "studentProduct": "Ghi “Lỗi đại số: nhầm dấu liên hợp bậc ba của hiệu”, sửa mẫu thành dấu cộng và kết quả 1/3.",
      "boardPrompt": "AI viết lượng liên hợp của (a - b) là (a² - ab + b²). Dấu đúng của các số hạng trong ngoặc là gì?",
      "libraryTitle": "Lỗi AI dùng sai dấu trong lượng liên hợp bậc ba của hiệu hai biểu thức"
    }
  },
  {
    "key": "11-13-97",
    "grade": 11,
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
    "title": "Tự chọn: Hình biểu diễn của khối đa diện",
    "goals": {
      "must": "Nắm vững kỹ năng dựng hình biểu diễn cho các khối đa diện phức tạp: chóp cụt, lăng trụ xiên, bát diện đều.",
      "should": "Xác định chính xác vị trí tương đối của các đường thẳng chéo nhau và quan hệ song song trên hình biểu diễn.",
      "could": "Dựng thiết diện phẳng cắt khối đa diện và tính tỉ số thể tích/diện tích phân chia thông qua hình biểu diễn."
    },
    "opening": "Làm thế nào các họa sĩ thời Phục hưng và các kiến trúc sư ngày nay có thể vẽ những khối đa diện phức tạp 20 mặt lên một trang giấy phẳng? Hôm nay ta học kỹ thuật dựng hình biểu diễn đỉnh cao.",
    "focusQuestion": "Tại sao khi dựng hình biểu diễn của hình chóp cụt ta bắt buộc phải kéo dài các cạnh bên?",
    "axis": "**Quy trình dựng hình biểu diễn chuẩn xác của hình chóp cụt tứ giác $ABCD.A'B'C'D'$:**\n- Trong không gian, hình chóp cụt được tạo thành khi cắt hình chóp $S.ABCD$ bởi một mặt phẳng song song với đáy.\n- Do đó:\n  - Hai đáy $ABCD$ và $A'B'C'D'$ là hai hình bình hành có các cạnh tương ứng **song song với nhau**.\n  - Các đường thẳng chứa cạnh bên $AA', BB', CC', DD'$ **phải đồng quy tại một điểm $S$** (đỉnh của hình chóp ban đầu).\n- **Quy trình dựng hình 4 bước chuẩn:**\n  1. Dựng đáy lớn $ABCD$ (hình bình hành).\n  2. Chọn đỉnh $S$ bên ngoài mặt phẳng đáy, nối $SA, SB, SC, SD$.\n  3. Lấy điểm $A'$ trên $SA$. Kẻ $A'B' \\parallel AB$ ($B' \\in SB$), $B'C' \\parallel BC$ ($C' \\in SC$), $C'D' \\parallel CD$ ($D' \\in SD$).\n  4. Nối $D'A'$ (tự động song song với $DA$). Xóa hoặc vẽ nét mảnh các đoạn thừa $SA', SB', SC', SD'$.\n- **Cảnh báo sai lầm:** Nếu vẽ hai đáy hình bình hành độc lập rồi nối bừa các cạnh bên thì các cạnh bên sẽ KHÔNG đồng quy, hình biểu diễn sai bản chất toán học.",
    "s1": {
      "title": "Các cạnh bên của chóp cụt có đồng quy?",
      "context": "Hình chóp cụt ABCD.A'B'C'D' có hai đáy song song.",
      "question": "Khi kéo dài các đường thẳng AA', BB', CC', DD', chúng có quan hệ gì?",
      "options": [
        "Đồng quy tại một điểm S",
        "Song song với nhau",
        "Cắt nhau từng đôi một tại các điểm khác nhau"
      ],
      "correct": 0,
      "why": "Theo định nghĩa, hình chóp cụt sinh ra từ hình chóp bị cắt bởi mặt phẳng song song đáy nên các cạnh bên kéo dài phải đồng quy tại đỉnh S.",
      "discuss": [
        "`[PHÁT HIỆN]` Nếu các cạnh bên song song với nhau thì khối đa diện biến thành hình gì?",
        "`[SO SÁNH]` Tỉ số A'B'/AB có bằng tỉ số SA'/SA không?"
      ],
      "cue": "Vẽ hình chóp cụt và kéo dài các cạnh bên lên phía trên.",
      "lookFor": "HS nhận ra tính đồng quy tại đỉnh S của các cạnh bên chóp cụt."
    },
    "s3": {
      "title": "Kỹ thuật dựng hình biểu diễn các khối đa diện nâng cao",
      "steps": [
        "Khối chóp cụt: Dựng hình chóp gốc có đỉnh $S$ trước $\\to$ dựng đáy nhỏ bằng các đường song song $\\to$ tẩy nét thừa.",
        "Khối lăng trụ xiên: Dựng đáy $ABC$ $\\to$ dựng vectơ $\\vec u$ nghiêng bất kỳ $\\to$ dựng các cạnh bên bằng $\\vec u$.",
        "Khối bát diện đều: Dựng hình bình hành tâm $O$ (hình biểu diễn hình vuông ở giữa) $\\to$ lấy 2 đỉnh $S, S'$ đối xứng qua $O$.",
        "Kiểm tra nét khuất: Quan sát mặt nào hướng về mắt người xem (nét liền), mặt nào bị che lấp (nét đứt)."
      ],
      "ask": [
        "`[SUY LUẬN]` Bát diện đều có bao nhiêu đỉnh, cạnh, mặt?",
        "`[PHÁT HIỆN]` Tại sao bát diện đều lại có hình vuông ở giữa?"
      ],
      "cue": "Sơ đồ các bước dựng hình chóp cụt và bát diện đều.",
      "close": "Chóp cụt dựng từ đỉnh S đồng quy; Lăng trụ xiên dựng từ các vectơ bằng nhau; Bát diện đều dựng từ tâm O."
    },
    "s4": {
      "bat": "AI giải: Dựng hình biểu diễn chóp cụt: AI vẽ hình chữ nhật đáy lớn ABCD, vẽ hình chữ nhật đáy nhỏ A'B'C'D' ở phía trên, rồi nối AA', BB', CC', DD'.",
      "chung": "Vẽ độc lập hai đáy mà không qua phép chiếu từ đỉnh S khiến 4 cạnh bên không đồng quy tại một điểm, vi phạm bản chất hình học của hình chóp cụt.",
      "sua": "Phải chọn một đỉnh S, lấy A' trên SA rồi kẻ các đường thẳng song song với các cạnh đáy để định vị B', C', D'. Khi đó 4 cạnh bên tự động đồng quy tại S.",
      "cue": "Nhắc lại: Chóp cụt có nguồn gốc từ hình chóp bị cắt ngang.",
      "lookFor": "HS chỉ ra các cạnh bên phải đồng quy tại đỉnh S."
    },
    "s6": {
      "hints": {
        "M": "chấm đỉnh S phía trên; nối xuống 4 góc; chọn A' rồi kẻ song song để tìm các đỉnh còn lại.",
        "S": "vẽ bát diện đều: vẽ hình bình hành ABCD trước, lấy tâm O, lấy S phía trên O và S' phía dưới O sao cho SO = S'O.",
        "C": "dựng thiết diện qua trung điểm các cạnh bằng cách nối các điểm đồng phẳng."
      },
      "lookFor": "HS M dựng đúng chóp cụt qua S; HS S dựng đúng bát diện; HS C tìm đúng thiết diện."
    },
    "postCheck": {
      "q": "Trong hình biểu diễn bát diện đều S.ABCD.S', tứ giác ABCD ở giữa được biểu diễn bằng hình gì và hai đỉnh S, S' có vị trí như thế nào?",
      "a": "ABCD biểu diễn bằng hình bình hành; S và S' nằm trên đường thẳng đi qua tâm O của hình bình hành và đối xứng nhau qua O ($SO = S'O$).",
      "ds": [
        {
          "t": "\"Các cạnh bên của hình chóp cụt kéo dài phải đồng quy tại một điểm\"",
          "v": "Đúng"
        },
        {
          "t": "\"Bát diện đều có 8 mặt là các tam giác đều\"",
          "v": "Đúng"
        },
        {
          "t": "\"Hình biểu diễn hai đáy chóp cụt có thể vẽ độc lập không cần song song\"",
          "v": "Sai — các cạnh tương ứng phải song song"
        }
      ],
      "cue": "Đổi phiếu chấm chéo, kiểm tra tính đối xứng của bát diện đều."
    },
    "s8Close": "Chóp cụt: Cạnh bên đồng quy tại S, cạnh đáy tương ứng song song; Bát diện: Đối xứng qua tâm O.",
    "s9": {
      "title": "Cấu trúc phân tử Carbon Fulleren và tinh thể học nano",
      "bullets": [
        "Phân tử Buckminsterfullerene C60 có cấu trúc khối đa diện 32 mặt (bóng đá truncated icosahedron).",
        "Các nhà khoa học vật liệu nano dùng hình biểu diễn không gian để lập bản đồ liên kết cộng hóa trị giữa các nguyên tử.",
        "Toán học đa diện là chìa khóa mở ra kỷ nguyên vật liệu siêu bền siêu nhẹ của thế kỷ 21."
      ],
      "cue": "Hỏi: \"Tại sao quả bóng đá tiêu chuẩn lại được khâu từ các miếng ngũ giác và lục giác ghép lại mà không phải miếng vuông?\""
    },
    "exit": [
      "Nêu 4 bước dựng hình biểu diễn một hình chóp cụt.",
      "Nêu 1 bẫy (vẽ các cạnh bên chóp cụt không đồng quy).",
      "Tự đánh giá M / S / C.",
      "Khối bát diện đều có bao nhiêu đỉnh và bao nhiêu mặt?"
    ],
    "exitCue": "Nhìn lại hình ảnh cấu trúc phân tử Carbon nano.",
    "after": "- Ôn tập toàn bộ kiến thức hình biểu diễn và giới hạn để chuẩn bị kiểm tra giữa kỳ.",
    "snapshot": {
      "focus": "Thành thạo phương pháp dựng hình biểu diễn cho các khối đa diện phức tạp: hình chóp cụt, hình lăng trụ xiên, khối đa diện đều (bát diện đều); kiểm tra tính đồng quy và quan hệ song song.",
      "formulas": [
        "AA' \\cap BB' \\cap CC' \\cap DD' = \\{S\\} \\quad (\\text{cạnh bên chóp cụt đồng quy})",
        "A'B' \\parallel AB, B'C' \\parallel BC, C'D' \\parallel CD, D'A' \\parallel DA",
        "SO = S'O \\quad (\\text{đỉnh bát diện đều đối xứng qua tâm đáy})"
      ],
      "boardKnowledge": [
        "I. Hình chóp cụt: Đáy lớn // đáy nhỏ (cạnh tương ứng //); Cạnh bên đồng quy tại đỉnh S.",
        "II. Hình lăng trụ xiên: Cạnh bên song song và bằng nhau nhưng không vuông góc với đáy.",
        "III. Bát diện đều: 6 đỉnh, 12 cạnh, 8 mặt; Gồm hai hình chóp tứ giác ghép đáy chung ABCD."
      ],
      "examples": [
        {
          "question": "Mô tả các bước dựng hình biểu diễn của khối chóp cụt tam giác ABC.A'B'C'.",
          "solution": "Bước 1: Vẽ tam giác ABC làm đáy lớn. Bước 2: Lấy điểm S ngoài mp(ABC), nối SA, SB, SC. Bước 3: Lấy A' trên SA, kẻ A'B' // AB (B' trên SB), B'C' // BC (C' trên SC). Nối C'A' (tự động // CA). Bước 4: Tẩy hoặc làm mờ các đoạn SA', SB', SC'."
        },
        {
          "question": "Cho hình hộp ABCD.A'B'C'D'. Chứng minh 4 đường chéo AC', BD', CA', DB' đồng quy tại một điểm.",
          "solution": "Xét tứ giác ACC'A': Có AA' // CC' và AA' = CC' nên ACC'A' là hình bình hành. Hai đường chéo AC' và CA' cắt nhau tại trung điểm O của mỗi đường. Tương tự BDD'B' là hình bình hành, hai đường chéo BD' và DB' cắt nhau tại trung điểm O. Vậy 4 đường chéo đồng quy tại O."
        }
      ],
      "exercises": [
        {
          "level": "NB",
          "question": "Khối bát diện đều có bao nhiêu mặt?",
          "answer": "Có 8 mặt (đều là các tam giác đều)."
        },
        {
          "level": "NB",
          "question": "Hình chóp cụt tứ giác có bao nhiêu đỉnh?",
          "answer": "Có 8 đỉnh (4 đỉnh đáy lớn và 4 đỉnh đáy nhỏ)."
        },
        {
          "level": "TH",
          "question": "Trong hình lăng trụ, các mặt bên là những hình gì?",
          "answer": "Là các hình bình hành."
        },
        {
          "level": "TH",
          "question": "Nếu một khối đa diện có 6 đỉnh và 8 mặt thì có bao nhiêu cạnh?",
          "answer": "Theo công thức Euler Đ - C + M = 2: 6 - C + 8 = 2 <=> C = 12 cạnh (khối bát diện)."
        },
        {
          "level": "VD",
          "question": "Dựng hình biểu diễn của thiết diện cắt khối bát diện đều S.ABCD.S' bởi mặt phẳng đi qua trung điểm của các cạnh SA, SB, SC, SD.",
          "answer": "Gọi M, N, P, Q lần lượt là trung điểm của SA, SB, SC, SD. Trong các tam giác SAB, SBC, SCD, SDA, các đoạn MN, NP, PQ, QM là đường trung bình nên MN // AB, NP // BC, PQ // CD, QM // DA. Thiết diện là hình bình hành MNPQ song song với đáy ABCD và có diện tích bằng 1/4 diện tích ABCD."
        },
        {
          "level": "VD",
          "question": "Cho hình lăng trụ ABC.A'B'C'. Gọi M là trung điểm của B'C'. Dựng giao điểm của đường thẳng AM với mặt phẳng (A'BC).",
          "answer": "Trong mp(BCC'B'), gọi I = BC ∩ B'M (vì BC // B'C' và B'M = 1/2 B'C' nên B'M cắt BC tại I kéo dài). Khi đó đường thẳng AM và AI cùng nằm trong mp(A, B'M). Đường thẳng AM cắt A'I tại điểm K cần tìm."
        }
      ],
      "quick": [
        {
          "question": "Có bao nhiêu khối đa diện đều trong không gian ba chiều?",
          "solution": "Chỉ có đúng 5 khối đa diện đều: tứ diện đều, khối lập phương, bát diện đều, 12 mặt đều và 20 mặt đều."
        },
        {
          "question": "Tâm đối xứng của hình hộp là điểm nào?",
          "solution": "Là giao điểm của 4 đường chéo của hình hộp."
        }
      ],
      "mistakes": [
        "Vẽ các cạnh bên của chóp cụt song song với nhau thay vì đồng quy.",
        "Quên kiểm tra tính song song của các cạnh đáy tương ứng trong chóp cụt.",
        "Vẽ sai số mặt hoặc số đỉnh của các khối đa diện đều."
      ]
    },
    "aiError": {
      "category": "Lỗi khái niệm",
      "wrongSolution": "AI viết: Dựng hình biểu diễn hình chóp cụt tứ giác bằng cách vẽ hai hình bình hành ABCD và A'B'C'D' có kích thước tùy ý, sau đó nối các cặp đỉnh tương ứng A-A', B-B', C-C', D-D'.",
      "correction": "Hai đáy của hình chóp cụt không thể vẽ tùy ý độc lập. Các cặp cạnh tương ứng BẮT BUỘC phải song song: A'B' // AB, B'C' // BC,... và các đường thẳng chứa cạnh bên kéo dài phải ĐỒNG QUY tại đỉnh S của hình chóp ban đầu.",
      "proof": "Định nghĩa: Hình chóp cụt là phần hình chóp nằm giữa đáy và một thiết diện song song với đáy. Do thiết diện song song với đáy nên theo tính chất giao tuyến, các cạnh tương ứng phải song song và các cạnh bên xuất phát từ cùng đỉnh chóp S.",
      "whyAiError": "Mô hình xem hình chóp cụt như một khối đa diện bất kỳ có hai đáy mà bỏ qua nguồn gốc thiết diện hình học của nó.",
      "teacherPrompt": "AI vẽ hai đáy chóp cụt độc lập và nối tùy ý. Em hãy chỉ lỗi khái niệm và sửa lại: quy tắc dựng hình biểu diễn chóp cụt chuẩn là gì?",
      "studentProduct": "Ghi “Lỗi khái niệm: các cạnh đáy phải song song và cạnh bên phải đồng quy”, dựng lại qua đỉnh chóp S.",
      "boardPrompt": "AI vẽ các cạnh bên chóp cụt không đồng quy. Điều kiện hình học bắt buộc của các cạnh bên chóp cụt là gì?",
      "libraryTitle": "Lỗi AI dựng hình biểu diễn chóp cụt với các cạnh bên không đồng quy"
    }
  }
];
