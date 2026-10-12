"use client";
import React from "react";
import {useLessonSession} from "./useLessonSession";
import {ClassEventPanel} from "./ClassEventPanel";
type Member={learnerId:string;name:string};
export function SharedDuelPanel({sessionId,token,members}:{sessionId:string;token:string;members:Member[]}) {
 if(members.length!==2 || members[0].learnerId===members[1].learnerId)return null;
 return <section aria-label="Đối kháng hai người cùng máy"><h2>Hai người cùng máy</h2><p>Mỗi em dùng khung mang tên mình. Hai em nộp câu trả lời riêng; điểm trò chơi không xác nhận kết quả học tập.</p>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:16}}>
   {members.map((member,index)=><DuelSide key={member.learnerId} sessionId={sessionId} token={token} member={member} opponentId={members[1-index].learnerId}/>)}
  </div>
 </section>;
}
function DuelSide({sessionId,token,member,opponentId}:{sessionId:string;token:string;member:Member;opponentId:string}){
 const {view,error,isSubmitting,dispatchCommand}=useLessonSession({sessionId,role:"student",bearerToken:token,actingLearnerId:member.learnerId,enabled:Boolean(sessionId&&token)});
 const event=view?.classEvent,confirmed=event?.type==="duel"&&event.own?.sharedDuel===true&&event.own.opponentId===opponentId;
 const blocked=isSubmitting||Boolean(error)||view?.status!=="active"||Boolean(view.timeline?.locked);
 return <section className="lesson-card" style={{minWidth:0,padding:12}} aria-label={"Phần của "+member.name}><h3>{member.name}</h3>
  {confirmed?<ClassEventPanel view={event} disabled={blocked} onAnswer={async input=>{const result=await dispatchCommand("CLASS_EVENT_ANSWER",{...input,eventId:event.id,requestId:crypto.randomUUID()});if(!result.ok)throw Error();}}/>:<p role="status">Cặp đối kháng chưa được xác nhận. Hai em chờ thầy cô hoặc dùng chế độ cá nhân.</p>}
  {error&&<p role="alert">Chưa kết nối được phần của em. Kiểm tra mã thiết bị hoặc hỏi thầy cô.</p>}
 </section>;
}
