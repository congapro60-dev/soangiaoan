import assert from'node:assert/strict';
const types=['tug','boss','buzzer','mountain','castle','archery','surf','duel','relay','treasure','estimate','bingo'];
export async function checkR18({api:baseApi,database,teacher,other,report,bearer,rid}){
 const api=(url,body,...rest)=>baseApi(url,body?{requestId:rid(body.action||'request'),...body}:undefined,...rest);
 const checks=[];let fixture;
 for(const type of types){
  const id=crypto.randomUUID(),created=await api('/api/escape',{action:'create-room',id,adminKey:crypto.randomUUID()+crypto.randomUUID(),title:'QA R18 '+type,campaign:{rule:'campaign',participation:'individual',playMode:'individual',grade:12,topics:['line_oxyz'],minLevel:0,maxLevel:2,community:type}});
  const pupils=[];for(let i=0;i<2;i++)pupils.push((await api('/api/escape',{action:'join',code:created.room.code,name:'HS giả '+i,mascot:i} ,{},200)).session);
  await api('/api/escape',{action:'begin',id});
  for(const p of pupils)await api('/api/escape?kind=state&id='+p.id,undefined,bearer(p.token));
  const opened=await api('/api/escape',{action:'class-event-open',id,type,round:1,requestId:rid(type)}),eventId=opened.classActivity.id;
  await api('/api/escape',{action:'class-event-finish',id,eventId,round:1,requestId:rid('foreign')},other,403);
  await api('/api/escape',{action:'class-event-finish',id,eventId,round:1,requestId:rid('pupil')},bearer(pupils[0].token),403);
  const room=await database.prepare('SELECT race FROM rooms WHERE id=?').bind(id).first(),race=JSON.parse(room.race),event=race.classActivity;
  // QA clock fixture only: move the actual server-created countdown boundary into the past; keep real API/checker/auth.
  event.openedAt-=11000;event.startAt-=11000;event.finishAt-=11000;event.resumeAt-=11000;for(const field of ['startedAt','endsAt','lastNow'])if(typeof event.engine[field]==='number')event.engine[field]-=11000;
  const pause=race.pauses.find(p=>p.id===eventId);pause.openedAt=event.openedAt;pause.resumeAt=event.resumeAt;await database.prepare('UPDATE rooms SET race=?,revision=revision+1 WHERE id=?').bind(JSON.stringify(race),id).run();
  const first=pupils[0],req=async(action,extra={},status=200)=>api('/api/escape',{action:'class-event-action',id:first.id,eventId,round:1,eventAction:action,requestId:rid(action),step:0,...extra},bearer(first.token),status);
  let own=(await api('/api/escape?kind=state&id='+first.id,undefined,bearer(first.token))).state.classActivity.own;
  if(type==='mountain'){await req('pick',{cellId:own.board[0].id});own=(await api('/api/escape?kind=state&id='+first.id,undefined,bearer(first.token))).state.classActivity.own;}
  if(type==='buzzer'){await req('buzz');own=(await api('/api/escape?kind=state&id='+first.id,undefined,bearer(first.token))).state.classActivity.own;}
  assert.ok(own.task,'actual question for '+type);assert.equal(/"(?:answerKey|seed|participants|log)":/.test(JSON.stringify(own)),false);
  const stored=JSON.parse((await database.prepare('SELECT race FROM rooms WHERE id=?').bind(id).first()).race).classActivity;
  const task=stored.engine.tasks.find(t=>t.id===own.task.id),answer=String(task.evaluation.answerKey),reply=await req('answer',{answer});assert.equal(reply.result.correct,true,type);
  await api('/api/escape',{action:'class-event-finish',id,eventId,round:1,requestId:rid('finish')});
  const a=(await api('/api/escape?kind=state&id='+first.id,undefined,bearer(first.token))).state,b=(await api('/api/escape?kind=state&id='+first.id,undefined,bearer(first.token))).state;assert.equal(a.score,b.score,'settle once '+type);assert.equal(a.classActivity.phase,'done');
  checks.push({type,status:'PASS'});if(type==='bingo')fixture={roomId:id,pupilId:first.id,pupilSession:first};
 }
 report.r18={status:'PASS',types:checks,clockFixture:'countdown timestamps shifted only in disposable local D1',productionTouched:false};
 // Synthetic UI fixture created by real APIs, reused by teacher browser inspection; no tokens in report.
 report.r18.browserRoomId=fixture.roomId;
 return fixture;
}
