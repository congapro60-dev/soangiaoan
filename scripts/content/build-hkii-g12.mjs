import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { assembleHkiiPackage } from './hkii-package.mjs';
import { normalizeExamInput } from '../../lib/exam/validate.js';
import { parseExamLines } from '../../lib/exam/parse.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';
import { hashPackage } from '../../lib/lesson/schema.js';

const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const save = (path, value) => writeFileSync(new URL(path, root), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const grade = read('tasks/r23-hkii/ppct-hkii.json').grades.find(g => g.grade === 12);
const units = read('tasks/r22/unit-objectives.json').units.filter(u => u.grade === 12);
const T = String.raw;
const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
const exactFraction = value => {
  for(let denominator=1;denominator<=100000;denominator++){
    const numerator=Math.round(value*denominator);
    if(Math.abs(value*denominator-numerator)<1e-10)return denominator===1?String(numerator):String.raw`\frac{${numerator}}{${denominator}}`;
  }
  throw new Error(`No exact small rational representation for ${value}`);
};
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

const hkiFocus = {
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

const cross = (u,v) => [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
const sub = (u,v) => u.map((x,i)=>x-v[i]);
const addVec = (u,v) => u.map((x,i)=>x+v[i]);
const det = (u,v,w) => dot(u,cross(v,w));
const population = (a,b,c,d) => [...Array.from({length:a},()=>[true,true]),...Array.from({length:b},()=>[true,false]),...Array.from({length:c},()=>[false,true]),...Array.from({length:d},()=>[false,false])];

const conditional = (rows,event,given) => rows.filter(x=>event(x)&&given(x)).length/rows.filter(given).length;
const h4 = (a,b,c,d) => [a,b,c,`Đối chiếu ví dụ khác: ${d} Sau đó quay lại dữ kiện của câu đang làm.`];

Object.assign(skills, {
  condSpace: skill('Không gian sau điều kiện', 'Xác định đúng tập kết quả được giữ lại khi đã biết một biến cố xảy ra.',
    T`$P(A\mid B)=P(A\cap B)/P(B)$ khi $P(B)>0$. Điều kiện $B$ thu hẹp không gian xét; tử số đếm cả $A$ và $B$.`,
    'Mẫu số là số phần tử của biến cố đã biết, không phải tổng ban đầu.',null,s=>{
      const a=3+s%7,b=4+s%9,c=2+s%5,d=5+s%6,rows=population(a,b,c,d);
      return qNum(T`Một nhóm có $${a}$ em vừa biết bơi vừa đeo kính, $${b}$ em biết bơi không đeo kính, $${c}$ em không biết bơi có đeo kính và $${d}$ em không biết bơi không đeo kính. Chọn ngẫu nhiên một em, biết em đó biết bơi. Xác suất em đó đeo kính bằng bao nhiêu?`,a/(a+b),T`Chỉ giữ nhóm biết bơi: $${a+b}$ em. Trong đó có $${a}$ em đeo kính, nên xác suất là $${a}/${a+b}$.`,conditional(rows,r=>r[1],r=>r[0]));
    },h4('Gạch dưới điều kiện đã biết.','Khoanh tập các trường hợp thỏa điều kiện.','Đếm số trường hợp vừa đạt yêu cầu vừa thuộc tập đã khoanh.','Trong bộ bài, biết lá rút được là cơ thì chỉ đếm các lá cơ làm mẫu số.')),
  condTable: skill('Xác suất có điều kiện từ bảng', 'Tính xác suất có điều kiện từ bảng tần số hai dấu hiệu.',
    T`Đọc rõ hàng/cột của điều kiện; tổng hàng hoặc cột ấy là mẫu số. Ô giao giữa hai biến cố là tử số.`,
    'Không nhầm xác suất đồng thời với xác suất có điều kiện.',null,s=>{
      const a=8+s%9,b=3+s%7,c=4+s%8,d=6+s%5,rows=population(a,b,c,d);
      return qNum(T`Bảng khảo sát: nhóm học ngoại ngữ có $${a}$ em thích sách và $${b}$ em không thích sách; nhóm không học ngoại ngữ có $${c}$ em thích sách và $${d}$ em không thích sách. Chọn ngẫu nhiên một em thích sách. Xác suất em đó học ngoại ngữ là bao nhiêu?`,a/(a+c),T`Trong $${a+c}$ em thích sách có $${a}$ em học ngoại ngữ; $P=${a}/${a+c}$.`,conditional(rows,r=>r[0],r=>r[1]));
    },h4('Xác định hàng/cột của biến cố đã được biết.','Cộng đúng hai ô thuộc điều kiện.','Chia ô giao cho tổng vừa tìm.','Biết một sản phẩm thuộc kho A thì mẫu số chỉ gồm sản phẩm kho A.')),
  condReverse: skill('Không đảo điều kiện', 'Phân biệt xác suất thuận và xác suất đảo bằng cùng một bảng dữ liệu.',
    T`$P(A\mid B)$ và $P(B\mid A)$ chung giao $A\cap B$ nhưng khác mẫu số; không bằng nhau nói chung.`,
    'Không đảo biến cố điều kiện vì giữ nguyên tử số.',null,s=>{
      const a=4+s%8,b=3+s%5,c=b+2+s%4,d=5,rows=population(a,b,c,d);
      near(a/(a+c),conditional(rows,r=>r[0],r=>r[1]));near(a/(a+b),conditional(rows,r=>r[1],r=>r[0]));
      return qOpen(T`Có $${a}$ người thuộc cả A và B, $${b}$ người chỉ thuộc A, $${c}$ người chỉ thuộc B, $${d}$ người không thuộc A cũng không thuộc B. Tính $P(A\mid B)$, $P(B\mid A)$; giải thích vì sao không được đổi chỗ điều kiện.`,
        T`$P(A\mid B)=${a}/${a+c}$, $P(B\mid A)=${a}/${a+b}$. Hai mẫu số khác nhau vì tập được giữ lại khác nhau: nhóm B có ${a+c} người, nhóm A có ${a+b} người.`,['Hai phân số có tử là số người thuộc cả A và B.','Mẫu số lần lượt là số người thuộc B và thuộc A.','Giải thích được điều kiện làm thay đổi không gian xét.']);
    },h4('Viết tên biến cố đứng sau dấu điều kiện ở từng câu.','Lập riêng tổng số phần tử cho A và B.','Giữ tử số chung, kiểm tra hai mẫu số.','Biết một em học lớp 12 khác với biết một em chơi bóng rổ.')),
  condComplement: skill('Biến cố đối trong điều kiện', 'Dùng biến cố đối trong cùng không gian điều kiện để tính xác suất.',
    T`$P(\overline A\mid B)=1-P(A\mid B)$ nếu $P(B)>0$. Chỉ thay biến cố cần tìm, giữ nguyên điều kiện.`,
    'Không lấy phần bù của cả biến cố điều kiện.',null,s=>{
      const a=3+s%6,b=7+s%9,c=4,d=3,rows=population(a,b,c,d);
      return qNum(T`Trong ${a+b} sản phẩm do máy M làm ra có ${a} sản phẩm lỗi. Biết sản phẩm được chọn ngẫu nhiên do M làm ra, xác suất sản phẩm không lỗi bằng bao nhiêu?`,b/(a+b),T`Trong cùng nhóm M, $P(\text{không lỗi}\mid M)=1-${a}/${a+b}=${b}/${a+b}$.`,conditional(rows,r=>!r[1],r=>r[0]));
    },h4('Giữ nguyên nhóm đã được biết.','Phân chia nhóm đó thành đạt yêu cầu và không đạt yêu cầu.','Tổng hai xác suất có cùng điều kiện bằng một.','Trong nhóm học sáng, đi học đúng giờ và không đúng giờ là hai biến cố đối.')),
  multiply: skill('Nhân xác suất qua hai lượt', 'Tính xác suất đồng thời bằng xác suất có điều kiện ở lượt tiếp theo.',
    T`$P(A\cap B)=P(A)P(B\mid A)$. Lấy không hoàn lại làm số vật và số vật cần chọn thay đổi sau lượt đầu.`,
    'Không dùng lại tỉ lệ ban đầu khi lấy không hoàn lại.',null,s=>{
      const r=3+s%7,b=4+s%6,n=r+b; let good=0,total=0;
      for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j){total++;if(i<r&&j<r)good++;}
      return qNum(T`Hộp có ${r} viên đỏ và ${b} viên xanh. Rút liên tiếp hai viên không hoàn lại. Xác suất cả hai viên đỏ là bao nhiêu?`,r*(r-1)/(n*(n-1)),T`$P=\frac{${r}}{${n}}\cdot\frac{${r-1}}{${n-1}}=\frac{${r*(r-1)}}{${n*(n-1)}}$.`,good/total);
    },h4('Gọi rõ biến cố của lượt thứ nhất và lượt thứ hai.','Sau một kết quả thuận lợi đầu tiên, cập nhật số vật trong hộp.','Nhân xác suất lượt đầu với xác suất lượt sau có điều kiện.','Rút một thẻ khỏi bộ rồi không trả lại làm cả tổng thẻ và một nhóm thẻ giảm.')),
  multiplyMixed: skill('Hai thứ tự cùng đạt yêu cầu', 'Cộng các nhánh rời nhau sau khi nhân xác suất theo từng nhánh.',
    T`Sự kiện một đỏ một xanh gồm hai thứ tự rời nhau: đỏ-xanh và xanh-đỏ. Tính từng nhánh bằng công thức nhân rồi cộng.`,
    'Không bỏ sót thứ tự thứ hai hoặc coi hai lượt độc lập.',null,s=>{
      const r=3+s%6,b=5+s%8,n=r+b;let good=0,total=0;
      for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j){total++;if((i<r)!==(j<r))good++;}
      return qNum(T`Hộp có ${r} thẻ đỏ và ${b} thẻ xanh. Rút hai thẻ không hoàn lại. Tính xác suất hai thẻ khác màu.`,2*r*b/(n*(n-1)),T`Hai nhánh rời nhau cho $P=\frac{${r}}{${n}}\frac{${b}}{${n-1}}+\frac{${b}}{${n}}\frac{${r}}{${n-1}}=\frac{${2*r*b}}{${n*(n-1)}}$.`,good/total);
    },h4('Liệt kê các thứ tự có thể tạo ra kết quả cần tìm.','Vẽ hai nhánh, cập nhật mẫu số sau lượt đầu.','Nhân trong mỗi nhánh, cộng giữa các nhánh rời nhau.','Hai lượt tung xu tạo ra “một sấp một ngửa” bằng hai thứ tự khác nhau.')),
  totalRule: skill('Xác suất toàn phần', 'Phân hoạch không gian thành các nhóm rồi cộng xác suất theo nhánh.',
    T`Nếu $B,\overline B$ tạo thành phân hoạch thì $P(A)=P(B)P(A\mid B)+P(\overline B)P(A\mid\overline B)$.`,
    'Không cộng trực tiếp các xác suất có điều kiện; cần trọng số của từng nhóm.',null,s=>{
      const a=3+s%6,b=4+s%7,c=2+s%5,d=6+s%8,n=a+b+c+d,rows=population(a,b,c,d);
      return qNum(T`Chọn ngẫu nhiên một trong ${n} sản phẩm. Kho A có ${a} sản phẩm lỗi và ${b} sản phẩm tốt; kho B có ${c} sản phẩm lỗi và ${d} sản phẩm tốt. Dùng công thức toàn phần tính xác suất chọn trúng sản phẩm lỗi.`,(a+c)/n,T`$P(\text{lỗi})=\frac{${a+b}}{${n}}\frac{${a}}{${a+b}}+\frac{${c+d}}{${n}}\frac{${c}}{${c+d}}=\frac{${a+c}}{${n}}$.`,rows.filter(r=>r[1]).length/rows.length);
    },h4('Hai nhóm có phủ hết không gian và rời nhau không?','Xác định xác suất chọn mỗi nhóm.','Nhân trọng số với tỉ lệ cần tìm trong nhóm, rồi cộng.','Hai dây chuyền sản xuất có sản lượng khác nhau nên tỉ lệ lỗi phải tính có trọng số.')),
  totalTree: skill('Toàn phần từ cây xác suất', 'Tính xác suất đích khi có hai cơ chế chọn khác nhau.',
    T`Trên cây, nhân xác suất dọc nhánh, cộng những nhánh đi đến cùng biến cố đích. Xác suất đầu nhánh phải có tổng bằng một.`,
    'Chọn hộp đồng khả năng khác với chọn một viên từ gộp hai hộp.',null,s=>{
      const a=2+s%5,b=3+s%6,c=4+s%7,d=2+s%4,den=2*(a+b)*(c+d);let good=0;
      for(let box=0;box<2;box++)for(let i=0;i<a+b;i++)for(let j=0;j<c+d;j++)if(box===0?i<a:j<c)good++;
      return qNum(T`Chọn một trong hai hộp với xác suất bằng nhau, rồi chọn ngẫu nhiên một viên từ hộp ấy. Hộp I có ${a} đỏ, ${b} xanh; hộp II có ${c} đỏ, ${d} xanh. Tính xác suất lấy viên đỏ.`,.5*a/(a+b)+.5*c/(c+d),T`$P(\text{Đ})=\frac12\frac{${a}}{${a+b}}+\frac12\frac{${c}}{${c+d}}$. Không được gộp toàn bộ viên của hai hộp vì cơ chế chọn bắt đầu bằng chọn hộp.`,good/den);
    },h4('Đọc cơ chế chọn hộp trước khi tính.','Gắn trọng số cho nhánh hộp I và hộp II.','Tính xác suất đỏ ở từng nhánh rồi cộng.','Bốc một phong bì trước rồi lấy thẻ trong phong bì khác với gộp tất cả thẻ để bốc.')),
  bayes: skill('Đảo điều kiện bằng Bayes', 'Tính xác suất nguồn gốc khi đã biết kết quả bằng công thức Bayes.',
    T`$P(B\mid A)=\dfrac{P(B)P(A\mid B)}{P(B)P(A\mid B)+P(\overline B)P(A\mid\overline B)}$. Mẫu số là xác suất của kết quả đã biết.`,
    'Không coi tỉ lệ đạt trong một nhóm là xác suất thuộc nhóm khi đã đạt.',null,s=>{
      const a=4+s%8,b=6+s%7,c=2+s%5,d=7+s%9,n=a+b+c+d,rows=population(a,b,c,d);
      return qNum(T`Nhà máy có ${a+b} sản phẩm từ máy A, trong đó ${a} lỗi; có ${c+d} sản phẩm từ máy B, trong đó ${c} lỗi. Chọn ngẫu nhiên một sản phẩm và biết nó lỗi. Xác suất nó từ máy A bằng bao nhiêu?`,a/(a+c),T`Theo Bayes, $P(A\mid L)=\frac{(${a+b}/${n})(${a}/${a+b})}{(${a+b}/${n})(${a}/${a+b})+(${c+d}/${n})(${c}/${c+d})}=\frac{${a}}{${a+c}}$.`,conditional(rows,r=>r[0],r=>r[1]));
    },h4('Xác định kết quả đã biết và nguồn cần truy ngược.','Tính xác suất đồng thời đi qua nguồn cần tìm và đạt kết quả.','Chia xác suất nhánh đó cho tổng xác suất mọi nhánh đạt kết quả.','Biết thư bị bộ lọc đánh dấu chưa đủ để kết luận thư rác; cần xét cả thư thường bị đánh dấu.')),
  bayesBox: skill('Bayes khi chọn hộp trước', 'Đảo xác suất trong mô hình chọn hộp đồng khả năng.',
    T`Tính xác suất đỏ từ từng hộp theo cơ chế chọn. Khi đã thấy viên đỏ, tỉ lệ nguồn bằng xác suất nhánh tương ứng chia tổng các nhánh đỏ.`,
    'Không chỉ so sánh số viên đỏ giữa hai hộp khi tổng số viên khác nhau.',null,s=>{
      const a=2+s%5,b=3+s%6,c=4+s%7,d=2+s%4,top=a*(c+d),bottom=top+c*(a+b);let fromOne=0,red=0;
      for(let box=0;box<2;box++)for(let i=0;i<a+b;i++)for(let j=0;j<c+d;j++)if(box===0?i<a:j<c){red++;if(box===0)fromOne++;}
      return qNum(T`Chọn một trong hai hộp với xác suất bằng nhau. Hộp I có ${a} đỏ, ${b} xanh; hộp II có ${c} đỏ, ${d} xanh. Rút một viên từ hộp đã chọn, thấy viên đỏ. Xác suất đã chọn hộp I bằng bao nhiêu?`,top/bottom,T`$P(I\mid\text{Đ})=\dfrac{\frac12\frac{${a}}{${a+b}}}{\frac12\frac{${a}}{${a+b}}+\frac12\frac{${c}}{${c+d}}}=\frac{${top}}{${bottom}}$.`,fromOne/red);
    },h4('Nhận ra đây là truy ngược sau khi đã biết màu.','Viết xác suất nhánh hộp I rồi đỏ.','Mẫu số là tổng cả hai nhánh đỏ, không là tổng số viên.','Hai túi có kích thước khác nhau nhưng được chọn ngang nhau: cần tính tỉ lệ trong mỗi túi trước.')),
  normalCross: skill('Pháp tuyến bằng tích có hướng', 'Tìm một vectơ pháp tuyến bằng tích có hướng của hai vectơ không cùng phương.',
    T`Với hai vectơ không cùng phương $\vec u,\vec v$ nằm trong mặt phẳng, $\vec n=\vec u\times\vec v\ne\vec0$ vuông góc cả hai. Kiểm tra bằng hai tích vô hướng.`,
    'Tích có hướng là vectơ; tích vô hướng là số. Đổi thứ tự đổi dấu nhưng vẫn là pháp tuyến.',null,s=>{
      const a=1+s%6,b=2+s%7,u=[1,a,0],v=[0,1,b],n=cross(u,v);assert.equal(dot(n,u),0);assert.equal(dot(n,v),0);assert.notEqual(norm(n),0);
      return qChoice(T`Mặt phẳng chứa hai vectơ $\vec u=${vec(u)}$, $\vec v=${vec(v)}$. Vectơ nào là một pháp tuyến?`,T`$${vec(n)}$`,[T`$${vec([a,b,1])}$`,T`$${vec([1,a,b])}$`],T`$\vec u\times\vec v=${vec(n)}$. Kiểm tra $\vec n\cdot\vec u=0$ và $\vec n\cdot\vec v=0$.`,s);
    },h4('Pháp tuyến phải vuông góc với cả hai vectơ đã cho.','Dùng công thức tích có hướng hoặc kiểm hai tích vô hướng.','Chú ý dấu trừ ở tọa độ giữa của khai triển.','Hai vectơ theo trục Ox và Oy có pháp tuyến theo trục Oz; hệ số khác không không đổi phương pháp tuyến.')),
  planeSpan: skill('Cặp vectơ chỉ phương của mặt phẳng', 'Kiểm tra hai vectơ có tạo một cặp chỉ phương của mặt phẳng hay không.',
    T`Hai vectơ chỉ phương phải không cùng phương và cùng vuông góc với pháp tuyến. Một vectơ duy nhất không xác định được phương của cả mặt phẳng.`,
    'Hai vectơ cùng phương dù đều nằm trong mặt phẳng vẫn chưa tạo một cặp chỉ phương.',null,s=>{
      const a = 2 + (s % 13), k = (Math.floor(s / 13) % 2);
      if (k === 0) {
        const n = [a, -1, 0], u = [1, a, 0], v = [0, 0, 1]; assert.equal(dot(n, u), 0); assert.equal(dot(n, v), 0); assert.ok(norm(cross(u, v)) > 0);
        return qOpen(T`Mặt phẳng có pháp tuyến $\vec n=${vec(n)}$. Chứng minh $\vec u=${vec(u)}$ và $\vec v=${vec(v)}$ là một cặp vectơ chỉ phương. Vì sao thay $\vec v$ bằng $2\vec u$ thì không được?`, T`$\vec n\cdot\vec u=${a}-${a}=0$, $\vec n\cdot\vec v=0$. $\vec u,\vec v$ không cùng phương vì tọa độ thứ ba của $\vec u$ bằng 0 còn của $\vec v$ khác 0. $2\vec u$ cùng phương với $\vec u$ nên không tạo đủ hai phương độc lập.`, ['Kiểm cả hai tích vô hướng bằng không.', 'Chứng minh hai vectơ không cùng phương.', 'Giải thích được vì sao cặp cùng phương không đủ.']);
      } else {
        const n = [0, a, -1], u = [1, 0, 0], v = [0, 1, a]; assert.equal(dot(n, u), 0); assert.equal(dot(n, v), 0); assert.ok(norm(cross(u, v)) > 0);
        return qOpen(T`Mặt phẳng có pháp tuyến $\vec n=${vec(n)}$. Chứng minh $\vec u=${vec(u)}$ và $\vec v=${vec(v)}$ là một cặp vectơ chỉ phương. Vì sao thay $\vec v$ bằng $2\vec u$ thì không được?`, T`$\vec n\cdot\vec u=0$, $\vec n\cdot\vec v=${a}-${a}=0$. $\vec u,\vec v$ không cùng phương vì tọa độ thứ nhất của $\vec u$ khác 0 còn của $\vec v$ bằng 0. $2\vec u$ cùng phương với $\vec u$ nên không tạo đủ hai phương độc lập.`, ['Kiểm cả hai tích vô hướng bằng không.', 'Chứng minh hai vectơ không cùng phương.', 'Giải thích được vì sao cặp cùng phương không đủ.']);
      }
    },h4('Có hai điều kiện phải kiểm, không chỉ vuông góc với pháp tuyến.','Tính hai tích vô hướng.','Kiểm tích có hướng có khác vectơ không hay không.','Hai mũi tên trên cùng một cạnh chỉ biểu thị một phương, dù độ dài khác nhau.')),
  planePoint: skill('Mặt phẳng qua điểm, biết pháp tuyến', 'Lập phương trình mặt phẳng từ một điểm và một pháp tuyến khác không.',
    T`Qua $M(x_0;y_0;z_0)$, pháp tuyến $(A;B;C)$: $A(x-x_0)+B(y-y_0)+C(z-z_0)=0$. Kiểm lại bằng cách thay tọa độ M.`,
    'Không lấy tọa độ điểm làm hệ số pháp tuyến.',null,s=>{
      const a=1+s%5,b=2+s%6,c=3+s%7,n=[2,-1,3],m=[a,b,c],D=-dot(n,m);
      const q=qNum(T`Mặt phẳng qua $M${vec(m)}$, pháp tuyến $(2;-1;3)$ có dạng $2x-y+3z+D=0$. Tìm $D$.`,D,T`Thay M: $2\cdot${a}-${b}+3\cdot${c}+D=0$, nên $D=${D}$.`,-(2*a-b+3*c));assert.equal(dot(n,m)+D,0);return q;
    },h4('Giữ hệ số x, y, z theo vectơ pháp tuyến.','Thay điểm đã biết vào phương trình tổng quát.','Giải phương trình còn một hằng số rồi thay ngược kiểm tra.','Mặt phẳng qua điểm gốc có hằng số tự do bằng không; qua điểm khác phải tính lại.')),
  planeThree: skill('Mặt phẳng qua ba điểm', 'Lập mặt phẳng bằng hai vectơ nối ba điểm không thẳng hàng.',
    T`Từ ba điểm A,B,C, lấy $\overrightarrow{AB}$ và $\overrightarrow{AC}$, kiểm không cùng phương; tích có hướng cho pháp tuyến rồi dùng một điểm.`,
    'Không nhân có hướng trực tiếp ba tọa độ điểm; phải tạo vectơ nối điểm.',null,s=>{
      const a=2+s%6,b=3+s%7,c=4+s%8,A=[a,0,0],B=[0,b,0],C=[0,0,c],n=cross(sub(B,A),sub(C,A)),D=-a*b*c;
      for(const p of [A,B,C])assert.equal(dot(n,p)+D,0);
      return qNum(T`Mặt phẳng qua $A${vec(A)}, B${vec(B)}, C${vec(C)}$ có phương trình $${b*c}x+${a*c}y+${a*b}z+D=0$. Tìm $D$ và kiểm bằng một điểm.`,D,T`$\overrightarrow{AB}=(-${a};${b};0)$, $\overrightarrow{AC}=(-${a};0;${c})$, tích có hướng $(${b*c};${a*c};${a*b})$. Thay A được $D=-${a*b*c}$.`,-dot(n,A));
    },h4('Tạo hai vectơ cùng điểm đầu từ ba điểm đã cho.','Lấy tích có hướng, kiểm khác vectơ không.','Dùng một điểm để tìm hằng số tự do.','Ba điểm trên các trục với tọa độ khác không tạo hai vectơ nối không cùng phương.')),
  planeFromSpan: skill('Mặt phẳng qua điểm, biết hai phương', 'Lập phương trình mặt phẳng qua một điểm và biết hai vectơ chỉ phương không cùng phương.',
    T`Tính pháp tuyến bằng tích có hướng của hai vectơ chỉ phương, rồi dùng điểm đã biết để lập phương trình. Kiểm cả điểm thuộc mặt phẳng và hai vectơ vuông góc pháp tuyến.`,
    'Không dùng trực tiếp một vectơ chỉ phương làm pháp tuyến.',null,s=>{
      const a=1+s%7,b=2+s%6,M=[a,b,2],u=[1,1,0],v=[0,1,2],n=[2,-2,1],D=-(2*a-2*b+2);
      assert.deepEqual(cross(u,v),n);assert.equal(dot(n,M)+D,0);
      return qNum(T`Mặt phẳng qua $M${vec(M)}$, có hai vectơ chỉ phương $(1;1;0)$ và $(0;1;2)$, có phương trình $2x-2y+z+D=0$. Tính D.`,D,T`Tích có hướng cho pháp tuyến $(2;-2;1)$. Thay M: $2\cdot${a}-2\cdot${b}+2+D=0$, nên $D=${D}$.`,-dot(cross(u,v),M));
    },h4('Hai vectơ đã cho nằm theo mặt phẳng, không vuông góc mặt phẳng.','Lấy tích có hướng để tạo pháp tuyến.','Dùng điểm đi qua để tìm hằng số rồi kiểm lại.','Hai phương của mặt bàn xác định phương vuông góc mặt bàn qua tích có hướng.')),
  planePerp: skill('Hai mặt phẳng vuông góc', 'Dùng tích vô hướng hai pháp tuyến để xác định điều kiện vuông góc.',
    T`Hai mặt phẳng vuông góc khi hai vectơ pháp tuyến vuông góc: $A_1A_2+B_1B_2+C_1C_2=0$. Hằng số tự do không quyết định góc.`,
    'Không yêu cầu hai pháp tuyến cùng phương khi xét vuông góc.',null,s=>{
      const a=2+s%7,b=3+s%6,m=-2*a+3*b;
      assert.equal(dot([1,2,-3],[m,a,b]),0);
      return qNum(T`Hai mặt phẳng $x+2y-3z+4=0$ và $mx+${a}y+${b}z-2=0$ vuông góc. Tìm $m$.`,m,T`Hai pháp tuyến có tích vô hướng $m+${2*a}-${3*b}=0$, nên $m=${m}$.`,3*b-2*a);
    },h4('Lấy ba hệ số của x, y, z làm pháp tuyến.','Góc giữa hai mặt phẳng được xét qua pháp tuyến.','Cho tích vô hướng hai pháp tuyến bằng không.','Mặt phẳng x bằng hằng số và mặt phẳng y bằng hằng số luôn vuông góc.')),
  planeParallel: skill('Song song hay trùng nhau', 'Phân biệt hai mặt phẳng song song và trùng nhau khi pháp tuyến cùng phương.',
    T`Pháp tuyến cùng phương cho song song hoặc trùng. Sau khi chuẩn hóa ba hệ số đầu, so sánh hằng số tự do để phân biệt.`,
    'Pháp tuyến cùng phương chưa đủ kết luận hai mặt phẳng song song phân biệt.',null,s=>{
      const a=2+s%6,k=2+s%4,d=s%2?2*k*a:k*a+1,same=s%2===1;
      const constant= same?2*k*a:d;assert.equal(constant===k*(2*a),same);
      return qChoice(T`Xét $(P):x+2y-z+${2*a}=0$ và $(Q):${k}x+${2*k}y-${k}z+${constant}=0$. Vị trí tương đối là`,same?'Hai mặt phẳng trùng nhau.':'Hai mặt phẳng song song phân biệt.',same?['Hai mặt phẳng song song phân biệt.','Hai mặt phẳng vuông góc.']:['Hai mặt phẳng trùng nhau.','Hai mặt phẳng vuông góc.'],T`Chia phương trình Q cho $${k}$. Ba hệ số đầu trùng với P; hằng số ${same?'cũng trùng':'khác'} nên ${same?'trùng nhau':'song song phân biệt'}.`,s);
    },h4('So sánh pháp tuyến trước.','Chuẩn hóa hệ số bằng cách nhân hoặc chia toàn phương trình.','So sánh cả hằng số sau chuẩn hóa.','Hai phương trình x bằng 1 và 2x bằng 2 biểu diễn cùng một mặt phẳng.')),
  planeDistance: skill('Khoảng cách điểm đến mặt phẳng', 'Tính khoảng cách bằng trị tuyệt đối biểu thức mặt phẳng chia độ dài pháp tuyến.',
    T`$d(M,(P))=|Ax_0+By_0+Cz_0+D|/\sqrt{A^2+B^2+C^2}$. Khoảng cách không âm và không đổi khi nhân cả phương trình bởi số khác không.`,
    'Không bỏ trị tuyệt đối hoặc quên chia độ dài pháp tuyến.',null,s=>{
      const a=1+s%7,b=2+s%8,c=3+s%5,D=-(s%5+1),n=[3,4,0],M=[a,b,c],signed=dot(n,M)+D,h=signed/25,foot=sub(M,n.map(x=>x*h)),answer=Math.abs(signed)/5;
      near(dot(n,foot)+D,0);return qNum(T`Tính khoảng cách từ $M${vec(M)}$ đến $(P):3x+4y${sign(D)}=0$.`,answer,T`$d=\frac{|3\cdot${a}+4\cdot${b}${sign(D)}|}{\sqrt{3^2+4^2}}=\frac{${Math.abs(signed)}}5$.`,norm(sub(M,foot)));
    },h4('Đọc đủ bốn hệ số của mặt phẳng.','Thay tọa độ điểm vào biểu thức vế trái.','Lấy trị tuyệt đối rồi chia độ dài pháp tuyến.','Điểm nằm ngay trên mặt phẳng cho tử số bằng không; dùng điều đó để kiểm công thức.')),
  lineSymmetric: skill('Đọc phương trình chính tắc', 'Đọc điểm đi qua và vectơ chỉ phương từ phương trình chính tắc, nhận diện trường hợp hệ số bằng không.',
    T`$\frac{x-x_0}{a}=\frac{y-y_0}{b}=\frac{z-z_0}{c}=t$ cho điểm $(x_0;y_0;z_0)$, chỉ phương $(a;b;c)$. Khi một hệ số bằng không, viết tọa độ tương ứng dạng cố định; không chia cho không.`,
    'Không lấy tử số làm chỉ phương hoặc đổi sai dấu tọa độ điểm.',null,s=>{
      const a=1+s%6,b=2+s%7,c=3+s%8,u=[2,-1,3],t=2,M=[a,b,c],N=addVec(M,u.map(x=>x*t));
      for(let i=0;i<3;i++)near((N[i]-M[i])/u[i],t);
      return qChoice(T`Đường thẳng $\frac{x-${a}}2=\frac{y-${b}}{-1}=\frac{z-${c}}3$ đi qua điểm nào?`,T`$${vec(N)}$`,[T`$${vec([a+2,b+1,c+3])}$`,T`$${vec([a,b,c+1])}$`],T`Cho tham số $t=2$ được $x=${a}+4$, $y=${b}-2$, $z=${c}+6$, tức $${vec(N)}$. Hai điểm còn lại không có cùng tham số ở ba tọa độ.`,s);
    },h4('Đặt ba tỉ số bằng cùng một tham số.','Viết tọa độ điểm bất kỳ theo tham số ấy.','Khi kiểm một điểm, ba tọa độ phải cho cùng tham số.','Nếu chỉ phương có tọa độ z bằng không thì z giữ nguyên, không viết một phân thức có mẫu không.')),
  lineTwoPoints: skill('Đường thẳng qua hai điểm', 'Dùng hiệu tọa độ hai điểm phân biệt để lập phương trình tham số.',
    T`Qua A,B phân biệt, chỉ phương là $\overrightarrow{AB}=B-A$. Viết $M=A+t\overrightarrow{AB}$; kiểm A tại t=0 và B tại t=1.`,
    'Không lấy tổng tọa độ hai điểm làm chỉ phương.',null,s=>{
      const a=1+s%6,b=2+s%7,A=[a,b,3],u=[2,-3,4],B=addVec(A,u),C=addVec(A,u.map(x=>2*x));assert.deepEqual(sub(B,A),u);
      return qNum(T`Đường thẳng qua $A${vec(A)}$ và $B${vec(B)}$ có biểu diễn $M=A+t\overrightarrow{AB}$. Với $t=2$, tính tổng ba tọa độ M.`,C.reduce((x,y)=>x+y,0),T`$\overrightarrow{AB}=(2;-3;4)$, $M${vec(C)}$, tổng bằng $${C.reduce((x,y)=>x+y,0)}$.`,A.reduce((x,y)=>x+y,0)+2*u.reduce((x,y)=>x+y,0));
    },h4('Trừ tọa độ điểm cuối cho điểm đầu.','Giữ một điểm làm gốc trong phương trình tham số.','Thay cùng một giá trị tham số vào cả ba tọa độ.','Điểm ứng với tham số không là điểm gốc, tham số một là điểm thứ hai đã dùng.')),
  linePerp: skill('Hai đường thẳng vuông góc', 'Xác định điều kiện vuông góc bằng hai vectơ chỉ phương.',
    T`Góc giữa hai đường thẳng bằng góc nhọn hoặc vuông giữa các vectơ chỉ phương. Vuông góc khi tích vô hướng bằng không, kể cả hai đường chéo nhau.`,
    'Vuông góc về góc không bắt buộc hai đường cắt nhau trong không gian.',null,s=>{
      const a=2+s%8,b=3+s%7,m=2*b-3*a;assert.equal(dot([1,3,-2],[m,a,b]),0);
      return qNum(T`Hai đường có vectơ chỉ phương $\vec u=(1;3;-2)$ và $\vec v=(m;${a};${b})$. Tìm m để góc giữa hai đường bằng $90^\circ$.`,m,T`$\vec u\cdot\vec v=m+${3*a}-${2*b}=0$, nên $m=${m}$.`,2*b-3*a);
    },h4('Lấy vectơ chỉ phương của từng đường.','Dùng góc giữa đường thẳng, không tự thêm điều kiện cắt nhau.','Cho tích vô hướng bằng không.','Hai cạnh thuộc các tầng khác nhau của hình hộp vẫn có thể tạo góc vuông theo hai phương.')),
  linePosition: skill('Vị trí tương đối hai đường', 'Phân biệt cắt, song song, trùng và chéo bằng chỉ phương cùng hệ tham số.',
    T`Trước hết so sánh chỉ phương. Nếu không cùng phương, giải hệ tìm giao điểm: có nghiệm là cắt, vô nghiệm là chéo. Nếu cùng phương, kiểm một điểm thuộc đường kia để phân biệt trùng/song song.`,
    'Không dùng hai tọa độ trùng để bỏ qua phương trình tọa độ thứ ba.',null,s=>{
      const a=1+s%9,b=2+s%7,z=s%2?0:1+s%5,intersect=z===0,u=[1,0,0],v=[0,1,0],delta=[a,b,z];assert.equal(det(delta,u,v)===0,intersect);
      return qChoice(T`Hai đường $d_1:(x;y;z)=(t;0;0)$ và $d_2:(x;y;z)=(${a};${b}+s;${z})$. Vị trí tương đối là`,intersect?'Hai đường cắt nhau.':'Hai đường chéo nhau.',intersect?['Hai đường chéo nhau.','Hai đường song song.']:['Hai đường cắt nhau.','Hai đường song song.'],T`Chỉ phương $(1;0;0)$ và $(0;1;0)$ không cùng phương. Hai tọa độ đầu cho $t=${a},s=-${b}$; tọa độ thứ ba ${intersect?'đúng nên có giao điểm':'mâu thuẫn nên không có giao điểm'}.`,s);
    },h4('So sánh phương hai đường trước.','Dùng hai tham số khác nhau cho hai đường.','Kiểm đồng thời cả ba phương trình tọa độ.','Một cầu vượt và con đường dưới nó có thể có hình chiếu cắt nhau nhưng hai đường trong không gian không giao nhau.')),
  linePlane: skill('Giao đường thẳng và mặt phẳng', 'Thế phương trình tham số vào mặt phẳng để xác định giao điểm.',
    T`Thế $M=M_0+t\vec u$ vào phương trình mặt phẳng. Một nghiệm t cho một giao điểm; vô nghiệm cho song song, đồng nhất cho đường nằm trong mặt phẳng.`,
    'Không coi nghiệm tham số là tọa độ giao điểm.',null,s=>{
      const a=1+s%6,b=2+s%7,t=1+s%8,M=[a,b,1],u=[1,2,3],n=[2,-1,1],D=-dot(n,addVec(M,u.map(x=>x*t)));
      assert.notEqual(dot(n,u),0);return qNum(T`Đường $d:(x;y;z)=(${a}+t;${b}+2t;1+3t)$ cắt $(P):2x-y+z${sign(D)}=0$. Tìm tham số t tại giao điểm.`,t,T`Thế vào P: $2(${a}+t)-(${b}+2t)+(1+3t)${sign(D)}=0$. Suy ra $3t=${3*t}$, $t=${t}$.`,-(dot(n,M)+D)/dot(n,u));
    },h4('Giữ cùng một tham số trong ba tọa độ đường thẳng.','Thế cả ba tọa độ vào phương trình mặt phẳng.','Giải phương trình theo tham số rồi kiểm nghiệm.','Tia đi xuyên một tấm phẳng có thời điểm gặp khi tọa độ tia thỏa phương trình tấm.')),
  lineReal: skill('Mô hình chuyển động trong không gian', 'Lập và dùng đường thẳng tham số cho chuyển động đều, kèm đơn vị và miền thời gian.',
    T`Vị trí $M(t)=M_0+t\vec v$ với $t\ge0$. Vectơ vận tốc cho độ thay đổi từng tọa độ mỗi đơn vị thời gian. Kết quả giao phải thỏa miền thời gian.`,
    'Không nhận thời gian âm hoặc nhầm vectơ vận tốc với vị trí ban đầu.',null,s=>{
      const a=2+s%7,b=3+s%8,t=2+s%6,z0=4,z=z0+3*t;
      return qNum(T`Một thiết bị bay chuyển động đều từ $M_0(${a};${b};4)$ m, vận tốc $(2;-1;3)$ m/s. Sau bao nhiêu giây thiết bị đạt độ cao $z=${z}$ m?`,t,T`$z(t)=4+3t$. Giải $4+3t=${z}$ được $t=${t}$ s, thỏa $t\ge0$.`,(z-z0)/3);
    },h4('Chọn trục biểu thị độ cao và đơn vị thời gian.','Viết tọa độ cao bằng cao ban đầu cộng vận tốc đứng nhân thời gian.','Giải rồi kiểm thời gian không âm.','Xe khởi hành ở vị trí khác không cần cộng vị trí ban đầu vào độ dịch chuyển.')),
  angleLines: skill('Góc giữa hai đường thẳng', 'Tính góc nhọn giữa hai đường bằng tích vô hướng và độ dài chỉ phương.',
    T`$\cos\theta=|\vec u\cdot\vec v|/(|\vec u||\vec v|)$, $0\le\theta\le90^\circ$. Trị tuyệt đối làm kết quả không phụ thuộc hướng chọn của vectơ.`,
    'Không dùng góc tù giữa hai vectơ làm góc giữa hai đường.',null,s=>{
      const a = 1 + (s % 15), k = (Math.floor(s / 15) % 2);
      if (k === 0) {
        const u = [1, a, 0], v = [1, 0, a], answer = 1 / (1 + a * a) ** 2;
        return qNum(T`Hai đường có chỉ phương $(1;${a};0)$ và $(1;0;${a})$. Tính $\cos^2\theta$, với $\theta$ là góc giữa hai đường.`, answer, T`Tích vô hướng bằng $1$, bình phương mỗi độ dài bằng $${1+a*a}$. Vì vậy $\cos^2\theta=1/${(1+a*a)**2}$.`, dot(u, v) ** 2 / (dot(u, u) * dot(v, v)));
      } else {
        const u = [0, 1, a], v = [a, 1, 0], answer = 1 / (1 + a * a) ** 2;
        return qNum(T`Hai đường có chỉ phương $(0;1;${a})$ và $(${a};1;0)$. Tính $\cos^2\theta$, với $\theta$ là góc giữa hai đường.`, answer, T`Tích vô hướng bằng $1$, bình phương mỗi độ dài bằng $${1+a*a}$. Vì vậy $\cos^2\theta=1/${(1+a*a)**2}$.`, dot(u, v) ** 2 / (dot(u, u) * dot(v, v)));
      }
    },h4('Dùng vectơ chỉ phương của cả hai đường.','Tính tích vô hướng và hai bình phương độ dài.','Góc đường thẳng lấy giá trị không quá chín mươi độ.','Đổi hướng một vectơ đổi dấu tích vô hướng nhưng không đổi góc giữa hai đường.')),
  angleLinePlane: skill('Góc đường thẳng và mặt phẳng', 'Dùng sin góc đường-mặt từ tích vô hướng chỉ phương và pháp tuyến.',
    T`$\sin\alpha=|\vec u\cdot\vec n|/(|\vec u||\vec n|)$, $0\le\alpha\le90^\circ$. Góc đường-mặt phụ với góc giữa đường và pháp tuyến.`,
    'Không thay sin bằng cos khi dùng trực tiếp pháp tuyến.',null,s=>{
      const a=1+s%7,b=2+s%6,u=[a,b,3],n=[0,0,1],answer=9/(a*a+b*b+9);
      return qNum(T`Đường có chỉ phương $(${a};${b};3)$; mặt phẳng là $(Oxy)$. Tính $\sin^2\alpha$ với $\alpha$ là góc đường thẳng và mặt phẳng.`,answer,T`Pháp tuyến $(Oxy)$ là $(0;0;1)$. $\sin^2\alpha=3^2/(${a}^2+${b}^2+3^2)=${9}/${a*a+b*b+9}$.`,dot(u,n)**2/(dot(u,u)*dot(n,n)));
    },h4('Lấy chỉ phương của đường và pháp tuyến của mặt.','Vẽ góc với pháp tuyến, so sánh với góc cần tìm.','Dùng sin cho góc giữa đường và mặt phẳng.','Đường nằm ngang có thành phần theo pháp tuyến đứng bằng không nên tạo góc không với mặt ngang.')),
  anglePlanes: skill('Góc giữa hai mặt phẳng', 'Tính góc hai mặt phẳng thông qua hai vectơ pháp tuyến.',
    T`$\cos\phi=|\vec n_1\cdot\vec n_2|/(|\vec n_1||\vec n_2|)$, $0\le\phi\le90^\circ$. Chỉ các hệ số x,y,z tham gia tính góc.`,
    'Không lấy hằng số tự do làm tọa độ thứ tư của pháp tuyến.',null,s=>{
      const a = 1 + (s % 15), n = [1, a, 1], m = [1, 0, -1 - a], answer = a * a / ((a * a + 2) * (1 + (1 + a) ** 2));
      return qNum(T`Cho $(P):x+${a}y+z-1=0$, $(Q):x-${1+a}z+3=0$. Tính $\cos^2\phi$ của góc giữa hai mặt phẳng.`,answer,T`Hai pháp tuyến $(1;${a};1)$, $(1;0;-${1+a})$ có tích vô hướng $-${a}$. $\cos^2\phi=\frac{${a*a}}{${a*a+2}\cdot${1+(1+a)**2}}$.`,dot(n,m)**2/(dot(n,n)*dot(m,m)));
    },h4('Trích hai pháp tuyến từ hệ số phương trình.','Tính tích vô hướng, không dùng hằng số tự do.','Chia bình phương tích vô hướng cho tích hai bình phương độ dài.','Các mặt phẳng song song giữ góc không dù khoảng cách giữa chúng thay đổi.')),
  sphereRead: skill('Tâm và bán kính mặt cầu', 'Hoàn thành bình phương để nhận tâm và bán kính, kiểm điều kiện bán kính dương.',
    T`$x^2+y^2+z^2-2ax-2by-2cz+d=0$ tương đương $(x-a)^2+(y-b)^2+(z-c)^2=a^2+b^2+c^2-d$. Vế phải phải dương để là mặt cầu.`,
    'Không lấy trực tiếp hệ số bậc nhất làm tâm hoặc nhầm bán kính với bình phương bán kính.',null,s=>{
      const a=1+s%6,b=2+s%5,c=3+s%7,r=2+s%8,D=a*a+b*b+c*c-r*r,M=[a+r,b,c];near(dot(M,M)-2*a*M[0]-2*b*M[1]-2*c*M[2]+D,0);
      return qNum(T`Mặt cầu $x^2+y^2+z^2-${2*a}x-${2*b}y-${2*c}z${sign(D)}=0$. Tính bình phương bán kính.`,r*r,T`Hoàn thành bình phương được tâm $(${a};${b};${c})$, $R^2=${a*a}+${b*b}+${c*c}-${D<0?`(${D})`:D}=${r*r}$.`,a*a+b*b+c*c-D);
    },h4('Gom từng biến với hạng tử bậc nhất cùng biến.','Thêm rồi bớt bình phương nửa hệ số.','Kiểm vế phải sau hoàn thành bình phương dương.','Phương trình tổng ba bình phương bằng số âm không có điểm thực, không là mặt cầu.')),
  spherePoint: skill('Mặt cầu biết tâm và điểm', 'Lập phương trình mặt cầu từ tâm và một điểm thuộc mặt cầu.',
    T`Tâm I, điểm A trên mặt cầu cho $R^2=IA^2$. Phương trình là $|M-I|^2=R^2$. Kiểm bằng cách thay A.`,
    'Không lấy khoảng cách từ gốc tọa độ đến A thay bán kính.',null,s=>{
      const I=[1+s%6,2+s%7,3+s%5],u=[2+s%5,-3,1+s%4],A=addVec(I,u),answer=dot(u,u);assert.equal(dot(sub(A,I),sub(A,I)),answer);
      return qNum(T`Mặt cầu tâm $I${vec(I)}$ đi qua $A${vec(A)}$. Tính $R^2$ để lập phương trình mặt cầu.`,answer,T`$\overrightarrow{IA}=${vec(u)}$, nên $R^2=${u[0]}^2+(-3)^2+${u[2]}^2=${answer}$. Phương trình $(x-${I[0]})^2+(y-${I[1]})^2+(z-${I[2]})^2=${answer}$.`,sub(A,I).reduce((sum,x)=>sum+x*x,0));
    },h4('Xác định điểm nào là tâm.','Trừ tọa độ điểm trên mặt cầu với tọa độ tâm.','Cộng bình phương ba hiệu để tìm bình phương bán kính.','Một điểm trên mặt cầu phải làm vế trái phương trình tâm-bán kính đúng bằng bình phương bán kính.')),
  sphereDiameter: skill('Mặt cầu có đường kính cho trước', 'Tìm tâm là trung điểm và bán kính bằng nửa độ dài đường kính.',
    T`Nếu AB là đường kính, tâm $I=(A+B)/2$, $R^2=AB^2/4$. Hai đầu A,B phải thỏa cùng phương trình mặt cầu.`,
    'Không dùng độ dài cả đường kính làm bán kính.',null,s=>{
      const I=[2+s%7,1+s%6,3],u=[1+s%4,2+s%5,3],A=sub(I,u),B=addVec(I,u),r2=dot(u,u);near(dot(sub(B,A),sub(B,A))/4,r2);
      return qOpen(T`Lập phương trình mặt cầu có đường kính $AB$ với $A${vec(A)}, B${vec(B)}$. Kiểm một đầu đường kính thuộc mặt cầu.`,T`Trung điểm $I${vec(I)}$. $R^2=AB^2/4=${r2}$. Phương trình $(x-${I[0]})^2+(y-${I[1]})^2+(z-3)^2=${r2}$. Thay A: $${u[0]}^2+${u[1]}^2+3^2=${r2}$, đúng.`,['Tâm đúng là trung điểm hai đầu.','Bán kính hoặc bình phương bán kính đúng bằng nửa hoặc một phần tư tương ứng.','Phương trình đúng và kiểm được một đầu đường kính.']);
    },h4('Tâm chia đôi đường kính.','Tính trung điểm theo từng tọa độ.','Bình phương bán kính bằng một phần tư bình phương đường kính.','Đường kính nối hai điểm đối xứng qua tâm, nên vectơ từ tâm đến hai đầu đối nhau.')),
  sphereTangent: skill('Mặt cầu tiếp xúc mặt phẳng', 'Dùng khoảng cách từ tâm đến mặt phẳng làm bán kính khi tiếp xúc.',
    T`Mặt cầu tâm I tiếp xúc mặt phẳng P khi $R=d(I,P)>0$. Dùng công thức khoảng cách rồi bình phương để viết phương trình.`,
    'Nếu tâm thuộc mặt phẳng thì bán kính bằng không, không có mặt cầu tiếp xúc như yêu cầu.',null,s=>{
      const a=2+s%7,b=3+s%6,I=[a,b,1],n=[3,4,0],D=-1,dist=(3*a+4*b-1)/5,foot=sub(I,n.map(x=>x*(3*a+4*b-1)/25));assert.ok(dist>0);near(dot(n,foot)+D,0);
      return qNum(T`Mặt cầu tâm $I${vec(I)}$ tiếp xúc $(P):3x+4y-1=0$. Tính bán kính R.`,dist,T`$R=d(I,P)=\frac{|3\cdot${a}+4\cdot${b}-1|}5=\frac{${3*a+4*b-1}}5>0$.`,norm(sub(I,foot)));
    },h4('Bán kính tới tiếp điểm vuông góc mặt phẳng.','Tính khoảng cách từ tâm đến mặt phẳng.','Kiểm khoảng cách dương trước khi kết luận mặt cầu.','Một quả cầu chạm mặt bàn có tâm cách mặt bàn đúng một bán kính.')),
});

Object.assign(skills, {
  sequenceTerm: skill('Dãy số và số hạng', 'Tính số hạng từ công thức và phân biệt chỉ số với giá trị số hạng.',T`Với công thức $u_n$, thay đúng chỉ số n. Dãy có quy tắc truy hồi cần giá trị đầu để xác định các số hạng tiếp theo.`,'Không coi n là giá trị số hạng.',null,s=>{const a=2+s%7,b=1+s%5,n=3+s%8,ans=a*n+b;return qNum(T`Dãy $u_n=${a}n+${b}$, $n\ge1$. Tính $u_{${n}}$.`,ans,T`Thay $n=${n}$: $u_{${n}}=${a}\cdot${n}+${b}=${ans}$.`,Array.from({length:n},(_,i)=>a*(i+1)+b).at(-1));},h4('Xác định chỉ số cần tìm.','Thay cùng một chỉ số vào công thức.','Giữ thứ tự thực hiện phép tính.','Ký hiệu số hạng thứ k nói vị trí trong dãy, không nói giá trị bằng k.')),
  arithmetic: skill('Cấp số cộng', 'Dùng công sai để tính số hạng hoặc tổng hữu hạn của cấp số cộng.',T`$u_n=u_1+(n-1)d$, $S_n=n(2u_1+(n-1)d)/2$. Từ số hạng đầu đến thứ n có n-1 bước cộng.`,'Không dùng n bước tăng để tính số hạng thứ n.',null,s=>{const a=2+s%7,d=1+s%5,n=4+s%6,ans=n*(2*a+(n-1)*d)/2;return qNum(T`Cấp số cộng có $u_1=${a},d=${d}$. Tính tổng ${n} số hạng đầu.`,ans,T`$S_{${n}}=\frac{${n}(2\cdot${a}+${n-1}\cdot${d})}2=${ans}$.`,Array.from({length:n},(_,i)=>a+i*d).reduce((x,y)=>x+y,0));},h4('Xác định số hạng đầu và công sai.','Tính số hạng cuối hoặc dùng công thức tổng.','Kiểm số lượng bước bằng số hạng trừ một.','Ghép số đầu với số cuối cho cùng một tổng trong cấp số cộng.')),
  geometric: skill('Cấp số nhân', 'Dùng công bội để tính số hạng và tổng cấp số nhân hữu hạn.',T`$u_n=u_1q^{n-1}$; khi $q\ne1$, $S_n=u_1(q^n-1)/(q-1)$. Nếu $q=1$, tổng là $nu_1$.`,'Không nhầm công bội với công sai.',null,s=>{const a=1+s%7,q=2+s%2,n=3+s%5,ans=a*q**(n-1);return qNum(T`Cấp số nhân $u_1=${a}$, công bội $q=${q}$. Tính $u_{${n}}$.`,ans,T`$u_{${n}}=${a}\cdot${q}^{${n-1}}=${ans}$.`,Array.from({length:n-1}).reduce(x=>x*q,a));},h4('Công bội dùng phép nhân giữa hai số hạng liên tiếp.','Đếm số lần nhân từ số hạng đầu.','Số mũ bằng chỉ số trừ một.','Dãy nhân đôi mỗi bước khác với dãy cộng thêm hai mỗi bước.')),
  sequenceLimit: skill('Giới hạn dãy hữu tỉ', 'Chia tử và mẫu cho lũy thừa cao nhất để tính giới hạn dãy.',T`Với mẫu bậc cao nhất có hệ số khác không, chia cả tử và mẫu cho lũy thừa đó. Các hạng $1/n,1/n^2$ tiến về không.`,'Không lấy giới hạn riêng tử và mẫu đều vô cực rồi chia hình thức.',null,s=>{const a=2+s%7,b=3+s%5,c=1+s%6,ans=a/b;near((a*1e14+c)/(b*1e14+1),ans);return qNum(T`Tính $\lim_{n\to\infty}\frac{${a}n+${c}}{${b}n+1}$.`,ans,T`Chia n: $\frac{${a}+${c}/n}{${b}+1/n}\to${a}/${b}$.`,a/b);},h4('Tìm bậc lớn nhất của n ở tử và mẫu.','Chia cả tử và mẫu cho cùng lũy thừa.','Dùng giới hạn của các số hạng nghịch đảo.','Tỉ số hai đại lượng tăng tuyến tính về lâu dài do hệ số tăng trưởng quyết định.')),
  expLog: skill('Hàm mũ và lôgarit', 'Dùng định nghĩa lôgarit để chuyển đổi và tính giá trị có điều kiện xác định.',T`$\log_a b=c$ tương đương $a^c=b$, với $a>0,a\ne1,b>0$. Kiểm điều kiện trước khi dùng tính chất.`,'Không định nghĩa lôgarit của số không hoặc số âm.',null,s=>{const a=2+s%3,n=2+s%7,val=a**n;assert.equal(a**n,val);return qNum(T`Tính $\log_{${a}}${val}$.`,n,T`Vì $${a}^{${n}}=${val}$ và cơ số hợp lệ, lôgarit bằng $${n}$.`,Math.log(val)/Math.log(a));},h4('Đọc cơ số của lôgarit.','Chuyển thành câu hỏi về số mũ.','Kiểm cơ số dương khác một, đối số dương.','Logarit trả lời cần mũ nào để từ cơ số thu được đối số.')),
  expIneq: skill('Bất phương trình mũ', 'Giải bất phương trình mũ và đảo chiều khi cơ số nằm giữa không và một.',T`Với $a>1$, $a^u>a^v\iff u>v$. Với $0<a<1$, chiều bất đẳng thức bị đảo.`,'Không giữ nguyên chiều khi cơ số nhỏ hơn một.',null,s=>{
    const n = 2 + (s % 17), k = (Math.floor(s / 17) % 2);
    if (k === 0) {
      assert.ok(2**(-(n+1))<2**(-n));
      return qChoice(T`Giải $\left(\frac12\right)^x<\left(\frac12\right)^{${n}}$.`,T`$x>${n}$`,[T`$x<${n}$`,T`$x\ge${n}$`],T`Cơ số thuộc $(0;1)$ nên hàm nghịch biến; bất đẳng thức tương đương $x>${n}$.`,s);
    } else {
      assert.ok(3**(-(n+1))<3**(-n));
      return qChoice(T`Giải $\left(\frac13\right)^x<\left(\frac13\right)^{${n}}$.`,T`$x>${n}$`,[T`$x<${n}$`,T`$x\ge${n}$`],T`Cơ số thuộc $(0;1)$ nên hàm nghịch biến; bất đẳng thức tương đương $x>${n}$.`,s);
    }
  },h4('Xét cơ số lớn hơn hay nhỏ hơn một.','Đưa hai vế về cùng cơ số.','Nếu hàm mũ nghịch biến, đổi chiều so sánh số mũ.','Nhân lặp một số dương nhỏ hơn một làm giá trị giảm.')),
  logIneq: skill('Bất phương trình lôgarit', 'Kết hợp miền xác định với tính đơn điệu để giải bất phương trình lôgarit.',T`Giải điều kiện đối số dương trước; khi đưa về so sánh đối số, xét cơ số. Tập nghiệm cuối là giao với miền xác định.`,'Không bỏ điều kiện đối số dương khi kết luận.',null,s=>{const a=1+s%8,n=2+s%4,end=a+2**n;assert.equal(Math.log2(end-a),n);return qChoice(T`Giải $\log_2(x-${a})<${n}$.`,T`$${a}<x<${end}$`,[T`$x<${end}$`,T`$x>${end}$`],T`Điều kiện $x>${a}$. Vì cơ số $2>1$, $x-${a}<2^{${n}}=${2**n}$. Giao điều kiện: $${a}<x<${end}$.`,s);},h4('Viết điều kiện đối số dương.','Dùng tính đồng biến theo cơ số.','Lấy giao bất phương trình mới với miền xác định.','Một nghiệm của bất phương trình đại số vẫn bị loại nếu làm đối số lôgarit không dương.')),
});

const coreFocus = {
  140:['condSpace'],141:['condTable'],142:['condReverse'],143:['normalCross'],144:['planeSpan'],
  158:['condComplement'],159:['multiply'],160:['multiplyMixed'],161:['planePoint'],162:['planeFromSpan','planeThree'],
  163:['multiply','multiplyMixed'],164:['totalRule'],165:['totalTree'],166:['planePerp'],167:['planePerp','planePoint'],168:['planeParallel'],169:['planeDistance'],
  173:['bayes'],174:['bayesBox'],175:['bayes','totalRule'],176:['bayesBox','condReverse'],177:['lineSymmetric'],178:['lineTwoPoints'],179:['linePerp'],
  185:['linePosition'],186:['linePosition','lineTwoPoints'],187:['linePlane'],188:['lineReal'],189:['linePlane','lineReal'],
  190:['angleLines'],191:['angleLinePlane'],192:['angleLines','angleLinePlane'],193:['anglePlanes'],194:['anglePlanes','planePerp'],195:['sphereRead'],196:['spherePoint'],
  200:['sphereDiameter'],201:['sphereTangent'],202:['spherePoint','sphereRead'],
};
const reviewFocus = {
  138:['integralPoly','areaTwo'],139:['dotCoord','variance'],183:['condTable','multiplyMixed'],184:['totalTree','bayesBox'],
  203:['planeThree','planeParallel'],204:['linePosition','linePlane'],205:['angleLines','angleLinePlane'],206:['sphereDiameter','sphereTangent'],
  210:['condReverse','condComplement'],211:['multiply','multiplyMixed'],212:['totalRule','totalTree'],213:['bayes','bayesBox'],214:['planePerp','planeDistance'],215:['linePerp','anglePlanes'],216:['sphereRead','spherePoint'],
  220:['totalTree','bayesBox'],221:['condTable','multiplyMixed'],222:['condComplement','bayes'],223:['planeThree','planeParallel'],224:['lineTwoPoints','linePosition'],225:['angleLinePlane','anglePlanes'],226:['sphereDiameter','sphereTangent'],
  230:['condReverse','bayesBox'],231:['totalRule','multiplyMixed'],232:['normalCross','planePoint'],233:['planeDistance','planePerp'],234:['lineSymmetric','linePlane'],235:['angleLines','anglePlanes'],236:['sphereRead','sphereDiameter'],
  240:['bayes','multiplyMixed'],241:['linePlane','sphereTangent'],244:['condTable','bayes'],245:['planeThree','linePlane'],246:['angleLinePlane','sphereRead'],
  250:['sequenceTerm','arithmetic'],251:['geometric','sequenceLimit'],252:['expLog'],253:['expIneq','logIneq'],254:['planeDistance'],255:['angleLinePlane'],256:['arithmetic','logIneq'],
  260:['monoRule','maxClosed'],261:['asymVH','rational21'],262:['coordOps','dotCoord'],263:['quartile','variance'],264:['integralPoly','areaTwo'],265:['planeDistance','anglePlanes'],266:['totalTree','bayesBox'],
  270:['extremaCalc','maxOpen'],271:['rational11','asymOblique'],272:['primitiveTrig','integralIntervals'],273:['areaSign','volumeRotate'],274:['planeThree','linePlane'],275:['spherePoint','sphereTangent'],276:['multiplyMixed','bayes'],
  280:['monoRule','monoCritical'],281:['extremaSign','extremaCalc'],282:['maxClosed','maxOpen'],283:['asymVH','asymOblique'],284:['cubic'],285:['rational11'],286:['rational21'],
  287:['primitivePower','primitiveReciprocal'],288:['primitiveExp','primitiveTrig'],289:['integralLinearity','integralIntervals'],290:['integralPoly','areaTwo'],
  291:['condReverse','totalTree'],292:['bayes','multiplyMixed'],293:['planeParallel','planeDistance'],
  297:['linePosition','linePlane'],298:['angleLines','angleLinePlane'],299:['anglePlanes','sphereTangent'],300:['sphereDiameter','sphereRead'],301:['bayesBox','areaSign'],
};
// The Grade 11 review is explicitly scheduled by this Grade 12 PPCT, not an invented earlier core period.
const reviewIntroductions={sequenceTerm:250,arithmetic:250,geometric:251,sequenceLimit:251,expLog:252,expIneq:253,logIneq:253};
const firstPeriod = Object.fromEntries(Object.keys(skills).map(key => {
  const p=grade.hki_prerequisites.lessons.find(row=>hkiFocus[row.period]?.includes(key))
    ||grade.lessons.find(row=>coreFocus[row.period]?.includes(key))
    ||grade.lessons.find(row=>row.period===reviewIntroductions[key]);
  assert.ok(p,`No exact PPCT source for ${key}`);return [key,p];
}));
const references=new Map();
const unit2Live=readFileSync(new URL('tasks/r23-hkii/sources/g12-unit2-live.txt',root),'utf8');
for(const unit of units)for(const lo of unit.sourceLOexact){
  if(unit.unit===2)assert.ok(unit2Live.includes(lo.reference.excerpt),`Live Unit2 excerpt missing: ${lo.id}`);
  references.set(`${unit.unit}-${lo.id.slice(-2)}`,{id:lo.id,...lo.reference,hash:unit.sourceSha256});
}

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
    const spec=skills[key], code=spec.lo;
    if(code){const ref=references.get(code);assert.ok(ref,code);useRefs.set(ref.id,ref);return {segmentId:ref.id,quote:ref.excerpt,origin:'adapted'};}
    const row=firstPeriod[key];
    return {segmentId:row.id,quote:row.source.content.cached,origin:'generated'};
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
    'Sáu Unit Plan là học phần I/II của năm cũ, không phải nguồn đầy đủ cho toàn học kỳ II 2026-2027.',
    ...(focus.some(key=>skills[key].lo===null)?['Mục tiêu này do tác giả cụ thể hóa theo đúng dòng PPCT; không gán mã LO hay mức độ chính thức của nguồn.']:[]),
    ...(focus.includes('lineSymmetric')?['PPCT bắt đầu đường thẳng tại Tiết 2; gói nhắc dạng tham số cần dùng, không tạo thêm một tiết Tiết 1 bị thiếu.']:[]),
  ];
  const entry=assembleHkiiPackage({period,title,slotMinutes:40,prerequisites:[
    'Đọc ký hiệu, thực hiện phép tính đại số và giải phương trình cơ bản đã học.',
  ],unitReferences:[...useRefs.values()],sourcePeriods:[...new Map(focus.map(key=>[firstPeriod[key].id,firstPeriod[key]])).values()],outline:{format:'lesson-outline-v1',essentialQuestion:`Làm thế nào kiểm tra lời giải về ${focus.map(key=>skills[key].title.toLowerCase()).join(' và ')} để tránh nhầm dấu, điều kiện hoặc biểu diễn?`,
    objectives:focus.map((key,i)=>({statement:skills[key].goal,level:'must',source:sources[i]})),activities:acts,uncertainties},
    rubric:{criteria:focus.map(key=>skills[key].goal),lookFor:focus.map(key=>`Kiểm tra lỗi: ${skills[key].error}`)}});
  entry.focusSkills=focus;
  entry.conceptIds=[...focus];
  if(game)entry.cumulativeScope={rule:'previous_weeks_only',eligibleConceptIds:eligible,selectedConceptIds:[...focus],latestSourceWeek:Math.max(...focus.map(key=>firstPeriod[key].week)),eligibleSourcePeriodIds:[...new Set(eligible.map(key=>firstPeriod[key].id))]};
  entry.coverage={sourcePeriodId:period.id,sourceKind:period.kind,effectiveKind:period.effective_kind,sourceDetail:period.source.content.raw,
    lessonScope:focus.map(key=>({id:key,title:skills[key].title,introducedByPeriodId:firstPeriod[key].id})),
    ...(game?{bankScope:eligible,bankPath:'tasks/r23-hkii/g12-practice-bank.json',roundScope:focus,sameWeekIncluded:false}:{}),
    ...(period.ownerOverride?{ownerOverride:period.ownerOverride}:{}),
  };
  return {entry,solutions};
}

const byPeriod=new Map(grade.lessons.map(p=>[p.period,p]));
const lessonEntries=[],teacherSolutions=[];
for(const period of grade.lessons){
  if(period.kind==='assessment')continue;
  let focus=coreFocus[period.period]||reviewFocus[period.period];
  const eligible=Object.keys(skills).filter(key=>firstPeriod[key].week<period.week&&firstPeriod[key].kind==='core');
  if(period.effective_kind==='elective'){
    assert.ok(eligible.length>=2);
    const start=lessonEntries.filter(entry=>entry.kind==='elective').length;
    // Full graph investigations stay in the bank; a 40-minute game uses two shorter concepts.
    const quick=eligible.filter(key=>!['cubic','rational11','rational21'].includes(key));
    const hki=quick.filter(key=>firstPeriod[key].week<=18),hkii=quick.filter(key=>firstPeriod[key].week>=19);
    focus=[hki[start%hki.length],(hkii.length?hkii:quick)[(start*3+7)%(hkii.length||quick.length)]];
    if(focus[0]===focus[1])focus[1]=quick[(quick.indexOf(focus[0])+1)%quick.length];
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
  const periodNumbers = final ? [302,303] : [242,243];
  const periods = periodNumbers.map(number => byPeriod.get(number));
  assert.ok(periods.every(period => period.kind === 'assessment'));
  const id = `g12-hkii-${final ? 'final' : 'midterm'}`;
  const title = `Toán 12 Discover - Kiểm tra ${final ? 'cuối' : 'giữa'} học kỳ II`;
  const concepts = final
    ? ['condTable','bayesBox','lineSymmetric','planeParallel','sphereRead','angleLines','totalTree','linePlane','planeDistance','sphereTangent','linePosition','sphereDiameter']
    : ['condSpace','totalRule','planeParallel','normalCross','linePosition','sphereRead','multiply','bayes','planeDistance','angleLinePlane','planeThree','sphereDiameter'];
  assert.ok(concepts.every(key => firstPeriod[key].week < periods[0].week));
  const questions = concepts.map((key,index) => {
    let item = skills[key].make(1000 + index * 31, 'exam');
    if(index<6 && item.evaluation.checkerId==='numeric_exact'){
      const value=item.evaluation.answerKey;
      item=qChoice(item.prompt,`$${exactFraction(value)}$`,[`$${exactFraction(value+1)}$`,`$${exactFraction(value-1)}$`],item.solution,index);
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
  const stem=`tasks/r23-hkii/g12-exams/${id}`;
  save(stem+'.txt',text);save(stem+'.json',exam);
  save(stem+'-solutions.txt',['CHỈ DÀNH CHO GIÁO VIÊN',title,...exam.questions.map(question=>`${question.label} (${question.points} điểm): ${question.solution}${question.rubric?'\n'+question.rubric:''}`)].join('\n\n')+'\n');
  return {id,title,grade:12,semester:2,week:periods[0].week,sourcePeriodIds:periods.map(period=>period.id),periods:periodNumbers,minutes:80,mode:'exam',status:'draft',verification:'teacher_review_required',requiresTeacherReview:true,
    files:{questionText:stem+'.txt',teacherSolutions:stem+'-solutions.txt',normalizedExam:stem+'.json'},conceptIds:concepts,
    notes:['Đề và ma trận do tác giả đề xuất theo nội dung đã học; không phải đề chính thức trong nguồn.','GV duyệt lịch, thời lượng, đề, đáp án và hướng dẫn chấm trước khi mở phòng kiểm tra.']};
}
mkdirSync(new URL('tasks/r23-hkii/g12-exams/',root),{recursive:true});
const exams=[buildExam(false),buildExam(true)];
const coverage=grade.lessons.map(period=>{
  const entry=lessonEntries.find(item=>item.sourcePeriodId===period.id),exam=exams.find(item=>item.sourcePeriodIds.includes(period.id));
  assert.equal(Number(Boolean(entry))+Number(Boolean(exam)),1,period.id);
  return {sourcePeriodId:period.id,period:period.period,week:period.week,sourceKind:period.kind,effectiveKind:period.effective_kind,outputId:entry?.pkg.id||exam.id,mode:exam?'exam':entry.kind==='elective'?'game':'lesson'};
});
assert.equal(lessonEntries.length,152);assert.equal(coverage.length,156);
assert.equal(lessonEntries.filter(entry=>entry.kind==='elective').length,39);
for(const entry of lessonEntries){assert.equal(entry.pkg.contentHash,hashPackage(entry.pkg));assert.equal(validateLessonPackage(entry.pkg).ok,true);}
const practiceBank=Object.entries(skills).map(([id,spec],index)=>({id,title:spec.title,introducedByPeriodId:firstPeriod[id].id,introducedWeek:firstPeriod[id].week,sample:spec.make(3000+index,'practice')}));
const summary={periodRows:156,lessonPackages:152,electiveGames:39,examPeriods:4,examFiles:2,concepts:Object.keys(skills).length,tasks:lessonEntries.reduce((sum,entry)=>sum+entry.pkg.tasks.length,0)};
save('content/lessons/hkii-2026-g12.json',{format:'r23-grade-content-v1',grade:12,semester:2,programme:'Discover',schoolYear:'2026-2027',firstWeek:19,lastWeek:35,cutoff:grade.cutoff,entries:lessonEntries,exams,summary,coverage});
save('tasks/r23-hkii/g12-coverage.json',{summary,cutoff:grade.cutoff,coverage});save('tasks/r23-hkii/g12-solutions.json',teacherSolutions);save('tasks/r23-hkii/g12-practice-bank.json',practiceBank);
console.log(JSON.stringify(summary));
export {skills,firstPeriod};
