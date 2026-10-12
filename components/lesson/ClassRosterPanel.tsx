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
      if (classId && body.action !== "create") {
        const response = await fetch("/api/lesson-classes?id=" + encodeURIComponent(classId), { cache: "no-store" });
        const roster = await response.json() as Reply;
        if (!response.ok || roster.error) throw new Error(roster.error || "CLASS_UNAVAILABLE");
        setMembers(roster.members || []); setTeams(roster.teams || []);
      }
      await reloadClasses(); setNote(body.action === "member-add" && data.member && !data.pin ? "Hồ sơ đã được tạo từ yêu cầu trước. PIN không hiện lại; bấm Đổi PIN nếu chưa nhận được." : "Đã lưu.");
    } catch (error) { setNote(MESSAGES[(error as Error).message] || "Chưa lưu được. Kiểm tra danh sách trước khi thử lại."); }
    finally { setBusy(false); }
  };

  return <section className="lesson-card" aria-label="Hồ sơ lớp và PIN học sinh" aria-busy={busy}>
    <h2 className="lesson-card-title">Hồ sơ lớp</h2>
    <p className="lesson-muted">Học sinh dùng mã lớp, mã học sinh và PIN riêng. Tên trùng nhau vẫn là hai hồ sơ độc lập; không cần tài khoản ChatGPT.</p>
    <form onSubmit={event => { event.preventDefault(); void mutate({ action: "create", title }); }}>
      <label htmlFor={prefix + "-new"}>Tên lớp mới</label>
      <input id={prefix + "-new"} className="lesson-input" value={title} maxLength={120} disabled={busy} onChange={event => setTitle(event.target.value)} required />
      <button className="lesson-button" disabled={busy || !title.trim()}>Tạo lớp</button>
    </form>
    <label htmlFor={prefix + "-class"}>Lớp dùng cho tiết học</label>
    <select id={prefix + "-class"} className="lesson-select" value={classId} disabled={busy} onChange={event => { readVersion.current++; setClassId(event.target.value); setMembers([]); setTeams([]); setSecret(null); onSelectClass?.(event.target.value); }}>
      <option value="">Chọn lớp</option>
      {classes.map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.title} · {classroom.code} · {classroom.activeMemberCount || 0} học sinh</option>)}
    </select>
    {selected && <>
      <p>Mã lớp: <strong>{selected.code}</strong>. Học sinh mở <Link href="/passport">Hộ chiếu học tập</Link> để đăng nhập.</p>
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
      {secret && <div className="lesson-card" role="status">
        <p>PIN của <strong>{secret.member.name}</strong> chỉ hiện lần này. Giao riêng cho học sinh, không chiếu lên TV.</p>
        <p>Mã lớp: <strong>{selected.code}</strong> · Mã học sinh: <strong>{secret.member.code}</strong> · PIN: <strong>{secret.pin}</strong></p>
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => setSecret(null)}>Đã ghi lại, ẩn PIN</button>
      </div>}
      {members.length === 0 ? <p className="lesson-muted">Chưa có học sinh. Tạo từng hồ sơ rồi giao mã và PIN riêng.</p> : <ul style={{ listStyle: "none", padding: 0 }}>
        {members.map(member => <li className="lesson-card" key={member.id}>
          <strong>{member.name}</strong> · Mã học sinh: {member.code} {member.revoked ? "· Đã thu hồi quyền truy cập" : ""}
          <label htmlFor={prefix + member.id}>Nhóm của {member.name} ({member.code})</label>
          <select id={prefix + member.id} className="lesson-select" value={member.teamId || ""} disabled={busy || member.revoked} onChange={event => void mutate({ action: "member-update", classId, memberId: member.id, teamId: event.target.value || null })}>
            <option value="">Chưa xếp nhóm</option>{teams.map(team => <option key={team.id} value={team.id}>{team.title}</option>)}
          </select>
          <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => { if (window.confirm(`Cấp PIN mới cho ${member.name} (${member.code})? PIN cũ và các phiên đã đăng nhập sẽ hết hiệu lực.`)) void mutate({ action: "member-reset-pin", classId, memberId: member.id }); }}>{member.revoked ? "Cấp lại quyền và PIN mới" : "Đổi PIN"}</button>{" "}
          {!member.revoked && <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => { if (window.confirm(`Thu hồi quyền truy cập của ${member.name} (${member.code})? Lịch sử học tập vẫn được giữ.`)) void mutate({ action: "member-revoke", classId, memberId: member.id }); }}>Thu hồi quyền</button>}
        </li>)}
      </ul>}
    </>}
    {note && <p role="status">{note}</p>}
  </section>;
}
