import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const R = String.raw;
const id = 'r22-g11-discover-r106';
const sgkId = 'r26-g11-parallel-planes-sgk';
const source = {
  id: sgkId, kind: 'external',
  locator: 'C:/Users/ADMIN/Downloads/smart-lesson-plan-ai/SGK Kết nối/sach-giao-khoa-toan-11-tap-1-ket-noi-tri-thuc-voi-cuoc-song (2).pdf#page=89',
  label: 'SGK Toán 11, tập 1, Kết nối tri thức với cuộc sống, Bài 13, trang in 88–89 (trang PDF 89–90); định nghĩa và HĐ2. Bài tập trong gói do tác giả biên soạn.',
  hash: 'd33709c42f9a1cf835c87926f7ea77034251198c1f0108ac2cead535e9d049ef',
  verification: 'teacher_review_required',
};

const questions = {
  'task-1-1': {
    prompt: R`Quan sát hai mặt kệ nằm ngang ở hai độ cao khác nhau và mặt kệ với một vách bên. Coi mỗi mặt là một phần của mặt phẳng kéo dài vô hạn. Cặp nào không có điểm chung, cặp nào có điểm chung? Vẽ hai hình phác, đánh dấu điểm hoặc đường chung nếu có. Hai miếng bìa chưa chạm nhau có đủ để kết luận hai mặt phẳng chứa chúng không có điểm chung không?`,
    solution: 'Hai mặt kệ nằm ngang ở hai độ cao khác nhau gợi hai mặt phẳng không có điểm chung. Mặt kệ và vách bên có đường chung. Hai miếng bìa hữu hạn không chạm nhau chưa đủ: các mặt phẳng chứa chúng có thể cắt nhau bên ngoài phần bìa.',
    criteria: ['Phân biệt không có điểm chung với có đường chung.', 'Phân biệt miếng bìa hữu hạn với mặt phẳng kéo dài vô hạn.'],
    hints: ['Hãy tưởng tượng kéo dài mỗi mặt về mọi phía; đừng chỉ nhìn mép miếng bìa.'],
  },
  'task-2-1': {
    prompt: R`Khám phá cùng thầy/cô. Hai mặt phẳng $(P),(Q)$ cắt nhau theo $d$. Trong $(P)$, vẽ $a$ song song với $d$ và khác $d$. (1) $a$ có thể song song với $(Q)$ dù $(P)$ không song song với $(Q)$ không? (2) Bây giờ $(P)$ chứa hai đường $a,b$ cắt nhau và cả hai cùng song song với $(Q)$. Em dự đoán quan hệ giữa $(P),(Q)$ thế nào? Nêu điều kiện mới đã làm thay đổi dự đoán. Ghi dự đoán trước khi nghe thầy/cô chốt.`,
    solution: R`(1) Có. Nếu $a$ có điểm chung với $(Q)$ thì điểm ấy thuộc $d$, trái với $a\parallel d$; nhưng $(P)\cap(Q)=d$. (2) $(P)\parallel(Q)$. Điểm quyết định là có hai đường cắt nhau trong $(P)$, mỗi đường đều song song với $(Q)$; một đường hoặc hai đường song song với nhau chưa đủ.`,
    criteria: ['Dùng giao tuyến để bác bỏ suy luận từ một đường.', 'Dự đoán và chỉ ra điều kiện hai đường cắt nhau; GV chốt, không dùng lượt chung làm mastery.'],
    hints: ['So sánh hai tình huống: điều kiện về vị trí tương đối của hai đường đã thay đổi thế nào?'],
  },
  'task-3-1': {
    prompt: R`Luyện có hỗ trợ. Trong tứ diện $SABC$, $M,N,P$ là trung điểm của $SA,SB,SC$. Một lời giải viết: “$MN\parallel AB$ và $MP\parallel AC$, vậy $(MNP)\parallel(ABC)$”. Hãy bổ sung các bước còn thiếu: mỗi đường $MN,MP$ song song với mặt phẳng nào, vì sao; chúng cắt nhau ở đâu; định lí nào cho kết luận?`,
    solution: R`$MN,MP$ là các đường trung bình trong tam giác $SAB,SAC$, nên $MN\parallel AB$, $MP\parallel AC$. $M$ nằm ngoài $(ABC)$, vì thế $MN,MP$ không nằm trong $(ABC)$. Do $AB,AC\subset(ABC)$, suy ra $MN\parallel(ABC)$ và $MP\parallel(ABC)$. Hai đường $MN,MP$ cùng thuộc $(MNP)$ và cắt nhau tại $M$. Theo định lí về hai đường cắt nhau, $(MNP)\parallel(ABC)$.`,
    criteria: ['Bổ sung bước từ đường song song đường sang đường song song mặt phẳng, có điều kiện không nằm trong mặt phẳng.', 'Chỉ rõ hai đường cắt nhau tại M và cùng nằm trong (MNP).'],
    hints: [
      'Tô màu mặt phẳng đích và xác định vị trí của M so với mặt phẳng ấy.',
      'Một đường song song với một đường nằm trong mặt phẳng chưa đủ nếu chính nó nằm trong mặt phẳng.',
      'Viết riêng ba dòng: đường thứ nhất song song mặt phẳng; đường thứ hai song song mặt phẳng; hai đường cắt nhau.',
      R`Ví dụ khác: với hai hình bình hành $ABCD,ABEF$ không đồng phẳng, $BC\parallel AD$ và $BE\parallel AF$. Muốn xét $(BCE)$ với $(ADF)$, hãy kiểm tra vị trí của $B$ trước khi dùng hai cặp đường này.`,
    ],
  },
  'task-3-2': {
    prompt: R`Luyện vận dụng. Trong hình hộp chữ nhật $ABCD.A'B'C'D'$, hãy chứng minh hai mặt phẳng chứa hai mặt đối diện $(ABB'A')$ và $(DCC'D')$ song song. Tự chọn hai đường cắt nhau trong mặt phẳng thứ nhất; chỉ ra các đường song song tương ứng trong mặt phẳng thứ hai. Giải thích vì sao chỉ chọn $AB$ và $A'B'$ là chưa đủ để áp dụng định lí hai đường cắt nhau.`,
    solution: R`Chọn $AB,AA'$ cắt nhau tại $A$ và cùng thuộc $(ABB'A')$. Vì $AB\parallel DC$, $AA'\parallel DD'$, $DC,DD'\subset(DCC'D')$ và $A\notin(DCC'D')$, nên $AB\parallel(DCC'D')$, $AA'\parallel(DCC'D')$. Suy ra $(ABB'A')\parallel(DCC'D')$. Hai đường $AB,A'B'$ song song với nhau, nên lựa chọn đó chưa đáp ứng điều kiện cắt nhau của định lí, dù kết luận về hai mặt phẳng vẫn đúng.`,
    criteria: ['Chọn đúng hai đường cắt nhau, chứng minh mỗi đường song song mặt phẳng đối diện.', 'Phân biệt cách chọn đường chưa đủ điều kiện với kết luận hình học sai.'],
    hints: ['Tại một đỉnh của mặt hình chữ nhật, chọn hai cạnh theo hai hướng khác nhau.'],
  },
  'task-4-1': {
    prompt: R`Kiểm tra độc lập: lời giải sau sai ở đâu? “$(P)$ chứa hai đường phân biệt $a,b$; $a\parallel b$, $a\parallel(Q)$, $b\parallel(Q)$, do đó $(P)\parallel(Q)$”. Hãy vẽ một phản ví dụ bằng hai mặt phẳng cắt nhau theo $d$, rồi phát biểu điều kiện cần thay cho $a\parallel b$ để kết luận trên được bảo đảm.`,
    solution: R`Sai ở việc bỏ điều kiện hai đường cắt nhau. Chọn $(P)\cap(Q)=d$; trong $(P)$ vẽ hai đường phân biệt $a,b$ cùng song song với $d$ và khác $d$. Mỗi đường đều không có điểm chung với $(Q)$, nhưng hai mặt phẳng vẫn cắt nhau theo $d$. Thay $a\parallel b$ bằng $a,b$ cắt nhau, giữ $a,b\subset(P)$ và $a\parallel(Q),b\parallel(Q)$, thì định lí cho $(P)\parallel(Q)$.`,
    criteria: ['Chỉ đúng điều kiện bị thiếu, không chỉ nói kết luận sai.', 'Phản ví dụ thỏa cả hai giả thiết đường song song mặt phẳng nhưng hai mặt phẳng cắt nhau.', 'Phát biểu đủ điều kiện của định lí đã sửa.'],
    hints: ['Nếu cần hỗ trợ, bắt đầu từ hai mặt phẳng cắt nhau; bài có dùng gợi ý không còn là minh chứng độc lập.'],
  },
  'task-5-1': {
    prompt: R`Thử thách tự chọn. $(P)$ chứa hai đường $a,b$ cắt nhau, cùng song song với $(Q)$. Giả sử $(P)$ và $(Q)$ cắt nhau theo $d$. Dùng tính chất đường thẳng song song mặt phẳng đã học để xác định quan hệ giữa $a,d$ và $b,d$. Mâu thuẫn xuất hiện ở đâu? Vì sao $(P)$ cũng không thể trùng $(Q)$?`,
    solution: R`Nếu $(P)\cap(Q)=d$ thì $a\parallel(Q)$, $a\subset(P)$ cho $a\parallel d$; tương tự $b\parallel d$. Khi đó $a\parallel b$, trái giả thiết $a,b$ cắt nhau. $(P)$ không thể trùng $(Q)$ vì khi ấy $a\subset(Q)$, trái $a\parallel(Q)$. Vậy $(P)\parallel(Q)$.`,
    criteria: ['Suy ra hai đường cùng song song giao tuyến nên không thể cắt nhau.', 'Loại trường hợp hai mặt phẳng trùng nhau bằng giả thiết đường song song mặt phẳng.'],
    hints: ['Nhắc lại tính chất: mặt phẳng chứa đường song song mặt phẳng kia thì giao tuyến, nếu có, song song với đường ấy.'],
  },
  'task-6-1': {
    prompt: R`Phiếu ra cửa, làm độc lập. Cho $A\notin(Q)$; hai đường $d,e$ trong $(Q)$ cắt nhau. Qua $A$ dựng $a\parallel d$, $b\parallel e$; gọi $(P)$ là mặt phẳng chứa $a,b$. Chứng minh $(P)\parallel(Q)$ bằng cách kiểm tra từng điều kiện của định lí. Kết luận này cho biết gì về các điểm chung của $(P)$ và $(Q)$?`,
    solution: R`Do $d,e$ cắt nhau, chúng có hai hướng khác nhau, nên $a,b$ là hai đường phân biệt cắt nhau tại $A$ và cùng thuộc $(P)$. Vì $A\notin(Q)$, $a\parallel d$, $d\subset(Q)$, suy ra $a\parallel(Q)$; tương tự $b\parallel(Q)$. Định lí cho $(P)\parallel(Q)$. Theo định nghĩa, hai mặt phẳng không có điểm chung.`,
    criteria: ['Chỉ rõ a,b phân biệt, cắt nhau tại A và cùng nằm trong (P).', 'Dùng A ngoài (Q) cùng hai cặp đường song song để suy ra a,b đều song song (Q).', 'Áp dụng định lí, diễn giải kết luận bằng định nghĩa không có điểm chung.'],
    hints: ['Kiểm tra đủ nơi chứa hai đường, vị trí tương đối của chúng và quan hệ của từng đường với mặt phẳng đích.'],
  },
  'task-7-1': {
    prompt: 'Nhìn lại bài làm: em đã bổ sung hoặc sửa điều kiện nào? Ghi một dấu hiệu giúp em tự phát hiện lỗi đó lần sau. Nếu chưa rõ, viết câu hỏi cụ thể gửi thầy/cô.',
    solution: 'GV đọc phản hồi để chọn bước hỗ trợ tiếp theo; không suy đạt mục tiêu từ tự đánh giá.',
    criteria: ['Nêu một điều kiện đã sửa hoặc một câu hỏi cụ thể.'],
    hints: ['Đối chiếu một dòng trong bài đầu giờ với lời giải sau khi em sửa.'],
  },
};

// ponytail: repair only the first parallel-planes lesson; author later periods separately after teacher review.
export function repairR106Formation(entry) {
  if (entry.pkg.id !== id) return entry;
  assert.equal(entry.pkg.status, 'draft', 'An approved package must not be overwritten by this repair');
  const result = structuredClone(entry), pkg = result.pkg;
  result.title = 'Hai mặt phẳng song song - Định nghĩa và điều kiện (tiết 77)';
  pkg.version = '1.1.0';
  pkg.sourceRefs = [...pkg.sourceRefs.filter(ref => ref.id !== sgkId), source];
  pkg.essentialQuestion = 'Vì sao một hướng song song chưa đủ để kết luận hai mặt phẳng song song? Cần kiểm tra những điều kiện nào?';
  pkg.prerequisites = ['Hai mặt phẳng phân biệt có điểm chung thì cắt nhau theo một đường thẳng.', 'Định nghĩa, dấu hiệu và tính chất đường thẳng song song với mặt phẳng; điều kiện đường không nằm trong mặt phẳng.', 'Đường trung bình của tam giác; tính chất các cạnh của hình hộp chữ nhật.'];
  pkg.objectives[0].statement = 'Nêu định nghĩa hai mặt phẳng song song; áp dụng dấu hiệu hai đường cắt nhau cùng song song với mặt phẳng kia; bác bỏ kết luận thiếu điều kiện bằng phản ví dụ.';
  const activities = pkg.activities;
  Object.assign(activities[0], {
    studentAction: '4 phút: quan sát mô hình hoặc hình GV vẽ trên bảng, dự đoán riêng trong vở; chưa tra định nghĩa. TV ở màn hình chờ, thiết bị chỉ dùng để gửi dự đoán sau khi viết.',
    expectedProduct: 'Hai hình phác về điểm chung và một câu phân biệt mặt phẳng với miếng bìa hữu hạn.',
    teacherLookFor: 'Chuẩn bị hai tấm bìa và một hộp chữ nhật; nếu thiếu đồ dùng, vẽ hình kệ với vách bên. Hỏi: “Kéo dài hai mặt thì sao?”, “Không chạm mép bìa có nghĩa là không có điểm chung không?”. Giữ hai dự đoán khác nhau để thảo luận; chưa chấm đúng/sai như bài luyện.',
    transition: 'GV chọn hai dự đoán trái nhau, chuyển sang tìm định nghĩa và kiểm tra điều kiện.',
  });
  Object.assign(activities[1], {
    minutes: 12,
    studentAction: '12 phút, theo nhịp thầy/cô: (1) đối chiếu dự đoán về điểm chung; (2) kiểm tra phản ví dụ một đường song song; (3) dự đoán khi có hai đường cắt nhau; (4) ghi định nghĩa, định lí và điều kiện sau khi GV chốt; (5) cùng giải một ví dụ mẫu, chỉ tên hai đường được dùng. Thiết bị tạm dừng để quan sát bảng.',
    expectedProduct: 'Vở có định nghĩa, định lí kèm đầy đủ giả thiết, một phản ví dụ và lời giải mẫu có bước kiểm tra điều kiện.',
    teacherLookFor: [
      R`Phút 1–2. Định nghĩa (SGK trang 88): Hai mặt phẳng song song nếu chúng không có điểm chung; kí hiệu $(P)\parallel(Q)$. Hỏi: “Hai mặt phẳng trùng nhau có thỏa định nghĩa không?” Chốt: không, vì có điểm chung.`,
      R`Phút 3–5. Phản ví dụ: vẽ $(P)\cap(Q)=d$, rồi vẽ $a\subset(P)$, $a\parallel d$, $a\ne d$. Hỏi: “$a$ có chạm $(Q)$ không? Hai mặt phẳng có còn cắt nhau không?” Chốt $a\parallel(Q)$ vẫn chưa đủ. Vẽ thêm $b\parallel d$ khác $a,d$: hai đường song song trong $(P)$ cùng song song $(Q)$ vẫn chưa đủ.`,
      R`Phút 6–8. Định lí (SGK trang 89): Nếu $(P)$ chứa hai đường thẳng cắt nhau và cả hai đường cùng song song với $(Q)$ thì $(P)\parallel(Q)$. Viết riêng ba giả thiết: $a,b\subset(P)$; $a\cap b=\{O\}$; $a\parallel(Q),b\parallel(Q)$. Hỏi: “Bỏ cắt nhau, phản ví dụ vừa vẽ có bác bỏ được không?” Giải thích ngắn: nếu hai mặt phẳng cắt theo $d$, tính chất đường–mặt phẳng buộc $a,b$ cùng song song $d$, trái điều kiện cắt nhau. Không được thay $a\parallel(Q)$ bằng $a\subset(Q)$.`,
      R`Phút 9–12. Ví dụ mẫu do tác giả biên soạn: trong tứ diện $SABC$, lấy $M,N,P$ là trung điểm của $SA,SB,SC$. GV hỏi lần lượt: “Muốn xét $(MNP)$ với $(ABC)$, chọn hai đường nào?”, “Vì sao chúng song song $(ABC)$?”, “Chúng cắt nhau ở đâu?”. Từ đường trung bình: $MN\parallel AB$, $MP\parallel AC$. Vì $M\notin(ABC)$, suy ra $MN,MP$ đều song song $(ABC)$. Chúng nằm trong $(MNP)$, cắt nhau tại $M$, nên $(MNP)\parallel(ABC)$. HS gạch chân điều kiện cắt nhau và điều kiện đường không nằm trong mặt phẳng đích.`,
    ].join('\n\n'),
    transition: 'GV chốt định nghĩa, ba giả thiết của định lí và ví dụ mẫu trên bảng; mời một em nhắc lại điều kiện cắt nhau rồi mới mở luyện tập.',
  });
  Object.assign(activities[2], {
    minutes: 8,
    studentAction: '8 phút: mỗi em làm một tuyến theo hướng dẫn GV. Tuyến hỗ trợ bổ sung lời giải mẫu; tuyến cơ bản tự chọn đường trong hình hộp. Viết lập luận vào vở trước khi gửi; không phải làm cả hai tuyến.',
    expectedProduct: 'Một lời giải chỉ rõ hai đường cắt nhau, quan hệ từng đường với mặt phẳng đích và kết luận.',
    teacherLookFor: 'Hỏi “Em đang dùng hai đường nào?” và “Đường đó nằm trong hay song song với mặt phẳng đích?”. Nếu HS chọn hai đường song song, yêu cầu đổi một đường; không chữa bằng đổi số trong đề.',
    transition: 'GV chữa một cách chọn thiếu điều kiện; đóng trao đổi để chuyển sang kiểm tra độc lập.',
  });
  Object.assign(activities[3], {
    minutes: 4,
    studentAction: '4 phút: tự tìm lỗi, vẽ phản ví dụ và sửa phát biểu; không xem lời giải của bạn. Nếu dùng gợi ý, báo rõ đã nhận hỗ trợ.',
    expectedProduct: 'Phản ví dụ thỏa giả thiết sai và phát biểu định lí đã sửa đủ điều kiện.',
    teacherLookFor: 'Cần có hai mặt phẳng thực sự cắt nhau và cả hai đường đều song song mặt phẳng kia. Chỉ viết “thiếu cắt nhau” chưa thay thế được phản ví dụ. Bài mở chờ GV đánh giá.',
  });
  Object.assign(activities[4], {
    studentAction: '4 phút tự chọn sau kiểm tra lại: em đủ điều kiện thử giải thích định lí bằng phản chứng; các em khác dùng thời gian này sửa điều kiện với GV. Có thể bỏ phần này để giữ thời gian phiếu ra cửa.',
    expectedProduct: 'Một mâu thuẫn hình học có giải thích, hoặc bản sửa phản ví dụ cùng GV.',
    teacherLookFor: 'Dùng tính chất đường thẳng song song mặt phẳng đã học; không yêu cầu định lí Thalès trong không gian của tiết sau.',
  });
  Object.assign(activities[5], {
    studentAction: '4 phút: kiểm tra từng giả thiết trong cấu hình mới, tự viết chứng minh và diễn giải kết luận bằng điểm chung; nộp trước khi trao đổi.',
    expectedProduct: 'Phiếu độc lập có hai quan hệ đường–mặt phẳng, điều kiện cắt nhau và kết luận theo định nghĩa.',
    teacherLookFor: 'Đối chiếu phản ví dụ ở recheck với chứng minh ở exit. Chỉ ghi đạt mục tiêu khi có đủ hai minh chứng cá nhân đã được GV đánh giá; điểm nhóm và bài theo mẫu không thay thế.',
  });
  for (const task of pkg.tasks) {
    const question = questions[task.id];
    assert.ok(question, `Unexpected task: ${task.id}`);
    task.prompt = question.prompt;
    task.minutes = activities.find(activity => activity.id === task.activityId).minutes;
    task.sourceRefs = [...new Set([...task.sourceRefs, sgkId])];
    task.evaluation = { rubric: { criteria: question.criteria, lookFor: [question.solution] } };
    task.supportRationale = `Lời giải dành cho GV: ${question.solution}`;
    task.metadata = { ...task.metadata, workedSolution: question.solution };
    const hints = pkg.hints.filter(hint => hint.taskId === task.id);
    assert.equal(hints.length, question.hints.length);
    hints.forEach((hint, index) => { hint.text = question.hints[index]; hint.supportRationale = task.supportRationale; });
  }
  pkg.rubric = { criteria: [pkg.objectives[0].statement], lookFor: ['Nhầm hai miếng bìa không chạm nhau với hai mặt phẳng không có điểm chung.', 'Bỏ điều kiện hai đường cắt nhau hoặc bỏ điều kiện đường không nằm trong mặt phẳng đích.'] };
  pkg.contentHash = hashPackage(pkg);
  assert.equal(validateLessonPackage(pkg).ok, true, JSON.stringify(validateLessonPackage(pkg).errors));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const corpusPath = new URL('../../content/lessons/hki-2026-g11.json', import.meta.url);
  const cataloguePath = new URL('../../content/hki-2026-catalogue.json', import.meta.url);
  const originalText = readFileSync(corpusPath, 'utf8');
  const corpus = JSON.parse(originalText);
  const original = corpus.entries.find(entry => entry.pkg.id === id);
  assert.ok(original, 'Target lesson missing');
  const repaired = repairR106Formation(original);
  const catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'));
  const item = catalogue.lessons.find(lesson => lesson.id === id);
  assert.ok(item && item.status === 'draft', 'Catalogue target must be a draft');
  assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(item.data, 'base64'))), original.pkg, 'Catalogue differs from authored target; inspect before replacing');
  Object.assign(item, { title: repaired.title, version: repaired.pkg.version, data: gzipSync(JSON.stringify(repaired.pkg)).toString('base64') });
  const before = JSON.stringify(original, null, 1).split('\n').map(line => `  ${line}`).join('\n');
  const after = JSON.stringify(repaired, null, 1).split('\n').map(line => `  ${line}`).join('\n');
  assert.equal(originalText.split(before).length, 2, 'Expected one exact target entry');
  writeFileSync(corpusPath, originalText.replace(before, after));
  writeFileSync(cataloguePath, JSON.stringify(catalogue) + '\n');
  console.log(JSON.stringify({ id, before: original.pkg.contentHash, after: repaired.pkg.contentHash, otherEntriesChanged: 0, status: repaired.pkg.status }));
}
