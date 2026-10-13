import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=()=>{const context={window:{}};vm.runInNewContext(readFileSync(new URL('../public/session-rules.js',import.meta.url),'utf8'),context);return context.window.SignalRoomRules;};
test('rules derive from the current room mode rather than the world; all nine rules explain action and ranking',()=>{
 const rules=read();for(const rule of ['campaign','duel','zones','survival','escort','treasure','relay','lockdown','merchant']){
  const html=rules.render({campaign:{theme:'modern',rule:'campaign',participation:'group'},mode:{rule,participation:'individual'},worldTitle:'City',durationMs:180000});
  assert.match(html,/Luật của phòng này/);assert.match(html,/Cá nhân/);assert.match(html,/Cần làm|Cách chơi/);assert.match(html,/Hoàn thành|Mục tiêu/);assert.match(html,/Điểm|Xếp hạng/);assert.doesNotMatch(html,/seed|answerKey|30 phút|Nhóm 3–4/);
 }
 assert.notEqual(rules.render({campaign:{theme:'modern',rule:'relay'}}),rules.render({campaign:{theme:'modern',rule:'treasure'}}));
});
test('unbound room has general entry guidance; lesson, pairs and grouped devices have distinct wording and escape labels',()=>{
 const rules=read();assert.match(rules.render(),/Nhập mã phòng|Chưa chọn phòng/);assert.doesNotMatch(rules.render(),/30 phút|Lăn xúc xắc|3–4/);
 const pairs=rules.render({campaign:{rule:'duel',participation:'pairs'},worldTitle:'<script>bad</script>'});assert.match(pairs,/Cặp/);assert.doesNotMatch(pairs,/<script>/);assert.match(pairs,/&lt;script&gt;/);
 assert.match(rules.render({campaign:{rule:'escort',participation:'group'}}),/Nhóm/);
 assert.match(rules.render({campaign:{rule:'duel'},durationMs:375000}),/6 phút 15 giây/);
});
test('legacy frontend loads rule helpers, landing has no fixed duration and briefing is room-bound',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(page,/session-rules\.js/);assert.match(source,/SignalRoomRules/);
 const landing=source.slice(source.indexOf('function landing()'),source.indexOf('function briefing()'));assert.doesNotMatch(landing,/30 PHÚT|Theo nhóm: chung một thiết bị/);assert.match(landing,/Mã phòng của em|Tiếp tục/);assert.match(source,/info.kind==='lesson'.*\/play\?code=/);
 const body=source.slice(source.indexOf('function rulesBody()'),source.indexOf('function rulesDialog()'));assert.match(body,/mode.*rule|currentRoomRules/);
});
