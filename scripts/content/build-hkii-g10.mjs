import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { assembleHkiiPackage } from './hkii-package.mjs';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';
import { normalizeExamInput } from '../../lib/exam/validate.js';
import { parseExamLines } from '../../lib/exam/parse.js';
import { automatic, automaticChecks } from '../../tasks/r23-hkii/g10-auto-bank.mjs';

const root = new URL('../../', import.meta.url), R = String.raw;
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const ppct = read('tasks/r23-hkii/ppct-hkii.json').grades.find(g => g.grade === 10);
const units = read('tasks/r22/unit-objectives.json').units.filter(u => u.grade === 10);
const unitByConcept = {sets:'r22-g10-u1-lo01',mean:'r22-g10-u2-lo03',dot:'r22-g10-u2-lo01',
  function:'r22-g10-u2-lo04',monotonic:'r22-g10-u2-lo05',linegeneral:'r22-g10-u2-lo06',lineparam:'r22-g10-u2-lo06',lineconvert:'r22-g10-u2-lo06'};
const unitLO = id => units.flatMap(unit => unit.sourceLOexact.map(lo => ({...lo,unit}))).find(lo => lo.id === id);
const write = (path, value) => writeFileSync(new URL(path, root), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
let mathematicalChecks = 0;
const equal = (actual, expected) => { assert.deepEqual(actual, expected); mathematicalChecks++; };
const close = (actual, expected) => { assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8); mathematicalChecks++; };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sum = xs => xs.reduce((a, b) => a + b, 0);
const factorial = n => n < 2 ? 1 : n * factorial(n - 1);
const choose = (n, k) => factorial(n) / factorial(k) / factorial(n - k);
const subsets = (n, k) => range(0, 2 ** n - 1).filter(mask => [...mask.toString(2)].filter(x => x === '1').length === k);
const pairs = n => range(1, n).flatMap(i => range(1, n).filter(j => j !== i).map(j => [i, j]));
const polyPower = (a, n) => { let p = [1]; for (let i = 0; i < n; i++) { const q = Array(p.length + 1).fill(0); p.forEach((v, j) => { q[j] += v * a; q[j + 1] += v; }); p = q; } return p; };
const open = (prompt, solution, hints, criteria) => ({ type: 'open', prompt, solution, hints,
  evaluation: { rubric: { criteria, lookFor: [solution] } } });
const bank = {};
function concept(id, title, statement, teach, error, hints, make) {
  assert.equal(hints.length, 4);
  bank[id] = { title, statement, teach, error, make(seed, difficulty) {
    const q = make(seed, difficulty);
    return open(q.prompt, q.solution, hints, q.criteria || ['Lập đúng mô hình, điều kiện và cách tính được hỏi.', 'Kết quả, giải thích và bước kiểm tra phù hợp với dữ kiện.']);
  } };
}
const k = seed => 2 + seed % 11;

concept('sets', 'Giao, hợp và hiệu hai tập hữu hạn', 'Tìm giao, hợp, hiệu hai tập hữu hạn và kiểm phần tử được nhận.',
  'GV vẽ hai miền trên bảng trắng; HS đặt phần tử chung trước, sau đó mới đặt phần riêng. Chốt hợp không lặp phần tử; hiệu giữ đúng thứ tự hai tập.',
  'Đổi A trừ B thành B trừ A.', ['Liệt kê phần tử từng tập.', 'Khoanh phần tử có trong cả hai tập.', 'Với hiệu, bắt đầu từ tập đứng trước.', 'Kiểm từng phần tử của kết quả bằng điều kiện thuộc và không thuộc.'], s => {
    const a = k(s), A = [a, a + 1, a + 3], B = [a + 1, a + 2, a + 3];
    equal(A.filter(x => B.includes(x)), [a + 1, a + 3]); equal(A.filter(x => !B.includes(x)), [a]);
    return { prompt: R`Cho $A=\{${A.join(';')}\}$, $B=\{${B.join(';')}\}$. Tìm $A\cap B$, $A\cup B$, $A\setminus B$. Vì sao không đổi thứ tự khi tính hiệu?`,
      solution: R`Giao $\{${a + 1};${a + 3}\}$; hợp $\{${a};${a + 1};${a + 2};${a + 3}\}$; $A\setminus B=\{${a}\}$, còn $B\setminus A=\{${a + 2}\}$. Hiệu chọn phần thuộc tập trước nhưng không thuộc tập sau.` };
  });
concept('mean', 'Trung bình và trung vị', 'Tính trung bình, trung vị của mẫu nhỏ và phân biệt ảnh hưởng của giá trị lớn.',
  'GV viết dữ liệu chưa sắp; HS giữ mọi lần lặp khi sắp tăng. Chốt trung bình theo tổng, trung vị theo vị trí.', 'Bỏ giá trị lặp khi tính trung bình.',
  ['Đếm đủ số quan sát.', 'Sắp mẫu để tìm vị trí giữa.', 'Tổng phải gồm mọi lần xuất hiện.', 'Kiểm trung bình nằm giữa giá trị nhỏ nhất và lớn nhất.'], s => {
    const a = k(s), data = [a + 6, a, a + 2, a + 2, a + 5], sorted = [...data].sort((x, y) => x - y);
    equal(sum(data) / 5, a + 3); equal(sorted[2], a + 2);
    return { prompt: R`Số phút đọc của năm lượt quan sát là $${data.join(';')}$. Tính trung bình, trung vị. Nếu riêng giá trị lớn nhất tăng thêm 10 phút thì mỗi đại lượng đổi thế nào?`,
      solution: R`Mẫu sắp $${sorted.join(';')}$. Trung bình $${a + 3}$ phút, trung vị $${a + 2}$ phút. Tăng giá trị lớn nhất thêm 10 làm trung bình tăng $10/5=2$ phút, trung vị giữ nguyên.` };
  });
concept('dot', 'Tích vô hướng theo tọa độ', 'Tính tích vô hướng và dùng điều kiện khác không để xét vuông góc.',
  'GV viết hai vectơ theo từng cột tọa độ; nhân các thành phần cùng vị trí rồi cộng. Chốt hai vectơ khác không có tích vô hướng bằng không thì vuông góc.', 'Cộng chéo các thành phần khi tính tích vô hướng.',
  ['Viết rõ hai thành phần mỗi vectơ.', 'Ghép thành phần cùng vị trí.', 'Tính hai tích rồi cộng, giữ dấu.', 'Trước kết luận vuông góc, kiểm cả hai vectơ khác không.'], s => {
    const a = k(s), b = a + 1, u = [a, b], v = [b, -a]; equal(u[0] * v[0] + u[1] * v[1], 0);
    return { prompt: R`Cho $\vec u=(${a};${b})$, $\vec v=(${b};-${a})$. Tính $\vec u\cdot\vec v$, $|\vec u|^2$ và xét hai vectơ có vuông góc không.`,
      solution: R`Tích $${a}\cdot${b}+${b}\cdot(-${a})=0$. $|\vec u|^2=${a * a + b * b}$. Hai vectơ khác không nên vuông góc.` };
  });
concept('function', 'Khái niệm hàm số và điểm trên đồ thị', 'Xác định giá trị hàm số trên miền hữu hạn, nhận biết một điểm thuộc đồ thị.',
  'GV lập bảng hai hàng từ giấy trắng: mỗi đầu vào được ghép đúng một đầu ra. Một đầu ra có thể ghép nhiều đầu vào. Đồ thị gồm các cặp đầu vào, đầu ra.',
  'Cho rằng hai đầu vào có cùng đầu ra thì không phải hàm số.', ['Tìm miền đầu vào đã cho.', 'Thay lần lượt từng đầu vào vào công thức.', 'Điểm thuộc đồ thị phải có tung độ bằng giá trị hàm tại hoành độ.', 'Kiểm điều kiện mỗi đầu vào có đúng một đầu ra; không yêu cầu các đầu ra khác nhau.'], s => {
    const a = k(s), xs = [-2, -1, 0, 1, 2], ys = xs.map(x => x * x + a); equal(ys, [a + 4, a + 1, a, a + 1, a + 4]);
    return { prompt: R`Cho $f(x)=x^2+${a}$ với $D=\{-2;-1;0;1;2\}$. Lập bảng giá trị, ghi các điểm của đồ thị. Hai đầu vào $-1$ và $1$ có cùng đầu ra có làm mất tính hàm số không?`,
      solution: R`Các giá trị theo thứ tự là $${ys.join(';')}$. Đồ thị gồm $${xs.map((x, i) => `(${x};${ys[i]})`).join(',')}$. Đây vẫn là hàm số vì mỗi x trong D chỉ có một giá trị f(x); không bắt buộc đầu ra khác nhau.` };
  });
concept('monotonic', 'Đồng biến và nghịch biến', 'Dùng dấu hiệu so sánh hai giá trị để kết luận biến thiên của hàm bậc nhất trên một khoảng.',
  'GV chọn hai đầu vào bất kỳ x1<x2, so sánh hiệu f(x2)-f(x1). Chốt đồng biến phải đúng cho mọi cặp trong khoảng, không chỉ vài điểm đã thử.',
  'Chỉ thử hai điểm rồi xem đó là chứng minh cho mọi điểm.', ['Gọi hai số bất kỳ với số thứ nhất nhỏ hơn số thứ hai.', 'Viết hiệu hai giá trị hàm số.', 'Tách hiệu đầu vào ra khỏi hệ số.', 'Dấu của hiệu giá trị quyết định cùng chiều hay ngược chiều.'], s => {
    const a = k(s), sign = s % 2 ? -1 : 1, slope = sign * a;
    equal(slope * 7 + 3 - (slope * 2 + 3), slope * 5);
    return { prompt: R`Xét $f(x)=${slope}x+3$ trên $\mathbb R$. So sánh $f(x_1)$ và $f(x_2)$ khi $x_1<x_2$ để kết luận đồng biến hay nghịch biến. Kiểm lại bằng hai điểm có hoành độ 2 và 7.`,
      solution: R`$f(x_2)-f(x_1)=${slope}(x_2-x_1)$ ${slope > 0 ? 'dương' : 'âm'}, nên hàm ${slope > 0 ? 'đồng biến' : 'nghịch biến'} trên $\mathbb R$. Hiệu hai giá trị kiểm bằng $${slope * 5}$. Hai điểm chỉ kiểm minh họa; lập luận với cặp bất kỳ mới đủ.` };
  });
concept('linegeneral', 'Phương trình tổng quát của đường thẳng', 'Viết phương trình đường thẳng qua một điểm với vectơ pháp tuyến đã biết.',
  'GV vẽ đường thẳng đi qua M, đặt vectơ n vuông góc; từ tích vô hướng của n với MX bằng không suy ra phương trình. Chốt hai hệ số của x,y không đồng thời bằng không.',
  'Dùng vectơ chỉ phương làm ngay hai hệ số của phương trình tổng quát.', ['Xác định điểm đã biết và pháp tuyến.', 'Dùng vectơ từ điểm đã biết đến điểm bất kỳ.', 'Tích vô hướng của hai vectơ vuông góc bằng không.', 'Thay tọa độ điểm đã biết để kiểm hằng số.'], s => {
    const h = k(s), t = s % 5 - 2, c = 2 * h + 3 * t; equal(2 * (h + 3) + 3 * (t - 2), c);
    return { prompt: R`Trong Oxy, viết phương trình tổng quát của đường thẳng qua $M(${h};${t})$ có pháp tuyến $\vec n=(2;3)$. Kiểm $N(${h + 3};${t - 2})$ có thuộc đường thẳng không.`,
      solution: R`$2(x-${h})+3(y-(${t}))=0$, hay $2x+3y=${c}$. Thay N thỏa đẳng thức nên N thuộc đường thẳng; $\overrightarrow{MN}=(3;-2)$ vuông góc n.` };
  });
concept('lineparam', 'Phương trình tham số', 'Viết phương trình tham số và kiểm một điểm bằng cùng một giá trị tham số.',
  'GV xuất phát từ M và vẽ một bước theo vectơ chỉ phương u; mọi điểm có dạng M+tu. Nhấn mạnh x và y dùng cùng một tham số.',
  'Dùng hai giá trị tham số khác nhau cho hai tọa độ của một điểm.', ['Ghi điểm gốc và vectơ chỉ phương.', 'Mỗi tọa độ bằng tọa độ gốc cộng t nhân thành phần vectơ.', 'Tìm t từ một phương trình rồi thay vào phương trình còn lại.', 'Không giải riêng hai t rồi ghép một điểm không tồn tại.'], s => {
    const h = k(s), b = s % 5, t = 2 + s % 4; equal((h + 3 * t - h) / 3, t); equal((b - 2 * t - b) / -2, t);
    return { prompt: R`Đường thẳng qua $A(${h};${b})$ có chỉ phương $(3;-2)$. Viết phương trình tham số. Điểm $P(${h + 3 * t};${b - 2 * t})$ tương ứng tham số nào?`,
      solution: R`$\begin{cases}x=${h}+3t\\y=${b}-2t\end{cases},\ t\in\mathbb R$. Cả hai tọa độ của P cho cùng $t=${t}$ nên P thuộc đường thẳng.` };
  });
concept('quadconcept', 'Nhận dạng hàm số bậc hai', 'Xác định hệ số bậc hai khác không và tính giá trị hàm số.',
  'GV khai triển một bình phương có dịch; xác định hệ số x bình phương, x và số hạng tự do. Chốt hệ số bậc hai khác không, dù công thức ban đầu chưa ở dạng chuẩn.',
  'Xem công thức có bình phương nhưng hệ số bậc hai triệt tiêu vẫn là hàm bậc hai.', ['Khai triển trước khi phân loại.', 'Thu gọn theo lũy thừa của x.', 'Kiểm hệ số x bình phương khác không.', 'Thay giá trị vào cả hai dạng công thức để đối chiếu.'], s => {
    const h = k(s), a = 1 + s % 3, b = 2 + s % 4, x = h + 1;
    equal(a * (x - h) ** 2 + b, a * x * x - 2 * a * h * x + a * h * h + b);
    return { prompt: R`Cho $f(x)=${a}(x-${h})^2+${b}$ trên $\mathbb R$. Viết dạng $Ax^2+Bx+C$, giải thích vì sao là hàm bậc hai và tính $f(${x})$.`,
      solution: R`$f(x)=${a}x^2-${2 * a * h}x+${a * h * h + b}$. Hệ số A=${a} khác không. $f(${x})=${a + b}$; thay vào dạng chuẩn cũng được cùng kết quả.` };
  });
concept('quadgraph', 'Đồ thị và biến thiên hàm bậc hai', 'Xác định đỉnh, trục đối xứng, chiều mở và các khoảng biến thiên của parabol.',
  'GV hoàn thành bình phương, đánh dấu đỉnh trên hệ trục mới vẽ. HS chọn các cặp điểm cách đỉnh như nhau; chốt chiều mở theo dấu a và hai khoảng biến thiên.',
  'Đổi dấu sai ở hoành độ đỉnh hoặc cho hàm đồng biến trên toàn trục.', ['Đưa về dạng bình phương của một hiệu.', 'Tìm điểm làm bình phương bằng không.', 'Chọn hai hoành độ đối xứng qua trục để kiểm.', 'Chiều mở quyết định phía nào tăng, phía nào giảm.'], s => {
    const h = k(s), v = s % 7 - 3, a = s % 2 ? -2 : 2;
    equal(a * ((h - 2) - h) ** 2 + v, a * ((h + 2) - h) ** 2 + v);
    return { prompt: R`Vẽ phác đồ thị $y=${a}(x-${h})^2+(${v})$: nêu đỉnh, trục đối xứng, chiều mở; tính giá trị tại $x=${h - 2},${h},${h + 2}$; ghi hai khoảng biến thiên.`,
      solution: R`Đỉnh $I(${h};${v})$, trục $x=${h}$, mở ${a > 0 ? 'lên' : 'xuống'}. Ba tung độ $${4 * a + v};${v};${4 * a + v}$. Trên $(-\infty;${h})$ hàm ${a > 0 ? 'nghịch' : 'đồng'} biến, trên $(${h};+\infty)$ hàm ${a > 0 ? 'đồng' : 'nghịch'} biến.` };
  });
concept('quadapplication', 'Vận dụng đồ thị bậc hai trên miền xác định', 'Tìm giá trị lớn nhất của mô hình bậc hai trong một đoạn có ý nghĩa thực tế.',
  'GV nêu mô hình chiều cao, ghi ngay miền thời gian. HS tìm đỉnh rồi kiểm đỉnh thuộc miền trước khi kết luận; đơn vị thời gian và chiều cao khác nhau.',
  'Chọn đỉnh mà không kiểm miền thời gian của mô hình.', ['Ghi rõ biến và đơn vị.', 'Xác định đỉnh từ dạng bình phương.', 'Kiểm hoành độ đỉnh nằm trong đoạn đang xét.', 'So đỉnh với hai đầu đoạn; kết luận có đơn vị.'], s => {
    const h = 2 + s % 5, v = h * h + 3;
    equal(Math.max(...range(0, 2 * h).map(t => -((t - h) ** 2) + v)), v);
    return { prompt: R`Mô hình độ cao $H(t)=-(t-${h})^2+${v}$ (m), chỉ dùng khi $0\le t\le${2 * h}$ (s). Tìm độ cao lớn nhất và thời điểm đạt được; kiểm độ cao ở hai đầu đoạn.`,
      solution: R`Bình phương không âm nên $H(t)\le${v}$; dấu bằng khi $t=${h}$ s, thuộc miền. Độ cao lớn nhất ${v} m. Hai đầu $H(0)=H(${2 * h})=3$ m. Không suy mô hình ngoài miền đã cho.` };
  });
concept('lineconvert', 'Liên hệ chỉ phương, pháp tuyến và hai dạng phương trình', 'Chuyển giữa phương trình tổng quát và tham số bằng quan hệ vuông góc.',
  'GV lấy n=(a;b) rồi quay thành u=(b;-a), kiểm tích vô hướng bằng không. Dùng một điểm đã biết để viết cả hai dạng, kiểm bằng thế tham số.',
  'Dùng cùng một vectơ vừa làm pháp tuyến vừa làm chỉ phương.', ['Đọc pháp tuyến từ hai hệ số.', 'Tìm vectơ khác không vuông góc với nó.', 'Chọn một điểm thỏa phương trình.', 'Thay biểu thức tham số vào phương trình tổng quát, kết quả phải bằng không với mọi t.'], s => {
    const h = k(s), b = s % 4, c = 2 * h + 3 * b; for (const t of [-3, 0, 4]) equal(2 * (h + 3 * t) + 3 * (b - 2 * t) - c, 0);
    return { prompt: R`Cho $d:2x+3y-${c}=0$ và $A(${h};${b})$. Nêu một pháp tuyến, một chỉ phương; viết phương trình tham số, chứng minh mọi điểm nhận được đều thỏa d.`,
      solution: R`$\vec n=(2;3)$, $\vec u=(3;-2)$ có tích vô hướng 0. $x=${h}+3t,y=${b}-2t$. Thay vào d: $2\cdot${h}+3\cdot${b}-${c}+(6-6)t=0$ với mọi t.` };
  });
concept('linerelative', 'Vị trí tương đối của hai đường thẳng', 'Phân biệt cắt nhau, song song và trùng nhau bằng hệ phương trình.',
  'GV đặt hai phương trình trong cùng hệ; so cả hằng số khi hai pháp tuyến cùng phương. Trường hợp cắt nhau cần tìm điểm rồi thay vào cả hai phương trình.',
  'Thấy hai pháp tuyến cùng phương liền kết luận hai đường thẳng trùng nhau.', ['So hệ số của x và y.', 'Nếu hai cặp hệ số tỉ lệ, tiếp tục so hằng số.', 'Nếu không tỉ lệ, giải hệ để tìm giao điểm.', 'Thay kết quả vào từng phương trình gốc.'], s => {
    const a = k(s), b = s % 5, c = a + b, d = a - b; equal([(c + d) / 2, (c - d) / 2], [a, b]);
    return { prompt: R`Xét $d_1:x+y=${c}$, $d_2:x-y=${d}$, $d_3:2x+2y=${2 * c + 2}$. Xác định vị trí của d1 với d2 và của d1 với d3; tìm giao điểm nếu có.`,
      solution: R`d1 cắt d2 tại $(${a};${b})$ do cộng/trừ hai phương trình. d3 tương đương $x+y=${c + 1}$ nên song song, không trùng d1. Hai cặp hệ số tỉ lệ chưa đủ để kết luận trùng nhau.` };
  });
concept('lineangle', 'Góc giữa hai đường thẳng', 'Tính cos góc không tù giữa hai đường thẳng từ vectơ chỉ phương.',
  'GV vẽ hai đường, chọn góc không tù. Dùng trị tuyệt đối tích vô hướng để kết quả không đổi khi đổi chiều một vectơ chỉ phương.',
  'Bỏ trị tuyệt đối rồi nhận góc tù là góc giữa hai đường thẳng.', ['Chọn chỉ phương của mỗi đường.', 'Tính tích vô hướng và độ dài.', 'Góc giữa hai đường không đổi khi đảo hướng một vectơ.', 'Lấy trị tuyệt đối ở tử; kiểm cos nằm từ không đến một.'], s => {
    const a = k(s), sign = s % 2 ? -1 : 1; close(Math.abs(3 * sign * a) / (a * 5), .6);
    return { prompt: R`Hai đường thẳng có chỉ phương $\vec u=(${a};0)$ và $\vec v=(${3 * sign};4)$. Tính cos góc giữa hai đường. Nếu thay v bằng -v, kết quả có đổi không?`,
      solution: R`$\cos\varphi=|\vec u\cdot\vec v|/(|\vec u||\vec v|)=${3 * a}/(${a}\cdot5)=3/5$. Góc là $\arccos(3/5)$, không tù. Đảo v đổi dấu tích vô hướng nhưng không đổi trị tuyệt đối.` };
  });
concept('distance', 'Khoảng cách từ điểm đến đường thẳng', 'Tính khoảng cách điểm-đường và kiểm ảnh hưởng của việc nhân toàn phương trình.',
  'GV dựng đoạn vuông góc ngắn nhất từ điểm tới đường; chốt tử lấy trị tuyệt đối, mẫu là độ dài pháp tuyến. Nhân phương trình với số khác không không đổi khoảng cách.',
  'Quên trị tuyệt đối, làm khoảng cách âm.', ['Xác định a,b,c đúng dấu.', 'Thay tọa độ điểm vào tử.', 'Mẫu là căn tổng bình phương hai hệ số.', 'Khoảng cách không âm; nhân cả phương trình không được đổi kết quả.'], s => {
    const h = k(s), b = s % 5, r = 2 + s % 4, c = 3 * h + 4 * b - 5 * r;
    equal(Math.abs(3 * h + 4 * b - c) / 5, r);
    return { prompt: R`Tính khoảng cách từ $M(${h};${b})$ đến $d:3x+4y=${c}$ (đơn vị độ dài). Nếu viết d thành $6x+8y=${2 * c}$, hãy tính lại để kiểm.`,
      solution: R`$d(M,d)=|3\cdot${h}+4\cdot${b}-(${c})|/\sqrt{3^2+4^2}=${5 * r}/5=${r}$. Dạng nhân đôi cho tử ${10 * r}, mẫu 10, kết quả vẫn ${r} đơn vị độ dài.` };
  });
concept('quadsign', 'Dấu của tam thức bậc hai', 'Lập bảng dấu tam thức có hai nghiệm phân biệt, ghi rõ dấu tại nghiệm.',
  'GV đánh hai nghiệm trên trục số; thử điểm trong và ngoài để đối chiếu quy tắc cùng dấu hệ số a ở ngoài hai nghiệm. Tại nghiệm giá trị bằng không.',
  'Cho tam thức dương tại cả hai nghiệm.', ['Sắp hai nghiệm theo thứ tự.', 'Chia trục số thành ba khoảng.', 'Theo dõi dấu của từng nhân tử trên mỗi khoảng.', 'Các mốc nghiệm phải ghi giá trị bằng không, không gộp với dấu trong khoảng.'], s => {
    const a = k(s), b = a + 4; equal([a - 1, a + 1, b + 1].map(x => Math.sign((x - a) * (x - b))), [1, -1, 1]);
    return { prompt: R`Lập bảng dấu của $f(x)=(x-${a})(x-${b})$ trên $\mathbb R$. Nêu nơi dương, âm, bằng không và kiểm bằng một giá trị trong mỗi khoảng.`,
      solution: R`Hai nghiệm ${a}<${b}. f dương trên $(-\infty;${a})\cup(${b};+\infty)$, âm trên $(${a};${b})$, bằng0 tại ${a},${b}. Thử ${a - 1},${a + 1},${b + 1} cho dấu +,-,+.` };
  });
concept('quadineq', 'Bất phương trình bậc hai', 'Giải bất phương trình bậc hai bằng bảng dấu, giữ đúng đầu mút.',
  'GV tách việc tìm nghiệm phương trình biên với việc chọn khoảng dấu. Dấu không nghiêm nhận đầu mút, dấu nghiêm loại đầu mút.',
  'Chỉ trả hai nghiệm phương trình thay cho cả tập nghiệm bất phương trình.', ['Đưa về một vế bằng tích hoặc tam thức.', 'Tìm các nghiệm làm mốc.', 'Chọn khoảng có dấu được yêu cầu.', 'Thử một điểm trong khoảng và kiểm riêng hai đầu mút.'], s => {
    const a = k(s), b = a + 5; equal(range(a - 2, b + 2).filter(x => (x - a) * (x - b) <= 0), range(a, b));
    return { prompt: R`Giải $(x-${a})(x-${b})\le0$ trên $\mathbb R$. Sau đó viết nghiệm của bất phương trình cùng vế trái nhưng dấu $<0$. Giải thích sự khác nhau ở đầu mút.`,
      solution: R`Tích âm giữa hai nghiệm, bằng0 tại hai nghiệm. Với dấu không nghiêm, $S=[${a};${b}]$; với dấu nghiêm, $S=(${a};${b})$. Không chỉ liệt kê hai nghiệm biên.` };
  });
concept('radicalequal', 'Phương trình hai căn bậc hai', 'Giải phương trình hai căn bằng nhau và đối chiếu điều kiện xác định.',
  'GV ghi cả hai biểu thức dưới căn không âm trước khi bình phương. Sau khi hai biểu thức bằng nhau, vẫn phải kiểm nghiệm vào điều kiện và phương trình gốc.',
  'Bình phương xong nhận nghiệm làm biểu thức dưới căn âm.', ['Ghi điều kiện của cả hai căn.', 'Hai căn không âm bằng nhau khi các bình phương bằng nhau.', 'Giải phương trình sau bình phương.', 'Thay nghiệm tìm được vào cả hai biểu thức dưới căn.'], (s, d) => {
    const a = k(s), b = d % 2 ? 2 * a + 3 : a - 1, x = a - b, valid = 2 * a - b >= 0;
    equal(x + a, 2 * x + b); equal(valid, d % 2 === 0);
    return { prompt: R`Giải $\sqrt{x+${a}}=\sqrt{2x+${b}}$ trên $\mathbb R$, trình bày điều kiện và kiểm nghiệm sau bình phương.`,
      solution: R`Điều kiện $x\ge-${a}$ và $x\ge-${b}/2$. Bình phương cho $x+${a}=2x+${b}$ nên $x=${x}$. Hai biểu thức dưới căn cùng bằng ${2 * a - b}; ${valid ? `không âm nên nghiệm duy nhất là ${x}` : 'âm nên loại ứng viên, phương trình vô nghiệm'}.` };
  });
concept('radicallinear', 'Phương trình căn bằng biểu thức bậc nhất', 'Giải phương trình căn, loại nghiệm ngoại lai bằng dấu vế phải.',
  'GV khoanh vế phải: căn bậc hai không âm nên vế phải phải không âm. Bình phương tạo phương trình bậc hai; kiểm cả hai ứng viên trong phương trình ban đầu.',
  'Nhận cả hai nghiệm sau bình phương dù một nghiệm làm vế phải âm.', ['Vế căn luôn không âm.', 'Ghi thêm điều kiện cho vế không có căn.', 'Bình phương, tìm các ứng viên.', 'Kiểm dấu vế phải trước rồi thay lại phương trình gốc.'], s => {
    const t = 3 + s % 6, b = 1 + s % 3, a = t * (t - 1) - b, good = b + t, bad = b + 1 - t;
    equal(good + a, (good - b) ** 2); equal(bad + a, (bad - b) ** 2); assert.ok(bad - b < 0); mathematicalChecks++;
    return { prompt: R`Giải $\sqrt{x+${a}}=x-${b}$ trên $\mathbb R$. Tìm mọi ứng viên sau bình phương rồi chỉ rõ nghiệm bị loại.`,
      solution: R`Cần $x\ge${b}$. Đặt $y=x-${b}\ge0$, phương trình bình phương là $y^2-y-${t * (t - 1)}=0=(y-${t})(y+${t - 1})$. Ứng viên x=${good},${bad}; chỉ x=${good} thỏa dấu vế phải, thế lại hai vế cùng ${t}.` };
  });
concept('circle', 'Phương trình đường tròn', 'Lập phương trình từ tâm, bán kính và nhận biết điểm thuộc đường tròn.',
  'GV vẽ tâm I và bán kính; mọi điểm cách I một khoảng R thỏa phương trình bình phương. Chốt bán kính dương và đọc dấu tọa độ tâm từ dạng chuẩn.',
  'Đọc tâm cùng dấu với hằng số trong ngoặc thay vì dấu đối.', ['Ghi tâm và bán kính.', 'Viết tổng hai bình phương độ lệch tọa độ.', 'Vế phải là bình phương bán kính.', 'Thay điểm để kiểm khoảng cách tới tâm.'], s => {
    const h = k(s), b = s % 5 - 2, r = 2 + s % 6; equal((h + r - h) ** 2 + (b - b) ** 2, r * r);
    return { prompt: R`Đường tròn có tâm $I(${h};${b})$, bán kính $R=${r}$. Viết phương trình dạng chuẩn, dạng khai triển; kiểm điểm $A(${h + r};${b})$ thuộc đường tròn.`,
      solution: R`$(x-${h})^2+(y-(${b}))^2=${r * r}$. Khai triển $x^2+y^2-${2 * h}x-(${2 * b})y+(${h * h + b * b - r * r})=0$. Với A, tổng hai bình phương bằng ${r * r} nên thuộc đường tròn.` };
  });
concept('circlepoints', 'Lập đường tròn biết đường kính', 'Dùng trung điểm và độ dài để lập phương trình đường tròn có đường kính cho trước.',
  'GV nối A,B và dựng trung điểm I; bán kính bằng nửa độ dài đường kính. HS thay hai đầu mút vào phương trình để kiểm.',
  'Lấy toàn bộ độ dài đường kính làm bán kính.', ['Tâm là trung điểm hai đầu đường kính.', 'Tính bình phương độ dài AB.', 'Bình phương bán kính bằng một phần tư bình phương đường kính.', 'Cả hai đầu mút phải thỏa phương trình.'], s => {
    const h = k(s), b = s % 4, r = 2 + s % 5; equal(((h + r) - (h - r)) ** 2 / 4, r * r);
    return { prompt: R`Cho $A(${h - r};${b}),B(${h + r};${b})$. Lập phương trình đường tròn đường kính AB. Kiểm A,B thuộc đường tròn và nêu vì sao tâm không phải A.`,
      solution: R`Tâm là trung điểm $I(${h};${b})$, $AB=${2 * r}$ nên $R=${r}$. Phương trình $(x-${h})^2+(y-${b})^2=${r * r}$. A,B đều cách I một bán kính; A là điểm trên đường tròn, không phải tâm.` };
  });
concept('tangent', 'Tiếp tuyến của đường tròn', 'Viết tiếp tuyến tại một điểm trên đường tròn và kiểm bằng khoảng cách tâm-đường.',
  'GV nối tâm với tiếp điểm; tiếp tuyến vuông góc bán kính. Dùng vectơ bán kính làm pháp tuyến của tiếp tuyến rồi kiểm khoảng cách từ tâm bằng R.',
  'Dùng bán kính làm chỉ phương của tiếp tuyến.', ['Kiểm tiếp điểm thuộc đường tròn.', 'Lấy vectơ từ tâm đến tiếp điểm.', 'Vectơ ấy là pháp tuyến của tiếp tuyến.', 'Thay tiếp điểm và kiểm khoảng cách từ tâm để đối chiếu.'], s => {
    const h = k(s), b = s % 4, m = 1 + s % 3, x = h + 3 * m, y = b + 4 * m, c = 3 * h + 4 * b + 25 * m;
    equal(3 * x + 4 * y, c); equal(Math.abs(3 * h + 4 * b - c) / 5, 5 * m);
    return { prompt: R`Cho $(C):(x-${h})^2+(y-${b})^2=${25 * m * m}$ và $M(${x};${y})$. Kiểm M thuộc C, viết tiếp tuyến tại M và kiểm khoảng cách từ tâm tới tiếp tuyến.`,
      solution: R`$\overrightarrow{IM}=(${3 * m};${4 * m})$, bình phương độ dài ${25 * m * m}. Pháp tuyến có thể lấy (3;4), tiếp tuyến $3(x-${x})+4(y-${y})=0$, tức $3x+4y-${c}=0$. Khoảng cách tâm-đường bằng ${5 * m}=R.` };
  });
concept('ellipse', 'Elip và phương trình chính tắc', 'Xác định hai trục, tiêu điểm của elip và kiểm một điểm bằng định nghĩa tổng khoảng cách.',
  'GV vẽ hai tiêu điểm, nói rõ tổng khoảng cách đến chúng không đổi bằng 2a. Với phương trình chính tắc a>b>0, chốt c bình phương bằng a bình phương trừ b bình phương.',
  'Dùng c bình phương bằng tổng hai bình phương bán trục.', ['Xác định mẫu lớn hơn để đọc a.', 'Tìm b, rồi dùng hiệu hai bình phương để tính c.', 'Tiêu điểm nằm trên trục lớn.', 'Tại đỉnh trục nhỏ, dùng định lí Pythagore để kiểm tổng khoảng cách.'], s => {
    const m = 1 + s % 5, a = 5 * m, b = 4 * m, c = 3 * m; equal(a * a - b * b, c * c); equal(2 * Math.hypot(b, c), 2 * a);
    return { prompt: R`Elip $\dfrac{x^2}{${a * a}}+\dfrac{y^2}{${b * b}}=1$. Tìm độ dài hai trục, hai tiêu điểm. Với $M(0;${b})$, kiểm $MF_1+MF_2=2a$.`,
      solution: R`a=${a}, b=${b}, c=${c}. Hai trục dài ${2 * a},${2 * b}; tiêu điểm $(-${c};0),(${c};0)$. M thuộc elip; mỗi khoảng cách bằng $\sqrt{${c * c}+${b * b}}=${a}$, tổng ${2 * a}=2a.` };
  });
concept('addition', 'Quy tắc cộng và sơ đồ nhánh', 'Đếm lựa chọn thuộc các phương án rời nhau bằng quy tắc cộng.',
  'GV vẽ nhánh chọn một trong hai loại vật. Các phương án không giao nhau mới được cộng trực tiếp; chọn đúng một khác chọn mỗi loại một.',
  'Nhân hai số dù chỉ chọn đúng một vật.', ['Xác định phải chọn một vật hay nhiều bước.', 'Kiểm hai nhóm có phần tử chung không.', 'Vẽ một nhánh cho mỗi phương án rời nhau.', 'Đếm lá cuối; mỗi vật chỉ xuất hiện một lần.'], s => {
    const a = k(s), b = 3 + s % 5; equal([...range(1, a).map(i => `A${i}`), ...range(1, b).map(i => `B${i}`)].length, a + b);
    return { prompt: `Có ${a} thẻ xanh khác nhau và ${b} thẻ đỏ khác nhau, hai nhóm không trùng thẻ. Chọn đúng một thẻ. Vẽ sơ đồ nhánh, tính số cách và giải thích vì sao dùng cộng.`,
      solution: `Hai trường hợp rời nhau: chọn một thẻ xanh có ${a} cách hoặc một thẻ đỏ có ${b} cách. Số cách ${a}+${b}=${a + b}. Mỗi lá là một thẻ; không chọn đồng thời cả hai màu.` };
  });
concept('multiplication', 'Quy tắc nhân', 'Đếm một lựa chọn gồm hai bước độc lập bằng quy tắc nhân.',
  'GV vẽ từ mỗi lựa chọn bước đầu các nhánh của bước sau. Cần mỗi bước đầu đều có cùng số lựa chọn bước sau để dùng tích đơn giản.',
  'Cộng số lựa chọn hai bước dù cần thực hiện cả hai.', ['Tách hai bước bắt buộc.', 'Sau mỗi bước đầu còn bao nhiêu cách bước sau?', 'Mỗi kết quả là một cặp có thứ tự theo hai bước.', 'Đếm từng nhóm cặp theo lựa chọn bước đầu.'], s => {
    const a = k(s), b = 2 + s % 4; equal(range(1, a).flatMap(x => range(1, b).map(y => [x, y])).length, a * b);
    return { prompt: `Có ${a} mẫu áo và ${b} mẫu mũ, mọi áo đều ghép được mọi mũ. Chọn một áo cùng một mũ. Tính số bộ; mô tả một sơ đồ cây giải thích phép tính.`,
      solution: `Có ${a} nhánh áo, mỗi nhánh có ${b} lá mũ. Mỗi bộ tương ứng duy nhất một cặp áo-mũ nên có ${a}×${b}=${a * b} bộ.` };
  });
concept('mixedcount', 'Kết hợp quy tắc cộng và nhân', 'Chia trường hợp rời nhau rồi nhân số lựa chọn trong từng trường hợp.',
  'GV vẽ hai tuyến chọn: đi thẳng hoặc trung chuyển. Chốt cộng giữa trường hợp rời nhau, nhân giữa các bước cần cùng thực hiện.',
  'Nhân mọi số trong đề mà không tách trường hợp.', ['Chia các loại hành trình không trùng nhau.', 'Đếm từng loại bằng các bước của nó.', 'Trung chuyển gồm hai chặng bắt buộc.', 'Cộng số hành trình đã đếm ở các loại rời nhau.'], s => {
    const a = k(s), b = 2 + s % 3, c = 3 + s % 4; equal(Array(a).fill(0).length + range(1, b).flatMap(i => range(1, c).map(j => [i, j])).length, a + b * c);
    return { prompt: `Từ A đến B có ${a} tuyến đi thẳng. Nếu qua C, có ${b} tuyến A-C và ${c} tuyến C-B; mọi cặp chặng đều nối được. Chỉ chọn đi thẳng hoặc qua C đúng một lần. Có bao nhiêu hành trình?`,
      solution: `Đi thẳng ${a} cách. Qua C gồm hai chặng nên ${b}×${c}=${b * c} cách. Hai nhóm hành trình rời nhau, tổng ${a + b * c}.` };
  });
concept('permutation', 'Hoán vị', 'Đếm cách xếp toàn bộ các đối tượng phân biệt vào hàng có thứ tự.',
  'GV xếp từng vị trí với số vật còn lại giảm một; chốt mọi vật phân biệt, dùng mỗi vật đúng một lần, thứ tự có ý nghĩa.',
  'Chia cho giai thừa dù các vị trí trong hàng khác nhau.', ['Có bao nhiêu vị trí phải điền?', 'Sau khi điền một vị trí còn bao nhiêu vật?', 'Nhân số cách ở các bước liên tiếp.', 'Đổi hai vật tạo cách xếp mới vì hàng có thứ tự.'], s => {
    const n = 3 + s % 4; let count = 0;
    const visit = remaining => { if (!remaining.length) { count++; return; } remaining.forEach((_, i) => visit(remaining.filter((__, j) => i !== j))); };
    visit(range(1, n)); equal(count, factorial(n));
    return { prompt: `Xếp ${n} cuốn sách khác nhau thành một hàng trên kệ, mỗi cuốn dùng đúng một lần. Tính số cách và giải thích vì sao đổi chỗ hai cuốn tạo cách khác.`,
      solution: `Lần lượt có ${range(1, n).reverse().join(', ')} lựa chọn. Số cách ${n}!=${factorial(n)}. Các vị trí trái-phải phân biệt nên đổi hai cuốn cho một thứ tự khác.` };
  });
concept('arrangement', 'Chỉnh hợp', 'Đếm cách chọn hai người giữ hai vai trò khác nhau, không lặp người.',
  'GV ghi hai ô chức vụ có nhãn khác nhau; chọn ô thứ nhất rồi ô thứ hai trong số còn lại. Chọn nhóm không vai trò sẽ là bài khác.',
  'Chia đôi số cách dù hai chức vụ khác nhau.', ['Hai vai trò có phân biệt không?', 'Người đã nhận vai trò đầu không được chọn lại.', 'Một kết quả là cặp có thứ tự.', 'Kiểm cặp A-B và B-A có làm đổi người giữ từng chức vụ không.'], s => {
    const n = 4 + s % 6; equal(pairs(n).length, n * (n - 1));
    return { prompt: `Từ ${n} học sinh khác nhau chọn một trưởng nhóm và một thư kí; một em không giữ cả hai vai trò. Có bao nhiêu cách phân công? Nếu đổi hai em cho nhau, đó có là phân công mới không?`,
      solution: `Chọn trưởng nhóm ${n} cách, thư kí ${n - 1} cách. Tổng $A_{${n}}^2=${n * (n - 1)}$. Đổi hai em làm đổi vai trò nên là phân công khác.` };
  });
concept('combination', 'Tổ hợp', 'Đếm nhóm không thứ tự và giải thích hệ số loại trùng so với chọn có thứ tự.',
  'GV viết cùng một nhóm theo các thứ tự khác nhau rồi gạch các bản lặp. Nhóm ba người không chức vụ có 3! thứ tự nhưng chỉ là một nhóm.',
  'Tính chỉnh hợp cho một nhóm không có vai trò.', ['Nhóm được hỏi có phân vai hoặc thứ tự không?', 'Đếm có thứ tự trước nếu cần.', 'Mỗi nhóm ba người đã được đếm theo bao nhiêu thứ tự?', 'Chia để mỗi nhóm chỉ còn một lần.'], s => {
    const n = 5 + s % 5; equal(subsets(n, 3).length, choose(n, 3));
    return { prompt: `Chọn một nhóm ba em từ ${n} học sinh khác nhau, không phân chức vụ. Có bao nhiêu nhóm? Giải thích vì sao không lấy ngay ${n}×${n - 1}×${n - 2}.`,
      solution: `Mỗi nhóm bị đếm $3!=6$ thứ tự. Số nhóm $C_{${n}}^3=${n * (n - 1) * (n - 2)}/6=${choose(n, 3)}$. Thứ tự nêu tên không đổi nhóm.` };
  });
for (const degree of [4, 5]) concept(`newton${degree}`, `Nhị thức Newton bậc ${degree}`, `Khai triển nhị thức bậc ${degree} và xác định hệ số theo số lần chọn hạng tử.`,
  `GV viết tích ${degree} thừa số giống nhau. Một số hạng có x mũ j khi chọn x từ j thừa số; hệ số đếm các lựa chọn. Chốt kiểm hệ số đầu và hằng số.`,
  'Dùng hệ số nhị thức nhưng bỏ lũy thừa của hằng số.', ['Xem nhị thức là tích các thừa số giống nhau.', 'Để có x mũ j phải chọn x ở đúng j thừa số.', 'Những thừa số còn lại đóng góp lũy thừa của hằng số.', 'Thay x bằng một giá trị đơn giản để kiểm tổng các số hạng.'], s => {
    const a = 1 + s % 4, coeffs = range(0, degree).map(j => choose(degree, j) * a ** (degree - j));
    equal(polyPower(a, degree), coeffs); equal(sum(coeffs), (1 + a) ** degree);
    return { prompt: R`Khai triển $(x+${a})^{${degree}}$. Nêu hệ số của $x^2$, giải thích cách chọn từ các thừa số và kiểm khai triển tại $x=1$.`,
      solution: R`Theo thứ tự từ hằng số đến $x^{${degree}}$, các hệ số là $${coeffs.join(';')}$. Khai triển $${coeffs.map((c, j) => j ? `${c}x^{${j}}` : c).reverse().join('+')}$. Hệ số $x^2$ là $C_{${degree}}^2${a}^{${degree - 2}}=${coeffs[2]}$. Thay x=1 tổng ${sum(coeffs)} bằng $(${1 + a})^{${degree}}$.` };
  });
concept('samplespace', 'Không gian mẫu và biến cố', 'Liệt kê bằng cặp có thứ tự và đếm số phần tử không gian mẫu, biến cố.',
  'GV vẽ bảng hai lần quay: hàng là lần đầu, cột là lần sau. Hai thứ tự khác nhau là hai kết quả khác nhau; biến cố là tập con được chọn bởi điều kiện.',
  'Gộp hai kết quả đảo thứ tự khi phép thử ghi rõ lần đầu và lần sau.', ['Viết kết quả bằng cặp có thứ tự.', 'Mỗi tọa độ nhận các giá trị nào?', 'Đánh dấu những ô thỏa điều kiện biến cố.', 'Đếm toàn bộ bảng rồi đếm riêng ô được đánh dấu.'], s => {
    const n = 3 + s % 4, all = range(1, n).flatMap(a => range(1, n).map(b => [a, b])), selected = all.filter(([a, b]) => a + b <= n + 1);
    equal(selected.length, n * (n + 1) / 2);
    return { prompt: `Quay hai lần một vòng quay có các nhãn 1 đến ${n}; ghi nhãn lần đầu rồi lần sau. Mô tả không gian mẫu. Biến cố A là tổng hai nhãn không vượt ${n + 1}. Đếm số kết quả toàn bộ và số kết quả thuộc A bằng bảng.`,
      solution: R`$\Omega=\{(i;j):i,j\in\{1,\ldots,${n}\}\}$, có ${n * n} cặp. Với i lần lượt1 đến${n}, số j hợp lệ lần lượt ${range(1, n).reverse().join(',')}; tổng ${selected.length}. Đây là số phần tử biến cố, chưa đồng nghĩa xác suất.` };
  });
concept('probability', 'Định nghĩa cổ điển của xác suất', 'Tính xác suất từ các kết quả sơ cấp đồng khả năng trong phép thử hữu hạn.',
  'GV đánh số từng viên bi để giải thích đồng khả năng của các viên; hai màu không nhất thiết đồng khả năng. Tỉ số dùng số kết quả thuận lợi chia tổng kết quả.',
  'Cho mỗi màu xác suất một phần hai chỉ vì có hai màu.', ['Chọn kết quả sơ cấp là từng vật được đánh số.', 'Đề có bảo đảm chọn đều các vật không?', 'Đếm thuận lợi và toàn bộ trong cùng đơn vị.', 'Xác suất phải nằm từ không đến một; tổng hai màu bằng một.'], s => {
    const r = 2 + s % 5, b = 3 + s % 4, items = [...Array(r).fill('R'), ...Array(b).fill('B')]; close(items.filter(x => x === 'R').length / items.length, r / (r + b));
    return { prompt: `Hộp có ${r} viên đỏ, ${b} viên xanh cùng kích thước, các viên được đánh số. Lấy ngẫu nhiên đều một viên. Tính xác suất lấy đỏ và lấy xanh; giải thích vì sao không mặc định mỗi màu có xác suất một nửa.`,
      solution: R`Gọi R là biến cố lấy đỏ, B là biến cố lấy xanh. Có ${r + b} kết quả sơ cấp đồng khả năng. $P(R)=${r}/${r + b}$, $P(B)=${b}/${r + b}$. Hai xác suất cộng bằng 1; đồng khả năng thuộc về từng viên, không tự thuộc về từng màu.` };
  });
concept('combprob', 'Xác suất dùng tổ hợp', 'Tính xác suất chọn hai vật không hoàn lại có đúng một vật mỗi loại.',
  'GV đánh số các vật, chọn cặp không thứ tự. Mẫu số dùng mọi cặp; tử số chọn một vật mỗi màu. Không trộn mẫu số có thứ tự với tử số không thứ tự.',
  'Lấy mẫu số bằng tổng số viên thay vì số cặp.', ['Kết quả đang là một viên hay một cặp?', 'Hai viên lấy cùng lúc nên không xét thứ tự.', 'Đúng một mỗi màu đòi hỏi một lựa chọn ở từng nhóm.', 'Cả tử và mẫu phải cùng đếm các cặp không thứ tự.'], s => {
    const r = 2 + s % 4, b = 2 + s % 3, n = r + b, all = pairs(n).filter(([i, j]) => i < j), good = all.filter(([i, j]) => i <= r && j > r);
    equal(all.length, choose(n, 2)); equal(good.length, r * b);
    return { prompt: `Hộp có ${r} viên đỏ và ${b} viên xanh phân biệt. Lấy ngẫu nhiên đều một cặp hai viên cùng lúc, không hoàn lại. Tính xác suất cặp có đúng một viên đỏ; giải thích cách đếm tử và mẫu.`,
      solution: R`Tổng số cặp $C_{${n}}^2=${choose(n, 2)}$. Cặp thuận lợi chọn một đỏ và một xanh: ${r}×${b}=${r * b}. Xác suất $${r * b}/${choose(n, 2)}$. Mỗi cặp chỉ đếm một lần.` };
  });
concept('complement', 'Xác suất của biến cố đối', 'Dùng biến cố đối để tính xác suất có ít nhất một vật thuộc loại đã cho.',
  'GV dịch “ít nhất một đỏ” thành đối của “không có đỏ”, tức cả hai xanh. Hai biến cố đối chia hết không gian mẫu, không giao nhau.',
  'Lấy đối của ít nhất một đỏ là ít nhất một xanh.', ['Viết rõ biến cố cần tìm bằng lời.', 'Trường hợp nào khiến biến cố ấy không xảy ra?', 'Tính xác suất biến cố đối với cùng không gian mẫu.', 'Lấy một trừ kết quả; kiểm bằng đếm trực tiếp nếu mẫu nhỏ.'], s => {
    const r = 2 + s % 4, b = 2 + s % 3, n = r + b, all = pairs(n).filter(([i, j]) => i < j), good = all.filter(([i, j]) => i <= r || j <= r);
    equal(good.length, choose(n, 2) - choose(b, 2));
    return { prompt: `Hộp có ${r} viên đỏ và ${b} viên xanh phân biệt. Lấy đều một cặp hai viên, không hoàn lại. Dùng biến cố đối để tính xác suất có ít nhất một viên đỏ; chỉ rõ vì sao “ít nhất một xanh” không phải biến cố đối.`,
      solution: R`Đối là cả hai xanh, có $C_{${b}}^2=${choose(b, 2)}$ cặp. $P=1-${choose(b, 2)}/${choose(n, 2)}=${good.length}/${all.length}$. Cặp một đỏ một xanh thuộc cả hai biến cố “ít nhất một đỏ” và “ít nhất một xanh”, nên chúng không đối nhau.` };
  });

const byPeriod = {
  146:['function'],147:['monotonic'],148:['linegeneral'],149:['lineparam'],152:['function'],153:['monotonic'],154:['linegeneral','lineparam'],
  155:['quadconcept'],156:['quadgraph'],157:['quadconcept','quadgraph'],158:['lineconvert'],159:['lineconvert'],160:['linerelative'],
  163:['quadgraph'],164:['quadgraph'],165:['quadapplication'],166:['linerelative'],167:['lineangle'],168:['distance'],
  171:['quadsign'],172:['quadsign'],173:['quadineq'],174:['quadineq'],175:['lineangle','distance'],176:['lineangle','distance'],177:['quadsign','quadineq'],
  178:['radicalequal'],179:['radicalequal'],180:['circle'],181:['circle'],182:['tangent'],185:['radicallinear'],186:['radicallinear'],187:['circlepoints'],188:['tangent'],189:['circle','tangent'],190:['ellipse'],196:['ellipse'],
  225:['addition'],226:['multiplication'],227:['mixedcount'],228:['permutation'],229:['arrangement'],230:['permutation','arrangement'],233:['combination'],234:['arrangement','combination'],235:['newton4'],236:['newton5'],237:['newton4','newton5'],
  241:['samplespace'],242:['probability'],243:['probability'],244:['combprob'],245:['complement'],246:['combprob','complement'],
  193:['quadgraph','quadineq'],194:['radicalequal','radicallinear'],195:['quadapplication','quadineq'],197:['lineconvert','distance'],198:['tangent','ellipse'],
  201:['function','quadgraph'],202:['quadsign','quadineq'],203:['radicalequal','radicallinear'],204:['linerelative','lineangle'],205:['distance','tangent'],206:['circlepoints','ellipse'],
  209:['quadgraph','quadapplication'],210:['quadsign','quadineq'],211:['radicalequal','radicallinear'],212:['linegeneral','lineparam'],213:['lineangle','distance'],214:['tangent','ellipse'],217:['quadineq','radicallinear'],
  238:['combination','newton5'],249:['combprob','complement'],250:['mixedcount','combination'],251:['newton4','probability'],252:['lineconvert','linerelative'],253:['lineangle','distance'],254:['tangent','ellipse'],
  255:['quadgraph','quadineq'],259:['radicalequal','radicallinear'],260:['combprob','complement'],261:['lineparam','linerelative'],262:['distance','circlepoints'],263:['tangent','ellipse'],266:['quadapplication','combination'],267:['newton5','probability'],268:['combprob','complement'],269:['tangent','ellipse'],
  144:['sets','dot'],145:['mean','sets'],220:['quadineq','radicallinear'],221:['tangent','distance'],222:['ellipse','linerelative'],274:['combprob','complement'],275:['quadgraph','tangent'],276:['combination','newton5'],
};
const additionalHki = {
  proposition:[2,'proposition','Mệnh đề'],implication:[3,'implication','Kéo theo và phản ví dụ'],quantifier:[5,'quantifier','Phủ định lượng từ'],numberSets:[13,'numberSets','Tập số và khoảng'],
  inequality:[31,'inequality','Bất phương trình hai ẩn'],halfplane:[32,'halfplane','Nửa mặt phẳng nghiệm'],system:[33,'system','Hệ bất phương trình hai ẩn'],optimize:[40,'optimize','Tối ưu tuyến tính'],
  trigValue:[4,'trigValue','Giá trị lượng giác'],supplement:[8,'supplement','Góc bù'],cosine:[17,'cosine','Định lí cosin'],sine:[26,'sine','Định lí sin'],areaSin:[28,'areaSin','Diện tích qua góc xen giữa'],heron:[34,'heron','Diện tích Heron'],
  vectorIntro:[50,'vectorIntro','Nhận biết vectơ'],vectorSum:[83,'vectorSum','Tổng vectơ'],vectorDifference:[85,'vectorDifference','Hiệu vectơ'],vectorScale:[93,'vectorScale','Nhân vectơ với một số'],coordinates:[99,'coordinates','Tọa độ vectơ'],coordinateMidpoint:[101,'coordinateMidpoint','Trung điểm'],
  approximation:[81,'approximation','Sai số tuyệt đối'],quartileMode:[88,'quartileMode','Tứ phân vị'],mode:[88,'quartileMode','Mốt'],spread:[90,'spread','Khoảng tứ phân vị'],variance:[90,'variance','Phương sai'],
};
const hkiDrafts=read('content/lessons/hki-2026-g10.json').entries;
for(const [id,[periodNumber,sourceConcept,title]] of Object.entries(additionalHki)){
  const sourcePeriod=ppct.hki_prerequisites.lessons.find(p=>p.period===periodNumber);
  const entry=hkiDrafts.find(e=>e.sourcePeriodId===sourcePeriod.id);
  assert.ok(entry?.conceptIds.includes(sourceConcept),id);assert.equal(entry.pkg.contentHash,hashPackage(entry.pkg));
  const objectiveId=`obj-${entry.conceptIds.indexOf(sourceConcept)+1}`, objective=entry.pkg.objectives.find(o=>o.id===objectiveId);
  const pool=entry.pkg.tasks.filter(t=>t.objectiveIds.includes(objectiveId)&&t.type!=='reflection');
  assert.ok(pool.length>=5);const first=pool[0],lo=objective.metadata.sourceCitation.segmentId;
  if(unitLO(lo))unitByConcept[id]=lo;
  bank[id]={title,statement:objective.statement,teach:entry.pkg.activities.find(a=>['formation','guided'].includes(a.phase)).teacherLookFor,error:first.supportRationale,
    readOnlyReuse:{file:'content/lessons/hki-2026-g10.json',packageId:entry.pkg.id,contentHash:entry.pkg.contentHash,sourceConcept},
    make(seed){const task=pool[seed%pool.length];return {type:task.type,prompt:task.prompt,evaluation:structuredClone(task.evaluation),
      ...(task.inputSchema?{inputSchema:structuredClone(task.inputSchema)}:{}),hints:task.hintIds.map(id=>entry.pkg.hints.find(h=>h.id===id).text),solution:task.metadata.workedSolution};}};
}
const introductions = new Map([
  ['sets', ppct.hki_prerequisites.lessons.find(p => p.period === 15)],
  ['mean', ppct.hki_prerequisites.lessons.find(p => p.period === 82)],
  ['dot', ppct.hki_prerequisites.lessons.find(p => p.period === 107)],
  ...Object.entries(additionalHki).map(([id,[period]])=>[id,ppct.hki_prerequisites.lessons.find(p=>p.period===period)]),
]);
for (const p of ppct.lessons.filter(p => p.kind === 'core')) for (const id of byPeriod[p.period] || []) if (!introductions.has(id)) introductions.set(id, p);
assert.deepEqual([...introductions.keys()].sort(), Object.keys(bank).sort());
const extensions = {
  sets:['Với ba tập A,B,C hữu hạn, giải thích vì sao một phần tử thuộc A giao (B hợp C) cũng thuộc (A giao B) hợp (A giao C).','Phần tử thuộc A và thuộc ít nhất một trong B,C; ghép hai điều kiện cho thấy nó thuộc ít nhất một trong A giao B, A giao C. Chiều ngược dùng cùng lập luận.'],
  mean:['Nếu cộng cùng 3 phút vào mọi giá trị ban đầu, trung bình và trung vị đổi thế nào? Giải thích bằng tổng và vị trí.','Tổng tăng 3n nên trung bình tăng3. Thứ tự không đổi; giá trị giữa hoặc trung bình hai giá trị giữa đều tăng3 nên trung vị cũng tăng3.'],
  dot:['Thay v bằng v+u, hai vectơ u và v+u có còn vuông góc không? Giải thích mà không tính lại từng tọa độ.','Tích u với v+u bằng tích u với v cộng bình phương độ dài u. Tích đầu bằng0, bình phương độ dài u dương, nên không vuông góc.'],
  function:['Một bảng mới gán cùng đầu vào 0 cho hai đầu ra khác nhau 1 và2. Bảng có còn biểu diễn một hàm số không? Phân biệt với việc hai đầu vào có cùng đầu ra.','Không: đầu vào0 không có đầu ra duy nhất. Nhiều đầu vào cùng đầu ra vẫn hợp lệ; một đầu vào hai đầu ra khác nhau thì không.'],
  monotonic:['Tổng một hàm đồng biến và một hàm nghịch biến có nhất thiết đồng biến không? Dùng hai hàm bậc nhất cụ thể để phản biện.','Không. Chọn f(x)=x đồng biến, g(x)=-2x nghịch biến; tổng=-x nghịch biến. Chọn g(x)=-x còn cho tổng hằng0.'],
  linegeneral:['Nhân toàn bộ phương trình vừa lập với -2 có làm đổi đường thẳng không? Chứng minh bằng tập nghiệm.','Không: một biểu thức bằng0 khi và chỉ khi -2 lần biểu thức đó bằng0. Cả hai phương trình có cùng tập điểm, pháp tuyến có thể đổi hướng và độ dài.'],
  lineparam:['Nếu giữ công thức nhưng chỉ cho t không âm, có còn nhận toàn bộ đường thẳng không?','Không; nhận tia xuất phát từ điểm gốc theo hướng vectơ chỉ phương. Các giá trị t âm tạo nửa đường thẳng phía đối diện nên bị loại.'],
  quadconcept:['Trong dạng a(x-h) bình phương cộng b, nếu a bằng0 thì đồ thị thuộc loại nào? Vì sao không còn bậc hai?','Khi a=0, hàm chỉ còn y=b, là hàm hằng với đồ thị đường ngang. Hệ số bậc hai bằng0 nên không đáp ứng định nghĩa hàm bậc hai.'],
  quadgraph:['Giữ đỉnh, đổi dấu hệ số trước bình phương. Nêu thay đổi của chiều mở và hai khoảng biến thiên.','Đồ thị đối xứng qua đường ngang đi qua đỉnh. Chiều mở đảo lại, đồng biến và nghịch biến trên hai phía của đỉnh đổi vai trò; trục đối xứng giữ nguyên.'],
  quadapplication:['Nếu chỉ quan sát từ lúc0 đến một thời điểm dương trước thời điểm đạt đỉnh, độ cao lớn nhất trên đoạn quan sát nằm ở đâu?','Trước đỉnh, độ cao tăng khi thời gian tiến về đỉnh. Trên đoạn quan sát ngắn ấy, lớn nhất ở đầu phải; không được lấy độ cao tại đỉnh nằm ngoài miền quan sát.'],
  lineconvert:['Có thể thay vectơ chỉ phương vừa tìm bằng vectơ không để viết cùng đường thẳng không?','Không. Vectơ chỉ phương phải khác0. Công thức điểm gốc cộng t nhân vectơ0 chỉ tạo một điểm, không tạo đường thẳng.'],
  linerelative:['Hai phương trình có các hệ số x,y tỉ lệ. Cần điều kiện nào nữa để chúng biểu diễn cùng một đường thẳng?','Hằng số cũng phải theo cùng tỉ lệ, với hệ số nhân khác0. Nếu không, hai đường song song phân biệt; nếu có, hai phương trình tương đương.'],
  lineangle:['Công thức cos góc có dùng được nếu một vectơ chỉ phương bằng vectơ không không? Chỉ ra lỗi trong công thức và trong mô hình.','Không. Mẫu chứa độ dài vectơ0 nên bằng0. Vectơ0 không xác định hướng, không được chọn làm chỉ phương của một đường thẳng.'],
  distance:['Tại sao nhân phương trình với -3 giữ khoảng cách, còn nhân với0 thì không thể dùng công thức khoảng cách nữa?','Nhân -3 làm tử tăng3 lần và mẫu tăng3 lần nên tỉ số giữ nguyên. Nhân0 tạo đẳng thức0=0 cho toàn mặt phẳng, không còn đường thẳng; pháp tuyến bằng0 và mẫu bằng0.'],
  quadsign:['So sánh với tam thức (x-1) bình phương: có khoảng âm giữa hai nghiệm không?','Không có hai nghiệm phân biệt. Chỉ có nghiệm kép1; bình phương dương khi x khác1, bằng0 tại1, không có khoảng nào mang dấu âm. Quy tắc có một khoảng âm cần hai nghiệm phân biệt và hệ số đầu dương.'],
  quadineq:['Nếu nhân cả hai vế của bất phương trình đầu với -1, phải đổi dấu thế nào để giữ tập nghiệm?','Dấu nhỏ hơn hoặc bằng đổi thành lớn hơn hoặc bằng. Nhân số âm đảo chiều bất đẳng thức; giữ nguyên chiều sẽ chọn sai miền.'],
  radicalequal:['Kiểm phương trình sqrt(x)=sqrt(2x+1): ứng viên sau bình phương có hợp lệ không?','Bình phương cho x=-1. Nhưng căn x không xác định trên số thực tại-1; phương trình vô nghiệm. Đẳng thức sau bình phương không tự thay điều kiện xác định.'],
  radicallinear:['Nếu một ứng viên sau bình phương làm vế phải bằng0, có phải loại ngay không? Nêu điều kiện kiểm.','Không loại chỉ vì bằng0. Cần biểu thức dưới căn cũng bằng0; khi đó hai vế gốc đều0 và ứng viên hợp lệ. Chỉ vế phải âm mới chắc chắn không bằng căn bậc hai.'],
  circle:['Nếu bình phương bán kính ở vế phải bằng0, tập điểm còn là một đường tròn bán kính dương không?','Không. Hai bình phương không âm có tổng0 khi mỗi bình phương bằng0, nên chỉ có điểm tâm. Đường tròn trong bài yêu cầu R>0.'],
  circlepoints:['Nếu chỉ biết đường tròn đi qua A,B nhưng không biết AB là đường kính, có xác định duy nhất tâm không?','Không. Tâm có thể là mọi điểm trên đường trung trực AB; các điểm ấy cách A,B bằng nhau. Điều kiện AB là đường kính mới buộc tâm là trung điểm AB.'],
  tangent:['Giải thích vì sao đường thẳng qua tiếp điểm và vuông góc bán kính chỉ gặp đường tròn ở đúng một điểm.','Với điểm khác M trên đường đó, tam giác tâm-M-điểm vuông tại M; bình phương khoảng cách tới tâm bằng R² cộng một số dương nên lớn hơn R². Chỉ M thuộc đường tròn.'],
  ellipse:['Nếu hai mẫu trong phương trình chính tắc bằng nhau và dương, tập điểm là gì? Hai tiêu điểm có còn phân biệt không?','Phương trình trở thành x²+y²=a², là đường tròn. c²=a²-b²=0 nên hai tiêu điểm trùng tâm; không còn trường hợp elip có a>b>0 đang xét.'],
  addition:['Nếu hai danh sách lựa chọn có chung đúng2 đối tượng, phép cộng ban đầu cần sửa thế nào?','Tổng hai số lượng đếm hai đối tượng chung hai lần. Số lựa chọn phân biệt bằng tổng trừ2; cần xác nhận đúng hai đối tượng chung, không trừ từng nhóm riêng.'],
  multiplication:['Có2 lựa chọn bước đầu; lựa chọn thứ nhất cho2 cách bước sau, lựa chọn thứ hai cho3 cách. Tính số kết quả và giải thích vì sao không dùng2 nhân3.','Có2+3=5 kết quả. Số cách bước sau phụ thuộc nhánh đầu; dùng2×3 giả sử cả hai nhánh đều có3, gây đếm thừa.'],
  mixedcount:['Nếu bắt buộc đi qua C, phần nào trong phép đếm ban đầu phải bỏ? Giải thích bằng tập các hành trình.','Loại toàn bộ hành trình đi thẳng. Chỉ còn tích số tuyến A-C và C-B, vì mỗi kết quả phải thực hiện cả hai chặng.'],
  permutation:['Nếu trong4 cuốn có đúng2 cuốn không phân biệt,2 cuốn còn lại khác nhau và khác loại ấy, số cách xếp thay đổi thế nào?','Tạm gắn nhãn hai cuốn giống nhau cho4!=24 thứ tự. Bỏ nhãn, mỗi thứ tự thật bị đếm2 lần do đổi hai cuốn giống nhau; còn24/2=12 cách.'],
  arrangement:['Nếu cho phép một người giữ đồng thời hai vai trò, với n người số cách trở thành bao nhiêu?','Vai trò đầu có n cách, vai trò sau vẫn n cách vì cho phép trùng người; số cách n². Điều kiện không lặp người ban đầu mới làm bước sau còn n-1.'],
  combination:['Giải thích vì sao chọn nhóm3 người từ n người tương đương chọn những người không ở trong nhóm đó.','Mỗi nhóm3 người có duy nhất một nhóm bổ sung n-3 người và ngược lại. Đây là song ánh nên số nhóm bằng nhau: C(n,3)=C(n,n-3).'],
  newton4:['Nếu thay dấu cộng giữa hai hạng bằng dấu trừ, dấu các hệ số thay đổi theo quy tắc nào?','Trong (x-a)^4, hệ số x mũ j là C(4,j)(-a) mũ(4-j). Số lần chọn -a chẵn cho dấu dương, lẻ cho dấu âm; không đổi mọi hệ số cùng một dấu.'],
  newton5:['Nếu thay dấu cộng giữa hai hạng bằng dấu trừ, dấu các hệ số thay đổi theo quy tắc nào?','Trong (x-a)^5, hệ số x mũ j là C(5,j)(-a) mũ(5-j). Dấu theo tính chẵn/lẻ của số lần chọn -a; hằng số âm khi a dương.'],
  samplespace:['Nếu bỏ thứ tự hai nhãn, số kiểu cặp có lặp từ n nhãn có còn n² không?','Không. Các cặp khác nhãn gộp hai thứ tự thành một, được n(n-1)/2 kiểu; cộng n kiểu trùng nhãn, tổng n(n+1)/2. Các kiểu mới không nhất thiết đồng khả năng.'],
  probability:['Nếu các viên có xác suất được chọn khác nhau, chỉ biết số viên mỗi màu có đủ tính xác suất theo tỉ số vừa dùng không?','Không. Tỉ số số kết quả thuận lợi trên tổng kết quả dùng khi kết quả sơ cấp đồng khả năng. Khi xác suất khác nhau, cần biết xác suất của từng viên hoặc quy luật chọn.'],
  combprob:['Nếu lấy lần lượt hai viên và hoàn lại sau lần đầu, với r viên đỏ,b viên xanh xác suất đúng một đỏ được tính thế nào?','Hai thứ tự đỏ-xanh và xanh-đỏ rời nhau. Mỗi thứ tự có xác suất rb/(r+b)², tổng2rb/(r+b)². Mẫu số tổ hợp không hoàn lại của bài gốc không áp dụng.'],
  complement:['Phân biệt ít nhất một đỏ với đúng một đỏ; các kết quả nào tạo phần chênh lệch?','Phần chênh là các cặp có cả hai đỏ, đếm bằng C(r,2). Vì không hoàn lại, xác suất chênh bằng C(r,2)/C(r+b,2), có thể bằng0 khi không đủ hai viên đỏ.'],
};
for(const id of Object.keys(additionalHki))extensions[id]=['Giải thích cơ sở của cách làm, rồi nêu một bước kiểm tra kết quả bằng kiến thức đã học.',bank[id].teach];
assert.deepEqual(Object.keys(extensions).sort(),Object.keys(bank).sort());
assert.deepEqual(Object.keys(automatic).sort(),Object.keys(bank).sort());
let electiveIndex = 0;
const solutionRows = [];
function buildPeriod(period) {
  const eligible = [...introductions].filter(([, intro]) => intro.week < period.week).map(([id]) => id);
  const hki = ['sets','mean','dot',...Object.keys(additionalHki)], hkii = eligible.filter(id => !hki.includes(id));
  const ids = period.kind === 'elective' ? [hki[electiveIndex % hki.length], hkii.length ? hkii[(electiveIndex * 3) % hkii.length] : hki[(electiveIndex + 1) % hki.length]] : byPeriod[period.period];
  if (period.kind === 'elective') electiveIndex++;
  assert.ok(ids?.length && ids.length <= 2 && new Set(ids).size === ids.length, period.id);
  const concepts = ids.map(id => ({...bank[id],statement:period.kind==='elective'?automatic[id].target:bank[id].statement}));
  const sourceFor = i => {
    const lo = unitLO(unitByConcept[ids[i]]);
    return lo ? {segmentId:lo.id,quote:lo.statement,origin:'adapted'} :
      { segmentId: introductions.get(ids[i]).id, quote: introductions.get(ids[i]).source.content.cached, origin: 'generated' };
  };
  const solutions = [];
  const makeTask = (i, phaseIndex, branch, difficulty, offset = 0) => {
    const seed=period.sequence * 131 + phaseIndex * 23 + i * 17 + offset;
    const original=concepts[i].make(seed,difficulty);
    const auto=period.kind==='elective'&&[0,2,3,4].includes(phaseIndex);
    const { solution, ...question } = auto ? {
      ...automatic[ids[i]].make(seed),
      hints: ['Xác định đại lượng hoặc điều kiện câu hỏi trước.', 'Thay dữ kiện vào định nghĩa hoặc công thức phù hợp.', 'Kiểm lại kết quả bằng phép tính hoặc lựa chọn khác.', 'Nêu điều kiện để kết quả có ý nghĩa.'],
    } : original;
    if(branch==='extension'&&question.type==='closed'){
      question.type='open';delete question.inputSchema;question.evaluation={rubric:{criteria:['Giải đúng bài toán và giải thích được cách làm.'],lookFor:[solution]}};
    }
    // Recheck must remain a genuinely separate prompt even when a concept's
    // deterministic generator repeats the same seed-independent wording.
    if (phaseIndex === 3) question.prompt = `Câu kiểm tra lại độc lập: ${question.prompt}`;
    if(branch==='support') question.prompt += ` Em có thể chia bài thành từng bước: ${question.hints.slice(0,3).join(' ')}`;
    if(branch==='extension') {
      question.prompt += ` Mở rộng: ${extensions[ids[i]][0]}`;
      question.evaluation.rubric.criteria.push('Giải thích đúng tình huống thay đổi hoặc điều kiện giới hạn, có lập luận.');
    }
    if (period.kind === 'assessment_feedback') {
      question.prompt += ` Một bài làm minh họa mắc lỗi: “${concepts[i].error}” Em chỉ ra cách sửa; đây không phải dữ liệu bài kiểm tra thật của lớp.`;
      question.evaluation.rubric.criteria.push('Giải thích được lỗi minh họa và một bước tự kiểm, không chỉ chép đáp số.');
    }
    const teacherSolution = `Lời giải: ${solution}` + (branch==='extension'?` Mở rộng: ${extensions[ids[i]][1]}`:'') + (period.kind === 'assessment_feedback' ? ` Cách sửa: ${concepts[i].teach}` : '');
    if(question.evaluation.rubric)question.evaluation.rubric.lookFor=[teacherSolution];
    solutions.push({ conceptId: ids[i], activityIndex: phaseIndex, branch, prompt: question.prompt, solution: teacherSolution });
    return { ...question, minutes: 2, objectiveIndexes: [i], source: sourceFor(i), branch,
      isCore: !['support','extension'].includes(branch), requiresFullScaffold: true, supportRationale: concepts[i].error };
  };
  const activity = (phase, minutes, i, participation, studentAction, teacherLookFor, tasks, budgetRole = 'core') => ({ phase, minutes, participation,
    objectiveIndexes: ids.map((_, n) => n), studentAction, teacherLookFor, source: sourceFor(0), budgetRole,
    expectedProduct: 'Bài làm của từng em trong vở và câu trả lời riêng; GV đối chiếu cách làm theo từng mục tiêu.',
    transition: 'GV yêu cầu dừng nhập, giữ bài trong vở, chỉ chuyển câu khi được hướng dẫn.', tasks: concepts.flatMap((_, n) => tasks(n)) });
  const activities = [
    activity('experience',4,0,'individual','Từ màn chờ, em đọc câu được giao, làm nháp trong vở rồi nộp câu trả lời riêng.',
      'Bắt đầu với bảng trắng, TV và thiết bị HS ở màn chờ. GV viết dữ kiện ngay trong tiết, đọc yêu cầu, quan sát cách làm. Chưa công bố đáp án hoặc xếp loại qua điểm game.', i => [makeTask(i,0,'shared',0)]),
    activity(period.kind === 'core' ? 'formation' : 'guided',8,1,'whole_class','Em dựng bảng, hình hoặc phép tính trong vở cùng thầy/cô; giải thích một bước trước khi ghi kết luận.',
      concepts.map(c => c.teach).join('\n'), i => [makeTask(i,1,'shared',1)]),
    activity('practice',10,2,'individual','Em làm tuyến thầy/cô giao: hỗ trợ hoặc cơ bản. Khi vướng, mở từng gợi ý; không phải làm cả hai tuyến.',
      `GV dựa vào bài mở đầu để giao tuyến. Gợi ý không trừ điểm; giữ đủ thời gian kiểm tra lại. Lỗi cần quan sát: ${concepts.map(c => c.error).join(' ')}`,
      i => [makeTask(i,2,'support',0),makeTask(i,2,'core',1,57)]),
    activity('recheck',6,3,'individual','Em làm câu mới một mình, tạm dừng trao đổi, ghi bước kiểm vào vở trước khi nộp.',
      'Câu kiểm tra lại có dữ kiện khác câu luyện. Bài mở chờ GV đọc lập luận; không coi chưa có minh chứng là chưa đạt. Ghi riêng việc đã dùng gợi ý.', i => [makeTask(i,3,'shared',2)]),
    activity('exit',5,4,'individual','Em hoàn thành phiếu cuối tiết độc lập, không dùng bài của người khác.',
      'Phiếu cuối tiết là minh chứng riêng cho từng mục tiêu. Chỉ ghi nhận sau khi kiểm lời giải; không thay bằng điểm nhóm, tốc độ hoặc vị trí trên bản đồ.', i => [makeTask(i,4,'shared',3)]),
    activity('practice',4,5,'individual','Nếu đã hoàn thành hai lượt kiểm tra và được thầy/cô giao thêm, em giải thử câu mở rộng. Nếu chưa, em sửa bước còn vướng.',
      'Mở tuyến mở rộng sau recheck và exit, chỉ khi GV xác nhận sẵn sàng. Có thể bỏ cả hoạt động; không để sự kiện game lấn giờ chốt.', i => [makeTask(i,5,'extension',4)],'optional'),
    activity('reflection',3,6,'individual','Em ghi một bước tự kiểm sẽ dùng lần sau rồi đưa thiết bị về màn chờ.',
      'Dự phòng 3 phút cho mất mạng, đổi thiết bị, giải thích lại. Khi lỗi mạng, GV đọc câu hiện tại, HS làm trong vở; không cần bảng chuẩn bị sẵn.',
      i => [{ type:'reflection',prompt:`Với ${concepts[i].title.toLowerCase()}, em chọn một bước cần tự kiểm và ghi cách kiểm vào vở.`,minutes:1,
        objectiveIndexes:[i],source:sourceFor(i),branch:'shared',isCore:false,hints:['Nhìn lại bước em vừa tự sửa.'],
        evaluation:{rubric:{criteria:['Nêu một bước và cách tự kiểm phù hợp.'],lookFor:['Ghi chú tự học; không dùng làm minh chứng đạt mục tiêu.']}} }], 'reserve'),
  ];
  const sourcePeriods = [...new Set(ids.map(id => introductions.get(id)))];
  const unitReferences=[...new Set(ids.map(id=>unitByConcept[id]).filter(Boolean))].map(id=>{const lo=unitLO(id);return {id,...lo.reference,hash:lo.unit.sourceSha256};});
  const entry = assembleHkiiPackage({ period, sourcePeriods, unitReferences, title:`${period.kind === 'elective' ? 'Game ôn tập tích lũy' : period.topic} - ${concepts.map(c => c.title).join(' / ')} - tiết ${period.period}`,
    slotMinutes:40,prerequisites:ids.map(id => `Đối chiếu phần đã học tại ${introductions.get(id).source.content.ref}; GV dùng câu đầu để xác định phần cần nhắc.`),
    outline:{format:'lesson-outline-v1',essentialQuestion:concepts.map(c => c.statement).join(' '),
      objectives:concepts.map((c,i) => ({statement:c.statement,code:`r23-g10-p${period.period}-${ids[i]}`,level:'must',source:sourceFor(i)})),activities,
      uncertainties:['AUTHOR_OBJECTIVES_ALIGNED_TO_CITED_UNIT_OR_PPCT_NOT_OFFICIAL_CODES',...(ids.some(id=>!unitByConcept[id])?['PPCT_DERIVED_OBJECTIVES_REQUIRE_TEACHER_REVIEW']:[]),...(period.kind==='assessment_feedback'?['ILLUSTRATIVE_ERRORS_NOT_ACTUAL_CLASS_RESULTS']:[])]} });
  let cursor = 0;
  for (let ai=0;ai<6;ai++) for(let ti=0;ti<activities[ai].tasks.length;ti++) {
    const taskId=`task-${ai+1}-${ti+1}`, row=solutions[cursor++]; row.taskId=taskId;
    entry.pkg.tasks.find(t=>t.id===taskId).metadata.workedSolution=row.solution;
  }
  entry.pkg.contentHash=hashPackage(entry.pkg);
  assert.ok(validateLessonPackage(entry.pkg,{mode:'draft'}).ok,period.id);
  assert.equal(entry.pkg.budget.slotMinutes,40); assert.ok(entry.pkg.budget.reserveMinutes>=3);
  for(const objective of entry.pkg.objectives) for(const phase of ['recheck','exit']) {
    assert.ok(entry.pkg.evidenceRules.some(e=>e.objectiveIds.includes(objective.id)&&e.kind===(phase==='recheck'?'individual_recheck':'exit')&&e.individual&&e.countsForMastery));
  }
  for(const i of ids.keys()) {
    const evidence=solutions.filter(x=>x.conceptId===ids[i]&&[3,4].includes(x.activityIndex));
    assert.equal(new Set(evidence.map(x=>x.prompt)).size,2);
  }
  entry.conceptIds=ids; entry.sourceDetail=period.detail; entry.teacherSolutions=solutions;
  entry.objectiveSourceCoverage=ids.map(id=>({conceptId:id,introducedBy:introductions.get(id).id,contentCell:introductions.get(id).source.content.ref,
    sourceLOId:unitByConcept[id]||null,basis:unitByConcept[id]?'source_unit_overview_aligned_with_current_ppct':'author_derived_from_ppct_detail',
    ...(bank[id].readOnlyReuse?{readOnlyReuse:bank[id].readOnlyReuse}:{})}));
  entry.requiresTeacherReview=true; entry.reviewStatus='teacher_review_required';
  entry.purpose=period.kind==='core'?'formation':period.kind==='elective'?'practice':'review';
  if(period.kind==='elective') {
    assert.ok(ids.every(id=>introductions.get(id).week<period.week));
    entry.cumulativeScope={eligibleConceptIds:eligible,selectedConceptIds:ids,sameWeekTeacherConfirmationRequired:false,
      sourcePeriodIds:[...new Set(eligible.map(id=>introductions.get(id).id))],
      eligibleSourcePeriodIds:[...new Set(eligible.map(id=>introductions.get(id).id))],
      latestSourceWeek:Math.max(...eligible.map(id=>introductions.get(id).week)),
      selectedSourcePeriodIds:[...new Set(ids.map(id=>introductions.get(id).id))],
      assessmentScope:'Auto-checked evidence supports the two explicitly narrow game objectives only; it does not certify full-topic reasoning or the entire eligible bank.',
      rule:'previous_weeks_only',description:'Một lượt 40 phút luyện hai mục tiêu được chọn từ nội dung đã học ở các tuần trước, gồm kiến thức HKI. Không xem lượt chơi là kiểm tra toàn bộ kiến thức tích lũy.'};
    entry.cumulativeBank=eligible.map((id,index)=>({conceptId:id,title:bank[id].title,introducedBy:introductions.get(id).id,
      question:automatic[id].make(period.sequence*71+index*19),assessedSkill:automatic[id].target,use:'teacher_bank_not_all_questions_in_one_round'}));
  }
  solutionRows.push(...solutions.map(s=>({packageId:entry.pkg.id,...s})));
  return entry;
}

function mc(text, labels, index, solution) { assert.equal(new Set(labels).size,4); return {type:'mc',points:.25,text,options:['A','B','C','D'],choiceText:Object.fromEntries(labels.map((v,i)=>['ABCD'[i],v])),key:'ABCD'[index],solution:`Lời giải: ${solution}`}; }
const short = (text, key, solution) => ({type:'short',points:.5,text,key:{accept:[String(key)]},solution:`Lời giải: ${solution}`});
const essay = (text, solution, rubric) => ({type:'essay',points:2,text,solution,rubric});
function buildExam(final) {
  const id=`r23-g10-hkii-${final?'final':'midterm'}`, title=`Toán 10 Discover - Kiểm tra ${final?'cuối':'giữa'} học kỳ II`, week=final?37:31;
  const periods=ppct.lessons.filter(p=>p.kind==='assessment'&&p.week===week); assert.equal(periods.length,2);
  const multi=final?[
    mc('Chọn một vật trong 4 bút khác nhau hoặc 3 vở khác nhau. Số cách:', ['$7$','$12$','$4$','$3$'],0,'Hai nhóm vật rời nhau, chọn đúng một: 4+3=7.'),
    mc('Xếp 4 cuốn sách khác nhau vào hàng. Số cách:', ['$4$','$16$','$24$','$12$'],2,'4!=24 cách xếp có thứ tự.'),
    mc('Chọn trưởng nhóm và thư kí khác người từ 5 em. Số cách:', ['$10$','$20$','$25$','$5$'],1,'Hai vai trò khác nhau: 5×4=20.'),
    mc('Chọn nhóm 2 em không phân vai từ 6 em. Số nhóm:', ['$30$','$12$','$36$','$15$'],3,'C6^2=6×5/2=15.'),
    mc(R`Hệ số của $x^2$ trong $(x+1)^4$ là:`, ['$4$','$6$','$1$','$12$'],1,'Chọn x từ hai trong bốn thừa số: C4^2=6.'),
    mc(R`Đỉnh của $y=(x-2)^2+3$ là:`, ['$(-2;3)$','$(2;-3)$','$(2;3)$','$(3;2)$'],2,'Bình phương nhỏ nhất bằng0 tại x=2, y=3.'),
    mc(R`Bán kính của $(x-1)^2+(y+2)^2=25$ là:`, ['$25$','$5$','$10$','$-5$'],1,'R>0 và R²=25 nên R=5.'),
    mc('Biến cố đối của “hai viên lấy ra có ít nhất một viên đỏ” là:', ['Có ít nhất một viên xanh.','Có đúng một viên đỏ.','Cả hai viên đều không đỏ.','Cả hai viên đều đỏ.'],2,'Không có viên đỏ nào chính là phủ định của có ít nhất một đỏ.'),
  ]:[
    mc(R`Giá trị $f(3)$ với $f(x)=2x+1$ là:`, ['$5$','$7$','$6$','$8$'],1,'2×3+1=7.'),
    mc(R`Hàm $y=-3x+2$ trên $\mathbb R$:`, ['Đồng biến.','Nghịch biến.','Không đổi.','Chỉ xác định khi x>0.'],1,'Với x2>x1, hiệu giá trị là -3(x2-x1)<0.'),
    mc(R`Đỉnh của $y=(x-3)^2-2$ là:`, ['$(3;-2)$','$(-3;-2)$','$(3;2)$','$(-2;3)$'],0,'Dạng bình phương cho đỉnh (3;-2).'),
    mc(R`Một pháp tuyến của $2x-3y+1=0$ là:`, ['$(3;2)$','$(2;-3)$','$(2;3)$','$(1;1)$'],1,'Pháp tuyến đọc từ hai hệ số x,y.'),
    mc(R`Với $x=1+2t,y=3-t$, khi $t=2$ điểm nhận được là:`, ['$(3;2)$','$(5;5)$','$(5;1)$','$(2;1)$'],2,'Cùng t=2 cho x=5, y=1.'),
    mc(R`Nghiệm của $(x-1)(x-4)<0$ là:`, ['$[1;4]$','$(1;4)$','$(-\infty;1)$','$(4;+\infty)$'],1,'Tích âm giữa hai nghiệm, không lấy hai đầu mút.'),
    mc(R`Tâm đường tròn $(x-2)^2+(y+1)^2=9$ là:`, ['$(-2;1)$','$(2;1)$','$(2;-1)$','$(-1;2)$'],2,'Tâm (2;-1), bán kính3.'),
    mc(R`Elip $x^2/25+y^2/16=1$ có c bằng:`, ['$9$','$3$','$41$','$5$'],1,'c²=25-16=9, c=3.'),
  ];
  const tf=final?[
    {type:'tf',points:1,text:'Hộp có 3 viên đỏ và 2 viên xanh phân biệt. Lấy đều một cặp hai viên cùng lúc, không hoàn lại.',statements:['a','b','c','d'],
      statementText:{a:'Có 10 cặp đồng khả năng.',b:'Có 6 cặp gồm một đỏ và một xanh.',c:'Xác suất cả hai xanh là 2/5.',d:'Xác suất có ít nhất một đỏ là 9/10.'},key:[true,true,false,true],solution:'Tổng C5²=10; một mỗi màu3×2=6; cả hai xanh chỉ C2²=1 cặp nên xác suất1/10; đối là9/10.'},
    {type:'tf',points:1,text:R`Cho $(C):x^2+y^2=25$, $M(3;4)$ và $d:3x+4y=25$.`,statements:['a','b','c','d'],
      statementText:{a:'M thuộc C.',b:'(3;4) là một pháp tuyến của d.',c:'Khoảng cách từ O đến d bằng25.',d:'d tiếp xúc C tại M.'},key:[true,true,false,true],solution:'3²+4²=25; pháp tuyến(3;4); khoảng cách25/5=5=R. M thuộc d nên d là tiếp tuyến tại M.'},
  ]:[
    {type:'tf',points:1,text:R`Cho $f(x)=(x-1)(x-5)$.`,statements:['a','b','c','d'],statementText:{a:'f(1)=0.',b:'f(x)<0 khi1<x<5.',c:'Nghiệm f(x)≤0 là(1;5).',d:'f(6)>0.'},key:[true,true,false,true],solution:'Hai nghiệm1,5; a>0 nên âm trong, dương ngoài; dấu≤ nhận cả hai nghiệm, tập[1;5]. f(6)=5.'},
    {type:'tf',points:1,text:R`Cho $d_1:x+y=4$, $d_2:x-y=2$ và đường tròn $(x-3)^2+(y-1)^2=4$.`,statements:['a','b','c','d'],
      statementText:{a:'Hai đường cắt nhau tại(3;1).',b:'Hai đường song song.',c:'Đường tròn có bán kính2.',d:'Điểm(5;1) thuộc đường tròn.'},key:[true,false,true,true],solution:'Cộng/trừ hệ cho(3;1); hai pháp tuyến không cùng phương. Tâm(3;1), R=2; điểm(5;1) cách tâm2.'},
  ];
  const shorts=final?[
    short('Có3 áo,4 mũ; mỗi áo ghép được mỗi mũ. Chọn một áo và một mũ, có bao nhiêu bộ?',12,'Quy tắc nhân3×4=12.'),
    short(R`Tính hệ số của $x^3$ trong $(x+1)^5$.`,10,'C5^3=10.'),
    short('Quay hai lần vòng quay nhãn1,2,3,4; ghi cặp theo thứ tự. Có bao nhiêu kết quả có tổng bằng5?',4,'Các cặp(1;4),(2;3),(3;2),(4;1), có4.'),
    short(R`Tính khoảng cách từ $O(0;0)$ đến $3x+4y-10=0$.`,2,'Khoảng cách|−10|/sqrt(9+16)=2.'),
  ]:[
    short(R`Tính giá trị nhỏ nhất của $y=(x-2)^2+5$ trên $\mathbb R$.`,5,'Bình phương không âm; dấu bằng tại x=2, giá trị nhỏ nhất5.'),
    short(R`Tính khoảng cách từ $O(0;0)$ đến $3x+4y-15=0$.`,3,'Khoảng cách15/sqrt(9+16)=3.'),
    short(R`Elip $x^2/25+y^2/16=1$ có trục lớn dài bao nhiêu?`,10,'a=5 nên trục lớn2a=10.'),
    short(R`Giải $\sqrt{x+5}=\sqrt{2x+3}$; ghi nghiệm duy nhất.`,2,'Bình phương x+5=2x+3 cho x=2; hai biểu thức dưới căn cùng7≥0.'),
  ];
  const essays=final?[
    essay('Một hộp có4 viên đỏ,3 viên xanh phân biệt. Lấy ngẫu nhiên đều một cặp hai viên cùng lúc, không hoàn lại. Tính xác suất có đúng một viên đỏ và có ít nhất một viên đỏ; giải thích quan hệ giữa hai biến cố này.',
      R`Có $C_7^2=21$ cặp. Đúng một đỏ có4×3=12 cặp nên xác suất12/21=4/7. Ít nhất một đỏ là đối của cả hai xanh, nên $1-C_3^2/C_7^2=1-3/21=6/7$. Biến cố đúng một đỏ là tập con; trường hợp hai đỏ thuộc biến cố sau nhưng không thuộc biến cố trước.`,
      'Không gian mẫu21 cặp:0,4; đúng một đỏ12cặp và4/7:0,6; biến cố đối và6/7:0,6; giải thích quan hệ:0,4.'),
    essay(R`Cho $(C):(x-1)^2+(y+2)^2=25$, $M(4;2)$. Xác định tâm, bán kính; kiểm M thuộc C; viết tiếp tuyến tại M và kiểm bằng khoảng cách từ tâm đến đường vừa lập.`,
      R`I=(1;-2),R=5. IM=(3;4), bình phương độ dài25. Tiếp tuyến $3(x-4)+4(y-2)=0$, tức $3x+4y-20=0$. Khoảng cách I tới đường: $|3-8-20|/5=5=R$.`,
      'Tâm/bán kính:0,4; kiểm tiếp điểm:0,4; pháp tuyến và phương trình tiếp tuyến:0,8; kiểm khoảng cách:0,4.'),
  ]:[
    essay(R`Giải $\sqrt{x+6}=x$ trên $\mathbb R$. Trình bày điều kiện, mọi ứng viên sau bình phương, loại nghiệm ngoại lai và kiểm nghiệm còn lại.`,
      R`Cần x≥0. Bình phương x+6=x², tức(x-3)(x+2)=0; ứng viên3,-2. Loại-2 vì vế phải âm. x=3 cho sqrt9=3 nên nghiệm duy nhất3.`,
      'Điều kiện:0,4; phương trình sau bình phương:0,4; tìm hai ứng viên:0,4; loại-2 có lý do:0,4; kiểm3 và kết luận:0,4.'),
    essay(R`Cho đường tròn $(x-2)^2+(y-1)^2=25$ và $M(5;5)$. Xác định tâm,bán kính; kiểm M thuộc đường tròn; lập tiếp tuyến tại M; kiểm khoảng cách từ tâm tới tiếp tuyến.`,
      R`I=(2;1),R=5; IM=(3;4), 3²+4²=25 nên M thuộc đường tròn. Tiếp tuyến3(x-5)+4(y-5)=0, hay3x+4y-35=0. Khoảng cách I bằng|6+4-35|/5=5.`,
      'Tâm/bán kính:0,4; kiểm M:0,4; lập phương trình:0,8; kiểm khoảng cách:0,4.'),
  ];
  const sections=[multi,tf,shorts,essays], questions=sections.flatMap((qs,i)=>qs.map((q,j)=>({...q,section:['I','II','III','IV'][i],label:`Câu ${j+1}`})));
  const exam=normalizeExamInput({title,durationMin:80,settings:{showResult:'none',review:'after_close',shuffleQuestions:false,shuffleOptions:false,allowLateJoin:false},questions});
  assert.equal(exam.questions.reduce((a,q)=>a+q.points,0),10);
  const headings=['PHẦN I. Trắc nghiệm (8 câu/2 điểm)','PHẦN II. Đúng - Sai (2 câu/2 điểm)','PHẦN III. Trả lời ngắn (4 câu/2 điểm)','PHẦN IV. Tự luận (2 câu/4 điểm)'];
  const text=[title,'Bản nháp tự soạn, cần giáo viên duyệt.','Thời gian làm bài: 80 phút','Họ và tên: ................................ Lớp: ........',
    ...sections.flatMap((qs,i)=>[headings[i],...qs.map((q,j)=>`Câu ${j+1}. (${String(q.points).replace('.',',')} điểm) ${q.text}${q.type==='mc'?'\n'+q.options.map(l=>`${l}. ${q.choiceText[l]}`).join('\n'):q.type==='tf'?'\n'+q.statements.map(l=>`${l}) ${q.statementText[l]}`).join('\n'):''}`)])].join('\n\n')+'\n';
  const parsed=parseExamLines(text.split(/\r?\n/).map(text=>({text}))); assert.equal(parsed.questions.length,16); assert.deepEqual(parsed.questions.map(q=>q.type),exam.questions.map(q=>q.type)); assert.equal(parsed.durationMin,80);
  const stem=`tasks/r23-hkii/g10-hkii-${final?'final':'midterm'}`;
  write(stem+'-exam.txt',text);write(stem+'-exam.json',exam);
  write(stem+'-solutions.txt',['CHỈ DÀNH CHO GIÁO VIÊN',title,...exam.questions.map(q=>`${q.section} ${q.label}: ${q.solution}\n${q.rubric||''}`)].join('\n\n')+'\n');
  return {id,title,grade:10,week,sourcePeriodIds:periods.map(p=>p.id),minutes:80,status:'draft',requiresTeacherReview:true,reviewStatus:'teacher_review_required',
    files:{text:stem+'-exam.txt',json:stem+'-exam.json',teacherSolutions:stem+'-solutions.txt'},
    sourceRefs:periods.map(p=>p.source.content.ref),blueprint:{mc:{count:8,points:2},tf:{count:2,points:2},short:{count:4,points:2},essay:{count:2,points:4}},
    notes:['Đề và ma trận do tác giả đề xuất; PPCT chỉ cung cấp lịch và nội dung đã học, không cung cấp đề chính thức.','GV duyệt nội dung, đáp án, rubric, điều kiện tổ chức và thời lượng80phút trước khi dùng.']};
}

// Independent finite enumeration and coordinate checks cover the fixed exam keys.
equal(subsets(6,2).length,15);equal(subsets(7,2).length,21);equal(pairs(5).length,20);
equal(polyPower(1,4)[2],6);equal(polyPower(1,5)[3],10);
equal(range(1,4).flatMap(a=>range(1,4).map(b=>[a,b])).filter(([a,b])=>a+b===5).length,4);
equal(pairs(7).filter(([i,j])=>i<j&&i<=4&&j>4).length,12);
equal(pairs(7).filter(([i,j])=>i<j&&(i<=4||j<=4)).length,18);
equal(range(0,5).filter(x=>x*x===x+6),[3]);equal(3*5+4*5-35,0);equal(3*4+4*2-20,0);
equal(Math.abs(3*2+4*1-35)/5,5);equal(Math.abs(3*1+4*(-2)-20)/5,5);
mkdirSync(new URL('tasks/r23-hkii/',root),{recursive:true});mkdirSync(new URL('content/lessons/',root),{recursive:true});
const entries=ppct.lessons.filter(p=>p.kind!=='assessment').map(buildPeriod),exams=[buildExam(false),buildExam(true)];
const coverage=ppct.lessons.map(p=>{const entry=entries.find(e=>e.sourcePeriodId===p.id),exam=exams.find(e=>e.sourcePeriodIds.includes(p.id));
  assert.equal(Number(Boolean(entry))+Number(Boolean(exam)),1,p.id);
  return {sourcePeriodId:p.id,week:p.week,period:p.period,sourceKind:p.kind,contentCell:p.source.content.ref,outputId:entry?.pkg.id||exam.id,mode:exam?'exam':p.kind==='elective'?'cumulative_game':'classroom',conceptIds:entry?.conceptIds||[]};});
assert.equal(entries.length,126);assert.equal(coverage.length,130);assert.equal(entries.filter(e=>e.kind==='elective').length,28);assert.ok(!coverage.some(p=>[256,257,258].includes(p.period)));
const selectedHki=[...new Set(entries.filter(e=>e.kind==='elective').flatMap(e=>e.conceptIds).filter(id=>introductions.get(id).week<=18))];
assert.deepEqual(selectedHki.sort(),['sets','mean','dot',...Object.keys(additionalHki)].sort());
const summary={periodRows:130,lessonPackages:126,electiveGames:28,examPeriods:4,examFiles:2,concepts:Object.keys(bank).length,hkiConcepts:28,selectedHkiConcepts:selectedHki.length,
  tasks:sum(entries.map(e=>e.pkg.tasks.length)),mathematicalChecks,automaticMathematicalChecks:automaticChecks(),
  autoCheckedGameTasks:sum(entries.filter(e=>e.kind==='elective').map(e=>e.pkg.tasks.filter(t=>t.type==='closed').length)),workedSolutions:solutionRows.length};
write('content/lessons/hkii-2026-g10.json',{format:'r23-hkii-grade-content-v1',grade:10,programme:'Discover',schoolYear:'2026-2027',firstWeek:19,lastWeek:38,cutoff:ppct.cutoff,entries,exams,summary,coverage});
write('tasks/r23-hkii/g10-coverage.json',{summary,coverage});write('tasks/r23-hkii/g10-solutions.json',{grade:10,note:'Teacher-only worked solutions; open responses require teacher assessment.',solutions:solutionRows});
write('tasks/r23-hkii/g10-source-coverage.json',{grade:10,sourcePolicy:'Older unit objectives support applicable concepts only; current PPCT controls periods, details and scope. Remaining objectives are author-derived, not official YCCD.',
    concepts:[...introductions].map(([id,p])=>({conceptId:id,title:bank[id].title,automaticTarget:automatic[id]?.target,introducedBy:p.id,week:p.week,contentCell:p.source.content.ref,sourceDetail:p.detail,
    sourceLOId:unitByConcept[id]||null,...(unitByConcept[id]?{unitReference:unitLO(unitByConcept[id]).reference}:{} )})),
  entries:entries.map(e=>({id:e.pkg.id,objectives:e.objectiveSourceCoverage}))});
console.log(JSON.stringify(summary));
