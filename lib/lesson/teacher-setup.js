// Shared with the launch dialog: keep this module free of server dependencies.
import { PRODUCT_THEMES } from '../product-content.js';
export const WORLD_LABELS=Object.freeze(Object.fromEntries(Object.entries(PRODUCT_THEMES).map(([id,theme])=>[id,theme.name])));
export const DEVICE_LABELS=Object.freeze({A:'Mỗi em một máy',B:'Nhóm chung một máy',C:'TV và bảng cá nhân'});
export const RULE_LABELS=Object.freeze({campaign:'Hành trình',duel:'Đấu trí',zones:'Giữ vùng',survival:'Sinh tồn',escort:'Hộ tống',treasure:'Kho báu',relay:'Tiếp sức',lockdown:'Mở phòng',merchant:'Thương nhân'});
export const EVENT_LABELS=Object.freeze({none:'Không dự kiến',tug:'Kéo co',boss:'Đánh trùm cả lớp',buzzer:'Bấm chuông',mountain:'Leo núi',castle:'Lâu đài',archery:'Bắn cung',surf:'Lướt sóng',duel:'Đối kháng',relay:'Tiếp sức',treasure:'Truy tìm kho báu',estimate:'Ước lượng',bingo:'Bingo'});
export const INTEGRATION_LABELS=Object.freeze({'global-equality':'Công bằng và bình đẳng','global-identity':'Bản sắc và đa dạng','global-interdependence':'Phụ thuộc lẫn nhau','global-sustainability':'Phát triển bền vững','global-peace':'Hòa bình','global-rights':'Quyền con người','digital-balance':'Cân bằng truyền thông','digital-privacy':'Quyền riêng tư','digital-footprint':'Dấu chân số','digital-relationships':'Giao tiếp số','digital-bullying':'Ứng xử trên mạng','digital-media':'Hiểu biết truyền thông','real-world':'Trải nghiệm thực tế',ai:'AI'});
export const AI_POLICIES=Object.freeze(['off','hints','check']);
const CHECKERS=new Set(['ordering_exact','classification_exact','numeric_exact','text_normalized_exact','choice_exact','multi_choice_exact','representation_match']);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
export function explorationCandidatePoints(pkg){
 if(!(pkg?.objectives||[]).some(o=>['T11.18','T11.19','SP-G11-W6-P38-MUST'].includes(o.code)))return [];
 const activities=pkg.activities||[],total=activities.length*8,firstCheck=activities.findIndex(a=>['recheck','exit'].includes(a.phase));
 const gates=new Set(activities.map((_,i)=>Math.round((i+1)*8/Math.max(1,total)*32))),cells=new Set();
 return activities.flatMap((a,index)=>(firstCheck<0||index<firstCheck)&&['formation','practice'].includes(a.phase)?[2,4,6].map(offset=>({position:index*8+offset})).map(p=>({...p,cell:Math.round(p.position/Math.max(1,total)*32)})).filter(p=>{if(gates.has(p.cell)||cells.has(p.cell))return false;cells.add(p.cell);return true;}):[]);
}
export function teacherSetupAvailability(pkg){
 const activities=pkg?.activities||[],tasks=pkg?.tasks||[];
 const explorationSupported=explorationCandidatePoints(pkg).length>=3;
 const eventTask=tasks.some(t=>t.type==='closed'&&(!t.branch||['shared','core'].includes(t.branch))&&CHECKERS.has(t.evaluation?.checkerId)&&activities.some(a=>!['recheck','exit'].includes(a.phase)&&a.taskIds?.includes(t.id)));
 return {explorationSupported,eventAvailable:Number(pkg?.budget?.reserveMinutes)>=3&&eventTask,reserveMinutes:Number(pkg?.budget?.reserveMinutes)||0};
}
export function recommendTeacherSetup(pkg){
 const tasks=pkg?.tasks||[],availability=teacherSetupAvailability(pkg);
 const participation=tasks.some(t=>t.participation==='group')?'group':tasks.some(t=>t.participation==='pair')?'pairs':'individual';
 const realWorld=tasks.some(t=>/hàng ghế|que tính|hội trường|bậc thang|tiết kiệm|vận tốc|quãng đường/i.test(t.prompt||''));
 return {worldTheme:'modern',deviceMode:'A',rule:'campaign',participation,explorationEnabled:availability.explorationSupported,revisitEnabled:true,integrationIds:realWorld?['real-world']:[],aiPolicy:'off',event:{type:availability.eventAvailable?'buzzer':'none',minutes:3}};
}
/** @param {{participation:string,event:{type:string,minutes:number}}} [setup] */
export function teacherSetupReasons(pkg,setup=recommendTeacherSetup(pkg)){
 const recommended=recommendTeacherSetup(pkg);
 return [recommended.participation==='group'?'Bài có nhiệm vụ hợp tác nhóm; kiểm tra cá nhân giữ riêng.':recommended.participation==='pairs'?'Bài có nhiệm vụ theo cặp; kiểm tra cá nhân giữ riêng.':'Bài có nhiệm vụ cá nhân; hoạt động cả lớp không tự chia nhóm.',...(setup.participation!==recommended.participation?['Hình thức chơi đã được GV chỉnh; cách làm từng nhiệm vụ học tập vẫn giữ nguyên.']:[]),setup.event.type==='none'?'Chưa bố trí sự kiện; giữ thời gian cho hoạt động học.':'Sự kiện chỉ được dự kiến trong thời gian dự phòng; giáo viên quyết định lúc mở.'];
}
export function normalizeTeacherSetup(input,pkg){
 const keys=['rule','participation','explorationEnabled','revisitEnabled','integrationIds','aiPolicy','event'];
 const optional=['worldTheme','deviceMode'];
 const fail=()=>{throw Error('INVALID_TEACHER_SETUP');};
 if(!object(input)||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k)&&!optional.includes(k)))fail();
 if(input.worldTheme!==undefined&&(typeof input.worldTheme!=='string'||!Object.hasOwn(WORLD_LABELS,input.worldTheme)))fail();
 if(input.deviceMode!==undefined&&(typeof input.deviceMode!=='string'||!Object.hasOwn(DEVICE_LABELS,input.deviceMode)))fail();
 if(typeof input.rule!=='string'||!Object.hasOwn(RULE_LABELS,input.rule)||!['individual','pairs','group'].includes(input.participation)||typeof input.explorationEnabled!=='boolean'||typeof input.revisitEnabled!=='boolean'||!AI_POLICIES.includes(input.aiPolicy))fail();
 if(!Array.isArray(input.integrationIds)||input.integrationIds.length>2||new Set(input.integrationIds).size!==input.integrationIds.length||input.integrationIds.some(id=>typeof id!=='string'||!Object.hasOwn(INTEGRATION_LABELS,id)))fail();
 const event=input.event;if(!object(event)||Object.keys(event).length!==2||Object.keys(event).some(k=>!['type','minutes'].includes(k))||typeof event.type!=='string'||!Object.hasOwn(EVENT_LABELS,event.type)||!Number.isInteger(event.minutes)||event.minutes<3||event.minutes>5)fail();
 const availability=teacherSetupAvailability(pkg);
 if(input.explorationEnabled&&!availability.explorationSupported)fail();
 if(event.type!=='none'&&(!availability.eventAvailable||event.minutes>availability.reserveMinutes))fail();
 if(event.type==='estimate'&&!(pkg.tasks||[]).some(t=>t.type==='closed'&&t.evaluation?.checkerId==='numeric_exact'&&(pkg.activities||[]).some(a=>!['recheck','exit'].includes(a.phase)&&a.taskIds?.includes(t.id))))fail();
 return {...(input.worldTheme!==undefined?{worldTheme:input.worldTheme}:{}),...(input.deviceMode!==undefined?{deviceMode:input.deviceMode}:{}),rule:input.rule,participation:input.participation,explorationEnabled:input.explorationEnabled,revisitEnabled:input.revisitEnabled,integrationIds:[...input.integrationIds],aiPolicy:input.aiPolicy,event:{type:event.type,minutes:event.minutes}};
}
