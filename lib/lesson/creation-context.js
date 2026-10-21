export const LESSON_PURPOSES = {formation:'Hình thành kiến thức',practice:'Luyện tập',review:'Ôn tập'};
export function matchesCreationSettings(saved,settings){return Boolean(saved)&&['grade','subject','slotMinutes','purpose'].every(key=>saved[key]===settings[key])&&JSON.stringify(saved.scope||null)===JSON.stringify(settings.scope||null);}
export function parseLessonCreation(params) {
  if(params.get('setup')!=='new')return null;
  const allowed=new Set(['setup','purpose','source','grade','minutes','package','launch']);
  for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length>1)return null;
  const purpose=params.get('purpose'),source=params.get('source'),grade=Number(params.get('grade')),minutes=Number(params.get('minutes')),packageId=params.get('package');
  if(!Object.hasOwn(LESSON_PURPOSES,purpose||'')||!['library','authored','import'].includes(source)||![10,11,12].includes(grade)||!Number.isInteger(minutes)||minutes<5||minutes>240||params.has('session'))return null;
  if(['library','authored'].includes(source)&&!/^[A-Za-z0-9_-]{1,128}$/.test(packageId||''))return null;
  if(source==='import'&&packageId)return null;
  const launch=params.get('launch');
  if(launch!==null&&launch!=='quick')return null;
  if(launch==='quick'&&!['library','authored'].includes(source))return null;
  return {purpose,source,grade,minutes,packageId:source!=='import'?packageId:null,...(launch==='quick'?{launch}:{})};
}
export function parseExamCreation(params){
  if(params.get('setup')!=='new'||params.getAll('setup').length!==1||params.getAll('minutes').length!==1||params.has('id'))return null;
  if([...params.keys()].some(key=>!['setup','minutes'].includes(key)))return null;
  const minutes=Number(params.get('minutes'));
  return Number.isInteger(minutes)&&minutes>=5&&minutes<=240?{minutes}:null;
}
