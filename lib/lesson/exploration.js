import {groupActiveMs, DICE_UNITS_PER_ACTIVITY} from './runtime.js';
import {explorationCandidatePoints} from './teacher-setup.js';

const BUDGET = 120000;
const PHASES = new Set(['experience', 'guided', 'formation', 'practice']);
// ponytail: three reading cards for the sequence pilot; add reviewed subject cards before wider use.
const CARDS = [
  {id:'sequence-domain', title:'Nhịp ghế trong rạp nhỏ', category:'Toán quanh em', body:'Trong một rạp chiếu phim tưởng tượng, mỗi hàng sau có thêm hai ghế: $18, 20, 22, 24,\\ldots$. Dãy số giống nhịp chân đưa ta lên từng bậc; nhà thiết kế còn phải chừa lối đi và chỗ ngồi thuận tiện cho mọi người. Những con số cũng có thể giúp một không gian trở nên dễ sử dụng hơn.', sourceLabel:'Tình huống minh họa tự soạn, không mô tả một rạp có thật; liên hệ thiết kế tiếp cận. GV đối soát nội dung trước khi sử dụng.'},
  {id:'sequence-language', title:'Chuyến đi của Fibonacci', category:'Lịch sử · Nhà Toán học · Giao lưu văn hóa', body:'Leonardo ở Pisa, thường được gọi là Fibonacci, từng học Toán ở Béjaïa, một thành phố cảng nay thuộc Algeria. Trong sách Liber abaci năm 1202, ông giới thiệu hệ đếm và chữ số Ấn Độ–Ả Rập tới độc giả châu Âu. Tri thức Toán đã đi qua nhiều vùng đất, ngôn ngữ và những cuộc gặp gỡ.', sourceLabel:'MacTutor, University of St Andrews, tiểu sử Fibonacci: học ở Bugia/Béjaïa; Liber abaci (1202); hệ chữ số Hindu–Arabic.', sourceUrl:'https://mathshistory.st-andrews.ac.uk/Biographies/Fibonacci/'},
  {id:'sequence-conjecture', title:'Bức tranh số có thể đổi góc nhìn', category:'Ngôn ngữ Toán · Công dân số', body:'Trong dãy $3, 5, 7, 9,\\ldots$, ký hiệu $u_3=7$ là cách nói gọn “số ở vị trí thứ ba là 7”. Một bảng số và một biểu đồ có thể kể cùng câu chuyện theo hai cách. Trên màn hình, đổi thang đo có thể làm đường biểu diễn trông dốc hơn dù các số vẫn giữ nguyên — vì thế chú thích và nguồn dữ liệu cũng là một phần của câu chuyện.', sourceLabel:'Ví dụ và diễn giải tự soạn; kiểm u_n=2n+1 tại n=1..4; minh họa tác động của thang trục trong biểu đồ, không lấy hình trang trí làm dữ kiện.'}
];
const count = mask => [1,2,4].filter(bit => mask & bit).length;
const supported = state => explorationPoints(state).length === 3;
export function explorationPoints(state) {
  const candidates=explorationCandidatePoints(state.package);
  let seed=0;for(const ch of String(state.seed))seed=(seed*31+ch.charCodeAt(0))>>>0;
  const selected=[];
  for(let i=0;i<CARDS.length&&candidates.length;i++){
    const at=(seed+i*7)%candidates.length, point=candidates.splice(at,1)[0];
    selected.push({id:CARDS[i].id,...point});
  }
  return selected;
}
function timing(state, now) {
  const clock=state.clock||{},last=Number.isFinite(clock.lastNow)?clock.lastNow:0;
  const wall=Number.isFinite(now)?Math.max(now,last):last;
  const stop=clock.activityDeadline==null?wall:Math.min(wall,clock.activityDeadline);
  const active=groupActiveMs({...state,clock},stop), e=state.exploration;
  const elapsed=e?.openedAtActiveMs==null?0:Math.max(0,active-e.openedAtActiveMs);
  return {active,remaining:Math.max(0,BUDGET-(e?.usedMs||0)-elapsed),wall};
}
function eligible(state, now) {
  return supported(state)&&state.status==='active'&&!state.timeline.locked&&PHASES.has(state.timeline.currentPhase)&&state.clock.arenaPausedAt==null&&state.clock.classEventPausedAt==null&&(state.clock.activityDeadline==null||now<state.clock.activityDeadline);
}
export function closeExploration(state, now) {
  const e=state.exploration;if(!e||e.openedAtActiveMs==null)return;
  e.usedMs=BUDGET-timing(state,now).remaining;e.openedAtActiveMs=null;e.windowActivityId=null;
}
export function explorationCommand(state,event,actor,now) {
  const p=event.payload;
  if(event.type==='EXPLORATION_CONFIG'){
    if(typeof p.enabled!=='boolean')return 'INVALID_EVENT';
    if(p.enabled&&!supported(state))return 'EXPLORATION_UNSUPPORTED';
    state.exploration||={enabled:false,windowActivityId:null,openedAtActiveMs:null,usedMs:0,learners:{}};
    if(!p.enabled)closeExploration(state,now);state.exploration.enabled=p.enabled;return;
  }
  const view=explorationView(state,actor.id,now);
  if(event.type==='EXPLORATION_WINDOW'){
    if(typeof p.open!=='boolean')return 'INVALID_EVENT';
    if(!p.open){closeExploration(state,now);return;}
    if(!view.canOpen)return 'EXPLORATION_UNAVAILABLE';
    if(!view.open){closeExploration(state,now);state.exploration.openedAtActiveMs=timing(state,now).active;state.exploration.windowActivityId=state.timeline.currentActivityId;}return;
  }
  if(!['EXPLORATION_READ','EXPLORATION_REFLECT'].includes(event.type))return 'INVALID_EVENT';
  const index=CARDS.findIndex(c=>c.id===p.cardId);
  if(index<0||event.type==='EXPLORATION_REFLECT'&&(!Number.isInteger(p.choice)||p.choice<0||p.choice>2))return 'INVALID_EVENT';
  if(!view.open)return 'EXPLORATION_UNAVAILABLE';
  const own=state.exploration.learners[actor.id],bit=1<<index;
  if(!own||!(own.found&bit))return 'EXPLORATION_NOT_FOUND';
  if(!(own.fragments&bit)){own.fragments|=bit;if(event.type==='EXPLORATION_REFLECT')own.choices[index]=p.choice;}
}
export function discoverExploration(state, ids, from, to) {
  if(!state.exploration?.enabled||!supported(state)||to<=from)return;
  const total=state.package.activities.length*DICE_UNITS_PER_ACTIVITY,cell=Math.round(to/Math.max(1,total)*32);
  const mask=explorationPoints(state).reduce((bits,p,i)=>p.cell===cell?bits|(1<<i):bits,0);
  if(!mask)return;
  for(const id of ids){if(!state.roster[id]||state.roster[id].present===false)continue;
    const own=state.exploration.learners[id]||={found:0,fragments:0,choices:[null,null,null]};own.found|=mask;}
}
export function recordExplorationRoll(previous,state,actor,result) {
  const group=result.groupId&&state.groups[state.timeline.currentActivityId]?.groups.find(g=>g.id===result.groupId);
  const ids=group?group.memberIds:[actor.id];
  if(!['group','pairs'].includes(state.lessonMode?.participation)){discoverExploration(state,ids,result.from,result.position);return;}
  const position=(snapshot,unit)=>{
    const present=unit.members.filter(m=>snapshot.roster[m.id]?.present===true);
    const matching=snapshot.groups[snapshot.timeline.currentActivityId]?.groups.find(g=>g.memberIds.length===unit.members.length&&unit.members.every(m=>g.memberIds.includes(m.id)));
    const grouped=matching&&snapshot.groupDice?.[matching.id]?.position;
    return Number.isFinite(grouped)?grouped:present.length?Math.min(...present.map(m=>snapshot.diceTrack[m.id]?.position||0)):0;
  };
  for(const unit of state.lessonMode.units.filter(u=>u.members.some(m=>ids.includes(m.id)))){
    discoverExploration(state,unit.members.map(m=>m.id),position(previous,unit),position(state,unit));
  }
}
export function explorationView(state, learnerId, now, teacher=false) {
  const e=state.exploration,t=timing(state,now),available=supported(state),canOpen=Boolean(e?.enabled&&eligible(state,t.wall)&&t.remaining>0);
  const open=Boolean(canOpen&&e.openedAtActiveMs!=null&&e.windowActivityId===state.timeline.currentActivityId);
  const own=e?.learners?.[learnerId],points=e?.enabled?explorationPoints(state).map((p,i)=>({...p,found:Boolean(own?.found&(1<<i)),collected:Boolean(own?.fragments&(1<<i))})):[];
  const cards=available?CARDS.map((card,i)=>({id:card.id,title:card.title,category:card.category,body:teacher||open||state.status==='concluded'?card.body:'',...(teacher?{sourceLabel:card.sourceLabel,...(card.sourceUrl?{sourceUrl:card.sourceUrl}:{}),selected:own?.choices[i]??null}:{}),found:Boolean(own?.found&(1<<i)),collected:Boolean(own?.fragments&(1<<i)),position:points[i]?.position??0})):[];
  return {supported:available,enabled:Boolean(e?.enabled),canOpen,open,remainingMs:open?t.remaining:0,budgetLeftMs:t.remaining,cards,fragments:count(own?.fragments||0),rewardUnlocked:own?.fragments===7,points,
    ...(teacher?{aggregate:{participants:Object.keys(e?.learners||{}).length,found:Object.values(e?.learners||{}).reduce((sum,x)=>sum+count(x.found),0),collected:Object.values(e?.learners||{}).reduce((sum,x)=>sum+count(x.fragments),0),completed:Object.values(e?.learners||{}).filter(x=>x.fragments===7).length}}:{})};
}
