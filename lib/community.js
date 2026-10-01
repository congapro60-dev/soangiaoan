import {contextQuestion} from './context-questions.js';
import {numericAnswer} from './campaign.js';

export const COMMUNITY_CELL=18;
export const COMMUNITY_QUESTIONS=6;
export const individual=s=>s.campaign?.playMode==='individual';
export function communityOf(room){return JSON.parse(room.race||'null')?.community||null;}
export function pauseMs(room,wall=Date.now()){let c=communityOf(room);return c?Math.max(0,Math.min(wall,c.resumeAt)-c.openedAt):0;}
export const gameNow=(room,wall=Date.now())=>wall-pauseMs(room,wall);
export const communityActive=(room,wall=Date.now())=>{let c=communityOf(room);return !!c&&wall<c.resumeAt;};
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
