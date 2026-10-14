(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const rules = {
    tug: 'Hai đội kéo co bằng điểm câu đúng. Mỗi câu đúng +10 điểm cho bạn và đội.',
    boss: 'Cả lớp hợp sức. Mỗi câu đúng giảm một đơn vị năng lượng của trùm.',
    buzzer: 'Bấm chuông để nhận câu, trả lời trong 30 giây. Câu đúng nhanh nhất được ghi nhận.',
    mountain: 'Chọn một ô chưa mở rồi giải câu Toán. Các ô có 10, 20 hoặc 30 điểm.',
    castle: 'Cả lớp giải đúng để mở ba lớp thành. Mỗi câu đúng vẫn cộng điểm riêng.',
    archery: 'Mỗi câu đúng là một mũi tên trúng đích. Có ba lượt câu hỏi riêng.',
    surf: 'Trả lời đúng liên tiếp nhận 10, 20 rồi 30 điểm. Trả lời sai mất chuỗi.',
    duel: 'Máy chủ ghép cặp. So điểm ba câu với đối thủ; người lẻ được chơi riêng.',
    relay: 'Hai đội lần lượt trả lời. Chờ đúng lượt của mình; xong câu chuyển sang đồng đội.',
    treasure: 'Mỗi câu đúng mở thêm một manh mối cho kho báu chung.',
    estimate: 'Nhập số ước lượng. Càng gần kết quả càng nhiều điểm, tối đa 10 điểm mỗi câu.',
    bingo: 'Mỗi câu đúng đánh dấu một ô. Hoàn thành hàng hoặc cột gồm hai ô để đạt Bingo.'
  };
  function scene(event) {
    const value = event.progress.value, maximum = event.progress.max || event.players * 3 * (event.type === 'surf' ? 20 : event.type === 'estimate' ? 10 : 1), fraction = Math.max(0,Math.min(1,value / maximum));
    if (event.type === 'bingo' && event.own) return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-width:260px;margin:12px auto" aria-label="Bảng Bingo">${event.own.bingo.map((marked,i)=>`<div class="notice" style="text-align:center;background:${marked?'#164e63':'#152538'}">${marked?'✓ ':''}${event.own.bingoFree[i]?'Ô tự do':`Ô ${i+1}`}</div>`).join('')}</div>`;
    if (event.type === 'tug') return `<svg viewBox="0 0 320 75" width="320" style="max-width:100%" role="img" aria-label="Lợi thế kéo co ${value}"><path d="M25 35H295" stroke="#efc56d" stroke-width="5"/><path d="M160 8V65" stroke="#718399" stroke-dasharray="4"/><circle cx="${160 + value*10}" cy="35" r="13" fill="#efc56d"/><text x="25" y="70" fill="white">Đội 1</text><text x="250" y="70" fill="white">Đội 2</text></svg>`;
    if (event.type === 'boss') return `<p style="font-size:32px;text-align:center" aria-hidden="true">◆ ${Math.max(0,value)} / ${maximum}</p><progress value="${value}" max="${maximum}" style="width:100%" aria-label="Năng lượng trùm còn lại"></progress>`;
    if (event.type === 'duel' && event.own) return `<div class="flex" style="justify-content:space-around"><strong>Bạn: ${event.own.score} điểm</strong><strong>${event.own.opponentScore == null?'Chơi riêng':`Đối thủ: ${event.own.opponentScore} điểm`}</strong></div>`;
    if (event.type === 'buzzer') return `<p><strong>${esc(event.progress.label)}:</strong> ${value} ${esc(event.progress.unit)}</p>`;
    return `<p><strong>${esc(event.progress.label)}:</strong> ${value}${event.progress.max?` / ${event.progress.max}`:''} ${esc(event.progress.unit)}</p><progress value="${fraction}" max="1" style="width:100%" aria-label="${esc(event.progress.label)}"></progress>`;
  }
  function renderGameActivity(event, teacher = false) {
    if (!event || event.phase === 'done') return '';
    const own = event.own, active = event.phase === 'playing';
    const math = text => window.SignalMath?.renderMath ? window.SignalMath.renderMath(text,window.katex) : esc(text);
    const board = own?.board ? `<div class="flex" aria-label="Chọn ô câu hỏi">${own.board.map(cell=>`<button type="button" data-game-activity-action="pick" data-cell-id="${esc(cell.id)}" ${!own.canPick||cell.used?'disabled':''}>${esc(cell.category)} · ${cell.points} điểm${cell.used?' · Đã mở':''}</button>`).join('')}</div>` : '';
    return `<section class="community-panel" aria-label="${esc(event.label)}"><div class="flex" style="justify-content:space-between"><h2>${esc(event.label)}</h2><strong data-game-activity-clock>${Math.ceil(event.remainingMs/1000)} giây</strong></div><p>${esc(rules[event.type])}</p>${scene(event)}${['tug','relay'].includes(event.type)?`<div class="flex">${event.teams.map(team=>`<p>${esc(team.label)}: <strong>${team.points} điểm</strong> · ${team.players} người</p>`).join('')}</div>`:''}${own&&active?`<p>Câu ${Math.min(own.step+1,own.questions)} / ${own.questions} · ${own.score} điểm${own.combo!=null?` · Chuỗi đúng: ${own.combo}`:''}${event.type==='relay'?` · Bạn thuộc Đội ${own.team}`:''}</p>${board}${own.buzzer?`<button type="button" data-game-activity-action="buzz" ${own.buzzer.canBuzz?'':'disabled'}>${own.buzzer.pressed?'Đã bấm chuông':'Bấm chuông nhận câu'}</button>`:''}${own.task?`<form data-game-activity-action="answer"><p>${math(own.task.prompt)}</p><label>Đáp số <input name="answer" type="text" inputmode="decimal" maxlength="80" autocomplete="off" required></label><button type="submit" ${own.canAnswer?'':'disabled'}>Gửi đáp số</button></form>`:`<p role="status">${own.step>=own.questions?'Đã hoàn thành các câu. Chờ kết quả cả lớp.':event.type==='relay'?'Chờ lượt đội.':event.type==='mountain'?'Chọn một ô để nhận câu.':event.type==='buzzer'?'Bấm chuông để nhận câu.':'Chờ câu tiếp theo.'}</p>`}`:`<p role="status">${event.phase==='countdown'?'Chuẩn bị! Ván chính đang tạm dừng.':event.phase==='results'?'Hoạt động đã chốt. Sắp trở lại ván chính.':teacher?'Giáo viên theo dõi hoạt động của lớp.':'Bạn đang xem hoạt động này. Tiến độ ván chính được giữ nguyên.'}</p>`}${teacher?'<button type="button" data-game-activity-action="finish">Kết thúc hoạt động, trở lại ván</button>':''}<p class="small muted">3 câu mỗi người · 3 phút chơi · Sai chờ 10 giây · Điểm cộng một lần khi kết thúc. Nhiệm vụ và bản nháp ván chính được giữ nguyên.</p></section>`;
  }
  window.SignalGameActivities = Object.freeze({ render: renderGameActivity, rules });
}());
