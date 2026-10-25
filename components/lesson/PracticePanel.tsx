"use client";
import React from "react";
import MathText from "./MathText";
import TaskInput, { type TaskInputProps } from "./TaskInput";
import TaskImage, { taskImageOf, taskSolidOf } from "./TaskImage";

export type PracticeView = { activityId: string; attemptId: string; assessed: boolean; correct?: boolean; task: TaskInputProps["task"]; submission?: TaskInputProps["submission"] };
export function PracticePanel({ practice, gates, enabled, busy, onCommand }: {
  practice?: PracticeView | null;
  gates?: Array<{ id: string; title: string; number?: number; branches?: string[] }>;
  enabled: boolean;
  busy: boolean;
  onCommand: (type: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [selectedGate, setSelectedGate] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState("core");
  const gate = gates?.find(item => item.id === selectedGate) || gates?.[0];
  const branches = gate?.branches || ["core"];
  const branch = branches.includes(selectedBranch) ? selectedBranch : branches[0];
  const [error, setError] = React.useState("");
  const command = async (type: string, payload: Record<string, unknown>) => {
    setError("");
    const result = await onCommand(type, payload) as { ok?: boolean; code?: string } | undefined;
    if (result?.ok === false) setError(result.code === "STALE_PRACTICE" ? "Câu luyện đã đổi ở phiên khác. Tải lại trước khi nộp." : result.code === "PRACTICE_WAIT" ? "Chờ 10 giây trước khi mở câu tiếp theo." : "Chưa mở được câu luyện. Hãy thử lại hoặc hỏi thầy cô.");
  };
  if (!enabled || !gates?.length) return null;
  return <section className="lesson-card" style={{ padding: "1rem", marginTop: "1rem" }} aria-label="Luyện lại cổng đã qua">
    <h3>Luyện lại cổng đã qua</h3>
    <p>Em thử câu biến thể để tăng sao. Đồng hồ lớp vẫn chạy theo chặng hiện tại; điểm chơi không xác nhận em đã đạt mục tiêu.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:".5rem",alignItems:"end"}}>
      <label>Cổng đã qua<select className="lesson-select" style={{minHeight:44}} value={gate?.id || ""} disabled={busy} onChange={event=>setSelectedGate(event.target.value)}>{gates.map((item,index)=><option key={item.id} value={item.id}>Cổng {item.number || index+1}</option>)}</select></label>
      <label>Mức luyện<select className="lesson-select" style={{minHeight:44}} value={branch || ""} disabled={busy} onChange={event=>setSelectedBranch(event.target.value)}>{branches.map(value=><option key={value} value={value}>{value==="support"?"Nền tảng":value==="extension"?"Thử thách":"Chuẩn"}</option>)}</select></label>
      <button className="lesson-button" style={{minHeight:44}} type="button" disabled={busy || !gate || !branch || practice?.submission?.assessmentStatus === "pending"} onClick={()=>{if(gate&&branch)void command("REVISIT",{activityId:gate.id,branch});}}>Mở câu</button>
    </div>
    {practice && <PracticeInput key={practice.attemptId} practice={practice} busy={busy} onSubmit={(answer,confirmed,usedAI) => command("REVISIT_SUBMIT", { answer, attemptId: practice.attemptId, confirmed, usedAI })} />}
    {error && <p role="status">{error}</p>}
  </section>;
}

function PracticeInput({practice,busy,onSubmit}:{practice:PracticeView;busy:boolean;onSubmit:(answer:unknown,confirmed:boolean,usedAI:boolean)=>Promise<unknown>}) {
 const [confirmed,setConfirmed]=React.useState(false),[usedAI,setUsedAI]=React.useState(false);
 const disabled=busy || practice.assessed || practice.submission?.assessmentStatus === "pending";
 return <div><TaskImage image={taskImageOf(practice.task)} solidKey={taskSolidOf(practice.task)} /><MathText text={practice.task.prompt || ""}/><fieldset disabled={disabled}><legend>Cam kết bài luyện này</legend>
 <label style={{display:"block",padding:12}}><input type="checkbox" checked={usedAI} onChange={event=>setUsedAI(event.target.checked)}/> Em đã dùng AI hoặc được người khác giúp bài này</label>
 <label style={{display:"block",padding:12}}><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/> Em khai đúng phần tự làm và trợ giúp đã dùng</label>
 </fieldset><TaskInput task={practice.task} disabled={disabled || !confirmed} submission={practice.submission} onSubmit={async answer=>{await onSubmit(answer,confirmed,usedAI);}}/></div>;
}
