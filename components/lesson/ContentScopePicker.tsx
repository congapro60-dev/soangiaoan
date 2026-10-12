"use client";
import React, { useEffect, useRef, useState } from "react";

type LessonSelection = { lessonId: string; sectionIds: string[] };
export type ScopeRequest = LessonSelection | { selections: LessonSelection[] };
export type ScopeIssue = { code: string; path?: string; message?: string; taskId?: string };
type Catalogue = {
  uncertainties?: string[];
  lessons: { id: string; title: string; chapter?: number; packageId?: string | null; sections: { id: string; title: string; objectiveCodes: string[]; knowledge?: { id: string; title: string; objectiveCodes: string[] }[] }[] }[];
};
type Props<T> = {
  catalogue: Catalogue;
  packageId?: string;
  /** Use the current content hash so a late preview cannot replace a newer draft. */
  packageKey?: string;
  packageObjectives: { id: string; code?: string; statement?: string }[];
  disabled?: boolean;
  onPreview: (selection: { objectiveIds: string[] } | null) => Promise<{ ok: boolean; package?: T | null; issues: ScopeIssue[] }>;
  onSelect: (draft: T, scope: ScopeRequest | null) => void;
  onRequestScope?: (request: ScopeRequest) => Promise<void> | void;
};

const messages: Record<string, string> = {
  SCOPE_MIXED_OBJECTIVES: "Câu hỏi còn kiểm tra mục tiêu chưa chọn. Cần soạn biến thể riêng cho phần này.",
  SCOPE_MIXED_ACTIVITY: "Hướng dẫn hoạt động còn chứa phần chưa chọn. Cần soạn hoạt động riêng.",
  SCOPE_PREREQUISITE_REQUIRED: "Phần này cần kiến thức tiên quyết chưa chọn. Chọn thêm hoặc đối soát lại phạm vi.",
  SCOPE_PREREQUISITES_REVIEW_REQUIRED: "Cần đối soát kiến thức tiên quyết trước khi tách phần bài.",
  SCOPE_PHASE_REQUIRED: "Phần đã chọn chưa đủ hoạt động học, kiểm tra lại và vé ra cửa.",
  SCOPE_OBJECTIVE_CHECK_REQUIRED: "Mỗi mục tiêu cần bằng chứng cá nhân ở câu kiểm tra lại và vé ra cửa.",
  ERR_EVIDENCE_COVERAGE: "Chưa đủ bằng chứng cá nhân cho mục tiêu đã chọn.",
  ERR_TIME_BUDGET_MISMATCH: "Thời lượng phần bài chưa khớp. Cần điều chỉnh bản nháp.",
  NETWORK: "Không kiểm tra được phần bài. Giữ lựa chọn rồi thử lại.",
};

export function ContentScopePicker<T>({ catalogue, packageId, packageKey, packageObjectives, disabled = false, onPreview, onSelect, onRequestScope }: Props<T>) {
  const [whole, setWhole] = useState(true);
  const [multiple, setMultiple] = useState(false);
  const [reviewSections,setReviewSections] = useState<string[]>([]);
  const [lessonId, setLessonId] = useState(catalogue.lessons.find(lesson => lesson.packageId === packageId)?.id || catalogue.lessons[0]?.id || "");
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<ScopeIssue[]>([]);
  const ticket = useRef(0);
  useEffect(() => { ticket.current += 1; return () => { ticket.current += 1; }; }, [packageKey, packageId]);
  const lesson = catalogue.lessons.find(item => item.id === lessonId);
  const choices = lesson?.sections.flatMap(section => section.knowledge?.length ? section.knowledge : [section]) || [];
  const selected = choices.filter(section => sectionIds.includes(section.id));
  const codes = new Set(selected.flatMap(section => section.objectiveCodes));
  const objectiveIds = packageObjectives.filter(objective => objective.code && codes.has(objective.code)).map(objective => objective.id);
  const canApply = selected.length > 0 && lesson?.packageId === packageId && selected.every(section => section.objectiveCodes.length > 0) && [...codes].every(code => packageObjectives.filter(objective => objective.code === code).length === 1);
  const scope = (): ScopeRequest => ({ lessonId, sectionIds: selected.map(section => section.id) });
  const reviewSelections=catalogue.lessons.map(item=>({lessonId:item.id,sectionIds:item.sections.filter(section=>reviewSections.includes(item.id+"/"+section.id)).map(section=>section.id)})).filter(selection=>selection.sectionIds.length);
  const chapters=[...new Set(catalogue.lessons.map(item=>item.chapter).filter((value):value is number=>typeof value==="number"))];
  const toggleReview=(keys:string[],checked:boolean)=>change(()=>setReviewSections(current=>checked?[...new Set([...current,...keys])]:current.filter(key=>!keys.includes(key))));
  const change = (action: () => void) => { ticket.current += 1; setIssues([]); action(); };

  const apply = async () => {
    if (busy || disabled || multiple || (!whole && !canApply)) return;
    const current = ++ticket.current, request = whole ? null : scope();
    setBusy(true); setIssues([]);
    try {
      const reply = await onPreview(whole ? null : { objectiveIds });
      if (current !== ticket.current) return;
      if (reply.ok && reply.package) onSelect(reply.package, request);
      else setIssues(reply.issues.length ? reply.issues : [{ code: "INVALID_SCOPE" }]);
    } catch { if (current === ticket.current) setIssues([{ code: "NETWORK" }]); }
    finally { setBusy(false); }
  };
  const requestDraft = async () => {
    if (busy || disabled || (multiple ? reviewSelections.length<2 || reviewSelections.length>12 : !selected.length) || !onRequestScope) return;
    const current = ++ticket.current; setBusy(true); setIssues([]);
    try { await onRequestScope(multiple?{selections:reviewSelections}:scope()); }
    catch { if (current === ticket.current) setIssues([{ code: "NETWORK" }]); }
    finally { setBusy(false); }
  };

  return <fieldset className="lesson-section-box" disabled={disabled || busy}>
    <legend>Chọn phạm vi bài học</legend>
    <p className="lesson-muted">Nguồn đang chờ đối soát: bản đồ lấy từ PPCT, chưa xác nhận đủ mục SGK và yêu cầu cần đạt.</p>
    {catalogue.uncertainties?.includes("SOURCE_YEAR_CONFLICT") && <p role="status" className="lesson-muted">Năm học trong PPCT là 2026–2027; tên tệp kế hoạch học phần ghi 25–26. Cần đối soát trước khi duyệt học liệu.</p>}
    <label><input type="radio" name="content-scope-mode" value="whole" checked={whole&&!multiple} onChange={() => change(() => {setWhole(true);setMultiple(false);})} /> Toàn bộ bài hiện tại</label>{" "}
    <label><input type="radio" name="content-scope-mode" value="partial" checked={!whole&&!multiple} onChange={() => change(() => {setWhole(false);setMultiple(false);})} /> Chọn một phần bài</label>{" "}
    {onRequestScope&&<label><input type="radio" name="content-scope-mode" value="multiple" checked={multiple} onChange={()=>change(()=>{setWhole(false);setMultiple(true);})}/> Ôn nhiều bài/chương</label>}
    {!whole&&!multiple && <>
      <label style={{ display: "block", marginTop: "0.75rem" }}>Bài trong PPCT <select className="lesson-select" value={lessonId} onChange={event => change(() => { setLessonId(event.target.value); setSectionIds([]); })}>
        {catalogue.lessons.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      {choices.map(section => <label key={section.id} style={{ display: "block", padding: "0.65rem 0" }}>
        <input type="checkbox" value={section.id} checked={sectionIds.includes(section.id)} onChange={event => change(() => setSectionIds(current => event.target.checked ? [...current, section.id] : current.filter(id => id !== section.id)))} /> {section.title}
        {!section.objectiveCodes.length && <span className="lesson-muted"> — chưa đối soát mục tiêu</span>}
      </label>)}
      {selected.length > 0 && !canApply && <p className="lesson-muted">Chưa có biến thể nguồn phù hợp với bài hiện tại. Có thể soạn bản nháp rồi đối soát.</p>}
    </>}
    {multiple&&<>
      <p>Chọn từ 2 đến 12 bài. Bản ôn tập được soạn từ nguồn đã chọn, không tự ghép các tiết đầy đủ; giáo viên duyệt mục tiêu, đáp án và thời lượng trước khi dùng.</p>
      <div>{chapters.map(chapter=>{const keys=catalogue.lessons.filter(item=>item.chapter===chapter).flatMap(item=>item.sections.map(section=>item.id+"/"+section.id));return <label key={chapter} style={{display:"block",padding:".65rem 0"}}><input id={"review-chapter-"+chapter} type="checkbox" checked={keys.length>0&&keys.every(key=>reviewSections.includes(key))} onChange={event=>toggleReview(keys,event.target.checked)}/> Chọn chương {chapter}</label>;})}</div>
      {catalogue.lessons.map(item=><div key={item.id}><strong>{item.title}</strong>{item.sections.map(section=><label key={section.id} style={{display:"block",padding:".65rem 0"}}><input id={"review-"+item.id+"-"+section.id} type="checkbox" checked={reviewSections.includes(item.id+"/"+section.id)} onChange={event=>toggleReview([item.id+"/"+section.id],event.target.checked)}/> {section.title}{!section.objectiveCodes.length&&<span className="lesson-muted"> — chưa đối soát mục tiêu</span>}</label>)}</div>)}
      <p role="status">Đã chọn {reviewSelections.length} bài, {reviewSelections.reduce((sum,item)=>sum+item.sectionIds.length,0)} phần.</p>
    </>}
    <div className="lesson-inline-actions" style={{ marginTop: "0.75rem" }}>
      {!multiple&&<button type="button" className="lesson-button lesson-button-primary" disabled={busy || disabled || (!whole && !canApply)} onClick={apply}>{whole ? "Dùng toàn bộ bài" : "Dùng phần đã chọn"}</button>}
      {!whole && onRequestScope && <button type="button" className="lesson-button lesson-button-outline" disabled={busy || disabled || (multiple?reviewSelections.length<2||reviewSelections.length>12:!selected.length)} onClick={requestDraft}>{multiple?"Soạn bản nháp ôn tập":"Soạn bản nháp cho phần đã chọn"}</button>}
    </div>
    {busy && <p role="status">Đang kiểm tra phạm vi…</p>}
    {issues.length > 0 && <div role="alert"><ul>{issues.map((item, index) => <li key={index}>{messages[item.code] || "Phần bài chưa hợp lệ. Đối soát nội dung và bằng chứng trước khi dùng."}{item.taskId && <code> ({item.taskId})</code>}</li>)}</ul></div>}
  </fieldset>;
}
