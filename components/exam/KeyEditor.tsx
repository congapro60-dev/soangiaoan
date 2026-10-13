"use client";

import React, { useEffect, useState } from "react";
import MathText from "../lesson/MathText";
import { ExamQuestion, teacherImageUrl } from "./client";

export interface SolutionQuestion extends ExamQuestion {
  sourceImages?: Array<{ id: string; mime: string; data: string }>;
  itemUploads?: Array<{ id: string; itemKind: "option" | "statement"; letter: string; mime: string; data: string }>;
  removeQuestionImage?: boolean;
  questionImageId?: string;
  image?: string;
  solutionUploads?: Array<{ id: string; mime: string; data: string }>;
  solutionRemoved?: string[];
}

export function QuestionItemsEditor({ q, onChange, examId, onRemoveImage, locked }: { q: SolutionQuestion; onChange: (patch: Partial<SolutionQuestion>) => void; examId?: string; locked?: boolean; onRemoveImage?: (itemKind: "option" | "statement", letter: string, assetId: string) => void }) {
  const [removedItem, setRemovedItem] = useState<NonNullable<SolutionQuestion["itemUploads"]>[number] | null>(null);
  if (q.type !== "mc" && q.type !== "tf") return null;
  const labels = q.type === "mc" ? q.options || ["A", "B", "C", "D"] : q.statements || ["a", "b", "c", "d"];
  const field = q.type === "mc" ? "choiceText" : "statementText";
  const values = q[field] || {};
  const wholeImage = q.hasImage && q.imageMode !== "figure" && !Object.keys(q.choiceImages || q.statementImages || {}).length;
  const missing = wholeImage || labels.some((label) => !values[label]?.trim() && !(q.type === "mc" ? q.choiceImages : q.statementImages)?.[label]);
  const kind = q.type === "mc" ? "option" : "statement";
  const images = q.type === "mc" ? q.choiceImages : q.statementImages;
  return <details className="exam-keybox"><summary>Phương án / ý đúng-sai tách riêng</summary><p className="exam-note">Công thức trong $...$. Phương án tham chiếu “Cả A và B”, ý tham chiếu “ý a”, “câu trên” nên giữ nguyên thứ tự.</p>{labels.map((label) => <div key={label}><label><span>{label}{q.type === "mc" ? "." : ")"}</span><textarea className="lesson-input" rows={2} maxLength={2000} value={values[label] || ""} aria-label={(q.type === "mc" ? "Phương án " : "Ý ") + label + " " + q.label} onChange={(e) => onChange({ [field]: { ...values, [label]: e.target.value } })} /><MathText text={values[label] || ""} inline={false} /></label>
    {examId && images?.[label] && <><SolutionImage examId={examId} assetId={images[label]} alt={q.label + " · " + label} />{onRemoveImage && <button type="button" className="lesson-button lesson-button-outline" onClick={() => onRemoveImage(kind, label, images[label])}>Xóa ảnh {label}</button>}</>}
    {q.itemUploads?.filter((image) => image.itemKind === kind && image.letter === label).map((image) => <div key={image.id}><img className="exam-teacher-img" src={"data:" + image.mime + ";base64," + image.data} alt={q.label + " · " + label} /><button type="button" className="lesson-button lesson-button-outline" disabled={locked} onClick={() => { setRemovedItem(image); onChange({ itemUploads: q.itemUploads?.filter((entry) => entry.id !== image.id), [q.type === "mc" ? "choiceImages" : "statementImages"]: Object.fromEntries(Object.entries(images || {}).filter(([letter]) => letter !== label)) }); }}>Bỏ ảnh mới {label}</button></div>)}
  </div>)}{removedItem && <button type="button" className="lesson-button lesson-button-outline" disabled={locked || q.itemUploads?.some((image) => image.itemKind === removedItem.itemKind && image.letter === removedItem.letter)} onClick={() => { onChange({ itemUploads: [...(q.itemUploads || []), removedItem], [q.type === "mc" ? "choiceImages" : "statementImages"]: { ...images, [removedItem.letter]: removedItem.id } }); setRemovedItem(null); }}>Hoàn tác bỏ ảnh mới</button>}<label className="exam-check"><input type="checkbox" checked={q.noShuffle === true} onChange={(e) => onChange({ noShuffle: e.target.checked })} /><span>Không đảo phương án/ý</span></label>{missing && <p className="exam-warn">Không đảo được: phương án/ý chưa tách đủ hoặc còn nằm trong ảnh cả câu.</p>}</details>;
}

export function SolutionImage({ examId, assetId, alt }: { examId: string; assetId: string; alt: string }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let url = "";
    teacherImageUrl("id=" + examId + "&asset=" + assetId).then((made) => {
      url = made;
      if (alive) setSrc(made);
      else URL.revokeObjectURL(made);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [examId, assetId]);
  return src ? <img className="exam-teacher-img" src={src} alt={alt} /> : <p className="exam-note">{failed ? "Không tải được ảnh lời giải." : "Đang tải ảnh lời giải…"}</p>;
}

/** Stages image changes locally; the room's explicit Save sends them. */
export function SolutionEditor({ q, examId, onChange, onBusyChange }: { q: SolutionQuestion; examId?: string; onChange: (patch: Partial<SolutionQuestion>) => void; onBusyChange?: (delta: number) => void }) {
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [removedImage, setRemovedImage] = useState<NonNullable<SolutionQuestion["solutionUploads"]>[number] | null>(null);
  const addImages = async (files: File[]) => {
    setError("");
    setReading(true);
    onBusyChange?.(1);
    try {
      const images: NonNullable<SolutionQuestion["solutionUploads"]> = [];
      for (const file of files) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 525_000) throw new Error("Chỉ nhận ảnh JPG, PNG, WebP tối đa 525 KB. Có thể cắt vùng nhỏ hơn từ PDF.");
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = () => reject(new Error("Không đọc được ảnh. Chọn lại file."));
          reader.readAsDataURL(file);
        });
        images.push({ id: crypto.randomUUID(), mime: file.type, data });
      }
      onChange({ solutionUploads: [...(q.solutionUploads || []), ...images] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được ảnh.");
    } finally { setReading(false); onBusyChange?.(-1); }
  };
  return (
    <div className="exam-solution-editor" data-solution-editor={q.id}>
      <label><span>Lời giải (công thức trong $...$)</span><textarea className="lesson-input" rows={4} maxLength={6000} value={q.solution || ""} onChange={(e) => onChange({ solution: e.target.value })} aria-label={"Lời giải " + q.label} /></label>
      <div className="exam-shots">
        {examId && q.solutionImages?.filter((asset) => !q.solutionRemoved?.includes(asset.id)).map((asset) => <div key={asset.id}><SolutionImage examId={examId} assetId={asset.id} alt={"Lời giải " + q.label} /><button type="button" className="lesson-button lesson-button-outline" disabled={reading} onClick={() => onChange({ solutionRemoved: [...(q.solutionRemoved || []), asset.id] })}>Bỏ ảnh lời giải</button></div>)}
        {q.solutionUploads?.map((asset) => <div key={asset.id}><img className="exam-teacher-img" src={"data:" + asset.mime + ";base64," + asset.data} alt={"Ảnh lời giải mới " + q.label} /><button type="button" className="lesson-button lesson-button-outline" disabled={reading} onClick={() => { setRemovedImage(asset); onChange({ solutionUploads: q.solutionUploads?.filter((x) => x.id !== asset.id), ...(examId ? { solutionRemoved: [...(q.solutionRemoved || []), asset.id] } : {}) }); }}>Bỏ ảnh mới</button></div>)}
      </div>
      {q.solutionRemoved?.length ? <button type="button" className="lesson-button lesson-button-outline" disabled={reading} onClick={() => onChange({ solutionRemoved: q.solutionRemoved?.slice(0, -1) })}>Hoàn tác bỏ ảnh lời giải đã lưu (chưa bấm Lưu)</button> : null}
      {removedImage && <button type="button" className="lesson-button lesson-button-outline" disabled={reading} onClick={() => { onChange({ solutionUploads: [...(q.solutionUploads || []), removedImage], solutionRemoved: q.solutionRemoved?.filter((id) => id !== removedImage.id) }); setRemovedImage(null); }}>Hoàn tác bỏ ảnh lời giải mới</button>}
      <label className="exam-note">Thêm ảnh lời giải <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={reading} aria-label={"Thêm ảnh lời giải " + q.label} onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; if (files.length) void addImages(files); }} /></label>
      {reading && <p className="exam-note">Đang đọc ảnh…</p>}
      {error && <p className="exam-error" role="alert">{error}</p>}
    </div>
  );
}

/** Where the teacher sets the answer key of one question (the key is shown as a short, editable form). */
export function KeyEditor({ q, onChange }: { q: ExamQuestion; onChange: (patch: Partial<ExamQuestion>) => void }) {
  const [removedKey, setRemovedKey] = useState<{ value: unknown } | null>(null);
  if (q.type === "mc") {
    const key = typeof q.key === "string" ? q.key : "";
    return (
      <div className="exam-key" role="radiogroup" aria-label="Đáp án đúng">
        <span className="exam-key-label">Đáp án</span>
        {(q.options || ["A", "B", "C", "D"]).map((letter) => (
          <button key={letter} type="button" role="radio" aria-checked={key === letter} className={"exam-key-btn" + (key === letter ? " is-on" : "")} onClick={() => onChange({ key: key === letter ? null : letter })}>
            {letter}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "tf") {
    const statements = q.statements || ["a", "b", "c", "d"];
    const key = Array.isArray(q.key) ? (q.key as Array<boolean | null>) : [];
    const set = (i: number, value: boolean) => {
      const next = statements.map((_, k) => (k === i ? value : key[k] ?? null));
      onChange({ key: next.every((v) => v === true || v === false) ? next : (next as unknown) });
    };
    return (
      <div className="exam-key">
        <span className="exam-key-label">Đáp án</span>
        {statements.map((letter, i) => (
          <span key={letter} className="exam-key-tf">
            <b>{letter})</b>
            <button type="button" aria-pressed={key[i] === true} className={"exam-key-btn" + (key[i] === true ? " is-on" : "")} onClick={() => set(i, true)}>Đ</button>
            <button type="button" aria-pressed={key[i] === false} className={"exam-key-btn" + (key[i] === false ? " is-off" : "")} onClick={() => set(i, false)}>S</button>
          </span>
        ))}
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => { setRemovedKey({ value: q.key }); onChange({ key: null }); }}>Xóa đáp án đúng/sai</button>{removedKey && <button type="button" className="lesson-button lesson-button-outline" onClick={() => { onChange({ key: removedKey.value }); setRemovedKey(null); }}>Hoàn tác xóa đáp án</button>}
      </div>
    );
  }
  if (q.type === "short") {
    const accept = (q.key as { accept?: string[] } | null)?.accept || [];
    return (
      <label className="exam-key">
        <span className="exam-key-label">Đáp số</span>
        <input key={accept.join(" | ")} className="lesson-input" defaultValue={accept.join(" | ")} aria-label={"Đáp số " + q.label} onBlur={(e) => { const list = e.target.value.split(/\s*[|;]\s*/).map((s) => s.trim()).filter(Boolean); onChange({ key: list.length ? { accept: list } : null }); }} placeholder="Ví dụ: 1,5 | 3/2 (nhiều cách viết, cách nhau bằng dấu |)" />
      </label>
    );
  }
  return (
    <label className="exam-key">
      <span className="exam-key-label">Thang chấm</span>
      <textarea className="lesson-input" rows={4} maxLength={2000} value={q.rubric || ""} aria-label={"Thang chấm " + q.label} onChange={(e) => onChange({ rubric: e.target.value })} placeholder="Ghi chú cách chấm (không bắt buộc). Tự luận do thầy/cô chấm sau khi nộp." />
    </label>
  );
}

export const keyReady = (q: ExamQuestion): boolean => {
  if (q.type === "essay") return true;
  if (q.type === "mc") return typeof q.key === "string" && q.key !== "";
  if (q.type === "tf") return Array.isArray(q.key) && q.key.length > 0 && q.key.every((v) => v === true || v === false);
  return Boolean((q.key as { accept?: string[] } | null)?.accept?.length);
};
