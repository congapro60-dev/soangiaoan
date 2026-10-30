import assert from 'node:assert/strict';

const R=String.raw, seq=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i), sum=a=>a.reduce((x,y)=>x+y,0);
const fact=n=>n<2?1:n*fact(n-1), comb=(n,r)=>fact(n)/fact(r)/fact(n-r);
const subsets=(n,r)=>seq(0,2**n-1).filter(mask=>[...mask.toString(2)].filter(c=>c==='1').length===r);
const pairs=n=>seq(1,n).flatMap(a=>seq(a+1,n).map(b=>[a,b]));
const power=(a,n)=>{let p=[1];for(let i=0;i<n;i++){const q=Array(p.length+1).fill(0);p.forEach((v,j)=>{q[j]+=a*v;q[j+1]+=v;});p=q;}return p;};
let checks=0;
export const automaticChecks=()=>checks;
function number(prompt,key,solution,oracle){assert.ok(Number.isFinite(key)&&Math.abs(key-oracle)<1e-8,`${prompt}: ${key} != ${oracle}`);checks++;return {type:'closed',prompt,solution,evaluation:{checkerId:'numeric_exact',answerKey:key}};}
function choice(prompt,labels,truth,solution,s){
  assert.equal(labels.length,truth.length);assert.equal(truth.filter(Boolean).length,1);assert.equal(new Set(labels).size,labels.length);checks++;
  const shift=s%labels.length, options=labels.map((_,i)=>({id:`o${i+1}`,label:labels[(i+shift)%labels.length]}));
  const correct=(truth.indexOf(true)-shift+labels.length)%labels.length;
  return {type:'closed',prompt,inputSchema:{options},evaluation:{checkerId:'choice_exact',answerKey:`o${correct+1}`},solution};
}
function fractionChoice(prompt,numerator,denominator,solution,oracle,s){
  assert.ok(Math.abs(numerator/denominator-oracle)<1e-8);checks++;
  const ns=[numerator,numerator-1,numerator+1,numerator+2];
  return choice(prompt,ns.map(n=>`$${n}/${denominator}$`),ns.map(n=>n===numerator),solution,s);
}
export const automatic={};
const define=(id,target,make)=>{automatic[id]={target,make};};
const k=s=>2+s%11;

define('proposition','Nhận biết câu có giá trị đúng hoặc sai xác định.',s=>{
  const a=k(s),labels=[`Số ${2*a} là số lẻ.`,`x>${a}, chưa cho x.`,`Em hãy tính ${a}+1.`,`Em đã có bút chưa?`];
  const q = ['Câu nào là mệnh đề?','Câu nào dưới đây là một mệnh đề?','Trong các câu sau, câu nào là một mệnh đề?','Xác định câu là mệnh đề trong các phương án sau:'][s % 4];
  return choice(q,labels,[true,false,false,false],`Câu về số ${2*a} có giá trị sai xác định nên vẫn là mệnh đề. Câu chứa biến tự do, yêu cầu và câu hỏi chưa có tính chất ấy.`,s);
});
define('implication','Tìm phản ví dụ nguyên dương cho một mệnh đề kéo theo sai.',s=>{
  const a=k(s),oracle=seq(1,4*a).find(n=>n%a===0&&n%(2*a)!==0);
  return number(R`Mệnh đề: “Nếu $n$ chia hết cho ${a} thì $n$ chia hết cho ${2*a}”, với n nguyên dương. Phản ví dụ nguyên dương nhỏ nhất là bao nhiêu?`,a,`Số ${a} chia hết cho ${a} nhưng không chia hết cho ${2*a}; các số nguyên dương nhỏ hơn chưa chia hết cho ${a}.`,oracle);
});
define('quantifier','Chọn đúng phủ định của mệnh đề có lượng từ với mọi.',s=>{
  const a=k(s),labels=[R`$\forall x\in\mathbb R:x^2<${a}$`,R`$\exists x\in\mathbb R:x^2<${a}$`,R`$\exists x\in\mathbb R:x^2\ge${a}$`,R`$\forall x\in\mathbb R:x^2>${a}$`];
  const structures=[['all','lt'],['some','lt'],['some','ge'],['all','gt']];
  return choice(R`Phủ định đúng của $\forall x\in\mathbb R:x^2\ge${a}$ là câu nào?`,labels,structures.map(([q,p])=>q==='some'&&p==='lt'),'Phủ định đổi với mọi thành tồn tại, đồng thời phủ định quan hệ lớn hơn hoặc bằng thành nhỏ hơn; giữ nguyên miền số thực.',s);
});
define('sets','Đếm số phần tử giao của hai tập hữu hạn cho bằng danh sách.',s=>{
  const a=k(s),shift=1+s%4,A=seq(a,a+4),B=seq(a+shift,a+shift+4);return number(R`Cho $A=\{${A.join(';')}\}$, $B=\{${B.join(';')}\}$. Giao của A và B có bao nhiêu phần tử?`,5-shift,`Phần chung gồm các số nguyên từ ${a+shift} đến ${a+4}, có ${5-shift} phần tử.`,A.filter(x=>B.includes(x)).length);
});
define('numberSets','Đếm số nguyên thuộc một khoảng hoặc đoạn có đầu mút xác định.',s=>{
  const a=k(s),b=a+3+s%4;return number(R`Có bao nhiêu số nguyên thuộc $(${a};${b}]$?`,b-a,`Các số từ ${a+1} đến${b}, có ${b}-${a}=${b-a} số.`,seq(a-2,b+2).filter(x=>x>a&&x<=b).length);
});
define('inequality','Kiểm tra cặp tọa độ thỏa bất phương trình bậc nhất hai ẩn.',s=>{
  const a=k(s),pts=[[a,a],[a+1,a+2],[a+2,a],[a,a+4]],limit=3*a+1;
  return choice(R`Điểm nào thuộc miền $2x+y\le${limit}$?`,pts.map(([x,y])=>`$(${x};${y})$`),pts.map(([x,y])=>2*x+y<=limit),`Các vế trái lần lượt là ${pts.map(([x,y])=>2*x+y).join(',')}; chỉ cặp đầu thỏa dấu không vượt.`,s);
});
define('halfplane','Xác định phía của đường biên bằng điểm thử.',s=>{
  const a=k(s),pts=[[0,0],[a+1,0],[0,a+2],[a,a]];
  return choice(R`Đường biên $x+y=${a}$. Điểm nào thuộc nửa mặt phẳng nghiệm $x+y<${a}$?`,pts.map(([x,y])=>`$(${x};${y})$`),pts.map(([x,y])=>x+y<a),`Thay điểm thử vào x+y; gốc tọa độ cho0<${a}. Ba điểm còn lại đều có tổng lớn hơn${a}. Biên không được lấy.`,s);
});
define('system','Đếm các cặp số nguyên không âm thỏa hệ bất phương trình hữu hạn.',s=>{
  const a=2+s%5,oracle=seq(0,a).flatMap(x=>seq(0,a).map(y=>[x,y])).filter(([x,y])=>x+y<=a).length;
  return number(R`Có bao nhiêu cặp số nguyên $(x;y)$ thỏa $x\ge0,y\ge0,x+y\le${a}$?`,(a+1)*(a+2)/2,`Với x từ0 đến${a}, số y lần lượt${a+1},${a},...,1; tổng (${a+1})(${a+2})/2.`,oracle);
});
define('optimize','Tìm giá trị lớn nhất của mục tiêu tuyến tính trên một miền tam giác.',s=>{
  const a=k(s),oracle=Math.max(...seq(0,a).flatMap(x=>seq(0,a-x).map(y=>3*x+2*y)));
  return number(R`Với $x,y\in\mathbb R$, $x\ge0,y\ge0,x+y\le${a}$, giá trị lớn nhất của $F=3x+2y$ là bao nhiêu?`,3*a,R`$F\le3(x+y)\le${3*a}$; đạt tại $(${a};0)$. Ba đỉnh cho giá trị0,${3*a},${2*a}.`,oracle);
});
define('trigValue','Đọc giá trị sin từ điểm trên nửa đường tròn đơn vị.',s=>{
  const triples=[[3,4,5],[5,12,13],[8,15,17]], [a,b,c]=triples[s%3];
  assert.equal(a*a+b*b,c*c);checks++;
  const labels=[`$${b}/${c}$`,`$${a}/${c}$`,`$-${b}/${c}$`,`$-${a}/${c}$`];
  return choice(R`Điểm $M(-${a}/${c};${b}/${c})$ nằm trên nửa đường tròn đơn vị phía trên. Góc tương ứng là $\alpha$. Giá trị $\sin\alpha$ bằng:`,labels,[true,false,false,false],`Sin là tung độ nên bằng${b}/${c}; cos là hoành độ âm.`,s);
});
define('supplement','Tính cos của góc bù khi biết cos của góc ban đầu.',s=>{
  const [a,b,c]=[[3,4,5],[5,12,13],[8,15,17]][s%3];
  return choice(R`Biết $\cos\alpha=${a}/${c}$ với $0<\alpha<90^\circ$. Chọn $\cos(180^\circ-\alpha)$.`,[`$-${a}/${c}$`,`$${a}/${c}$`,`$${b}/${c}$`,`$-${b}/${c}$`],[true,false,false,false],`Đối xứng qua trục tung đổi dấu hoành độ nên cos góc bù bằng-${a}/${c}.`,s);
});
define('cosine','Tính bình phương một cạnh từ hai cạnh và góc xen giữa.',s=>{
  const a=k(s),b=2*a,c=3*a,key=7*a*a,oracle=(b-c/2)**2+(c*Math.sqrt(3)/2)**2;
  return number(R`Hai cạnh kề góc $60^\circ$ dài ${b}cm và${c}cm; cạnh đối diện dài x cm. Tính $x^2$ (đơn vị $\mathrm{cm}^2$).`,key,R`$x^2=${b}^2+${c}^2-2\cdot${b}\cdot${c}\cdot\tfrac12=${key}$.`,oracle);
});
define('sine','Tính bán kính ngoại tiếp từ cạnh và góc đối diện.',s=>{
  const a=k(s),side=2*a;return number(R`Tam giác có cạnh a=${side}cm đối diện góc $30^\circ$. Bán kính ngoại tiếp R bằng bao nhiêu cm?`,side,R`$a/\sin30^\circ=2R$, nên $R=${side}/(2\cdot\tfrac12)=${side}$cm.`,side/(2*Math.sin(Math.PI/6)));
});
define('areaSin','Tính diện tích tam giác từ hai cạnh và góc xen giữa.',s=>{
  const a=2*k(s),b=4*(2+s%4),height=a/2;return number(R`Hai cạnh kề góc $30^\circ$ dài ${a}m và${b}m. Diện tích tam giác bằng bao nhiêu $\mathrm{m}^2$?`,a*b/4,R`$S=ab\sin30^\circ/2=${a*b/4}\,\mathrm{m}^2$.`,b*height/2);
});
define('heron','Tính diện tích tam giác từ ba cạnh bằng Heron.',s=>{
  const a=k(s),p=6*a;return number(R`Tam giác có ba cạnh ${3*a},${4*a},${5*a}cm. Diện tích bằng bao nhiêu $\mathrm{cm}^2$?`,6*a*a,R`Nửa chu vi p=${p}; Heron cho $S=\sqrt{${p}\cdot${3*a}\cdot${2*a}\cdot${a}}=${6*a*a}$.`,(3*a)*(4*a)/2);
});
define('vectorIntro','Nhận biết hai vectơ bằng nhau trong hình chữ nhật.',s=>{
  const sets = [['A','B','C','D'],['P','Q','R','S'],['M','N','P','Q'],['E','F','G','H'],['X','Y','Z','T'],['I','J','K','L']];
  const [a,b,c,d]=sets[s % sets.length];
  return choice(`${a+b+c+d} là hình chữ nhật với các đỉnh ghi theo thứ tự quanh hình. Vectơ nào bằng vectơ ${a+b}?`,
    [R`$\overrightarrow{${d+c}}$`,R`$\overrightarrow{${c+d}}$`,R`$\overrightarrow{${b+a}}$`,R`$\overrightarrow{${a+d}}$`],[true,false,false,false],`${a+b} và ${d+c} cùng hướng, cùng độ dài. ${c+d},${b+a} ngược hướng; ${a+d} vuông góc ${a+b}.`,s);
});
define('vectorSum','Dùng quy tắc ba điểm để rút gọn tổng hai vectơ.',s=>{
  const sets = [['A','B','C'],['P','Q','R'],['M','N','P'],['D','E','F'],['X','Y','Z'],['U','V','W']];
  const [a,b,c]=sets[s % sets.length];
  return choice(R`Với ba điểm ${a},${b},${c}, tổng $\overrightarrow{${a+b}}+\overrightarrow{${b+c}}$ bằng:`,[R`$\overrightarrow{${a+c}}$`,R`$\overrightarrow{${c+a}}$`,R`$\overrightarrow{${a+b}}$`,R`$\vec0$`],[true,false,false,false],`Đi theo hai chặng ${a}-${b}-${c} tương đương vectơ từ${a} đến${c}; đây là quy tắc ba điểm.`,s);
});
define('vectorDifference','Rút gọn hiệu hai vectơ có chung điểm đầu.',s=>{
  const sets = [['A','B','C'],['P','Q','R'],['M','N','P'],['D','E','F'],['X','Y','Z'],['U','V','W']];
  const [a,b,c]=sets[s % sets.length];return choice(R`Hiệu $\overrightarrow{${a+b}}-\overrightarrow{${a+c}}$ bằng:`,[R`$\overrightarrow{${c+b}}$`,R`$\overrightarrow{${b+c}}$`,R`$\overrightarrow{${a+b}}$`,R`$\vec0$`],[true,false,false,false],`Đổi trừ vectơ${a+c} thành cộng vectơ${c+a}; ghép ${c}-${a}-${b} nhận vectơ${c+b}.`,s);
});
define('vectorScale','Tính độ dài vectơ sau khi nhân với một số thực.',s=>{
  const a=k(s),m=2+s%4;return number(R`Biết $|\vec u|=${a}$cm. Tính $|- ${m}\vec u|$ (cm).`,m*a,'Độ dài nhân với giá trị tuyệt đối của hệ số; dấu âm chỉ đảo hướng, không làm độ dài âm.',Math.hypot(-m*a,0));
});
define('coordinates','Tính một tọa độ của biểu thức vectơ theo các thành phần.',s=>{
  const a=k(s),b=s%5-2,ux=a,uy=b,vx=2,vy=3;return number(R`Cho $\vec u=(${ux};${uy})$, $\vec v=(${vx};${vy})$. Hoành độ của $2\vec u-\vec v$ bằng bao nhiêu?`,2*a-2,R`$2\vec u-\vec v=(${2*a-2};${2*b-3})$; hoành độ là${2*a-2}.`,sum([ux,ux,-vx]));
});
define('coordinateMidpoint','Tính hoành độ trung điểm của một đoạn thẳng từ tọa độ hai đầu mút.',s=>{
  const a=k(s),b=a+4;return number(R`A(${a};-2), B(${b};4). Hoành độ trung điểm M của AB bằng bao nhiêu?`,a+2,`Hoành độ M=(${a}+${b})/2=${a+2}; tung độ M=1.`,a+(b-a)/2);
});
define('approximation','Tính sai số tuyệt đối khi biết giá trị đúng và số gần đúng.',s=>{
  const exact=100+k(s),approx=exact+2+s%4;return number(`Giá trị đúng là${exact}cm, dùng số gần đúng${approx}cm. Sai số tuyệt đối bằng bao nhiêu cm?`,approx-exact,`Sai số tuyệt đối là trị tuyệt đối hiệu: |${approx}-${exact}|=${approx-exact}cm.`,Math.max(exact,approx)-Math.min(exact,approx));
});
define('mean','Tính trung bình cộng của một mẫu hữu hạn, giữ mọi lần lặp.',s=>{
  const a=k(s),data=[a,a+2,a+2,a+5,a+6];return number(R`Mẫu số phút $${data.join(';')}$. Trung bình cộng bằng bao nhiêu phút?`,a+3,`Tổng${sum(data)}, số phần tử5, trung bình${sum(data)}/5=${a+3}.`,sum(data)/data.length);
});
define('quartileMode','Tính Q1 bằng trung vị nửa dưới của mẫu có tám giá trị.',s=>{
  const a=k(s),data=[a,a+1,a+1,a+2,a+3,a+3,a+3,a+5];return number(R`Mẫu tăng dần $${data.join(';')}$. Dùng trung vị của hai nửa mẫu. $Q_1$ bằng bao nhiêu?`,a+1,`Nửa dưới gồm${data.slice(0,4).join(';')}; trung vị của nó là trung bình hai giá trị giữa, bằng${a+1}.`,(data[1]+data[2])/2);
});
define('mode','Tìm giá trị xuất hiện nhiều nhất trong một mẫu có mốt duy nhất.',s=>{
  const a=k(s),data=[a,a+1,a+1,a+2,a+3,a+3,a+3,a+5],counts=new Map();data.forEach(x=>counts.set(x,(counts.get(x)||0)+1));
  return number(R`Mẫu $${data.join(';')}$. Mốt bằng bao nhiêu?`,a+3,`Giá trị${a+3} xuất hiện3lần, nhiều nhất; mốt là giá trị đó, không phải số lần lặp.`,[...counts].sort((x,y)=>y[1]-x[1])[0][0]);
});
define('spread','Tính khoảng tứ phân vị khi đã biết Q1 và Q3.',s=>{
  const a=k(s),b=a+3+s%5;return number(R`Mẫu có $Q_1=${a}$ phút, $Q_3=${b}$ phút. Khoảng tứ phân vị bằng bao nhiêu phút?`,b-a,`IQR=Q3-Q1=${b}-${a}=${b-a}phút.`,Math.abs(a-b));
});
define('variance','Tính phương sai mẫu hữu hạn theo quy ước chia cho n.',s=>{
  const a=k(s),d=1+s%4,data=[a,a,a+2*d,a+2*d],avg=sum(data)/4;
  return number(R`Mẫu $${data.join(';')}$ (cm). Tính phương sai với mẫu số n, đơn vị $\mathrm{cm}^2$.`,d*d,`Trung bình${avg}; độ lệch là-${d},-${d},${d},${d}. Tổng bình phương4×${d*d}, chia4 được${d*d}.`,sum(data.map(x=>x*x))/4-avg*avg);
});
define('dot','Tính tích vô hướng theo tọa độ của hai vectơ.',s=>{
  const a=k(s),b=2+s%4;return number(R`Cho $\vec u=(${a};${b})$, $\vec v=(2;-3)$. Tính $\vec u\cdot\vec v$.`,2*a-3*b,`Nhân các tọa độ cùng vị trí rồi cộng: ${a}×2+${b}×(-3)=${2*a-3*b}.`,((a+2)**2+(b-3)**2-a*a-b*b-13)/2);
});

define('function','Tính giá trị của hàm số tại một đầu vào thuộc miền đã cho.',s=>{const a=k(s),x=1+s%5;return number(R`Cho $f(x)=x^2+${a}$ trên $D=\{0;1;2;3;4;5\}$. Tính $f(${x})$.`,x*x+a,`Đầu vào${x} thuộc D; giá trị${x}²+${a}=${x*x+a}.`,sum(Array(x).fill(x))+a);});
define('monotonic','Chọn chiều biến thiên của hàm bậc nhất trên số thực.',s=>{const a=k(s)*(s%2?-1:1),positive=(a*2+1)-(a*0+1)>0;return choice(R`Hàm $f(x)=${a}x+1$ trên $\mathbb R$ có tính chất nào?`,['Đồng biến.','Nghịch biến.','Không đổi.','Không xác định tại0.'],[positive,!positive,false,false],`Hiệu f(x2)-f(x1)=${a}(x2-x1) có dấu của${a} khi x2>x1.`,s);});
define('linegeneral','Tìm hằng số của phương trình tổng quát từ điểm thuộc đường.',s=>{const h=k(s),t=s%5,c=-2*h-3*t;return number(R`Đường $2x+3y+c=0$ qua $M(${h};${t})$. Tìm c.`,c,`Thế M:2×${h}+3×${t}+c=0 nên c=${c}.`,-(2*h+3*t));});
define('lineparam','Tính một tọa độ điểm trên đường thẳng từ tham số.',s=>{const h=k(s),t=2+s%4;return number(R`Đường thẳng có $x=${h}+3t,y=2-2t$. Khi $t=${t}$, hoành độ điểm nhận được bằng bao nhiêu?`,h+3*t,`Thay t vào biểu thức x:${h}+3×${t}=${h+3*t}.`,h+sum(Array(t).fill(3)));});
define('quadconcept','Đọc hệ số bậc nhất sau khi khai triển một hàm bậc hai.',s=>{const h=k(s),a=1+s%3;return number(R`Khai triển $f(x)=${a}(x-${h})^2+2=Ax^2+Bx+C$. Tìm B.`,-2*a*h,`Khai triển bình phương; hệ số x là-${2*a*h}.`,(a*(1-h)**2+2-(a*(-1-h)**2+2))/2);});
define('quadgraph','Xác định hoành độ đỉnh từ dạng bình phương của hàm bậc hai.',s=>{const h=k(s),v=s%5;return number(R`Parabol $y=2(x-${h})^2+${v}$ có hoành độ đỉnh bằng bao nhiêu?`,h,`Bình phương bằng0 tại x=${h}, đỉnh (${h};${v}).`,-(-4*h)/(2*2));});
define('quadapplication','Tìm giá trị lớn nhất của mô hình độ cao bậc hai trên đoạn đã cho.',s=>{const h=2+s%5,v=h*h+3;return number(R`$H(t)=-(t-${h})^2+${v}$ m với $0\le t\le${2*h}$ giây. Độ cao lớn nhất bằng bao nhiêu m?`,v,`H(t)≤${v}; đạt khi t=${h} thuộc miền.`,Math.max(...seq(0,2*h).map(t=>-((t-h)**2)+v)));});
define('lineconvert','Chọn vectơ chỉ phương vuông góc với pháp tuyến đã biết.',s=>{const a=2+s%4,b=a+1,vs=[[b,-a],[a,b],[b,a],[1,1]];return choice(R`Đường có pháp tuyến $(${a};${b})$. Vectơ nào có thể làm chỉ phương?`,vs.map(([x,y])=>`$(${x};${y})$`),vs.map(([x,y])=>a*x+b*y===0),`Chỉ (${b};-${a}) có tích vô hướng với pháp tuyến bằng0; vectơ khác0.`,s);});
define('linerelative','Tìm hoành độ giao điểm hai đường thẳng không song song.',s=>{const a=k(s),b=s%5;return number(R`Hai đường $x+y=${a+b}$, $x-y=${a-b}$ cắt nhau. Hoành độ giao điểm là bao nhiêu?`,a,`Cộng hai phương trình:2x=${2*a}; x=${a},y=${b}.`,((a+b)+(a-b))/2);});
define('lineangle','Tính cos góc không tù giữa hai đường từ chỉ phương.',s=>{const[a,b,c]=[[3,4,5],[5,12,13],[8,15,17]][s%3];return choice(R`Hai đường có chỉ phương $(1;0)$ và $(-${a};${b})$. Cos góc giữa hai đường là:`,[`$${a}/${c}$`,`$-${a}/${c}$`,`$${b}/${c}$`,`$1$`],[true,false,false,false],`Lấy trị tuyệt đối tích vô hướng:|-${a}|/(1×${c})=${a}/${c}.`,s);});
define('distance','Tính khoảng cách từ một điểm đến đường thẳng.',s=>{const a=k(s),b=s%4,d=2+s%5,c=3*a+4*b-5*d;return number(R`Khoảng cách từ $M(${a};${b})$ đến $3x+4y=${c}$ bằng bao nhiêu đơn vị độ dài?`,d,`Khoảng cách=|3×${a}+4×${b}-(${c})|/5=${d}.`,Math.abs(3*a+4*b-c)/Math.hypot(3,4));});
define('quadsign','Đếm số nguyên làm tam thức có hai nghiệm phân biệt mang dấu âm.',s=>{const a=k(s),gap=3+s%5,b=a+gap;return number(R`Có bao nhiêu số nguyên x làm $(x-${a})(x-${b})<0$?`,gap-1,`Tích âm khi${a}<x<${b}; các số nguyên${a+1} đến${b-1}, có${gap-1}.`,seq(a-1,b+1).filter(x=>(x-a)*(x-b)<0).length);});
define('quadineq','Đếm nghiệm nguyên của bất phương trình bậc hai có hai nghiệm thực phân biệt.',s=>{const a=k(s),gap=3+s%5,b=a+gap;return number(R`Có bao nhiêu số nguyên x thỏa $(x-${a})(x-${b})\le0$?`,gap+1,`Tập nghiệm thực[${a};${b}], nhận cả hai đầu; có${b}-${a}+1=${gap+1}số nguyên.`,seq(a-1,b+1).filter(x=>(x-a)*(x-b)<=0).length);});
define('radicalequal','Chọn tập nghiệm phương trình hai căn bậc hai, có kiểm điều kiện.',s=>{const a=k(s),b=s%2?2*a+3:a-1,x=a-b,valid=x+a>=0&&2*x+b>=0;return choice(R`Giải $\sqrt{x+${a}}=\sqrt{2x+${b}}$ trên $\mathbb R$.`,[`$\{${x}\}$`,'Vô nghiệm.','$\mathbb R$','$\{0\}$'],[valid,!valid,false,false],`Bình phương cho x=${x}; hai biểu thức dưới căn cùng${2*a-b}. ${valid?'Không âm nên nhận nghiệm.':'Âm nên loại, phương trình vô nghiệm.'}`,s);});
define('radicallinear','Tìm nghiệm hợp lệ của phương trình căn sau khi loại nghiệm ngoại lai.',s=>{const t=3+s%6,b=1+s%3,a=t*(t-1)-b,root=b+t,oracle=seq(-a,b+t+2).filter(x=>x-b>=0&&x+a===(x-b)**2);assert.equal(oracle.length,1);return number(R`Giải $\sqrt{x+${a}}=x-${b}$; nhập nghiệm thực duy nhất.`,root,`Cần x≥${b}. Bình phương có ứng viên${root},${b+1-t}; ứng viên thứ hai làm vế phải âm. Nghiệm${root} cho hai vế cùng${t}.`,oracle[0]);});
define('circle','Tính bán kính đường tròn từ phương trình chính tắc.',s=>{const h=k(s),r=2+s%6;return number(R`Đường tròn $(x-${h})^2+(y+2)^2=${r*r}$ có bán kính bao nhiêu?`,r,`R dương và R²=${r*r} nên R=${r}.`,Math.sqrt(r*r));});
define('circlepoints','Tính bình phương bán kính từ hai đầu mút đường kính.',s=>{const h=k(s),r=2+s%5;return number(R`Đường tròn có đường kính A(${h-r};1),B(${h+r};1). Bình phương bán kính bằng bao nhiêu?`,r*r,`AB=${2*r},R=AB/2=${r},R²=${r*r}.`,((h+r)-(h-r))**2/4);});
define('tangent','Xác định hằng số phương trình tiếp tuyến tại một điểm trên đường tròn.',s=>{const h=k(s),b=s%4,m=1+s%3,x=h+3*m,y=b+4*m,c=-3*x-4*y;return number(R`Đường tròn tâm I(${h};${b}), bán kính${5*m}, có điểm M(${x};${y}). Tiếp tuyến tại M dạng $3x+4y+c=0$. Tìm c.`,c,`IM=(${3*m};${4*m}) nên (3;4) là pháp tuyến. Thế M nhận c=-3×${x}-4×${y}=${c}.`,-(3*h+4*b+25*m));});
define('ellipse','Tính khoảng cách từ tâm đến tiêu điểm của elip chính tắc.',s=>{const m=1+s%5,a=5*m,b=4*m;return number(R`Elip $x^2/${a*a}+y^2/${b*b}=1$ có khoảng cách c từ tâm đến mỗi tiêu điểm bằng bao nhiêu?`,3*m,`c²=a²-b²=${a*a-b*b},c=${3*m}.`,Math.sqrt(a*a-b*b));});
define('addition','Đếm lựa chọn thuộc hai trường hợp rời nhau.',s=>{const a=k(s),b=2+s%5;return number(`Chọn đúng một vật từ${a}bút khác nhau hoặc${b}vở khác nhau. Có bao nhiêu lựa chọn?`,a+b,`Hai nhóm rời nhau; dùng cộng${a}+${b}=${a+b}.`,[...Array(a).fill('b'),...Array(b).fill('v')].length);});
define('multiplication','Đếm lựa chọn gồm hai bước với mọi cặp đều hợp lệ.',s=>{const a=k(s),b=2+s%5;return number(`Có${a}áo và${b}mũ; mỗi áo ghép được mọi mũ. Chọn một áo và một mũ, có bao nhiêu bộ?`,a*b,`Mỗi một trong${a}áo có${b}cách ghép; tổng${a*b}.`,seq(1,a).flatMap(x=>seq(1,b).map(y=>[x,y])).length);});
define('mixedcount','Đếm hành trình bằng cách cộng giữa trường hợp và nhân trong từng trường hợp.',s=>{const a=k(s),b=2+s%3,c=3+s%4;return number(`A-B có${a}tuyến thẳng. Đi qua C có${b}tuyến A-C,${c}tuyến C-B; mọi cặp nối được. Chọn đi thẳng hoặc qua C đúng một lần. Có bao nhiêu hành trình?`,a+b*c,`Đi thẳng${a}; qua C${b}×${c}; tổng${a+b*c}.`,Array(a).length+seq(1,b).flatMap(i=>seq(1,c).map(j=>[i,j])).length);});
define('permutation','Đếm cách xếp mọi đối tượng phân biệt thành một hàng.',s=>{const n=3+s%4;let count=0;const visit=xs=>{if(!xs.length){count++;return;}xs.forEach((_,i)=>visit(xs.filter((__,j)=>i!==j)));};visit(seq(1,n));return number(`Xếp${n}cuốn sách khác nhau thành một hàng, dùng đủ mỗi cuốn một lần. Có bao nhiêu cách?`,fact(n),`Số cách${n}!=${fact(n)} do số lựa chọn giảm dần từng vị trí.`,count);});
define('arrangement','Đếm cách chọn người cho hai vai trò khác nhau, không lặp người.',s=>{const n=4+s%6;return number(`Từ${n}em chọn trưởng nhóm và thư kí khác người. Có bao nhiêu cách phân công?`,n*(n-1),`Chọn vai trò đầu${n}, vai trò sau${n-1}; tích${n*(n-1)}.`,seq(1,n).flatMap(a=>seq(1,n).filter(b=>a!==b).map(b=>[a,b])).length);});
define('combination','Đếm nhóm ba người không thứ tự từ tập người phân biệt.',s=>{const n=5+s%5;return number(`Chọn nhóm3em từ${n}em khác nhau, không phân vai. Có bao nhiêu nhóm?`,comb(n,3),`C(${n},3)=${n}×${n-1}×${n-2}/6=${comb(n,3)}.`,subsets(n,3).length);});
for(const n of[4,5])define(`newton${n}`,`Tính hệ số của x bình phương trong nhị thức bậc${n}.`,s=>{const a=1+s%4,key=comb(n,2)*a**(n-2);return number(R`Hệ số của $x^2$ trong $(x+${a})^{${n}}$ bằng bao nhiêu?`,key,`Chọn x từ2trong${n}thừa số; còn${n-2}thừa số cho${a}. Hệ số C(${n},2)×${a}^${n-2}=${key}.`,power(a,n)[2]);});
define('samplespace','Đếm số kết quả của một biến cố trong không gian cặp có thứ tự.',s=>{const n=3+s%4;return number(`Quay hai lần vòng quay nhãn1đến${n}, ghi nhãn lần đầu rồi lần sau. Có bao nhiêu kết quả có tổng không vượt${n+1}?`,n*(n+1)/2,`Theo nhãn lần đầu, số cách lần sau là${n},${n-1},...,1; tổng${n*(n+1)/2}.`,seq(1,n).flatMap(a=>seq(1,n).map(b=>[a,b])).filter(([a,b])=>a+b<=n+1).length);});
define('probability','Chọn xác suất lấy một vật thuộc loại đã cho trong phép thử đồng khả năng.',s=>{const r=2+s%4,b=r+2,n=r+b;return fractionChoice(`Hộp có${r}viên đỏ,${b}viên xanh phân biệt. Lấy ngẫu nhiên đều một viên. Xác suất lấy đỏ là:`,r,n,`Có${r}kết quả đỏ trong${n}kết quả đồng khả năng nên xác suất${r}/${n}.`,Array(r).length/(Array(r).length+Array(b).length),s);});
define('combprob','Chọn xác suất lấy đúng một viên đỏ trong cặp không hoàn lại.',s=>{const r=2+s%4,b=2+s%3,n=r+b,all=pairs(n),good=all.filter(([i,j])=>i<=r&&j>r);return fractionChoice(`Có${r}viên đỏ,${b}viên xanh phân biệt. Lấy đều một cặp hai viên cùng lúc, không hoàn lại. Xác suất đúng một đỏ là:`,r*b,comb(n,2),`Mọi cặp:${comb(n,2)}. Một đỏ một xanh:${r*b}; xác suất${r*b}/${comb(n,2)}.`,good.length/all.length,s);});
define('complement','Chọn xác suất có ít nhất một viên đỏ bằng biến cố đối.',s=>{const r=2+s%4,b=2+s%3,n=r+b,all=pairs(n),good=all.filter(([i,j])=>i<=r||j<=r),num=comb(n,2)-comb(b,2);return fractionChoice(`Có${r}viên đỏ,${b}viên xanh phân biệt. Lấy đều một cặp không hoàn lại. Xác suất có ít nhất một đỏ là:`,num,comb(n,2),`Đối là cả hai xanh:${comb(b,2)}cặp. Xác suất1-${comb(b,2)}/${comb(n,2)}=${num}/${comb(n,2)}.`,good.length/all.length,s);});
