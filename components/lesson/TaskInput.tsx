"use client";

import React, { useEffect, useState, useRef } from "react";
import MathText from "./MathText";

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
  } | null;
  onSaveDraft?: (answer: unknown) => void;
  onSubmit?: (answer: unknown) => Promise<void> | void;
  onOpenHint?: (hintId: string) => Promise<void> | void;
  isGroupMode?: boolean;
  onGroupContribute?: (text: string) => Promise<void> | void;
  onGroupSubmit?: (answer: unknown) => Promise<void> | void;
  groupProduct?: {
    answer: unknown;
    ok: boolean;
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
  const schema = task.inputSchema || {};
  const evalData = task.evaluation || {};
  const checkerId = evalData.checkerId || "";
  const taskType = task.type || "closed";

  // Determine input flavor
  const isRepresentationMatch =
    checkerId === "representation_match" ||
    (Array.isArray(schema.representations) && Array.isArray(schema.cards));

  const isMultiChoice =
    checkerId === "multi_choice_exact" ||
    (schema.type === "multi_choice" && Array.isArray(schema.options));

  const isSingleChoice =
    !isRepresentationMatch &&
    !isMultiChoice &&
    (checkerId === "choice_exact" || Array.isArray(schema.options));

  const isNumeric =
    !isRepresentationMatch &&
    !isMultiChoice &&
    !isSingleChoice &&
    (checkerId === "numeric_exact" || schema.type === "numeric");

  // Initial answer calculation
  const getInitialAnswer = () => {
    if (submission?.answer !== undefined && submission?.answer !== null) {
      return submission.answer;
    }
    if (initialDraft !== undefined && initialDraft !== null) {
      return initialDraft;
    }
    if (isMultiChoice) return [];
    if (isRepresentationMatch) return {};
    return "";
  };

  const [value, setValue] = useState<unknown>(getInitialAnswer);
  const [isDirty, setIsDirty] = useState(false);
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
      } else if (initialDraft !== undefined && initialDraft !== null) {
        setValue(initialDraft);
      } else if (isMultiChoice) {
        setValue([]);
      } else if (isRepresentationMatch) {
        setValue({});
      } else {
        setValue("");
      }
      if (taskChanged) setIsDirty(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    initialDraft,
    isDirty,
    isMultiChoice,
    isRepresentationMatch,
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
      if (!isComposingRef.current) onSaveDraft?.(nextVal);
    }, 800);
  };

  const handleValueChange = (newVal: unknown) => {
    setValue(newVal);
    triggerDraftSave(newVal);
  };

  // Group discussion state
  const [groupTab, setGroupTab] = useState<"contribute" | "submit">("contribute");
  const [contributionText, setContributionText] = useState("");
  const [isSendingContrib, setIsSendingContrib] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isOpeningHint, setIsOpeningHint] = useState(false);

  const handleSendContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionText.trim() || isSendingContrib || disabled) return;
    setIsSendingContrib(true);
    try {
      await onGroupContribute?.(contributionText.trim());
      setContributionText("");
    } finally {
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
    if (isRepresentationMatch) {
      if (!value || typeof value !== "object") return false;
      const reps = schema.representations || [];
      const valMap = value as Record<string, string>;
      return reps.length > 0 && reps.every((r) => Boolean(valMap[r.id]));
    }
    if (isMultiChoice) {
      return Array.isArray(value) && value.length > 0;
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
              <label htmlFor="group-contrib-input" className="task-label">
                Ý kiến đóng góp của em:
              </label>
              <textarea
                id="group-contrib-input"
                rows={2}
                disabled={disabled || isSendingContrib}
                value={contributionText}
                onChange={(e) => setContributionText(e.target.value)}
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
                {groupProduct.ok
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

  function renderInputFields() {
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
                    name={`task-choice-${task.id}`}
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
                    name={`task-multichoice-${task.id}`}
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
            Ghép từng cách biểu diễn ở cột bên trái với thẻ công thức/quy luật tương ứng:
          </p>
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
                      <option value="">-- Chọn thẻ biểu diễn tương ứng --</option>
                      {cards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.label.replace(/\$/g, "")}
                        </option>
                      ))}
                    </select>

                    {matchedCard && (
                      <div className="task-matched-preview">
                        <MathText text={matchedCard.label} inline={true} />
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

    if (isNumeric) {
      return (
        <div className="task-input-field">
          <label htmlFor={`task-numeric-${task.id}`} className="task-label">
            Kết quả số học:
          </label>
          <input
            id={`task-numeric-${task.id}`}
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

        <label htmlFor={`task-open-${task.id}`} className="task-label">
          {taskType === "reflection" ? "Bài suy ngẫm & Liên hệ:" : "Lời giải và lập luận của em:"}
        </label>
        <textarea
          id={`task-open-${task.id}`}
          rows={6}
          disabled={disabled}
          value={typeof value === "string" ? value : String(value ?? "")}
          onChange={(e) => handleValueChange(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(e) => { isComposingRef.current = false; handleValueChange(e.currentTarget.value); }}
          placeholder="Trình bày chi tiết cách giải, biến đổi công thức và giải thích quy luật..."
          className="task-textarea"
          maxLength={4000}
        />
        <div className="task-textarea-footer">
          <small className="task-draft-indicator">
            {isDirty ? "Đang lưu nháp..." : "Đã đồng bộ nháp với phiên học"}
          </small>
          <small className="task-char-count">
            {typeof value === "string" ? value.length : 0} / 4000 ký tự
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
