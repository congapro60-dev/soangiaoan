"use client";

import React, { useEffect, useRef, useState } from "react";
import MathText from "../lesson/MathText";
import { detectPdfItemRegions, parseExamLines } from "../../lib/exam/parse.js";
import { parseAnswerKey } from "../../lib/exam/answer-key.js";
import { ExamQuestion, messageFor, teacherPost } from "./client";
import { KeyEditor, QuestionItemsEditor, SolutionEditor, SolutionQuestion, keyReady } from "./KeyEditor";
import { AntiCheatingConfig, AntiCheatingSettings, CodeTabs, ExamCodeDraft } from "./VariantEditor";
import { GuideImport } from "./GuideImport";
import { LoadedPdf, PdfLine, Region, loadPdf } from "./pdf-import";

interface DraftQuestion extends SolutionQuestion {
  regions?: Region[];
  image?: string;
  rawText?: string;
  busy?: boolean;
  shuffleReason?: string;
}

interface Draft extends AntiCheatingConfig {
  title: string;
  durationMin: number;
  showResult: "score" | "none";
  review: "after_close" | "none";
  allowLateJoin: boolean;
  questions: DraftQuestion[];
  warnings: string[];
}

const TYPE_LABEL: Record<ExamQuestion["type"], string> = { mc: "Chọn 1 đáp án", tf: "Đúng/Sai", short: "Trả lời ngắn", essay: "Tự luận" };
const NUDGE = 8;

export function ExamImport({ onCreated, onCancel, onImported, initialFile, code = "101" }: { onCreated: (examId: string) => void; onCancel: () => void; onImported?: (code: ExamCodeDraft) => void; initialFile?: File; code?: string }) {
  const [stage, setStage] = useState<"pick" | "reading" | "review" | "saving">("pick");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [keyText, setKeyText] = useState("");
  const [keyNote, setKeyNote] = useState("");
  const pdf = useRef<LoadedPdf | null>(null);
  const pdfByCode = useRef(new Map<string, LoadedPdf>());
  const [currentCode, setCurrentCode] = useState(code);
  const [codeDrafts, setCodeDrafts] = useState<ExamCodeDraft[]>([]);
  const creation = useRef<{ requestId: string; examId?: string }>({ requestId: "" });
  const [createdId, setCreatedId] = useState("");
  const [guidePending, setGuidePending] = useState(false);
  const [imageReaders, setImageReaders] = useState(0);
  const imageBusy = (delta: number) => setImageReaders((count) => count + delta);
  const reading = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; reading.current?.abort(); for (const doc of pdfByCode.current.values()) doc.destroy(); }, []);

  const readFile = async (file: File, targetCode = currentCode) => {
    reading.current?.abort();
    const controller = new AbortController(); reading.current = controller;
    const current = ++generation.current;
    const live = () => current === generation.current && !controller.signal.aborted;
    const check = () => { if (!live()) throw new DOMException("Đã hủy", "AbortError"); };
    const previousPdf = pdfByCode.current.get(targetCode);
    let candidatePdf: LoadedPdf | null = null;
    setError("");
    setStage("reading");
    try {
      const name = file.name.toLowerCase();
      let lines: Array<{ text: string } & Partial<PdfLine>> = [];
      let pages: Array<{ height: number }> | undefined;
      let docxParsed: { title: string; durationMin: number | null; warnings: string[]; questions: DraftQuestion[] } | undefined;
      let sourceImages: Array<{ qid: string; mime: string; data: string }> = [];
      if (name.endsWith(".pdf") || /\.(png|jpe?g)$/.test(name)) {
        setProgress("Đang đọc file PDF…");
        const loaded = await loadPdf(file, (done, total) => { if (live()) setProgress("Đang đọc trang " + done + "/" + total + "…"); }, { signal: controller.signal, onOcrProgress: text => { if (live()) setProgress(text); } });
        if (!live()) { loaded.destroy(); check(); }
        candidatePdf = loaded;
        lines = loaded.lines;
        pages = loaded.pages;
      } else if (name.endsWith(".docx")) {
        setProgress("Đang đọc file Word…");
        const response = await fetch("/api/exams/extract", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file, signal: controller.signal });
        if (!response.ok) throw new Error("Không đọc được file Word này. Em thử lưu lại thành PDF rồi chọn file PDF.");
        const extracted = await response.json() as { lines: string[]; parsed?: typeof docxParsed; images?: typeof sourceImages; warnings?: string[] };
        lines = extracted.lines.map((text) => ({ text }));
        docxParsed = extracted.parsed;
        sourceImages = extracted.images || [];
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        lines = (await file.text()).split(/\r?\n/).map((text) => ({ text }));
      } else {
        throw new Error("Chỉ nhận file PDF, Word (.docx) hoặc văn bản (.txt).");
      }
      check();
      const parsed = docxParsed || parseExamLines(lines, { pages }) as {
        title: string;
        durationMin: number | null;
        warnings: string[];
        questions: Array<DraftQuestion & { text: string }>;
      };
      const questions: DraftQuestion[] = [];
      for (let i = 0; i < parsed.questions.length; i++) {
        check();
        const q = parsed.questions[i];
        setProgress("Đang cắt hình câu " + (i + 1) + "/" + parsed.questions.length + "…");
        const detected = candidatePdf && !candidatePdf.ocrPages.length ? detectPdfItemRegions(q, candidatePdf.lines, candidatePdf.pages) as { stemRegions: Region[]; itemRegions: Record<string, Region[]>; reason?: string } : null;
        const itemUploads: NonNullable<SolutionQuestion["itemUploads"]> = [];
        if (candidatePdf && detected && Object.keys(detected.itemRegions).length) {
          for (const [letter, regions] of Object.entries(detected.itemRegions)) {
            const data = await candidatePdf.crop(regions);
            if (!data) throw new Error("Ảnh phương án quá lớn. Chọn vùng nhỏ hơn hoặc dùng file Word.");
            itemUploads.push({ id: crypto.randomUUID(), itemKind: q.type === "mc" ? "option" : "statement", letter, mime: "image/jpeg", data });
          }
        }
        const stemRegions = itemUploads.length ? detected!.stemRegions : q.regions;
        const image = candidatePdf && stemRegions?.length ? await candidatePdf.crop(stemRegions) : "";
        if (candidatePdf?.ocrPages.length && !image) throw new Error("Không tạo được ảnh câu scan. Thu nhỏ vùng cắt hoặc giảm kích thước trang; không dùng chữ OCR thay công thức.");
        const drawings = sourceImages.filter((asset) => asset.qid === q.id).map((asset) => ({ id: crypto.randomUUID(), mime: asset.mime, data: asset.data }));
        questions.push({ ...q, id: targetCode + "_q" + (i + 1), key: null, rawText: q.text, text: image ? "" : q.text, image: image || undefined, questionImageId: image ? crypto.randomUUID() : undefined, regions: stemRegions, hasImage: Boolean(image || drawings.length), imageMode: itemUploads.length || drawings.length ? "figure" : image ? "question" : q.imageMode, sourceImages: drawings, itemUploads, shuffleReason: detected?.reason, noShuffle: q.noShuffle === true || Boolean(candidatePdf && !itemUploads.length && (q.type === "mc" || q.type === "tf")), choiceImages: q.type === "mc" && itemUploads.length ? Object.fromEntries(itemUploads.map((item) => [item.letter, item.id])) : q.choiceImages, statementImages: q.type === "tf" && itemUploads.length ? Object.fromEntries(itemUploads.map((item) => [item.letter, item.id])) : q.statementImages });
      }
      check();
      if (candidatePdf) pdfByCode.current.set(targetCode, candidatePdf); else pdfByCode.current.delete(targetCode);
      previousPdf?.destroy();
      pdf.current = candidatePdf;
      if (draft && targetCode !== currentCode) setCodeDrafts((codes) => { const previous = codes.length ? codes.map((entry) => entry.code === currentCode ? { ...entry, questions: draft.questions } : entry) : [{ code: currentCode, questions: draft.questions }]; return [...previous.filter((entry) => entry.code !== targetCode), { code: targetCode, questions }]; });
      else if (!codeDrafts.length) setCodeDrafts([{ code: targetCode, questions }]);
      setCurrentCode(targetCode);
      setDraft({
        title: parsed.title || file.name.replace(/\.[^.]+$/, ""),
        durationMin: parsed.durationMin || 45,
        showResult: "score",
        review: "after_close",
        allowLateJoin: true,
        ...(draft ? { title: draft.title, durationMin: draft.durationMin, showResult: draft.showResult, review: draft.review, allowLateJoin: draft.allowLateJoin, shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions, assignment: draft.assignment, showCode: draft.showCode } : {}),
        questions,
        warnings: [...parsed.warnings, ...(candidatePdf?.ocrPages.length ? ["Đề scan: máy đọc vị trí câu, hãy rà kỹ. Công thức giữ trong ảnh; cần kiểm tra số câu và vùng cắt."] : [])],
      });
      setStage("review");
    } catch (e) {
      candidatePdf?.destroy();
      if (!live()) return;
      setError(e instanceof Error && !/^[A-Z_]+$/.test(e.message) ? e.message : messageFor(e));
      setStage(draft ? "review" : "pick");
    } finally { if (current === generation.current) reading.current = null; }
  };
  useEffect(() => {
    if (!initialFile) return;
    const timer = window.setTimeout(() => void readFile(initialFile, code), 0);
    return () => window.clearTimeout(timer);
    // File/code are the immutable input of this import dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile, code]);

  const patch = (qid: string, change: Partial<DraftQuestion>) => setDraft((d) => (d ? { ...d, questions: d.questions.map((q) => (q.id === qid ? { ...q, ...change } : q)) } : d));

  const changeType = (i: number, type: ExamQuestion["type"]) => {
    const base: Partial<DraftQuestion> = { type, key: null };
    if (type === "mc") base.options = ["A", "B", "C", "D"];
    if (type === "tf") base.statements = ["a", "b", "c", "d"];
    const q = draft?.questions[i];
    if (q) patch(q.id, base);
  };

  const nudge = async (i: number, edge: "top" | "bottom", delta: number) => {
    const q = draft?.questions[i];
    if (!q?.regions?.length || !pdf.current) return;
    const regions = q.regions.map((r) => ({ ...r }));
    if (edge === "top") regions[0].top = Math.max(0, regions[0].top + delta);
    else regions[regions.length - 1].bottom += delta;
    patch(q.id, { busy: true });
    setError("");
    try {
      const image = await pdf.current.crop(regions);
      patch(q.id, { regions, image: image || q.image, ...(image ? { questionImageId: crypto.randomUUID(), removeQuestionImage: Boolean(createdId) } : {}) });
    } catch (e) { setError(messageFor(e)); }
    finally { patch(q.id, { busy: false }); }
  };

  const applyKey = () => {
    if (!draft) return;
    const result = parseAnswerKey(keyText, draft.questions) as { keys: Record<string, unknown>; applied: number; problems: string[] };
    setDraft({ ...draft, questions: draft.questions.map((q) => (q.id in result.keys ? { ...q, key: result.keys[q.id] } : q)) });
    setKeyNote("Đã điền đáp án cho " + result.applied + " câu." + (result.problems.length ? " Lưu ý: " + result.problems.slice(0, 3).join(" ") : ""));
  };

  const create = async () => {
    if (!draft) return;
    const compactCodes = allCodes.map((entry) => ({ ...entry, questions: entry.questions.map((q, i) => ({ ...q, id: entry.code + "_q" + (i + 1) })) }));
    if (onImported) { for (const document of pdfByCode.current.values()) document.destroy(); pdfByCode.current.clear(); pdf.current = null; onImported(compactCodes.find((entry) => entry.code === currentCode)!); return; }
    setCodeDrafts(compactCodes);
    setDraft((current) => current ? { ...current, questions: compactCodes.find((entry) => entry.code === currentCode)!.questions as DraftQuestion[] } : current);
    setStage("saving");
    setError("");
    try {
      if (!creation.current.requestId) creation.current.requestId = "exam" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const codes = compactCodes.map((entry) => ({ code: entry.code, questions: entry.questions.map((q) => ({ section: q.section, label: q.label, type: q.type, points: q.points, options: q.options, statements: q.statements, choiceText: q.choiceText, statementText: q.statementText, noShuffle: q.noShuffle, imageMode: q.imageMode, key: q.key, text: q.image ? "" : q.text || (q as DraftQuestion).rawText || "", rubric: q.rubric, solution: q.solution })) }));
      const exam = { title: draft.title, durationMin: draft.durationMin, settings: { showResult: draft.showResult, review: draft.review, allowLateJoin: draft.allowLateJoin, shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions, assignment: draft.assignment, showCode: draft.showCode, graceSeconds: 30 }, codes };
      let examId = creation.current.examId;
      if (!examId) {
        const made = await teacherPost<{ exam: { id: string } }>({ action: "create", requestId: creation.current.requestId, exam });
        examId = made.exam.id;
        creation.current.examId = examId;
        setCreatedId(examId);
      }
      await teacherPost({ action: "update", id: examId, exam });
      const flatQuestions = compactCodes.flatMap((entry) => entry.questions) as DraftQuestion[];
      const withImage = flatQuestions.filter((q) => q.image);
      for (let n = 0; n < withImage.length; n++) {
        setProgress("Đang gửi hình đề " + (n + 1) + "/" + withImage.length + "…");
        if (withImage[n].removeQuestionImage) await teacherPost({ action: "remove-image", id: examId, qid: withImage[n].id });
        await teacherPost({ action: "image", id: examId, qid: withImage[n].id, assetId: withImage[n].questionImageId, mime: "image/jpeg", data: withImage[n].image });
      }
      for (const question of flatQuestions) {
        for (const image of question.sourceImages || []) await teacherPost({ action: "image", id: examId, qid: question.id, assetId: image.id, mime: image.mime, data: image.data });
        for (const image of question.itemUploads || []) await teacherPost({ action: "item-image", id: examId, qid: question.id, itemKind: image.itemKind, letter: image.letter, assetId: image.id, mime: image.mime, data: image.data });
        for (const image of question.solutionUploads || []) {
          setProgress("Đang gửi ảnh lời giải " + question.label + "…");
          const saved = await teacherPost<{ id: string }>({ action: "solution-image", id: examId, qid: question.id, assetId: image.id, mime: image.mime, data: image.data });
          const update = (q: SolutionQuestion) => q.id === question.id ? { ...q, solutionUploads: q.solutionUploads?.filter((x) => x.id !== image.id), solutionImages: [...(q.solutionImages || []), { id: saved.id, bytes: Math.floor(image.data.length * 3 / 4) }] } : q;
          setDraft((current) => current ? { ...current, questions: current.questions.map(update) } : current);
          setCodeDrafts((codes) => codes.map((entry) => ({ ...entry, questions: entry.questions.map(update) })));
        }
        for (const assetId of question.solutionRemoved || []) {
          await teacherPost({ action: "remove-solution-image", id: examId, assetId });
          const update = (q: SolutionQuestion) => q.id === question.id ? { ...q, solutionImages: q.solutionImages?.filter((x) => x.id !== assetId), solutionRemoved: q.solutionRemoved?.filter((x) => x !== assetId) } : q;
          setDraft((current) => current ? { ...current, questions: current.questions.map(update) } : current);
          setCodeDrafts((codes) => codes.map((entry) => ({ ...entry, questions: entry.questions.map(update) })));
        }
      }
      for (const document of pdfByCode.current.values()) document.destroy();
      pdfByCode.current.clear();
      pdf.current = null;
      onCreated(examId);
    } catch (e) {
      setError((creation.current.examId ? "Phòng đã tạo. Bản nháp được giữ để thử lưu lại. " : "") + messageFor(e));
      setStage("review");
    }
  };

  if (stage === "pick" || stage === "reading") {
    return (
      <section className="exam-card exam-import">
        <h2>Tạo bài kiểm tra từ file đề</h2>
        <p>Chọn file đề (PDF hoặc Word). Hệ thống tự tìm các câu, cắt hình từng câu từ file PDF (giữ nguyên công thức và hình vẽ) và tính điểm theo ghi chú đầu mỗi phần. Em chỉ cần điền đáp án và kiểm tra lại.</p>
        <label className={"exam-drop" + (stage === "reading" ? " is-busy" : "")}>
          <input type="file" accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png" hidden disabled={stage === "reading"} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void readFile(f); }} />
          {stage === "reading" ? progress : "📄 Chọn file đề (PDF / Word)"}
        </label>
        {error && <p className="exam-error" role="alert">{error}</p>}
        <p className="exam-note">File được đọc ngay trên máy của em; chỉ phần hình và chữ của từng câu được lưu vào phòng kiểm tra.</p>
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => { generation.current++; reading.current?.abort(); reading.current = null; setStage(draft ? "review" : "pick"); if (stage !== "reading") onCancel(); }}>{stage === "reading" ? "Hủy đọc đề" : "Quay lại"}</button>
      </section>
    );
  }

  if (!draft) return null;
  const allCodes = (codeDrafts.length ? codeDrafts : [{ code: currentCode, questions: draft.questions }]).map((entry) => entry.code === currentCode ? { ...entry, questions: draft.questions } : entry);
  const staging = guidePending || imageReaders > 0 || draft.questions.some((q) => q.busy);
  const missing = draft.questions.filter((q) => !keyReady(q)).length;
  const total = Math.round(draft.questions.reduce((s, q) => s + q.points, 0) * 100) / 100;
  return (
    <section className="exam-import-review">
      <fieldset disabled={stage === "saving"} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="exam-card">
        <h2>Kiểm tra lại đề</h2>
        {!onImported && <CodeTabs codes={allCodes} selected={currentCode} disabled={staging || stage === "saving" || Boolean(createdId)} onSelect={(selected) => { setCodeDrafts(allCodes); const chosen = allCodes.find((entry) => entry.code === selected); if (chosen) { setCurrentCode(selected); setDraft({ ...draft, questions: chosen.questions as DraftQuestion[] }); pdf.current = pdfByCode.current.get(selected) || null; } }} onDuplicate={(target) => { const cloned = draft.questions.map((q, i) => ({ ...q, id: target + "_q" + (i + 1), questionImageId: q.image ? crypto.randomUUID() : undefined, sourceImages: q.sourceImages?.map((image) => ({ ...image, id: crypto.randomUUID() })), solutionUploads: q.solutionUploads?.map((image) => ({ ...image, id: crypto.randomUUID() })), itemUploads: q.itemUploads?.map((image) => ({ ...image, id: crypto.randomUUID() })), solutionImages: undefined, solutionRemoved: undefined })); setCodeDrafts([...allCodes, { code: target, questions: cloned }]); setCurrentCode(target); setDraft({ ...draft, questions: cloned }); pdf.current = null; }} onImport={(target, file) => void readFile(file, target)} />}
        {!onImported && <AntiCheatingSettings settings={draft} count={allCodes.length} onChange={(settings) => setDraft({ ...draft, ...settings })} />}
        <div className="exam-grid">
          <label><span>Tên bài kiểm tra</span><input className="lesson-input" value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label><span>Thời gian (phút)</span><input className="lesson-input" type="number" min={5} max={300} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })} /></label>
          <label><span>Sau khi nộp, học sinh thấy</span><select className="lesson-input" value={draft.showResult} onChange={(e) => setDraft({ ...draft, showResult: e.target.value as Draft["showResult"] })}><option value="score">Điểm số</option><option value="none">Chỉ thấy &quot;đã nộp&quot;</option></select></label>
          <label><span>Lời giải cho học sinh</span><select className="lesson-input" value={draft.review} aria-label="Lời giải cho học sinh" onChange={(e) => setDraft({ ...draft, review: e.target.value as Draft["review"] })}><option value="after_close">Mở khi phòng kết thúc</option><option value="none">Không mở</option></select></label>
          <label className="exam-check"><input type="checkbox" checked={draft.allowLateJoin} onChange={(e) => setDraft({ ...draft, allowLateJoin: e.target.checked })} /> <span>Cho học sinh vào muộn khi đã bắt đầu</span></label>
        </div>
        {draft.warnings.map((w) => <p key={w} className="exam-warn">⚠ {w}</p>)}
        <p className="exam-summary"><strong>{draft.questions.length} câu</strong> · tổng <strong>{total.toLocaleString("vi-VN")} điểm</strong> · {missing ? <span className="exam-warn-text">còn {missing} câu chưa có đáp án</span> : <span className="exam-ok-text">đã có đủ đáp án</span>}</p>
        <details className="exam-keybox" open={missing > 0}>
          <summary>Dán đáp án cho nhanh</summary>
          <p className="exam-note">Dán đáp án theo từng phần, ví dụ: <code>PHẦN I: 1.C 2.B 3.B …</code>, <code>PHẦN II: Câu 1: Đ Đ Đ S</code>, <code>PHẦN III: Câu 1: 1,5</code>.</p>
          <textarea className="lesson-input" rows={5} disabled={guidePending} value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder={"PHẦN I\n1.C 2.B 3.B 4.B 5.A 6.B 7.B 8.C 9.B 10.A 11.A 12.A\nPHẦN II\nCâu 1: Đ Đ Đ S\nCâu 2: Đ Đ Đ S"} />
          <button type="button" className="lesson-button lesson-button-primary" onClick={applyKey} disabled={guidePending || !keyText.trim()}>Điền đáp án</button>
          {keyNote && <p className="exam-note">{keyNote}</p>}
        </details>
        <GuideImport questions={draft.questions} examId={createdId || undefined} disabled={stage === "saving" || imageReaders > 0 || draft.questions.some((q) => q.busy)} onPendingChange={setGuidePending} onApply={(reviewed) => setDraft((current) => current ? { ...current, questions: current.questions.map((q) => { const guide = reviewed.find((x) => x.id === q.id); return guide ? { ...q, key: guide.key, rubric: guide.rubric, solution: guide.solution, solutionUploads: guide.solutionUploads, solutionRemoved: guide.solutionRemoved } : q; }) } : current)} />
      </div>

      {draft.questions.map((q, i) => (
        <article key={q.id} className={"exam-card exam-qcard" + (keyReady(q) ? "" : " is-missing")}>
          <fieldset disabled={guidePending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div className="exam-qcard-head">
            <strong>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</strong>
            <select className="lesson-input" value={q.type} disabled={Boolean(createdId)} onChange={(e) => changeType(i, e.target.value as ExamQuestion["type"])} aria-label="Loại câu">
              {(Object.keys(TYPE_LABEL) as Array<ExamQuestion["type"]>).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <label className="exam-points-edit"><input className="lesson-input" type="number" min={0} max={20} step={0.05} value={q.points} onChange={(e) => patch(q.id, { points: Number(e.target.value) })} /> điểm</label>
            <button type="button" className="lesson-button lesson-button-outline" disabled={Boolean(createdId) || guidePending || imageReaders > 0 || draft.questions.some((question) => question.busy)} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, k) => k !== i) })} title="Bỏ câu này (nhận nhầm)">Bỏ</button>
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
            <label className="exam-rawtext"><span>Nội dung câu hỏi (viết công thức trong $...$)</span><textarea className="lesson-input" rows={4} value={q.text || ""} onChange={(e) => patch(q.id, { text: e.target.value })} /><MathText text={q.text || ""} inline={false} /></label>
          )}
          <KeyEditor q={q} onChange={(change) => patch(q.id, change as Partial<DraftQuestion>)} />
          <QuestionItemsEditor q={q} onChange={(change) => patch(q.id, change)} />
          {q.shuffleReason && <p className="exam-warn">Không đảo được từ PDF: {q.shuffleReason}</p>}
          {q.itemUploads?.map((image) => <figure key={image.id}><figcaption>{image.letter}{image.itemKind === "option" ? "." : ")"}</figcaption><img className="exam-teacher-img" src={"data:" + image.mime + ";base64," + image.data} alt={"Phương án " + image.letter + " " + q.label} /></figure>)}
          {q.sourceImages?.map((image) => <img key={image.id} className="exam-teacher-img" src={"data:" + image.mime + ";base64," + image.data} alt={"Hình trong " + q.label} />)}
          <SolutionEditor q={q} examId={createdId || undefined} onBusyChange={imageBusy} onChange={(change) => patch(q.id, change)} />
          </fieldset>
        </article>
      ))}
      </fieldset>

      {error && <p className="exam-error" role="alert">{error}</p>}
      <div className="exam-sticky">
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => { for (const document of pdfByCode.current.values()) document.destroy(); pdfByCode.current.clear(); pdf.current = null; creation.current = { requestId: "" }; setCodeDrafts([]); setCreatedId(""); setDraft(null); setStage("pick"); }} disabled={stage === "saving" || imageReaders > 0 || draft.questions.some((q) => q.busy)}>Chọn file khác</button>
        <button type="button" className="lesson-button lesson-button-success exam-big" disabled={stage === "saving" || guidePending || imageReaders > 0 || draft.questions.some((q) => q.busy) || draft.questions.length === 0} onClick={() => void create()}>
          {stage === "saving" ? progress || "Đang tạo…" : onImported ? "Áp dụng mã đề mới" : createdId ? "Lưu lại phòng kiểm tra" : "Tạo phòng kiểm tra"}
        </button>
        {guidePending && <p className="exam-note">Áp dụng hoặc hủy hướng dẫn chấm trước khi tạo phòng.</p>}
      </div>
    </section>
  );
}
