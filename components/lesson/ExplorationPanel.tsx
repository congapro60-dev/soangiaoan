"use client";
import React from "react";
import MathText from "./MathText";

export type ExplorationView = {
  supported:boolean; enabled:boolean; canOpen:boolean; open:boolean; remainingMs:number; budgetLeftMs:number;
  fragments?:number; rewardUnlocked?:boolean;
  cards?:Array<{id:string;title:string;category?:string;body?:string;sourceLabel?:string;sourceUrl?:string;found:boolean;collected:boolean;position?:number}>;
  points?:Array<{id:string;position:number;cell:number;found:boolean;collected:boolean}>;
};
const surface:React.CSSProperties={background:"var(--lesson-surface,#1e293b)",color:"var(--lesson-text,#f8fafc)",border:"1px solid #64748b",borderRadius:16,padding:20};

export function LessonAttention({status}:{status?:string}) {
  const dialog=React.useRef<HTMLDialogElement>(null);
  const active=status==="waiting"||status==="paused";
  React.useEffect(()=>{if(active){if(!dialog.current?.open)dialog.current?.showModal();}else dialog.current?.close();},[active]);
  return <dialog ref={dialog} aria-label="Hướng chú ý của lớp" onCancel={event=>event.preventDefault()} style={{...surface,position:"fixed",inset:0,width:"100vw",height:"100dvh",maxWidth:"none",maxHeight:"none",margin:0,borderRadius:0,zIndex:2147483647,textAlign:"center",padding:"25vh 24px"}}>
    <h1>{status==="waiting"?"Chờ thầy cô bắt đầu":"Cả lớp nhìn lên"}</h1><p>{status==="waiting"?"Chuẩn bị vở và bút. Nhiệm vụ sẽ mở khi thầy cô bắt đầu.":"Trao đổi cùng thầy cô. Bài đang làm được giữ để em tiếp tục."}</p>
  </dialog>;
}

export function ExplorationPanel({view,status,activityId,onCommand,openCardId,onDismiss,hideTrigger=false}:{view?:ExplorationView;status?:string;activityId?:string;onCommand:(type:string,payload:Record<string,unknown>)=>Promise<unknown>;openCardId?:string|null;onDismiss?:()=>void;hideTrigger?:boolean}) {
  const dialog=React.useRef<HTMLDialogElement>(null),trigger=React.useRef<HTMLButtonElement>(null);
  const body=React.useRef<HTMLDivElement>(null);
  const [selection,setSelection]=React.useState<{scope?:string;requested:string|null;id:string|null}>({scope:activityId,requested:null,id:null});
  const [busy,setBusy]=React.useState(false),[note,setNote]=React.useState("");
  const allowed=Boolean(view?.open&&status==="active");
  const canRead=allowed||Boolean(status==="concluded"&&view?.enabled);
  const priorActivity=React.useRef(activityId);
  React.useEffect(()=>{if(priorActivity.current!==activityId){priorActivity.current=activityId;dialog.current?.close();onDismiss?.();}},[activityId,onDismiss]);
  React.useEffect(()=>{if(!canRead){dialog.current?.close();if(openCardId)onDismiss?.();}},[canRead,openCardId,onDismiss]);
  React.useEffect(()=>{if(openCardId&&canRead&&!dialog.current?.open)dialog.current?.showModal();},[openCardId,canRead]);
  if(!view?.supported||!view.enabled)return null;
  const cards=view.cards||[],requested=openCardId??null;
  const wanted=selection.scope===activityId&&selection.requested===requested?selection.id:requested;
  const index=Math.max(0,cards.findIndex(card=>card.id===wanted)),card=cards[index];
  const choose=(next:number)=>{setSelection({scope:activityId,requested,id:cards[next].id});setNote("");body.current?.scrollTo({top:0});body.current?.focus({preventScroll:true});};
  const close=()=>{setSelection({scope:activityId,requested:null,id:card?.id||null});dialog.current?.close();onDismiss?.();if(!hideTrigger)trigger.current?.focus();};
  return <><button ref={trigger} hidden={hideTrigger} type="button" className="lesson-button lesson-button-outline" style={{minHeight:44}} disabled={!canRead} onClick={()=>dialog.current?.showModal()}>Sổ tay Khám phá · {view.fragments||0}/3 mảnh</button>
    <dialog ref={dialog} className="lesson-exploration-dialog" aria-label="Sổ tay Khám phá" onCancel={close} onClose={onDismiss} style={{...surface,padding:16,width:"min(620px, calc(100vw - 24px))",maxHeight:"calc(100dvh - 24px)",overflow:"hidden",overflowWrap:"anywhere"}}>
      <header className="lesson-exploration-head"><strong>Khám phá · {view.fragments||0}/3 mảnh</strong><button type="button" className="lesson-button" style={{minHeight:44}} onClick={close}>Đóng sổ tay</button></header>
      <div ref={body} className="lesson-exploration-body" tabIndex={-1}>
      {view.rewardUnlocked&&<p><strong>Nhà thám hiểm · 3/3</strong> · Khung sổ tay trang trí đã mở. Không cộng điểm Toán.</p>}
      {card&&<section aria-label={card.title.replaceAll("$","")}><h3><MathText text={card.title}/></h3><p><MathText text={card.category}/></p><MathText text={card.body} inline={false} as="p"/>
        <p>{card.collected?"Mảnh này đã ở trong sổ tay của em.":card.found?"Em đã gặp ô này và có thể nhận mảnh.":"Chưa gặp ô: em vẫn được đọc, chưa nhận mảnh này."}</p>
        {card.found&&!card.collected&&<button type="button" className="lesson-button" style={{minHeight:44}} disabled={!allowed||busy} onClick={async()=>{setBusy(true);setNote("");try{const result=await onCommand("EXPLORATION_READ",{cardId:card.id}) as {ok?:boolean};setNote(result?.ok?"Đã nhận mảnh.":"Chưa nhận được mảnh. Giờ Khám phá có thể đã đóng; em vẫn có thể xem lại sau tiết học.");}catch{setNote("Chưa nhận được mảnh. Kiểm tra kết nối rồi thử lại.");}finally{setBusy(false);}}}>Đã đọc · nhận mảnh</button>}
      </section>}<p role="status">{note}</p></div>
      <footer className="lesson-question-pager-footer"><button type="button" className="lesson-button" disabled={busy||index===0} onClick={()=>choose(index-1)}>Thẻ trước</button><span aria-live="polite">Thẻ {cards.length?index+1:0}/{cards.length}{status==="concluded"?" · Xem lại":""}</span><button type="button" className="lesson-button" disabled={busy||index>=cards.length-1} onClick={()=>choose(index+1)}>Thẻ tiếp</button></footer>
    </dialog></>;
}
