import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardCopy, Loader2, MessageSquareText, NotebookPen } from 'lucide-react';
import type { Student } from '../../../types';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import { buildParentSafeReport } from '../../../lib/classroom/parentSafeReport';
import { loadPpct, groupByWeek } from '../../../data/ppct';
import { buildScheduleContent, buildHomeworkDraft, buildSubjectComment } from '../../../lib/ssm/ssmDrafts';

interface Props {
  classId: string;
  teacherId: string;
  className: string;
  classGrade: string;
  students: Student[];
  showToast: (message: string, icon?: string) => void;
}

/** Chép cả HTML lẫn text để dán vào ô định dạng của SSM vẫn giữ được gạch đầu dòng; fallback text thuần. */
const copyRich = async (html: string, plain: string, showToast: (m: string, i?: string) => void) => {
  try {
    if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    showToast('Đã chép — dán vào SSM.', '📋');
  } catch {
    showToast('Không chép được, hãy chọn và copy thủ công.', '⚠️');
  }
};

const copyText = async (text: string, showToast: (m: string, i?: string) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Đã chép — dán vào SSM.', '📋');
  } catch {
    showToast('Không chép được, hãy chọn và copy thủ công.', '⚠️');
  }
};

const htmlToPlain = (html: string): string => html
  .replace(/<\/li>/g, '\n').replace(/<li>/g, '- ').replace(/<\/(h3|p)>/g, '\n')
  .replace(/<[^>]+>/g, '').replace(/\n{2,}/g, '\n').trim();

const Card = ({ icon: Icon, title, desc, children }: { icon: typeof CalendarDays; title: string; desc: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-600" /><p className="text-sm font-black text-slate-800">{title}</p></div>
    <p className="mt-1 text-xs font-medium text-slate-500">{desc}</p>
    <div className="mt-3">{children}</div>
  </div>
);

/** 3 thẻ "soạn sẵn để dán vào SSM": lịch báo giảng, BTVN, nhận xét môn cho phụ huynh. App không tự ghi vào SSM. */
export const SsmDraftCards = ({ classId, teacherId, className, classGrade, students, showToast }: Props) => {
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([listAssignmentsForClass(classId, teacherId), listSubmissionsForClass(classId, teacherId)])
      .then(([a, s]) => { if (alive) { setAssignments(a); setSubmissions(s); } })
      .catch((e) => { if (alive) setLoadErr(e instanceof Error ? e.message : 'Không tải được dữ liệu lớp.'); });
    return () => { alive = false; };
  }, [classId, teacherId]);

  return (
    <div className="space-y-4">
      {loadErr && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{loadErr}</p>}
      <ScheduleCard className={className} classGrade={classGrade} showToast={showToast} />
      <HomeworkCard assignments={assignments} showToast={showToast} />
      <CommentCard className={className} students={students} assignments={assignments} submissions={submissions} showToast={showToast} />
    </div>
  );
};

const ScheduleCard = ({ className, classGrade, showToast }: { className: string; classGrade: string; showToast: Props['showToast'] }) => {
  const [week, setWeek] = useState(1);
  const [lessons, setLessons] = useState<{ title: string; detail?: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const grade = Number(classGrade);

  const load = async () => {
    setBusy(true);
    try {
      const ppct = await loadPpct('TDS', grade);
      const wk = ppct ? groupByWeek(ppct.lessons).find((g) => g.week === week) : null;
      setLessons(wk ? wk.lessons.map((l) => ({ title: l.title, ...(l.detail ? { detail: l.detail } : {}) })) : []);
    } finally {
      setBusy(false);
    }
  };

  const label = `Tuần ${week}`;
  const html = lessons ? buildScheduleContent(className, 'VN TOÁN', label, lessons) : '';

  return (
    <Card icon={CalendarDays} title="Lịch báo giảng tuần" desc="App dựng nội dung tuần theo phân phối chương trình. Cô chép vào ô báo giảng SSM rồi sắp theo buổi.">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-slate-600">Tuần</label>
        <input type="number" min={1} max={40} value={week} onChange={(e) => setWeek(Math.max(1, Number(e.target.value) || 1))} className="min-h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm" />
        <button type="button" disabled={busy || !Number.isInteger(grade)} onClick={() => void load()} className="min-h-9 rounded-lg bg-indigo-600 px-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">Xem nội dung</button>
        {lessons && lessons.length > 0 && (
          <button type="button" onClick={() => void copyRich(html, htmlToPlain(html), showToast)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700"><ClipboardCopy className="h-4 w-4" /> Chép</button>
        )}
      </div>
      {busy && <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</p>}
      {!Number.isInteger(grade) && <p className="mt-2 text-sm font-semibold text-amber-700">Lớp chưa rõ khối nên chưa lấy phân phối chương trình được.</p>}
      {lessons && (
        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
          {lessons.length === 0 ? <span className="text-slate-400">Tuần {week} không có bài trong phân phối.</span> : (
            <><div className="font-bold">{className} – VN TOÁN · {label}</div>
              <ul className="mt-1 list-disc pl-5">{lessons.map((l, i) => <li key={i}>{l.title}{l.detail ? ` — ${l.detail}` : ''}</li>)}</ul></>
          )}
        </div>
      )}
    </Card>
  );
};

const HomeworkCard = ({ assignments, showToast }: { assignments: AssignmentDoc[]; showToast: Props['showToast'] }) => {
  const btvn = useMemo(() => assignments.filter((a) => a.type !== 'exam'), [assignments]);
  return (
    <Card icon={NotebookPen} title="Bài tập về nhà" desc="Chép tên bài, hạn nộp, nội dung để dán vào form BTVN của SSM.">
      {btvn.length === 0 ? <p className="text-sm text-slate-400">Lớp chưa có bài tập về nhà trong app.</p> : (
        <div className="space-y-2">
          {btvn.map((a) => {
            const d = buildHomeworkDraft({ title: a.title, description: a.description, dueAt: a.dueAt });
            return (
              <div key={a.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">{d.name}</div>
                    <div className="text-xs text-slate-500">Hạn: {d.deadline || '(không đặt hạn)'}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => void copyText(d.name, showToast)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">Tên</button>
                    {d.deadline && <button type="button" onClick={() => void copyText(d.deadline, showToast)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">Hạn</button>}
                    {d.contentHtml && <button type="button" onClick={() => void copyRich(d.contentHtml, htmlToPlain(d.contentHtml), showToast)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">Nội dung</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const CommentCard = ({ className, students, assignments, submissions, showToast }: {
  className: string; students: Student[]; assignments: AssignmentDoc[]; submissions: SubmissionDoc[]; showToast: Props['showToast'];
}) => {
  const asgInput = useMemo(() => assignments.map((a) => ({ id: a.id, title: a.title, maxScore: a.maxScore ?? null, ...(a.dueAt ? { dueAt: a.dueAt } : {}) })), [assignments]);
  const byStudent = useMemo(() => {
    const m = new Map<string, SubmissionDoc[]>();
    for (const s of submissions) { const l = m.get(s.studentId) ?? []; l.push(s); m.set(s.studentId, l); }
    return m;
  }, [submissions]);

  return (
    <Card icon={MessageSquareText} title="Nhận xét môn cho phụ huynh" desc="Soạn sẵn nhận xét từng em (chỉ từ bài đã duyệt). Cô soát rồi dán vào ô nhận xét môn học của SSM.">
      {students.length === 0 ? <p className="text-sm text-slate-400">Lớp chưa có học sinh.</p> : (
        <div className="space-y-2">
          {students.map((st) => {
            const report = buildParentSafeReport({ studentId: st.id, studentName: st.name, className, assignments: asgInput, submissions: byStudent.get(st.id) ?? [], profile: null });
            const comment = buildSubjectComment(report);
            return (
              <div key={st.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-800">{st.name}</div>
                  <button type="button" onClick={() => void copyText(comment, showToast)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"><ClipboardCopy className="h-3.5 w-3.5" /> Chép</button>
                </div>
                <p className="mt-1 text-sm text-slate-600">{comment}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
