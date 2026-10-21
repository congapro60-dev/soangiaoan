"use client";

import { useEffect, useState } from "react";

const purposes = [
  { id: "formation", title: "Hình thành kiến thức", description: "Khám phá kiến thức mới, trao đổi và chốt bài cùng giáo viên." },
  { id: "practice", title: "Luyện tập", description: "Củng cố bài vừa học qua các nhiệm vụ thực hành." },
  { id: "review", title: "Ôn tập", description: "Hệ thống kiến thức, luyện các nội dung cần củng cố." },
  { id: "exam", title: "Kiểm tra", description: "Soạn đề, đáp án và thiết lập bài kiểm tra." },
] as const;

type PackageChoice = { row_id: string; package_id: string; version: string; status: string; title?: string; grade?: number; slotMinutes?: number; authoredId?: string; week?: number; period?: number; category?: string };
type AuthoredChoice = { id: string; title: string; version: string; status: string; grade?: number; slotMinutes?: number; week?: number; period?: number; category?: string };
type ExamChoice = {id:string;title:string;grade:number;week:number;minutes:number};
const categories: Record<string,string> = {formation:"Hình thành kiến thức",practice:"Luyện tập",review:"Ôn tập",elective:"Tự chọn · Game tổng hợp",exam:"Kiểm tra",feedback:"Trả và chữa bài",project:"Báo cáo dự án",orientation:"Giới thiệu"};
const packageStatusLabel = (item: PackageChoice) => item.authoredId
  ? `Bài có sẵn, cần lưu và GV duyệt · ${item.status === "draft" ? "teacher_review_required" : item.status}`
  : ({ draft: "Bản nháp", approved: "Đã duyệt", published: "Đã phát hành" } as Record<string, string>)[item.status] || item.status;

export type LaunchMode = "normal" | "quick";

export function lessonCreationDestination(purpose: string, source: string, grade: string, minutes: string, packageId: string, launchMode: LaunchMode = "normal") {
  if (!purposes.some(item => item.id === purpose) || !["10", "11", "12"].includes(grade) || !/^\d+$/.test(minutes) || Number(minutes) < 5 || Number(minutes) > 240) return null;
  if (!(["normal", "quick"] as const).includes(launchMode)) return null;
  const query = new URLSearchParams({ setup: "new" });
  if (purpose !== "exam") {
    if (!["import", "library", "authored"].includes(source) || (source !== "import" && !/^[A-Za-z0-9_-]{1,128}$/.test(packageId))) return null;
    query.set("purpose", purpose);
    query.set("source", source);
    if (source === "library" || source === "authored") query.set("package", packageId);
  }
  if(purpose!=="exam")query.set("grade", grade);
  query.set("minutes", String(Number(minutes)));
  if (launchMode === "quick") query.set("launch", launchMode);
  return `${purpose === "exam" ? "/exams" : "/lessons"}?${query}`;
}

export default function LessonCreationWizard(props?: { initialLaunchMode?: LaunchMode }) {
  const launchMode: LaunchMode = props?.initialLaunchMode === "quick" ? "quick" : "normal";
  const quickLaunch = launchMode === "quick";
  const [step, setStep] = useState(quickLaunch ? 2 : 1);
  const [purpose, setPurpose] = useState(quickLaunch ? "review" : "");
  const [source, setSource] = useState(quickLaunch ? "library" : "");
  const [grade, setGrade] = useState("11");
  const [minutes, setMinutes] = useState("40");
  const [packages, setPackages] = useState<PackageChoice[]>([]);
  const [packageId, setPackageId] = useState("");
  const [loading, setLoading] = useState(quickLaunch);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [week, setWeek] = useState("");
  const [category, setCategory] = useState("");
  const [exams, setExams] = useState<ExamChoice[]>([]);

  function prepareLibrary() {
    setLoading(true);
    setError("");
    setPackages([]);
    setPackageId("");
    setExams([]);
  }

  useEffect(() => {
    if (step !== 2 || source !== "library" || purpose === "exam") return;
    let cancelled = false;
    void (async () => {
      try {
        const [response, authoredResponse] = quickLaunch
          ? [{ ok: true, json: async () => ({ packages: [] as PackageChoice[] }) }, await fetch("/api/lesson-content", { cache: "no-store" })]
          : await Promise.all([fetch("/api/lessons?kind=list", { cache: "no-store" }), fetch("/api/lesson-content", { cache: "no-store" })]);
        if (!response.ok || !authoredResponse.ok) throw Error("Không tải được thư viện. Hãy thử lại.");
        const data = await response.json() as { packages?: PackageChoice[] };
        const authoredData = await authoredResponse.json() as { lessons?: AuthoredChoice[]; exams?: ExamChoice[] };
        if (!Array.isArray(data.packages) || !Array.isArray(authoredData.lessons)) throw Error("Không tải được thư viện. Hãy thử lại.");
        if (!cancelled) setPackages([
          ...data.packages.filter(item => typeof item.row_id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item.row_id)).map(item => ({ ...item, authoredId: undefined })),
          ...authoredData.lessons.filter(item => typeof item.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item.id)).map(item => ({ ...item, row_id: "source:" + item.id, package_id: item.id, authoredId: item.id })),
        ]);
        if(!cancelled)setExams(Array.isArray(authoredData.exams)?authoredData.exams:[]);
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
  const contentPurpose=selectedPackage?.category?(['formation','practice'].includes(selectedPackage.category)?selectedPackage.category:'review'):purpose;
  const target = lessonCreationDestination(contentPurpose, selectedPackage?.authoredId ? "authored" : source, grade, minutes,
    selectedPackage?.authoredId || selectedPackage?.row_id || "", launchMode);
  const validMinutes = /^\d+$/.test(minutes) && Number(minutes) >= 5 && Number(minutes) <= 240;
  const searchable = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g,"d");
  const catalogPackages = quickLaunch ? packages.filter(item => Boolean(item.authoredId)) : packages;
  const visiblePackages = catalogPackages.filter(item => (!item.authoredId || !item.grade || item.grade === Number(grade)) && (!week || item.week === Number(week)) && (!category || item.category===category) && searchable(`${item.title || item.package_id} ${item.period || ""}`).includes(searchable(search)));
  const visibleExams=quickLaunch ? [] : exams.filter(item=>item.grade===Number(grade)&&(!week||item.week===Number(week))&&(!category||category==='exam')&&searchable(item.title).includes(searchable(search)));
  const visibleWeeks=Array.from(new Set([...visiblePackages.filter(item=>item.week).map(item=>item.week!),...visibleExams.map(item=>item.week)])).sort((a,b)=>a-b);
  const loadedWeeks=Array.from(new Set([...catalogPackages.map(item=>item.week),...(quickLaunch ? [] : exams.map(item=>item.week))]))
    .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
    .sort((a,b)=>a-b);
  const weekOptions=loadedWeeks.length>0?loadedWeeks:Array.from({length:38},(_,index)=>index+1);
  const semesterTitle=Number(week)>0?(Number(week)>=19?'Học kỳ II':'Học kỳ I'):(visibleWeeks.some(value=>value>=19)?(visibleWeeks.some(value=>value<19)?'Học kỳ I & II':'Học kỳ II'):'Học kỳ I');
  function choosePackage(id:string){
    const selected=packages.find(item=>item.row_id===id);
    setPackageId(id);
    if(selected&&[10,11,12].includes(Number(selected.grade)))setGrade(String(selected.grade));
    if(selected&&Number.isInteger(selected.slotMinutes)&&Number(selected.slotMinutes)>=5&&Number(selected.slotMinutes)<=240)setMinutes(String(selected.slotMinutes));
  }

  return <main className="lesson-shell">
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <header className="lesson-header">
        <div><p className="lesson-kicker">{quickLaunch ? "Tạo phòng game · Thư viện bài học" : "Khởi tạo tiết học"} · Bước {step}/2</p><h1 className="lesson-title">{step === 1 ? "Chọn loại tiết học" : selectedPurpose?.title}</h1></div>
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
            <select id="creation-grade" className="lesson-select" value={grade} disabled={Boolean(savedGrade&&!selectedPackage?.week)} onChange={event => {setGrade(event.target.value);setPackageId("");}}>
              {[10, 11, 12].map(value => <option key={value} value={value}>Lớp {value}</option>)}
            </select>
          </div>}
          <div className="lesson-field-group"><label htmlFor="creation-minutes">Thời lượng (phút)</label>
            <input id="creation-minutes" className="lesson-input" type="number" min={5} max={240} step={1} value={minutes} disabled={Boolean(savedMinutes)} aria-invalid={!validMinutes} aria-describedby="creation-minutes-help" onChange={event => setMinutes(event.target.value)} />
            <small id="creation-minutes-help" style={{ color: validMinutes ? "var(--lesson-text-muted)" : "var(--lesson-danger)" }}>{validMinutes ? "Thường dùng 20, 40 hoặc 80 phút." : "Nhập số phút nguyên từ 5 đến 240."}</small>
          </div>
        </div>
        {purpose === "exam" ? <p>Tiếp tục đến màn soạn đề kiểm tra để chọn nội dung, câu hỏi và đáp án.</p> : <section className="lesson-form-section" aria-labelledby="creation-content-title">
          <h2 id="creation-content-title" className="lesson-form-section-title">{quickLaunch ? "Chọn bài authored để mở cấu hình phòng" : "Chọn nội dung trước"}</h2>
          <p>{quickLaunch ? "Danh sách lấy từ catalogue bài đã biên soạn. Gói vẫn giữ trạng thái bản nháp/teacher review; bước mở phòng dùng pipeline lesson session hiện có." : "Dùng học liệu đã lưu hoặc đưa giáo án, ý tưởng của thầy cô vào để soạn bài."}</p>
          <div className="lesson-form-grid" role="group" aria-label="Nguồn nội dung">
            <button type="button" className={`lesson-button ${source === "library" ? "lesson-button-primary" : "lesson-button-outline"}`} aria-pressed={source === "library"} onClick={() => { if (source !== "library") { prepareLibrary(); setSource("library"); } }}>Chọn từ thư viện</button>
            <button type="button" className={`lesson-button ${source === "import" ? "lesson-button-primary" : "lesson-button-outline"}`} aria-pressed={source === "import"} onClick={() => setSource("import")}>Đưa giáo án hoặc ý tưởng vào</button>
          </div>
          {source === "import" && <p>Ở màn tiếp theo, tải DOCX, PDF, Markdown hoặc nhập ý tưởng. Sau khi soạn nội dung, thầy cô xem gợi ý thiết lập trò chơi và chỉnh lại.</p>}
          {source === "library" && <div className="lesson-field-group">
            <label htmlFor="creation-search">Tìm tên bài hoặc số tiết</label>
            <input id="creation-search" className="lesson-input" value={search} onChange={event=>{setSearch(event.target.value);setPackageId("");}} placeholder="Ví dụ: cấp số cộng, tích phân, 38" />
            <label htmlFor="creation-week">Tuần học</label>
            <select id="creation-week" className="lesson-select" value={week} onChange={event=>{setWeek(event.target.value);setPackageId("");}}>
              <option value="">Tất cả tuần và bài mẫu</option>
              {weekOptions.map(value=><option key={value} value={value}>Tuần {value}</option>)}
            </select>
            <label htmlFor="creation-category">Mục đích / loại tiết trong thư viện</label>
            <select id="creation-category" className="lesson-select" value={category} onChange={event=>{setCategory(event.target.value);setPackageId("");}}>
              <option value="">Tất cả loại tiết</option>
              {Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
            {visibleWeeks.length>0&&<section aria-label={`Học liệu ${semesterTitle} lớp ${grade}`}>
              <h3>Lớp {grade} · Discover · {semesterTitle}</h3>
              <p>Chọn tuần rồi chọn bài theo loại tiết. Tự chọn là game ôn tổng hợp; bài và đề đều cần GV duyệt.</p>
              {visibleWeeks.map(value=><details key={`${grade}-${value}`} className="lesson-form-card" open={week===String(value)||Boolean(search)||selectedPackage?.week===value}>
                <summary style={{cursor:'pointer',minHeight:44,padding:8}}><strong>Tuần {value}</strong> · {visiblePackages.filter(item=>item.week===value).length} tiết{visibleExams.some(item=>item.week===value)?' · Có đề kiểm tra':''}</summary>
                {Object.entries(categories).filter(([key])=>key!=='exam').map(([key,label])=>{
                  const rows=visiblePackages.filter(item=>item.week===value&&item.category===key).sort((a,b)=>(a.period||0)-(b.period||0));
                  return rows.length>0&&<section key={key} aria-label={`${label} tuần ${value}`}><h4>{label} · {rows.length}</h4>
                    {rows.map(item=><button type="button" key={item.row_id} className="lesson-form-card" aria-pressed={packageId===item.row_id} onClick={()=>choosePackage(item.row_id)} style={{display:'block',width:'100%',textAlign:'left',color:'inherit',cursor:'pointer',padding:12,minHeight:56,borderColor:packageId===item.row_id?'var(--lesson-primary)':undefined}}>
                      <strong>Tiết {item.period} · {item.slotMinutes} phút</strong><span style={{display:'block',marginTop:4}}>{item.title}</span><small style={{display:'block',marginTop:4,color:'var(--lesson-text-muted)'}}>{packageStatusLabel(item)}</small>
                    </button>)}
                  </section>;
                })}
                {visibleExams.filter(item=>item.week===value).map(item=><section key={item.id}><h4>Kiểm tra · {item.minutes} phút</h4><p>{item.title}</p><div style={{display:'flex',flexWrap:'wrap',gap:8}}><a className="lesson-button lesson-button-outline" href={`/api/lesson-content?exam=${item.id}&format=questions`}>Tải đề</a><a className="lesson-button lesson-button-outline" href={`/api/lesson-content?exam=${item.id}&format=solutions`}>Đáp án GV</a></div></section>)}
              </details>)}
            </section>}
            {visiblePackages.some(item=>!item.week)&&<>
            <label htmlFor="creation-package">Học liệu đã lưu và bài có sẵn</label>
            <select id="creation-package" className="lesson-select" disabled={loading || !packages.length} value={selectedPackage?.week?'':packageId} onChange={event => choosePackage(event.target.value)}>
              <option value="">{loading ? "Đang tải thư viện…" : "Chọn một học liệu"}</option>
              {visiblePackages.filter(item=>!item.week).map(item => <option key={item.row_id} value={item.row_id}>{item.title || item.package_id} · {item.version} · {packageStatusLabel(item)}</option>)}
            </select>
            </>}
            {loading&&<p role="status">Đang tải thư viện…</p>}
            {!loading && packages.length>0 && !visiblePackages.length&&!visibleExams.length && <p role="status">Không có bài phù hợp. Thử đổi khối, tuần hoặc từ khóa.</p>}
            {selectedPackage?.week&&<p role="status"><strong>Đã chọn: Lớp {selectedPackage.grade} · Tuần {selectedPackage.week} · Tiết {selectedPackage.period} · {categories[selectedPackage.category||'']}</strong><br/>{selectedPackage.title}</p>}
            {selectedPackage && <p role="status">Học liệu đã lưu giữ nguyên nội dung, khối lớp và thời lượng có sẵn. Loại tiết đã chọn dùng để tổ chức bài này. Muốn soạn lại theo yêu cầu khác, chọn “Đưa giáo án hoặc ý tưởng vào”.</p>}
            {!loading && !error && !packages.length && <p role="status">Thư viện chưa có học liệu. Chọn “Đưa giáo án hoặc ý tưởng vào” để soạn bài mới.</p>}
            {error && <div role="alert"><p>{error}</p><button type="button" className="lesson-button" onClick={() => { prepareLibrary(); setRetry(value => value + 1); }}>Thử lại</button></div>}
          </div>}
        </section>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, position:'sticky',bottom:0,background:'var(--lesson-bg)',padding:'12px 0',zIndex:2 }}>
          <button type="button" className="lesson-button lesson-button-outline" onClick={() => setStep(1)}>Quay lại</button>
          {target ? <a className="lesson-button lesson-button-primary" href={target}>{purpose === "exam" ? "Tiếp tục soạn đề" : "Tiếp tục soạn nội dung"}</a> : <button type="button" className="lesson-button lesson-button-primary" disabled>Tiếp tục soạn nội dung</button>}
        </div>
      </>}
    </div>
  </main>;
}
