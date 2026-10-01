import {mathQuestion,MATH_POINTS} from './campaign.js';
export const CATEGORIES=[{id:'practice',name:'Bài toán thuần Toán'},{id:'real',name:'Toán trong thực tế'},{id:'theory',name:'Kiểm chứng lí thuyết'},{id:'history',name:'Danh nhân và lịch sử Toán'},{id:'digital',name:'Công dân kĩ thuật số'},{id:'global',name:'Công dân toàn cầu'},{id:'culture',name:'Học tập liên văn hóa'},{id:'wellbeing',name:'Well-being và cân bằng thời gian'}];
export const FORMATS=[{id:'short',name:'Điền số'},{id:'mcq',name:'4 phương án · 1 lần gửi'},{id:'tf',name:'Đúng/sai · 1 lần gửi cả bộ'}];
const pretty=x=>typeof x==='number'?String(Number(x.toPrecision(10))):String(x);
const tex=x=>'\\('+x+'\\)';
function mix(a,seed){let b=[...a],x=seed>>>0;for(let i=b.length-1;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;let j=x%(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}
// Contexts are layered onto the selected mathematical template, never substituted for it.
const DOMAINS={real:['dự án cộng đồng','vật liệu'],digital:['hệ thống dịch vụ số','dữ liệu'],global:['dự án sử dụng tài nguyên có trách nhiệm','nước'],culture:['chương trình giao lưu giữa các lớp','thiết bị triển lãm'],wellbeing:['không gian học tập và nghỉ ngơi của lớp','thời gian']};
function application(topic,level,category){let [project,resource]=DOMAINS[category]||['gian trưng bày Toán học','nguồn lực'];let hard=level>=2;let models={
 sets:`Trong ${project}, U là tập mã các hạng mục. Hai bộ lọc A, B dùng quy tắc chia hết ghi dưới đây. ${hard?'Cần đếm hạng mục thuộc ít nhất một bộ lọc, tránh đếm trùng.':'Cần đếm hạng mục đồng thời thuộc hai bộ lọc.'}`,
 quadratic:`Trong ${project}, f(x) là mô hình chi phí theo tham số x. ${hard?'Tìm mức chi phí thấp nhất theo mô hình.':'Tìm tham số x tại đỉnh đồ thị để chuẩn bị điều chỉnh hệ thống.'}`,
 inequality:`Nhóm ${project} chia ${resource} cho hai hoạt động x và y. Các hệ số là mức sử dụng cho mỗi hoạt động; vế phải là tổng ngân sách. Cần tối đa hóa số hoạt động x, giữ y cố định.`,
 triangle:`Nhóm ${project} thiết kế sơ đồ có ba điểm nối. Biết hai đoạn và góc xen giữa, cần tính bình phương độ dài đoạn nối còn lại để so sánh phương án bố trí.`,
 vectors:`Sơ đồ ${project} dùng hai vectơ u, v mô tả hai hướng dịch chuyển trên mặt phẳng. ${hard?'Tích vô hướng giúp kiểm tra tương quan hướng.':'Cộng hai vectơ để xác định tọa độ dịch chuyển tổng.'}`,
 counting:hard?`Dự án ${project} chọn một tổ từ số học sinh được cho. Mọi thành viên có vai trò như nhau; cần đếm các tổ khác nhau, không đếm hoán vị của cùng một tổ.`:`Dự án ${project} chọn một bộ trang phục cho nhân vật đại diện. Hai lựa chọn độc lập; cần đếm số bộ phối hợp.`,
 statistics:`Đây là mẫu đo của ${project}, theo một đơn vị quy ước: ${resource}. ${hard?'Phương sai dùng để so sánh độ ổn định của dữ liệu.':'Trung bình dùng để tổng hợp mức sử dụng; chưa đủ để kết luận về độ ổn định.'}`,
 probability10:`Dự án ${project} kiểm tra cơ chế lấy mẫu công bằng bằng hộp thẻ mô phỏng. Bi đỏ/xanh đại diện hai loại thẻ; mỗi thẻ có cơ hội được chọn như nhau.`,
 trig:`Thiết bị trưng bày của ${project} có một bộ phận quay. Giá trị sin của góc, hoặc góc nhân đôi, được dùng trong mô hình chiếu chuyển động lên một trục.`,
 sequences:`Trong ${project}, lượng ${resource} ở mỗi giai đoạn tăng đều theo cấp số cộng dưới đây. ${hard?'Cần tổng nhu cầu qua các giai đoạn.':'Cần dự báo nhu cầu tại một giai đoạn.'}`,
 limits:`Nhóm ${project} dùng biểu thức dưới đây làm mô hình phản hồi gần một ngưỡng. Cần giá trị giới hạn; ${hard?'mẫu bằng 0 tại ngưỡng nên phải khử nhân tử trước khi thay.':'mô hình liên tục tại ngưỡng.'}`,
 logs:`Trong ${project}, phương trình mũ/logarit mô tả mức của một chỉ số sau x bước. Cần suy ra x, đồng thời kiểm tra điều kiện của mô hình.`,
 derivative:`Trong ${project}, f(x) biểu diễn lượng ${resource} tích lũy theo tham số x. Đạo hàm tại x đã cho là tốc độ thay đổi tức thời, không phải lượng tích lũy.`,
 space:`Dự án ${project} thiết kế một mô hình không gian chứa ${resource}. Diện tích đáy và chiều cao được cho; cần thể tích theo đơn vị khối tương ứng.`,
 probability11:`Dự án ${project} dùng hai bộ kiểm tra A và B. Giả thiết độc lập là dữ kiện của bài, không tự suy ra từ bối cảnh. ${hard?'Cần xác suất ít nhất một kiểm tra đạt.':'Cần xác suất cả hai kiểm tra đạt.'}`,
 optimization:`Dự án ${project} đánh giá hiệu quả phân bổ ${resource} bằng f(x) trên đoạn cho phép. Cần hiệu quả lớn nhất, xét cả điểm tới hạn và hai đầu đoạn.`,
 integral:`Trong ${project}, biểu thức trong dấu tích phân là tốc độ sử dụng ${resource} theo x. Tích phân xác định cho tổng lượng sử dụng trên khoảng đã cho; đơn vị là đơn vị tốc độ nhân đơn vị x.`,
 oxyz:`Mô hình 3D của ${project} dùng các vectơ trong Oxyz. ${hard?'Tính tích vô hướng để kiểm tra tương quan hai hướng.':'Bình phương độ dài dùng để so sánh khoảng dịch chuyển, không cần lấy căn.'}`,
 planes:hard?`Mô hình 3D của ${project} có mặt phẳng giới hạn (P). Khoảng cách từ gốc O đến mặt phẳng dùng để kiểm tra khoảng trống bố trí.`:`Mô hình 3D của ${project} có vùng tác động hình cầu. Cần bình phương bán kính từ phương trình; đây là thông số mô hình, không phải cam kết vùng phủ thực tế.`,
 grouped:`Dự án ${project} tổng hợp dữ liệu ${resource} theo các khoảng. Không có dữ liệu gốc, nên dùng trung điểm nhóm; kết quả là giá trị xấp xỉ.`,
 conditional:level>=3?`Dự án ${project} đánh giá một bộ kiểm tra. A là tình trạng thật, B là tín hiệu báo; cần xác suất A khi đã quan sát B, tránh nhầm P(A|B) với P(B|A).`:`Trong ${project}, hai câu lạc bộ cùng tham gia. Thông tin đã biết thu hẹp không gian mẫu xuống CLB Toán; cần xác suất có điều kiện, không chia cho toàn lớp.`
 };return models[topic];}
export function contextQuestion(plan,seed){let category=plan.category||'practice',format=plan.format||'short',l=plan.level,q=mathQuestion(plan.topic,l,seed),answer=q.answer,question=q.question,steps=[...q.steps],source=null;
 if(category==='history'){source='https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2014';question='Gian trưng bày tôn vinh Maryam Mirzakhani, người phụ nữ đầu tiên nhận Huy chương Fields (2014), có một góc ứng dụng Toán. '+application(plan.topic,l,'history')+' Dùng mô hình sau để hoàn thành góc trưng bày: '+q.question;}
 else if(category==='theory')question='Kiểm chứng lí thuyết: cần dùng đúng định nghĩa hoặc công thức của '+q.topicName.toLowerCase()+', và kiểm tra điều kiện trước khi tính. '+q.question;
 else if(category!=='practice')question=application(plan.topic,l,category)+' Dữ liệu dưới đây là mô phỏng cho bài học. '+q.question;
 q={...q,category,categoryName:CATEGORIES.find(x=>x.id===category).name,format,question,answer,steps,source,points:MATH_POINTS[l],maxAttempts:format==='short'?2:1};
 if(format==='mcq'){let correct=pretty(answer),d=Number.isInteger(answer)?1:.25,choices=[pretty(answer),pretty(answer+d),pretty(answer-d),pretty(answer+2*d)],ordered=mix(choices,seed^0x48aa);q.options=ordered;q.answer=String(ordered.indexOf(correct));q.steps=[...steps,`Phương án đúng: ${correct}.`];}
 if(format==='tf'){let statements=[`Kết quả được hỏi là ${pretty(answer)}.`,`Kết quả được hỏi lớn hơn ${pretty(answer)}.`,`Kết quả được hỏi là ${pretty(answer-1)}.`,`Kết quả được hỏi nhỏ hơn ${pretty(answer+1)}.`],truth=[1,0,0,1],rows=mix(statements.map((text,i)=>({text,right:truth[i]})),seed^0x912);q.statements=rows.map(x=>x.text);q.answer=rows.map(x=>x.right?'D':'S').join('');q.steps=[...steps,`Bộ đúng/sai theo thứ tự: ${q.answer.split('').join(' – ')}.`];}
 return q;
}
export function checkContext(q,raw){if(q.format==='mcq')return /^[0-3]$/.test(String(raw))&&String(raw)===q.answer;if(q.format==='tf')return /^[DS]{4}$/.test(String(raw).toUpperCase())&&String(raw).toUpperCase()===q.answer;return null;}
