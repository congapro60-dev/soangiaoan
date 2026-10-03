    // ===== Lôi Đài Ngũ Ấn (ancient arena) =====
    // The server owns every question, verdict and timer. The client only renders and names actions.
    let arenaFeedback = '', arenaInput = '', arenaDraftKey = '', arenaEvent = '', arenaFrame = 0, arenaFlash = [];
    function arena() { return screen === 'teacher' ? board?.arena : state?.arena || mapState?.arena; }
    function arenaRunning() { let a = arena(); return !!a && wallNow() < a.resumeAt; }
    function arenaKey() { let a = arena(); return a ? [a.id, a.phase, a.own?.step, a.own?.hp, a.own?.opponent?.hp].join(':') : ''; }
    function reducedMotion() { return document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches; }
    function lowPower() { return !!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4; }
    function arenaRules() { return `<details class="arena-rules"><summary>Luật Lôi Đài Ngũ Ấn · 75 giây</summary><ol><li>Máy chủ ghép cặp bằng hạt giống cố định. Số người lẻ sẽ có một người được miễn đấu và vẫn nhận điểm tham dự.</li><li>Trận kéo dài 75 giây theo đồng hồ máy chủ. Đồng hồ ván chính, lượt di chuyển, đóng băng, hồi chiêu và bản nháp đều tạm dừng; hết trận bạn trở lại đúng trạm và đúng phiên bản đề đang làm.</li><li>Giải câu Toán từ ma trận của lớp để nạp <strong>linh khí</strong>. Mỗi câu đúng +1 linh khí, tối đa 5. Cách nhau ít nhất 2 giây mỗi câu.</li><li>Linh khí dùng cho <strong>Đánh</strong> (1) trừ 1 máu đối thủ, <strong>Khiên</strong> (1) chặn một chiêu trong 3 giây, <strong>Trợ lực</strong> (1) tặng 1 linh khí cho đồng môn khác cặp tối đa 3 lần, <strong>Trấn</strong> (2) làm đối thủ choáng 3 giây. Khiên chặn cả Đánh và Trấn.</li><li>Hết 3 máu, linh vật ngã một nhịp rồi hồi đủ máu. <strong>Không ai bị loại</strong> và không ai mất nhiệm vụ chính.</li><li>Điểm: mỗi câu đúng +5; thắng trận +25, hòa +12, thua +5, miễn đấu +10. Điểm được cộng đúng một lần khi trận chốt.</li><li>Người vào phòng sau khi Lôi Đài mở sẽ xem với vai trò khán giả và không nhận thưởng của trận này.</li></ol></details>`; }
    function arenaHp(hp) { return `<span class="arena-hp" role="img" aria-label="Còn ${hp} trên 3 máu">${[0, 1, 2].map(i => `<i class="${i < hp ? 'full' : 'empty'}"></i>`).join('')}</span>`; }
    function arenaDuel(a) {
        let own = a.own;
        if (!own)
            return `<p class="arena-spectator" role="status">Bạn đang xem Lôi Đài với vai trò khán giả. Trận này không tính thưởng cho bạn; ván chính của bạn vẫn được giữ nguyên.</p>`;
        let mine = a.entries.find(e => e.id === state?.id) || { knockdowns: 0 }, foe = own.opponent || null;
        if (own.bye || !foe)
            return `<div class="arena-duel arena-bye"><div class="arena-fighter mine">${sprite(own.mascot, 'arena-mascot')}<strong>Bạn</strong>${arenaHp(own.hp)}</div><p class="arena-bye-note">Lượt này bạn được <strong>miễn đấu</strong> vì số người lẻ. Cứ giải Toán để nạp linh khí và trợ lực cho đồng môn; bạn vẫn nhận điểm tham dự.</p></div>`;
        let effect = arenaFlash.at(-1) || null, strike = ['hit', 'knockdown'].includes(effect);
        return `<div class="arena-duel ${reducedMotion() ? 'still' : ''} ${lowPower() ? 'flat' : ''}" data-arena-duel>`
            + `<div class="arena-fighter mine ${strike ? 'striking' : ''} ${wallNow() < own.stunnedUntil ? 'stunned' : ''} ${wallNow() < own.shieldUntil ? 'guarded' : ''}" data-fighter="mine">${sprite(own.mascot, 'arena-mascot')}<strong>Bạn</strong>${arenaHp(own.hp)}<small>${own.correct} câu đúng · ${own.resource} linh khí · ${mine.knockdowns} lần hạ</small></div>`
            + `<div class="arena-clash" aria-hidden="true"><i class="clash-spark ${effect && effect !== 'guard' ? 'on' : ''}"></i></div>`
            + `<div class="arena-fighter theirs ${strike ? 'recoiling' : ''}" data-fighter="theirs">${sprite(foe.mascot, 'arena-mascot')}<strong>${esc(foe.name)}</strong>${arenaHp(foe.hp)}<small>${foe.correct} câu đúng · ${foe.knockdowns} lần hạ</small></div></div>`
            + `<p class="arena-combat-log" id="arenaCombatLog" role="status" aria-live="polite">${esc(arenaFeedback || 'Giải câu Toán để nạp linh khí, rồi chọn Đánh, Khiên, Trợ lực hoặc Trấn.')}</p>`;
    }
    function arenaBracket(a) { return `<details class="arena-bracket" id="arena-bracket" ${['results', 'done'].includes(a.phase) ? 'open' : ''}><summary>Bảng ghép cặp · ${a.bracket.length} trận</summary><ol class="bracket-list">${a.bracket.map(m => `<li class="${m.left?.id === state?.id || m.right?.id === state?.id ? 'my-match' : ''}"><span>${esc(m.left?.name || '—')}</span><b>${m.left?.knockdowns ?? 0} – ${m.bye ? 'miễn đấu' : (m.right?.knockdowns ?? 0)}</b><span>${m.bye ? 'Miễn đấu' : esc(m.right?.name || '—')}</span></li>`).join('')}</ol></details>`; }
    function arenaLanes(a) { let rows = screen === 'teacher' ? a.entries : [...a.entries].sort((x, y) => Number(y.id === state?.id) - Number(x.id === state?.id)); return rows.map(p => `<div class="arena-lane ${p.id === state?.id ? 'my-lane' : ''}"><div class="lane-label"><b>${String(p.rank).padStart(2, '0')}</b><span>${esc(p.name)}${p.withdrawn ? ' · Đã rời' : ''}</span><small>${p.correct} đúng · ${p.knockdowns} hạ · ${p.downs} lần ngã${['results', 'done'].includes(a.phase) ? ' · +' + p.reward + 'đ' : ''}</small></div><div class="lane-progress" role="progressbar" aria-label="Số câu đúng của ${esc(p.name)}" aria-valuenow="${p.correct}" aria-valuemin="0" aria-valuemax="${a.questions}"><i style="width:${Math.min(100, p.correct / a.questions * 100)}%"></i></div></div>`).join(''); }
    function arenaRanking(a) { return `<details class="arena-ranking" id="arena-ranking" ${['results', 'done'].includes(a.phase) ? 'open' : ''}><summary>Kết quả · ${a.entries.length} người</summary><div id="arenaLanes" class="arena-lanes">${arenaLanes(a)}</div></details>`; }
    function arenaActionBar(a) {
        let own = a.own;
        if (!own || own.bye)
            return '';
        let wall = wallNow(), stunned = wall < own.stunnedUntil, foe = own.opponent;
        const btn = (act, label, cost, ready, extra = '') => `<button type="button" data-arena="${act}" ${busy || stunned || own.resource < cost || wall < ready || a.phase !== 'fighting' ? 'disabled' : ''} aria-label="${esc(label)} · cần ${cost} linh khí">${esc(label)}<small>${cost} linh khí${extra}</small></button>`;
        return `<div class="arena-actions" role="group" aria-label="Chiêu thức Lôi Đài"><p class="arena-resource" id="arenaResource">Linh khí: <strong>${own.resource}</strong>/5 ${stunned ? '· Đang choáng' : wall < own.shieldUntil ? '· Khiên đang mở' : ''}</p>${foe ? btn('attack', 'Đánh', 1, own.attackReadyAt) : ''}${btn('guard', 'Khiên', 1, 0)}${btn('assist', 'Trợ lực', 1, own.assistReadyAt, ' · còn ' + own.assistsLeft)}${foe ? btn('stun', 'Trấn', 2, own.stunReadyAt) : ''}</div>`;
    }
    function arenaChallenge(a, teacherView) {
        let q = a.own?.question || null;
        if (teacherView)
            return `<div class="eyebrow">BẢNG ĐIỀU PHỐI</div><h2>${['results', 'done'].includes(a.phase) ? 'Đã chốt kết quả' : 'Cả lớp đang tỉ thí'}</h2><p>Ghép cặp, máu, linh khí và lịch sử chiêu thức tự cập nhật mỗi giây. Đáp án và lời giải của các câu đã gửi nằm trong phần hướng dẫn, chỉ giáo viên xem được.</p>`;
        if (a.spectator)
            return `<div class="eyebrow">KHÁN GIẢ</div><h2>Bạn đang xem trận này</h2><p>Bạn vào phòng sau khi Lôi Đài mở nên không thi đấu và không nhận thưởng của trận. Ván chính của bạn tiếp tục khi trận kết thúc.</p>`;
        if (a.phase === 'countdown')
            return `<div class="eyebrow">SẴN SÀNG</div><h2>Chuẩn bị giấy nháp!</h2><p>${a.questions} câu ngắn trong ${a.duration} giây. Mỗi câu đúng nạp 1 linh khí để tung chiêu. Có thể nhập phân số a/b.</p>${arenaRules()}`;
        if (a.phase === 'fighting')
            return `<div class="eyebrow">CÂU TOÁN NẠP LINH KHÍ</div>`
                + (q
                    ? `<p class="arena-topic">${esc(q.topic || '')}${q.category ? ' · ' + esc(q.category) : ''}</p><div class="arena-question">${mathText(q.question)}</div><form id="arenaForm" class="arena-form"><label for="arenaAnswer">Đáp án</label><input id="arenaAnswer" name="answer" value="${esc(arenaInput)}" inputmode="decimal" autocomplete="off" maxlength="40" required><button class="primary" id="arenaSubmit">Chốt đáp án · Nạp linh khí</button></form>`
                    : `<p class="notice" role="status">${wallNow() < (a.own?.stunnedUntil || 0) ? 'Linh vật đang choáng. Chờ hết choáng để nhận câu tiếp theo.' : 'Bạn đã trả lời hết số câu của trận. Dùng linh khí còn lại để tung chiêu.'}</p>`)
                + arenaActionBar(a);
        return `<div class="eyebrow">KẾT QUẢ</div><h2>${a.own?.outcome === 'win' ? 'Thắng trận!' : a.own?.outcome === 'draw' ? 'Hòa' : a.own?.outcome === 'bye' ? 'Miễn đấu' : 'Chưa thắng trận này'}</h2><p>${a.own ? 'Hạng ' + a.own.rank + ' · ' + a.own.correct + ' câu đúng · +' + a.own.reward + ' điểm. ' : ''}Thua trận không mất nhiệm vụ: bạn trở lại đúng trạm ${(a.own?.return?.stage ?? 0) + 1} và đúng phiên bản đề đang làm.</p>`;
    }
    function arenaPanel(teacherView = false) {
        let a = arena();
        if (!a)
            return '';
        let key = a.id + ':' + (a.own?.step ?? 0);
        if (key !== arenaDraftKey) {
            if (!arenaDraftKey.startsWith(a.id + ':'))
                arenaFeedback = '';
            arenaDraftKey = key;
            arenaInput = '';
        }
        let phaseText = a.phase === 'countdown' ? 'CHUẨN BỊ LÊN ĐÀI' : a.phase === 'fighting' ? 'ĐANG ĐẤU' : a.phase === 'results' ? 'TRỞ LẠI VÁN CHÍNH SAU' : 'ĐÃ CHỐT KẾT QUẢ';
        let target = a.phase === 'countdown' ? a.startAt : a.phase === 'fighting' ? a.finishAt : a.resumeAt;
        let notice = a.phase === 'done' ? 'Trận đã chốt. Điểm được cộng một lần; ván chính đã tiếp tục đúng trạm cũ.' : a.phase === 'results' ? 'Điểm được cộng tự động một lần. Nhiệm vụ cũ mở lại khi hết thời gian xem kết quả.' : 'Đồng hồ ván chính đang dừng. Trạm, bản nháp, hồi chiêu và thời gian đóng băng được giữ nguyên.';
        return `<section class="arena ${teacherView ? 'teacher-arena' : ''}"><div class="arena-head"><div><div class="eyebrow">LÔI ĐÀI NGŨ ẤN · ${a.entries.length} ĐẤU SĨ</div><h1>Tỉ thí <em>trước Long Điện</em></h1><p>Giải câu Toán để nạp linh khí, rồi tung chiêu cho linh vật của bạn.</p></div><div class="arena-timer"><span id="arenaPhase">${phaseText}</span><strong id="arenaClock">${time(target - wallNow())}</strong></div></div>`
            + `<p class="arena-notice">${notice}</p>`
            + `<div class="arena-grid"><section class="arena-stage"><div class="stage-caption">${['results', 'done'].includes(a.phase) ? 'KẾT QUẢ LÔI ĐÀI' : 'SÀN ĐẤU'}<span>${a.questions} CÂU · ${a.duration} GIÂY</span></div>${arenaDuel(a)}${arenaBracket(a)}${arenaRanking(a)}</section>`
            + `<aside class="arena-challenge">${arenaChallenge(a, teacherView)}</aside></div></section>`;
    }
    function arenaScreen() { return `${header()}<main class="arena-shell">${arenaPanel()}<p class="small muted">Mỗi câu đúng +5 điểm · Thắng +25 · Hòa +12 · Thua +5 · Miễn đấu +10 · Không ai bị loại khỏi ván chính.</p></main>`; }
    function updateArenaUI() {
        let a = arena();
        if (!a)
            return;
        let clock = document.getElementById('arenaClock');
        if (clock)
            clock.textContent = a.phase === 'done' ? '✓' : time((a.phase === 'countdown' ? a.startAt : a.phase === 'fighting' ? a.finishAt : a.resumeAt) - wallNow());
        let lanes = document.getElementById('arenaLanes');
        if (lanes)
            lanes.innerHTML = arenaLanes(a);
        let submit = document.getElementById('arenaSubmit');
        if (submit)
            submit.disabled = busy || a.phase !== 'fighting' || wallNow() >= a.finishAt || wallNow() - (a.own?.lastAt || 0) < 2000 || wallNow() < (a.own?.stunnedUntil || 0);
        let resource = document.getElementById('arenaResource');
        if (resource && a.own)
            resource.innerHTML = 'Linh khí: <strong>' + a.own.resource + '</strong>/5 ' + (wallNow() < a.own.stunnedUntil ? '· Đang choáng' : wallNow() < a.own.shieldUntil ? '· Khiên đang mở' : '');
        root.querySelectorAll('[data-arena]').forEach(btn => { let cost = btn.dataset.arena === 'stun' ? 2 : 1, ready = { attack: a.own?.attackReadyAt, assist: a.own?.assistReadyAt, stun: a.own?.stunReadyAt, guard: 0 }[btn.dataset.arena] || 0; btn.disabled = busy || !a.own || a.phase !== 'fighting' || a.own.resource < cost || wallNow() < ready || wallNow() < a.own.stunnedUntil; });
        animateArena(a);
    }
    // Real mascot fight motion. Reduced motion or a weak device keeps the 2D state text only.
    function animateArena(a) {
        let duel = root.querySelector('[data-arena-duel]');
        if (!duel)
            return;
        if (arenaEvent !== a.id) {
            arenaEvent = a.id;
            arenaFlash = [];
        }
        if (reducedMotion() || lowPower()) {
            duel.classList.add(reducedMotion() ? 'still' : 'flat');
            duel.style.setProperty('--clash', '0');
            cancelAnimationFrame(arenaFrame);
            return;
        }
        if (!arenaFlash.length)
            return;
        cancelAnimationFrame(arenaFrame);
        let started = performance.now();
        arenaFrame = requestAnimationFrame(function step(t) {
            if (!duel.isConnected || document.hidden)
                return;
            let progress = Math.min(1, (t - started) / 520);
            duel.style.setProperty('--clash', String(1 - Math.abs(progress * 2 - 1)));
            if (progress < 1)
                arenaFrame = requestAnimationFrame(step);
            else {
                duel.style.setProperty('--clash', '0');
                arenaFlash = [];
                duel.querySelectorAll('.striking,.recoiling').forEach(el => el.classList.remove('striking', 'recoiling'));
            }
        });
    }
    async function arenaAnswerSubmit(answer) {
        if (busy || !session)
            return;
        let a = arena();
        if (!a?.own)
            return;
        busy = true;
        updateArenaUI();
        try {
            let d = await api('arena-action', { id: session.id, arenaAction: 'answer', eventId: a.id, step: a.own.step, answer, deadline: a.finishAt });
            apply(d);
            arenaFeedback = d.result.correct ? 'Đúng! +1 linh khí. Chọn một chiêu để tung ra.' : 'Chưa đúng. Câu đã chốt; sang câu tiếp theo để nạp linh khí.';
            render();
        }
        catch (e) {
            toast(e.message);
            await refresh(true);
        }
        finally {
            busy = false;
            updateArenaUI();
        }
    }
    function arenaAssistTarget(a) { return a.entries.find(p => p.id !== state?.id && p.id !== a.own?.opponent?.id && !p.withdrawn)?.id || null; }
    async function arenaCombatSubmit(action) {
        if (busy || !session)
            return;
        let a = arena();
        if (!a?.own)
            return;
        let target = action === 'guard' ? undefined : action === 'assist' ? arenaAssistTarget(a) : a.own.opponent?.id;
        if (action !== 'guard' && !target) {
            toast(action === 'assist' ? 'Chưa có đồng môn nào khác cặp để trợ lực.' : 'Chưa có đối thủ cho chiêu này.');
            return;
        }
        busy = true;
        updateArenaUI();
        try {
            let d = await api('arena-action', { id: session.id, arenaAction: action, eventId: a.id, target, deadline: a.finishAt });
            apply(d);
            arenaFlash = [d.result.effect || action];
            arenaFeedback = { hit: 'Trúng đòn! Đối thủ mất 1 máu.', knockdown: 'Hạ đối thủ một nhịp! Đối thủ hồi máu và tiếp tục, không bị loại.', blocked: 'Khiên của đối thủ đã chặn chiêu này.', guard: 'Khiên đã mở trong 3 giây.', assist: 'Đã tặng 1 linh khí cho đồng môn.', stun: 'Đối thủ bị choáng 3 giây.' }[d.result.effect || action] || 'Đã ghi nhận chiêu thức.';
            render();
        }
        catch (e) {
            toast(e.message);
            await refresh(true);
        }
        finally {
            busy = false;
            updateArenaUI();
        }
    }
    // Returns the student to the exact stage/revision they paused on once the 75s wall closes.
    async function arenaFinish() {
        let a = arena();
        if (!session || busy || !a || wallNow() < a.resumeAt)
            return;
        busy = true;
        try {
            let d = await api('arena-finish', { id: session.id });
            apply(d);
            arenaFeedback = '';
            arenaDraftKey = '';
            render();
        }
        catch (e) {
            if (e.code !== 'ARENA_PENDING')
                await refresh(true);
        }
        finally {
            busy = false;
        }
    }
    async function hostOpenArena() {
        if (busy || !teacherSession)
            return;
        if (!window.confirm('Mở Lôi Đài Ngũ Ấn cho cả lớp? Ván chính tạm dừng 95 giây: 10 giây chuẩn bị, 75 giây đấu, 10 giây kết quả. Mọi người trở lại đúng trạm đang làm.'))
            return;
        busy = true;
        try {
            await api('arena-open', { id: teacherSession.id }, teacherSession.token);
            await fetchBoard();
            render();
            toast('Đã mở Lôi Đài Ngũ Ấn.');
        }
        catch (e) {
            toast(e.message);
        }
        finally {
            busy = false;
        }
    }
