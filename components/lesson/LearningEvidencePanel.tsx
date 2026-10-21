"use client";

import React, { useEffect, useRef, useState } from "react";
import MathText from "./MathText";
import { QuestionPager } from "./QuestionPager";

type Rating = "not_started" | "working" | "met";
type Levels = Record<"must" | "should" | "could", Rating>;
type Command = (type: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
type TeacherView = { revision?:number; status?:string; learningEvidence?: LearningEvidenceView; openAssessments?:Record<string,AssessmentRecord>; submissions?:Record<string,{submissionId:string;learnerId:string;taskId:string;activityId:string;answer:unknown;assessmentStatus:string;ok:boolean|null;at:number;aiAssessment?:{reason?:string;model?:string}}>; roster?:Record<string,{name:string;present?:boolean}>; tasks?:Array<{id:string;prompt?:string}> };
type AssessmentRecord = {submissionId:string;learnerId:string;taskId:string;activityId:string;answer:unknown;status:string;criteriaMet?:boolean;feedback?:string;reason?:string;model?:string;createdAt:number;assessmentSource?:string;assessedAt?:number};
export type LearningEvidenceView = { stats?: { total: number; submitted: number; passed: number; notPassed: number; pendingTeacher: number; needsReview?: number; incomplete?: number; aiAssessed?:number; teacherAssessed?:number; notSubmitted: number; rate: number | null }; selfAssessments?: Record<string, { name: string; levels: Levels; updatedAt: number }>; submitted?:number; passed?:number; notPassed?:number;needsReview?:number;pending?:number;items?:{taskId:string;status:string;criteriaMet:boolean|null;feedback:string|null;submittedAt:number}[] };
type StudentView = { learningEvidence?: LearningEvidenceView; selfAssessment?: (Levels & { updatedAt: number }) | null; objectives?: { level: string; statement: string }[] };
const ratings: Record<Rating, string> = { not_started: "Chưa bắt đầu", working: "Đang thực hiện", met: "Tự thấy đã đạt" };
const levels = ["must", "should", "could"] as const;
const box = { display: "grid", gap: ".75rem", minWidth: 0, overflowWrap: "anywhere" as const };

async function assessmentRequest(body: Record<string, unknown>) {
  const response = await fetch("/api/lesson-sessions/assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json() as { ok?: boolean; error?: string; automatic?: { assessments: { status: string }[]; remaining?: number } };
  if (!response.ok || !data || data.ok === false) throw new Error(({AI_PROVIDER_OFF:"Chưa cấu hình AI. Thầy/cô mở cài đặt AI rồi thử lại.", AI_IN_PROGRESS:"Lượt này đang xử lý. Chờ một chút rồi thử lại.", AI_CONSENT_REQUIRED:"Bài làm hoặc cấu hình đã đổi. Đóng đề xuất, mở xem trước lại.", ASSESSMENT_SOURCE_CHANGED:"Bài làm đã đổi. Đóng đề xuất, mở xem trước lại.", AI_QUOTA_EXCEEDED:"AI đã hết hạn mức. Kết quả cũ được giữ; thầy/cô có thể chấm tay."} as Record<string,string>)[data.error || ''] || "Chưa xử lý được phiếu. Thử lại; kết quả cũ được giữ.");
  return data;
}

export function TeacherLearningEvidence(props: { sessionId: string; view: TeacherView; onCommand: Command; disabled?: boolean }) {
  return <TeacherEvidenceSession key={props.sessionId} {...props} />;
}

function TeacherEvidenceSession({ sessionId, view, onCommand, disabled = false }: { sessionId: string; view: TeacherView; onCommand: Command; disabled?: boolean }) {
  const [regrade, setRegrade] = useState<{submissionId:string;criteriaMet:boolean;feedback:string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [automaticMessage, setAutomaticMessage] = useState("");
  const attempted = useRef(new Set<string>());
  const evidence = view.learningEvidence;
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa xử lý được phiếu. Em kiểm tra kết nối rồi thử lại."); }
    finally { setBusy(false); }
  }
  const pendingIds = Object.values(view.openAssessments || {}).filter(item => item.status === "pending").map(item => item.submissionId).sort();
  const automaticKey = `${sessionId}:${view.revision || 0}:${pendingIds.slice(0, 20).join(",")}`;
  useEffect(() => {
    if (disabled || busy || !pendingIds.length || attempted.current.has(automaticKey)) return;
    attempted.current.add(automaticKey);
    void run(async () => {
      const data = await assessmentRequest({ action: "automatic", id: sessionId, requestId: `auto-${view.revision || 0}` });
      const rows = data.automatic?.assessments || [];
      const reviewCount = rows.filter(row => row.status === "needs_review").length;
      setAutomaticMessage(reviewCount ? `${reviewCount} phiếu cần giáo viên rà soát.` : `${rows.length} phiếu đã được AI chấm tự động.`);
    });
  }, [automaticKey, disabled, busy, sessionId, view.revision, pendingIds.length]);
  async function regradeOne() {
    if (!regrade) return;
    await run(async () => {
      const result = await onCommand("ASSESS", { submissionId:regrade.submissionId, criteriaMet:regrade.criteriaMet, feedback:regrade.feedback, reason:"teacher_regrade" });
      if (!result.ok) throw new Error(result.error || "Chưa lưu được điểm chấm lại.");
      setRegrade(null);
    });
  }
  if (!evidence) return null;
  const { stats } = evidence;
  if (!stats) return null;
  return <section className="lesson-card" aria-label="Bằng chứng học tập cuối tiết" style={{ ...box, padding: "1rem" }}>
    <h2>Bằng chứng học tập cuối tiết</h2>
    <p>Tổng số HS: {stats.total} · Đã nộp: {stats.submitted} · Chưa nộp: {stats.notSubmitted}</p>
    <p>Đạt: {stats.passed} · Chưa đạt: {stats.notPassed} · Chờ AI xử lý: {stats.pendingTeacher} · Cần rà soát: {stats.needsReview || 0}</p>
    <p>Trong số đã chấm: AI {stats.aiAssessed || 0} phiếu · Giáo viên {stats.teacherAssessed || 0} phiếu. Tỉ lệ đạt gồm nhận định AI; không tự cấp mức thành thạo.</p>
    <p>Chưa nộp đủ câu: {stats.incomplete || 0}</p>
    <p>Tỉ lệ đạt trong số đã nộp: {stats.rate === null ? "Chưa có dữ liệu" : `${stats.rate}%`}</p>
    <p className="lesson-muted">Kết quả AI được ghi tự động khi đủ tin cậy; kết quả mơ hồ chuyển sang cần rà soát. AI không tự cấp năng lực.</p>
    {automaticMessage && <p role="status">{automaticMessage}</p>}
    <details><summary>Xem bài cần rà soát hoặc chấm lại ({Object.values(view.openAssessments || {}).filter(item => ['needs_review','ai_assessed','pending'].includes(item.status)).length})</summary>
      {Object.values(view.openAssessments || {}).filter(item => ['needs_review','ai_assessed','pending'].includes(item.status)).map(item => {
        const submission = view.submissions?.[item.submissionId];
        if (!submission) return null;
        const name = view.roster?.[submission.learnerId]?.name || 'Học sinh';
        const prompt = view.tasks?.find(task => task.id === item.taskId)?.prompt || `Câu ${item.taskId}`;
        return <article key={item.submissionId} className="lesson-section-box" style={box}>
          <strong>{name} · {item.status === 'needs_review' ? 'Cần rà soát' : item.status === 'ai_assessed' ? 'AI đã chấm' : 'Đang chờ AI'} </strong>
          <MathText text={prompt}/><p>Bài làm: <MathText text={typeof submission.answer === 'string' ? submission.answer : JSON.stringify(submission.answer)}/></p>
          {item.feedback && <p>Nhận xét AI: <MathText text={item.feedback}/></p>}{item.reason && <p>{item.reason}</p>}
          <button type="button" disabled={disabled || busy} className="lesson-button lesson-button-outline" onClick={()=>setRegrade({submissionId:item.submissionId,criteriaMet:item.criteriaMet??false,feedback:item.feedback||''})}>Chấm lại bài này</button>
          {regrade?.submissionId === item.submissionId && <fieldset disabled={disabled || busy} style={box}>
            <legend>Chấm lại · {name}</legend>
            <label><input type="checkbox" checked={regrade.criteriaMet} onChange={event=>setRegrade({...regrade,criteriaMet:event.target.checked})}/> Đạt tiêu chí</label>
            <label>Nhận xét<textarea className="lesson-textarea" maxLength={2000} value={regrade.feedback} onChange={event=>setRegrade({...regrade,feedback:event.target.value})}/></label>
            <button type="button" className="lesson-button" onClick={regradeOne}>Lưu kết quả chấm lại</button>
          </fieldset>}
        </article>;
      })}
    </details>
    {busy && <p role="status">Đang xử lý lượt phiếu…</p>}
    {error && <p role="alert">{error}</p>}
    <details><summary>Tự đánh giá của học sinh</summary>
    {Object.entries(evidence.selfAssessments || {}).map(([id, entry]) => <p key={id}>{entry.name}: {levels.map(level => `${level.toUpperCase()}: ${ratings[entry.levels[level]]}`).join(" · ")}</p>)}
    </details>
  </section>;
}

export function StudentLearningEvidence({ view, onCommand, disabled = false }: { view: StudentView; onCommand: Command; disabled?: boolean }) {
  const [draft, setDraft] = useState<Levels | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const value = draft || view.selfAssessment || { must: "not_started", should: "not_started", could: "not_started" };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await onCommand("SELF_ASSESS", { levels: { must: value.must, should: value.should, could: value.could } });
      setMessage(result.ok ? "Đã lưu tự đánh giá." : "Chưa lưu được. Em thử lại.");
    } catch { setMessage("Chưa lưu được. Em kiểm tra kết nối rồi thử lại."); }
    finally { setBusy(false); }
  }
  const evidence = view.learningEvidence;
  return <section className="lesson-card" aria-label="Kết quả học tập của em" style={{ ...box, padding: "1rem" }}>
    <h2>Kết quả học tập của em</h2>
    {evidence && <>
      <p>Đã nộp: {evidence.submitted} · Đạt: {evidence.passed} · Chưa đạt: {evidence.notPassed} · Chờ giáo viên: {evidence.pending} · Cần rà soát: {evidence.needsReview || 0}</p>
      <QuestionPager identity="own-results" label="Kết quả" items={(evidence.items || []).map((item, index) => ({id:item.taskId,content:<article className="lesson-section-box">
        <h3>Phiếu cuối giờ · Câu {index + 1}</h3><p>{item.status === "needs_review" ? "Cần giáo viên rà soát" : item.status === "ai_assessed" ? `AI chấm: ${item.criteriaMet ? "đạt tiêu chí" : "cần hoàn thiện"} · Thầy/cô có thể rà lại` : item.criteriaMet === null ? "Chờ AI xử lý" : item.criteriaMet ? "Đạt tiêu chí" : "Cần hoàn thiện"}</p>
        {item.feedback && <MathText text={item.feedback}/>}
      </article>}))}/>
    </>}
    <form onSubmit={submit} style={box}>
      <fieldset disabled={disabled || busy} style={box}><legend>Em tự đánh giá Must / Should / Could</legend>
        <p>Đây là cảm nhận của em để giáo viên hỗ trợ; không tự xác nhận năng lực.</p>
        {levels.map(level => <label key={level} style={box}>{level.toUpperCase()}
          {view.objectives?.filter(objective => objective.level.toLowerCase() === level).map((objective, index) => <span key={index}><MathText text={objective.statement}/></span>)}
          <select style={{ minHeight: 44, width: "100%" }} value={value[level]} onChange={event => setDraft({ must: value.must, should: value.should, could: value.could, [level]: event.target.value as Rating })}>
            {Object.entries(ratings).map(([rating, label]) => <option key={rating} value={rating}>{label}</option>)}
          </select>
        </label>)}
        <button type="submit" className="lesson-button">{busy ? "Đang lưu…" : "Lưu tự đánh giá"}</button>
      </fieldset>
    </form>
    {message && <p role="status">{message}</p>}
  </section>;
}
