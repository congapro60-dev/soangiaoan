"use client";

import React, { useState } from "react";
import { cockpitActions, cockpitLearners, normalizeSupportMinutes } from "../../lib/lesson/cockpit.js";
import { PRODUCT_THEMES, resolveThemeId } from "../../lib/product-content.js";
import { LessonMascotChip } from "./LessonMascotPicker";
import { formatDuration, LessonProjection } from "./useLessonSession";

const phaseLabels: Record<string, string> = {
  experience: "Khởi động", guided: "Có hướng dẫn", formation: "Hình thành kiến thức",
  practice: "Luyện tập", recheck: "Kiểm tra lại", exit: "Vé ra cửa", reflection: "Suy ngẫm",
};

export function LessonPeerInspector({ view, selectedLearnerId, onSelectLearner, onClose }: {
  view: LessonProjection | null;
  selectedLearnerId: string | null;
  onSelectLearner: (learnerId: string) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState("5");
  const rows = cockpitLearners(view, normalizeSupportMinutes(minutes));
  const selected = rows.find(row => row.learnerId === selectedLearnerId);
  const support = rows.filter(row => row.needsSupport).sort((a, b) =>
    (b.activeMs ?? -1) - (a.activeMs ?? -1) || b.wrongRechecks - a.wrongRechecks || a.name.localeCompare(b.name, "vi"));
  const themeKey = (resolveThemeId((view?.gamePlan as { theme?: string })?.theme || "modern") || "modern") as keyof typeof PRODUCT_THEMES;
  const theme = PRODUCT_THEMES[themeKey];
  const actions = cockpitActions(view, normalizeSupportMinutes(minutes));
  return <section className="cockpit-peer-inspector" aria-label="Theo dõi từng học sinh">
    {view && <div className="cockpit-actions" aria-label="3 việc nên làm bây giờ">
      <h2 className="lesson-card-title">3 việc nên làm bây giờ</h2>
      {actions.length ? <ol>{actions.map(action => <li key={action.kind} className={`cockpit-action is-${action.kind}`}>
        {action.learnerId ? <button type="button" className="cockpit-action-link" onClick={() => onSelectLearner(action.learnerId!)}>{action.text}</button> : action.text}
      </li>)}</ol> : <p className="lesson-muted">Lớp đang ổn, chưa có việc cần làm ngay.</p>}
    </div>}
    {selected && <article className="lesson-card cockpit-peer-card" aria-label="Thông tin học sinh">
      <div className="lesson-card-header">
        <h2 className="lesson-card-title">{selected.name}</h2>
        <button type="button" className="lesson-button lesson-button-secondary" onClick={onClose} aria-label="Đóng thông tin học sinh">Đóng</button>
      </div>
      <p className="cockpit-peer-mascot"><LessonMascotChip spriteImage={theme.sprites} mascots={theme.mascots} mascot={selected.mascot} />{theme.mascots[selected.mascot]}</p>
      <p>Trạm linh vật: <strong>Cổng {selected.stationIndex + 1}</strong> · {phaseLabels[selected.stationPhase] || "Đang di chuyển"} · bước {selected.position}</p>
      <p className="lesson-muted">Hoạt động lớp: {phaseLabels[view?.timeline?.currentPhase || ""] || "Chưa bắt đầu"}</p>
      <dl className="cockpit-peer-facts">
        <dt>Di chuyển</dt><dd>{selected.movementDone}/{selected.movementTotal} cổng cốt lõi đã tới</dd>
        <dt>Bài cá nhân</dt><dd>{selected.evidenceDone}/{selected.evidenceTotal} hoạt động có bài đúng</dd>
        <dt>Nộp gần nhất</dt><dd>{selected.lastSubmittedAt === null ? "Chưa nộp" : new Date(selected.lastSubmittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</dd>
        <dt>Gợi ý đã dùng</dt><dd>{selected.hintCount} lượt{selected.hintTiers.length > 0 ? ` · ${selected.hintTiers.join(", ")}` : ""}</dd>
        <dt>Tới cổng lúc</dt><dd>{selected.enteredAt === null ? "Chưa có mốc server" : new Date(selected.enteredAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</dd>
        <dt>Tại cổng hiện tại</dt><dd>{selected.activeMs === null ? "Chưa có mốc thời gian từ server" : `${formatDuration(selected.activeMs)} thời gian làm bài (server)`}</dd>
        <dt>Kiểm tra lại sai liên tiếp</dt><dd>{selected.wrongRechecks}</dd>
      </dl>
      <p className={selected.needsSupport ? "lesson-error" : "lesson-muted"}>
        {selected.needsSupport ? "Đang kẹt — cần giáo viên xem xét" : selected.completed ? "Bài cá nhân hiện tại đã đúng" : selected.awaitingReview ? "Đang chờ giáo viên chấm" : "Chưa có cảnh báo cần hỗ trợ"}
      </p>
    </article>}
    <div className="cockpit-support-panel">
      <div className="lesson-card-header"><h2 className="lesson-card-title">HS cần hỗ trợ <span className="lesson-badge lesson-badge-warning">{support.length}</span></h2></div>
      <label className="cockpit-support-threshold">Cảnh báo đứng cổng từ
        <input className="lesson-input" type="number" min="1" max="60" step="1" aria-label="Ngưỡng cảnh báo đứng cổng (phút)" value={minutes} onChange={event => setMinutes(event.target.value)} onBlur={() => setMinutes(String(normalizeSupportMinutes(minutes)))} /> phút
      </label>
      <p className="lesson-muted">Mặc định 5 phút; từ 1–60. Lịch sử server trừ tạm dừng, lôi đài, khóa và hết giờ. Hai lần kiểm tra lại sai liên tiếp cũng cần xem xét.</p>
      {support.length ? <ul className="cockpit-support-list">{support.map(row => <li key={row.learnerId}>
        <button type="button" className="lesson-button lesson-button-secondary" onClick={() => onSelectLearner(row.learnerId)} aria-pressed={row.learnerId === selectedLearnerId}>
          <strong>{row.name}</strong><span>{row.activeMs === null ? "Chưa có mốc server" : formatDuration(row.activeMs)}{row.wrongRechecks >= 2 ? ` · ${row.wrongRechecks} lần kiểm tra lại sai` : ""}</span>
        </button>
      </li>)}</ul> : <p className="lesson-muted">Chưa có cảnh báo cần hỗ trợ.</p>}
      {view && !view.gateTiming && <p className="lesson-muted">Phiên cũ chưa lưu lịch sử tới cổng. Không tính thời gian hồi tố.</p>}
    </div>
  </section>;
}
