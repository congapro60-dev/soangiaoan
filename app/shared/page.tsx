"use client";
import React from "react";
import { ExplorationPanel, LessonAttention } from "../../components/lesson/ExplorationPanel";
import { LessonEncounterSheet } from "../../components/lesson/LessonEncounterSheet";
import { QuestionPager } from "../../components/lesson/QuestionPager";
import MathText from "../../components/lesson/MathText";
import { SharedDevicePanel } from "../../components/lesson/SharedDevicePanel";
import { useLessonSession, formatDuration } from "../../components/lesson/useLessonSession";
import TaskInput, { type TaskInputProps } from "../../components/lesson/TaskInput";
import { ClassEventPanel } from "../../components/lesson/ClassEventPanel";
import { LessonModePanel } from "../../components/lesson/LessonModePanel";
import { ValueReflection, type ValueReflectionData } from "../../components/lesson/ValueReflection";
import { PracticePanel } from "../../components/lesson/PracticePanel";
import { TutorPanel } from "../../components/lesson/TutorPanel";
import { SharedDuelPanel } from "../../components/lesson/SharedDuelPanel";
import { SessionRules } from "../../components/lesson/SessionRules";
import {getSafeWorldMetadata} from "../../components/lesson/LessonThemedRoute";
export default function SharedPage() {
 const [sessionId,setSessionId]=React.useState("");
 React.useEffect(()=>{const value=new URLSearchParams(window.location.search).get("session");if(value&&/^[A-Za-z0-9_-]{1,70}$/.test(value)){const timer=setTimeout(()=>setSessionId(value),0);return()=>clearTimeout(timer);}},[]); const [enteredToken,setEnteredToken]=React.useState(""); const [token,setToken]=React.useState("");
 const [usedAI,setUsedAI]=React.useState(false);
 const [members,setMembers]=React.useState<Array<{learnerId:string;name:string}>>([]); const [acting,setActing]=React.useState(""); const [note,setNote]=React.useState("");
 const {view,error,isSubmitting,dispatchCommand,getRemainingMs}=useLessonSession({sessionId:sessionId||null,role:"student",bearerToken:token,actingLearnerId:acting||undefined,enabled:Boolean(token&&acting)});
 const [taskOpen,setTaskOpen]=React.useState(false);
 const [practiceOpen,setPracticeOpen]=React.useState(false);
 const closeTask=React.useCallback(()=>setTaskOpen(false),[]);
 React.useEffect(()=>{if(view?.status!=="waiting"&&view?.status!=="paused")return;const timer=setTimeout(()=>setTaskOpen(false),0);return()=>clearTimeout(timer);},[view?.status]);
 const remaining=getRemainingMs();
 const dualDuel=members.length===2&&view?.classEvent?.type==="duel"&&view.classEvent.status==="active"&&view.status!=="concluded"&&view.classEvent.own?.sharedDuel===true&&members.some(member=>member.learnerId===view.classEvent?.own?.opponentId);
 const classEventActive=view?.classEvent?.status==="active";
 const gamePlan=view?.gamePlan as {theme?:string;rule?:string;participation?:string}|undefined;
 const blocked=isSubmitting||!view||view.status!=="active"||Boolean(view.timeline?.locked)||view.clock?.arenaPausedAt!=null||view.clock?.classEventPausedAt!=null||remaining!=null&&remaining<=0;
 const command=async(type:string,payload:Record<string,unknown>)=>{const result=await dispatchCommand(type,payload);setNote(result.ok?"":"Chưa lưu được. Kiểm tra lượt, biểu quyết của nhóm và kết nối rồi thử lại.");return result;};
 return <main className="lesson-shell" style={{maxWidth:900,margin:"auto",padding:16}}><h1>Thiết bị nhóm</h1>
 {!token&&<form onSubmit={async event=>{event.preventDefault();setNote("");try{const response=await fetch("/api/lesson-devices?sessionId="+encodeURIComponent(sessionId),{headers:{Authorization:"Bearer "+enteredToken},cache:"no-store"});const data=await response.json() as {members?:typeof members};if(!response.ok||!data.members)throw Error();setMembers(data.members);setToken(enteredToken);setEnteredToken("");}catch{setNote("Mã thiết bị chưa đúng, đã hết hạn hoặc bị thu hồi. Hỏi thầy cô để cấp lại.");}}}>
 <label>Mã phiên do thầy cô cấp<input className="lesson-input" value={sessionId} onChange={e=>setSessionId(e.target.value.trim())} required/></label>
 <label>Mã thiết bị — dán mã thầy cô cấp<input className="lesson-input" type="password" autoComplete="off" value={enteredToken} onChange={e=>setEnteredToken(e.target.value.trim())} required/></label><button className="lesson-button">Mở máy nhóm</button></form>}
 {token&&<><LessonAttention status={view?.status}/><details><summary>Luật phòng và cách chơi</summary><SessionRules worldTitle={gamePlan?.theme?getSafeWorldMetadata(view?.worldTheme||gamePlan.theme).name:"Thế giới của lớp"} rule={view?.lessonMode?.rule||gamePlan?.rule} participation={view?.lessonMode?.participation||gamePlan?.participation} eventLabel={view?.classEvent?.status==="active"?view.classEvent.label:undefined}/></details>{!dualDuel&&<SharedDevicePanel members={members} actingLearnerId={acting} onActingLearner={id=>{setNote("");setUsedAI(false);setTaskOpen(false);setPracticeOpen(false);setActing(id);}} disabled={isSubmitting}/>}
 <button className="lesson-button lesson-button-outline" onClick={()=>{setToken("");setMembers([]);setActing("");setNote("");}}>Thoát thiết bị</button>
 {dualDuel&&<SharedDuelPanel key={view?.classEvent?.id} sessionId={sessionId} token={token} members={members}/>}
 {acting&&!dualDuel&&<section key={acting}><ExplorationPanel view={view?.exploration} status={view?.status} activityId={view?.timeline?.currentActivityId} onCommand={command}/><h2>Nhiệm vụ của {members.find(m=>m.learnerId===acting)?.name}</h2>
 <p role="status">{view?.status==="waiting"?"Chờ thầy cô bắt đầu.":view?.status==="concluded"?"Tiết học đã kết thúc.":blocked?"Nhiệm vụ tạm dừng, bị khóa hoặc đã hết giờ.":"Đang làm bài"} · {formatDuration(remaining)}</p>
 <button type="button" data-encounter-trigger className="lesson-button" style={{minHeight:44}} disabled={view?.status==="waiting"||view?.status==="paused"} onClick={()=>setTaskOpen(true)}>Mở nhiệm vụ</button>
 <LessonEncounterSheet open={taskOpen&&view?.status!=="waiting"&&view?.status!=="paused"} title={classEventActive?"Sự kiện lớp":practiceOpen?"Luyện lại":"Nhiệm vụ của em"} onClose={closeTask}>
 {view?.mode==="live"&&["recheck","exit"].includes(view.currentActivity?.phase||"")&&!view.integrityConfirmed&&<label style={{display:"block",padding:12}}><input type="checkbox" checked={usedAI} onChange={event=>setUsedAI(event.target.checked)}/> Em đã dùng AI hoặc người khác giúp câu kiểm tra này</label>}
 {view?.mode==="live"&&["recheck","exit"].includes(view.currentActivity?.phase||"")&&!view.integrityConfirmed&&<button className="lesson-button" disabled={blocked} onClick={()=>void command("INTEGRITY",{confirmed:true,usedAI})}>Em xác nhận tự làm câu kiểm tra này</button>}
 <div className="play-tasks" hidden={classEventActive||practiceOpen} style={classEventActive||practiceOpen?{display:"none"}:undefined}><QuestionPager identity={`${sessionId}:${acting}:${view?.timeline?.currentActivityId||""}:${view?.round||0}`} busy={isSubmitting} items={view?.tasks?.map(raw=>{const task=raw as TaskInputProps["task"];const proposal=view.group?.proposal?.taskId===task.id?view.group.proposal:null;const submissions=(view.submissions||{}) as Record<string,TaskInputProps["submission"]>;const latest=Object.values(submissions).filter(sub=>(sub as {taskId?:string})?.taskId===task.id).at(-1);return {id:task.id,content:<div>
 <MathText text={task.prompt || ""}/><TaskInput task={task} currentLearnerId={acting} disabled={blocked||view.mode==="live"&&["recheck","exit"].includes(view.currentActivity?.phase||"")&&!view.integrityConfirmed} submission={latest}
 initialDraft={(view.drafts as Record<string,{answer?:unknown}>)?.[task.id]?.answer} onSubmit={async answer=>{await command("SUBMIT",{taskId:task.id,answer});}} onSaveDraft={answer=>{void command("SAVE_DRAFT",{taskId:task.id,answer});}} onOpenHint={async hintId=>{await command("HINT",{taskId:task.id,hintId});}}
 groupProduct={(view.group?.products[task.id] || null) as TaskInputProps["groupProduct"]} isGroupMode={task.participation==="group"} groupContributions={view.group?.contributions.filter(item=>item.taskId===task.id)} onGroupContribute={async text=>{const saved=await command("SAVE_DRAFT",{taskId:task.id,answer:{thought:text}});if(!saved.ok)throw Error();const sent=await command("GROUP_CONTRIBUTE",{taskId:task.id,text});if(!sent.ok)throw Error();}} onGroupSubmit={async answer=>{await command("GROUP_PROPOSE",{taskId:task.id,answer,proposalId:crypto.randomUUID()});}}/>
 {proposal&&<div style={{overflowWrap:"anywhere"}}><p>Đề xuất chung · {view.group?.consent?.votes}/{view.group?.consent?.required} phiếu.</p><MathText inline={false} text={Array.isArray(proposal.answer)?proposal.answer.map(id=>task.inputSchema?.items?.find(item=>item.id===id)?.label||String(id)).join("; "):proposal.answer&&typeof proposal.answer==="object"?Object.entries(proposal.answer).map(([id,value])=>`${[...(task.inputSchema?.representations||[]),...(task.inputSchema?.items||[])].find(item=>item.id===id)?.label||id}: ${[...(task.inputSchema?.cards||[]),...(task.inputSchema?.categories||[])].find(item=>item.id===value)?.label||String(value)}`).join("; "):String(proposal.answer??"")}/><button className="lesson-button" disabled={blocked} onClick={()=>void command("GROUP_VOTE",{taskId:task.id,proposalHash:proposal.hash})}>Đồng ý đề xuất này</button><button className="lesson-button" disabled={blocked||!view.group?.consent?.approved} onClick={()=>void command("GROUP_SUBMIT",{taskId:task.id,answer:proposal.answer,proposalHash:proposal.hash})}>Nộp sản phẩm đã thống nhất</button></div>}</div>};})||[]}/></div>
 <ClassEventPanel view={view?.classEvent||null} disabled={isSubmitting||view?.status!=="active"||Boolean(view?.timeline?.locked)} onBuzz={async input=>{const result=await command("CLASS_EVENT_BUZZ",{...input,eventId:view?.classEvent?.id,requestId:crypto.randomUUID()});if(!result.ok)throw Error();}} onPick={async ({cellId})=>{await command("CLASS_EVENT_PICK",{cellId,eventId:view?.classEvent?.id,requestId:crypto.randomUUID()});}} onAnswer={async input=>{const result=await command("CLASS_EVENT_ANSWER",{...input,eventId:view?.classEvent?.id,requestId:crypto.randomUUID()});if(!result.ok)throw Error();}}/>
 <div hidden={!practiceOpen||classEventActive} style={!practiceOpen||classEventActive?{display:"none"}:undefined}><PracticePanel practice={view?.practice} gates={view?.revisitGates} enabled={view?.revisitEnabled!==false} busy={isSubmitting||view?.status==="paused"} onCommand={command}/>
 <TutorPanel key={acting} tutor={view?.tutor} busy={isSubmitting} onCommand={command}/></div>
 {!classEventActive&&<div style={{marginTop:12}}><button type="button" className="lesson-button lesson-button-outline" style={{minHeight:44}} disabled={isSubmitting} onClick={()=>setPracticeOpen(open=>!open)}>{practiceOpen?"Về câu đang học":"Luyện lại cổng đã qua"}</button></div>}
 {view?.storyCue&&<details><summary>Câu chuyện của chặng</summary><p>{view.storyCue}</p><p>Bối cảnh hư cấu; em có thể bỏ qua.</p></details>}
 {view?.group&&<details className="lesson-card"><summary>Vai trong nhóm và lượt xúc xắc</summary>{(view.group.roleDefinitions||[]).map(role=><button key={role.id} className="lesson-button lesson-button-outline" disabled={blocked||Boolean(view.group?.roles[role.id]&&view.group.roles[role.id]!==acting)} onClick={()=>void command("CHOOSE_ROLE",{roleId:role.id})}>{role.label}{view.group?.roles[role.id]===acting?" · em":""}</button>)}<button className="lesson-button" disabled={blocked} onClick={()=>void command("ROLL",{})}>Gieo xúc xắc theo lượt nhóm</button></details>}
</LessonEncounterSheet>
 <details><summary>Hành trình và lựa chọn chơi</summary><LessonModePanel view={view?.lessonMode||null} disabled={blocked} onAction={async input=>{await command("MODE_ACTION",{...input,requestId:crypto.randomUUID()});}}/></details>
 {view?.status==="concluded"&&view.passportCard&&<div><h3>Hộ chiếu riêng</h3>{view.passportCard.objectives.map(objective=><p key={objective.id}><MathText text={objective.statement}/> · {objective.status==="independent"?"Em tự làm được":objective.status==="supported"?"Em làm được với hỗ trợ":"Cần luyện thêm"}</p>)}<p><MathText text={view.passportCard.nextStep}/></p></div>}
 {view?.currentActivity?.phase==="reflection"&&<SharedReflection key={acting} policy={view.aiPolicy} disabled={blocked} onSubmit={async reflection=>{await command("VALUE_REFLECT",{reflection});}}/>}
 </section>}</>}{(note||error)&&<p role="status">{note||error}</p>}</main>;
}

function SharedReflection({policy,disabled,onSubmit}:{policy?:"off"|"hints"|"check";disabled:boolean;onSubmit:(reflection:ValueReflectionData)=>Promise<void>}) {
 const [reflection,setReflection]=React.useState<ValueReflectionData>({integrity:false,usedAI:false,aiHelp:"",ownChanges:"",reflection:""});
 return <ValueReflection policy={policy} value={reflection} onChange={setReflection} disabled={disabled} onSubmit={()=>onSubmit(reflection)}/>;
}



