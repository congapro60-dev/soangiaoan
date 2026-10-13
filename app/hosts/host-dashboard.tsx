"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Game scripts initialize on a full page load. */

import {useEffect, useRef, useState, type FormEvent} from "react";
import Link from "next/link";
import type {ChatGPTUser} from "../chatgpt-auth";

type Identity = {user: ChatGPTUser; isRoot: boolean; configured: boolean; systemRole: string | null; revoked: boolean};
type Room = {id: string; code: string; title: string; role: string | null; revision: number; mode?: string; lessonSessionId?: string | null};
type Invite = {id: string; expectedEmail: string; role: string; roomId: string | null; expiresAt: number; acceptedAt: number | null; revokedAt: number | null; token?: string};
type Member = {accountId: string; email: string | null; displayName: string | null; role: string; grantedAt: number; revokedAt: number | null};
type SystemHost = {accountId: string; email: string | null; displayName: string | null; role: string; createdAt: number; createdBy: string | null; revokedAt: number | null};
type JsonRecord = Record<string, unknown>;
type ActionResponse = {invite?: Invite; ok?: boolean};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function isIdentity(value: unknown): value is Identity {
  return isRecord(value) && typeof value.isRoot === "boolean" && typeof value.configured === "boolean" && typeof value.revoked === "boolean";
}

function isRoomsResponse(value: unknown): value is {rooms: Room[]} {
  return isRecord(value) && Array.isArray(value.rooms);
}

function isMembersResponse(value: unknown): value is {members: Member[]} {
  return isRecord(value) && Array.isArray(value.members);
}

function isInvitesResponse(value: unknown): value is {invites: Invite[]} {
  return isRecord(value) && Array.isArray(value.invites);
}
function isHostsResponse(value: unknown): value is {hosts: SystemHost[]; invites: Invite[]} {
  return isRecord(value) && Array.isArray(value.hosts) && Array.isArray(value.invites);
}

export function actionError(code: string | undefined): string { return ({
  AUTH_REQUIRED: "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  INVITE_INVALID: "Lời mời không hợp lệ, đã dùng, đã thu hồi hoặc đã hết hạn.",
  CLAIM_CONFLICT: "Phòng đã thay đổi hoặc mã quản trị cũ không còn hợp lệ.",
  HOSTS_UNAVAILABLE: "Dịch vụ host tạm thời không sẵn sàng. Vui lòng thử lại.",
  ACCOUNT_EMAIL_CONFLICT: "Email đã gắn với tài khoản khác. Hãy liên hệ quản trị viên.",
  INVALID_INVITE: "Kiểm tra email và vai trò của lời mời.",
  INVALID_CLAIM: "Kiểm tra mã phòng, revision nguyên và mã quản trị cũ.",
  MEMBERSHIP_INVALID: "Quyền thành viên đã thay đổi. Hãy tải lại danh sách.",
  CONFLICT: "Dữ liệu đã thay đổi. Hãy tải lại trước khi tiếp tục.",
  NOT_FOUND: "Không tìm thấy đối tượng. Hãy tải lại danh sách.",
} as Record<string, string>)[code || ""] || "Không thể hoàn tất thao tác. Kiểm tra dữ liệu rồi thử lại."; }

export function inviteAction(expectedEmail: string, role: string, roomId?: string) {
  return {action: "create-invite", expectedEmail: expectedEmail.trim().toLowerCase(), role, ...(roomId ? {roomId} : {})};
}

export function consumeInviteFragment(location: Pick<Location, "hash" | "pathname" | "search">, history: Pick<History, "replaceState">) {
  const token = new URLSearchParams(location.hash.slice(1)).get("invite");
  if (token !== null) history.replaceState(null, "", location.pathname + location.search);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

async function hostRequest<T extends JsonRecord>(method: "GET" | "POST", params: Record<string, string> = {}, body?: Record<string, unknown>): Promise<T> {
  const url = new URL("/api/hosts", window.location.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {method, cache: "no-store", headers: body ? {"content-type": "application/json"} : undefined, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin"}).catch(() => { throw new Error(actionError("HOSTS_UNAVAILABLE")); });
  const payload: unknown = await response.json().catch(() => ({}));
  const code = isRecord(payload) && typeof payload.code === "string" ? payload.code : undefined;
  if (!response.ok) throw Object.assign(new Error(actionError(code)), {code});
  if (!isRecord(payload)) throw new Error(actionError("HOSTS_UNAVAILABLE"));
  return payload as T;
}

export function roomDestination(room: Room, identity: {isRoot: boolean; revoked: boolean}) {
  if (identity.revoked && !identity.isRoot) return null;
  if (room.mode === "lesson") return room.lessonSessionId && (identity.isRoot || room.role === "owner" || room.role === "cohost") ? `/lessons?session=${encodeURIComponent(room.lessonSessionId)}` : null;
  return `/?view=teacher&room=${encodeURIComponent(room.id)}`;
}

function roleLabel(role: string | null | undefined) { return (({root: "Root", host: "Host hệ thống", owner: "Chủ phòng", cohost: "Đồng host", observer: "Quan sát viên"} as Record<string, string>)[role || ""] || "Chủ tài khoản"); }

export default function HostDashboard({user}: {user: ChatGPTUser}) {
  const [identityResponse, setIdentity] = useState<Identity | null>(null);
  const identity = identityResponse ?? {isRoot: false, configured: false, systemRole: null, revoked: false};
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hosts, setHosts] = useState<{hosts: SystemHost[]; invites: Invite[]}>({hosts: [], invites: []});
  const [selected, setSelected] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [status, setStatus] = useState("Đang tải dữ liệu…");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [roomEmail, setRoomEmail] = useState("");
  const [roomRole, setRoomRole] = useState("observer");
  const [claim, setClaim] = useState({roomId: "", adminKey: "", revision: ""});
  const [link, setLink] = useState("");
  const [removing, setRemoving] = useState<Room | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const locked = useRef(false);
  const initialized = useRef(false);
  const selection = useRef(0);
  const notice = useRef<HTMLParagraphElement>(null);
  const permissions = useRef<HTMLDetailsElement>(null);

  async function refresh() {
    try {
      const [nextIdentityRaw, nextRooms] = await Promise.all([hostRequest("GET", {kind: "identity"}), hostRequest("GET", {kind: "rooms"})]);
      if (!isIdentity(nextIdentityRaw) || !isRoomsResponse(nextRooms)) throw new Error(actionError("HOSTS_UNAVAILABLE"));
      const nextIdentity = nextIdentityRaw;
      setIdentity(nextIdentity); setRooms(nextRooms.rooms || []);
      if (nextIdentity.isRoot) {
        const nextHosts = await hostRequest("GET", {kind: "system-hosts"});
        if (!isHostsResponse(nextHosts)) throw new Error(actionError("HOSTS_UNAVAILABLE"));
        setHosts(nextHosts);
      }
      else setHosts({hosts: [], invites: []});
    } catch { throw new Error(actionError("HOSTS_UNAVAILABLE")); }
  }
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (window.location.hash === "#host-permissions" && permissions.current) permissions.current.open = true;
    const token = consumeInviteFragment(window.location, window.history);
    locked.current = true;
    setBusy(true);
    void (async () => {
      try {
        if (token) await hostRequest<ActionResponse>("POST", {}, {action: "accept-invite", token});
        await refresh();
        setStatus(token ? "Đã nhận lời mời và cập nhật quyền." : "Đã tải trạng thái quyền.");
      } catch (error) { setStatus(error instanceof Error ? error.message : actionError(undefined)); }
      finally { locked.current = false; setBusy(false); }
    })();
  }, []);
  async function act(body: Record<string, unknown>, success: string) {
    if (locked.current) return;
    if (String(body.action).startsWith("revoke-") && !window.confirm("Thu hồi quyền hoặc lời mời đã chọn? Người nhận sẽ mất quyền tương ứng; thao tác được máy chủ kiểm tra lại.")) return;
    locked.current = true; setBusy(true); setStatus("Đang xử lý…");
    try {
      const result = await hostRequest<ActionResponse>("POST", {}, body);
      if (result.invite?.token) setLink(`${window.location.origin}/hosts#invite=${encodeURIComponent(result.invite.token)}`);
      if (body.action === "claim-room") setClaim({roomId: "", adminKey: "", revision: ""});
      await refresh();
      if (selected) await openRoom(selected);
      setStatus(success);
    } catch (error) { setStatus(error instanceof Error ? error.message : actionError(undefined)); }
    finally { locked.current = false; setBusy(false); notice.current?.focus(); }
  }
  async function openRoom(room: Room) {
    if (permissions.current) {
      permissions.current.open = true;
      permissions.current.scrollIntoView({block: "start"});
      permissions.current.querySelector("summary")?.focus();
    }
    const request = ++selection.current;
    setSelected(room); setMembers([]); setInvites([]); setRoomRole("observer");
    if (identity?.revoked || !(identity?.isRoot || room.role === "owner")) return;
    try {
      const [m, i] = await Promise.all([hostRequest("GET", {kind: "members", roomId: room.id}), hostRequest("GET", {kind: "invites", roomId: room.id})]);
      if (!isMembersResponse(m) || !isInvitesResponse(i)) throw new Error(actionError("HOSTS_UNAVAILABLE"));
      if (request === selection.current) { setMembers(m.members); setInvites(i.invites); }
    } catch { setStatus("Không thể tải thành viên và lời mời của phòng. Hãy mở lại phòng để thử lại."); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void act(inviteAction(email, "host"), "Đã tạo lời mời host trong 24 giờ. Sao chép và gửi riêng cho người nhận."); }
  function submitRoom(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected) return; void act(inviteAction(roomEmail, roomRole, selected.id), "Đã tạo lời mời cho phòng trong 24 giờ."); }
  async function deleteRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!removing || locked.current || confirmCode !== removing.code) return;
    locked.current = true; setBusy(true);
    try {
      const response = await fetch("/api/escape", {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "delete-room", id: removing.id, revision: removing.revision, confirmCode, requestId: crypto.randomUUID()})});
      const result = await response.json() as {error?: string};
      if (!response.ok) throw new Error(result.error || "Không xóa được phòng. Tải lại danh sách rồi thử lại.");
      setSelected(current => current?.id === removing.id ? null : current);
      setRemoving(null); setConfirmCode("");
      await refresh(); setStatus("Đã chuyển vào Thùng rác. Mã vào phòng ngừng hoạt động; có thể khôi phục khi cần.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Không xóa được phòng."); }
    finally { locked.current = false; setBusy(false); notice.current?.focus(); }
  }

  return <main className="hosts-shell">
    <header className="hosts-header"><div><p className="hosts-kicker">KHÔNG GIAN GIÁO VIÊN</p><h1>Giáo viên</h1><p className="hosts-muted">Chọn cách tổ chức, rồi mở phòng của lớp.</p></div><div className="hosts-identity"><Link className="hosts-button" href="/">Trang học sinh</Link><strong>{user.displayName}</strong><span>{user.email}</span><span className="hosts-badge">{roleLabel(identity?.isRoot ? "root" : identity?.systemRole)}</span></div></header>
    <nav className="hosts-entry" aria-label="Chọn cách tổ chức">
      <a className="hosts-card hosts-entry-choice" href="/lessons/new"><strong>Tổ chức tiết học</strong><span>Chọn loại tiết, nội dung và cách tổ chức.</span></a>
      <a className="hosts-card hosts-entry-choice" href="/?view=teacher"><strong>Tạo phòng game</strong><span>Chọn thế giới, luật và hình thức luyện tập.</span></a>
      <a className="hosts-card hosts-entry-choice" href="#host-permissions" onClick={() => { if (permissions.current) permissions.current.open = true; }}><strong>Quản lý quyền giáo viên</strong><span>Mời giáo viên, phân quyền, nhận phòng cũ.</span></a>
    </nav>
    <p ref={notice} tabIndex={-1} className="hosts-status" role="status" aria-live="polite">{status}</p><a href="/learning-records" className="hosts-button">Hồ sơ học tập</a>{" "}<a href="/trash" className="hosts-button">Thùng rác</a>
    <section className="hosts-card hosts-section"><h2>Phiên của tôi</h2><p className="hosts-muted">Tiết học và phòng game đã tạo hoặc được giao.</p>{rooms.length === 0 ? <div><p>Chưa có phiên được giao.</p><div className="hosts-actions"><a className="hosts-button hosts-button-primary" href="/lessons/new">Tổ chức tiết học</a><a className="hosts-button" href="/?view=teacher">Tạo phòng game</a></div></div> : <ul className="hosts-list">{rooms.map(room => {
      const destination = roomDestination(room, identity);
      return <li key={room.id}><span><strong>{room.title || room.code}</strong><small>{room.mode === "lesson" ? "Tiết học" : "Phòng game"} · {room.code} · {roleLabel(room.role)}</small></span><div className="hosts-actions">{!identity.revoked && (identity.isRoot || room.role === "owner") && <button className="hosts-button" onClick={() => void openRoom(room)}>Quản lý thành viên</button>}{destination ? <a className="hosts-button hosts-button-primary" href={destination}>{room.mode === "lesson" ? "Mở tiết học" : "Mở phòng game"}</a> : <span className="hosts-muted">{identity.revoked ? "Quyền đã bị thu hồi." : room.role === "observer" ? "Tiết học chưa hỗ trợ màn hình quan sát viên." : "Chưa có liên kết tiết học hợp lệ."}</span>}{!identity.revoked && (identity.isRoot || room.role === "owner") && <button className="hosts-button hosts-button-danger" disabled={busy} aria-label={`Xóa ${room.mode === "lesson" ? "tiết học" : "phòng game"} ${room.title || room.code}`} onClick={() => { setRemoving(room); setConfirmCode(""); }}>Xóa</button>}</div></li>;
    })}</ul>}{removing && <form className="hosts-card" onSubmit={deleteRoom} aria-label="Xác nhận xóa phòng"><h3>Xóa {removing.title || removing.code}?</h3><p>Mã vào phòng sẽ ngừng hoạt động; người đang tham gia không tiếp tục được. Phòng chuyển vào Thùng rác để khôi phục khi cần. Bài làm được giữ; phiên này tạm không tính vào hộ chiếu.</p><label>Nhập mã phòng {removing.code} để xác nhận<input value={confirmCode} onChange={e => setConfirmCode(e.target.value.toUpperCase())} maxLength={6} required disabled={busy} /></label><div className="hosts-actions"><button className="hosts-button hosts-button-danger" disabled={busy || confirmCode !== removing.code}>Xác nhận xóa</button><button type="button" className="hosts-button" disabled={busy} onClick={() => { setRemoving(null); setConfirmCode(""); }}>Hủy</button></div></form>}</section>
    <details ref={permissions} id="host-permissions" className="hosts-permissions hosts-section"><summary>Quản lý quyền giáo viên</summary><div className="hosts-permissions-body">
    {!identity?.configured && <section className="hosts-warning"><strong>Root chưa được cấu hình.</strong><p>Thiết lập đồng thời <code>SITE_OWNER_EMAIL</code> và <code>SITE_OWNER_USER_ID</code> trên server để cấp host toàn cục. Người truy cập đầu tiên không tự động trở thành root.</p></section>}
    <section className="hosts-card"><h2>Mời giáo viên được tạo phòng</h2><p className="hosts-muted">Chỉ quản trị viên cấp quyền này. Giáo viên được mời có thể tạo phòng riêng; không tự có quyền quản lý mọi phòng. Hệ thống tạo liên kết để gửi riêng, không tự gửi email.</p><form onSubmit={submit}><label>Email người nhận<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><button disabled={busy || !identity?.isRoot} className="hosts-button hosts-button-primary">Tạo lời mời 24 giờ</button></form>{link && <div className="hosts-result"><label>Liên kết thủ công<input readOnly value={link} onFocus={e => e.currentTarget.select()} /></label><button className="hosts-button" onClick={() => void navigator.clipboard?.writeText(link)}>Sao chép liên kết</button><small>Gửi riêng liên kết này cho người nhận. Lời mời hết hạn sau 24 giờ.</small></div>}{identity?.isRoot && <ul className="hosts-list">{hosts.invites.map(i => <li key={i.id}><span>{i.expectedEmail} · {roleLabel(i.role)}</span><button className="hosts-button hosts-button-danger" disabled={busy || !!i.revokedAt} onClick={() => void act({action: "revoke-invite", inviteId: i.id}, "Đã thu hồi lời mời.")}>Thu hồi</button></li>)}</ul>}</section>
    {identity?.isRoot && <section className="hosts-card hosts-section"><h2>Host hiện tại</h2><ul className="hosts-list">{hosts.hosts.map(host => <li key={host.accountId}><span>{host.email || host.accountId} · {roleLabel(host.role)}</span><button className="hosts-button hosts-button-danger" disabled={busy} onClick={() => void act({action: "revoke-system-host", accountId: host.accountId}, "Đã thu hồi host.")}>Thu hồi</button></li>)}</ul></section>}
    {selected && <section className="hosts-card hosts-section"><div className="hosts-section-heading"><div><p className="hosts-kicker">QUẢN LÝ PHÒNG</p><h2>{selected.title || selected.code}</h2></div><button className="hosts-button" onClick={() => setSelected(null)}>Đóng</button></div><p className="hosts-muted">Mời đồng host hỗ trợ điều hành. Quan sát viên chỉ theo dõi phòng game; tiết học chưa hỗ trợ màn hình quan sát viên.</p><form onSubmit={submitRoom} className="hosts-inline-form"><label>Email<input required type="email" value={roomEmail} onChange={e => setRoomEmail(e.target.value)} /></label><label>Vai trò<select value={roomRole} onChange={e => setRoomRole(e.target.value)}><option value="observer">Quan sát viên</option><option value="cohost">Đồng host</option>{identity.isRoot && <option value="owner">Chủ phòng</option>}</select></label><button disabled={busy} className="hosts-button hosts-button-primary">Mời vào phòng</button></form><div className="hosts-two-col"><div><h3>Thành viên</h3><ul className="hosts-list">{members.map(member => <li key={member.accountId}><span>{member.displayName || member.email} · {roleLabel(member.role)}</span><button className="hosts-button hosts-button-danger" onClick={() => void act({action: "revoke-membership", roomId: selected.id, accountId: member.accountId, grantedAt: member.grantedAt}, "Đã thu hồi thành viên.")}>Thu hồi</button></li>)}</ul></div><div><h3>Lời mời</h3><ul className="hosts-list">{invites.map(invite => <li key={invite.id}><span>{invite.expectedEmail} · {roleLabel(invite.role)}</span><button className="hosts-button hosts-button-danger" onClick={() => void act({action: "revoke-invite", inviteId: invite.id}, "Đã thu hồi lời mời.")}>Thu hồi</button></li>)}</ul></div></div></section>}
    {identity?.isRoot && <section className="hosts-card hosts-section"><h2>Chuyển phòng cũ vào tài khoản</h2><p className="hosts-warning">Chỉ dùng khi di chuyển phòng cũ. Sau khi nhận, mã quản trị cũ tự mất hiệu lực. Bạn quản lý phòng bằng tài khoản.</p><form onSubmit={e => { e.preventDefault(); if (window.confirm("Nhận phòng cũ vào tài khoản? Mã quản trị cũ sẽ mất hiệu lực.")) void act({action: "claim-room", ...claim, revision: Number(claim.revision)}, "Đã nhận phòng. Mã quản trị cũ đã mất hiệu lực."); }} className="hosts-inline-form"><label>Room ID<input required value={claim.roomId} onChange={e => setClaim({...claim, roomId: e.target.value})} /></label><label>Revision<input required inputMode="numeric" value={claim.revision} onChange={e => setClaim({...claim, revision: e.target.value})} /></label><label>Mã quản trị cũ<input required type="password" value={claim.adminKey} onChange={e => setClaim({...claim, adminKey: e.target.value})} /></label><button disabled={busy} className="hosts-button hosts-button-danger">Chuyển phòng cũ vào tài khoản</button></form></section>}
    </div></details>
  </main>;
}
