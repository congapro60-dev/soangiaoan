"use client";
import { LessonModePanel } from "../../components/lesson/LessonModePanel";
import { ClassEventPanel } from "../../components/lesson/ClassEventPanel";
import { ValueReflection, type ValueReflectionData } from "../../components/lesson/ValueReflection";
import { PracticePanel } from "../../components/lesson/PracticePanel";
import { TutorPanel } from "../../components/lesson/TutorPanel";
import { SessionRules } from "../../components/lesson/SessionRules";

import React, { useState, useEffect, useCallback, useRef } from "react";
import MathText from "../../components/lesson/MathText";
import TaskInput from "../../components/lesson/TaskInput";
import LessonThemedRoute, { getSafeWorldMetadata } from "../../components/lesson/LessonThemedRoute";
import { LessonMascotChip, LessonMascotPicker } from "../../components/lesson/LessonMascotPicker";
import { LessonMapStage } from "../../components/lesson/LessonMapStage";
import { LessonEncounterSheet } from "../../components/lesson/LessonEncounterSheet";
import { useLessonSession, formatDuration, type LessonPassportCard, type LessonProjection } from "../../components/lesson/useLessonSession";
import { useLessonMedia } from "../../components/lesson/useLessonMedia";
import "../lessons/lesson.css";

// Height of the pupil's top bar; the map keeps this much free at its top edge.
const HUD_HEIGHT = 56;

interface StudentTask {
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
}

interface StudentSubmission {
  submissionId?: string;
  taskId?: string;
  activityId?: string;
  answer?: unknown;
  ok?: boolean;
  assessmentStatus?: string;
  assisted?: boolean;
  at?: number;
}

interface ExtensionProjection {
  authored?: boolean;
  eligible?: boolean;
  reasonCode?: string | null;
  displaySafe?: boolean;
}

interface GroupWalletProjection {
  earned?: number;
  bonus?: number;
}

export interface PublicArenaEntry {
  id: string;
  name: string;
  mascot: number;
  match: number;
  correct: number;
  step: number;
  hp: number;
  knockdowns: number;
  downs: number;
  rank: number | null;
  outcome: string | null;
  reward: number;
  lastAt: number;
  withdrawn: boolean;
}

export interface PublicArenaBracketMatch {
  match: number;
  bye: boolean;
  left: { id: string; name: string; correct: number; knockdowns: number } | null;
  right: { id: string; name: string; correct: number; knockdowns: number } | null;
}

export interface PublicArenaQuestion {
  question: string;
  topic?: string;
  category?: string;
  points: number;
  task?: StudentTask;
}

export interface PublicArenaOpponent {
  id: string;
  name: string;
  mascot: number;
  hp: number;
  correct: number;
  knockdowns: number;
  shielded: boolean;
}

export interface PublicArenaOwn {
  step: number;
  correct: number;
  wrong: number;
  lastAt: number;
  resource: number;
  hp: number;
  shieldUntil: number;
  stunnedUntil: number;
  attackReadyAt: number;
  stunReadyAt: number;
  assistReadyAt: number;
  assists: number;
  assistsLeft: number;
  bye: boolean;
  mascot: number;
  rank: number | null;
  outcome: string | null;
  reward: number;
  return: string | null;
  question: PublicArenaQuestion | null;
  opponent: PublicArenaOpponent | null;
}

export interface PublicArenaProjection {
  id: string;
  type: "arena";
  theme: string;
  phase: "countdown" | "fighting" | "results" | "done";
  openedAt: number;
  startAt: number;
  finishAt: number;
  resumeAt: number;
  duration: number;
  questions: number;
  spectator: boolean;
  bracket: PublicArenaBracketMatch[];
  entries: PublicArenaEntry[];
  own?: PublicArenaOwn | null;
}

export interface LessonArenaStudentPanelProps {
  arena: PublicArenaProjection | null | undefined;
  serverNow?: number;
  isInputDisabled?: boolean;
  isSubmitting?: boolean;
  learnerId?: string | null;
  onAnswerSubmit?: (answer: unknown, step: number) => Promise<void> | void;
  onCombatAction?: (action: "attack" | "guard" | "assist" | "stun", targetId?: string) => Promise<void> | void;
}

const MASCOT_ICONS = ["🐉", "🐯", "🦅", "🐢", "🐺", "🦁", "🦊", "🐴"];
export function getMascotIcon(index?: number): string {
  return MASCOT_ICONS[Math.abs(index ?? 0) % MASCOT_ICONS.length] || "🥋";
}

export function LessonArenaStudentPanel({
  arena,
  serverNow,
  isInputDisabled = false,
  isSubmitting = false,
  learnerId,
  onAnswerSubmit,
  onCombatAction,
}: LessonArenaStudentPanelProps) {
  const [prevKey, setPrevKey] = useState("");
  const [answerText, setAnswerText] = useState("");
  const currentStep = arena?.own?.step ?? 0;
  const arenaId = arena?.id ?? "";
  const currentKey = `${arenaId}:${currentStep}`;

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setAnswerText("");
  }

  if (!arena) return null;

  const now = serverNow ?? 0;
  const own = arena.own;
  const phase = arena.phase;
  const isStunned = own ? now < (own.stunnedUntil || 0) : false;
  const isAnswerCooldown = own ? now - (own.lastAt || 0) < 2000 : false;
  const hasQuestion = Boolean(own?.question);

  const canSubmitAnswer =
    !isInputDisabled &&
    !isSubmitting &&
    phase === "fighting" &&
    hasQuestion &&
    !isStunned &&
    !isAnswerCooldown &&
    answerText.trim().length > 0;

  const commonCombatDisabled =
    isInputDisabled ||
    isSubmitting ||
    phase !== "fighting" ||
    arena.spectator ||
    !own ||
    isStunned;

  const isAttackDisabled =
    commonCombatDisabled ||
    (own?.resource || 0) < 1 ||
    now < (own?.attackReadyAt || 0) ||
    !own?.opponent ||
    Boolean(own?.bye);

  const isGuardDisabled =
    commonCombatDisabled ||
    (own?.resource || 0) < 1 ||
    now < (own?.shieldUntil || 0);

  const assistTarget = learnerId ? arena.entries.find(entry => entry.id !== learnerId && entry.id !== own?.opponent?.id && !entry.withdrawn) : undefined;
  const isAssistDisabled =
    commonCombatDisabled ||
    !assistTarget ||
    (own?.resource || 0) < 1 ||
    now < (own?.assistReadyAt || 0) ||
    (own?.assistsLeft ?? 0) <= 0 ||
    (own?.assists || 0) >= 3;

  const isStunDisabled =
    commonCombatDisabled ||
    (own?.resource || 0) < 2 ||
    now < (own?.stunReadyAt || 0) ||
    !own?.opponent ||
    Boolean(own?.bye);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitAnswer || !own) return;
    onAnswerSubmit?.(answerText.trim(), own.step);
  };

  const handleCombat = (action: "attack" | "guard" | "assist" | "stun") => {
    if (action === "assist" && !assistTarget) return;
    onCombatAction?.(action, action === "assist" ? assistTarget?.id : own?.opponent?.id);
  };

  const phaseTimer =
    phase === "countdown"
      ? Math.max(0, Math.ceil(((arena.startAt || 0) - now) / 1000))
      : phase === "fighting"
      ? Math.max(0, Math.ceil(((arena.finishAt || 0) - now) / 1000))
      : phase === "results"
      ? Math.max(0, Math.ceil(((arena.resumeAt || 0) - now) / 1000))
      : 0;

  return (
    <section className="lesson-arena-panel" aria-label="Lôi Đài Ngũ Ấn">
      {/* Header */}
      <div className="arena-header">
        <div className="arena-header-left">
          <span className="arena-kicker">ĐẠI HỘI VÕ THUẬT TOÁN HỌC</span>
          <h2 className="arena-title">⚔️ Lôi Đài Ngũ Ấn · Long Thành</h2>
        </div>
        <div className="arena-header-right">
          <span className={`arena-phase-badge arena-phase-${phase}`}>
            {phase === "countdown" && "⏱️ Chuẩn bị"}
            {phase === "fighting" && "⚔️ Đang đấu"}
            {phase === "results" && "🏆 Kết quả"}
            {phase === "done" && "🏁 Đã kết thúc"}
          </span>
          {phase !== "done" && (
            <span className="arena-timer-huge">{phaseTimer}s</span>
          )}
        </div>
      </div>

      <p className="arena-notice">
        Đồng hồ hoạt động bài học đang tạm dừng. Điểm thưởng Lôi Đài được ghi nhận riêng và không làm thay đổi Hộ chiếu thành thạo cá nhân.
      </p>

      {/* Duel Fighter Comparison */}
      {arena.spectator || !own ? (
        <div className="task-status-banner task-status-pending" style={{ marginBottom: "1rem" }}>
          👀 Bạn đang theo dõi trận Lôi Đài với vai trò khán giả. Ván chính sẽ tự động tiếp tục khi trận đấu kết thúc.
        </div>
      ) : (
        <div className="arena-duel-grid">
          {/* Mine */}
          <div
            className={`arena-fighter-card arena-fighter-mine ${
              isStunned
                ? "arena-fighter-stunned"
                : now < (own.shieldUntil || 0)
                ? "arena-fighter-guarded"
                : ""
            }`}
          >
            <div className="arena-fighter-top">
              <div className="arena-mascot-avatar" role="img" aria-label="Linh vật của bạn">
                {getMascotIcon(own.mascot)}
              </div>
              <div>
                <div className="arena-fighter-name">Bạn (Em)</div>
                <div className="arena-hp-display">
                  Máu:{" "}
                  <span className="arena-hp-hearts" role="img" aria-label={`${own.hp} trên 3 máu`}>
                    {[0, 1, 2].map((i) => (i < own.hp ? "❤️" : "🖤")).join(" ")}
                  </span>
                  <span>({own.hp}/3)</span>
                </div>
              </div>
            </div>
            <div className="arena-resource-meter">
              <span>
                ⚡ Linh khí: <strong>{own.resource}/5</strong>
              </span>
            </div>
            <div>
              {isStunned ? (
                <span className="arena-status-pill arena-status-stunned">⚡ Đang choáng</span>
              ) : now < (own.shieldUntil || 0) ? (
                <span className="arena-status-pill arena-status-guarded">🛡️ Khiên bảo vệ</span>
              ) : (
                <span className="arena-status-pill arena-status-ready">⚔️ Sẵn sàng</span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--lesson-text-muted)" }}>
              {own.correct} câu đúng · {arena.entries.find((e) => e.id === learnerId)?.knockdowns || 0} lần hạ
            </div>
          </div>

          <div className="arena-vs-divider">VS</div>

          {/* Opponent */}
          {own.bye || !own.opponent ? (
            <div className="arena-fighter-card arena-fighter-theirs">
              <div className="arena-fighter-top">
                <div className="arena-mascot-avatar">🛡️</div>
                <div>
                  <div className="arena-fighter-name">Miễn đấu</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--lesson-text-muted)" }}>
                    Lượt này bạn được miễn đấu do số người lẻ
                  </div>
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--lesson-text-muted)", margin: 0 }}>
                Bạn vẫn nhận điểm tham dự; giải Toán nạp linh khí để hỗ trợ đồng môn.
              </p>
            </div>
          ) : (
            <div
              className={`arena-fighter-card arena-fighter-theirs ${
                own.opponent.shielded ? "arena-fighter-guarded" : ""
              }`}
            >
              <div className="arena-fighter-top">
                <div
                  className="arena-mascot-avatar"
                  role="img"
                  aria-label={`Linh vật đối thủ ${own.opponent.name}`}
                >
                  {getMascotIcon(own.opponent.mascot)}
                </div>
                <div>
                  <div className="arena-fighter-name">{own.opponent.name}</div>
                  <div className="arena-hp-display">
                    Máu:{" "}
                    <span
                      className="arena-hp-hearts"
                      role="img"
                      aria-label={`Đối thủ còn ${own.opponent.hp} trên 3 máu`}
                    >
                      {[0, 1, 2].map((i) => (i < (own.opponent?.hp || 0) ? "❤️" : "🖤")).join(" ")}
                    </span>
                    <span>({own.opponent.hp}/3)</span>
                  </div>
                </div>
              </div>
              <div>
                {own.opponent.shielded ? (
                  <span className="arena-status-pill arena-status-guarded">🛡️ Khiên bảo vệ</span>
                ) : (
                  <span className="arena-status-pill arena-status-ready">⚔️ Sẵn sàng</span>
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--lesson-text-muted)" }}>
                {own.opponent.correct} câu đúng · {own.opponent.knockdowns} lần hạ
              </div>
            </div>
          )}
        </div>
      )}

      {/* Countdown Phase */}
      {phase === "countdown" && (
        <div className="arena-challenge-box" style={{ textAlign: "center" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#fbbf24" }}>Chuẩn bị lên đài!</h3>
          <p style={{ margin: "0 0 0.75rem 0", color: "var(--lesson-text-muted)" }}>
            {arena.questions} câu hỏi ngắn trong {arena.duration} giây. Mỗi câu trả lời đúng nạp 1 linh khí để tung chiêu thức.
          </p>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>
            Khai chiến trong: {phaseTimer}s
          </div>
        </div>
      )}

      {/* Fighting Phase */}
      {phase === "fighting" && own && (
        <>
          <div className="arena-challenge-box">
            {isStunned ? (
              <div className="task-status-banner task-status-pending" style={{ margin: 0 }}>
                ⚡ Linh vật đang choáng. Chờ hết choáng rồi nhận câu tiếp theo.
              </div>
            ) : own.question ? (
              <>
                <div className="arena-question-meta">
                  <span className="arena-question-topic">
                    {own.question.topic || "Toán 11"}
                    {own.question.category ? ` · ${own.question.category}` : ""}
                  </span>
                  <span className="arena-question-points">+{own.question.points} điểm</span>
                </div>
                <div className="arena-question-prompt">
                  <MathText text={own.question.question} inline={false} />
                </div>
                {own.question.task ? (
                  <TaskInput
                    key={`${arenaId}:${own.step}`}
                    task={own.question.task}
                    disabled={isInputDisabled || isSubmitting || isStunned || isAnswerCooldown}
                    onSubmit={answer => onAnswerSubmit?.(answer, own.step)}
                  />
                ) : (
                <form onSubmit={handleSubmit} className="arena-answer-form">
                  <input
                    type="text"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Nhập đáp án (ví dụ: số, phân số a/b)..."
                    className="lesson-input arena-answer-input"
                    disabled={isInputDisabled || isSubmitting || isStunned || isAnswerCooldown}
                    maxLength={40}
                    aria-label="Đáp án câu hỏi Lôi Đài"
                  />
                  <button
                    type="submit"
                    className="lesson-button lesson-button-primary arena-submit-btn"
                    disabled={!canSubmitAnswer}
                  >
                    {isAnswerCooldown ? "Chờ 2s..." : "Nộp đáp án · Nạp linh khí"}
                  </button>
                </form>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: "var(--lesson-text-muted)" }}>
                {own.step >= arena.questions
                  ? "Bạn đã trả lời hết các câu hỏi của trận Lôi Đài! Hãy dùng linh khí còn lại để ra chiêu thức."
                  : "Đang tải câu hỏi tiếp theo..."}
              </p>
            )}
          </div>

          {/* Combat Actions Bar */}
          <div className="arena-actions-section">
            <div className="arena-actions-title">
              <span>CHIÊU THỨC LINH VẬT</span>
              <span>
                Linh khí: <strong>{own.resource}/5</strong>
              </span>
            </div>
            <div className="arena-actions-grid">
              <button
                type="button"
                className="arena-combat-btn attack"
                onClick={() => handleCombat("attack")}
                disabled={isAttackDisabled}
                aria-label="Đánh: trừ 1 máu đối thủ, cần 1 linh khí"
              >
                <span>⚔️ Đánh</span>
                <small>
                  1 linh khí
                  {now < (own.attackReadyAt || 0)
                    ? ` (${Math.ceil(((own.attackReadyAt || 0) - now) / 1000)}s)`
                    : ""}
                </small>
              </button>

              <button
                type="button"
                className="arena-combat-btn guard"
                onClick={() => handleCombat("guard")}
                disabled={isGuardDisabled}
                aria-label="Khiên: chặn đòn 3 giây, cần 1 linh khí"
              >
                <span>🛡️ Khiên</span>
                <small>
                  1 linh khí{now < (own.shieldUntil || 0) ? " (Đang mở)" : ""}
                </small>
              </button>

              <button
                type="button"
                className="arena-combat-btn assist"
                onClick={() => handleCombat("assist")}
                disabled={isAssistDisabled}
                aria-label="Trợ lực: tặng 1 linh khí cho đồng môn, cần 1 linh khí"
              >
                <span>🤝 Trợ lực</span>
                <small>1 linh khí (còn {own.assistsLeft})</small>
              </button>

              <button
                type="button"
                className="arena-combat-btn stun"
                onClick={() => handleCombat("stun")}
                disabled={isStunDisabled}
                aria-label="Trấn: gây choáng 3 giây, cần 2 linh khí"
              >
                <span>⚡ Trấn</span>
                <small>
                  2 linh khí
                  {now < (own.stunReadyAt || 0)
                    ? ` (${Math.ceil(((own.stunReadyAt || 0) - now) / 1000)}s)`
                    : ""}
                </small>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Results / Done Phase */}
      {(phase === "results" || phase === "done") && own && (
        <div className="arena-results-card">
          <div
            className="arena-results-outcome"
            style={{
              color:
                own.outcome === "win"
                  ? "#34d399"
                  : own.outcome === "draw"
                  ? "#38bdf8"
                  : own.outcome === "bye"
                  ? "#fbbf24"
                  : "#94a3b8",
            }}
          >
            {own.outcome === "win"
              ? "🎉 Thắng trận!"
              : own.outcome === "draw"
              ? "🤝 Kết quả Hòa"
              : own.outcome === "bye"
              ? "🛡️ Miễn đấu"
              : "🎖️ Hoàn thành trận đấu"}
          </div>
          <div className="arena-results-stats">
            <span>
              Hạng: <strong>{own.rank ? `#${own.rank}` : "—"}</strong>
            </span>
            <span>
              Số câu đúng: <strong>{own.correct}</strong>
            </span>
            <span>
              Điểm thưởng Lôi Đài: <strong>+{own.reward} điểm</strong>
            </span>
          </div>
          <p
            style={{
              fontSize: "0.825rem",
              color: "var(--lesson-text-muted)",
              margin: "0.5rem 0 0 0",
            }}
          >
            * Điểm thưởng Lôi Đài được ghi nhận độc lập vào ví điểm và không thay đổi chuẩn thành thạo trong Hộ chiếu học tập.
          </p>
        </div>
      )}

      {/* Bracket & Leaderboard Details */}
      <details className="arena-bracket-details">
        <summary>Bảng thi đấu & Xếp hạng ({arena.entries.length} đấu sĩ)</summary>
        {arena.bracket && arena.bracket.length > 0 && (
          <div className="arena-bracket-matches">
            {arena.bracket.map((b) => (
              <div key={b.match} className="arena-match-card">
                <div className="arena-match-combatant">
                  <strong>{b.left?.name || "—"}</strong>
                  <small>
                    {b.left?.correct ?? 0} đúng · {b.left?.knockdowns ?? 0} hạ
                  </small>
                </div>
                <span className="arena-match-vs">VS</span>
                <div className="arena-match-combatant" style={{ textAlign: "right" }}>
                  <strong>{b.bye ? "Miễn đấu" : b.right?.name || "—"}</strong>
                  {!b.bye && (
                    <small>
                      {b.right?.correct ?? 0} đúng · {b.right?.knockdowns ?? 0} hạ
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <table className="arena-roster-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Đấu sĩ</th>
              <th>Số câu đúng</th>
              <th>Hạ gục</th>
              {(phase === "results" || phase === "done") && <th>Thưởng</th>}
            </tr>
          </thead>
          <tbody>
            {arena.entries.map((p) => (
              <tr key={p.id} style={{ fontWeight: p.id === learnerId ? 700 : 400 }}>
                <td>{p.rank ? `#${p.rank}` : "—"}</td>
                <td>
                  {getMascotIcon(p.mascot)} {p.name} {p.id === learnerId ? "(Em)" : ""}
                </td>
                <td>{p.correct}</td>
                <td>{p.knockdowns}</td>
                {(phase === "results" || phase === "done") && (
                  <td style={{ color: "#34d399" }}>+{p.reward}đ</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function generate32ByteBase64Url(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getOrCreateBearer(code: string, name: string): { token: string; requestId: string } {
  const cleanCode = code.trim().toUpperCase();
  const person = encodeURIComponent(name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase());
  const tokenKey = `lesson_bearer_${cleanCode}_${person}`;
  const reqKey = `lesson_req_${cleanCode}_${person}`;
  let token = sessionStorage.getItem(tokenKey);
  if (!token) {
    token = generate32ByteBase64Url();
    sessionStorage.setItem(tokenKey, token);
  }
  let requestId = sessionStorage.getItem(reqKey);
  if (!requestId) {
    requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(reqKey, requestId);
  }
  return { token, requestId };
}

export default function PlayPage() {
  const [code, setCode] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [restoredLearnerId, setLearnerId] = useState<string | null>(null);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [isSessionRestored, setIsSessionRestored] = useState<boolean>(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code");
      try {
        const restoredSessionId=sessionStorage.getItem("lesson_active_session_id");
        setSessionId(restoredSessionId);
        if(!restoredSessionId&&codeParam&&/^[A-Za-z0-9]{6}$/.test(codeParam))setCode(current=>current||codeParam.toUpperCase());
        setLearnerId(sessionStorage.getItem("lesson_active_learner_id"));
        setBearerToken(sessionStorage.getItem("lesson_active_token"));
      } catch {
        setJoinError("Trình duyệt đang chặn lưu phiên. Cho phép lưu phiên để vào lại phòng trên thiết bị này.");
      } finally {
        setIsSessionRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Hook for student session polling
  const {
    view,
    serverNow,
    error: sessionError,
    isSubmitting,
    dispatchCommand,
    getRemainingMs,
  } = useLessonSession({
    sessionId,
    role: "student",
    bearerToken,
    enabled: Boolean(sessionId && bearerToken),
    pollIntervalMs: 3000,
  });

  const learnerId = view?.learnerId || restoredLearnerId;
  const [showMediaSettings, setShowMediaSettings] = useState<boolean>(false);
  const [reflection, setReflection] = useState<ValueReflectionData>({ integrity:false,usedAI:false,aiHelp:"",ownChanges:"",reflection:"" });
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Hook for student lesson media feedback
  const media = useLessonMedia({
    view,
    role: "student",
  });

  // Handle Join
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setJoinError("Mã phòng phải gồm 6 ký tự.");
      return;
    }
    if (!cleanName || cleanName.length > 40) {
      setJoinError("Vui lòng nhập họ và tên (tối đa 40 ký tự).");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const { token, requestId } = getOrCreateBearer(cleanCode, cleanName);
      const res = await fetch("/api/lesson-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "join",
          ...(sessionStorage.getItem("lesson_class_passport_token") ? { classToken: sessionStorage.getItem("lesson_class_passport_token") } : {}),
          code: cleanCode,
          name: cleanName,
          requestId,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        projection?: { id: string };
        learnerId?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Không thể vào phòng học.");
      }

      const returnedSessionId = data.projection?.id || "";
      const returnedLearnerId = data.learnerId || "";

      sessionStorage.setItem("lesson_active_session_id", returnedSessionId);
      sessionStorage.setItem("lesson_active_learner_id", returnedLearnerId);
      sessionStorage.setItem("lesson_active_token", token);

      setSessionId(returnedSessionId);
      setLearnerId(returnedLearnerId);
      setBearerToken(token);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      const joinMessages: Record<string, string> = {
        NOT_FOUND: "Không tìm thấy phòng với mã này. Em kiểm tra lại mã 6 ký tự nhé.",
        NAME_TAKEN: "Đã có bạn dùng tên này trong lớp. Em thêm tên đệm hoặc một chữ cái (ví dụ \"Nguyễn Văn An B\") rồi thử lại.",
        LEARNER_IDENTITY_MISMATCH: "Thiết bị này đã vào lớp bằng một tên khác. Em dùng đúng tên lúc trước hoặc hỏi thầy cô.",
        FORBIDDEN: "Em không vào lại phòng này được (đã rời lớp hoặc thầy cô đã gỡ). Hãy hỏi thầy cô.",
        JOIN_CONFLICT: "Lớp đang rất đông. Em bấm \"Tham gia lớp học\" lại sau vài giây nhé.",
        INVALID_BODY: "Mã phòng hoặc tên chưa hợp lệ. Em kiểm tra lại nhé.",
      };
      setJoinError(joinMessages[code] || (code && /^[A-Z_]+$/.test(code) ? "Chưa vào được phòng học. Em thử lại hoặc hỏi thầy cô." : code) || "Lỗi kết nối tới máy chủ.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = () => {
    sessionStorage.removeItem("lesson_active_session_id");
    sessionStorage.removeItem("lesson_active_learner_id");
    sessionStorage.removeItem("lesson_active_token");
    setSessionId(null);
    setLearnerId(null);
    setBearerToken(null);
  };

  // Remaining time and disabled state
  const remainingMs = getRemainingMs();
  const isSessionPaused = view?.status === "paused";
  const isSessionConcluded = view?.status === "concluded";
  const isActivityLocked = Boolean(view?.timeline?.locked);
  const isActivityExpired = remainingMs !== null && remainingMs <= 0;
  const isInputDisabled =
    !view ||
    view?.status === "waiting" ||
    isSessionPaused ||
    isSessionConcluded ||
    isActivityLocked ||
    isActivityExpired;
  const arenaPhase = (view?.arena as PublicArenaProjection | undefined)?.phase;
  const isMainInputDisabled = isInputDisabled || Boolean(arenaPhase && arenaPhase !== 'done');
  const ownMapPeer = view?.map?.peers.find((peer) => peer.own);
  const worldMeta = getSafeWorldMetadata((view?.gamePlan as { theme?: string } | undefined)?.theme);
  const ownAtGate = Boolean(ownMapPeer && view?.map && ownMapPeer.position >= (view.map.gatePosition ?? 0));

  // The first picture of a room is the map alone. After that, a new activity, the lesson starting or the arena
  // opening brings the task pop-up up by itself; the pupil can always close it to look at the map.
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [pickerSkipped, setPickerSkipped] = useState(false);
  const [seenMoment, setSeenMoment] = useState<string | null>(null);
  const moment = view ? `${view.timeline?.currentActivityId ?? ""}|${view.status ?? ""}|${arenaPhase ?? ""}` : null;
  if (moment !== null && moment !== seenMoment) {
    setSeenMoment(moment);
    if (seenMoment !== null && view?.status === "active") setEncounterOpen(true);
  }
  const closeEncounter = useCallback(() => setEncounterOpen(false), []);
  const arriveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleArrive = useCallback(() => {
    // Let the mascot finish walking onto the gate before the task covers the map.
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (arriveTimer.current) clearTimeout(arriveTimer.current);
    arriveTimer.current = setTimeout(() => setEncounterOpen(true), reduced ? 0 : 1600);
  }, []);
  useEffect(() => () => { if (arriveTimer.current) clearTimeout(arriveTimer.current); }, []);
  const needsMascot = Boolean(view?.status !== "concluded" && ownMapPeer && !ownMapPeer.chosen && !pickerSkipped);
  const chooseMascot = async (mascot: number) => {
    const res = await dispatchCommand("CHOOSE_MASCOT", { mascot });
    return { ok: Boolean(res.ok), error: res.error };
  };

  // Handle draft saving
  const handleSaveDraft = useCallback(
    (taskId: string, answer: unknown) => {
      if (!sessionId || !learnerId || !view) return;
      const currentActId = view.timeline?.currentActivityId || "";
      const draftKey = `draft_${sessionId}_act_${currentActId}_round_${view.round}_task_${taskId}_learner_${learnerId}`;
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(answer));
      } catch {
        // ignore storage limits
      }
      void dispatchCommand("SAVE_DRAFT", { taskId, answer });
    },
    [sessionId, learnerId, view, dispatchCommand]
  );

  if (!isSessionRestored) {
    return (
      <main className="lesson-shell">
        <p>Đang khôi phục phiên học...</p>
      </main>
    );
  }

  // If not joined, show Clean Code + Name Join form
  if (!sessionId || !bearerToken) {
    return (
      <main className="lesson-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="lesson-card" style={{ maxWidth: 460, width: "100%" }}>
          <p className="lesson-kicker">LỚP HỌC TOÁN 11</p>
          <h1 className="lesson-title" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Tham gia phòng học
          </h1>

          <div className="play-notice-banner" style={{ marginBottom: "1.5rem" }}>
            <strong>Lưu ý thiết bị dùng chung:</strong> Ứng dụng ghi nhận minh chứng cá nhân theo từng tài khoản.
            Nếu dùng chung thiết bị, học sinh cần đăng ký và làm bài theo lượt để đảm bảo chuẩn đầu ra.
          </div>

          {joinError && (
            <div className="task-status-banner task-status-error" style={{ marginBottom: "1rem" }}>
              {joinError}
            </div>
          )}

          <p><a href="/passport">Vào hồ sơ lớp bằng mã và PIN trước khi tham gia phòng đã gắn lớp.</a></p>
        <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="room-code-input" className="task-label">
                Mã phòng học (6 ký tự):
              </label>
              <input
                id="room-code-input"
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: A1B2C3"
                className="lesson-input"
                style={{ fontSize: "1.25rem", letterSpacing: "2px", fontWeight: "bold" }}
                disabled={isJoining}
              />
            </div>

            <div>
              <label htmlFor="student-name-input" className="task-label">
                Họ và tên của em:
              </label>
              <input
                id="student-name-input"
                type="text"
                required
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="lesson-input"
                disabled={isJoining}
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || !code.trim() || !name.trim()}
              className="lesson-button lesson-button-primary"
              style={{ marginTop: "0.5rem", padding: "0.75rem" }}
            >
              {isJoining ? "Đang kết nối..." : "Tham gia lớp học"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const tasksList = (view?.tasks || []) as StudentTask[];
  const submissionsList = (view?.submissions || []) as StudentSubmission[];
  const diceTrack = (view?.diceTrack || { position: 0 }) as { position?: number };
  const groupWallet = (view?.group as { wallet?: GroupWalletProjection } | undefined)?.wallet;
  const extensionProj = view?.extension as ExtensionProjection | undefined;

  return (
    <main className={`lesson-shell play-game ${media.settings.reducedMotion ? "lesson-media-reduced-motion" : ""}`}>
      <div style={{position:"fixed",top:HUD_HEIGHT+4,left:10,right:10,zIndex:19,maxHeight:"calc(100dvh - 120px)",overflowY:"auto"}}>
        <SessionRules worldTitle={worldMeta.name} rule={view?.lessonMode?.rule || (view?.gamePlan as {rule?:string})?.rule} participation={view?.lessonMode?.participation || (view?.gamePlan as {participation?:string})?.participation} eventLabel={view?.classEvent?.status==="active"?view.classEvent.label:undefined}/>
      </div>
      {/* The campaign map is the game: it fills the screen and everything else floats over it */}
      <LessonMapStage
        onSelectBranch={async branch=>{const result=await dispatchCommand("SELECT_BRANCH",{branch});if(!result.ok)alert(LEVEL_ERRORS[result.code||""]||"Chưa đổi được mức. Kiểm tra điều kiện rồi thử lại.");}}
        onGateSelect={async activityId => { await dispatchCommand("REVISIT", { activityId }); setEncounterOpen(true); }}
        fullscreen
        topInset={HUD_HEIGHT+120}
        map={view?.map}
        themeKey={(view?.gamePlan as { theme?: string } | undefined)?.theme}
        sessionKey={sessionId || "preview"}
        disabled={isMainInputDisabled}
        onArrive={handleArrive}
        onOpenTask={() => setEncounterOpen(true)}
        onRoll={async () => {
          const res = await dispatchCommand("ROLL", {});
          if (res.ok) media.triggerReaction("dice");
          return { ok: Boolean(res.ok), error: res.error, die: (res.result as { die?: number } | undefined)?.die };
        }}
      />

      <div className="play-hud-top">
        <header className="play-hud-bar">
          <div className="play-hud-id">
            {ownMapPeer && <LessonMascotChip spriteImage={worldMeta.spriteImage} mascots={worldMeta.mascots} mascot={ownMapPeer.mascot} />}
            <strong className="play-hud-name">{view?.learnerName || view?.passport?.name || ownMapPeer?.name || "Học sinh"}</strong>
          </div>
          <div className="play-hud-right">
            {!media.isUnlocked && (
              <button
                type="button"
                className="play-menu-btn lesson-media-enable-btn"
                onClick={media.unlockAudio}
                title="Bật âm thanh và hiệu ứng phản hồi học tập"
                aria-label="Bật phản hồi"
              >
                🔊
              </button>
            )}
            <span
              className="play-hud-pill play-learner-wallet"
              title="Ví cá nhân độc lập trong Hộ chiếu học tập (không phụ thuộc điểm nhóm)"
            >
              🎖️ {view?.wallet?.earned || 0}
            </span>
            {groupWallet && (
              <span className="play-hud-pill play-group-wallet" title="Quỹ thưởng nhóm hợp tác (tách biệt với Hộ chiếu thành thạo cá nhân)">
                👥 Nhóm: {groupWallet.earned || 0}
              </span>
            )}
            <button
              type="button"
              className="play-menu-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Menu"
            >
              ☰
            </button>
            {menuOpen && (
              <div className="play-menu" role="menu">
                {media.isUnlocked && (
                  <button type="button" role="menuitem" onClick={media.toggleMaster}>
                    {media.settings.master ? "🔊 Phản hồi: Bật" : "🔇 Phản hồi: Tắt"}
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => { setShowMediaSettings(true); setEncounterOpen(true); setMenuOpen(false); }}>
                  ⚙️ Cài đặt phản hồi
                </button>
                <button type="button" role="menuitem" className="play-menu-danger" onClick={handleLeave}>
                  Rời phòng
                </button>
              </div>
            )}
          </div>
        </header>
      </div>

        {/* Media Reaction Banner */}
        {media.activeReaction && (
          <aside
            className={`lesson-media-reaction-banner ${
              media.settings.reducedMotion ? "lesson-media-no-pulse" : "lesson-media-pulse"
            }`}
            role="status"
            aria-live="polite"
            aria-label="Phản hồi trải nghiệm học tập"
          >
            <span className="lesson-media-reaction-icon" aria-hidden="true">
              {media.activeReaction.reaction}
            </span>
            <div className="lesson-media-reaction-content">
              <span className="lesson-media-reaction-text">{media.activeReaction.text}</span>
              <span className="lesson-media-disclaimer">
                Phản hồi học tập định hướng sư phạm · Không đánh giá thành thạo bằng tốc độ hoặc điểm số
              </span>
            </div>
            <button
              type="button"
              className="lesson-media-reaction-close"
              onClick={media.clearReaction}
              aria-label="Đóng phản hồi"
            >
              ×
            </button>
          </aside>
        )}

      <button
        type="button"
        className={`play-encounter-fab${ownAtGate && !encounterOpen ? " play-encounter-fab-attention" : ""}`}
        onClick={() => setEncounterOpen(true)}
        aria-haspopup="dialog"
        aria-label="Nhiệm vụ"
      >
        <span aria-hidden="true">📜</span>
        <span className="play-encounter-fab-label">Nhiệm vụ</span>
      </button>

      <LessonEncounterSheet
        open={encounterOpen}
        onClose={closeEncounter}
        kicker={view?.currentActivity?.phase ? "HOẠT ĐỘNG HỌC TẬP" : undefined}
        title="Nhiệm vụ của cổng"
      >
          {view?.lessonMode && <LessonModePanel view={view.lessonMode} disabled={isMainInputDisabled} onAction={async input=>{await dispatchCommand("MODE_ACTION",{...input,requestId:crypto.randomUUID()});}} />}
          {view?.lessonModeError && <p role="status">Bài học đã lưu. Hoàn thành bước chơi đang hiện trước khi nhận tiến độ chơi tiếp.</p>}
          {sessionError && (
            <div className="task-status-banner task-status-error">{sessionError}</div>
          )}

          {view?.clock?.startedAt != null && serverNow - view.clock.startedAt > 20 * 60 * 1000 && <p className="lesson-muted">Đã dùng màn hình một lúc. Khi thầy cô cho nghỉ, em nhìn xa và thả lỏng mắt.</p>}
          {Array.isArray(view?.valueBadges) && view.valueBadges.length>0 && <details className="lesson-card" style={{padding:"1rem"}}><summary>Giá trị em đã thể hiện</summary>{(view.valueBadges as Array<{valueId:string;reason:string;revokedAt?:number}>).filter(badge=>!badge.revokedAt).map((badge,index)=><p key={index}>{badge.valueId}: {badge.reason}</p>)}</details>}
          {view?.storyCue && <details className="lesson-card" style={{ padding: "1rem" }}><summary>Manh mối hành trình</summary><p>{view.storyCue}</p></details>}

          <ClassEventPanel view={view?.classEvent || null} disabled={isSubmitting||isSessionPaused} onBuzz={async input=>{const result=await dispatchCommand("CLASS_EVENT_BUZZ",{...input,eventId:view?.classEvent?.id,requestId:crypto.randomUUID()});if(!result.ok)throw Error();}} onPick={async ({cellId})=>{await dispatchCommand("CLASS_EVENT_PICK",{cellId,eventId:view?.classEvent?.id,requestId:crypto.randomUUID()});}} onAnswer={async input => {const result=await dispatchCommand("CLASS_EVENT_ANSWER", {...input,eventId:view?.classEvent?.id,requestId:crypto.randomUUID()});if(!result.ok)throw Error();}} />
          {/* Status Notification Banners */}
          {isSessionPaused && (
            <div className="task-status-banner task-status-pending">
              ⏸️ Giáo viên đang tạm dừng tiết học. Các thao tác tạm thời bị khóa.
            </div>
          )}
          {isActivityLocked && !isSessionPaused && (
            <div className="task-status-banner task-status-pending">
              🔒 Hoạt động đang được khóa. Hãy lắng nghe hướng dẫn của thầy cô.
            </div>
          )}
          {view?.status === "waiting" && (
            <div className="task-status-banner task-status-pending">
              ⏳ Đang chờ giáo viên bắt đầu tiết học.
            </div>
          )}
          {isActivityExpired && !isSessionPaused && !isActivityLocked && !isSessionConcluded && (
            <div className="task-status-banner task-status-pending">
              ⏰ Đã hết giờ hoạt động này. Hãy chờ thầy cô chuyển sang hoạt động tiếp theo.
            </div>
          )}
          {isSessionConcluded && (
            <div className="task-status-banner task-status-success">
              🏁 Tiết học đã kết thúc. Cảm ơn em đã tích cực tham gia!
            </div>
          )}
          {isSessionConcluded && view?.passportCard && (
            <PassportCard card={view.passportCard} name={view?.learnerName || view?.passport?.name || ownMapPeer?.name || "Em"} />
          )}

          {/* Media Settings Panel */}
          {showMediaSettings && (
            <div className="lesson-card lesson-media-settings-panel" style={{ marginTop: "0.75rem", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <strong>Cài đặt phản hồi trải nghiệm học tập</strong>
                <button
                  type="button"
                  className="lesson-button lesson-button-outline"
                  style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem" }}
                  onClick={() => setShowMediaSettings(false)}
                >
                  Đóng
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.85rem" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={media.settings.sfx}
                    onChange={(e) => media.updateSettings({ sfx: e.target.checked })}
                  />
                  Âm thanh thao tác (SFX)
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={media.settings.meme}
                    onChange={(e) => media.updateSettings({ meme: e.target.checked })}
                  />
                  Thông điệp động viên
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={media.settings.effects}
                    onChange={(e) => media.updateSettings({ effects: e.target.checked })}
                  />
                  Hiệu ứng thị giác
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={media.settings.reducedMotion}
                    onChange={(e) => media.updateSettings({ reducedMotion: e.target.checked })}
                  />
                  Giảm chuyển động (Tắt rung lắc)
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  Âm lượng:
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={media.settings.volume}
                    onChange={(e) => media.updateSettings({ volume: Number(e.target.value) })}
                    style={{ width: "80px" }}
                  />
                  {media.settings.volume}%
                </label>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--lesson-text-muted)", marginTop: "0.5rem" }}>
                * Phản hồi âm thanh và hình ảnh mang tính định hướng học tập, không quy đổi thành điểm thành thạo.
              </div>
            </div>
          )}

        {ownMapPeer?.chosen && (
          <LessonMascotPicker
            spriteImage={worldMeta.spriteImage}
            mascots={worldMeta.mascots}
            current={ownMapPeer.mascot}
            chosen
            locked={view?.status !== "waiting"}
            disabled={!view}
            onChoose={chooseMascot}
          />
        )}

          {/* Themed Route Map & World Context */}
          <LessonThemedRoute
            gamePlan={view?.gamePlan}
            currentActivityIndex={view?.timeline?.activityIndex}
            currentPhase={view?.currentActivity?.phase}
            variant="student"
          />

          {/* Lôi Đài Ngũ Ấn Panel (when view.arena exists) */}
          {Boolean(view?.arena) && (
            <LessonArenaStudentPanel
              arena={view?.arena as PublicArenaProjection}
              serverNow={serverNow}
              isInputDisabled={isInputDisabled}
              isSubmitting={isSubmitting}
              learnerId={learnerId}
              onAnswerSubmit={async (ans, step) => {
                const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const res = await dispatchCommand("ARENA_ANSWER", {
                  answer: ans,
                  step,
                  requestId: reqId,
                });
                if (res.ok) {
                  const outcome = (res.result || {}) as { correct?: boolean };
                  media.triggerReaction(outcome.correct === false ? "wrong" : "correct");
                }
              }}
              onCombatAction={async (action, targetId) => {
                const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const res = await dispatchCommand("ARENA_COMBAT", {
                  action,
                  target: targetId,
                  requestId: reqId,
                });
                if (res.ok) {
                  media.triggerReaction("dice");
                }
              }}
            />
          )}

          {/* Current Activity Banner */}
          <section className="play-activity-banner" id="lesson-gate-task">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="lesson-kicker">
                {({ experience: "KHÁM PHÁ", guided: "CÙNG TÌM HIỂU", practice: "LUYỆN TẬP", group: "HỢP TÁC", recheck: "KIỂM TRA CÁ NHÂN", extension: "THỬ THÁCH MỞ RỘNG", exit: "TỔNG KẾT" } as Record<string, string>)[view?.currentActivity?.phase || ""] || "HOẠT ĐỘNG"}
              </span>
              <span
                className={`lesson-badge ${
                  isSessionPaused ? "lesson-badge-warning" : "lesson-badge-primary"
                }`}
              >
                ⏱️ {formatDuration(remainingMs)}
              </span>
            </div>

            <div style={{ fontSize: "1.05rem", lineHeight: 1.5, margin: "0.5rem 0" }}>
              <MathText text={view?.currentActivity?.studentAction} inline={false} />
            </div>

            {view?.mode === "live" && ["recheck","exit"].includes(view?.currentActivity?.phase || "") && !view?.integrityConfirmed && <label className="lesson-card" style={{display:"block",padding:"1rem"}}><input type="checkbox" onChange={event => { if(event.target.checked)void dispatchCommand("INTEGRITY",{confirmed:true,usedAI:reflection.usedAI}); }} /> Em giữ đúng cam kết: ghi rõ phần tự làm và phần đã dùng gợi ý hoặc AI.</label>}
            {view?.currentActivity?.phase === "reflection" && <ValueReflection policy={view.aiPolicy || "off"} value={reflection} onChange={setReflection} onSubmit={async () => { await dispatchCommand("VALUE_REFLECT",{reflection}); }} disabled={isSubmitting} />}
            <PracticePanel practice={view?.practice} gates={view?.revisitGates} enabled={view?.revisitEnabled !== false} busy={isSubmitting} onCommand={dispatchCommand} />
            <TutorPanel key={learnerId} tutor={view?.tutor} busy={isSubmitting} onCommand={dispatchCommand}/>
            {/* Level bar ("Đổi mức", plan 19.4) */}
            <LevelBar
              view={view}
              disabled={isMainInputDisabled}
              extension={extensionProj}
              onSelect={(branch) => dispatchCommand("SELECT_BRANCH", { branch })}
            />
          </section>

          {/* Group Collaboration Bar (If Activity has Group Mode) */}
          {view?.group && (
            <section className="lesson-card" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <strong>👥 Nhóm học tập ({view.group.memberIds?.length || 0} thành viên)</strong>
                  <span
                    className="lesson-badge"
                    style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontSize: "0.75rem" }}
                    title="Điểm thưởng nhóm không tự động chuyển thành thành thạo cá nhân"
                  >
                    Quỹ nhóm: {groupWallet?.earned || 0} điểm
                  </span>
                </div>
                {view.group.selectionDeadline ? (
                  <span className="lesson-badge lesson-badge-warning">
                    Chọn vai trò: {Math.max(0, Math.floor((view.group.selectionDeadline - (serverNow || 0)) / 1000))}s
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--lesson-text-muted)", marginBottom: "0.5rem" }}>
                * Phần thưởng nhóm được chia sẻ chung và tách biệt với Hộ chiếu thành thạo cá nhân.
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                {[
                  { id: "discover", label: "Phát hiện dữ kiện" },
                  { id: "represent", label: "Dựng biểu diễn" },
                  { id: "check", label: "Kiểm chứng" },
                  { id: "explain", label: "Giải thích, tổng hợp" },
                ].map((role) => {
                  const assignedMember = view.group?.roles?.[role.id];
                  const isMyRole = assignedMember === learnerId;
                  return (
                    <button
                      key={role.id}
                      className={`lesson-badge ${isMyRole ? "lesson-badge-success" : "lesson-badge-primary"}`}
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() => dispatchCommand("CHOOSE_ROLE", { roleId: role.id })}
                      disabled={isMainInputDisabled || (Boolean(assignedMember) && !isMyRole)}
                    >
                      {role.label} {isMyRole ? "(Em)" : assignedMember ? "(Đã nhận)" : ""}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active Tasks List */}
          <section className="play-tasks">
            {tasksList.length === 0 ? (
              <div className="lesson-card" style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--lesson-text-muted)" }}>
                  Không có nhiệm vụ nào cho phân nhánh hiện tại hoặc đang chuyển hoạt động.
                </p>
              </div>
            ) : (
              tasksList.map((task) => {
                const currentActId = view?.timeline?.currentActivityId || "";
                const draftKey = `draft_${sessionId}_act_${currentActId}_round_${view?.round}_task_${task.id}_learner_${learnerId}`;
                let initialDraft = null;
                try {
                  const stored = sessionStorage.getItem(draftKey);
                  if (stored) initialDraft = JSON.parse(stored);
                } catch {
                  // ignore
                }
                const draftsMap = (view?.drafts || {}) as Record<string, { answer?: unknown }>;
                if (!initialDraft && draftsMap[task.id]?.answer !== undefined) {
                  initialDraft = draftsMap[task.id].answer;
                }

                const sub = submissionsList.find((s) => s.taskId === task.id);
                const isGroupTask = task.participation === "group";
                const groupProducts = (view?.group?.products || {}) as Record<
                  string,
                  { answer: unknown; ok: boolean; submittedBy: string; at: number }
                >;

                return (
                  <div key={task.id} className="lesson-card" style={{ marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span className="lesson-badge">
                        {isGroupTask ? "Nhiệm vụ nhóm" : "Nhiệm vụ cá nhân"}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--lesson-text-muted)" }}>
                        Lộ trình: {task.branch === "support" ? "Hỗ trợ" : task.branch === "extension" ? "Mở rộng" : task.branch === "core" ? "Nhiệm vụ chính" : "Nhiệm vụ chung"}
                      </span>
                    </div>

                    <div style={{ fontSize: "1rem", lineHeight: 1.5, marginBottom: "1rem" }}>
                      <MathText text={task.prompt} inline={false} />
                    </div>

                    {view?.group?.proposal?.taskId === task.id && <div className="lesson-card" style={{ padding: "1rem" }}><p>Nhóm đã có đề xuất: {view.group.consent?.votes || 0}/{view.group.consent?.required || 1} phiếu cần thiết.</p><button className="lesson-button" disabled={isMainInputDisabled} onClick={() => void dispatchCommand("GROUP_VOTE", { taskId: task.id, proposalHash: view.group?.proposal?.hash })}>Đồng ý đề xuất này</button><button className="lesson-button" disabled={isMainInputDisabled || !view.group.consent?.approved} onClick={() => void dispatchCommand("GROUP_SUBMIT", { taskId: task.id, answer: view.group?.proposal?.answer, proposalHash: view.group?.proposal?.hash })}>Nộp sản phẩm đã thống nhất</button></div>}
                  <TaskInput
                      task={task}
                      disabled={isMainInputDisabled}
                      initialDraft={initialDraft}
                      submission={sub}
                      currentLearnerId={learnerId || undefined}
                      onSaveDraft={(ans) => handleSaveDraft(task.id, ans)}
                      onSubmit={async (ans) => {
                        const res = await dispatchCommand("SUBMIT", { taskId: task.id, answer: ans });
                        if (!res.ok) {
                          alert(res.error || "Nộp bài thất bại.");
                        } else if (!(res.result as { pending?: boolean } | undefined)?.pending) {
                          media.triggerReaction((res.result as { correct?: boolean } | undefined)?.correct === false ? "wrong" : "correct");
                        }
                      }}
                      onOpenHint={async (hintId) => {
                        const res = await dispatchCommand("HINT", { taskId: task.id, hintId });
                        if (!res.ok) {
                          alert(res.error || "Mở gợi ý thất bại.");
                        } else {
                          media.triggerReaction("hint");
                        }
                      }}
                      isGroupMode={isGroupTask}
                      onGroupContribute={async (text) => {
                        try {sessionStorage.setItem(draftKey,JSON.stringify({thought:text}));} catch { /* Remote draft remains available when local storage is full. */ }
                        const saved = await dispatchCommand("SAVE_DRAFT", {taskId:task.id,answer:{thought:text}});if(!saved.ok)throw Error("DRAFT_NOT_SAVED");
                        const res = await dispatchCommand("GROUP_CONTRIBUTE", { taskId: task.id, text });
                        if (!res.ok) throw Error(res.code || "CONTRIBUTION_NOT_SAVED");
                      }}
                      onGroupSubmit={async (ans) => {
                        const res = await dispatchCommand("GROUP_PROPOSE", { taskId: task.id, answer: ans, proposalId: "proposal-" + Date.now() });
                        if (!res.ok) alert(res.error || "Đại diện nhóm nộp bài thất bại.");

                      }}
                      groupProduct={groupProducts[task.id]}
                      groupContributions={view?.group?.contributions?.filter((c) => c.taskId === task.id)}
                    />
                  </div>
                );
              })
            )}
          </section>
      </LessonEncounterSheet>

      <LessonEncounterSheet open={needsMascot} onClose={() => setPickerSkipped(true)} title="Chọn linh vật" variant="center">
        {ownMapPeer && (
          <LessonMascotPicker
            spriteImage={worldMeta.spriteImage}
            mascots={worldMeta.mascots}
            current={ownMapPeer.mascot}
            chosen={false}
            disabled={!view}
            onChoose={chooseMascot}
          />
        )}
      </LessonEncounterSheet>
    </main>
  );
}

const PASSPORT_GROUPS = [
  { status: "independent", title: "Em tự làm được", icon: "🌟" },
  { status: "supported", title: "Em làm được khi có hỗ trợ", icon: "🤝" },
  { status: "next", title: "Bước tiếp theo", icon: "🧭" },
] as const;

function PassportCard({ card, name }: { card: LessonPassportCard; name: string }) {
  return (
    <section className="lesson-card passport-card" aria-label="Hộ chiếu học tập">
      <p className="passport-card-kicker">Hộ chiếu học tập</p>
      <h2 className="passport-card-name">{name}</h2>
      {PASSPORT_GROUPS.map((group) => {
        const items = card.objectives.filter((item) => item.status === group.status);
        if (!items.length) return null;
        return (
          <div key={group.status} className={`passport-card-group is-${group.status}`}>
            <h3><span aria-hidden="true">{group.icon}</span> {group.title}</h3>
            <ul>{items.map((item) => <li key={item.id}>{item.code ? <strong>{item.code}. </strong> : null}{item.statement}</li>)}</ul>
          </div>
        );
      })}
      <p className="passport-card-next"><strong>Việc nên làm tiếp:</strong> {card.nextStep}</p>
      <p className="lesson-muted passport-card-note">Thẻ này chỉ của riêng em, không so sánh với bạn. Em có thể chụp lại để giữ.</p>
    </section>
  );
}

const LEVELS = [
  { branch: "support", label: "Mức 1 · Nền tảng", hint: "có gợi ý từng bước" },
  { branch: "core", label: "Mức 2 · Chuẩn", hint: "" },
  { branch: "extension", label: "Mức 3 · Thử thách", hint: "" },
] as const;

const LEVEL_ERRORS: Record<string, string> = {
  BRANCH_SWITCH_LIMIT: "Em đã đổi mức 2 lần ở chặng này rồi.",
  BRANCH_DOWN_TOO_SOON: "Hãy thử làm câu ở mức này trước: đổi xuống được sau 1 lần sai hoặc sau 3 phút.",
  BRANCH_LOCKED: "Mức này chưa mở ở chặng này.",
};

function LevelBar({ view, disabled, extension, onSelect }: {
  view: LessonProjection | null;
  disabled: boolean;
  extension: { authored?: boolean; eligible?: boolean } | null | undefined;
  onSelect: (branch: string) => Promise<{ ok?: boolean; code?: string } | undefined>;
}) {
  const [note, setNote] = useState("");
  const current = view?.branch || "core";
  const activities = (view?.package?.activities || []) as Array<{ id: string }>;
  const stars = view?.gateStars || [];
  const choose = async (branch: string) => {
    setNote("");
    const res = await onSelect(branch);
    if (res && res.ok === false) setNote(LEVEL_ERRORS[res.code || ""] || "Chưa đổi được mức, thử lại.");
  };
  return (
    <div className="play-level-bar">
      <div className="play-level-row">
        <span>Mức của em: <strong>{LEVELS.find((l) => l.branch === current)?.label || "Mức 2 · Chuẩn"}</strong></span>
        {typeof view?.branchSwitchesLeft === "number" && <span className="lesson-muted">Còn {view.branchSwitchesLeft} lần đổi mức ở chặng này</span>}
      </div>
      <div className="play-level-row" role="group" aria-label="Đổi mức">
        {LEVELS.filter((l) => l.branch !== current && (l.branch !== "extension" || extension?.authored)).map((l) => {
          const locked = l.branch === "extension" && !extension?.eligible;
          return (
            <button key={l.branch} type="button" className={"lesson-button lesson-button-outline play-level-btn" + (l.branch === "extension" ? " lesson-branch-extension-btn" : "")}
              disabled={disabled || locked || view?.branchSwitchesLeft === 0}
              title={locked ? "Mở khi em tự làm đúng câu kiểm tra mức nền, không dùng gợi ý" : l.hint}
              onClick={() => void choose(l.branch)}>
              {locked ? "🔒 " : "Đổi sang "}{l.label}
            </button>
          );
        })}
      </div>
      {view?.levelInvite && <p className="play-level-invite">🌟 Em làm đúng 2 câu liền không cần gợi ý. Thử Mức 2 nhé?</p>}
      {note && <p className="play-level-note" role="status">{note}</p>}
      {stars.length > 0 && (
        <div className="play-gate-stars" aria-label="Sao từng cổng">
          {stars.map((g, i) => (
            <span key={g.activityId} className={"play-gate-star" + (activities[i]?.id === view?.timeline?.currentActivityId ? " is-here" : "")}>
              Cổng {i + 1}: {"★".repeat(g.stars)}{"☆".repeat(Math.max(0, 4 - g.stars))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


