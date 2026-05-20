export function getAdaptiveEngineScript(): string {
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
    activeScreenId: 'screen-pretest'
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
      window.localStorage.setItem('dewey-notebook', notebook.innerHTML);
    } catch (_error) {}
  }

  function restoreNotebook() {
    var notebook = byId('notebook-list');
    if (!notebook) return;
    try {
      var saved = window.localStorage.getItem('dewey-notebook');
      if (saved) notebook.innerHTML = saved;
    } catch (_error) {}
    updateMath(notebook);
  }

  window.addNote = function addNote(content) {
    var notebook = byId('notebook-list');
    if (!notebook || !content) return;
    var item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = content;
    notebook.appendChild(item);
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
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var toc = byId('toc-menu');
    if (toc) toc.classList.add('hidden');
  };

  function unlockScreen(id) {
    all('[data-target="' + id + '"]').forEach(function (item) {
      item.classList.remove('locked');
      item.removeAttribute('aria-disabled');
    });
  }

  function setActiveToc(id) {
    state.activeScreenId = id;
    all('.toc-item').forEach(function (item) {
      item.classList.toggle('active', item.dataset.target === id);
    });
  }

  function setupTocObserver() {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveToc(entry.target.id);
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 });
    all('.screen').forEach(function (screen) { observer.observe(screen); });
  }

  function formatTime(seconds) {
    var safe = Math.max(0, seconds);
    var minutes = Math.floor(safe / 60);
    var remainder = safe % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function goSummaryForTimeout() {
    var filler = byId('time-filler-options');
    if (filler) show(filler);
    unlockScreen('screen-summary');
    window.navTo('screen-summary');
  }

  function startTimer() {
    var timer = byId('global-timer');
    if (!timer) return;
    timer.textContent = formatTime(state.totalSeconds);
    window.setInterval(function () {
      state.totalSeconds -= 1;
      timer.textContent = formatTime(state.totalSeconds);
      if (state.totalSeconds <= 300) timer.classList.add('timer-warning');
      if (state.totalSeconds <= 0) {
        state.totalSeconds = 0;
        timer.textContent = '00:00';
        goSummaryForTimeout();
      }
    }, 1000);
  }

  window.submitPreTest = function submitPreTest() {
    all('[data-pretest-question]').forEach(function (card) {
      var correct = Number(card.dataset.correctIndex || '-1');
      var checked = card.querySelector('input[type="radio"]:checked');
      var feedback = card.querySelector('.feedback-msg');
      var explanation = card.querySelector('.pretest-explanation');
      if (!feedback) return;
      show(feedback);
      if (checked && Number(checked.value) === correct) {
        feedback.className = 'feedback-msg feedback-correct';
        feedback.textContent = 'Chính xác. Em đã sẵn sàng vào bài mới.';
      } else {
        feedback.className = 'feedback-msg feedback-info';
        feedback.textContent = 'Ghi nhớ lại ý chính rồi tiếp tục. Đây là phần ôn tập, không trừ điểm.';
      }
      show(explanation);
    });
    unlockScreen('screen-engage');
    updateMath(byId('screen-pretest'));
  };

  window.submitSocraticStep = function submitSocraticStep(button) {
    var step = button.closest('[data-socratic-step]');
    if (!step) return;
    var feedback = step.querySelector('.feedback-msg');
    var nextButton = step.querySelector('.next-btn');
    if (feedback) {
      feedback.className = 'feedback-msg feedback-info';
      feedback.textContent = step.dataset.feedback || 'So sánh câu trả lời của em với gợi ý và tiếp tục.';
      show(feedback);
    }
    if (step.dataset.note) window.addNote(step.dataset.note);
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

  window.completeKnowledgeUnit = function completeKnowledgeUnit(unitId, note) {
    if (note) window.addNote(note);
    var screen = byId('screen-' + unitId);
    var nextId = screen ? screen.dataset.nextScreen : '';
    if (nextId) unlockScreen(nextId);
  };

  function packAt(index) {
    return byId('olympia-pack-' + index);
  }

  window.startPack = function startPack(index) {
    var pack = packAt(index);
    if (!pack || pack.classList.contains('locked')) return;
    state.currentPackIndex = index;
    state.currentQuestionIndex = 0;
    all('.oly-card').forEach(function (card) { card.classList.remove('active'); });
    pack.classList.add('active');
    loadQuestion(index, 0);
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
    var nextPack = packAt(packIndex + 1);
    if (nextPack) nextPack.classList.remove('locked');
    if (state.completedPacks[0] && state.completedPacks[1] && state.completedPacks[2]) {
      unlockScreen('screen-extend');
      var finish = byId('olympia-finish-btn');
      show(finish);
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
  };

  window.finishLesson = function finishLesson() {
    var finalScore = byId('final-score');
    if (finalScore) finalScore.textContent = String(state.score);
    window.navTo('screen-summary');
  };

  document.addEventListener('DOMContentLoaded', function () {
    restoreNotebook();
    setupTocObserver();
    startTimer();
    updateMath(document.body);
  });
})();
`;
}
