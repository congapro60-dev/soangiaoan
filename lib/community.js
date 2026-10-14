import {contextQuestion} from './context-questions.js';
import {numericAnswer} from './campaign.js';

export const COMMUNITY_CELL=18;
export const COMMUNITY_QUESTIONS=6;
// A ván may run several community events; `boat` and `arena` coexist but never overlap.
export const EVENT_TYPES=Object.freeze(['boat','arena','tug','boss','buzzer','mountain','castle','archery','surf','duel','relay','treasure','estimate','bingo']);
export const MAX_EVENTS_PER_ROUND=6;
export const individual=s=>s.campaign?.playMode==='individual';
export function raceOf(room){try{return JSON.parse(room?.race||'null');}catch{return null;}}
export function communityOf(room){return raceOf(room)?.community||null;}
export function arenaEventOf(room){return raceOf(room)?.arena||null;}
function slotsOf(race){return [race?.community,race?.arena,race?.classActivity].filter(Boolean);}
// Completed intervals stay in the ledger so pause time only ever accumulates.
function intervalsOf(race){
 if(!race)return [];
 if(Array.isArray(race.pauses)&&race.pauses.length)return race.pauses;
 return slotsOf(race).map(c=>({id:c.id,type:c.type||'boat',openedAt:c.openedAt,resumeAt:c.resumeAt}));
}
export const pauseIntervals=room=>intervalsOf(raceOf(room));
export function pauseMs(room,wall=Date.now()){return intervalsOf(raceOf(room)).reduce((total,p)=>total+Math.max(0,Math.min(wall,p.resumeAt)-p.openedAt),0);}
export const gameNow=(room,wall=Date.now())=>wall-pauseMs(room,wall);
export function activeEvent(room,wall=Date.now()){return slotsOf(raceOf(room)).find(c=>wall<c.resumeAt)||null;}
export const communityActive=(room,wall=Date.now())=>!!activeEvent(room,wall);
// Returns the pause ledger that includes `event`; replacing an id keeps the earlier duration.
export function registerPause(race,event){
 const prior=intervalsOf(race).filter(p=>p.id!==event.id);
 return [...prior,{id:event.id,type:event.type,openedAt:event.openedAt,resumeAt:event.resumeAt}];
}
export function eventQueueState(race,wall=Date.now()){
 const active=slotsOf(race).find(c=>wall<c.resumeAt)||null;
 return {active,queue:Array.isArray(race?.eventQueue)?race.eventQueue:[],count:intervalsOf(race).length};
}
// An event may only open when nothing else holds the pause and the ván budget is left.
export function canOpenEvent(race,wall=Date.now()){
 const {active,count}=eventQueueState(race,wall);
 if(active)return {ok:false,code:'EVENT_ACTIVE',active};
 if(count>=MAX_EVENTS_PER_ROUND)return {ok:false,code:'EVENT_BUDGET'};
 return {ok:true};
}
export function enqueueEvent(race,request){
 const queue=Array.isArray(race?.eventQueue)?race.eventQueue:[];
 if(queue.some(x=>x.triggerId===request.triggerId&&x.kind===request.kind))return queue;
 return [...queue,request].slice(0,MAX_EVENTS_PER_ROUND);
}
export function createCommunity(room,roster,wall,triggerId){return {id:crypto.randomUUID(),type:'boat',openedAt:wall,startAt:wall+10000,finishAt:wall+55000,resumeAt:wall+65000,seed:crypto.getRandomValues(new Uint32Array(1))[0],triggerId,roster:roster.filter(s=>s.status==='active').map(s=>({id:s.id,name:s.name,mascot:s.race.mascot}))};}
export function communityQuestion(c,campaign,entry){let plan=campaign.plan[entry.step%campaign.plan.length];return contextQuestion({...plan,level:Math.min(1,plan.level),format:'short'},(c.seed^Math.imul(entry.step+1,0x9e3779b1)^Math.imul(entry.slot+1,0x7feb352d))>>>0);}
export function communityAnswer(c,campaign,entry,answer,step,wall){
 if(wall<c.startAt||wall>=c.finishAt||entry.step>=COMMUNITY_QUESTIONS||step!==entry.step)return {ok:false,reason:'stale'};
 if(wall-entry.lastAt<2500)return {ok:false,reason:'cooldown'};
 let q=communityQuestion(c,campaign,entry),ok=numericAnswer(answer,q.answer);
 entry.log.push({step:entry.step,answer:String(answer).slice(0,40),ok,at:wall});entry.step++;entry.correct+=Number(ok);entry.wrong+=Number(!ok);entry.lastAt=wall;
 return {ok:true,correct:ok};
}
export function communityResults(c,entries){return c.roster.map(p=>({...p,...(entries.find(x=>x.id===p.id)||{id:p.id,step:0,correct:0,wrong:0,lastAt:0})})).sort((a,b)=>b.correct-a.correct||(a.lastAt||Infinity)-(b.lastAt||Infinity)||a.id.localeCompare(b.id)).map((p,i,rows)=>{let rank=1+rows.filter(x=>x.correct>p.correct||(x.correct===p.correct&&(x.lastAt||Infinity)<(p.lastAt||Infinity))).length;return {...p,rank,reward:p.correct*5+(p.correct?rank===1?30:rank===2?20:rank===3?10:0:0)};});}
export function settleCommunity(s,room,entries,wall=Date.now()){let c=communityOf(room);if(!c||wall<c.resumeAt||!c.roster.some(p=>p.id===s.id)||s.events.some(e=>e.type==='community-result'&&e.eventId===c.id))return;let result=communityResults(c,entries).find(p=>p.id===s.id);s.score=(s.score||0)+result.reward;s.events.push({type:'community-result',eventId:c.id,rank:result.rank,correct:result.correct,points:result.reward,at:gameNow(room,c.resumeAt)});}
export function publicCommunity(c,campaign,entries,wall,ownId,teacher=false){
 if(!c)return null;let phase=wall<c.startAt?'countdown':wall<c.finishAt?'racing':wall<c.resumeAt?'results':'done',own=entries.find(e=>e.id===ownId),q=phase==='racing'&&own&&own.step<COMMUNITY_QUESTIONS?communityQuestion(c,campaign,own):null;
 return {id:c.id,type:c.type,phase,openedAt:c.openedAt,startAt:c.startAt,finishAt:c.finishAt,resumeAt:c.resumeAt,questions:COMMUNITY_QUESTIONS,entries:communityResults(c,entries).map(p=>({id:p.id,name:p.name,mascot:p.mascot,correct:p.correct,step:p.step,rank:p.rank,reward:p.reward,lastAt:p.lastAt,withdrawn:p.withdrawn||false})),own:own?{step:own.step,correct:own.correct,wrong:own.wrong,lastAt:own.lastAt,question:q?{question:q.question,topic:q.topicName,category:q.categoryName}:null}:null,...(teacher?{guides:entries.map(e=>({id:e.id,name:c.roster.find(p=>p.id===e.id)?.name,attempts:e.log.map(a=>{let q=communityQuestion(c,campaign,{...e,step:a.step});return {...a,question:q.question,expected:q.answer,steps:q.steps};})}))}:{})};
}
