"use client";

import React, { useCallback, useEffect, useState } from "react";
import MathText from "../lesson/MathText";
import { mascotSpriteStyle } from "../lesson/LessonMascotPicker";
import { parseAnswerKey } from "../../lib/exam/answer-key.js";
import { describeKey } from "../../lib/exam/scoring.js";
import { ExamQuestion, messageFor, teacherGet, teacherImageUrl, teacherPost } from "./client";
import { ExamImport } from "./ExamImport";
import { KeyEditor, keyReady } from "./KeyEditor";

const SPRITE = "mascots-historical.webp";
const STATUS_LABEL: Record<string, string> = { draft: "Bản nháp", open: "Đang mở phòng", running: "Đang thi", closed: "Đã kết thúc" };
const STATUS_BADGE: Record<string, string> = { draft: "lesson-badge-outline", open: "lesson-badge-warning", running: "lesson-badge-success", closed: "lesson-badge-primary" };

interface ExamSummary { id: string; code: string; title: string; status: string; durationMin: number; attempts: number; questionCount: number; createdAt: number }
interface ExamFull { id: string; code: string; title: string; status: "draft" | "open" | "running" | "closed"; durationMin: number; startedAt: number | null; endsAt: number | null; settings: { showResult?: string; allowLateJoin?: boolean }; questions: ExamQuestion[] }
interface AttemptRow { id: string; name: string; mascot: number; answered: number; photos: number; tabLeaves: number; joinedAt: number; lastSeenAt: number; submittedAt: number | null; claimed: boolean }
interface RoomData { serverNow: number; exam: ExamFull; missingKeys: string[]; attempts: AttemptRow[] }
interface ResultRow { id: string; name: string; mascot: number; tabLeaves: number; submittedAt: number | null; answered: number; total: number; max: number; sections: Record<string, { points: number; max: number }>; essaysToMark: number; perQuestion: Record<string, { p: number; c: boolean | null }> }
interface Stat { answered: number; correct: number; wrong: number; blank: number; avg: number; choices: Record<string, number>; statements: number[] }
interface ResultsData { exam: ExamFull; rows: ResultRow[]; stats: Record<string, Stat> }
interface AttemptDetail { attempt: { id: string; name: string }; answers: Record<string, unknown>; manual: Record<string, number>; photos: Array<{ id: string; qid: string }>; exam: ExamFull }

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
  const [note, setNote] = useState("");
  useEffect(() => {
    let alive = true;
    teacherGet<AttemptDetail>("?id=" + examId + "&attempt=" + attemptId)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setScores(Object.fromEntries(Object.entries(d.manual).map(([k, v]) => [k, String(v)])));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [examId, attemptId]);
  if (!detail) return <p className="exam-note">Đang tải bài làm…</p>;
  const essays = detail.exam.questions.filter((q) => q.type === "essay");
  const save = async (q: ExamQuestion) => {
    try {
      const raw = scores[q.id];
      await teacherPost({ action: "grade", id: examId, attemptId, qid: q.id, score: raw === undefined || raw === "" ? null : Number(raw.replace(",", ".")) });
      setNote("Đã lưu điểm " + q.label + ".");
      onSaved();
    } catch (e) {
      setNote(messageFor(e));
    }
  };
  return (
    <div className="exam-marker">
      <h3>{detail.attempt.name}</h3>
      {essays.map((q) => {
        const typed = detail.answers[q.id] as { text?: string } | null;
        const shots = detail.photos.filter((p) => p.qid === q.id);
        return (
          <div key={q.id} className="exam-mark-card">
            <div className="exam-mark-head"><strong>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</strong><span>tối đa {fmt(q.points)} điểm</span></div>
            {q.hasImage ? <Picture query={"id=" + examId + "&image=" + q.id} alt={q.label} /> : q.text ? <div className="exam-q-text"><MathText text={q.text} inline={false} /></div> : null}
            {q.rubric && <p className="exam-note">Thang chấm: {q.rubric}</p>}
            <div className="exam-shots">{shots.length === 0 && !typed?.text ? <em>Chưa có bài làm.</em> : shots.map((p) => <Picture key={p.id} query={"id=" + examId + "&asset=" + p.id} alt="Ảnh bài làm" />)}</div>
            {typed?.text && <p className="exam-typed">{typed.text}</p>}
            <div className="exam-score-row">
              <input className="lesson-input" inputMode="decimal" value={scores[q.id] ?? ""} onChange={(e) => setScores({ ...scores, [q.id]: e.target.value })} placeholder="Điểm" aria-label={"Điểm " + q.label} />
              <span>/ {fmt(q.points)}</span>
              <button type="button" className="lesson-button lesson-button-primary" onClick={() => void save(q)}>Lưu điểm</button>
            </div>
          </div>
        );
      })}
      {note && <p className="exam-note">{note}</p>}
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
  const [edited, setEdited] = useState<ExamQuestion[] | null>(null);
  const [keyText, setKeyText] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await teacherGet<RoomData>("?id=" + id);
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
  const questions = edited || exam.questions;
  const essays = exam.questions.filter((q) => q.type === "essay");
  const online = (a: AttemptRow) => data.serverNow - a.lastSeenAt < 40000;

  return (
    <div className="exam-room">
      <header className="exam-card exam-room-head">
        <div>
          <button type="button" className="exam-back" onClick={onBack}>← Danh sách</button>
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
          {exam.status === "draft" && <button type="button" className="lesson-button lesson-button-primary exam-big" disabled={busy} onClick={() => void command("open")}>Mở phòng cho học sinh vào</button>}
          {(exam.status === "draft" || exam.status === "open") && <button type="button" className="lesson-button lesson-button-success exam-big" disabled={busy} onClick={start}>▶ Bắt đầu tính giờ ({exam.durationMin} phút)</button>}
          {exam.status === "running" && (
            <>
              <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => void command("extend", { minutes: 5 })}>+5 phút</button>
              <button type="button" className="lesson-button lesson-button-danger" disabled={busy} onClick={() => { if (window.confirm("Kết thúc bài kiểm tra? Mọi bài chưa nộp sẽ được nộp ngay.")) void command("close"); }}>Kết thúc</button>
            </>
          )}
          {exam.status === "closed" && <a className="lesson-button lesson-button-primary" href={"/api/exams?id=" + id + "&csv=1"}>⬇ Tải bảng điểm (CSV)</a>}
        </div>
        {data.missingKeys.length > 0 && exam.status !== "closed" && <p className="exam-warn">⚠ Còn {data.missingKeys.length} câu chưa có đáp án (mở thẻ &quot;Đề và đáp án&quot; để điền).</p>}
        {error && <p className="exam-error" role="alert">{error}</p>}
      </header>

      <div className="exam-tabs" role="tablist">
        {([["students", "Học sinh (" + data.attempts.length + ")"], ["marking", "Chấm tự luận"], ["results", "Kết quả"], ["exam", "Đề và đáp án"]] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={"exam-tab" + (tab === key ? " is-on" : "")} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "students" && (
        <section className="exam-card">
          {data.attempts.length === 0 ? <p>Chưa có học sinh nào vào. Đọc mã <strong>{exam.code}</strong> hoặc gửi link cho lớp.</p> : (
            <table className="exam-table">
              <thead><tr><th>Học sinh</th><th>Tiến độ</th><th>Rời trang</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.id}>
                    <td><span className="lesson-mascot-sprite lesson-mascot-sprite-small" style={mascotSpriteStyle(SPRITE, a.mascot)} role="img" aria-hidden="true" /> {a.name}</td>
                    <td><div className="exam-bar-mini"><i style={{ width: (exam.questions.length ? (a.answered / exam.questions.length) * 100 : 0) + "%" }} /></div><small>{a.answered}/{exam.questions.length}{a.photos ? " · " + a.photos + " ảnh" : ""}</small></td>
                    <td className={a.tabLeaves >= 3 ? "exam-bad" : ""}>{a.tabLeaves}</td>
                    <td>{a.submittedAt ? <span className="lesson-badge lesson-badge-success">Đã nộp</span> : exam.status !== "running" ? <span className="lesson-badge lesson-badge-outline">Đã vào</span> : online(a) ? <span className="lesson-badge lesson-badge-primary">Đang làm</span> : <span className="lesson-badge lesson-badge-warning">Mất kết nối?</span>}</td>
                    <td className="exam-row-actions">
                      {a.claimed && <button type="button" className="exam-link" title="Cho học sinh vào lại từ thiết bị khác" onClick={() => { if (window.confirm("Cho " + a.name + " vào lại từ thiết bị khác? Thiết bị cũ sẽ mất quyền làm bài.")) void act({ action: "release", attemptId: a.id }); }}>Cho vào lại</button>}
                      {a.submittedAt && exam.status === "running" && <button type="button" className="exam-link" onClick={() => void act({ action: "reopen", attemptId: a.id })}>Mở lại bài</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                <thead><tr><th>#</th><th>Học sinh</th><th>Đã làm</th>{[...new Set(results.exam.questions.map((q) => q.section))].map((s) => <th key={s}>Phần {s || "-"}</th>)}<th>Tổng</th><th>Rời trang</th></tr></thead>
                <tbody>
                  {results.rows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td><td>{r.name}{r.essaysToMark > 0 && <span className="lesson-badge lesson-badge-warning">chưa chấm tự luận</span>}</td><td>{r.answered}/{results.exam.questions.length}</td>
                      {[...new Set(results.exam.questions.map((q) => q.section))].map((s) => <td key={s}>{fmt(r.sections[s]?.points ?? 0)}</td>)}
                      <td><strong>{fmt(r.total)}</strong> / {fmt(r.max)}</td><td className={r.tabLeaves >= 3 ? "exam-bad" : ""}>{r.tabLeaves}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.rows.length > 0 && <p className="exam-summary">Điểm trung bình lớp: <strong>{fmt(results.rows.reduce((s, r) => s + r.total, 0) / results.rows.length)}</strong> · cao nhất {fmt(Math.max(...results.rows.map((r) => r.total)))} · thấp nhất {fmt(Math.min(...results.rows.map((r) => r.total)))}</p>}
              <h3>Câu nào học sinh sai nhiều</h3>
              <ul className="exam-stats">
                {results.exam.questions.filter((q) => q.type !== "essay").map((q) => {
                  const s = results.stats[q.id];
                  const n = results.rows.length || 1;
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
          <h3>Đề và đáp án</h3>
          <p className="exam-note">Sửa đáp án hoặc điểm bất cứ lúc nào (kể cả sau khi thi): điểm của học sinh tự tính lại. Không đổi được số câu hay loại câu khi đã có học sinh vào.</p>
          <details className="exam-keybox">
            <summary>Dán đáp án cho nhanh</summary>
            <textarea className="lesson-input" rows={4} value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder={"PHẦN I\n1.C 2.B 3.B ...\nPHẦN II\nCâu 1: Đ Đ Đ S"} />
            <button type="button" className="lesson-button lesson-button-primary" onClick={() => {
              const result = parseAnswerKey(keyText, questions) as { keys: Record<string, unknown>; applied: number; problems: string[] };
              setEdited(questions.map((q) => (q.id in result.keys ? { ...q, key: result.keys[q.id] } : q)));
              setNote("Đã điền " + result.applied + " câu." + (result.problems.length ? " Lưu ý: " + result.problems.slice(0, 3).join(" ") : "") + " Bấm Lưu để áp dụng.");
            }}>Điền đáp án</button>
          </details>
          {questions.map((q, i) => (
            <article key={q.id} className={"exam-qcard" + (keyReady(q) ? "" : " is-missing")}>
              <div className="exam-qcard-head"><strong>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</strong><span>{describeKey(q) || "chưa có đáp án"}</span>
                <label className="exam-points-edit"><input className="lesson-input" type="number" min={0} max={20} step={0.05} value={q.points} onChange={(e) => setEdited(questions.map((x, k) => (k === i ? { ...x, points: Number(e.target.value) } : x)))} /> điểm</label>
              </div>
              {q.hasImage ? <Picture query={"id=" + id + "&image=" + q.id} alt={q.label} /> : q.text ? <div className="exam-q-text"><MathText text={q.text} inline={false} /></div> : null}
              <KeyEditor q={q} onChange={(change) => setEdited(questions.map((x, k) => (k === i ? { ...x, ...change } : x)))} />
            </article>
          ))}
          {note && <p className="exam-note">{note}</p>}
          <div className="exam-sticky">
            <button type="button" className="lesson-button lesson-button-success exam-big" disabled={!edited || busy} onClick={async () => {
              setBusy(true);
              try {
                await teacherPost({ action: "update", id, exam: { questions: (edited || []).map(({ hasImage, ...rest }) => rest) } });
                setEdited(null);
                setNote("Đã lưu đáp án.");
                await load();
                await loadResults();
              } catch (e) {
                setNote(messageFor(e));
              } finally {
                setBusy(false);
              }
            }}>Lưu thay đổi</button>
          </div>
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
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    try {
      setExams((await teacherGet<{ exams: ExamSummary[] }>("")).exams);
    } catch (e) {
      setError(messageFor(e));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const wanted = new URLSearchParams(window.location.search).get("id");
      if (wanted) {
        setId(wanted);
        setView("room");
      }
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
        <a className="lesson-button lesson-button-outline" href="/lessons">Tiết học</a>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {view === "new" && <ExamImport onCancel={toList} onCreated={openRoom} />}
      {view === "room" && <ExamRoom id={id} onBack={toList} />}
    </div>
  );
}
