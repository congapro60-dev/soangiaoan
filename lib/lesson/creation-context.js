export const LESSON_PURPOSES = {formation:'Hình thành kiến thức',practice:'Luyện tập',review:'Ôn tập'};
export function matchesCreationSettings(saved,settings){return Boolean(saved)&&['grade','subject','slotMinutes','purpose'].every(key=>saved[key]===settings[key])&&JSON.stringify(saved.scope||null)===JSON.stringify(settings.scope||null);}
export function parseLessonCreation(params) {
  if(params.get('setup')!=='new')return null;
  const allowed=new Set(['setup','purpose','source','subject','grade','minutes','package','launch']);
  for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length>1)return null;
  const purpose=params.get('purpose'),source=params.get('source'),subject=params.get('subject'),grade=Number(params.get('grade')),minutes=Number(params.get('minutes')),packageId=params.get('package');
  if(!Object.hasOwn(LESSON_PURPOSES,purpose||'')||!['library','authored','import','custom'].includes(source)||!Number.isInteger(minutes)||minutes<5||minutes>240||params.has('session'))return null;
  if(source==='custom' ? (!Number.isInteger(grade)||grade<1||grade>12||typeof subject!=='string'||!subject.trim()||subject.length>80||/[\u0000-\u001f\u007f]/.test(subject)) : ![10,11,12].includes(grade))return null;
  if(source!=='custom'&&subject!==null)return null;
  if(['library','authored'].includes(source)&&!/^[A-Za-z0-9_-]{1,128}$/.test(packageId||''))return null;
  if(['import','custom'].includes(source)&&packageId)return null;
  const launch=params.get('launch');
  if(launch!==null&&launch!=='quick')return null;
  if(launch==='quick'&&!['library','authored','custom'].includes(source))return null;
  return {purpose,source,...(source==='custom'?{subject:subject.trim()}:{}),grade,minutes,packageId:['import','custom'].includes(source)?null:packageId,...(launch==='quick'?{launch}:{})};
}
export function parseExamCreation(params){
  if(params.get('setup')!=='new'||params.getAll('setup').length!==1||params.getAll('minutes').length!==1||params.has('id'))return null;
  if([...params.keys()].some(key=>!['setup','minutes'].includes(key)))return null;
  const minutes=Number(params.get('minutes'));
  return Number.isInteger(minutes)&&minutes>=5&&minutes<=240?{minutes}:null;
}
