"use client";
import React from "react";
import { EDUFIT_VALUES, LESSON_INTEGRATIONS } from "../../lib/lesson/values.js";
import { BoardResponsePanel } from "./SharedDevicePanel";
import { ClassEventPanel, type ClassEventView } from "./ClassEventPanel";

const values = EDUFIT_VALUES as Array<{id:string;name:string}>;
const integrationsCatalogue = LESSON_INTEGRATIONS as Array<{id:string;name:string}>;
const RULES = {campaign:"Chiến dịch",duel:"Đối kháng",zones:"Ngũ khu",survival:"Sinh tồn",escort:"Hộ tống",treasure:"Kho báu",relay:"Tiếp sức",lockdown:"Phòng khóa",merchant:"Thương nhân"};
const EVENTS = {tug:"Kéo co",boss:"Đánh trùm",buzzer:"Bấm chuông",mountain:"Leo núi",castle:"Lâu đài",archery:"Bắn cung",surf:"Lướt sóng",duel:"Đối kháng",relay:"Tiếp sức",treasure:"Truy tìm kho báu",estimate:"Ước lượng",bingo:"Bingo"};
type ValueBadge = {valueId:string;evidenceId:string;reason:string;awardedAt:number;awardedBy:string;revokedAt?:number;revocationReason?:string};
export type ValueBadgeMap = Record<string,ValueBadge[]>;
export interface LessonQualityReport {
  learners?: number; pending?: number;
  objectives?: Array<{objectiveId:string;statement:string;withEvidence:number;independentMastery:number;supported:number}>;
  reflection?: {completed:number;total:number;rate:number|null};
  groupContribution?: {learners:number;total:number;rate:number|null};
  criteria?: Array<{id:string;status:string}>;
}
const CRITERIA: Record<string,string> = {higher_order_question:"Câu hỏi bậc cao",individual_and_group:"Cá nhân và nhóm",reflection:"Phản tư",integration:"Tích hợp",objective_evidence:"Bằng chứng theo mục tiêu"};
export function TeacherLessonTools({ sessionId, members, tasks, event, valueBadges = {}, qualityReport, tutors, onCommand }: {
  sessionId: string;
  members: Array<{learnerId:string;name:string}>;
  tasks: Array<{id:string;prompt?:string}>;
  event?: ClassEventView | null;
  valueBadges?: Record<string,ValueBadge[]>;
  qualityReport?: LessonQualityReport | null;
  tutors?: {history:Array<{id:string;tutorId:string;recipientId:string;status:string}>};
  onCommand: (type:string,payload:Record<string,unknown>)=>Promise<unknown>;
}) {
  const [note,setNote]=React.useState("");
  const [participation,setParticipation]=React.useState("individual");
  const [eventMinutes,setEventMinutes]=React.useState(3);
  const [integrations,setIntegrations]=React.useState<string[]>([]);
  const [aiPolicy,setAIPolicy]=React.useState("off");
  const [selectedLearner,setSelectedLearner]=React.useState("");
  const [valueId,setValueId]=React.useState(values[0].id);
  const [reason,setReason]=React.useState("");
  const [taskId,setTaskId]=React.useState(tasks[0]?.id||"");
  const [revokeReason,setRevokeReason]=React.useState("");
  const [deviceMembers,setDeviceMembers]=React.useState<{sessionId:string;ids:string[]}>({sessionId,ids:[]});
  const [issuedDeviceToken,setDeviceToken]=React.useState<{sessionId:string;value:string}|null>(null);
  const [deviceBusy,setDeviceBusy]=React.useState(false);
  const [devices,setDevices]=React.useState<{sessionId:string;items:Array<{id:string;kind:string;revoked:boolean;expiresAt:number}>}>({sessionId,items:[]});
  const selectedTaskId=tasks.some(task=>task.id===taskId)?taskId:tasks[0]?.id||"";
  const deviceToken=issuedDeviceToken?.sessionId===sessionId?issuedDeviceToken.value:"";
  const selectedDeviceMembers=(deviceMembers.sessionId===sessionId?deviceMembers.ids:[]).filter(id=>members.some(member=>member.learnerId===id));
  const selectedBadges=(valueBadges[selectedLearner]||[]).filter(badge=>!badge.revokedAt);
  const command=async(type:string,payload:Record<string,unknown>)=>{const result=await onCommand(type,payload) as {ok?:boolean;code?:string};setNote(result?.ok?"Đã cập nhật.":({EVENT_BUDGET_EXCEEDED:"Kế hoạch chưa còn đủ 3 phút dự phòng. Điều chỉnh kế hoạch trước khi mở sự kiện.",CLASS_EVENT_ACTIVE:"Kết thúc sự kiện đang chạy trước khi đổi hoạt động.",EVENT_TASKS_REQUIRED:"Chưa có câu đã duyệt phù hợp với mức của từng em."} as Record<string,string>)[result?.code||""]||"Chưa cập nhật được. Kiểm tra trạng thái tiết học.");};
  return <details className="lesson-card" style={{padding:"1rem",marginBottom:"1rem"}}><summary>Luật chơi, sự kiện, giá trị và thiết bị lớp</summary>
    <p>Đổi luật hoặc hình thức sẽ bắt đầu lại tiến độ chơi. Bài học và minh chứng đã nộp vẫn giữ.</p><label>Hình thức chơi<select className="lesson-select" value={participation} onChange={event=>setParticipation(event.target.value)}><option value="individual">Cá nhân</option><option value="pairs">Cặp trong tổ</option><option value="group">Theo tổ cố định</option></select></label>
    <label>Luật chơi <select className="lesson-select" defaultValue="" onChange={e=>void command("SET_MODE",{rule:e.target.value,participation})}><option value="" disabled>Chọn luật</option>{Object.entries(RULES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <div><button className="lesson-button" onClick={()=>void command("SET_REVISIT",{enabled:true})}>Mở luyện cổng</button><button className="lesson-button" onClick={()=>void command("SET_REVISIT",{enabled:false})}>Tắt luyện cổng</button></div>
    <h3>Sự kiện lớp</h3><label>Thời lượng sự kiện<select className="lesson-select" value={eventMinutes} onChange={event=>setEventMinutes(Number(event.target.value))}>{[3,4,5].map(minutes=><option key={minutes} value={minutes}>{minutes} phút</option>)}</select></label><p>Chỉ mở khi kế hoạch còn đủ thời gian dự phòng và có câu đã duyệt theo làn.</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{Object.entries(EVENTS).map(([type,label])=><button className="lesson-button lesson-button-outline" key={type} onClick={()=>void command("CLASS_EVENT_OPEN",{type,durationMs:eventMinutes*60000,seed:Date.now()%100000})}>{label}</button>)}</div>
    <ClassEventPanel view={event||null} onClose={async()=>{await command("CLASS_EVENT_CLOSE",{});}} />
    <h3>Chọn 1–2 tích hợp của tiết</h3><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{integrationsCatalogue.map(item=><label key={item.id}><input type="checkbox" checked={integrations.includes(item.id)} disabled={integrations.length===2&&!integrations.includes(item.id)} onChange={e=>setIntegrations(e.target.checked?[...integrations,item.id]:integrations.filter(id=>id!==item.id))}/>{item.name}</label>)}</div>
    <label>Trạm AI <select className="lesson-select" value={aiPolicy} onChange={e=>setAIPolicy(e.target.value)}><option value="off">Không AI</option><option value="hints">AI gợi ý</option><option value="check">AI kiểm tra</option></select></label><button className="lesson-button" disabled={!integrations.length} onClick={()=>void command("SET_VALUES",{integrationIds:integrations,aiPolicy})}>Lưu tích hợp</button>
    <h3>Ghi nhận giá trị từ hành vi đã quan sát</h3><label htmlFor="value-learner">Học sinh</label><select id="value-learner" className="lesson-select" value={selectedLearner} onChange={e=>setSelectedLearner(e.target.value)}><option value="">Chọn học sinh</option>{members.map(member=><option key={member.learnerId} value={member.learnerId}>{member.name}</option>)}</select>
    <label>Giá trị <select className="lesson-select" value={valueId} onChange={e=>setValueId(e.target.value)}>{values.map(value=><option key={value.id} value={value.id}>{value.name}</option>)}</select></label><label>Minh chứng đã quan sát <textarea className="lesson-textarea" value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} /></label><button className="lesson-button" disabled={!selectedLearner||!reason.trim()} onClick={()=>void command("VALUE_BADGE",{learnerId:selectedLearner,valueId,evidenceId:"observation-"+Date.now(),reason})}>Ghi nhận huy hiệu</button>
    {selectedLearner&&<><h4>Ghi nhận hiện có</h4>{!selectedBadges.length&&<p>Chưa có ghi nhận cho em này.</p>}
      <label htmlFor="badge-revoke-reason">Lý do thu hồi</label><input id="badge-revoke-reason" className="lesson-input" maxLength={500} value={revokeReason} onChange={event=>setRevokeReason(event.target.value)}/>
      <ul>{selectedBadges.map(badge=><li key={badge.valueId+":"+badge.evidenceId}><strong>{values.find(value=>value.id===badge.valueId)?.name||badge.valueId}</strong><p>{badge.reason}</p><button type="button" className="lesson-button lesson-button-outline" disabled={!revokeReason.trim()} onClick={()=>command("VALUE_REVOKE",{learnerId:selectedLearner,valueId:badge.valueId,evidenceId:badge.evidenceId,reason:revokeReason.trim()})}>Thu hồi ghi nhận</button></li>)}</ul></>}
    {tutors?.history?.length ? <section aria-label="Lịch sử trợ giảng"><h3>Trợ giảng cùng bạn</h3>{tutors.history.map(pair=>{const tutor=members.find(member=>member.learnerId===pair.tutorId)?.name||"Học sinh đã rời lớp",peer=members.find(member=>member.learnerId===pair.recipientId)?.name||"Học sinh đã rời lớp";return <div key={pair.id}><p>{tutor} hỗ trợ {peer} · {({requested:"Chờ bạn đồng ý",active:"Đang hỗ trợ",awaiting_recheck:"Chờ bạn tự làm câu kiểm tra",rewarded:"Đã ghi nhận sao trợ giảng",reward_revoked:"Đã thu hồi sao",rejected:"Bạn từ chối",cancelled:"Đã hủy",revoked:"GV dừng hỗ trợ",expired:"Đã kết thúc"} as Record<string,string>)[pair.status]||"Đã kết thúc"}</p>{["requested","active","awaiting_recheck","rewarded"].includes(pair.status)&&<button className="lesson-button lesson-button-outline" onClick={()=>void command("TUTOR_REVOKE",{requestId:pair.id})}>{pair.status==="rewarded"?"Thu hồi sao trợ giảng":"Dừng hỗ trợ"} {tutor} và {peer}</button>}</div>;})}</section>:null}
    {qualityReport&&<section aria-label="Báo cáo minh chứng tiết học"><h3>Báo cáo minh chứng tiết học</h3><p>Quan sát trong tiết; giáo viên đối chiếu tiêu chí chất lượng dạy học, không suy ra mức đánh giá chính thức.</p>
      <p>{qualityReport.learners||0} học sinh · {qualityReport.pending||0} bài chờ đánh giá</p>
      <p>Phản tư: {qualityReport.reflection?.completed||0}/{qualityReport.reflection?.total||0}; đóng góp nhóm: {qualityReport.groupContribution?.learners||0}/{qualityReport.groupContribution?.total||0}</p>
      {!qualityReport.objectives?.length&&<p>Chưa có minh chứng theo mục tiêu.</p>}
      <ul>{qualityReport.objectives?.map(objective=><li key={objective.objectiveId}>{objective.statement}: {objective.withEvidence} em có bài đã đánh giá, {objective.independentMastery} em có bằng chứng tự làm, {objective.supported} em dùng hỗ trợ.</li>)}</ul>
      <ul>{qualityReport.criteria?.map(criterion=><li key={criterion.id}>{CRITERIA[criterion.id]||criterion.id}: <span>{criterion.status==="observed"?"Đã quan sát":"Chưa có minh chứng"}</span></li>)}</ul>
    </section>}
    <h3>Thiết bị dùng chung</h3><p>Chọn đúng các em dùng máy nhóm này.</p><div role="group" aria-label="Chọn học sinh dùng chung máy">{members.map(member=><label key={member.learnerId} htmlFor={"device-member-"+member.learnerId} style={{display:"inline-flex",alignItems:"center",gap:6,minHeight:44,marginRight:12}}><input id={"device-member-"+member.learnerId} type="checkbox" checked={selectedDeviceMembers.includes(member.learnerId)} disabled={deviceBusy} onChange={event=>setDeviceMembers({sessionId,ids:event.target.checked?[...selectedDeviceMembers,member.learnerId]:selectedDeviceMembers.filter(id=>id!==member.learnerId)})}/>{member.name}</label>)}</div>
    {!members.length&&<p>Chưa có học sinh đang tham gia; mời các em vào phòng trước khi cấp máy nhóm.</p>}
    <button type="button" className="lesson-button" disabled={!selectedDeviceMembers.length||deviceBusy} onClick={async()=>{setDeviceBusy(true);setDeviceToken(null);try{const response=await fetch("/api/lesson-devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",sessionId,kind:"B",memberIds:selectedDeviceMembers,requestId:crypto.randomUUID(),ttlMs:4*3600000})});const data=await response.json() as {token?:string;error?:string};if(!response.ok||!data.token)throw Error(data.error||"DEVICE_UNAVAILABLE");setDeviceToken({sessionId,value:data.token});setNote("Đã cấp mã thiết bị; nhập trực tiếp trên máy nhóm.");}catch(error){setNote("Chưa cấp được thiết bị: "+(error instanceof Error?error.message:"thử lại"));}finally{setDeviceBusy(false);}}}>Cấp mã cho máy nhóm</button>
    {deviceToken&&<div><p>Mã phiên: <code>{sessionId}</code> · <a href="/shared" target="_blank" rel="noopener noreferrer">Mở thiết bị nhóm</a></p><label htmlFor="lesson-device-token">Mã thiết bị — chỉ hiện lần cấp này</label><input id="lesson-device-token" className="lesson-input" type="password" readOnly autoComplete="off" value={deviceToken}/><p>Nhập mã trên máy nhóm; thu hồi mã khi đổi nhóm hoặc hết tiết.</p><button type="button" className="lesson-button lesson-button-outline" onClick={()=>setDeviceToken(null)}>Ẩn mã trên máy này</button></div>}
    <button type="button" className="lesson-button lesson-button-outline" disabled={deviceBusy} onClick={async()=>{setDeviceBusy(true);try{const response=await fetch("/api/lesson-devices?sessionId="+encodeURIComponent(sessionId),{cache:"no-store"});const data=await response.json() as {devices?:typeof devices.items};if(!response.ok||!data.devices)throw Error();setDevices({sessionId,items:data.devices});setNote("");}catch{setNote("Chưa tải được danh sách máy đã cấp. Thử lại khi có mạng.");}finally{setDeviceBusy(false);}}}>Xem thiết bị đã cấp</button>
    {devices.sessionId===sessionId&&devices.items.filter(device=>!device.revoked).map((device,index)=><div key={device.id}><p>Máy {index+1} · {device.kind} · hết hạn {new Date(device.expiresAt).toLocaleString("vi-VN")}</p><button type="button" className="lesson-button lesson-button-outline" disabled={deviceBusy} onClick={async()=>{setDeviceBusy(true);try{const response=await fetch("/api/lesson-devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"revoke",sessionId,deviceId:device.id})});if(!response.ok)throw Error();setDevices(current=>({...current,items:current.items.filter(item=>item.id!==device.id)}));setDeviceToken(null);setNote("Đã thu hồi mã máy; thiết bị phải xin mã mới để tiếp tục.");}catch{setNote("Chưa thu hồi được mã. Thử lại rồi kiểm tra danh sách máy.");}finally{setDeviceBusy(false);}}}>Thu hồi mã máy {index+1}</button></div>)}
    <h3>Chỉ có TV: ghi câu trả lời trên bảng cá nhân</h3><label>Nhiệm vụ <select className="lesson-select" value={selectedTaskId} onChange={e=>setTaskId(e.target.value)}>{tasks.map(task=><option key={task.id} value={task.id}>{task.prompt?.slice(0,100)||task.id}</option>)}</select></label><BoardResponsePanel members={members} taskId={selectedTaskId} onRecordResponse={async(learnerId,taskId,answer)=>{await command("TEACHER_RESPONSE",{learnerId,taskId,answer});}}/>
    {note&&<p role="status" style={{overflowWrap:"anywhere"}}>{note}</p>}
  </details>;
}

