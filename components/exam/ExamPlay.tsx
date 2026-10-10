"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import MathText from "../lesson/MathText";
import { LessonWorldMap } from "../lesson/LessonWorldMap";
import { mascotSpriteStyle } from "../lesson/LessonMascotPicker";
import { ApiError, ExamQuestion, messageFor, pupilGet, pupilImageUrl, pupilPost } from "./client";
import { AnswerSync, SaveState } from "./answer-sync";

const SPRITE = "mascots-historical.webp";
// names follow the pictures on the sprite sheet of the citadel world
const MASCOTS = ["Cáo", "Cú", "Hổ", "Gấu trúc", "Thỏ", "Ếch", "Rùa", "Rồng"];
const SESSION_KEY = "exam-session";

interface PupilState {
  serverNow: number;
  exam: {
    title: string;
    code: string;
    status: "draft" | "open" | "running" | "closed";
    durationMin: number;
    startedAt: number | null;
    endsAt: number | null;
    graceSeconds: number;
    questionCount: number;
    sections: Array<{ section: string; count: number }>;
    review: "after_close" | "none";
    examCode?: string;
  };
  attempt: { id: string; name: string; mascot: number; submittedAt: number | null };
  questions: ExamQuestion[];
  answers: Record<string, unknown>;
  photos: Record<string, string[]>;
  finished?: boolean;
  readOnly?: boolean;
  reviewPin?: string;
  assignmentPending?: boolean;
  badges?: string[];
  result?: { total: number; max: number; answered: number; count: number; essaysPending: boolean } | null;
  review?: {
    questions: ExamQuestion[];
    answers: Record<string, unknown>;
    manual: Record<string, number | null>;
    comments: Record<string, string>;
    items: Record<string, { points: number; max: number; pending: boolean; correct: boolean | null; detail?: { correct: number; total: number; marks: Array<boolean | null> } }>;
  } | null;
}

interface Session {
  code: string;
  token: string;
  name: string;
}

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the pupil can still work, only the automatic return is lost */
  }
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
};

const isAnswered = (q: ExamQuestion, value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (q.type === "tf") return Array.isArray(value) && value.some((v) => v === true || v === false);
  if (q.type === "essay") return typeof value === "object" && String((value as { text?: string }).text || "").trim() !== "";
  return String(value).trim() !== "";
};

// pictures are fetched once with the pupil's key and kept for the next visit to the same question
const imageCache = new Map<string, Promise<string>>();
function loadImage(token: string, query: string): Promise<string> {
  const key = token.slice(0, 12) + query;
  let found = imageCache.get(key);
  if (!found) {
    found = pupilImageUrl(token, query);
    found.catch(() => imageCache.delete(key));
    imageCache.set(key, found);
  }
  return found;
}

// ---------------------------------------------------------------------------------------------------- pieces

function QuestionImage({ token, qid, zoom }: { token: string; qid: string; zoom: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(0);
  useEffect(() => {
    let alive = true;
    loadImage(token, "image=" + encodeURIComponent(qid))
      .then((made) => {
        if (alive) setSrc(made);
      })
      .catch(() => {
        if (alive) setFailed((n) => n + 1);
      });
    return () => {
      alive = false;
    };
  }, [token, qid, failed]);
  if (src) {
    return (
      <div className="exam-q-scroll">
        <img className="exam-q-image" style={{ width: zoom * 100 + "%", maxWidth: "none" }} src={src} alt="Đề bài" draggable={false} />
      </div>
    );
  }
  return (
    <div className="exam-q-image exam-q-image-wait">
      {failed ? (
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => setFailed(0)}>
          Tải lại hình đề
        </button>
      ) : (
        "Đang tải đề…"
      )}
    </div>
  );
}

function Thumb({ token, id, onRemove }: { token: string; id: string; onRemove: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    pupilImageUrl(token, "photo=" + encodeURIComponent(id))
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
  }, [token, id]);
  return (
    <div className="exam-thumb">
      {src ? <img src={src} alt="Ảnh bài làm" /> : <span>…</span>}
      <button type="button" aria-label="Xóa ảnh này" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

function ReviewImage({ token, query, alt }: { token: string; query: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    loadImage(token, query).then((url) => {
      if (alive) setSrc(url);
    }).catch(() => {
      if (alive) setFailed(true);
    });
    return () => { alive = false; };
  }, [token, query, retry]);
  return src ? <img className="exam-review-image" src={src} alt={alt} /> : failed ? (
    <button type="button" className="lesson-button lesson-button-outline" onClick={() => { setFailed(false); setRetry((n) => n + 1); }}>Tải lại {alt.toLowerCase()}</button>
  ) : <p className="exam-note" role="status">Đang tải {alt.toLowerCase()}…</p>;
}

const reviewVerdict = (mark: boolean | null | undefined) => mark === true ? "Trả lời đúng" : mark === false ? "Trả lời sai" : "Chưa trả lời";
const tfAnswer = (value: unknown) => value === true ? "Đúng" : value === false ? "Sai" : "Chưa trả lời";

function QuestionContent({ q, token, zoom }: { q: ExamQuestion; token: string; zoom: number }) {
  if (q.hasImage && q.imageMode !== "figure") return <QuestionImage key={q.id} token={token} qid={q.id} zoom={zoom} />;
  return <>
    <div className="exam-q-text"><MathText text={q.text || ""} inline={false} /></div>
    {(q.questionImages || []).map((asset, i) => <ReviewImage key={asset.id} token={token} query={"question=" + encodeURIComponent(asset.id)} alt={"Hình minh họa " + (i + 1)} />)}
  </>;
}

function ChoiceImage({ token, id, alt }: { token: string; id: string; alt: string }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadImage(token, "item=" + encodeURIComponent(id)).then((url) => { if (alive) setSrc(url); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [token, id]);
  return src ? <img className="exam-item-image" src={src} alt={alt} /> : <span role="status">{failed ? "Chưa tải được hình. Kiểm tra kết nối rồi mở lại câu này." : "Đang tải hình…"}</span>;
}

function ReviewQuestion({ q, review, token, photos, zoom }: { q: ExamQuestion; review: NonNullable<PupilState["review"]>; token: string; photos: string[]; zoom: number }) {
  const answer = review.answers[q.id];
  const item = review.items[q.id];
  const shortKey = q.type === "short" && q.key && typeof q.key === "object" ? (q.key as { accept?: string[] }).accept : null;
  const hasKey = q.type === "mc" ? typeof q.key === "string" && q.key !== "" : q.type === "tf" ? Array.isArray(q.key) && q.key.length > 0 : q.type === "short" ? !!shortKey?.length : false;
  const essayText = answer && typeof answer === "object" ? String((answer as { text?: string }).text || "") : "";
  return (
    <section className="exam-card exam-question exam-review-question" aria-label={"Xem lại " + q.label} aria-live="polite">
      <div className="exam-q-head">
        <h2>{q.section ? "Phần " + q.section + " · " : ""}{q.label}</h2>
        <span className="exam-points">{q.points.toLocaleString("vi-VN")} điểm tối đa</span>
      </div>
      <QuestionContent q={q} token={token} zoom={zoom} />
      {q.type === "essay" ? (
        <div className="exam-review-answer">
          <h3>Bài làm của em</h3>
          {essayText && <div className="exam-typed"><MathText text={essayText} inline={false} /></div>}
          {photos.map((id, i) => <ReviewImage key={id} token={token} query={"photo=" + encodeURIComponent(id)} alt={"Ảnh bài làm " + (i + 1)} />)}
          {!essayText && !photos.length && <p>Em chưa gửi bài làm cho câu này.</p>}
          {review.manual[q.id] == null || item?.pending ? <p className="exam-note" role="status">Đang chờ giáo viên chấm</p> : (
            <p className="exam-review-points">Điểm giáo viên chấm: <strong>{(item?.points ?? review.manual[q.id]).toLocaleString("vi-VN")} / {q.points.toLocaleString("vi-VN")} điểm</strong></p>
          )}
          {review.comments[q.id] && <div className="exam-review-comment"><h3>Nhận xét của giáo viên</h3><p>{review.comments[q.id]}</p></div>}
        </div>
      ) : q.type === "tf" ? (
        <div className="exam-review-answer">
          <h3>Kết quả từng ý</h3>
          <div className="exam-review-tf">
            {(q.statements || ["a", "b", "c", "d"]).map((letter, i) => {
              const given = Array.isArray(answer) ? answer[i] : null;
              const key = Array.isArray(q.key) ? q.key[i] : null;
              const mark = item?.detail?.marks[i];
              return <div key={letter} className="exam-review-tf-row"><strong>{letter})</strong>{q.statementText?.[letter] && <MathText text={q.statementText[letter]} inline={false} />}{q.statementImages?.[letter] && <ChoiceImage token={token} id={q.statementImages[letter]} alt={"Nội dung ý " + letter} />}<span>Em chọn: {tfAnswer(given)}</span><span>Đáp án đúng: {typeof key === "boolean" ? tfAnswer(key) : "Chưa có đáp án"}</span><b className={hasKey ? mark === true ? "exam-ok-text" : mark === false ? "exam-bad" : "exam-note" : "exam-note"}>{hasKey ? reviewVerdict(mark) : "Chưa có đáp án"}</b></div>;
            })}
          </div>
          {hasKey && item && <p className="exam-review-points">Đúng {item.detail?.correct ?? 0}/{item.detail?.total ?? q.statements?.length ?? 4} ý · <strong>{item.points.toLocaleString("vi-VN")} / {item.max.toLocaleString("vi-VN")} điểm</strong>{(q.statements?.length || 4) === 4 && <small>Thang THPT: đúng 1/2/3/4 ý nhận 10%/25%/50%/100% điểm câu.</small>}</p>}
        </div>
      ) : (
        <div className="exam-review-answer">
          {q.type === "mc" && (q.choiceText || q.choiceImages) && <div className="exam-review-choices">{(q.options || []).map((letter) => <div key={letter}><strong>{letter}.</strong> <MathText text={q.choiceText?.[letter]} />{q.choiceImages?.[letter] && <ChoiceImage token={token} id={q.choiceImages[letter]} alt={"Nội dung phương án " + letter} />}</div>)}</div>}
          <h3>Đáp án của em</h3>
          <MathText text={answer == null || answer === "" ? "Chưa trả lời" : String(answer)} inline={false} />
          <h3>Đáp án đúng</h3>
          <MathText text={hasKey ? q.type === "mc" ? String(q.key) : shortKey!.join(" hoặc ") : "Chưa có đáp án"} inline={false} />
          {hasKey && item && <p className={item.correct === true ? "exam-ok-text" : item.correct === false ? "exam-bad" : "exam-note"}>{reviewVerdict(item.correct)} · {item.points.toLocaleString("vi-VN")} / {item.max.toLocaleString("vi-VN")} điểm</p>}
        </div>
      )}
      <div className="exam-review-solution">
        <h3>{q.type === "essay" ? "Lời giải mẫu" : "Lời giải"}</h3>
        {q.solution ? <MathText text={q.solution} inline={false} /> : !(q.solutionImages || []).length && <p className="exam-note">Chưa có lời giải.</p>}
        {(q.solutionImages || []).map((image, i) => <ReviewImage key={image.id} token={token} query={"solution=" + encodeURIComponent(image.id)} alt={"Ảnh lời giải " + (i + 1)} />)}
        {q.type === "essay" && q.rubric && <><h3>Hướng dẫn chấm</h3><MathText text={q.rubric} inline={false} /></>}
      </div>
    </section>
  );
}

/** Shrinks a photo from the phone camera so it uploads quickly even on a weak connection. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  for (const [side, quality] of [[1500, 0.82], [1200, 0.72], [1000, 0.6], [800, 0.5]] as const) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const g = canvas.getContext("2d");
    if (!g) break;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", quality).split(",")[1] || "";
    if (data.length <= 640_000) {
      bitmap.close?.();
      return data;
    }
  }
  bitmap.close?.();
  throw new ApiError("INVALID_IMAGE", 400);
}

function Answer({
  q,
  value,
  onChange,
  token,
  photos,
  onPhoto,
  onPhotoRemove,
  uploading,
}: {
  q: ExamQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  token: string;
  photos: string[];
  onPhoto: (file: File) => void;
  onPhotoRemove: (id: string) => void;
  uploading: boolean;
}) {
  if (q.type === "mc") {
    return (
      <div className={"exam-options" + (q.choiceText || q.choiceImages ? " exam-options-rich" : "")} role="radiogroup" aria-label="Chọn một đáp án">
        {(q.options || ["A", "B", "C", "D"]).map((letter) => (
          <button key={letter} type="button" role="radio" aria-checked={value === letter} className={"exam-option" + (value === letter ? " is-on" : "")} onClick={() => onChange(value === letter ? null : letter)}>
            {letter}
            {q.choiceText?.[letter] && <MathText text={q.choiceText[letter]} />}
            {q.choiceImages?.[letter] && <ChoiceImage token={token} id={q.choiceImages[letter]} alt={"Nội dung phương án " + letter} />}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "tf") {
    const marks = Array.isArray(value) ? (value as Array<boolean | null>) : [];
    return (
      <div className="exam-tf">
        {(q.statements || ["a", "b", "c", "d"]).map((letter, i) => (
          <div key={letter} className={"exam-tf-row" + (q.statementText || q.statementImages ? " exam-tf-row-rich" : "")}>
            <span className="exam-tf-letter">{letter})</span>{q.statementText?.[letter] && <MathText className="exam-statement-content" text={q.statementText[letter]} inline={false} />}{q.statementImages?.[letter] && <ChoiceImage token={token} id={q.statementImages[letter]} alt={"Nội dung ý " + letter} />}
            {[true, false].map((answer) => (
              <button
                key={String(answer)}
                type="button"
                aria-pressed={marks[i] === answer}
                className={"exam-tf-btn" + (marks[i] === answer ? (answer ? " is-true" : " is-false") : "")}
                onClick={() => {
                  const next = (q.statements || ["a", "b", "c", "d"]).map((_, k) => (k === i ? (marks[i] === answer ? null : answer) : marks[k] ?? null));
                  onChange(next);
                }}
              >
                {answer ? "Đúng" : "Sai"}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (q.type === "short") {
    return (
      <label className="exam-short">
        <span>Đáp số của em</span>
        <input className="lesson-input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="Ví dụ: 1,5 hoặc -3 hoặc 3/2" maxLength={80} autoComplete="off" inputMode="text" />
      </label>
    );
  }
  const text = typeof value === "object" && value ? String((value as { text?: string }).text || "") : "";
  return (
    <div className="exam-essay">
      <p className="exam-essay-help">Em làm bài ra giấy, rồi <strong>chụp ảnh</strong> từng trang và đính kèm ở đây. Có thể chụp nhiều ảnh.</p>
      <div className="exam-thumbs">
        {photos.map((id) => (
          <Thumb key={id} token={token} id={id} onRemove={() => onPhotoRemove(id)} />
        ))}
        <label className={"exam-add-photo" + (uploading ? " is-busy" : "")}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onPhoto(file);
            }}
          />
          {uploading ? "Đang gửi ảnh…" : "📷 Chụp / chọn ảnh"}
        </label>
      </div>
      <label className="exam-essay-text">
        <span>Ghi chú thêm (không bắt buộc)</span>
        <textarea className="lesson-input" rows={3} value={text} onChange={(e) => onChange({ text: e.target.value })} maxLength={4000} />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- the screen

export default function ExamPlay() {
  const [booting, setBooting] = useState(true);
  const [state, setState] = useState<PupilState | null>(null);
  const [token, setToken] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [index, setIndex] = useState(0);
  const [flags, setFlags] = useState<string[]>(() => {
    try {
      return typeof window === "undefined" ? [] : (JSON.parse(window.localStorage.getItem("exam-flags") || "[]") as string[]);
    } catch {
      return [];
    }
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pendingCount, setPendingCount] = useState(0);
  const [now, setNow] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", mascot: 0 });
  const [reviewLogin, setReviewLogin] = useState(false);
  const [reviewPinInput, setReviewPinInput] = useState("");
  const [pageOpen, setPageOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(() => {
    try {
      return typeof window === "undefined" ? 1 : Number(window.localStorage.getItem("exam-zoom")) || 1;
    } catch {
      return 1;
    }
  });
  const changeZoom = (value: number) => {
    setZoom(value);
    try {
      window.localStorage.setItem("exam-zoom", String(value));
    } catch {
      /* ignore */
    }
  };
  const sync = useRef<AnswerSync | null>(null);
  const submitting = useRef(false);
  const tick = useRef<() => void>(() => undefined);
  const endedRef = useRef<() => void>(() => undefined);

  const applyState = useCallback((next: PupilState, tokenNow: string) => {
    setState(next);
    setOffset(next.serverNow - Date.now());
    setPhotos(next.photos || {});
    if (next.exam.status === "running" && !next.finished) {
      if (!sync.current) {
        sync.current = new AnswerSync({
          token: tokenNow,
          storageKey: "exam-answers:" + next.exam.code + ":" + next.attempt.id,
          onState: (s, n) => {
            setSaveState(s);
            setPendingCount(n);
          },
          onEnded: () => endedRef.current(),
        });
        sync.current.reconcile(next.answers || {});
      }
      setAnswers({ ...(next.answers || {}), ...sync.current.local() });
    } else {
      setAnswers(next.answers || {});
      if (next.finished) {
        sync.current?.stop();
        sync.current?.clearStored();
        sync.current = null;
      }
    }
  }, []);

  const refresh = useCallback(
    async (tokenNow: string) => {
      const next = await pupilGet<PupilState>(tokenNow);
      applyState(next, tokenNow);
      return next;
    },
    [applyState],
  );

  // first load: come back automatically with the key kept on this device
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = (params.get("code") || "").toUpperCase();
    const saved = readSession();
    const start = async () => {
      if (saved && (!wanted || saved.code === wanted)) {
        try {
          setToken(saved.token);
          await refresh(saved.token);
          setForm((f) => ({ ...f, code: saved.code, name: saved.name }));
          setBooting(false);
          return;
        } catch (e) {
          if (!(e instanceof ApiError) || e.code === "AUTH_REQUIRED") writeSession(null);
          setToken("");
        }
      }
      setForm((f) => ({ ...f, code: wanted || saved?.code || "", name: saved?.name || "" }));
      setBooting(false);
    };
    void start();
  }, [refresh]);

  // the clock and the periodic check with the server
  useEffect(() => {
    const timer = window.setInterval(() => tick.current(), 500);
    return () => window.clearInterval(timer);
  }, []);
  // count the times the pupil leaves the page
  useEffect(() => {
    if (!token || !state || state.exam.status !== "running" || state.finished) return undefined;
    const left = () => {
      if (document.visibilityState === "hidden") void pupilPost({ action: "tab" }, token).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", left);
    return () => document.removeEventListener("visibilitychange", left);
  }, [token, state]);

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      const saved = readSession();
      const code = form.code.trim().toUpperCase();
      const reuse = saved && saved.code === code && saved.name.trim().toLowerCase() === form.name.trim().toLowerCase() ? saved.token : undefined;
      const result = await pupilPost<{ token: string }>({ action: "join", code, name: form.name, mascot: form.mascot }, reuse);
      writeSession({ code, token: result.token, name: form.name.trim() });
      setToken(result.token);
      await refresh(result.token);
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const setAnswer = (qid: string, value: unknown) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === null || value === undefined) delete next[qid];
      else next[qid] = value;
      return next;
    });
    sync.current?.set(qid, value);
  };

  const doSubmit = async () => {
    if (state?.readOnly) return;
    setBusy(true);
    setError("");
    try {
      await sync.current?.settle();
      const next = await pupilPost<PupilState>({ action: "submit", answers: sync.current?.local() || answers }, token);
      applyState(next, token);
      setConfirming(false);
    } catch (e) {
      submitting.current = false;
      if (e instanceof ApiError && (e.code === "EXAM_ENDED" || e.code === "ALREADY_SUBMITTED")) {
        try {
          await refresh(token);
        } catch {
          /* shown below */
        }
      }
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const lastPoll = useRef(0);
  useEffect(() => {
    tick.current = () => {
      const t = Date.now();
      setNow(t);
      if (!state || !token) return;
      const status = state.exam.status;
      const every = status === "open" ? 4000 : status === "running" || status === "closed" ? 15000 : 0;
      if (every && t - lastPoll.current > every) {
        lastPoll.current = t;
        void refresh(token).catch((e) => {
          if (e instanceof ApiError && e.code === "AUTH_REQUIRED") {
            writeSession(null);
            setToken("");
            setState(null);
          }
        });
      }
      if (status === "running" && !state.finished && state.exam.endsAt && t + offset >= state.exam.endsAt && !submitting.current) {
        submitting.current = true;
        void doSubmit();
      }
    };
  });

  useEffect(() => {
    endedRef.current = () => {
      if (token) void refresh(token).catch(() => undefined);
    };
  });

  const addPhoto = async (qid: string, file: File) => {
    setUploading(true);
    setError("");
    try {
      const data = await shrink(file);
      const made = await pupilPost<{ id: string }>({ action: "photo", qid, mime: "image/jpeg", data }, token);
      setPhotos((prev) => ({ ...prev, [qid]: [...(prev[qid] || []), made.id] }));
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = async (qid: string, id: string) => {
    try {
      await pupilPost({ action: "photo-delete", id }, token);
      setPhotos((prev) => ({ ...prev, [qid]: (prev[qid] || []).filter((x) => x !== id) }));
    } catch (e) {
      setError(messageFor(e));
    }
  };
  const toggleFlag = (qid: string) => {
    setFlags((prev) => {
      const next = prev.includes(qid) ? prev.filter((x) => x !== qid) : [...prev, qid];
      try {
        window.localStorage.setItem("exam-flags", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const leave = () => {
    if (!state?.finished && !state?.attempt.submittedAt && state?.exam.status !== "closed") writeSession(null);
    sync.current?.stop();
    sync.current = null;
    setToken("");
    setState(null);
  };

  const openReview = async () => {
    setBusy(true); setError("");
    try {
      const result = await pupilPost<{ token: string; readOnly: true }>({ action: "review-join", code: form.code.trim().toUpperCase(), name: form.name.trim(), pin: reviewPinInput.trim().toUpperCase() });
      writeSession({ code: form.code.trim().toUpperCase(), token: result.token, name: form.name.trim() });
      setToken(result.token);
      await refresh(result.token);
      setReviewPinInput("");
    } catch (e) { setError(messageFor(e)); }
    finally { setBusy(false); }
  };

  // -------------------------------------------------------------------------------------------- screens
  if (booting) return <main className="exam-shell"><p className="exam-center">Đang mở phòng kiểm tra…</p></main>;

  if (!state || !token) {
    return (
      <main className="exam-shell">
        <section className="exam-card exam-join">
          <p className="exam-kicker">Phòng kiểm tra</p>
          <h1>Vào làm bài</h1>
          <label>
            <span>Mã phòng (6 ký tự)</span>
            <input className="lesson-input exam-code-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })} placeholder="ABC123" autoCapitalize="characters" autoComplete="off" />
          </label>
          <label>
            <span>Họ và tên của em</span>
            <input className="lesson-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Nguyễn Thảo An" maxLength={40} autoComplete="off" />
          </label>
          <fieldset className="exam-mascots">
            <legend>Chọn linh vật đồng hành</legend>
            <div className="exam-mascot-grid">
              {MASCOTS.map((name, i) => (
                <button key={name} type="button" className="exam-mascot-btn" aria-pressed={form.mascot === i} onClick={() => setForm({ ...form, mascot: i })}>
                  <span className="lesson-mascot-sprite" style={mascotSpriteStyle(SPRITE, i)} role="img" aria-hidden="true" />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p className="exam-error" role="alert">{error}</p>}
          <button type="button" className="lesson-button lesson-button-primary exam-big" disabled={busy || form.code.length < 6 || !form.name.trim()} onClick={() => void join()}>
            {busy ? "Đang vào…" : "Vào phòng"}
          </button>
          <p className="exam-note">Em dùng đúng tên của mình. Nếu lỡ đóng trang, mở lại link này và nhập đúng tên cũ để làm tiếp, bài đã làm vẫn được giữ.</p>
          <details className="exam-keybox" open={reviewLogin} onToggle={(e) => setReviewLogin(e.currentTarget.open)}>
            <summary>Xem lại trên thiết bị khác bằng PIN</summary>
            <p className="exam-note">Chỉ dùng sau khi phòng kết thúc. Nhập mã phòng, đúng tên ở trên và PIN ghi trên hộ chiếu. Phiên này chỉ xem lại bài.</p>
            <label>PIN xem lại<input className="lesson-input" aria-label="PIN xem lại" value={reviewPinInput} onChange={(e) => setReviewPinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} maxLength={8} autoComplete="off" autoCapitalize="characters" /></label>
            <button type="button" className="lesson-button lesson-button-outline" disabled={busy || form.code.length !== 6 || !form.name.trim() || reviewPinInput.length !== 8} onClick={() => void openReview()}>Mở bài để xem lại</button>
          </details>
        </section>
      </main>
    );
  }

  const exam = state.exam;
  const remaining = exam.endsAt ? exam.endsAt - (now + offset) : 0;

  if (state.finished || state.attempt.submittedAt || exam.status === "closed") {
    const r = state.result;
    const review = exam.status === "closed" && exam.review === "after_close" ? state.review : null;
    const selected = review?.questions[Math.min(index, Math.max(0, review.questions.length - 1))];
    return (
      <main className={"exam-shell" + (review ? " exam-review" : "")}>
        <section className={"exam-card exam-done" + (review ? " exam-passport-review" : "")}>
          <p className="exam-kicker">Hộ chiếu kết quả</p>
          <div className="exam-finish-rail" aria-hidden="true"><span className="lesson-mascot-sprite exam-finish-mascot" style={mascotSpriteStyle(SPRITE, state.attempt.mascot)} /><span className="exam-finish-gate">Đích</span></div>
          <span className="lesson-mascot-sprite exam-done-mascot" style={mascotSpriteStyle(SPRITE, state.attempt.mascot)} role="img" aria-label={MASCOTS[state.attempt.mascot]} />
          <h1 aria-live="polite">{review ? "Cùng xem lại bài làm" : state.attempt.submittedAt ? "Em đã nộp bài" : "Phòng kiểm tra đã kết thúc"}</h1>
          <p>{state.attempt.name} · {exam.title}</p>
          {exam.examCode && <p className="exam-note">Mã đề {exam.examCode}</p>}
          {state.reviewPin && <div className="exam-review-pin"><strong>PIN xem lại: <code>{state.reviewPin}</code></strong><p className="exam-note">Giữ PIN riêng. Sau khi phòng kết thúc, dùng mã phòng, đúng tên và PIN để xem lại trên máy khác.</p></div>}
          {state.readOnly && <p className="exam-note" role="status">Phiên chỉ xem lại — không sửa hoặc nộp bài.</p>}
          {!!state.badges?.length && <ul className="exam-badges" aria-label="Huy hiệu hành trình">{state.badges.map((badge) => <li key={badge} className="lesson-badge lesson-badge-primary">{badge}</li>)}</ul>}
          {r ? (
            <div className="exam-result">
              <div className="exam-score">{r.total.toLocaleString("vi-VN")}<small> / {r.max.toLocaleString("vi-VN")} điểm</small></div>
              <p>Em đã làm {r.answered}/{r.count} câu.</p>
              {r.essaysPending && <p className="exam-note">Phần tự luận do thầy/cô chấm nên điểm có thể tăng thêm.</p>}
            </div>
          ) : (
            <p>Thầy/cô sẽ thông báo kết quả sau.</p>
          )}
          {exam.status !== "closed" && exam.review === "after_close" && <p className="exam-note" role="status">Lời giải sẽ mở khi phòng kết thúc.</p>}
          {exam.status === "closed" && exam.review === "none" && <p className="exam-note">Thầy/cô không mở lời giải cho phòng này.</p>}
          <p className="exam-note">Linh vật và huy hiệu không thay đổi điểm bài làm. Em có thể mở lại trên thiết bị này để xem cập nhật.</p>
          {!review && <LessonWorldMap themeKey="historical" sessionKey={"exam-submitted-" + exam.code + "-" + state.attempt.id} height={320} map={{ totalPosition: 100, peers: [{ id: "me", name: "Em", mascot: state.attempt.mascot, position: 100, own: true }] }} examJourney={{ stations: [], selectedStationId: null, phase: "submitted" }} />}
          <button type="button" className="lesson-button lesson-button-outline" onClick={leave}>Thoát</button>
        </section>
        {review && <>
          <section className="exam-card exam-post-map" aria-label="Hành trình sau kiểm tra"><h2>Hành trình xem lại</h2>
            <LessonWorldMap themeKey="historical" sessionKey={"exam-review-" + exam.code + "-" + state.attempt.id} height={380}
              map={{ totalPosition: 100, peers: [{ id: "me", name: "Em", mascot: state.attempt.mascot, position: selected ? (review.questions.indexOf(selected) + 1) / Math.max(1, review.questions.length) * 100 : 100, own: true }] }}
              examJourney={{ stations: review.questions.map((question) => ({ id: question.id, label: (question.section ? "Phần " + question.section + " · " : "") + question.label, answered: isAnswered(question, review.answers[question.id]) || Boolean(photos[question.id]?.length) })), selectedStationId: selected?.id || null, phase: "review" }}
              onExamStationSelect={(qid) => { const found = review.questions.findIndex((question) => question.id === qid); if (found >= 0) setIndex(found); }} />
            <p className="exam-note">Chọn trạm để xem lại. Nếu bản đồ không tải được, dùng lưới câu bên dưới.</p>
          </section>
          <nav className="exam-palette exam-review-palette" aria-label="Trạm lời giải">
            <h2>Trạm lời giải</h2><p className="exam-note">Em có thể chọn bất kỳ câu nào để xem lại.</p>
            {[...new Set(review.questions.map((q) => q.section))].map((section) => <div key={section} className="exam-palette-group">{section && <b>Phần {section}</b>}<div className="exam-palette-grid">{review.questions.map((q, i) => q.section === section ? <button key={q.id} type="button" className={"exam-station" + (selected?.id === q.id ? " is-here" : "")} aria-label={"Xem lại " + q.label} aria-pressed={selected?.id === q.id} onClick={() => setIndex(i)}>{q.label.replace(/^\D+/, "") || i + 1}</button> : null)}</div></div>)}
          </nav>
          {selected && <ReviewQuestion key={selected.id} q={selected} review={review} token={token} photos={photos[selected.id] || []} zoom={zoom} />}
          <footer className="exam-nav">
            <button type="button" className="lesson-button lesson-button-outline" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>← Câu trước</button>
            <button type="button" className="lesson-button lesson-button-primary" disabled={index >= review.questions.length - 1} onClick={() => setIndex((i) => Math.min(review.questions.length - 1, i + 1))}>Câu sau →</button>
          </footer>
        </>}
      </main>
    );
  }

  if (exam.status === "open" || exam.status === "draft" || state.assignmentPending) {
    return (
      <main className="exam-shell">
        <section className="exam-card exam-wait">
          <span className="lesson-mascot-sprite exam-wait-mascot" style={mascotSpriteStyle(SPRITE, state.attempt.mascot)} role="img" aria-label={MASCOTS[state.attempt.mascot]} />
          <p className="exam-kicker">Phòng {exam.code}</p>
          <h1>{exam.title}</h1>
          <p className="exam-hello">Chào {state.attempt.name}! Em đã vào phòng.</p>
          <ul className="exam-rules">
            <li>Thời gian làm bài: <strong>{exam.durationMin} phút</strong>, tính từ lúc thầy/cô bấm bắt đầu.</li>
            <li>Gồm <strong>{exam.questionCount} câu</strong>{exam.sections.length > 1 ? " (" + exam.sections.map((s) => (s.section ? "Phần " + s.section + ": " : "") + s.count + " câu").join(", ") + ")" : ""}.</li>
            <li>Mỗi lần em chọn đáp án, bài được lưu ngay. Có thể đổi đáp án tới khi nộp.</li>
            <li>Không rời khỏi trang này trong lúc làm bài: số lần rời trang được báo cho thầy/cô.</li>
          </ul>
          <p className="exam-pulse">{state.assignmentPending ? "Chờ thầy/cô phân mã đề…" : "Đang chờ thầy/cô bắt đầu…"}</p>
          <button type="button" className="lesson-button lesson-button-outline" onClick={leave}>Thoát</button>
        </section>
      </main>
    );
  }

  // running
  const questions = state.questions;
  const q = questions[Math.min(index, Math.max(0, questions.length - 1))];
  const done = questions.filter((x) => isAnswered(x, answers[x.id])).length;
  const unanswered = questions.length - done;
  const lowTime = remaining < 5 * 60 * 1000;
  const sections = [...new Set(questions.map((x) => x.section))];
  const pct = questions.length ? (done / questions.length) * 100 : 0;
  for (const ahead of [1, 2]) {
    const next = questions[index + ahead];
    if (next?.hasImage) void loadImage(token, "image=" + encodeURIComponent(next.id)).catch(() => undefined);
  }

  return (
    <main className="exam-shell exam-running">
      <header className="exam-bar">
        <span className="lesson-mascot-sprite lesson-mascot-sprite-small" style={mascotSpriteStyle(SPRITE, state.attempt.mascot)} role="img" aria-label={MASCOTS[state.attempt.mascot]} />
        <div className="exam-bar-name">
          <strong>{state.attempt.name}</strong>
          {exam.examCode && <span className="exam-code-label">Mã đề {exam.examCode}</span>}
          <small className={"exam-save is-" + saveState}>{saveState === "saved" ? "✓ Đã lưu" : saveState === "saving" ? "Đang lưu… (" + pendingCount + ")" : "⚠ Chưa lưu được, đang thử lại (" + pendingCount + ")"}</small>
        </div>
        <div className={"exam-timer" + (lowTime ? " is-low" : "")} aria-label="Thời gian còn lại">{clock(remaining)}</div>
        <button type="button" className="lesson-button lesson-button-outline exam-bar-btn" onClick={() => setPageOpen((v) => !v)} aria-expanded={pageOpen}>Bảng câu</button>
      </header>

      <div className="exam-journey" aria-label={"Đã làm " + done + " trên " + questions.length + " câu"}>
        <div className="exam-rail">
          <div className="exam-rail-fill" style={{ width: pct + "%" }} />
          {sections.map((s) => {
            const before = questions.filter((x) => sections.indexOf(x.section) < sections.indexOf(s)).length;
            return before === 0 ? null : <span key={s} className="exam-gate" style={{ left: (before / questions.length) * 100 + "%" }} title={"Phần " + s} />;
          })}
          <span className="lesson-mascot-sprite exam-rail-mascot" style={{ ...mascotSpriteStyle(SPRITE, state.attempt.mascot), left: pct + "%" }} role="img" aria-hidden="true" />
          <span className="exam-flag" aria-hidden="true">🏁</span>
        </div>
        <small>{done}/{questions.length} câu</small>
        <button type="button" className="exam-map-btn" aria-expanded={mapOpen} onClick={() => setMapOpen((v) => !v)}>🗺 {mapOpen ? "Ẩn bản đồ" : "Bản đồ hành trình"}</button>
      </div>
      {mapOpen && (
        <div className="exam-map">
          <LessonWorldMap themeKey="historical" sessionKey={"exam-" + exam.code} height={300} map={{ totalPosition: 100, peers: [{ id: "me", name: "Em", mascot: state.attempt.mascot, position: pct, own: true }] }} />
        </div>
      )}

      {pageOpen && (
        <nav className="exam-palette" aria-label="Danh sách câu hỏi">
          {sections.map((s) => (
            <div key={s} className="exam-palette-group">
              {s && <b>Phần {s}</b>}
              <div className="exam-palette-grid">
                {questions.map((x, i) =>
                  x.section !== s ? null : (
                    <button key={x.id} type="button" className={"exam-station" + (isAnswered(x, answers[x.id]) ? " is-done" : "") + (flags.includes(x.id) ? " is-flag" : "") + (i === index ? " is-here" : "")} onClick={() => { setIndex(i); setPageOpen(false); }} aria-label={x.label + (isAnswered(x, answers[x.id]) ? " đã làm" : " chưa làm")}>
                      {x.label.replace(/^\D+/, "") || i + 1}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
          <p className="exam-note">Xanh: đã làm · Vàng: câu đang xem · Cam: đã đánh dấu xem lại</p>
        </nav>
      )}

      {q && (
        <section className="exam-card exam-question" aria-live="polite">
          <div className="exam-q-head">
            <span className="lesson-badge lesson-badge-primary">{q.section ? "Phần " + q.section + " · " : ""}{q.label}</span>
            <span className="exam-points">{q.points.toLocaleString("vi-VN")} điểm</span>
            <button type="button" className={"exam-flag-btn" + (flags.includes(q.id) ? " is-on" : "")} aria-pressed={flags.includes(q.id)} onClick={() => toggleFlag(q.id)}>⚑ Xem lại</button>
          </div>
          {q.hasImage ? (
            <>
              <div className="exam-zoom" role="group" aria-label="Cỡ hình đề">
                <span>Phóng to đề:</span>
                {[1, 1.5, 2].map((z) => (
                  <button key={z} type="button" aria-pressed={zoom === z} className={zoom === z ? "is-on" : ""} onClick={() => changeZoom(z)}>{z === 1 ? "Vừa khít" : "×" + z}</button>
                ))}
              </div>
              <QuestionContent q={q} token={token} zoom={zoom} />
            </>
          ) : <div className="exam-q-text"><MathText text={q.text || ""} inline={false} /></div>}
          <Answer q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} token={token} photos={photos[q.id] || []} onPhoto={(file) => void addPhoto(q.id, file)} onPhotoRemove={(id) => void removePhoto(q.id, id)} uploading={uploading} />
        </section>
      )}

      {error && <p className="exam-error" role="alert">{error}</p>}

      <footer className="exam-nav">
        <button type="button" className="lesson-button lesson-button-outline" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>← Câu trước</button>
        {index < questions.length - 1 ? (
          <button type="button" className="lesson-button lesson-button-primary" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>Câu sau →</button>
        ) : (
          <button type="button" className="lesson-button lesson-button-success" onClick={() => setConfirming(true)}>Nộp bài</button>
        )}
        <button type="button" className="lesson-button lesson-button-outline exam-nav-submit" onClick={() => setConfirming(true)}>Nộp bài</button>
      </footer>

      {confirming && (
        <div className="exam-modal" role="dialog" aria-modal="true" aria-label="Xác nhận nộp bài">
          <div className="exam-modal-box">
            <h2>Nộp bài?</h2>
            <p>{unanswered > 0 ? "Em còn " + unanswered + " câu chưa làm." : "Em đã làm hết các câu."} Sau khi nộp, em không sửa được nữa.</p>
            {state.questions.some((x) => x.type === "essay") && <p className="exam-note">Em nhớ đã đính kèm ảnh bài tự luận chưa?</p>}
            <div className="exam-modal-actions">
              <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => setConfirming(false)}>Làm tiếp</button>
              <button type="button" className="lesson-button lesson-button-success" disabled={busy} onClick={() => { submitting.current = true; void doSubmit(); }}>{busy ? "Đang nộp…" : "Nộp bài"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
