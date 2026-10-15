import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { assembleHkiPackage } from './hki-package.mjs';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';
import { normalizeExamInput } from '../../lib/exam/validate.js';
import { parseExamLines } from '../../lib/exam/parse.js';

const root = new URL('../../', import.meta.url), R = String.raw, math = text => `$${text}$`;
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const ppct = read('tasks/r22/ppct-hki.json').grades.find(item => item.grade === 10);
const units = read('tasks/r22/unit-objectives.json').units.filter(item => item.grade === 10);
const unitLO = id => units.flatMap(unit => unit.sourceLOexact.map(lo => ({ ...lo, unit }))).find(lo => lo.id === id);
const n = seed => 2 + seed % 17, h = (...steps) => steps;
let mathematicalChecks = 0;
function numeric(prompt, key, solution, hints, independent) {
  assert.ok(Number.isFinite(key) && Number.isFinite(independent) && Math.abs(key - independent) < 1e-8, `${prompt}: ${key} != ${independent}`);
  mathematicalChecks++;
  return { type: 'closed', prompt, evaluation: { checkerId: 'numeric_exact', answerKey: key }, solution, hints };
}
function choice(prompt, labels, correct, solution, hints, check) {
  assert.ok(correct >= 0 && correct < labels.length && check === true, prompt);
  mathematicalChecks++;
  const offset = prompt.length % labels.length, rotated = [...labels.slice(offset), ...labels.slice(0, offset)];
  return { type: 'closed', prompt, inputSchema: { options: rotated.map((label, index) => ({ id: `o${index + 1}`, label })) },
    evaluation: { checkerId: 'choice_exact', answerKey: `o${(correct - offset + labels.length) % labels.length + 1}` }, solution, hints };
}
function open(prompt, solution, hints, criteria) {
  assert.ok(solution.length > 12 && criteria.length > 0);
  return { type: 'open', prompt, evaluation: { rubric: { criteria, lookFor: [solution] } }, solution, hints };
}
const concept = (title, statement, lo, teach, error, question) => ({ title, statement, lo, teach, error, question });
const set = values => R`\{${values.join(';')}\}`;
const bank = {
  routine: concept('Sẵn sàng học Toán và kiểm tra lời giải', 'Trình bày được một phép tính quen thuộc, kiểm tra kết quả và thực hiện quy trình nhận việc, nộp bài, xin trợ giúp.', null,
    'Từ bảng trắng, GV chỉ rõ ba việc: đọc yêu cầu, làm nháp trong vở, tự kiểm tra rồi nộp. Làm mẫu phép tính phân số; khi chưa hiểu, HS chỉ vào bước vướng và dùng trợ giúp. Mỗi em giữ câu trả lời riêng; chưa dùng kết quả chẩn đoán để xếp loại.',
    'Cộng cả tử và mẫu; nộp theo đáp án người bên cạnh.', (s, d) => {
      const a = n(s), b = a + 1;
      return open(R`Em tính $\frac{${a}}{${b}}+\frac{1}{${b}}$, kiểm tra kết quả bằng một cách khác. ${d % 2 ? 'Nếu kết quả trên thiết bị khác bài trong vở, em xử lí thế nào trước khi nộp?' : 'Nếu chưa hiểu bước cộng phân số, em sẽ hỏi thầy/cô về bước nào?'}`,
        R`Cùng mẫu nên tổng là $\frac{${a}+1}{${b}}=1$; kiểm lại bằng $1-\frac1{${b}}=\frac{${a}}{${b}}$. Em đối chiếu từng bước, hỏi đúng chỗ vướng, tự sửa rồi nộp bài của mình.`,
        h('Hai phân số có cùng mẫu.', 'Giữ mẫu khi cộng hai phần cùng loại.', 'Viết tử số của phép cộng, chưa đổi mẫu.', 'Ví dụ khác: hai phần ba cộng một phần ba tạo thành một đơn vị.'), ['Cộng phân số đúng, có kiểm tra.', 'Nêu cách tự đối chiếu hoặc hỏi cụ thể, không sao chép bài.']);
    }),
  proposition: concept('Mệnh đề, biến và phủ định', 'Phân biệt mệnh đề với câu chứa biến; xác định đúng phủ định của một mệnh đề cụ thể.', 'r22-g10-u1-lo01',
    R`GV viết “$6$ chia hết cho $3$”, “$x>2$”, “Em học bài chưa?”. HS phân loại rồi giải thích. Chốt: mệnh đề có giá trị đúng/sai xác định; câu chứa biến cần giá trị biến hoặc lượng từ; phủ định đổi khẳng định, không đổi đối tượng.`,
    'Coi câu hỏi hoặc câu chứa biến tự do là mệnh đề; phủ định bằng cách đổi số.', (s, d) => {
      const a = n(s), b = a * 3;
      return open(R`Xét ba câu: (1) “$${b}$ chia hết cho $3$”; (2) “$x>${a}$”; (3) “Hãy tính $${a}+1$”. Em chỉ ra mệnh đề, câu chứa biến và câu yêu cầu. Viết phủ định của (1), cho biết đúng/sai. ${d > 1 ? R`Với $x=${a - 1}$, câu (2) đúng hay sai?` : ''}`,
        R`(1) là mệnh đề đúng vì $${b}=3\cdot${a}$; (2) chứa biến chưa xác định; (3) là yêu cầu, không có giá trị đúng/sai. Phủ định: “$${b}$ không chia hết cho $3$”, là sai.${d > 1 ? R` Thay $x=${a - 1}$ thì $x>${a}$ sai.` : ''}`,
        h('Mỗi câu có thể được xác định đúng hoặc sai ngay chưa?', 'Tách việc phân loại câu khỏi việc xét chân trị.', 'Gạch chân biến chưa được cho giá trị.', 'Ví dụ khác: “7 là số chẵn” là một mệnh đề sai; “Hãy đọc số 7” không phải mệnh đề.'), ['Phân loại đúng cả ba câu.', 'Phủ định đúng đối tượng và xác định đúng chân trị.']);
    }),
  implication: concept('Kéo theo và mệnh đề đảo', 'Viết mệnh đề đảo, dùng phản ví dụ để phân biệt chiều kéo theo với chiều đảo.', 'r22-g10-u1-lo01',
    R`GV nối “chia hết cho $6$” với “chia hết cho $3$”; cả lớp thử số $9$ cho chiều đảo. Chốt giả thiết/kết luận và phản ví dụ: có một trường hợp giả thiết đúng nhưng kết luận sai thì bác bỏ kéo theo. Không dùng trường hợp giả thiết sai để bác bỏ.`,
    'Thấy chiều thuận đúng rồi kết luận chiều đảo đúng.', (s, d) => {
      const a = n(s), divisor = a + 1, multiple = 2 * divisor;
      return open(R`Với $m\in\mathbb Z$, xét “Nếu $m$ chia hết cho $${multiple}$ thì $m$ chia hết cho $${divisor}$”. Em viết mệnh đề đảo, xét đúng/sai của hai chiều; chỉ ra một phản ví dụ cho chiều sai.${d > 1 ? ' Điều kiện nào là đủ, điều kiện nào là cần trong chiều thuận?' : ''}`,
        R`Chiều thuận đúng: $m=${multiple}k=${divisor}(2k)$. Chiều đảo “chia hết cho $${divisor}$ thì chia hết cho $${multiple}$” sai, lấy $m=${divisor}$. Chia hết cho $${multiple}$ là điều kiện đủ; chia hết cho $${divisor}$ là điều kiện cần trong chiều thuận.`,
        h('Xác định vế “nếu” và vế “thì”.', 'Đảo hai vế rồi thử một bội nhỏ của số chia.', 'Viết một số chia hết cho số chia nhỏ nhưng không chia hết cho số chia lớn.', 'Ví dụ khác: chia hết cho 10 kéo theo chia hết cho 5; số 15 giúp kiểm chiều đảo.'), ['Viết đúng hai chiều.', 'Chứng minh chiều thuận và có phản ví dụ đúng cho chiều đảo.']);
    }),
  quantifier: concept('Tương đương và lượng từ', 'Kiểm tra hai chiều của tương đương, đổi đúng lượng từ và phủ định mệnh đề chứa lượng từ.', 'r22-g10-u1-lo01',
    R`GV đặt cặp “$n$ là số chẵn” và “$n$ chia hết cho $2$”; phải kiểm cả hai chiều. Viết phủ định của “mọi số thực có bình phương không âm”: đổi mọi thành tồn tại, đồng thời phủ định phần khẳng định. Không chỉ đổi lượng từ.`,
    'Giữ nguyên lượng từ khi phủ định; lẫn tồn tại với với mọi.', (s, d) => {
      const a = n(s);
      return open(R`Viết phủ định của $P:\forall x\in\mathbb R,\ x^2\ge ${a}$. Nêu một phản ví dụ cho $P$. Xét câu “$m\in\mathbb Z$ chia hết cho $${a}$ khi và chỉ khi $m=${a}k$ với một $k\in\mathbb Z$”: giải thích cả hai chiều.${d > 1 ? R` Phủ định của $\exists x\in\mathbb R:x>${a}$ là gì?` : ''}`,
        R`Phủ định $P$ là $\exists x\in\mathbb R:x^2<${a}$; $x=0$ bác bỏ $P$. Câu chia hết là tương đương đúng theo định nghĩa: chia hết cho $${a}$ thì thương nguyên, và $m=${a}k$ cho thương nguyên. ${d > 1 ? R`Phủ định câu tồn tại: $\forall x\in\mathbb R:x\le${a}$.` : ''}`,
        h('Tìm lượng từ và miền xét trước.', 'Phủ định cả lượng từ lẫn quan hệ so sánh.', 'Thử một số đơn giản thuộc miền xét.', 'Ví dụ khác: phủ định “mọi em đều có bút” là “có ít nhất một em không có bút”.'), ['Đổi đúng lượng từ, miền và dấu quan hệ.', 'Phản ví dụ đúng; giải thích được hai chiều tương đương.']);
    }),
  sets: concept('Phần tử và tập con', 'Liệt kê tập hợp theo điều kiện, phân biệt phần tử, tập con và tập rỗng.', 'r22-g10-u1-lo01',
    R`GV cho $A=\{x\in\mathbb Z:1\le x<4\}$. HS liệt kê rồi phân biệt $2\in A$ với $\{2\}\subset A$. Chốt tập rỗng là tập con của mọi tập hợp, nhưng không tự là phần tử của tập số đang xét.`,
    'Dùng kí hiệu thuộc giữa hai tập; quên một đầu mút.', (s, d) => {
      const a = n(s), members = [a, a + 1, a + 2];
      return open(R`Cho $A=\{x\in\mathbb Z:${a}\le x<${a + 3}\}$. Em liệt kê $A$, xét ba khẳng định $${a + 1}\in A$, $\{${a},${a + 2}\}\subset A$, $\varnothing\in A$. ${d > 1 ? 'Viết một tập con khác tập rỗng và khác chính nó của A.' : 'Giải thích vì sao tập rỗng vẫn là tập con của A.'}`,
        R`$A=${set(members)}$. Hai khẳng định đầu đúng; $\varnothing\in A$ sai vì các phần tử của $A$ đều là số. $\varnothing\subset A$ đúng. Ví dụ tập con: $\{${a}\}$.`,
        h('Điều kiện giới hạn ở các số nguyên.', 'Tách kí hiệu thuộc và kí hiệu tập con.', 'Viết số nguyên đầu tiên được nhận và đầu mút bị loại.', 'Ví dụ khác: phần tử của tập số là một số; tập chỉ chứa số đó là một tập con.'), ['Liệt kê đúng cả đầu mút.', 'Phân biệt đúng phần tử, tập con và tập rỗng.']);
    }),
  numberSets: concept('Tập số và khoảng', 'Mô tả một tập số bằng khoảng/đoạn và xác định được các số nguyên thuộc tập.', 'r22-g10-u1-lo01',
    R`GV vẽ trục số, dùng chấm đặc/rỗng cho $[-2;3)$. Cho HS đặt số nguyên, số hữu tỉ và số vô tỉ lên trục. Chốt $\mathbb N\subset\mathbb Z\subset\mathbb Q\subset\mathbb R$, còn số vô tỉ thuộc $\mathbb R\setminus\mathbb Q$.`,
    'Nhầm ngoặc tròn với ngoặc vuông; cho căn của số không chính phương vào Q.', (s, d) => {
      const a = n(s);
      if (d >= 2) return open(R`Viết tập $A=\{x\in\mathbb R:-${a}<x\le${a+2}\}$ bằng khoảng/đoạn, minh họa hai đầu mút và đếm số nguyên thuộc A. Phân loại $-${a}$, $1/2$, $\sqrt2$ vào tập số nguyên, hữu tỉ không nguyên, hoặc vô tỉ.`,
        R`$A=(-${a};${a+2}]$, đầu trái rỗng, đầu phải đặc. Các số nguyên từ $-${a-1}$ đến $${a+2}$ nên có $${2*a+2}$ số. $-${a}$ là số nguyên; $1/2$ là hữu tỉ không nguyên; $\sqrt2$ là vô tỉ.`,
        h('Hai dấu bất đẳng thức quyết định hai dấu ngoặc.', 'Đếm từ số nguyên đầu tiên thực sự thuộc tập.', 'Viết số nguyên nhỏ nhất và lớn nhất thực sự thuộc khoảng.', R`Ví dụ khác: $(2;5]$ chứa ba số nguyên $3,4,5$; $-7$ nguyên, $3/4$ hữu tỉ không nguyên.`),
        ['Khoảng và trạng thái hai đầu mút đúng.', 'Số lượng số nguyên đúng, có cách đếm.', 'Phân loại đúng ba số.']);
      if (d % 2 === 0) return numeric(R`Có bao nhiêu số nguyên thuộc $(-${a};${a + 2}]$?`, 2 * a + 2,
        R`Các số từ $-${a - 1}$ đến $${a + 2}$, số lượng $(${a + 2})-(-${a - 1})+1=${2 * a + 2}$.`,
        h('Đầu trái không lấy, đầu phải có lấy.', 'Đếm số nguyên từ số nhỏ nhất đến số lớn nhất.', 'Viết hai số nguyên sát hai đầu mút.', 'Ví dụ khác: đoạn từ số nguyên a đến b có b−a+1 số nguyên.'), Array.from({ length: 2 * a + 6 }, (_, i) => i - a - 2).filter(x => x > -a && x <= a + 2).length);
      return open(R`Biểu diễn tập $\{x\in\mathbb R:-${a}\le x<${a + 1}\}$ bằng khoảng/đoạn và trên trục số. Phân loại $-${a}$, $\frac12$, $\sqrt2$ vào tập số nguyên, hữu tỉ hoặc vô tỉ nhỏ nhất phù hợp.`,
        R`Tập là $[-${a};${a + 1})$, đầu trái đặc và đầu phải rỗng. $-${a}\in\mathbb Z$, $1/2\in\mathbb Q\setminus\mathbb Z$, $\sqrt2\in\mathbb R\setminus\mathbb Q$.`,
        h('Xem dấu bằng ở từng đầu.', 'Một số có thể thuộc nhiều tập số lồng nhau.', 'Chọn tập nhỏ nhất trong những loại được hỏi.', 'Ví dụ khác: số thập phân hữu hạn viết được thành phân số.'), ['Biểu diễn đúng tập và hai đầu mút.', 'Phân loại đúng ba số, không gọi mọi căn là vô tỉ.']);
    }),
  setOperations: concept('Giao, hợp, hiệu của tập hợp', 'Tính giao, hợp, hiệu và phần bù trong một tập vũ trụ xác định.', 'r22-g10-u1-lo01',
    R`GV vẽ hai miền giao nhau, tô lần lượt phần chung, cả hai miền, phần của A ngoài B. Chốt phải nêu tập vũ trụ khi lấy phần bù. Chọn một phần tử thuộc cả hai tập để phân biệt hợp với hiệu.`,
    'Đổi A trừ B thành B trừ A; đếm trùng phần giao.', (s, d) => {
      const a = n(s), A = [a, a + 1, a + 2], B = [a + 1, a + 2, a + 3], U = [a, a + 1, a + 2, a + 3, a + 4];
      return open(R`Cho $U=${set(U)}$, $A=${set(A)}$, $B=${set(B)}$. Tìm $A\cap B$, $A\cup B$, $A\setminus B$ và $C_UA$. ${d > 1 ? 'Giải thích bằng một phần tử vì sao hiệu hai tập không có tính giao hoán.' : 'Dùng sơ đồ hai miền để kiểm lại phần giao.'}`,
        R`$A\cap B=${set([a + 1, a + 2])}$; $A\cup B=${set(U.slice(0, 4))}$; $A\setminus B=\{${a}\}$; $C_UA=${set([a + 3, a + 4])}$. $B\setminus A=\{${a + 3}\}$ nên hai hiệu khác nhau.`,
        h('Đánh dấu những phần tử có mặt trong cả hai tập.', 'Mỗi phép toán chọn một vùng khác nhau.', 'Với hiệu, bắt đầu từ tập đứng trước dấu trừ.', 'Ví dụ khác: phần bù của tập các số chẵn trong một tập số cho trước chỉ gồm những phần tử còn lại của tập đó.'), ['Tính đúng bốn phép toán.', 'Giữ đúng thứ tự hiệu và tập vũ trụ của phần bù.']);
    }),
  setIntervals: concept('Phép toán với khoảng và đoạn', 'Xác định giao/hợp của hai khoảng, giữ đúng trạng thái hai đầu mút.', 'r22-g10-u1-lo01',
    R`GV chồng hai hình tô trên cùng trục số; giao là phần tô hai lần, hợp là phần được tô. Kiểm riêng đầu mút: một số phải được cả hai tập nhận mới thuộc giao.`,
    'Chỉ so sánh số đầu mút mà bỏ dấu ngoặc.', (s, d) => {
      const a = n(s);
      return open(R`Cho $A=[-${a};${a + 1})$, $B=(${a - 1};${a + 3}]$. Em tìm $A\cap B$, $A\cup B$ và ${math(d % 2 ? R`B\setminus A` : R`A\setminus B`)}; minh họa trên một trục số.`,
        R`$A\cap B=(${a - 1};${a + 1})$; $A\cup B=[-${a};${a + 3}]$. ${d % 2 ? R`$B\setminus A=[${a + 1};${a + 3}]$.` : R`$A\setminus B=[-${a};${a - 1}]$.`} Điểm $${a - 1}$ không thuộc B, điểm $${a + 1}$ không thuộc A.`,
        h('Vẽ hai tập trên cùng trục.', 'Xét vùng chung rồi kiểm riêng các đầu mút.', 'Thay từng đầu mút vào điều kiện của cả hai tập.', 'Ví dụ khác: hợp có thể nhận một đầu mút chỉ thuộc một trong hai tập.'), ['Đúng ba tập kết quả và mọi dấu ngoặc.', 'Hình trục số phù hợp kết quả.']);
    }),
  inclusion: concept('Đếm bằng sơ đồ Venn', 'Tính số phần tử của hợp và phần chỉ thuộc một tập trong tình huống hai nhóm giao nhau.', 'r22-g10-u1-lo01',
    R`GV cho một lớp có hai nhóm sở thích. Ghi số ở phần giao trước, trừ phần giao khỏi từng nhóm, rồi mới cộng. Nêu rõ “ít nhất một” khác “đúng một” và “không nhóm nào”.`,
    'Cộng số hai nhóm mà quên đếm trùng.', (s, d) => {
      const k = n(s), A = k + 8, B = k + 5, both = k, union = k + 13;
      if (d >= 2) return open(`Một nhóm có ${union+4} em; ${A} em thích cờ, ${B} em thích vẽ, ${both} em thích cả hai. Tính số em thích ít nhất một hoạt động, số em chỉ thích đúng một và số em không thích hoạt động nào. Giải thích cách tránh đếm trùng.`,
        `Chỉ thích cờ ${A}-${both}=8, chỉ thích vẽ ${B}-${both}=5. Ít nhất một: 8+5+${both}=${union}; đúng một: 8+5=13; không hoạt động nào: ${union+4}-${union}=4. Phần giao chỉ cộng một lần vào hợp, không cộng vào phần đúng một.`,
        h('Đặt phần giao vào giữa sơ đồ trước.', 'Trừ phần giao khỏi mỗi nhóm để có hai phần chỉ thích.', 'Hợp gồm ba vùng rời nhau; đúng một chỉ gồm hai vùng ngoài giao.', 'Ví dụ khác: khi đếm hai danh sách, một người xuất hiện cả hai phải được xử lí riêng.'),
        ['Tính đúng hợp, đúng một và phần ngoài cả hai.', 'Giải thích được phần giao bị đếm trùng trong phép cộng ban đầu.']);
      return numeric(`Một nhóm có ${union + 4} em; ${A} em thích cờ, ${B} em thích vẽ, ${both} em thích cả hai. Có bao nhiêu em ${d % 2 ? 'chỉ thích đúng một trong hai hoạt động' : 'thích ít nhất một trong hai hoạt động'}?`, d % 2 ? 13 : union,
        `Chỉ thích cờ: ${A}-${both}=8; chỉ thích vẽ: ${B}-${both}=5. ${d % 2 ? 'Đúng một: 8+5=13.' : `Ít nhất một: 8+5+${both}=${union}.`}`,
        h('Phần giao đã được tính trong cả hai nhóm.', 'Chia sơ đồ thành ba vùng không giao nhau.', 'Tính riêng số chỉ thuộc nhóm thứ nhất.', 'Ví dụ khác: muốn đếm đúng một hoạt động thì không cộng phần giao.'), d % 2 ? A + B - 2 * both : A + B - both);
    }),
  trigValue: concept('Giá trị lượng giác trên nửa đường tròn', 'Đọc sin, cos từ tọa độ trên nửa đường tròn; tính tan khi có nghĩa và xác định dấu.', 'r22-g10-u1-lo03',
    R`GV vẽ nửa đường tròn đơn vị phía trên trục hoành, đánh dấu M. Chốt hoành độ là cos, tung độ là sin; sin không âm từ 0 đến 180 độ. Tan là sin/cos, không xác định ở 90 độ.`,
    'Đổi hoành độ với tung độ; chia cho cos bằng không.', (s, d) => {
      const k = n(s), a = 2 * k + 1, b = (a * a - 1) / 2, c = (a * a + 1) / 2, sign = d % 2 ? -1 : 1;
      const key = d % 3 === 0 ? sign * a / c : d % 3 === 1 ? b / c : b / (sign * a);
      const fn = d % 3 === 0 ? 'cos' : d % 3 === 1 ? 'sin' : 'tan';
      if (d >= 2) return open(R`Điểm M trên nửa đường tròn đơn vị có tọa độ $(${sign*a}/${c};${b}/${c})$. Tìm $\sin\alpha$, $\cos\alpha$, $\tan\alpha$; nêu dấu của từng giá trị và giải thích vì sao tan xác định ở góc này.`,
        R`$\sin\alpha=${b}/${c}>0$, $\cos\alpha=${sign*a}/${c}${sign<0?'<':'>'}0$. $\tan\alpha=\sin\alpha/\cos\alpha=${b}/${sign*a}${sign<0?'<':'>'}0$. Hoành độ khác không nên cos khác không, tan xác định.`,
        h('Sin là tung độ, cos là hoành độ.', 'Tan là tỉ số sin/cos khi mẫu khác không.', 'Xét dấu của từng tọa độ rồi xét dấu của tỉ số.', R`Ví dụ khác: với điểm $(0;1)$, sin bằng $1$, cos bằng $0$ nên tan không xác định.`),
        ['Đúng cả ba giá trị theo tọa độ.', 'Đúng dấu và điều kiện xác định của tan.']);
      return numeric(R`Điểm M trên nửa đường tròn đơn vị có tọa độ $(${sign * a}/${c};${b}/${c})$, ứng với góc $\alpha\in[0^\circ;180^\circ]$. Tính ${math(`\\${fn}\\alpha`)}.`, key,
        R`$\cos\alpha=${sign * a}/${c}$, $\sin\alpha=${b}/${c}$; $\tan\alpha=${b}/${sign * a}$ vì hoành độ khác không. Giá trị được hỏi là $${key}$.`,
        h('Ghi rõ tọa độ thứ nhất, tọa độ thứ hai.', 'Liên hệ tọa độ với hàm lượng giác được hỏi.', 'Nếu hỏi tan, kiểm tra hoành độ có khác không.', 'Ví dụ khác: điểm trên trục tung phía trên có sin bằng 1 nhưng không có tan.'), fn === 'cos' ? Math.cos(Math.atan2(b, sign * a)) : fn === 'sin' ? Math.sin(Math.atan2(b, sign * a)) : Math.tan(Math.atan2(b, sign * a)));
    }),
  supplement: concept('Hai góc bù nhau', 'Dùng đối xứng để tính sin, cos, tan của góc bù và xác định đúng dấu.', 'r22-g10-u1-lo03',
    R`GV đặt M và M' đối xứng qua trục tung trên nửa đường tròn. HS đối chiếu tọa độ; chốt $\sin(180^\circ-\alpha)=\sin\alpha$, cos/tan đổi dấu khi có nghĩa. Với góc phụ, sin và cos đổi vai trò.`,
    'Cho sin đổi dấu như cos khi lấy góc bù.', (s, d) => {
      const a = n(s), denominator = a + 2, cosine = d % 2 === 0;
      if (d >= 2) {
        const p = 2*a+1, q=(p*p-1)/2, r=(p*p+1)/2;
        assert.equal(p*p+q*q,r*r); mathematicalChecks++;
        return open(R`Với góc nhọn $\alpha$, biết $\cos\alpha=${p}/${r}$, $\sin\alpha=${q}/${r}$. Tính $\sin(180^\circ-\alpha)$, $\cos(180^\circ-\alpha)$ và $\tan(180^\circ-\alpha)$; giải thích dấu bằng đối xứng trên nửa đường tròn.`,
          R`Góc bù có cùng tung độ, hoành độ đối nhau: sin bằng $${q}/${r}$, cos bằng $-${p}/${r}$, tan bằng $-${q}/${p}$. Sin dương, cos và tan âm; cos khác không nên tan xác định.`,
          h('Phép đối xứng đang xét là qua trục tung.', 'Tung độ giữ nguyên, hoành độ đổi dấu.', 'Tính tan từ hai giá trị vừa có, kiểm mẫu khác không.', 'Ví dụ khác: hai điểm (x;y) và (−x;y) có cùng tung độ nhưng hoành độ đối nhau.'),
          ['Đúng ba giá trị của góc bù.', 'Giải thích dấu từ đối xứng và điều kiện của tan.']);
      }
      return numeric(R`Biết ${math(`\\${cosine ? 'cos' : 'sin'}\\alpha=${a}/${denominator}`)} với $0^\circ<\alpha<90^\circ$. Tính ${math(`\\${cosine ? 'cos' : 'sin'}(180^\\circ-\\alpha)`)}.`, (cosine ? -1 : 1) * a / denominator,
        R`Hai góc bù có sin bằng nhau và cos đối nhau; kết quả $${cosine ? '-' : ''}${a}/${denominator}$.`,
        h('Góc mới nằm ở nửa trái của nửa đường tròn.', 'Theo dõi tọa độ tương ứng khi phản chiếu qua trục tung.', 'Xác định dấu trước khi thay giá trị.', 'Ví dụ khác: hai điểm đối xứng qua trục tung có cùng tung độ.'), cosine ? Math.cos(Math.PI - Math.acos(a / denominator)) : Math.sin(Math.PI - Math.asin(a / denominator)));
    }),
  trigIdentity: concept('Hệ thức lượng giác và góc đặc biệt', 'Kết hợp hệ thức bình phương sin/cos với dấu của góc để tìm giá trị còn lại.', 'r22-g10-u1-lo03',
    R`GV dùng bán kính đơn vị để có $\sin^2\alpha+\cos^2\alpha=1$. Lấy căn chưa đủ: phải chọn dấu theo vị trí góc. Đối chiếu 0, 90, 180 độ để kiểm chiều biến thiên của tọa độ.`,
    'Mặc định cos luôn dương sau khi lấy căn.', (s, d) => {
      const a = 2 * n(s) + 1, b = (a * a - 1) / 2, c = (a * a + 1) / 2, sign = d % 2 ? -1 : 1;
      return numeric(R`Biết $\sin\alpha=${b}/${c}$, ${math(sign < 0 ? '90^\circ<\alpha<180^\circ' : '0^\circ<\alpha<90^\circ')}. Tính $\cos\alpha$.`, sign * a / c,
        R`$\cos^2\alpha=1-(${b}/${c})^2=(${a}/${c})^2$. Theo khoảng của góc, $\cos\alpha=${sign * a}/${c}$.`,
        h('Khoảng chứa góc quyết định dấu của cos.', 'Từ tổng hai bình phương bằng một, tìm bình phương còn lại.', 'Chỉ chọn dấu sau khi tính căn.', 'Ví dụ khác: cos của góc tù âm, dù bình phương cos vẫn dương.'), sign * Math.sqrt(1 - (b / c) ** 2));
    }),
  cosine: concept('Định lí cosin: tìm cạnh', 'Dùng hai cạnh và góc xen giữa để tính cạnh đối diện, nhận biết trường hợp tam giác vuông.', 'r22-g10-u1-lo03',
    R`GV vẽ tam giác ABC, ghi $a$ đối diện A. Chốt $a^2=b^2+c^2-2bc\cos A$; khoanh góc nằm giữa hai cạnh đã biết. Kiểm với A bằng 90 độ để thu lại định lí Pythagore.`,
    'Dùng góc không xen giữa; bỏ hệ số hai hoặc quên lấy căn.', (s, d) => {
      const k = n(s), b = 2 * k, c = 3 * k, angle = d % 2 ? 120 : 60, cos = angle === 60 ? 0.5 : -0.5;
      if(d>=2){
        const square=b*b+c*c-2*b*c*cos,radicand=angle===60?7:19;
        assert.equal(square,radicand*k*k); mathematicalChecks++;
        return open(R`Tam giác có hai cạnh kề góc $${angle}^\circ$ dài $${b}$ cm và $${c}$ cm. Dùng định lí cosin tìm bình phương rồi tính độ dài cạnh đối diện, giữ căn thức chính xác.`,
          R`$a^2=${b}^2+${c}^2-2\cdot${b}\cdot${c}\cos${angle}^\circ=${square}=${k}^2\cdot${radicand}$. Độ dài là căn dương: $a=${k}\sqrt{${radicand}}$ cm.`,
          h('Góc phải nằm giữa hai cạnh đã biết.', 'Tính số hạng chứa cos và giữ dấu trước tích.', 'Sau khi có bình phương, lấy căn dương và kiểm đơn vị độ dài.', R`Ví dụ khác: nếu cạnh có bình phương bằng $45\,\mathrm{cm}^2$ thì độ dài là $3\sqrt5$ cm.`),
          ['Áp dụng đúng định lí cosin và tính bình phương cạnh.', 'Lấy căn dương, kết quả độ dài và đơn vị đúng.']);
      }
      return numeric(R`Tam giác có hai cạnh kề góc $${angle}^\circ$ dài $${b}$ cm và $${c}$ cm. Nếu cạnh đối diện là $a$ cm, hãy tính $a^2$ (đơn vị $\mathrm{cm}^2$).`, b * b + c * c - 2 * b * c * cos,
        R`$a^2=${b}^2+${c}^2-2\cdot${b}\cdot${c}\cos${angle}^\circ=${b * b + c * c - 2 * b * c * cos}$. Cạnh $a$ là căn dương của số này, nhưng đề đang hỏi bình phương.`,
        h('Hai cạnh đã cho nằm kề góc đã biết.', 'Dùng định lí cosin cho cạnh đối diện góc đó.', 'Tính cos góc đặc biệt và giữ dấu trước tích.', 'Ví dụ khác: góc vuông làm số hạng chứa cos triệt tiêu.'), (b - c * Math.cos(angle * Math.PI / 180)) ** 2 + (c * Math.sin(angle * Math.PI / 180)) ** 2);
    }),
  cosineAngle: concept('Định lí cosin: xét góc', 'Tính cos một góc từ ba cạnh và suy ra góc nhọn, vuông hoặc tù.', 'r22-g10-u1-lo03',
    R`GV chuyển vế công thức để có $\cos A=(b^2+c^2-a^2)/(2bc)$. HS không cần bấm arccos để phân loại góc: xét dấu tử vì mẫu dương. Kiểm điều kiện tam giác trước.`,
    'Lấy cạnh kề làm cạnh đối diện; nhầm dấu cos với dấu góc.', (s, d) => {
      const k = n(s), a = (d % 2 ? 6 : 5) * k, b = 3 * k, c = 4 * k;
      if(d>=2){
        const cosine=(b*b+c*c-a*a)/(2*b*c);
        assert.ok(a<b+c && a>Math.abs(b-c) && cosine>=-1 && cosine<=1); mathematicalChecks++;
        return open(R`Tam giác ABC có $a=BC=${a}$, $b=CA=${b}$, $c=AB=${c}$. Tính $\cos A$, rồi kết luận A là góc nhọn, vuông hay tù và nêu căn cứ.`,
          R`$\cos A=(${b}^2+${c}^2-${a}^2)/(2\cdot${b}\cdot${c})=${d%2?'-11/24':'0'}$. Góc A ${d%2?'tù vì cos âm':'vuông vì cos bằng không'}. Ba cạnh thỏa bất đẳng thức tam giác.`,
          h('Cạnh a đối diện góc A.', 'Cô lập cos trong định lí cosin.', 'Dùng dấu của cos để phân loại góc, không cần bấm arccos.', 'Ví dụ khác: góc nhọn có cos dương; góc tù có cos âm.'),
          ['Tính đúng cos từ đúng cặp cạnh đối/kề.', 'Phân loại góc đúng, có căn cứ về dấu.']);
      }
      return numeric(R`Tam giác ABC có $a=BC=${a}$, $b=CA=${b}$, $c=AB=${c}$. Tính $\cos A$.`, (b * b + c * c - a * a) / (2 * b * c),
        R`$\cos A=(${b}^2+${c}^2-${a}^2)/(2\cdot${b}\cdot${c})=${(b * b + c * c - a * a) / (2 * b * c)}$. Góc A ${d % 2 ? 'tù vì cos âm' : 'vuông vì cos bằng không'}.`,
        h('Cạnh a đối diện góc A.', 'Chuyển vế định lí cosin để cô lập cos.', 'Mẫu số là tích hai cạnh kề nhân hai.', 'Ví dụ khác: khi bình phương cạnh đối bằng tổng hai bình phương cạnh kề, góc là góc vuông.'), ((b / k) ** 2 + (c / k) ** 2 - (a / k) ** 2) / (2 * (b / k) * (c / k)));
    }),
  sine: concept('Định lí sin và bán kính ngoại tiếp', 'Ghép đúng cặp cạnh-góc đối diện để tìm cạnh hoặc bán kính đường tròn ngoại tiếp.', 'r22-g10-u1-lo03',
    R`GV tô cùng màu cạnh a và góc A đối diện; chốt $a/\sin A=b/\sin B=2R$. HS tính góc thứ ba trước nếu cần. Lưu ý dữ kiện cạnh-góc không đủ có thể cho hai tam giác; không mặc định nghiệm góc nhọn.`,
    'Quên hệ số hai của bán kính; ghép cạnh với góc kề.', (s, d) => {
      const k = n(s), a = 2 * k;
      return numeric(d % 2 ? R`Tam giác ABC có $A=30^\circ$, $B=90^\circ$, $a=${a}$ cm. Tính cạnh $b$ (cm).` : R`Tam giác ABC có $A=30^\circ$, $a=${a}$ cm. Tính bán kính ngoại tiếp $R$ (cm).`, d % 2 ? 4 * k : 2 * k,
        d % 2 ? R`$b=a\sin B/\sin A=${a}\cdot1/(1/2)=${4 * k}$.` : R`$R=a/(2\sin A)=${a}/(2\cdot1/2)=${2 * k}$.`,
        h('Ghi cạnh đối diện từng góc.', 'Dùng cùng một tỉ số cạnh trên sin góc đối diện.', 'Thay sin của góc đặc biệt, chú ý hệ số của R.', 'Ví dụ khác: cạnh đối diện góc vuông bằng đường kính ngoại tiếp.'), d % 2 ? a * Math.sin(Math.PI / 2) / Math.sin(Math.PI / 6) : a / (2 * Math.sin(Math.PI / 6)));
    }),
  areaSin: concept('Diện tích qua hai cạnh và góc xen giữa', 'Tính diện tích tam giác từ hai cạnh và góc xen giữa; giải thích vai trò đường cao.', 'r22-g10-u1-lo03',
    R`GV hạ đường cao từ đầu mút của cạnh b xuống cạnh c. HS nhận ra $h=b\sin A$; chốt $S=bc\sin A/2$. Đơn vị diện tích là bình phương đơn vị cạnh, không phải độ dài.`,
    'Dùng cos thay sin; bỏ hệ số một nửa.', (s, d) => {
      const b = 2 * n(s), c = 4 + 2 * (s % 7), angle = d % 2 ? 90 : 30;
      if(d>=2){
        const height=b*(angle===90?1:.5),area=c*height/2;
        return open(R`Tam giác có hai cạnh kề góc $${angle}^\circ$ dài $${b}$ m và $${c}$ m. Chọn cạnh $${c}$ m làm đáy: tính đường cao tương ứng, giải thích bằng sin rồi tính diện tích.`,
          R`Đường cao $h=${b}\sin${angle}^\circ=${height}$ m. Vì $S=ch/2$, $S=\frac12\cdot${c}\cdot${height}=${area}\,\mathrm{m}^2$. Đây là nguồn gốc công thức $S=bc\sin A/2$.`,
          h('Góc đã cho kề hai cạnh.', 'Hạ đường cao vuông góc cạnh làm đáy.', 'Liên hệ đường cao với cạnh còn lại bằng sin của góc.', 'Ví dụ khác: khi góc xen giữa vuông, cạnh còn lại chính là đường cao.'),
          ['Đường cao và lý do dùng sin đúng.', 'Diện tích, hệ số một nửa và đơn vị đúng.']);
      }
      return numeric(R`Hai cạnh kề một góc $${angle}^\circ$ của tam giác dài $${b}$ m và $${c}$ m. Tính diện tích tam giác (đơn vị $\mathrm{m}^2$).`, b * c * (angle === 90 ? 1 : 0.5) / 2,
        R`$S=\frac12bc\sin A=\frac12\cdot${b}\cdot${c}\sin${angle}^\circ=${b * c * (angle === 90 ? 1 : 0.5) / 2}$.`,
        h('Góc đã biết nằm giữa hai cạnh đã biết.', 'Biểu diễn đường cao bằng sin.', 'Viết một nửa tích đáy với đường cao.', 'Ví dụ khác: hai cạnh góc vuông cho diện tích bằng nửa tích của chúng.'), c * (b * Math.sin(angle * Math.PI / 180)) / 2);
    }),
  heron: concept('Heron, bán kính nội tiếp và diện tích', 'Chọn công thức diện tích thích hợp khi biết ba cạnh hoặc bán kính nội tiếp.', 'r22-g10-u1-lo03',
    R`GV cho tam giác cạnh 3,4,5 để so diện tích theo đường cao và Heron. Chốt p là nửa chu vi, $S=\sqrt{p(p-a)(p-b)(p-c)}=pr$; kiểm điều kiện tam giác và đơn vị.`,
    'Dùng chu vi thay nửa chu vi; quên căn trong Heron.', (s, d) => {
      const k = n(s);
      return numeric(R`Tam giác có ba cạnh $${3 * k}$ cm, $${4 * k}$ cm, $${5 * k}$ cm. Tính ${d % 2 ? R`bán kính nội tiếp $r$ (cm)` : R`diện tích $S$ ($\mathrm{cm}^2$)`}.`, d % 2 ? k : 6 * k * k,
        R`$p=${6 * k}$; $S=\sqrt{${6 * k}\cdot${3 * k}\cdot${2 * k}\cdot${k}}=${6 * k * k}$. $r=S/p=${k}$.`,
        h('Cộng ba cạnh rồi lấy một nửa.', 'Dùng Heron, sau đó diện tích bằng nửa chu vi nhân bán kính nội tiếp.', 'Tính từng hiệu giữa p và một cạnh.', 'Ví dụ khác: tam giác vuông có thể kiểm diện tích bằng hai cạnh góc vuông.'), d % 2 ? ((3 * k) * (4 * k) / 2) / (6 * k) : (3 * k) * (4 * k) / 2);
    }),
  measure: concept('Đo khoảng cách không đi trực tiếp', 'Mô hình hóa một tình huống đo đạc thành tam giác, chọn định lí phù hợp và diễn giải đơn vị.', 'r22-g10-u1-lo03',
    R`GV vẽ hai trạm A,B và điểm C bên kia vật cản. HS chỉ ra dữ kiện đo được, góc tại trạm và khoảng cách cần tìm. Chốt mô hình phẳng, đo góc chính xác, không cộng độ dài khi đường đi gấp khúc.`,
    'Nhầm quãng đường qua trạm với khoảng cách thẳng; dùng góc ngoài không đổi về góc trong.', (s, d) => {
      const k = n(s);
      return open(R`Hai trạm A,B cách nhau $${2 * k}$ m. Điểm C cùng phía với AB; đo được $\widehat{CAB}=30^\circ$, $\widehat{CBA}=60^\circ$. Em vẽ mô hình, tính góc C và khoảng cách ${d % 2 ? 'BC' : 'AC'}. Kết quả có thể viết dưới dạng căn.`,
        R`Góc C bằng $90^\circ$. Theo định lí sin, $BC=AB\sin30^\circ=${k}$ m, $AC=AB\sin60^\circ=${k}\sqrt3$ m. Khoảng cách hỏi là ${d % 2 ? R`$${k}$ m` : R`$${k}\sqrt3$ m`}; không lấy tổng hai đoạn.`,
        h('AB đối diện góc C.', 'Tìm góc còn lại trước rồi ghép cặp cạnh-góc.', 'Viết tỉ số của cạnh cần tìm với sin góc đối diện.', 'Ví dụ khác: trong tam giác vuông, cạnh huyền đối diện góc 90 độ.'), ['Mô hình và góc đúng.', 'Công thức, kết quả căn và đơn vị đúng.']);
    }),
  inequality: concept('Bất phương trình bậc nhất hai ẩn', 'Nhận dạng bất phương trình bậc nhất hai ẩn và kiểm tra một cặp số có phải nghiệm.', 'r22-g10-u1-lo02',
    R`GV đối chiếu $2x+y\le5$ với $x^2+y\le5$ và $xy<4$. Chốt dạng $ax+by<c$ hoặc các dấu còn lại, a,b không đồng thời bằng 0. Một nghiệm là cả cặp số, không phải một giá trị x rời rạc.`,
    'Bỏ một ẩn khi thay nghiệm; nhận biểu thức có tích xy là bậc nhất.', (s, d) => {
      const k = n(s), rhs = 3 * k + 1;
      if(d>=2)return open(R`Trong $2x+y\le${rhs}$, $x^2+y\le${rhs}$, $xy<${rhs}$, biểu thức nào là bất phương trình bậc nhất hai ẩn? Với bất phương trình đó, kiểm tra $P(${k};${k})$ và $Q(${k+2};${k})$ có là nghiệm không.`,
        R`Chỉ $2x+y\le${rhs}$ có dạng $ax+by\le c$, hai hệ số không đồng thời bằng không. Hai biểu thức còn lại có bình phương hoặc tích hai ẩn. P cho vế trái $${3*k}\le${rhs}$ nên là nghiệm; Q cho $${3*k+4}>${rhs}$ nên không là nghiệm.`,
        h('Bậc nhất không có bình phương hoặc tích hai ẩn.', 'Nhận dạng trước, thay điểm sau.', 'Thay đồng thời hoành độ và tung độ vào vế trái.', R`Ví dụ khác: $x-3y>7$ là bậc nhất hai ẩn, còn $x^2-3y>7$ không phải.`),
        ['Nhận dạng đúng và chỉ ra điều kiện bậc nhất.', 'Kiểm cả hai cặp số, tính vế trái và kết luận đúng.']);
      return choice(R`Cặp số nào là nghiệm của $2x+y\le${rhs}$?`, [math(`(${k};${k})`), math(`(${k + 2};${k})`), math(`(${k};${k + 3})`), math(`(${k + 1};${k + 1})`)], 0,
        R`Thay lần lượt cho vế trái: $${3 * k}$, $${3 * k + 4}$, $${3 * k + 3}$, $${3 * k + 3}$. Chỉ cặp $(${k};${k})$ không vượt $${rhs}$.`,
        h('Một cặp ghi theo thứ tự x rồi y.', 'Thay đồng thời cả hai tọa độ.', 'Tính vế trái trước khi so với vế phải.', 'Ví dụ khác: cặp (0;0) làm mọi biểu thức ax+by bằng không.'), 2 * k + k <= rhs && 2 * (k + 2) + k > rhs);
    }),
  halfplane: concept('Biểu diễn một nửa mặt phẳng nghiệm', 'Vẽ đường biên, dùng điểm thử để chọn nửa mặt phẳng và quyết định có lấy biên.', 'r22-g10-u1-lo02',
    R`GV vẽ $x+y=4$ bằng hai giao trục, thử O ngoài đường biên. HS tô một phía, chốt dấu nghiêm ngặt dùng biên không lấy; có dấu bằng lấy cả biên. Nếu O nằm trên đường biên phải đổi điểm thử.`,
    'Luôn chọn phía chứa O; dùng nét liền cho dấu nghiêm ngặt.', (s, d) => {
      const a = 2 * n(s), strict = d % 2 === 1;
      return open(R`Biểu diễn miền nghiệm $x+2y${strict ? '<' : R`\le`}${a}$ trên hệ trục. Ghi hai giao điểm của đường biên với trục tọa độ, điểm thử và cách lấy biên.`,
        R`Đường biên qua $(${a};0)$ và $(0;${a / 2})$. O cho $0<${a}$ nên chọn nửa mặt phẳng chứa O. ${strict ? 'Không lấy đường biên; dùng nét đứt.' : 'Lấy cả đường biên; dùng nét liền.'}`,
        h('Thay dấu bất phương trình bằng dấu bằng để tìm biên.', 'Tìm giao trục bằng cách cho một tọa độ bằng không.', 'Chọn điểm thử không thuộc đường biên.', 'Ví dụ khác: một điểm đúng chỉ quyết định phía chứa nó, chưa quyết định đường biên có được lấy.'), ['Hai giao trục đúng.', 'Chọn đúng phía và trạng thái đường biên.']);
    }),
  system: concept('Nghiệm của hệ bất phương trình', 'Kiểm tra đồng thời mọi điều kiện của hệ và hiểu miền nghiệm là phần giao.', 'r22-g10-u1-lo02',
    R`GV đưa điều kiện sản xuất x,y không âm cùng giới hạn tổng. HS thử một điểm thỏa hai điều kiện nhưng vi phạm điều kiện thứ ba. Chốt “và” của hệ tương ứng phần giao các miền.`,
    'Chỉ kiểm một bất phương trình; quên điều kiện không âm.', (s, d) => {
      const a = n(s);
      if(d>=2)return open(R`Xét hệ $x\ge0,\ y\ge0,\ x+y\le${3*a}$. Kiểm tra $P(${a};${a})$ và $Q(${2*a};${2*a})$ bằng cả ba điều kiện. Miền nghiệm là phần giao hay phần hợp của ba miền riêng? Giải thích.`,
        R`P có hai tọa độ không âm, tổng $${2*a}\le${3*a}$ nên thỏa hệ. Q có tọa độ không âm nhưng tổng $${4*a}>${3*a}$ nên không thỏa. Miền nghiệm là phần giao vì mọi điều kiện phải đồng thời đúng; đúng một vài điều kiện chưa đủ.`,
        h('Hệ dùng từ “và”: mọi điều kiện cùng đúng.', 'Kiểm dấu hai tọa độ trước rồi kiểm tổng.', 'Dùng điểm Q để phân biệt đúng một vài điều kiện với đúng cả hệ.', 'Ví dụ khác: muốn vừa ở trong hình vuông vừa ở trong hình tròn thì phải ở phần chung.'),
        ['Đối chiếu đủ ba điều kiện cho mỗi điểm.', 'Kết luận đúng hai điểm và giải thích phần giao.']);
      return choice(R`Hệ $x\ge0,\ y\ge0,\ x+y\le${3 * a}$ có nghiệm nào?`, [math(`(${a};${a})`), math(`(-1;${a})`), math(`(${2 * a};${2 * a})`), math(`(${a};-1)`)], 0,
        R`$(${a};${a})$ có hai tọa độ không âm và tổng $${2 * a}\le${3 * a}$. Các cặp khác lần lượt có x âm, vượt tổng, hoặc y âm.`,
        h('Có ba điều kiện phải cùng đúng.', 'Đánh dấu các cặp vi phạm điều kiện dấu trước.', 'Kiểm tổng của các cặp còn lại.', 'Ví dụ khác: đúng một nửa yêu cầu của hệ vẫn chưa là nghiệm.'), a >= 0 && a + a <= 3 * a);
    }),
  polygon: concept('Miền nghiệm đa giác', 'Tìm các đỉnh và biểu diễn phần giao của nhiều nửa mặt phẳng.', 'r22-g10-u1-lo02',
    R`GV vẽ từng đường biên một, chỉ giữ vùng thỏa tất cả điều kiện. Giao của hai đường chưa tự là đỉnh khả thi: thế vào mọi bất phương trình để kiểm.`,
    'Giữ cả giao điểm nằm ngoài miền; chỉ tô từng miền riêng.', s => {
      const k = n(s), a = 6 * k;
      return open(R`Vẽ miền $x\ge0,\ y\ge0,\ x+2y\le${a},\ 2x+y\le${a}$. Tìm các đỉnh, kiểm giao điểm hai đường xiên.`,
        R`Miền tứ giác có đỉnh $(0;0),(${3 * k};0),(${2 * k};${2 * k}),(0;${3 * k})$. Hai đường xiên cho x=y rồi $3x=${a}$, nên giao là $(${2 * k};${2 * k})$, thỏa tất cả điều kiện.`,
        h('Miền nằm trong góc phần tư thứ nhất, kể cả trục.', 'Tìm các giao điểm rồi kiểm tính khả thi.', 'Trừ hai phương trình đường xiên để liên hệ x,y.', 'Ví dụ khác: giao điểm ngoài góc phần tư thứ nhất bị loại khi cả hai biến phải không âm.'), ['Đúng bốn đỉnh.', 'Hình vùng giao và kiểm điều kiện nhất quán.']);
    }),
  optimize: concept('Lập mô hình và tối ưu tuyến tính', 'Lập hệ ràng buộc từ tài nguyên, so sánh hàm mục tiêu tại các đỉnh khả thi.', 'r22-g10-u1-lo02',
    R`GV dùng hai sản phẩm tiêu thụ hai tài nguyên; HS nêu đơn vị của biến, điều kiện không âm và hàm lợi nhuận. Sau khi dựng đa giác, tính giá trị tại mọi đỉnh, không chọn chỉ theo hình đẹp.`,
    'Tối đa hóa số sản phẩm thay lợi nhuận; bỏ một đỉnh.', (s, d) => {
      const k = n(s), a = 6 * k, px = d % 2 ? 5 : 3, py = d % 2 ? 2 : 4;
      const values = [0, 3 * k * px, 2 * k * (px + py), 3 * k * py], best = Math.max(...values);
      if(d>=2){
        const brute=Math.max(...Array.from({length:a+1},(_,x)=>Array.from({length:a+1},(_,y)=>x+2*y<=a&&2*x+y<=a?px*x+py*y:-Infinity)).flat());
        assert.equal(best,brute);mathematicalChecks++;
        return open(R`Mỗi sản phẩm A dùng 1 giờ máy I, 2 giờ máy II; mỗi sản phẩm B dùng 2 giờ máy I, 1 giờ máy II. Mỗi máy có tối đa $${a}$ giờ. Lãi mỗi sản phẩm A/B lần lượt $${px}$/$${py}$ triệu đồng. Gọi x,y là số sản phẩm A,B. Lập hệ ràng buộc và hàm lợi nhuận F; dùng các đỉnh $(0;0),(${3*k};0),(${2*k};${2*k}),(0;${3*k})$ để tìm phương án lãi lớn nhất.`,
          R`$x,y\ge0$ (số sản phẩm nguyên), $x+2y\le${a}$ cho máy I, $2x+y\le${a}$ cho máy II. $F=${px}x+${py}y$. Các đỉnh cho $F=${values.join(';')}$; lãi lớn nhất $${best}$ tại ${values.indexOf(best)===1?R`$(x;y)=(${3*k};0)$`:R`$(x;y)=(${2*k};${2*k})$`}. Đỉnh tối ưu có tọa độ nguyên nên dùng được trong mô hình sản phẩm.`,
          h('Mỗi máy tạo một giới hạn tài nguyên riêng.', 'Hệ số của x,y lấy từ số giờ cho từng sản phẩm.', 'Lập lợi nhuận theo số lượng nhân lãi đơn vị rồi so ở đủ các đỉnh.', 'Ví dụ khác: một sản phẩm dùng 3 giờ máy thì làm x sản phẩm dùng 3x giờ, không phải 3+x giờ.'),
          ['Lập đúng hai ràng buộc, miền biến và hàm lợi nhuận.', 'So sánh đủ các đỉnh, chọn đúng phương án khả thi và đơn vị lãi.']);
      }
      return numeric(R`Một xưởng làm x sản phẩm A, y sản phẩm B. Ràng buộc $x,y\ge0$, $x+2y\le${a}$, $2x+y\le${a}$. Lợi nhuận $F=${px}x+${py}y$ (triệu đồng). Tìm giá trị lớn nhất của F.`, best,
        R`Các đỉnh $(0;0),(${3 * k};0),(${2 * k};${2 * k}),(0;${3 * k})$ cho F lần lượt $${values.join(';')}$. Giá trị lớn nhất là $${best}$ triệu đồng.`,
        h('Miền nghiệm là phần giao của bốn điều kiện.', 'Hàm tuyến tính đạt cực trị tại một đỉnh khi miền đa giác bị chặn.', 'Liệt kê đủ các đỉnh trước khi thay vào F.', 'Ví dụ khác: tăng sản lượng một loại có thể làm hết tài nguyên cần cho loại kia.'), Math.max(...Array.from({ length: a + 1 }, (_, x) => Array.from({ length: a + 1 }, (_, y) => x + 2 * y <= a && 2 * x + y <= a ? px * x + py * y : -Infinity)).flat()));
    }),
  vectorIntro: concept('Hướng, độ dài và hai vectơ bằng nhau', 'Phân biệt cùng phương, cùng hướng, ngược hướng và bằng nhau của các vectơ.', 'r22-g10-u1-lo04',
    R`GV vẽ hình vuông ABCD theo thứ tự quanh hình, vẽ mũi tên AB, DC, CD. Hai vectơ bằng nhau phải cùng hướng và cùng độ dài; cùng phương chưa đủ. Vectơ không có độ dài bằng không, không gán cho nó hướng riêng.`,
    'Cho AB bằng CD chỉ vì hai đoạn bằng nhau; lẫn điểm đầu với điểm cuối.', (s, d) => {
      const k = n(s);
      return open(R`Vẽ hình vuông ABCD theo thứ tự quanh hình, cạnh $${k}$ cm. So sánh $\overrightarrow{AB}$ với $\overrightarrow{DC}$ và $\overrightarrow{CD}$ về phương, hướng, độ dài. ${d % 2 ? R`Có thể kết luận $\overrightarrow{AB}=\overrightarrow{BC}$ không?` : R`Nêu một vectơ khác $\overrightarrow{AB}$ nhưng bằng nó trong hình.`}`,
        R`$\overrightarrow{AB}$ và $\overrightarrow{DC}$ cùng phương, cùng hướng, cùng độ dài ${k} cm nên bằng nhau. $\overrightarrow{CD}$ ngược hướng với $\overrightarrow{AB}$, cùng độ dài nên là vectơ đối. $\overrightarrow{BC}$ khác phương AB, không bằng AB.`,
        h('Đặt mũi tên theo thứ tự tên hai điểm.', 'Kiểm cả hướng lẫn độ dài.', 'So hai cạnh đối bằng cách nhìn từ điểm đầu đến điểm cuối.', 'Ví dụ khác: hai mũi tên dài bằng nhau nhưng quay ngược nhau không phải hai vectơ bằng nhau.'), ['So sánh đúng phương, hướng và độ dài.', 'Giải thích đúng điều kiện bằng nhau.']);
    }),
  vectorSum: concept('Tổng vectơ và quy tắc hình bình hành', 'Áp dụng quy tắc ba điểm và hình bình hành để biểu diễn tổng vectơ.', 'r22-g10-u1-lo04',
    R`GV cho một em đi từ A đến B rồi từ B đến C; dời vectơ để đầu nối đuôi, chốt AB+BC=AC. Với hai vectơ chung gốc, dựng hình bình hành, tổng là đường chéo từ gốc chung. Không cộng độ dài để thay tổng vectơ.`,
    'Cộng hai độ dài dù hai vectơ không cùng hướng; ghép sai đầu-đuôi.', (s, d) => {
      const k = n(s);
      return open(R`Hình chữ nhật ABCD có $AB=${3 * k}$ cm, $AD=${4 * k}$ cm. Rút gọn ${math(d % 2 ? R`\overrightarrow{AB}+\overrightarrow{BC}` : R`\overrightarrow{AB}+\overrightarrow{AD}`)}, vẽ vectơ tổng và tính độ dài của nó.`,
        R`Theo quy tắc ${d % 2 ? 'ba điểm' : 'hình bình hành'}, tổng là $\overrightarrow{AC}$. $AC=\sqrt{(${3 * k})^2+(${4 * k})^2}=${5 * k}$ cm; không phải tổng hai cạnh.`,
        h('Vẽ rõ hai vectơ trong hình chữ nhật.', 'Chọn quy tắc phù hợp hai vectơ chung gốc hay nối nhau.', 'Xác định điểm đầu và cuối của vectơ tổng.', 'Ví dụ khác: đi A đến B rồi B đến A có độ dời bằng vectơ không.'), ['Rút gọn đúng vectơ, mũi tên đúng.', 'Tính đúng độ dài đường chéo bằng Pythagore.']);
    }),
  vectorRelations: concept('Phân biệt hướng và độ dài trong cấu hình', 'Dùng cấu hình thẳng hàng để bác bỏ nhận xét sai về hai vectơ cùng phương hoặc bằng nhau.', 'r22-g10-u1-lo04',
    R`GV đặt A,B,C thẳng hàng theo thứ tự, AB=BC; yêu cầu từng em chỉ mũi tên trước khi phát biểu. Chốt AB=BC nhưng AC không bằng CB vì khác hướng và khác độ dài. Một phản ví dụ đủ bác bỏ quy tắc sai.`,
    'Cho mọi vectơ cùng phương đều bằng nhau; coi độ dài bằng nhau quyết định hướng.', (s, d) => {
      const k = n(s);
      return open(R`A,B,C thẳng hàng theo thứ tự, $AB=BC=${k}$ cm. Xét đúng/sai rồi sửa nếu sai: (a) $\overrightarrow{AB}=\overrightarrow{BC}$; (b) $\overrightarrow{AC}$ và $\overrightarrow{CB}$ cùng hướng; (c) mọi vectơ cùng phương trong hình đều bằng nhau. ${d % 2 ? 'Cho một cặp vectơ đối nhau.' : 'Tính độ dài AC và CB để đối chiếu.'}`,
        R`(a) đúng: cùng hướng từ A đến C và cùng độ dài. (b) sai: AC đi từ A về C, CB quay ngược. (c) sai: AC dài ${2 * k} cm, CB dài ${k} cm. AB và BA là một cặp vectơ đối nhau.`,
        h('Đánh dấu thứ tự A,B,C trên một đường thẳng.', 'Kiểm từng nhận xét bằng hướng và độ dài riêng.', 'Vẽ đầu mũi tên của vectơ thứ hai trước khi so.', 'Ví dụ khác: đi từ điểm trái sang phải và quay từ phải sang trái tạo hai hướng ngược.'), ['Ba nhận xét được xét đúng và có sửa sai.', 'Có bằng chứng về hướng và độ dài.']);
    }),
  vectorDifference: concept('Hiệu vectơ và vectơ đối', 'Chuyển hiệu thành tổng với vectơ đối, dùng quy tắc hiệu hai vectơ chung gốc.', 'r22-g10-u1-lo04',
    R`GV vẽ AB và AC chung gốc A; chốt AB−AC=CB. Đảo thứ tự hiệu sẽ đổi hướng. HS kiểm bằng cách cộng AC vào hai vế, không học thuộc một mũi tên rời hình.`,
    'Cho AB−AC=BC; đổi nhầm cả hai vectơ.', (s, d) => {
      const k = n(s);
      return open(R`Tam giác ABC vuông tại A, $AB=${3 * k}$ cm, $AC=${4 * k}$ cm. Rút gọn ${math(d % 2 ? R`\overrightarrow{AC}-\overrightarrow{AB}` : R`\overrightarrow{AB}-\overrightarrow{AC}`)}, vẽ hướng và tính độ dài của vectơ hiệu.`,
        R`Hiệu là ${math(d % 2 ? R`\overrightarrow{BC}` : R`\overrightarrow{CB}`)}. Độ dài $BC=\sqrt{(${3 * k})^2+(${4 * k})^2}=${5 * k}$ cm. Hai thứ tự hiệu cho vectơ đối nhau, cùng độ dài.`,
        h('Hai vectơ trong hiệu có cùng điểm đầu.', 'Đổi phép trừ thành cộng với vectơ đối.', 'Theo dõi điểm đầu của vectơ đứng sau và điểm cuối của vectơ đứng trước.', 'Ví dụ khác: OA−OB bắt đầu ở B và kết thúc ở A.'), ['Đúng điểm đầu, điểm cuối và dấu.', 'Tính đúng độ dài, không lấy hiệu độ dài hai cạnh.']);
    }),
  vectorChain: concept('Rút gọn chuỗi vectơ', 'Ghép các vectơ theo đường đi, kiểm tổng khép kín và giải thích quy tắc trung điểm.', 'r22-g10-u1-lo04',
    R`GV cho đường đi A→B→C→D và đường khép kín quay lại A. HS tự ghép từng cặp; tổng đường khép kín bằng vectơ không. Với I là trung điểm AB, dùng IA và IB đối nhau để kiểm kết quả.`,
    'Cho tổng khép kín bằng tổng độ dài; bỏ chiều khi thay điểm.', (s, d) => {
      const k = n(s);
      if(d>=2)return open(R`Hình chữ nhật ABCD có $AB=${k}$, $AD=${k+2}$; I là trung điểm AB. Rút gọn $\overrightarrow{AB}+\overrightarrow{BC}+\overrightarrow{CD}$; tính tổng khi cộng thêm $\overrightarrow{DA}$ và tính $\overrightarrow{IA}+\overrightarrow{IB}$. Nêu lý do cho hai tổng cuối.`,
        R`Tổng ba vectơ đầu là $\overrightarrow{AD}$. Thêm $\overrightarrow{DA}$ tạo đường khép kín nên tổng là $\vec0$. I là trung điểm nên $\overrightarrow{IA}$ và $\overrightarrow{IB}$ đối nhau, tổng cũng là $\vec0$.`,
        h('Ghép đầu cuối theo đường đi.', 'Đường khép kín quay về điểm xuất phát.', 'Với trung điểm, kiểm riêng hướng và độ dài của hai vectơ xuất phát ở I.', 'Ví dụ khác: đi từ P đến Q rồi quay về P có độ dời bằng không.'),
        ['Rút gọn đúng chuỗi ba vectơ.', 'Giải thích đúng tổng khép kín và hai vectơ đối từ trung điểm.']);
      return open(R`Hình chữ nhật ABCD có $AB=${k}$, $AD=${k + 2}$. Rút gọn $\overrightarrow{AB}+\overrightarrow{BC}+\overrightarrow{CD}$. ${d % 2 ? R`Nếu cộng tiếp $\overrightarrow{DA}$, tổng bằng gì?` : R`Gọi I là trung điểm AB. Tính $\overrightarrow{IA}+\overrightarrow{IB}$.`}`,
        R`Ba vectơ đầu ghép thành $\overrightarrow{AD}$. Thêm $\overrightarrow{DA}$ cho $\overrightarrow0$. Với I là trung điểm, IA và IB đối nhau nên tổng cũng bằng $\overrightarrow0$.`,
        h('Nối các mũi tên theo thứ tự đi.', 'Tổng phụ thuộc độ dời từ đầu đến cuối đường đi.', 'Ghép hai vectơ đầu thành một trước.', 'Ví dụ khác: một vòng quay về vị trí xuất phát có độ dời bằng không.'), ['Ghép đúng chuỗi và giữ đúng chiều.', 'Giải thích được tổng khép kín hoặc cặp đối nhau.']);
    }),
  vectorScale: concept('Nhân vectơ với một số', 'Xác định hướng và độ dài của vectơ nhân với một số; vận dụng quy tắc phân phối.', 'r22-g10-u2-lo01',
    R`GV giữ một mũi tên $\vec a$, dựng $2\vec a,-2\vec a,0\vec a$. Chốt độ dài dùng trị tuyệt đối của hệ số, hướng theo dấu. Làm mẫu $2(\vec a+\vec b)-\vec a=\vec a+2\vec b$ và $-3(\vec a+\vec b)-\vec a=-4\vec a-3\vec b$ bằng phân phối. Phân phối hệ số tới cả hai vectơ, sau đó gộp cùng loại.`,
    'Cho độ dài âm khi hệ số âm; nói 0a có cùng hướng với a.', (s, d) => {
      const a = n(s), factor = d % 2 ? -3 : 2;
      if (d >= 2) {
        const coefficient = factor - 1, length = Math.abs(coefficient) * a;
        assert.equal(Math.hypot(coefficient * a, 0), length);
        for (const [u, v] of [[a, 1], [-2, a]]) assert.equal(factor * (u + v) - u, coefficient * u + factor * v);
        mathematicalChecks += 3;
        return open(R`Cho $|\vec a|=${a}$ cm, $\vec b$ tùy ý. (a) Với $\vec v=${factor}\vec a-\vec a$, nêu hướng của $\vec v$ so với $\vec a$ và tính $|\vec v|$. (b) Dùng quy tắc phân phối để rút gọn $${factor}(\vec a+\vec b)-\vec a$.`,
          R`$\vec v=${coefficient}\vec a$, ${coefficient < 0 ? 'ngược' : 'cùng'} hướng với $\vec a$; $|\vec v|=|${coefficient}|\cdot${a}=${length}$ cm. Phân phối: $${factor}(\vec a+\vec b)-\vec a=(${factor}-1)\vec a+(${factor})\vec b=${coefficient}\vec a+(${factor})\vec b$.`,
          h('Có hai việc riêng: hướng/độ dài và rút gọn tổ hợp vectơ.', 'Hướng dùng dấu hệ số; độ dài dùng trị tuyệt đối.', 'Ở phần phân phối, nhân hệ số ngoài ngoặc vào từng vectơ rồi gộp cùng loại.', R`Ví dụ khác: $4(\vec u+\vec w)-2\vec u=2\vec u+4\vec w$; nếu $|\vec u|=5$ thì $|-2\vec u|=10$, ngược hướng với $\vec u$.`),
          ['Gộp đúng hệ số, nêu đúng hướng và độ dài.', 'Phân phối tới cả hai vectơ, gộp đúng các hạng tử cùng loại.']);
      }
      return numeric(R`Vectơ $\vec a$ có độ dài $${a}$ cm. Tính độ dài của vectơ $${factor}\vec a-\vec a$ (cm).`, Math.abs(factor - 1) * a,
        R`$${factor}\vec a-\vec a=(${factor}-1)\vec a=${factor - 1}\vec a$. Độ dài $|${factor - 1}|\cdot${a}=${Math.abs(factor - 1) * a}$ cm; hướng ${factor - 1 < 0 ? 'ngược' : 'cùng'} với a.`,
        h('Gộp hệ số của cùng một vectơ trước.', 'Độ dài tích dùng trị tuyệt đối của hệ số.', 'Tính hệ số sau phép trừ, chưa nhân độ dài.', 'Ví dụ khác: vectơ đối có cùng độ dài với vectơ ban đầu.'), Math.hypot((factor - 1) * a, 0));
    }),
  vectorMidpoint: concept('Trung điểm và trọng tâm bằng vectơ', 'Dùng hệ thức trung điểm hoặc trọng tâm để biểu diễn tổng vectơ theo một gốc tùy ý.', 'r22-g10-u2-lo01',
    R`GV lấy I trung điểm AB rồi ghép OA=OI+IA, OB=OI+IB. Hai vectơ IA,IB triệt tiêu; chốt OA+OB=2OI. Với trọng tâm G, GA+GB+GC=0. Phân biệt trung điểm với điểm chia đoạn theo tỉ lệ khác.`,
    'Thiếu hệ số 2 hoặc 3; cho tổng từ gốc bất kỳ bằng không.', (s, d) => {
      const k = n(s);
      return open(d % 2 ? R`G là trọng tâm tam giác ABC, O tùy ý và $|\overrightarrow{OG}|=${k}$ cm. Rút gọn $\overrightarrow{OA}+\overrightarrow{OB}+\overrightarrow{OC}$ rồi tính độ dài vectơ tổng.` : R`I là trung điểm AB, O tùy ý và $|\overrightarrow{OI}|=${k}$ cm. Chứng minh $\overrightarrow{OA}+\overrightarrow{OB}=2\overrightarrow{OI}$ rồi tính độ dài vectơ tổng.`,
        d % 2 ? R`Tách mỗi vectơ qua G: tổng bằng $3\overrightarrow{OG}+\overrightarrow{GA}+\overrightarrow{GB}+\overrightarrow{GC}=3\overrightarrow{OG}$; độ dài $${3 * k}$ cm.` : R`Tách qua I: tổng bằng $2\overrightarrow{OI}+\overrightarrow{IA}+\overrightarrow{IB}=2\overrightarrow{OI}$; độ dài $${2 * k}$ cm.`,
        h('Chèn trung điểm hoặc trọng tâm vào mỗi vectơ.', 'Tìm các vectơ có tổng bằng không.', 'Viết vectơ đầu tiên thành tổng hai vectơ qua điểm đặc biệt.', 'Ví dụ khác: IA và IB đối nhau khi I là trung điểm AB.'), ['Tách vectơ và hệ thức đúng.', 'Hệ số, độ dài đúng; phân biệt gốc O với điểm đặc biệt.']);
    }),
  coordinates: concept('Tọa độ điểm và vectơ', 'Tính tọa độ vectơ từ hai điểm và xác định điểm cuối khi biết điểm đầu, vectơ.', 'r22-g10-u2-lo02',
    R`GV dùng ô lưới: đi từ A đến B thay đổi hoành độ, tung độ bao nhiêu? Chốt AB=(xB−xA;yB−yA); tọa độ điểm không tự là tọa độ mọi vectơ kết thúc ở điểm đó.`,
    'Lấy đầu trừ cuối; lẫn tọa độ điểm B với vectơ AB.', (s, d) => {
      const a = n(s), ax = a, ay = 1 - a, bx = a + 3, by = a + 2;
      return open(R`Cho $A(${ax};${ay})$, $B(${bx};${by})$. Tính $\overrightarrow{AB}$. Tìm C sao cho $\overrightarrow{AC}=${math(`(${d % 2 ? -2 : 2};${a})`).slice(1, -1)}$.`,
        R`$\overrightarrow{AB}=(${bx}-${ax};${by}-(${ay}))=(3;${2 * a + 1})$. $C=(${ax + (d % 2 ? -2 : 2)};${ay + a})$ vì tọa độ C bằng tọa độ A cộng tọa độ AC.`,
        h('Phân biệt điểm với độ dời.', 'Vectơ đi từ đầu đến cuối nên lấy cuối trừ đầu.', 'Lập riêng phương trình hoành độ và tung độ của C.', 'Ví dụ khác: nếu AB=(0;2), A và B có cùng hoành độ.'), ['Đúng hai tọa độ AB.', 'Tìm đúng C và kiểm lại bằng phép trừ.']);
    }),
  coordinateOperations: concept('Phép toán tọa độ và độ dài', 'Tính tổ hợp tuyến tính theo tọa độ và độ dài của một vectơ trong hệ trục vuông góc.', 'r22-g10-u2-lo02',
    R`GV đặt u,v thành hai cột tọa độ, chỉ cộng/trừ cùng vị trí. Chốt độ dài là căn tổng hai bình phương. Tích với số thực nhân cả hai tọa độ, kể cả dấu âm.`,
    'Nhân hệ số cho một tọa độ; lấy tổng trị tuyệt đối làm độ dài.', (s, d) => {
      const k = n(s), u = [k, 2], v = [1, k], coefficient = d % 2 ? -2 : 2;
      return open(R`Cho $\vec u=(${u.join(';')})$, $\vec v=(${v.join(';')})$. Tính $\vec w=${coefficient}\vec u-\vec v$, $|\vec w|^2$ và $|\vec w|$; giữ căn thức chính xác nếu cần.`,
        R`$\vec w=(${coefficient * k - 1};${2 * coefficient - k})$. $|\vec w|^2=(${coefficient * k - 1})^2+(${2 * coefficient - k})^2=${(coefficient * k - 1) ** 2 + (2 * coefficient - k) ** 2}$. Độ dài là căn không âm: $|\vec w|=\sqrt{${(coefficient * k - 1) ** 2 + (2 * coefficient - k) ** 2}}$.`,
        h('Nhân hệ số cho cả hai tọa độ của u.', 'Thực hiện từng tọa độ riêng.', 'Tính tổng hai bình phương rồi lấy căn không âm.', 'Ví dụ khác: bình phương độ dài của (1;−2) là 5, còn độ dài là căn bậc hai của 5.'), ['Hai tọa độ tổ hợp đúng.', 'Bình phương độ dài và độ dài thực sự đúng, lấy căn không âm.']);
    }),
  coordinateMidpoint: concept('Trung điểm, trọng tâm và điểm thẳng hàng', 'Dùng tọa độ để tìm trung điểm/trọng tâm và kiểm quan hệ thẳng hàng.', 'r22-g10-u2-lo02',
    R`GV suy $M((x_A+x_B)/2;(y_A+y_B)/2)$ và $G((x_A+x_B+x_C)/3;(y_A+y_B+y_C)/3)$ từ hệ thức vectơ. Mẫu $A(0;0),B(6;0),C(0;6)$ cho $M(3;0),G(2;2)$; kiểm $\overrightarrow{CG}=\frac23\overrightarrow{CM}$ nên $C,G,M$ thẳng hàng. Phải dùng ba đỉnh không thẳng hàng để nói trọng tâm tam giác.`,
    'Lấy tổng tọa độ mà quên chia 2 hoặc 3; dùng tỉ số có mẫu bằng không.', (s, d) => {
      const k = n(s), A = [k, 1], B = [k + 4, 5], C = [k + 2, 3];
      if (d >= 2) {
        const orientation = d % 2 ? -1 : 1, a = [k, 0], b = [k + 6, 0], c = [k, 6 * orientation];
        const midpoint = [k + 3, 0], centroid = [k + 2, 2 * orientation];
        assert.equal((a[0] + b[0] + c[0]) / 3, centroid[0]);
        assert.equal((a[1] + b[1] + c[1]) / 3, centroid[1]);
        assert.deepEqual(centroid.map((value, i) => value - c[i]), midpoint.map((value, i) => 2 * (value - c[i]) / 3));
        mathematicalChecks += 3;
        return open(R`Cho tam giác $A(${a.join(';')})$, $B(${b.join(';')})$, $C(${c.join(';')})$. Tìm trung điểm M của AB, trọng tâm G của tam giác ABC; tính $\overrightarrow{CG}$ và $\overrightarrow{CM}$ để kiểm tra C,G,M thẳng hàng.`,
          R`$M((${k}+${k+6})/2;0)=(${midpoint.join(';')})$. $G((${k}+${k+6}+${k})/3;(0+0+${c[1]})/3)=(${centroid.join(';')})$. $\overrightarrow{CG}=(2;${-4*orientation})$, $\overrightarrow{CM}=(3;${-6*orientation})$ nên $\overrightarrow{CG}=\frac23\overrightarrow{CM}$; C,G,M thẳng hàng.`,
          h('Trung điểm dùng hai điểm; trọng tâm dùng ba đỉnh của tam giác.', 'Tính trung bình riêng từng tọa độ, chia đúng cho 2 hoặc 3.', 'Lấy điểm cuối trừ điểm đầu để tìm hai vectơ cần so sánh.', R`Ví dụ khác: tam giác $P(0;0),Q(3;0),R(0;3)$ có trọng tâm $(1;1)$; một cặp vectơ bằng bội số khác không của nhau chứng tỏ cùng phương.`),
          ['Trung điểm M và trọng tâm G đúng ở cả hai tọa độ.', 'Hai vectơ đúng; nêu được hệ số tỉ lệ và kết luận thẳng hàng.']);
      }
      return open(R`Cho $A(${A.join(';')})$, $B(${B.join(';')})$, $C(${C.join(';')})$. Chứng minh C là trung điểm AB bằng tọa độ. Tìm D sao cho ${d % 2 ? R`$\overrightarrow{AD}=2\overrightarrow{AB}$` : R`$\overrightarrow{AD}=-\overrightarrow{AB}$`}.`,
        R`Tọa độ trung điểm là $((${k}+${k + 4})/2;(1+5)/2)=(${C.join(';')})$. $\overrightarrow{AB}=(4;4)$; D có tọa độ $(${d % 2 ? k + 8 : k - 4};${d % 2 ? 9 : -3})$. Các vectơ tỉ lệ nên A,B,D thẳng hàng.`,
        h('Trung điểm lấy trung bình từng tọa độ.', 'Tính AB rồi nhân hệ số.', 'Cộng vectơ AD vào tọa độ A để tìm D.', 'Ví dụ khác: điểm đầu và vectơ xác định duy nhất điểm cuối.'), ['Kiểm trung điểm đúng bằng cả hai tọa độ.', 'Điểm D, hệ số và quan hệ thẳng hàng đúng.']);
    }),
  dotAngle: concept('Góc giữa hai vectơ và tích vô hướng', 'Xác định góc giữa hai vectơ chung gốc và tính tích vô hướng từ độ dài, góc.', 'r22-g10-u2-lo01',
    R`GV dời hai vectơ về cùng gốc, chọn góc từ 0 đến 180 độ. Chốt u·v=|u||v|cosθ; hai vectơ vuông góc cho tích bằng không, vectơ đối hướng cho tích âm. Đảo một vectơ đổi dấu tích.`,
    'Lấy góc nhọn giữa hai đường thẳng thay góc giữa hai vectơ; quên cos.', (s, d) => {
      const a = 2 * n(s), b = 4 + s % 9, angle = d % 2 ? 120 : 60;
      if(d>=2){
        const actualAngle=180-angle,product=a*b*(actualAngle===60?.5:-.5);
        assert.ok(Math.abs(a*b*Math.cos(actualAngle*Math.PI/180)-product)<1e-8); mathematicalChecks++;
        return open(R`Tam giác ABC có $AB=${a}$, $AC=${b}$, $\widehat{BAC}=${angle}^\circ$. Xác định góc giữa $\overrightarrow{BA}$ và $\overrightarrow{AC}$ bằng cách dời về chung gốc, rồi tính $\overrightarrow{BA}\cdot\overrightarrow{AC}$.`,
          R`$\overrightarrow{BA}$ đối hướng với $\overrightarrow{AB}$ nên góc với $\overrightarrow{AC}$ bằng $180^\circ-${angle}^\circ=${actualAngle}^\circ$. Tích vô hướng là $${a}\cdot${b}\cos${actualAngle}^\circ=${product}$.`,
          h('Góc ở A là góc của AB với AC, không phải BA với AC.', 'Vẽ mũi tên rồi dời vectơ cần xét về chung gốc.', 'Đảo hướng một vectơ thay góc bởi góc bù và đổi dấu cos.', 'Ví dụ khác: hai vectơ cùng hướng có góc 0 độ; đảo một vectơ thì góc thành 180 độ.'),
          ['Xác định đúng góc của hai vectơ có hướng.', 'Dùng đúng góc, tính đúng tích vô hướng và dấu.']);
      }
      return numeric(R`Hai vectơ có độ dài $${a}$ và $${b}$, góc giữa chúng là $${angle}^\circ$. Tính tích vô hướng của chúng.`, a * b * (angle === 60 ? 0.5 : -0.5),
        R`$\vec u\cdot\vec v=|\vec u||\vec v|\cos${angle}^\circ=${a}\cdot${b}\cdot(${angle === 60 ? '1/2' : '-1/2'})=${a * b * (angle === 60 ? 0.5 : -0.5)}$.`,
        h('Góc phải là góc giữa hai mũi tên khi chung gốc.', 'Dùng tích hai độ dài nhân cos góc.', 'Xác định dấu cos của góc đã cho trước.', 'Ví dụ khác: hai vectơ vuông góc có tích vô hướng bằng không.'), a * (b * Math.cos(angle * Math.PI / 180)));
    }),
  dotCoordinates: concept('Tích vô hướng theo tọa độ', 'Tính tích vô hướng theo tọa độ, kiểm điều kiện vuông góc và tính chất phân phối.', 'r22-g10-u2-lo01',
    R`GV khai triển theo hai vectơ đơn vị vuông góc để được u·v=x1x2+y1y2. HS đối chiếu với công thức độ dài-góc. Chốt muốn vuông góc thì tích bằng không; riêng góc cần hai vectơ khác không.`,
    'Nhân chéo tọa độ; nhầm tích vô hướng với một vectơ.', (s, d) => {
      const k = n(s), u = [k, 2], v = [3, d % 2 ? -k : k];
      if(d>=2){
        const w=[2,-k],uv=u[0]*v[0]+u[1]*v[1],uw=u[0]*w[0]+u[1]*w[1];
        const sum=v.map((value,i)=>value+w[i]),direct=u[0]*sum[0]+u[1]*sum[1];
        assert.equal(uw,0);assert.equal(direct,uv+uw);mathematicalChecks+=2;
        return open(R`Cho $\vec u=(${u.join(';')})$, $\vec v=(${v.join(';')})$, $\vec w=(${w.join(';')})$. Tính $\vec u\cdot\vec v$, kiểm tra $\vec u$ và $\vec w$ có vuông góc không; tính $\vec u\cdot(\vec v+\vec w)$ bằng phân phối rồi đối chiếu với cách cộng tọa độ trước.`,
          R`$\vec u\cdot\vec v=${uv}$. $\vec u\cdot\vec w=${k}\cdot2+2\cdot(-${k})=0$; hai vectơ khác không nên vuông góc. Phân phối cho $\vec u\cdot(\vec v+\vec w)=${uv}+0=${direct}$. Cộng trước được $\vec v+\vec w=(${sum.join(';')})$, tích theo tọa độ cũng là $${direct}$.`,
          h('Nhân cùng vị trí rồi cộng để tính mỗi tích vô hướng.', 'Vuông góc của hai vectơ khác không tương ứng tích bằng không.', 'Tính hai tích bên phải để dùng phân phối, rồi kiểm lại bằng tọa độ tổng.', R`Ví dụ khác: $(1;0)\cdot[(2;1)+(3;4)]=5=2+3$; hai vectơ đơn vị theo hai trục có tích bằng không.`),
          ['Tính đúng tích vô hướng và kiểm vuông góc kèm điều kiện khác không.', 'Vận dụng đúng phân phối và đối chiếu với cách tính trực tiếp.']);
      }
      return numeric(R`Cho $\vec u=(${u.join(';')})$, $\vec v=(${v.join(';')})$. Tính $\vec u\cdot\vec v$.`, u[0] * v[0] + u[1] * v[1],
        R`$\vec u\cdot\vec v=${u[0]}\cdot${v[0]}+${u[1]}\cdot(${v[1]})=${u[0] * v[0] + u[1] * v[1]}$. Kết quả là một số.`,
        h('Nhân các tọa độ cùng vị trí.', 'Cộng hai tích vừa tìm, không tạo một cặp tọa độ.', 'Viết riêng tích hoành độ và tích tung độ.', 'Ví dụ khác: (1;0) nhân vô hướng (0;1) bằng không.'), (Math.hypot(u[0] + v[0], u[1] + v[1]) ** 2 - Math.hypot(...u) ** 2 - Math.hypot(...v) ** 2) / 2);
    }),
  perpendicular: concept('Vuông góc và góc trong tọa độ', 'Tìm tham số từ điều kiện vuông góc và tính cos góc giữa hai vectơ khác không.', 'r22-g10-u2-lo01',
    R`GV đặt $\vec u=(a;1),\vec v=(1;m)$, lập tích bằng $0$ rồi giải $m$. Với $\vec p=(2;1),\vec q=(2;-1)$, tích bằng $3$, hai độ dài đều $\sqrt5$ nên cos góc bằng $3/5$. Chốt $\cos\theta=(\vec p\cdot\vec q)/(|\vec p||\vec q|)$, hai vectơ phải khác không; kiểm kết quả thuộc $[-1;1]$.`,
    'Cho hai vectơ cùng phương khi tích bằng không; chia độ dài vectơ không.', (s, d) => {
      const k = n(s), a = d % 2 ? -k : k;
      if (d >= 2) {
        const cosineNumerator = a * a - 1, cosineDenominator = a * a + 1;
        const computed = (a * a - 1) / (Math.hypot(a, 1) * Math.hypot(a, -1));
        assert.ok(Math.abs(computed - cosineNumerator / cosineDenominator) < 1e-12);
        assert.equal(a * 2 + (-2 * a), 0); mathematicalChecks += 2;
        return open(R`(a) Tìm m để $\vec u=(${a};1)$ và $\vec v=(2;m)$ vuông góc. (b) Tính cos góc giữa hai vectơ $\vec p=(${a};1)$ và $\vec q=(${a};-1)$; ghi dạng phân số.`,
          R`(a) $2\cdot${a}+m=0$ nên $m=${-2*a}$. (b) $\vec p\cdot\vec q=${a}^2-1=${cosineNumerator}$; $|\vec p|=|\vec q|=\sqrt{${cosineDenominator}}$. Do đó $\cos\theta=\frac{${cosineNumerator}}{${cosineDenominator}}$, thuộc $[-1;1]$. Các vectơ đều khác không.`,
          h('Phần (a) dùng tích vô hướng bằng không; phần (b) cần thêm hai độ dài.', 'Tính tích vô hướng và từng độ dài bằng tọa độ.', 'Mẫu của công thức cos là tích hai độ dài, không phải tổng.', R`Ví dụ khác: $\vec r=(1;0),\vec s=(1;1)$ cho cos góc bằng $1/\sqrt2$; hai vectơ khác không mới xác định được góc.`),
          ['Tìm đúng tham số từ điều kiện tích vô hướng bằng không.', 'Tính đúng tích, hai độ dài và phân số cos; kiểm miền giá trị.']);
      }
      return numeric(R`Tìm m để hai vectơ $\vec u=(${a};1)$ và $\vec v=(2;m)$ vuông góc.`, -2 * a,
        R`Hai vectơ khác không. Điều kiện $\vec u\cdot\vec v=2\cdot${a}+m=0$, suy ra $m=${-2 * a}$.`,
        h('Vuông góc tương ứng tích vô hướng bằng không.', 'Lập tích theo tọa độ.', 'Gom phần có m về một vế.', 'Ví dụ khác: hai vectơ theo hai trục tọa độ vuông góc dù không cùng phương.'), -(a * 2) / 1);
    }),
  dotLength: concept('Độ dài tổng qua tích vô hướng', 'Khai triển bình phương độ dài tổng/hiệu vectơ, giữ đúng dấu và hệ số của tích vô hướng.', 'r22-g10-u2-lo01',
    R`GV viết |u+v|²=(u+v)·(u+v), khai triển bốn tích rồi gộp. Chốt |u±v|²=|u|²+|v|²±2u·v; hỏi khi nào tổng độ dài mới bằng độ dài tổng.`,
    'Bỏ số hạng chéo hoặc hệ số hai; cho |u+v| luôn bằng |u|+|v|.', (s, d) => {
      const k = n(s), a = 2 * k, b = 3 * k, minus = d % 2 === 1, dot = a * b / 2;
      return numeric(R`Cho $|\vec u|=${a}$, $|\vec v|=${b}$, góc giữa hai vectơ bằng $60^\circ$. Tính $|\vec u${minus ? '-' : '+'}\vec v|^2$.`, a * a + b * b + (minus ? -2 : 2) * dot,
        R`$\vec u\cdot\vec v=${a}\cdot${b}/2=${dot}$. Bình phương độ dài là $${a}^2+${b}^2${minus ? '-' : '+'}2\cdot${dot}=${a * a + b * b + (minus ? -2 : 2) * dot}$.`,
        h('Đề hỏi bình phương độ dài.', 'Khai triển tích vô hướng của vectơ với chính nó.', 'Tính tích u với v từ góc trước.', 'Ví dụ khác: khi u và v vuông góc, số hạng chéo bằng không.'), (a + (minus ? -1 : 1) * b * Math.cos(Math.PI / 3)) ** 2 + (b * Math.sin(Math.PI / 3)) ** 2);
    }),
  approximation: concept('Sai số tuyệt đối, tương đối và quy tròn', 'Phân biệt giá trị gần đúng, sai số tuyệt đối/tương đối và quy tròn theo độ chính xác yêu cầu.', 'r22-g10-u2-lo03',
    R`GV so giá trị đúng 2,50 với gần đúng 2,48; sai số tuyệt đối là độ chênh, tương đối bằng độ chênh chia độ lớn giá trị gần đúng theo quy ước bài. Chốt rõ mẫu số, đơn vị và hàng quy tròn; không tự cho sai số bằng một nửa đơn vị nếu chưa biết phép làm tròn.`,
    'Giữ dấu âm cho sai số; quên đổi tỉ số sang phần trăm.', (s, d) => {
      const a = n(s) * 10, approximate = a, exact = a + (d % 2 ? -1 : 1), value = a + 0.47;
      return open(R`Giá trị đúng là $${exact}$ cm, giá trị gần đúng là $${approximate}$ cm. Tính sai số tuyệt đối và sai số tương đối theo công thức $\delta=\Delta/|a|$ với a là giá trị gần đúng; ghi dạng phân số và phần trăm. Quy tròn $${value.toFixed(2)}$ đến hàng đơn vị.`,
        R`$\Delta=|${exact}-${approximate}|=1$ cm; $\delta=1/${approximate}$, tương ứng $100/${approximate}\%$. Số $${value.toFixed(2)}$ quy tròn đến hàng đơn vị là $${a}$ vì chữ số hàng phần mười nhỏ hơn 5.`,
        h('Sai số tuyệt đối không âm và cùng đơn vị với số đo.', 'Dùng đúng mẫu số được quy định trong đề.', 'Tính độ chênh trước, rồi mới lập tỉ số.', 'Ví dụ khác: quy tròn đến hàng đơn vị cần xem chữ số hàng phần mười.'), ['Đúng sai số tuyệt đối và đơn vị.', 'Đúng tỉ số, phần trăm, mẫu số; quy tròn đúng.']);
    }),
  meanMedian: concept('Trung bình và trung vị', 'Tính số trung bình, trung vị và nhận xét tác động của một giá trị lớn đến hai đại lượng.', 'r22-g10-u2-lo03',
    R`GV cho một mẫu năm giá trị, yêu cầu sắp xếp trước khi tìm trung vị. Trung bình dùng tất cả dữ liệu; trung vị phụ thuộc vị trí giữa. Với mẫu chẵn, lấy trung bình hai giá trị giữa, không lấy vị trí làm giá trị.`,
    'Lấy phần tử giữa trước khi sắp xếp; chia tổng cho số giá trị khác nhau.', (s, d) => {
      const k = n(s), data = d % 2 ? [k + 6, k, k + 2, k + 4] : [k + 8, k, k + 2, k + 2, k + 3];
      const sorted = [...data].sort((a, b) => a - b), avg = data.reduce((a, b) => a + b) / data.length, median = d % 2 ? k + 3 : k + 2;
      assert.equal(median, (sorted[Math.floor((data.length - 1) / 2)] + sorted[Math.ceil((data.length - 1) / 2)]) / 2); mathematicalChecks++;
      return open(`Mẫu số liệu: ${math(data.join(';'))}. Em sắp xếp mẫu, tính số trung bình và trung vị; nêu đại lượng nào thay đổi nhiều hơn nếu tăng riêng giá trị lớn nhất thêm 20.`,
        R`Mẫu tăng dần $${sorted.join(';')}$. Trung bình $\bar x=${data.reduce((a, b) => a + b)}/${data.length}=${avg}$; trung vị $M_e=${median}$. Tăng riêng giá trị lớn nhất thêm 20 làm trung bình tăng $20/${data.length}$; trung vị không đổi.`,
        h('Sắp xếp dữ liệu, vẫn giữ các giá trị trùng.', 'Trung bình theo phép tính, trung vị theo vị trí.', 'Đếm số phần tử để chọn một hay hai vị trí giữa.', 'Ví dụ khác: tăng một giá trị ở cuối dãy chưa chắc đổi phần tử nằm giữa.'), ['Sắp xếp đúng; trung bình và trung vị đúng.', 'Giải thích đúng tác động của giá trị lớn nhất.']);
    }),
  quartileMode: concept('Tứ phân vị và mốt', 'Tính tứ phân vị theo trung vị hai nửa mẫu, tìm mốt và phân biệt vị trí với tần số.', 'r22-g10-u2-lo03',
    R`GV sắp mẫu tám số, chia hai nửa bằng nhau; Q1 là trung vị nửa dưới, Q3 là trung vị nửa trên. Khi mẫu lẻ, bỏ trung vị chung khỏi hai nửa theo quy ước dùng trong bài. Mốt là giá trị có tần số cao nhất, có thể không duy nhất.`,
    'Chọn Q1 theo phần tử thứ nhất; lấy tần số làm mốt.', (s, d) => {
      const k = n(s), data = [k, k + 1, k + 1, k + 2, k + 3, k + 3, k + 3, k + 5];
      return open(R`Mẫu đã sắp: $${data.join(';')}$. Tính $Q_1,Q_2,Q_3$ bằng trung vị hai nửa mẫu, tìm mốt. ${d % 2 ? 'Giải thích vì sao mốt không nhất thiết bằng trung vị.' : 'Cho biết có bao nhiêu giá trị lớn hơn Q3 trong mẫu này.'}`,
        R`$Q_1=${k + 1}$, $Q_2=(${k + 2}+${k + 3})/2=${k + 2.5}$, $Q_3=${k + 3}$. Mốt là $${k + 3}$, xuất hiện ba lần. Có một giá trị lớn hơn Q3. Mốt theo tần số, trung vị theo thứ tự.`,
        h('Có tám giá trị, hai nửa mỗi nửa bốn giá trị.', 'Tìm trung vị của cả mẫu rồi của từng nửa.', 'Đếm số lần xuất hiện để tìm mốt riêng.', 'Ví dụ khác: mẫu có một giá trị lặp nhiều nhất thì giá trị đó là mốt, không phải số lần lặp.'), ['Đúng cả ba tứ phân vị.', 'Mốt và giải thích tần số/vị trí đúng.']);
    }),
  spread: concept('Khoảng biến thiên, khoảng tứ phân vị và ngoại lệ', 'Tính khoảng biến thiên, khoảng tứ phân vị và xác định giá trị bất thường theo hàng rào 1,5 IQR.', 'r22-g10-u2-lo03',
    R`GV vẽ trục số và hộp Q1–Q3. Chốt R=max−min, IQR=Q3−Q1; giá trị nhỏ hơn Q1−1,5IQR hoặc lớn hơn Q3+1,5IQR bị đánh dấu để tìm hiểu, không tự xóa khỏi dữ liệu.`,
    'Nhầm độ rộng hộp với toàn bộ khoảng; tự loại dữ liệu lớn mà không có tiêu chí.', (s, d) => {
      const k = n(s), big = k + 15 + d, data = [k, k + 1, k + 1, k + 2, k + 2, k + 3, k + 3, big];
      return open(R`Mẫu tăng dần $${data.join(';')}$ có $Q_1=${k + 1}$, $Q_3=${k + 3}$. Tính khoảng biến thiên, IQR và hai hàng rào $Q_1-1{,}5IQR$, $Q_3+1{,}5IQR$. Giá trị nào bất thường theo quy tắc này?`,
        R`Khoảng biến thiên $R=${big}-${k}=${15 + d}$; $IQR=2$. Hàng rào dưới $${k - 2}$, trên $${k + 6}$. Chỉ $${big}$ nằm ngoài; cần kiểm bối cảnh/ghi nhận, không tự xóa.`,
        h('Khoảng biến thiên dùng hai đầu mẫu, IQR dùng Q1 và Q3.', 'Tính IQR trước để lập cả hai hàng rào.', 'So từng giá trị với hai hàng rào bằng bất đẳng thức nghiêm.', 'Ví dụ khác: nằm đúng hàng rào chưa bị xem là ngoài hàng rào.'), ['Đúng R, IQR, hai hàng rào.', 'Chỉ ra đúng ngoại lệ và không tự loại dữ liệu.']);
    }),
  variance: concept('Phương sai và độ lệch chuẩn', 'Tính phương sai với mẫu số n, độ lệch chuẩn và so sánh mức phân tán.', 'r22-g10-u2-lo03',
    R`GV viết bảng gồm giá trị, độ lệch so với trung bình, bình phương độ lệch. Chốt phương sai dùng chia n trong bài học này; độ lệch chuẩn là căn phương sai và có cùng đơn vị dữ liệu. Dịch mọi số cùng lượng không đổi phân tán.`,
    'Cộng độ lệch có dấu để đo phân tán; dùng n−1 ngoài quy ước bài.', (s, d) => {
      const k = n(s), gap = d % 2 ? 2 : 1, data = [k, k, k + 2 * gap, k + 2 * gap], mean = k + gap;
      const variance = data.reduce((total, x) => total + (x - mean) ** 2, 0) / data.length;
      assert.equal(variance, data.reduce((total, x) => total + x * x, 0) / data.length - mean * mean); mathematicalChecks++;
      return open(R`Mẫu $${data.join(';')}$ (cm). Tính trung bình, phương sai với mẫu số n và độ lệch chuẩn. Nếu cộng 5 cm vào mọi số đo, độ lệch chuẩn có đổi không?`,
        R`Trung bình $${mean}$ cm. Các độ lệch là $-${gap},-${gap},${gap},${gap}$; $s^2=4\cdot${gap ** 2}/4=${variance}\,\mathrm{cm}^2$; $s=${gap}$ cm. Cộng cùng 5 làm trung bình tăng 5 nhưng các độ lệch giữ nguyên, nên s không đổi.`,
        h('Tìm trung bình trước.', 'Bình phương độ lệch để các dấu không triệt tiêu.', 'Lập bốn độ lệch; chia tổng bình phương cho số phần tử.', 'Ví dụ khác: dữ liệu bằng nhau hoàn toàn có độ lệch chuẩn bằng không.'), ['Trung bình, phương sai và độ lệch chuẩn đúng.', 'Đơn vị và tính bất biến khi dịch dữ liệu đúng.']);
    }),
  projectReport: concept('Báo cáo dự án: dữ liệu và kết luận', 'Trình bày được nguồn dữ liệu, phép tính thống kê và một kết luận vừa đủ bằng chứng.', 'r22-g10-u2-lo03',
    'Đây là phương án dự án mới do tác giả đề xuất, không phải tên dự án trong PPCT. GV có thể dùng khảo sát số phút đi bộ hằng ngày do HS tự nguyện ghi ẩn danh hoặc mẫu mô phỏng đã cho. Không hỏi tên, địa chỉ, sức khỏe. Mỗi nhóm trình bày câu hỏi, cách thu thập, bảng dữ liệu, thống kê, giới hạn; mỗi em tự tính và giải thích một kết quả.',
    'Suy rộng từ mẫu nhỏ ra toàn trường; gọi số liệu mô phỏng là khảo sát thật.', (s, d) => {
      const k = n(s), data = [k, k + 2, k + 4, k + 4, k + 10], avg = k + 4, median = k + 4;
      return open(R`Một bản báo cáo dùng dữ liệu mô phỏng về số phút đi bộ: $${data.join(';')}$. Em tính trung bình và trung vị, viết một câu kết luận chỉ về mẫu này. ${d % 2 ? 'Nêu một giới hạn nếu muốn suy ra thói quen của toàn trường.' : 'Ghi rõ nguồn dữ liệu cần trình bày thế nào để người đọc không hiểu là khảo sát thật.'}`,
        R`Trung bình $(${data.join('+')})/5=${avg}$ phút; trung vị ${median} phút. Có thể nói: “Trong mẫu mô phỏng này, trung bình và trung vị đều là ${avg} phút.” Phải ghi dữ liệu mô phỏng; năm giá trị không đại diện toàn trường.`,
        h('Tách phép tính khỏi mức độ khái quát của kết luận.', 'Kiểm tính đại diện và ghi rõ nguồn.', 'Tính tổng, đếm số quan sát rồi mới viết kết luận.', 'Ví dụ khác: mô phỏng giúp thử cách phân tích nhưng không chứng minh hành vi của một lớp thật.'), ['Phép tính đúng.', 'Kết luận đúng phạm vi; nguồn mô phỏng và giới hạn được nêu rõ.']);
    }),
  projectCritique: concept('Báo cáo dự án: phản biện và chỉnh sửa', 'Đối chiếu hai mẫu thống kê, phát hiện kết luận vượt bằng chứng và sửa thành nhận xét có căn cứ.', 'r22-g10-u2-lo03',
    'GV cho nhóm trình bày cùng một biểu mẫu; nhóm nghe kiểm nguồn và cách tính, không chấm theo mức tự tin. Nếu lớp chưa có dự án thật, dùng hai mẫu mô phỏng trong nhiệm vụ này. Mỗi em viết nhận xét riêng trước trao đổi; GV chốt phân biệt khác biệt mô tả với nguyên nhân.',
    'Thấy hai trung bình bằng nhau rồi nói hai mẫu giống hoàn toàn; kết luận nguyên nhân từ mẫu nhỏ.', (s, d) => {
      const k = n(s), A = [k, k, k + 2, k + 2], B = [k + 1, k + 1, k + 1, k + 1];
      return open(R`Hai mẫu mô phỏng A: $${A.join(';')}$; B: $${B.join(';')}$. Một báo cáo viết: “Hai nhóm giống hệt nhau vì trung bình bằng nhau.” Em tính trung bình và khoảng biến thiên mỗi mẫu, sửa nhận xét. ${d % 2 ? 'Giải thích vì sao chưa thể nói phương pháp học của nhóm nào gây ra kết quả tốt hơn.' : 'Nêu một thông tin về cách chọn mẫu cần biết trước khi so sánh lớp thật.'}`,
        R`Cả hai trung bình đều ${k + 1}. A có khoảng biến thiên 2, B có khoảng biến thiên 0. Sửa: “Hai mẫu có cùng trung bình nhưng A phân tán hơn B theo khoảng biến thiên.” Dữ liệu mô phỏng nhỏ không chứng minh nguyên nhân hay kết quả của lớp thật.`,
        h('Cùng trung bình không quyết định toàn bộ phân bố.', 'Tính thêm một đại lượng đo phân tán.', 'Xác định số nhỏ nhất và lớn nhất trong từng mẫu.', 'Ví dụ khác: hai lớp có cùng điểm trung bình vẫn có thể khác mức chênh lệch giữa học sinh.'), ['Hai trung bình và hai khoảng biến thiên đúng.', 'Sửa kết luận có căn cứ; không khẳng định quan hệ nhân quả.']);
    }),
  feedback: concept('Chữa lỗi minh họa sau kiểm tra', 'Tìm bước suy luận sai, đưa phản ví dụ và viết lời giải sửa có kiểm tra.', 'r22-g10-u1-lo01',
    'GV ghi rõ đây là lỗi minh họa tự soạn, không phải thống kê bài kiểm tra của lớp. HS đọc một lời giải, khoanh bước sai, tự viết bản sửa rồi so cách kiểm. Nếu có bài thật đã trả, GV chỉ thay ví dụ sau khi giữ riêng thông tin cá nhân.',
    'Chỉ ghi đáp án mới mà không tìm lỗi lập luận; gán lỗi mô phỏng cho lớp.', (s, d) => {
      const k = n(s);
      return open(R`Một lời giải minh họa viết: “Mọi số chia hết cho $${2 * k}$ đều chia hết cho $${k}$, nên mọi số chia hết cho $${k}$ đều chia hết cho $${2 * k}$.” Em chỉ ra bước sai, đưa phản ví dụ rồi viết lại kết luận đúng. ${d % 2 ? 'Nếu muốn dùng chữ “khi và chỉ khi”, còn phải chứng minh điều gì?' : 'Nêu cách kiểm một mệnh đề đảo trước khi dùng nó.'}`,
        R`Sai ở việc suy chiều đảo từ chiều thuận. Lấy số $${k}$: chia hết cho $${k}$ nhưng không chia hết cho $${2 * k}$. Kết luận đúng là chiều thuận; tương đương đòi hỏi cả hai chiều đều đúng, ở đây không có.`,
        h('Tách câu thành hai mệnh đề kéo theo.', 'Một chiều đúng chưa chứng minh chiều ngược.', 'Tìm một bội của số chia nhỏ không là bội số chia lớn.', 'Ví dụ khác: là hình vuông kéo theo là hình chữ nhật, nhưng chiều đảo cần thêm điều kiện.'), ['Xác định đúng bước suy sai.', 'Phản ví dụ hợp lệ; bản sửa chỉ khẳng định điều đã chứng minh.']);
    }),
};

// Exact period numbers are source labels, not a contiguous sequence: 16 and 67 are absent.
const byPeriod = {
  1:['routine'],2:['proposition'],3:['implication'],4:['trigValue'],5:['quantifier'],6:['implication','quantifier'],7:['sets'],8:['supplement'],9:['trigIdentity'],10:['trigValue','supplement'],
  13:['numberSets'],14:['sets','numberSets'],15:['setOperations'],17:['cosine'],18:['cosineAngle'],23:['setIntervals','inclusion'],24:['proposition','sets'],25:['quantifier','setOperations'],26:['sine'],27:['sine'],28:['areaSin'],
  31:['inequality'],32:['halfplane'],33:['system'],34:['heron'],35:['measure'],36:['cosineAngle','sine'],39:['polygon'],40:['optimize'],41:['polygon','optimize'],42:['areaSin','heron'],43:['cosine','sine'],44:['measure','cosineAngle'],
  47:['inequality','halfplane'],48:['system','polygon'],49:['optimize','polygon'],50:['vectorIntro'],51:['vectorRelations'],55:['setIntervals','quantifier'],56:['setOperations','inclusion'],57:['halfplane','optimize'],58:['trigIdentity','sine'],59:['cosine','heron'],60:['measure','vectorRelations'],
  63:['implication','setIntervals'],64:['setOperations','polygon'],65:['optimize','inclusion'],66:['trigValue','cosineAngle'],68:['sine','areaSin'],69:['measure','vectorIntro'],72:['quantifier','inclusion'],73:['numberSets','setIntervals'],74:['system','optimize'],75:['vectorRelations','cosineAngle'],
  80:['feedback'],81:['approximation'],82:['meanMedian'],83:['vectorSum'],84:['vectorChain'],85:['vectorDifference'],88:['quartileMode'],89:['meanMedian','quartileMode'],90:['spread','variance'],91:['quartileMode','variance'],92:['vectorChain','vectorDifference'],93:['vectorScale'],96:['projectReport'],97:['projectCritique'],98:['vectorMidpoint'],99:['coordinates'],100:['coordinateOperations'],101:['coordinateMidpoint'],
  104:['coordinateOperations','coordinateMidpoint'],105:['dotAngle'],106:['dotLength'],107:['dotCoordinates'],108:['perpendicular'],109:['dotLength','dotCoordinates'],112:['vectorScale','vectorMidpoint'],113:['coordinateOperations','coordinateMidpoint'],114:['dotAngle','perpendicular'],115:['dotLength','dotCoordinates'],116:['cosine','sine'],117:['dotLength','coordinateMidpoint'],
  120:['quantifier','setIntervals'],121:['inclusion','optimize'],122:['meanMedian','quartileMode'],123:['vectorChain','vectorScale'],124:['coordinateOperations','perpendicular'],125:['cosineAngle','areaSin'],128:['sets','system'],129:['approximation','variance'],130:['quartileMode','spread'],131:['sine','heron'],132:['coordinateMidpoint','dotCoordinates'],133:['dotLength','measure'],136:['quantifier','halfplane'],137:['optimize','meanMedian'],138:['spread','variance'],139:['vectorDifference','perpendicular'],
};

const introductions = new Map();
for (const period of ppct.lessons.filter(row => row.kind === 'core')) {
  for (const id of byPeriod[period.period] || []) if (!id.startsWith('project') && !introductions.has(id)) introductions.set(id, period);
}
const solutionRows = [];
let electiveIndex = 0;
function buildPeriod(period) {
  const eligible = [...introductions].filter(([, first]) => first.week < period.week).map(([id]) => id);
  const sameWeekFallback = period.kind === 'elective' && eligible.length === 0;
  if (sameWeekFallback) eligible.push(...[...introductions].filter(([, first]) => first.week === period.week && first.sequence < period.sequence).map(([id]) => id));
  const ids = period.kind === 'elective' ? [eligible[(electiveIndex * 2) % eligible.length], eligible[(electiveIndex * 2 + 1) % eligible.length]] : byPeriod[period.period];
  if (period.kind === 'elective') electiveIndex++;
  assert.ok(ids?.length && ids.length <= 2 && new Set(ids).size === ids.length && ids.every(id => bank[id]), `Missing or duplicate scope ${period.id}`);
  const concepts = ids.map(id => bank[id]);
  const purpose = period.kind === 'elective' || period.kind === 'core' && /luyện tập/i.test(period.detail) ? 'practice'
    : period.kind === 'core' && !concepts.some(c => c.title.startsWith('Báo cáo')) ? 'formation' : 'review';
  const sourceFor = index => {
    const lo = concepts[index].lo && unitLO(concepts[index].lo);
    return lo ? { segmentId: lo.id, quote: lo.statement, origin: 'adapted' } : { segmentId: period.id, quote: period.source.content.cached, origin: 'generated' };
  };
  const teacherSolutions = [], tasksByActivity = [];
  const makeTask = (index, phaseIndex, branch, minutes, difficulty, offset = 0) => {
    const seed = period.sequence * 31 + phaseIndex * 7 + index * 3 + offset;
    const { solution, ...question } = concepts[index].question(seed, difficulty);
    const task = { ...question, minutes, objectiveIndexes: [index], source: sourceFor(index), branch, isCore: !['support','extension'].includes(branch),
      requiresFullScaffold: true, supportRationale: concepts[index].error };
    teacherSolutions.push({ conceptId: ids[index], phaseIndex, branch, prompt: task.prompt, solution });
    return task;
  };
  const activity = (phase, minutes, phaseIndex, participation, action, product, lookFor, taskFactory, budgetRole = 'core') => {
    const tasks = concepts.flatMap((_, index) => taskFactory(index));
    tasksByActivity.push(tasks);
    return { phase, minutes, participation, objectiveIndexes: concepts.map((_, index) => index), budgetRole,
      studentAction: action, expectedProduct: product, teacherLookFor: lookFor, transition: 'GV yêu cầu dừng nhập; HS giữ bài trong vở, chỉ chuyển câu khi GV cho phép.',
      source: sourceFor(0), tasks };
  };
  const generated = [
    activity('experience', 4, 0, 'individual', 'Từ màn chờ, em đọc câu được giao, tự làm trong vở rồi nộp câu trả lời riêng.', 'Một câu trả lời ban đầu cho mỗi mục tiêu; có ghi cách nghĩ.',
      `Bắt đầu từ bảng trắng/TV chờ. GV đọc mục tiêu bằng ngôn ngữ học sinh. Chưa công bố đáp án, quan sát: ${concepts.map(c => c.error).join(' ')} Không dùng kết quả nhóm thay chẩn đoán cá nhân.`, i => [makeTask(i, 0, 'shared', 2, 0)]),
    activity(purpose === 'formation' ? 'formation' : 'guided', 8, 1, 'whole_class', 'Em phác hình hoặc bảng tính trong vở, giải thích một bước; nghe thầy/cô đối chiếu và ghi phần kiến thức được chốt.',
      'Lời giải mẫu có dữ kiện, bước làm, kết luận; mỗi em ghi điều cần kiểm.', concepts.map(c => c.teach).join('\n'), i => [makeTask(i, 1, 'shared', 3, 1)]),
    activity('practice', 9, 2, 'individual', 'Em làm đúng tuyến thầy/cô giao. Khi vướng, mở từng gợi ý; em không cần làm cả hai tuyến.',
      'Một lời giải luyện tập theo tuyến được giao, có bước tự kiểm.', `GV giao tuyến hỗ trợ hoặc cơ bản dựa trên câu mở đầu; trợ giúp không trừ điểm. Đối chiếu lỗi: ${concepts.map(c => c.error).join(' ')} Dừng đúng giờ để bảo vệ lượt kiểm tra lại.`,
      i => [makeTask(i, 2, 'support', 4, 0), makeTask(i, 2, 'core', 4, 1, 101)]),
    activity('recheck', 6, 3, 'individual', 'Em làm câu mới một mình; tạm dừng trao đổi. Nếu dùng gợi ý, vẫn ghi lại bước em tự làm được.',
      'Lời giải cá nhân mới; GV đối chiếu riêng từng mục tiêu.', 'GV giữ câu mới khác câu luyện tập; bài mở chờ GV xem rubric. Chưa có minh chứng không đồng nghĩa chưa đạt.', i => [makeTask(i, 3, 'shared', 3, 2)]),
    activity('exit', 6, 4, 'individual', 'Em hoàn thành phiếu cuối tiết độc lập, kiểm lại kết quả và nộp bài riêng.',
      'Minh chứng cá nhân thứ hai cho từng mục tiêu.', 'GV kiểm lời giải hoặc đáp án theo từng mục tiêu. Chỉ ghi nhận kết quả đã được kiểm; không lấy điểm game hoặc vị trí bản đồ làm minh chứng hiểu bài.', i => [makeTask(i, 4, 'shared', 3, 3)]),
    activity('practice', 4, 5, 'individual', 'Nếu đã hoàn thành hai lượt kiểm tra và được thầy/cô giao thêm, em thử câu mở rộng. Nếu chưa, em sửa bước còn vướng trong vở.',
      'Một thử thách tự nguyện; không thay lượt kiểm tra hoặc kéo dài tiết.', 'Chỉ mở tuyến mở rộng sau recheck và exit, theo quyết định GV và cổng sẵn sàng hiện có. Có thể bỏ trọn hoạt động này; không chạy sự kiện lấn giờ cuối tiết.', i => [makeTask(i, 5, 'extension', 2, 4)], 'optional'),
    { phase: 'reflection', minutes: 3, participation: 'individual', budgetRole: 'reserve', objectiveIndexes: concepts.map((_, i) => i), source: sourceFor(0),
      studentAction: 'Em ghi một bước tự kiểm sẽ dùng lần sau; giữ thiết bị ở màn chờ khi thầy/cô tổng kết.', expectedProduct: 'Một ghi chú ngắn trong vở, không chấm đúng/sai.',
      teacherLookFor: 'Quỹ dự phòng cho đổi thiết bị, lỗi mạng hoặc giải thích lại một bước. Nếu mất mạng, HS dùng vở và GV đọc câu đang học; không công bố đáp án trước khi các em hoàn thành.',
      transition: 'GV chốt nhiệm vụ tiếp theo, kết thúc phiên.', tasks: [{ type: 'reflection', prompt: 'Em chọn một bước vừa học dễ nhầm nhất, ghi cách tự kiểm ở lần sau.', minutes: 1,
        evaluation: { rubric: { criteria: ['Nêu được một bước và cách kiểm phù hợp.'], lookFor: ['Ghi chú phục vụ tự học; không dùng làm bằng chứng đạt mục tiêu.'] } },
        hints: ['Nhìn lại bước em vừa sửa trong vở.'], source: sourceFor(0), branch: 'shared', isCore: false, objectiveIndexes: concepts.map((_, i) => i) }] },
  ];
  const unitReferences = [...new Set(concepts.map(c => c.lo).filter(Boolean))].map(id => { const lo = unitLO(id); return { id: lo.id, ...lo.reference, hash: lo.unit.sourceSha256 }; });
  const title = `${period.kind === 'elective' ? 'Game ôn tập tích lũy' : period.topic} · ${concepts.map(c => c.title).join(' / ')} · tiết ${period.period}`;
  const entry = assembleHkiPackage({ period, title, unitReferences, prerequisites: ['Các kiến thức đã học trước tiết này; GV dùng câu mở đầu để xác định phần cần nhắc lại.'], outline: {
    format: 'lesson-outline-v1', essentialQuestion: concepts.map(c => c.statement).join(' '),
    objectives: concepts.map((c, i) => ({ statement: c.statement, code: `r22-g10-p${period.period}-${ids[i].toLowerCase()}`, level: 'must', source: sourceFor(i) })),
    activities: generated, uncertainties: [
      ...(period.period === 17 ? ['PPCT_TOPIC_DETAIL_DISAGREE_USE_VIETNAMESE_COSINE_DETAIL'] : []),
      ...(period.period === 88 ? ['PPCT_ENGLISH_DETAIL_DISAGREES_USE_VIETNAMESE_QUARTILES_MODE'] : []),
      ...(period.period === 96 || period.period === 97 ? ['ORIGINAL_PROJECT_PROPOSAL_NOT_SOURCE_PROJECT', 'USE_SYNTHETIC_OR_VOLUNTARY_ANONYMOUS_DATA'] : []),
      ...(period.kind === 'assessment_feedback' ? ['ILLUSTRATIVE_ERRORS_NOT_ACTUAL_CLASS_RESULTS'] : []),
      ...(sameWeekFallback ? ['TEACHER_CONFIRM_SAME_WEEK_ALREADY_TAUGHT'] : []),
    ],
  } });
  let cursor = 0;
  for (let activityIndex = 0; activityIndex < tasksByActivity.length; activityIndex++) {
    for (let taskIndex = 0; taskIndex < tasksByActivity[activityIndex].length; taskIndex++) {
      teacherSolutions[cursor].taskId = `task-${activityIndex + 1}-${taskIndex + 1}`;
      const task = entry.pkg.tasks.find(t => t.id === teacherSolutions[cursor].taskId);
      task.metadata.workedSolution = teacherSolutions[cursor].solution;
      cursor++;
    }
  }
  entry.pkg.contentHash = hashPackage(entry.pkg);
  const validation = validateLessonPackage(entry.pkg);
  assert.ok(validation.ok, `${period.id}: ${JSON.stringify(validation.errors)}`);
  entry.conceptIds = ids;
  entry.sourceDetail = period.detail;
  entry.teacherSolutions = teacherSolutions;
  entry.purpose = purpose;
  if (period.kind === 'elective') {
    entry.cumulativeScope = { eligibleConceptIds: eligible, selectedConceptIds: ids, sameWeekTeacherConfirmationRequired: sameWeekFallback,
      rule: 'Ngân hàng gồm mọi tiểu chủ đề core đã học ở tuần trước; một lượt 40 phút chỉ đo hai mục tiêu được chọn. Không coi lượt chơi là kiểm tra toàn bộ ngân hàng.',
      sourcePeriodIds: [...new Set(eligible.map(id => introductions.get(id).id))] };
    entry.cumulativeBank = eligible.map((id, index) => ({ conceptId: id, title: bank[id].title, introducedBy: introductions.get(id).id,
      question: bank[id].question(period.sequence * 43 + index * 5, index % 3), sourceLOId: bank[id].lo, use: 'teacher_bank_not_all_questions_in_one_round' }));
    assert.ok(eligible.every(id => sameWeekFallback || introductions.get(id).week < period.week));
  }
  solutionRows.push(...teacherSolutions.map(row => ({ packageId: entry.pkg.id, ...row })));
  return entry;
}

function examMC(text, labels, correct, solution) {
  assert.equal(new Set(labels).size, 4);
  assert.ok(correct >= 0 && correct < 4);
  return { type: 'mc', points: 0.25, text, options: ['A','B','C','D'], choiceText: Object.fromEntries(labels.map((label, i) => ['ABCD'[i], label])), key: 'ABCD'[correct], solution };
}
function examNumericMC(question) {
  const answer = question.evaluation.answerKey, keys = [answer + 2, answer - 1, answer, answer + 1];
  return examMC(question.prompt, keys.map(key => math(String(key))), 2, question.solution);
}
function examShort(question) {
  assert.equal(question.evaluation.checkerId, 'numeric_exact');
  return { type: 'short', points: 0.5, text: question.prompt, key: { accept: [String(question.evaluation.answerKey)] }, solution: question.solution };
}
function examEssay(text, solution, rubric) { return { type: 'essay', points: 2, text, solution, rubric }; }
function buildExam(final) {
  const id = `r22-g10-${final ? 'cuoi' : 'giua'}-hki`, title = `Toán 10 Discover - Kiểm tra ${final ? 'cuối' : 'giữa'} học kỳ I`, week = final ? 18 : 10;
  const periods = ppct.lessons.filter(row => row.kind === 'assessment' && row.week === week);
  assert.equal(periods.length, 2);
  const mc = final ? [
    examMC(R`Phủ định của “$\forall x\in\mathbb R:x^2\ge1$” là:`, [R`$\forall x:x^2<1$`, R`$\exists x\in\mathbb R:x^2<1$`, R`$\exists x:x^2\ge1$`, R`$\forall x:x^2>1$`], 1, 'Đổi lượng từ với mọi thành tồn tại và phủ định dấu lớn hơn hoặc bằng thành nhỏ hơn.'),
    examMC(R`$A=[-2;4)$, $B=(1;6]$. Giao hai tập là:`, [R`$(1;4)$`, R`$[1;4]$`, R`$[-2;6]$`, R`$(1;4]$`], 0, 'Phải đồng thời lớn hơn 1 và nhỏ hơn 4; hai đầu đều không được nhận.'),
    examMC('Mẫu số liệu 1;2;2;4;11 có trung vị bằng:', ['$4$','$2$','$11$','$20/5$'], 1, 'Mẫu đã sắp, có năm số nên lấy số thứ ba là 2.'),
    examMC('Mẫu 2;4;4;6 có số trung bình bằng:', ['$3$','$5$','$4$','$6$'], 2, 'Tổng 16 chia số phần tử 4 được 4.'),
    examNumericMC(bank.vectorScale.question(10, 1)),
    examNumericMC(bank.dotCoordinates.question(11, 0)),
    examNumericMC(bank.sine.question(12, 0)),
    examMC(R`Cho $A(1;2)$, $B(5;-1)$. Vectơ $\overrightarrow{AB}$ là:`, [R`$(6;1)$`, R`$(-4;3)$`, R`$(4;-3)$`, R`$(5;-1)$`], 2, 'Lấy điểm cuối trừ điểm đầu: (5−1;−1−2)=(4;−3).'),
  ] : [
    examMC('Câu nào là mệnh đề?', ['Em hãy tính 3+2.','Số 9 là số chẵn.','Em đã làm bài chưa?', R`$x>5$ (chưa cho x).`], 1, '“Số 9 là số chẵn” có giá trị sai xác định nên vẫn là mệnh đề.'),
    examMC(R`Phủ định của “$\exists x\in\mathbb R:x^2<0$” là:`, [R`$\exists x:x^2\ge0$`,R`$\forall x\in\mathbb R:x^2\ge0$`,R`$\forall x:x^2<0$`,R`$\exists x:x^2>0$`], 1, 'Đổi tồn tại thành với mọi, phủ định nhỏ hơn thành lớn hơn hoặc bằng.'),
    examMC(R`Cho $A=\{1;2;4\}$, $B=\{2;3;4\}$. $A\setminus B$ bằng:`, [R`$\{1\}$`,R`$\{3\}$`,R`$\{2;4\}$`,R`$\{1;2;3;4\}$`], 0, 'Giữ phần tử thuộc A nhưng không thuộc B, chỉ có 1.'),
    examMC(R`Tập $\{x\in\mathbb R:-1<x\le3\}$ viết là:`, [R`$[-1;3]$`,R`$(-1;3)$`,R`$(-1;3]$`,R`$[-1;3)$`], 2, 'Đầu −1 không lấy, đầu 3 có lấy.'),
    examMC(R`Điểm nào thuộc miền $x\ge0,y\ge0,x+y\le5$?`, [R`$(-1;2)$`,R`$(4;3)$`,R`$(2;-1)$`,R`$(2;3)$`], 3, 'Điểm (2;3) thỏa cả ba điều kiện, trong đó tổng bằng 5 vẫn được lấy.'),
    examNumericMC(bank.cosine.question(5, 0)),
    examNumericMC(bank.sine.question(6, 1)),
    examMC('ABCD là hình vuông ghi theo thứ tự quanh hình. Vectơ nào bằng vectơ AB?', [R`$\overrightarrow{CD}$`,R`$\overrightarrow{DC}$`,R`$\overrightarrow{BC}$`,R`$\overrightarrow{BA}$`], 1, 'AB và DC cùng hướng, cùng độ dài. CD và BA là các vectơ ngược hướng với AB.'),
  ];
  const tf = final ? [
    { type:'tf',points:1,text:R`Cho mẫu tăng dần $1;2;2;3;4;4;4;8$. Dùng trung vị của hai nửa mẫu để tính tứ phân vị. Xét từng phát biểu.`,statements:['a','b','c','d'],
      statementText:{a:R`$Q_1=2$.`,b:R`$Q_3=4$.`,c:'Mốt của mẫu là 3.',d:'Giá trị 8 bất thường theo hàng rào 1,5 IQR.'},key:[true,true,false,true],solution:R`$Q_1=(2+2)/2=2$, $Q_3=(4+4)/2=4$; mốt 4 xuất hiện ba lần. IQR=2, hàng rào trên 7 nên 8 nằm ngoài.` },
    { type:'tf',points:1,text:R`Cho $\vec u=(1;2)$, $\vec v=(2;-1)$. Xét các phát biểu.`,statements:['a','b','c','d'],
      statementText:{a:R`$\vec u\cdot\vec v=0$.`,b:R`$|\vec u|=\sqrt5$.`,c:R`$\vec u+\vec v=(3;1)$.`,d:'Hai vectơ cùng phương.'},key:[true,true,true,false],solution:R`Tích là $1\cdot2+2\cdot(-1)=0$; độ dài u là $\sqrt{1+4}=\sqrt5$; tổng (3;1). Hai vectơ khác không vuông góc nên không cùng phương.` },
  ] : [
    { type:'tf',points:1,text:R`Xét miền $x\ge0,y\ge0,x+2y\le6,2x+y\le6$.`,statements:['a','b','c','d'],
      statementText:{a:'Gốc tọa độ thuộc miền nghiệm.',b:'Giao hai đường biên xiên là (2;2).',c:'Điểm (4;0) thuộc miền nghiệm.',d:R`Giá trị lớn nhất của $F=3x+4y$ là 14.`},key:[true,true,false,true],solution:R`O thỏa hệ. Hai đường xiên cho x=y=2. (4;0) vi phạm $2x+y\le6$. Các đỉnh (0;0),(3;0),(2;2),(0;3) cho F=0,9,14,12.` },
    { type:'tf',points:1,text:R`Tam giác ABC vuông tại A, $AB=6$ cm, $AC=8$ cm.`,statements:['a','b','c','d'],
      statementText:{a:'BC dài 10 cm.',b:R`Diện tích bằng $48\,\mathrm{cm}^2$.`,c:'Bán kính ngoại tiếp bằng 5 cm.',d:R`$\cos B=3/5$.`},key:[true,false,true,true],solution:R`Pythagore cho BC=10. Diện tích là $6\cdot8/2=24$, không phải 48. Bán kính ngoại tiếp bằng nửa cạnh huyền, cos B=AB/BC=3/5.` },
  ];
  const shorts = (final ? [['inclusion',21,1],['optimize',22,0],['perpendicular',23,1],['dotLength',24,0]] : [['inclusion',13,0],['optimize',14,0],['heron',15,1],['areaSin',16,0]])
    .map(([id, seed, difficulty]) => examShort(bank[id].question(seed,difficulty)));
  const essays = final ? [
    examEssay(R`Hai mẫu số liệu A: $2;2;6;6$, B: $3;3;5;5$. Tính trung bình, phương sai (chia n), độ lệch chuẩn của từng mẫu. Một báo cáo kết luận “hai mẫu giống nhau hoàn toàn vì cùng trung bình”. Em sửa kết luận này.`,
      R`Cả hai trung bình 4. A có độ lệch −2,−2,2,2 nên phương sai 4, độ lệch chuẩn 2. B có độ lệch −1,−1,1,1 nên phương sai 1, độ lệch chuẩn 1. Hai mẫu cùng trung bình nhưng A phân tán hơn B; chưa có căn cứ suy ra nguyên nhân.`,
      'Hai trung bình đúng: 0,4 điểm; hai phương sai đúng: 0,6; hai độ lệch chuẩn đúng: 0,4; sửa nhận xét có căn cứ: 0,6.'),
    examEssay(R`Cho $A(1;1)$, $B(5;1)$, $C(1;4)$. Tính các vectơ AB, AC; chứng minh tam giác vuông tại A bằng tích vô hướng. Tính BC, diện tích tam giác và tọa độ trung điểm M của BC.`,
      R`AB=(4;0), AC=(0;3), tích vô hướng bằng 0 nên vuông tại A. BC=(-4;3) có độ dài 5. Diện tích $4\cdot3/2=6$. Trung điểm M=(3;2,5).`,
      'AB, AC đúng: 0,4 điểm; tích và kết luận vuông: 0,4; BC=5: 0,4; diện tích 6: 0,4; trung điểm đúng: 0,4.'),
  ] : [
    examEssay(R`Một nhóm 30 em có 18 em thích đọc sách, 15 em thích chơi cờ và 7 em thích cả hai. Vẽ sơ đồ Venn, tìm số em chỉ thích đọc, chỉ thích cờ, thích ít nhất một hoạt động và không thích hoạt động nào trong hai hoạt động. Giải thích vì sao không thể cộng 18+15 làm số em thích ít nhất một.`,
      'Phần giao 7; chỉ đọc 18−7=11, chỉ cờ 15−7=8; hợp 11+7+8=26; ngoài cả hai 30−26=4. Cộng 18+15 đếm phần giao hai lần.',
      'Sơ đồ và phần giao: 0,4 điểm; hai phần chỉ thích: 0,6; hợp và ngoài: 0,6; giải thích đếm trùng: 0,4.'),
    examEssay(R`Hai trạm A,B cách nhau 40 m; C cùng phía với AB. Đo được góc CAB bằng 30 độ và CBA bằng 60 độ. Vẽ mô hình, tính góc C, AC, BC và diện tích tam giác ABC; giữ căn thức chính xác.`,
      R`C=90 độ. Định lí sin cho $BC=40\sin30^\circ=20$ m, $AC=40\sin60^\circ=20\sqrt3$ m. Diện tích $BC\cdot AC/2=200\sqrt3\,\mathrm{m}^2$.`,
      'Mô hình và góc C: 0,4 điểm; chọn đúng định lí: 0,4; AC,BC đúng: 0,6; diện tích và đơn vị đúng: 0,6.'),
  ];
  const questions = [mc,tf,shorts,essays].flatMap((section,index) => section.map((q,i) => ({...q,section:['I','II','III','IV'][index],label:`Câu ${i+1}`})));
  const exam = normalizeExamInput({ title, durationMin:80, settings:{showResult:'none',review:'after_close',shuffleQuestions:false,shuffleOptions:false,allowLateJoin:false},questions });
  assert.equal(exam.questions.reduce((sum,q)=>sum+q.points,0),10);
  const headings = ['PHẦN I. (8 câu/2 điểm) Trắc nghiệm nhiều phương án lựa chọn','PHẦN II. (2 câu/2 điểm) Trắc nghiệm Đúng - Sai','PHẦN III. (4 câu/2 điểm) Trả lời ngắn','PHẦN IV. (2 câu/4 điểm) Tự luận'];
  const text = [title,'Thời gian làm bài: 80 phút','Họ và tên: ................................ Lớp: ........',
    ...[mc,tf,shorts,essays].flatMap((section,index) => [headings[index],...section.map((q,i) => `Câu ${i+1}. (${String(q.points).replace('.',',')} điểm) ${q.text}${q.type==='mc'?'\n'+q.options.map(key=>`${key}. ${q.choiceText[key]}`).join('\n'):q.type==='tf'?'\n'+q.statements.map(key=>`${key}) ${q.statementText[key]}`).join('\n'):''}`)])].join('\n\n');
  const parsed = parseExamLines(text.split(/\r?\n/).map(text => ({ text })));
  assert.equal(parsed.questions.length,16,JSON.stringify(parsed.warnings));
  assert.deepEqual(parsed.questions.map(q=>q.type),exam.questions.map(q=>q.type));
  const importFile = `tasks/r22/g10-${final?'cuoi':'giua'}-hki-exam.txt`, teacherFile = `tasks/r22/g10-${final?'cuoi':'giua'}-hki-exam.json`;
  const metadata = { id,title,grade:10,week,sourcePeriodIds:periods.map(p=>p.id),minutes:80,status:'draft',requiresTeacherReview:true,
    files:{text:importFile,json:teacherFile},sourceRefs:periods.map(p=>p.source.content.ref),
    notes:['Đề mới do tác giả soạn; PPCT chỉ xác định lịch, không cung cấp đề hoặc ma trận chính thức.','80 phút tương ứng hai tiết 40 phút theo phạm vi đã được giao; GV xác nhận lịch kiểm tra trước khi mở đề.'],
    blueprint: { mc:{count:8,points:2},tf:{count:2,points:2},short:{count:4,points:2},essay:{count:2,points:4} } };
  return {metadata,exam,text,importFile,teacherFile};
}

const entries = ppct.lessons.filter(period=>period.kind!=='assessment').map(buildPeriod);
assert.equal(entries.length,137);
assert.equal(entries.filter(entry=>entry.kind==='elective').length,37);
assert.equal(new Set(entries.map(entry=>entry.pkg.id)).size,137);
const authoredExams = [buildExam(false),buildExam(true)], exams = authoredExams.map(exam=>exam.metadata);
const coverage = ppct.lessons.map(period=>{
  const entry=entries.find(row=>row.sourcePeriodId===period.id), exam=exams.find(row=>row.sourcePeriodIds.includes(period.id));
  assert.equal(Number(Boolean(entry))+Number(Boolean(exam)),1,period.id);
  return {sourcePeriodId:period.id,week:period.week,period:period.period,sourceKind:period.kind,contentCell:period.source.content.ref,
    outputId:entry?.pkg.id||exam.id,mode:exam?'exam':period.kind==='elective'?'cumulative_game':'classroom',conceptIds:entry?.conceptIds||[]};
});
assert.equal(coverage.length,141);
assert.ok(!coverage.some(row=>[16,67].includes(row.period)));
mkdirSync(new URL('content/lessons/',root),{recursive:true});
mkdirSync(new URL('tasks/r22/',root),{recursive:true});
writeFileSync(new URL('content/lessons/hki-2026-g10.json',root),JSON.stringify({format:'r22-hki-grade-content-v1',grade:10,schoolYear:'2026-2027',entries,exams},null,2)+'\n');
for(const exam of authoredExams){writeFileSync(new URL(exam.importFile,root),exam.text+'\n');writeFileSync(new URL(exam.teacherFile,root),JSON.stringify({...exam.metadata,exam:exam.exam},null,2)+'\n');}
writeFileSync(new URL('tasks/r22/g10-coverage.json',root),JSON.stringify({grade:10,sourcePeriodCount:141,classroomPackages:137,electiveGames:37,examFiles:2,examSourcePeriods:4,mathematicalChecks,coverage},null,2)+'\n');
writeFileSync(new URL('tasks/r22/g10-solutions.json',root),JSON.stringify({grade:10,note:'Teacher-only worked solutions; open responses remain pending teacher assessment.',solutions:solutionRows},null,2)+'\n');
console.log(JSON.stringify({grade:10,periods:coverage.length,packages:entries.length,electives:37,exams:exams.length,mathematicalChecks,workedSolutions:solutionRows.length}));
