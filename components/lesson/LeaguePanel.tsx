"use client";

import React, { useEffect, useRef, useState } from "react";

type League = { id: string; title: string; format: "async" | "live" | "cooperative" };
type Classroom = { id: string; title: string; code: string };
type Round = { id: string; round: number; participantCount: number; meanScore: number | null; improvement: number | null; finalized: boolean; sessionId?: string };
type Board = { league: League; round: number | null; classes: Array<{ classId?: string; classTitle: string; baselineMean: number | null; latest: Round | null; rounds: Round[] }>; highest: Array<{ classTitle: string; meanScore: number }>; mostImproved: Array<{ classTitle: string; improvement: number }>; cooperativeMean: number | null; participantCount: number; liveReady: boolean; scoresFinal: boolean };
type Reply = Partial<Board> & { leagues?: League[]; classes?: Board["classes"]; league?: League; error?: string };
const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Đăng nhập tài khoản giáo viên để tổ chức giải đấu.",
  NOT_FOUND: "Giải, lớp hoặc tiết học không thuộc tài khoản của thầy cô.",
  LEAGUE_CLASSES_FROZEN: "Danh sách lớp đã chốt. Thêm tất cả lớp trước khi gắn tiết đầu tiên.",
  NO_PARTICIPANTS: "Tiết chưa có học sinh từ hồ sơ lớp. Cho học sinh đăng nhập PIN và vào phòng trước.",
  SESSION_NOT_CONCLUDED: "Kết thúc tiết học trước khi chốt kết quả.",
  LIVE_NOT_READY: "Liên đấu trực tiếp cần ít nhất hai lớp; mọi lớp phải có tiết ở cùng lượt.",
  ROUND_CONFLICT: "Lớp đã có một tiết khác trong lượt này.",
  LEAGUE_CONFLICT: "Tiết vừa thay đổi. Tải lại rồi thử gắn hoặc chốt lại.",
  CONFIRM_REQUIRED: "Nhập đúng tên hoặc mã tiết để xác nhận xóa.",
  RELATION_DELETED: "Liên kết đang ở Thùng rác. Khôi phục từ Thùng rác để dùng lại.",
};
const FORMAT = { async: "Lớp đấu lớp khác giờ", live: "Liên đấu trực tiếp", cooperative: "Cả lớp cùng hợp tác" };
const score = (value: number | null) => value === null ? "Chưa có" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export function LeaguePanel({ classId: selectedClassId = "", sessionId: selectedSessionId = "" }: { classId?: string; sessionId?: string }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<League["format"]>("async");
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [round, setRound] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [deletion, setDeletion] = useState<{ label: string; expected: string; consequence: string; body: Record<string, unknown> } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const requestVersion = useRef(0);
  const creation = useRef<{ fingerprint: string; id: string } | null>(null);
  const classChoice = classId || selectedClassId, sessionChoice = sessionId || selectedSessionId;

  useEffect(() => {
    const controller = new AbortController(), version = requestVersion.current;
    void Promise.all([fetch("/api/lesson-leagues", { cache: "no-store", signal: controller.signal }), fetch("/api/lesson-classes", { cache: "no-store", signal: controller.signal })]).then(async ([leagueResponse, classResponse]) => {
      const a = await leagueResponse.json() as Reply, b = await classResponse.json() as { classes?: Classroom[]; error?: string };
      if (!leagueResponse.ok || !classResponse.ok) throw new Error(a.error || b.error || "LEAGUE_UNAVAILABLE");
      if (!controller.signal.aborted) { if (version === requestVersion.current) setLeagues(a.leagues || []); setClasses(b.classes || []); }
    }).catch(error => { if (!controller.signal.aborted) setNote(MESSAGES[error.message] || "Chưa tải được giải đấu và lớp."); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!leagueId) return;
    const controller = new AbortController();
    const load = async () => {
      const version = requestVersion.current;
      const response = await fetch("/api/lesson-leagues?id=" + encodeURIComponent(leagueId), { cache: "no-store", signal: controller.signal });
      const data = await response.json() as Reply;
      if (!response.ok || !data.league || !data.highest || !data.classes) throw new Error(data.error || "LEAGUE_UNAVAILABLE");
      if (!controller.signal.aborted && version === requestVersion.current) setBoard(data as Board);
    };
    void load().catch(error => { if (!controller.signal.aborted) setNote(MESSAGES[error.message] || "Chưa tải được bảng lớp."); });
    const timer = window.setInterval(() => void load().catch(() => undefined), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [leagueId]);

  const mutate = async (body: Record<string, unknown>) => {
    requestVersion.current++; setBusy(true); setNote("");
    try {
      if (body.action === "create") {
        const fingerprint = JSON.stringify(body);
        creation.current = creation.current?.fingerprint === fingerprint ? creation.current : { fingerprint, id: crypto.randomUUID() };
        body = { ...body, requestId: creation.current.id };
      }
      const response = await fetch("/api/lesson-leagues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as Reply;
      if (!response.ok || data.error) throw new Error(data.error || "LEAGUE_UNAVAILABLE");
      if (body.action === "delete") { setLeagues(current => current.filter(item => item.id !== leagueId)); setLeagueId(""); setBoard(null); setDeletion(null); setConfirmation(""); setNote("Đã chuyển giải vào Thùng rác. Có thể khôi phục; kết quả được giữ."); return; }
      const activeId = data.league?.id || leagueId;
      if (body.action === "create" && data.league) { creation.current = null; setTitle(""); setLeagueId(data.league.id); setLeagues(current => [data.league!, ...current.filter(item => item.id !== data.league!.id)]); }
      const refreshed = await fetch("/api/lesson-leagues?id=" + encodeURIComponent(activeId), { cache: "no-store" });
      const latest = await refreshed.json() as Reply; if (!refreshed.ok || latest.error) throw new Error(latest.error || "LEAGUE_UNAVAILABLE");
      setBoard(latest as Board); setDeletion(null); setConfirmation(""); setNote("Đã lưu.");
    } catch (error) { setNote(MESSAGES[(error as Error).message] || "Chưa lưu được. Kiểm tra bảng rồi thử lại."); }
    finally { setBusy(false); }
  };
  const askDelete = (label: string, expected: string, consequence: string, body: Record<string, unknown>) => { setConfirmation(""); setDeletion({ label, expected, consequence, body }); };

  return <section className="lesson-card" aria-label="Thi đấu và hợp tác theo lớp" aria-busy={busy}>
    <h2>Thi đấu và hợp tác theo lớp</h2>
    <p><a href="/trash">Thùng rác · Khôi phục giải, lớp và lượt</a></p>
    <p className="lesson-muted">Điểm tính trung bình theo từng học sinh. Sản phẩm nhóm và điểm thi đấu không xác nhận học sinh đã đạt mục tiêu bài học. Thêm tất cả lớp, cho học sinh vào tiết rồi gắn tiết trước khi bắt đầu chơi để chốt mốc tiến bộ.</p>
    <form onSubmit={event => { event.preventDefault(); void mutate({ action: "create", title, format }); }}>
      <label>Tên giải<input className="lesson-input" value={title} maxLength={120} disabled={busy} required onChange={event => setTitle(event.target.value)} /></label>
      <label>Hình thức<select className="lesson-select" value={format} disabled={busy} onChange={event => setFormat(event.target.value as League["format"])}>{Object.entries(FORMAT).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <button className="lesson-button" disabled={busy || !title.trim()}>Tạo giải</button>
    </form>
    <label>Giải đang quản lý<select className="lesson-select" value={leagueId} disabled={busy} onChange={event => { requestVersion.current++; setLeagueId(event.target.value); setBoard(null); setDeletion(null); setConfirmation(""); }}><option value="">Chọn giải</option>{leagues.map(item => <option key={item.id} value={item.id}>{item.title} · {FORMAT[item.format]}</option>)}</select></label>
    {leagueId && <>
      <label>Lớp<select className="lesson-select" value={classChoice} disabled={busy} onChange={event => setClassId(event.target.value)}><option value="">Chọn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.title} · {item.code}</option>)}</select></label>
      <button type="button" className="lesson-button lesson-button-outline" disabled={busy || !classChoice} onClick={() => void mutate({ action: "class-add", leagueId, classId: classChoice })}>Thêm lớp vào giải</button>
      <label>ID tiết học của lớp<input className="lesson-input" value={sessionChoice} maxLength={80} disabled={busy} onChange={event => setSessionId(event.target.value)} placeholder="Dùng tiết đang chọn hoặc dán ID tiết" /></label>
      <label>Lượt<input className="lesson-input" type="number" min={1} max={1000} value={round} disabled={busy} onChange={event => setRound(Number(event.target.value))} /></label>
      <button type="button" className="lesson-button" disabled={busy || !classChoice || !sessionChoice || !Number.isInteger(round)} onClick={() => void mutate({ action: "link", leagueId, classId: classChoice, sessionId: sessionChoice, round })}>Gắn tiết và chốt số người</button>{" "}
      <button type="button" className="lesson-button lesson-button-outline" disabled={busy || !classChoice || !Number.isInteger(round)} onClick={() => void mutate({ action: "finalize", leagueId, classId: classChoice, round })}>Chốt kết quả sau khi kết thúc tiết</button>
    </>}
    {board && <div aria-label="Bảng tổng hợp lớp, không có tên học sinh">
      <h3>{board.league.title}{board.round !== null ? ` · Lượt ${board.round}` : ""}</h3>
      <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => askDelete("Xóa giải", board.league.title, "Giải chuyển vào Thùng rác, tạm ẩn khỏi danh sách và hộ chiếu học sinh. Có thể khôi phục; kết quả đã chốt và bài làm vẫn được giữ.", { action: "delete", leagueId, confirmTitle: board.league.title })}>Xóa giải</button>
      <p>{board.scoresFinal ? "Kết quả đã chốt" : "Kết quả tạm thời"}{board.league.format === "live" ? board.liveReady ? " · Đủ lớp liên đấu" : " · Chờ mọi lớp gắn cùng lượt" : ""}</p>
      <p>Điểm hợp tác: <strong>{score(board.cooperativeMean)}</strong> · {board.participantCount} học sinh trong mẫu đã chốt.</p>
      <div className="lesson-grid"><div><h4>Cao nhất</h4><ol>{board.highest.map((item, index) => <li key={index}>{item.classTitle} · {score(item.meanScore)}</li>)}</ol></div><div><h4>Tiến bộ nhất</h4><ol>{board.mostImproved.map((item, index) => <li key={index}>{item.classTitle} · {score(item.improvement)}</li>)}</ol></div></div>
      <ul>{board.classes.map((item, index) => <li key={item.classId || index}>{item.classTitle}: {item.latest ? `${score(item.latest.meanScore)} · ${item.latest.participantCount} em` : "Chưa có kết quả"}
        {item.classId && <details><summary>Quản lý lớp và các lượt</summary>
          <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => askDelete("Xóa lớp khỏi giải", item.classTitle, "Lớp và các lượt chuyển vào Thùng rác. Khôi phục lớp trong giải trước, sau đó khôi phục từng lượt cần dùng. Hồ sơ lớp, bài làm và kết quả đã chốt vẫn được giữ.", { action: "class-remove", leagueId, classId: item.classId, confirmTitle: item.classTitle })}>Xóa lớp khỏi giải</button>
          <ul>{item.rounds.map(result => <li key={result.id}>Lượt {result.round} · {result.finalized ? "Đã chốt" : "Chưa chốt"}{" "}
            {result.sessionId && <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => askDelete("Xóa liên kết tiết", result.sessionId!, "Lượt chuyển vào Thùng rác, có thể khôi phục. Bài làm, tiết học và kết quả đã chốt vẫn được giữ. Mốc điểm ban đầu giữ nguyên nếu còn lượt khác.", { action: "unlink", leagueId, classId: item.classId, round: result.round, confirmSessionId: result.sessionId })}>Xóa liên kết tiết</button>}
          </li>)}</ul>
        </details>}
      </li>)}</ul>
    </div>}
    {deletion && <form className="lesson-card" aria-label={deletion.label} onSubmit={event => { event.preventDefault(); if (confirmation === deletion.expected) void mutate(deletion.body); }}>
      <h3>{deletion.label}</h3><p>{deletion.consequence}</p>
      <label>Nhập chính xác: <strong>{deletion.expected}</strong><input autoFocus className="lesson-input" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label>
      <button className="lesson-button lesson-button-secondary" disabled={busy || confirmation !== deletion.expected}>Xác nhận xóa</button>{" "}
      <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => { setDeletion(null); setConfirmation(""); }}>Hủy</button>
    </form>}
    {note && <p role="status">{note}</p>}
  </section>;
}
