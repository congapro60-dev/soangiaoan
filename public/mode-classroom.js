/* Pure classroom renderer for the nine non-campaign modes.
 * It deliberately accepts already-serialized state. Student rendering never
 * reads answer/steps/expected fields, even if a caller accidentally supplies
 * a teacher challenge object.
 */

const RULES = Object.freeze({
  campaign: ['Chiến dịch', 'Hoàn thành hành trình theo trạm'],
  duel: ['Đấu đơn', 'Đấu các vòng đồng thời; thua một vòng vẫn tiếp tục'],
  zones: ['Chiếm khu vực', 'Chiếm và giữ các khu vực bằng câu đúng'],
  survival: ['Sinh tồn', 'Giữ năng lượng trong vùng hoạt động đang thu hẹp'],
  escort: ['Hộ tống', 'Sửa đường, giữ nhiên liệu và đưa đoàn xe đi tiếp'],
  treasure: ['Săn kho báu', 'Mở manh mối, chọn tuyến và ghép bộ mã'],
  relay: ['Tiếp sức', 'Giải rồi bàn giao cho đủ thành viên'],
  lockdown: ['Phòng khóa', 'Cấp điện và mở từng phòng tương tác'],
  merchant: ['Thương hội', 'Kiếm tài nguyên, giao dịch và hoàn thành hợp đồng']
});

const ACTIONS = Object.freeze({
  duel: ['answer'], zones: ['capture', 'defend', 'objective'],
  survival: ['objective', 'move', 'recover'], escort: ['advance', 'repair', 'fuel'],
  treasure: ['clue', 'choose', 'dig', 'assemble'], relay: ['solve', 'handoff'],
  lockdown: ['power', 'unlock'], merchant: ['earn', 'buy', 'sell', 'contract']
});

const ACTION_LABELS = Object.freeze({
  answer: 'Nhận câu đấu', capture: 'Chiếm khu vực', defend: 'Củng cố phòng thủ',
  objective: 'Làm mục tiêu chung', move: 'Chọn vị trí', recover: 'Hồi năng lượng',
  advance: 'Đưa đoàn xe đi tiếp', repair: 'Sửa tuyến', fuel: 'Nạp nhiên liệu',
  clue: 'Mở manh mối', choose: 'Chọn nhánh', dig: 'Đào mảnh mã', assemble: 'Ghép bộ mã',
  solve: 'Giải phần của mình', handoff: 'Bàn giao lượt', power: 'Cấp điện', unlock: 'Mở phòng',
  earn: 'Giải để nhận tài nguyên', buy: 'Mua', sell: 'Bán', contract: 'Hoàn thành hợp đồng'
});

const METRIC_LABELS = Object.freeze({matchPoints:'Điểm trận', correct:'Câu đúng', elapsed:'Thời gian trả lời', submitted:'Đã chốt vòng', energy:'Năng lượng', rounds:'Vòng vượt qua', objectives:'Mục tiêu', position:'Vị trí', distance:'Quãng hộ tống', fuel:'Nhiên liệu', integrity:'Độ bền', finishedAt:'Thời điểm hoàn thành', clues:'Manh mối', branch:'Nhánh đang chọn', fragments:'Mảnh mã', sets:'Bộ mã', points:'Điểm', legs:'Chặng bàn giao', ready:'Sẵn sàng bàn giao', coverage:'Thành viên đã làm', room:'Phòng đã mở', powered:'Đã cấp điện', coins:'Xu', ore:'Quặng', wood:'Gỗ', contracts:'Hợp đồng', control:'Điểm kiểm soát', resources:'Tài nguyên', objective:'Mục tiêu phe'});
const PARTICIPATION_LABELS = Object.freeze({individual:'Cá nhân · Mỗi em một thiết bị',pairs:'Cặp hai người · Chung thiết bị',group:'Nhóm · Chung thiết bị'});
const VALUE_LABELS = Object.freeze({sun:'Mặt trời',moon:'Mặt trăng',star:'Vì sao',water:'Nước',seed:'Hạt giống',tree:'Cây',ore:'Quặng',wood:'Gỗ'});
const OUTCOME_LABELS = Object.freeze({active:'Đang tham gia',spectator:'Khán giả','temporary-defeat':'Tạm thời mất năng lượng',completed:'Đã hoàn thành',abandoned:'Đã rời ván'});
const ROOM_PROMPTS = Object.freeze({code:'Nhập ba chữ số đầu tiên của số pi, không có dấu.',pipes:'Xoay ba ống để hướng lần lượt về đông, nam, đông.',graph:'Chọn một đường đi từ đỉnh đầu đến đỉnh cuối.',logic:'Tưới đất, gieo hạt rồi cây lớn. Sắp xếp đúng thứ tự.'});
const TIE_BREAK = Object.freeze({duel:'Điểm trận → Câu đúng → Thời gian trả lời ít hơn',zones:'Điểm kiểm soát phe → Câu đúng phe → Tài nguyên phe',survival:'Vòng vượt qua → Mục tiêu → Năng lượng',escort:'Quãng hộ tống → Nhiên liệu và độ bền → Thời gian ít hơn',treasure:'Bộ mã → Câu đúng → Điểm → Thời gian ít hơn',relay:'Chặng bàn giao → Điểm → Thời gian ít hơn',lockdown:'Phòng đã mở → Điểm → Thời gian ít hơn',merchant:'Hợp đồng → Tài sản ròng → Câu đúng'});

const noop = value => String(value ?? '');
const defaultEsc = value => noop(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultMath = value => defaultEsc(value);
const defaultTime = value => {
  const n = Math.max(0, Number(value) || 0), s = Math.floor(n / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
function helpers(input = {}) { return {esc: input.esc || defaultEsc, mathText: input.mathText || defaultMath, time: input.time || defaultTime, now: input.now || (() => Date.now())}; }
function label(rule) { return RULES[rule]?.[0] || 'Ván học tập'; }
function objective(rule) { return RULES[rule]?.[1] || 'Hoàn thành mục tiêu của ván'; }
function selectedUnit(m) { return m?.units?.find(u => u.id === m.unitId) || null; }
function unitName(unit) { return unit?.members?.map(m => m.name).join(' · ') || 'Đơn vị chưa gán'; }
function statusText(unit, m) {
  if (m?.finished) return 'Ván đã kết thúc';
  if (m?.paused) return 'Ván đang tạm dừng';
  if (!unit) return 'Khán giả · chờ lượt chính';
  if (unit.outcome === 'spectator') return 'Khán giả · sẽ tham gia sau sự kiện';
  if (OUTCOME_LABELS[unit.outcome]) return OUTCOME_LABELS[unit.outcome];
  return unit.late ? 'Vào muộn · dùng thời gian còn lại' : 'Đang tham gia';
}
function metricRows(rule, p, esc) {
  const keys = Object.keys(p || {}).filter(k => !['finishedAt'].includes(k));
  return keys.map(key => `<span><b>${esc(METRIC_LABELS[key] || key)}</b> ${esc(formatMetric(p[key]))}</span>`).join('');
}
function formatMetric(v) { if (typeof v === 'boolean') return v?'Có':'Chưa'; if (Array.isArray(v)) return v.map(x=>VALUE_LABELS[x]||x).join(' · ') || 'Chưa có'; const mapped=VALUE_LABELS[v]; return mapped ?? (v == null ? '—' : v); }
function textValue(math, value) { return Array.isArray(value) ? value.map(x => math(x)).join('<br>') : math(value); }
function actionAvailable(m,a) {
  const u=selectedUnit(m),p=m.players?.[m.unitId]||{},pending=m.challenge&&!m.challenge.used&&m.challenge.deadline>m.gameNow;
  if(!u||m.finished||m.paused||['spectator','abandoned','completed'].includes(u.outcome))return false;
  if(u.outcome==='temporary-defeat'&&!(m.rule==='survival'&&a==='recover'))return false;
  if(pending)return false;
  if(m.rule==='duel')return !p.submitted&&!!m.duel?.pairs?.some(pair=>pair.includes(u.id));
  if(m.rule==='escort')return a==='advance'?p.fuel>0&&p.integrity>0:a==='repair'?p.integrity<4:p.fuel<6;
  if(m.rule==='treasure')return a==='clue'?p.branch==null&&p.clues===0:a==='choose'?p.clues>0&&p.branch==null:a==='dig'?p.branch!=null:['sun','moon','star'].every(x=>p.fragments?.includes(x));
  if(m.rule==='relay')return a==='handoff'?!!p.ready:!p.ready;
  if(m.rule==='lockdown')return a==='unlock'?!!p.powered:!p.powered;
  if(m.rule==='merchant'&&a==='contract')return p.ore>=2&&p.wood>=1;
  return true;
}
function modeActions(m, esc) {
  const actions = ACTIONS[m?.rule] || [];
  return actions.map(a => `<button type="button" data-mode-send="${esc(a)}" ${actionAvailable(m,a)?'':'disabled'}>${esc(ACTION_LABELS[a] || a)}</button>`).join('');
}
function renderChallenge(q, h, disabled) {
  if (!q || q.used) return '';
  const esc = h.esc, math = h.mathText, format = q.format || 'short';
  let answer = '';
  if (format === 'mcq' && Array.isArray(q.options)) answer = `<fieldset class="mode-options"><legend>Chọn một phương án</legend>${q.options.map((x, i) => `<label><input type="radio" name="mode-answer-option" id="mode-option-${i}" value="${i}" ${disabled ? 'disabled' : ''}> ${esc(x)}</label>`).join('')}</fieldset>`;
  else if (format === 'tf' && Array.isArray(q.statements)) answer = `<fieldset class="mode-options"><legend>Chọn Đúng hoặc Sai cho từng mệnh đề</legend>${q.statements.map((x, i) => `<div><span>${i + 1}. ${math(x)}</span><label><input type="radio" name="mode-tf-${i}" value="D" ${disabled ? 'disabled' : ''}> Đúng</label><label><input type="radio" name="mode-tf-${i}" value="S" ${disabled ? 'disabled' : ''}> Sai</label></div>`).join('')}</fieldset>`;
  else if (format === 'puzzle' && Array.isArray(q.fields)) answer = `<div class="mode-puzzle-fields">${q.fields.map(f => `<label>${esc(f.label || f.key)}<input id="mode-field-${esc(f.key)}" data-mode-field="${esc(f.key)}" ${f.text ? '' : 'inputmode="numeric"'} ${disabled ? 'disabled' : ''}></label>`).join('')}</div>`;
  else answer = `<label for="mode-answer">Câu trả lời<input id="mode-answer" autocomplete="off" ${disabled ? 'disabled' : ''}></label>`;
  return `<section class="mode-challenge" aria-label="Câu hỏi đang mở"><div class="eyebrow">CÂU TOÁN · ${esc(q.topicName || q.topic || '')} · ${esc(q.points ?? '')} điểm</div><div class="mode-prompt">${textValue(math, q.prompt || q.question || '')}</div>${answer}<button type="button" data-mode-send="answer" ${disabled ? 'disabled' : ''}>Chốt câu trả lời</button></section>`;
}
function roomUnlock(room, h, disabled) {
  if (!room) return '';
  const esc = h.esc;
  if (room.type === 'code') return `<p>${esc(ROOM_PROMPTS.code)}</p><label for="mode-unlock-code">Mã ba chữ số<input id="mode-unlock-code" inputmode="numeric" maxlength="3" ${disabled ? 'disabled' : ''}></label><input id="mode-unlock" type="hidden">`;
  if (room.type === 'pipes') return `<p>${esc(ROOM_PROMPTS.pipes)}</p><fieldset class="mode-unlock"><legend>Xoay ba ống</legend>${Array.from({length: room.count || 3}, (_, i) => `<label>Ống ${i + 1}<select id="mode-rotation-${i}" ${disabled ? 'disabled' : ''}>${[0,1,2,3].map(v => `<option value="${v}">${v * 90}°</option>`).join('')}</select></label>`).join('')}</fieldset><input id="mode-unlock" type="hidden">`;
  if (room.type === 'graph') {const nodes=[...new Set((room.edges||[]).flat())];return `<p>${esc(ROOM_PROMPTS.graph)} Các cạnh có hướng: ${esc((room.edges||[]).map(x=>x.join(' → ')).join(' · '))}</p><fieldset><legend>Đường đi từ ${esc(room.start || '')} đến ${esc(room.end || '')}</legend>${[0,1,2].map(i=>`<label>Đỉnh ${i+1}<select id="mode-path-${i}" ${disabled?'disabled':''}><option value="">Chọn đỉnh</option>${nodes.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></label>`).join('')}</fieldset><input id="mode-unlock" type="hidden">`;}
  if (room.type === 'logic') return `<p>${esc(ROOM_PROMPTS.logic)}</p><fieldset class="mode-unlock"><legend>Sắp thứ tự</legend>${(room.items || []).map((item, i) => `<label>Vị trí ${i + 1}<select id="mode-order-${i}" ${disabled ? 'disabled' : ''}><option value="">Chọn bước</option>${(room.items || []).map(x => `<option value="${esc(x)}">${esc(VALUE_LABELS[x]||x)}</option>`).join('')}</select></label>`).join('')}</fieldset><input id="mode-unlock" type="hidden">`;
  return '';
}

export function student(m, input = {}) {
  const h = helpers(input), e = h.esc, unit = selectedUnit(m), p = unit ? m.players?.[unit.id] : null;
  const disabled = !unit || ['spectator', 'abandoned', 'completed'].includes(unit.outcome) || m.finished || m.paused;
  const left = Number.isFinite(m?.deadline) ? h.time(Math.max(0, m.deadline - (Number(m.gameNow) || 0))) : '—';
  const roster = unit ? `<p class="mode-roster"><strong>Đơn vị:</strong> ${e(unitName(unit))} · <strong>Phe:</strong> ${unit.faction == null ? '—' : unit.faction + 1} · <strong>Điều khiển:</strong> ${e(unit.members?.find(x => x.id === unit.controller)?.name || '—')}</p>` : '';
  const ranking = (m?.ranking || []).map(r => `<li><strong>${r.rank}.</strong> ${e(unitName(m.units?.find(u => u.id === r.unitId)))} <span>${e((r.values || []).map(formatMetric).join(' · '))}</span></li>`).join('');
  const controls = disabled ? '' : `<fieldset class="mode-actions"><legend>Hành động</legend>${m.rule==='zones'?'<label>Khu vực<select id="mode-number">'+[0,1,2,3].map(i=>`<option value="${i}">Khu ${i+1}</option>`).join('')+'</select></label>':''}${m.rule==='survival'?`<label>Vị trí trong vùng 0–${m.survival?.radius??6}<input id="mode-number" type="number" min="0" max="${m.survival?.radius??6}" value="0"></label>`:''}${['treasure','merchant'].includes(m.rule)?`<label>${m.rule==='merchant'?'Tài nguyên':'Nhánh'}<select id="mode-choice">${(m.rule==='merchant'?['ore','wood']:['sun','moon','star']).map(x=>`<option value="${x}">${VALUE_LABELS[x]}</option>`).join('')}</select></label>${m.rule==='merchant'?'<label>Số lượng<input id="mode-number" type="number" value="1" min="1" max="100"></label>':''}`:''}${m.rule==='lockdown'?`<p>${e(m.room?.prompt||'Đã mở đủ phòng.')}</p>${roomUnlock(m.room,h,disabled)}`:''}<div class="flex">${modeActions(m,e)}</div></fieldset>`;
  return `<section class="mode-classroom mode-student"><div class="eyebrow">${e(label(m?.rule))} · ${e(PARTICIPATION_LABELS[m?.participation]||'')}</div><h1>${e(objective(m?.rule))}</h1><p class="mode-status" role="status">${e(statusText(unit, m))} · Còn ${e(left)}</p>${roster}${p ? `<div class="mode-metrics">${metricRows(m.rule, p, e)}</div>` : '<p class="notice">Bạn đang xem với tư cách khán giả. Chờ giáo viên mở lượt chính.</p>'}${renderChallenge(m?.challenge,h,disabled||m.challenge?.deadline<=m.gameNow)}${controls}<button type="button" data-mode-send="tick">Cập nhật tiến độ</button><section class="mode-ranking"><h2>Xếp hạng hiện tại</h2><p>${e(TIE_BREAK[m.rule]||'')}</p><ol>${ranking || '<li>Chưa có kết quả.</li>'}</ol></section></section>`;
}

export function teacher(board, reports = [], input = {}) {
  const h = helpers(input), e = h.esc, mode = reports.find(r => r.mode)?.mode || board?.mode;
  if (!mode) return '';
  const rows = (mode.ranking || []).map(rank => { const report = reports.find(r => r.mode?.unitId === rank.unitId); const u = mode.units?.find(x => x.id === rank.unitId); const objectiveData = report?.mode?.objective || mode.players?.[rank.unitId] || {}; const answers = report?.mode?.answers || []; return `<tr><td>${rank.rank}</td><td>${e(unitName(u))}</td><td>${u?.faction == null ? '—' : u.faction + 1}</td><td>${e(OUTCOME_LABELS[u?.outcome] || '—')}</td><td>${u?.late ? 'Có' : 'Không'}</td><td>${e(Object.entries(objectiveData).map(([k,v]) => `${METRIC_LABELS[k]||k}: ${formatMetric(v)}`).join(' · ') || '—')}</td><td>${answers.length}</td></tr>`; }).join('');
  const dossiers = reports.filter(r => r.mode).map(r => { const u = r.mode.units?.find(x => x.id === r.mode.unitId); const answers = r.mode.answers || []; return `<details class="mode-dossier"><summary>${e(unitName(u))} · Phe ${u?.faction == null ? '—' : u.faction + 1}</summary><p>${e(statusText(u, r.mode))} · Người điều khiển: ${e(u?.members?.find(x => x.id === u.controller)?.name || '—')}</p><p>${metricRows(r.mode.rule, r.mode.objective || r.mode.players?.[r.mode.unitId], e)}</p><h4>Câu đã phát</h4>${answers.map(q => `<details><summary>${e(q.topicName || q.topic || q.id)}</summary><p>${textValue(h.mathText, q.prompt || q.question || '')}</p><p><strong>Đáp án:</strong> ${e(q.answer)}</p><ol>${(q.steps || []).map(s => `<li>${textValue(h.mathText, s)}</li>`).join('')}</ol></details>`).join('') || '<p>Chưa phát câu.</p>'}</details>`; }).join('');
  return `<section class="mode-classroom mode-teacher"><div class="eyebrow">${e(label(mode.rule))} · ${e(PARTICIPATION_LABELS[mode.participation]||'')}</div><h2>${e(objective(mode.rule))}</h2><p>${mode.units?.length || 0} đơn vị · ${mode.units?.reduce((n,u) => n + (u.members?.length || 0), 0) || 0} học sinh · ${mode.finished ? 'Đã kết thúc' : mode.paused ? 'Đang tạm dừng' : 'Đang diễn ra'}</p><p><strong>Tiêu chí xếp hạng:</strong> ${e(TIE_BREAK[mode.rule] || '')}</p><div class="tablewrap"><table><thead><tr><th>Hạng</th><th>Roster</th><th>Phe</th><th>Trạng thái</th><th>Vào muộn</th><th>Mục tiêu</th><th>Câu</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Chưa có dữ liệu.</td></tr>'}</tbody></table></div><section class="mode-dossiers"><h3>Hồ sơ theo đơn vị</h3>${dossiers || '<p>Chưa có hồ sơ mode.</p>'}</section></section>`;
}

function safeCell(v) { let x = String(v ?? ''); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return `"${x.replace(/"/g, '""')}"`; }
export function csv(board, reports = []) {
  const mode = reports.find(r => r.mode)?.mode || board?.mode;
  if (!mode) return '';
  const header = ['Hạng', 'Luật', 'Cách tham gia', 'Unit ID', 'Roster', 'Phe', 'Người điều khiển', 'Trạng thái', 'Vào muộn', 'Mục tiêu', 'Số câu đã phát'];
  const rows = (mode.ranking || []).map(rank => { const r = reports.find(x => x.mode?.unitId === rank.unitId); const u = mode.units?.find(x => x.id === rank.unitId); const p = r?.mode?.objective || mode.players?.[rank.unitId] || {}; return [rank.rank, label(mode.rule), PARTICIPATION_LABELS[mode.participation] || mode.participation, rank.unitId, unitName(u), u?.faction == null ? '' : u.faction + 1, u?.members?.find(x => x.id === u.controller)?.name || '', OUTCOME_LABELS[u?.outcome] || '', u?.late ? 'Có' : 'Không', Object.entries(p).map(([k,v]) => `${METRIC_LABELS[k]||k}=${formatMetric(v)}`).join('; '), r?.mode?.answers?.length || 0]; });
  return [header, ...rows].map(row => row.map(safeCell).join(',')).join('\r\n');
}

export function readAnswer(m, document) {
  const q = m?.challenge, format = q?.format || 'short';
  if (!document || !q) return '';
  if (format === 'mcq') return document.querySelector('input[name="mode-answer-option"]:checked')?.value || '';
  if (format === 'tf') return (q.statements || []).map((_, i) => document.querySelector(`input[name="mode-tf-${i}"]:checked`)?.value || '?').join('');
  if (format === 'puzzle') return Object.fromEntries((q.fields || []).map(f => [f.key, document.getElementById(`mode-field-${f.key}`)?.value || '']));
  return document.getElementById('mode-answer')?.value || '';
}

export function readUnlock(m, document) {
  const room = m?.room;
  if (!room || !document) return {};
  if (room.type === 'code') return {code: document.getElementById('mode-unlock-code')?.value || ''};
  if (room.type === 'pipes') return {rotations: Array.from({length: room.count || 3}, (_, i) => Number(document.getElementById(`mode-rotation-${i}`)?.value || 0))};
  if (room.type === 'graph') return {path: [0,1,2].map(i=>document.getElementById(`mode-path-${i}`)?.value||'').filter(Boolean)};
  if (room.type === 'logic') return {order: (room.items || []).map((_, i) => document.getElementById(`mode-order-${i}`)?.value || '')};
  return {};
}

const api = {student, teacher, csv, readAnswer, readUnlock};
if (typeof window !== 'undefined') window.ModeClassroom = api;
export default api;
