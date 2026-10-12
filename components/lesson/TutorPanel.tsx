"use client";
import React from "react";
import MathText from "./MathText";

export type TutorPair = { id: string; activityId?: string; status: string; role: "tutor" | "recipient"; peerName: string; rewardedAt?: number; revokedAt?: number };
export type TutorView = { available: boolean; eligible: boolean; needed: boolean; candidates: Array<{ id: string; name: string }>; pair: TutorPair | null; hints: Array<{ id: string; taskId: string; prompt: string; text: string }>; history: TutorPair[]; stars: number };
export function TutorPanel({ tutor, busy, onCommand }: { tutor?: TutorView | null; busy: boolean; onCommand: (type: string, payload: Record<string, unknown>) => Promise<unknown> }) {
 const [error,setError]=React.useState("");
 if (!tutor) return null;
 const disabled=busy||!tutor.available;
 const command=async(type:string,payload:Record<string,unknown>)=>{
  setError("");
  try {const result=await onCommand(type,payload) as {ok?:boolean;code?:string}|undefined;if(result?.ok===false)setError(result.code==="TUTOR_LIMIT"?"Đã đạt giới hạn lời mời trong chặng này. Hỏi thầy cô để được hỗ trợ.":"Chưa thực hiện được. Tải lại trạng thái rồi thử hoặc hỏi thầy cô.");}
  catch {setError("Chưa thực hiện được. Kiểm tra kết nối rồi thử lại.");}
 };
 const pair=tutor.pair;
 return <section className="lesson-card" style={{padding:"1rem",marginTop:"1rem"}} aria-label="Trợ giảng cùng bạn">
  <h3>Trợ giảng cùng bạn</h3>
  <p>Hai em cùng tìm cách làm; không đọc đáp án cho nhau. Sao trợ giảng chỉ ghi nhận sau khi bạn tự qua câu kiểm tra cá nhân mới, không cộng bằng chứng Toán cho người giúp.</p>
  {!pair && !tutor.eligible && <button type="button" className="lesson-button lesson-button-outline" style={{minHeight:44}} disabled={disabled} onClick={()=>command("TUTOR_NEED",{needed:!tutor.needed})}>{tutor.needed?"Thôi cần hỗ trợ":"Em muốn được bạn hỗ trợ"}</button>}
  {!pair && tutor.eligible && <div>{tutor.candidates.length===0?<p>Chưa có bạn đăng ký cần hỗ trợ.</p>:tutor.candidates.map(peer=><button key={peer.id} type="button" className="lesson-button lesson-button-outline" style={{minHeight:44,margin:4}} disabled={disabled} onClick={()=>command("TUTOR_REQUEST",{recipientId:peer.id})}>Mời hỗ trợ {peer.name}</button>)}</div>}
  {pair && <div><p>{pair.role==="tutor"?"Bạn cùng em: ":"Bạn muốn hỗ trợ em: "}{pair.peerName}{pair.status==="requested"?" · Chờ đồng ý":" · Đã đồng ý làm nhóm đôi"}</p>
   {pair.status==="requested" && pair.role==="recipient"?<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" className="lesson-button" style={{minHeight:44}} disabled={disabled} onClick={()=>command("TUTOR_RESPOND",{requestId:pair.id,accept:true})}>Đồng ý</button><button type="button" className="lesson-button lesson-button-outline" style={{minHeight:44}} disabled={disabled} onClick={()=>command("TUTOR_RESPOND",{requestId:pair.id,accept:false})}>Từ chối</button></div>:<button type="button" className="lesson-button lesson-button-outline" style={{minHeight:44}} disabled={disabled} onClick={()=>command("TUTOR_END",{requestId:pair.id})}>{pair.status==="requested"?"Hủy lời mời":"Kết thúc hỗ trợ"}</button>}
   {pair.status==="active"&&pair.role==="tutor"&&tutor.hints.map(hint=><div key={hint.taskId+hint.id} style={{padding:8}}><MathText text={hint.prompt}/><MathText text={hint.text}/></div>)}
  </div>}
  {tutor.stars>0&&<p>Sao trợ giảng: {tutor.stars}</p>}
  {tutor.history.filter(pair=>pair.role==="tutor"&&pair.status==="rewarded").map(pair=><p key={pair.id}>Em đã giúp bạn {pair.peerName} tự qua câu kiểm tra cá nhân.</p>)}
  {error&&<p role="status">{error}</p>}
 </section>;
}
