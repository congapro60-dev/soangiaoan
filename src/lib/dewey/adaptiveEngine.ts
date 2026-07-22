export function getAdaptiveEngineScript(lessonId?: string, studentCode?: string): string {
  // F3 (QA đợt 9): key vở ghi PHẢI gắn mã học sinh — máy phòng tin học dùng chung,
  // key theo máy làm học sinh thấy/ghi đè vở của nhau + note cũ "ma" che mất fix mới.
  // Bump v2→v3 đồng thời là version bump: note format cũ không rò lên UI nữa.
  const studentSuffix = (studentCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '-') || 'chung';
  const notebookKey = `dewey-notebook-v3-${lessonId || 'na'}-${studentSuffix}`;
  return String.raw`
(function () {
  'use strict';

  var state = {
    score: 0,
    currentPackIndex: -1,
    currentQuestionIndex: 0,
    wrongCounts: {},
    completedPacks: {},
    totalSeconds: Number(document.body.dataset.durationMinutes || '40') * 60,
    activeScreenId: document.body.dataset.initialScreen || 'screen-pretest',
    startTime: Date.now(),
    completedUnitIds: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function show(el) {
    if (el) el.classList.remove('hidden');
  }

  function hide(el) {
    if (el) el.classList.add('hidden');
  }

  function updateMath(root) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise(root ? [root] : undefined).catch(function () {});
    }
  }

  function persistNotebook() {
    var notebook = byId('notebook-list');
    if (!notebook) return;
    try {
      window.localStorage.setItem('${notebookKey}', notebook.innerHTML);
    } catch (_error) {}
  }

  function restoreNotebook() {
    var notebook = byId('notebook-list');
    if (!notebook) return;
    try {
      var saved = window.localStorage.getItem('${notebookKey}');
      if (saved) notebook.innerHTML = saved;
    } catch (_error) {}
    updateMath(notebook);
  }

  window.addNote = function addNote(content, section, numbered) {
    if (!content) return;
    var target = byId('nb-' + (section || 'noidung')) || byId('notebook-list');
    if (!target) return;
    var item = document.createElement('div');
    if (numbered) {
      // Mục II Nội dung: đánh số thứ tự tăng dần cho TỪNG MẢNH kiến thức (1. 2. 3. …)
      var n = target.querySelectorAll('.note-item.nb-numbered').length + 1;
      item.className = 'note-item nb-numbered';
      item.innerHTML = '<strong>' + n + '.</strong> ' + content;
    } else {
      item.className = 'note-item';
      item.innerHTML = content;
    }
    target.appendChild(item);
    persistNotebook();
    updateMath(item);
  };

  window.toggleTOC = function toggleTOC() {
    var toc = byId('toc-menu');
    if (toc) toc.classList.toggle('hidden');
  };

  window.navTo = function navTo(id) {
    var target = byId(id);
    if (!target) return;
    var tocItem = document.querySelector('[data-target="' + id + '"]');
    if (tocItem && tocItem.classList.contains('locked')) return;

    all('.screen').forEach(function (screen) { screen.classList.remove('active'); });
    target.classList.remove('hidden');
    target.classList.add('active');

    // F7 (D4): giá trị dẫn xuất render lại MỖI LẦN vào màn — mục lục mở tự do nên
    // học sinh có thể vào Tổng kết không qua finishLesson → điểm phải luôn tươi.
    if (id === 'screen-summary') {
      var finalScore = byId('final-score');
      if (finalScore) finalScore.textContent = String(state.score);
    }

    if (id !== state.activeScreenId && typeof window.resetSectionTimer === 'function') window.resetSectionTimer();
    setActiveToc(id);

    var lessonArea = document.querySelector('.lesson-area');
    if (lessonArea && typeof lessonArea.scrollTo === 'function') lessonArea.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });

    var toc = byId('toc-menu');
    if (toc) toc.classList.add('hidden');
    updateMath(target);
  };

  window.unlockScreen = function unlockScreen(id) {
    all('[data-target="' + id + '"]').forEach(function (item) {
      item.classList.remove('locked');
      item.removeAttribute('aria-disabled');
    });
  };

  function setActiveToc(id) {
    state.activeScreenId = id;
    all('.toc-item').forEach(function (item) {
      item.classList.toggle('active', item.dataset.target === id);
    });
  }

  function setupTocObserver() {
    setActiveToc(state.activeScreenId);
  }

  function formatTime(seconds) {
    var safe = Math.max(0, seconds);
    var minutes = Math.floor(safe / 60);
    var remainder = safe % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function goSummaryForTimeout() {
    unlockScreen('screen-summary');
    window.navTo('screen-summary');
  }

  window.revealBonus = function revealBonus(button) {
    var box = byId('bonus-challenge');
    if (box) {
      show(box);
      updateMath(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (button) hide(button);
  };

  var _sectionStart = Date.now();

  function setTimerText(container, value) {
    if (!container) return;
    var valueEl = container.querySelector ? container.querySelector('.value') : null;
    if (valueEl) valueEl.textContent = value;
    else container.textContent = value;
  }

  function _tickSection() {
    var el = byId('section-timer');
    if (el) setTimerText(el, formatTime(Math.floor((Date.now() - _sectionStart) / 1000)));
  }

  window.resetSectionTimer = function resetSectionTimer() {
    _sectionStart = Date.now();
    _tickSection();
  };

  function startTimer() {
    var timer = byId('global-timer');
    if (!timer) return;
    setTimerText(timer, formatTime(state.totalSeconds));
    _tickSection();
    window.setInterval(function () {
      state.totalSeconds -= 1;
      setTimerText(timer, formatTime(state.totalSeconds));
      _tickSection();
      if (state.totalSeconds <= 300) timer.classList.add('timer-warning');
      if (state.totalSeconds <= 0) {
        state.totalSeconds = 0;
        setTimerText(timer, '00:00');
        goSummaryForTimeout();
      }
    }, 1000);
  }

  window.mockAiAnalyzeGoal = function mockAiAnalyzeGoal() {
    var result = byId('bloom-result');
    if (!result) return;
    show(result);
    var nhanbiet = result.dataset.nhanbiet || '';
    var thonghieu = result.dataset.thonghieu || '';
    var vandung = result.dataset.vandung || '';
    window.addNote('1. <strong>Nhận biết:</strong> ' + nhanbiet + '<br>2. <strong>Thông hiểu:</strong> ' + thonghieu + '<br>3. <strong>Vận dụng:</strong> ' + vandung, 'muctieu');
    updateMath(result);
  };

  window.submitPreTest = function submitPreTest() {
    var cards = all('[data-pretest-question]');
    var score = 0;
    var feedbackList = byId('pretest-feedback-list');
    if (feedbackList) feedbackList.innerHTML = '';

    cards.forEach(function (card, index) {
      var correct = Number(card.dataset.correctIndex || '-1');
      var checked = card.querySelector('input[type="radio"]:checked');
      var isCorrect = Boolean(checked && Number(checked.value) === correct);
      if (isCorrect) score += 1;

      if (feedbackList) {
        var item = document.createElement('div');
        item.className = 'feedback-card ' + (isCorrect ? 'correct' : 'wrong');
        item.innerHTML = '<strong>Câu ' + (index + 1) + ' - ' + (isCorrect ? 'Đúng' : 'Sai') + '</strong><br>' + (card.dataset.explanation || 'Xem lại kiến thức ôn tập trước khi vào bài mới.');
        feedbackList.appendChild(item);
      }

      hide(card);
    });

    var submitBtn = document.querySelector('[data-pretest-submit]');
    hide(submitBtn);

    var scoreEl = byId('pretest-score');
    if (scoreEl) scoreEl.textContent = score + '/' + cards.length;

    var currentScreen = byId('screen-pretest');
    if (currentScreen) currentScreen.classList.remove('active');
    var resultScreen = byId('screen-pretest-result');
    show(resultScreen);
    if (resultScreen) {
      resultScreen.classList.add('active');
      setActiveToc('screen-pretest-result');
      resultScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    updateMath(byId('screen-pretest-result'));
  };

  window.goToEngage = function goToEngage() {
    unlockScreen('screen-engage');
    if (typeof window.resetSectionTimer === 'function') window.resetSectionTimer();
    window.navTo('screen-engage');
  };

  window.submitSocraticStep = function submitSocraticStep(button) {
    var step = button.closest('[data-socratic-step]');
    if (!step) return;
    var feedback = step.querySelector('.feedback-msg');
    var nextButton = step.querySelector('.next-btn');
    var keywordBox = step.querySelector('.keyword-box');
    if (feedback) {
      feedback.className = 'feedback-msg feedback-info';
      feedback.textContent = step.dataset.feedback || 'So sánh câu trả lời của em với gợi ý và tiếp tục.';
      show(feedback);
    }
    if (step.dataset.note) window.addNote(step.dataset.note);
    show(keywordBox);
    show(nextButton);
    updateMath(step);
  };

  window.unlockNextSocratic = function unlockNextSocratic(button) {
    var current = button.closest('[data-socratic-step]');
    if (!current) return;
    var nextId = current.dataset.nextStep;
    if (nextId) {
      var next = byId(nextId);
      show(next);
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  window.completeKnowledgeUnit = function completeKnowledgeUnit(unitId, button) {
    var unitScreen = byId('screen-' + unitId);
    var note = unitScreen ? (unitScreen.dataset.notebookFormula || '') : '';
    var titleEl = unitScreen ? unitScreen.querySelector('h2') : null;
    var unitTitle = titleEl ? titleEl.textContent.replace(/^\s*\d+\.\s*/, '').trim() : '';
    if (note) window.addNote((unitTitle ? '<strong>' + unitTitle + '</strong>\n' : '') + note, 'noidung', true);
    if (state.completedUnitIds.indexOf(unitId) === -1) state.completedUnitIds.push(unitId);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'dewey:unitComplete', data: { unitId: unitId } }, '*');
    }
    var screen = byId('screen-' + unitId);
    var nextId = screen ? screen.dataset.nextScreen : '';
    if (nextId) unlockScreen(nextId);
    if (button) hide(button);
    var panel = screen ? screen.querySelector('[data-unit-completion]') : null;
    show(panel);
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateMath(panel || screen);
  };

  window.goNextActivity = function goNextActivity(button) {
    var screen = button ? button.closest('.screen') : null;
    var nextId = screen ? screen.dataset.nextScreen : '';
    if (nextId) {
      unlockScreen(nextId);
      window.navTo(nextId);
    }
  };

  function packAt(index) {
    return byId('olympia-pack-' + index);
  }

  window.startPack = function startPack(index) {
    var pack = packAt(index);
    if (!pack) return;
    state.currentPackIndex = index;
    state.currentQuestionIndex = 0;
    all('.oly-card').forEach(function (card) { card.classList.remove('active'); });
    pack.classList.add('active');
    all('.oly-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.packTab === String(index)); });
    loadQuestion(index, 0);
    updateMath(pack);
  };

  function loadQuestion(packIndex, questionIndex) {
    var pack = packAt(packIndex);
    if (!pack) return;
    all('[data-question-card]', pack).forEach(function (card, index) {
      card.classList.toggle('hidden', index !== questionIndex);
    });
    updateMath(pack);
  }

  function isAdaptiveCorrect(card) {
    var type = card.dataset.type;
    if (type === 'multiple_choice') {
      var checked = card.querySelector('input[type="radio"]:checked');
      return Boolean(checked && checked.value === card.dataset.correct);
    }
    if (type === 'true_false_group') {
      var statements = all('[data-statement-correct]', card);
      return statements.length > 0 && statements.every(function (row) {
        var chosen = row.querySelector('input[type="radio"]:checked');
        return Boolean(chosen && chosen.value === row.dataset.statementCorrect);
      });
    }
    if (type === 'short_answer') {
      var input = card.querySelector('input[type="number"], input[type="text"]');
      var expected = Number(card.dataset.correct);
      var tolerance = Number(card.dataset.tolerance || '0');
      var actual = Number(input ? input.value.replace(',', '.') : NaN);
      return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
    }
    return false;
  }

  function tfPartialScore(correct, total, max) {
    // Câu 4 ý: 1 ý=1đ, 2=2.5, 3=5, 4=10 (theo quy ước user). Khác 4 ý → tuyến tính.
    if (total === 4) return [0, 1, 2.5, 5, 10][correct] / 10 * max;
    return total ? Math.round((correct / total) * max * 10) / 10 : 0;
  }

  function submitTrueFalse(card, button) {
    var rows = all('[data-statement-correct]', card);
    if (!rows.length) return;
    var correct = 0;
    rows.forEach(function (row) {
      var chosen = row.querySelector('input[type="radio"]:checked');
      var right = row.dataset.statementCorrect;
      var isRight = Boolean(chosen && chosen.value === right);
      if (isRight) correct += 1;
      row.classList.remove('tf-right', 'tf-wrong');
      row.classList.add(isRight ? 'tf-right' : 'tf-wrong');
      var ans = row.querySelector('.tf-answer');
      if (ans) ans.textContent = right === 'true' ? '✓ Đúng' : '✗ Sai';
      all('input[type="radio"]', row).forEach(function (r) { r.disabled = true; });
    });
    var total = rows.length;
    var points = tfPartialScore(correct, total, Number(card.dataset.points || '10'));
    state.score += points;
    var score = byId('score-value');
    if (score) score.textContent = String(state.score);
    var feedback = card.querySelector('.feedback-msg');
    if (feedback) {
      feedback.className = 'feedback-msg feedback-correct';
      feedback.textContent = 'Em đúng ' + correct + '/' + total + ' ý → nhận ' + points + ' điểm. Đọc giải thích bên dưới rồi sang câu tiếp theo.';
      show(feedback);
    }
    show(card.querySelector('.solution-box'));
    if (button) hide(button);
    show(card.querySelector('.adaptive-next-btn'));
    updateMath(card);
  }

  window.toggleStatementHint = function toggleStatementHint(button) {
    var wrap = button.parentNode;
    var hint = wrap ? wrap.querySelector('.tf-hint') : null;
    if (hint) { hint.classList.toggle('hidden'); updateMath(hint); }
  };

  window.revealEssayHints = function revealEssayHints(button) {
    var card = button.closest('[data-question-card]');
    if (!card) return;
    show(card.querySelector('.essay-hints'));
    show(card.querySelector('.essay-answer-btn'));
    if (button) hide(button);
    updateMath(card);
  };

  window.revealEssayAnswers = function revealEssayAnswers(button) {
    var card = button.closest('[data-question-card]');
    if (!card) return;
    show(card.querySelector('.essay-answers'));
    show(card.querySelector('.essay-selfscore'));
    if (button) hide(button);
    updateMath(card);
  };

  window.selfScoreEssay = function selfScoreEssay(button, points) {
    var card = button.closest('[data-question-card]');
    if (!card) return;
    state.score += Number(points) || 0;
    var score = byId('score-value');
    if (score) score.textContent = String(state.score);
    var sel = card.querySelector('.essay-selfscore');
    if (sel) hide(sel);
    var feedback = card.querySelector('.feedback-msg');
    if (feedback) {
      feedback.className = 'feedback-msg feedback-correct';
      feedback.textContent = 'Em tự chấm ' + (Number(points) || 0) + ' điểm. Sang câu tiếp theo.';
      show(feedback);
    }
    show(card.querySelector('.adaptive-next-btn'));
  };

  window.submitAdaptiveAnswer = function submitAdaptiveAnswer(button) {
    var card = button.closest('[data-question-card]');
    if (!card) return;
    if (card.dataset.type === 'true_false_group') { submitTrueFalse(card, button); return; }
    var qid = card.dataset.qid || '';
    var feedback = card.querySelector('.feedback-msg');
    var correct = isAdaptiveCorrect(card);
    if (correct) {
      var points = Number(card.dataset.points || '0');
      state.score += points;
      var score = byId('score-value');
      if (score) score.textContent = String(state.score);
      if (feedback) {
        feedback.className = 'feedback-msg feedback-correct';
        feedback.textContent = 'Chính xác! Em nhận ' + points + ' điểm. Đọc lời giải chi tiết bên dưới rồi sang câu tiếp theo.';
        show(feedback);
      }
      // Đúng ở bất kỳ lần nào → vẫn hiện LỜI GIẢI CHI TIẾT cho học sinh đọc trước khi sang câu tiếp.
      show(card.querySelector('.solution-box'));
      show(card.querySelector('.adaptive-next-btn'));
      return;
    }

    state.wrongCounts[qid] = (state.wrongCounts[qid] || 0) + 1;
    var wrong = state.wrongCounts[qid];
    var target = wrong === 1 ? '.theory-box' : wrong === 2 ? '.hint1-box' : wrong === 3 ? '.hint2-box' : '.hint3-box';
    show(card.querySelector(target));
    if (feedback) {
      feedback.className = 'feedback-msg feedback-wrong';
      feedback.textContent = wrong < 4 ? 'Chưa đúng. Mở thêm một tầng hỗ trợ rồi thử lại.' : 'Đã mở lời giải đầy đủ. Câu này nhận 0 điểm, em chuyển câu tiếp theo.';
      show(feedback);
    }
    if (wrong >= 4) {
      show(card.querySelector('.solution-box'));
      show(card.querySelector('.adaptive-next-btn'));
    }
    updateMath(card);
  };

  window.nextQuestion = function nextQuestion(button) {
    var card = button.closest('[data-question-card]');
    var pack = button.closest('[data-olympia-pack]');
    if (!card || !pack) return;
    var next = card.nextElementSibling;
    while (next && !next.matches('[data-question-card]')) next = next.nextElementSibling;
    if (next) {
      hide(card);
      show(next);
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateMath(next);
      return;
    }
    var packIndex = Number(pack.dataset.packIndex || '0');
    state.completedPacks[packIndex] = true;
    var done = pack.querySelector('.pack-complete-msg');
    show(done);
    if (state.completedPacks[0] && state.completedPacks[1] && state.completedPacks[2]) {
      unlockScreen('screen-extend');
      var finish = byId('olympia-finish-btn');
      show(finish);
      window.addNote('Đã hoàn thành 3 gói luyện tập. Tổng điểm: ' + state.score + ' điểm.', 'luyentap');
    }
  };

  window.checkExtend = function checkExtend() {
    var feedback = byId('extend-feedback');
    if (feedback) {
      feedback.className = 'feedback-msg feedback-info';
      feedback.textContent = 'Liên hệ thực tế đã được ghi nhận. Em có thể hoàn tất bài học.';
      show(feedback);
    }
    unlockScreen('screen-summary');
    show(byId('extend-next-btn'));
    window.addNote('Đã hoàn thành phần Vận dụng — liên hệ kiến thức vào tình huống thực tế.', 'vandung');
  };

  // ── Image upload + AI grading bridge (ISSUE-01) ──────────────────────────
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  window.previewImageUpload = function previewImageUpload(input) {
    var block = input.closest('[data-image-upload]');
    if (!block || !input.files || !input.files[0]) return;
    var file = input.files[0];
    if (!file.type.match(/^image\//)) {
      var errEl = block.querySelector('.ai-grade-error');
      if (errEl) { errEl.textContent = 'Tệp này không phải ảnh. Em hãy chụp hoặc tải ảnh bài làm.'; show(errEl); }
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      var errEl2 = block.querySelector('.ai-grade-error');
      if (errEl2) { errEl2.textContent = 'Ảnh quá lớn (' + (file.size / 1024 / 1024).toFixed(1) + 'MB). Tối đa 5MB.'; show(errEl2); }
      input.value = '';
      return;
    }
    hide(block.querySelector('.ai-grade-error'));
    var reader = new FileReader();
    reader.onload = function () {
      var preview = block.querySelector('.image-preview');
      var img = preview ? preview.querySelector('img') : null;
      if (img) img.src = reader.result;
      show(preview);
      var nameEl = block.querySelector('.image-name');
      if (nameEl) { nameEl.textContent = '📎 ' + file.name; show(nameEl); }
      show(block.querySelector('.grade-image-btn'));
    };
    reader.readAsDataURL(file);
  };

  window.requestImageGrade = function requestImageGrade(stepId) {
    var step = byId(stepId);
    if (!step) return;
    var block = step.querySelector('[data-image-upload]');
    if (!block) return;
    var fileInput = block.querySelector('input[type="file"]');
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file) {
      var errEl = block.querySelector('.ai-grade-error');
      if (errEl) { errEl.textContent = 'Em cần tải ảnh bài làm trước khi nhờ AI chấm.'; show(errEl); }
      return;
    }
    hide(block.querySelector('.ai-grade-error'));
    hide(block.querySelector('.ai-grade-feedback'));
    var gradeBtn = block.querySelector('.grade-image-btn');
    if (gradeBtn) { gradeBtn.disabled = true; gradeBtn.textContent = '⏳ AI đang chấm ảnh...'; }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var parts = dataUrl.split(',');
      var base64 = parts[1] || '';
      var requestId = 'grade-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      step.dataset.pendingGradeRequestId = requestId;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'dewey:gradeImageRequest',
          data: {
            requestId: requestId,
            stepId: stepId,
            imageBase64: base64,
            imageMimeType: file.type,
            problem: gradeBtn ? (gradeBtn.dataset.gradeProblem || '') : '',
            solution: gradeBtn ? (gradeBtn.dataset.gradeSolution || '') : '',
            aiRubric: gradeBtn ? (gradeBtn.dataset.gradeRubric || '') : ''
          }
        }, '*');
      }
    };
    reader.readAsDataURL(file);
  };

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'dewey:gradeImageResult') return;
    var d = e.data.data || {};
    var step = document.querySelector('[data-pending-grade-request-id="' + d.requestId + '"]');
    if (!step) return;
    step.removeAttribute('data-pending-grade-request-id');
    var block = step.querySelector('[data-image-upload]');
    if (!block) return;
    var gradeBtn = block.querySelector('.grade-image-btn');
    if (gradeBtn) { gradeBtn.disabled = false; gradeBtn.textContent = '✨ Nhờ AI chấm ảnh tham khảo'; }
    if (d.error) {
      var errEl = block.querySelector('.ai-grade-error');
      if (errEl) { errEl.textContent = d.error; show(errEl); }
    } else {
      var fbEl = block.querySelector('.ai-grade-feedback');
      if (fbEl) { fbEl.textContent = d.feedback || 'AI chưa trả về nhận xét rõ ràng.'; show(fbEl); }
    }
    updateMath(block);
  });

  window.finishLesson = function finishLesson() {
    var finalScore = byId('final-score');
    if (finalScore) finalScore.textContent = String(state.score);
    window.addNote('Hoàn tất bài học. Tổng điểm luyện tập: ' + state.score + ' điểm.', 'tongket');
    if (window.parent && window.parent !== window) {
      var nb = [];
      try { nb = JSON.parse(window.localStorage.getItem('dewey-notebook') || '[]'); } catch (_e) {}
      window.parent.postMessage({
        type: 'dewey:complete',
        data: {
          olympiaScore: state.score,
          unitIds: state.completedUnitIds,
          durationSeconds: Math.floor((Date.now() - state.startTime) / 1000),
          notebookEntries: nb,
        }
      }, '*');
    }
    window.navTo('screen-summary');
  };

  // F6 (D5): wheel-rescue — trên production con lăn chuột không cuộn được cột nội dung
  // (chỉ kéo được thanh trượt). Tự xử lý wheel: vùng con tự cuộn được (Vở ghi, textarea)
  // thì nhường; còn lại cuộn document trực tiếp + preventDefault (không double-scroll).
  document.addEventListener('wheel', function (event) {
    if (event.ctrlKey) return; // giữ Ctrl+lăn = zoom trình duyệt
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return; // lăn ngang: để mặc định
    var node = event.target;
    while (node && node !== document.documentElement && node.nodeType === 1) {
      var style = window.getComputedStyle(node);
      var oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
        var atTop = node.scrollTop <= 0 && event.deltaY < 0;
        var atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1 && event.deltaY > 0;
        if (!atTop && !atBottom) return; // container con còn cuộn được → nhường nó
        break; // ở mép container → chain xuống cuộn trang
      }
      node = node.parentNode;
    }
    var scroller = document.scrollingElement || document.documentElement;
    var dy = event.deltaY * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? window.innerHeight : 1);
    scroller.scrollTop += dy;
    event.preventDefault();
  }, { passive: false });

  document.addEventListener('DOMContentLoaded', function () {
    restoreNotebook();
    var initial = byId(state.activeScreenId) || document.querySelector('.screen.active') || document.querySelector('.screen');
    if (initial) {
      all('.screen').forEach(function (screen) { screen.classList.remove('active'); });
      initial.classList.remove('hidden');
      initial.classList.add('active');
      state.activeScreenId = initial.id;
    }
    setupTocObserver();
    startTimer();
    updateMath(document.body);
  });
})();
`;
}
