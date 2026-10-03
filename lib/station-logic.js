import {challenge,POINTS} from './challenges.js';
export function stationLogic(index,level,seed){let difficulty=Math.max(0,Math.min(4,level));let p=challenge(index,difficulty,seed);p.level=level;p.points=POINTS[level];
 if(index===0){p.title='Lời khai của người gác cổng';p.fields=p.fields.filter(f=>['cabinet','digit'].includes(f.key));p.expected={cabinet:p.expected.cabinet,digit:p.expected.digit};p.question[p.question.length-1]=p.question.at(-1).replace('Nhập số bản ghi đúng khi chìa ở A, B, C; tủ thật; và n.','Nhập tủ thật và n. Bảng đúng/sai là giấy nháp, không cần gửi các ô của bảng.');}
 if(index===1){let count=level<2?3:level<4?4:5,letters=['A','B','C','D','E'].slice(0,count),offset=seed%count,order=[...letters.slice(offset),...letters.slice(0,offset)];if(Math.floor(seed/count)%2)order.reverse();let clues=order.slice(0,-1).map((x,i)=>`${x} phải thực hiện trước ${order[i+1]}.`);if(level>=1)clues=clues.slice().reverse();let digit=order.indexOf('A')+1;p={...p,title:'Xếp lịch mở kho',question:[`Các công việc ${letters.join(', ')} phải làm lần lượt, mỗi việc đúng một lần.`,...clues,'Hãy xếp toàn bộ thứ tự công việc. Chữ số mã là vị trí của A, tính từ 1.'],fields:[{key:'order',label:'Thứ tự các chữ cái, ví dụ BAC',text:true},{key:'digit',label:'Vị trí của A'}],expected:{order:order.join(''),digit},digit,steps:['Vẽ mũi tên từ việc phải làm trước sang việc phải làm sau.',`Ghép các quan hệ thành chuỗi duy nhất: ${order.join(' → ')}.`,`A đứng thứ ${digit}; nhập ${order.join('')} và ${digit}.`],widget:{kind:'order',letters}};}
  if(index===2){let labels=Array.from({length:9},(_,i)=>1+((seed+i*3+difficulty*(i+1))%5)),path=[0,3,4,5,8],total=path.reduce((n,i)=>n+labels[i],0),digit=total%10;p={...p,title:'Dẫn dòng qua năm van',question:['Xoay các đoạn ống để nối đầu vào cạnh trái ô 1 với đầu ra cạnh phải ô 9. Các ô đánh số theo hàng từ trái qua phải.', 'Tuyến cần khôi phục đi qua 1 → 4 → 5 → 6 → 9. Không cần nối mọi ô còn lại.',`Nhãn van của tuyến: ${path.map(i=>`ô ${i+1}: ${labels[i]}`).join('; ')}. Chữ số mã là hàng đơn vị của tổng năm nhãn này.`],fields:[{key:'digit',label:'Chữ số mã của tuyến ống'}],expected:{digit},digit,steps:['Lần theo đầu vào, kiểm tra hai đầu đoạn ống ở mỗi chỗ nối.', 'Ô 1 nối trái–dưới; ô 4 trên–phải; ô 5 trái–phải; ô 6 trái–dưới; ô 9 trên–phải. Những ô không dùng không ảnh hưởng.',`Tổng nhãn = ${total}; chữ số hàng đơn vị là ${digit}.`],widget:{kind:'pipes',labels}};}
 if(index===3){let a=2+seed%4,b=level<2?a:1+Math.floor(seed/4)%4,start=1+Math.floor(seed/16)%5,len=level<3?5:7,list=[start];for(let n=1;n<len;n++)list.push(list[n-1]+(n%2?a:b));let next=list.at(-1)+(len%2?a:b),digit=next%10;p={...p,title:'Đọc nhịp tín hiệu',question:[`Bộ phát cộng luân phiên ${a} rồi ${b}, lặp lại đúng thứ tự ấy.`, `Các số đã ghi: ${list.join('; ')}; ?`, 'Tìm số tiếp theo và chữ số hàng đơn vị của số đó. Không suy đoán một quy luật khác với quy tắc đã nêu.'],fields:[{key:'next',label:'Số tiếp theo'},{key:'digit',label:'Chữ số hàng đơn vị'}],expected:{next,digit},digit,steps:[`Ghi các bước tăng: ${list.slice(1).map((n,i)=>n-list[i]).join('; ')}.`,`Bước tiếp theo cộng ${len%2?a:b}, cho ${next}.`,`Chữ số mã ${digit}.`],widget:{kind:'pattern',list}};}
  if(index===0&&difficulty>=3){
    const digit=difficulty===3?4+seed%3:2+seed%3;
    const validCondition=difficulty===3?`n chia cho 2 dư ${digit%2}; ${digit*5} chia hết cho n; ${digit-1} < n < ${digit+1}`:`${digit*7} chia hết cho n; n chia cho 3 dư ${digit%3}; ${digit-1} < n ≤ ${digit}`;
    p.question[p.question.length-1]=`Phiếu mã: n là số nguyên từ 2 đến 9; ${validCondition}. Nhập tủ thật và n.`;
    p.expected.digit=digit;p.digit=digit;
    p.steps[p.steps.length-1]=`Xét khoảng nguyên và kiểm tra từng điều kiện của phiếu: chỉ n = ${digit} thỏa.`;
  }
  if(index===2&&difficulty>=1){
    const allocation=challenge(2,difficulty,seed);
    p.question.push(...allocation.question.slice(0,-1),`Tìm x lớn nhất. Nhập x, y, số pin dùng và số pin nếu tăng x thêm 1, giữ x + y = ${allocation.widget.T}. Mã vẫn là hàng đơn vị của tổng nhãn van.`);
    p.fields=[...allocation.fields,...p.fields];
    p.expected={...allocation.expected,...p.expected};
    p.steps.push(...allocation.steps.slice(0,-1));
  }
  if(index===4){p.title='Phản ví dụ mở cổng cuối';p.question.push('Chỉ cần một tình huống hợp lệ để bác bỏ suy luận sai. Không cần thuộc kí hiệu logic nâng cao.');}
 p.answer=Object.entries(p.expected).map(([key,value])=>`${p.fields.find(f=>f.key===key).label}: ${value}`).join('; ');return p;
}
