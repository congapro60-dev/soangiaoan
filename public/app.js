(function () {
    'use strict';
    const G = SignalGame, root = document.getElementById('app'), dlg = document.getElementById('hintDialog');
    const KEY = 'signal-station-session-v2', RK = 'signal-station-teacher-v2', DK = 'signal-station-drafts-v2', ROOMS_KEY = 'signal-station-managed-rooms-v1';
    const levelNames = ['Dễ', 'Trung bình', 'Khá', 'Ác mộng', 'Địa ngục'], levelPoints = [100, 200, 350, 550, 800];
    const mascotNames = ['Cáo', 'Cú', 'Mèo', 'Gấu trúc', 'Thỏ', 'Ếch', 'Robot', 'Rồng'];
    let mapState = null, pendingMascot = 0;
    let names = ['Hồ sơ đầu mối', 'Thẻ truy cập', 'Nguồn năng lượng', 'Bộ mã', 'Kênh liên lạc'];
    let state = null, screen = 'landing', pendingName = '', pendingRoom = '', feedback = '', lastDigit = null, reports = [], hintTap = 0, toastTimer, session = read(KEY, null), teacherSession = read(RK, null), board = null, busy = false, clockOffset = 0, peers = [], managedRooms = read(ROOMS_KEY, []), sessionNotice = '', managementPending = null;
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const time = ms => { let n = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); };
    function read(key, fallback) { try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    }
    catch {
        return fallback;
    } }
    function write(key, value) { try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    }
    catch {
        toast('Trình duyệt không lưu được tiến độ. Giữ trang này mở khi chơi.');
        return false;
    } }
    function draftIdentity(s=state){return s?[s.id,s.round||1,s.race?.task??s.solved.length,s.recovery?.questionRevision??0].join(':'):'';}
    function recoveryControls(){const r=state?.recovery;if(!r||state.status!=='active'||state.race?.phase!=='challenge')return '';return `<section class="notice" aria-label="Hỗ trợ học tập"><h2>Tiếp tục cùng hỗ trợ</h2><p>${state.supportPolicy==='practice'?'Luyện tập: gợi ý không cộng phút phạt.':'Thi đấu: phạt hỗ trợ tối đa 3 phút mỗi trạm.'} Gợi ý mức 3: tự làm bước cuối, nhận 50% điểm. Không bỏ qua cổng đầu hoặc cuối.</p><p>Điểm câu hiện tại: ${r.points??0}. ${r.helpPending?'Đang chờ giáo viên hỗ trợ.':''} ${r.reportPending?'Đã báo lỗi đề.':''}</p><div class="flex"><button data-recovery="request-hint">Gợi ý 3 mức</button><button data-recovery="downgrade-question" ${r.downgradePoints==null?'disabled':''}>Đổi mức thấp hơn</button><button data-recovery="teacher-help">Nhờ giáo viên</button><button data-recovery="report-question">Báo lỗi đề</button></div></section>`;}
    function teacherRecovery(r) { const q = r.recovery; let role = teacherSession?.role || 'owner', canHost = role === 'owner' || role === 'cohost'; return `<section class="notice"><h3>Hỗ trợ: ${esc(r.team)}</h3><p>${q?.helpPending ? 'Cần giáo viên hỗ trợ. ' : ''}${q?.reportPending ? 'Đang báo lỗi đề. ' : ''}Phiên bản đề: ${q?.questionRevision ?? 0}</p>${q?.helpPending && canHost ? `<button data-teacher-recovery="acknowledge-help" data-team="${esc(r.id)}">Xác nhận đã hỗ trợ</button>` : ''}${q?.reportPending && canHost ? `<button data-teacher-recovery="resolve-question" data-team="${esc(r.id)}">Thay đề tương đương · Xóa nháp cũ</button>` : ''}<details><summary>Lịch sử hỗ trợ (${r.eventHistory?.length || 0})</summary>${(r.eventHistory || []).map(e => `<p>${esc(e.type)} · Lượt ${e.round} · Phiên bản ${e.questionRevision}</p>`).join('')}</details></section>`; }
    async function recoveryAction(kind){if(busy||!state)return;if(kind==='request-hint'){hintDialog();return;}if(kind==='downgrade-question'&&!window.confirm(`Đổi sang mức ${levelNames[state.levels[state.race?.task??state.solved.length]-1]}, ${state.recovery.downgradePoints} điểm? Bản nháp hiện tại sẽ bị xóa.`))return;busy=true;clearTimeout(draftTimer);try{await flushRecoveryDraft();const d=await api(kind,{id:session.id});apply(d);save();render();toast('Đã ghi nhận yêu cầu.');}catch(e){toast(e.message);await refresh(true);}finally{busy=false;}}
    document.addEventListener('click',async e=>{const b=e.target.closest('[data-recovery],[data-teacher-recovery]');if(!b)return;if(b.dataset.recovery)return recoveryAction(b.dataset.recovery);if(busy)return;const t=reports.find(x=>x.id===b.dataset.team);if(!t)return;busy=true;try{await api(b.dataset.teacherRecovery,{id:teacherSession.id,teamId:t.id,round:t.round,stage:t.recovery.stage,questionRevision:t.recovery.questionRevision,revision:t.revision},teacherSession.token);await fetchBoard();render();}catch(err){toast(err.message);}finally{busy=false;}});
    function save() { if (state)write(DK,{id:state.id,round:state.round||1,identity:draftIdentity(),drafts:state.drafts||{}}); }
    function teacherRecoveryBoard() { return `<section class="recovery-board"><h2>Hỗ trợ và lịch sử</h2>${reports.filter(r=>r.recovery).map(teacherRecovery).join('')||'<p>Chưa có yêu cầu hỗ trợ.</p>'}</section>`; }
    function toast(text) { let el = document.getElementById('toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500); }
    const C = window.SignalCampaign;
    let pendingCampaign = null;
    let pendingRoomInfo = null;
    function roomRulesInfo(){if(screen==='teacher'){const room=board?.room;return room?{campaign:room.campaign,mode:null,worldTitle:C.themes[C.resolveThemeId(room.campaign?.theme)]?.title,durationMs:room.durationMs}:null;}const source=state||(screen==='briefing'?pendingRoomInfo:null);if(!source)return null;const campaign=state?.campaign||state?.race?.campaign||source.campaign||(screen==='briefing'?pendingCampaign:null);return {campaign,mode:state?.mode,worldTitle:C.themes[C.resolveThemeId(campaign?.theme)]?.title,durationMs:source.durationMs};}
    function currentRoomRules(){return window.SignalRoomRules?.render(roomRulesInfo())||'';}
    let roomDraft = { playMode: 'teams', participation: 'group', rule: 'campaign', community: 'none', theme: 'modern', grade: 10, topics: [], minLevel: 0, maxLevel: 2, stationMax: 2, categories: ['practice', 'real', 'theory', 'history', 'digital', 'global', 'culture', 'wellbeing'], formats: ['short', 'mcq', 'tf'] };
    function theme() { let key = (screen === 'teacher' ? board?.room.campaign : (state?.campaign || state?.race?.campaign || pendingCampaign))?.theme || roomDraft.theme || 'modern'; return C.themes[C.resolveThemeId(key)] || C.themes.modern; }
    function mathText(text) {
        if (typeof SignalMath !== 'undefined' && typeof SignalMath.renderMath === 'function') {
            return SignalMath.renderMath(text, typeof katex !== 'undefined' ? katex : (typeof globalThis !== 'undefined' ? globalThis.katex : undefined));
        }
        return esc(text);
    }
    function community() { return screen === 'teacher' ? board?.community : state?.community || mapState?.community; }
    function communityRunning() { let c = community(); return !!c && wallNow() < c.resumeAt; }
    function communityKey() { let c = community(); return c ? [c.id, c.phase, c.own?.step].join(':') : ''; }
    let communityFeedback = '', communityInput = '', communityDraftKey = '', polling = false, pollTick = 0;
    function communityRules() { return `<details class="community-rules"><summary>Luật đua thuyền cộng đồng · 65 giây</summary><ol><li>Người đầu tiên tới hoặc vượt ô 18 gọi một cuộc đua chung. Mỗi ván chỉ một lần, khi còn ít nhất 90 giây. Người đang chơi tại thời điểm đó được ghi vào danh sách; người đã kết thúc hoặc vào sau xem với vai trò khán giả.</li><li>10 giây chuẩn bị → 45 giây trả lời → 10 giây kết quả. Đồng hồ ván chính, lượt di chuyển và thời hạn đóng băng tạm dừng; nhiệm vụ và bản nháp được giữ nguyên.</li><li>Tối đa 6 câu điền số từ ma trận Toán đã chọn, mức Dễ hoặc Trung bình. Cùng cơ cấu chủ đề, số liệu riêng. Đúng tiến thuyền; sai chuyển câu tiếp theo. Mỗi câu chỉ gửi một lần, hai lần gửi cách nhau ít nhất 2,5 giây. Không dùng hint hoặc kỹ năng trong cuộc đua.</li><li>Xếp theo số câu đúng giảm dần, rồi thời điểm gửi câu cuối tăng dần. Đồng hạng nếu cả hai bằng nhau. Mỗi câu đúng +5 điểm; hạng 1 thêm 30, hạng 2 thêm 20, hạng 3 thêm 10. Có ít nhất một câu đúng mới nhận thưởng hạng; tối đa 60 điểm. Rời phòng không xóa kết quả đã gửi của cuộc đua.</li><li>Kết quả được chốt từ máy chủ; hết 65 giây tự cộng điểm và trở lại nhiệm vụ cũ. Mất mạng không dừng cuộc đua: tải lại cùng thiết bị để tiếp tục khi còn giờ.</li></ol></details>`; }
    let regattaPoses = new Map(), regattaEvent = '', regattaFrame = 0;
    function regattaPosition(index, correct, total) { let row = Math.floor(index / 8), start = total <= 8 ? 82 : 58 + row * 10.5; return { left: 14 + (index % 8) * 9.4 + (row % 2) * 2, top: 27 + (start - 27) * (1 - Math.max(0, Math.min(6, correct)) / 6) }; }
    function regattaFleet(c) { let entries = [...c.entries].sort((a, b) => a.id.localeCompare(b.id)); return `<div id="regattaFleet" class="regatta-fleet" aria-label="Thuyền của ${c.entries.length} người chơi trên sông">${entries.map((p, i) => `<button type="button" class="regatta-boat ${p.id === state?.id ? 'my-boat' : ''}" data-boat="${esc(p.id)}" style="left:${regattaPosition(i, p.correct, c.entries.length).left}%;top:${regattaPosition(i, p.correct, c.entries.length).top}%" aria-label="${esc(p.name)} · ${p.correct}/6 câu đúng · Hạng ${p.rank}" title="${esc(p.name)} · ${p.correct}/6 câu đúng · Hạng ${p.rank}"><img src="/assets/regatta-boat.webp" alt="" draggable="false">${sprite(p.mascot)}<span>${p.id === state?.id ? 'Bạn' : i + 1}</span><b>${p.correct ? p.rank : '—'}</b></button>`).join('')}</div>`; }
    function regattaLanes(c) { let entries = screen === 'teacher' ? c.entries : [...c.entries].sort((a, b) => Number(b.id === state?.id) - Number(a.id === state?.id)); return entries.map(p => `<div class="regatta-lane ${p.id === state?.id ? 'my-lane' : ''}"><div class="lane-label"><b>${p.correct ? String(p.rank).padStart(2, '0') : '—'}</b><span>${esc(p.name)}${p.withdrawn ? ' · Đã rời' : ''}</span><small>${p.correct}/6 đúng${['results', 'done'].includes(c.phase) ? ' · +' + p.reward + 'đ' : ''}</small></div><div class="lane-progress" role="progressbar" aria-label="Tiến độ ${esc(p.name)}" aria-valuenow="${p.correct}" aria-valuemin="0" aria-valuemax="6"><i style="width:${p.correct / 6 * 100}%"></i></div></div>`).join(''); }
    function updateRegattaFleet(c) { let fleet = document.getElementById('regattaFleet'); if (!fleet)
        return; if (regattaEvent !== c.id) {
        regattaEvent = c.id;
        regattaPoses.clear();
    } let t = performance.now(), reduced = document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches, entries = [...c.entries].sort((a, b) => a.id.localeCompare(b.id)); entries.forEach(p => regattaPoses.set(p.id, SignalTerrainCore.move(regattaPoses.get(p.id), p.correct, t, reduced))); cancelAnimationFrame(regattaFrame); function paint(t) { regattaFrame = 0; let moving = false; if (!fleet.isConnected || document.hidden)
        return; entries.forEach((p, i) => { let pose = regattaPoses.get(p.id), pos = SignalTerrainCore.at(pose, t), b = fleet.querySelector('[data-boat="' + CSS.escape(p.id) + '"]'); if (!b)
        return;  b.style.top = regattaPosition(i, pos, entries.length).top + '%'; b.classList.toggle('rowing', Math.abs(pos - pose.to) > .01 && !reduced); b.querySelector('b').textContent = p.correct ? p.rank : '—'; b.title = p.name + ' · ' + p.correct + '/6 câu đúng · Hạng ' + p.rank; b.setAttribute('aria-label', b.title); moving = moving || Math.abs(pos - pose.to) > .01; }); if (moving)
        regattaFrame = requestAnimationFrame(paint); } regattaFrame = requestAnimationFrame(paint); }
    function communityPanel(teacherView = false) { let c = community(); if (!c)
        return ''; let phase = c.phase, finished = ['results', 'done'].includes(phase), own = c.own, key = c.id + ':' + own?.step; if (key !== communityDraftKey) {
        if (!communityDraftKey.startsWith(c.id + ':'))
            communityFeedback = '';
        communityDraftKey = key;
        communityInput = '';
    } return `<section class="regatta ${teacherView ? 'teacher-regatta' : ''}"><div class="regatta-head"><div><div class="eyebrow">HOẠT ĐỘNG CỘNG ĐỒNG · ${c.entries.length} THUYỀN</div><h1>Vượt dòng <em>tri thức</em></h1><p>Giải câu Toán để đưa thuyền vượt sông.</p></div><div class="regatta-timer"><span id="communityPhase">${phase === 'countdown' ? 'CHUẨN BỊ' : phase === 'racing' ? 'ĐANG ĐUA' : phase === 'results' ? 'TRỞ LẠI VÁN CHÍNH SAU' : 'ĐÃ KẾT THÚC'}</span><strong id="communityClock">${time((phase === 'countdown' ? c.startAt : phase === 'racing' ? c.finishAt : c.resumeAt) - wallNow())}</strong></div></div><p class="regatta-notice">${phase === 'done' ? 'Cuộc đua đã kết thúc. Điểm được cộng một lần; ván chính đã tiếp tục.' : finished ? 'Điểm được cộng tự động một lần. Nhiệm vụ cũ sẽ mở lại khi hết thời gian xem kết quả.' : 'Đồng hồ ván chính đang dừng. Tiến độ, bản nháp và thời gian đóng băng được giữ.'}</p><div class="regatta-grid"><section class="regatta-course"><div class="course-caption">${finished ? 'KẾT QUẢ CUỘC ĐUA' : 'VỊ TRÍ CÁC THUYỀN'}<span>6 CÂU · 45 GIÂY</span></div><div class="river-scene"><div class="river-checkpoint"><span>BẾN ĐÍCH</span><small>6 câu đúng · 6 chặng chèo</small></div>${regattaFleet(c)}<div class="river-start">BẾN XUẤT PHÁT</div></div><details class="fleet-ranking" id="fleet-ranking" ${finished ? 'open' : ''}><summary>Bảng xếp hạng · ${c.entries.length} thuyền</summary><div id="regattaLanes" class="regatta-lanes">${regattaLanes(c)}</div></details></section><aside class="regatta-challenge">${teacherView ? `<div class="eyebrow">BẢNG ĐIỀU PHỐI</div><h2>${finished ? 'Đã chốt kết quả' : 'Cả lớp đang đua'}</h2><p>Số câu đúng và vị trí tự cập nhật mỗi giây. Lời giải của các câu đã gửi ở bên dưới, chỉ giáo viên xem được.</p>` : phase === 'countdown' ? `<div class="eyebrow">SẴN SÀNG CHÈO</div><h2>Chuẩn bị giấy nháp!</h2><p>6 câu ngắn. Mỗi câu chỉ một lần chốt. Đúng tiến thuyền, sai sang câu kế. Có thể nhập phân số a/b.</p><div class="regatta-countdown">10 → 0</div>` : phase === 'racing' && own?.question ? `<div class="eyebrow">CÂU ${own.step + 1}/6 · ${esc(own.question.topic)}</div><h2>Một đáp án. Một cú chèo.</h2><p class="regatta-question">${mathText(own.question.question)}</p><form id="communityForm"><label for="communityAnswer">Kết quả đã kiểm tra</label><input id="communityAnswer" name="answer" maxlength="40" required autocomplete="off" placeholder="Số hoặc phân số a/b" value="${esc(communityInput)}"><button class="primary" id="communitySubmit">Chốt đáp án & chèo</button></form><p id="communityFeedback" role="status">${esc(communityFeedback)}</p><small>Chốt một lần; không sửa hoặc dò lại. Hai câu cách nhau ít nhất 2,5 giây.</small>` : phase === 'racing' ? `<div class="eyebrow">${own ? 'ĐÃ CHÈO HẾT 6 CÂU' : 'KHÁN GIẢ'}</div><h2>${own ? 'Chờ các thuyền về đích.' : 'Cổ vũ cả lớp!'}</h2><p>${own ? own.correct + '/6 câu đúng' : 'Bạn vào sau khi cuộc đua mở hoặc đã kết thúc ván chính. Cuộc đua sau sẽ có bạn.'}</p>` : `<div class="eyebrow">KẾT QUẢ</div><h2>${own ? own.correct + '/6 câu đúng' : 'Một cuộc đua, cả lớp cùng vui'}</h2>${c.entries.filter(p => p.id === state?.id).map(p => `<p>Hạng ${p.rank} · <strong>+${p.reward} điểm</strong></p>`).join('')}<p>Thưởng tối đa 60 điểm. Ván chính tự tiếp tục; không cần bấm quay lại.</p>`}${communityRules()}<button class="ghost" data-action="rules">Luật & hướng dẫn ván chính</button></aside></div>${teacherView ? `<details class="community-results" id="community-teacher-results"><summary>Đáp án, lời giải & kết quả chi tiết cuộc đua</summary>${c.guides?.map(g => `<details id="community-guide-${esc(g.id)}"><summary>${esc(g.name)} · ${g.attempts.filter(a => a.ok).length}/${g.attempts.length} câu đã gửi đúng</summary>${g.attempts.map(a => `<div class="community-attempt"><p><strong>Câu ${a.step + 1}:</strong> ${mathText(a.question)}</p><p>Đã nhập ${esc(a.answer)} · ${a.ok ? 'Đúng' : 'Sai'} · <strong>Đáp án ${a.expected}</strong></p><ol>${a.steps.map(x => `<li>${mathText(x)}</li>`).join('')}</ol></div>`).join('') || '<p>Chưa gửi câu nào.</p>'}</details>`).join('')}</details>` : ''}</section>`; }
    function communityScreen() { return `${header()}<main class="community-shell">${communityPanel()}<p class="small muted">Mỗi câu đúng +5 điểm · Hạng 1/2/3 thêm 30/20/10 điểm · Cần ít nhất một câu đúng để nhận thưởng hạng.</p></main>`; }
    function updateCommunityUI() { let c = community(); if (!c)
        return; let clock = document.getElementById('communityClock'); if (clock)
        clock.textContent = c.phase === 'done' ? '✓' : time((c.phase === 'countdown' ? c.startAt : c.phase === 'racing' ? c.finishAt : c.resumeAt) - wallNow()); let lanes = document.getElementById('regattaLanes'); if (lanes)
        lanes.innerHTML = regattaLanes(c); updateRegattaFleet(c); let button = document.getElementById('communitySubmit'); if (button)
        button.disabled = busy || c.phase !== 'racing' || wallNow() >= c.finishAt || wallNow() - (c.own?.lastAt || 0) < 2500; }
    async function communitySubmit(answer) { if (busy || !session)
        return; let c = community(); busy = true; updateCommunityUI(); try {
        let d = await api('community-answer', { id: session.id, step: c.own.step, answer });
        apply(d);
        communityFeedback = d.result.correct ? 'Đúng! Thuyền tiến thêm một chặng.' : 'Chưa đúng. Câu đã chốt; cùng giải câu tiếp theo.';
        render();
    }
    catch (e) {
        toast(e.message);
        await refresh(true);
    }
    finally {
        busy = false;
        updateCommunityUI();
    } }
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
            + `<div class="arena-fighter mine ${strike ? 'striking' : ''} ${wallNow() < own.stunnedUntil ? 'stunned' : ''} ${wallNow() < own.shieldUntil ? 'guarded' : ''}" data-fighter="mine">${sprite(own.mascot, 'arena-mascot')}<strong>Bạn</strong>${arenaHp(own.hp)}<small>${own.correct} câu đúng · ${own.resource} linh khí · ${own.knockdowns} lần hạ</small></div>`
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
    function campaignSetup() { return `<fieldset class="campaign-setup"><legend>0. Cách chơi của lớp</legend><div class="config-row"><label>Hình thức <select name="participation"><option value="group" ${roomDraft.participation === 'group' ? 'selected' : ''}>Theo nhóm · Chung thiết bị</option><option value="pairs" ${roomDraft.participation === 'pairs' ? 'selected' : ''}>Đấu đôi · Hai người một thiết bị</option><option value="individual" ${roomDraft.participation === 'individual' ? 'selected' : ''}>Cá nhân · Mỗi học sinh một thiết bị</option></select></label><label>Luật ván <select name="rule"><option value="campaign" ${roomDraft.rule === 'campaign' ? 'selected' : ''}>Chiến dịch bản đồ</option><option value="duel" ${roomDraft.rule === 'duel' ? 'selected' : ''}>Đấu đơn</option><option value="zones" ${roomDraft.rule === 'zones' ? 'selected' : ''}>Chiếm khu vực</option><option value="survival" ${roomDraft.rule === 'survival' ? 'selected' : ''}>Sinh tồn</option><option value="escort" ${roomDraft.rule === 'escort' ? 'selected' : ''}>Hộ tống</option><option value="treasure" ${roomDraft.rule === 'treasure' ? 'selected' : ''}>Săn kho báu</option><option value="relay" ${roomDraft.rule === 'relay' ? 'selected' : ''}>Tiếp sức</option><option value="lockdown" ${roomDraft.rule === 'lockdown' ? 'selected' : ''}>Phòng khóa</option><option value="merchant" ${roomDraft.rule === 'merchant' ? 'selected' : ''}>Thương hội</option></select></label><label>Hoạt động chung <select name="community" id="setupCommunity">${window.SignalGameSetup.options(roomDraft.community,roomDraft.theme)}</select></label></div><div id="setupGuidance">${window.SignalGameSetup.guidance(roomDraft)}</div><p class="small muted">Chọn hình thức theo thiết bị thực tế. Cá nhân: mỗi em có phiên riêng; cặp/nhóm: chia lượt điều khiển trên máy chung.</p></fieldset><fieldset class="campaign-setup"><legend>1. Chọn thế giới và cốt truyện</legend><div class="theme-choices">${Object.entries(C.themes).map(([key, t]) => `<label class="theme-card"><input type="radio" name="theme" value="${key}" ${roomDraft.theme === key ? 'checked' : ''}><img src="/assets/${t.coverImage || t.image}" alt="Thế giới ${t.name}" loading="lazy"><span><strong>${t.name}</strong><small>${t.title}</small></span></label>`).join('')}</div><p class="theme-story" id="setupStory">${esc(C.themes[roomDraft.theme].story)}</p></fieldset><fieldset class="campaign-setup"><legend>2. Chọn bài và dạng Toán</legend><p>Chọn những phần lớp đã học. Mỗi ván có 5 câu Toán ngắn: 4 mốc thử thách trên đường và 1 thẻ sự kiện Toán. Cổng chính dùng câu đố logic riêng.</p><div class="config-row"><label>Khối lớp <select name="grade" id="configGrade">${[0, 10, 11, 12].map(g => `<option value="${g}" ${roomDraft.grade === g ? 'selected' : ''}>${g ? 'Lớp ' + g : 'Liên khối 10–12'}</option>`).join('')}</select></label><label>Độ khó Toán thấp nhất <select name="minLevel">${levelNames.map((n, i) => `<option value="${i}" ${roomDraft.minLevel === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Độ khó Toán cao nhất <select name="maxLevel">${levelNames.map((n, i) => `<option value="${i}" ${roomDraft.maxLevel === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Độ khó câu đố mở cổng <select name="stationMax">${levelNames.map((n, i) => `<option value="${i}" ${roomDraft.stationMax === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><p class="small muted">Ví dụ chọn Dễ–Khá: câu Toán nằm trong khoảng đó, không phải câu số thứ tự. Mức mở cổng là độ khó cao nhất của câu đố logic, không phải số cổng. Điểm thưởng 40–120 thuộc trò chơi, không phải điểm kiểm tra hay mức nhận thức của chương trình.</p><div class="topic-tools"><button type="button" data-action="setup-recommend">Gợi ý cách chơi nhẹ</button><button type="button" data-action="topics-all">Chọn tất cả bài đang hiện (đã học)</button><button type="button" data-action="topics-clear">Bỏ chọn</button><span id="topicCount">Đã chọn ${roomDraft.topics.length} bài / dạng</span></div><div class="tablewrap"><table class="topic-matrix"><thead><tr><th>Chọn</th><th>Bài / dạng</th><th>Nhiệm vụ và mục tiêu</th></tr></thead><tbody id="topicRows">${topicRows()}</tbody></table></div><details><summary>Tùy chọn ngữ cảnh và hình thức câu hỏi</summary><div class="question-dimensions"><fieldset><legend>Ngữ cảnh kết hợp với chủ đề Toán</legend>${C.categories.map(x => `<label><input type="checkbox" name="categories" value="${x.id}" ${roomDraft.categories.includes(x.id) ? 'checked' : ''}>${x.name}</label>`).join('')}</fieldset><fieldset><legend>Hình thức</legend>${C.formats.map(x => `<label><input type="checkbox" name="formats" value="${x.id}" ${roomDraft.formats.includes(x.id) ? 'checked' : ''}>${x.name}</label>`).join('')}</fieldset></div></details><p class="small muted">Chủ đề Toán là kiến thức bắt buộc của câu. Ngữ cảnh là lớp vận dụng bổ sung. Có thể chọn liên khối để kết hợp chủ đề lớp 10, 11 và 12.</p><p class="small muted">Nếu chọn quá 5 chủ đề, hệ thống rút 5 chủ đề cho ván này; nếu chọn ít hơn, chủ đề được lặp với dữ liệu mới. Các đội gặp cùng cơ cấu chủ đề và mức độ; số liệu khác nhau. Dễ–Khá phù hợp ván 30 phút; hai mức cao chỉ nên bật khi lớp đã sẵn sàng.</p></fieldset>`; }
    function topicRows() { return C.topics.filter(t => !roomDraft.grade || t.grade === roomDraft.grade).map(t => `<tr><td><input type="checkbox" name="topics" value="${esc(t.id)}" aria-label="Chọn ${esc(t.name)}" ${roomDraft.topics.includes(t.id) ? 'checked' : ''}></td><td><strong>${esc(t.name)}</strong><br><small>Lớp ${t.grade} · ${esc(t.chapter || 'Bài luyện tập')}</small></td><td>${esc(t.scope)}<details><summary>Mục tiêu và nguồn</summary><p>${esc(t.objective || t.scope)}</p><p>${esc(t.source?.note || 'Bài tập tự biên soạn; giáo viên đối chiếu yêu cầu bài học trước khi dùng.')}</p></details></td></tr>`).join(''); }
    function readRoomDraft(form) { let fd = new FormData(form); let participation = fd.get('participation') || 'group'; return { playMode: participation === 'individual' ? 'individual' : 'teams', participation, rule: fd.get('rule') || 'campaign', community: fd.get('community') || 'none', theme: fd.get('theme') || 'modern', grade: Number(fd.get('grade') ?? 10), topics: fd.getAll('topics'), minLevel: Number(fd.get('minLevel')), maxLevel: Number(fd.get('maxLevel')), stationMax: Number(fd.get('stationMax')), categories: fd.getAll('categories'), formats: fd.getAll('formats') }; }
    function campaignSummary(c) { if (!c)
        return ''; let t = C.themes[C.resolveThemeId(c.theme)] || C.themes.modern; return `<details class="campaign-summary" id="room-campaign"><summary>${t.name} · ${t.title} · ${c.grade ? 'Lớp ' + c.grade : 'Liên khối 10–12'} · Xem ma trận ván</summary><p>${esc(t.story)}</p><p><strong>${c.playMode === 'individual' ? 'Cá nhân · Mỗi em một thiết bị' : 'Theo nhóm · Chung thiết bị'}</strong> · ${esc(window.SignalGameSetup.label(c.community))}</p><p><strong>Mục tiêu:</strong> ${esc(t.goal)} Mỗi đội gặp đúng 2 trong 3 trạm giữa, xác suất tại từng trạm là 2/3. Độ khó câu đố mở cổng tối đa ${levelNames[c.stationMax ?? 2]}; dữ liệu và độ khó giữ cố định trong ván.</p><div class="tablewrap"><table><thead><tr><th>Mốc</th><th>Chủ đề đã rút</th><th>Ngữ cảnh & hình thức</th><th>Mức độ</th><th>Điểm khi giải đúng</th></tr></thead><tbody>${c.plan.map((p, i) => `<tr><td>${i < 4 ? 'Ô ' + c.cells[i] : 'Thẻ sự kiện Toán'}</td><td>${C.topics.find(t => t.id === p.topic)?.name || p.topic}</td><td>${C.categories.find(x => x.id === p.category)?.name || 'Thực hành'} · ${C.formats.find(x => x.id === p.format)?.name || 'Điền số'}</td><td>${levelNames[p.level]}</td><td>${C.points[p.level]}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Mọi câu đều giữ chủ đề Toán đã chọn; ngữ cảnh được lồng vào bài toán, không thay thế kiến thức Toán. Tạo phòng khác để chọn lại cấu hình. Reset giữ ma trận này và sinh lại số liệu cho từng đội.</p></details>`; }
    function storyPanel() { let t = theme(); return `<section class="world-story" style="background-image:linear-gradient(90deg,#0a1d2ef2,#0a1d2e90),url('/assets/${t.image}')"><div class="eyebrow">${t.name} · ${t.tag}</div><h2>${t.title}</h2><p>${t.story}</p><strong>${t.goal}</strong></section>`; }
    function header() { return `<header class="top"><div class="brand"><span class="brand-mark" aria-hidden="true">◈</span> Mật Mã Đa Giới</div><div class="top-actions"><button class="ghost" data-action="settings">Âm thanh & phản hồi</button><button class="ghost" data-action="rules">${roomRulesInfo()?'Luật phòng · '+esc(window.SignalRoomRules?.label(roomRulesInfo()?.mode?.rule||roomRulesInfo()?.campaign?.rule||'campaign')):'Luật & hướng dẫn'}</button>${state ? '<button class="ghost" data-action="shop">Kỹ năng</button>' : ''}<a href="/hosts">Giáo viên</a><a href="?view=teacher">Phòng game</a><a href="/hosts#host-permissions" aria-label="Quản lý quyền giáo viên">Quản lý quyền</a></div></header>`; }
    async function start() { try {
        busy = true;
        const participation=pendingCampaign?.participation||(pendingCampaign?.playMode==='individual'?'individual':'group');
        const memberNames=participation==='individual'?[pendingName]:Array.from(document.querySelectorAll('[data-join-member]')).map(input=>input.value.trim()).filter(Boolean);
        if(participation!=='individual'&&!memberNames.length){toast('Nhập tên học sinh đang dùng chung thiết bị.');return;}
        let d = await api('join', { name: pendingName, code: pendingRoom, mascot: pendingMascot, memberNames });
        session = d.session;
        sessionNotice = '';
        write(KEY, session);
        apply(d);
        screen = state.status === 'waiting' ? 'waiting' : state.status === 'active' ? 'play' : 'result';
        render();
    }
    catch (e) {
        toast(e.message);
    }
    finally {
        busy = false;
    } }
    function landing() { return `${header()}<main class="landing"><div>${sessionNotice ? `<p class="notice session-notice" role="status">${esc(sessionNotice)}</p>` : ''}<div class="eyebrow">Mật Mã Đa Giới</div><h1>MẬT MÃ<br><span>ĐA GIỚI</span></h1><p>Một cơn bão. Năm hệ thống bị khóa.<br>Chọn linh vật, lăn xúc xắc và vượt các cổng Toán – logic để hoàn thành mục tiêu của thế giới đã chọn.</p><div class="chips"><span>TOÁN 10–12 & SUY LUẬN LOGIC</span><span>THEO NHÓM HOẶC CÁ NHÂN</span><span>THỜI LƯỢNG THEO PHÒNG</span></div>${state && state.status === 'active' ? `<p class="small">Đang có phiên của <strong>${esc(state.name)}</strong>. Đồng hồ vẫn chạy khi rời trang sau khi giáo viên bắt đầu.</p><button class="primary" data-action="resume">Tiếp tục nhiệm vụ</button>` : state ? `<p class="small">Phiên gần nhất: <strong>${esc(state.name)}</strong>.</p><div class="flex"><button class="primary" data-action="result">Xem kết quả</button><button data-action="new">Tạo phiên mới</button></div>` : `<form id="joinForm" class="join" style="flex-wrap:wrap"><label for="roomCode">Mã phòng của em</label><input id="roomCode" name="roomCode" placeholder="Nhập 6 ký tự thầy cô cung cấp" maxlength="6" required autocomplete="off" autocapitalize="characters" aria-label="Mã phòng" value="${esc(pendingRoom||new URLSearchParams(location.search).get('code')||'')}" ${pendingRoomInfo?'readonly':''}>${pendingRoomInfo?'<label for="teamName">'+(pendingCampaign?.participation==='individual'?'Tên của em':'Tên cặp hoặc nhóm')+'</label><input id="teamName" name="teamName" placeholder="Tên dùng trong phòng này" maxlength="40" required autocomplete="off"><button class="primary">Tiếp tục vào phòng</button><button type="button" data-action="change-join-code">Đổi mã phòng</button>':'<button class="primary">Tiếp tục</button>'}</form>`}<p><button data-action="rules">Cách vào phòng & luật chơi</button></p><details><summary>Máy nhóm hoặc xem hộ chiếu</summary><nav class="flex" aria-label="Cách tham gia khác"><a href="/shared">Máy nhóm do thầy cô cấp</a><a href="/passport">Hộ chiếu học tập</a></nav></details><footer>Nhập mã phòng để xem luật và chế độ trước khi tham gia. Thế giới là bối cảnh; giáo viên chọn luật, cách dùng thiết bị và thời lượng cho từng phòng.</footer></div></main>`; }
    function briefing(){const participation=pendingCampaign?.participation||(pendingCampaign?.playMode==='individual'?'individual':'group');const joining=participation==='individual'?'Em tự đọc, giải và kiểm tra trước khi nộp. Mỗi em có tiến độ riêng.':participation==='pairs'?'Hai em dùng chung phần chơi: một em giải thích, một em kiểm tra; đổi người điều khiển theo lượt.':'Các em phân vai đọc dữ kiện, suy luận, kiểm tra và điều khiển; đổi vai theo chặng.';return `${header()}<main class="setup"><div class="eyebrow">Phòng ${esc(pendingRoom)} · ${esc(pendingName)}</div><h1>${theme().title}</h1>${storyPanel()}<p class="notice">${joining}</p><p>Chuẩn bị giấy nháp và bút. Đồng hồ bắt đầu khi giáo viên khởi động phòng; vào muộn dùng thời gian còn lại.</p>${rulesBody()}${joinMemberFields()}${mascotPicker()}<button class="primary" data-action="start">Vào phòng · Chờ giáo viên bắt đầu</button></main>`;}

    function field(key, label, placeholder = '', text = false) { let val = state.drafts[state.solved.length]?.[key] ?? ''; return `<div class="field"><label for="f-${key}">${label}</label><input id="f-${key}" name="${key}" value="${esc(val)}" placeholder="${esc(placeholder)}" ${text ? '' : 'inputmode="numeric" pattern="[0-9]+"'} autocomplete="off" required maxlength="40"></div>`; }
    function joinMemberFields(){const participation=pendingCampaign?.participation||(pendingCampaign?.playMode==='individual'?'individual':'group');if(participation==='individual')return '';const size=participation==='pairs'?2:4;return `<fieldset class="rules"><legend>${participation==='pairs'?'Hai người trong cặp':'Thành viên nhóm'}</legend><p>Ghi tên từng học sinh dùng chung thiết bị. Đổi người điều khiển theo chặng. Nếu vào một mình do số lẻ, ghi một tên.</p>${Array.from({length:size},(_,i)=>`<label for="join-member-${i}">Học sinh ${i+1}<input id="join-member-${i}" data-join-member maxlength="80" autocomplete="off" placeholder="Tên học sinh${i===0?' · Bắt buộc':''}"></label>`).join('')}</fieldset>`;}
    function content(i, v) {
        if (state.puzzles?.[i]) {
            let p = state.puzzles[i];
            return { title: p.title, narrative: levelNames[p.level] + ' · ' + p.points + ' điểm · ' + (state.race?.campaign ? theme().places[i] : names[i]), evidence: p.question.map(q => `<p>${mathText(q)}</p>`).join('') + lab(p), instruction: 'Dùng bảng thử để kiểm chứng, rồi nhập toàn bộ kết quả nhóm đã thống nhất.', fields: p.fields.map(f => field(f.key, esc(f.label), '', f.text)).join('') + (['power', 'pipes'].includes(p.widget.kind) ? `<input type="hidden" id="pipe-answer" name="circuit" value="${pipeTurns.join(',')}">` : '') };
        }
        switch (i) {
            case 0: return { title: 'Ai giữ chìa khóa thật?', narrative: 'Muốn vào phòng điều khiển, đội cần xác định tủ chứa chìa khóa. Ba bản ghi an ninh còn nguyên, nhưng chỉ một bản ghi nói đúng.', evidence: `<h2>Biên bản an ninh</h2><p>Chìa khóa nằm trong đúng một tủ A, B hoặc C. Có <strong>đúng một</strong> lời khai đúng.</p><div class="quote"><b>A</b> “Chìa khóa nằm ở tủ B.”</div><div class="quote"><b>B</b> “Chìa khóa không nằm ở tủ B.”</div><div class="quote"><b>C</b> “Chìa khóa không nằm ở tủ A.”</div><p style="margin-top:22px">Phiếu gắn trên chìa khóa ghi:</p><div class="math">n ∈ {2; 4; 6; 8}, &nbsp; 12 không chia hết cho n.</div><p class="small muted">n là chữ số thứ nhất của mã cửa. Không được suy ra “mọi lời khai còn lại đều đáng tin” sau khi tìm thấy một lời đúng.</p>`, instruction: 'Lập ba trường hợp cho vị trí chìa khóa. Nhập số lời khai đúng ở từng trường hợp, vị trí hợp lệ và số n.', fields: `<div class="rowfields">${field('countA', 'Nếu chìa ở A')}${field('countB', 'Nếu chìa ở B')}${field('countC', 'Nếu chìa ở C')}</div>${field('cabinet', 'Tủ thực sự chứa chìa khóa', 'Nhập chữ cái', true)}${field('digit', 'Số n trên phiếu')}` };
            case 1: return { title: 'Lọc thẻ truy cập.', narrative: 'Phòng máy dùng hai bộ lọc thẻ khác nhau. Phải đối chiếu danh sách, đếm đúng số thẻ và tìm nhóm thẻ dự phòng để khôi phục quyền truy cập.', evidence: `<h2>Nhật ký hai bộ lọc</h2><div class="math">U = {1; 2; …; ${v.N}}<br>A = {n ∈ U | n là số chẵn}<br>B = {n ∈ U | n chia hết cho 3}</div><p>Thẻ qua cả hai bộ lọc thuộc <span class="math">A ∩ B</span>. Thẻ qua ít nhất một bộ lọc thuộc <span class="math">A ∪ B</span>.</p><p>Thẻ dự phòng là thẻ thuộc A nhưng không thuộc B. <strong>Số thẻ dự phòng</strong> là chữ số thứ hai của mã cửa.</p>`, instruction: 'Liệt kê thẻ chung; đếm số thẻ qua ít nhất một bộ lọc và số thẻ dự phòng. Chú ý không đếm lặp thẻ chung.', fields: field('intersection', 'Các phần tử của A ∩ B', 'Ngăn cách bằng dấu phẩy hoặc dấu chấm phẩy', true) + field('union', 'Số phần tử của A ∪ B') + field('difference', 'Số phần tử của A ∖ B') };
            case 2: return { title: 'Cấp điện mà không quá tải.', narrative: 'Các thẻ đã mở kho pin. Một pin cho đèn và hai pin cho mỗi bộ máy phát. Đội cần chọn phương án cho nhiều máy phát nhất mà vẫn đủ đèn.', evidence: `<h2>Phiếu phân phối điện</h2><p>Gọi x là số bộ máy phát, y là số bộ đèn. Cả x và y là <strong>số nguyên dương</strong>.</p><div class="math">x + y = ${v.T}<br>2x + y ≤ ${v.T + v.c}<br>x ≥ 1, &nbsp; y ≥ 1</div><p>Mỗi bộ máy phát dùng 2 pin; mỗi bộ đèn dùng 1 pin. Chọn phương án có <strong>x lớn nhất</strong>.</p><p>x là chữ số thứ ba. Để chứng minh tối ưu, tính số pin cần dùng nếu tăng x thêm 1 nhưng vẫn giữ tổng x + y bằng ${v.T}.</p>`, instruction: 'Không chỉ tìm một cặp thỏa điều kiện: hãy chứng minh không thể tăng thêm máy phát.', fields: `<div class="rowfields" style="grid-template-columns:1fr 1fr">${field('x', 'Số máy phát x')}${field('y', 'Số bộ đèn y')}</div>${field('power', 'Số pin dùng: 2x + y')}${field('rejected', 'Số pin nếu tăng x thêm 1, giữ nguyên tổng số bộ')}` };
            case 3: {
                let a = ['●', '◆', '▲', '■', '✚'].slice(0, v.cycles[0]), b = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'].slice(0, v.cycles[1]);
                return { title: 'Đồng bộ hai nhịp mã.', narrative: 'Máy phát đã hoạt động nhưng hai dãy tín hiệu lệch nhịp. Bảng điều khiển chỉ mở khi cả hai dãy trở lại đúng cặp ký hiệu đầu tiên.', evidence: `<h2>Băng ghi tín hiệu</h2><p>Mỗi dãy lặp lại theo một chu kỳ cố định. Hai dãy chuyển ký hiệu <strong>cùng lúc, một lần mỗi giây</strong>.</p><div class="seq-label">DÃY A · KÝ HIỆU</div><div class="sequence">${[...a, ...a].map(x => `<span class="signal">${x}</span>`).join('')}<span class="muted">…</span></div><div class="seq-label">DÃY B · MÃ ROMAN</div><div class="sequence">${[...b, ...b].map(x => `<span class="signal">${x}</span>`).join('')}<span class="muted">…</span></div><p>Lúc <strong>t = 0</strong>, màn hình hiển thị cặp ký hiệu đầu tiên. Tìm số giây nhỏ nhất <strong>t &gt; 0</strong> để cả hai dãy cùng trở lại cặp này.</p><p>Chữ số thứ tư là <strong>tổng các chữ số của t</strong>.</p>`, instruction: 'Xác định chu kỳ nhỏ nhất của mỗi dãy, rồi tìm thời điểm đồng bộ đầu tiên. Không nhầm “một dãy lặp lại” với “cả hai dãy lặp lại”.', fields: `<div class="rowfields" style="grid-template-columns:1fr 1fr">${field('periodA', 'Chu kỳ dãy A (giây)')}${field('periodB', 'Chu kỳ dãy B (giây)')}</div>${field('joint', 'Thời điểm t nhỏ nhất (giây)')}${field('sum', 'Tổng các chữ số của t')}` };
            }
            case 4: return { title: 'Tìm kênh cứu hộ.', narrative: 'Máy phát đã đồng bộ. Dải tần cứu hộ bị nhiễu, còn đèn báo chưa chuyển xanh. Cần chọn đúng kênh và đọc đúng ý nghĩa của đèn báo trước khi phát tín hiệu.', evidence: `<h2>Nhật ký tần số & đèn báo</h2><p>Kênh n là số nguyên thỏa:</p><div class="math">${v.channel.n - 4} &lt; n &lt; ${v.channel.n + 2}<br>n là số lẻ<br>n không chia hết cho ${v.channel.d}</div><p>Quy định của trạm: <strong>“Nếu đèn xanh thì đã kết nối.”</strong> Gọi P = 1 khi đèn xanh, Q = 1 khi đã kết nối; giá trị 0 biểu thị điều ngược lại.</p><p>Đèn hiện không xanh (P = 0). Hãy nêu giá trị Q cho thấy <strong>đèn không xanh chưa đủ để kết luận mất kết nối</strong>.</p><p>Chữ số cuối của mã cửa là <strong>chữ số hàng đơn vị của n</strong>.</p>`, instruction: 'Nhập kênh phù hợp, số lẻ ngay trước nó bị loại bởi điều kiện chia hết, và giá trị Q chứng minh cách suy luận về đèn.', fields: field('channel', 'Kênh n') + field('excluded', 'Số lẻ ngay trước n bị loại') + field('connected', 'Giá trị Q của phản ví dụ') };
        }
    }
    function levelChoice() { let i = state.solved.length; return `${header()}<main class="setup"><div class="statusbar"><strong>${esc(state.name)}</strong>${clocks()}</div>${stationMap(i)}<div class="eyebrow">Khóa ${i + 1}/5 · ${names[i]}</div><h1>Bạn chọn thử thách nào?</h1><p>Khôi phục hệ thống ${names[i].toLowerCase()}. Cùng mục tiêu, mỗi mức có hồ sơ và ràng buộc khác nhau. Độ khó được giữ cố định sau khi nhận đề; đồng hồ vẫn chạy.</p><div class="level-grid">${levelNames.slice(0, (state.race?.campaign?.stationMax ?? 4) + 1).map((n, l) => `<button data-action="choose-level" data-level="${l}"><strong>${n}</strong><span>${levelPoints[l]} điểm</span><span>${['Dữ kiện trực tiếp', 'Kết hợp hai bước', 'Thêm điều kiện kiểm tra', 'Dữ kiện gián tiếp, nhiều ràng buộc', 'Đối chiếu đồng thời, dễ mắc bẫy suy luận'][l]}</span></button>`).join('')}</div><p>Tổng điểm hiện tại: <strong>${state.score || 0}</strong>. Đội về đích hợp lệ xếp trên đội chưa về đích. Các đội về đích so điểm còn lại, rồi thời gian có điều chỉnh.</p>${state.race ? abandonButton() : ''}${inventory()}</main>`; }
    function lab(p) { let w = p.widget; if (!w)
        return ''; let body = ''; if (w.kind === 'truth')
        body = '<p>Chạm từng ô để ghi Đúng (Đ), Sai (S) hoặc chưa xét (?). Đây là bảng lập luận của đội; hệ thống không tự chọn đáp án.</p><div class="tablewrap"><table><thead><tr><th>Chìa ở</th><th>Bản ghi 1</th><th>Bản ghi 2</th><th>Bản ghi 3</th></tr></thead><tbody>' + ['A', 'B', 'C'].map(x => `<tr><th>${x}</th>${[1, 2, 3].map(j => `<td><button type="button" data-action="lab-truth" aria-label="Chìa ở ${x}, bản ghi ${j}">?</button></td>`).join('')}</tr>`).join('') + '</tbody></table></div>'; if (w.kind === 'sets')
        body = '<p>Chạm các thẻ để đánh dấu phần tử nhóm muốn kiểm tra. Bảng này không tự phân loại hay chấm đáp án.</p><div class="tokens">' + Array.from({ length: w.N }, (_, i) => `<button type="button" data-action="lab-token" aria-pressed="false">${i + 1}</button>`).join('') + '</div>'; if (w.kind === 'power')
        body = `<label>Thử số máy phát x <input id="lab-x" type="range" min="1" max="${w.T - 1}" value="1"></label><meter id="power-meter" min="0" max="${w.budget}" value="${w.k + w.T - 1}"></meter><output id="lab-output">Kéo thanh để thử cách phân phối. Tự đối chiếu tất cả điều kiện trên hồ sơ.</output>`; if (w.kind === 'clock')
        body = '<label>Thử thời điểm t (giây) <input id="lab-t" type="range" min="0" max="150" value="0"></label><output id="lab-output">Kéo thanh để quan sát vị trí hai dãy.</output><div id="rhythm-a" class="rhythm-strip"></div><div id="rhythm-b" class="rhythm-strip"></div>'; if (w.kind === 'logic')
        body = '<p>Đánh dấu tình huống để thảo luận: điều kiện của trạm có cấm tình huống này không? Việc đánh dấu không tính là gửi đáp án.</p><div class="tokens">' + ['Đèn xanh · Đã kết nối', 'Đèn xanh · Chưa kết nối', 'Đèn không xanh · Đã kết nối', 'Đèn không xanh · Chưa kết nối'].map(t => `<button type="button" data-action="lab-token" aria-pressed="false">${t}</button>`).join('') + '</div>'; if (w.kind === 'order')
        body = '<p>Chạm từng thẻ theo thứ tự dự kiến. Bảng này không chấm đáp án; ghi thứ tự vào phiếu trả lời sau khi kiểm tra.</p><div class="tokens">' + w.letters.map(x => `<button type="button" data-action="lab-order" data-letter="${x}">${x}</button>`).join('') + '</div><output id="orderDraft">Chưa xếp thẻ</output><button type="button" data-action="lab-order-reset">Xếp lại</button>'; if (w.kind === 'pattern')
        body = '<div class="sequence">' + w.list.map(x => `<span class="signal">${x}</span>`).join('') + '<span class="signal">?</span></div>'; if (w.kind === 'pipes')
        body = '<p>Chạm ô để xoay 90°. Dòng sáng cho biết các chỗ nối. Kiểm tra tuyến đã nêu và đầu vào, đầu ra.</p>'; return `<section class="lab"><h2>Bàn thử của đội</h2>${body}${['power', 'pipes'].includes(w.kind) ? pipeUI() : ''}</section>`; }
    function updateLab() { let w = state?.puzzles?.[state.solved.length]?.widget, out = document.getElementById('lab-output'); if (!w || !out)
        return; if (w.kind === 'power') {
        let x = Number(document.getElementById('lab-x').value), y = w.T - x;
        let meter = document.getElementById('power-meter');
        if (meter)
            meter.value = w.k * x + y;
        out.textContent = `x = ${x}; y = ${y}; số pin = ${w.k * x + y}. Đối chiếu giới hạn pin và các điều kiện còn lại.`;
    } if (w.kind === 'clock') {
        let t = Number(document.getElementById('lab-t').value);
        for (let [id, n, r] of [['rhythm-a', w.a, w.ra], ['rhythm-b', w.b, w.rb]]) {
            let el = document.getElementById(id);
            if (el)
                el.innerHTML = Array.from({ length: n }, (_, j) => `<span class="${j === ((t - r) % n + n) % n ? 'lit' : ''}">${j + 1}</span>`).join('');
        }
        out.textContent = `t = ${t} giây · Dãy A ở vị trí ${((t - w.ra) % w.a + w.a) % w.a + 1}/${w.a} · Dãy B ở vị trí ${((t - w.rb) % w.b + w.b) % w.b + 1}/${w.b}. Cả hai phải ở vị trí 1.`;
    } }
    function rulesBody() { const info=roomRulesInfo(),rule=info?.mode?.rule||info?.campaign?.rule; if(!info||rule&&rule!=='campaign')return currentRoomRules(); if (!state || state.race || screen === 'teacher')
        return currentRoomRules()+raceRules(); return `<section class="rules full-rules"><h2>Quy ước của đội khám phá</h2><p><strong>Nhiệm vụ:</strong> đi qua 5 khu vực để khôi phục an ninh, thẻ truy cập, nguồn điện, bộ mã và kênh cứu hộ. Mỗi khóa cho một chữ số. Ghép đúng thứ tự để mở cửa cuối trong 30 phút.</p><ol><li><strong>Chia vai:</strong> nhóm 3–4 người, chung một thiết bị; người đọc, người suy luận, người kiểm tra, người điều khiển. Đổi vai sau mỗi khóa. Được dùng giấy nháp.</li><li><strong>Chọn độ khó:</strong> Dễ 100; Trung bình 200; Khá 350; Ác mộng 550; Địa ngục 800 điểm. Chọn trước mỗi khóa, không đổi sau khi nhận đề. Điểm chỉ được nhận khi giải đúng cả bộ dữ kiện.</li><li><strong>Bàn thử:</strong> dùng thẻ, bảng lời khai, thanh phân phối pin, mô phỏng đồng hồ và đường ống để kiểm chứng. Thao tác thử không bị phạt; chỉ nút “Xác nhận” gửi đáp án.</li><li><strong>Gợi ý:</strong> mở lần lượt 3 mức, cộng 1 / 2 / 3 phút vào thời gian xếp hạng. Dùng cả 3 cộng 6 phút. Đọc lại miễn phí. Mỗi mức mới đóng băng nút gửi trong 8 / 12 / 16 giây để đội đọc và thảo luận; vẫn được xem đề và bàn thử.</li><li><strong>Gửi sai:</strong> cộng 1 phút, chờ 10 giây rồi gửi lại. Không chỉ ra ô nào sai. Nhóm phải kiểm tra toàn bộ kết quả.</li><li><strong>Điểm và kỹ năng:</strong> điểm đã kiếm được có thể tiêu. Phá băng 20 điểm xóa đóng băng hiện tại; Lá chắn 40 điểm chặn gây nhiễu trong 60 giây; Tiếp sức 30 điểm phá băng và bảo vệ nhóm khác 20 giây; Nhiễu tín hiệu 60 điểm đóng băng nhóm khác 20 giây. Phá băng không xóa phút phạt đã ghi.</li><li><strong>Giới hạn chiến thuật:</strong> mở ít nhất 1 khóa mới được mua kỹ năng. Chỉ tác động nhóm đang chơi và đã mở ít nhất 1 khóa khi gây nhiễu. Mỗi đội tối đa 2 lần gây nhiễu, cách nhau 60 giây; mỗi đội chỉ nhận tối đa 2 lần. Sau khi bị gây nhiễu được bảo vệ 60 giây. Không tác động nhóm đã chốt kết quả. Mua thất bại không trừ điểm.</li><li><strong>Xếp hạng:</strong> ưu tiên số khóa hoàn tất, rồi điểm còn lại; nếu bằng nhau, ưu tiên thời gian thực chơi cộng phạt nhỏ hơn. Điểm tiêu cho kỹ năng làm giảm điểm xếp hạng. Kết quả chốt khi mở cửa hoặc hết 30 phút.</li><li><strong>Đồng hồ:</strong> dùng giờ chung của phòng, không dừng khi đóng băng, mất mạng hoặc tải lại. Thời gian phạt được cộng khi xếp hạng, không trừ khỏi 30 phút chơi. Đội vào muộn dùng thời gian còn lại.</li><li><strong>Kết nối:</strong> dùng lại thiết bị đã vào phòng. Khi chưa có xác nhận máy chủ, giữ câu trả lời và chờ kết nối. Giáo viên theo dõi tiến độ, lời giải, các lượt gửi và kỹ năng tự động.</li></ol><p>Trong lúc chơi, luôn có thể mở <strong>Luật & hướng dẫn</strong>, <strong>Gợi ý</strong> hoặc <strong>Kỹ năng</strong> ở đầu trang. Bản đồ cho biết khu vực hiện tại và các chặng đã khôi phục.</p></section>`; }
    function rulesDialog() { dlg.dataset.kind = 'rules'; dlg.innerHTML = '<button class="close" data-action="close-hints">Đóng</button>' + rulesBody(); if (!dlg.open)
        dlg.showModal(); }
    function stationMap(i) { if (state?.race)
        return raceMap(true); return `<nav class="mission-map" aria-label="Bản đồ trạm nghiên cứu"><div class="map-caption">LỘ TRÌNH KHÁM PHÁ · ${i >= 5 ? 'Đã đến cửa thoát' : 'Bạn đang ở khu ' + (i + 1)}</div><div class="map-route">${names.map((n, j) => `<div class="map-stop ${j < i ? 'restored' : j === i ? 'here' : 'locked'}" ${j === i ? 'aria-current="step"' : ''}><span>${j < i ? '✓' : String(j + 1).padStart(2, '0')}</span><strong>${n}</strong><small>${j < i ? 'Đã khôi phục' : j === i ? 'Đang có mặt' : 'Chưa tới'}</small></div>`).join('')}<div class="map-stop exit ${i === 5 ? 'here' : ''}"><span>◈</span><strong>Cửa thoát</strong><small>${i === 5 ? 'Nhập mã' : 'Cuối hành trình'}</small></div></div></nav>`; }
    const skillNames = { thaw: 'Phá băng', shield: 'Lá chắn', help: 'Tiếp sức', freeze: 'Nhiễu tín hiệu', time: 'Tối ưu lộ trình', boost: 'Tiến thêm 2 bước', double: 'Xúc xắc kép' }, skillCosts = { thaw: 20, shield: 40, help: 30, freeze: 60, time: 50, boost: 45, double: 70 };
    async function shopDialog() { if (!session || !state)
        return; try {
        let r = await fetch('/api/escape?kind=crew&id=' + encodeURIComponent(session.id), { headers: { Authorization: 'Bearer ' + session.token }, cache: 'no-store' });
        let d = await r.json();
        if (!r.ok)
            throw Error(d.error);
        peers = d.peers;
    }
    catch (e) {
        toast(e.message);
        return;
    } dlg.dataset.kind = 'shop'; dlg.innerHTML = `<button class="close" data-action="close-hints">Đóng</button><div class="eyebrow">Kho tiếp tế · Chiến thuật của đội</div><h2><span id="shop-wallet">${state.score || 0}</span> điểm có thể tiêu</h2><p>Kiếm được ${state.effects?.earned ?? state.score ?? 0} · Đã tiêu ${state.effects?.spent || 0} · Trừ do từ bỏ ${state.effects?.lost || 0}. Mở ít nhất một khóa mới được mua. Điểm đã tiêu làm giảm điểm xếp hạng.</p>${state.race ? `<p><strong>${freeCards()} thẻ miễn phí</strong> · <label><input id="useFreeCard" type="checkbox" ${freeCards() ? '' : 'disabled'}> Dùng thẻ thay cho điểm (Lá chắn / Tiếp sức / Nhiễu)</label></p>` : ''}<label>Nhóm khác nhận tác động<select id="skillTarget">${peers.filter(p => p.id !== state.id && p.status === 'active').map(p => `<option value="${esc(p.id)}">${esc(p.name)} · ${p.completed}/5 khóa</option>`).join('')}</select></label><div class="skill-grid">${Object.entries(skillNames).filter(([k]) => state.race?.campaign || !['time', 'boost', 'double'].includes(k)).map(([k, n]) => `<section><h3>${n} · ${skillCosts[k]} điểm</h3><p>${{ thaw: 'Xóa đóng băng hiện tại; giữ nguyên thời gian phạt.', shield: 'Chặn gây nhiễu trong 60 giây.', help: 'Phá băng và bảo vệ nhóm khác 20 giây.', freeze: 'Đóng băng nhóm khác 20 giây. Tối đa 2 lần; mỗi lần cách nhau 60 giây.', time: 'Giảm 30 giây khi xếp hạng. Không đổi đồng hồ 30 phút. Tối đa 2 lần/ván.', boost: 'Cộng 2 bước vào lượt di chuyển tiếp theo. Vẫn dừng ở cổng được chỉ định. Tối đa 2 lần/ván.', double: 'Lượt kế tiếp lăn hai viên, cộng bước và giữ bước dư ở cổng. Không chen lượt. Tối đa 2 lần/ván.' }[k]}</p><button class="primary" data-action="buy-skill" data-skill="${k}" ${state.status !== 'active' || state.solved.length < 1 || state.score < skillCosts[k] && (!state.race || !freeCards() || !['shield', 'help', 'freeze'].includes(k)) ? 'disabled' : ''}>Dùng ${n}</button></section>`).join('')}</div>${pactsPanel()}${personalSkills()}`; if (!dlg.open)
        dlg.showModal(); }
    async function buySkill(skill) { if (busy)
        return; busy = true; try {
        let target = document.getElementById('skillTarget')?.value, d = await api('skill', { id: session.id, skill, target, free: ['shield', 'help', 'freeze'].includes(skill) && !!document.getElementById('useFreeCard')?.checked });
        apply(d);
        toast(d.skill ? 'Đã dùng ' + d.skill.name + ' · Trừ ' + d.skill.cost + ' điểm' : 'Đã ghi nhận kỹ năng');
        await shopDialog();
        updateClock();
    }
    catch (e) {
        toast(e.message);
    }
    finally {
        busy = false;
    } }
    function personalSkills() { return `<details id="personal-skills"><summary>Nhật ký kỹ năng (${state.effects?.history?.length || 0})</summary>${(state.effects?.history || []).map(a => `<p>${time(a.created - state.start)} · ${a.actor_id === state.id ? 'Đội dùng' : 'Đội nhận'} ${skillNames[a.kind]}${a.actor_id === state.id ? ' · −' + a.cost + ' điểm' : ''}</p>`).join('')}</details>`; }
    function teacherSkills(r) { return `<details id="skills-${esc(r.id)}"><summary>Kỹ năng đã dùng và đã nhận (${r.effects?.history?.length || 0})</summary>${(board.skills || []).filter(a => a.actor_id === r.id || a.target_id === r.id).map(a => `<p>${time(a.created - Date.parse(r.start))} · ${esc(a.actor)} dùng ${skillNames[a.kind]} cho ${esc(a.target)} · ${a.cost} điểm</p>`).join('')}</details>`; }
    let pipeTurns = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const pipeBase = [[1, 2], [0, 2], [0, 3], [0, 1], [1, 3], [2, 3], [1, 2], [0, 2], [0, 3]];
    function pipeUI() { return `<div class="pipe-workbench"><p>Khôi phục đường ống: xoay từng khớp để nối lối vào bên trái ô 1 đến lối ra bên phải ô 9. ${state?.puzzles?.[state.solved.length]?.widget.kind === 'pipes' ? 'Nối thông đường ống và tính mã từ nhãn van.' : 'Cần nối thông đường ống và tính đúng phương án pin để mở khóa.'}</p><div class="pipe-grid">${pipeBase.map((_, i) => `<button type="button" data-action="lab-pipe" data-cell="${i}" aria-label="Xoay khớp ${i + 1}"><svg viewBox="0 0 80 80" aria-hidden="true"><g id="pipe-${i}">${pipeLines(i)}</g></svg></button>`).join('')}</div><button type="button" data-action="check-pipe">Thử dòng tín hiệu</button><output id="pipe-feedback">Lối vào: cạnh trái ô 1. Lối ra: cạnh phải ô 9.</output></div>`; }
    function pipeLines(i) { let ends = pipeBase[i].map(x => (x + pipeTurns[i]) % 4), pts = [[40, 0], [80, 40], [40, 80], [0, 40]]; return ends.map(x => `<path d="M40 40 L${pts[x][0]} ${pts[x][1]}" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>`).join(''); }
    function rotatePipe(i) { pipeTurns[i] = (pipeTurns[i] + 1) % 4; document.getElementById('pipe-' + i).innerHTML = pipeLines(i); let input = document.getElementById('pipe-answer'); if (input) {
        input.value = pipeTurns.join(',');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } }
    function checkPipe() { let dirs = pipeBase.map((x, i) => x.map(d => (d + pipeTurns[i]) % 4)), seen = new Set(), queue = dirs[0].includes(3) ? [0] : []; while (queue.length) {
        let i = queue.shift();
        if (seen.has(i))
            continue;
        seen.add(i);
        for (let d of dirs[i]) {
            let r = Math.floor(i / 3), c = i % 3, n = d === 0 ? i - 3 : d === 1 ? i + 1 : d === 2 ? i + 3 : i - 1;
            if (d === 0 && r === 0 || d === 2 && r === 2 || d === 1 && c === 2 || d === 3 && c === 0)
                continue;
            if (dirs[n].includes((d + 2) % 4))
                queue.push(n);
        }
    } let ok = seen.has(8) && dirs[8].includes(1); document.getElementById('pipe-feedback').textContent = ok ? 'Dòng tín hiệu đã nối thông. Đối chiếu dữ kiện nguồn điện để mở khóa.' : 'Dòng tín hiệu đang ngắt. Kiểm tra các cạnh nối đối diện.'; }
    function clocks() { return `<div class="effect-status" id="effectStatus" role="status"></div><div class="clocks"><div class="clock"><small>THỜI GIAN CÒN LẠI</small><span id="remaining">${time(G.DURATION - (now() - state.start))}</span></div><div class="clock penalty"><small>PHẠT TỰ ĐỘNG</small><span id="penalty">+${time(state.penalty)}</span></div></div>`; }
    function inventory() { if (state.race)
        return journeyInventory(); return `<div class="inventory"><div><strong>Nhật ký mã cửa</strong><div class="muted small">Các chữ số đã khôi phục, theo thứ tự khóa.</div></div><div class="codes">${Array.from({ length: 5 }, (_, i) => `<span class="code ${i >= state.solved.length ? 'empty' : ''}">${state.solved[i] ?? '·'}</span>`).join('')}</div></div>`; }
    function gameplay() { if (state.race?.reward)
        return travel(); if (state.race?.bonus && !state.race.bonus.done)
        return travel(); if (state.race?.phase === 'travel')
        return travel(); if (state.levels && state.solved.length < 5 && state.levels[state.solved.length] === null)
        return levelChoice(); let i = state.solved.length, v = state.variant; if (i >= 5)
        return finalGate(); if (['power', 'pipes'].includes(state.puzzles?.[i]?.widget.kind)) {
        let saved = state.drafts[i]?.circuit;
        if (saved) {
            let turns = saved.split(',').map(Number);
            if (turns.length === 9 && turns.every(n => Number.isInteger(n) && n >= 0 && n <= 3))
                pipeTurns = turns;
        }
    } let c = content(i, v); return `${header()}<main class="shell"><div class="statusbar"><div><div class="eyebrow">Đội khám phá</div><div class="team">${esc(state.name)}</div></div>${clocks()}</div>${stationMap(i)}<div class="gamecols"><section class="clue"><div class="eyebrow">Khóa ${i + 1} / 5 · ${names[i]}</div><h1>${c.title}</h1><p class="narrative">${c.narrative}</p><div class="evidence">${c.evidence}</div><p class="instruction">${c.instruction}</p></section><aside class="answer"><h2>Đối chiếu hồ sơ</h2><p class="muted small">Thống nhất cả bộ kết quả trước khi gửi. Gửi sai: +1 phút.</p><form id="answerForm">${c.fields}<button class="primary" id="submitAnswer">Xác nhận · Mở khóa</button></form><div class="feedback" id="feedback" role="status" aria-live="polite">${esc(feedback)}</div><div class="hintline"><button data-action="hints">Gợi ý · ${state.hints[i].length}/3</button><span>Mở lần lượt.<br>Phạt +1 / +2 / +3 phút.</span></div><p class="small muted" style="margin-top:20px;margin-bottom:0">Tiến độ tự lưu trên máy chủ. Đồng hồ vẫn chạy khi rời trang sau khi giáo viên bắt đầu.</p></aside></div>${recoveryControls()}${state.race ? abandonButton() : ''}${inventory()}</main>`; }
    function success() { let i = state.solved.length - 1; return `${header()}<main class="success"><div class="eyebrow">Khóa ${i + 1} đã khôi phục</div><h1>${['Đã tìm được chìa khóa.', 'Quyền truy cập đã mở.', 'Nguồn điện đã ổn định.', 'Hai nhịp mã đã đồng bộ.', 'Mã cuối đã sẵn sàng.'][i]}</h1><div class="digit">${lastDigit ?? state.solved[i]}</div><p class="score-earned">Điểm còn lại: <strong>${state.score || 0}</strong></p><p>Chữ số thứ ${['nhất', 'hai', 'ba', 'tư', 'năm'][i]} đã được ghi vào nhật ký. Đổi vai trong nhóm trước khi tiếp tục.</p><button class="primary" data-action="continue">${i === 4 ? 'Đến cửa thoát' : state.race ? 'Trở lại bản đồ · Lăn xúc xắc' : 'Mở hồ sơ tiếp theo'}</button><p class="small muted" style="margin-top:25px">Đồng hồ vẫn chạy. Phạt hiện tại: +${time(state.penalty)}.</p>${inventory()}</main>`; }
    function finalGate() { return `${header()}<main class="shell"><div class="statusbar"><div class="team">${esc(state.name)}</div>${clocks()}</div>${stationMap(5)}<div class="finalcols"><section><div class="pipe-unlock" aria-hidden="true">◈ ◈ ◈ ◈ ◈</div><div class="eyebrow">Cửa thoát · Kiểm tra cuối</div><h1>Cổng cuối đã sẵn sàng.</h1><p class="muted">Ghép năm chữ số theo thứ tự trong nhật ký. Trạm đã giải dùng chữ số nhận được; trạm đã từ bỏ dùng hàng đơn vị của vị trí cổng (8, 6, 4). Nhập mã để mở cửa và chốt kết quả.</p>${inventory()}</section><section class="answer"><h2>Mã cửa an toàn</h2><form id="finalForm"><div class="field"><label for="finalCode">Năm chữ số, từ khóa 1 đến khóa 5</label><input id="finalCode" name="code" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="off" required placeholder="Nhập mã 5 chữ số"></div><button class="primary" id="submitAnswer">Mở cửa · Chốt kết quả</button></form><div id="feedback" class="feedback" role="status">${esc(feedback)}</div><p class="small muted">Gửi sai vẫn cộng 1 phút và khóa lượt gửi 10 giây.</p></section></div></main>`; }
    function sprite(m, cls = '') { return `<span class="mascot ${cls}" style="background-image:url('/assets/${theme().sprites}');--mx:${(m % 4) * 100 / 3}%;--my:${Math.floor(m / 4) * 100}%" aria-label="${theme().mascots[m]}" role="img"></span>`; }
    function mascotPicker(waiting = false) { let m = waiting ? state.race.mascot : pendingMascot; return `<section class="mascot-picker"><h2>Linh vật của bạn</h2><p>Chọn người bạn đồng hành. Tên và màu viền phân biệt người chơi cùng linh vật.</p><div class="mascot-options">${theme().mascots.map((n, i) => `<button data-action="pick-mascot" data-mascot="${i}" aria-pressed="${m === i}">${sprite(i)}<strong>${n}</strong></button>`).join('')}</div></section>`; }
    const terrainStops = [[19, 67], [20, 63], [21, 59], [22, 56], [24, 53], [24.5, 50], [25, 47], [27, 46], [30, 44], [34, 45], [37, 46], [40, 47], [43, 50], [45, 51], [49, 51.5], [53, 52.5], [57.5, 54], [62, 54], [65, 52], [64.5, 49], [64, 46], [66, 44], [69, 42], [70, 39], [70, 35], [74, 31.5], [78, 33], [81.5, 34], [85, 32.5], [87, 29.5], [87.5, 26.5], [89, 25], [90, 23]];
    const terrainPlaces = ['ĐIỂM KHỞI HÀNH', 'KHO DỮ LIỆU', 'NÚT NĂNG LƯỢNG', 'ĐÀI QUAN SÁT', 'CỔNG CUỐI'];
    const strategicStops = [[15, 75], [18, 68], [20.5, 61], [22.5, 55], [24, 50], [27, 47], [30, 48], [31, 44], [30, 40], [33, 42], [38, 45], [42, 47], [46, 49], [50, 50], [55, 52], [59, 54], [61, 51], [65, 56], [69, 57], [73, 54], [74, 49], [73, 45], [73, 40], [76, 36], [78, 33], [80, 29], [83, 24], [85, 21], [87, 19], [89, 18], [91, 18], [92, 16], [91, 13]];
    function worldKey() { return (screen === 'teacher' ? board?.room.campaign : (state?.campaign || state?.race?.campaign || pendingCampaign))?.theme || roomDraft.theme || 'modern'; }
    function mapAsset() { return theme().image; }
    let terrainController = null;
    let terrainCamera = { zoom: 1, x: 0, y: 0 }, terrainObserver = null, terrainDragging = false, terrainExpanded = false, terrainRoom = '', terrainFocus = null, terrainSpot = null;
    function currentMap() { return (screen === 'teacher' ? board?.map : mapState) || { peers: [], turn: {} }; }
    function mapStops() { if (theme().route)
        return theme().route; let key = worldKey(); if (['historical', 'pastoral'].includes(key))
        return strategicStops; if (key !== 'dewey')
        return terrainStops; let anchors = [[18, 83], [67, 84], [63, 39], [29, 35], [63, 22]]; return Array.from({ length: 33 }, (_, i) => { let leg = Math.min(3, Math.floor(i / 8)), t = (i - leg * 8) / 8; return anchors[leg].map((v, k) => v + (anchors[leg + 1][k] - v) * t); }); }
    function coord(i) { let p = mapStops()[Math.max(0, Math.min(32, Number(i) || 0))]; return { x: p[0], y: p[1] }; }
    function mapTokens(m) { let totals = {}; m.peers.forEach(p => totals[p.position] = (totals[p.position] || 0) + 1); let counts = {}; return m.peers.map((p, index) => { let c = coord(p.position), n = counts[p.position] || 0; counts[p.position] = n + 1; return `<button type="button" class="racer ${n >= 4 && p.id !== state?.id && p.id !== terrainFocus ? 'cluster-hidden' : ''} ${p.id === state?.id ? 'own' : ''} ${p.id === terrainFocus ? 'focused' : ''} ${p.freezeUntil > now() ? 'frozen' : ''}" data-action="map-peer" data-team="${esc(p.id)}" data-racer="${esc(p.id)}" style="left:${c.x}%;top:${c.y}%;--team-hue:${index * 137 % 360};--stack-x:${(n % 4 - (Math.min(4, totals[p.position]) - 1) / 2) * 38}px;--stack-y:${-Math.floor(n / 4) * 56}px" aria-label="Theo dõi ${esc(p.name)} · Ô ${p.position} · ${phaseText(p)}" title="${esc(p.name)} · Ô ${p.position} · ${phaseText(p)}">${sprite(p.mascot)}<span>${esc(p.name)}</span>${n === 0 && totals[p.position] > 4 ? `<b class="cluster-count">${totals[p.position]} người</b>` : ''}</button>`; }).join(''); }
    function phaseText(p) { return p.status === 'completed' ? 'Đã về đích' : p.status === 'timeout' ? 'Hết giờ' : p.status === 'waiting' ? 'Chờ bắt đầu' : p.freezeUntil > now() ? 'Đóng băng' : p.phase === 'reward' ? 'Đang chọn phần thưởng' : p.phase === 'bonus' ? 'Đang giải câu hỏi trên đường' : p.phase === 'travel' ? 'Chờ lượt' : p.phase === 'gate' ? 'Ghép mã cửa' : 'Đang giải thử thách'; }
    function mapLegend(m) { return m.peers.map((p, i) => `<button class="crew-tag ${p.id === terrainFocus ? 'selected' : ''}" data-action="map-peer" data-team="${esc(p.id)}" aria-pressed="${p.id === terrainFocus}" style="--team-hue:${i * 137 % 360}">${sprite(p.mascot)}<span><strong>${esc(p.name)}</strong><small>Ô ${p.position} · ${phaseText(p)}</small></span><b>${p.score ?? 0}<small>điểm</small></b></button>`).join('') || '<p class="muted">Các linh vật sẽ xuất hiện khi đội vào phòng.</p>'; }
    function terrainInfo(m) { let p = m.peers.find(p => p.id === terrainFocus); if (p)
        return `<strong>${esc(p.name)} · Ô ${p.position}/32</strong><span>${phaseText(p)} · ${p.score ?? 0} điểm${p.id === state?.id ? ' · Bạn đang ở đây' : ''}</span>`; let i = terrainSpot; if (i !== null) {
        let j = [0, 8, 16, 24, 32].indexOf(i);
        return `<strong>Ô ${i} · ${j >= 0 ? theme().places[j] : i === 18 && m.campaign?.community === 'boat' ? 'Hội ngộ · Đua thuyền cộng đồng' : m.campaign?.cells.includes(i) ? 'Thử thách Toán' : [4, 10, 14, 20, 26, 30].includes(i) ? 'Mốc sự kiện' : 'Đường hành quân'}</strong><span>${j >= 0 ? (i === 0 || i === 32 ? 'Cổng bắt buộc giải đúng.' : 'Đi tới hoặc vượt qua đều dừng tại cổng.') : i === 18 && m.campaign?.community === 'boat' ? 'Người đầu tiên đi tới hoặc vượt qua gọi cả lớp đua thuyền Toán 65 giây; ván chính tạm dừng. Mỗi ván một lần, khi còn ít nhất 90 giây.' : m.campaign?.cells.includes(i) ? 'Đi ngang mở câu Toán thuộc ma trận giáo viên đã chọn. Có thể bỏ, không phạt.' : [4, 10, 14, 20, 26, 30].includes(i) ? 'Đi ngang cũng nhận sự kiện. Mỗi đội nhận đủ cùng bộ 6 thẻ.' : 'Lăn xúc xắc khi đến lượt để tiến về cổng tiếp theo.'}</span>`;
    } return `<strong>${theme().title}</strong><span>Chạm cổng để xem nhiệm vụ · Chọn người chơi để tìm cờ linh vật trên bản đồ.</span>`; }
    function raceMap(collapsed = false, m = mapState) { m = m || { peers: [], turn: {} }; let world = theme(), own = screen !== 'teacher' && state?.race; let content = `<section class="race-map campaign-map strategy-map ${terrainExpanded ? 'map-expanded' : ''}" aria-label="Bản đồ chiến dịch ${esc(world.title)}"><div class="map-heading"><div><div class="eyebrow">${world.tag}</div><h2>${world.title}</h2></div><span class="terrain-badge">5 CỔNG · 32 BƯỚC · ${m.peers.length} NGƯỜI CHƠI</span></div><div class="campaign-toolbar"><p id="mapTurn" class="map-turn">${mapTurnText(m)}</p><div class="map-controls" aria-label="Điều khiển bản đồ"><button data-action="map-mode" data-mode="2d" aria-pressed="true">2D</button><button data-action="map-mode" data-mode="3d" aria-pressed="false">3D</button><button data-action="map-zoom" data-delta="-0.3" aria-label="Thu nhỏ bản đồ">−</button><output id="mapZoom" aria-label="Mức phóng to">100%</output><button data-action="map-zoom" data-delta="0.3" aria-label="Phóng to bản đồ">+</button><button data-action="map-reset">Toàn cảnh</button><button data-action="map-rotate" disabled>Xoay góc</button><button data-action="map-light" aria-pressed="false">Ánh sáng: Ngày</button>${own ? '<button data-action="map-own">Tìm tôi</button>' : ''}<button data-action="map-expand">${terrainExpanded ? 'Thu gọn' : 'Toàn màn hình'}</button></div></div><div class="strategy-stage"><div id="terrainViewport" class="terrain-viewport strategy-viewport" tabindex="0" role="region" aria-label="Bản đồ địa hình. Kéo hoặc dùng phím mũi tên để di chuyển. Cộng trừ để phóng to, 0 để xem toàn cảnh. Trong 3D dùng Shift và kéo để xoay."></div><div class="strategy-title" aria-hidden="true"><span>${esc(world.name)}</span><small>ĐƯỜNG HÀNH TRÌNH</small></div><div class="strategy-mini"><span>TOÀN CẢNH</span><canvas class="strategy-minimap" width="192" height="108" tabindex="0" role="button" aria-label="Bản đồ thu nhỏ. Chạm để di chuyển camera; Enter để xem toàn cảnh."></canvas></div><div class="strategy-status" role="status">Địa hình 2D · Kéo để di chuyển</div></div><div id="terrainInfo" class="terrain-info" role="status">${terrainInfo(m)}</div>${world.note ? `<p class="map-source-note">${esc(world.note)} <a href="https://thedeweyschools.edu.vn/dewey-tay-ho-tay/" target="_blank" rel="noopener">Ảnh & thông tin trường</a> · <a href="https://www.gooood.cn/the-dewey-school-112-architects.htm" target="_blank" rel="noopener">Bản vẽ tham khảo</a></p>` : ''}<div class="map-key"><span><i class="key-gate"></i>Cổng logic</span><span><i class="key-event"></i>Sự kiện</span>${m.campaign?.community === 'boat' ? '<span><i class="key-community"></i>Hội ngộ cả lớp · Ô 18</span>' : ''}<span><i class="key-math"></i>Toán trên đường</span><button class="ghost" data-action="reduce-motion">Giảm chuyển động</button></div><details class="crew-panel" id="map-crews" ${m.peers.length <= 8 ? 'open' : ''}><summary>NGƯỜI CHƠI · ${m.peers.length} ${m.campaign?.playMode === 'individual' ? 'học sinh' : 'đội'} <span>Chọn để tìm trên bản đồ</span></summary><div id="raceLegend" class="crew-legend">${mapLegend(m)}</div></details>${screen === 'teacher' ? turnHistory(m) : ''}</section>`; return collapsed ? `<details class="map-fold" id="shared-map"><summary>Bản đồ chiến dịch · Bạn ở ô ${state.race.position}/32</summary>${content}</details>` : content; }
    function mapTurnText(m) { if (m.community && wallNow() < m.community.resumeAt)
        return 'Hoạt động cộng đồng · Ván chính đang tạm dừng'; if (m.campaign?.playMode === 'individual')
        return 'Cá nhân · Lăn độc lập · Ít nhất 6 giây giữa hai lượt'; let p = m.peers.find(p => p.id === m.turn.cursor); return p ? 'Lượt xúc xắc: ' + p.name + ' · ' + Math.max(0, Math.ceil((m.turn.deadline - now()) / 1000)) + ' giây' : m.peers.some(p => p.status === 'active') ? 'Các đội đang xử lý nhiệm vụ · Tự bỏ lượt di chuyển' : 'Chờ cuộc đua bắt đầu hoặc đã kết thúc'; }
    function turnHistory(m) { return `<details id="turn-history"><summary>Lịch sử lượt di chuyển</summary>${(m.log || []).slice(-20).map(e => `<p>${esc(m.peers.find(p => p.id === e.team)?.name || 'Đội đã xóa')} · ${e.type === 'roll' ? 'Lăn ' + e.die + ' · Ô ' + e.from + ' → ' + e.to : e.type === 'pass' ? 'Hết 10 giây · Tự bỏ lượt' : e.type === 'pact-pass' ? 'Trả giao kèo · Bỏ một lượt' : 'Đang làm nhiệm vụ hoặc bị đóng băng · Bỏ lượt'}</p>`).join('') || '<p>Chưa có lượt di chuyển.</p>'}</details>`; }
    function updateRaceMap() { let m = currentMap(); terrainController?.update(terrainModel(m)); let badge = root.querySelector('.strategy-map .terrain-badge'); if (badge)
        badge.textContent = '5 CỔNG · 32 BƯỚC · ' + m.peers.length + ' NGƯỜI CHƠI'; let crewSummary = document.querySelector('#map-crews>summary'); if (crewSummary)
        crewSummary.innerHTML = 'NGƯỜI CHƠI · ' + m.peers.length + ' ' + (m.campaign?.playMode === 'individual' ? 'học sinh' : 'đội') + ' <span>Chọn để tìm trên bản đồ</span>'; let legend = document.getElementById('raceLegend'); if (legend)
        legend.innerHTML = mapLegend(m); let mt = document.getElementById('mapTurn'); if (mt)
        mt.textContent = mapTurnText(m); let info = document.getElementById('terrainInfo'); if (info)
        info.innerHTML = terrainInfo(m); updateRaceClock(); }
    function terrainModel(m) { return { key: (screen === 'teacher' ? teacherSession?.id : state?.room) + ':' + (screen === 'teacher' ? board?.room.round : state?.round || 1) + ':' + worldKey(), image: '/assets/' + mapAsset(), imageHi: theme().imageHi ? '/assets/' + theme().imageHi : null, relief: ['historical', 'pastoral'].includes(worldKey()), route: mapStops(), peers: m.peers || [], own: screen === 'teacher' ? null : state?.id, focus: terrainFocus, spot: terrainSpot, mathCells: m.campaign?.cells || [], places: theme().places, community: m.campaign?.community === 'boat', now: now(), sprite, phase: phaseText, onDrag: v => terrainDragging = v }; }
    function applyTerrainCamera() { terrainController?.resize(); }
    function zoomTerrain(delta) { terrainController?.zoom(delta); }
    function focusTerrain(team) { if (!currentMap().peers.some(p => p.id === team)) {
        toast('Người chơi này không còn trên bản đồ.');
        return;
    } terrainFocus = team; terrainSpot = null; terrainController?.focus(team); updateRaceMap(); }
    function initTerrain() { terrainController?.destroy(); terrainController = null; let vp = document.getElementById('terrainViewport'); if (!vp)
        return; let room = String(screen === 'teacher' ? teacherSession?.id : state?.room) + ':' + (screen === 'teacher' ? board?.room.round : state?.round || 1); if (room !== terrainRoom) {
        terrainRoom = room;
        terrainFocus = null;
        terrainSpot = null;
    } terrainController = SignalTerrain.mount(vp, terrainModel(currentMap())); }
    async function expandTerrain() { let section = root.querySelector('.campaign-map'); if (!section)
        return; if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
    } if (terrainExpanded) {
        terrainExpanded = false;
        section.classList.remove('map-expanded');
        section.querySelector('[data-action="map-expand"]').textContent = 'Phóng lớn';
        applyTerrainCamera();
        return;
    } if (section.requestFullscreen) {
        try {
            await section.requestFullscreen();
            return;
        }
        catch { }
    } terrainExpanded = true; section.classList.add('map-expanded'); section.querySelector('[data-action="map-expand"]').textContent = 'Thu gọn'; applyTerrainCamera(); }
    document.addEventListener('fullscreenchange', () => { let b = root.querySelector('[data-action="map-expand"]'); if (b)
        b.textContent = document.fullscreenElement ? 'Thoát toàn màn hình' : 'Phóng lớn'; applyTerrainCamera(); });
    function bonusPanel() { let r = state.race; if (r.reward)
        return `<section class="bonus reward-panel"><div class="eyebrow">Đã giải đúng · Chọn một phần thưởng</div><h2>Đội muốn lợi ích nào?</h2><p>Chọn một lần. Đổi phần thưởng sẽ không cộng thêm điểm của câu này.</p>${[['points', 'Nhận ' + r.reward.points + ' điểm', 'Cộng đủ điểm vào quỹ và điểm xếp hạng.'], ['time', 'Giảm ' + Math.min(60, r.reward.points / 2) + ' giây xếp hạng', 'Giảm thời gian dùng để xếp hạng; đồng hồ 30 phút vẫn chạy.'], ['card', 'Nhận 1 thẻ kỹ năng', 'Đổi một Lá chắn, Tiếp sức hoặc Nhiễu; không dùng cho kỹ năng di chuyển.'], ['steps', 'Thêm 2 bước', 'Giữ 2 bước để cộng vào lượt xúc xắc tiếp theo. Vẫn dừng ở cổng được chỉ định.'], ['dice', 'Một xúc xắc thêm', 'Lượt di chuyển tiếp theo lăn hai viên và cộng số bước. Vẫn dừng ở cổng; không chen vào lượt đội khác.']].map(([key, title, detail]) => `<button class="reward-option" data-action="choose-reward" data-choice="${key}"><strong>${title}</strong><small>${detail}</small></button>`).join('')}</section>`; let q = r.bonus; if (!q || q.done)
        return '<button class="primary roll-button" id="rollButton" data-action="roll">Lăn xúc xắc</button>'; let fields = q.format === 'mcq' ? `<fieldset class="question-options"><legend>Chọn một phương án · Chỉ gửi một lần</legend>${q.options.map((t, i) => `<label><input type="radio" name="answer" value="${i}" ${String(state.drafts.bonus?.answer) === String(i) ? 'checked' : ''} required><span><b>${'ABCD'[i]}.</b> ${mathText(t)}</span></label>`).join('')}</fieldset>` : q.format === 'tf' ? `<fieldset class="question-options"><legend>Đánh giá cả bốn phát biểu · Chỉ gửi một lần</legend>${q.statements.map((t, i) => `<label class="tf-row"><span>${i + 1}. ${mathText(t)}</span><select name="s${i}" required aria-label="Phát biểu ${i + 1}"><option value="">Chọn</option><option value="D" ${state.drafts.bonus?.['s' + i] === 'D' ? 'selected' : ''}>Đúng</option><option value="S" ${state.drafts.bonus?.['s' + i] === 'S' ? 'selected' : ''}>Sai</option></select></label>`).join('')}</fieldset>` : `<label for="bonusAnswer">Kết quả đã thống nhất</label><input id="bonusAnswer" name="answer" value="${esc(state.drafts.bonus?.answer || '')}" inputmode="text" required maxlength="40" placeholder="Số nguyên, thập phân hoặc phân số a/b">`; return `<section class="bonus"><div class="eyebrow">${esc(q.category || 'Thực hành Toán')}</div><h2>${esc(q.topic || 'Câu hỏi trên đường')} · ${q.points || 40} điểm</h2><p class="small muted">${levelNames[q.level || 0]} · ${q.format === 'short' ? 'Điền số · tối đa 2 lần' : 'Trắc nghiệm · chỉ 1 lần'}${r.pendingMath ? ' · ' + r.pendingMath + ' câu xếp hàng' : ''}</p><p>${mathText(q.question)}</p><form id="bonusForm">${fields}<button class="primary" id="bonusButton">Chốt câu trả lời</button></form><p>${q.format === 'short' ? 'Sai chờ 10 giây trước lần thứ hai.' : 'Chốt cả bộ một lần; sai kết thúc câu, không cho thử lựa chọn khác.'} Không cộng phút phạt. Đúng được chọn phần thưởng.</p><button data-action="skip-bonus">Bỏ câu này · Không phạt</button></section>`; }
    function pactsPanel() { return !state.race?.campaign ? '' : `<section class="pact-panel"><h3>Giao kèo chiến thuật · ${state.race.pacts || 0}/2 đã dùng</h3><p>Mỗi ván tối đa hai giao kèo. Qua xuất phát mới dùng; phải xử lý câu hỏi và phần thưởng đang mở trước.</p>${[['freeze', 'Đóng băng 20 giây → 1 thẻ', 'Nút gửi và di chuyển bị khóa 20 giây. Vẫn đọc đề; có thể mua Phá băng. Không cộng phút phạt.'], ['pass', 'Bỏ một lượt di chuyển → 1 thẻ', 'Bỏ đúng lượt di chuyển kế tiếp khi đội đủ điều kiện. Lượt bị bỏ do đang làm bài không thanh toán giao kèo này.'], ['delay', '+45 giây xếp hạng → 40 điểm', 'Cộng 45 giây vào thời gian xếp hạng và 40 điểm vào quỹ. Đồng hồ 30 phút không đổi.']].map(([key, title, detail]) => `<section><strong>${title}</strong><p>${detail}</p><button data-action="pact-confirm" data-choice="${key}" ${state.status !== 'active' || state.solved.length < 1 || (state.race.pacts || 0) >= 2 ? 'disabled' : ''}>Xem lại & xác nhận</button></section>`).join('')}</section>`; }
    function confirmPact(choice) { let descriptions = { freeze: 'Đội sẽ bị đóng băng 20 giây và nhận 1 thẻ kỹ năng. Có thể dùng Phá băng nếu đủ điểm.', pass: 'Đội bỏ đúng lượt di chuyển kế tiếp khi đã đủ điều kiện và nhận 1 thẻ kỹ năng. Lượt đang làm nhiệm vụ không được tính là lượt đã trả.', delay: 'Đội cộng 45 giây xếp hạng và nhận 40 điểm. Thời gian chơi còn lại không đổi.' }; dlg.innerHTML = `<h2>Xác nhận giao kèo?</h2><p>${descriptions[choice]}</p><p>Giao kèo không thể hoàn tác. Tối đa hai lần mỗi ván.</p><div class="flex"><button data-action="shop">Quay lại kho</button><button class="primary" data-action="pact-use" data-choice="${choice}">Đồng ý giao kèo</button></div>`; if (!dlg.open)
        dlg.showModal(); }
    function travel() { let last = state.events.filter(e => e.type === 'roll').at(-1); return `${header()}<main class="race-shell"><div class="statusbar"><div><div class="eyebrow">Cuộc đua cứu hộ · ${esc(state.name)}</div><h1 class="race-title">Ô ${state.race.position} → Cổng ${[0, 8, 16, 24, 32][state.race.task]}</h1></div>${clocks()}</div><div class="race-layout"><section>${raceMap(false)}</section><aside class="race-console">${sprite(state.race.mascot, 'console-mascot')}<p class="meme">${state.race.bonus && !state.race.bonus.done ? 'Não đang tải… Câu hỏi thưởng tới rồi!' : last ? 'Tưởng lối tắt, hóa ra bài Toán!' : 'Đội khám phá đã vào đường đua!'}</p><div class="dice" id="diceFace" aria-live="polite">${last?.die || '?'}</div><p id="turnNotice" role="status"></p>${bonusPanel()}<p>${state.race.campaign?.playMode === 'individual' ? 'Bạn lăn độc lập, cách nhau ít nhất 6 giây. Xử lý nhiệm vụ đang mở rồi đi tiếp.' : 'Đội giải thử thách tự bỏ lượt di chuyển. Mỗi lượt có 10 giây; hết giờ chuyển đội tiếp theo.'}</p><p><strong>${state.score} điểm</strong> · ${freeCards()} thẻ kỹ năng miễn phí · ${state.race.rolls} lượt đã lăn</p>${state.race.carry ? `<p class="notice">Đang giữ ${state.race.carry} bước dư, dùng cùng lượt lăn tiếp theo.</p>` : ''}<button data-action="shop">Mở kho kỹ năng</button><button data-action="rules">Luật & hướng dẫn</button></aside></div>${journeyInventory()}${raceHistory({ race: state.race, events: state.events, start: new Date(state.start).toISOString() })}</main>`; }
    function updateRaceClock() { let bb = document.getElementById('bonusButton'); let mt = document.getElementById('mapTurn'); if (mt)
        mt.textContent = mapTurnText(currentMap()); if (bb)
        bb.disabled = busy || state.cooldown > now() || state.effects?.freezeUntil > now(); let button = document.getElementById('rollButton'), notice = document.getElementById('turnNotice'); if (!notice || !state?.race)
        return; if (state.race.campaign?.playMode === 'individual') {
        let wait = Math.max(0, Math.ceil(((state.race.lastRollAt || 0) + 6000 - now()) / 1000)), frozen = state.effects?.freezeUntil > now();
        notice.textContent = frozen ? 'Bạn đang đóng băng. Có thể mở kho Phá băng.' : wait ? 'Lượt tiếp theo sau ' + wait + ' giây' : 'Sẵn sàng · Bạn có lượt riêng';
        if (button) {
            button.disabled = busy || wait > 0 || frozen;
            button.textContent = wait ? 'Chờ ' + wait + ' giây' : 'Lăn xúc xắc · Lượt của bạn';
        }
        return;
    } let t = mapState?.turn || {}, own = t.cursor === state.id, left = Math.max(0, Math.ceil((t.deadline - now()) / 1000)), other = mapState?.peers.find(p => p.id === t.cursor); notice.textContent = state.effects?.freezeUntil > now() ? 'Đội đang đóng băng. Có thể mở kho Phá băng.' : own ? 'ĐẾN LƯỢT ĐỘI BẠN · ' + left + ' giây' : other ? 'Đang chờ ' + other.name + ' · ' + left + ' giây' : 'Các đội đang giải thử thách. Lượt mới sẽ tự xuất hiện.'; if (button) {
        button.disabled = busy || !own || left <= 0 || state.effects?.freezeUntil > now();
        button.textContent = own ? 'Lăn xúc xắc · ' + left + ' giây' : 'Chờ đến lượt';
    } }
    function updateClockRaceAbandon() { let b = document.getElementById('abandonButton'); if (!b || !state?.race)
        return; let left = Math.max(0, Math.ceil((state.race.entered + 90000 - now()) / 1000)); b.disabled = busy || left > 0 || state.effects?.freezeUntil > now(); b.textContent = left ? 'Có thể từ bỏ sau ' + left + ' giây' : 'Từ bỏ trạm · −80 điểm · +45 giây'; }
    function abandonButton() { let i = state.race.task; return i >= 1 && i <= 3 ? `<section class="abandon-panel"><p>Thử thách quá khó? Sau 90 giây tham gia, đội có thể từ bỏ để đi tiếp. Không nhận điểm của trạm; trừ tối đa 80 điểm hiện có và cộng 45 giây xếp hạng.</p><button id="abandonButton" class="danger" data-action="abandon">Từ bỏ trạm</button></section>` : '<p class="notice">Trạm xuất phát và trạm cứu hộ cuối bắt buộc giải đúng; không thể từ bỏ.</p>'; }
    function confirmAbandon() { dlg.dataset.kind = 'abandon'; dlg.innerHTML = `<h2>Từ bỏ trạm ${state.race.position}?</h2><p>Không nhận điểm trạm này; mất ${Math.min(80, state.score)} điểm và cộng 45 giây xếp hạng. Nhật ký dùng hàng đơn vị của vị trí cổng thay chữ số chưa tìm được.</p><div class="flex"><button data-action="close-hints">Tiếp tục giải</button><button class="danger" data-action="confirm-abandon">Xác nhận từ bỏ</button></div>`; if (!dlg.open)
        dlg.showModal(); }
    function freeCards() { return Math.max(0, (state.race?.cards || 0) - (state.effects?.history || []).filter(a => a.actor_id === state.id && a.cost === 0).length); }
    function journeyInventory() { return `<section class="journey"><h2>Nhật ký hành trình</h2><div class="journey-stations">${[0, 8, 16, 24, 32].map((cell, i) => { let o = state.race.outcomes[i]; return `<div class="${o ? o.skipped ? 'skipped' : 'restored' : i === state.race.task ? 'here' : ''}"><strong>Ô ${cell} · ${names[i]}</strong><span>${o ? o.bypassed ? 'Không gặp trạm · mã ' + o.digit : o.skipped ? 'Đã từ bỏ · mã ' + o.digit : 'Giải đúng · mã ' + o.digit : state.race.position >= cell ? 'Đang ở trạm' : 'Chưa đến'}</span></div>`; }).join('')}</div><p class="small">Cửa cuối dùng mã từ 5 dòng nhật ký; không yêu cầu giải đúng mọi trạm giữa.</p></section>`; }
    const encounterText = { points: 'Tiếp tế · +40 điểm', wind: 'Gió thuận · −30 giây xếp hạng', delay: 'Lạc đường · +30 giây xếp hạng', ice: 'Sương băng · Đóng băng 15 giây', math: 'Câu Toán thưởng · Đúng +40 điểm', card: 'Tiếp viện · +1 thẻ kỹ năng miễn phí' };
    function raceHistory(r) { return `<details id="race-history-${esc(r.id || 'self')}" class="race-history"><summary>Hành trình, sự kiện và các trạm đã từ bỏ</summary><p>${r.race.rolls} lượt lăn · Ô ${r.race.position}/32 · Gió thuận giảm ${time(r.race.timeBonus)} khi xếp hạng.</p>${r.events.filter(e => ['roll', 'encounter', 'abandon', 'bonus-answer', 'bonus-skip', 'math-found', 'bypass', 'reward', 'pact', 'community-result', 'pact-pass'].includes(e.type)).map(e => `<p>${time(e.at - Date.parse(r.start))} · ${e.type === 'roll' ? 'Xúc xắc ' + e.die + ' · Ô ' + e.from + ' → ' + e.to + (e.carry ? ' · Giữ ' + e.carry + ' bước dư' : '') : e.type === 'encounter' ? 'Ô ' + e.cell + ' · ' + encounterText[e.kind] : e.type === 'abandon' ? 'Từ bỏ trạm ' + [0, 8, 16, 24, 32][e.lock - 1] + ' · −' + e.pointsLost + ' điểm · +45 giây' : e.type === 'bypass' ? 'Không gặp trạm ' + [0, 8, 16, 24, 32][e.lock - 1] + ' · Nhận mã hành trình, không mất điểm' : e.type === 'reward' ? 'Nhận thưởng: ' + ({ points: 'điểm', time: 'giảm giờ xếp hạng', card: 'thẻ kỹ năng', steps: '2 bước', dice: 'xúc xắc thêm' }[e.choice]) : e.type === 'pact' ? 'Giao kèo: ' + ({ freeze: 'đóng băng 20 giây đổi thẻ', pass: 'bỏ 1 lượt đổi thẻ', delay: '+45 giây đổi 40 điểm' }[e.choice]) : e.type === 'community-result' ? 'Đua thuyền: ' + e.correct + '/6 câu đúng · Hạng ' + e.rank + ' · +' + e.points + ' điểm' : e.type === 'pact-pass' ? 'Trả giao kèo · Bỏ một lượt' : e.type === 'math-found' ? 'Gặp câu hỏi ở ô ' + e.cell : e.type === 'bonus-answer' ? 'Câu Toán: ' + (e.ok ? 'đúng · đủ điều kiện nhận thưởng ' + (e.points || 40) + ' điểm' : 'sai') : 'Bỏ câu thưởng'}</p>`).join('')}</details>`; }
    async function raceAction(kind, data = {}) { if (busy || !session)
        return; busy = true; updateClock(); try {
        let d = await api(kind, { id: session.id, ...data });
        apply(d);
        if (kind === 'roll') {
            toast(d.result.skipped ? 'Đã trả giao kèo: bỏ một lượt · Chờ 6 giây' : ('Xúc xắc ' + d.result.die + (d.result.extra ? ' + ' + d.result.extra : '') + ' · Đến ô ' + d.result.to + (state.race.encounters.at(-1)?.at === state.events.filter(e => e.type === 'roll').at(-1)?.at ? ' · ' + encounterText[state.race.encounters.at(-1).kind] : '')));
            screen = 'play';
        }
        if (kind === 'bonus')
            toast(data.skip ? 'Đã bỏ câu thưởng' : d.result.ok ? state.race.reward ? 'Đúng! Chọn phần thưởng cho đội.' : 'Đúng! Điểm đã cộng vào đội' : state.race.bonus?.done ? 'Câu này đã kết thúc' : 'Chưa đúng. Chờ 10 giây và kiểm tra lại.');
        render();
        if (kind === 'roll') {
            document.getElementById('diceFace')?.classList.add('dice-reveal');
        }
    }
    catch (e) {
        if (!endStudentSession(e)) {
            toast(e.message);
            await refresh(true);
        }
    }
    finally {
        busy = false;
        updateClock();
    } }
    function raceRules() { let c = (screen === 'teacher' ? board?.room.campaign : state?.race?.campaign || pendingCampaign); return `<section class="rules full-rules"><h2>Luật Mật Mã Đa Giới</h2><p>${theme().story} Mỗi đội chọn một linh vật, vượt cổng xuất phát, khám phá bản đồ và ghép mã cuối ở ô 32. ${c?.playMode === 'individual' ? 'Mỗi học sinh dùng một thiết bị, giấy nháp và bút; tự kiểm tra toàn bộ dữ kiện trước khi gửi.' : 'Nhóm 3–4 người dùng chung một thiết bị, giấy nháp và bút. Phân vai đọc hồ sơ, suy luận, kiểm tra, điều khiển; đổi vai sau mỗi trạm.'}</p><p class="notice">${c?.playMode === 'individual' ? 'CÁ NHÂN: mỗi em một thiết bị và một phiên chơi riêng, không chia vai. Lăn độc lập, cách nhau ít nhất 6 giây; không phải chờ cả lớp.' : 'THEO NHÓM: 3–4 em dùng chung một thiết bị, lăn lần lượt.'}</p>${c?.community === 'boat' ? communityRules() : ''}<ol><li><strong>Thời gian:</strong> cả lớp có 30 phút từ lúc giáo viên bắt đầu. Không dừng khi mất mạng, đóng băng hoặc tải lại. Đội vào muộn dùng thời gian còn lại.</li><li><strong>Linh vật và lượt:</strong> chọn trước khi bắt đầu; có thể trùng linh vật, tên và màu viền giúp phân biệt. ${c?.playMode === 'individual' ? 'Mỗi người lăn độc lập cách nhau ít nhất 6 giây. Giao kèo bỏ lượt thanh toán ở lần nhấn lăn đủ điều kiện kế tiếp, rồi chờ 6 giây.' : 'Mỗi đội di chuyển lăn một lần theo vòng, có 10 giây.'} Hết giờ tự bỏ lượt. Đội đang giải bài, xử lý câu thưởng, đóng băng hoặc đã kết thúc không giữ lượt và không tích lượt.</li><li><strong>Xúc xắc cân bằng:</strong> mỗi đội nhận một bộ gồm đủ 1, 2, 3, 4, 5, 6 theo thứ tự xáo trộn; hết bộ mới nhận bộ khác. Sáu lần lăn luôn được 21 bước. Đây là xúc xắc theo bộ, không phải sáu lần độc lập.</li><li><strong>Cổng và độ may rủi:</strong> xuất phát ô 0 và đích ô 32 bắt buộc. Trong ván có ma trận, mỗi đội rút riêng một bộ gồm 2 lần gặp và 1 lần đi qua ba trạm giữa 8, 16, 24; thứ tự xáo trộn. Tại mỗi trạm giữa, cơ hội gặp là 2/3; cả ván mọi đội đều gặp đúng 2 trạm giữa. Đội không gặp nhận chữ số hàng đơn vị của vị trí trạm, không được điểm và không bị phạt. Cổng đã được chỉ định phải dừng khi đi tới hoặc vượt qua; bước dư giữ lại. Mọi phần thưởng và kỹ năng di chuyển đều tuân thủ quy tắc này. Phòng cũ giữ luật gặp cả 5 cổng.</li><li><strong>Chọn độ khó:</strong> Dễ 100; Trung bình 200; Khá 350; Ác mộng 550; Địa ngục 800 điểm. Dữ kiện và ràng buộc khác nhau. Chọn một lần khi nhận đề; chỉ giải đúng toàn bộ mới nhận điểm. Bàn thử và thao tác lắp ống không phạt; nút Xác nhận mới gửi đáp án.</li><li><strong>Từ bỏ:</strong> ô 8, 16, 24 được từ bỏ sau ít nhất 90 giây tham gia. Không nhận điểm trạm, trừ 80 điểm còn lại (không âm), cộng 45 giây xếp hạng; trở lại vòng di chuyển. Ô 0 và 32 phải giải đúng, không từ bỏ. Khi từ bỏ dùng hàng đơn vị của vị trí cổng làm chữ số nhật ký. Cuối cùng ghép 5 chữ số theo thứ tự để mở cửa.</li><li><strong>Gợi ý giàn giáo:</strong> mở lần lượt 3 mức, tự cộng 1 / 2 / 3 phút xếp hạng và đóng băng 8 / 12 / 16 giây. Dùng đủ 3 là +6 phút. Đọc lại miễn phí; vẫn xem đề và bàn thử được. Gửi sai bài chính hoặc mã cửa cộng 1 phút, chờ 10 giây; không báo ô nào sai.</li><li><strong>Thử thách Toán trên đường:</strong> phòng có ma trận kiến thức nhận thêm 4 câu tại 4 ô ngẫu nhiên, một ô trên mỗi chặng. Đi tới hoặc đi ngang đều mở câu. Chủ đề và mức độ do giáo viên chọn; mỗi câu đúng cho quyền chọn phần thưởng trị giá 40 / 60 / 80 / 100 / 120 điểm. Điền số tối đa 2 lần, sai chờ 10 giây. Câu 4 phương án và bộ đúng/sai chỉ chốt 1 lần; sai kết thúc câu, không mở đáp án trong ván. Được bỏ không phạt. Nếu một lượt gặp nhiều câu, hệ thống xếp hàng và hiển thị lần lượt. Nhập số nguyên, số thập phân hoặc phân số a/b; các hình thức lựa chọn chỉ có một lần chốt để hạn chế dò đáp án. Các đội gặp cùng ma trận, dữ liệu khác nhau.</li><li><strong>Sáu sự kiện công bằng:</strong> đi ngang các mốc 4, 10, 14, 20, 26, 30 đều kích hoạt. Mỗi đội nhận cùng bộ 6 sự kiện, thứ tự xáo trộn: +40 điểm; −30 giây xếp hạng; +30 giây xếp hạng; đóng băng 15 giây; câu Toán thưởng đúng nhận điểm theo mức (phòng cũ +40); 1 thẻ kỹ năng miễn phí. Câu thưởng điền số tối đa 2 lần, lựa chọn chỉ 1 lần; sai chờ 10 giây; được bỏ không phạt. Bộ sự kiện không làm thay đổi đồng hồ 30 phút.</li><li><strong>Kỹ năng:</strong> sau khi giải xuất phát, Phá băng 20 điểm xóa đóng băng; Lá chắn 40 điểm bảo vệ 60 giây; Tiếp sức 30 điểm phá băng và bảo vệ đội khác 20 giây; Nhiễu 60 điểm đóng băng đội khác 20 giây. Thẻ miễn phí đổi một Lá chắn / Tiếp sức / Nhiễu. Phá băng không xóa phút phạt; lá chắn chặn Nhiễu đối thủ, không chặn hint hay sương băng.</li><li><strong>Chọn thưởng:</strong> sau câu trên đường giải đúng, chọn một: đủ 40–120 điểm; giảm 20–60 giây xếp hạng; 1 thẻ kỹ năng; thêm 2 bước vào lượt kế; hoặc thêm 1 viên xúc xắc vào lượt di chuyển kế tiếp. Chỉ nhận một lợi ích; không chen lượt, không vượt cổng được chỉ định.</li><li><strong>Kỹ năng di chuyển:</strong> Tối ưu lộ trình 50 điểm giảm 30 giây xếp hạng; Tiến thêm 45 điểm cộng 2 bước vào lượt kế; Xúc xắc kép 70 điểm cộng một viên vào lượt kế. Mỗi loại tối đa 2 lần/ván. Thẻ miễn phí không đổi các kỹ năng này.</li><li><strong>Giao kèo:</strong> sau xuất phát, tối đa 2 giao kèo/ván: tự đóng băng 20 giây đổi 1 thẻ; bỏ đúng 1 lượt di chuyển đủ điều kiện tiếp theo đổi 1 thẻ; hoặc cộng 45 giây xếp hạng đổi 40 điểm. Không thực hiện khi còn câu hỏi hoặc phần thưởng chưa xử lý. Có màn giải thích và xác nhận trước khi đổi.</li><li><strong>Chơi khăm có giới hạn:</strong> chỉ tác động đội đang chơi; Nhiễu chỉ nhắm đội đã qua xuất phát. Mỗi đội gây và nhận tối đa 2 lần Nhiễu; hai lần gây cách nhau 60 giây. Sau bị Nhiễu được bảo vệ 60 giây. Không xóa đáp án, bản nháp, không đẩy lùi hoặc vượt cổng. Mua thất bại không trừ điểm.</li><li><strong>Xếp hạng:</strong> đội mở cửa hợp lệ xếp trên đội chưa về đích. Giữa đội về đích: điểm còn lại cao hơn thắng; bằng điểm so thời gian thực + các khoản phạt − gió thuận, nhỏ hơn thắng. Đội chưa về đích so vị trí, số trạm giải đúng, điểm rồi thời gian điều chỉnh. Điểm tiêu cho kỹ năng và từ bỏ làm giảm điểm xếp hạng.</li><li><strong>Kết nối và trợ giúp:</strong> dùng lại thiết bị đã vào. Chờ máy chủ xác nhận trước khi rời trang. Giáo viên có bản đồ chung, nội dung đang làm, bản nháp, đáp án và lời giải, lịch sử sự kiện, hint, kỹ năng, kết quả và CSV. Trong mọi màn có thể mở lại Luật & hướng dẫn; chọn Giảm hiệu ứng nếu cần.</li></ol></section>`; }
    function groupReport() { let r = G.report(state, now()); if (state.race) {
        r.race = state.race;
        r.completed = state.race.outcomes.filter(o => !o.skipped).length;
    } return r; }
    function recordResult() { }
    function result() { let r = groupReport(); let h = r.hints.reduce((a, b) => a + b, 0); return `${header()}<main class="result"><div class="eyebrow">Hồ sơ nhiệm vụ · ${esc(r.team)}</div><h1>${r.status === 'completed' ? 'Đã mở cửa an toàn.' : 'Hành trình đã hết giờ.'}</h1><p class="muted">${r.status === 'completed' ? 'Đội đã hoàn thành mục tiêu hành trình.' : 'Đội đã khôi phục ' + r.completed + '/5 hệ thống. Kết quả và lịch sử gợi ý đã được chốt.'}</p><div class="metrics"><div class="metric">Thời gian thực chơi<strong>${time(r.elapsedMs)}</strong></div><div class="metric">Tổng thời gian phạt<strong>+${time(r.penaltyMs)}</strong></div><div class="metric">Thời gian xếp hạng<strong>${time(r.adjustedMs)}</strong></div></div><p><strong>${state.score || 0} điểm còn lại</strong> · Kiếm được ${state.effects?.earned ?? state.score ?? 0}, đã tiêu ${state.effects?.spent || 0}, trừ do từ bỏ ${state.effects?.lost || 0}</p><p><strong>${state.score || 0} điểm</strong> · <strong>${h} mức gợi ý</strong> đã mở · <strong>${r.wrong} lượt gửi sai</strong> · <strong>${r.completed}/5 khóa</strong>.</p><div class="log tablewrap"><table><thead><tr><th>Khóa</th><th>Mức gợi ý đã dùng</th><th>Phạt do gợi ý</th></tr></thead><tbody>${names.map((n, i) => `<tr><td>${i + 1}. ${n}</td><td>${r.hints[i] === 0 ? 'Không dùng' : Array.from({ length: r.hints[i] }, (_, j) => j + 1).join(', ')}</td><td>+${time(G.HINT_COST.slice(0, r.hints[i]).reduce((a, b) => a + b, 0))}</td></tr>`).join('')}<tr><td colspan="2">${r.wrong} lượt gửi sai × 1 phút</td><td>+${time(r.wrong * G.WRONG_COST)}</td></tr></tbody></table></div><div class="flex"><button class="primary" data-action="download">Tải báo cáo nhóm (.json)</button><button data-action="print">In / Lưu PDF</button><button class="ghost" data-action="new">Tạo phiên mới</button></div><p class="small muted" style="margin-top:25px">Kết quả đã được ghi nhận tự động trên bảng giáo viên. Tệp báo cáo là bản sao để lưu lại; không cần gửi tệp để tính phạt hoặc xếp hạng.</p>${state.race ? raceHistory({ race: state.race, events: state.events, start: new Date(state.start).toISOString() }) : ''}${personalSkills()}<details><summary>Nhật ký tự động</summary><div class="tablewrap"><table><thead><tr><th>Thời điểm</th><th>Sự kiện</th><th>Phạt</th></tr></thead><tbody>${r.events.filter(e => !['roll', 'encounter', 'abandon', 'ice', 'bonus-answer', 'bonus-skip', 'math-found', 'bypass', 'reward', 'pact', 'community-result', 'pact-pass'].includes(e.type)).map(e => `<tr><td>${time(e.at - state.start)}</td><td>${e.type === 'hint' ? `Khóa ${e.lock} · Mở mức gợi ý ${e.level}` : e.type === 'wrong' ? `Gửi sai · ${e.lock === 6 ? 'Cửa thoát' : 'Khóa ' + e.lock}` : e.type === 'solved' ? `Đã mở khóa ${e.lock}` : e.type === 'timeout' ? 'Hết 30 phút' : e.type === 'level' ? 'Khóa ' + e.lock + ' · Chọn ' + levelNames[e.level] : 'Đã mở cửa thoát'}</td><td>${e.cost ? '+' + time(e.cost) : '—'}</td></tr>`).join('')}</tbody></table></div></details></main>`; }
    function hintDialog() { dlg.dataset.kind = 'hint'; let i = state.solved.length; if (i >= 5 || state.status !== 'active')
        return; let opened = state.hints[i].length, hs = state.hintTexts[i]; dlg.innerHTML = `<button class="close ghost" data-action="close-hints" aria-label="Đóng gợi ý">×</button><div class="eyebrow">Hỗ trợ giàn giáo · Khóa ${i + 1}</div><h2 id="hintTitle">Gợi ý: ${names[i].toLowerCase()}</h2><p class="muted small">Mức 3 chỉ hướng dẫn bước cuối; bạn vẫn tự nhập đáp án. Giải đúng với hỗ trợ nhận 50% điểm.</p>${hs.map((h, j) => `<section class="hint-card"><b>MỨC ${j + 1} · ${j === 2 ? 'BƯỚC CUỐI · 50% ĐIỂM' : 'ĐÃ MỞ'}</b><p>${h}</p></section>`).join('')}${opened < 3 ? `<section class="hint-card"><p class="muted">${['Mức 1 nhắc kiến thức cần dùng.', 'Mức 2 chỉ đường và bước giải đầu tiên.', 'Mức 3 hướng dẫn kiểm tra bước cuối.'][opened]}</p><button class="primary" data-action="buy-hint">Mở mức ${opened + 1} · ${state.supportPolicy === 'practice' ? 'Không phạt' : 'Phạt ' + (opened + 1) + ' phút'}</button></section>` : '<p class="muted">Đã mở đủ ba mức ở khóa này. Hãy tự nhập đáp án.</p>'}<p class="cost">Phạt hỗ trợ: +${time(state.recovery?.supportPenalty || 0)} · Tổng phạt của đội: +${time(state.penalty)}</p>`; if (!dlg.open)
        dlg.showModal(); }
    function sorted() { const m=reports.find(r=>r.mode)?.mode; if(m){const rank=new Map(m.ranking.map(x=>[x.unitId,x.rank]));return reports.slice().sort((a,b)=>(rank.get(a.mode?.unitId)??Infinity)-(rank.get(b.mode?.unitId)??Infinity)||a.id.localeCompare(b.id));} if (board?.map)
        return reports.slice().sort((a, b) => { let af = a.status === 'completed', bf = b.status === 'completed'; if (af !== bf)
            return af ? -1 : 1; if (af)
            return (b.score || 0) - (a.score || 0) || a.adjustedMs - b.adjustedMs || a.id.localeCompare(b.id); return (b.race?.position || 0) - (a.race?.position || 0) || b.completed - a.completed || (b.score || 0) - (a.score || 0) || a.adjustedMs - b.adjustedMs || a.id.localeCompare(b.id); }); return reports.slice().sort((a, b) => { if (a.completed !== b.completed)
        return b.completed - a.completed; if ((a.score || 0) !== (b.score || 0))
        return (b.score || 0) - (a.score || 0); let status = { completed: 0, active: 1, timeout: 2, waiting: 3 }; return status[a.status] - status[b.status] || (a.status !== 'completed' ? b.completed - a.completed : 0) || a.adjustedMs - b.adjustedMs; }); }
    const inputLabels = { circuit: 'Hướng các khớp ống', countA: 'Lời đúng nếu ở A', countB: 'Lời đúng nếu ở B', countC: 'Lời đúng nếu ở C', cabinet: 'Tủ', digit: 'Chữ số', intersection: 'Giao A ∩ B', union: 'Số phần tử hợp', difference: 'Số phần tử hiệu', x: 'Máy phát x', y: 'Đèn y', power: 'Số pin', rejected: 'Pin nếu tăng x', periodA: 'Chu kỳ A', periodB: 'Chu kỳ B', joint: 'Thời điểm đồng bộ', sum: 'Tổng chữ số', channel: 'Kênh n', excluded: 'Số bị loại', connected: 'Q', code: 'Mã cửa' };
    function inputsText(v) { return Object.entries(v || {}).map(([k, x]) => `${esc(inputLabels[k] || k)}: <strong>${esc(x || '—')}</strong>`).join(' · ') || 'Chưa nhập câu trả lời.'; }
    function teamDetail(r) { if(r.mode)return modeTeamDetail(r); let active = Math.min(r.race?.task ?? r.completed, 5), finished = ['completed', 'timeout'].includes(r.status), rank = sorted().findIndex(x => x.id === r.id) + 1; return `<details class="team-detail" id="team-${esc(r.id)}"><summary><strong>${esc(r.team)}</strong> · ${finished ? 'Kết quả chi tiết' : r.bonusGuide && !r.bonusGuide.done ? 'Đang giải câu Toán thưởng' : r.race?.phase === 'travel' ? 'Di chuyển · Ô ' + r.race.position : r.status === 'waiting' ? 'Đang chờ' : r.levels && r.levels[active] === null ? 'Đang chọn mức độ cho khóa ' + (active + 1) : active === 5 ? 'Đang nhập mã cửa' : 'Đang làm khóa ' + (active + 1) + ' · ' + names[active]}${finished ? ' · Hạng ' + rank : ''}</summary><div class="detail-body"><p>${r.status === 'completed' ? 'Đã thoát' : r.status === 'timeout' ? 'Hết giờ' : r.status === 'waiting' ? 'Chờ giáo viên bắt đầu' : 'Đang chơi'} · ${r.completed}/5 khóa · ${r.score || 0} điểm · Thực chơi ${time(r.elapsedMs)} · Phạt +${time(r.penaltyMs)} · Xếp hạng ${time(r.adjustedMs)}</p>${!finished && r.bonusGuide && !r.bonusGuide.done ? `<section class="notice"><strong>Câu Toán thưởng đang làm</strong><p>${mathText(r.bonusGuide.question)}</p><p>Bản nháp: ${esc(r.drafts.bonus?.answer || 'Chưa nhập')}</p><p><strong>Đáp án cho giáo viên:</strong> ${r.bonusGuide.answer}.</p><ol>${(r.bonusGuide.steps?.length ? r.bonusGuide.steps : ['Chuyển số hạng tự do sang vế phải, rồi chia hai vế cho hệ số của x.']).map(x => `<li>${mathText(x)}</li>`).join('')}</ol><p></p></section>` : !finished && r.status === 'active' ? `<section class="notice"><strong>Nội dung nhóm đang làm: ${r.race?.phase === 'travel' ? 'Đang di chuyển trên bản đồ' : active === 5 ? 'Cửa thoát' : r.guide[active].title}</strong>${r.race?.phase === 'travel' ? '<p>Chờ lượt xúc xắc hoặc xử lý sự kiện.</p>' : active === 5 ? '<p>Ghép năm chữ số từ khóa 1 đến khóa 5 để mở cửa.</p>' : r.guide[active].question.map(q => `<p>${mathText(q)}</p>`).join('')}<p>Bản nháp đang nhập: ${inputsText(r.drafts[active])}</p></section>` : ''}<p>Điểm kiếm được: ${r.effects?.earned ?? r.score ?? 0} · Đã tiêu: ${r.effects?.spent || 0} · Trừ do từ bỏ: ${r.effects?.lost || 0} · Còn lại: ${r.score || 0}. ${r.effects?.freezeUntil > now() ? 'Đang đóng băng, còn ' + time(r.effects.freezeUntil - now()) : ''}</p><h2>Đề, đáp án và lời giải theo phiên của nhóm</h2>${r.guide.map((g, i) => { let ev = r.events.filter(e => e.lock === i + 1), solved = ev.find(e => e.type === 'solved'), abandoned = ev.find(e => e.type === 'abandon'), wrong = ev.filter(e => e.type === 'wrong').length, hintCost = G.HINT_COST.slice(0, r.hints[i]).reduce((a, b) => a + b, 0), start = i === 0 ? Date.parse(r.start) : r.race ? r.events.find(e => e.type === 'roll' && e.to === [0, 8, 16, 24, 32][i])?.at : r.events.find(e => e.type === 'solved' && e.lock === i)?.at; return `<details id="guide-${esc(r.id)}-${i}" class="guide-lock"><summary>Khóa ${i + 1}: ${esc(g.title)} · ${solved ? 'Đã mở' : abandoned ? 'Đã từ bỏ' : finished ? 'Chưa mở' : 'Chưa hoàn tất'}</summary><div class="detail-body">${g.question.map(q => `<p>${mathText(q)}</p>`).join('')}<p>${r.levels && r.levels[i] !== null ? levelNames[r.levels[i]] + ' · ' + levelPoints[r.levels[i]] + ' điểm' : 'Phiên gốc'}</p><p class="solution-answer"><strong>Đáp án:</strong> ${esc(g.answer)} · Chữ số ${g.digit}</p><ol>${g.steps.map(x => `<li>${mathText(x)}</li>`).join('')}</ol><p>Hint: ${r.hints[i]}/3 · Gửi sai: ${wrong} · Phạt khóa: +${time(hintCost + wrong * 60000)}${solved && start ? ' · Thời gian giải: ' + time(solved.at - start) : ''}</p><p>Câu trả lời gần nhất: ${inputsText(r.drafts[i])}</p></div></details>`; }).join('')}${r.race ? raceHistory(r) : ''}${teacherMathHistory(r)}${teacherSkills(r)}<p><strong>Mã cửa đúng:</strong> ${r.race?.outcomes.length === 5 ? r.race.doorDigits.join('') : r.race ? 'Chưa đủ nhật ký' : r.guide.map(g => g.digit).join('')}</p><details id="attempts-${esc(r.id)}"><summary>Lịch sử câu trả lời đã gửi (${r.submissions.length})</summary><div class="tablewrap"><table><thead><tr><th>Thời điểm</th><th>Khóa</th><th>Câu trả lời</th><th>Kết quả</th></tr></thead><tbody>${r.submissions.map(a => `<tr><td>${time(a.at - Date.parse(r.start))}</td><td>${a.lock === 6 ? 'Cửa thoát' : a.lock}</td><td>${inputsText(a.input)}</td><td>${a.ok ? 'Đúng' : 'Sai · +1 phút'}</td></tr>`).join('')}</tbody></table>${r.submissions.length ? '' : '<p>Các lượt gửi trước bản cập nhật này chưa lưu nội dung; lịch sử hint và phạt vẫn được giữ.</p>'}</div></details></div></details>`; }
    function teacherMathHistory(r) { return r.mathHistory?.length ? `<section class="math-history"><h2>Các câu Toán đã gặp</h2>${r.mathHistory.map(q => `<details class="guide-lock" id="math-${esc(r.id)}-${q.serial}"><summary>${esc(q.topicName)} · ${levelNames[q.level]} · ${q.points} điểm · ${q.done ? 'Đã xử lý' : 'Đang chờ'}</summary><div class="detail-body"><p>${mathText(q.question)}</p><p><strong>Đáp án:</strong> ${q.answer}</p><ol>${q.steps.map(x => `<li>${mathText(x)}</li>`).join('')}</ol><p>${q.attempts}/${q.maxAttempts || 2} lượt gửi</p></div></details>`).join('')}</section>` : ''; }
     function teacher() { if(teacherSession && board?.room?.campaign?.rule && board.room.campaign.rule !== 'campaign') return modeTeacherPage(); let ready = reports.length, role = teacherSession?.role || 'owner', canManage = role === 'owner' || role === 'root', canHost = canManage || role === 'cohost'; return `${header()}<main class="teacher"><div class="eyebrow">Giáo viên · Điều phối ván chơi</div><h1>Chiến dịch của lớp.</h1>${roomPicker()}<p class="muted">Tiến độ, hint và thời gian phạt được ghi trên máy chủ. Bảng tự cập nhật mỗi 3 giây.</p>${!teacherSession ? (
  !window.hostIdentity || (!window.hostIdentity.user && !window.hostIdentity.configured) ? '<div class="empty-state"><h3>Yêu cầu đăng nhập</h3><p>Vui lòng đăng nhập để tạo hoặc quản lý phòng.</p><a href="/signin-with-chatgpt" class="primary button" target="_top">Sign in</a></div>'
  : window.hostIdentity.revoked ? '<div class="empty-state"><h3>Quyền bị thu hồi</h3><p>Tài khoản của bạn đã bị thu hồi quyền tạo phòng. Liên hệ quản trị viên.</p><a href="/hosts#host-permissions" class="button">Quản lý quyền</a></div>'
  : !window.hostIdentity.user ? '<div class="empty-state"><h3>Yêu cầu đăng nhập</h3><p>Đăng nhập để tạo phòng riêng cho lớp của bạn.</p><a href="/signin-with-chatgpt" class="primary button" target="_top">Sign in</a></div>'
  : '<form id="roomForm" class="upload"><label for="roomTitle">Tên buổi chơi</label><input id="roomTitle" name="roomTitle" value="Mật Mã Đa Giới" maxlength="60" required>' + campaignSetup() + '<button class="primary">Tạo phòng · Sinh ván chơi</button></form>'
) : '<section class="rules"><h2>' + esc(board?.room.title || teacherSession.title || 'Phòng cứu hộ') + '</h2><div class="eyebrow">MÃ PHÒNG HỌC SINH · LƯỢT ' + (board?.room.round || 1) + '</div><div class="flex"><strong style="font-size:42px;letter-spacing:.12em;color:var(--gold)">' + esc(board?.room.code || teacherSession.code) + '</strong><span>' + ready + ' ' + (board?.room.campaign?.playMode === 'individual' ? 'học sinh' : 'nhóm') + ' đã vào</span><button class="primary" data-action="begin-room" ' + (board?.room.started || !ready || !canHost ? 'disabled' : '') + '>' + (board?.room.started ? 'Nhiệm vụ đang chạy' : 'Bắt đầu đồng hồ cho cả lớp') + '</button></div><p class="small muted" style="margin:20px 0 0">Cung cấp mã phòng và trang học sinh. Chờ các đội vào đủ rồi bắt đầu. Nhóm vào muộn dùng thời gian còn lại của lớp.</p></section><div class="flex"><button data-action="csv" ' + (ready ? '' : 'disabled') + '>Tải bảng xếp hạng CSV</button>' + (canManage ? '<button data-action="create-another-room">Tạo phòng khác</button>' : '') + '<button data-action="reset-room" ' + (!board || !canHost ? 'disabled' : '') + '>Reset phòng · Chơi lại</button>' + (canManage ? '<button class="danger" data-action="delete-room" ' + (!board ? 'disabled' : '') + '>Xóa phòng</button>' : '') + '<a href="/?code=' + encodeURIComponent(board?.room.code||teacherSession?.code||'') + '" target="_blank" rel="noopener">Mở trang học sinh</a></div><p id="boardStatus" class="small muted" role="status">Đang tự cập nhật từ máy chủ.</p>' + campaignSummary(board?.room.campaign) + gameActivityHostControls() + (window.SignalGameActivities?.render(board?.classActivity,true)||'') + modeTeacherBoard() + teacherRecoveryBoard() + (board?.community ? communityPanel(true) : '') + (board?.map ? raceMap(false, board.map) : '') + '<section class="tablewrap"><table><thead><tr><th>Hạng</th><th>Người chơi</th><th>Trạng thái</th><th>Khóa</th><th>Thực chơi</th><th>Phạt</th><th>Xếp hạng</th><th>Hint / khóa</th><th>Sai</th><th>Quản lý</th></tr></thead><tbody>' + sorted().map((r, i) => '<tr><td>' + (r.status === 'waiting' ? '—' : sorted().findIndex(x => x.id === r.id) + 1) + '</td><td>' + esc(r.team) + '<br><strong>' + (r.score || 0) + ' điểm</strong></td><td>' + (r.status === 'completed' ? 'Đã thoát' : r.status === 'waiting' ? 'Chờ bắt đầu' : r.status === 'timeout' ? 'Hết giờ' : 'Đang chơi') + '</td><td>' + (r.race ? 'Ô ' + r.race.position + '/32 · ' : '') + r.completed + '/5 giải đúng</td><td>' + time(r.elapsedMs) + '</td><td>+' + time(r.penaltyMs) + '</td><td>' + (r.status === 'waiting' ? '—' : time(r.adjustedMs)) + '</td><td>' + r.hints.join(' / ') + '</td><td>' + r.wrong + '</td><td>' + (canManage ? '<button class="danger" data-action="remove-team" data-team="' + esc(r.id) + '" aria-label="Xóa đội ' + esc(r.team) + '">Xóa đội</button>' : '') + '</td></tr>').join('') + '</tbody></table>' + (ready ? '' : '<div class="empty-state">Chưa có đội nào vào. Cung cấp mã phòng cho các nhóm.</div>') + '</section><section class="team-dossiers"><h2>Hồ sơ từng người chơi</h2><p class="muted">Mở tên nhóm để xem đề đang làm, bản nháp, đáp án và lời giải. Tự cập nhật mỗi 3 giây. Giữ màn hình này riêng cho giáo viên khi học sinh đang chơi.</p>' + sorted().map(teamDetail).join('') + '</section>'}<section class="notice"><strong>Cách tổ chức:</strong> ${board?.room.campaign?.playMode === 'individual' ? 'mỗi học sinh một thiết bị; vào cùng mã phòng, dùng tên riêng để phân biệt.' : 'nhóm 3–4 học sinh dùng chung một thiết bị.'} Game yêu cầu nhập cả kết quả và dữ kiện trung gian; giáo viên yêu cầu nhóm trình bày cách giải khóa khó nhất khi tổng kết. Khuyến nghị 3 phút phân vai, 30 phút chơi, 7 phút tổng kết.</section><details><summary>Quy tắc phạt và xếp hạng</summary><p>Mỗi mức gợi ý được tính đúng một lần: mức 1 +1 phút, mức 2 +2 phút, mức 3 +3 phút. Gửi sai +1 phút và chờ 10 giây. Phòng cuộc đua: đội mở cửa hợp lệ xếp trước, rồi điểm còn lại giảm dần, rồi thời gian thực cộng phạt trừ gia tốc tăng dần. Phòng thi đang chơi giữ luật số khóa, điểm, thời gian. Nhóm chưa hoàn tất hiển thị số khóa đã mở. Thời gian phạt không trừ thời gian thực còn lại.</p></details><p class="small muted">Quyền quản lý phòng được lưu trên máy chủ theo tài khoản, hoặc trên trình duyệt nếu dùng phiên bản cũ. Học sinh chỉ cần mã phòng. Không cung cấp quyền quản lý hoặc dùng chung thiết bị giáo viên với học sinh.</p></main>`; }
     const modeObjectives={duel:'Đấu đối đầu theo lượt đồng thời',zones:'Chiếm và giữ khu vực',survival:'Giữ đội trong vùng an toàn',escort:'Sửa đường và hộ tống đoàn xe',treasure:'Thu thập mảnh kho báu',relay:'Giải và bàn giao đủ chặng',lockdown:'Cấp điện và mở từng phòng',merchant:'Giao dịch và hoàn thành hợp đồng'};
     const modeActionLabels={duel:{answer:'Chốt đáp án'},zones:{capture:'Chiếm khu vực',defend:'Phòng thủ',objective:'Mục tiêu chung'},survival:{objective:'Mục tiêu',move:'Di chuyển',recover:'Hồi phục'},escort:{advance:'Tiến đoàn',repair:'Sửa đường',fuel:'Nạp nhiên liệu'},treasure:{clue:'Mở manh mối',choose:'Chọn tuyến',dig:'Đào kho báu',assemble:'Ghép bộ mã'},relay:{solve:'Giải chặng',handoff:'Bàn giao'},lockdown:{power:'Cấp điện',unlock:'Mở phòng'},merchant:{earn:'Kiếm tài nguyên',buy:'Mua',sell:'Bán',contract:'Nhận hợp đồng'}};
     const modeParticipationLabels={group:'nhóm',individual:'cá nhân',pairs:'đấu đôi'};
     function modePlayerSummary(m,u,p){ if(!p)return 'Chưa có tiến trình'; let r=m.rule; if(r==='duel')return `Vòng ${p.matchPoints||0} điểm · ${p.correct||0} câu đúng`; if(r==='zones')return `${p.correct||0} câu đúng`; if(r==='survival')return `Năng lượng ${p.energy??0} · ${p.rounds||0} vòng`; if(r==='escort')return `${p.distance||0} m · Nhiên liệu ${p.fuel||0}`; if(r==='treasure')return `${p.sets||0} bộ mã · ${p.correct||0} câu đúng`; if(r==='relay')return `${p.legs||0} chặng · ${p.points||0} điểm`; if(r==='lockdown')return `Phòng ${p.room||0}/4 · ${p.points||0} điểm`; if(r==='merchant')return `${p.contracts||0} hợp đồng · ${p.coins||0} xu`; return 'Đang cập nhật'; }
     function modeTeamDetail(r){ let m=r.mode,p=m?.players?.[m.unitId]||m?.objective; return `<details class="team-detail" id="mode-team-${esc(r.id)}"><summary><strong>${esc(r.team)}</strong> · ${esc(modeObjectives[m.rule]||m.rule)} · ${modePlayerSummary(m,m.units?.find(u=>u.id===m.unitId),p)}</summary><div class="detail-body"><p>${m.finished?'Đã kết thúc':m.paused?'Đang tạm dừng':r.status==='waiting'?'Đang chờ bắt đầu':'Đang chơi'} · Hình thức ${esc(modeParticipationLabels[m.participation]||m.participation||'lớp')}</p><p><strong>Mục tiêu:</strong> ${esc(modeObjectives[m.rule]||m.rule)}.</p><p><strong>Tiến trình:</strong> ${esc(modePlayerSummary(m,m.units?.find(u=>u.id===m.unitId),p))}.</p><p><strong>Thành viên:</strong> ${(m.units?.find(u=>u.id===m.unitId)?.members||[]).map(x=>esc(x.name)+(x.present===false?' (đã rời)':'')).join(' · ')||'Chưa có dữ liệu'}.</p>${m.challenge&&!m.challenge.used?`<section class="notice"><strong>Câu Toán đang mở:</strong><p>${mathText(m.challenge.prompt)}</p><p>Học sinh tự chốt đáp án; lời giải chỉ hiện ở bảng giáo viên sau khi gửi.</p></section>`:''}<details><summary>Nhật ký hành động (${m.history?.length||0})</summary>${(m.history||[]).map(e=>`<p>${esc(e.type||'hành động')} · ${esc(e.unitId||'')} · ${esc(e.result?.ok===false?'chưa đạt':'đã ghi nhận')}</p>`).join('')||'<p>Chưa có hành động.</p>'}</details></div></details>`; }
    function modeTeacherBoard(){return window.ModeClassroom?.teacher?window.ModeClassroom.teacher(board,reports,{esc,mathText,time}):'';}
    function modeTeacherPage(){
        const role=teacherSession.role||'owner',manage=['owner','root'].includes(role),host=manage||role==='cohost',room=board.room;
        return `${header()}<main class="teacher"><div class="eyebrow">GIÁO VIÊN · ĐIỀU PHỐI VÁN CHƠI</div><h1>${esc(room.title)}</h1>${roomPicker()}<section class="rules"><div class="eyebrow">MÃ PHÒNG · LƯỢT ${room.round}</div><h2>${esc(room.code)}</h2><p>${reports.length} thiết bị đã vào · ${esc(modeParticipationLabels[room.campaign.participation])}</p><div class="flex"><button class="primary" data-action="begin-room" ${room.started||!reports.length||!host?'disabled':''}>${room.started?'Ván đang chạy':'Bắt đầu ván'}</button><button data-action="csv" ${!reports.length?'disabled':''}>Tải kết quả CSV</button>${manage?'<button data-action="create-another-room">Tạo phòng khác</button>':''}<button data-action="reset-room" ${!host?'disabled':''}>Chơi lại phòng</button>${manage?'<button class="danger" data-action="delete-room">Xóa phòng</button>':''}<a href="/?code=${encodeURIComponent(room.code)}" target="_blank" rel="noopener">Mở trang học sinh</a></div><p id="boardStatus" role="status">Tự cập nhật mỗi 3 giây.</p>${host&&room.started&&room.campaign.theme==='historical'?'<button data-action="host-arena">Mở Lôi Đài Ngũ Ấn</button>':''}</section>${gameActivityHostControls()}${window.SignalGameActivities?.render(board.classActivity,true)||''}${board.arena?arenaPanel(true):''}${board.community?communityPanel(true):''}${modeTeacherBoard()}${manage?`<details><summary>Quản lý thiết bị trong phòng</summary>${reports.map(r=>`<p>${esc(r.team)} <button class="danger" data-action="remove-team" data-team="${esc(r.id)}">Cho thiết bị rời phòng</button></p>`).join('')}</details>`:''}<p>Điểm của cặp hoặc nhóm thuộc đơn vị dùng chung thiết bị. Lịch sử ghi người điều khiển tại từng lượt, không suy diễn thành điểm cá nhân.</p></main>`;
    }
    function modeScreen(){const m=state.mode;return `${header()}<main class=\"setup\">${currentRoomRules()}${window.ModeClassroom?.student?window.ModeClassroom.student(m,{esc,mathText,time,now:()=>m.gameNow}):'<p class="notice">Đang tải màn hình luật ván…</p>'}</main>`;}
    document.addEventListener('click',async e=>{
        const button=e.target.closest('[data-mode-send]');if(!button||busy||!state?.mode)return;
        const m=state.mode,type=button.dataset.modeSend,unit=m.units.find(x=>x.id===m.unitId),number=Number(document.getElementById('mode-number')?.value),choice=document.getElementById('mode-choice')?.value;
        const math={duel:['answer'],zones:['capture','defend','objective'],survival:['objective','recover'],escort:['repair','fuel'],treasure:['clue','dig'],relay:['solve'],lockdown:['power'],merchant:['earn']};
        let modeAction={type},action='mode-progress';
        if(type==='tick')action='mode-tick';
        else if(type==='answer'&&m.challenge&&!m.challenge.used)modeAction=m.challenge.action;
        else {if(math[m.rule].includes(type))action='mode-issue';if(m.rule==='relay')modeAction.learnerId=unit.controller;if(['capture','defend'].includes(type))modeAction.zone=number;if(type==='move')modeAction.position=number;if(type==='choose')modeAction.branch=choice;if(['buy','sell'].includes(type)){modeAction.item=choice;modeAction.quantity=number;}if(type==='unlock'){modeAction.roomType=m.room.type;Object.assign(modeAction,window.ModeClassroom.readUnlock(m,document));}}
        busy=true;try{const d=await api(action,{id:session.id,modeAction,challengeId:m.challenge?.id,answer:window.ModeClassroom.readAnswer(m,document),revision:m.revision,deadline:wallNow()+15000});state.mode=d.mode;render();}catch(err){toast(err.message);await refresh(true);}finally{busy=false;}
    });
    let gameActivityDraft = {key:'',value:''};
    function updateGameActivityClock(){const a=screen==='teacher'?board?.classActivity:state?.classActivity;if(!a)return;const target=a.phase==='countdown'?a.startAt:a.phase==='playing'?a.finishAt:a.resumeAt;const el=root.querySelector('[data-game-activity-clock]');if(el)el.textContent=Math.max(0,Math.ceil((target-wallNow())/1000))+' giây';}
    function gameActivityKey(){const a=state?.classActivity;return a?JSON.stringify([a.id,a.phase,a.own?.step,a.own?.task?.id,a.own?.canAnswer,a.own?.canPick,a.own?.buzzer,a.own?.score,a.progress,a.teams]):'';}
    function gameActivityHostControls(){const c=board?.room?.campaign,type=c?.community;if(!teacherSession||!['owner','root','cohost'].includes(teacherSession.role||'owner')||!board?.room?.started||!Object.hasOwn(window.SignalGameActivities?.rules||{},type))return '';return `<section class="notice"><h3>Hoạt động chung: ${esc(window.SignalGameSetup.label(type))}</h3><p>${esc(window.SignalGameActivities.rules[type])} Ván chính tạm dừng trong hoạt động, rồi trở lại đúng tiến độ.</p><button type="button" data-game-activity-action="open" data-event-type="${esc(type)}" ${board.classActivity&&board.classActivity.phase!=='done'?'disabled':''}>Mở hoạt động cho lớp</button></section>`;}
    async function sendGameActivity(action,extra={}){if(busy)return;const event=screen==='teacher'?board?.classActivity:state?.classActivity,hostAction=action==='open'||action==='finish';busy=true;try{const target=hostAction?teacherSession:session;if(!target)return;await api(hostAction?(action==='open'?'class-event-open':'class-event-finish'):'class-event-action',{id:target.id,round:hostAction?board.room.round:state.round,eventId:event?.id,requestId:crypto.randomUUID(),...(hostAction?{}:{eventAction:action,step:event?.own?.step}),...extra},target.token);if(hostAction)await fetchBoard();else await refresh(true);render();}catch(err){toast(err.message);if(screen==='teacher')await fetchBoard();else await refresh(true);}finally{busy=false;}}
    document.addEventListener('click',e=>{const b=e.target.closest('[data-game-activity-action]');if(!b||b.disabled||b.dataset.gameActivityAction==='answer')return;sendGameActivity(b.dataset.gameActivityAction,{cellId:b.dataset.cellId,type:b.dataset.eventType});});
    document.addEventListener('input',e=>{if(e.target.closest('[data-game-activity-action=answer]'))gameActivityDraft={key:(state?.classActivity?.id||'')+':'+state?.classActivity?.own?.step,value:e.target.value};});
    document.addEventListener('submit',e=>{if(!e.target.matches('[data-game-activity-action=answer]'))return;e.preventDefault();const answer=new FormData(e.target).get('answer');sendGameActivity('answer',{answer});});
    function render() { names = (screen === 'teacher' ? board?.room.campaign : state?.race?.campaign) ? ['Lời khai', 'Xếp lịch', 'Đường ống', 'Nhịp tín hiệu', 'Phản ví dụ'] : ['Lời khai', 'Thẻ truy cập', 'Nguồn điện', 'Bộ mã', 'Kênh cứu hộ']; document.body.dataset.world = (screen === 'teacher' ? board?.room.campaign : (state?.campaign || state?.race?.campaign || pendingCampaign))?.theme || 'modern'; let opened = [...root.querySelectorAll('details[open][id]')].map(e => e.id); if (screen === 'teacher')
        root.innerHTML = teacher();
    else if (state?.classActivity && state.classActivity.phase !== 'done')
        root.innerHTML = header() + '<main class="play game-activity-screen">' + window.SignalGameActivities.render(state.classActivity) + '</main>';
    else if (arenaRunning() && state)
        root.innerHTML = arenaScreen();
    else if (communityRunning() && state)
        root.innerHTML = communityScreen();
    else if (screen === 'briefing')
        root.innerHTML = briefing();
    else if (screen === 'waiting')
        root.innerHTML = waiting();
    else if (screen === 'play' && state?.mode)
        root.innerHTML = modeScreen();
    else if (screen === 'play')
        root.innerHTML = gameplay();
    else if (screen === 'success')
        root.innerHTML = success();
    else if (screen === 'result')
        root.innerHTML = result();
    else
        root.innerHTML = landing(); updateLab(); opened.forEach(id => { let el = document.getElementById(id); if (el)
        el.open = true; }); updateClock(); updateRaceClock(); updateClockRaceAbandon(); updateCommunityUI(); updateArenaUI(); initTerrain();const input=root.querySelector('[data-game-activity-action=answer] input[name=answer]');if(input&&gameActivityDraft.key===(state?.classActivity?.id||'')+':'+state?.classActivity?.own?.step)input.value=gameActivityDraft.value; }
    function updateClock() { if (!state || state.status !== 'active')
        return; let currentTime = now(); let wallet = document.getElementById('shop-wallet'); if (wallet)
        wallet.textContent = state.score || 0; let frozen = Math.max(0, Math.ceil(((state.effects?.freezeUntil || 0) - currentTime) / 1000)); let ef = document.getElementById('effectStatus'); if (ef)
        ef.textContent = frozen ? 'ĐÓNG BĂNG ' + frozen + ' giây · ' + state.effects.freezeSource : (state.effects?.shieldUntil > currentTime ? 'Lá chắn đang bảo vệ nhóm' : 'Nhóm sẵn sàng'); let el = document.getElementById('remaining'); if (el) {
        el.textContent = time(G.DURATION - (currentTime - state.start));
        el.classList.toggle('low', G.DURATION - (currentTime - state.start) < 300000);
    } let p = document.getElementById('penalty'); if (p)
        p.textContent = '+' + time(state.penalty); let btn = document.getElementById('submitAnswer'); if (btn) {
        let left = Math.ceil((state.cooldown - currentTime) / 1000);
        btn.disabled = busy || frozen > 0 || left > 0 || currentTime - state.start >= G.DURATION;
        btn.textContent = frozen > 0 ? 'Đóng băng ' + frozen + ' giây · Có thể đọc hồ sơ' : left > 0 ? 'Đợi ' + left + ' giây · Kiểm tra lại' : state.solved.length === 5 ? 'Mở cửa · Chốt kết quả' : 'Xác nhận · Mở khóa';
    } }
    function download(filename, obj) { let blob = new Blob([typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)], { type: typeof obj === 'string' ? 'text/csv;charset=utf-8' : 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function handleReply(r) { if (r.ok) {
        feedback = '';
        lastDigit = r.digit;
        if (state.status === 'completed') {
            screen = 'result';
            recordResult();
        }
        else
            screen = 'success';
        save();
        render();
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
    else if (r.reason === 'wrong') {
        feedback = 'Dữ kiện chưa khớp. Đã cộng 1 phút. Cả nhóm kiểm tra lại hồ sơ trước khi gửi.';
        save();
        let el = document.getElementById('feedback');
        if (el)
            el.textContent = feedback;
        toast('Gửi sai · Tự cộng 1 phút');
        updateClock();
    }
    else if (r.reason === 'frozen') {
        toast('Nhóm đang đóng băng. Có thể đọc hồ sơ, chờ hết giờ hoặc dùng Phá băng.');
        updateClock();
    }
    else if (r.reason === 'inactive') {
        screen = state.status === 'active' ? 'play' : 'result';
        save();
        render();
    }
    else
        toast('Chờ hết 10 giây rồi gửi lại.'); }
    document.addEventListener('change', e => { let form = e.target.closest('#roomForm'); if (!form)
        return; let old = roomDraft.grade; roomDraft = readRoomDraft(form); if (e.target.name === 'grade' && old !== roomDraft.grade) {
        roomDraft.topics = [];
        document.getElementById('topicRows').innerHTML = topicRows();
    } if(roomDraft.theme!=='historical'&&roomDraft.community==='arena'){roomDraft.community='none';} document.getElementById('setupCommunity').innerHTML=window.SignalGameSetup.options(roomDraft.community,roomDraft.theme);document.getElementById('setupGuidance').innerHTML=window.SignalGameSetup.guidance(roomDraft);document.getElementById('topicCount').textContent = 'Đã chọn ' + roomDraft.topics.length + ' bài / dạng'; document.getElementById('setupStory').textContent = C.themes[roomDraft.theme].story; });
    document.addEventListener('input', e => { if (e.target.id === 'communityAnswer')
        communityInput = e.target.value; if (e.target.id === 'arenaAnswer')
        arenaInput = e.target.value; });
    document.addEventListener('click', e => { const b = e.target.closest('[data-arena]'); if (b && !b.disabled)
        arenaCombatSubmit(b.dataset.arena); });
    document.addEventListener('submit', async (e) => { e.preventDefault(); if (busy)
        return; if (e.target.id === 'joinForm') {
        let fd = new FormData(e.target);
        pendingName = String(fd.get('teamName')||'').trim();
        pendingRoom = fd.get('roomCode').trim().toUpperCase();
        if (!pendingRoom) {
            toast('Nhập mã phòng giáo viên cung cấp.');
            return;
        }
        try {
            busy = true;
            const requestedCode=pendingRoom;
            let info = await api('room-info', { code: requestedCode }, '');
            if(document.getElementById('roomCode')?.value.trim().toUpperCase()!==requestedCode)return;
            if(info.kind==='lesson'){window.location.assign('/play?code='+encodeURIComponent(pendingRoom));return;}
            if(!pendingName){pendingRoomInfo=info;pendingCampaign=info.campaign;render();document.getElementById('teamName')?.focus();return;}
            pendingRoomInfo = info; pendingCampaign = info.campaign;
            screen = 'briefing';
            render();
            window.scrollTo(0, 0);
        }
        catch (err) {
            toast(err.message);
        }
        finally {
            busy = false;
        }
    }
    else if (e.target.id === 'communityForm') {
        let fd = new FormData(e.target);
        await communitySubmit(fd.get('answer'));
    }
    else if (e.target.id === 'arenaForm') {
        let fd = new FormData(e.target);
        await arenaAnswerSubmit(fd.get('answer'));
    }
    else if (e.target.id === 'bonusForm') {
        let fd = new FormData(e.target), answer = state.race.bonus.format === 'tf' ? [0, 1, 2, 3].map(i => fd.get('s' + i)).join('') : fd.get('answer');
        await raceAction('bonus', { answer });
    }
    else if (e.target.id === 'roomForm') {
        let title = new FormData(e.target).get('roomTitle');
        roomDraft = readRoomDraft(e.target);
        if (!roomDraft.topics.length || roomDraft.maxLevel < roomDraft.minLevel || !roomDraft.categories.length || !roomDraft.formats.length) {
            toast('Chọn ít nhất một chủ đề và khoảng độ khó hợp lệ.');
            return;
        }
        let proposed = { id: uid(), token: uid() + uid() };
        try {
            busy = true;
            let d = await api('create-room', { id: proposed.id, adminKey: proposed.token, title, campaign: roomDraft }, '');
            teacherSession = { ...proposed, ...d.room };
            rememberRoom(teacherSession);
            write(RK, teacherSession);
            await fetchBoard();
            render();
        }
        catch (err) {
            toast(err.message);
        }
        finally {
            busy = false;
        }
    }
    else if (e.target.id === 'answerForm' || e.target.id === 'finalForm') {
        let isFinal = e.target.id === 'finalForm', data = Object.fromEntries(new FormData(e.target));
        await action(isFinal ? 'unlock' : 'submit', isFinal ? { code: data.code } : { input: data });
    } });
    let draftTimer;
    document.addEventListener('input', e => { if (e.target.closest('.lab'))
        updateLab(); if (e.target.closest('#bonusForm') && state?.status === 'active') {
        state.drafts.bonus ??= {};
        state.drafts.bonus[e.target.name] = e.target.value;
        if (state.race.bonus.format === 'tf')
            state.drafts.bonus.answer = [0, 1, 2, 3].map(i => state.drafts.bonus['s' + i] || '?').join('');
        save();
        clearTimeout(draftTimer);
        draftTimer = setTimeout(() => { if (state?.race?.bonus && !state.race.bonus.done)
            api('bonus-draft', { id: session.id, answer: state.drafts.bonus?.answer }).catch(() => { }); }, 900);
    } if (e.target.closest('#answerForm') && state?.status === 'active') {
        let i = state.solved.length;
        state.drafts[i] ??= {};
        state.drafts[i][e.target.name] = e.target.value;
        save();
        clearTimeout(draftTimer);
        draftTimer = setTimeout(() => syncDraft(i), 900);
    } });
    document.addEventListener('click', async (e) => { let b = e.target.closest('[data-action]'); if (!b)
        return; if(b.dataset.action==='setup-recommend'){const form=document.getElementById('roomForm');if(!form)return;form.elements.minLevel.value='0';form.elements.maxLevel.value='2';form.elements.stationMax.value='0';form.elements.community.value='none';roomDraft=readRoomDraft(form);document.getElementById('setupGuidance').innerHTML=window.SignalGameSetup.guidance(roomDraft);toast('Đề xuất Dễ–Khá, câu đố mở cổng Dễ, chưa thêm hoạt động chung. Chọn những bài lớp đã học.');return;} switch (b.dataset.action) {
        case 'choose-reward':
            await raceAction('reward', { choice: b.dataset.choice });
            break;
        case 'pact-confirm':
            confirmPact(b.dataset.choice);
            break;
        case 'pact-use':
            dlg.close();
            await raceAction('pact', { choice: b.dataset.choice });
            break;
        case 'topics-all':
        case 'topics-clear': {
            let form = document.getElementById('roomForm');
            form.querySelectorAll('input[name=topics]').forEach(n => n.checked = b.dataset.action === 'topics-all');
            roomDraft = readRoomDraft(form);
            document.getElementById('topicCount').textContent = 'Đã chọn ' + roomDraft.topics.length + ' chủ đề';
            break;
        }
        case 'lab-order': {
            let out = document.getElementById('orderDraft');
            if (!b.disabled) {
                out.textContent = out.textContent === 'Chưa xếp thẻ' ? b.dataset.letter : out.textContent + ' → ' + b.dataset.letter;
                b.disabled = true;
            }
            break;
        }
        case 'lab-order-reset':
            document.getElementById('orderDraft').textContent = 'Chưa xếp thẻ';
            root.querySelectorAll('[data-action=lab-order]').forEach(b => b.disabled = false);
            break;
        case 'map-zoom':
            zoomTerrain(Number(b.dataset.delta));
            break;
        case 'map-reset':
            terrainFocus = null;
            terrainSpot = null;
            terrainController?.reset();
            updateRaceMap();
            break;
        case 'map-mode':
            terrainController?.mode(b.dataset.mode);
            break;
        case 'map-rotate':
            terrainController?.rotate();
            break;
        case 'map-light':
            terrainController?.light();
            break;
        case 'map-peer':
            focusTerrain(b.dataset.team);
            break;
        case 'map-own':
            focusTerrain(state.id);
            break;
        case 'map-spot':
            terrainSpot = Number(b.dataset.cell);
            terrainFocus = null;
            root.querySelectorAll('.terrain-pin').forEach(p => p.classList.toggle('selected', Number(p.dataset.cell) === terrainSpot));
            updateRaceMap();
            break;
        case 'map-expand':
            await expandTerrain();
            break;
        case 'reduce-motion':
            document.body.classList.toggle('reduced-motion');
            write('signal-reduced-motion', document.body.classList.contains('reduced-motion'));
            updateRaceMap();
            updateCommunityUI();
            break;
        case 'pick-mascot':
            pendingMascot = Number(b.dataset.mascot);
            if (state?.status === 'waiting')
                await raceAction('mascot', { mascot: pendingMascot });
            else
                render();
            break;
        case 'roll':
            await raceAction('roll', { sequence: state?.race?.campaign?.playMode === 'individual' ? state.race.rolls : mapState?.turn.sequence });
            break;
        case 'abandon':
            confirmAbandon();
            break;
        case 'confirm-abandon':
            dlg.close();
            await raceAction('abandon');
            break;
        case 'skip-bonus':
            await raceAction('bonus', { skip: true });
            break;
        case 'rules':
            rulesDialog();
            break;
        case 'shop':
            await shopDialog();
            break;
        case 'buy-skill':
            await buySkill(b.dataset.skill);
            break;
        case 'lab-pipe':
            rotatePipe(Number(b.dataset.cell));
            break;
        case 'check-pipe':
            checkPipe();
            break;
        case 'choose-level':
            if (busy)
                return;
            busy = true;
            try {
                let d = await api('choose-level', { id: session.id, level: Number(b.dataset.level) });
                apply(d);
                render();
            }
            catch (e) {
                toast(e.message);
            }
            finally {
                busy = false;
            }
            break;
        case 'lab-truth':
            b.textContent = b.textContent === '?' ? 'Đ' : b.textContent === 'Đ' ? 'S' : '?';
            break;
        case 'lab-token':
            b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
            break;
        case 'start':
            if (!busy)
                await start();
            break;
        case 'resume':
            await refresh(true);
            if (!state)
                break;
            screen = state.status === 'waiting' ? 'waiting' : state.status === 'active' ? 'play' : 'result';
            render();
            break;
        case 'result':
            screen = 'result';
            render();
            break;
        case 'continue':
            feedback = '';
            screen = 'play';
            render();
            window.scrollTo(0, 0);
            break;
        case 'hints':
            hintDialog();
            break;
        case 'close-hints':
            dlg.close();
            break;
        case 'buy-hint':
            if (busy || performance.now() - hintTap < 700)
                return;
            hintTap = performance.now();
            b.disabled = true;
            await action('request-hint', {tier:['nudge','method','guided'][state.hints[state.solved.length].length]});
            break;
        case 'download':
            download('bao-cao-' + state.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-') + '.json', groupReport());
            break;
        case 'print':
            window.print();
            break;
        case 'new':
            if (state?.status === 'active' || state?.status === 'waiting') {
                toast('Phiên này chưa kết thúc. Tiếp tục trên thiết bị đã vào phòng.');
                break;
            }
            state = null;
            session = null;
            screen = 'landing';
            localStorage.removeItem(KEY);
            localStorage.removeItem(DK);
            render();
            break;
        case 'begin-room':
            if (busy)
                return;
            try {
                busy = true;
                await api('begin', { id: teacherSession.id, revision: board?.room.revision }, teacherSession.token);
                await fetchBoard();
                render();
            }
            catch (err) {
                toast(err.message);
            }
            finally {
                busy = false;
            }
            break;
        case 'reset-room':
        case 'delete-room':
        case 'remove-team':
            managementDialog(b.dataset.action, b.dataset.team);
            break;
        case 'confirm-management':
            await confirmManagement();
            break;
        case 'cancel-management':
            managementDlg.close();
            managementPending = null;
            break;
        case 'select-room':
            await selectRoom(b.dataset.room);
            break;
        case 'change-join-code': pendingRoomInfo=null;pendingCampaign=null;pendingName='';render();break;
        case 'create-another-room':
            if (busy)
                return;
            teacherSession = null;
            board = null;
            reports = [];
            localStorage.removeItem(RK);
            try { window.hostIdentity = await (await fetch('/api/hosts?kind=identity', {cache:'no-store'})).json(); }
            catch { toast('Chưa tải được quyền tạo phòng. Hãy tải lại trang.'); }
            render();
            break;
        case 'csv':
            exportCSV();
            break;
        case 'host-arena':
            await hostOpenArena();
            break;
    } });
    function exportCSV() {
 const cell = v => { let x=String(v); if (/^[=+\-@\t\r]/.test(x)) x="'"+x; return '"'+x.replace(/"/g,'""')+'"'; };
 const modeRule=board?.room?.campaign?.rule;
 if (modeRule && modeRule !== 'campaign') { download('bang-xep-hang-luat-van.csv','\ufeff'+window.ModeClassroom.csv(board,reports)); return; }
 const rows=[['Hạng','Nhóm','Điểm','Trạng thái','Ô bản đồ','Trạm từ bỏ/không gặp','Lượt xúc xắc','Gió thuận (giây)','Khóa hoàn tất','Thực chơi (giây)','Phạt (giây)','Xếp hạng (giây)','Hint 1','Hint 2','Hint 3','Hint 4','Hint 5','Lượt sai'], ...sorted().map((r,i)=>[i+1,r.team,r.score||0,r.status,r.race?.position??'',r.race?.outcomes.filter(o=>o.skipped).map(o=>o.position).join(';')??'',r.race?.rolls??'',(r.race?.timeBonus||0)/1000,r.completed,Math.floor(r.elapsedMs/1000),r.penaltyMs/1000,Math.floor(r.adjustedMs/1000),...r.hints,r.wrong])];
 download('bang-xep-hang-cuu-ho.csv','\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n'));
}
        async function flushRecoveryDraft() {
        clearTimeout(draftTimer);
        const stage=state.race?.task??state.solved.length;
        const identity = draftIdentity();
        const snapshot={id:session.id,round:state.round||1,stage,questionRevision:state.recovery?.questionRevision??0,revision:state.revision,input:{...state.drafts[stage]}};
        const d=await api('save-draft',snapshot);
        if(identity!==draftIdentity())throw Error('Đề đã thay đổi. Hãy kiểm tra đề mới trước khi yêu cầu hỗ trợ.');
        apply(d);save();
        if(identity!==draftIdentity())throw Error('Đề đã thay đổi. Hãy kiểm tra đề mới trước khi yêu cầu hỗ trợ.');
    }
    async function syncDraft(i) { if (!session || !state || busy || state.status !== 'active' || state.solved.length !== i)
        return; try {
        const identity=draftIdentity(),input={...state.drafts[i]},d=await api('save-draft', { id: session.id, stage:i, input });
        if(identity===draftIdentity()){apply(d);save();if(identity!==draftIdentity()){render();}}
    }
    catch(e) {toast(e.message);await refresh(true);} }
    function uid() { let b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; let h = Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); }
    function wallNow() { return Date.now() - clockOffset; }
    function now() { let wall = wallNow(), c = community(); return wall - (c ? Math.max(0, Math.min(wall, c.resumeAt) - c.openedAt) : 0); }
    async function api(action, body = {}, token = session?.token) { let response = await fetch('/api/escape', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) }, body: JSON.stringify({ action, ...body, round: body.round ?? state?.round ?? 1, stage: body.stage ?? state?.race?.task??state?.solved.length,questionRevision:body.questionRevision??state?.recovery?.questionRevision??0,revision:body.revision??(token===session?.token?state?.revision:undefined), requestId: body.requestId||uid() }) }); let d = await response.json(); if (!response.ok) {
        let error = Object.assign(Error(d.error || 'Chưa kết nối được máy chủ.'), { code: d.code, status: response.status });
        endStudentSession(error);
        throw error;
    } clockOffset = Date.now() - d.serverNow; return d; }
    function apply(d) { if (d.state?.community?.id === state?.community?.id && d.state?.community?.phase === 'racing' && (d.state.community.own?.step ?? 0) < (state?.community?.own?.step ?? 0)) {
        d.state.community.own = state.community.own;
        let own = state.community.entries.find(p => p.id === state.id);
        if (own)
            d.state.community.entries = d.state.community.entries.map(p => p.id === state.id ? own : p);
    } if (d.map)
        mapState = d.map; if (!d.state)
        return; let oldBonus = state?.race?.bonus?.serial, cache = read(DK, {}), round = d.state.round || 1; let changedRound = state?.id === d.state.id && (state.round || 1) !== round; const identity=draftIdentity(d.state),same=identity===draftIdentity();let drafts=same?state.drafts:cache.identity===identity?cache.drafts:(d.state.drafts||{});if(!same){clearTimeout(draftTimer);pipeTurns=Array(9).fill(0);} if (!state || state.id !== d.state.id || d.state.revision >= state.revision) {
        state = { ...d.state, drafts };
        if (oldBonus !== state.race?.bonus?.serial && state.race?.bonus)
            state.drafts.bonus = {};
        if (changedRound) {
            clearTimeout(draftTimer);
            feedback = '';
            lastDigit = null;
            pipeTurns = Array(9).fill(0);
            sessionNotice = 'Giáo viên đã reset phòng. Điểm, hint và tiến độ đã về 0. Đội chờ lượt chơi mới.';
            if (dlg.open)
                dlg.close();
            save();
        }
    } if (d.serverNow)
        clockOffset = Date.now() - d.serverNow;
      if(dlg.open&&dlg.dataset.kind==='rules')dlg.innerHTML='<button class="close" data-action="close-hints">Đóng</button>'+rulesBody(); }
    function endStudentSession(error) { if (!['ROOM_DELETED', 'TEAM_REMOVED'].includes(error.code) || screen === 'teacher')
        return false; clearTimeout(draftTimer); sessionNotice = error.message; state = null; session = null; peers = []; feedback = ''; localStorage.removeItem(KEY); localStorage.removeItem(DK); if (dlg.open)
        dlg.close(); screen = 'landing'; render(); return true; }
    async function action(kind, data) { if (busy || !session)
        return; busy = true; updateClock(); try {
        if(kind==='hint'||kind==='request-hint')await flushRecoveryDraft();
        let d = await api(kind, { id: session.id, ...data, ...(kind === 'hint' ? { level: state.hints[state.solved.length].length + 1 } : {}) });
        apply(d);
        if (kind === 'hint' || kind === 'request-hint') {
            if (d.result.ok) {
                hintDialog();
                toast(d.result.cost ? 'Đã ghi nhận gợi ý mức ' + d.result.level + ' · Cộng ' + d.result.cost / 60000 + ' phút' : 'Mức gợi ý này đã được ghi nhận. Không cộng phạt lần nữa.');
                root.querySelector('[data-action="hints"]')?.setAttribute('aria-label', 'Gợi ý đã mở');
                let hb = root.querySelector('[data-action="hints"]');
                if (hb)
                    hb.textContent = 'Gợi ý · ' + state.hints[state.solved.length].length + '/3';
            }
            else {
                if (dlg.open)
                    dlg.close();
                screen = state.status === 'active' ? 'play' : 'result';
                render();
            }
        }
        else
            handleReply(d.result);
    }
    catch (e) {
        if (endStudentSession(e))
            return;
        toast(e.message);
        let f = document.getElementById('feedback');
        if (f)
            f.textContent = 'Chưa nhận được xác nhận của máy chủ. Câu trả lời vẫn được giữ; đang đồng bộ lại tiến độ.';
        await refresh(true);
    }
    finally {
        busy = false;
        updateClock();
    } }
    async function refresh(force = false) { if (!session || busy && !force)
        return; let requested = session; try {
        let oldCommunityKey = communityKey(), oldArenaKey = arenaKey(), oldBonus = state?.race?.bonus?.serial, oldBonusDone = state?.race?.bonus?.done, oldReward = !!state?.race?.reward, oldPhase = state?.race?.phase, oldTask = state?.race?.task, old = state?.status, oldRound = state?.round || 1, r = await fetch('/api/escape?kind=state&id=' + encodeURIComponent(requested.id), { headers: { Authorization: 'Bearer ' + requested.token }, cache: 'no-store' }), d = await r.json();
        if (session?.id !== requested.id)
            return;
        if (!r.ok)
            throw Object.assign(Error(d.error), { code: d.code });
        const oldIdentity=draftIdentity(),oldModeRevision=state?.mode?.revision,oldGameActivityKey=gameActivityKey();
        apply(d);
        if(oldIdentity!==draftIdentity()||oldModeRevision!==state?.mode?.revision||oldGameActivityKey!==gameActivityKey())render();
        if (oldCommunityKey !== communityKey() || oldArenaKey !== arenaKey()) {
            if (dlg.open)
                dlg.close();
            render();
        }
        else {
            updateCommunityUI();
            updateArenaUI();
        }
        // Once the arena's results window closes, settle and restore the paused task.
        if (state?.arena && wallNow() >= state.arena.resumeAt && state.arena.phase !== 'done')
            await arenaFinish();
        if (state.status === 'waiting') {
            screen = 'waiting';
            if (old !== 'waiting' || oldRound !== state.round || force)
                render();
        }
        else if ((old === 'waiting' || oldRound !== state.round) && state.status === 'active') {
            sessionNotice = '';
            screen = 'play';
            render();
        }
        else if ((state.status === 'completed' || state.status === 'timeout') && (old !== state.status || screen !== 'result')) {
            screen = 'result';
            if (dlg.open)
                dlg.close();
            render();
        }
        if (state.race && (oldPhase !== state.race.phase || oldTask !== state.race.task || oldBonus !== state.race.bonus?.serial || oldBonusDone !== state.race.bonus?.done || oldReward !== !!state.race.reward) && screen === 'play')
            render();
        updateRaceMap();
        if (dlg.open && dlg.dataset.kind === 'hint' && state.status === 'active')
            hintDialog();
        updateClock();
    }
    catch (e) {
        if (session?.id !== requested.id)
            return;
        if (endStudentSession(e))
            return;
        if (force)
            toast(e.message || 'Chưa kết nối được máy chủ.');
    } }
    async function fetchBoard() { if (!teacherSession)
        return; let requested = teacherSession, r = await fetch('/api/escape?kind=board&id=' + encodeURIComponent(requested.id), { headers: requested.token ? { Authorization: 'Bearer ' + requested.token } : {}, cache: 'no-store' }), d = await r.json(); if (teacherSession?.id !== requested.id)
        return; if (!r.ok) {
        if (d.code === 'ROOM_DELETED') {
            forgetRoom(requested.id);
            teacherSession = null;
            board = null;
            reports = [];
            localStorage.removeItem(RK);
            render();
            toast('Phòng này đã được xóa. Chọn phòng khác hoặc tạo phòng mới.');
            return;
        }
        throw Error(d.error);
    } board = d; if (d.serverNow)
        clockOffset = Date.now() - d.serverNow; if (d.map)
        d.room.revision = d.map.roomRevision; reports = d.teams; teacherSession = { ...requested, ...d.room }; rememberRoom(teacherSession); write(RK, teacherSession); }
    function waiting() { if (state.race)
        return `${header()}<main class="setup"><div class="eyebrow">Phòng ${esc(state.room)}</div><h1>${esc(state.name)} đã sẵn sàng.</h1>${sessionNotice ? `<p class="notice">${esc(sessionNotice)}</p>` : ''}${state.race.campaign ? storyPanel() : ''}${mascotPicker(true)}<p>Chuẩn bị giấy nháp, phân vai. Hồ sơ xuất phát tự mở khi giáo viên bắt đầu.</p>${raceMap(false)}<button data-action="rules">Đọc lại luật cuộc đua</button></main>`; return `${header()}<main class="success"><div class="eyebrow">Đã vào phòng ${esc(state.room)}</div><h1>Đội đã sẵn sàng.</h1><p><strong>${esc(state.name)}</strong></p>${sessionNotice ? `<p class="notice" role="status">${esc(sessionNotice)}</p>` : ''}<p>Phân vai, chuẩn bị giấy nháp và bút. Khi giáo viên bắt đầu, hồ sơ đầu tiên và đồng hồ sẽ tự mở.</p><p class="small muted">Giữ trang này mở. Không cần nhập lại tên hoặc mã phòng.</p></main>`; }
    function rememberRoom(room) { let index = managedRooms.findIndex(r => r.id === room.id); if (index < 0)
        managedRooms.push({ ...room });
    else
        managedRooms[index] = { ...managedRooms[index], ...room }; write(ROOMS_KEY, managedRooms); }
    function forgetRoom(id) { managedRooms = managedRooms.filter(r => r.id !== id); write(ROOMS_KEY, managedRooms); }
    function roomPicker() { return managedRooms.length ? `<section class="room-picker" aria-label="Các phòng đã tạo"><p class="small muted">Phòng đã lưu trên trình duyệt này</p><div class="room-list">${managedRooms.map(r => `<button data-action="select-room" data-room="${esc(r.id)}" aria-pressed="${r.id === teacherSession?.id}"><strong>${esc(r.title || 'Phòng cứu hộ')}</strong><span>${esc(r.code)} · ${r.started ? 'Đã bắt đầu' : 'Chờ bắt đầu'}</span></button>`).join('')}</div></section>` : ''; }
    async function selectRoom(id) { if (busy || managementDlg.open)
        return; let room = managedRooms.find(r => r.id === id); if (!room)
        return; busy = true; teacherSession = room; board = null; reports = []; write(RK, room); render(); try {
        await fetchBoard();
        render();
    }
    catch (e) {
        toast(e.message);
    }
    finally {
        busy = false;
    } }
    const managementDlg = document.createElement('dialog');
    managementDlg.id = 'managementDialog';
    managementDlg.setAttribute('aria-labelledby', 'managementTitle');
    document.body.appendChild(managementDlg);
    function managementDialog(kind, teamId) { if (busy || !teacherSession || !board)
        return; let team = reports.find(r => r.id === teamId); if (kind === 'remove-team' && !team)
        return; let room = board.room; managementPending = { kind, teamId, room: { ...teacherSession }, revision: room.revision }; let title = kind === 'reset-room' ? 'Reset phòng để chơi lại' : kind === 'delete-room' ? 'Xóa phòng ' + room.code : 'Xóa đội ' + team.team; let content = kind === 'reset-room' ? `<p>Phòng <strong>${esc(room.title)}</strong> · ${esc(room.code)} · ${reports.length} đội.</p><ul><li>Giữ nguyên mã phòng, tên đội và linh vật; chuyển sang luật cuộc đua mới.</li><li>Xóa toàn bộ điểm, hint, phạt, bản nháp, kết quả và lịch sử kỹ năng của lượt này.</li><li>Các đội tự trở về màn hình chờ. Giáo viên bấm Bắt đầu để mở lượt 30 phút mới.</li></ul>` : kind === 'delete-room' ? `<p>Đóng phòng <strong>${esc(room.title)}</strong> · ${esc(room.code)} và xóa khỏi danh sách quản lý. ${reports.length} đội trong phòng sẽ được thông báo và rời lượt chơi.</p><p>Mã ${esc(room.code)} sẽ không vào chơi được nữa. Kết quả của phòng không còn hiển thị. Có thể tải CSV trước khi xóa.</p>` : `<p>Đội <strong>${esc(team.team)}</strong> sẽ bị loại khỏi danh sách và bảng xếp hạng của phòng ${esc(room.code)}. Thiết bị của đội sẽ nhận thông báo và trở về trang vào phòng.</p><p>Các đội khác tiếp tục chơi. Những điểm kỹ năng họ đã tiêu vẫn được giữ nguyên. Tên đội vừa xóa có thể dùng để vào lại.</p>`; managementDlg.innerHTML = `<h2 id="managementTitle">${esc(title)}</h2>${content}${kind === 'remove-team' ? '' : `<p><button data-action="csv" ${reports.length ? '' : 'disabled'}>Tải kết quả CSV trước khi tiếp tục</button></p>`}${kind === 'delete-room' ? `<label for="deleteRoomCode">Nhập mã ${esc(room.code)} để xác nhận</label><input id="deleteRoomCode" autocomplete="off" maxlength="6" placeholder="Mã phòng cần xóa">` : ''}<p id="managementError" class="feedback" role="alert"></p><div class="flex"><button data-action="cancel-management">Hủy</button><button class="danger confirm-danger" data-action="confirm-management">${kind === 'reset-room' ? 'Xác nhận reset' : kind === 'delete-room' ? 'Xác nhận xóa phòng' : 'Xác nhận xóa đội'}</button></div>`; managementDlg.showModal(); }
    async function confirmManagement() { if (busy || !managementPending)
        return; let operation = managementPending, button = managementDlg.querySelector('[data-action="confirm-management"]'), errorBox = document.getElementById('managementError'); let confirmCode = operation.kind === 'delete-room' ? document.getElementById('deleteRoomCode').value.trim().toUpperCase() : operation.room.code; if (operation.kind === 'delete-room' && confirmCode !== operation.room.code) {
        errorBox.textContent = 'Mã xác nhận chưa khớp. Chưa xóa phòng.';
        return;
    } busy = true; button.disabled = true; try {
        await api(operation.kind, { id: operation.room.id, revision: operation.revision, teamId: operation.teamId, confirmCode }, operation.room.token);
        managementDlg.close();
        managementPending = null;
        if (operation.kind === 'delete-room') {
            forgetRoom(operation.room.id);
            if (teacherSession?.id === operation.room.id) {
                teacherSession = null;
                board = null;
                reports = [];
                localStorage.removeItem(RK);
            }
        }
        else
            await fetchBoard();
        render();
        toast(operation.kind === 'reset-room' ? 'Đã reset phòng. Các đội chờ giáo viên bắt đầu lượt mới.' : operation.kind === 'delete-room' ? 'Đã xóa phòng. Mã phòng đã ngừng hoạt động.' : 'Đã xóa đội khỏi phòng.');
    }
    catch (e) {
        errorBox.textContent = e.message + (e.status === 409 ? ' Bấm Hủy rồi mở lại thao tác sau khi kiểm tra phòng.' : '');
        await fetchBoard().catch(() => { });
    }
    finally {
        busy = false;
        button.disabled = false;
    } }
    if (read('signal-reduced-motion', false))
        document.body.classList.add('reduced-motion');
    if (teacherSession)
        rememberRoom(teacherSession);
    async function boot() { let search = new URLSearchParams(location.search); if (search.get('view') === 'teacher') {
        screen = 'teacher';
        let roomId = search.get('room');
        if (roomId) {
            try {
                let r = await fetch('/api/hosts?kind=rooms');
                let data = await r.json();
                let room = data.rooms?.find(x => x.id === roomId && x.mode!=='lesson');
                if (room) {
                    teacherSession = room;
                    write(RK, teacherSession);
                }
            } catch (e) {  }
        }
        if (teacherSession?.mode==='lesson'){teacherSession=null;localStorage.removeItem(RK);}
        if (teacherSession) {
            try {
                await fetchBoard();
            }
            catch (e) {
                toast(e.message);
            }
        } else {
            try {
                let r = await fetch('/api/hosts?kind=identity');
                window.hostIdentity = await r.json();
            } catch (e) { console.log('fetch error:', e); }
        }
        render();
    }
    else if (session) {
        await refresh(true);
        if (state)
            screen = state.status === 'waiting' ? 'waiting' : state.status === 'active' ? 'play' : 'result';
        render();
    }
    else
        render(); }
    const legacyApply = apply;
    apply = function (data) { legacyApply(data); window.SignalFeedback?.observe(state, mapState); };
    const legacyRender = render;
    render = function () {
        legacyRender();
        window.SignalFeedback?.setTheme(worldKey());
        const world = theme(), main = root.querySelector('main');
        if (main) {
            const story = document.createElement('section');
            story.className = 'phase-story';
            const title = document.createElement('h2'), text = document.createElement('p');
            title.textContent = world.title;
            text.textContent = screen === 'result' && state?.status === 'completed' ? world.ending : (state?.race?.position || 0) >= 16 ? world.midpoint : world.intro;
            story.append(title, text);
            main.prepend(story);
        }
        if (screen === 'landing') {
            const title = root.querySelector('.landing h1');
            if (title)
                title.textContent = C.brand.title;
            const eyebrow = root.querySelector('.landing .eyebrow');
            if (eyebrow)
                eyebrow.textContent = 'MƯỜI HAI THẾ GIỚI · TOÁN 10–12';
            const intro = root.querySelector('.landing h1 + p');
            if (intro)
                intro.textContent = C.brand.description;
        }
        if (screen === 'success') {
            const title = root.querySelector('.success h1');
            if (title)
                title.textContent = world.places[Math.min(4, state.solved.length - 1)] + ' · Đã mở khóa';
        }
        if (screen === 'result') {
            const text = root.querySelector('.result h1 + p');
            if (text)
                text.textContent = state?.status === 'completed' ? world.ending : 'Hành trình đã chốt. Tiến độ và kết quả được giữ lại.';
        }
        const finalTitle = root.querySelector('.finalcols h1');
        if (finalTitle)
            finalTitle.textContent = world.places[4] + ' · Ghép mã cuối';
    };
    window.addEventListener('media-settings-change', () => { updateRaceMap(); updateCommunityUI(); });
    boot();
    setInterval(() => { updateClock(); updateRaceClock(); updateClockRaceAbandon(); updateCommunityUI(); updateGameActivityClock(); }, 500);
    setInterval(() => { if (polling || (++pollTick % 3 !== 0 && !communityRunning() && !arenaRunning()))
        return; polling = true; if (screen === 'teacher' && teacherSession && !busy)
        fetchBoard().then(() => { let focused = document.activeElement; if (document.fullscreenElement || terrainDragging || terrainExpanded)
            updateRaceMap();
        else if (!focused || focused.tagName !== 'INPUT')
            render();
        else
            updateRaceMap(); }).catch(() => { let n = document.getElementById('boardStatus'); if (n)
            n.textContent = 'Mất kết nối. Đang thử cập nhật lại…'; }).finally(() => polling = false);
    else if (screen !== 'teacher')
        refresh().finally(() => polling = false);
    else
        polling = false; }, 1000);
})();
