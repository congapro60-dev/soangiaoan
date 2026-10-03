import {PRODUCT_THEMES,resolveThemeId} from './product-content.js';
export const MEDIA_CATEGORIES=['dice','move','correct','wrong','hint','freeze','thaw','reward','abandon','skill','community','rank','finish'];
export const MEDIA_SETTINGS_KEY='signal-media-settings-v1';
export const DEFAULT_MEDIA_SETTINGS={master:false,sfx:true,music:false,meme:true,effects:true,reducedMotion:false,volume:70};
const texts=['Xúc xắc đã sẵn sàng.','Thêm một bước khám phá.','Lập luận chính xác!','Kiểm tra lại, bạn vẫn còn cơ hội.','Một gợi ý để đi tiếp.','Tạm dừng để đọc và suy nghĩ.','Sẵn sàng tiếp tục.','Phần thưởng đã ghi nhận.','Chọn một đường tiếp tục.','Kỹ năng đã kích hoạt.','Cùng lớp vượt thử thách.','Bạn vừa tiến trên bảng hạng.','Hành trình đã hoàn tất!'];
export const MEDIA_CATALOG=Object.fromEntries(MEDIA_CATEGORIES.map((category,i)=>[category,{text:texts[i],reaction:['?','>','+','~','i','*','+','+','>','*','+','^','!'][i],sound:{notes:[160+i*29,200+i*37,240+i*19],wave:i%3===0?'triangle':'sine',duration:.12+i*.006,percussion:i===0||i===1},overrides:Object.fromEntries(Object.entries(PRODUCT_THEMES).map(([id,t])=>[id,`${t.places[i%5]}: ${texts[i]}`]))}]));
export function normalizeMediaSettings(input={},osReduced=false){
 if(!input||typeof input!=='object'||Array.isArray(input))input={};
 const result={...DEFAULT_MEDIA_SETTINGS,reducedMotion:osReduced};
 for(const key of Object.keys(result))if(key!=='volume'&&typeof input[key]==='boolean')result[key]=input[key];
 if(typeof input.volume==='number'&&Number.isFinite(input.volume))result.volume=Math.max(0,Math.min(100,Math.round(input.volume)));
 return result;
}
export function readMediaSettings(raw,osReduced=false){try{return normalizeMediaSettings(JSON.parse(raw),osReduced);}catch{return normalizeMediaSettings({},osReduced);}}
export function mediaReaction(category,theme='modern'){
 const item=MEDIA_CATALOG[category];if(!item)return null;
 return {...item,category,text:item.overrides[resolveThemeId(theme)]||item.text};
}
export function createMediaGate(){
 const seen=new Set();
 return {accept(event,hidden=false){if(!event.id||!MEDIA_CATALOG[event.category]||seen.has(event.id))return false;seen.add(event.id);if(seen.size>2048)seen.delete(seen.values().next().value);return !hidden;}};
}
// The snapshot is never mutated; first load/reset establishes a baseline, not a replay.
export function mediaEvents(previous,next,map,now=Date.now()){
 if(!previous||!next||previous.id!==next.id||previous.round!==next.round)return [];
 const events=[],prefix=`${next.id}:${next.round||1}:`,add=(category,id)=>events.push({category,id:prefix+id});
 const known=new Set((previous.events||[]).map(e=>JSON.stringify(e)));
 const types={roll:'dice',hint:'hint',wrong:'wrong',solve:'correct',submit:'correct',ice:'freeze',thaw:'thaw',reward:'reward',abandon:'abandon',skill:'skill',finish:'finish',unlock:'finish'};
 for(const e of next.events||[])if(!known.has(JSON.stringify(e))&&types[e.type])add(types[e.type],e.id||JSON.stringify(e));
 const changed=(category,oldValue,newValue)=>{if(oldValue!==newValue)add(category,category+':'+newValue+':'+next.revision);};
 changed('move',previous.race?.position,next.race?.position);
 changed('dice',previous.race?.rolls,next.race?.rolls);
 if((next.solved?.length||0)>(previous.solved?.length||0))add('correct','solved:'+next.solved.length);
 if((next.wrong||0)>(previous.wrong||0))add('wrong','wrong:'+next.wrong);
 const hintCount=s=>(s.hints||[]).reduce((n,h)=>n+(h?.length||0),0);
 if(hintCount(next)>hintCount(previous))add('hint','hint:'+hintCount(next));
 const oldSkills=new Set((previous.effects?.history||[]).map(e=>e.id));
 for(const e of next.effects?.history||[])if(!oldSkills.has(e.id))add('skill','skill:'+e.id);
 if((previous.effects?.freezeUntil||0)<=now&&(next.effects?.freezeUntil||0)>now)add('freeze','freeze:'+next.effects.freezeUntil);
 if((previous.effects?.freezeUntil||0)>0&&(next.effects?.freezeUntil||0)<=now&&previous.effects.freezeUntil!==next.effects?.freezeUntil)add('thaw','thaw:'+previous.effects.freezeUntil);
 if(previous.race?.reward&&!next.race?.reward)add('reward','reward:'+next.revision);
 if((next.race?.outcomes||[]).filter(e=>e.skipped).length>(previous.race?.outcomes||[]).filter(e=>e.skipped).length)add('abandon','abandon:'+next.revision);
 if(next.community&&previous.community?.phase!==next.community.phase)add('community','community:'+next.community.id+':'+next.community.phase);
 if(next.community?.own?.step>previous.community?.own?.step){const own=next.community.entries?.find(p=>p.id===next.id),old=previous.community.entries?.find(p=>p.id===next.id);add(own?.correct>old?.correct?'correct':'wrong','community-answer:'+next.community.id+':'+next.community.own.step);}
 if(next.status==='completed'&&previous.status!=='completed')add('finish','finish');
 const oldRank=previous.mediaRank,newRank=map?.peers?.find(p=>p.id===next.id)?.rank;
 if(oldRank&&newRank&&newRank<oldRank)add('rank','rank:'+newRank+':'+next.revision);
 return events.filter((e,i,a)=>a.findIndex(other=>other.category===e.category)===i);
}
