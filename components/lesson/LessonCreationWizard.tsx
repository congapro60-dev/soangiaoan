"use client";

import { useEffect, useState } from "react";

const purposes = [
  { id: "formation", title: "Hình thành kiến thức", description: "Khám phá kiến thức mới, trao đổi và chốt bài cùng giáo viên." },
  { id: "practice", title: "Luyện tập", description: "Củng cố bài vừa học qua các nhiệm vụ thực hành." },
  { id: "review", title: "Ôn tập", description: "Hệ thống kiến thức, luyện các nội dung cần củng cố." },
  { id: "exam", title: "Kiểm tra", description: "Soạn đề, đáp án và thiết lập bài kiểm tra." },
] as const;

type PackageChoice = { row_id: string; package_id: string; version: string; status: string; title?: string; grade?: number; slotMinutes?: number; authoredId?: string };
type AuthoredChoice = { id: string; title: string; version: string; status: string; grade?: number; slotMinutes?: number };

export function lessonCreationDestination(purpose: string, source: string, grade: string, minutes: string, packageId: string) {
  if (!purposes.some(item => item.id === purpose) || !["10", "11", "12"].includes(grade) || !/^\d+$/.test(minutes) || Number(minutes) < 5 || Number(minutes) > 240) return null;
  const query = new URLSearchParams({ setup: "new" });
  if (purpose !== "exam") {
    if (!["import", "library", "authored"].includes(source) || (source !== "import" && !/^[A-Za-z0-9_-]{1,128}$/.test(packageId))) return null;
    query.set("purpose", purpose);
    query.set("source", source);
    if (source === "library" || source === "authored") query.set("package", packageId);
  }
  if(purpose!=="exam")query.set("grade", grade);
  query.set("minutes", String(Number(minutes)));
  return `${purpose === "exam" ? "/exams" : "/lessons"}?${query}`;
}

export default function LessonCreationWizard() {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [source, setSource] = useState("");
  const [grade, setGrade] = useState("11");
  const [minutes, setMinutes] = useState("40");
  const [packages, setPackages] = useState<PackageChoice[]>([]);
  const [packageId, setPackageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  function prepareLibrary() {
    setLoading(true);
    setError("");
    setPackages([]);
    setPackageId("");
  }

  useEffect(() => {
    if (step !== 2 || source !== "library" || purpose === "exam") return;
    let cancelled = false;
    void (async () => {
      try {
        const [response, authoredResponse] = await Promise.all([fetch("/api/lessons?kind=list", { cache: "no-store" }), fetch("/api/lesson-content", { cache: "no-store" })]);
        if (!response.ok || !authoredResponse.ok) throw Error("Không tải được thư viện. Hãy thử lại.");
        const data = await response.json() as { packages?: PackageChoice[] };
        const authoredData = await authoredResponse.json() as { lessons?: AuthoredChoice[] };
        if (!Array.isArray(data.packages) || !Array.isArray(authoredData.lessons)) throw Error("Không tải được thư viện. Hãy thử lại.");
        if (!cancelled) setPackages([
          ...data.packages.filter(item => typeof item.row_id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item.row_id)).map(item => ({ ...item, authoredId: undefined })),
          ...authoredData.lessons.filter(item => typeof item.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item.id)).map(item => ({ ...item, row_id: "source:" + item.id, package_id: item.id, authoredId: item.id })),
        ]);
      } catch {
        if (!cancelled) setError("Không tải được thư viện. Hãy thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, source, purpose, retry]);

  const selectedPurpose = purposes.find(item => item.id === purpose);
  const selectedPackage = source === "library" ? packages.find(item => item.row_id === packageId) : undefined;
  const savedGrade = selectedPackage && [10, 11, 12].includes(Number(selectedPackage.grade));
  const savedMinutes = selectedPackage && Number.isInteger(selectedPackage.slotMinutes) && Number(selectedPackage.slotMinutes) >= 5 && Number(selectedPackage.slotMinutes) <= 240;
  const target = lessonCreationDestination(purpose, selectedPackage?.authoredId ? "authored" : source, grade, minutes,
    selectedPackage?.authoredId || selectedPackage?.row_id || "");
  const validMinutes = /^\d+$/.test(minutes) && Number(minutes) >= 5 && Number(minutes) <= 240;

  return <main className="lesson-shell">
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <header className="lesson-header">
        <div><p className="lesson-kicker">Khởi tạo tiết học · Bước {step}/2</p><h1 className="lesson-title">{step === 1 ? "Chọn loại tiết học" : selectedPurpose?.title}</h1></div>
        <a className="lesson-button lesson-button-outline" href="/hosts">Hủy · về trang Giáo viên</a>
      </header>
      {step === 1 ? <>
        <p>Thầy cô muốn tổ chức tiết học nào?</p>
        <div className="lesson-form-grid" role="group" aria-label="Loại tiết học" style={{gap:10}}>
          {purposes.map(item => <button key={item.id} type="button" className="lesson-form-card" aria-pressed={purpose === item.id}
            style={{ color: "inherit", textAlign: "left", cursor: "pointer", minHeight: 96, padding:12, marginBottom:0, borderColor: purpose === item.id ? "var(--lesson-primary)" : undefined }}
            onClick={() => { setPurpose(item.id); setSource(""); setPackageId(""); }}>
            <strong>{item.title}</strong><span style={{ display: "block", marginTop: 8, color: "var(--lesson-text-muted)" }}>{item.description}</span>
          </button>)}
        </div>
        <button type="button" className="lesson-button lesson-button-primary" disabled={!purpose} onClick={() => { if (source === "library") prepareLibrary(); setStep(2); }}>Tiếp tục</button>
      </> : <>
        <div className="lesson-form-grid">
          {purpose!=="exam"&&<div className="lesson-field-group"><label htmlFor="creation-grade">Khối lớp</label>
            <select id="creation-grade" className="lesson-select" value={grade} disabled={Boolean(savedGrade)} onChange={event => setGrade(event.target.value)}>
              {[10, 11, 12].map(value => <option key={value} value={value}>Lớp {value}</option>)}
            </select>
          </div>}
          <div className="lesson-field-group"><label htmlFor="creation-minutes">Thời lượng (phút)</label>
            <input id="creation-minutes" className="lesson-input" type="number" min={5} max={240} step={1} value={minutes} disabled={Boolean(savedMinutes)} aria-invalid={!validMinutes} aria-describedby="creation-minutes-help" onChange={event => setMinutes(event.target.value)} />
            <small id="creation-minutes-help" style={{ color: validMinutes ? "var(--lesson-text-muted)" : "var(--lesson-danger)" }}>{validMinutes ? "Thường dùng 20, 40 hoặc 80 phút." : "Nhập số phút nguyên từ 5 đến 240."}</small>
          </div>
        </div>
        {purpose === "exam" ? <p>Tiếp tục đến màn soạn đề kiểm tra để chọn nội dung, câu hỏi và đáp án.</p> : <section className="lesson-form-section" aria-labelledby="creation-content-title">
          <h2 id="creation-content-title" className="lesson-form-section-title">Chọn nội dung trước</h2>
          <p>Dùng học liệu đã lưu hoặc đưa giáo án, ý tưởng của thầy cô vào để soạn bài.</p>
          <div className="lesson-form-grid" role="group" aria-label="Nguồn nội dung">
            <button type="button" className={`lesson-button ${source === "library" ? "lesson-button-primary" : "lesson-button-outline"}`} aria-pressed={source === "library"} onClick={() => { if (source !== "library") { prepareLibrary(); setSource("library"); } }}>Chọn từ thư viện</button>
            <button type="button" className={`lesson-button ${source === "import" ? "lesson-button-primary" : "lesson-button-outline"}`} aria-pressed={source === "import"} onClick={() => setSource("import")}>Đưa giáo án hoặc ý tưởng vào</button>
          </div>
          {source === "import" && <p>Ở màn tiếp theo, tải DOCX, PDF, Markdown hoặc nhập ý tưởng. Sau khi soạn nội dung, thầy cô xem gợi ý thiết lập trò chơi và chỉnh lại.</p>}
          {source === "library" && <div className="lesson-field-group">
            <label htmlFor="creation-package">Học liệu đã lưu và bài có sẵn</label>
            <select id="creation-package" className="lesson-select" disabled={loading || !packages.length} value={packageId} onChange={event => {
              const selected = packages.find(item => item.row_id === event.target.value);
              setPackageId(event.target.value);
              if (selected && [10, 11, 12].includes(Number(selected.grade))) setGrade(String(selected.grade));
              if (selected && Number.isInteger(selected.slotMinutes) && Number(selected.slotMinutes) >= 5 && Number(selected.slotMinutes) <= 240) setMinutes(String(selected.slotMinutes));
            }}>
              <option value="">{loading ? "Đang tải thư viện…" : "Chọn một học liệu"}</option>
              {packages.map(item => <option key={item.row_id} value={item.row_id}>{item.title || item.package_id} · {item.version} · {item.authoredId ? "Bài có sẵn, cần lưu và GV duyệt" : ({ draft: "Bản nháp", approved: "Đã duyệt", published: "Đã phát hành" } as Record<string, string>)[item.status] || item.status}</option>)}
            </select>
            {selectedPackage && <p role="status">Học liệu đã lưu giữ nguyên nội dung, khối lớp và thời lượng có sẵn. Loại tiết đã chọn dùng để tổ chức bài này. Muốn soạn lại theo yêu cầu khác, chọn “Đưa giáo án hoặc ý tưởng vào”.</p>}
            {!loading && !error && !packages.length && <p role="status">Thư viện chưa có học liệu. Chọn “Đưa giáo án hoặc ý tưởng vào” để soạn bài mới.</p>}
            {error && <div role="alert"><p>{error}</p><button type="button" className="lesson-button" onClick={() => { prepareLibrary(); setRetry(value => value + 1); }}>Thử lại</button></div>}
          </div>}
        </section>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button type="button" className="lesson-button lesson-button-outline" onClick={() => setStep(1)}>Quay lại</button>
          {target ? <a className="lesson-button lesson-button-primary" href={target}>{purpose === "exam" ? "Tiếp tục soạn đề" : "Tiếp tục soạn nội dung"}</a> : <button type="button" className="lesson-button lesson-button-primary" disabled>Tiếp tục soạn nội dung</button>}
        </div>
      </>}
    </div>
  </main>;
}
