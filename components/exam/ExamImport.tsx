"use client";

import React, { useRef, useState } from "react";
import { parseExamLines } from "../../lib/exam/parse.js";
import { parseAnswerKey } from "../../lib/exam/answer-key.js";
import { ExamQuestion, messageFor, teacherPost } from "./client";
import { KeyEditor, keyReady } from "./KeyEditor";
import { LoadedPdf, PdfLine, Region, loadPdf } from "./pdf-import";

interface DraftQuestion extends ExamQuestion {
  regions?: Region[];
  image?: string;
  rawText?: string;
  busy?: boolean;
}

interface Draft {
  title: string;
  durationMin: number;
  showResult: "score" | "none";
  allowLateJoin: boolean;
  questions: DraftQuestion[];
  warnings: string[];
}

const TYPE_LABEL: Record<ExamQuestion["type"], string> = { mc: "Chọn 1 đáp án", tf: "Đúng/Sai", short: "Trả lời ngắn", essay: "Tự luận" };
const NUDGE = 8;

export function ExamImport({ onCreated, onCancel }: { onCreated: (examId: string) => void; onCancel: () => void }) {
  const [stage, setStage] = useState<"pick" | "reading" | "review" | "saving">("pick");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [keyText, setKeyText] = useState("");
  const [keyNote, setKeyNote] = useState("");
  const pdf = useRef<LoadedPdf | null>(null);

  const readFile = async (file: File) => {
    setError("");
    setStage("reading");
    try {
      const name = file.name.toLowerCase();
      let lines: Array<{ text: string } & Partial<PdfLine>> = [];
      let pages: Array<{ height: number }> | undefined;
      pdf.current?.destroy();
      pdf.current = null;
      if (name.endsWith(".pdf")) {
        setProgress("Đang đọc file PDF…");
        const loaded = await loadPdf(file, (done, total) => setProgress("Đang đọc trang " + done + "/" + total + "…"));
        pdf.current = loaded;
        lines = loaded.lines;
        pages = loaded.pages;
      } else if (name.endsWith(".docx")) {
        setProgress("Đang đọc file Word…");
        const response = await fetch("/api/exams/extract", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
        if (!response.ok) throw new Error("Không đọc được file Word này. Em thử lưu lại thành PDF rồi chọn file PDF.");
        lines = ((await response.json()) as { lines: string[] }).lines.map((text) => ({ text }));
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        lines = (await file.text()).split(/\r?\n/).map((text) => ({ text }));
      } else {
        throw new Error("Chỉ nhận file PDF, Word (.docx) hoặc văn bản (.txt).");
      }
      const parsed = parseExamLines(lines, { pages }) as {
        title: string;
        durationMin: number | null;
        warnings: string[];
        questions: Array<DraftQuestion & { text: string }>;
      };
      const questions: DraftQuestion[] = [];
      for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        setProgress("Đang cắt hình câu " + (i + 1) + "/" + parsed.questions.length + "…");
        const image = pdf.current && q.regions?.length ? await pdf.current.crop(q.regions) : "";
        questions.push({ ...q, key: null, rawText: q.text, text: image ? "" : q.text, image: image || undefined });
      }
      setDraft({
        title: parsed.title || file.name.replace(/\.[^.]+$/, ""),
        durationMin: parsed.durationMin || 45,
        showResult: "score",
        allowLateJoin: true,
        questions,
        warnings: parsed.warnings,
      });
      setStage("review");
    } catch (e) {
      setError(e instanceof Error && !/^[A-Z_]+$/.test(e.message) ? e.message : messageFor(e));
      setStage("pick");
    }
  };

  const patch = (i: number, change: Partial<DraftQuestion>) => setDraft((d) => (d ? { ...d, questions: d.questions.map((q, k) => (k === i ? { ...q, ...change } : q)) } : d));

  const changeType = (i: number, type: ExamQuestion["type"]) => {
    const base: Partial<DraftQuestion> = { type, key: null };
    if (type === "mc") base.options = ["A", "B", "C", "D"];
    if (type === "tf") base.statements = ["a", "b", "c", "d"];
    patch(i, base);
  };

  const nudge = async (i: number, edge: "top" | "bottom", delta: number) => {
    const q = draft?.questions[i];
    if (!q?.regions?.length || !pdf.current) return;
    const regions = q.regions.map((r) => ({ ...r }));
    if (edge === "top") regions[0].top = Math.max(0, regions[0].top + delta);
    else regions[regions.length - 1].bottom += delta;
    patch(i, { busy: true });
    const image = await pdf.current.crop(regions);
    patch(i, { regions, image: image || q.image, busy: false });
  };

  const applyKey = () => {
    if (!draft) return;
    const result = parseAnswerKey(keyText, draft.questions) as { keys: Record<string, unknown>; applied: number; problems: string[] };
    setDraft({ ...draft, questions: draft.questions.map((q) => (q.id in result.keys ? { ...q, key: result.keys[q.id] } : q)) });
    setKeyNote("Đã điền đáp án cho " + result.applied + " câu." + (result.problems.length ? " Lưu ý: " + result.problems.slice(0, 3).join(" ") : ""));
  };

  const create = async () => {
    if (!draft) return;
    setStage("saving");
    setError("");
    try {
      const requestId = "exam" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const questions = draft.questions.map((q) => ({ section: q.section, label: q.label, type: q.type, points: q.points, options: q.options, statements: q.statements, key: q.key, text: q.text || q.rawText || "", rubric: q.rubric }));
      const made = await teacherPost<{ exam: { id: string } }>({ action: "create", requestId, exam: { title: draft.title, durationMin: draft.durationMin, settings: { showResult: draft.showResult, allowLateJoin: draft.allowLateJoin, graceSeconds: 30 }, questions } });
      const examId = made.exam.id;
      const withImage = draft.questions.map((q, i) => ({ q, id: "q" + (i + 1) })).filter((x) => x.q.image);
      for (let n = 0; n < withImage.length; n++) {
        setProgress("Đang gửi hình đề " + (n + 1) + "/" + withImage.length + "…");
        await teacherPost({ action: "image", id: examId, qid: withImage[n].id, mime: "image/jpeg", data: withImage[n].q.image });
      }
      pdf.current?.destroy();
      pdf.current = null;
      onCreated(examId);
    } catch (e) {
      setError(messageFor(e));
      setStage("review");
    }
  };

  if (stage === "pick" || stage === "reading") {
    return (
      <section className="exam-card exam-import">
        <h2>Tạo bài kiểm tra từ file đề</h2>
        <p>Chọn file đề (PDF hoặc Word). Hệ thống tự tìm các câu, cắt hình từng câu từ file PDF (giữ nguyên công thức và hình vẽ) và tính điểm theo ghi chú đầu mỗi phần. Em chỉ cần điền đáp án và kiểm tra lại.</p>
        <label className={"exam-drop" + (stage === "reading" ? " is-busy" : "")}>
          <input type="file" accept=".pdf,.docx,.txt,.md" hidden disabled={stage === "reading"} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void readFile(f); }} />
          {stage === "reading" ? progress : "📄 Chọn file đề (PDF / Word)"}
        </label>
        {error && <p className="exam-error" role="alert">{error}</p>}
        <p className="exam-note">File được đọc ngay trên máy của em; chỉ phần hình và chữ của từng câu được lưu vào phòng kiểm tra.</p>
        <button type="button" className="lesson-button lesson-button-outline" onClick={onCancel}>Quay lại</button>
      </section>
    );
  }

  if (!draft) return null;
  const missing = draft.questions.filter((q) => !keyReady(q)).length;
  const total = Math.round(draft.questions.reduce((s, q) => s + q.points, 0) * 100) / 100;
  return (
    <section className="exam-import-review">
      <div className="exam-card">
        <h2>Kiểm tra lại đề</h2>
        <div className="exam-grid">
          <label><span>Tên bài kiểm tra</span><input className="lesson-input" value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label><span>Thời gian (phút)</span><input className="lesson-input" type="number" min={5} max={300} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })} /></label>
          <label><span>Sau khi nộp, học sinh thấy</span><select className="lesson-input" value={draft.showResult} onChange={(e) => setDraft({ ...draft, showResult: e.target.value as Draft["showResult"] })}><option value="score">Điểm số</option><option value="none">Chỉ thấy &quot;đã nộp&quot;</option></select></label>
          <label className="exam-check"><input type="checkbox" checked={draft.allowLateJoin} onChange={(e) => setDraft({ ...draft, allowLateJoin: e.target.checked })} /> <span>Cho học sinh vào muộn khi đã bắt đầu</span></label>
        </div>
        {draft.warnings.map((w) => <p key={w} className="exam-warn">⚠ {w}</p>)}
        <p className="exam-summary"><strong>{draft.questions.length} câu</strong> · tổng <strong>{total.toLocaleString("vi-VN")} điểm</strong> · {missing ? <span className="exam-warn-text">còn {missing} câu chưa có đáp án</span> : <span className="exam-ok-text">đã có đủ đáp án</span>}</p>
        <details className="exam-keybox" open={missing > 0}>
          <summary>Dán đáp án cho nhanh</summary>
          <p className="exam-note">Dán đáp án theo từng phần, ví dụ: <code>PHẦN I: 1.C 2.B 3.B …</code>, <code>PHẦN II: Câu 1: Đ Đ Đ S</code>, <code>PHẦN III: Câu 1: 1,5</code>.</p>
          <textarea className="lesson-input" rows={5} value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder={"PHẦN I\n1.C 2.B 3.B 4.B 5.A 6.B 7.B 8.C 9.B 10.A 11.A 12.A\nPHẦN II\nCâu 1: Đ Đ Đ S\nCâu 2: Đ Đ Đ S"} />
          <button type="button" className="lesson-button lesson-button-primary" onClick={applyKey} disabled={!keyText.trim()}>Điền đáp án</button>
          {keyNote && <p className="exam-note">{keyNote}</p>}
        </details>
      </div>

      {draft.questions.map((q, i) => (
        <article key={i} className={"exam-card exam-qcard" + (keyReady(q) ? "" : " is-missing")}>
          <div className="exam-qcard-head">
            <strong>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</strong>
            <select className="lesson-input" value={q.type} onChange={(e) => changeType(i, e.target.value as ExamQuestion["type"])} aria-label="Loại câu">
              {(Object.keys(TYPE_LABEL) as Array<ExamQuestion["type"]>).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <label className="exam-points-edit"><input className="lesson-input" type="number" min={0} max={20} step={0.05} value={q.points} onChange={(e) => patch(i, { points: Number(e.target.value) })} /> điểm</label>
            <button type="button" className="lesson-button lesson-button-outline" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, k) => k !== i) })} title="Bỏ câu này (nhận nhầm)">Bỏ</button>
          </div>
          {q.image ? (
            <div className="exam-crop">
              <img src={"data:image/jpeg;base64," + q.image} alt={q.label} />
              <div className="exam-crop-tools" aria-label="Chỉnh vùng cắt">
                <span>Cắt lại:</span>
                <button type="button" disabled={q.busy} onClick={() => void nudge(i, "top", -NUDGE)}>Thêm phía trên</button>
                <button type="button" disabled={q.busy} onClick={() => void nudge(i, "top", NUDGE)}>Bớt phía trên</button>
                <button type="button" disabled={q.busy} onClick={() => void nudge(i, "bottom", NUDGE)}>Thêm phía dưới</button>
                <button type="button" disabled={q.busy} onClick={() => void nudge(i, "bottom", -NUDGE)}>Bớt phía dưới</button>
              </div>
            </div>
          ) : (
            <label className="exam-rawtext"><span>Nội dung câu hỏi (viết công thức trong $...$)</span><textarea className="lesson-input" rows={4} value={q.text || ""} onChange={(e) => patch(i, { text: e.target.value })} /></label>
          )}
          <KeyEditor q={q} onChange={(change) => patch(i, change as Partial<DraftQuestion>)} />
        </article>
      ))}

      {error && <p className="exam-error" role="alert">{error}</p>}
      <div className="exam-sticky">
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => { pdf.current?.destroy(); pdf.current = null; setDraft(null); setStage("pick"); }} disabled={stage === "saving"}>Chọn file khác</button>
        <button type="button" className="lesson-button lesson-button-success exam-big" disabled={stage === "saving" || draft.questions.length === 0} onClick={() => void create()}>
          {stage === "saving" ? progress || "Đang tạo…" : "Tạo phòng kiểm tra"}
        </button>
      </div>
    </section>
  );
}
