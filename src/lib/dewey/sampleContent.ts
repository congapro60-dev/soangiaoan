import type { DeweyLessonContent } from './types';

const enigmaSvg = String.raw`<svg viewBox="0 0 300 220" class="svg-enigma" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mô phỏng máy mã hoá Enigma">
  <rect width="300" height="220" rx="10" fill="#34495e" stroke="#2c3e50" stroke-width="4"/>
  <rect x="65" y="20" width="30" height="50" rx="5" fill="#95a5a6"/>
  <text x="75" y="50" fill="#2c3e50" font-family="monospace" font-weight="bold" font-size="18">E</text>
  <rect x="135" y="20" width="30" height="50" rx="5" fill="#95a5a6"/>
  <text x="145" y="50" fill="#2c3e50" font-family="monospace" font-weight="bold" font-size="18">N</text>
  <rect x="205" y="20" width="30" height="50" rx="5" fill="#95a5a6"/>
  <text x="215" y="50" fill="#2c3e50" font-family="monospace" font-weight="bold" font-size="18">G</text>
  <rect x="35" y="95" width="230" height="82" rx="10" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="3"/>
  <g fill="#2c3e50">
    <circle cx="70" cy="120" r="10"/><circle cx="110" cy="120" r="10"/><circle cx="150" cy="120" r="10"/><circle cx="190" cy="120" r="10"/><circle cx="230" cy="120" r="10"/>
    <circle cx="90" cy="150" r="10"/><circle cx="130" cy="150" r="10"/><circle cx="170" cy="150" r="10"/><circle cx="210" cy="150" r="10"/>
  </g>
  <path d="M80 75 C100 90 120 90 140 75 S180 60 205 80" stroke="#f1c40f" stroke-width="4" fill="none" stroke-linecap="round"/>
  <text x="150" y="205" fill="#f1c40f" text-anchor="middle" font-family="monospace" font-size="16" font-weight="bold">ENIGMA</text>
</svg>`;

export const SONG_ANH_SAMPLE: DeweyLessonContent = {
  title: 'Đếm Bằng Song Ánh',
  subtitle: 'Toán 10 — Lớp Victoria',
  durationMinutes: 40,
  pretest: {
    durationMinutes: 5,
    reviewSummary: 'Ôn tập nhanh về ánh xạ, đơn ánh, toàn ánh và song ánh trước khi dùng song ánh để đếm.',
    questions: [
      {
        id: 'pre-1',
        prompt: 'Một ánh xạ $f: A \\to B$ là đơn ánh khi nào?',
        options: [
          'Mọi phần tử ở $B$ đều có phần tử ở $A$ chiếu tới.',
          'Hai phần tử khác nhau ở $A$ luôn có ảnh khác nhau ở $B$.',
        ],
        correctIndex: 1,
        explanation: 'Đơn ánh nghĩa là không đụng hàng: nếu $a_1 \\ne a_2$ thì $f(a_1) \\ne f(a_2)$.',
      },
      {
        id: 'pre-2',
        prompt: 'Ánh xạ toàn ánh có nghĩa là gì?',
        options: [
          'Không có phần tử nào ở tập đích $B$ bị bỏ sót.',
          'Một phần tử ở $A$ sinh ra nhiều ảnh ở $B$.',
        ],
        correctIndex: 0,
        explanation: 'Toàn ánh là phủ kín tập đích: mọi $b \\in B$ đều có ít nhất một $a \\in A$ sao cho $f(a)=b$.',
      },
      {
        id: 'pre-3',
        prompt: 'Điều kiện để một hệ mật mã có hàm giải mã ngược chính xác là gì?',
        options: [
          'Hệ thống phải là song ánh.',
          'Chỉ cần là đơn ánh.',
        ],
        correctIndex: 0,
        explanation: 'Muốn mã hoá và giải mã một-một chính xác cần ghép cặp hoàn hảo: vừa đơn ánh vừa toàn ánh, tức là song ánh.',
      },
      {
        id: 'pre-4',
        prompt: 'Xếp 30 học sinh vào 4 loại học lực vi phạm tính chất nào nếu muốn ghép ngược từng loại về đúng một học sinh?',
        options: [
          'Toàn ánh.',
          'Đơn ánh.',
        ],
        correctIndex: 1,
        explanation: 'Nhiều học sinh có thể cùng một loại học lực, nên các phần tử nguồn khác nhau có thể trùng ảnh: vi phạm đơn ánh.',
      },
      {
        id: 'pre-5',
        prompt: 'Hàm số $y = 2x$ xác định trên tập số tự nhiên $\\mathbb{N}$ là:',
        options: [
          'Chỉ là đơn ánh.',
          'Là song ánh.',
        ],
        correctIndex: 0,
        explanation: 'Hàm $2x$ không đụng hàng nên đơn ánh, nhưng không phủ hết $\\mathbb{N}$ vì các số lẻ không có ảnh.',
      },
    ],
  },
  engage: {
    storyHook: 'Trong Thế chiến II, hải quân Đức sử dụng cỗ máy Enigma để mã hoá chỉ thị quân sự. Số trạng thái của máy khổng lồ đến mức việc thử từng khả năng bằng tay gần như bất khả thi.',
    interactiveSvgId: 'enigma-placeholder',
    rawSvgFallback: enigmaSvg,
    realityCheckMessage: 'Chỉ riêng 3 vòng số cơ bản đã có thể tạo tới $10 \\times 10 \\times 10 = 1000$ trạng thái. Enigma thật có số khả năng lớn hơn rất nhiều, nên ta cần một cách đếm thông minh thay vì liệt kê.',
    guidingQuestion: 'Liệu có một phép màu toán học giúp ta đếm chính xác số lượng khổng lồ mà không cần liệt kê từng trường hợp?',
    guidingQuestionBox: 'Nếu mỗi cấu hình Enigma được ghép với đúng một dãy số mô tả rotor, ta có thể đếm cấu hình bằng cách đếm các dãy số đó không?',
    stepLabel: 'Bước 1: Khởi động & Gắn kết',
    bigTitle: 'Bí ẩn Cỗ máy Enigma & Giới hạn của con người',
    illustration: {
      type: 'svg-inline',
      caption: 'Mô phỏng đồ họa máy mã hóa Enigma',
      data: String.raw`<svg viewBox="0 0 240 240" class="svg-enigma" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Đồ họa máy mã hóa Enigma">
        <rect x="22" y="34" width="196" height="172" rx="18" fill="#0F4C81" stroke="#F2A900" stroke-width="5"/>
        <rect x="48" y="54" width="144" height="46" rx="10" fill="#1F2937"/>
        <g font-family="monospace" font-size="24" font-weight="800" text-anchor="middle">
          <text x="78" y="85" fill="#F2A900">E</text><text x="120" y="85" fill="#F2A900">N</text><text x="162" y="85" fill="#F2A900">G</text>
        </g>
        <rect x="44" y="118" width="152" height="56" rx="12" fill="#F8FAFC"/>
        <g fill="#0F1419">
          <circle cx="68" cy="136" r="7"/><circle cx="96" cy="136" r="7"/><circle cx="124" cy="136" r="7"/><circle cx="152" cy="136" r="7"/><circle cx="180" cy="136" r="7"/>
          <circle cx="82" cy="158" r="7"/><circle cx="110" cy="158" r="7"/><circle cx="138" cy="158" r="7"/><circle cx="166" cy="158" r="7"/>
        </g>
        <path d="M64 106 C92 116 112 96 138 106 S174 124 196 104" stroke="#F2A900" stroke-width="4" fill="none" stroke-linecap="round"/>
        <text x="120" y="198" fill="#F2A900" text-anchor="middle" font-family="monospace" font-weight="800" font-size="15">ENIGMA</text>
      </svg>`,
    },
    interactiveWidget: {
      type: 'rotor-counter',
      title: 'CỖ MÁY MÔ PHỎNG ENIGMA',
      htmlInline: String.raw`<div class="enigma-widget" data-widget="rotor-counter">
        <div class="rotor-panel" aria-label="Ba rotor mô phỏng">
          <button class="rotor" type="button" data-value="0" aria-label="Rotor 1">0</button>
          <button class="rotor" type="button" data-value="0" aria-label="Rotor 2">0</button>
          <button class="rotor" type="button" data-value="0" aria-label="Rotor 3">0</button>
        </div>
        <p class="rotor-counter-text">Cấu hình hiện tại: <strong class="rotor-state">000</strong></p>
        <p class="rotor-counter-text">Với 3 rotor, mỗi rotor 10 vị trí: <strong>10 × 10 × 10 = 1000</strong> cấu hình.</p>
      </div>`,
      jsInit: String.raw`document.querySelectorAll('.enigma-widget .rotor').forEach(function (rotor) {
        rotor.onclick = function () {
          var next = (Number(rotor.dataset.value || '0') + 1) % 10;
          rotor.dataset.value = String(next);
          rotor.textContent = String(next);
          var widget = rotor.closest('.enigma-widget');
          var state = widget ? widget.querySelector('.rotor-state') : null;
          if (state && widget) {
            state.textContent = Array.prototype.slice.call(widget.querySelectorAll('.rotor')).map(function (item) { return item.dataset.value || '0'; }).join('');
          }
        };
      });`,
    },
    goalSetting: {
      heading: 'Em thử đặt mục tiêu học tập cho bài hôm nay',
      placeholder: 'Ví dụ: Em muốn hiểu cách dùng song ánh để đếm số cấu hình Enigma mà không cần liệt kê từng trường hợp...',
      aiButtonLabel: '🤖 AI Phân tích mục tiêu',
      bloomFramework: {
        nhanbiet: 'Nhận biết khái niệm song ánh và điều kiện để hai tập có cùng số phần tử.',
        thonghieu: 'Giải thích được vì sao mô hình Enigma có thể chuyển thành bài toán đếm các dãy lựa chọn.',
        vandung: 'Vận dụng song ánh để giải các bài toán đếm ghế, tập con, đường đi robot và cấu hình mã hoá.',
      },
    },
    nextButtonLabel: 'Bắt đầu Bài Mới',
  },
  knowledgeUnits: [
    {
      id: 'dem-ghe',
      title: 'Đếm ghế',
      socraticSteps: [
        {
          id: 'ghe-1',
          prompt: 'Hội trường có rất đông người đang ngồi. Nếu đếm từng người dễ sai vì mọi người có thể di chuyển. Đại lượng nào cố định hơn để đếm?',
          inputPlaceholder: 'Ví dụ: đếm ghế, đếm số thứ tự ghế...',
          expectedKeywords: ['ghế', 'cố định', 'số thứ tự'],
          feedback: 'Đúng hướng: ghế là đối tượng cố định, dễ kiểm đếm hơn người đang di chuyển.',
        },
        {
          id: 'ghe-2',
          prompt: 'Nếu mỗi người đang ngồi đúng một ghế và mỗi ghế có đúng một người, mối quan hệ giữa tập người và tập ghế là gì?',
          inputPlaceholder: 'Nêu tên quan hệ ánh xạ...',
          expectedKeywords: ['song ánh', 'một-một', '1-1'],
          feedback: 'Đó là một song ánh: mỗi người ghép với đúng một ghế và không ghế nào bị bỏ trống trong phạm vi đang xét.',
          formulaToNote: 'Nếu có song ánh giữa $A$ và $B$ thì $|A| = |B|$.',
        },
        {
          id: 'ghe-3',
          prompt: 'Nếu hội trường có $k$ hàng, mỗi hàng có $n$ ghế, ta đếm số người bằng công thức nào khi mọi ghế đều có người?',
          inputPlaceholder: 'Viết công thức theo $k$ và $n$...',
          expectedKeywords: ['$k\\times n$', 'quy tắc nhân', 'hàng', 'ghế'],
          feedback: 'Số ghế là $k \\times n$. Nhờ song ánh người-ghế, số người cũng là $k \\times n$.',
          formulaToNote: 'Đặt $n$ ghế vào $k$ hàng: số vị trí là $k\\times n$.',
        },
      ],
      conclusion: 'Thay vì đếm tập khó đếm, ta thiết lập song ánh sang một tập dễ đếm hơn rồi kéo kết quả trở lại.',
      formulaForNotebook: 'Nguyên lý đếm bằng song ánh: nếu $f:A\\to B$ là song ánh thì $|A|=|B|$.',
    },
    {
      id: 'bong-den',
      title: 'Bóng đèn',
      socraticSteps: [
        {
          id: 'den-1',
          prompt: 'Một bóng đèn chỉ có hai trạng thái: sáng hoặc tắt. Nếu mã hoá sáng là 1, tắt là 0, một bóng đèn có bao nhiêu trạng thái?',
          inputPlaceholder: 'Nhập số trạng thái...',
          expectedKeywords: ['2', 'sáng', 'tắt'],
          feedback: 'Một bóng đèn có đúng 2 trạng thái độc lập: 0 hoặc 1.',
        },
        {
          id: 'den-2',
          prompt: 'Với 5 bóng đèn độc lập, số chuỗi trạng thái nhị phân có độ dài 5 là bao nhiêu?',
          inputPlaceholder: 'Tính $2\\times2\\times2\\times2\\times2$...',
          expectedKeywords: ['32', '$2^5$'],
          feedback: 'Theo quy tắc nhân, 5 vị trí độc lập tạo $2^5 = 32$ chuỗi nhị phân.',
          formulaToNote: 'Tập con của tập $X$ có 5 phần tử tương ứng với chuỗi nhị phân độ dài 5, nên có $2^5=32$ tập con.',
        },
        {
          id: 'den-3',
          prompt: 'Vì sao mỗi tập con của $X=\\{a,b,c,d,e\\}$ tương ứng duy nhất với một chuỗi 0-1 độ dài 5?',
          inputPlaceholder: 'Giải thích vai trò của 1 và 0...',
          expectedKeywords: ['chọn', 'không chọn', 'duy nhất', 'song ánh'],
          feedback: 'Mỗi phần tử được chọn ghi 1, không chọn ghi 0. Chuỗi 0-1 khôi phục chính xác tập con, nên đây là song ánh.',
        },
      ],
      conclusion: 'Đếm tập con được chuyển thành đếm chuỗi nhị phân. Đây là một song ánh giữa tập con và mã 0-1.',
      formulaForNotebook: 'Một tập có $n$ phần tử có $2^n$ tập con vì song ánh với các chuỗi nhị phân độ dài $n$.',
    },
    {
      id: 'robot',
      title: 'Robot',
      socraticSteps: [
        {
          id: 'robot-1',
          prompt: 'Robot đi trên lưới từ góc trái dưới tới góc phải trên, chỉ được đi sang phải hoặc đi lên. Mỗi đường đi có thể mã hoá bằng những ký tự nào?',
          inputPlaceholder: 'Ví dụ: P cho phải, L cho lên...',
          expectedKeywords: ['phải', 'lên', 'P', 'L'],
          feedback: 'Mỗi bước đi chỉ thuộc hai loại: sang phải hoặc đi lên. Ta có thể mã hoá bằng P và L.',
        },
        {
          id: 'robot-2',
          prompt: 'Nếu cần đi $m$ bước sang phải và $n$ bước đi lên, tổng số bước trong mỗi đường đi ngắn nhất là bao nhiêu?',
          inputPlaceholder: 'Viết theo $m,n$...',
          expectedKeywords: ['$m+n$', 'm+n'],
          feedback: 'Mỗi đường đi ngắn nhất gồm đúng $m+n$ bước: $m$ bước phải và $n$ bước lên.',
        },
        {
          id: 'robot-3',
          prompt: 'Đếm số đường đi tương đương với việc chọn vị trí cho loại bước nào trong chuỗi $m+n$ ký tự?',
          inputPlaceholder: 'Chọn vị trí cho $m$ bước phải hoặc $n$ bước lên...',
          expectedKeywords: ['chọn vị trí', 'tổ hợp', '$C$', 'bước phải'],
          feedback: 'Chỉ cần chọn vị trí cho $m$ bước phải trong $m+n$ vị trí; các vị trí còn lại tự động là bước lên.',
          formulaToNote: 'Số đường đi robot trên lưới $m\\times n$ là $C_{m+n}^{m}=C_{m+n}^{n}$.',
        },
        {
          id: 'robot-4',
          prompt: 'Hãy giải thích vì sao cách mã hoá đường đi bằng chuỗi P/L là một song ánh.',
          inputPlaceholder: 'Mỗi đường đi tạo một chuỗi và mỗi chuỗi tạo lại một đường đi...',
          expectedKeywords: ['một đường đi', 'một chuỗi', 'khôi phục', 'song ánh'],
          feedback: 'Mỗi đường đi tạo duy nhất một chuỗi P/L và mỗi chuỗi hợp lệ dựng lại duy nhất một đường đi. Do đó hai tập có cùng số phần tử.',
        },
      ],
      conclusion: 'Bài toán đường đi robot được chuyển thành bài toán chọn vị trí trong một chuỗi, nhờ song ánh giữa đường đi và chuỗi ký hiệu.',
      formulaForNotebook: 'Số đường đi ngắn nhất từ $(0,0)$ đến $(m,n)$ là $C_{m+n}^{m}=C_{m+n}^{n}$.',
    },
  ],
  olympia: {
    packs: [
      {
        id: 'pack-10',
        packLabel: '10 điểm',
        questions: [
          {
            id: 'nb-1',
            type: 'multiple_choice',
            prompt: 'Nếu tồn tại song ánh giữa hai tập hữu hạn $A$ và $B$, kết luận đúng là gì?',
            options: ['$|A|=|B|$', '$|A|<|B|$', '$|A|>|B|$', 'Không thể so sánh'],
            correctIndex: 0,
            theory: 'Song ánh là phép ghép cặp hoàn hảo một-một giữa hai tập.',
            hint1: 'Hãy nhớ hình ảnh mỗi người ngồi đúng một ghế và mỗi ghế có đúng một người.',
            hint2: 'Nếu ghép cặp hết, không thừa không thiếu, số phần tử hai bên bằng nhau.',
            hint3: 'Công thức trọng tâm của bài là $|A|=|B|$.',
            solution: 'Vì có song ánh $f:A\\to B$, mỗi phần tử của $A$ ghép với đúng một phần tử của $B$ và ngược lại, nên $|A|=|B|$.',
            points: 10,
          },
          {
            id: 'nb-2',
            type: 'multiple_choice',
            prompt: 'Một tập có 5 phần tử có bao nhiêu tập con?',
            options: ['10', '25', '32', '120'],
            correctIndex: 2,
            theory: 'Mỗi phần tử có 2 trạng thái: được chọn hoặc không được chọn.',
            hint1: 'Mã hoá mỗi tập con bằng chuỗi 0-1 độ dài 5.',
            hint2: 'Có 5 vị trí độc lập, mỗi vị trí có 2 lựa chọn.',
            hint3: 'Tính $2^5$.',
            solution: 'Số tập con là $2\\times2\\times2\\times2\\times2=2^5=32$.',
            points: 10,
          },
          {
            id: 'nb-3',
            type: 'multiple_choice',
            prompt: 'Robot cần đi 3 bước phải và 2 bước lên. Mỗi đường đi ngắn nhất có bao nhiêu bước?',
            options: ['3', '2', '5', '6'],
            correctIndex: 2,
            theory: 'Đường đi ngắn nhất gồm tất cả bước phải cần thiết và tất cả bước lên cần thiết.',
            hint1: 'Cộng số bước phải với số bước lên.',
            hint2: 'Robot cần 3 bước phải và 2 bước lên.',
            hint3: '$3+2=5$.',
            solution: 'Mỗi đường đi ngắn nhất gồm $3+2=5$ bước.',
            points: 10,
          },
        ],
      },
      {
        id: 'pack-20',
        packLabel: '20 điểm',
        questions: [
          {
            id: 'th-1',
            type: 'true_false_group',
            prompt: 'Xét cách mã hoá tập con của $X=\\{a,b,c,d,e\\}$ bằng chuỗi nhị phân độ dài 5.',
            context: 'Quy ước 1 là chọn phần tử, 0 là không chọn phần tử theo đúng thứ tự $a,b,c,d,e$.',
            statements: [
              { text: 'Chuỗi 10100 biểu diễn tập con $\\{a,c\\}$.', correct: true },
              { text: 'Hai tập con khác nhau có thể cho cùng một chuỗi 0-1.', correct: false },
              { text: 'Có đúng $2^5$ chuỗi nhị phân độ dài 5.', correct: true },
              { text: 'Cách mã hoá này không phải là song ánh vì có thể khôi phục tập con từ chuỗi.', correct: false },
            ],
            theory: 'Mỗi tập con tương ứng duy nhất với một chuỗi 0-1 và mỗi chuỗi 0-1 khôi phục duy nhất một tập con.',
            hint1: 'Đọc từng vị trí của chuỗi theo thứ tự $a,b,c,d,e$.',
            hint2: 'Nếu một phần tử được chọn thì ghi 1, nếu không được chọn thì ghi 0.',
            hint3: 'Tính song ánh nằm ở khả năng đi hai chiều: tập con → chuỗi và chuỗi → tập con.',
            solution: 'Các mệnh đề đúng/sai lần lượt là Đúng, Sai, Đúng, Sai. Chuỗi 10100 chọn $a,c$; mã hoá là song ánh nên không có hai tập con khác nhau cùng mã.',
            points: 20,
          },
          {
            id: 'th-2',
            type: 'true_false_group',
            prompt: 'Xét đường đi robot ngắn nhất từ $(0,0)$ đến $(3,2)$, chỉ đi phải P hoặc lên L.',
            context: 'Mỗi đường đi được mã hoá thành chuỗi gồm 3 chữ P và 2 chữ L.',
            statements: [
              { text: 'Mỗi đường đi ngắn nhất có 5 bước.', correct: true },
              { text: 'Chuỗi PPLPL là một đường đi hợp lệ.', correct: true },
              { text: 'Số đường đi là $C_5^3$.', correct: true },
              { text: 'Chuỗi có 3 chữ P và 2 chữ L có thể tạo ra hai đường đi khác nhau.', correct: false },
            ],
            theory: 'Đường đi robot được ghép song ánh với chuỗi ký tự P/L có số lượng P và L cố định.',
            hint1: 'Mỗi bước trong chuỗi quyết định duy nhất robot đi đâu.',
            hint2: 'Có 5 vị trí, chọn 3 vị trí cho bước P.',
            hint3: 'Các vị trí không chọn cho P sẽ là L.',
            solution: 'Đúng, Đúng, Đúng, Sai. Có $C_5^3=C_5^2=10$ đường đi, và mỗi chuỗi hợp lệ dựng lại đúng một đường đi.',
            points: 20,
          },
        ],
      },
      {
        id: 'pack-30',
        packLabel: '30 điểm',
        questions: [
          {
            id: 'vd-1',
            type: 'short_answer',
            prompt: 'Có bao nhiêu đường đi ngắn nhất từ $(0,0)$ đến $(4,3)$ nếu robot chỉ đi sang phải hoặc đi lên?',
            correctNumeric: 35,
            tolerance: 0,
            theory: 'Đường đi gồm 4 bước phải và 3 bước lên, tổng cộng 7 bước.',
            hint1: 'Hãy chọn vị trí cho 4 bước phải trong 7 vị trí.',
            hint2: 'Số cách là $C_7^4$ hoặc $C_7^3$.',
            hint3: '$C_7^3 = \\frac{7\\cdot6\\cdot5}{3\\cdot2\\cdot1}$.',
            solution: 'Mỗi đường đi tương ứng với một chuỗi gồm 4 P và 3 L. Số chuỗi là $C_7^4=C_7^3=35$.',
            points: 30,
          },
          {
            id: 'vd-2',
            type: 'short_answer',
            prompt: 'Một bảng điều khiển có 6 công tắc bật/tắt độc lập. Có bao nhiêu trạng thái khác nhau của bảng?',
            correctNumeric: 64,
            tolerance: 0,
            theory: 'Mỗi công tắc có 2 trạng thái độc lập: bật hoặc tắt.',
            hint1: 'Mã hoá mỗi trạng thái bằng một chuỗi nhị phân độ dài 6.',
            hint2: 'Có 6 vị trí, mỗi vị trí có 2 lựa chọn.',
            hint3: 'Tính $2^6$.',
            solution: 'Số trạng thái là $2^6=64$. Song ánh: mỗi cấu hình công tắc tương ứng duy nhất với một chuỗi 0-1 độ dài 6.',
            points: 30,
          },
        ],
      },
    ],
  },
  extend: {
    realWorldContext: 'Tại sân bay quốc tế, mỗi vali được in một mã vạch để hệ thống tự động chuyển vali lên đúng chuyến bay của hành khách.',
    consequence: 'Nếu hệ thống mất tính đơn ánh, hai vali của hai hành khách khác nhau có thể nhận cùng một mã vạch. Khi đó băng chuyền không còn phân biệt được vali, dẫn đến thất lạc hoặc chuyển nhầm hành lý.',
    expertQuote: 'Trong mọi hệ thống định danh, tính một-một không chỉ là khái niệm toán học mà còn là điều kiện an toàn để truy vết và khôi phục thông tin.',
  },
  summary: {
    mindMapNodes: [
      {
        label: 'Tập khó đếm',
        children: ['Người trong hội trường', 'Tập con cần liệt kê', 'Đường đi robot'],
      },
      {
        label: 'Thiết lập song ánh',
        children: ['Người ↔ ghế', 'Tập con ↔ chuỗi 0-1', 'Đường đi ↔ chuỗi P/L'],
      },
      {
        label: 'Tập dễ đếm',
        children: ['Số ghế theo hàng', 'Chuỗi nhị phân', 'Chọn vị trí trong chuỗi'],
      },
      {
        label: 'Kết quả kéo về',
        children: ['$|A|=|B|$', '$2^n$ tập con', '$C_{m+n}^{m}$ đường đi'],
      },
    ],
    checklistItems: [
      'Em hiểu nguyên lý đếm bằng song ánh.',
      'Em phân biệt được đơn ánh, toàn ánh và song ánh trong tình huống thực tế.',
      'Em biết mã hoá tập con bằng chuỗi nhị phân 0-1.',
      'Em biết mã hoá đường đi robot bằng chuỗi P/L.',
      'Em có thể chọn tập dễ đếm hơn để giải một bài toán tổ hợp.',
    ],
    timeFillerOptions: [
      {
        label: 'Làm tiếp các câu Olympia chưa hoàn thành',
        type: 'remaining_olympia',
        payload: 'screen-olympia',
      },
      {
        label: 'Thảo luận thêm câu chuyện mã vạch sân bay',
        type: 'extension_story',
        payload: 'barcode-identity-extension',
      },
    ],
  },
};
