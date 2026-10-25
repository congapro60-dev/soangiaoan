"use client";

import React, { useState, useEffect } from "react";
import MathText from "../../components/lesson/MathText";
import TaskImage, { taskImageOf, taskSolidOf } from "../../components/lesson/TaskImage";
import LessonThemedRoute from "../../components/lesson/LessonThemedRoute";
import { LessonWorldMap } from "../../components/lesson/LessonWorldMap";
import { useLessonSession, formatDuration } from "../../components/lesson/useLessonSession";
import { useLessonMedia } from "../../components/lesson/useLessonMedia";
import { ClassEventPanel } from "../../components/lesson/ClassEventPanel";

interface PresenterTask {
  id: string;
  prompt?: string;
  evaluation?: {
    answerKey?: unknown;
  };
  [key: string]: unknown;
}

export interface PresenterArenaEntry {
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

export interface PresenterArenaBracketMatch {
  match: number;
  bye: boolean;
  left: { id: string; name: string; correct: number; knockdowns: number } | null;
  right: { id: string; name: string; correct: number; knockdowns: number } | null;
}

export interface PresenterArenaProjection {
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
  bracket: PresenterArenaBracketMatch[];
  entries: PresenterArenaEntry[];
}

const MASCOT_ICONS = ["🐉", "🐯", "🦅", "🐢", "🐺", "🦁", "🦊", "🐴"];
const PHASE_LABELS: Record<string, string> = { experience: "KHÁM PHÁ", guided: "CÙNG TÌM HIỂU", practice: "LUYỆN TẬP", group: "HỢP TÁC", recheck: "KIỂM TRA CÁ NHÂN", extension: "THỬ THÁCH MỞ RỘNG", exit: "TỔNG KẾT" };
export function getMascotIcon(index?: number): string {
  return MASCOT_ICONS[Math.abs(index ?? 0) % MASCOT_ICONS.length] || "🥋";
}

export interface LessonArenaPresenterPanelProps {
  arena: PresenterArenaProjection | null | undefined;
  serverNow?: number;
}

export function LessonArenaPresenterPanel({
  arena,
  serverNow,
}: LessonArenaPresenterPanelProps) {
  if (!arena) return null;

  const now = serverNow ?? 0;
  const phase = arena.phase;

  const timerSec =
    phase === "countdown"
      ? Math.max(0, Math.ceil(((arena.startAt || 0) - now) / 1000))
      : phase === "fighting"
      ? Math.max(0, Math.ceil(((arena.finishAt || 0) - now) / 1000))
      : phase === "results"
      ? Math.max(0, Math.ceil(((arena.resumeAt || 0) - now) / 1000))
      : 0;

  const minutes = Math.floor(timerSec / 60);
  const seconds = timerSec % 60;
  const formattedTimer = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <section className="presenter-arena-container" aria-label="Màn hình Lôi Đài Trình Chiếu">
      <div className="presenter-arena-header">
        <div>
          <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.1em" }}>
            ĐẠI HỘI VÕ THUẬT TOÁN HỌC
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.25rem 0", color: "#f8fafc" }}>
            ⚔️ Lôi Đài Ngũ Ấn · Long Thành
          </h2>
          <div style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
            {arena.questions} câu hỏi · {arena.duration} giây thi đấu · Bảng đấu công khai an toàn
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className={`arena-phase-badge arena-phase-${phase}`} style={{ fontSize: "1rem", padding: "0.5rem 1rem" }}>
            {phase === "countdown" && "⏱️ CHUẨN BỊ BẮT ĐẦU"}
            {phase === "fighting" && "⚔️ ĐANG THI ĐẤU"}
            {phase === "results" && "🏆 TỔNG KẾT KẾT QUẢ"}
            {phase === "done" && "🏁 ĐÃ CHỐT KẾT QUẢ"}
          </span>
          <div className="presenter-clock-huge" style={{ fontSize: "2.5rem" }}>
            {formattedTimer}
          </div>
        </div>
      </div>

      {/* Bracket Pairs */}
      {arena.bracket && arena.bracket.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", color: "#38bdf8" }}>
            BẢNG THI ĐẤU GHÉP CẶP ({arena.bracket.length} TRẬN)
          </h3>
          <div className="presenter-arena-bracket-grid">
            {arena.bracket.map((b) => (
              <div key={b.match} className="presenter-match-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
                  <span>Trận #{b.match}</span>
                  {b.bye && <span style={{ color: "#fbbf24", fontWeight: 700 }}>Có miễn đấu</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#f8fafc" }}>
                      {b.left?.name || "—"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                      {b.left?.correct ?? 0} đúng · {b.left?.knockdowns ?? 0} hạ
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, color: "#f59e0b", fontSize: "1.25rem", padding: "0 0.75rem" }}>
                    VS
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#f8fafc" }}>
                      {b.bye ? "Miễn đấu" : b.right?.name || "—"}
                    </div>
                    {!b.bye && (
                      <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        {b.right?.correct ?? 0} đúng · {b.right?.knockdowns ?? 0} hạ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public Arena Leaderboard */}
      {arena.entries && arena.entries.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", color: "#38bdf8" }}>
            BẢNG XẾP HẠNG LÔI ĐÀI ({arena.entries.length} ĐẤU SĨ)
          </h3>
          <table className="presenter-leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Hạng</th>
                <th>Đấu sĩ</th>
                <th>Số câu đúng</th>
                <th>Lần hạ gục</th>
                {(phase === "results" || phase === "done") && <th>Thưởng Lôi Đài</th>}
              </tr>
            </thead>
            <tbody>
              {arena.entries.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span style={{ fontWeight: 800, color: p.rank === 1 ? "#fbbf24" : p.rank === 2 ? "#e2e8f0" : p.rank === 3 ? "#cd7f32" : "#94a3b8" }}>
                      {p.rank ? `#${p.rank}` : "—"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "1.25rem", marginRight: "0.5rem" }}>
                      {getMascotIcon(p.mascot)}
                    </span>
                    <strong>{p.name}</strong>
                    {p.withdrawn && <small style={{ color: "#ef4444", marginLeft: "0.5rem" }}>(Đã rời)</small>}
                  </td>
                  <td>
                    <strong>{p.correct}</strong> / {arena.questions}
                  </td>
                  <td>
                    <strong>{p.knockdowns}</strong>
                  </td>
                  {(phase === "results" || phase === "done") && (
                    <td style={{ color: "#34d399", fontWeight: 700 }}>
                      +{p.reward} điểm
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function PresenterPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [presenterToken, setPresenterToken] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [teacherOwnedPresenter, setTeacherOwnedPresenter] = useState<boolean>(false);
  const [isSessionRestored, setIsSessionRestored] = useState<boolean>(false);

  // Manual fallback inputs
  const [manualSessionId, setManualSessionId] = useState<string>("");
  const [manualToken, setManualToken] = useState<string>("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
      const querySession = new URLSearchParams(window.location.search).get("session");
      const savedSession = querySession || sessionStorage.getItem("presenter_active_session");
      const savedToken = savedSession
        ? sessionStorage.getItem(`presenter_token_${savedSession}`)
        : null;
      setSessionId(savedSession);
      setPresenterToken(savedToken);
      setTeacherOwnedPresenter(Boolean(querySession && !savedToken));
      setConnected(Boolean((savedSession && savedToken) || querySession));
      } catch {
        setConnected(false);
      } finally {
        setIsSessionRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // PostMessage handshake protocol
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "SIGNAL_PRESENTER_TOKEN") {
        const { sessionId: sId, presenterToken: pToken } = event.data;
        if (sId && pToken) {
          sessionStorage.setItem(`presenter_token_${sId}`, pToken);
          sessionStorage.setItem("presenter_active_session", sId);
          setSessionId(sId);
          setPresenterToken(pToken);
          setConnected(true);

          if (event.source && "postMessage" in event.source) {
            (event.source as Window).postMessage(
              { type: "SIGNAL_PRESENTER_ACK", sessionId: sId },
              window.location.origin
            );
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Notify opener that presenter tab is ready for handshake
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          { type: "SIGNAL_PRESENTER_READY" },
          window.location.origin
        );
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Hook for presenter read-only polling
  const {
    view,
    serverNow,
    error,
    getRemainingMs,
  } = useLessonSession({
    sessionId,
    role: "presenter",
    bearerToken: presenterToken,
    enabled: Boolean(sessionId && (presenterToken || teacherOwnedPresenter)),
    pollIntervalMs: 3000,
  });

  // Hook for presenter TV media reactions
  const media = useLessonMedia({
    view,
    role: "presenter",
  });

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualSessionId.trim();
    const cleanToken = manualToken.trim();
    if (!cleanId || !cleanToken) return;

    sessionStorage.setItem(`presenter_token_${cleanId}`, cleanToken);
    sessionStorage.setItem("presenter_active_session", cleanId);

    setSessionId(cleanId);
    setPresenterToken(cleanToken);
    setConnected(true);
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem("presenter_active_session");
    setSessionId(null);
    setPresenterToken(null);
    setConnected(false);
  };

  if (!isSessionRestored) {
    return (
      <main className="presenter-shell">
        <p>Đang khôi phục màn hình trình chiếu...</p>
      </main>
    );
  }

  // If not connected via handshake or sessionStorage, show manual connect form
  if (!connected || !sessionId || (!presenterToken && !teacherOwnedPresenter)) {
    return (
      <main className="presenter-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="lesson-card" style={{ maxWidth: 520, width: "100%", background: "#131c2e", borderColor: "#283756" }}>
          <p className="lesson-kicker">MÀN HÌNH TRÌNH CHIẾU TV</p>
          <h1 className="lesson-title" style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>
            Kết nối màn hình lớp học
          </h1>
          <p style={{ color: "var(--lesson-text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Màn hình này nhận token xác thực an toàn qua kết nối trực tiếp từ máy giáo viên.
            Nếu bạn mở tab độc lập, vui lòng nhập thông tin kết nối thủ công bên dưới.
          </p>

          <form onSubmit={handleManualConnect} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="presenter-session-input" className="task-label">
                Mã phiên:
              </label>
              <input
                id="presenter-session-input"
                type="text"
                required
                value={manualSessionId}
                onChange={(e) => setManualSessionId(e.target.value)}
                placeholder="Ví dụ: e3b890f..."
                className="lesson-input"
              />
            </div>

            <div>
              <label htmlFor="presenter-token-input" className="task-label">
                Mã kết nối màn hình TV:
              </label>
              <input
                id="presenter-token-input"
                type="password"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Dán token trình chiếu từ máy giáo viên..."
                className="lesson-input"
              />
            </div>

            <button type="submit" className="lesson-button lesson-button-primary" style={{ padding: "0.85rem" }}>
              Bắt đầu trình chiếu TV
            </button>
          </form>
        </div>
      </main>
    );
  }

  const remainingMs = getRemainingMs();
  const isPaused = view?.status === "paused";
  const isConcluded = view?.status === "concluded";
  const tasksList = (view?.tasks || []) as PresenterTask[];
  if(view?.status==="waiting"||isPaused)return <main className="presenter-shell" style={{display:"grid",placeContent:"center",minHeight:"100dvh",textAlign:"center",padding:24}}><h1>{isPaused?"Cả lớp nhìn lên — trao đổi cùng thầy cô":"Chờ thầy cô bắt đầu"}</h1><p>{isPaused?"Cùng giải thích, kiểm chứng và ghi lại điều vừa học.":"Chuẩn bị vở và bút."}</p></main>;

  return (
    <main className={`presenter-shell ${media.settings.reducedMotion ? "lesson-media-reduced-motion" : ""}`}>
      {/* Top TV Bar: Phase, Large Timer, Status */}
      <header className="presenter-header">
        <div>
          <div className="presenter-phase">
            {view?.currentActivity?.phase ? `HOẠT ĐỘNG: ${PHASE_LABELS[view.currentActivity.phase] || "ĐANG HỌC"}` : "DÃY SỐ TOÁN 11"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            Hoạt động {((view?.timeline?.activityIndex || 0) + 1)} · {view?.mode === "live" ? "Lớp học chính thức" : "Chế độ thử nghiệm"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div className={`presenter-clock-huge ${isPaused ? "presenter-clock-paused" : ""}`}>
            {formatDuration(remainingMs)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {!media.isUnlocked ? (
              <button
                type="button"
                className="lesson-button lesson-button-primary lesson-media-enable-btn"
                style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                onClick={media.unlockAudio}
                aria-label="Bật phản hồi"
              >
                🔊 Bật phản hồi
              </button>
            ) : (
              <button
                type="button"
                className={`lesson-button ${media.settings.master ? "lesson-button-primary" : "lesson-button-outline"} lesson-media-toggle-btn`}
                style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                onClick={media.toggleMaster}
                aria-label={media.settings.master ? "Tắt phản hồi" : "Bật phản hồi"}
              >
                {media.settings.master ? "🔊 Tắt phản hồi" : "🔇 Bật phản hồi"}
              </button>
            )}
            <span
              className="lesson-badge lesson-badge-outline presenter-reduced-motion-badge"
              title="Trạng thái giảm chuyển động"
            >
              {media.settings.reducedMotion ? "Chuyển động: Giảm" : "Hiệu ứng: Bật"}
            </span>
            <span
              className={`lesson-badge ${
                isPaused
                  ? "lesson-badge-warning"
                  : isConcluded
                  ? "lesson-badge-primary"
                  : "lesson-badge-success"
              }`}
              style={{ fontSize: "1rem", padding: "0.4rem 1rem" }}
            >
              {isPaused
                ? "⏸️ TẠM DỪNG"
                : isConcluded
                ? "🏁 KẾT THÚC"
                : "▶️ ĐANG DIỄN RA"}
            </span>
          </div>
        </div>
      </header>

      {/* TV Media Active Reaction Banner */}
      {media.activeReaction && (
        <aside
          className={`lesson-media-reaction-banner presenter-media-banner ${
            media.settings.reducedMotion ? "lesson-media-no-pulse" : "lesson-media-pulse"
          }`}
          role="status"
          aria-live="polite"
          aria-label="Phản hồi trình chiếu TV"
        >
          <span className="lesson-media-reaction-icon" aria-hidden="true" style={{ fontSize: "1.75rem" }}>
            {media.activeReaction.reaction}
          </span>
          <div className="lesson-media-reaction-content">
            <span className="lesson-media-reaction-text" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {media.activeReaction.text}
            </span>
            <span className="lesson-media-disclaimer">
              Phản hồi học tập định hướng sư phạm · Không đánh giá thành thạo qua điểm số hay tốc độ
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

      {error && (
        <div className="task-status-banner task-status-error" style={{ marginBottom: "2rem", fontSize: "1.25rem" }}>
          ⚠️ Mất kết nối trình chiếu với máy chủ. Đang thử kết nối lại... ({error})
        </div>
      )}

      {/* Main TV Projection Area */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Campaign map for the whole class: mascots only, no names */}
        <LessonWorldMap
          map={view?.map}
          themeKey={view?.worldTheme || (view?.gamePlan as { theme?: string } | undefined)?.theme}
          sessionKey={sessionId || "tv"}
          height={640}
        />

        {/* Themed Route Map Projection */}
        <LessonThemedRoute
          gamePlan={view?.gamePlan}
          worldTheme={view?.worldTheme}
          currentActivityIndex={view?.timeline?.activityIndex}
          currentPhase={view?.currentActivity?.phase}
          variant="presenter"
        />

        {view?.classEvent && <ClassEventPanel view={view.classEvent} />}

        {Boolean(view?.arena) ? (
          <LessonArenaPresenterPanel
            arena={view?.arena as PresenterArenaProjection}
            serverNow={serverNow}
          />
        ) : (
          <>
            {view?.currentActivity && (
              <div className="presenter-student-action">
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#38bdf8", display: "block", marginBottom: "0.75rem" }}>
                  YÊU CẦU DÀNH CHO HỌC SINH:
                </span>
                <MathText text={view.currentActivity.studentAction} inline={false} />
              </div>
            )}

            {/* Tasks on Projection (Sanitized, No peer identity or unrevealed answers) */}
            {tasksList.length > 0 && (
              <div>
                {tasksList.map((task) => {
                  const isRevealed = task.evaluation?.answerKey !== undefined;

                  return (
                    <div key={task.id} className="presenter-task-card">
                      <div className="presenter-task-prompt">
                        <TaskImage image={taskImageOf(task)} solidKey={taskSolidOf(task)} alt="Hình minh hoạ đề bài" />
                        <MathText text={task.prompt} inline={false} />
                      </div>

                      {isRevealed && (
                        <div className="presenter-revealed-key">
                          <strong>ĐÁP ÁN CHÍNH THỨC: </strong>
                          {typeof task.evaluation?.answerKey === "object" ? (
                            <code>{JSON.stringify(task.evaluation.answerKey)}</code>
                          ) : (
                            <MathText text={String(task.evaluation?.answerKey)} inline={true} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer bar with room code and safe quit button */}
      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1.5rem", borderTop: "1px solid #23314d", color: "#64748b" }}>
        <span>Phiên trình chiếu an toàn · Không hiển thị thông tin cá nhân học sinh</span>
        <button
          onClick={handleDisconnect}
          style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.85rem" }}
        >
          Thoát màn hình TV
        </button>
      </footer>
    </main>
  );
}
