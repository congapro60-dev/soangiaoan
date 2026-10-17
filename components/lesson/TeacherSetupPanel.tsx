"use client";
import React from "react";
import { RULE_GUIDE, RULE_SCOPE_NOTE } from "../../lib/rule-guide.js";
import { recommendTeacherSetup, teacherSetupReasons, teacherSetupAvailability, normalizeTeacherSetup, RULE_LABELS, EVENT_LABELS, INTEGRATION_LABELS, WORLD_LABELS, DEVICE_LABELS, PACING_LABELS } from "../../lib/lesson/teacher-setup.js";

export type TeacherSetup = {worldTheme?:string;deviceMode?:'A'|'B'|'C';pacing?:'self'|'teacher';rule:string;participation:string;explorationEnabled:boolean;revisitEnabled:boolean;integrationIds:string[];aiPolicy:string;event:{type:string;minutes:number}};
const rules:Record<string,string>=RULE_LABELS;
const participation:Record<string,string>={individual:"Cá nhân",pairs:"Cặp đôi",group:"Theo nhóm"};
const events:Record<string,string>=EVENT_LABELS;
export function TeacherSetupSummary({value}:{value:TeacherSetup}) {
 return <p>{value.worldTheme&&WORLD_LABELS[value.worldTheme]}{value.worldTheme?" · ":""}{PACING_LABELS[value.pacing||"self"]} · {value.deviceMode&&DEVICE_LABELS[value.deviceMode]}{value.deviceMode?" · ":""}{rules[value.rule]||value.rule} · {participation[value.participation]||value.participation} · Khám phá {value.explorationEnabled?"bật":"tắt"} · Luyện lại {value.revisitEnabled?"bật":"tắt"} · {value.integrationIds.length} tích hợp · AI {value.aiPolicy==="off"?"tắt":value.aiPolicy==="hints"?"gợi ý":"kiểm tra"} · {value.event.type!=="none"?`${events[value.event.type]} ${value.event.minutes} phút (GV mở khi phù hợp)`:"Không dự kiến sự kiện"}</p>;
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
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,margin:"16px 0"}}>
 <label>Nhịp chơi<select className="lesson-select" value={value.pacing||"self"} onChange={e=>change({pacing:e.target.value as 'self'|'teacher'})}>{Object.entries(PACING_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Thế giới<select className="lesson-select" value={value.worldTheme||"modern"} onChange={e=>change({worldTheme:e.target.value})}>{Object.entries(WORLD_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Luật chơi<select className="lesson-select" value={value.rule} onChange={e=>change({rule:e.target.value})}>{Object.entries(rules).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Hình thức<select className="lesson-select" value={value.participation} onChange={e=>change({participation:e.target.value})}>{Object.entries(participation).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Thiết bị học sinh<select className="lesson-select" value={value.deviceMode||"A"} onChange={e=>change({deviceMode:e.target.value as 'A'|'B'|'C'})}>{Object.entries(DEVICE_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 </div>
 <p>{(value.pacing||"self")==="self"?"HS tự đi: mỗi em tự lắc xúc xắc, tới cổng nào làm câu cổng đó; thầy cô có thể bấm Tạm dừng cả lớp bất cứ lúc nào để giảng.":"GV điều nhịp: HS chỉ làm câu của hoạt động thầy cô đang mở; bấm Tiếp theo để mở cổng sau."}</p>
 <p>Thiết bị chỉ quyết định cách vào lớp; không thay đổi câu hỏi hoặc kiểm tra cá nhân.</p>
 <RuleGuide rule={value.rule}/>
 <details><summary style={{minHeight:44,cursor:"pointer"}}>Tùy chọn nâng cao</summary>
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

const guides:Record<string,{name:string;how:string;goal:string;score:string;suits:string}>=RULE_GUIDE;
function RuleGuide({rule}:{rule:string}) {
 const guide=guides[rule];
 return <section className="lesson-card" aria-label="Giới thiệu luật đang chọn" style={{padding:12,margin:"8px 0"}}>
 {guide&&<p><strong>Luật {guide.name}:</strong> {guide.how} <strong>Mục tiêu:</strong> {guide.goal} <strong>Điểm trò chơi:</strong> {guide.score} <strong>Hợp với:</strong> {guide.suits}</p>}
 <p className="lesson-muted">{RULE_SCOPE_NOTE} Trong tiết học, luật khác “Hành trình” chỉ chạy khi bài có kế hoạch tổ chức đã duyệt; chưa có thì phòng chạy Hành trình.</p>
 <details><summary style={{minHeight:44,cursor:"pointer"}}>So sánh 9 luật trước khi chọn</summary>
 <div style={{overflowX:"auto"}}><table className="lesson-table"><thead><tr><th>Luật</th><th>Cách chơi</th><th>Điểm trò chơi</th><th>Hợp với</th></tr></thead>
 <tbody>{Object.entries(guides).map(([id,item])=><tr key={id}><td><strong>{item.name}</strong></td><td>{item.how}</td><td>{item.score}</td><td>{item.suits}</td></tr>)}</tbody></table></div></details>
 </section>;
}
