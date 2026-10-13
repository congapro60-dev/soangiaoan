"use client";
import React from "react";
import { recommendTeacherSetup, teacherSetupReasons, teacherSetupAvailability, normalizeTeacherSetup, RULE_LABELS, EVENT_LABELS, INTEGRATION_LABELS } from "../../lib/lesson/teacher-setup.js";

export type TeacherSetup = {rule:string;participation:string;explorationEnabled:boolean;revisitEnabled:boolean;integrationIds:string[];aiPolicy:string;event:{type:string;minutes:number}};
const rules:Record<string,string>=RULE_LABELS;
const participation:Record<string,string>={individual:"Cá nhân",pairs:"Cặp đôi",group:"Theo nhóm"};
const events:Record<string,string>=EVENT_LABELS;
export function TeacherSetupSummary({value}:{value:TeacherSetup}) {
 return <p>{rules[value.rule]||value.rule} · {participation[value.participation]||value.participation} · Khám phá {value.explorationEnabled?"bật":"tắt"} · Luyện lại {value.revisitEnabled?"bật":"tắt"} · {value.integrationIds.length} tích hợp · AI {value.aiPolicy==="off"?"tắt":value.aiPolicy==="hints"?"gợi ý":"kiểm tra"} · {value.event.type!=="none"?`${events[value.event.type]} ${value.event.minutes} phút (GV mở khi phù hợp)`:"Không dự kiến sự kiện"}</p>;
}
export function TeacherSetupPanel({lesson,value,onChange}:{lesson:Record<string,unknown>;value:TeacherSetup;onChange:(value:TeacherSetup)=>void}) {
 const recommended=recommendTeacherSetup(lesson) as TeacherSetup;
 const change=(patch:Partial<TeacherSetup>)=>onChange({...value,...patch});
 const availability=teacherSetupAvailability(lesson);
 const maxMinutes=Math.min(5,Number((lesson.budget as {reserveMinutes?:number})?.reserveMinutes||0));
 return <section className="lesson-card" aria-label="Thiết lập trước khi mở phòng" style={{padding:16,marginBottom:16}}><h2>Thiết lập cho cả bài</h2><TeacherSetupSummary value={value}/>
 <p>Gợi ý từ nội dung và thời lượng bài đang chọn. Thầy cô có thể chỉnh lại rồi xác nhận khi mở phòng.</p>
 <ul>{teacherSetupReasons(lesson,value).map((reason:string,index:number)=><li key={index}>{reason}</li>)}</ul>
 <button type="button" className="lesson-button" style={{minHeight:44}} onClick={()=>onChange(recommended)}>Gợi ý thiết lập cả bài</button>
 <details><summary style={{minHeight:44,cursor:"pointer"}}>Tự chỉnh thiết lập</summary>
 <label>Luật chơi<select className="lesson-select" value={value.rule} onChange={e=>change({rule:e.target.value})}>{Object.entries(rules).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Hình thức<select className="lesson-select" value={value.participation} onChange={e=>change({participation:e.target.value})}>{Object.entries(participation).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label style={{display:"block",minHeight:44}}><input type="checkbox" checked={value.explorationEnabled} disabled={!availability.explorationSupported} onChange={e=>change({explorationEnabled:e.target.checked})}/> Khám phá để đọc thư giãn</label>
 <label style={{display:"block",minHeight:44}}><input type="checkbox" checked={value.revisitEnabled} onChange={e=>change({revisitEnabled:e.target.checked})}/> Cho luyện lại cổng</label>
 <p>Chọn tối đa hai tích hợp phù hợp với bài.</p>
 <SetupIntegrations value={value.integrationIds} onChange={integrationIds=>change({integrationIds})}/>
 <label>AI hỗ trợ<select className="lesson-select" value={value.aiPolicy} onChange={e=>change({aiPolicy:e.target.value})}><option value="off">Không AI</option><option value="hints">AI gợi ý</option><option value="check">AI kiểm tra</option></select></label>
 <label>Sự kiện dự kiến<select className="lesson-select" value={value.event.type} onChange={e=>change({event:{type:e.target.value,minutes:3}})}>{Object.entries(events).map(([id,label])=><option key={id} value={id} disabled={id!=="none"&&(()=>{try{normalizeTeacherSetup({...value,event:{type:id,minutes:3}},lesson);return false;}catch{return true;}})()}>{label}</option>)}</select></label>
 {value.event.type!=="none"&&<label>Thời lượng sự kiện<select className="lesson-select" value={value.event.minutes} onChange={e=>change({event:{...value.event,minutes:Number(e.target.value)}})}>{[3,4,5].filter(minutes=>minutes<=maxMinutes).map(minutes=><option key={minutes} value={minutes}>{minutes} phút</option>)}</select></label>}
 <p>Sự kiện chỉ được mở thủ công; phải đủ quỹ dự phòng và câu phù hợp. Kiểm tra cá nhân vẫn giữ nguyên.</p></details></section>;
}

function SetupIntegrations({value,onChange}:{value:string[];onChange:(value:string[])=>void}) {
 return <div>{Object.entries(INTEGRATION_LABELS).map(([id,name])=><label key={id} style={{display:"block",minHeight:44}}><input type="checkbox" checked={value.includes(id)} disabled={value.length>=2&&!value.includes(id)} onChange={e=>onChange(e.target.checked?[...value,id]:value.filter(selectedId=>selectedId!==id))}/> {name}</label>)}</div>;
}
