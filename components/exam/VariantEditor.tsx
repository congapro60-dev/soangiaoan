"use client";

import React, { useEffect, useState } from "react";
import MathText from "../lesson/MathText";
import { variantBlockReason } from "../../lib/exam/variants.js";
import { ExamQuestion, messageFor, teacherGet, teacherPost } from "./client";
import { KeyEditor, QuestionItemsEditor, SolutionEditor, SolutionImage, SolutionQuestion } from "./KeyEditor";

export interface ExamCodeDraft { code: string; questions: SolutionQuestion[] }
export interface AntiCheatingConfig { shuffleQuestions?: boolean; shuffleOptions?: boolean; assignment?: "alternate" | "random" | "manual"; showCode?: boolean }

export const nextExamCode = (codes: Array<{ code: string }>) => Array.from({ length: 899 }, (_, index) => String(index + 101)).find((code) => !codes.some((entry) => entry.code === code)) || "";

export function AntiCheatingSettings({ settings, count, onChange }: { settings: AntiCheatingConfig; count: number; onChange: (patch: AntiCheatingConfig) => void }) {
  return <div className="exam-card" data-anti-cheating>
    <h3>Chống nhìn bài</h3>
    <label className="exam-check"><input type="checkbox" aria-label="Đảo thứ tự câu trong từng phần" checked={settings.shuffleQuestions === true} onChange={(e) => onChange({ shuffleQuestions: e.target.checked })} /><span>Đảo thứ tự câu trong từng phần — giữ thứ tự phần, tự luận đi cả bài.</span></label>
    <label className="exam-check"><input type="checkbox" aria-label="Đảo phương án và ý đúng/sai" checked={settings.shuffleOptions === true} onChange={(e) => onChange({ shuffleOptions: e.target.checked })} /><span>Đảo phương án và ý đúng/sai — chỉ câu có từng phương án/ý tách riêng.</span></label>
    <label>Giao mã đề<select className="lesson-input" aria-label="Cách giao mã đề" value={settings.assignment || "alternate"} onChange={(e) => onChange({ assignment: e.target.value as AntiCheatingConfig["assignment"] })}><option value="alternate">Luân phiên theo thứ tự vào phòng</option><option value="random">Ngẫu nhiên</option><option value="manual">Giáo viên chọn trước khi bắt đầu</option></select></label>
    <label className="exam-check"><input type="checkbox" aria-label="Hiện mã đề" checked={settings.showCode === true} onChange={(e) => onChange({ showCode: e.target.checked })} /><span>Hiện mã đề cho học sinh (để đối chiếu đề giấy).</span></label>
    <p className="exam-note" role="status">Mỗi em: 1 trong {count} mã đề{settings.shuffleQuestions ? ", câu được đảo trong từng phần" : ""}{settings.shuffleOptions ? ", phương án/ý đủ điều kiện được đảo" : ""}. Thứ tự giữ nguyên khi tải lại.</p>
    <details><summary>? Hướng dẫn tổ chức kiểm tra</summary><p>Word (.docx) nên dùng khi đảo phương án hoặc đổi số: công thức, hình và từng phương án được tách để kiểm tra. PDF dùng tốt cho đảo câu, nhiều mã đề; phương án không tách được sẽ giữ nguyên.</p><p>Hướng dẫn chấm viết theo từng phần: bảng Câu/Đáp án hoặc “Câu 1 – C”. Kiểm tra bảng nhận diện rồi bấm Áp dụng, sau đó Lưu. Mỗi mã đề có file đề, đáp án và lời giải riêng.</p><p>Đảo câu giữ nguyên các phần. Đảo phương án giữ nguyên điểm; câu có “Cả A và B”, “ý a”, “câu trên” nên bật Không đảo. Nhiều mã đề giao luân phiên, ngẫu nhiên hoặc do giáo viên chọn trước giờ thi.</p><p>Lời giải mở khi phòng kết thúc nếu giáo viên cho phép. Tự luận: xem bài và lời giải cạnh nhau, nhập điểm, nhận xét rồi lưu. Đổi số bằng AI chỉ tạo bản nháp; giáo viên phải duyệt từng câu trước khi tạo mã mới.</p></details>
  </div>;
}

export function CodeTabs({ codes, selected, disabled, locked, onSelect, onDuplicate, onImport, onRemove }: { codes: ExamCodeDraft[]; selected: string; disabled?: boolean; locked?: boolean; onSelect: (code: string) => void; onDuplicate: (code: string) => void; onImport: (code: string, file: File) => void; onRemove?: (code: string) => void }) {
  const [newCode, setNewCode] = useState("");
  const suggested = nextExamCode(codes);
  const target = newCode || suggested;
  const invalid = !/^\d{3}$/.test(target) || codes.some((code) => code.code === target) || codes.length >= 8;
  const first = codes[0];
  const profile = (code: ExamCodeDraft) => [...new Set(code.questions.map((q) => q.section))].map((section) => { const qs = code.questions.filter((q) => q.section === section); return [section, qs.length, Math.round(qs.reduce((total, q) => total + q.points, 0) * 100)]; });
  const differs = first && codes.some((code) => JSON.stringify(profile(code)) !== JSON.stringify(profile(first)));
  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: "16px 0", minWidth: 0 }} data-exam-codes>
    <legend>Mã đề ({codes.length}/8)</legend>
    <div className="exam-tabs" role="tablist" aria-label="Mã đề">{codes.map((code) => <button type="button" key={code.code} role="tab" aria-selected={selected === code.code} data-exam-code={code.code} className={"exam-tab" + (selected === code.code ? " is-on" : "")} onClick={() => onSelect(code.code)}>Mã {code.code}</button>)}</div>
    {onRemove && <button type="button" className="lesson-button lesson-button-danger" disabled={locked || codes.length <= 1} onClick={() => onRemove(selected)}>Xóa mã đề {selected}</button>}
    {differs && <p className="exam-warn">Số câu hoặc điểm từng phần khác nhau giữa các mã đề. Kiểm tra độ tương đương trước khi mở phòng.</p>}
    <label>Mã đề mới<input className="lesson-input" aria-label="Mã đề mới" inputMode="numeric" maxLength={3} disabled={locked} value={target} onChange={(e) => setNewCode(e.target.value)} /></label>
    <button type="button" className="lesson-button lesson-button-outline" disabled={invalid || locked} onClick={() => { onDuplicate(target); setNewCode(""); }}>Nhân bản mã đề</button>
    <label className="lesson-button lesson-button-outline">Nhập mã đề từ file<input type="file" accept=".pdf,.docx,.txt,.md" aria-label="File đề cho mã mới" disabled={invalid || locked} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) { onImport(target, file); setNewCode(""); } }} /></label>
    {codes.length >= 8 && <p className="exam-note">Đã đủ 8 mã đề.</p>}
  </fieldset>;
}

interface VariantSource { id: string; sha256: string; extractionHash: string; parserRevision: string; model: string; providerHost: string; questions: ExamQuestion[] }
interface Capability { enabled: boolean; model: string | null; providerHost: string | null; reason?: string | null }
interface VariantDraft { sourceId: string; question: SolutionQuestion; check: { status: "checked" | "review" | "blocked"; reason: string }; accepted?: boolean }

export function VariantAssistant({ examId, examCode, questions, disabled, onCreate, onPendingChange }: { examId?: string; examCode: string; questions: SolutionQuestion[]; disabled?: boolean; onCreate: (questions: SolutionQuestion[]) => void; onPendingChange?: (pending: boolean) => void }) {
  const [capability, setCapability] = useState<Capability | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [source, setSource] = useState<VariantSource | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [drafts, setDrafts] = useState<VariantDraft[]>([]);
  const [removedDrafts, setRemovedDrafts] = useState<VariantDraft[]>([]);
  const [removedDraftIndex, setRemovedDraftIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [imageReaders, setImageReaders] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => { onPendingChange?.(busy || Boolean(source) || drafts.length > 0); }, [busy, source, drafts.length, onPendingChange]);
  useEffect(() => () => { onPendingChange?.(false); }, [onPendingChange]);
  const imageBusy = (delta: number) => setImageReaders((count) => count + delta);
  useEffect(() => {
    if (!examId) return;
    let alive = true;
    teacherGet<{ capabilities: Capability }>("?id=" + examId + "&capabilities=variants").then((result) => { if (alive) setCapability(result.capabilities); }).catch((e) => { if (alive) setError(messageFor(e)); });
    return () => { alive = false; };
  }, [examId]);
  const prepare = async () => {
    if (!examId || !capability?.enabled || !chosen.length) return;
    setBusy(true); setError("");
    try { const result = await teacherPost<{ source: VariantSource; capabilities: Capability }>({ action: "variant-source", id: examId, examCode, qids: chosen }); setSource(result.source); setCapability(result.capabilities); setConfirmed(false); }
    catch (e) { setError(messageFor(e)); } finally { setBusy(false); }
  };
  const generate = async () => {
    if (!examId || !capability?.enabled || !source || !confirmed) return;
    setBusy(true); setError("");
    try {
      const result = await teacherPost<{ questions: VariantDraft[] }>({ action: "variants", id: examId, examCode, qids: source.questions.map((q) => q.id), model: source.model, aiConsent: { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash } });
      setDrafts(result.questions); setSource(null); setConfirmed(false);
    } catch (e) { setError(messageFor(e)); } finally { setBusy(false); }
  };
  const patch = (id: string, change: Partial<SolutionQuestion>) => setDrafts((list) => list.map((draft) => draft.sourceId === id ? { ...draft, accepted: false, question: { ...draft.question, ...change }, check: { status: "review", reason: "Nội dung đã sửa; giáo viên cần kiểm tra lại trước khi duyệt." } } : draft));
  return <details className="exam-keybox" data-variant-assistant><summary>Tạo mã đề mới bằng đổi số liệu (AI hỗ trợ)</summary>
    <p className="exam-warn">AI có thể sai. Giáo viên phải kiểm tra đề, đáp án và lời giải, duyệt từng câu trước khi tạo mã đề.</p>
    {!examId ? <p className="exam-note">Tạo và lưu phòng trước khi đề nghị đổi số liệu.</p> : !capability?.enabled ? <p className="exam-note">AI chưa được bật hoặc chưa cấu hình nhà cung cấp. Không gửi nội dung đề.</p> : <fieldset disabled={disabled || busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <p>Nhà cung cấp: {capability.providerHost} · Model: {capability.model}</p>
      {questions.map((q) => { const reason = variantBlockReason(q); return <label key={q.id} className="exam-check"><input type="checkbox" disabled={Boolean(reason) || Boolean(source) || drafts.length > 0} checked={chosen.includes(q.id)} onChange={(e) => setChosen((list) => e.target.checked ? [...list, q.id] : list.filter((id) => id !== q.id))} /><span>{q.section} · {q.label}{reason ? " — Không đổi được: " + reason : ""}</span></label>; })}
      {!source && !drafts.length && <button type="button" className="lesson-button lesson-button-outline" disabled={!chosen.length} onClick={() => void prepare()}>Xem nội dung sẽ gửi AI</button>}
      {source && <><p>Dữ liệu gửi: đúng {source.questions.length} câu dưới đây, kèm đáp án và lời giải hiện tại. Nơi nhận: {source.providerHost}; model {source.model}.</p><details><summary>Xem dữ liệu được xác nhận</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(source.questions, null, 2)}</pre></details><p className="exam-note">Mã kiểm nội dung: {source.sha256}</p><label className="exam-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>Tôi đồng ý gửi đúng nội dung này đến nhà cung cấp/model nêu trên.</span></label><button type="button" className="lesson-button lesson-button-primary" disabled={!confirmed} onClick={() => void generate()}>Đề nghị đổi số liệu</button><button type="button" className="lesson-button lesson-button-outline" onClick={() => { setSource(null); setConfirmed(false); }}>Hủy gửi</button></>}
      {drafts.map((draft) => <article key={draft.sourceId} className="exam-qcard"><h4>{draft.question.section} · {draft.question.label}</h4><p className="exam-warn">{draft.check.status === "checked" ? "Máy đã kiểm lại số học" : draft.check.status === "blocked" ? "Không đổi được" : "Cần GV xem"}: {draft.check.reason}</p><label>Đề biến thể<textarea className="lesson-input" rows={4} maxLength={4000} value={draft.question.text || ""} onChange={(e) => patch(draft.sourceId, { text: e.target.value })} /></label><MathText text={draft.question.text || ""} inline={false} /><QuestionItemsEditor q={draft.question} onChange={(change) => patch(draft.sourceId, change)} /><KeyEditor q={draft.question} onChange={(change) => patch(draft.sourceId, change)} /><SolutionEditor q={draft.question} onBusyChange={imageBusy} onChange={(change) => patch(draft.sourceId, change)} /><label className="exam-check"><input type="checkbox" disabled={imageReaders > 0 || draft.check.status === "blocked"} checked={draft.accepted === true} onChange={(e) => setDrafts((list) => list.map((item) => item.sourceId === draft.sourceId ? { ...item, accepted: e.target.checked } : item))} /><span>Đã kiểm tra, chấp nhận câu này</span></label><button type="button" className="lesson-button lesson-button-outline" disabled={imageReaders > 0} onClick={() => { setRemovedDraftIndex(drafts.findIndex((item) => item.sourceId === draft.sourceId)); setRemovedDrafts([draft]); setDrafts((list) => list.filter((item) => item.sourceId !== draft.sourceId)); }}>Loại câu này</button></article>)}
      {removedDrafts.length > 0 && <button type="button" className="lesson-button lesson-button-outline" disabled={imageReaders > 0} onClick={() => { setDrafts((current) => { const restored = [...current]; restored.splice(removedDraftIndex, 0, ...removedDrafts.filter((draft) => !current.some((item) => item.sourceId === draft.sourceId))); return restored; }); setRemovedDrafts([]); }}>Hoàn tác bỏ nháp biến thể</button>}
      {drafts.length > 0 && <><button type="button" className="lesson-button lesson-button-success" disabled={imageReaders > 0 || drafts.some((draft) => !draft.accepted || draft.check.status === "blocked")} onClick={() => { onCreate(drafts.map((draft) => draft.question)); setDrafts([]); setChosen([]); }}>Tạo mã đề từ các câu đã duyệt</button><button type="button" className="lesson-button lesson-button-outline" disabled={imageReaders > 0} onClick={() => { setRemovedDraftIndex(0); setRemovedDrafts(drafts); setDrafts([]); setChosen([]); }}>Hủy bản nháp biến thể</button></>}
    </fieldset>}
    {error && <p className="exam-error" role="alert">{error}</p>}
  </details>;
}

export function PupilPreview({ examId, examCode, disabled }: { examId: string; examCode: string; disabled?: boolean }) {
  const [seed, setSeed] = useState("mau-1");
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div data-pupil-preview><label>Thứ tự mẫu<input className="lesson-input" aria-label="Mẫu xem trước" value={seed} maxLength={80} onChange={(e) => setSeed(e.target.value)} /></label><button type="button" className="lesson-button lesson-button-outline" disabled={busy || disabled} onClick={async () => { setBusy(true); setError(""); try { const result = await teacherPost<{ questions: ExamQuestion[] }>({ action: "preview", id: examId, examCode, seed }); setQuestions(result.questions); } catch (e) { setError(messageFor(e)); } finally { setBusy(false); } }}>Xem như học sinh</button>{disabled && <p className="exam-note">Lưu bản nháp trước khi xem thử.</p>}{error && <p className="exam-error">{error}</p>}{questions && <details open><summary>Bản xem thử — Mã {examCode}</summary>{questions.map((q) => <article key={q.id} className="exam-qcard"><h4>{q.section} · {q.label}</h4>{q.imageMode !== "question" && <MathText text={q.text || ""} inline={false} />}{q.questionImages?.map((image) => <SolutionImage key={image.id} examId={examId} assetId={image.id} alt={"Hình minh họa " + q.label} />)}{(q.type === "mc" ? q.options || [] : q.statements || []).map((label) => <div key={label}><b>{label}. </b><MathText text={(q.type === "mc" ? q.choiceText : q.statementText)?.[label] || ""} />{(q.type === "mc" ? q.choiceImages : q.statementImages)?.[label] && <SolutionImage examId={examId} assetId={(q.type === "mc" ? q.choiceImages : q.statementImages)![label]} alt={"Phương án " + label + " " + q.label} />}</div>)}</article>)}</details>}</div>;
}
