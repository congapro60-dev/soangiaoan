export function getAdaptiveEngineScript(lessonId?: string): string {
  const notebookKey = lessonId ? `dewey-notebook-v2-${lessonId}` : 'dewey-notebook-v2';
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

  window.addNote = function addNote(content, section) {
    if (!content) return;
    var target = byId('nb-' + (section || 'noidung')) || byId('notebook-list');
    if (!target) return;
    var item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = content;
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
    if (note) window.addNote((unitTitle ? '<strong>' + unitTitle + '</strong>\n' : '') + note, 'noidung');
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

  window.submitAdaptiveAnswer = function submitAdaptiveAnswer(button) {
    var card = button.closest('[data-question-card]');
    if (!card) return;
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
        feedback.textContent = 'Chính xác! Em nhận ' + points + ' điểm và mở câu tiếp theo.';
        show(feedback);
      }
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
      window.addNote('Đã hoàn thành 3 gói luyện tập Olympia. Tổng điểm: ' + state.score + ' điểm.', 'luyentap');
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

  window.finishLesson = function finishLesson() {
    var finalScore = byId('final-score');
    if (finalScore) finalScore.textContent = String(state.score);
    window.addNote('Hoàn tất bài học. Tổng điểm Olympia: ' + state.score + ' điểm.', 'tongket');
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
