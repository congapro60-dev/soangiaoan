"use client";
import React from "react";
import {lessonRuleLabels,lessonRuleGuides} from "./LessonModePanel";
export function SessionRules({worldTitle,rule,participation,eventLabel}:{worldTitle:string;rule?:string;participation?:string;eventLabel?:string}){
 const known=rule&&Object.hasOwn(lessonRuleGuides,rule),guide=known?lessonRuleGuides[rule!]:undefined,label=known?lessonRuleLabels[rule!]:"Chờ thầy cô chọn luật";
 const joining=participation==="individual"?"Cá nhân":participation==="group"?"Đội":participation==="pairs"?"Cặp đôi":"Chờ thầy cô chọn cách tham gia";
 return <section aria-label="Thế giới và luật của phòng" className="lesson-card" style={{padding:".4rem .75rem",margin:0,overflowWrap:"anywhere",background:"var(--lesson-surface,#1e293b)",color:"var(--lesson-text,#f8fafc)"}}>
  <div style={{display:"flex",flexWrap:"wrap",columnGap:12,rowGap:2,fontSize:13}}><span>Thế giới: <strong>{worldTitle}</strong></span><span>Luật: <strong>{label}</strong></span><span>Tham gia: <strong>{joining}</strong></span></div>
  <details><summary style={{minHeight:44,display:"flex",alignItems:"center",cursor:"pointer"}}>Xem lại luật phòng</summary>
   {guide?<dl style={{margin:"0 0 .5rem"}}>{["Mục tiêu chơi","Em làm gì","Khi nào hoàn thành"].map((title,index)=><div key={title}><dt><strong>{title}</strong></dt><dd style={{margin:"0 0 .5rem"}}>{guide[index]}</dd></div>)}</dl>:<p>Thầy cô sẽ chọn luật và hướng dẫn trước khi bắt đầu.</p>}
   <p>{participation==="individual"?"Em tự làm bài và chọn hành động của mình.":participation==="group"||participation==="pairs"?"Các em dùng chung phần chơi; người giữ lượt chọn hành động. Mỗi em vẫn làm nhiệm vụ cá nhân theo hướng dẫn của thầy cô.":"Cách chia lượt sẽ theo lựa chọn của thầy cô."}</p>
   <p>Điểm chơi tính riêng. Vị trí trên bản đồ hoặc về đích sớm không xác nhận kết quả Toán; hộ chiếu dùng bằng chứng làm bài cá nhân.</p>
  </details>
  {eventLabel&&<p style={{margin:0,fontSize:13}}>Sự kiện tạm thời: {eventLabel}. Kết thúc sự kiện sẽ trở lại luật phòng.</p>}
 </section>;
}
