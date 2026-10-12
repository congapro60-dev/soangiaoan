"use client";
import React from "react";
import type { ClassEventView } from "./ClassEventPanel";
const finite=(value:number)=>Number.isFinite(value)?value:0;
const clamp=(value:number,max:number)=>Math.max(0,Math.min(max,finite(value)));

export default function ClassEventScene({view}:{view:ClassEventView}) {
 const {type,own,teams,progress}=view,value=finite(progress.value),blue="#2357a4",gold="#ca7e12",ink="#182f43";
 let scene:React.ReactNode,summary="";
 const line=(x1:number,y1:number,x2:number,y2:number,color=ink)=><line key={`${x1}:${y1}:${x2}:${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4}/>;
 const text=(x:number,y:number,label:string)=><text x={x} y={y} textAnchor="middle" fill={ink} fontSize={13}>{label}</text>;
 switch(type){
  case "tug":{
   const center=160+clamp(Math.abs(value),10)*8*Math.sign(value);
   summary=value===0?"Hai đội đang cân sức.":`${value>0?"Đội 1":"Đội 2"} đang chiếm lợi thế kéo co.`;
   scene=<>{line(38,82,282,82,gold)}{line(160,45,160,125,"#96a4ad")}<circle cx={center} cy={82} r={13} fill={gold}/><path d={`M${center} 52v24l22-12Z`} fill={value<0?gold:blue}/><rect x={20} y={62} width={28} height={40} rx={8} fill={gold}/><rect x={272} y={62} width={28} height={40} rx={8} fill={blue}/>{text(65,135,teams[1]?.label||"Đội 2")}{text(255,135,teams[0]?.label||"Đội 1")}</>;break;
  }
  case "boss":{
   const max=finite(progress.max||0),width=max>0?clamp(value/max,1)*240:0;summary=`Trùm còn ${value}/${max} năng lượng. Cả lớp cùng hợp sức.`;
   scene=<><path d="M132 37l-8-15 22 5h30l22-5-8 15" fill={gold}/><ellipse cx={160} cy={67} rx={43} ry={35} fill={blue}/><circle cx={147} cy={59} r={5} fill="white"/><circle cx={173} cy={59} r={5} fill="white"/><path d="M147 78q13 10 26 0" fill="none" stroke="white" strokeWidth={3}/><rect x={40} y={119} width={240} height={14} rx={7} fill="#dbe5ed"/><rect x={40} y={119} width={width} height={14} rx={7} fill={gold}/></>;break;
  }
  case "buzzer":{
   summary=own?(own.buzzer?.canBuzz?"Chuông sẵn sàng: em bấm để mở câu hỏi.":own.canAnswer?"Chuông đã ghi nhận: trả lời đúng thật nhanh.":own.step>=own.questions?"Em đã hoàn thành lượt bấm chuông.":"Chờ tín hiệu để trả lời."):"Trả lời đúng để ghi thời gian nhanh nhất.";
   scene=<><ellipse cx={160} cy={109} rx={58} ry={16} fill={ink}/><path d="M109 104v-18a51 51 0 0 1 102 0v18" fill={own?.canAnswer?gold:blue}/>{line(112,34,103,23,gold)}{line(208,34,217,23,gold)}{text(160,139,value>0?`${value} giây`:"Chưa có lượt đúng")}</>;break;
  }
  case "castle":{
   summary=teams.map(team=>`${team.label}: ${team.points} điểm`).join(" · ");
   scene=<>{teams.slice(0,2).map((team,index)=>{const x=54+index*150,count=clamp(Math.floor(team.points/10),3);return <g key={team.label}><path d={`M${x} 33v-12h12v12h12V21h12v12h12v-12h12v24H${x}Z`} fill={index?gold:blue}/>{[0,1,2].map(layer=><rect key={layer} x={x} y={46+layer*23} width={64} height={21} rx={3} fill={layer< count?(index?gold:blue):"#dbe5ed"}/>)}{text(x+32,135,team.label)}</g>;})}</>;break;
  }
  case "archery":{
   summary=`${value} mũi tên trúng đích. Mỗi câu đúng thêm một lần trúng.`;
   scene=<>{[47,34,21,8].map((r,index)=><circle key={r} cx={160} cy={72} r={r} fill={index%2?"#fff5de":blue}/>)}{Array.from({length:clamp(value,3)},(_,index)=>{const y=58+index*14;return <g key={index}>{line(210,y,163,y,gold)}<path d={`M163 ${y}l9-5v10Z`} fill={gold}/></g>;})}</>;break;
  }
  case "surf":{
   const x=55+clamp(value/Math.max(60,view.players*60),1)*210;summary=`Đã lướt ${value} m.${own?.combo?` Combo ×${own.combo}.`:""} Đúng liên tiếp để tăng combo, sai thì bắt đầu lại.`;
   scene=<><path d="M0 92q20-24 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0v58H0Z" fill="#bfdff3"/><path d="M0 116q20-18 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" fill="none" stroke={blue} strokeWidth={3}/><ellipse cx={x} cy={88} rx={31} ry={7} fill={gold}/><circle cx={x} cy={51} r={8} fill={ink}/>{line(x,61,x-5,78)}{line(x-5,78,x-15,84)}{line(x-5,78,x+15,84)}</>;break;
  }
  case "duel":{
   summary=own?(own.opponentScore==null?"Em được miễn đấu cặp này.":`Em ${own.score} điểm · Bạn cùng cặp ${own.opponentScore} điểm.`):"Các cặp cùng trả lời; điểm chơi được tính riêng.";
   scene=<><circle cx={85} cy={61} r={23} fill={blue}/><circle cx={235} cy={61} r={23} fill={gold}/>{line(118,82,202,40)}{line(118,40,202,82,gold)}{text(85,118,own?`Em: ${own.score}`:"Một bên")}{text(235,118,own?.opponentScore!=null?`Bạn: ${own.opponentScore}`:"Bên kia")}</>;break;
  }
  case "relay":{
   summary=own?(own.canAnswer?"Tới lượt em: nhận gậy, trả lời rồi chuyển lượt.":"Chờ lượt: gậy sẽ chuyển tới em."):`Đã hoàn thành ${value} chặng tiếp sức.`;
   scene=<>{line(35,98,285,98,"#96a4ad")}{[60,160,260].map((x,index)=><g key={x}><circle cx={x} cy={62} r={14} fill={index===1&&own?.canAnswer?gold:blue}/>{line(x,78,x,98)}</g>)}<rect x={144} y={30} width={38} height={10} rx={5} transform="rotate(-20 160 35)" fill={gold}/>{text(160,136,`${value} chặng`)}</>;break;
  }
  case "treasure":{
   summary=`Đã tìm ${value} manh mối. Trả lời đúng để mở thêm manh mối.`;
   scene=<>{[0,1,2].map(index=><g key={index}><rect x={25+index*48} y={40} width={36} height={48} rx={5} fill={index<value?gold:"#dbe5ed"}/>{text(43+index*48,71,index<value?"✓":"?")}</g>)}<path d="M205 68v-15q35-30 70 0v15" fill={gold}/><rect x={205} y={68} width={70} height={44} rx={4} fill={blue}/><rect x={234} y={64} width={12} height={26} rx={3} fill={gold}/></>;break;
  }
  case "estimate":{
   const maximum=own?own.questions*10:0,width=own&&maximum>0?clamp(own.score/maximum,1)*240:0;summary=own?`Em được ${own.score}/${maximum} điểm ước lượng. Ước lượng càng gần càng được nhiều điểm.`:`Cả lớp được ${value} điểm ước lượng.`;
   scene=<>{line(40,75,280,75)}{Array.from({length:11},(_,i)=>line(40+i*24,75,40+i*24,i%5===0?53:62))}<rect x={40} y={100} width={240} height={14} rx={7} fill="#dbe5ed"/><rect x={40} y={100} width={width} height={14} rx={7} fill={gold}/>{text(160,140,own?`${own.score} điểm`:`${value} điểm cả lớp`)}</>;break;
  }
  case "bingo":{
   summary=own?own.bingo.slice(0,4).map((marked,i)=>`Ô ${i+1}: ${own.bingoFree?.[i]?"Tự do":marked?"đã đánh dấu":"chưa đánh dấu"}`).join(" · ")+". Ô tự do không tự tạo chiến thắng.":`${value} bạn đã hoàn thành một hàng Bingo.`;
   scene=<>{Array.from({length:4},(_,i)=>{const x=111+(i%2)*51,y=19+Math.floor(i/2)*51;return <g key={i}><rect x={x} y={y} width={46} height={46} rx={5} fill={own?.bingo[i]?gold:"#dbe5ed"}/>{text(x+23,y+28,own?.bingoFree?.[i]?"Tự do":own?.bingo[i]?"✓":String(i+1))}</g>;})}</>;break;
  }
  default:return null;
 }
 return <figure style={{margin:".75rem 0",maxWidth:640}} aria-label={view.label+": "+summary}>
  <svg width="100%" viewBox="0 0 320 150" role="img" aria-label={summary} style={{display:"block",background:"#f6f9fc",borderRadius:12}}>{scene}</svg>
  <figcaption style={{padding:".5rem 0",overflowWrap:"anywhere"}}>{summary}</figcaption>
 </figure>;
}
