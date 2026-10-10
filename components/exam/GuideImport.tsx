"use client";

import React, { useEffect, useRef, useState } from "react";
import MathText from "../lesson/MathText";
import { parseMarkingGuide } from "../../lib/exam/answer-key.js";
import { messageFor } from "./client";
import { KeyEditor, SolutionEditor, SolutionQuestion, keyReady } from "./KeyEditor";
import { LoadedPdf, Region, loadPdf } from "./pdf-import";

interface ParsedGuide {
  keys: Record<string, unknown>;
  solutions: Record<string, string>;
  rubrics: Record<string, string>;
  problems: string[];
  applied: number;
  spans: Record<string, { startIndex: number; endIndex: number }>;
}

/** Reads and stages the guide; only Apply hands the reviewed fields to the room draft. */
export function GuideImport({ questions, examId, disabled, onApply, onPendingChange }: { questions: SolutionQuestion[]; examId?: string; disabled?: boolean; onApply: (questions: SolutionQuestion[]) => void; onPendingChange?: (pending: boolean) => void }) {
  const [review, setReview] = useState<SolutionQuestion[] | null>(null);
  const [regions, setRegions] = useState<Record<string, Region[]>>({});
  const [pages, setPages] = useState<Array<{ height: number }>>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [imageReaders, setImageReaders] = useState(0);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const pdf = useRef<LoadedPdf | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; pdf.current?.destroy(); }, []);
  useEffect(() => { onPendingChange?.(busy || Boolean(review)); }, [busy, review, onPendingChange]);
  useEffect(() => () => { onPendingChange?.(false); }, [onPendingChange]);
  const imageBusy = (delta: number) => setImageReaders((count) => count + delta);

  const patch = (qid: string, change: Partial<SolutionQuestion>) => setReview((list) => list?.map((q) => q.id === qid ? { ...q, ...change } : q) || null);
  const read = async (file: File) => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File tối đa 10 MB.");
      let text = "";
      const extractionWarnings: string[] = [];
      let loaded: LoadedPdf | null = null;
      if (/\.pdf$/i.test(file.name)) {
        loaded = await loadPdf(file, (done, total) => { if (current === generation.current) setProgress("Đang đọc hướng dẫn chấm: trang " + done + "/" + total); });
        text = loaded.lines.map((line) => line.text).join("\n");
      } else if (/\.docx$/i.test(file.name)) {
        setProgress("Đang đọc hướng dẫn chấm Word…");
        const response = await fetch("/api/exams/extract", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
        if (!response.ok) throw new Error("Không đọc được file Word. Lưu thành PDF rồi chọn lại.");
        const result = await response.json() as { lines: string[]; warnings?: number | string[] };
        if (!Array.isArray(result.lines)) throw new Error("File Word chưa trả về nội dung hợp lệ.");
        text = result.lines.join("\n");
        if (Array.isArray(result.warnings)) extractionWarnings.push(...result.warnings);
        else if (typeof result.warnings === "number" && Number.isFinite(result.warnings) && result.warnings > 0) extractionWarnings.push("File Word có " + result.warnings + " vị trí cần kiểm tra lại công thức hoặc bố cục.");
      } else if (/\.(txt|md)$/i.test(file.name)) text = await file.text();
      else throw new Error("Chỉ nhận hướng dẫn chấm PDF, Word (.docx) hoặc văn bản (.txt).");
      if (current !== generation.current) { loaded?.destroy(); return; }
      const parsed = parseMarkingGuide(text, questions) as ParsedGuide;
      const found: Record<string, Region[]> = {};
      if (loaded) {
        for (const [qid, span] of Object.entries(parsed.spans || {})) {
          const lines = loaded.lines.slice(span.startIndex, span.endIndex);
          const first = lines[0];
          const last = lines[lines.length - 1];
          const next = loaded.lines[span.endIndex];
          if (!first || !last) continue;
          found[qid] = [];
          for (let page = first.page; page <= last.page; page++) {
            const height = loaded.pages[page - 1].height;
            const top = page === first.page ? Math.max(0, first.top - 4) : 20;
            found[qid].push({ page, top, bottom: Math.min(height, next?.page === page ? Math.max(top + 8, next.top - 4) : height - 20) });
          }
        }
      }
      pdf.current?.destroy();
      pdf.current = loaded;
      setPages(loaded?.pages || []);
      setRegions(found);
      setWarnings([...extractionWarnings, ...(parsed.problems || [])]);
      setReview(questions.map((q) => ({ ...q, ...(q.id in parsed.keys ? { key: parsed.keys[q.id] } : {}), ...(q.id in parsed.solutions ? { solution: parsed.solutions[q.id] } : {}), ...(q.id in parsed.rubrics ? { rubric: parsed.rubrics[q.id] } : {}) })));
      setProgress("Đã nhận " + parsed.applied + " đáp án. Kiểm tra từng câu rồi bấm Áp dụng; thay đổi chưa được lưu vào phòng.");
    } catch (e) { if (current === generation.current) setError(e instanceof Error && !/^[A-Z_]+$/.test(e.message) ? e.message : messageFor(e)); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const crop = async (q: SolutionQuestion) => {
    const loaded = pdf.current;
    const strips = regions[q.id];
    if (!loaded || !strips?.length) return;
    setBusy(true);
    setError("");
    try {
      const images: NonNullable<SolutionQuestion["solutionUploads"]> = [];
      for (const region of strips) {
        const page = loaded.pages[region.page - 1];
        if (!page || !Number.isFinite(region.top) || !Number.isFinite(region.bottom) || region.top < 0 || region.bottom > page.height || region.bottom <= region.top) throw new Error("Vùng cắt chưa hợp lệ: chọn trang, mép trên và mép dưới trong trang.");
        const data = await loaded.crop([region]);
        if (!data) throw new Error("Vùng cắt quá lớn hoặc rỗng. Chia thành vùng nhỏ hơn.");
        images.push({ id: crypto.randomUUID(), mime: "image/jpeg", data });
      }
      patch(q.id, { solutionUploads: [...(q.solutionUploads || []), ...images] });
    } catch (e) { setError(e instanceof Error ? e.message : messageFor(e)); }
    finally { setBusy(false); }
  };
  const reset = () => { generation.current++; pdf.current?.destroy(); pdf.current = null; setPages([]); setReview(null); setRegions({}); setWarnings([]); setError(""); setProgress(""); };

  return (
    <fieldset disabled={disabled || busy} style={{ border: 0, padding: 0, margin: "16px 0", minWidth: 0 }} data-guide-import>
      <legend><strong>Tải file hướng dẫn chấm (Word/PDF)</strong></legend>
      <label className="exam-drop"><input type="file" accept=".pdf,.docx,.txt,.md" disabled={imageReaders > 0} aria-label="File hướng dẫn chấm" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void read(file); }} /></label>
      {progress && <p className="exam-note" role="status">{progress}</p>}
      {error && <p className="exam-error" role="alert">{error}</p>}
      {review && <>
        {pages.length > 0 && <p className="exam-warn" role="note"><strong>Chữ trích từ PDF có thể làm vỡ công thức. Cắt ảnh lời giải để giữ đúng công thức và hình vẽ.</strong></p>}
        {warnings.map((warning, i) => <p key={i} className="exam-warn">{warning}</p>)}
        <div style={{ overflowX: "auto" }}>
          <table className="exam-table" data-guide-review>
            <caption>Kiểm tra hướng dẫn chấm trước khi áp dụng</caption>
            <thead><tr><th>Câu</th><th>Đáp án / thang chấm</th><th>Lời giải và ảnh</th><th>Lưu ý</th></tr></thead>
            <tbody>{review.map((q) => <tr key={q.id} data-guide-question={q.id}>
              <th scope="row">{q.section ? "Phần " + q.section + " · " : ""}{q.label}</th>
              <td><KeyEditor q={q} onChange={(change) => patch(q.id, change)} /></td>
              <td><SolutionEditor q={q} examId={examId} onBusyChange={imageBusy} onChange={(change) => patch(q.id, change)} />
                {q.solution && <details><summary>Xem lời giải với công thức</summary><MathText text={q.solution} inline={false} /></details>}
                {pages.length > 0 && <details className="exam-crop-tools"><summary>Cắt ảnh lời giải từ PDF</summary>
                  {(regions[q.id] || []).map((region, i) => <div key={i} className="exam-grid">
                    <label>Trang<input className="lesson-input" type="number" min={1} max={pages.length} value={region.page} aria-label={"Trang lời giải " + q.label + " vùng " + (i + 1)} onChange={(e) => setRegions({ ...regions, [q.id]: regions[q.id].map((r, k) => k === i ? { ...r, page: Number(e.target.value) } : r) })} /></label>
                    <label>Mép trên<input className="lesson-input" type="number" min={0} step={1} value={region.top} aria-label={"Mép trên lời giải " + q.label + " vùng " + (i + 1)} onChange={(e) => setRegions({ ...regions, [q.id]: regions[q.id].map((r, k) => k === i ? { ...r, top: Number(e.target.value) } : r) })} /></label>
                    <label>Mép dưới<input className="lesson-input" type="number" min={0} step={1} value={region.bottom} aria-label={"Mép dưới lời giải " + q.label + " vùng " + (i + 1)} onChange={(e) => setRegions({ ...regions, [q.id]: regions[q.id].map((r, k) => k === i ? { ...r, bottom: Number(e.target.value) } : r) })} /></label>
                    <button type="button" className="lesson-button lesson-button-outline" onClick={() => setRegions({ ...regions, [q.id]: regions[q.id].filter((_, k) => k !== i) })}>Bỏ vùng</button>
                  </div>)}
                  <button type="button" className="lesson-button lesson-button-outline" onClick={() => setRegions({ ...regions, [q.id]: [...(regions[q.id] || []), { page: 1, top: 0, bottom: pages[0].height }] })}>Thêm vùng cắt</button>
                  <button type="button" className="lesson-button lesson-button-primary" disabled={imageReaders > 0 || !regions[q.id]?.length} onClick={() => void crop(q)}>Cắt ảnh lời giải</button>
                  <p className="exam-note">Mỗi vùng tạo một ảnh. Kiểm tra ảnh, điều chỉnh mép rồi cắt lại nếu cần; bỏ ảnh cũ trước khi áp dụng.</p>
                </details>}
              </td>
              <td>{!keyReady(q) && <p className="exam-warn">Chưa có đáp án</p>}{!q.solution && !q.solutionUploads?.length && !q.solutionImages?.length && <p className="exam-note">Chưa có lời giải</p>}{(q.solution?.length || 0) > 6000 && <p className="exam-warn">Lời giải vượt 6000 ký tự, cần rút gọn.</p>}{(q.rubric?.length || 0) > 2000 && <p className="exam-warn">Thang chấm vượt 2000 ký tự, cần rút gọn.</p>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <button type="button" className="lesson-button lesson-button-primary" disabled={imageReaders > 0 || review.some((q) => (q.solution?.length || 0) > 6000 || (q.rubric?.length || 0) > 2000)} onClick={() => { onApply(review); reset(); }}>Áp dụng hướng dẫn chấm</button>
        <button type="button" className="lesson-button lesson-button-outline" disabled={imageReaders > 0} onClick={reset}>Hủy hướng dẫn chấm</button>
      </>}
    </fieldset>
  );
}
