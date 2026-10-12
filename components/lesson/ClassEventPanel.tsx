"use client";

import React, { useState } from "react";
import MathText from "./MathText";
import TaskInput, { TaskInputProps } from "./TaskInput";
import ClassEventScene from "./ClassEventScene";

export interface ClassEventView {
  id: string; type: string; label: string; status: string; remainingMs: number; players: number;
  progress: { label: string; value: number; max?: number; unit?: string };
  teams: { label: string; points: number; players: number }[];
  own: { step: number; questions: number; score: number; correct: number; canAnswer: boolean; task: TaskInputProps["task"] | null; bingo: boolean[]; bingoFree?: boolean[]; opponentScore?: number | null; opponentId?:string|null; sharedDuel?:boolean;
    board?: { id: string; category: string; points: number; used: boolean; selected: boolean }[]; selectedCellId?: string | null; canPick?: boolean; combo?: number; buzzer?: {canBuzz:boolean;pressed:boolean;remainingMs:number} } | null;
}

export function ClassEventPanel({ view, onAnswer, onPick, onBuzz, onClose, disabled = false }: {
  view: ClassEventView | null;
  onAnswer?: (input: { answer: unknown; step: number }) => Promise<void> | void;
  onPick?: (input: { cellId: string }) => Promise<void> | void;
  onBuzz?: (input: {step:number}) => Promise<void> | void;
  onClose?: () => void;
  disabled?: boolean;
}) {
  const [pickBusy, setPickBusy] = useState(false);
  const [pickError, setPickError] = useState("");
  const [buzzBusy,setBuzzBusy]=useState(false),[buzzError,setBuzzError]=useState("");
  if (!view) return null;
  const own = view.own;
  const choose = async (cellId: string) => {
    if (!onPick) return;
    setPickBusy(true); setPickError("");
    try { await onPick({ cellId }); }
    catch { setPickError("Chưa chọn được ô. Giữ nguyên bảng; em thử lại."); }
    finally { setPickBusy(false); }
  };
  const buzz=async()=>{
    if(!onBuzz||!own?.buzzer?.canBuzz||disabled||buzzBusy)return;
    setBuzzBusy(true);setBuzzError("");
    try{await onBuzz({step:own.step});}catch{setBuzzError("Chưa bấm được chuông. Giữ nguyên lượt; em thử lại.");}finally{setBuzzBusy(false);}
  };
  return (
    <section aria-label={`Sự kiện lớp: ${view.label}`} className="lesson-card" style={{ padding: "1rem", border: "2px solid #f6d481" }}>
      <p className="lesson-kicker">Sự kiện lớp · {view.players} người</p>
      <h2>{view.label}</h2>
      <ClassEventScene view={view}/>
      <p role="status">{view.status === "closed" ? "Sự kiện đã kết thúc" : `Còn ${Math.ceil(view.remainingMs / 1000)} giây`} · {view.progress.label}: {view.progress.value}{view.progress.unit ? ` ${view.progress.unit}` : ""}</p>
      {typeof view.progress.max === "number" && view.type !== "tug" && <progress value={view.progress.value} max={view.progress.max} aria-label={view.progress.label} style={{ width: "100%" }} />}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {view.teams.map(team => <p key={team.label}>{team.label}: {team.points} điểm chơi · {team.players} người</p>)}
      </div>
      {own && <p>Em: {own.score} điểm chơi · {own.correct} câu đúng · {own.step}/{own.questions} câu đã làm</p>}
      {view.type === "duel" && own && <p>{own.opponentScore == null ? "Em được miễn đấu cặp này." : `Bạn cùng cặp: ${own.opponentScore} điểm chơi`}</p>}
      {own?.board && <div role="group" aria-label="Bảng Jeopardy của em">
        <h3>Bảng Jeopardy · Chọn ô</h3>
        <p className="lesson-muted">Chọn thứ tự bất kỳ. Điểm là mức cược trò chơi; mỗi ô chỉ làm một lần.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 8 }}>
          {own.board.map(cell => <button key={cell.id} type="button" className="lesson-button lesson-button-outline" aria-pressed={cell.selected}
            disabled={disabled || pickBusy || !onPick || !own.canPick || cell.used} onClick={() => void choose(cell.id)}
            style={{ minHeight: 44, whiteSpace: "normal", overflowWrap: "anywhere", display: "grid", gap: 6, padding: 12 }}>
            <span>{cell.category}</span><strong>{cell.points} điểm</strong><span>{cell.used ? "Đã làm" : cell.selected ? "Đang chọn" : "Chọn ô"}</span>
          </button>)}
        </div>
        {pickError && <p role="alert">{pickError}</p>}
      </div>}
      {own?.buzzer&&<div>
        <p>{own.buzzer.pressed?`Chuông đã được ghi nhận. Còn ${Math.ceil(own.buzzer.remainingMs/1000)} giây để nộp câu này.`:own.step>=own.questions?"Em đã hoàn thành lượt bấm chuông.":"Bấm chuông để mở câu của em. Mỗi lần có tối đa 30 giây; bấm chuông chưa được điểm."}</p>
        {own.buzzer.canBuzz&&<button type="button" className="lesson-button lesson-button-primary" style={{minHeight:44}} disabled={disabled||buzzBusy||!onBuzz} onClick={buzz}>Bấm chuông để trả lời</button>}
        {buzzError&&<p role="alert">{buzzError}</p>}
      </div>}
      {own?.task && <MathText text={own.task.prompt || ""}/>}
      {own?.task && onAnswer && <TaskInput key={`${view.id}:${own.step}`} task={own.task} disabled={disabled || buzzBusy || !own.canAnswer}
        onSubmit={answer => onAnswer({ answer, step: own.step })} />}
      {own && !own.canAnswer && view.status !== "closed" && <p>{own.step >= own.questions ? "Em đã làm xong các câu của sự kiện." : own.board && own.canPick ? "Em chọn một ô trên bảng rồi trả lời." : "Em chờ hết thời gian nghỉ hoặc tới lượt của đội."}</p>}
      <p className="lesson-muted">Điểm chơi của sự kiện được tính riêng. Hộ chiếu học tập dùng bằng chứng từ nhiệm vụ cá nhân.</p>
      {onClose && <button type="button" className="lesson-button lesson-button-outline" disabled={disabled} onClick={onClose} style={{ minHeight: 44 }}>Kết thúc sự kiện</button>}
    </section>
  );
}
