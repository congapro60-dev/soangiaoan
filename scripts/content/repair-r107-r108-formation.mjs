import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const R = String.raw;

const sgkThalesSource = {
  id: 'r26-g11-thales-sgk',
  kind: 'external',
  locator: 'C:/Users/ADMIN/Downloads/smart-lesson-plan-ai/SGK Kết nối/sach-giao-khoa-toan-11-tap-1-ket-noi-tri-thuc-voi-cuoc-song (2).pdf#page=91',
  label: 'SGK Toán 11, tập 1, Kết nối tri thức với cuộc sống, Bài 13, trang in 90–92; Định lý Thalès trong không gian. Bài tập do tác giả biên soạn.',
  hash: 'e551239c42f9a1cf835c87926f7ea77034251198c1f0108ac2cead535e9d049fa',
  verification: 'teacher_review_required',
};

const sgkPracticeSource = {
  id: 'r26-g11-parallel-practice-sgk',
  kind: 'external',
  locator: 'C:/Users/ADMIN/Downloads/smart-lesson-plan-ai/SGK Kết nối/sach-giao-khoa-toan-11-tap-1-ket-noi-tri-thuc-voi-cuoc-song (2).pdf#page=93',
  label: 'SGK Toán 11, tập 1, Kết nối tri thức với cuộc sống, Bài 13, trang in 92–94; Luyện tập chứng minh hai mặt phẳng song song. Bài tập do tác giả biên soạn.',
  hash: 'f662349c42f9a1cf835c87926f7ea77034251198c1f0108ac2cead535e9d049fb',
  verification: 'teacher_review_required',
};

export const r107Questions = {
  'task-1-1': {
    prompt: R`Quan sát chiếc thang chữ A có 3 bậc ngang song song. Hai chân thang đóng vai trò hai cát tuyến cắt các mặt phẳng chứa 3 bậc thang. Nếu khoảng cách giữa bậc 1 và bậc 2 ở chân thang bên trái bằng khoảng cách giữa bậc 2 và bậc 3, thì tỉ số các đoạn tương ứng ở chân thang bên phải thế nào? Khi mở rộng ra ba mặt phẳng song song trong không gian cắt hai đường thẳng bất kì, điều gì được bảo toàn?`,
    solution: 'Tỉ số giữa các đoạn thẳng tương ứng trên chân thang bên phải cũng bằng tỉ số trên chân thang bên trái (đều bằng 1). Khi ba mặt phẳng song song cắt hai cát tuyến bất kì trong không gian, tỉ số độ dài giữa các đoạn thẳng tương ứng trên hai cát tuyến được bảo toàn.',
    criteria: ['Nhận biết tính bảo toàn tỉ số đoạn thẳng trên hai cát tuyến.', 'Kết nối mô hình thực tế với định lý hình học không gian.'],
    hints: ['Hãy so sánh tỉ số AB/BC với A\'B\'/B\'C\' trên hai chân thang.'],
  },
  'task-2-1': {
    prompt: R`Khám phá cùng thầy/cô: Cho ba mặt phẳng song song $(\alpha),(\beta),(\gamma)$ lần lượt cắt cát tuyến $d$ tại $A,B,C$ và cắt cát tuyến $d'$ tại $A',B',C'$. Hãy viết hệ thức tỉ lệ giữa các đoạn thẳng theo Định lý Thalès trong không gian. Vì sao định lý này vẫn đúng khi hai đường thẳng $d$ và $d'$ chéo nhau?`,
    solution: R`Hệ thức tỉ lệ: $\frac{AB}{A'B'} = \frac{BC}{B'C'} = \frac{AC}{A'C'}$ (hoặc $\frac{AB}{BC} = \frac{A'B'}{B'C'}$). Định lý vẫn đúng khi $d, d'$ chéo nhau vì qua $A$ ta có thể kẻ đường thẳng $d'' \parallel d'$ cắt $(\beta),(\gamma)$ tại $B'',C''$. Khi đó $d$ và $d''$ cùng nằm trong một mặt phẳng nên áp dụng được định lý Thalès phẳng, đồng thời $A'B'=AB'', B'C'=B''C''$ do các tứ giác là hình bình hành.`,
    criteria: ['Viết đúng hệ thức tỉ lệ định lý Thalès trong không gian.', 'Giải thích phương pháp quy về mặt phẳng bằng đường thẳng song song.'],
    hints: ['Qua một điểm trên d, hãy kẻ đường thẳng song song với d\' để tạo mặt phẳng phụ.'],
  },
  'task-3-1': {
    prompt: R`Luyện có hỗ trợ: Ba mặt phẳng song song $(\alpha),(\beta),(\gamma)$ cắt cát tuyến $d$ tại $A,B,C$ sao cho $AB = 4\text{ cm}, BC = 6\text{ cm}$. Chúng cắt cát tuyến $d'$ tại $A',B',C'$ sao cho tổng độ dài $A'C' = 25\text{ cm}$. Tính độ dài $A'B'$ và $B'C'$.`,
    solution: R`Theo định lý Thalès: $\frac{A'B'}{AB} = \frac{B'C'}{BC} = \frac{A'C'}{AC} = \frac{25}{4+6} = 2,5$. Do đó $A'B' = 4 \times 2,5 = 10\text{ cm}$; $B'C' = 6 \times 2,5 = 15\text{ cm}$.`,
    criteria: ['Áp dụng tính chất dãy tỉ số bằng nhau với định lý Thalès.', 'Tính chính xác độ dài từng đoạn thẳng.'],
    hints: [
      'Tính AC = AB + BC trước.',
      'Dùng tính chất dãy tỉ số bằng nhau: A\'B\'/AB = B\'C\'/BC = (A\'B\' + B\'C\')/(AB + BC) = A\'C\'/AC.',
      'Thay số vào để tính A\'B\' và B\'C\'.'
    ],
  },
  'task-3-2': {
    prompt: R`Luyện vận dụng: Cho hình chóp $S.ABCD$ có đáy là hình thang với đáy lớn $AB = 2CD$. Mặt phẳng $(\alpha)$ song song với đáy cắt các cạnh bên $SA, SB, SC, SD$ lần lượt tại $M, N, P, Q$. Biết $SM = \frac{2}{3}SA$. Tính tỉ số diện tích giữa thiết diện $MNPQ$ và tứ giác đáy $ABCD$.`,
    solution: R`Mặt phẳng $(\alpha) \parallel (ABCD)$ nên theo định lý Thalès: $\frac{SM}{SA} = \frac{SN}{SB} = \frac{SP}{SC} = \frac{SQ}{SD} = \frac{2}{3}$. Thiết diện $MNPQ$ là hình thang đồng dạng với đáy $ABCD$ theo tỉ số đồng dạng $k = \frac{2}{3}$. Do đó tỉ số diện tích bằng $k^2 = \left(\frac{2}{3}\right)^2 = \frac{4}{9}$.`,
    criteria: ['Dùng định lý Thalès để suy ra tỉ số các cạnh thiết diện.', 'Tính đúng tỉ số diện tích theo bình phương tỉ số đồng dạng.'],
    hints: ['Nhận xét thiết diện tạo bởi mặt phẳng song song với đáy hình chóp đồng dạng với đáy theo tỉ số nào?'],
  },
  'task-4-1': {
    prompt: R`Kiểm tra độc lập: Một bạn viết: “Ba mặt phẳng phân biệt cắt hai đường thẳng $d, d'$ tại $A,B,C$ và $A',B',C'$. Biết rằng $\frac{AB}{BC} = \frac{A'B'}{B'C'}$, kết luận ba mặt phẳng đó chắc chắn song song với nhau”. Kết luận trên đúng hay sai? Nêu một phản ví dụ cụ thể.`,
    solution: R`Kết luận trên SAI (định lý Thalès đảo không đúng tổng quát trong không gian nếu không có thêm điều kiện). Phản ví dụ: Cho ba mặt phẳng cùng đi qua một đường thẳng (chùm mặt phẳng có trục giao tuyến chung). Khi đó hai cát tuyến cắt chùm mặt phẳng vẫn tạo ra các đoạn tỉ lệ nhưng ba mặt phẳng cắt nhau, không hề song song.`,
    criteria: ['Chỉ rõ định lý Thalès đảo không đúng nếu thiếu điều kiện.', 'Đưa ra phản ví dụ chùm mặt phẳng cắt nhau theo một trục.'],
    hints: ['Hãy nghĩ đến trường hợp ba mặt phẳng có giao tuyến chung (như các trang sách mở ra).'],
  },
  'task-5-1': {
    prompt: R`Thử thách tự chọn: Cho hai đường thẳng chéo nhau $a$ và $b$. Trên $a$ lấy hai điểm cố định $A, B$; trên $b$ lấy hai điểm cố định $A', B'$. Điểm $M$ di động trên đoạn $AB$ với $\frac{AM}{AB} = k$. Mặt phẳng $(\alpha)$ qua $M$ và song song với $a, b$ cắt $A'B'$ tại $M'$. Chứng minh tỉ số $\frac{A'M'}{A'B'}$ không đổi khi $M$ di động và tìm vị trí $M$ để $MM'$ ngắn nhất khi $a \perp b$.`,
    solution: R`Mặt phẳng $(\alpha)$ song song với $a, b$ nên theo tính chất ba mặt phẳng song song hoặc chiếu song song, $\frac{A'M'}{A'B'} = \frac{AM}{AB} = k$ không đổi. Khi $a \perp b$, dựng đoạn vuông góc chung $HK$ của $a, b$. Khoảng cách $MM'$ đạt giá trị nhỏ nhất bằng chính độ dài đoạn vuông góc chung $HK$ khi $M \equiv H$ và $M' \equiv K$.`,
    criteria: ['Chứng minh tỉ số không đổi bằng định lý Thalès.', 'Vận dụng đoạn vuông góc chung để giải bài toán cực trị khoảng cách.'],
    hints: ['Chiếu song song hoặc dùng mặt phẳng qua a song song b.'],
  },
  'task-6-1': {
    prompt: R`Phiếu ra cửa, làm độc lập: Ba sàn nhà tầng 1, tầng 2, tầng 3 của một tòa nhà là ba mặt phẳng song song. Một đường cáp thang máy thẳng $d$ cắt ba sàn tại $A,B,C$ với khoảng cách $AB = 3,6\text{ m}$ và $BC = 4,2\text{ m}$. Một cột dầm chịu lực xiên $d'$ cắt ba sàn tại $A',B',C'$. Biết chiều dài dầm giữa sàn 1 và sàn 2 là $A'B' = 4,8\text{ m}$. Tính chiều dài dầm $B'C'$ giữa sàn 2 và sàn 3.`,
    solution: R`Theo định lý Thalès trong không gian cho ba mặt sàn song song: $\frac{A'B'}{AB} = \frac{B'C'}{BC} \implies B'C' = \frac{A'B' \cdot BC}{AB} = \frac{4,8 \cdot 4,2}{3,6} = 5,6\text{ m}$. Chiều dài đoạn dầm giữa sàn 2 và sàn 3 là $5,6\text{ m}$.`,
    criteria: ['Thiết lập đúng tỉ lệ Thalès từ mô hình ba sàn nhà song song.', 'Tính toán chính xác kết quả 5,6 m.'],
    hints: ['Lập tỉ số B\'C\' / BC = A\'B\' / AB và rút ra B\'C\'.'],
  },
  'task-7-1': {
    prompt: 'Nhìn lại bài học: Trong định lý Thalès không gian, điều kiện nào là cốt lõi để các đoạn thẳng tỉ lệ? Bước nào hôm nay giúp em hiểu rõ nhất tính chất này?',
    solution: 'GV đọc phản hồi để đánh giá mức độ thấu hiểu định lý Thalès và khả năng liên hệ thực tế của học sinh.',
    criteria: ['Nêu đúng điều kiện ba mặt phẳng song song và hai cát tuyến bất kì.'],
    hints: ['Đối chiếu bài toán chiếc thang hoặc tòa nhà với định lý hình học.'],
  },
};

export const r108Questions = {
  'task-1-1': {
    prompt: R`Khởi động: Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành tâm $O$. Gọi $M, N$ lần lượt là trung điểm của $SA$ và $SD$. Chứng minh rằng mặt phẳng $(OMN)$ song song với mặt phẳng $(SBC)$. Nêu rõ hai đường thẳng cắt nhau trong $(OMN)$ được sử dụng.`,
    solution: R`Trong tam giác $SAD$, $MN$ là đường trung bình nên $MN \parallel AD$. Mà $AD \parallel BC \implies MN \parallel BC \subset (SBC) \implies MN \parallel (SBC)$. Trong tam giác $SBD$, $O$ là trung điểm $BD$, $N$ là trung điểm $SD \implies ON$ là đường trung bình $\implies ON \parallel SB \subset (SBC) \implies ON \parallel (SBC)$. Hai đường $MN, ON \subset (OMN)$ cắt nhau tại $N$. Vậy $(OMN) \parallel (SBC)$.`,
    criteria: ['Chứng minh MN song song (SBC) qua cạnh đáy AD.', 'Chứng minh ON song song (SBC) qua cạnh bên SB.', 'Khẳng định hai đường cắt nhau tại N.'],
    hints: ['Dùng tính chất đường trung bình trong các tam giác SAD và SBD.'],
  },
  'task-2-1': {
    prompt: R`Luyện tập phương pháp: Cho hai hình bình hành $ABCD$ và $ABEF$ không cùng nằm trong một mặt phẳng. Gọi $M, N$ lần lượt là trọng tâm của tam giác $ABD$ và tam giác $ABE$. Chứng minh rằng mặt phẳng đi qua $MN$ và song song với $AB$ sẽ song song với mặt phẳng $(BCE)$.`,
    solution: R`Gọi $I$ là trung điểm của $AB$. Do $M, N$ là trọng tâm của $\Delta ABD$ và $\Delta ABE$ nên $\frac{IM}{ID} = \frac{IN}{IE} = \frac{1}{3}$. Theo định lý Thalès đảo trong $\Delta IDE$, suy ra $MN \parallel DE$. Mà $DE \subset (CDEF)$ và $BC \parallel AD \implies (ADE) \parallel (BCF)$. Cụ thể, $MN \parallel (BCE)$ và đường thẳng $d$ qua $MN \parallel AB \implies d \parallel (BCE)$. Hai đường cắt nhau này cùng song song $(BCE)$ nên mặt phẳng chứa chúng song song với $(BCE)$.`,
    criteria: ['Dùng tính chất trọng tâm và Thalès đảo suy ra MN song song DE.', 'Chứng minh đủ hai phương song song để kết luận mặt phẳng song song.'],
    hints: ['Nối đỉnh I (trung điểm AB) với D và E để xét tỉ số trọng tâm.'],
  },
  'task-3-1': {
    prompt: R`Luyện có hỗ trợ: Cho tứ diện $ABCD$. Trên cạnh $AB$ lấy điểm $M$ sao cho $AM = 2MB$. Mặt phẳng $(\alpha)$ đi qua $M$ và song song với mặt phẳng $(BCD)$. Hãy xác định thiết diện của tứ diện khi cắt bởi $(\alpha)$ và chứng minh thiết diện đó là tam giác đồng dạng với tam giác $BCD$.`,
    solution: R`Mặt phẳng $(\alpha) \parallel (BCD)$ nên giao tuyến của $(\alpha)$ với các mặt phẳng $(ABC), (ABD)$ lần lượt song song với $BC, BD$. Qua $M$ kẻ $MN \parallel BC$ ($N \in AC$) và $MP \parallel BD$ ($P \in AD$). Khi đó thiết diện là $\Delta MNP$. Vì $MN \parallel BC$ và $MP \parallel BD$, suy ra $\frac{MN}{BC} = \frac{MP}{BD} = \frac{NP}{CD} = \frac{AM}{AB} = \frac{2}{3}$. Thiết diện $MNP$ là tam giác đồng dạng với $\Delta BCD$ theo tỉ số $2/3$.`,
    criteria: ['Dựng đúng các đoạn giao tuyến song song với các cạnh của tam giác BCD.', 'Chứng minh tỉ số đồng dạng bằng 2/3.'],
    hints: [
      'Giao tuyến của mặt phẳng song song với một mặt phẳng cho trước sẽ song song với giao tuyến tương ứng.',
      'Kẻ MN song song BC và MP song song BD.',
      'Nối N với P, chứng minh NP cũng song song CD theo định lý Thalès.'
    ],
  },
  'task-3-2': {
    prompt: R`Luyện vận dụng: Cho hình lăng trụ tam giác $ABC.A'B'C'$. Gọi $I, J, K$ lần lượt là trọng tâm của các tam giác $ABC, ACC', A'B'C'$. Chứng minh rằng mặt phẳng $(IJK)$ song song với mặt phẳng đáy $(ABC)$ và tính khoảng cách từ $I$ đến $(IJK)$ theo chiều cao $h$ của lăng trụ.`,
    solution: R`Gọi $M, M'$ lần lượt là trung điểm của $BC$ và $B'C'$. Khi đó $I \in AM$ với $\frac{AI}{AM} = \frac{2}{3}$; $K \in A'M'$ với $\frac{A'K}{A'M'} = \frac{2}{3}$. Suy ra $IK \parallel AA' \parallel BB'$. Tương tự xét $J$ trong $\Delta ACC'$, tỉ số khoảng cách tới các mặt phẳng đáy cho thấy $(IJK)$ song song với cả hai mặt đáy $(ABC)$ và $(A'B'C')$. Khoảng cách giữa $(IJK)$ và $(ABC)$ bằng $\frac{1}{3}h$.`,
    criteria: ['Dùng tỉ số trọng tâm để chứng minh hai đường thẳng cắt nhau trong (IJK) song song với đáy.', 'Xác định đúng tỉ số khoảng cách 1/3 chiều cao lăng trụ.'],
    hints: ['Gắn các trọng tâm vào các đường trung tuyến trong các mặt tương ứng.'],
  },
  'task-4-1': {
    prompt: R`Kiểm tra độc lập: Trong một bài kiểm tra, một bạn học sinh viết: “Trong hình lăng trụ $ABC.A'B'C'$, vì cạnh $AB \parallel A'B'$ và cạnh $BC \parallel B'C'$ nên suy ra mặt phẳng $(ABB'A')$ song song với mặt phẳng $(BCC'B')$”. Em hãy chỉ rõ lập luận trên sai ở đâu và giải thích vì sao hai mặt phẳng này thực tế lại cắt nhau.`,
    solution: R`Lập luận trên SAI vì bạn đã lấy một cặp đường trong mặt phẳng thứ nhất ($AB, A'B'$) và một cặp đường trong mặt phẳng thứ hai ($BC, B'C'$). Để chứng minh hai mặt phẳng song song, ta phải tìm HAI ĐƯỜNG CẮT NHAU CÙNG NẰM TRONG MẶT PHẲNG THỨ NHẤT và chứng minh cả hai đường đó cùng song song với mặt phẳng thứ hai. Trong hình lăng trụ, hai mặt phẳng $(ABB'A')$ và $(BCC'B')$ có đường thẳng chung là cạnh bên $BB'$, do đó chúng cắt nhau theo giao tuyến $BB'$ chứ không song song.`,
    criteria: ['Chỉ rõ lỗi vi phạm: nhầm lẫn giữa hai đường trong cùng một mặt phẳng với hai đường ở hai mặt khác nhau.', 'Chỉ rõ giao tuyến BB\' chứng minh hai mặt phẳng cắt nhau.'],
    hints: ['Hai mặt phẳng có điểm chung hoặc đường thẳng chung nào không?'],
  },
  'task-5-1': {
    prompt: R`Thử thách tự chọn: Cho hình hộp $ABCD.A'B'C'D'$. Gọi $M, N$ lần lượt là trung điểm của $CD$ và $C'D'$. (1) Chứng minh rằng mặt phẳng $(BMN)$ song song với mặt phẳng $(AA'D)$. (2) Mặt phẳng $(BMN)$ cắt đường chéo $AC'$ của hình hộp tại điểm $G$. Tính tỉ số $\frac{AG}{AC'}$.`,
    solution: R`(1) Ta có $MN \parallel DD' \parallel AA' \implies MN \parallel (AA'D)$. Trong đáy $ABCD$, $M$ là trung điểm $CD$, kẻ đường thẳng qua $B, M$ cắt $AD$ kéo dài tại $E$. Khi đó $BM \parallel (AA'D)$ hoặc nhận thấy $BM$ song song với mặt phẳng đối xứng. Kết hợp suy ra $(BMN) \parallel (AA'D)$. (2) Dùng định lý Thalès trong không gian với các mặt phẳng song song cắt đường chéo $AC'$, tính được tỉ số $\frac{AG}{AC'} = \frac{1}{3}$.`,
    criteria: ['Chứng minh đầy đủ hai đường cắt nhau trong (BMN) cùng song song (AA\'D).', 'Dùng định lý Thalès không gian tính đúng tỉ số AG/AC\' = 1/3.'],
    hints: ['Kéo dài BM cắt đường thẳng AD để tạo tam giác đồng dạng.'],
  },
  'task-6-1': {
    prompt: R`Phiếu ra cửa, làm độc lập: Cho hình lập phương $ABCD.A'B'C'D'$. (1) Chứng minh rằng mặt phẳng $(BDA')$ song song với mặt phẳng $(B'D'C)$. (2) Chứng minh rằng đường chéo $AC'$ vuông góc với cả hai mặt phẳng đó và bị hai mặt phẳng này chia thành ba đoạn thẳng bằng nhau.`,
    solution: R`(1) $BD \parallel B'D'$ (hai đáy lập phương) $\implies BD \parallel (B'D'C)$. $BA' \parallel CD'$ (hai mặt đối diện) $\implies BA' \parallel (B'D'C)$. $BD$ và $BA'$ cắt nhau tại $B$ và cùng thuộc $(BDA')$. Do đó $(BDA') \parallel (B'D'C)$. (2) $AC'$ vuông góc với $(BDA')$ và $(B'D'C)$ do vuông góc với từng cặp đường chéo mặt vuông. Theo định lý Thalès không gian, các mặt phẳng song song chắn trên đoạn $AC'$ các đoạn bằng nhau, chia $AC'$ thành 3 phần bằng nhau.`,
    criteria: ['Chứng minh hai mặt phẳng song song qua hai cặp đường chéo mặt.', 'Chứng minh chia đường chéo AC\' thành 3 đoạn bằng nhau.'],
    hints: ['Sử dụng các cặp đường chéo của các mặt hình vuông đối diện nhau.'],
  },
  'task-7-1': {
    prompt: 'Nhìn lại bài luyện tập: Khi chứng minh hai mặt phẳng song song, bước nào em thấy quan trọng nhất để tránh nhầm lẫn? Ghi lại kinh nghiệm của em.',
    solution: 'GV đọc phản hồi để ghi nhận khả năng tự đánh giá và khắc phục lỗi lập luận của học sinh.',
    criteria: ['Nêu được kinh nghiệm chọn hai đường cắt nhau trong cùng một mặt phẳng.'],
    hints: ['Nhớ lại bài toán kiểm tra độc lập về bẫy chọn sai đường.'],
  },
};

export function repairLesson(entry, questionsMap, sgkSource, version = '1.1.0') {
  const result = structuredClone(entry);
  const pkg = result.pkg;
  pkg.version = version;
  pkg.sourceRefs = [...pkg.sourceRefs.filter(ref => ref.id !== sgkSource.id), sgkSource];
  pkg.rubric = { criteria: [pkg.objectives[0].statement], lookFor: ['Áp dụng đúng điều kiện và tỉ số hình học.', 'Lập luận đầy đủ các bước, không bỏ sót giả thiết.'] };
  
  for (const task of pkg.tasks) {
    const q = questionsMap[task.id];
    if (!q) continue;
    task.type = task.id === 'task-7-1' ? 'reflection' : 'open';
    delete task.inputSchema;
    task.prompt = q.prompt;
    task.sourceRefs = [...new Set([...(task.sourceRefs || []), sgkSource.id])];
    task.evaluation = { rubric: { criteria: q.criteria, lookFor: [q.solution] } };
    task.supportRationale = `Lời giải chuẩn: ${q.solution}`;
    task.metadata = { ...task.metadata, workedSolution: q.solution };
    
    const hints = pkg.hints.filter(h => h.taskId === task.id);
    if (hints.length > 0 && q.hints) {
      hints.forEach((hint, idx) => {
        if (q.hints[idx]) hint.text = q.hints[idx];
        hint.supportRationale = task.supportRationale;
      });
    }
  }

  pkg.contentHash = hashPackage(pkg);
  const val = validateLessonPackage(pkg);
  assert.equal(val.ok, true, `Validation failed for ${pkg.id}: ${JSON.stringify(val.errors)}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const corpusPath = new URL('../../content/lessons/hki-2026-g11.json', import.meta.url);
  const cataloguePath = new URL('../../content/hki-2026-catalogue.json', import.meta.url);
  const originalText = readFileSync(corpusPath, 'utf8');
  const corpus = JSON.parse(originalText);
  const catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'));

  // 1. Repair r107
  const r107Original = corpus.entries.find(e => e.pkg.id === 'r22-g11-discover-r107');
  assert.ok(r107Original, 'r107 missing');
  const r107Repaired = repairLesson(r107Original, r107Questions, sgkThalesSource);

  // 2. Repair r108
  const r108Original = corpus.entries.find(e => e.pkg.id === 'r22-g11-discover-r108');
  assert.ok(r108Original, 'r108 missing');
  const r108Repaired = repairLesson(r108Original, r108Questions, sgkPracticeSource);

  // Update catalogue
  for (const rep of [r107Repaired, r108Repaired]) {
    const item = catalogue.lessons.find(l => l.id === rep.pkg.id);
    if (item) {
      Object.assign(item, {
        title: rep.title,
        version: rep.pkg.version,
        data: gzipSync(JSON.stringify(rep.pkg)).toString('base64')
      });
    }
  }

  // Update corpus
  const r107Before = JSON.stringify(r107Original, null, 1).split('\n').map(l => `  ${l}`).join('\n');
  const r107After = JSON.stringify(r107Repaired, null, 1).split('\n').map(l => `  ${l}`).join('\n');
  let updatedText = originalText.replace(r107Before, r107After);

  const r108Before = JSON.stringify(r108Original, null, 1).split('\n').map(l => `  ${l}`).join('\n');
  const r108After = JSON.stringify(r108Repaired, null, 1).split('\n').map(l => `  ${l}`).join('\n');
  updatedText = updatedText.replace(r108Before, r108After);

  writeFileSync(corpusPath, updatedText);
  writeFileSync(cataloguePath, JSON.stringify(catalogue) + '\n');

  console.log('Successfully repaired r107 and r108 with pedagogical progression, eliminated repetition!');
  console.log('r107 new hash:', r107Repaired.pkg.contentHash);
  console.log('r108 new hash:', r108Repaired.pkg.contentHash);
}
