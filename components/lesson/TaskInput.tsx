"use client";

import React, { useEffect, useState, useRef } from "react";
import MathText from "./MathText";
import MathSymbolSheet from "./MathSymbolSheet";
import { QUICK_CHIPS, expandChipInsert, type MathChip } from "../../lib/lesson/math-symbols";

export interface TaskInputProps {
  task: {
    id: string;
    type?: string;
    prompt?: string;
    branch?: string;
    participation?: string;
    inputSchema?: {
      type?: string;
      options?: Array<{ id: string; label: string }>;
      representations?: Array<{ id: string; label: string }>;
      cards?: Array<{ id: string; label: string }>;
      items?: Array<{ id: string; label: string }>;
      categories?: Array<{ id: string; label: string }>;
      statements?: Array<{ id: string; label: string }>;
      cells?: Array<{ id: string; label: string }>;
      format?: "digits" | "signed_digits" | "alphanumeric" | "decimal_4";
    };
    evaluation?: {
      checkerId?: string;
      options?: string[];
      answerKey?: unknown;
      rubric?: {
        criteria?: string[];
      };
    };
    advertisedHints?: Array<{ id: string; tier: string; opened: boolean; text?: string }>;
    openedHints?: Array<{ id: string; tier: string; text: string }>;
    [key: string]: unknown;
  };
  disabled?: boolean;
  initialDraft?: unknown;
  submission?: {
    submissionId?: string;
    answer?: unknown;
    ok?: boolean;
    assessmentStatus?: string;
    assisted?: boolean;
    at?: number;
    ratio?: number;
    perItem?: boolean[];
    aiComment?: { feedback?: string; model?: string; at?: number } | null;
  } | null;
  onSaveDraft?: (answer: unknown) => unknown;
  onSubmit?: (answer: unknown) => Promise<void> | void;
  onOpenHint?: (hintId: string) => Promise<void> | void;
  isGroupMode?: boolean;
  onGroupContribute?: (text: string) => Promise<void> | void;
  onGroupSubmit?: (answer: unknown) => Promise<void> | void;
  groupProduct?: {
    answer: unknown;
    ok: boolean | null;
    assessmentStatus?: string;
    feedback?: string;
    submittedBy: string;
    at: number;
  } | null;
  groupContributions?: Array<{
    learnerId: string;
    taskId: string;
    text: string;
    at: number;
  }>;
  currentLearnerId?: string;
}

async function shrinkDrawingPhoto(file: File): Promise<string> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return "";
  }
  try {
    const bitmap = await createImageBitmap(file);
    // Ladder targets ≤150KB data URLs: a lesson event may carry ≤256KB and whole-room
    // state must hold photo submissions for every learner in class.
    let lastData = "";
    for (const [side, quality] of [[1200, 0.75], [1000, 0.65], [900, 0.55], [800, 0.45]] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const g = canvas.getContext("2d");
      if (!g) break;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", quality);
      lastData = data;
      if (data.length <= 150_000) {
        bitmap.close?.();
        return data;
      }
    }
    bitmap.close?.();
    return lastData;
  } catch {
    // fallback
  }
  return "";
}

const DRAFT_ERROR_MESSAGES: Record<string, string> = {
  BODY_TOO_LARGE: "Ảnh bài làm vẫn quá lớn sau khi nén. Xóa ảnh, chụp gọn hơn rồi thử lại.",
  STATE_TOO_LARGE: "Lớp đã đầy dữ liệu bài làm. Em báo thầy cô xử lý nhé.",
  INVALID_ANSWER: "Bài làm chưa đúng định dạng. Em kiểm tra lại rồi lưu nhé.",
};

export function TaskInput({
  task,
  disabled = false,
  initialDraft,
  submission,
  onSaveDraft,
  onSubmit,
  onOpenHint,
  isGroupMode = false,
  onGroupContribute,
  onGroupSubmit,
  groupProduct,
  groupContributions = [],
  currentLearnerId,
}: TaskInputProps) {
  const inputId = React.useId();
  const schema = task.inputSchema || {};
  const evalData = task.evaluation || {};
  const checkerId = evalData.checkerId || "";
  const taskType = task.type || "closed";

  const cellInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [desmosMode, setDesmosMode] = useState<"none" | "geometry" | "calculator">("none");
  const [drawingPhoto, setDrawingPhoto] = useState<string>(() => {
    if (initialDraft && typeof initialDraft === "object" && "drawingPhoto" in initialDraft) {
      return String((initialDraft as { drawingPhoto?: string }).drawingPhoto || "");
    }
    if (submission?.answer && typeof submission.answer === "object" && "drawingPhoto" in submission.answer) {
      return String((submission.answer as { drawingPhoto?: string }).drawingPhoto || "");
    }
    return "";
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Determine input flavor
  const isOrdering = checkerId === "ordering_exact";
  const isClassification = checkerId === "classification_exact";
  const isTrueFalse4 = checkerId === "true_false_4" || schema.type === "true_false_4";
  const isShortAnswer4 = checkerId === "short_answer_4" || schema.type === "short_answer_4";
  const isRepresentationMatch =
    checkerId === "representation_match" ||
    (Array.isArray(schema.representations) && Array.isArray(schema.cards));

  const isMultiChoice =
    checkerId === "multi_choice_exact" ||
    (schema.type === "multi_choice" && Array.isArray(schema.options));

  const isSingleChoice =
    !isOrdering &&
    !isClassification &&
    !isTrueFalse4 &&
    !isShortAnswer4 &&
    !isRepresentationMatch &&
    !isMultiChoice &&
    (checkerId === "choice_exact" || Array.isArray(schema.options));

  const isNumeric =
    !isRepresentationMatch &&
    !isMultiChoice &&
    !isSingleChoice &&
    !isTrueFalse4 &&
    !isShortAnswer4 &&
    (checkerId === "numeric_exact" || schema.type === "numeric");

  // Initial answer calculation
  const privateThought = isGroupMode && initialDraft && typeof initialDraft === "object" && !Array.isArray(initialDraft) && typeof (initialDraft as {thought?:unknown}).thought === "string";
  const getInitialAnswer = () => {
    if (submission?.answer !== undefined && submission?.answer !== null) {
      return submission.answer;
    }
    if (initialDraft !== undefined && initialDraft !== null && !privateThought) {
      return isGroupMode && (isRepresentationMatch || isClassification) && typeof initialDraft !== "object" ? {} : initialDraft;
    }
    if (isMultiChoice) return [];
    if (isOrdering) return (schema.items || []).map(item => item.id);
    if (isRepresentationMatch || isClassification) return {};
    if (isTrueFalse4) return [null, null, null, null];
    if (isShortAnswer4) return ["", "", "", ""];
    return "";
  };

  const [value, setValue] = useState<unknown>(getInitialAnswer);
  const [isDirty, setIsDirty] = useState(false);
  const [draftError, setDraftError] = useState("");
  const draftSaveSeqRef = useRef(0);
  const incomingRef = useRef<{
    taskId: string;
    submissionId?: string;
    subAnswer: unknown;
    draft: unknown;
  }>({
    taskId: task.id,
    submissionId: submission?.submissionId,
    subAnswer: submission?.answer,
    draft: initialDraft,
  });

  // Keep track of dirty state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false);

  // Adopt canonical data only for a new task or while the local editor is clean.
  useEffect(() => {
    const previous = incomingRef.current;
    const taskChanged = previous.taskId !== task.id;
    const incomingChanged =
      previous.submissionId !== submission?.submissionId ||
      previous.subAnswer !== submission?.answer ||
      previous.draft !== initialDraft;

    incomingRef.current = {
      taskId: task.id,
      submissionId: submission?.submissionId,
      subAnswer: submission?.answer,
      draft: initialDraft,
    };

    if (!taskChanged && (!incomingChanged || isDirty)) return;

    const timer = window.setTimeout(() => {
      if (isComposingRef.current) return;
      if (submission?.answer !== undefined && submission.answer !== null) {
        setValue(submission.answer);
      } else if (initialDraft !== undefined && initialDraft !== null && !privateThought) {
        setValue(isGroupMode && (isRepresentationMatch || isClassification) && typeof initialDraft !== "object" ? {} : initialDraft);
      } else if (isMultiChoice) {
        setValue([]);
      } else if (isOrdering) {
        setValue((schema.items || []).map(item => item.id));
      } else if (isRepresentationMatch || isClassification) {
        setValue({});
      } else if (isTrueFalse4) {
        setValue([null, null, null, null]);
      } else if (isShortAnswer4) {
        setValue(["", "", "", ""]);
      } else {
        setValue("");
      }
      if (taskChanged) {
        setIsDirty(false);
        setDraftError("");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    initialDraft,
    privateThought,
    isDirty,
    isMultiChoice,
    isGroupMode,
    isOrdering,
    isClassification,
    isRepresentationMatch,
    isTrueFalse4,
    isShortAnswer4,
    schema.items,
    submission?.answer,
    submission?.submissionId,
    task.id,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Debounced auto draft save
  const triggerDraftSave = (nextVal: unknown) => {
    setIsDirty(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        if (isComposingRef.current) return;
        const seq = ++draftSaveSeqRef.current;
        try {
          const res = await onSaveDraft?.(nextVal);
          if (seq !== draftSaveSeqRef.current) return; // a newer save superseded this response
          const okFlag = (res as { ok?: boolean } | null | undefined)?.ok;
          if (okFlag === false) {
            setDraftError(String((res as { code?: unknown; error?: unknown }).code || (res as { error?: unknown }).error || "SAVE_FAILED"));
            return;
          }
          setDraftError("");
          setIsDirty(false);
        } catch {
          if (seq === draftSaveSeqRef.current) setDraftError("SAVE_FAILED");
        }
      })();
    }, 800);
  };

  const handleValueChange = (newVal: unknown) => {
    setValue(newVal);
    triggerDraftSave(newVal);
  };

  // V28 Phase B: bảng ký hiệu Toán cho textarea tự luận / cộng tác
  const [symbolSheetOpen, setSymbolSheetOpen] = useState(false);
  const openTextRef = useRef<HTMLTextAreaElement | null>(null);
  const contribTextRef = useRef<HTMLTextAreaElement | null>(null);
  const openSelRef = useRef({ start: 0, end: 0 });
  const contribSelRef = useRef({ start: 0, end: 0 });
  const lastMathTargetRef = useRef<"open" | "contrib">("open");

  const trackMathSelection = (target: "open" | "contrib") => {
    const el = target === "open" ? openTextRef.current : contribTextRef.current;
    if (!el) return;
    const sel = target === "open" ? openSelRef : contribSelRef;
    sel.current = { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
  };

  const applyMathChip = (target: "open" | "contrib", chip: MathChip) => {
    const el = target === "open" ? openTextRef.current : contribTextRef.current;
    if (!el || disabled) return;
    lastMathTargetRef.current = target;
    const sel = target === "open" ? openSelRef.current : contribSelRef.current;
    const start = Math.min(sel.start, el.value.length);
    const end = Math.min(sel.end, el.value.length);
    const { text, caretOffset } = expandChipInsert(chip.insert);
    const nextText = el.value.slice(0, start) + text + el.value.slice(end);
    const caret = Math.min(start + caretOffset, nextText.length);
    if (target === "open") {
      handleValueChange(drawingPhoto ? { text: nextText, drawingPhoto } : nextText);
    } else {
      thoughtEditorRef.current.dirty = true;
      setContributionText(nextText);
    }
    requestAnimationFrame(() => {
      const elNext = target === "open" ? openTextRef.current : contribTextRef.current;
      if (!elNext) return;
      elNext.focus();
      try { elNext.setSelectionRange(caret, caret); } catch { /* ignore */ }
      trackMathSelection(target);
    });
  };

  const closeSymbolSheet = () => {
    setSymbolSheetOpen(false);
    requestAnimationFrame(() => {
      const el = lastMathTargetRef.current === "contrib" ? contribTextRef.current : openTextRef.current;
      el?.focus();
    });
  };

  const renderMathToolbar = (target: "open" | "contrib") => (
    <div className="task-math-toolbar" role="toolbar" aria-label="Chèn ký hiệu Toán">
      {QUICK_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="task-math-chip"
          title={chip.name}
          aria-label={`Chèn ${chip.name}`}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyMathChip(target, chip)}
        >
          <MathText text={`$${chip.label}$`} />
        </button>
      ))}
      <button
        type="button"
        className="task-math-sheet-btn"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          lastMathTargetRef.current = target;
          setSymbolSheetOpen(true);
        }}
      >
        <span aria-hidden="true">√x</span> Bảng ký hiệu
      </button>
    </div>
  );

  const symbolSheet = (
    <MathSymbolSheet
      open={symbolSheetOpen}
      onClose={closeSymbolSheet}
      onInsert={(chip) => applyMathChip(lastMathTargetRef.current, chip)}
    />
  );

  // Group discussion state
  const [groupTab, setGroupTab] = useState<"contribute" | "submit">("contribute");
  const [contributionText, setContributionText] = useState(privateThought ? (initialDraft as {thought:string}).thought : "");
  const thoughtEditorRef = useRef({taskId:task.id,dirty:false});
  useEffect(()=>{
    const changed=thoughtEditorRef.current.taskId!==task.id;
    if(!changed&&thoughtEditorRef.current.dirty)return;
    thoughtEditorRef.current={taskId:task.id,dirty:false};
    const timer=window.setTimeout(()=>setContributionText(privateThought?(initialDraft as {thought:string}).thought:""),0);
    return()=>window.clearTimeout(timer);
  },[task.id,initialDraft,privateThought]);
  const [groupError,setGroupError]=useState("");
  const [isSendingContrib, setIsSendingContrib] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isOpeningHint, setIsOpeningHint] = useState(false);

  const handleSendContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionText.trim() || isSendingContrib || disabled) return;
    setIsSendingContrib(true);setGroupError("");
    try {
      await onGroupContribute?.(contributionText.trim());
      setContributionText("");
    } catch { setGroupError("Chưa gửi được ý kiến. Nội dung vẫn giữ; kiểm tra mạng rồi thử lại."); } finally {
      setIsSendingContrib(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isSubmittingAnswer || isComposingRef.current) return;
    setIsSubmittingAnswer(true);
    try {
      if (isGroupMode) {
        await onGroupSubmit?.(value);
      } else {
        await onSubmit?.(value);
      }
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleHintClick = async (hintId: string) => {
    if (disabled || isOpeningHint) return;
    setIsOpeningHint(true);
    try {
      await onOpenHint?.(hintId);
    } finally {
      setIsOpeningHint(false);
    }
  };

  // Check if answer is provided and valid
  const hasAnswer = () => {
    if (isOrdering) {
      const items = schema.items || [];
      return items.length > 0 && Array.isArray(value) && value.length === items.length &&
        new Set(value).size === items.length && value.every(id => items.some(item => item.id === id));
    }
    if (isClassification) {
      const items = schema.items || [], categories = schema.categories || [];
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const mapping = value as Record<string, string>;
      return items.length > 0 && Object.keys(mapping).length === items.length && items.every(item =>
        categories.some(category => category.id === mapping[item.id]));
    }
    if (isRepresentationMatch) {
      if (!value || typeof value !== "object") return false;
      const reps = schema.representations || [];
      const valMap = value as Record<string, string>;
      return reps.length > 0 && reps.every((r) => Boolean(valMap[r.id]));
    }
    if (isTrueFalse4) {
      return Array.isArray(value) && value.length === 4 && value.every(answer => typeof answer === "boolean");
    }
    if (isShortAnswer4) {
      return Array.isArray(value) && value.length === 4 && value.every(answer => typeof answer === "string" && Array.from(answer.trim()).length === 1);
    }
    if (isMultiChoice) {
      return Array.isArray(value) && value.length > 0;
    }
    if (typeof value === "object" && value !== null && ("text" in value || "drawingPhoto" in value)) {
      const textVal = (value as { text?: unknown }).text;
      const photoVal = (value as { drawingPhoto?: unknown }).drawingPhoto;
      return (typeof textVal === "string" && textVal.trim().length > 0) || Boolean(photoVal);
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined && value !== "";
  };

  // Hints calculation
  const advertisedHints: Array<{ id: string; tier: string; opened: boolean; text?: string }> =
    Array.isArray(task.advertisedHints) ? task.advertisedHints : [];
  const nextUnopenedHint = advertisedHints.find((h) => !h.opened);
  const openedHintsList = advertisedHints.filter((h) => h.opened);

  // Group task view
  if (isGroupMode) {
    return (
      <div className="task-group-container">
        {groupError&&<p role="alert">{groupError}</p>}
        <div className="task-group-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={groupTab === "contribute"}
            className={`task-tab ${groupTab === "contribute" ? "task-tab-active" : ""}`}
            onClick={() => setGroupTab("contribute")}
          >
            💬 Thảo luận nhóm ({groupContributions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={groupTab === "submit"}
            className={`task-tab ${groupTab === "submit" ? "task-tab-active" : ""}`}
            onClick={() => setGroupTab("submit")}
          >
            ⭐ Sản phẩm thống nhất {groupProduct ? "(Đã nộp)" : ""}
          </button>
        </div>

        {groupTab === "contribute" && (
          <div className="task-group-tab-panel">
            <div className="task-contributions-feed">
              {groupContributions.length === 0 ? (
                <p className="task-empty-feed">
                  Chưa có ý kiến nào được gửi. Hãy viết ý tưởng hoặc lập luận của em để cùng nhóm thảo luận.
                </p>
              ) : (
                <ul className="task-contributions-list">
                  {groupContributions.map((c, i) => (
                    <li
                      key={i}
                      className={`task-contrib-item ${
                        c.learnerId === currentLearnerId ? "task-contrib-own" : ""
                      }`}
                    >
                      <div className="task-contrib-meta">
                        <span className="task-contrib-author">
                          {c.learnerId === currentLearnerId ? "Em" : `Thành viên (${c.learnerId.slice(0, 5)})`}
                        </span>
                        <time className="task-contrib-time">
                          {new Date(c.at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <div className="task-contrib-body">
                        <MathText text={c.text} inline={false} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleSendContribution} className="task-contrib-form">
              <label htmlFor={`${inputId}-contrib`} className="task-label">
                Ý kiến đóng góp của em:
              </label>
              {renderMathToolbar("contrib")}
              <textarea
                id={`${inputId}-contrib`}
                ref={(el) => { contribTextRef.current = el; }}
                onSelect={() => trackMathSelection("contrib")}
                rows={2}
                disabled={disabled || isSendingContrib}
                value={contributionText}
                onChange={(e) => {thoughtEditorRef.current.dirty=true;setContributionText(e.target.value);}}
                placeholder="Nhập lập luận, công thức hoặc ý kiến xây dựng bài..."
                className="task-textarea"
                maxLength={4000}
              />
              <button
                type="submit"
                disabled={disabled || isSendingContrib || !contributionText.trim()}
                className="task-button task-button-secondary"
              >
                {isSendingContrib ? "Đang gửi..." : "Gửi vào nhóm"}
              </button>
            </form>
          </div>
        )}

        {groupTab === "submit" && (
          <div className="task-group-tab-panel">
            {groupProduct && (
              <div
                className={`task-group-product-banner ${
                  groupProduct.ok ? "task-banner-success" : "task-banner-info"
                }`}
              >
                <strong>Trạng thái sản phẩm nhóm:</strong>{" "}
                {groupProduct.assessmentStatus === "pending" ? "Chờ GV đánh giá" : groupProduct.ok
                  ? "✓ Nhóm đã hoàn thành chính xác nhiệm vụ!"
                  : "Đã nộp bài, đang ghi nhận kết quả."}
                <small className="task-muted-block">
                  Nộp bởi: {groupProduct.submittedBy === currentLearnerId ? "Em" : groupProduct.submittedBy}{" "}
                  - {new Date(groupProduct.at).toLocaleTimeString("vi-VN")}
                </small>
              </div>
            )}

            <form onSubmit={handleSubmit} className="task-form">
              {renderInputFields()}
              <div className="task-actions">
                <button
                  type="submit"
                  disabled={disabled || isSubmittingAnswer || !hasAnswer()}
                  className="task-button task-button-primary"
                >
                  {isSubmittingAnswer ? "Đang nộp..." : "Đại diện nhóm nộp bài"}
                </button>
              </div>
            </form>
          </div>
        )}

        {symbolSheet}
        {renderHintsDrawer()}
      </div>
    );
  }

  // Individual task view
  return (
    <div className="task-container">
      {renderSubmissionBanner()}

      <form onSubmit={handleSubmit} className="task-form">
        {renderInputFields()}

        <div className="task-actions">
          <button
            type="submit"
            disabled={disabled || isSubmittingAnswer || !hasAnswer()}
            className="task-button task-button-primary"
          >
            {isSubmittingAnswer ? "Đang gửi..." : "Nộp câu trả lời"}
          </button>
        </div>
      </form>

      {symbolSheet}
      {renderHintsDrawer()}
    </div>
  );

  function renderSubmissionBanner() {
    if (!submission) return null;

    if (submission.assessmentStatus === "pending") {
      return (
        <div className="task-status-banner task-status-pending">
          <span className="task-badge task-badge-pending">⏳ Chờ giáo viên đánh giá</span>
          <p>Bài làm của em đã được nộp. Giáo viên sẽ nhận xét và đánh giá theo chuẩn đầu ra.</p>
        </div>
      );
    }

    if (submission.assessmentStatus === "submitted") {
      // V28 Phase C — luyện tập nền B: nộp là hoàn thành; AI có thể kèm nhận xét gợi ý, không kết luận đạt/không đạt.
      return (
        <div className="task-status-banner task-status-pending">
          <span className="task-badge task-badge-pending">✓ Đã nộp bài luyện tập</span>
          <p>Bài làm của em đã hoàn thành nhiệm vụ luyện tập này.</p>
          {submission.aiComment?.feedback && (
            <p><strong>Nhận xét gợi ý: </strong><MathText text={submission.aiComment.feedback} /></p>
          )}
        </div>
      );
    }

    if (submission.ok) {
      return (
        <div className="task-status-banner task-status-success">
          <span className="task-badge task-badge-success">✓ Chính xác!</span>
          <p>Em đã hoàn thành tốt nhiệm vụ này.</p>
        </div>
      );
    }

    // Wrong answer
    return (
      <div className="task-status-banner task-status-error">
        <span className="task-badge task-badge-error">✕ Chưa chính xác</span>
        {evalData.answerKey !== undefined ? (
          <p>
            Đáp án chuẩn:{" "}
            {typeof evalData.answerKey === "object" ? (
              <code>{JSON.stringify(evalData.answerKey)}</code>
            ) : (
              <MathText text={String(evalData.answerKey)} />
            )}
          </p>
        ) : (
          <p>Em hãy kiểm tra lại các bước tính hoặc mở gợi ý giàn giáo bên dưới để được hướng dẫn.</p>
        )}
      </div>
    );
  }

  function renderTaskDiagram() {
    const t = task as { imageUrl?: string; diagramUrl?: string; image?: string };
    const taskImg = t.imageUrl || t.diagramUrl || t.image;
    if (!taskImg) return null;
    return (
      <div className="task-diagram-card" style={{ marginBottom: "0.75rem", textAlign: "center" }}>
        <img
          src={taskImg}
          alt="Hình minh họa nhiệm vụ"
          style={{ maxWidth: "100%", maxHeight: "280px", borderRadius: "8px", border: "1px solid var(--lesson-border, #e2e8f0)" }}
        />
      </div>
    );
  }

  function renderInputFields() {
    return (
      <>
        {renderTaskDiagram()}
        {renderFieldContent()}
      </>
    );
  }

  function renderFieldContent() {
    if (isOrdering) {
      const items = schema.items || [];
      const orderedIds: string[] = Array.isArray(value) ? value as string[] : [];
      const move = (index: number, direction: number) => {
        if (disabled || index + direction < 0 || index + direction >= orderedIds.length) return;
        const next = [...orderedIds];
        [next[index], next[index + direction]] = [next[index + direction], next[index]];
        handleValueChange(next);
      };
      return (
        <fieldset className="task-fieldset" disabled={disabled}>
          <legend className="task-legend">Sắp xếp các bước theo thứ tự:</legend>
          <ol className="task-rep-list">
            {orderedIds.map((id, index) => {
              const item = items.find(item => item.id === id);
              return item ? (
                <li key={id} className="task-rep-row">
                  <div className="task-rep-label"><MathText text={item.label} /></div>
                  <div className="task-rep-control">
                    <button type="button" className="task-button task-button-secondary" aria-label={`Đưa bước ${index + 1} lên`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>Lên</button>
                    <button type="button" className="task-button task-button-secondary" aria-label={`Đưa bước ${index + 1} xuống`} disabled={disabled || index === orderedIds.length - 1} onClick={() => move(index, 1)}>Xuống</button>
                  </div>
                </li>
              ) : null;
            })}
          </ol>
        </fieldset>
      );
    }

    if (isClassification) {
      const items = schema.items || [], categories = schema.categories || [];
      const mapping = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
      return (
        <fieldset className="task-fieldset" disabled={disabled}>
          <legend className="task-legend">Phân loại từng mục vào nhóm phù hợp:</legend>
          <ul aria-label="Các nhóm để phân loại">{categories.map((category,index)=><li key={category.id}>Nhóm {index+1}: <MathText text={category.label}/></li>)}</ul>
          <div className="task-rep-list">
            {items.map(item => (
              <div key={item.id} className="task-rep-row">
                <label htmlFor={`task-classify-${inputId}-${item.id}`} className="task-rep-label"><MathText text={item.label} /></label>
                <select id={`task-classify-${inputId}-${item.id}`} className="task-select" disabled={disabled} value={mapping[item.id] || ""}
                  onChange={event => { if (!disabled) handleValueChange({ ...mapping, [item.id]: event.target.value }); }}>
                  <option value="">-- Chọn nhóm --</option>
                  {categories.map((category,index) => <option key={category.id} value={category.id}>Nhóm {index+1}</option>)}
                </select>
              </div>
            ))}
          </div>
        </fieldset>
      );
    }

    if (isTrueFalse4) {
      const statements = schema.statements || [];
      const selected: Array<boolean | null> = Array.isArray(value) ? value as Array<boolean | null> : [];
      return (
        <fieldset className="task-fieldset" disabled={disabled}>
          <legend className="task-legend">Đánh dấu đúng hoặc sai cho từng phát biểu:</legend>
          <div className="task-options-grid">
            {statements.map((statement, index) => (
              <div key={statement.id} className="task-option-card">
                <div className="task-option-content"><strong>{index + 1}. </strong><MathText text={statement.label} inline={true} /></div>
                <label>
                  <input type="radio" name={`task-true-false-${inputId}-${index}`} checked={selected[index] === true} onChange={() => handleValueChange([...selected.slice(0, index), true, ...selected.slice(index + 1)])} disabled={disabled} /> Đúng
                </label>
                <label>
                  <input type="radio" name={`task-true-false-${inputId}-${index}`} checked={selected[index] === false} onChange={() => handleValueChange([...selected.slice(0, index), false, ...selected.slice(index + 1)])} disabled={disabled} /> Sai
                </label>
              </div>
            ))}
          </div>
          {Array.isArray(submission?.perItem) && (
            <div className="task-tf-feedback" role="status">
              {(submission?.perItem as boolean[]).map((itemOk, index) => (
                <span key={index} className={itemOk ? "task-tf-item task-tf-item-ok" : "task-tf-item task-tf-item-miss"}>
                  Phát biểu {index + 1}: {itemOk ? "✓" : "✗"}
                </span>
              ))}
              {typeof submission?.ratio === "number" && (
                <span className="task-ratio-chip">Điểm ý: {Math.round((submission?.ratio ?? 0) * 100) / 100}</span>
              )}
            </div>
          )}
        </fieldset>
      );
    }

    if (isSingleChoice) {
      const options = schema.options || [];
      return (
        <fieldset className="task-fieldset" disabled={disabled}>
          <legend className="task-legend">Chọn một phương án đúng:</legend>
          <div className="task-options-grid">
            {options.map((opt) => {
              const checked = value === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`task-option-card ${checked ? "task-option-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`task-choice-${inputId}`}
                    value={opt.id}
                    checked={checked}
                    onChange={() => handleValueChange(opt.id)}
                    disabled={disabled}
                    className="task-radio"
                  />
                  <div className="task-option-content">
                    <MathText text={opt.label} inline={true} />
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (isMultiChoice) {
      const options = schema.options || [];
      const currentSelected: string[] = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="task-fieldset" disabled={disabled}>
          <legend className="task-legend">Chọn các phương án đúng:</legend>
          <div className="task-options-grid">
            {options.map((opt) => {
              const checked = currentSelected.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`task-option-card ${checked ? "task-option-selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    name={`task-multichoice-${inputId}`}
                    value={opt.id}
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...currentSelected, opt.id]
                        : currentSelected.filter((id) => id !== opt.id);
                      handleValueChange(next);
                    }}
                    disabled={disabled}
                    className="task-checkbox"
                  />
                  <div className="task-option-content">
                    <MathText text={opt.label} inline={true} />
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (isRepresentationMatch) {
      const reps: Array<{ id: string; label: string }> = schema.representations || [];
      const cards: Array<{ id: string; label: string }> = schema.cards || [];
      const mapping =
        typeof value === "object" && value !== null
          ? (value as Record<string, string>)
          : {};

      return (
        <div className="task-rep-match-container">
          <p className="task-instruction">
            Ghép mỗi mục với thẻ phù hợp:
          </p>
          <ul aria-label="Các thẻ để ghép">{cards.map((card,index)=><li key={card.id}>Thẻ {index+1}: <MathText text={card.label}/></li>)}</ul>
          <div className="task-rep-list">
            {reps.map((rep) => {
              const selectedCardId = mapping[rep.id] || "";
              const matchedCard = cards.find((c) => c.id === selectedCardId);
              return (
                <div key={rep.id} className="task-rep-row">
                  <div className="task-rep-label">
                    <MathText text={rep.label} />
                  </div>
                  <div className="task-rep-control">
                    <select
                      className="task-select"
                      disabled={disabled}
                      value={selectedCardId}
                      onChange={(e) => {
                        handleValueChange({
                          ...mapping,
                          [rep.id]: e.target.value,
                        });
                      }}
                    >
                      <option value="">-- Chọn thẻ phù hợp --</option>
                      {cards.map((card,index) => (
                        <option key={card.id} value={card.id}>
                          Thẻ {index+1}
                        </option>
                      ))}
                    </select>

                    {matchedCard && (
                      <div className="task-matched-preview">
                        <MathText text={matchedCard.label} inline={false} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (isShortAnswer4) {
      const cells = schema.cells || [1, 2, 3, 4].map(index => ({ id: `cell-${index}`, label: `Ô ${index}` }));
      const answers: string[] = Array.isArray(value) ? value as string[] : ["", "", "", ""];
      return (
        <fieldset className="task-fieldset" disabled={disabled}>
          <legend className="task-legend">Nhập bốn ký tự theo thứ tự:</legend>
          <div className="task-short-answer-4" role="group" aria-label="Bốn ô trả lời">
            {cells.map((cell, index) => (
              <label key={cell.id} className="task-short-answer-cell">
                <span className="task-short-answer-cell-label">{cell.label || `Ô ${index + 1}`}</span>
                <input
                  ref={el => { cellInputRefs.current[index] = el; }}
                  aria-label={cell.label || `Ô ${index + 1}`}
                  type="text"
                  inputMode={schema.format === "alphanumeric" ? "text" : "numeric"}
                  maxLength={1}
                  disabled={disabled}
                  value={answers[index] || ""}
                  onChange={(event) => {
                    const next = [...answers];
                    const val = event.target.value;
                    next[index] = val;
                    handleValueChange(next);
                    if (val.trim() && index < 3) {
                      cellInputRefs.current[index + 1]?.focus();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !answers[index] && index > 0) {
                      cellInputRefs.current[index - 1]?.focus();
                    }
                  }}
                  className="task-short-answer-input"
                />
              </label>
            ))}
          </div>
          {schema.format === "decimal_4" && (
            <>
              <div className="task-decimal-keypad" role="group" aria-label="Bàn phím thập phân">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ",", "-"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="task-short-answer-key"
                    disabled={disabled}
                    onClick={() => {
                      const next: string[] = [...answers];
                      const empty = next.findIndex(cell => !cell);
                      const target = empty === -1 ? 3 : empty;
                      next[target] = key;
                      handleValueChange(next);
                      const nextEmpty = next.findIndex(cell => !cell);
                      cellInputRefs.current[nextEmpty === -1 ? 3 : nextEmpty]?.focus();
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <small className="task-helper-text">Dấu phẩy là dấu thập phân (ví dụ 0,25). Ô đầu có thể là dấu trừ.</small>
            </>
          )}
        </fieldset>
      );
    }

    if (isNumeric) {
      return (
        <div className="task-input-field">
          <label htmlFor={`task-numeric-${inputId}`} className="task-label">
            Kết quả số học:
          </label>
          <input
            id={`task-numeric-${inputId}`}
            type="text"
            inputMode="text"
            disabled={disabled}
            value={typeof value === "string" ? value : String(value ?? "")}
            onChange={(e) => handleValueChange(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={(e) => { isComposingRef.current = false; handleValueChange(e.currentTarget.value); }}
            placeholder="Ví dụ: 20 hoặc 3/4 hoặc -5"
            className="task-text-input"
          />
          <small className="task-helper-text">
            Chấp nhận số nguyên, số thập phân (viết 1,5 hoặc 1.5) hoặc phân số (dạng a/b). Viết 3000 cho ba nghìn; 3.000 được hiểu là 3.
          </small>
        </div>
      );
    }

    // Open or Reflection (Multi-line explanation, NO JSON!)
    const rubricCriteria: string[] = Array.isArray(evalData.rubric?.criteria)
      ? evalData.rubric.criteria
      : [];

    return (
      <div className="task-input-field">
        {rubricCriteria.length > 0 && (
          <div className="task-rubric-box">
            <span className="task-rubric-title">📋 Tiêu chí đánh giá của giáo viên:</span>
            <ul className="task-rubric-list">
              {rubricCriteria.map((c, i) => (
                <li key={i}>
                  <MathText text={c} inline={true} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <label htmlFor={`task-open-${inputId}`} className="task-label">
          {taskType === "reflection" ? "Bài suy ngẫm & Liên hệ:" : "Lời giải và lập luận của em:"}
        </label>

        <div className="task-drawing-tools" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
          <button
            type="button"
            className={`task-button task-button-sm ${desmosMode === "geometry" ? "task-button-primary" : "task-button-secondary"}`}
            disabled={disabled}
            onClick={() => setDesmosMode(prev => prev === "geometry" ? "none" : "geometry")}
            style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem" }}
          >
            📐 {desmosMode === "geometry" ? "Đóng Desmos Hình học" : "Mở Desmos Hình học"}
          </button>
          <button
            type="button"
            className={`task-button task-button-sm ${desmosMode === "calculator" ? "task-button-primary" : "task-button-secondary"}`}
            disabled={disabled}
            onClick={() => setDesmosMode(prev => prev === "calculator" ? "none" : "calculator")}
            style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem" }}
          >
            📈 {desmosMode === "calculator" ? "Đóng Desmos Đồ thị" : "Mở Desmos Đồ thị"}
          </button>
          <label className="task-button task-button-sm task-button-secondary" style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            📷 {isUploadingPhoto ? "Đang xử lý..." : (drawingPhoto ? "Đổi ảnh vẽ tay" : "Tải ảnh vẽ tay (giấy)")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              disabled={disabled || isUploadingPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploadingPhoto(true);
                try {
                  const data = await shrinkDrawingPhoto(file);
                  if (data) {
                    setDrawingPhoto(data);
                    const currentText = typeof value === "string" ? value : (typeof value === "object" && value !== null && "text" in value ? String((value as {text?: unknown}).text ?? "") : "");
                    handleValueChange({ text: currentText, drawingPhoto: data });
                  }
                } finally {
                  setIsUploadingPhoto(false);
                }
              }}
            />
          </label>
        </div>

        {desmosMode !== "none" && (
          <div className="task-desmos-embed" style={{ marginBottom: "0.75rem", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--lesson-border, #cbd5e1)" }}>
            <iframe
              src={desmosMode === "geometry" ? "https://www.desmos.com/geometry?embed" : "https://www.desmos.com/calculator?embed"}
              width="100%"
              height="300"
              style={{ border: "none", display: "block" }}
              title="Desmos Workspace"
            />
          </div>
        )}

        {drawingPhoto && (
          <div className="task-drawing-preview" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", padding: "0.5rem", background: "rgba(0,0,0,0.03)", borderRadius: "6px", border: "1px solid var(--lesson-border, #e2e8f0)" }}>
            <img src={drawingPhoto} alt="Ảnh vẽ tay" style={{ height: "55px", width: "55px", borderRadius: "4px", objectFit: "cover" }} />
            <span style={{ fontSize: "0.85rem" }}>Đã đính kèm ảnh vẽ tay bài làm</span>
            <button
              type="button"
              className="task-button task-button-sm task-button-secondary"
              style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
              onClick={() => {
                setDrawingPhoto("");
                const currentText = typeof value === "string" ? value : (typeof value === "object" && value !== null && "text" in value ? String((value as {text?: unknown}).text ?? "") : "");
                handleValueChange(currentText);
              }}
            >
              Xóa ảnh
            </button>
          </div>
        )}

        {renderMathToolbar("open")}
        <textarea
          id={`task-open-${inputId}`}
          ref={(el) => { openTextRef.current = el; }}
          onSelect={() => trackMathSelection("open")}
          rows={6}
          disabled={disabled}
          value={typeof value === "string" ? value : (typeof value === "object" && value !== null && "text" in value ? String((value as {text?: unknown}).text ?? "") : String(value ?? ""))}
          onChange={(e) => {
            const nextText = e.target.value;
            if (drawingPhoto) {
              handleValueChange({ text: nextText, drawingPhoto });
            } else {
              handleValueChange(nextText);
            }
          }}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            const nextText = e.currentTarget.value;
            if (drawingPhoto) {
              handleValueChange({ text: nextText, drawingPhoto });
            } else {
              handleValueChange(nextText);
            }
          }}
          placeholder="Trình bày chi tiết cách giải, biến đổi công thức và giải thích quy luật..."
          className="task-textarea"
          maxLength={4000}
        />
        <div className="task-textarea-footer">
          <small className="task-draft-indicator" style={draftError ? { color: "#b91c1c", fontWeight: 600 } : undefined}>
            {draftError
              ? DRAFT_ERROR_MESSAGES[draftError] || "Không lưu được bài làm. Kiểm tra mạng rồi thử lại."
              : isDirty ? "Đang lưu nháp..." : "Đã đồng bộ nháp với phiên học"}
          </small>
          <small className="task-char-count">
            {typeof value === "string" ? value.length : (typeof value === "object" && value !== null && "text" in value ? String((value as { text?: unknown }).text ?? "").length : 0)} / 4000 ký tự
          </small>
        </div>
      </div>
    );
  }

  function renderHintsDrawer() {
    if (advertisedHints.length === 0) return null;

    return (
      <aside className="task-hints-drawer" aria-label="Gợi ý giàn giáo">
        <div className="task-hints-header">
          <span className="task-hints-title">
            💡 Gợi ý giàn giáo ({openedHintsList.length}/{advertisedHints.length})
          </span>
          {nextUnopenedHint && (
            <button
              type="button"
              disabled={disabled || isOpeningHint}
              onClick={() => handleHintClick(nextUnopenedHint.id)}
              className="task-button task-button-hint"
            >
              {isOpeningHint
                ? "Đang mở..."
                : `Mở gợi ý tiếp theo (${nextUnopenedHint.tier || "Gợi ý"})`}
            </button>
          )}
        </div>

        {openedHintsList.length > 0 && (
          <div className="task-hints-body">
            {openedHintsList.map((h, i) => (
              <div key={h.id || i} className="task-hint-card">
                <span className="task-hint-badge">Tầng {h.tier || i + 1}</span>
                <div className="task-hint-text">
                  <MathText text={h.text} inline={false} />
                </div>
                {((h as { diagramUrl?: string }).diagramUrl || (h as { image?: string }).image) && (
                  <div className="task-hint-diagram" style={{ marginTop: "0.5rem" }}>
                    <img
                      src={(h as { diagramUrl?: string }).diagramUrl || (h as { image?: string }).image}
                      alt={`Sơ đồ gợi ý tầng ${h.tier || i + 1}`}
                      style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "6px", border: "1px solid var(--lesson-border, #e2e8f0)" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {openedHintsList.length === advertisedHints.length && advertisedHints.length > 0 && (
          <p className="task-hints-complete">Em đã mở toàn bộ gợi ý cho nhiệm vụ này.</p>
        )}
      </aside>
    );
  }
}

export default TaskInput;
