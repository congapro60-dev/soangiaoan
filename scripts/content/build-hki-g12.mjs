import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { assembleHkiPackage } from './hki-package.mjs';
import { normalizeExamInput } from '../../lib/exam/validate.js';
import { parseExamLines } from '../../lib/exam/parse.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';
import { hashPackage } from '../../lib/lesson/schema.js';
import katex from 'katex';

const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const save = (path, value) => writeFileSync(new URL(path, root), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const grade = read('tasks/r22/ppct-hki.json').grades.find(g => g.grade === 12);
const units = read('tasks/r22/unit-objectives.json').units.filter(u => u.grade === 12);
const T = String.raw;
const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
const sign = n => n < 0 ? String(n) : `+${n}`;
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const norm = a => Math.sqrt(dot(a, a));
const vec = a => `(${a.join(';')})`;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const poly = (coeff, x) => coeff.reduce((sum, c, i) => sum + c * x ** i, 0);
const derivative = (coeff, x) => coeff.slice(1).reduce((sum, c, i) => sum + c * (i + 1) * x ** i, 0);
const integral = (coeff, a, b) => coeff.reduce((sum, c, i) => sum + c * (b ** (i + 1) - a ** (i + 1)) / (i + 1), 0);
function simpson(f, a, b, n = 200) {
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  return sum * h / 3;
}
const qNum = (prompt, answer, solution, check) => {
  assert.ok(Number.isFinite(answer));
  if (check !== undefined) near(answer, check);
  return { type: 'closed', prompt, evaluation: { checkerId: 'numeric_exact', answerKey: answer }, solution };
};
const qChoice = (prompt, correct, distractors, solution, seed = 0) => {
  const labels = [correct, ...distractors];
  assert.equal(new Set(labels).size, labels.length);
  const rotate = seed % labels.length;
  const ordered = [...labels.slice(rotate), ...labels.slice(0, rotate)];
  const options = ordered.map((label, i) => ({ id: String.fromCharCode(65 + i), label }));
  return { type: 'closed', prompt, inputSchema: { options }, evaluation: { checkerId: 'choice_exact', answerKey: options.find(o => o.label === correct).id }, solution };
};
const qOpen = (prompt, solution, criteria) => ({ type: 'open', prompt, solution,
  evaluation: { rubric: { criteria: criteria || ['Lập luận đúng theo dữ kiện.', 'Kết quả và điều kiện đúng.'], lookFor: [solution] } } });
const skill = (title, goal, rule, error, lo, make, hints) => ({ title, goal, rule, error, lo, make, hints });

const skills = {
  monoDef: skill('Đọc tính đơn điệu', 'Nhận biết chiều biến thiên trên một khoảng từ giá trị hàm và định nghĩa.',
    T`Với mọi $x_1<x_2$ trong cùng khoảng: đồng biến khi $f(x_1)<f(x_2)$, nghịch biến khi $f(x_1)>f(x_2)$. Một vài điểm mẫu chỉ giúp dự đoán, chưa chứng minh trên cả khoảng.`,
    'Không kết luận toàn khoảng chỉ bằng hai giá trị; không trộn hai khoảng rời nhau.', '1-01', s => {
      const a = s % 4 + 1, b = s % 7;
      return qChoice(T`Cho $f(x)=${a}x${sign(b)}$. Với $x_1<x_2$, $f(x_2)-f(x_1)=${a}(x_2-x_1)$. Kết luận nào đúng trên $\mathbb R$?`,
        'Hàm số đồng biến.', ['Hàm số nghịch biến.', 'Hàm số không đổi.'], T`Vì $${a}(x_2-x_1)>0$, $f(x_2)>f(x_1)$ với mọi cặp đã cho.`, s);
    }, ['So sánh hai đối số theo thứ tự tăng.', 'Xét dấu của hiệu hai giá trị hàm.', 'Hệ số dương không đổi dấu của hiệu hai đối số.', T`Ví dụ khác: $g(x)=-2x$ có $g(v)-g(u)=-2(v-u)<0$ khi $u<v$.`]),
  monoRule: skill('Dấu đạo hàm và khoảng đơn điệu', 'Dùng dấu đạo hàm để xác định đúng các khoảng đơn điệu.',
    T`Tìm tập xác định, giải $f'(x)=0$, lập bảng dấu trên từng khoảng rồi kết luận. $f'>0$ cho đồng biến, $f'<0$ cho nghịch biến; nghiệm đạo hàm không tự chia thành cực trị.`,
    'Không dùng dấu của hàm số thay dấu đạo hàm; giữ các khoảng liên thông.', '1-01', s => {
      const a = (s % 7) + 1;
      const k = (Math.floor(s / 7) % 2);
      if (k === 0) {
        const f = [0, -3 * a * a, 0, 1];
        assert.ok(derivative(f, 0) < 0 && derivative(f, 2 * a) > 0);
        return qChoice(T`Cho $f(x)=x^3-${3*a*a}x$. Khoảng nghịch biến là`, `$(-${a};${a})$`, [T`$(-\infty;-${a})$`, T`$(${a};+\infty)$`], T`$f'(x)=3(x-${a})(x+${a})<0$ đúng khi $-${a}<x<${a}$.`, s);
      } else {
        return qChoice(T`Cho $f(x)=-x^3+${3*a*a}x$. Khoảng đồng biến là`, `$(-${a};${a})$`, [T`$(-\infty;-${a})$`, T`$(${a};+\infty)$`], T`$f'(x)=-3(x-${a})(x+${a})>0$ đúng khi $-${a}<x<${a}$.`, s);
      }
    }, ['Tìm đạo hàm trước khi xét dấu.', 'Tách trục số bằng nghiệm của đạo hàm.', 'Thử dấu một điểm trong mỗi khoảng.', T`Ví dụ khác: $g'(x)=2(x-5)$ âm bên trái $5$, dương bên phải $5$.`]),
  monoCritical: skill('Đạo hàm bằng không chưa đủ', 'Phân biệt điểm có đạo hàm bằng không với sự đổi chiều biến thiên.',
    T`Điểm có $f'(x)=0$ cần được kiểm tra dấu hai phía. Đạo hàm bằng không tại điểm riêng lẻ vẫn có thể đồng biến trên toàn khoảng.`,
    'Không khẳng định mọi nghiệm của đạo hàm là điểm cực trị.', '1-01', s => {
      const a = (s % 9) + 1;
      const k = (Math.floor(s / 9) % 2);
      if (k === 0) {
        return qChoice(T`Cho $f(x)=(x-${a})^3$ và $f'(x)=3(x-${a})^2$. Khẳng định nào đúng?`,
          T`Hàm số đồng biến trên $\mathbb R$; $x=${a}$ không là điểm cực trị.`,
          [T`$x=${a}$ là điểm cực đại.`, T`$x=${a}$ là điểm cực tiểu.`], T`Đạo hàm dương ở hai phía của $${a}$, không đổi dấu qua điểm này.`, s);
      } else {
        return qChoice(T`Cho $f(x)=-(x-${a})^3$ và $f'(x)=-3(x-${a})^2$. Khẳng định nào đúng?`,
          T`Hàm số nghịch biến trên $\mathbb R$; $x=${a}$ không là điểm cực trị.`,
          [T`$x=${a}$ là điểm cực đại.`, T`$x=${a}$ là điểm cực tiểu.`], T`Đạo hàm âm ở hai phía của $${a}$, không đổi dấu qua điểm này.`, s);
      }
    }, ['Kiểm tra dấu ở cả hai phía.', 'Bình phương luôn không âm.', 'Đừng dừng ở phương trình đạo hàm bằng không.', T`Ví dụ khác: $g(x)=x^3$ tăng qua $0$ dù $g'(0)=0$.`]),
  extremaSign: skill('Nhận biết cực trị từ dấu', 'Nhận diện cực đại, cực tiểu bằng sự đổi dấu của đạo hàm.',
    T`Đạo hàm đổi dấu từ $+$ sang $-$ tại điểm liên tục cho cực đại; từ $-$ sang $+$ cho cực tiểu. Hoành độ cực trị khác giá trị cực trị.`,
    'Không đảo dấu cực đại/cực tiểu; phân biệt điểm và giá trị.', '1-02', s => {
      const a = (s % 7) + 1, b = a + (s % 3) + 2;
      const k = (Math.floor(s / 7) % 2);
      if (k === 0) {
        return qChoice(T`Hàm số liên tục có dấu $f'$ lần lượt là $+,-,+$ trên $(-\infty;${a})$, $(${a};${b})$, $(${b};+\infty)$. Điểm cực tiểu có hoành độ nào?`, `$${b}$`, [`$${a}$`, 'Không có cực tiểu.'], T`Qua $x=${b}$, dấu đạo hàm đổi từ âm sang dương.`, s);
      } else {
        return qChoice(T`Hàm số liên tục có dấu $f'$ lần lượt là $-,+,-$ trên $(-\infty;${a})$, $(${a};${b})$, $(${b};+\infty)$. Điểm cực đại có hoành độ nào?`, `$${b}$`, [`$${a}$`, 'Không có cực đại.'], T`Qua $x=${b}$, dấu đạo hàm đổi từ dương sang âm.`, s);
      }
    }, ['Đọc chiều đi từ trái sang phải.', 'Cực tiểu là đi xuống rồi đi lên.', 'Tìm nơi dấu âm chuyển sang dương.', T`Ví dụ khác: $+,-$ qua $x=-4$ biểu thị một cực đại.`]),
  extremaCalc: skill('Tính giá trị cực trị', 'Tìm điểm dừng, kiểm dấu và tính giá trị cực trị của hàm số.',
    T`Sau khi xác định đúng hoành độ cực trị, thay vào $f$, không thay vào $f'$. Dùng bảng dấu để kiểm chứng loại cực trị.`,
    'Đáp số 0 của đạo hàm không phải giá trị cực trị.', '1-02', s => {
      const a = s % 4 + 1, b = s % 6;
      const coeff = [b, -3*a*a, 0, 1], answer = b - 2*a**3;
      return qNum(T`Cho $f(x)=x^3-${3*a*a}x${sign(b)}$. Tính giá trị cực tiểu của hàm số.`, answer,
        T`$f'=3(x-${a})(x+${a})$. Dấu đổi từ $-$ sang $+$ tại $x=${a}$; $f(${a})=${answer}$.`, poly(coeff, a));
    }, ['Giải phương trình đạo hàm bằng không.', 'Dùng dấu để chọn đúng cực tiểu.', 'Thay hoành độ cực tiểu vào hàm ban đầu.', T`Ví dụ khác: $g(x)=(x+2)^2+7$ có giá trị cực tiểu $7$, hoành độ là $-2$.`]),
  vectorIdentify: skill('Vectơ trong không gian', 'Xác định hướng, điểm đầu/cuối và vectơ bằng nhau trong hình không gian.',
    T`Vectơ $\overrightarrow{AB}$ có điểm đầu $A$, điểm cuối $B$. Hai vectơ bằng nhau khi cùng hướng và cùng độ dài; không cần cùng giá.`,
    'Không coi hai vectơ ngược hướng là bằng nhau.', '1-07', s => {
      const labels = ['ABCD','MNPQ','EFGH','KLMN','PQRS','STUV','WXYZ','IJKL','ABCD','MNPQ','EFGH','KLMN'][s % 12].split(''); const [a,b,c,d] = labels;
      const edge = (Math.floor(s / 12) % 3);
      if (edge === 0) {
        return qChoice(T`Trong hình hộp $${a}${b}${c}${d}.${a}'${b}'${c}'${d}'$, vectơ nào bằng $\overrightarrow{${a}${b}}$?`,
          T`$\overrightarrow{${d}${c}}$`, [T`$\overrightarrow{${b}${a}}$`, T`$\overrightarrow{${c}${d}}$`], T`Hai cạnh đối $${a}${b}$ và $${d}${c}$ song song, bằng nhau và cùng hướng.`, s);
      } else if (edge === 1) {
        return qChoice(T`Trong hình hộp $${a}${b}${c}${d}.${a}'${b}'${c}'${d}'$, vectơ nào bằng $\overrightarrow{${a}${d}}$?`,
          T`$\overrightarrow{${b}${c}}$`, [T`$\overrightarrow{${d}${a}}$`, T`$\overrightarrow{${c}${b}}$`], T`Hai cạnh đối $${a}${d}$ và $${b}${c}$ song song, bằng nhau và cùng hướng.`, s);
      } else {
        return qChoice(T`Trong hình hộp $${a}${b}${c}${d}.${a}'${b}'${c}'${d}'$, vectơ nào bằng $\overrightarrow{${a}${a}'}$?`,
          T`$\overrightarrow{${b}${b}'}$`, [T`$\overrightarrow{${a}'${a}}$`, T`$\overrightarrow{${c}'${c}}$`], T`Hai cạnh bên cùng hướng và cùng độ dài.`, s);
      }
    }, ['Đánh dấu điểm đầu và điểm cuối.', 'So sánh hướng trước khi so sánh độ dài.', 'Dùng các cạnh đối của hình bình hành.', T`Ví dụ khác: trên đoạn $PQ$, hai vectơ $\overrightarrow{PQ}$ và $\overrightarrow{QP}$ đối nhau.`]),
  vectorSum: skill('Quy tắc cộng vectơ', 'Vận dụng quy tắc ba điểm và hình bình hành để cộng vectơ.',
    T`$\overrightarrow{AB}+\overrightarrow{BC}=\overrightarrow{AC}$. Khi hai vectơ chung điểm đầu, dựng hình bình hành; không nối nhầm hai điểm cuối.`,
    'Phải đặt vectơ thứ hai nối đuôi vectơ thứ nhất.', '1-08', s => {
      const a = s % 4 + 2, b = s % 3 + 3;
      return qNum(T`Trong hình hộp chữ nhật $ABCD.A'B'C'D'$, $AB=${a}$, $AD=${b}$. Tính $\left|\overrightarrow{AB}+\overrightarrow{AD}\right|^2$.`, a*a+b*b,
        T`Tổng là $\overrightarrow{AC}$. Tam giác $ABC$ vuông nên $AC^2=${a}^2+${b}^2=${a*a+b*b}$.`, dot([a,b,0],[a,b,0]));
    }, ['Dựng đường chéo của hình bình hành.', 'Hai cạnh đã cho vuông góc.', 'Cần bình phương độ dài, chưa cần lấy căn.', T`Ví dụ khác: $\overrightarrow{PQ}+\overrightarrow{QR}=\overrightarrow{PR}$.`]),
  vectorDiff: skill('Hiệu vectơ', 'Viết hiệu hai vectơ chung điểm đầu bằng một vectơ đúng hướng.',
    T`$\overrightarrow{AB}-\overrightarrow{AC}=\overrightarrow{CB}$. Đổi phép trừ thành cộng vectơ đối giúp kiểm tra hướng.`,
    'Không đảo hướng của vectơ kết quả.', '1-08', s => {
      const [a,b,c,d]=['ABCD','MNPQ','EFGH','KLMN','PQRS','STUV','WXYZ','IJKL','ABCD','MNPQ','EFGH','KLMN'][s%12].split('');
      const edge = (Math.floor(s / 12) % 2);
      if (edge === 0) {
        return qChoice(T`Với tứ diện $${a}${b}${c}${d}$, rút gọn $\overrightarrow{${a}${b}}-\overrightarrow{${a}${d}}$.`,
          T`$\overrightarrow{${d}${b}}$`, [T`$\overrightarrow{${b}${d}}$`, T`$\overrightarrow{${a}${d}}$`], T`$\overrightarrow{${a}${b}}+\overrightarrow{${d}${a}}=\overrightarrow{${d}${b}}$ theo quy tắc ba điểm.`, s);
      } else {
        return qChoice(T`Với tứ diện $${a}${b}${c}${d}$, rút gọn $\overrightarrow{${a}${c}}-\overrightarrow{${a}${b}}$.`,
          T`$\overrightarrow{${b}${c}}$`, [T`$\overrightarrow{${c}${b}}$`, T`$\overrightarrow{${a}${b}}$`], T`$\overrightarrow{${a}${c}}+\overrightarrow{${b}${a}}=\overrightarrow{${b}${c}}$ theo quy tắc ba điểm.`, s);
      }
    },
    ['Hai vectơ có chung điểm đầu.', 'Đổi vectơ bị trừ thành vectơ đối.', 'Ghép theo quy tắc ba điểm.', T`Ví dụ khác: $\overrightarrow{OM}-\overrightarrow{ON}=\overrightarrow{NM}$.`]),
  maxTable: skill('Đọc GTLN và GTNN', 'Phân biệt giá trị lớn nhất/nhỏ nhất đạt được với giới hạn trên/dưới.',
    T`GTLN/GTNN phải là giá trị hàm thực sự nhận được trong miền đang xét. Đọc cả đầu mút, điểm cực trị và trạng thái đóng/mở của miền.`,
    'Không chọn một giá trị giới hạn ở đầu mút không thuộc miền.', '1-03', s => {
      const a = (s % 6) + 2, b = a + (s % 4) + 2, minVal = -((s % 3) + 1);
      const k = (Math.floor(s / 6) % 2);
      if (k === 0) {
        return qNum(T`Hàm số liên tục trên $[0;4]$, tăng từ $f(0)=${a}$ đến $f(2)=${b}$ rồi giảm đến $f(4)=${minVal}$. Tìm giá trị lớn nhất.`, b,
          T`Theo chiều biến thiên, các giá trị không vượt $f(2)=${b}$; giá trị này đạt tại điểm thuộc đoạn.`, Math.max(a,b,minVal));
      } else {
        return qNum(T`Hàm số liên tục trên $[0;4]$, giảm từ $f(0)=${b}$ xuống $f(2)=${minVal}$ rồi tăng đến $f(4)=${a}$. Tìm giá trị nhỏ nhất.`, minVal,
          T`Theo chiều biến thiên, các giá trị không nhỏ hơn $f(2)=${minVal}$; giá trị này đạt tại điểm thuộc đoạn.`, Math.min(a,b,minVal));
      }
    }, ['Liệt kê những giá trị được đạt tới.', 'So sánh các mốc trong bảng biến thiên.', 'Kiểm tra điểm ứng với mốc có thuộc miền hay không.', T`Ví dụ khác: $g(x)=x$ trên $(0;2)$ không đạt giá trị $2$, nên không có GTLN.`]),
  maxClosed: skill('Cực trị tuyệt đối trên đoạn', 'So sánh giá trị tại đầu mút và điểm dừng để tìm GTLN/GTNN trên đoạn.',
    T`Với hàm liên tục trên đoạn: tìm các điểm đạo hàm bằng không hoặc không xác định trong đoạn, tính thêm hai đầu mút rồi so sánh.`,
    'Không chỉ xét các điểm cực trị bên trong.', '1-03', s => {
      const a = s % 4 + 1, b = s % 5 + 2; const coeff=[b,-2*a,1];
      const left=-1, right=a+2, answer=Math.max(poly(coeff,left),poly(coeff,right));
      return qNum(T`Tìm GTLN của $f(x)=x^2-${2*a}x+${b}$ trên $[-1;${right}]$.`, answer,
        T`$f'=2x-${2*a}$, điểm dừng $x=${a}$. So sánh $f(-1)=${poly(coeff,left)}$, $f(${a})=${poly(coeff,a)}$, $f(${right})=${poly(coeff,right)}$; GTLN là $${answer}$.`, Math.max(...Array.from({length:401},(_,i)=>poly(coeff,left+(right-left)*i/400))));
    }, ['Miền là đoạn đóng nên có hai đầu mút.', 'Tìm điểm dừng nằm trong đoạn.', 'Lập bảng các giá trị cần so sánh.', T`Ví dụ khác: trên $[0;3]$, hàm $g(x)=x$ đạt GTLN tại đầu mút phải.`]),
  maxOpen: skill('GTLN, GTNN trên khoảng', 'Kiểm tra sự tồn tại và giá trị lớn nhất/nhỏ nhất trên khoảng mở.',
    T`Trên khoảng mở, giới hạn ở biên không nhất thiết đạt được. Phân biệt “không có GTLN” với “GTLN bằng vô cực”.`,
    'Không đưa đầu mút bị loại vào tập ứng viên đạt cực trị.', '1-03', s => {
      const a = (s % 7) + 1;
      const k = (Math.floor(s / 7) % 2);
      if (k === 0) {
        return qChoice(T`Xét $f(x)=x^2$ trên $(-${a};${a})$. Khẳng định nào đúng?`, T`GTNN là $0$, không có GTLN.`,
          [T`GTNN là $0$, GTLN là $${a*a}$.`, T`Không có GTNN và không có GTLN.`], T`Giá trị $0$ đạt tại $x=0$; $x^2<${a*a}$ trong khoảng và tiến sát $${a*a}$ ở biên, nhưng không đạt.`,s);
      } else {
        return qChoice(T`Xét $f(x)=-x^2$ trên $(-${a};${a})$. Khẳng định nào đúng?`, T`GTLN là $0$, không có GTNN.`,
          [T`GTLN là $0$, GTNN là $-${a*a}$.`, T`Không có GTLN và không có GTNN.`], T`Giá trị $0$ đạt tại $x=0$; $-x^2>-${a*a}$ trong khoảng và tiến sát $-${a*a}$ ở biên, nhưng không đạt.`,s);
      }
    }, ['Kiểm tra biên khoảng có được lấy không.', 'Tìm giá trị nhỏ nhất có đạt tại điểm trong khoảng.', 'So sánh giá trị thực với giới hạn tại biên.', T`Ví dụ khác: $g(x)=x$ trên $(1;4)$ không đạt hai giá trị biên.`]),
  vectorScale: skill('Nhân vectơ với một số', 'Xác định hướng và độ dài của vectơ nhân với một số.',
    T`$|k\vec u|=|k||\vec u|$. Hệ số âm đảo hướng; hệ số không bằng không giữ hoặc đảo hướng nhưng không đổi phương.`,
    'Độ dài không âm; dấu âm biểu thị hướng.', '1-08', s=>{
      const a=s%4+2,k=-(s%3+2);
      return qNum(T`Cho $|\vec u|=${a}$, $\vec v=${k}\vec u$. Tính $|\vec v|$.`,Math.abs(k)*a,
        T`$|\vec v|=|${k}|\,${a}=${Math.abs(k)*a}$; hai vectơ ngược hướng.`,norm([k*a,0,0]));
    }, ['Phân biệt vectơ với độ dài của nó.', 'Lấy trị tuyệt đối của hệ số.', 'Dấu của hệ số chỉ dùng để xét hướng.', T`Ví dụ khác: nếu $|\vec w|=5$, thì $|\tfrac12\vec w|=2{,}5$.`]),
  dotGeo: skill('Tích vô hướng hình học', 'Tính tích vô hướng từ độ dài và góc giữa hai vectơ.',
    T`$\vec u\cdot\vec v=|\vec u||\vec v|\cos\theta$, với $0\le\theta\le\pi$. Tích vô hướng có thể âm; góc là góc của hai vectơ đặt chung điểm đầu.`,
    'Không nhầm tích vô hướng với tích hai độ dài hoặc vectơ.', '1-09', s=>{
      const a=2*(s%3+1),b=s%4+2,deg=s%2?60:120,cos=deg===60?.5:-.5,ans=a*b*cos;
      return qNum(T`Cho $|\vec u|=${a}$, $|\vec v|=${b}$, góc giữa chúng $${deg}^{\circ}$. Tính $\vec u\cdot\vec v$.`,ans,
        T`$\vec u\cdot\vec v=${a}\cdot${b}\cdot\cos ${deg}^{\circ}=${fmt(ans)}$.`,a*b*Math.cos(deg*Math.PI/180));
    }, ['Dùng góc giữa hai vectơ, không phải hai đường thẳng chưa định hướng.', 'Tích vô hướng bằng tích độ dài nhân cosin góc.', 'Góc tù cho cosin âm.', T`Ví dụ khác: hai vectơ vuông góc có tích vô hướng bằng $0$.`]),
  asymVH: skill('Tiệm cận đứng và ngang', 'Xác định tiệm cận đứng/ngang bằng giới hạn, kiểm tra điểm bị khử.',
    T`Tiệm cận đứng cần giới hạn vô cực tại điểm hữu hạn. Tiệm cận ngang $y=L$ cần giới hạn $L$ khi $x$ tiến ra vô cực. Mẫu bằng không chưa đủ nếu nhân tử bị khử.`,
    'Không coi mọi nghiệm mẫu số là tiệm cận đứng.', '1-04', s=>{
      const a=s%3+1,b=a+2,k=s%5+1;
      return qChoice(T`Cho $f(x)=${a}+\dfrac{${k}}{x-${b}}$. Cặp tiệm cận đứng và ngang là`,
        T`$x=${b}$ và $y=${a}$`,[T`$x=${a}$ và $y=${b}$`,T`$x=-${b}$ và $y=${a}$`],
        T`Khi $x\to${b}^{\pm}$, phần phân thức vô hạn; khi $x\to\pm\infty$, phần phân thức tiến về $0$.`,s);
    }, ['Xác định điểm loại khỏi miền.', 'Xét giới hạn gần điểm đó.', 'Xét riêng giới hạn khi đối số ra vô cực.', T`Ví dụ khác: $g(x)=\frac{x-1}{x-1}=1$ với $x\ne1$ có điểm khuyết, không có tiệm cận đứng tại $1$.`]),
  asymOblique: skill('Tiệm cận xiên', 'Dùng phép chia đa thức để tìm đường tiệm cận xiên.',
    T`Viết $f(x)=ax+b+r(x)$ với $r(x)\to0$ khi $x\to\pm\infty$; đường $y=ax+b$ là tiệm cận xiên khi $a\ne0$.`,
    'Không bỏ phần hằng của thương; không gọi đường xiên là tiệm cận ngang.', '1-04', s=>{
      const b=s%4+1,c=s%3+2;
      return qChoice(T`Cho $f(x)=\dfrac{x^2${sign(b-c)}x${sign(1-b*c)}}{x-${c}}=x+${b}+\dfrac1{x-${c}}$. Tiệm cận xiên là`,
        T`$y=x+${b}$`,[T`$y=x-${c}$`,T`$y=${b}$`], T`Hiệu $f(x)-(x+${b})=1/(x-${c})\to0$ khi $x\to\pm\infty$.`,s);
    }, ['Quan sát thương và số dư sau phép chia.', 'Tiệm cận lấy từ phần bậc nhất của thương.', 'Chứng minh phần dư tiến về không.', T`Ví dụ khác: $g(x)=2x-5+3/x$ có tiệm cận xiên $y=2x-5$.`]),
  coordPoint: skill('Tọa độ điểm và hình chiếu', 'Đọc tọa độ điểm trong không gian và xác định hình chiếu lên mặt phẳng tọa độ.',
    T`Điểm $M(x;y;z)$ có ba tọa độ theo ba trục vuông góc. Hình chiếu lên $(Oxy)$ giữ $x,y$ và đặt $z=0$.`,
    'Không đổi thứ tự ba tọa độ; mặt phẳng tọa độ khác trục tọa độ.', '1-10', s=>{
      const a=s%5+1,b=-(s%4+1),c=s%3+2;
      return qChoice(T`Trong $Oxyz$, $M${vec([a,b,c])}$. Hình chiếu vuông góc của $M$ lên $(Oxy)$ là`,
        `$${vec([a,b,0])}$`,[`$${vec([0,b,c])}$`,`$${vec([a,0,c])}$`],T`Hình chiếu lên $(Oxy)$ có tung độ và hoành độ giữ nguyên, cao độ bằng $0$.`,s);
    }, ['Xác định mặt phẳng đang chiếu tới.', 'Mặt phẳng đó có tọa độ nào bằng không?', 'Chỉ thay tọa độ vuông góc với mặt phẳng.', T`Ví dụ khác: chiếu $N(2;3;4)$ lên $(Oyz)$ được $(0;3;4)$.`]),
  coordVector: skill('Tọa độ vectơ và vectơ đơn vị', 'Tìm tọa độ vectơ từ hai điểm hoặc từ phân tích theo vectơ đơn vị.',
    T`$\overrightarrow{AB}=(x_B-x_A;y_B-y_A;z_B-z_A)$. Vectơ $a\vec i+b\vec j+c\vec k$ có tọa độ $(a;b;c)$.`,
    'Lấy điểm cuối trừ điểm đầu ở cả ba tọa độ.', '1-11', s=>{
      const A=[s%3+1,2,-1],B=[s%3+4,-2,s%4+2],v=B.map((x,i)=>x-A[i]);
      return qChoice(T`Cho $A${vec(A)}$, $B${vec(B)}$. Tọa độ $\overrightarrow{AB}$ là`,
        `$${vec(v)}$`,[`$${vec(v.map(x=>-x))}$`,`$${vec(B.map((x,i)=>x+A[i]))}$`],T`Lấy tọa độ $B$ trừ $A$: $\overrightarrow{AB}=${vec(v)}$.`,s);
    }, ['Gạch chân điểm đầu và điểm cuối.', 'Thực hiện ba phép trừ cùng thứ tự.', 'Kiểm tra riêng phép trừ số âm.', T`Ví dụ khác: từ $P(0;1;0)$ đến $Q(2;1;3)$ có vectơ $(2;0;3)$.`]),
  coordOps: skill('Phép toán vectơ theo tọa độ', 'Tính tổ hợp tuyến tính của hai vectơ theo từng tọa độ.',
    T`Cộng, trừ vectơ theo từng tọa độ; nhân số với cả ba tọa độ. Làm từng thành phần, giữ dấu hệ số cho tới hết phép tính.`,
    'Không nhân hệ số cho một tọa độ rồi bỏ hai tọa độ còn lại.', '2-12', s=>{
      const u=[s%4+1,-2,3],v=[2,s%3+1,-1],k=s%3+2,w=u.map((x,i)=>k*x-v[i]);
      return qChoice(T`Cho $\vec u=${vec(u)}$, $\vec v=${vec(v)}$. Tọa độ $${k}\vec u-\vec v$ là`,
        `$${vec(w)}$`,[`$${vec(u.map((x,i)=>k*x+v[i]))}$`,`$${vec(u.map((x,i)=>x-k*v[i]))}$`],T`Nhân từng tọa độ của $\vec u$ với $${k}$ rồi trừ tọa độ tương ứng của $\vec v$: $${vec(w)}$.`,s);
    }, ['Tính vectơ được nhân trước.', 'Giữ thứ tự từng tọa độ.', 'Trừ một số âm là cộng số đối.', T`Ví dụ khác: $2(1;0;-1)-(0;3;2)=(2;-3;-4)$.`]),
  dotCoord: skill('Tích vô hướng theo tọa độ', 'Tính tích vô hướng và kiểm tra vuông góc bằng tọa độ.',
    T`$\vec u\cdot\vec v=u_1v_1+u_2v_2+u_3v_3$. Hai vectơ khác không vuông góc khi tích vô hướng bằng không.`,
    'Tích vô hướng là một số, không phải bộ ba tích.', '2-12', s=>{
      const u=[s%4+1,-2,3],v=[2,s%3+1,-1],ans=dot(u,v);
      return qNum(T`Cho $\vec u=${vec(u)}$, $\vec v=${vec(v)}$. Tính $\vec u\cdot\vec v$.`,ans,
        T`$${u[0]}\cdot2+(-2)\cdot${v[1]}+3\cdot(-1)=${ans}$.`,(norm(u.map((x,i)=>x+v[i]))**2-norm(u)**2-norm(v)**2)/2);
    }, ['Nhân các tọa độ tương ứng.', 'Cộng đủ ba tích.', 'Giữ dấu âm trong từng tích.', T`Ví dụ khác: $(1;2;0)\cdot(2;-1;3)=0$.`]),
  angleCoord: skill('Góc và độ dài trong tọa độ', 'Kết hợp tích vô hướng và độ dài để tính cosin góc giữa hai vectơ.',
    T`Với hai vectơ khác không: $\cos\theta=\dfrac{\vec u\cdot\vec v}{|\vec u||\vec v|}$. Kiểm tra kết quả trong $[-1;1]$.`,
    'Không dùng bình phương độ dài thay độ dài trong mẫu.', '1-09', s=>{
      const a = (s % 6) + 1;
      const k = (Math.floor(s / 6) % 2);
      if (k === 0) {
        const u = [a, a, 0], v = [a, 0, a];
        return qNum(T`Cho $\vec u=${vec(u)}$, $\vec v=${vec(v)}$. Tính cosin góc giữa hai vectơ (nhập phân số hoặc số thập phân).`,.5,
          T`Tích vô hướng bằng $${a*a}$, mỗi độ dài bằng $${a}\sqrt2$; thương là $1/2$.`,dot(u,v)/(norm(u)*norm(v)));
      } else {
        const u = [a, 0, a], v = [-a, 0, a];
        return qNum(T`Cho $\vec u=${vec(u)}$, $\vec v=${vec(v)}$. Tính cosin góc giữa hai vectơ (nhập phân số hoặc số thập phân).`,0,
          T`Tích vô hướng bằng $-${a*a}+${a*a}=0$, nên hai vectơ vuông góc; cosin góc bằng $0$.`,dot(u,v)/(norm(u)*norm(v)));
      }
    }, ['Tính tích vô hướng.', 'Tính riêng hai độ dài.', 'Mẫu là tích hai căn bậc hai.', T`Ví dụ khác: hai vectơ cùng hướng, khác không có cosin góc bằng $1$.`]),
};

Object.assign(skills, {
  coordBasis: skill('Biểu diễn theo vectơ đơn vị', 'Chuyển giữa tọa độ và biểu diễn theo ba vectơ đơn vị của hệ trục.',
    T`Trong hệ $Oxyz$, $\overrightarrow{OM}=x\vec i+y\vec j+z\vec k$ tương ứng với điểm $M(x;y;z)$. Thứ tự hệ số luôn theo $\vec i,\vec j,\vec k$.`,
    'Không ghép hệ số theo thứ tự viết nếu các vectơ đơn vị bị đổi chỗ.', '1-11',s=>{
      const a=s%5+1,b=s%3+2,c=s%4+1;
      return qChoice(T`Biết $\overrightarrow{OM}=${c}\vec k+${a}\vec i-${b}\vec j$. Tọa độ của $M$ là`,
        `$${vec([a,-b,c])}$`,[`$${vec([c,a,-b])}$`,`$${vec([a,b,c])}$`],T`Sắp hệ số theo $\vec i,\vec j,\vec k$ được $(${a};-${b};${c})$.`,s);
    }, ['Đánh dấu từng vectơ đơn vị.', 'Sắp theo trục x, y, z.', 'Giữ dấu của hệ số vectơ j.', T`Ví dụ khác: $2\vec i+0\vec j+5\vec k$ có tọa độ $(2;0;5)$.`]),
  cubic: skill('Khảo sát hàm bậc ba', 'Liên kết bảng dấu đạo hàm, cực trị và các điểm để phác thảo đồ thị bậc ba.',
    T`Khảo sát theo thứ tự: miền xác định, đạo hàm và bảng biến thiên, cực trị, giao trục/điểm phụ, phác đồ thị. Nét vẽ phải phù hợp chiều biến thiên, không chỉ nối các điểm bằng đoạn thẳng.`,
    'Không vẽ hai nhánh cực trị cùng độ cao; kiểm tra chiều ở hai đầu.', '1-05', (s, stage)=>{
      const a=s%2+1,b=s%5-2,coeff=[b,-3*a*a,0,1];
      const high=b+2*a**3,low=b-2*a**3;
      near(poly(coeff,-a),high);near(poly(coeff,a),low);
      if(stage==='precheck') return qChoice(T`Với $f(x)=x^3-${3*a*a}x${sign(b)}$, hệ số bậc ba dương. Khi $x\to+\infty$, $f(x)$ tiến tới đâu?`,T`$+\infty$`,[T`$-\infty$`,`$${b}$`],T`Số hạng $x^3$ chi phối khi $x$ rất lớn.`,s);
      return qOpen(T`Cho $f(x)=x^3-${3*a*a}x${sign(b)}$, $f'(x)=3(x-${a})(x+${a})$. Trên vở, hoàn thiện bảng biến thiên, ghi hai điểm cực trị và phác đồ thị qua $(0;${b})$. Mô tả ngắn chiều của ba nhánh.`,
        T`Miền $\mathbb R$; dấu $f'$ là $+,-,+$ qua $-${a},${a}$. Cực đại $(-${a};${high})$, cực tiểu $(${a};${low})$, qua $(0;${b})$. Đồ thị đi từ dưới trái lên cực đại, xuống cực tiểu, rồi lên trên phải.`,
        ['Bảng dấu và chiều biến thiên đúng.', 'Hai tọa độ cực trị đúng.', 'Phác thảo liên tục, đi qua điểm đã cho, đúng chiều hai đầu.']);
    }, ['Đặt hai nghiệm đạo hàm lên trục số.', 'Lập ba khoảng và thử dấu.', 'Tính tung độ bằng hàm ban đầu rồi đặt điểm lên hệ trục.', T`Ví dụ khác: $g(x)=x^3$ có hình chữ S tăng, đi qua gốc tọa độ và không có cực trị.`]),
  rational11: skill('Khảo sát phân thức bậc nhất/bậc nhất', 'Kết hợp miền xác định, tính đơn điệu và tiệm cận để phác đồ thị phân thức bậc nhất/bậc nhất.',
    T`Viết hàm dưới dạng $a+k/(x-b)$ để đọc tiệm cận; đạo hàm $-k/(x-b)^2$ cho chiều biến thiên trên từng khoảng. Hai nhánh không nối qua đường tiệm cận đứng.`,
    'Không nối hai nhánh qua điểm loại khỏi miền; không nói nghịch biến trên toàn tập xác định rời nhau.', '1-05', (s,stage)=>{
      const a=s%3+1,b=s%3+2,k=s%4+1;
      if(stage==='precheck') return qNum(T`Hàm $f(x)=${a}+\dfrac{${k}}{x-${b}}$ không xác định tại giá trị nào của $x$?`,b,T`Mẫu bằng không khi $x=${b}$.`);
      return qOpen(T`Khảo sát và phác nhanh $f(x)=${a}+\dfrac{${k}}{x-${b}}$. Ghi miền xác định, dấu đạo hàm, hai tiệm cận và hai điểm ứng với $x=${b-1}$, $x=${b+1}$.`,
        T`Miền $\mathbb R\setminus\{${b}\}$; $f'=-${k}/(x-${b})^2<0$. Nghịch biến trên từng khoảng $(-\infty;${b})$, $(${b};+\infty)$. Tiệm cận $x=${b},y=${a}$. Hai điểm $(${b-1};${a-k})$, $(${b+1};${a+k})$; hai nhánh hướng xuống riêng rẽ.`,
        ['Miền và tiệm cận đúng.', 'Dấu đạo hàm, từng khoảng đơn điệu đúng.', 'Hai điểm và hai nhánh phù hợp tiệm cận.']);
    }, ['Tách hằng số và phân thức đơn.', 'Mẫu bình phương của đạo hàm luôn dương trên miền.', 'Dựng hai tiệm cận trước khi đặt điểm.', T`Ví dụ khác: $g(x)=1/x$ có hai tiệm cận là hai trục tọa độ.`]),
  rational21: skill('Khảo sát phân thức bậc hai/bậc nhất', 'Dùng tiệm cận xiên và bảng biến thiên để phác đồ thị phân thức bậc hai/bậc nhất.',
    T`Chia đa thức, xác định tiệm cận xiên và đứng; giải đạo hàm bằng không rồi lập bảng dấu có tách điểm loại khỏi miền.`,
    'Điểm loại khỏi miền không phải cực trị; hai nhánh không được nối qua đó.', '1-05', (s,stage)=>{
      const b=s%3+1,c=s%4+1,k=s%2+1;
      if(stage==='precheck')return qChoice(T`Với $f(x)=x+${b}+\dfrac{${k*k}}{x-${c}}$, đường tiệm cận xiên là`,T`$y=x+${b}$`,[T`$x=${c}$`,T`$y=${b}$`],T`Phần phân thức tiến về $0$ khi $x\to\pm\infty$.`,s);
      const hi=c+b-2*k,lo=c+b+2*k;
      return qOpen(T`Cho $f(x)=x+${b}+\dfrac{${k*k}}{x-${c}}$, $f'(x)=1-\dfrac{${k*k}}{(x-${c})^2}$. Ghi hai tiệm cận, lập bảng biến thiên và phác hai nhánh với điểm cực trị.`,
        T`Miền loại $${c}$; tiệm cận $x=${c}$ và $y=x+${b}$. Nghiệm đạo hàm $${c-k},${c+k}$; dấu $+,-\mid-,+$. Cực đại nhánh trái $(${c-k};${hi})$, cực tiểu nhánh phải $(${c+k};${lo})$. Hai nhánh tiến sát đường xiên ở vô cực.`,
        ['Miền và hai tiệm cận đúng.', 'Bảng dấu tách đúng điểm không xác định.', 'Hai cực trị và hình dạng hai nhánh đúng.']);
    }, ['Tách riêng điểm làm mẫu bằng không.', 'Giải bình phương bằng số dương để có hai nghiệm.', 'Lập bốn khoảng, không bỏ khoảng sát tiệm cận.', T`Ví dụ khác: $g(x)=x+1/x$ có nghiệm đạo hàm $\pm1$ và tiệm cận $x=0,y=x$.`]),
  groupRange: skill('Khoảng biến thiên mẫu ghép nhóm', 'Tính khoảng biến thiên xấp xỉ từ hai đầu mút ngoài của các nhóm có số liệu.',
    T`Với mẫu ghép nhóm, khoảng biến thiên xấp xỉ bằng đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu. Không thay hai mút bằng điểm giữa.`,
    'Không lấy chênh lệch tần số; kết quả chỉ xấp xỉ cho mẫu gốc.', '2-14', s=>{
      const l=s%5*10,h=s%3+2;
      return qNum(T`Mẫu ghép nhóm có các lớp $[${l};${l+h}),[${l+h};${l+2*h}),[${l+2*h};${l+3*h})$, tần số lần lượt $4,8,8$. Tính khoảng biến thiên xấp xỉ.`,3*h,
        T`Hai mút ngoài là $${l}$ và $${l+3*h}$; $R=${l+3*h}-${l}=${3*h}$.`,(l+3*h)-l);
    }, ['Tìm nhóm đầu và cuối có dữ liệu.', 'Lấy hai mút ngoài, không lấy điểm giữa.', 'Trừ theo thứ tự lớn trừ nhỏ.', T`Ví dụ khác: các lớp từ $[10;15)$ đến $[20;25)$ cho khoảng biến thiên xấp xỉ $15$.`]),
  quartile: skill('Khoảng tứ phân vị ghép nhóm', 'Tìm nhóm chứa tứ phân vị, nội suy rồi tính khoảng tứ phân vị.',
    T`Tìm vị trí $n/4,3n/4$ bằng tần số tích lũy. Gọi $F_0$ là tổng tần số trước nhóm chứa tứ phân vị; trong nhóm, $Q=L+\dfrac{p-F_0}{f}\,h$. Khoảng tứ phân vị là $Q_3-Q_1$.`,
    'Không dùng tần số của nhóm thay tổng tần số trước nhóm.', '2-14', s=>{
      const l = (s % 13) * 10, h = 4 * ((Math.floor(s / 13) % 4) + 1), q1 = l + 9 * h / 8, q3 = l + 19 * h / 8, ans = 5 * h / 4;
      return qNum(T`Các nhóm $[${l};${l+h}),[${l+h};${l+2*h}),[${l+2*h};${l+3*h})$ có tần số $4,8,8$. Dùng nội suy, tính khoảng tứ phân vị.`,ans,
        T`$n=20$; vị trí $5,15$. $Q_1=${l+h}+\frac{5-4}{8}\cdot${h}=${fmt(q1)}$; $Q_3=${l+2*h}+\frac{15-12}{8}\cdot${h}=${fmt(q3)}$; hiệu bằng $${ans}$.`,q3-q1);
    }, ['Lập tần số tích lũy: cộng dồn từng nhóm.', 'Đánh dấu vị trí một phần tư và ba phần tư số quan sát.', 'Nội suy từng tứ phân vị rồi mới lấy hiệu.', T`Ví dụ khác: nếu vị trí cần tìm là $6$, nhóm có $L=10,F_0=4,f=8,h=4$, trong đó $F_0$ là tổng tần số trước nhóm; phần nội suy là $\frac{6-4}{8}\cdot4$.`]),
  variance: skill('Phương sai và độ lệch chuẩn ghép nhóm', 'Dùng điểm giữa và tần số để tính phương sai, độ lệch chuẩn xấp xỉ.',
    T`Thay mỗi nhóm bằng điểm giữa $x_i$. Tính $\bar x=\sum n_ix_i/n$, $s^2=\sum n_i(x_i-\bar x)^2/n$, $s=\sqrt{s^2}$. Công thức ở đây chia cho $n$.`,
    'Không chia cho số nhóm hoặc tự đổi sang n−1; độ lệch chuẩn khác phương sai.', '2-14', s=>{
      const l=(s%6)*10,a=(Math.floor(s/6)%4)+1,h=2*a,mids=[l+a,l+3*a,l+5*a],freq=[4,8,4],mean=dot(mids,freq)/16;
      const variance=dot(mids.map(x=>(x-mean)**2),freq)/16;
      near(variance,2*a*a);
      return qChoice(T`Các nhóm $[${l};${l+h}),[${l+h};${l+2*h}),[${l+2*h};${l+3*h})$ có tần số $4,8,4$. Dùng điểm giữa, chọn phương sai và độ lệch chuẩn đúng.`,
        T`$s^2=${2*a*a},\ s=${a}\sqrt2$`,[T`$s^2=${4*a*a},\ s=${2*a}$`,T`$s^2=${a}\sqrt2,\ s=${2*a*a}$`],
        T`Điểm giữa là $${mids.join(',')}$, $\bar x=${mean}$. Tổng bình phương lệch có trọng số bằng $${variance*16}$; chia $16$ được $s^2=${variance}$; lấy căn được $s=${a}\sqrt2$.`,s);
    }, ['Tìm điểm giữa của từng nhóm.', 'Dùng tần số làm trọng số khi tính trung bình.', 'Bình phương các độ lệch trước khi cộng có trọng số.', T`Ví dụ khác: hai giá trị $1,3$ xuất hiện như nhau có trung bình $2$, phương sai $1$, độ lệch chuẩn $1$.`]),
  risk: skill('Diễn giải độ phân tán', 'So sánh độ ổn định của hai mẫu cùng đơn vị, đồng thời nêu giới hạn của kết luận.',
    T`Khi so sánh cùng đại lượng, cùng đơn vị và mức trung bình tương đương, phương sai hoặc độ lệch chuẩn nhỏ hơn cho biết mức phân tán nhỏ hơn. Đây không phải bằng chứng bảo đảm cho lần quan sát kế tiếp.`,
    'Không đồng nhất phân tán thấp với lợi nhuận cao hoặc chắc chắn an toàn.', '2-14', s=>{
      const contexts = [
        { objA: 'Thiết bị A', objB: 'Thiết bị B', measure: 'thời gian xử lý', unit: 'phút' },
        { objA: 'Dây chuyền 1', objB: 'Dây chuyền 2', measure: 'khối lượng sản phẩm', unit: 'gam' },
        { objA: 'Xạ thủ A', objB: 'Xạ thủ B', measure: 'khoảng cách tới tâm', unit: 'cm' },
        { objA: 'Thuật toán Alpha', objB: 'Thuật toán Beta', measure: 'độ trễ phản hồi', unit: 'mili-giây' },
        { objA: 'Lớp 12A', objB: 'Lớp 12B', measure: 'điểm số kiểm tra', unit: 'điểm' },
        { objA: 'Máy đóng gói 1', objB: 'Máy đóng gói 2', measure: 'thể tích chiết rót', unit: 'ml' },
      ];
      const ctx = contexts[s % contexts.length];
      const a = (Math.floor(s / contexts.length) % 6) + 1;
      const b = a + (s % 3) + 1;
      return qChoice(T`Hai đối tượng ${ctx.objA} và ${ctx.objB} có cùng ${ctx.measure} trung bình, cùng đơn vị ${ctx.unit}. Độ lệch chuẩn của ${ctx.objA} là $${a}$, của ${ctx.objB} là $${b}$. Kết luận được dữ liệu hỗ trợ là`,
        `${ctx.objA} có ${ctx.measure} ít phân tán hơn trong mẫu đã quan sát.`,
        [`${ctx.objA} luôn tốt hơn ${ctx.objB} trong mọi lần.`, `${ctx.objB} chắc chắn tốt hơn vì độ lệch chuẩn lớn hơn.`],
        T`$${a}<${b}$ cho thấy ${ctx.objA} ít phân tán hơn quanh cùng mức trung bình; không suy được thứ tự của mọi lần chạy.`,s);
    }, ['Hai số đang đo độ phân tán, không phải trung bình.', 'Kiểm tra hai mẫu có cùng đơn vị.', 'So sánh rồi giới hạn kết luận ở mẫu đang xét.', T`Ví dụ khác: cùng điểm trung bình, lớp có độ lệch chuẩn nhỏ hơn có điểm tập trung hơn quanh trung bình.`]),
  primitiveDef: skill('Định nghĩa nguyên hàm', 'Kiểm tra một hàm là nguyên hàm bằng phép lấy đạo hàm; nhận biết hằng số tùy ý.',
    T`$F$ là nguyên hàm của $f$ trên khoảng nếu $F'=f$ tại mọi điểm của khoảng. Các nguyên hàm sai khác một hằng số trên khoảng đó.`,
    'Không quên hằng số; không lấy đạo hàm của f để tìm nguyên hàm của f.', '2-15',s=>{
      const a = (s % 12) + 1, b = (Math.floor(s / 12) % 6);
      const coeff = [b, 0, a]; near(derivative(coeff, 2), 4 * a);
      return qChoice(T`Hàm nào là một nguyên hàm của $f(x)=${2*a}x$?`,T`$F(x)=${a}x^2+${b}$`,
        [T`$F(x)=${2*a}x^2+${b}$`,T`$F(x)=${2*a}$`],T`Đạo hàm của $${a}x^2+${b}$ bằng $${2*a}x$; đạo hàm của hằng số bằng $0$.`,s);
    }, ['Đạo hàm của đáp án phải khớp hàm đã cho.', 'Đạo hàm hằng số bằng không.', 'Kiểm tra hệ số sau khi đạo hàm lũy thừa.', T`Ví dụ khác: $F(x)=x^3+7$ có đạo hàm $3x^2$.`]),
  primitiveCondition: skill('Nguyên hàm với điều kiện', 'Xác định hằng số của nguyên hàm từ một giá trị ban đầu.',
    T`Tìm họ nguyên hàm trước, thay điều kiện $F(x_0)=y_0$ để xác định $C$, rồi mới tính giá trị được hỏi.`,
    'Không thay điều kiện vào hàm dưới dấu nguyên hàm.', '2-15',s=>{
      const a=s%4+1,b=s%5+1;const ans=a+b;
      return qNum(T`Biết $F'(x)=${2*a}x$ và $F(0)=${b}$. Tính $F(1)$.`,ans,
        T`$F(x)=${a}x^2+C$. Điều kiện cho $C=${b}$; $F(1)=${ans}$.`,integral([0,2*a],0,1)+b);
    }, ['Tìm họ nguyên hàm có hằng số C.', 'Thay điểm đã cho vào F.', 'Giải hằng số rồi tính giá trị mới.', T`Ví dụ khác: $G'=3x^2,G(0)=-2$ cho $G=x^3-2$.`]),
  primitiveLinear: skill('Tính tuyến tính của nguyên hàm', 'Vận dụng tính tuyến tính để tìm nguyên hàm của tổng và bội số hàm.',
    T`Nếu $F'=f,G'=g$ thì $(aF+bG)'=af+bg$. Chỉ có một hằng số tùy ý chung trong kết quả sau khi gộp.`,
    'Không dùng quy tắc nhân nguyên hàm cho tích hai hàm.', '2-15',s=>{
      const a=s%4+1,b=s%3+2;
      return qChoice(T`Cho $F'=f,G'=g$. Một họ nguyên hàm của $${a}f-${b}g$ là`,T`$${a}F-${b}G+C$`,
        [T`$FG+C$`,T`$${a}F+${b}G+C$`],T`Lấy đạo hàm theo tính tuyến tính được đúng $${a}f-${b}g$.`,s);
    }, ['Nhận dạng phép cộng và hệ số.', 'Nguyên hàm giữ các hệ số hằng.', 'Đạo hàm lại để kiểm tra dấu.', T`Ví dụ khác: nếu $U'=u$, thì $(5U)'=5u$.`]),
  primitivePower: skill('Nguyên hàm lũy thừa', 'Tính nguyên hàm lũy thừa và kiểm tra hệ số bằng đạo hàm.',
    T`Với $n\ne-1$, $\int x^n\,dx=\dfrac{x^{n+1}}{n+1}+C$ trên khoảng xác định phù hợp.`,
    'Phải tăng số mũ và chia cho số mũ mới.', '2-15',s=>{
      const n=(s%4)+2,a=(n+1)*((Math.floor(s/4)%5)+1),coef=a/(n+1);
      near(derivative(Array(n+2).fill(0).map((_,i)=>i===n+1?coef:0),2),a*2**n);
      return qChoice(T`Tìm $\int ${a}x^{${n}}\,dx$.`,T`$${coef}x^{${n+1}}+C$`,
        [T`$${a}x^{${n+1}}+C$`,T`$${a*n}x^{${n-1}}+C$`],T`Tăng số mũ lên $${n+1}$ rồi chia hệ số $${a}$ cho $${n+1}$ được $${coef}$.`,s);
    }, ['Đọc số mũ hiện tại.', 'Tăng số mũ thêm một.', 'Chia hệ số cho số mũ mới rồi thêm C.', T`Ví dụ khác: $\int x^4\,dx=x^5/5+C$.`]),
  primitiveReciprocal: skill('Nguyên hàm của nghịch đảo', 'Nhận biết trường hợp riêng lũy thừa mũ âm một và điều kiện miền.',
    T`$\int 1/x\,dx=\ln|x|+C$ trên khoảng không chứa $0$; không dùng công thức chia cho $n+1$ khi $n=-1$.`,
    'Không tạo phép chia cho không; giữ trị tuyệt đối nếu miền chưa giới hạn dương.', '2-15',s=>{
      const a=(s%15)+2;
      return qChoice(T`Trên một khoảng không chứa $0$, $\int\dfrac{${a}}x\,dx$ bằng`,T`$${a}\ln|x|+C$`,
        [T`$\dfrac{${a}}{x^2}+C$`,T`$${a}x+C$`],T`Đạo hàm của $\ln|x|$ bằng $1/x$ khi $x\ne0$; nhân hệ số $${a}$.`,s);
    }, ['Nhận ra số mũ âm một.', 'Không áp dụng công thức tạo mẫu bằng không.', 'Dùng đạo hàm của logarit để kiểm tra.', T`Ví dụ khác: trên $x>0$, đạo hàm của $\ln x$ là $1/x$.`]),
  primitiveExp: skill('Nguyên hàm hàm số mũ', 'Tính nguyên hàm hàm mũ với hệ số phù hợp; phân biệt e mũ và a mũ.',
    T`$\int a^x\,dx=a^x/\ln a+C$ với $a>0,a\ne1$; riêng $\int e^x\,dx=e^x+C$.`,
    'Không nhân thêm logarit; không áp dụng quy tắc lũy thừa x mũ n cho a mũ x.', '2-15',s=>{
      const bases = [2, 3, 5, 6, 7, 10];
      const base = bases[s % bases.length];
      const k = (Math.floor(s / bases.length) % 3) + 1;
      if (k === 1) {
        near((base**(1+1e-5)/Math.log(base)-base**(1-1e-5)/Math.log(base))/(2e-5),base);
        return qChoice(T`Tìm $\int ${base}^x\,dx$.`,T`$\dfrac{${base}^x}{\ln ${base}}+C$`,
          [T`$${base}^x\ln ${base}+C$`,T`$\dfrac{x^{${base+1}}}{${base+1}}+C$`],T`Đạo hàm của $${base}^x$ là $${base}^x\ln ${base}$; chia cho $\ln ${base}$ để triệt hệ số.`,s);
      } else {
        return qChoice(T`Tìm $\int ${k}\cdot ${base}^x\,dx$.`,T`$\dfrac{${k}\cdot ${base}^x}{\ln ${base}}+C$`,
          [T`$${k}\cdot ${base}^x\ln ${base}+C$`,T`$\dfrac{${base}^x}{\ln ${base}}+C$`],T`Đạo hàm của $${k}\cdot ${base}^x$ là $${k}\cdot ${base}^x\ln ${base}$; chia cho $\ln ${base}$ để triệt hệ số.`,s);
      }
    }, ['Biến nằm ở số mũ, không nằm ở cơ số.', 'Nhớ đạo hàm của hàm mũ cơ số a.', 'Hệ số cần bù là nghịch đảo của logarit cơ số.', T`Ví dụ khác: $\int e^x\,dx=e^x+C$.`]),
  primitiveTrig: skill('Nguyên hàm lượng giác', 'Tính nguyên hàm tổ hợp sin/cos, kiểm tra dấu bằng đạo hàm.',
    T`$\int\cos x\,dx=\sin x+C$, $\int\sin x\,dx=-\cos x+C$. Giữ dấu trừ ở nguyên hàm của sin.`,
    'Không lấy nguyên hàm sin thành cos dương.', '2-15',s=>{
      const a=s%4+1,b=s%3+2;
      near(((a*Math.sin(.7+1e-5)-b*Math.cos(.7+1e-5))-(a*Math.sin(.7-1e-5)-b*Math.cos(.7-1e-5)))/(2e-5),a*Math.cos(.7)+b*Math.sin(.7));
      return qChoice(T`Tìm $\int(${a}\cos x+${b}\sin x)\,dx$.`,T`$${a}\sin x-${b}\cos x+C$`,
        [T`$${a}\sin x+${b}\cos x+C$`,T`$-${a}\sin x-${b}\cos x+C$`],T`Đạo hàm của $${a}\sin x$ là $${a}\cos x$; đạo hàm của $-${b}\cos x$ là $${b}\sin x$.`,s);
    }, ['Tách thành hai nguyên hàm.', 'Đạo hàm của cos có dấu âm.', 'Kiểm tra lại từng số hạng.', T`Ví dụ khác: đạo hàm của $-\cos x$ bằng $\sin x$.`]),
  curvedArea: skill('Tổng hình chữ nhật và diện tích', 'Giải thích diện tích hình thang cong như giới hạn tổng diện tích hình chữ nhật.',
    T`Chia đoạn thành các khoảng nhỏ; tổng chiều cao nhân bề rộng xấp xỉ diện tích dưới đồ thị không âm. Khi độ rộng tiến về không, tổng tiến tới diện tích.`,
    'Không cộng chiều cao mà bỏ bề rộng.', '2-15',s=>{
      const a=s%4+1,L=s%3+1,ans=a*L*L/2;
      return qNum(T`Dưới đồ thị $y=${a}x$ trên $[0;${L}]$, tổng hình chữ nhật lấy đầu phải là $S_n=\dfrac{${a*L*L}}{n^2}\sum_{k=1}^n k$. Dùng $\sum k=n(n+1)/2$, tính $\lim S_n$.`,ans,
        T`$S_n=${a*L*L}\,\dfrac{n+1}{2n}$ nên giới hạn là $${fmt(ans)}$. Cũng bằng diện tích tam giác đáy $${L}$, cao $${a*L}$.`,integral([0,a],0,L));
    }, ['Thay công thức tổng đã cho.', 'Rút gọn các lũy thừa của n.', 'Tách phần hằng và phần chia cho n.', T`Ví dụ khác: với hàm hằng $y=3$ trên đoạn dài $2$, mọi tổng hình chữ nhật đều bằng $6$.`]),
  definite: skill('Tích phân xác định', 'Tính tích phân cơ bản bằng nguyên hàm và thứ tự hai cận.',
    T`Nếu $F'=f$ trên đoạn thích hợp, $\int_a^b f(x)\,dx=F(b)-F(a)$. Hằng số nguyên hàm triệt tiêu.`,
    'Không lấy giá trị hàm f ở hai cận; không đảo thứ tự hiệu.', '2-15',s=>{
      const a=s%4+1,b=s%3+1,c=s%4,ans=a*b*b+c*b;
      return qNum(T`Tính $\int_0^{${b}}(${2*a}x+${c})\,dx$.`,ans,
        T`Nguyên hàm là $${a}x^2+${c}x$; thay cận được $${a}\cdot${b}^2+${c}\cdot${b}=${ans}$.`,simpson(x=>2*a*x+c,0,b));
    }, ['Tìm một nguyên hàm.', 'Tính riêng tại cận trên và cận dưới.', 'Lấy giá trị ở cận trên trừ cận dưới.', T`Ví dụ khác: $\int_1^2 1\,dx=2-1=1$.`]),
  integralLinearity: skill('Tính tuyến tính của tích phân', 'Kết hợp các tích phân cùng cận theo hệ số và dấu.',
    T`Với cùng hai cận, $\int(af+bg)=a\int f+b\int g$. Không có quy tắc nhân hai tích phân để tính tích phân của tích.`,
    'Giữ nguyên hệ số âm; chỉ gộp trực tiếp khi hai cận tương ứng giống nhau.', '2-15',s=>{
      const A=s%5+2,B=s%4+1,k=s%3+2,ans=k*A-2*B;
      return qNum(T`Biết $\int_0^2 f(x)\,dx=${A}$, $\int_0^2g(x)\,dx=${B}$. Tính $\int_0^2[${k}f(x)-2g(x)]\,dx$.`,ans,
        T`Theo tính tuyến tính, kết quả là $${k}\cdot${A}-2\cdot${B}=${ans}$.`,simpson(()=>k*A/2-B,0,2));
    }, ['Các tích phân có cùng cận.', 'Tách hệ số ra ngoài dấu tích phân.', 'Thực hiện phép trừ sau khi nhân hệ số.', T`Ví dụ khác: nếu $\int_0^1h=3$ thì $\int_0^1 4h=12$.`]),
  integralIntervals: skill('Cộng đoạn và đổi cận', 'Vận dụng cộng đoạn và đổi dấu khi đảo cận tích phân.',
    T`$\int_a^c f=\int_a^b f+\int_b^c f$; $\int_b^a f=-\int_a^b f$. Vẽ trục số giúp giữ đúng chiều.`,
    'Không bỏ dấu âm khi đổi cận.', '2-15',s=>{
      const A=s%5+2,B=s%4+1,ans=-(A+B);
      return qNum(T`Biết $\int_0^1 f(x)\,dx=${A}$, $\int_1^3f(x)\,dx=${B}$. Tính $\int_3^0f(x)\,dx$.`,ans,
        T`Cộng đoạn cho $\int_0^3 f=${A+B}$; đảo cận đổi dấu, được $${ans}$.`,-(integral([A],0,1)+integral([B/2],1,3)));
    }, ['Đặt ba mốc trên trục số.', 'Tính tích phân theo chiều từ trái sang phải.', 'Đảo chiều cuối cùng mới đổi dấu.', T`Ví dụ khác: $\int_4^4f=0$ với mọi hàm tích phân được.`]),
  integralPoly: skill('Tích phân đa thức', 'Tính tích phân đa thức bằng nguyên hàm từng số hạng và kiểm tra kết quả.',
    T`Lấy nguyên hàm từng số hạng, giữ hệ số và dấu; thay cả hai cận. Có thể ước lượng dấu và độ lớn để tự kiểm.`,
    'Không giữ số mũ cũ trong nguyên hàm; không quên giá trị tại cận dưới.', '2-15',s=>{
      const a=(s%5)+1,b=(Math.floor(s/5)%4)+1,c=(s%3)*2,ans=a*b**3+c*b;
      return qNum(T`Tính $\int_0^{${b}}(${3*a}x^2+${c})\,dx$.`,ans,
        T`Nguyên hàm là $${a}x^3+${c}x$; hiệu hai cận là $${a}\cdot${b}^3+${c}\cdot${b}=${ans}$.`,simpson(x=>3*a*x*x+c,0,b));
    }, ['Tách hai số hạng.', 'Nguyên hàm của x bình phương có số mũ ba.', 'Thay cận cho toàn bộ biểu thức nguyên hàm.', T`Ví dụ khác: $\int_0^1x^2\,dx=1/3$.`]),
  areaPositive: skill('Diện tích dưới đồ thị không âm', 'Dùng tích phân tính diện tích khi đồ thị nằm trên trục hoành.',
    T`Nếu $f\ge0$ trên $[a;b]$ thì diện tích với trục hoành là $\int_a^bf$. Luôn kiểm tra dấu trước khi áp dụng.`,
    'Không dùng công thức bỏ trị tuyệt đối khi hàm đổi dấu.', '2-16',s=>{
      const a=(s%4)+1,L=(Math.floor(s/4)%4)+1,ans=a*L**3;
      return qNum(T`Tính diện tích giới hạn bởi $y=${3*a}x^2$, trục hoành, $x=0$, $x=${L}$.`,ans,
        T`Hàm không âm nên $S=\int_0^{${L}}${3*a}x^2\,dx=${a}\cdot${L}^3=${ans}$.`,simpson(x=>3*a*x*x,0,L));
    }, ['Xác định hai đường thẳng biên.', 'Kiểm tra đồ thị trên hay dưới trục hoành.', 'Lập tích phân diện tích rồi tính nguyên hàm.', T`Ví dụ khác: diện tích dưới $y=2$ trên $[0;3]$ bằng $6$.`]),
  areaSign: skill('Diện tích khi đồ thị đổi dấu', 'Chia khoảng tại giao điểm với trục hoành và tính diện tích bằng trị tuyệt đối.',
    T`Diện tích là $\int_a^b|f(x)|\,dx$. Tách tại các nghiệm làm đổi dấu rồi cộng các phần diện tích dương.`,
    'Tích phân có dấu có thể triệt tiêu; diện tích thì không.', '2-16',s=>{
      const c=(s%5)+1,d=(Math.floor(s/5)%4)+1,L=c+d,ans=(c*c+d*d)/2;
      return qNum(T`Tính diện tích giữa đồ thị $y=x-${c}$ và trục hoành trên $[0;${L}]$.`,ans,
        T`Đổi dấu tại $x=${c}$. $S=\int_0^{${c}}(${c}-x)\,dx+\int_{${c}}^{${L}}(x-${c})\,dx=\frac{${c*c}+${d*d}}2=${fmt(ans)}$.`,c*c/2+d*d/2);
    }, ['Tìm giao điểm với trục hoành.', 'Xét dấu ở mỗi phía của giao điểm.', 'Lấy đối phần hàm âm trước khi tích phân.', T`Ví dụ khác: diện tích giữa $y=x$ và trục hoành trên $[-1;1]$ bằng $1$, dù tích phân có dấu bằng $0$.`]),
  areaTwo: skill('Diện tích giữa hai đồ thị', 'Tìm giao điểm và tích phân hiệu đồ thị trên trừ đồ thị dưới.',
    T`Giải phương trình giao điểm để lấy cận; xác định đường trên/dưới trong từng khoảng. Diện tích bằng tích phân trị tuyệt đối hiệu hai hàm.`,
    'Không chọn cận tùy ý hoặc lấy hiệu ngược cho diện tích âm.', '2-16',s=>{
      const k = (Math.floor(s / 7) % 3) + 1;
      const a = (s % 7) + 1;
      if (k === 1) {
        const ans = a**3 / 6;
        return qNum(T`Tính diện tích hình phẳng giới hạn bởi parabol $y=x^2$ và đường thẳng $y=${a}x$. Nhập phân số nếu cần.`,ans,
          T`Giao điểm có hoành độ $0,${a}$. Trên đoạn đó, $${a}x\ge x^2$. $S=\int_0^{${a}}(${a}x-x^2)\,dx=\frac{${a**3}}6$.`,simpson(x=>a*x-x*x,0,a));
      } else if (k === 2) {
        const ans = 4 * (a**3) / 3;
        return qNum(T`Tính diện tích hình phẳng giới hạn bởi parabol $y=${a*a}-x^2$ và trục hoành $Ox$.`,ans,
          T`Giao điểm có hoành độ $-${a},${a}$. $S=\int_{-${a}}^{${a}}(${a*a}-x^2)\,dx=\frac{4\cdot ${a**3}}3=${fmt(ans)}$.`,simpson(x=>a*a-x*x,-a,a));
      } else {
        const ans = a**3 / 6;
        return qNum(T`Tính diện tích hình phẳng giới hạn bởi hai parabol $y=x^2$ và $y=${a}x-x^2$. Nhập phân số nếu cần.`,ans,
          T`Giao điểm có hoành độ $0$ và $${a}/2$. Hoặc $2x^2=${a}x\Rightarrow x=0,x=${a}/2$. Tích phân cho $S=\frac{${a**3}}{24}$.`,ans);
      }
    }, ['Giải phương trình hai hàm bằng nhau.', 'Thử một điểm giữa hai giao điểm.', 'Lấy hàm phía trên trừ hàm phía dưới.', T`Ví dụ khác: giữa $y=3$ và $y=1$ trên đoạn dài $2$, diện tích bằng $(3-1)\cdot2=4$.`]),
  volumeSlice: skill('Thể tích từ thiết diện', 'Lập và tính tích phân diện tích thiết diện để tìm thể tích.',
    T`Nếu thiết diện vuông góc trục $Ox$ có diện tích $A(x)$, thể tích từ $a$ đến $b$ là $\int_a^b A(x)\,dx$. Không nhân thêm pi nếu A đã là diện tích.`,
    'Phân biệt diện tích thiết diện với độ dài cạnh của thiết diện.', null,s=>{
      const a = (s % 5) + 1, L = (Math.floor(s / 5) % 4) + 1, c = (s % 3) * 2;
      const ans = a * L**3 + c * L;
      return qNum(T`Vật thể nằm giữa $x=0$ và $x=${L}$ có diện tích thiết diện vuông góc trục $Ox$ là $A(x)=${3*a}x^2${c ? `+${c}` : ''}$ (đơn vị diện tích). Tính thể tích.`,ans,
        T`$V=\int_0^{${L}}(${3*a}x^2${c ? `+${c}` : ''})\,dx=${a}\cdot${L}^3${c ? `+${c}\cdot${L}` : ''}=${ans}$ (đơn vị thể tích).`,simpson(x=>3*a*x*x+c,0,L));
    }, ['Đề đã cho diện tích hay độ dài?', 'Cộng các lớp mỏng bằng tích phân diện tích thiết diện.', 'Giữ đúng hai cận của vật thể.', T`Ví dụ khác: vật thể có diện tích thiết diện không đổi $5$ trên đoạn dài $2$ có thể tích $10$.`]),
  volumeRotate: skill('Thể tích khối tròn xoay', 'Lập thể tích khối quay quanh trục hoành bằng bình phương bán kính.',
    T`Quay miền dưới $y=f(x)\ge0$ quanh $Ox$ cho thiết diện tròn diện tích $\pi f(x)^2$; do đó $V=\pi\int_a^bf(x)^2\,dx$.`,
    'Không quên bình phương bán kính hoặc tự bình phương cả tích phân.', null,s=>{
      const a = (s % 5) + 1, L = (Math.floor(s / 5) % 4) + 1;
      const ans = a * a * (L**3) / 3;
      return qNum(T`Quay miền phẳng giới hạn bởi đường thẳng $y=${a}x$, trục hoành $Ox$, $x=0$ và $x=${L}$ quanh trục $Ox$. Tính $V/\pi$; nhập phân số nếu cần.`,ans,
        T`$V=\pi\int_0^{${L}}(${a}x)^2\,dx=\pi\,\frac{${a*a*L**3}}3$. Vì vậy $V/\pi=\frac{${a*a*L**3}}3$.`,(a*L)**2*L/3);
    }, ['Bán kính mỗi thiết diện là giá trị y.', 'Diện tích hình tròn dùng bình phương bán kính.', 'Câu hỏi yêu cầu V chia pi.', T`Ví dụ khác: quay hình chữ nhật cao $2$, rộng $3$ quanh cạnh đáy cho hình trụ có thể tích $12\pi$.`]),
});

// Explicit PPCT mapping: review periods get a stated focus; numbered core periods keep their actual detail.
const coreFocus = {
  1:['monoDef'],2:['monoRule'],3:['monoRule','monoCritical'],4:['extremaSign'],5:['extremaCalc'],6:['extremaCalc','monoCritical'],
  7:['vectorIdentify'],8:['vectorSum'],9:['vectorDiff'],12:['maxTable'],13:['maxClosed'],14:['maxClosed','extremaCalc'],
  15:['vectorScale'],16:['dotGeo'],17:['vectorSum','dotGeo'],20:['maxOpen'],21:['maxOpen','maxClosed'],22:['asymVH'],23:['asymVH'],
  24:['coordPoint'],25:['coordBasis','coordVector'],26:['asymOblique'],27:['asymVH','asymOblique'],28:['cubic'],29:['cubic'],
  30:['coordPoint','coordVector'],31:['coordOps'],32:['coordOps','coordVector'],34:['rational11'],35:['rational11'],36:['rational21'],37:['rational21'],38:['rational21'],39:['dotCoord'],40:['dotCoord','angleCoord'],
  76:['primitiveDef'],77:['primitiveCondition'],78:['groupRange','quartile'],79:['quartile'],80:['variance'],
  82:['primitiveLinear'],83:['primitivePower','primitiveReciprocal'],84:['primitiveExp'],85:['primitiveTrig'],86:['risk'],87:['variance','risk'],
  90:['primitivePower','primitiveExp'],91:['primitiveReciprocal','primitiveTrig'],92:['curvedArea'],93:['definite'],94:['integralLinearity'],95:['integralIntervals'],96:['integralPoly'],98:['integralPoly','integralIntervals'],
  99:['areaPositive'],100:['areaSign'],101:['areaPositive'],102:['areaSign'],103:['areaTwo'],104:['areaTwo'],106:['areaTwo'],107:['areaSign','areaTwo'],108:['volumeSlice'],109:['volumeRotate'],110:['volumeRotate'],111:['volumeSlice','volumeRotate'],
};
const reviewFocus = {
  42:['monoRule','monoCritical'],43:['extremaSign','extremaCalc'],44:['maxClosed','maxOpen'],45:['asymVH','asymOblique'],46:['vectorIdentify','vectorSum'],47:['vectorDiff','vectorScale'],48:['dotGeo','coordVector'],
  50:['monoRule'],51:['extremaCalc','maxClosed'],52:['asymVH','asymOblique'],53:['cubic'],54:['rational11'],55:['coordOps','dotCoord'],56:['angleCoord'],
  58:['monoCritical','extremaSign'],59:['maxOpen','maxTable'],60:['rational21'],61:['asymVH','asymOblique'],62:['vectorSum','vectorDiff'],63:['coordPoint','coordBasis'],64:['dotCoord','angleCoord'],
  66:['monoRule','extremaCalc'],67:['maxClosed','maxOpen'],68:['cubic'],69:['rational11'],70:['coordOps','angleCoord'],74:['monoRule','extremaCalc'],75:['coordVector','dotCoord'],
  88:['quartile','variance'],112:['primitiveTrig','integralPoly'],113:['areaSign','volumeRotate'],
  114:['monoRule','extremaCalc'],115:['maxClosed','maxOpen'],116:['asymVH','asymOblique'],117:['cubic'],118:['rational21'],119:['coordOps','dotCoord'],120:['quartile','variance'],
  122:['primitiveDef','primitiveCondition'],123:['primitivePower','primitiveReciprocal'],124:['primitiveExp','primitiveTrig'],125:['integralLinearity','integralIntervals'],126:['areaPositive','areaSign'],127:['areaTwo'],128:['volumeSlice','volumeRotate'],
  130:['extremaCalc','maxClosed'],131:['dotCoord','angleCoord'],132:['quartile','risk'],133:['integralPoly','areaTwo'],134:['volumeRotate','primitiveTrig'],
};
const firstPeriod = Object.fromEntries(Object.keys(skills).map(key => {
  const p = grade.lessons.find(row => coreFocus[row.period]?.includes(key));
  assert.ok(p, `No source period for ${key}`);
  return [key,p];
}));
const references = new Map();
for (const unit of units) for (const lo of unit.sourceLOexact) references.set(`${unit.unit}-${lo.id.slice(-2)}`, { id: lo.id, ...lo.reference, hash: unit.sourceSha256 });

function draw(key, seed, stage, banned = new Set()) {
  for (let offset=0; offset<180; offset++) {
    const q=skills[key].make(seed+offset,stage);
    if (!banned.has(q.prompt)) return q;
  }
  throw new Error(`No distinct ${stage} question for ${key}`);
}
function asReasoning(q) {
  const choices=q.inputSchema?.options?.map(o=>`${o.id}. ${o.label}`).join('\n');
  return qOpen(`${q.prompt}${choices?'\n'+choices:''}\nGiải thích bằng định nghĩa hoặc công thức; nêu một bước kiểm tra để tránh lỗi thường gặp.`,
    q.solution, ['Kết quả hoặc lựa chọn đúng.', 'Giải thích được công thức/điều kiện áp dụng.', 'Có bước kiểm tra dấu, miền, đơn vị hoặc biểu diễn phù hợp.']);
}
function makeEntry(period, focus, eligible) {
  const game=period.effective_kind==='elective', feedback=period.kind==='assessment_feedback';
  const formation=period.kind==='core'&&!/luyện tập/i.test(period.detail);
  const seed=period.period*113;
  const useRefs=new Map();
  function sourceFor(key) {
    const spec=skills[key], code=spec.lo || (!period.source.content.cached ? '2-15' : null);
    if(code){const ref=references.get(code);assert.ok(ref,code);useRefs.set(ref.id,ref);return {segmentId:ref.id,quote:ref.excerpt,origin:'adapted'};}
    return {segmentId:period.id,quote:period.source.content.cached,origin:'generated'};
  }
  const sources=focus.map(sourceFor);
  const protectedQuestions=focus.map((key,i)=>{
    const recheck=draw(key,seed+31+i*17,'recheck');
    const exit=draw(key,seed+49+i*17,'exit',new Set([recheck.prompt]));
    return {recheck,exit,banned:new Set([recheck.prompt,exit.prompt]),used:new Set()};
  });
  const solutions=[];
  const question=(i,stage,offset)=>{
    if(stage==='recheck'||stage==='exit')return protectedQuestions[i][stage];
    const record=protectedQuestions[i];
    let q;
    try{q=draw(focus[i],seed+offset+i*17,stage,new Set([...record.banned,...record.used]));}
    catch{q=draw(focus[i],seed+offset+i*17,stage,record.banned);}
    record.used.add(q.prompt);return q;
  };
  const task=(i,stage,offset,minutes,participation='individual',branch='shared')=>{
    let q=question(i,stage,offset);
    const spec=skills[focus[i]];
    if(branch==='support' && typeof q.evaluation.answerKey==='number'){
      const exampleResults=spec.hints.flatMap(text=>[...text.matchAll(/=\s*([+-]?\d+(?:[.,]\d+)?)(?=\s*(?:[.,;!?$]|$))/g)].map(m=>Number(m[1].replace(',','.'))));
      const banned=new Set(protectedQuestions[i].banned);
      for(let attempt=0;exampleResults.includes(q.evaluation.answerKey)&&attempt<60;attempt++){
        banned.add(q.prompt);q=draw(focus[i],seed+offset+attempt+1,stage,banned);
      }
      assert.ok(!exampleResults.includes(q.evaluation.answerKey),'Worked example must have a different result from the target');
    }
    if(branch==='extension')q=asReasoning(q);
    solutions.push({stage,skill:focus[i],branch,prompt:q.prompt,solution:q.solution,evaluation:q.evaluation});
    return {type:q.type,prompt:q.prompt,minutes,participation,branch,objectiveIndexes:[i],source:sources[i],
      ...(q.inputSchema?{inputSchema:q.inputSchema}:{}),evaluation:q.evaluation,
      hints:branch==='support'?spec.hints:[spec.hints[0]],requiresFullScaffold:false,isCore:branch==='core'||branch==='shared',
      supportRationale:`Lời giải dành cho GV: ${q.solution} Lỗi cần quan sát: ${spec.error}`};
  };
  const ix=focus.map((_,i)=>i), n=focus.length;
  const acts=[];
  const add=(phase,minutes,participation,studentAction,expectedProduct,teacherLookFor,tasks,role='core')=>acts.push({phase,minutes,participation,objectiveIndexes:[...new Set(tasks.flatMap(t=>t.objectiveIndexes))],source:sources[0],studentAction,expectedProduct,teacherLookFor,tasks,budgetRole:role,
    transition:phase==='exit'?'GV thu câu trả lời cá nhân trước khi chữa; HS ghi một điều cần nhớ vào vở.':'GV dừng thiết bị, mời một lời giải hoặc câu hỏi rồi mới chuyển hoạt động.'});
  add('experience',3,'individual','Bảng trắng, TV và thiết bị đang chờ. Em đọc câu mở đầu, tự ghi một dự đoán vào vở rồi trả lời; chưa trao đổi.',
    'Mỗi em có một dự đoán và một lý do ban đầu.',
    'GV mở đúng câu, cho thời gian nghĩ độc lập; ghi hai hướng nghĩ khác nhau lên bảng. Dữ liệu mở đầu chỉ dùng chẩn đoán.',
    ix.map(i=>task(i,'precheck',1,n===1?2:1)));
  const formed=ix.map(i=>task(i,'formation',7,n===1?5:3,'whole_class'));
  const rules=focus.map((key,i)=>`${skills[key].title}: ${skills[key].rule} Ví dụ trên bảng: ${formed[i].prompt} ${solutions.findLast(row=>row.stage==='formation'&&row.skill===key).solution}`).join('\n');
  add('formation',10,'whole_class',formation?'Quan sát ví dụ GV dựng trên bảng. Em dự đoán bước tiếp theo, đối chiếu lý do rồi ghi quy tắc và điều kiện vào vở.':
    feedback?'Xem lời giải minh họa tự soạn, chỉ ra bước cần kiểm tra; không coi đây là lỗi của lớp. Đối chiếu cách sửa và ghi vào vở.':
    game?'Cùng lớp nhắc lại hai công cụ dùng trong lượt chơi. Em giải thích vì sao công cụ phù hợp trước khi bắt đầu tính.':'So sánh hai cách làm trên bảng, nêu điều kiện dùng từng cách rồi ghi sơ đồ lựa chọn phương pháp.',
    'Vở có quy tắc, điều kiện và ví dụ được chữa; một em giải thích được bước quyết định.',
    `GV dành khoảng 4 phút dẫn dắt/chốt, phần còn lại cho HS thử và thảo luận. ${rules}`,formed);
  add('guided',5,'pair','Hai em giải lần lượt: một em trình bày, em còn lại kiểm tra dấu, miền hoặc đơn vị; đổi vai ở câu tiếp theo.',
    'Một lời giải có bước kiểm tra của người cùng cặp.',
    focus.map(key=>`GV hỏi: “Em dựa vào điều kiện nào ở bước này?” Quan sát: ${skills[key].error}`).join(' '),
    ix.map(i=>task(i,'guided',13,n===1?4:2,'pair')));
  add('recheck',4,'individual','Em làm đề mới độc lập, ghi bước chính vào vở rồi nộp. Chưa xem lời giải và chưa dùng trợ giúp.',
    'Minh chứng cá nhân thứ nhất cho từng mục tiêu.',
    'GV xem kết quả và cách làm trước khi phân hóa. Nếu dùng gợi ý hoặc được bạn trợ giúp, giữ minh chứng hỗ trợ, chưa tính độc lập.',
    ix.map(i=>task(i,'recheck',31,n===1?4:2)));
  const branched=['support','core','extension'].flatMap(branch=>ix.map(i=>task(i,'practice',branch==='support'?19:branch==='core'?23:29,n===1?5:3,'individual',branch)));
  add('practice',7,'individual',game?'Em chơi lượt luyện tập gồm hai nội dung đã học. Chọn một tuyến theo hướng dẫn GV; điểm trò chơi không thay kết quả hiểu bài.':
    'Em làm một tuyến phù hợp: có dẫn dắt, tự giải, hoặc giải thích mở rộng. Không phải làm cả ba tuyến.',
    'Một bài luyện đúng phạm vi, có bước sửa lỗi hoặc kiểm chứng.',
    'Sau recheck, GV giao hỗ trợ cho em còn vướng; giao core cho em cần ổn định; chỉ mở extension khi minh chứng recheck cá nhân đạt. Các tuyến dùng cùng quỹ 7 phút. H1–H4 không trừ điểm hoặc thời gian.',branched);
  const optional=task(0,'extension',37,3,'pair','extension');
  add('guided',3,'pair','Nếu còn thời gian và đã đạt recheck, em giải thích cách kiểm tra bài mở rộng; có thể trao đổi với một bạn.',
    'Một lý giải hoặc cách kiểm tra bổ sung, không bắt buộc cho cả lớp.',
    'GV chỉ mở sau recheck; bỏ hoạt động này nếu cần giữ giờ cho exit. Không dùng điểm nhóm làm bằng chứng cá nhân.',[optional],'optional');
  add('exit',4,'individual','Em làm câu chốt mới, độc lập. Nộp trước khi GV công bố lời giải.',
    'Minh chứng cá nhân thứ hai, khác nội dung số liệu với recheck.',
    'GV đối chiếu recheck và exit theo từng mục tiêu. Bài tự luận chờ GV đánh giá; chưa tự ghi đạt chỉ vì đã nộp.',ix.map(i=>task(i,'exit',49,n===1?4:2)));
  add('guided',4,'whole_class','Khi cần, em cùng lớp kiểm tra lại một bước đang vướng hoặc làm trên giấy nếu thiết bị trục trặc.',
    'Bảng lưu bước chữa cụ thể; bản giấy thay thế câu trả lời thiết bị khi cần.',
    'Đây là 4 phút dự phòng. GV dùng bài dưới đây nếu cần chữa; nếu không dùng hết, dành thời gian ghi vở và chuyển hoạt động. Không tăng thêm yêu cầu bắt buộc.',
    [task(0,'reserve',53,3,'whole_class')],'reserve');
  const title=`${game?'Tự chọn tích lũy':feedback?'Chữa bài minh họa':period.kind==='review'?'Ôn tập':formation?'Hình thành kiến thức':'Luyện tập'}: ${focus.map(key=>skills[key].title).join(' · ')}`;
  const uncertainties=[
    'Mục tiêu tiết và mức bắt buộc do tác giả cụ thể hóa theo PPCT; Unit Plan không cung cấp mã LO hoặc phân tầng chính thức.',
    ...(game?['Ngân hàng có nội dung các tuần trước; lượt chơi này chỉ chọn trọng tâm vừa 40 phút, không đánh giá toàn bộ ngân hàng. Bài cùng tuần chưa được tự đưa vào.']:[]),
    ...(feedback?['Các lỗi cần kiểm tra là tình huống minh họa, không phải dữ liệu bài làm của lớp. GV có thể thay bằng lỗi đã ẩn danh sau khi đối soát.']:[]),
    ...(focus.some(key=>skills[key].lo===null)?['Mục tiêu overview không nêu riêng thể tích; phạm vi do chi tiết PPCT và nội dung tác giả cụ thể hóa.']:[]),
    ...([26,27].includes(period.period)?['Tiêu đề ô nguồn ghi tọa độ nhưng chi tiết ghi tiệm cận; gói dùng đúng chi tiết tiết học, giữ nguồn nguyên văn.']:[]),
  ];
  const entry=assembleHkiPackage({period,title,slotMinutes:40,prerequisites:[
    'Đọc ký hiệu, thực hiện phép tính đại số và giải phương trình cơ bản đã học.',
  ],unitReferences:[...useRefs.values()],outline:{format:'lesson-outline-v1',essentialQuestion:`Làm thế nào kiểm tra lời giải về ${focus.map(key=>skills[key].title.toLowerCase()).join(' và ')} để tránh nhầm dấu, điều kiện hoặc biểu diễn?`,
    objectives:focus.map((key,i)=>({statement:skills[key].goal,level:'must',source:sources[i]})),activities:acts,uncertainties},
    rubric:{criteria:focus.map(key=>skills[key].goal),lookFor:focus.map(key=>`Kiểm tra lỗi: ${skills[key].error}`)}});
  entry.focusSkills=focus;
  entry.coverage={sourcePeriodId:period.id,sourceKind:period.kind,effectiveKind:period.effective_kind,sourceDetail:period.source.content.raw,
    lessonScope:focus.map(key=>({id:key,title:skills[key].title,introducedByPeriodId:firstPeriod[key].id})),
    ...(game?{bankScope:eligible,bankPath:'tasks/r22/g12-practice-bank.json',roundScope:focus,sameWeekIncluded:false}:{}),
    ...(period.ownerOverride?{ownerOverride:period.ownerOverride}:{}),
  };
  return {entry,solutions};
}

const byPeriod=new Map(grade.lessons.map(p=>[p.period,p]));
const lessonEntries=[],teacherSolutions=[];
for(const period of grade.lessons){
  if(period.kind==='assessment')continue;
  let focus=coreFocus[period.period]||reviewFocus[period.period];
  const eligible=Object.keys(skills).filter(key=>firstPeriod[key].week<period.week);
  if(period.effective_kind==='elective'){
    assert.ok(eligible.length>=2);
    const start=(period.period+period.week*3)%eligible.length;
    // Avoid two full-graph tasks in a short game round; these remain available in the cumulative bank.
    const quick=eligible.filter(key=>!['cubic','rational11','rational21'].includes(key));
    focus=[quick[start%quick.length],quick[(start+Math.ceil(quick.length/2))%quick.length]];
    if(focus[0]===focus[1])focus[1]=quick[(start+1)%quick.length];
    assert.ok(focus.every(key=>firstPeriod[key].week<period.week));
  }
  assert.ok(focus?.length&&focus.length<=2,`Missing explicit focus for ${period.id}`);
  let result;
  try{result=makeEntry(period,focus,eligible);}catch(error){throw new Error(`${period.id} (period ${period.period}): ${error.message}`,{cause:error});}
  for(const task of result.entry.pkg.tasks){
    if(!task.solidKey){
      const p=task.prompt;
      if(p.includes('tứ diện')){
        task.solidKey='tu-dien-sabc';
      }else if(p.includes('hình chóp')){
        task.solidKey='chop-sabcd';
      }else if(p.includes('hình hộp')||p.includes('lăng trụ')){
        task.solidKey='hop-chu-nhat';
      }
    }
  }
  result.entry.pkg.contentHash = hashPackage(result.entry.pkg);
  lessonEntries.push(result.entry);teacherSolutions.push({sourcePeriodId:period.id,period:period.period,title:result.entry.title,solutions:result.solutions});
}

function buildExam(final) {
  const periodNumbers = final ? [135,136] : [71,72];
  const periods = periodNumbers.map(number => byPeriod.get(number));
  assert.ok(periods.every(period => period.kind === 'assessment'));
  const id = `g12-${final ? 'final' : 'midterm'}`;
  const title = `Toán 12 Discover - Kiểm tra ${final ? 'cuối' : 'giữa'} học kỳ I`;
  const concepts = final
    ? ['monoRule','asymOblique','coordOps','variance','primitivePower','primitiveTrig','quartile','definite','areaSign','volumeRotate','rational21','areaTwo']
    : ['monoDef','monoRule','extremaSign','vectorIdentify','vectorSum','asymVH','maxClosed','dotCoord','vectorScale','extremaCalc','cubic','rational21'];
  assert.ok(concepts.every(key => firstPeriod[key].week < periods[0].week));
  const questions = concepts.map((key,index) => {
    let item = skills[key].make(1000 + index * 31, 'exam');
    if(index<6 && item.evaluation.checkerId==='numeric_exact'){
      const value=item.evaluation.answerKey;
      item=qChoice(item.prompt,`$${fmt(value)}$`,[`$${fmt(value+1)}$`,`$${fmt(value-1)}$`],item.solution,index);
    }
    if(index>=10)item=asReasoning(item);
    const common = {text:item.prompt,solution:item.solution,label:`Câu ${index+1}`,section:index<6?'I':index<10?'II':'III',points:index<6?0.5:index<10?0.75:2};
    if(index<6){
      assert.equal(item.evaluation.checkerId,'choice_exact');
      return {...common,type:'mc',options:item.inputSchema.options.map(option=>option.id),choiceText:Object.fromEntries(item.inputSchema.options.map(option=>[option.id,option.label])),key:item.evaluation.answerKey};
    }
    if(index<10){
      assert.equal(item.evaluation.checkerId,'numeric_exact');
      return {...common,type:'short',key:{accept:[String(item.evaluation.answerKey),String(item.evaluation.answerKey).replace('.',',')]}};
    }
    assert.equal(item.type,'open');
    return {...common,type:'essay',rubric:`${item.evaluation.rubric.criteria.join(' ')} Chia đều 2 điểm cho các tiêu chí; GV đánh giá lập luận và biểu diễn, không chỉ đáp số.`};
  });
  const exam=normalizeExamInput({title,durationMin:80,settings:{review:'after_close',showResult:'none',shuffleQuestions:false,shuffleOptions:false,allowLateJoin:false},questions});
  assert.equal(exam.questions.reduce((sum,item)=>sum+item.points,0),10);
  const headings={I:'PHẦN I. Trắc nghiệm (6 câu/3 điểm)',II:'PHẦN II. Trả lời ngắn (4 câu/3 điểm)',III:'PHẦN III. Tự luận (2 câu/4 điểm)'};
  let lastSection='';
  const lines=[title,'Bản nháp tự soạn, cần giáo viên duyệt.','Thời gian: 80 phút'];
  for(const question of exam.questions){
    if(question.section!==lastSection){lines.push(headings[question.section]);lastSection=question.section;}
    lines.push(`${question.label}. (${String(question.points).replace('.',',')} điểm) ${question.text}`);
    if(question.type==='mc')lines.push(...question.options.map(letter=>`${letter}. ${question.choiceText[letter]}`));
  }
  const text=lines.join('\n\n')+'\n';
  const parsed=parseExamLines(text.split(/\r?\n/).map(text=>({text})));
  assert.equal(parsed.questions.length,12);
  assert.deepEqual(parsed.questions.map(question=>question.type),exam.questions.map(question=>question.type));
  assert.equal(parsed.durationMin,80);
  const stem=`tasks/r22/g12-exams/${id}`;
  save(stem+'.txt',text);save(stem+'.json',exam);
  save(stem+'-solutions.txt',['CHỈ DÀNH CHO GIÁO VIÊN',title,...exam.questions.map(question=>`${question.label} (${question.points} điểm): ${question.solution}${question.rubric?'\n'+question.rubric:''}`)].join('\n\n')+'\n');
  return {id,title,grade:12,week:periods[0].week,sourcePeriodIds:periods.map(period=>period.id),periods:periodNumbers,minutes:80,mode:'exam',status:'draft',requiresTeacherReview:true,
    files:{questionText:stem+'.txt',teacherSolutions:stem+'-solutions.txt',normalizedExam:stem+'.json'},conceptIds:concepts,
    notes:['Đề và ma trận do tác giả đề xuất theo nội dung đã học; không phải đề chính thức trong nguồn.','GV duyệt lịch, thời lượng, đề, đáp án và hướng dẫn chấm trước khi mở phòng kiểm tra.']};
}
mkdirSync(new URL('tasks/r22/g12-exams/',root),{recursive:true});
const exams=[buildExam(false),buildExam(true)];
const coverage=grade.lessons.map(period=>{
  const entry=lessonEntries.find(item=>item.sourcePeriodId===period.id),exam=exams.find(item=>item.sourcePeriodIds.includes(period.id));
  assert.equal(Number(Boolean(entry))+Number(Boolean(exam)),1,period.id);
  return {sourcePeriodId:period.id,period:period.period,week:period.week,sourceKind:period.kind,effectiveKind:period.effective_kind,outputId:entry?.pkg.id||exam.id,mode:exam?'exam':entry.kind==='elective'?'game':'lesson'};
});
assert.equal(lessonEntries.length,133);assert.equal(coverage.length,137);
assert.equal(lessonEntries.filter(entry=>entry.kind==='elective').length,17);
for(const entry of lessonEntries){assert.equal(entry.pkg.contentHash,hashPackage(entry.pkg));assert.equal(validateLessonPackage(entry.pkg).ok,true);}
const practiceBank=Object.entries(skills).map(([id,spec],index)=>({id,title:spec.title,introducedByPeriodId:firstPeriod[id].id,introducedWeek:firstPeriod[id].week,sample:spec.make(3000+index,'practice')}));
const summary={periodRows:137,lessonPackages:133,electiveGames:17,examPeriods:4,examFiles:2,concepts:Object.keys(skills).length,tasks:lessonEntries.reduce((sum,entry)=>sum+entry.pkg.tasks.length,0)};
save('content/lessons/hki-2026-g12.json',{format:'r22-grade-content-v1',grade:12,programme:'Discover',schoolYear:'2026-2027',lastWeek:18,entries:lessonEntries,exams,summary,coverage});
save('tasks/r22/g12-coverage.json',{summary,coverage});save('tasks/r22/g12-solutions.json',teacherSolutions);save('tasks/r22/g12-practice-bank.json',practiceBank);
console.log(JSON.stringify(summary));
