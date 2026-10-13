"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

type Classroom = { id: string; code: string; title: string; activeMemberCount?: number };
type Member = { id: string; code: string; name: string; teamId: string | null; revoked: boolean };
type Team = { id: string; title: string };
type Reply = { classes?: Classroom[]; class?: Classroom; members?: Member[]; teams?: Team[]; member?: Member; pin?: string; error?: string };
const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Đăng nhập tài khoản giáo viên để quản lý lớp.",
  NOT_FOUND: "Lớp hoặc học sinh không còn khả dụng.",
  INVALID_TITLE: "Điền tên lớp hoặc nhóm, tối đa 120 ký tự cho lớp, 40 ký tự cho nhóm.",
  INVALID_NAME: "Điền tên học sinh, tối đa 40 ký tự.",
  INVALID_TEAM: "Nhóm phải thuộc lớp đang chọn.",
  CLASS_FULL: "Lớp đã đạt giới hạn 500 hồ sơ.",
  REQUEST_CONFLICT: "Yêu cầu đã thay đổi. Tải lại danh sách trước khi thử lại.",
  RESTORE_REQUIRED: "Khôi phục hồ sơ từ Thùng rác trước khi cấp PIN mới.",
  CONFIRM_REQUIRED: "Nhập đúng tên hoặc tên và mã để xác nhận xóa.",
};

export function ClassRosterPanel({ onSelectClass }: { onSelectClass?: (classId: string) => void }) {
  const prefix = useId();
  const readVersion = useRef(0);
  const createRequests = useRef<Record<string, { fingerprint: string; id: string }>>({});
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [classId, setClassId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [teamTitle, setTeamTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [secret, setSecret] = useState<{ member: Member; pin: string } | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [deletion, setDeletion] = useState<{ label: string; expected: string; consequence: string; body: Record<string, unknown> } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const selected = classes.find(classroom => classroom.id === classId);

  const request = async (body?: Record<string, unknown>, signal?: AbortSignal): Promise<Reply> => {
    const response = await fetch("/api/lesson-classes", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal } : { cache: "no-store", signal });
    const data = await response.json() as Reply;
    if (!response.ok || data.error) throw new Error(data.error || "CLASS_UNAVAILABLE");
    return data;
  };
  const reloadClasses = async (signal?: AbortSignal) => {
    const data = await request(undefined, signal); setClasses(data.classes || []);
  };

  useEffect(() => {
    const controller = new AbortController();
    const version = readVersion.current;
    void fetch("/api/lesson-classes", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json() as Reply;
      if (!response.ok || data.error) throw new Error(data.error || "CLASS_UNAVAILABLE");
      if (!controller.signal.aborted && version === readVersion.current) setClasses(data.classes || []);
    }).catch(error => { if (!controller.signal.aborted && version === readVersion.current) setNote(MESSAGES[error.message] || "Chưa tải được danh sách lớp."); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const version = readVersion.current;
    if (classId) {
      void fetch("/api/lesson-classes?id=" + encodeURIComponent(classId), { cache: "no-store", signal: controller.signal }).then(async response => {
        const data = await response.json() as Reply;
        if (!response.ok || data.error) throw new Error(data.error || "CLASS_UNAVAILABLE");
        if (!controller.signal.aborted && version === readVersion.current) { setMembers(data.members || []); setTeams(data.teams || []); }
      }).catch(error => { if (!controller.signal.aborted && version === readVersion.current) setNote(MESSAGES[error.message] || "Chưa tải được danh sách học sinh."); });
    }
    return () => controller.abort();
  }, [classId]);

  const mutate = async (body: Record<string, unknown>) => {
    readVersion.current++;
    setBusy(true); setNote(""); setSecret(null);
    try {
      const action = String(body.action);
      if (["create", "member-add", "team-create"].includes(action)) {
        const fingerprint = JSON.stringify(body);
        const previous = createRequests.current[action];
        const id = previous?.fingerprint === fingerprint ? previous.id : crypto.randomUUID();
        createRequests.current[action] = { fingerprint, id };
        body = { ...body, requestId: id };
      }
      const data = await request(body);
      delete createRequests.current[action];
      if (data.member && data.pin) setSecret({ member: data.member, pin: data.pin });
      if (body.action === "create" && data.class) { setClassId(data.class.id); onSelectClass?.(data.class.id); setTitle(""); }
      if (body.action === "member-add") setName("");
      if (body.action === "team-create") setTeamTitle("");
      if (body.action === "delete") { setClassId(""); setMembers([]); setTeams([]); onSelectClass?.(""); }
      if (classId && !["create", "delete"].includes(String(body.action))) {
        const response = await fetch("/api/lesson-classes?id=" + encodeURIComponent(classId), { cache: "no-store" });
        const roster = await response.json() as Reply;
        if (!response.ok || roster.error) throw new Error(roster.error || "CLASS_UNAVAILABLE");
        setMembers(roster.members || []); setTeams(roster.teams || []);
      }
      await reloadClasses(); setDeletion(null); setConfirmation(""); setNote(body.action === "member-add" && data.member && !data.pin ? "Hồ sơ đã được tạo từ yêu cầu trước. PIN không hiện lại; bấm Đổi PIN nếu chưa nhận được." : "Đã lưu.");
    } catch (error) { setNote(MESSAGES[(error as Error).message] || "Chưa lưu được. Kiểm tra danh sách trước khi thử lại."); }
    finally { setBusy(false); }
  };
  const askDelete = (label: string, expected: string, consequence: string, body: Record<string, unknown>) => { setConfirmation(""); setDeletion({ label, expected, consequence, body }); };

  return <section className="lesson-card" aria-label="Hồ sơ lớp và PIN học sinh" aria-busy={busy}>
    <h2 className="lesson-card-title">Hồ sơ lớp</h2>
    <p><a href="/trash">Thùng rác · Khôi phục lớp, nhóm và hồ sơ học sinh</a></p>
    <p className="lesson-muted">Học sinh dùng mã lớp, mã học sinh và PIN riêng. Tên trùng nhau vẫn là hai hồ sơ độc lập; không cần tài khoản ChatGPT.</p>
    <form onSubmit={event => { event.preventDefault(); void mutate({ action: "create", title }); }}>
      <label htmlFor={prefix + "-new"}>Tên lớp mới</label>
      <input id={prefix + "-new"} className="lesson-input" value={title} maxLength={120} disabled={busy} onChange={event => setTitle(event.target.value)} required />
      <button className="lesson-button" disabled={busy || !title.trim()}>Tạo lớp</button>
    </form>
    <label htmlFor={prefix + "-class"}>Lớp dùng cho tiết học</label>
    <select id={prefix + "-class"} className="lesson-select" value={classId} disabled={busy} onChange={event => { readVersion.current++; setClassId(event.target.value); setMembers([]); setTeams([]); setSecret(null); setDeletion(null); setConfirmation(""); setShowRemoved(false); onSelectClass?.(event.target.value); }}>
      <option value="">Chọn lớp</option>
      {classes.map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.title} · {classroom.code} · {classroom.activeMemberCount || 0} học sinh</option>)}
    </select>
    {selected && <>
      <p>Mã lớp: <strong>{selected.code}</strong>. Học sinh mở <Link href="/passport">Hộ chiếu học tập</Link> để đăng nhập.</p>
      <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => askDelete("Xóa lớp", selected.title, "Lớp chuyển vào Thùng rác, học sinh tạm ngừng đăng nhập bằng mã lớp. Có thể khôi phục lớp; bài làm và lịch sử tiết học được giữ.", { action: "delete", classId, confirmTitle: selected.title })}>Xóa lớp</button>
      <form onSubmit={event => { event.preventDefault(); void mutate({ action: "member-add", classId, name }); }}>
        <label htmlFor={prefix + "-name"}>Tên học sinh mới</label>
        <input id={prefix + "-name"} className="lesson-input" value={name} maxLength={40} disabled={busy} onChange={event => setName(event.target.value)} required />
        <button className="lesson-button" disabled={busy || !name.trim()}>Tạo hồ sơ và PIN</button>
      </form>
      <form onSubmit={event => { event.preventDefault(); void mutate({ action: "team-create", classId, title: teamTitle }); }}>
        <label htmlFor={prefix + "-team"}>Tên nhóm cố định mới</label>
        <input id={prefix + "-team"} className="lesson-input" value={teamTitle} maxLength={40} disabled={busy} onChange={event => setTeamTitle(event.target.value)} required />
        <button className="lesson-button lesson-button-outline" disabled={busy || !teamTitle.trim()}>Tạo nhóm</button>
      </form>
      {teams.length > 0 && <details><summary>Quản lý nhóm cố định</summary><ul>{teams.map(team => <li key={team.id}>{team.title}{" "}<button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => askDelete("Xóa nhóm", team.title, "Nhóm chuyển vào Thùng rác; học sinh trở về Chưa xếp nhóm. Có thể khôi phục nhóm và những thành viên chưa được xếp sang nhóm khác. Bài làm vẫn được giữ.", { action: "team-delete", classId, teamId: team.id, confirmTitle: team.title })}>Xóa nhóm</button></li>)}</ul></details>}
      {secret && <div className="lesson-card" role="status">
        <p>PIN của <strong>{secret.member.name}</strong> chỉ hiện lần này. Giao riêng cho học sinh, không chiếu lên TV.</p>
        <p>Mã lớp: <strong>{selected.code}</strong> · Mã học sinh: <strong>{secret.member.code}</strong> · PIN: <strong>{secret.pin}</strong></p>
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => setSecret(null)}>Đã ghi lại, ẩn PIN</button>
      </div>}
      {members.some(member => member.revoked) && <label><input type="checkbox" checked={showRemoved} onChange={event => setShowRemoved(event.target.checked)} /> Hiện hồ sơ đã xóa / thu hồi để cấp lại quyền</label>}
      {members.filter(member => showRemoved || !member.revoked).length === 0 ? <p className="lesson-muted">Chưa có học sinh đang hoạt động. Tạo hồ sơ hoặc hiện hồ sơ đã xóa để cấp lại quyền.</p> : <ul style={{ listStyle: "none", padding: 0 }}>
        {members.filter(member => showRemoved || !member.revoked).map(member => <li className="lesson-card" key={member.id}>
          <strong>{member.name}</strong> · Mã học sinh: {member.code} {member.revoked ? "· Đã thu hồi quyền truy cập" : ""}
          <label htmlFor={prefix + member.id}>Nhóm của {member.name} ({member.code})</label>
          <select id={prefix + member.id} className="lesson-select" value={member.teamId || ""} disabled={busy || member.revoked} onChange={event => void mutate({ action: "member-update", classId, memberId: member.id, teamId: event.target.value || null })}>
            <option value="">Chưa xếp nhóm</option>{teams.map(team => <option key={team.id} value={team.id}>{team.title}</option>)}
          </select>
          <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => { if (window.confirm(`Cấp PIN mới cho ${member.name} (${member.code})? PIN cũ và các phiên đã đăng nhập sẽ hết hiệu lực.`)) void mutate({ action: "member-reset-pin", classId, memberId: member.id }); }}>{member.revoked ? "Cấp lại quyền và PIN mới" : "Đổi PIN"}</button>{" "}
          {!member.revoked && <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => askDelete("Xóa hồ sơ học sinh", `${member.name} (${member.code})`, "Hồ sơ chuyển vào Thùng rác; PIN và các phiên đăng nhập hết hiệu lực. Bài làm được giữ. Khôi phục hồ sơ từ Thùng rác, sau đó cấp PIN mới để học sinh tham gia lại.", { action: "member-delete", classId, memberId: member.id, confirmName: member.name, confirmCode: member.code })}>Xóa hồ sơ</button>}
        </li>)}
      </ul>}
    </>}
    {deletion && <form className="lesson-card" aria-label={deletion.label} onSubmit={event => { event.preventDefault(); if (confirmation === deletion.expected) void mutate(deletion.body); }}>
      <h3>{deletion.label}</h3><p>{deletion.consequence}</p>
      <label htmlFor={prefix + "-delete-confirm"}>Nhập chính xác: <strong>{deletion.expected}</strong></label>
      <input autoFocus id={prefix + "-delete-confirm"} className="lesson-input" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} autoComplete="off" />
      <button className="lesson-button lesson-button-secondary" disabled={busy || confirmation !== deletion.expected}>Xác nhận xóa</button>{" "}
      <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => { setDeletion(null); setConfirmation(""); }}>Hủy</button>
    </form>}
    {note && <p role="status">{note}</p>}
  </section>;
}
