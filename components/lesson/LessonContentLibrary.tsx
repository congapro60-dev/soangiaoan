"use client";

import { useState } from "react";

type Kind = "package" | "source" | "job" | "plan";
type Item = { kind: Kind; id: string; title: string; status?: string };
const labels: Record<Kind, string> = { package: "Học liệu đã lưu", source: "Giáo án và ý tưởng", job: "Bản nháp AI", plan: "Kịch bản đã duyệt" };
const errors: Record<string, string> = { AUTH_REQUIRED: "Đăng nhập giáo viên để quản lý học liệu.", NOT_FOUND: "Mục này đã bị xóa hoặc bạn không có quyền.", GENERATION_RUNNING: "AI đang xử lý. Chờ hoàn tất rồi xóa bản nháp.", CONFIRM_REQUIRED: "Thông tin xác nhận chưa khớp. Tải lại danh sách rồi thử lại." };
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data: unknown = await response.json();
  if (!response.ok) {
    const code = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "";
    throw Error(errors[code] || "Chưa thực hiện được. Thử lại; dữ liệu vẫn được giữ.");
  }
  return data as T;
}

export default function LessonContentLibrary({ onRemoved }: { onRemoved?: (kind: Kind, id: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState<Kind>("package");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    setBusy(true); setNote("");
    try {
      const results = await Promise.allSettled([
        request<{ packages: Array<{ row_id: string; package_id: string; version: string; status: string }> }>("/api/lessons?kind=library").then(data => data.packages.map(item => ({ kind: "package" as const, id: item.row_id, title: item.package_id + " · " + item.version, status: item.status }))),
        request<{ sources: Array<{ id: string; originalName: string; status: string }> }>("/api/lessons/sources").then(data => data.sources.map(item => ({ kind: "source" as const, id: item.id, title: item.originalName, status: item.status }))),
        request<{ jobs: Array<{ id: string; model: string; createdAt: number; status: string }> }>("/api/lessons/proposal?kind=list").then(data => data.jobs.map(item => ({ kind: "job" as const, id: item.id, title: item.model + " · " + new Date(item.createdAt).toLocaleString("vi-VN"), status: item.status }))),
        request<{ plans: Array<{ row_id: string; package_version: string; created_at: number }> }>("/api/lessons?kind=plans").then(data => data.plans.map(item => ({ kind: "plan" as const, id: item.row_id, title: "Kịch bản " + item.package_version + " · " + new Date(item.created_at).toLocaleString("vi-VN") })))
      ]);
      const next: Item[] = [];
      results.forEach(result => {
        if (result.status === "rejected") { setNote("Một phần danh sách chưa tải được. Bấm Tải lại trước khi xóa."); return; }
        next.push(...result.value);
      });
      setItems(next); setPage(0); setLoaded(true);
    } catch { setNote("Chưa tải được thư viện. Thử lại."); } finally { setBusy(false); }
  };
  const remove = async (item: Item) => {
    setBusy(true); setNote("");
    try {
      const url = item.kind === "source" ? "/api/lessons/sources" : item.kind === "job" ? "/api/lessons/proposal" : "/api/lessons";
      const body = item.kind === "source" ? { id: item.id, confirmName: item.title } : item.kind === "job" ? { action: "delete", id: item.id, confirmId: item.id } : { action: "delete", kind: item.kind, id: item.id, confirmId: item.id };
      await request(url, { method: item.kind === "source" ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setItems(current => current.filter(candidate => candidate.kind !== item.kind || candidate.id !== item.id)); setPage(0); setConfirm(null);
      setNote("Đã chuyển vào Thùng rác. Có thể khôi phục; các tiết đã mở và lịch sử học tập vẫn được giữ."); onRemoved?.(item.kind, item.id);
    } catch (error) { setNote(error instanceof Error ? error.message : "Chưa xóa được. Thử lại."); } finally { setBusy(false); }
  };
  const visible = items.filter(item => item.kind === kind);
  return <details className="lesson-card" onToggle={event => { if (event.currentTarget.open && !loaded && !busy) void load(); }}>
    <summary>Quản lý và xóa học liệu</summary><p><a href="/trash">Thùng rác · Khôi phục học liệu</a></p>
    <p className="lesson-muted">Mục đã xóa được giữ trong Thùng rác để khôi phục. Nội dung gốc, nguồn đối chiếu và lịch sử của các tiết đã mở vẫn được lưu. Chuyển nguồn vào Thùng rác không giải phóng dung lượng; xóa bản nháp AI không hoàn lại lượt tạo. Kết quả đang xử lý của nguồn bị xóa sẽ không được dùng; khôi phục không tự chạy lại. Nguồn bị dừng khi đang đọc cần tải lên lại.</p>
    <label>Loại nội dung<select className="lesson-select" value={kind} disabled={busy} onChange={event => { setKind(event.target.value as Kind); setPage(0); setConfirm(null); }}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => void load()}>Tải lại</button>
    {loaded && !visible.length && <p>Chưa có nội dung trong mục này.</p>}
    <ul style={{ listStyle: "none", padding: 0 }}>{visible.slice(page * 5, page * 5 + 5).map(item => <li key={item.id} className="lesson-card"><strong>{item.title}</strong>
      {confirm === item.id ? <div role="group" aria-label={"Xác nhận xóa " + item.title}><p>Chuyển mục này vào Thùng rác? Có thể khôi phục sau; nội dung của các tiết đã mở vẫn còn.</p><button type="button" className="lesson-button lesson-button-danger" disabled={busy} onClick={() => void remove(item)}>Chuyển vào Thùng rác</button>{" "}<button type="button" className="lesson-button lesson-button-outline" disabled={busy} onClick={() => setConfirm(null)}>Hủy</button></div> : <button type="button" className="lesson-button lesson-button-outline" disabled={busy} aria-label={"Xóa " + item.title} onClick={() => setConfirm(item.id)}>Xóa</button>}
      {item.kind === "job" && item.status === "running" && <p>AI đang xử lý; xóa sau khi hoàn tất.</p>}
    </li>)}</ul>
    {visible.length > 5 && <div><button type="button" className="lesson-button lesson-button-outline" disabled={busy || page === 0} onClick={() => { setPage(current => current - 1); setConfirm(null); }}>Trang trước</button>{" "}<span>Trang {page + 1}/{Math.ceil(visible.length / 5)}</span>{" "}<button type="button" className="lesson-button lesson-button-outline" disabled={busy || (page + 1) * 5 >= visible.length} onClick={() => { setPage(current => current + 1); setConfirm(null); }}>Trang sau</button></div>}
    {note && <p role="status">{note}</p>}
  </details>;
}
