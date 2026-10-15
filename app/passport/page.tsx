"use client";

import React, { useEffect, useState, useRef } from "react";
import { EDUFIT_VALUES } from "../../lib/lesson/values.js";
import Link from "next/link";
import MathText from "../../components/lesson/MathText";

export const CLASS_PASSPORT_TOKEN_KEY = "lesson_class_passport_token";
type Passport = { leagues?:Array<{id:string;title:string}>; sessions?:Array<{id:string;status:string;storyEnding?:string}>; class: { id: string; title: string; code: string }; member: { id: string; name: string; code: string }; passport: { tutorHistory?:Array<{id:string;recipientName:string;at:number;revokedAt?:number}>; values?:Array<{valueId:string;reason:string;revokedAt?:number}>;reflections?:Array<{reflection:string;submittedAt:number}>; objectives: Array<{ key?: string; code: string; statement: string; status: string; independentCount: number; supportedCount: number }> } };
type Reply = Partial<Passport> & { error?: string; token?: string };
const STATUS: Record<string, string> = { pending: "Chờ giáo viên chấm", no_evidence: "Chưa có minh chứng", needs_support: "Cần luyện thêm", supported: "Đang luyện / đã làm với hỗ trợ", minimum_mastery: "Tự làm được mức cơ bản", standard_mastery: "Tự làm được mức chuẩn" };

export default function PassportPage() {
  const [classCode, setClassCode] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [passport, setPassport] = useState<Passport | null>(null);
  const [busy, setBusy] = useState(false);
  const requestEpoch=useRef(0);
  const [leagueBoard,setLeagueBoard] = useState<{highest:Array<{classTitle:string;meanScore:number}>;mostImproved:Array<{classTitle:string;improvement:number}>}|null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { try { if (active) setToken(sessionStorage.getItem(CLASS_PASSPORT_TOKEN_KEY) || ""); } catch { /* The current tab still works when browser storage is disabled. */ } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void fetch("/api/lesson-classes", { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json() as Reply;
      if (!response.ok || !data.class || !data.member || !data.passport) throw new Error(data.error || "CLASS_UNAVAILABLE");
      if (!controller.signal.aborted) { setPassport(data as Passport); setNote(""); }
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error.message === "AUTH_REQUIRED") { setToken(""); setPassport(null); try { sessionStorage.removeItem(CLASS_PASSPORT_TOKEN_KEY); } catch { /* Nothing was stored. */ } }
      setNote(error.message === "AUTH_REQUIRED" ? "Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Nhập lại mã và PIN do thầy cô cấp." : "Chưa tải được hộ chiếu. Thử tải lại trang khi có mạng.");
    });
    return () => controller.abort();
  }, [token]);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); requestEpoch.current++; setLeagueBoard(null); setBusy(true); setNote("");
    try {
      const response = await fetch("/api/lesson-classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", classCode, memberCode, pin }) });
      const data = await response.json() as Reply;
      if (!response.ok || !data.token || !data.class || !data.member || !data.passport) throw new Error(data.error || "CLASS_UNAVAILABLE");
      try { sessionStorage.setItem(CLASS_PASSPORT_TOKEN_KEY, data.token); } catch { /* Keep the bearer only in memory for this visit. */ }
      setPin(""); setToken(data.token); setPassport(data as Passport);
    } catch (error) { setNote((error as Error).message === "CLASS_LOGIN_UNAVAILABLE" ? "Mã hoặc PIN chưa đúng, đã bị thu hồi, hoặc đã thử sai 5 lần. Kiểm tra với thầy cô; nếu đã thử sai nhiều lần, chờ 15 phút." : "Chưa đăng nhập được. Kiểm tra mạng rồi thử lại."); }
    finally { setBusy(false); }
  };
  const logout = () => {
    requestEpoch.current++;
    try { sessionStorage.removeItem(CLASS_PASSPORT_TOKEN_KEY); } catch { /* No stored bearer remains in this component. */ }
    setToken(""); setPassport(null); setLeagueBoard(null); setPin(""); setClassCode(""); setMemberCode(""); setNote("");
  };

  return <main className="lesson-shell" style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
    <Link href="/">Về trang chính</Link>
    <h1>Hộ chiếu học tập</h1>
    <p className="lesson-muted">Dùng mã và PIN do thầy cô cấp. Chỉ em xem được hộ chiếu của mình trên trang này.</p>
    {!passport ? <form className="lesson-card" onSubmit={login} aria-busy={busy}>
      <label htmlFor="passport-class-code">Mã lớp</label>
      <input id="passport-class-code" className="lesson-input" autoComplete="off" autoCapitalize="characters" maxLength={6} value={classCode} onChange={event => setClassCode(event.target.value.toUpperCase())} required />
      <label htmlFor="passport-member-code">Mã học sinh</label>
      <input id="passport-member-code" className="lesson-input" autoComplete="off" autoCapitalize="characters" maxLength={6} value={memberCode} onChange={event => setMemberCode(event.target.value.toUpperCase())} required />
      <label htmlFor="passport-pin">PIN riêng</label>
      <input id="passport-pin" className="lesson-input" type="password" autoComplete="off" autoCapitalize="characters" maxLength={8} value={pin} onChange={event => setPin(event.target.value.toUpperCase())} required />
      <p className="lesson-muted">Không chia sẻ PIN. Trên thiết bị dùng chung, bấm “Thoát trên thiết bị này” sau khi xem.</p>
      <button className="lesson-button" disabled={busy || !classCode.trim() || !memberCode.trim() || !pin.trim()}>{busy ? "Đang đăng nhập…" : "Mở hộ chiếu"}</button>
    </form> : <>
      <section className="lesson-card" aria-label="Hộ chiếu riêng của em">
        <h2>{passport.member.name} · {passport.class.title}</h2>
        <p>Mã học sinh: {passport.member.code}</p>
        {passport.passport.objectives.length === 0 ? <p>Chưa có minh chứng từ các tiết học. Khi hoàn thành bài cá nhân được đánh giá, hộ chiếu sẽ ghi lại tiến bộ của em.</p> : <ul>
          {passport.passport.objectives.map(objective => <li key={objective.key || objective.code} style={{ marginBottom: 16 }}>
            <strong>{objective.code} · <MathText text={objective.statement}/></strong><br />
            {STATUS[objective.status] || STATUS.no_evidence} · {objective.independentCount} bài tự làm · {objective.supportedCount} bài có hỗ trợ
          </li>)}
        </ul>}
        {(passport.passport.tutorHistory||[]).filter(item=>!item.revokedAt).map((item,index)=><p key={item.id+index}>Em đã giúp bạn {item.recipientName} tự qua câu kiểm tra cá nhân. Sao trợ giảng ghi riêng với điểm Toán.</p>)}
        {passport.passport.values?.filter(badge=>!badge.revokedAt).length ? <section><h2>Giá trị em đã thể hiện</h2>{passport.passport.values.filter(badge=>!badge.revokedAt).map((badge,index)=><p key={index}>{(EDUFIT_VALUES as Array<{id:string;name:string}>).find(value=>value.id===badge.valueId)?.name || badge.valueId}: {badge.reason}</p>)}</section> : null}
        {passport.passport.reflections?.map((item,index)=><p key={index}>Lời nhìn lại: {item.reflection}</p>)}
        {passport.sessions?.filter(session=>session.storyEnding).map(session=><details key={session.id}><summary>Kết thúc hành trình</summary><p>{session.storyEnding}</p></details>)}
        <p className="lesson-muted">Sao bản đồ, điểm trò chơi và sản phẩm nhóm không thay cho minh chứng cá nhân.</p>
        {passport.leagues?.map(league=><button key={league.id} className="lesson-button" onClick={async()=>{const epoch=requestEpoch.current;try{const r=await fetch("/api/lesson-leagues?id="+encodeURIComponent(league.id),{headers:{Authorization:"Bearer "+token},cache:"no-store"});if(!r.ok)throw Error();const board=await r.json() as typeof leagueBoard;if(epoch===requestEpoch.current)setLeagueBoard(board);}catch{if(epoch===requestEpoch.current)setNote("Chưa tải được bảng lớp. Kiểm tra mạng rồi thử lại.");}}}>Bảng lớp: {league.title}</button>)}
        {leagueBoard&&<section><h2>Tiến bộ của lớp</h2>{leagueBoard.highest.map((item,index)=><p key={index}>{item.classTitle}: trung bình {item.meanScore.toFixed(1)} điểm chơi mỗi em</p>)}{leagueBoard.mostImproved.map((item,index)=><p key={index}>{item.classTitle}: tiến bộ {item.improvement.toFixed(1)} điểm chơi</p>)}</section>}
        <Link className="lesson-button" href="/play">Vào tiết học</Link>{passport.sessions?.filter(session=>session.status==="concluded").map((session,index)=><button key={session.id} type="button" className="lesson-button lesson-button-outline" onClick={()=>{sessionStorage.setItem("lesson_active_session_id",session.id);sessionStorage.setItem("lesson_active_token",token);sessionStorage.removeItem("lesson_active_learner_id");window.location.assign("/play");}}>Luyện lại tiết {index+1}</button>)}{" "}
        <button type="button" className="lesson-button lesson-button-outline" onClick={logout}>Thoát trên thiết bị này</button>
      </section>
    </>}
    {note && <p role="status">{note}</p>}
  </main>;
}

