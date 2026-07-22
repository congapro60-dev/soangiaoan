import type {
  DeweyAdaptiveQuestion,
  DeweyKnowledgeUnit,
  DeweyLessonContent,
  DeweyOlympiaPack,
  DeweyQuestionType,
  DeweyTheme,
} from './types';
import { escapeAttribute, escapeHtml, renderHtmlShell } from './htmlShell';

const labels = ['A', 'B', 'C', 'D'];

const paragraph = (value: string): string => `<p>${escapeHtml(value)}</p>`;

const safeId = (value: string): string => escapeAttribute(value.replace(/[^a-zA-Z0-9_-]/g, '-'));

const renderOptions = (name: string, options: string[], correctIndex?: number, includeCorrectMarker = true): string => options
  .map((option, index) => `
    <label class="option-lbl">
      <input type="radio" name="${escapeAttribute(name)}" value="${index}" ${includeCorrectMarker && correctIndex === index ? 'data-correct-option="true"' : ''}>
      ${escapeHtml(option)}
    </label>`)
  .join('');

const renderHeader = (content: DeweyLessonContent): string => `
<header class="top-header">
  <div class="left-cluster">
    <button class="btn-toc" type="button" onclick="toggleTOC()">≡ Mục Lục</button>
    <h1 class="lesson-title">${escapeHtml(content.title)} - ${escapeHtml(content.subtitle)}</h1>
  </div>
  <div class="timers">
    <div class="timer-box" id="section-timer"><div class="label">Phần:</div><div class="value">00:00</div></div>
    <div class="timer-box" id="global-timer"><div class="label">Tổng:</div><div class="value">${String(content.durationMinutes).padStart(2, '0')}:00</div></div>
  </div>
</header>`;

const renderToc = (content: DeweyLessonContent): string => {
  // Mục lục mở khóa toàn bộ từ đầu — học sinh tự do chuyển phần, không khóa tuần tự.
  // F12: đánh số LIÊN TỤC theo vị trí thực trong mục lục (hết nhảy "1. Khởi động → 3. …").
  const rawItems = [
    ...(!content.skipPretest ? [{ id: 'screen-pretest', title: 'Ôn tập nhanh' }] : []),
    { id: 'screen-engage', title: 'Khởi động' },
    ...content.knowledgeUnits.map(unit => ({ id: `screen-${unit.id}`, title: unit.title })),
    { id: 'screen-olympia', title: 'Luyện tập' },
    { id: 'screen-extend', title: 'Vận dụng thực tế' },
    { id: 'screen-summary', title: 'Tổng kết' },
  ];
  const items = rawItems.map((item, index) => ({
    id: item.id,
    label: `${index + 1}. ${item.title}`,
    locked: false,
  }));

  return `
<nav class="toc-menu hidden" id="toc-menu" aria-label="Mục lục bài học">
  ${items.map(item => `<button class="toc-item${item.locked ? ' locked' : ''}" type="button" data-target="${safeId(item.id)}" ${item.locked ? 'aria-disabled="true"' : ''} onclick="navTo('${safeId(item.id)}')">${escapeHtml(item.label)}</button>`).join('\n  ')}
</nav>`;
};

const renderNotebook = (): string => `
<aside class="notebook-area">
  <h2 class="notebook-title">Vở Ghi Chép Của Em</h2>
  <p>Những công thức và kết luận quan trọng sẽ tự động xuất hiện tại đây.</p>
  <div id="notebook-list">
    <section class="nb-section"><h3 class="nb-head">I. Mục tiêu bài học</h3><div class="nb-body" id="nb-muctieu"></div></section>
    <section class="nb-section"><h3 class="nb-head">II. Nội dung</h3><div class="nb-body" id="nb-noidung"></div></section>
    <section class="nb-section"><h3 class="nb-head">III. Luyện tập</h3><div class="nb-body" id="nb-luyentap"></div></section>
    <section class="nb-section"><h3 class="nb-head">IV. Vận dụng</h3><div class="nb-body" id="nb-vandung"></div></section>
    <section class="nb-section"><h3 class="nb-head">V. Tổng kết</h3><div class="nb-body" id="nb-tongket"></div></section>
  </div>
</aside>`;

const renderPretest = (content: DeweyLessonContent): string => `
<section class="screen active" id="screen-pretest">
  <h2>Kiểm tra Đầu giờ (Pre-Test)</h2>
  <div class="activity-box">${paragraph(content.pretest.reviewSummary)}</div>
  ${content.pretest.questions.map((question, index) => `
  <article class="question-card" data-pretest-question data-correct-index="${question.correctIndex}" data-explanation="${escapeAttribute(question.explanation)}">
    <p><span class="step-pill">${index + 1}</span> ${escapeHtml(question.prompt)}</p>
    ${renderOptions(`pretest-${question.id}`, question.options, question.correctIndex, false)}
    <div class="feedback-msg hidden"></div>
    <div class="pretest-explanation theory-box hidden">${escapeHtml(question.explanation)}</div>
  </article>`).join('\n')}
  <button class="btn-primary-navy" data-pretest-submit type="button" onclick="submitPreTest()">Nộp bài & Chấm điểm</button>
</section>`;

const renderPretestResult = (): string => `
<section class="screen hidden" id="screen-pretest-result">
  <h2>Kết Quả & Ôn Tập Tiết 1 - 2</h2>
  <p class="score-display">Điểm Pre-Test: <span id="pretest-score">0</span></p>
  <div id="pretest-feedback-list"></div>
  <button class="btn-primary-navy full-width" type="button" onclick="goToEngage()">Tiếp tục vào bài học</button>
</section>`;

const renderEngageIllustration = (content: DeweyLessonContent): string => {
  const illustration = content.engage.illustration;
  if (!illustration) {
    // Không có mô phỏng khởi động khớp nội dung → không vẽ placeholder để tránh hình rỗng/lệch.
    return content.engage.rawSvgFallback
      ? `<div class="enigma-container">${content.engage.rawSvgFallback}</div>`
      : '';
  }

  const media = illustration.type === 'image'
    ? `<img src="${escapeAttribute(illustration.data)}" alt="${escapeAttribute(illustration.caption)}">`
    : illustration.data;

  return `
  <figure class="box engage-illustration">
    ${media}
    <figcaption>${escapeHtml(illustration.caption)}</figcaption>
  </figure>`;
};

const renderEngage = (content: DeweyLessonContent, firstUnit?: DeweyKnowledgeUnit): string => {
  const nextScreen = firstUnit ? `screen-${safeId(firstUnit.id)}` : 'screen-olympia';
  const engage = content.engage;
  const bloom = engage.goalSetting?.bloomFramework;

  return `
<section class="screen${content.skipPretest ? ' active' : ''}" id="screen-engage" data-next-screen="${nextScreen}">
  ${engage.stepLabel ? `<span class="step-pill">${escapeHtml(engage.stepLabel)}</span>` : ''}
  ${engage.bigTitle ? `<h1 class="big-title">${escapeHtml(engage.bigTitle)}</h1>` : '<h2>2. Khởi động - Nêu vấn đề</h2>'}
  <div class="activity-box mission-box">
    <h3>Nhiệm vụ mở đầu</h3>
    ${paragraph(engage.storyHook)}
    ${engage.realityCheckMessage ? `<div class="eval-box feedback-wrong">${escapeHtml(engage.realityCheckMessage)}</div>` : ''}
  </div>
  ${renderEngageIllustration(content)}
  ${engage.interactiveWidget ? `
  <div class="activity-box" data-engage-widget="${escapeAttribute(engage.interactiveWidget.type)}">
    <h3>${escapeHtml(engage.interactiveWidget.title)}</h3>
    ${engage.interactiveWidget.htmlInline}
  </div>
  <script>${engage.interactiveWidget.jsInit}</script>` : ''}
  <div class="guiding-question-card"><strong>Câu hỏi dẫn dắt:</strong> ${escapeHtml(engage.guidingQuestion)}</div>
  ${engage.guidingQuestionBox ? `<div class="guiding-question-box">${escapeHtml(engage.guidingQuestionBox)}</div>` : ''}
  ${engage.goalSetting ? `
  <div class="goal-setting activity-box">
    <h3>${escapeHtml(engage.goalSetting.heading)}</h3>
    <textarea rows="4" placeholder="${escapeAttribute(engage.goalSetting.placeholder)}"></textarea>
    <button class="btn-outline-navy" type="button" onclick="mockAiAnalyzeGoal()">${escapeHtml(engage.goalSetting.aiButtonLabel)}</button>
    <div class="bloom-framework hidden" id="bloom-result" data-nhanbiet="${escapeAttribute(bloom?.nhanbiet || '')}" data-thonghieu="${escapeAttribute(bloom?.thonghieu || '')}" data-vandung="${escapeAttribute(bloom?.vandung || '')}">
      <div class="bloom-nhanbiet"><strong>Nhận biết:</strong> ${escapeHtml(bloom?.nhanbiet || '')}</div>
      <div class="bloom-thonghieu"><strong>Thông hiểu:</strong> ${escapeHtml(bloom?.thonghieu || '')}</div>
      <div class="bloom-vandung"><strong>Vận dụng:</strong> ${escapeHtml(bloom?.vandung || '')}</div>
    </div>
  </div>` : ''}
  <button class="btn-primary-navy full-width" type="button" onclick="unlockScreen('${nextScreen}'); navTo('${nextScreen}')">${escapeHtml(engage.nextButtonLabel || 'Bắt đầu Bài Mới')}</button>
</section>`;
};

const renderImageUploadBlock = (stepId: string, step: DeweyKnowledgeUnit['socraticSteps'][number]): string => `
    <div class="image-upload-block box" data-image-upload>
      <label class="btn secondary" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
        📷 Chụp/tải ảnh bài làm viết tay
        <input type="file" accept="image/*" capture="environment" class="hidden" onchange="previewImageUpload(this)">
      </label>
      <div class="image-preview hidden" style="margin-top:10px;overflow:hidden;border-radius:12px;border:1px solid #e5e7eb;background:#f8fafc;">
        <img style="max-height:260px;width:100%;object-fit:contain;" alt="Ảnh bài làm">
      </div>
      <p class="image-name hidden" style="margin-top:6px;font-size:12px;font-weight:700;color:#64748b;"></p>
      <button class="btn grade-image-btn hidden" type="button" style="margin-top:8px;background:#7c3aed;color:white;" onclick="requestImageGrade('${safeId(stepId)}')" data-grade-problem="${escapeAttribute(step.prompt)}" data-grade-solution="${escapeAttribute(step.feedback)}" data-grade-rubric="${escapeAttribute(step.aiRubric || '')}">✨ Nhờ AI chấm ảnh tham khảo</button>
      <div class="ai-grade-feedback hidden"></div>
      <div class="ai-grade-error hidden"></div>
    </div>`;

const renderSocraticStep = (unit: DeweyKnowledgeUnit, stepIndex: number): string => {
  const step = unit.socraticSteps[stepIndex];
  const currentId = `${unit.id}-step-${step.id}`;
  const next = unit.socraticSteps[stepIndex + 1];
  const nextId = next ? `${unit.id}-step-${next.id}` : '';
  const isImageMode = step.responseMode === 'image_upload';

  return `
  <article class="scaffold-step${stepIndex === 0 ? '' : ' hidden'}" id="${safeId(currentId)}" data-socratic-step data-feedback="${escapeAttribute(step.feedback)}" data-note="${escapeAttribute(step.formulaToNote || '')}" data-next-step="${safeId(nextId)}"${isImageMode ? ' data-response-mode="image_upload"' : ''}>
    <h3><span class="step-badge">${stepIndex + 1}</span>${isImageMode ? 'Bài làm viết tay' : 'Thử và sửa'}</h3>
    <p>${escapeHtml(step.prompt)}</p>
    ${step.illustrationHtml ? `<div class="step-illustration">${step.illustrationHtml}</div>` : ''}
    <textarea rows="${isImageMode ? 2 : 3}" placeholder="${escapeAttribute(step.inputPlaceholder || 'Viết suy nghĩ của em tại đây...')}"></textarea>
    ${isImageMode ? renderImageUploadBlock(currentId, step) : ''}
    <button class="btn" type="button" onclick="submitSocraticStep(this)">Kiểm tra gợi ý</button>
    <div class="feedback-msg hidden"></div>
    ${step.expectedKeywords && step.expectedKeywords.length > 0 ? `<div class="box hidden keyword-box"><strong>Từ khóa tham khảo:</strong> ${step.expectedKeywords.map(escapeHtml).join(', ')}</div>` : ''}
    ${next ? `<button class="btn secondary next-btn hidden" type="button" onclick="unlockNextSocratic(this)">Mở bước tiếp theo</button>` : `<button class="btn secondary next-btn hidden" type="button" onclick="completeKnowledgeUnit('${safeId(unit.id)}', this)">Hoàn thành hoạt động</button>`}
  </article>`;
};

const renderUnitSimulation = (unit: DeweyKnowledgeUnit): string => {
  const sim = unit.simulationHtml;
  if (!sim || !sim.srcDoc?.trim()) return '';
  return `
  <div class="unit-simulation box">
    <h3>${escapeHtml(sim.title || 'Mô phỏng tương tác')}</h3>
    ${sim.description ? `<p>${escapeHtml(sim.description)}</p>` : ''}
    <iframe class="sim-frame" sandbox="allow-scripts" loading="lazy" srcdoc="${escapeAttribute(sim.srcDoc)}" style="width:100%;height:${sim.height || 600}px;border:0;border-radius:12px;"></iframe>
  </div>`;
};

const renderKnowledgeUnit = (unit: DeweyKnowledgeUnit, index: number, nextScreenId: string): string => `
<section class="screen" id="screen-${safeId(unit.id)}" data-next-screen="${safeId(nextScreenId)}" data-notebook-formula="${escapeAttribute(unit.formulaForNotebook || '')}">
  <h2>${index + 3}. ${escapeHtml(unit.title)}</h2>
  ${renderUnitSimulation(unit)}
  ${unit.socraticSteps.map((_step, stepIndex) => renderSocraticStep(unit, stepIndex)).join('\n')}
  <div class="box unit-completion-panel hidden" data-unit-completion>
    <strong>Kết luận:</strong> ${escapeHtml(unit.conclusion)}
    <div class="theory-box"><strong>Ghi vào vở:</strong> ${escapeHtml(unit.formulaForNotebook)}</div>
    <button class="btn success full-width" type="button" onclick="goNextActivity(this)">Sang hoạt động tiếp theo</button>
  </div>
</section>`;

const correctValueFor = (question: DeweyAdaptiveQuestion): string => {
  if (question.type === 'multiple_choice') return String(question.correctIndex ?? '');
  if (question.type === 'short_answer') return String(question.correctNumeric ?? '');
  return '';
};

const renderQuestionInput = (question: DeweyAdaptiveQuestion, name: string): string => {
  if (question.type === 'multiple_choice') {
    return renderOptions(name, question.options || [], question.correctIndex);
  }
  if (question.type === 'true_false_group') {
    return `
    <table class="tf-table">
      <thead><tr><th>Mệnh đề</th><th>Đúng</th><th>Sai</th><th>Đáp án</th></tr></thead>
      <tbody>
        ${(question.statements || []).map((statement, index) => `
        <tr data-statement-correct="${statement.correct ? 'true' : 'false'}">
          <td>${escapeHtml(statement.text)}${statement.hint ? `<div class="tf-hint-wrap"><button type="button" class="tf-hint-btn" onclick="toggleStatementHint(this)">💡 Gợi ý</button><div class="tf-hint hidden">${escapeHtml(statement.hint)}</div></div>` : ''}</td>
          <td><input type="radio" name="${escapeAttribute(`${name}-tf-${index}`)}" value="true"></td>
          <td><input type="radio" name="${escapeAttribute(`${name}-tf-${index}`)}" value="false"></td>
          <td class="tf-answer"></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }
  return `<input type="number" step="any" placeholder="Nhập đáp số" aria-label="Đáp số">`;
};

const renderEssayCard = (question: DeweyAdaptiveQuestion, index: number, pack: DeweyOlympiaPack): string => {
  const parts = question.essayParts || [];
  const half = Math.max(1, Math.round(question.points / 2));
  return `
  <article class="question-card${index === 0 ? '' : ' hidden'}" data-question-card data-qid="${safeId(question.id)}" data-type="essay" data-points="${question.points}">
    <h3><span class="step-badge">${index + 1}</span>${escapeHtml(pack.packLabel)} (tự luận) - ${escapeHtml(question.prompt)}</h3>
    ${parts.length ? `<ol class="essay-parts">${parts.map(p => `<li>${escapeHtml(p.prompt)}</li>`).join('')}</ol>` : ''}
    <textarea rows="5" placeholder="Trình bày lời giải của em vào đây rồi đối chiếu đáp án..."></textarea>
    <div class="essay-actions">
      <button class="btn secondary" type="button" onclick="revealEssayHints(this)">💡 Hiện gợi ý từng ý</button>
      <button class="btn secondary essay-answer-btn hidden" type="button" onclick="revealEssayAnswers(this)">Hiện đáp án chi tiết</button>
    </div>
    <div class="essay-hints hidden">${parts.map((p, i) => `<div class="box"><strong>Gợi ý ý ${i + 1}:</strong> <span class="bonus-text">${escapeHtml(p.hint)}</span></div>`).join('')}</div>
    <div class="essay-answers hidden">${parts.map((p, i) => `<div class="box"><strong>Đáp án ý ${i + 1}:</strong> <span class="bonus-text">${escapeHtml(p.answer)}</span></div>`).join('')}</div>
    <div class="essay-selfscore hidden box">
      <p><strong>Em tự chấm bài (tối đa ${question.points} điểm):</strong></p>
      <button class="btn" type="button" onclick="selfScoreEssay(this, 0)">Chưa đạt (0đ)</button>
      <button class="btn" type="button" onclick="selfScoreEssay(this, ${half})">Đạt một phần (${half}đ)</button>
      <button class="btn" type="button" onclick="selfScoreEssay(this, ${question.points})">Đạt tốt (${question.points}đ)</button>
    </div>
    <div class="feedback-msg hidden"></div>
    <button class="btn secondary adaptive-next-btn hidden" type="button" onclick="nextQuestion(this)">Câu tiếp theo</button>
  </article>`;
};

const renderAdaptiveQuestion = (question: DeweyAdaptiveQuestion, index: number, pack: DeweyOlympiaPack): string => {
  if (question.type === 'essay') return renderEssayCard(question, index, pack);
  return `
  <article class="question-card${index === 0 ? '' : ' hidden'}" data-question-card data-qid="${safeId(question.id)}" data-type="${question.type satisfies DeweyQuestionType}" data-correct="${escapeAttribute(correctValueFor(question))}" data-tolerance="${question.tolerance ?? 0}" data-points="${question.points}">
    <h3><span class="step-badge">${index + 1}</span>${escapeHtml(pack.packLabel)} - ${escapeHtml(question.prompt)}</h3>
    ${question.illustrationHtml ? `<div class="question-figure">${question.illustrationHtml}</div>` : ''}
    ${question.context ? `<div class="box">${escapeHtml(question.context)}</div>` : ''}
    ${renderQuestionInput(question, `${pack.id}-${question.id}`)}
    <button class="btn" type="button" onclick="submitAdaptiveAnswer(this)">Trả lời</button>
    <div class="feedback-msg hidden"></div>
    <div class="theory-box hidden">${escapeHtml(question.theory)}</div>
    <div class="hint1-box hidden">${escapeHtml(question.hint1)}</div>
    <div class="hint2-box hidden">${escapeHtml(question.hint2)}</div>
    <div class="hint3-box hidden">${escapeHtml(question.hint3)}</div>
    <div class="solution-box hidden">${escapeHtml(question.solution)}</div>
    <button class="btn secondary adaptive-next-btn hidden" type="button" onclick="nextQuestion(this)">Câu tiếp theo</button>
  </article>`;
};

const renderOlympia = (content: DeweyLessonContent): string => `
<section class="screen" id="screen-olympia">
  <h2>Luyện tập</h2>
  <div class="score-board">Điểm hiện tại: <span id="score-value">0</span></div>
  <p class="oly-hint">Chọn một gói bất kỳ để luyện tập (em được tự chọn thứ tự).</p>
  <div class="oly-tabs">
    ${content.olympia.packs.map((pack, packIndex) => `
    <button class="oly-tab${packIndex === 0 ? ' active' : ''}" type="button" data-pack-tab="${packIndex}" onclick="startPack(${packIndex})">
      ${escapeHtml(pack.packLabel)} <span class="oly-tab-count">${pack.questions.length} câu</span>
    </button>`).join('\n')}
  </div>
  <div class="oly-panel">
    ${content.olympia.packs.map((pack, packIndex) => `
    <section class="oly-card${packIndex === 0 ? ' active' : ''}" id="olympia-pack-${packIndex}" data-olympia-pack data-pack-index="${packIndex}">
      ${pack.questions.map((question, questionIndex) => renderAdaptiveQuestion(question, questionIndex, pack)).join('\n')}
      <div class="feedback-msg feedback-correct pack-complete-msg hidden">Hoàn thành gói ${escapeHtml(pack.packLabel)}.</div>
    </section>`).join('\n')}
  </div>
  <button id="olympia-finish-btn" class="btn success full-width" type="button" onclick="unlockScreen('screen-extend'); navTo('screen-extend')">Sang phần vận dụng</button>
</section>`;

const renderExtend = (content: DeweyLessonContent): string => `
<section class="screen" id="screen-extend">
  <h2>Vận dụng - Mở rộng</h2>
  <div class="box">${paragraph(content.extend.realWorldContext)}</div>
  ${content.extend.illustrationHtml ? `<div class="extend-figure">${content.extend.illustrationHtml}</div>` : ''}
  <div class="eval-box">${escapeHtml(content.extend.consequence)}</div>
  ${content.extend.expertQuote ? `<blockquote class="theory-box">${escapeHtml(content.extend.expertQuote)}</blockquote>` : ''}
  <textarea rows="4" placeholder="Viết liên hệ hoặc quyết định của em..."></textarea>
  <button class="btn" type="button" onclick="checkExtend()">Gửi liên hệ</button>
  <div id="extend-feedback" class="feedback-msg hidden"></div>
  <button id="extend-next-btn" class="btn success full-width hidden" type="button" onclick="unlockScreen('screen-summary'); navTo('screen-summary')">Sang phần tổng kết</button>
</section>`;

const renderBonus = (bonus: NonNullable<DeweyLessonContent['summary']['bonusChallenge']>): string => `
  <button id="bonus-reveal-btn" class="btn secondary full-width" type="button" onclick="revealBonus(this)">Mình còn thời gian — Thử thách thêm 🚀</button>
  <div id="bonus-challenge" class="box bonus-box hidden">
    <h3>Còn thời gian? Thử thách thêm</h3>
    ${bonus.advancedProblem ? `<div class="box"><strong>① Bài toán nâng cao</strong><div class="bonus-text">${escapeHtml(bonus.advancedProblem.prompt)}</div>${bonus.advancedProblem.solution ? `<details><summary>Xem lời giải</summary><div class="bonus-text">${escapeHtml(bonus.advancedProblem.solution)}</div></details>` : ''}</div>` : ''}
    ${bonus.applicationProblem ? `<div class="box"><strong>② Vận dụng thực tế</strong><div class="bonus-text">${escapeHtml(bonus.applicationProblem.prompt)}</div>${bonus.applicationProblem.solution ? `<details><summary>Gợi ý</summary><div class="bonus-text">${escapeHtml(bonus.applicationProblem.solution)}</div></details>` : ''}</div>` : ''}
    ${bonus.readingProblem ? `<div class="box"><strong>③ Vấn đề thực tế để đọc & suy ngẫm</strong><div class="bonus-text">${escapeHtml(bonus.readingProblem)}</div></div>` : ''}
    ${bonus.videoUrl ? `<div class="box"><strong>④ Xem thêm trên YouTube</strong><div><a class="bonus-video" href="${escapeAttribute(bonus.videoUrl)}" target="_blank" rel="noopener">${escapeHtml(bonus.videoLabel || 'Video liên quan')}</a></div></div>` : ''}
  </div>`;

const renderSummary = (content: DeweyLessonContent): string => `
<section class="screen" id="screen-summary">
  <h2>Tổng kết</h2>
  <div class="score-board">Tổng điểm luyện tập: <span id="final-score">0</span></div>
  <div class="robot-grid">
    ${content.summary.mindMapNodes.map(node => `
    <div class="box">
      <strong>${escapeHtml(node.label)}</strong>
      ${node.children && node.children.length > 0 ? `<ul>${node.children.map(child => `<li>${escapeHtml(child)}</li>`).join('')}</ul>` : ''}
    </div>`).join('\n')}
  </div>
  <div class="box">
    <h3>Checklist tự đánh giá</h3>
    ${content.summary.checklistItems.map((item, index) => `<label class="option-lbl"><input type="checkbox"> ${index + 1}. ${escapeHtml(item)}</label>`).join('\n')}
  </div>
  ${content.summary.bonusChallenge ? renderBonus(content.summary.bonusChallenge) : ''}
  <button class="btn success" type="button" onclick="finishLesson()">Hoàn tất bài học</button>
</section>`;

export function renderBodyHtml(content: DeweyLessonContent): string {
  const unitScreens = content.knowledgeUnits.map((unit, index) => {
    const nextUnit = content.knowledgeUnits[index + 1];
    return renderKnowledgeUnit(unit, index, nextUnit ? `screen-${nextUnit.id}` : 'screen-olympia');
  });

  return `${renderHeader(content)}
${renderToc(content)}
<main class="main-wrapper">
  <div class="lesson-area">
    ${!content.skipPretest ? renderPretest(content) : ''}
    ${!content.skipPretest ? renderPretestResult() : ''}
    ${renderEngage(content, content.knowledgeUnits[0])}
    ${unitScreens.join('\n')}
    ${renderOlympia(content)}
    ${renderExtend(content)}
    ${renderSummary(content)}
  </div>
  ${renderNotebook()}
</main>`;
}

export function renderDeweyLesson(
  content: DeweyLessonContent,
  theme: DeweyTheme = 'classic',
  options: { studentCode?: string } = {},
): string {
  // studentCode → key localStorage vở ghi theo TỪNG học sinh (F3 — máy dùng chung không lộ vở của nhau).
  return renderHtmlShell({ content, theme, bodyHtml: renderBodyHtml(content), studentCode: options.studentCode });
}
