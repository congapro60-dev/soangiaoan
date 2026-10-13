"use client";

import React, {useEffect, useRef, useState} from "react";
import MathText from "./MathText";

type Classroom = {id: string; title: string; code: string};
type Objective = {key: string; packageHash: string; code: string; statement: string; status: string; independentCount: number; supportedCount: number; pendingCount: number; lastSubmittedAt?: number};
type Member = {id: string; code: string; name: string; objectives: Objective[]; lastSubmittedAt?: number};
type Evidence = {evidenceId: string; sessionId: string; objectiveCode: string; objectiveStatement: string; assessed: boolean; assisted: boolean; ok: boolean | null; countsForMastery: boolean; submittedAt: number};
type PlanItem = {objectiveKey: string; objectiveCode: string; statement: string; activity: string; minutes: number; recheck: string; evidenceIds: string[]};
type PlanBody = {items: PlanItem[]; teacherNote: string};
type Plan = {id: string; revision: number; status: "draft" | "approved"; body: PlanBody; stale: boolean; updatedAt: number; versions?: Array<{revision: number; status: string; body: PlanBody; createdAt: number}>};
type Records = {class: Classroom; members: Member[]; total: number; offset: number; limit: number; backfillRequired?: boolean};
type Detail = {class: Classroom; member: Member; objectives: Objective[]; evidence: Evidence[]; plans: Plan[]; truncated?: boolean};
const LABELS: Record<string, string> = {no_evidence: "Chưa có minh chứng", pending: "Chờ chấm", supported: "Đang luyện / chưa đủ minh chứng tự làm", needs_support: "Cần luyện thêm", minimum_mastery: "Tự làm được mức cơ bản", standard_mastery: "Tự làm được mức chuẩn"};
const ERRORS: Record<string, string> = {AUTH_REQUIRED: "Phiên giáo viên đã hết hạn. Đăng nhập lại để tiếp tục.", NOT_FOUND: "Lớp hoặc học sinh không còn khả dụng. Tải lại danh sách.", FORBIDDEN: "Bạn không có quyền xem hồ sơ này.", CONFLICT: "Dữ liệu đã thay đổi. Mở lại hồ sơ trước khi lưu.", REQUEST_CONFLICT: "Dữ liệu đã thay đổi. Mở lại hồ sơ trước khi lưu.", PLAN_CONFLICT: "Kế hoạch đã được sửa ở nơi khác. Mở lại hồ sơ trước khi lưu.", STALE_PLAN: "Minh chứng đã thay đổi. Cập nhật lịch sử, tạo gợi ý mới trước khi duyệt.", PLAN_STALE: "Minh chứng đã thay đổi. Tạo gợi ý mới, kiểm tra lại trước khi duyệt.", STALE_EVIDENCE: "Minh chứng đã thay đổi. Tạo gợi ý mới trước khi duyệt.", RECORD_TRUNCATED: "Lịch sử vượt giới hạn xuất. Thu hẹp khoảng thời gian hoặc chọn một học sinh.", EVIDENCE_SNAPSHOT_CHANGED: "Minh chứng chưa cập nhật hoặc vừa thay đổi. Cập nhật lịch sử rồi thử lại."};
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isClass = (value: unknown): value is Classroom => isObject(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.code === "string";
const isObjective = (value: unknown): value is Objective => isObject(value) && ["key", "packageHash", "code", "statement", "status"].every(key => typeof value[key] === "string") && ["independentCount", "supportedCount", "pendingCount"].every(key => typeof value[key] === "number" && Number.isFinite(value[key]));
const isMember = (value: unknown): value is Member => isObject(value) && ["id", "name", "code"].every(key => typeof value[key] === "string") && Array.isArray(value.objectives) && value.objectives.every(isObjective);
function isPlan(value: unknown): value is Plan { return isObject(value) && typeof value.id === "string" && Number.isInteger(value.revision) && ["draft", "approved"].includes(String(value.status)) && typeof value.stale === "boolean" && isObject(value.body) && typeof value.body.teacherNote === "string" && Array.isArray(value.body.items) && value.body.items.length <= 30 && value.body.items.every(item => isObject(item) && ["objectiveKey", "objectiveCode", "statement", "activity", "recheck"].every(key => typeof item[key] === "string") && Number.isInteger(item.minutes) && Array.isArray(item.evidenceIds) && item.evidenceIds.every(id => typeof id === "string")) && (value.versions === undefined || (Array.isArray(value.versions) && value.versions.length <= 30 && value.versions.every(version => isObject(version) && typeof version.createdAt === "number" && isPlan({...version, id: "history", stale: false, versions: undefined})))); }
export function isRecords(value: unknown): value is Records { return isObject(value) && isClass(value.class) && Array.isArray(value.members) && value.members.length <= 50 && value.members.every(isMember) && Number.isInteger(value.total) && Number.isInteger(value.offset) && Number.isInteger(value.limit); }
export function isDetail(value: unknown): value is Detail { return isObject(value) && isClass(value.class) && isObject(value.member) && ["id", "name", "code"].every(key => typeof value.member === "object" && value.member !== null && typeof (value.member as Record<string, unknown>)[key] === "string") && Array.isArray(value.objectives) && value.objectives.every(isObjective) && Array.isArray(value.evidence) && value.evidence.length <= 500 && value.evidence.every(item => isObject(item) && ["evidenceId", "sessionId", "objectiveCode", "objectiveStatement"].every(key => typeof item[key] === "string") && ["assessed", "assisted", "countsForMastery"].every(key => typeof item[key] === "boolean") && (item.assessed ? typeof item.ok === "boolean" : item.ok === null) && typeof item.submittedAt === "number" && Number.isFinite(item.submittedAt)) && Array.isArray(value.plans) && value.plans.every(isPlan); }
export function memberStatus(member: Member) {
  const priorities = ["needs_support", "pending", "supported", "no_evidence", "minimum_mastery", "standard_mastery"];
  return priorities.find(status => member.objectives.some(objective => objective.status === status)) || "no_evidence";
}
export function recordsQuery(action: string, classId: string, from: string, to: string, offset = 0, memberId = "") {
  const query = new URLSearchParams({action, id: classId});
  if (action === "records") { query.set("offset", String(offset)); query.set("limit", "50"); }
  if (memberId) query.set("memberId", memberId);
  if (from) query.set("from", String(new Date(from + "T00:00:00").getTime()));
  if (to) query.set("to", String(new Date(to + "T23:59:59.999").getTime()));
  return query;
}
const dateLabel = (time?: number) => time && Number.isFinite(time) ? new Date(time).toLocaleString("vi-VN") : "Chưa có";
async function request(query?: URLSearchParams, body?: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch("/api/lesson-classes" + (query ? "?" + query : ""), {method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal, ...(body ? {headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)} : {})});
  const result: unknown = await response.json();
  if (!response.ok || (isObject(result) && result.error)) throw Error(ERRORS[String(isObject(result) && result.error)] || "Chưa hoàn tất thao tác. Kiểm tra mạng, tải lại hồ sơ rồi thử lại.");
  return result;
}

export default function LearningRecords() {
  const [classes, setClasses] = useState<Classroom[]>([]), [classId, setClassId] = useState(""), [classesLoading, setClassesLoading] = useState(true), [classesFailed, setClassesFailed] = useState(false);
  const [dates, setDates] = useState({from: "", to: ""}), [range, setRange] = useState({from: "", to: ""});
  const [offset, setOffset] = useState(0), [filter, setFilter] = useState("all"), [reload, setReload] = useState(0);
  const [records, setRecords] = useState<Records | null>(null), [memberId, setMemberId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null), [editing, setEditing] = useState<Plan | null>(null), [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false), [detailLoading, setDetailLoading] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const context = useRef(0), lock = useRef(false), detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void request(undefined, undefined, controller.signal).then(result => {
      if (!isObject(result) || !Array.isArray(result.classes) || !result.classes.every(isClass)) throw Error("Danh sách lớp chưa hợp lệ. Tải lại trang để thử lại.");
      if (!controller.signal.aborted) setClasses(result.classes);
    }).catch(error => { if (!controller.signal.aborted) {setNote(error.message); setClassesFailed(true);} }).finally(() => { if (!controller.signal.aborted) setClassesLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!classId) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true); setRecords(null);
      return request(recordsQuery("records", classId, range.from, range.to, offset), undefined, controller.signal);
    }).then(result => {
      if (controller.signal.aborted) return;
      if (!isRecords(result) || result.class.id !== classId) throw Error("Hồ sơ lớp chưa hợp lệ. Tải lại để thử lại.");
      if (!controller.signal.aborted) setRecords(result);
    }).catch(error => { if (!controller.signal.aborted) setNote(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [classId, range, offset, reload]);
  useEffect(() => {
    if (!classId || !memberId) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setDetailLoading(true); setDetail(null); setEditing(null); setDeleting(false);
      return request(recordsQuery("record", classId, range.from, range.to, 0, memberId), undefined, controller.signal);
    }).then(result => {
      if (controller.signal.aborted) return;
      if (!isDetail(result) || result.class.id !== classId || result.member.id !== memberId) throw Error("Hồ sơ học sinh chưa hợp lệ. Mở lại để thử lại.");
      if (!controller.signal.aborted) { setDetail(result); detailHeading.current?.focus(); }
    }).catch(error => { if (!controller.signal.aborted) setNote(error.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [classId, memberId, range, reload]);
  function clearSelection() { context.current++; setMemberId(""); setDetail(null); setDetailLoading(false); setEditing(null); setDeleting(false); setNote(""); }
  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (lock.current || !classId) return;
    const epoch = context.current;
    lock.current = true; setBusy(true); setNote("");
    try {
      const result = await request(undefined, {action, classId, ...(memberId ? {memberId} : {}), ...extra});
      if (epoch !== context.current) return;
      if (action === "records-backfill") {
        if (!isObject(result) || typeof result.done !== "boolean" || !(result.cursor === null || typeof result.cursor === "string")) throw Error("Chưa xác nhận được tiến độ cập nhật. Thử lại.");
        setCursor(result.done ? null : result.cursor); setReload(value => value + 1);
        setNote(result.done ? "Đã cập nhật lịch sử. Hồ sơ đã tải lại." : "Đã cập nhật một tiết. Bấm tiếp tục để cập nhật tiết kế tiếp.");
      } else if (action === "learning-plan-delete") {
        if (!isObject(result) || result.ok !== true) throw Error("Chưa xác nhận được thao tác xóa. Mở lại hồ sơ để kiểm tra.");
        setEditing(null); setDeleting(false); setReload(value => value + 1); setNote("Đã chuyển kế hoạch vào Thùng rác. Có thể khôi phục khi cần.");
      } else {
        if (!isObject(result) || !isPlan(result.plan)) throw Error("Bản kế hoạch chưa hợp lệ. Mở lại hồ sơ để kiểm tra.");
        const plan = result.plan;
        setEditing(plan); setDeleting(false); setDetail(current => current && ({...current, plans: [plan, ...current.plans.filter(item => item.id !== plan.id)]}));
        setNote(plan.status === "approved" ? "Đã duyệt kế hoạch. Chưa tự giao bài cho học sinh." : "Đã lưu bản nháp. Giáo viên kiểm tra trước khi duyệt.");
      }
    } catch (error) { if (epoch === context.current) setNote(error instanceof Error ? error.message : "Chưa hoàn tất thao tác."); }
    finally { lock.current = false; setBusy(false); }
  }
  const visible = records?.members.filter(member => filter === "all" || (filter === "missing" ? ["no_evidence", "supported"].includes(memberStatus(member)) : memberStatus(member) === filter)) || [];
  function updateItem(index: number, field: "activity" | "minutes" | "recheck", value: string) { setEditing(current => current && ({...current, body: {...current.body, items: current.body.items.map((item, i) => i === index ? {...item, [field]: field === "minutes" ? Number(value) : value} : item)}})); }
  const validPlan = !!editing && editing.body.items.length > 0 && editing.body.items.every(item => item.activity.trim() && item.recheck.trim() && Number.isInteger(item.minutes) && item.minutes >= 1 && item.minutes <= 60);
  const exportUrl = (format: string) => { const query = recordsQuery("records-export", classId, range.from, range.to, 0, memberId); query.set("format", format); query.set("offset", String(offset)); return "/api/lesson-classes?" + query; };
  async function downloadExport(format: "json" | "csv") {
    if (lock.current) return;
    const epoch = context.current;
    lock.current = true; setBusy(true); setNote("Đang chuẩn bị tệp xuất…");
    try {
      const response = await fetch(exportUrl(format), {credentials: "same-origin", cache: "no-store"});
      if (!response.ok) {const error: unknown = await response.json(); throw Error(ERRORS[String(isObject(error) && error.error)] || "Chưa xuất được hồ sơ. Cập nhật lịch sử hoặc thu hẹp thời gian rồi thử lại.");}
      const blob = await response.blob();
      if (epoch !== context.current) return;
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = "ho-so-hoc-tap." + format; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNote("Đã chuẩn bị tệp xuất. Kiểm tra danh sách tệp tải xuống.");
    } catch (error) {if (epoch === context.current) setNote(error instanceof Error ? error.message : "Chưa xuất được hồ sơ.");}
    finally {lock.current = false; setBusy(false);}
  }
  return <main className="hosts-shell records-shell">
    <header className="hosts-header"><div><p className="hosts-kicker">Dành cho giáo viên</p><h1>Hồ sơ học tập</h1><p>Minh chứng cá nhân qua các tiết học, giúp chọn bước hỗ trợ tiếp theo.</p></div><a className="hosts-button" href="/hosts">Trang Giáo viên</a></header>
    <p role="status" aria-live="polite" className="hosts-status">{note}</p>
    <section className="hosts-card"><form className="records-filters" onSubmit={event => {event.preventDefault(); if (dates.from && dates.to && dates.from > dates.to) {setNote("Ngày kết thúc phải từ ngày bắt đầu trở đi."); return;} clearSelection(); setRange({...dates}); setOffset(0);}}>
      <label>Lớp<select value={classId} disabled={busy} onChange={event => {clearSelection(); setClassId(event.target.value); setOffset(0); setCursor(null); setRecords(null);}}><option value="">Chọn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.title} · {item.code}</option>)}</select></label>
      <label>Từ ngày<input type="date" value={dates.from} onChange={event => setDates({...dates, from: event.target.value})} /></label><label>Đến ngày<input type="date" value={dates.to} min={dates.from || undefined} onChange={event => setDates({...dates, to: event.target.value})} /></label>
      <button className="hosts-button" disabled={!classId || busy}>Áp dụng thời gian</button>
    </form>{classesLoading ? <p role="status">Đang tải danh sách lớp…</p> : classesFailed ? <button className="hosts-button" type="button" onClick={() => window.location.reload()}>Tải lại trang</button> : !classes.length && <p>Chưa có lớp để xem. Tạo hoặc quản lý lớp tại <a href="/lessons/new">Tổ chức tiết học</a>.</p>}</section>
    {loading && <p role="status">Đang tải hồ sơ lớp…</p>}
    {records && <section className="hosts-card records-section" aria-label="Học sinh trong lớp">
      <div className="records-toolbar"><h2>{records.class.title}</h2>{memberId ? <button className="hosts-button" disabled={busy} onClick={clearSelection}>Về danh sách học sinh</button> : <label>Lọc trên trang này<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tất cả</option><option value="needs_support">Cần luyện thêm</option><option value="pending">Chờ chấm</option><option value="missing">Chưa đủ minh chứng tự làm</option></select></label>}</div>
      {!memberId && <p className="hosts-muted">{records.total ? `${offset + 1}–${Math.min(offset + records.members.length, records.total)} / ${records.total} học sinh. Tối đa 50 em mỗi trang.` : "Lớp chưa có học sinh."} Thiếu dữ liệu không đồng nghĩa học sinh yếu.</p>}
      {records.backfillRequired && <div className="records-notice"><p>Lịch sử cũ cần cập nhật để hồ sơ đầy đủ. Mỗi lần chỉ xử lý một tiết.</p><button className="hosts-button" disabled={busy} onClick={() => void act("records-backfill", {cursor})}>{busy ? "Đang cập nhật…" : cursor ? "Tiếp tục cập nhật lịch sử" : "Cập nhật lịch sử cũ"}</button></div>}
      {!memberId && <>{!!records.members.length && !visible.length && <p>Không có học sinh khớp bộ lọc trên trang này.</p>}
      <ul className="records-members">{visible.map(member => <li key={member.id}><button className="records-member" disabled={busy} onClick={() => {clearSelection(); setMemberId(member.id);}}><strong>{member.name} <small>· {member.code}</small></strong><span>{LABELS[memberStatus(member)]}</span>{member.objectives.find(item => item.status === memberStatus(member)) && <small><MathText text={member.objectives.find(item => item.status === memberStatus(member))?.statement} /></small>}<small>Minh chứng mới nhất: {dateLabel(member.lastSubmittedAt)}</small></button></li>)}</ul>
      <nav className="records-toolbar" aria-label="Trang học sinh"><button className="hosts-button" disabled={offset === 0 || busy} onClick={() => {clearSelection(); setOffset(Math.max(0, offset - 50));}}>Trang trước</button><button className="hosts-button" disabled={offset + 50 >= records.total || busy} onClick={() => {clearSelection(); setOffset(offset + 50);}}>Trang sau</button></nav></>}
      <details className="records-export"><summary>{memberId ? "Xuất hồ sơ này" : "Xuất trang này"}</summary><p>{memberId ? "Chỉ xuất học sinh đang chọn." : "Xuất tối đa 50 học sinh của trang hiện tại."} Dùng khoảng thời gian đã áp dụng. Nếu lịch sử quá lớn, thu hẹp thời gian hoặc chọn một học sinh. Chưa kết nối tự động với GiaoAnDewey.</p><a className="hosts-button" href={exportUrl("json")} aria-disabled={busy} onClick={event => {event.preventDefault(); void downloadExport("json");}} download>Tải JSON</a>{" "}<a className="hosts-button" href={exportUrl("csv")} aria-disabled={busy} onClick={event => {event.preventDefault(); void downloadExport("csv");}} download>Tải CSV</a></details>
    </section>}
    {(memberId || detailLoading) && <section className="hosts-card records-section" aria-busy={detailLoading}><h2 ref={detailHeading} tabIndex={-1}>{detail ? detail.member.name : "Hồ sơ học sinh"}</h2>{detailLoading && <p>Đang tải minh chứng…</p>}{detail && <>
      <p>Mã học sinh: {detail.member.code}. Mục tiêu của các bài khác nhau được giữ riêng.</p>
      {!detail.objectives.length && <p>Chưa có minh chứng. Có thể bắt đầu bằng một lần kiểm tra ngắn do giáo viên chọn.</p>}
      <ul className="records-objectives">{detail.objectives.map(objective => <li key={objective.key}><strong>{objective.code} · <MathText text={objective.statement} /></strong><p>{LABELS[objective.status] || LABELS.no_evidence} · {objective.independentCount} tự làm · {objective.supportedCount} có hỗ trợ · {objective.pendingCount} chờ chấm</p></li>)}</ul>
      <details><summary>Dòng thời gian minh chứng ({detail.evidence.length})</summary>{(detail.truncated || detail.evidence.length === 500) && <p>Đang hiển thị tối đa 500 minh chứng. Thu hẹp khoảng thời gian để xem đầy đủ.</p>}{!detail.evidence.length && <p>Chưa có minh chứng trong khoảng đã chọn.</p>}<ol className="records-timeline">{detail.evidence.map(item => <li key={item.evidenceId} id={"evidence-" + item.evidenceId}><p><time>{dateLabel(item.submittedAt)}</time> · {item.objectiveCode} · <MathText text={item.objectiveStatement} /></p><p>{!item.assessed ? "Chờ chấm" : item.assisted ? "Có hỗ trợ" : "Tự làm"}{item.assessed ? item.ok ? " · Đã đạt ở lần này" : " · Cần kiểm tra lại" : ""}{!item.countsForMastery && item.assessed ? " · Không tính thành minh chứng thành thạo độc lập" : ""}</p><a href={"/lessons?session=" + encodeURIComponent(item.sessionId)}>Mở tiết học gốc</a></li>)}</ol></details>
      <section className="records-plans"><h3>Kế hoạch học tiếp</h3><p>Gợi ý dùng toàn bộ lịch sử học tập, tạo bản nháp để giáo viên sửa, duyệt. Khoảng thời gian ở trên chỉ lọc minh chứng hiển thị. Không tự giao thêm bài.</p><button className="hosts-button hosts-button-primary" disabled={busy} onClick={() => void act("learning-plan-suggest")}>Gợi ý kế hoạch</button>
        {!!detail.plans.length && <label className="records-plan-picker">Kế hoạch đã lưu<select value={editing?.id || ""} disabled={busy} onChange={event => {setEditing(detail.plans.find(plan => plan.id === event.target.value) || null); setDeleting(false);}}><option value="">Chọn kế hoạch</option>{detail.plans.map(plan => <option key={plan.id} value={plan.id}>{plan.status === "approved" ? "Đã duyệt" : "Bản nháp"} · {dateLabel(plan.updatedAt)}{plan.stale ? " · Cần xem lại" : ""}</option>)}</select></label>}
        {editing && <form onSubmit={event => {event.preventDefault(); void act("learning-plan-save", {planId: editing.id, revision: editing.revision, body: editing.body, status: "draft"});}}>
          {editing.stale && <p className="records-notice">Minh chứng đã thay đổi. Kế hoạch cần xem lại; tạo gợi ý mới trước khi duyệt. Bản đã duyệt vẫn được giữ.</p>}
          {editing.status === "approved" && <p>Đang xem bản đã duyệt. Lưu chỉnh sửa thành phiên bản mới; không tự thay bản đã duyệt.</p>}
          {!!editing.versions?.length && <details><summary>Lịch sử phiên bản ({editing.versions.length})</summary>{editing.versions.map(version => <section key={version.revision}><h4>Phiên bản {version.revision} · {version.status === "approved" ? "Đã duyệt" : "Bản nháp"} · {dateLabel(version.createdAt)}</h4>{version.body.items.map((item,index) => <p key={index}><MathText text={item.statement} /> · <MathText text={item.activity} /> · {item.minutes} phút · <MathText text={item.recheck} /></p>)}<p>{version.body.teacherNote}</p></section>)}</details>}
          {!editing.body.items.length && <p>Chưa có mục tiêu hoặc hoạt động để duyệt. Chọn học liệu phù hợp, cập nhật lịch sử rồi tạo gợi ý mới.</p>}
          {editing.body.items.map((item, index) => <fieldset key={item.objectiveKey + index}><legend>{item.objectiveCode} · <MathText text={item.statement} /></legend><label>Hoạt động<textarea required maxLength={1500} value={item.activity} disabled={busy} onChange={event => updateItem(index, "activity", event.target.value)} /></label><div aria-label="Xem trước hoạt động"><MathText text={item.activity} /></div><label>Thời lượng (phút)<input type="number" required min={1} max={60} step={1} value={item.minutes || ""} disabled={busy} onChange={event => updateItem(index, "minutes", event.target.value)} /></label><label>Cách kiểm tra lại<textarea required maxLength={1000} value={item.recheck} disabled={busy} onChange={event => updateItem(index, "recheck", event.target.value)} /></label><div aria-label="Xem trước kiểm tra lại"><MathText text={item.recheck} /></div><details><summary>Minh chứng làm căn cứ ({item.evidenceIds.length})</summary>{!item.evidenceIds.length ? <p>Chưa có minh chứng; cần kiểm tra trước khi kết luận.</p> : <ul>{item.evidenceIds.map(id => <li key={id}>{detail.evidence.some(evidence => evidence.evidenceId === id) ? <a href={"#evidence-" + id} onClick={() => {document.getElementById("evidence-" + id)?.closest("details")?.setAttribute("open", "");}}>Xem minh chứng · {dateLabel(detail.evidence.find(evidence => evidence.evidenceId === id)?.submittedAt)}</a> : "Minh chứng ngoài khoảng đang xem. Mở rộng khoảng thời gian để đối chiếu."}</li>)}</ul>}</details></fieldset>)}
          <label>Ghi chú của giáo viên<textarea maxLength={2000} value={editing.body.teacherNote} disabled={busy} onChange={event => setEditing({...editing, body: {...editing.body, teacherNote: event.target.value}})} /></label>
          <div className="records-actions"><button className="hosts-button" disabled={busy || !validPlan}>Lưu nháp</button><button type="button" className="hosts-button hosts-button-primary" disabled={busy || !validPlan || editing.stale} onClick={() => void act("learning-plan-save", {planId: editing.id, revision: editing.revision, body: editing.body, status: "approved"})}>Duyệt kế hoạch</button><button type="button" className="hosts-button" disabled={busy} onClick={() => setDeleting(true)}>Xóa kế hoạch</button></div>
          {deleting && <div className="records-notice"><p>Chuyển kế hoạch này vào Thùng rác? Có thể khôi phục tại <a href="/trash">Thùng rác</a>.</p><button type="button" className="hosts-button hosts-button-danger" disabled={busy} onClick={() => void act("learning-plan-delete", {planId: editing.id, revision: editing.revision})}>Chuyển vào Thùng rác</button>{" "}<button type="button" className="hosts-button" disabled={busy} onClick={() => setDeleting(false)}>Hủy</button></div>}
        </form>}
      </section>
    </>}</section>}
    {classId && <button className="hosts-button records-section" disabled={busy || loading || detailLoading} onClick={() => {context.current++; setReload(value => value + 1); setNote("");}}>Tải lại hồ sơ</button>}
    <p className="hosts-muted records-section">Sao, thứ hạng, mảnh Khám phá và sản phẩm nhóm không thay cho minh chứng Toán cá nhân.</p>
  </main>;
}
