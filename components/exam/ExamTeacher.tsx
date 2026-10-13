"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import MathText from "../lesson/MathText";
import { mascotSpriteStyle } from "../lesson/LessonMascotPicker";
import { parseAnswerKey } from "../../lib/exam/answer-key.js";
import {parseExamCreation} from "../../lib/lesson/creation-context.js";
import { describeKey } from "../../lib/exam/scoring.js";
import { ExamQuestion, messageFor, teacherGet, teacherImageUrl, teacherPost } from "./client";
import { ExamImport } from "./ExamImport";
import { KeyEditor, QuestionItemsEditor, SolutionEditor, SolutionImage, SolutionQuestion, keyReady } from "./KeyEditor";
import { AntiCheatingConfig, AntiCheatingSettings, CodeTabs, ExamCodeDraft, PupilPreview, VariantAssistant, nextExamCode } from "./VariantEditor";
import { AccommodationEditor } from "./AccommodationEditor";
import { GuideImport } from "./GuideImport";

const SPRITE = "mascots-historical.webp";
const STATUS_LABEL: Record<string, string> = { draft: "Bản nháp", open: "Đang mở phòng", running: "Đang thi", closed: "Đã kết thúc" };
const STATUS_BADGE: Record<string, string> = { draft: "lesson-badge-outline", open: "lesson-badge-warning", running: "lesson-badge-success", closed: "lesson-badge-primary" };

interface ExamSummary { id: string; code: string; title: string; status: string; durationMin: number; attempts: number; questionCount: number; createdAt: number }
interface ExamFull { contentRevision: string; id: string; code: string; title: string; status: "draft" | "open" | "running" | "closed"; durationMin: number; startedAt: number | null; endsAt: number | null; settings: AntiCheatingConfig & { showResult?: string; graceSeconds?: number; allowLateJoin?: boolean; review?: "after_close" | "none" }; codes?: Array<{ code: string | null; questions: SolutionQuestion[] }>; questions: SolutionQuestion[] }
interface AttemptRow { id: string; name: string; examCode?: string | null; mascot: number; answered: number; photos: number; tabLeaves: number; joinedAt: number; lastSeenAt: number; contentRevision: string; submittedAt: number | null; claimed: boolean; endsAt: number | null; extraMinutes: number; textScale: number; accommodationRevision: number }
interface RoomData { serverNow: number; exam: ExamFull; missingKeys: string[]; attempts: AttemptRow[] }
interface ResultRow { id: string; name: string; examCode?: string | null; mascot: number; tabLeaves: number; submittedAt: number | null; answered: number; total: number; max: number; sections: Record<string, { points: number; max: number }>; essaysToMark: number; perQuestion: Record<string, { p: number; c: boolean | null }> }
interface Stat { answered: number; correct: number; wrong: number; blank: number; avg: number; choices: Record<string, number>; statements: number[] }
interface ResultsData { exam: ExamFull; rows: ResultRow[]; stats: Record<string, Stat>; statsByCode?: Record<string, Record<string, Stat>> }
interface AttemptDetail { attempt: { id: string; name: string; examCode?: string | null }; answers: Record<string, unknown>; manual: Record<string, number>; comments: Record<string, string>; photos: Array<{ id: string; qid: string }>; exam: ExamFull }

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
};
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("vi-VN");

function Picture({ query, alt }: { query: string; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    let url = "";
    teacherImageUrl(query)
      .then((made) => {
        url = made;
        if (alive) setSrc(made);
        else URL.revokeObjectURL(made);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [query]);
  return src ? <img className="exam-teacher-img" src={src} alt={alt} /> : <div className="exam-teacher-img exam-q-image-wait">…</div>;
}

// ------------------------------------------------------------------------------------------------ marking

function EssayMarker({ examId, attemptId, onSaved }: { examId: string; attemptId: string; onSaved: () => void }) {
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    teacherGet<AttemptDetail>("?id=" + examId + "&attempt=" + attemptId)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setScores(Object.fromEntries(Object.entries(d.manual).map(([k, v]) => [k, String(v)])));
        setComments(d.comments || {});
      })
      .catch((e) => { if (alive) setError(messageFor(e)); });
    return () => {
      alive = false;
    };
  }, [examId, attemptId]);
  if (!detail) return <p className={error ? "exam-error" : "exam-note"} role={error ? "alert" : "status"}>{error || "Đang tải bài làm…"}</p>;
  const essays = detail.exam.questions.filter((q) => q.type === "essay");
  const save = async (q: ExamQuestion) => {
    setSaving(q.id);
    setNote("");
    try {
      const raw = scores[q.id];
      const score = raw === undefined || raw.trim() === "" ? null : Number(raw.replace(",", "."));
      if (score !== null && (!Number.isFinite(score) || score < 0 || score > q.points)) { setNote("Điểm phải từ 0 đến " + fmt(q.points) + "."); return; }
      await teacherPost({ action: "grade", id: examId, attemptId, qid: q.id, score, comment: comments[q.id] || "" });
      setNote("Đã lưu điểm và nhận xét " + q.label + ".");
      onSaved();
    } catch (e) {
      setNote(messageFor(e));
    } finally { setSaving(""); }
  };
  return (
    <div className="exam-marker">
      <h3>{detail.attempt.name}{detail.attempt.examCode ? " · Mã " + detail.attempt.examCode : ""}</h3>
      {essays.map((q) => {
        const typed = detail.answers[q.id] as { text?: string } | null;
        const shots = detail.photos.filter((p) => p.qid === q.id);
        return (
          <fieldset key={q.id} className="exam-mark-card" disabled={saving === q.id} style={{ border: 0, minWidth: 0 }} data-essay-mark={q.id}>
            <div className="exam-mark-head"><strong>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</strong><span>tối đa {fmt(q.points)} điểm</span></div>
            {q.text && q.imageMode !== "question" && <MathText text={q.text} inline={false} />}
            {q.questionImages?.length ? q.questionImages.map((image) => <SolutionImage key={image.id} examId={examId} assetId={image.id} alt={"Hình trong " + q.label} />) : q.hasImage ? <Picture query={"id=" + examId + "&image=" + q.id} alt={q.label} /> : null}
            <div className="exam-essay-comparison" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
              <div><h4>Bài làm học sinh</h4>
                <div className="exam-shots">{shots.length === 0 && !typed?.text ? <em>Chưa có bài làm.</em> : shots.map((p) => <Picture key={p.id} query={"id=" + examId + "&asset=" + p.id} alt="Ảnh bài làm" />)}</div>
                {typed?.text && <div className="exam-typed"><MathText text={typed.text} inline={false} /></div>}
              </div>
              <div><h4>Lời giải và thang chấm</h4>
                {q.solution ? <MathText text={q.solution} inline={false} /> : <p className="exam-note">Chưa có lời giải mẫu.</p>}
                {q.solutionImages?.map((asset) => <SolutionImage key={asset.id} examId={examId} assetId={asset.id} alt={"Lời giải " + q.label} />)}
                {q.rubric && <><h4>Thang chấm</h4><MathText text={q.rubric} inline={false} /></>}
              </div>
            </div>
            {q.rubric?.split(/\r?\n/).map((line, index) => {
              if (/^\s*(?:Câu|Bài|Phần|Tổng)\b/iu.test(line)) return null;
              const part = /\(\s*(\d+(?:[.,]\d+)?)\s*(?:đ|điểm)\s*\)\s*$/iu.exec(line);
              if (!part) return null;
              const points = Number(part[1].replace(",", "."));
              if (!Number.isFinite(points) || points <= 0 || points > q.points) return null;
              return <button type="button" key={index} className="lesson-button lesson-button-outline" title={line} onClick={() => { const previous = Number((scores[q.id] || "0").replace(",", ".")); setScores({ ...scores, [q.id]: String(Math.round(Math.min(q.points, (Number.isFinite(previous) ? previous : 0) + points) * 100) / 100) }); }}>Cộng {fmt(points)} điểm · {line.replace(part[0], "").trim()}</button>;
            })}
            <div className="exam-score-row">
              <input className="lesson-input" inputMode="decimal" value={scores[q.id] ?? ""} onChange={(e) => setScores({ ...scores, [q.id]: e.target.value })} placeholder="Điểm" aria-label={"Điểm " + q.label} />
              <span>/ {fmt(q.points)}</span>
              <button type="button" className="lesson-button lesson-button-primary" disabled={Boolean(saving)} onClick={() => void save(q)}>{saving === q.id ? "Đang lưu…" : "Lưu điểm và nhận xét"}</button>
            </div>
            <label><span>Nhận xét cho học sinh</span><textarea className="lesson-input" rows={2} maxLength={1000} value={comments[q.id] || ""} aria-label={"Nhận xét " + q.label} onChange={(e) => setComments({ ...comments, [q.id]: e.target.value })} /></label>
          </fieldset>
        );
      })}
      {note && <p className="exam-note" role="status">{note}</p>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ one exam room

function ExamRoom({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [tab, setTab] = useState<"students" | "marking" | "results" | "exam">("students");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pick, setPick] = useState("");
  const [copied, setCopied] = useState("");
  const [edited, setEdited] = useState<SolutionQuestion[] | null>(null);
  const [editedCodes, setEditedCodes] = useState<ExamCodeDraft[] | null>(null);
  const [selectedCode, setSelectedCode] = useState("101");
  const [antiCheating, setAntiCheating] = useState<AntiCheatingConfig | null>(null);
  const [importing, setImporting] = useState<{ code: string; file: File } | null>(null);
  const [reviewPolicy, setReviewPolicy] = useState<"after_close" | "none" | null>(null);
  const [guidePending, setGuidePending] = useState(false);
  const [variantPending, setVariantPending] = useState(false);
  const [imageReaders, setImageReaders] = useState(0);
  const imageBusy = (delta: number) => setImageReaders((count) => count + delta);
  const [keyText, setKeyText] = useState("");
  const [note, setNote] = useState("");
  const [supportAttemptId, setSupportAttemptId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ label: string; message: string; body: Record<string, unknown> } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [removedDraftCode, setRemovedDraftCode] = useState<ExamCodeDraft | null>(null);
  const [removedDraftImage, setRemovedDraftImage] = useState<{ qid: string; patch: Partial<SolutionQuestion> } | null>(null);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const next = await teacherGet<RoomData>("?id=" + id);
      if (version !== loadVersion.current) return;
      setData(next);
      setOffset(next.serverNow - Date.now());
    } catch (e) {
      setError(messageFor(e));
    }
  }, [id]);
  const loadResults = useCallback(async () => {
    try {
      setResults(await teacherGet<ResultsData>("?id=" + id + "&results=1"));
    } catch (e) {
      setError(messageFor(e));
    }
  }, [id]);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void load();
    }, 4000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.clearInterval(clockTimer);
    };
  }, [load]);
  useEffect(() => {
    if (tab !== "results" && tab !== "marking") return undefined;
    const timer = window.setTimeout(() => void loadResults(), 0);
    return () => window.clearTimeout(timer);
  }, [tab, loadResults, data?.attempts.length]);

  const command = async (cmd: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    try {
      const next = await teacherPost<RoomData>({ action: "control", id, command: cmd, ...extra });
      setData(next);
      setOffset(next.serverNow - Date.now());
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };
  const act = async (body: Record<string, unknown>) => {
    try {
      await teacherPost({ ...body, id });
      await load();
    } catch (e) {
      setError(messageFor(e));
    }
  };

  if (!data) return <section className="exam-card">{error ? <p className="exam-error">{error}</p> : "Đang tải…"}<button type="button" className="lesson-button lesson-button-outline" onClick={onBack}>Quay lại</button></section>;
  const exam = data.exam;
  const link = window.location.origin + "/exam?code=" + exam.code;
  const remaining = exam.endsAt ? exam.endsAt - (now + offset) : 0;
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  };
  const start = () => {
    if (data.missingKeys.length && !window.confirm("Còn " + data.missingKeys.length + " câu chưa có đáp án nên sẽ không tự chấm được các câu đó. Vẫn bắt đầu?")) return;
    void command("start", { force: data.missingKeys.length > 0 });
  };
  const hasCodes = Boolean(exam.codes?.some((code) => code.code !== null));
  const serverCodes = (exam.codes || [{ code: "101", questions: exam.questions }]).map((code) => ({ ...code, code: code.code || "101" }));
  const active = (editedCodes || serverCodes).find((code) => code.code === selectedCode) || (editedCodes || serverCodes)[0];
  const questions = edited || active.questions;
  const allCodes = (editedCodes || serverCodes).map((code) => code.code === active.code ? { ...code, questions } : code);
  const patchQuestion = (qid: string, change: Partial<SolutionQuestion>) => setEdited((current) => (current || active.questions).map((q) => q.id === qid ? { ...q, ...change } : q));
  const essays = serverCodes.flatMap((code) => code.questions).filter((q) => q.type === "essay");
  const dirty = Boolean(edited || editedCodes || antiCheating || reviewPolicy !== null);
  const staged = dirty || guidePending || variantPending || imageReaders > 0 || Boolean(importing);
  const removePart = (body: Record<string, unknown>, label: string) => {
    if (staged) { setNote("Lưu thay đổi hoặc hủy bản nháp trước khi xóa."); return; }
    setDeleteConfirmation("");
    setPendingDelete({ label, message: 'Xóa “' + label + '” khỏi phòng “' + exam.title + '”? Câu hỏi, ảnh và lời giải của phần này được giữ trong Thùng rác. Có thể khôi phục trong Thùng rác của giáo viên.', body: { ...body, expectedContentRevision: exam.contentRevision } });
  };
  const online = (a: AttemptRow) => data.serverNow - a.lastSeenAt < 40000;
  if (importing) return <ExamImport code={importing.code} initialFile={importing.file} onCreated={() => undefined} onCancel={() => setImporting(null)} onImported={(newCode) => { setEditedCodes([...allCodes, newCode]); setEdited(null); setSelectedCode(newCode.code); setImporting(null); setNote("Mã đề mới còn ở bản nháp. Bấm Lưu thay đổi."); }} />;

  return (
    <div className="exam-room">
      <header className="exam-card exam-room-head">
        <div>
          <button type="button" className="exam-back" disabled={busy || staged} onClick={onBack}>← Danh sách</button>
          <h2>{exam.title}</h2>
          <span className={"lesson-badge " + STATUS_BADGE[exam.status]}>{STATUS_LABEL[exam.status]}</span>
          {exam.status === "running" && <span className={"exam-timer" + (remaining < 300000 ? " is-low" : "")}>{clock(remaining)}</span>}
        </div>
        <div className="exam-share">
          <div className="exam-code-big" aria-label="Mã phòng">{exam.code}</div>
          <button type="button" className="lesson-button lesson-button-outline" onClick={() => void copy(exam.code, "code")}>{copied === "code" ? "Đã chép" : "Chép mã"}</button>
          <button type="button" className="lesson-button lesson-button-outline" onClick={() => void copy(link, "link")}>{copied === "link" ? "Đã chép" : "Chép link cho học sinh"}</button>
          <small>{link}</small>
        </div>
        <div className="exam-controls">
          {exam.status === "draft" && <button type="button" className="lesson-button lesson-button-primary exam-big" disabled={busy || staged} onClick={() => void command("open")}>Mở phòng cho học sinh vào</button>}
          {(exam.status === "draft" || exam.status === "open") && <button type="button" className="lesson-button lesson-button-success exam-big" disabled={busy || staged} onClick={start}>▶ Bắt đầu tính giờ ({exam.durationMin} phút)</button>}
          {staged && (exam.status === "draft" || exam.status === "open") && <p className="exam-warn">Lưu hoặc hủy bản nháp trước khi mở phòng hoặc bắt đầu tính giờ.</p>}
          {exam.status === "running" && (
            <>
              <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => void command("extend", { minutes: 5 })}>+5 phút</button>
              <button type="button" className="lesson-button lesson-button-danger" disabled={busy} onClick={() => { if (window.confirm("Kết thúc bài kiểm tra? Mọi bài chưa nộp sẽ được nộp ngay.")) void command("close"); }}>Kết thúc</button>
            </>
          )}
          {exam.status === "closed" && <a className="lesson-button lesson-button-primary" href={"/api/exams?id=" + id + "&csv=1"}>⬇ Tải bảng điểm (CSV)</a>}
          <button type="button" data-delete-exam className="lesson-button lesson-button-danger" disabled={busy || staged || exam.status === "running"} onClick={() => {
            setDeleteConfirmation("");
            setPendingDelete({ label: exam.title, message: 'Xóa phòng “' + exam.title + '” có ' + data.attempts.length + ' bài của học sinh? Phòng và toàn bộ bài làm chuyển vào Thùng rác. Có thể khôi phục trong Thùng rác của giáo viên.', body: { action: "delete", confirmTitle: exam.title, confirmAttempts: data.attempts.length } });
          }}>Xóa phòng</button>
        </div>
        {pendingDelete && <form className="exam-card" aria-label="Xác nhận xóa trong phòng kiểm tra" onSubmit={async (event) => {
          event.preventDefault();
          if (deleteConfirmation !== pendingDelete.label || busy || (staged && pendingDelete.body.action !== "draft-code")) return;
          if (pendingDelete.body.action === "draft-code") {
            const remaining = allCodes.filter((entry) => entry.code !== pendingDelete.body.examCode);
            if (!remaining.length) return;
            setRemovedDraftCode(allCodes.find((entry) => entry.code === pendingDelete.body.examCode) || null);
            setEditedCodes(remaining); setEdited(null); setSelectedCode(remaining[0].code); setPendingDelete(null); setDeleteConfirmation(""); return;
          }
          setBusy(true); setError("");
          try {
            await teacherPost({ ...pendingDelete.body, id });
            setPendingDelete(null); setDeleteConfirmation("");
            if (pendingDelete.body.action === "delete") { onBack(); return; }
            await load(); if (results) await loadResults();
          } catch (e) { setError(messageFor(e)); await load(); }
          finally { setBusy(false); }
        }}>
          <p>{pendingDelete.message}</p>
          <label>Nhập chính xác: <strong>{pendingDelete.label}</strong><input autoFocus className="lesson-input" value={deleteConfirmation} disabled={busy} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" /></label>
          <button type="submit" className="lesson-button lesson-button-danger" disabled={busy || deleteConfirmation !== pendingDelete.label || (staged && pendingDelete.body.action !== "draft-code")}>Xác nhận xóa</button>{" "}
          <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => { setPendingDelete(null); setDeleteConfirmation(""); }}>Hủy xóa</button>
        </form>}
        {data.missingKeys.length > 0 && exam.status !== "closed" && <p className="exam-warn">⚠ Còn {data.missingKeys.length} câu chưa có đáp án (mở thẻ &quot;Đề và đáp án&quot; để điền).</p>}
        <a className="lesson-button lesson-button-outline" href="/trash">Thùng rác</a>
        {removedDraftCode && <button type="button" className="lesson-button lesson-button-outline" disabled={busy || allCodes.some((entry) => entry.code === removedDraftCode.code)} onClick={() => { setEditedCodes([...allCodes, removedDraftCode]); setEdited(null); setSelectedCode(removedDraftCode.code); setRemovedDraftCode(null); }}>Hoàn tác bỏ mã đề nháp</button>}
        {error && <p className="exam-error" role="alert">{error}</p>}
      </header>

      <div className="exam-tabs" role="tablist">
        {([["students", "Học sinh (" + data.attempts.length + ")"], ["marking", "Chấm tự luận"], ["results", "Kết quả"], ["exam", "Đề và đáp án"]] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" disabled={(guidePending || variantPending || imageReaders > 0) && tab !== key} aria-selected={tab === key} className={"exam-tab" + (tab === key ? " is-on" : "")} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "students" && (
        <section className="exam-card">
          {data.attempts.length === 0 ? <p>Chưa có học sinh nào vào. Đọc mã <strong>{exam.code}</strong> hoặc gửi link cho lớp.</p> : (
            <table className="exam-table">
              <thead><tr><th>Học sinh</th><th>Mã đề</th><th>Tiến độ</th><th>Rời trang</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {data.attempts.map((a) => {
                  const attemptQuestionCount = serverCodes.find((code) => code.code === a.examCode)?.questions.length ?? exam.questions.length;
                  return (
                  <tr key={a.id} data-attempt-id={a.id} data-attempt-code={a.examCode || ""}>
                    <td><span className="lesson-mascot-sprite lesson-mascot-sprite-small" style={mascotSpriteStyle(SPRITE, a.mascot)} role="img" aria-hidden="true" /> {a.name}</td>
                    <td>{a.examCode || (exam.settings.assignment === "manual" && exam.status !== "running" && exam.status !== "closed" ? <select className="lesson-input" aria-label={"Mã đề cho " + a.name} value="" onChange={(e) => void act({ action: "assign-code", attemptId: a.id, examCode: e.target.value })}><option value="">Chưa giao</option>{serverCodes.map((code) => <option key={code.code} value={code.code}>{code.code}</option>)}</select> : "101")}</td>
                    <td><div className="exam-bar-mini"><i style={{ width: Math.min(100, Math.max(0, attemptQuestionCount ? (a.answered / attemptQuestionCount) * 100 : 0)) + "%" }} /></div><small>{a.answered}/{attemptQuestionCount}{a.photos ? " · " + a.photos + " ảnh" : ""}</small></td>
                    <td className={a.tabLeaves >= 3 ? "exam-bad" : ""}>{a.tabLeaves}</td>
                    <td>{a.submittedAt ? <span className="lesson-badge lesson-badge-success">Đã nộp</span> : exam.status !== "running" ? <span className="lesson-badge lesson-badge-outline">Đã vào</span> : online(a) ? <span className="lesson-badge lesson-badge-primary">Đang làm</span> : <span className="lesson-badge lesson-badge-warning">Mất kết nối?</span>}</td>
                    <td className="exam-row-actions">
                      <button type="button" className="exam-link exam-accommodation-open" aria-expanded={supportAttemptId === a.id} disabled={exam.status === "closed" || a.submittedAt !== null || (exam.status === "running" && a.endsAt !== null && now + offset > a.endsAt + 1000 * (exam.settings.graceSeconds ?? 0))} onClick={() => setSupportAttemptId(supportAttemptId === a.id ? "" : a.id)}>Hỗ trợ riêng{a.extraMinutes ? " · +" + a.extraMinutes + " phút" : ""}{a.textScale !== 1 ? " · " + a.textScale * 100 + "%" : ""}</button>
                      {a.claimed && <button type="button" className="exam-link" title="Cho học sinh vào lại từ thiết bị khác" onClick={() => { if (window.confirm("Cho " + a.name + " vào lại từ thiết bị khác? Thiết bị cũ sẽ mất quyền làm bài.")) void act({ action: "release", attemptId: a.id }); }}>Cho vào lại</button>}
                      <button type="button" className="exam-link" disabled={busy || exam.status === "running"} onClick={() => {
                        setDeleteConfirmation("");
                        setPendingDelete({ label: a.name, message: 'Xóa bài của “' + a.name + '” trong phòng “' + exam.title + '”? Bài làm chuyển vào Thùng rác; quyền xem lại hiện tại hết hiệu lực. Có thể khôi phục trong Thùng rác của giáo viên.', body: { action: "remove-attempt", attemptId: a.id, confirmName: a.name, expectedLastSeenAt: a.lastSeenAt, expectedSubmittedAt: a.submittedAt, expectedContentRevision: a.contentRevision } });
                      }}>Xóa bài học sinh</button>
                      {a.submittedAt && exam.status === "running" && <button type="button" className="exam-link" onClick={() => void act({ action: "reopen", attemptId: a.id })}>Mở lại bài</button>}
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          )}
          {data.attempts.filter((a) => a.id === supportAttemptId).map((a) => <AccommodationEditor key={a.id + ":" + a.accommodationRevision} examId={id} attempt={a} disabled={exam.status === "closed" || a.submittedAt !== null || (exam.status === "running" && a.endsAt !== null && now + offset > a.endsAt + 1000 * (exam.settings.graceSeconds ?? 0))} onSaved={() => { void load(); }} />)}
        </section>
      )}

      {tab === "marking" && (
        <section className="exam-card exam-marking">
          {essays.length === 0 ? <p>Đề này không có câu tự luận.</p> : !results ? <p>Đang tải…</p> : (
            <div className="exam-marking-grid">
              <ul className="exam-pick">
                {results.rows.map((r) => (
                  <li key={r.id}><button type="button" className={pick === r.id ? "is-on" : ""} onClick={() => setPick(r.id)}>{r.name}{r.essaysToMark > 0 && <span className="lesson-badge lesson-badge-warning">{r.essaysToMark} cần chấm</span>}</button></li>
                ))}
              </ul>
              <div>{pick ? <EssayMarker key={pick} examId={id} attemptId={pick} onSaved={() => void loadResults()} /> : <p className="exam-note">Chọn một học sinh để xem bài và chấm điểm. Ảnh bài làm hiện ngay tại đây.</p>}</div>
            </div>
          )}
        </section>
      )}

      {tab === "results" && (
        <section className="exam-card">
          {!results ? <p>Đang tải…</p> : (
            <>
              <div className="exam-results-head">
                <h3>Bảng điểm</h3>
                <button type="button" className="lesson-button lesson-button-outline" onClick={() => void loadResults()}>Làm mới</button>
                <a className="lesson-button lesson-button-outline" href={"/api/exams?id=" + id + "&csv=1"}>⬇ CSV</a>
              </div>
              <table className="exam-table">
                <thead><tr><th>#</th><th>Học sinh</th><th>Mã đề</th><th>Đã làm</th>{[...new Set(results.exam.questions.map((q) => q.section))].map((s) => <th key={s}>Phần {s || "-"}</th>)}<th>Tổng</th><th>Rời trang</th></tr></thead>
                <tbody>
                  {results.rows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td><td>{r.name}{r.essaysToMark > 0 && <span className="lesson-badge lesson-badge-warning">chưa chấm tự luận</span>}</td><td>{r.examCode || "101"}</td><td>{r.answered}/{(results.exam.codes?.find((code) => code.code === r.examCode)?.questions || results.exam.questions).length}</td>
                      {[...new Set(results.exam.questions.map((q) => q.section))].map((s) => <td key={s}>{fmt(r.sections[s]?.points ?? 0)}</td>)}
                      <td><strong>{fmt(r.total)}</strong> / {fmt(r.max)}</td><td className={r.tabLeaves >= 3 ? "exam-bad" : ""}>{r.tabLeaves}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.rows.length > 0 && <p className="exam-summary">Điểm trung bình lớp: <strong>{fmt(results.rows.reduce((s, r) => s + r.total, 0) / results.rows.length)}</strong> · cao nhất {fmt(Math.max(...results.rows.map((r) => r.total)))} · thấp nhất {fmt(Math.min(...results.rows.map((r) => r.total)))}</p>}
              <h3>Câu nào học sinh sai nhiều</h3>
              <label>Mã đề thống kê<select className="lesson-input" aria-label="Mã đề thống kê" value={active.code} onChange={(e) => { if (edited || editedCodes) setEditedCodes(allCodes); setEdited(null); setSelectedCode(e.target.value); }}>{serverCodes.map((code) => <option key={code.code} value={code.code}>{code.code}</option>)}</select></label>
              <ul className="exam-stats">
                {active.questions.filter((q) => q.type !== "essay").map((q) => {
                  const s = results.statsByCode?.[active.code]?.[q.id] || results.stats[q.id];
                  if (!s) return null;
                  const n = results.rows.filter((row) => (row.examCode || "101") === active.code).length || 1;
                  const pct = Math.round((s.correct / n) * 100);
                  return (
                    <li key={q.id}>
                      <span className="exam-stat-name">{q.section ? q.section + "·" : ""}{q.label}</span>
                      <div className="exam-stat-bar" title={s.correct + "/" + n + " đúng"}><i className={pct < 40 ? "is-hard" : pct < 70 ? "is-mid" : ""} style={{ width: pct + "%" }} /></div>
                      <span className="exam-stat-num">{pct}%</span>
                      {q.type === "mc" && <small>{(q.options || []).map((o) => o + ":" + (s.choices[o] || 0)).join(" ")}{typeof q.key === "string" ? " · đúng " + q.key : ""}</small>}
                      {q.type === "tf" && <small>đúng từng ý: {(q.statements || []).map((l, i) => l + ":" + (s.statements[i] || 0)).join(" ")}</small>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "exam" && (
        <section className="exam-card">
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <h3>Đề và đáp án</h3>
          <CodeTabs codes={allCodes} selected={active.code} locked={data.attempts.length > 0 || exam.status === "running" || exam.status === "closed"} disabled={busy || guidePending || variantPending || imageReaders > 0} onSelect={(code) => { if (edited || editedCodes) setEditedCodes(allCodes); setEdited(null); setSelectedCode(code); setKeyText(""); }} onDuplicate={async (newCode) => { if (dirty || data.attempts.length) { setNote("Lưu bản nháp trước khi nhân bản; chỉ thêm mã đề khi chưa có học sinh vào."); return; } setBusy(true); try { const next = await teacherPost<RoomData>({ action: "duplicate-code", id, sourceCode: active.code, newCode }); setData(next); setSelectedCode(newCode); } catch (e) { setNote(messageFor(e)); } finally { setBusy(false); } }} onRemove={(code) => {
            if (editedCodes && !serverCodes.some((entry) => entry.code === code)) {
              setDeleteConfirmation(""); setPendingDelete({ label: "Mã đề " + code, message: 'Bỏ mã đề ' + code + ' khỏi bản nháp “' + exam.title + '”?', body: { action: "draft-code", examCode: code } }); return;
            }
            void removePart({ action: "remove-code", examCode: code, confirmLabel: code }, "Mã đề " + code); }} onImport={(code, file) => { if (data.attempts.length) { setNote("Đã có học sinh vào nên không thêm mã đề."); return; } setImporting({ code, file }); }} />
          {data.attempts.length > 0 && <p className="exam-note">Đã có học sinh vào: giữ nguyên mã đề, đề và phương án; vẫn sửa được đáp án, điểm, lời giải.</p>}
          <fieldset disabled={data.attempts.length > 0 || variantPending || guidePending} style={{ border: 0, padding: 0, minWidth: 0 }}><AntiCheatingSettings settings={antiCheating || exam.settings} count={allCodes.length} onChange={(patch) => setAntiCheating({ ...(antiCheating || exam.settings), ...patch })} /></fieldset>
          <PupilPreview key={active.code} examId={id} examCode={active.code} disabled={dirty} />
          <VariantAssistant key={active.code} examId={id} examCode={active.code} questions={questions} disabled={dirty || guidePending || data.attempts.length > 0 || allCodes.length >= 8 || !nextExamCode(allCodes)} onPendingChange={setVariantPending} onCreate={(variants) => { const newCode = nextExamCode(allCodes); if (!newCode || allCodes.length >= 8) return; const cloned = variants.map((q, i) => ({ ...q, id: newCode + "_q" + (i + 1), solutionImages: undefined, questionImages: undefined, choiceImages: undefined, statementImages: undefined })); setEditedCodes([...allCodes, { code: newCode, questions: cloned }]); setEdited(null); setSelectedCode(newCode); setNote("Mã đề từ câu đã duyệt còn ở bản nháp; bấm Lưu thay đổi."); }} />
          <p className="exam-note">Sửa đáp án hoặc điểm bất cứ lúc nào (kể cả sau khi thi): điểm của học sinh tự tính lại. Không đổi được số câu hay loại câu khi đã có học sinh vào.</p>
          <details className="exam-keybox">
            <summary>Dán đáp án cho nhanh</summary>
            <textarea className="lesson-input" rows={4} disabled={guidePending || variantPending} value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder={"PHẦN I\n1.C 2.B 3.B ...\nPHẦN II\nCâu 1: Đ Đ Đ S"} />
            <button type="button" className="lesson-button lesson-button-primary" disabled={guidePending || variantPending} onClick={() => {
              const result = parseAnswerKey(keyText, questions) as { keys: Record<string, unknown>; applied: number; problems: string[] };
              setEdited(questions.map((q) => (q.id in result.keys ? { ...q, key: result.keys[q.id] } : q)));
              setNote("Đã điền " + result.applied + " câu." + (result.problems.length ? " Lưu ý: " + result.problems.slice(0, 3).join(" ") : "") + " Bấm Lưu để áp dụng.");
            }}>Điền đáp án</button>
          </details>
          <label><span>Lời giải cho học sinh</span><select className="lesson-input" disabled={variantPending} aria-label="Lời giải cho học sinh" value={reviewPolicy ?? exam.settings.review ?? "after_close"} onChange={(e) => setReviewPolicy(e.target.value as "after_close" | "none")}><option value="after_close">Mở khi phòng kết thúc</option><option value="none">Không mở</option></select></label>
          <GuideImport key={active.code} questions={questions} examId={id} disabled={busy || variantPending || imageReaders > 0} onPendingChange={setGuidePending} onApply={(reviewed) => { setEdited((current) => (current || active.questions).map((q) => { const guide = reviewed.find((x) => x.id === q.id); return guide ? { ...q, key: guide.key, rubric: guide.rubric, solution: guide.solution, solutionUploads: guide.solutionUploads, solutionRemoved: guide.solutionRemoved } : q; })); setNote("Đã áp dụng vào bản nháp. Bấm Lưu thay đổi để lưu vào phòng."); }} />
          {questions.map((q) => (
            <article key={q.id} className={"exam-qcard" + (keyReady(q) ? "" : " is-missing")}>
              <fieldset disabled={guidePending || variantPending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="exam-qcard-head"><strong>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</strong><span>{describeKey(q) || "chưa có đáp án"}</span>
                <label className="exam-points-edit"><input className="lesson-input" type="number" min={0} max={20} step={0.05} value={q.points} onChange={(e) => patchQuestion(q.id, { points: Number(e.target.value) })} /> điểm</label>
                <button type="button" className="lesson-button lesson-button-danger" disabled={staged || data.attempts.length > 0 || exam.status === "running" || exam.status === "closed" || questions.length <= 1} onClick={() => void removePart({ action: "remove-question", examCode: hasCodes ? active.code : null, qid: q.id, confirmLabel: q.label }, q.label)}>Xóa câu</button>
              </div>
              {q.text && q.imageMode !== "question" && <div className="exam-q-text"><MathText text={q.text} inline={false} /></div>}
              {q.questionImages?.length ? q.questionImages.map((image, index) => <div key={image.id}><SolutionImage examId={id} assetId={image.id} alt={"Hình trong " + q.label} /><button type="button" className="lesson-button lesson-button-outline" disabled={staged || data.attempts.length > 0 || exam.status === "running" || exam.status === "closed"} onClick={() => {
                setDeleteConfirmation(""); setPendingDelete({ label: q.label + " · Hình " + (index + 1), message: 'Xóa hình ' + (index + 1) + ' của “' + q.label + '” trong phòng “' + exam.title + '”? Có thể khôi phục trong Thùng rác của giáo viên.', body: { action: "remove-image", qid: q.id, assetId: image.id } });
              }}>Xóa hình {index + 1}</button></div>) : q.hasImage ? <Picture query={"id=" + id + "&image=" + q.id} alt={q.label} /> : q.text && q.imageMode === "question" ? <MathText text={q.text} inline={false} /> : null}
              {q.sourceImages?.map((image) => <img key={image.id} className="exam-teacher-img" src={"data:" + image.mime + ";base64," + image.data} alt={"Hình mới " + q.label} />)}
              {q.image && <img className="exam-teacher-img" src={"data:image/jpeg;base64," + q.image} alt={"Ảnh đề mới " + q.label} />}
              <label>Nội dung câu hỏi<textarea className="lesson-input" rows={3} maxLength={4000} disabled={data.attempts.length > 0} value={q.text || ""} aria-label={"Nội dung " + q.label} onChange={(e) => patchQuestion(q.id, { text: e.target.value })} /></label>
              {(q.hasImage || q.questionImages?.length || q.sourceImages?.length) && <button type="button" className="lesson-button lesson-button-outline" disabled={data.attempts.length > 0} onClick={() => { setRemovedDraftImage({ qid: q.id, patch: { removeQuestionImage: q.removeQuestionImage, hasImage: q.hasImage, questionImages: q.questionImages, sourceImages: q.sourceImages } }); patchQuestion(q.id, { removeQuestionImage: true, hasImage: false, questionImages: [], sourceImages: [] }); }}>Bỏ hình minh họa (cần sửa đề nếu đề phụ thuộc hình)</button>}
              <fieldset disabled={data.attempts.length > 0} style={{ border: 0, padding: 0, minWidth: 0 }}><QuestionItemsEditor q={q} examId={id} onChange={(change) => patchQuestion(q.id, change)} onRemoveImage={(itemKind, letter, assetId) => {
                if (staged) { setNote("Lưu bản nháp trước khi xóa ảnh."); return; }
                setDeleteConfirmation(""); setPendingDelete({ label: q.label + " · Ảnh " + letter, message: 'Xóa ảnh ' + letter + ' của “' + q.label + '” trong phòng “' + exam.title + '”? Có thể khôi phục trong Thùng rác của giáo viên.', body: { action: "remove-item-image", qid: q.id, itemKind, letter, assetId } });
              }} /></fieldset>
              <KeyEditor q={q} onChange={(change) => patchQuestion(q.id, change)} />
              <SolutionEditor q={q} examId={id} onBusyChange={imageBusy} onChange={(change) => patchQuestion(q.id, change)} />
              </fieldset>
            </article>
          ))}
          {removedDraftImage && <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => { patchQuestion(removedDraftImage.qid, removedDraftImage.patch); setRemovedDraftImage(null); }}>Hoàn tác bỏ hình (chưa bấm Lưu)</button>}
          {note && <p className="exam-note">{note}</p>}
          <div className="exam-sticky">
            <button type="button" className="lesson-button lesson-button-success exam-big" disabled={!dirty || busy || guidePending || variantPending || imageReaders > 0} onClick={async () => {
              setBusy(true);
              const savingCodes = hasCodes || allCodes.length > 1 ? allCodes.map((code) => ({ ...code, questions: code.questions.map((q, i) => ({ ...q, id: code.code + "_q" + (i + 1) })) })) : allCodes;
              let pending = savingCodes.flatMap((code) => code.questions.map((q) => ({ ...q })));
              try {
                const serialize = (q: SolutionQuestion) => ({ id: q.id, section: q.section, label: q.label, type: q.type, points: q.points, options: q.options, statements: q.statements, choiceText: q.choiceText, statementText: q.statementText, noShuffle: q.noShuffle, imageMode: q.imageMode, key: q.key, text: q.text, rubric: q.rubric, solution: q.solution });
                await teacherPost({ action: "update", id, exam: { ...(hasCodes || allCodes.length > 1 ? { codes: savingCodes.map((code) => ({ code: code.code, questions: code.questions.map(serialize) })) } : { questions: questions.map(serialize) }), settings: { ...(antiCheating || {}), review: reviewPolicy ?? exam.settings.review ?? "after_close" } } });
                for (const question of pending) {
                  if (question.removeQuestionImage) { await teacherPost({ action: "remove-image", id, qid: question.id }); pending = pending.map((q) => q.id === question.id ? { ...q, removeQuestionImage: false } : q); }
                  if (question.image) await teacherPost({ action: "image", id, qid: question.id, assetId: question.questionImageId, mime: "image/jpeg", data: question.image });
                  for (const image of question.sourceImages || []) await teacherPost({ action: "image", id, qid: question.id, assetId: image.id, mime: image.mime, data: image.data });
                  for (const image of question.itemUploads || []) await teacherPost({ action: "item-image", id, qid: question.id, itemKind: image.itemKind, letter: image.letter, assetId: image.id, mime: image.mime, data: image.data });
                  for (const asset of question.solutionUploads || []) {
                    const saved = await teacherPost<{ id: string }>({ action: "solution-image", id, qid: question.id, assetId: asset.id, mime: asset.mime, data: asset.data });
                    pending = pending.map((q) => q.id === question.id ? { ...q, solutionImages: [...(q.solutionImages || []), { id: saved.id, bytes: Math.floor(asset.data.length * 3 / 4) }], solutionUploads: q.solutionUploads?.filter((x) => x.id !== asset.id) } : q);
                  }
                  for (const assetId of question.solutionRemoved || []) {
                    await teacherPost({ action: "remove-solution-image", id, assetId });
                    pending = pending.map((q) => q.id === question.id ? { ...q, solutionImages: q.solutionImages?.filter((x) => x.id !== assetId), solutionRemoved: q.solutionRemoved?.filter((x) => x !== assetId) } : q);
                  }
                }
                loadVersion.current++;
                const next = await teacherGet<RoomData>("?id=" + id);
                setData(next);
                setEdited(null);
                setEditedCodes(null);
                setAntiCheating(null);
                setReviewPolicy(null);
                setRemovedDraftImage(null); setRemovedDraftCode(null);
                setNote("Đã lưu đáp án, lời giải và cài đặt.");
                await loadResults();
              } catch (e) {
                const retryCodes = savingCodes.map((code) => ({ ...code, questions: pending.filter((q) => code.questions.some((original) => original.id === q.id)) }));
                setEdited(retryCodes.find((code) => code.code === active.code)?.questions || null);
                setEditedCodes(retryCodes);
                setNote(messageFor(e) + " Bản nháp được giữ; bấm Lưu thay đổi để thử lại.");
              } finally {
                setBusy(false);
              }
            }}>Lưu thay đổi</button>
            {guidePending && <p className="exam-note">Áp dụng hoặc hủy hướng dẫn chấm trước khi lưu.</p>}
          </div>
          </fieldset>
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ the page

export default function ExamTeacher({ user }: { user: { displayName: string } }) {
  const [view, setView] = useState<"list" | "new" | "room">("list");
  const [id, setId] = useState("");
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ExamSummary | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState("");
  const [creationMinutes,setCreationMinutes]=useState<number|undefined>(undefined);

  const loadList = useCallback(async () => {
    try {
      setExams((await teacherGet<{ exams: ExamSummary[] }>("")).exams);
    } catch (e) {
      setError(messageFor(e));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query=new URLSearchParams(window.location.search);
      const setup=parseExamCreation(query),validSetup=setup!==null;
      const wanted = validSetup?null:query.get("id");
      if (wanted) {
        setId(wanted);
        setView("room");
      }
      else if(setup){setCreationMinutes(setup.minutes);setView('new');}
      else if(query.has('setup'))window.history.replaceState(null,"","/exams");
      void loadList();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  const openRoom = (examId: string) => {
    setId(examId);
    setView("room");
    window.history.replaceState(null, "", "/exams?id=" + examId);
  };
  const toList = () => {
    setView("list");
    window.history.replaceState(null, "", "/exams");
    void loadList();
  };

  return (
    <div className="lesson-shell exam-teacher">
      <header className="lesson-header">
        <div>
          <p className="lesson-kicker">Kiểm tra</p>
          <h1 className="lesson-title">Phòng kiểm tra</h1>
          <p className="exam-note">Xin chào {user.displayName}. Tải file đề lên, học sinh vào bằng mã phòng và làm bài trên điện thoại hoặc máy tính; bài được lưu ngay từng câu.</p>
        </div>
        <a className="lesson-button lesson-button-outline" href="/lessons">Tiết học</a><a className="lesson-button lesson-button-outline" href="/trash">Thùng rác</a>
      </header>
      {view === "list" && (
        <section className="exam-list">
          <button type="button" className="lesson-button lesson-button-primary exam-big" onClick={() => setView("new")}>＋ Tạo bài kiểm tra từ file đề</button>
          {error && <p className="exam-error" role="alert">{error}</p>}
          {exams === null ? <p>Đang tải…</p> : exams.length === 0 ? <p className="exam-note">Chưa có bài kiểm tra nào.</p> : (
            <ul className="exam-cards">
              {exams.map((e) => (
                <li key={e.id} className="exam-card">
                  <div><strong>{e.title}</strong><br /><small>{e.questionCount} câu · {e.durationMin} phút · {e.attempts} học sinh · mã <b>{e.code}</b></small></div>
                  <span className={"lesson-badge " + STATUS_BADGE[e.status]}>{STATUS_LABEL[e.status]}</span>
                  <button type="button" className="lesson-button lesson-button-primary" onClick={() => openRoom(e.id)}>Mở</button>
                  <button type="button" className="lesson-button lesson-button-danger" disabled={Boolean(deletingId) || e.status === "running"} onClick={() => { setDeleteConfirmation(""); setPendingDelete(e); }}>Xóa phòng</button>
                </li>
              ))}
            </ul>
          )}
          {pendingDelete && <form className="exam-card" aria-label="Xác nhận xóa phòng kiểm tra" onSubmit={async (event) => {
            event.preventDefault(); if (deleteConfirmation !== pendingDelete.title || deletingId) return;
            setDeletingId(pendingDelete.id); setError("");
            try { await teacherPost({ action: "delete", id: pendingDelete.id, confirmTitle: pendingDelete.title, confirmAttempts: pendingDelete.attempts }); setPendingDelete(null); setDeleteConfirmation(""); await loadList(); }
            catch (error) { setError(messageFor(error)); await loadList(); }
            finally { setDeletingId(""); }
          }}>
            <p>Xóa phòng “{pendingDelete.title}” có {pendingDelete.attempts} bài của học sinh? Phòng và toàn bộ bài làm chuyển vào Thùng rác. Có thể khôi phục trong Thùng rác của giáo viên.</p>
            <label>Nhập chính xác: <strong>{pendingDelete.title}</strong><input autoFocus className="lesson-input" value={deleteConfirmation} disabled={Boolean(deletingId)} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" /></label>
            <button type="submit" className="lesson-button lesson-button-danger" disabled={Boolean(deletingId) || deleteConfirmation !== pendingDelete.title}>Xác nhận xóa</button>{" "}
            <button type="button" className="lesson-button lesson-button-outline" disabled={Boolean(deletingId)} onClick={() => { setPendingDelete(null); setDeleteConfirmation(""); }}>Hủy xóa</button>
          </form>}
        </section>
      )}
      {view === "new" && <ExamImport onCancel={toList} onCreated={openRoom} initialDurationMin={creationMinutes} />}
      {view === "room" && <ExamRoom id={id} onBack={toList} />}
    </div>
  );
}
