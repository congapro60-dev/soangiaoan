import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, Loader2, RefreshCw, Unlink, X } from 'lucide-react';
import type { AssignmentDoc, ClassSheetSync, SubmissionDoc } from '../../../lib/classroom/types';
import { listAssignmentsForClass, listClassRoster, listSubmissionsForClass, type RosterStudent } from '../../../lib/classroom/submissionService';
import { setClassSheetSync } from '../../../lib/classroom/teacherService';
import {
  applySheetRequests,
  readSpreadsheetInfo,
  readTabSnapshot,
  spreadsheetIdFromUrl,
  type SpreadsheetInfo,
  type SpreadsheetTab,
} from '../../../lib/classroom/sheetsApi';
import {
  SHEET_STATUS,
  buildSheetRequests,
  cellAddress,
  checkSheetLayout,
  describeLayoutProblem,
  matchStudents,
  planSheetSync,
  type SheetSnapshot,
  type StudentMatch,
} from '../../../lib/classroom/sheetSync';

interface SheetSyncPanelProps {
  classId: string;
  teacherId: string;
  sheetSync?: ClassSheetSync | null;
  onChanged: () => void | Promise<void>;
  showToast: (message: string, type?: string) => void;
}

const columnName = (column: number): string => cellAddress(1, column).replace(/\d+$/, '');

const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Có lỗi khi làm việc với Google Sheet.';

/** Chỉ bài giao nộp ảnh/file là BTVN; đề online và bài luyện không lên sheet. */
const isHomework = (assignment: AssignmentDoc): boolean =>
  assignment.type !== 'exam' && (assignment.purpose ?? 'assignment') === 'assignment';

interface LinkCheck {
  info: SpreadsheetInfo;
  tab: SpreadsheetTab;
  problem: string | null;
  match: StudentMatch | null;
  studentCount: number;
}

interface SyncData {
  snapshot: SheetSnapshot;
  assignments: AssignmentDoc[];
  submissions: SubmissionDoc[];
  roster: RosterStudent[];
}

const StudentProblems = ({ match }: { match: StudentMatch }) => {
  const groups = [
    { label: 'Có trong app nhưng không tìm thấy trên sheet', names: match.rosterWithoutRow },
    { label: 'Có trên sheet nhưng không có trong app', names: match.rowsWithoutStudent },
    { label: 'Trùng tên — không đoán, bỏ qua', names: match.ambiguous },
  ].filter(group => group.names.length > 0);
  if (groups.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
      <p className="font-black">Các em sau sẽ không được điền — sửa tên cho khớp rồi đồng bộ lại:</p>
      {groups.map(group => (
        <p key={group.label} className="mt-1"><span className="font-black">{group.label}:</span> {group.names.join(', ')}</p>
      ))}
    </div>
  );
};

/**
 * Nút nối và đồng bộ BTVN sang Google Sheet của lớp.
 *
 * Không có gì chạy tự động: chỉ khi giáo viên bấm "Đồng bộ", app đọc sheet, dựng bản xem trước,
 * và chỉ ghi khi giáo viên bấm "Ghi vào Sheet".
 */
export const SheetSyncPanel = ({ classId, teacherId, sheetSync, onChanged, showToast }: SheetSyncPanelProps) => {
  const [mode, setMode] = useState<'idle' | 'link' | 'sync'>('idle');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [linkInput, setLinkInput] = useState('');
  const [info, setInfo] = useState<SpreadsheetInfo | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);
  const [linkCheck, setLinkCheck] = useState<LinkCheck | null>(null);

  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [excludedNew, setExcludedNew] = useState<Set<string>>(new Set());
  const [addLate, setAddLate] = useState(true);

  const close = () => {
    setMode('idle');
    setError('');
    setBusy('');
    setInfo(null);
    setTabId(null);
    setLinkCheck(null);
    setSyncData(null);
    setExcludedNew(new Set());
  };

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy('');
    }
  };

  // ── Nối sheet ─────────────────────────────────────────────────────────────

  const readFile = () => run('Đang đọc file…', async () => {
    const spreadsheetId = spreadsheetIdFromUrl(linkInput);
    if (!spreadsheetId) throw new Error('Link chưa đúng. Dán link Google Sheet dạng https://docs.google.com/spreadsheets/d/…');
    const result = await readSpreadsheetInfo(spreadsheetId);
    setInfo(result);
    setTabId(result.tabs[0]?.sheetId ?? null);
    setLinkCheck(null);
  });

  const checkTab = () => run('Đang kiểm tra tab…', async () => {
    const tab = info?.tabs.find(item => item.sheetId === tabId);
    if (!info || !tab) throw new Error('Chọn một tab trước đã.');
    const [snapshot, roster] = await Promise.all([
      readTabSnapshot(info.spreadsheetId, tab, info.timeZone),
      listClassRoster(classId),
    ]);
    const problem = checkSheetLayout(snapshot);
    setLinkCheck({
      info,
      tab,
      problem: problem ? describeLayoutProblem(problem) : null,
      match: problem ? null : matchStudents(roster, snapshot.students),
      studentCount: roster.length,
    });
  });

  const saveLink = () => run('Đang lưu…', async () => {
    if (!linkCheck || linkCheck.problem) return;
    await setClassSheetSync(classId, {
      spreadsheetId: linkCheck.info.spreadsheetId,
      spreadsheetTitle: linkCheck.info.title,
      sheetId: linkCheck.tab.sheetId,
      sheetTitle: linkCheck.tab.title,
    });
    await onChanged();
    showToast(`Đã nối tab "${linkCheck.tab.title}" cho lớp.`, 'success');
    close();
  });

  const unlink = () => run('Đang bỏ nối…', async () => {
    await setClassSheetSync(classId, null);
    await onChanged();
    showToast('Đã bỏ nối Google Sheet. Dữ liệu trên sheet vẫn giữ nguyên.', 'success');
    close();
  });

  // ── Đồng bộ ───────────────────────────────────────────────────────────────

  const startSync = () => {
    if (!sheetSync) return;
    setMode('sync');
    void run('Đang đọc sheet và bài nộp…', async () => {
      const fileInfo = await readSpreadsheetInfo(sheetSync.spreadsheetId);
      // Tìm theo gid chứ không theo tên: giáo viên đổi tên tab thì vẫn đúng tab.
      const tab = fileInfo.tabs.find(item => item.sheetId === sheetSync.sheetId);
      if (!tab) throw new Error(`Không còn thấy tab "${sheetSync.sheetTitle}" (có thể đã bị xoá hoặc ẩn). Nối lại tab khác.`);
      const [snapshot, assignments, submissions, roster] = await Promise.all([
        readTabSnapshot(sheetSync.spreadsheetId, tab, fileInfo.timeZone),
        listAssignmentsForClass(classId, teacherId),
        listSubmissionsForClass(classId, teacherId),
        listClassRoster(classId),
      ]);
      const problem = checkSheetLayout(snapshot);
      if (problem) throw new Error(describeLayoutProblem(problem));
      setSyncData({ snapshot, assignments: assignments.filter(isHomework), submissions, roster });
    });
  };

  const planInput = useMemo(() => syncData && {
    snapshot: syncData.snapshot,
    assignments: syncData.assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt,
      targetStudentIds: assignment.targetStudentIds,
    })),
    submissions: syncData.submissions.map(submission => ({
      studentId: submission.studentId,
      assignmentId: submission.assignmentId,
      createdAt: submission.createdAt,
    })),
    roster: syncData.roster,
    appOrigin: window.location.origin,
    nowMs: Date.now(),
  }, [syncData]);

  const lateMissing = Boolean(syncData && !syncData.snapshot.statusOptions.includes(SHEET_STATUS.muon));

  const newCandidates = useMemo(() => {
    if (!planInput) return [];
    return planSheetSync({ ...planInput, addLateOption: false }).columns.filter(column => column.source === 'created');
  }, [planInput]);

  const plan = useMemo(() => {
    if (!planInput) return null;
    const createFor = new Set(newCandidates.map(column => column.assignmentId).filter(id => !excludedNew.has(id)));
    return planSheetSync({ ...planInput, createFor, addLateOption: lateMissing && addLate });
  }, [planInput, newCandidates, excludedNew, lateMissing, addLate]);

  const applyPlan = () => run('Đang ghi vào Sheet…', async () => {
    if (!plan || !syncData || !sheetSync) return;
    const requests = buildSheetRequests(plan, syncData.snapshot);
    await applySheetRequests(sheetSync.spreadsheetId, syncData.snapshot.sheetId, requests);
    showToast(`Đã ghi vào Sheet: ${plan.counts.statusWrites} ô trạng thái${plan.counts.created ? `, ${plan.counts.created} cột mới` : ''}.`, 'success');
    close();
  });

  const toggleNew = (assignmentId: string) => setExcludedNew(previous => {
    const next = new Set(previous);
    if (next.has(assignmentId)) next.delete(assignmentId);
    else next.add(assignmentId);
    return next;
  });

  // ── Giao diện ─────────────────────────────────────────────────────────────

  const headerBar = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900">Google Sheet theo dõi BTVN</p>
        <p className="truncate text-xs font-semibold text-slate-500">
          {sheetSync ? `${sheetSync.spreadsheetTitle || 'File đã nối'} › ${sheetSync.sheetTitle}` : 'Chưa nối — tuỳ chọn, lớp vẫn chạy bình thường khi không nối.'}
        </p>
      </div>
      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {sheetSync && (
            <button type="button" onClick={startSync} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
              <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ sang Sheet
            </button>
          )}
          <button type="button" onClick={() => setMode('link')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
            <Link2 className="h-3.5 w-3.5" /> {sheetSync ? 'Đổi tab' : 'Nối Google Sheet'}
          </button>
          {sheetSync && (
            <button type="button" onClick={() => void unlink()} disabled={busy !== ''} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              <Unlink className="h-3.5 w-3.5" /> Bỏ nối
            </button>
          )}
        </div>
      )}
      {mode !== 'idle' && (
        <button type="button" onClick={close} aria-label="Đóng" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      )}
    </div>
  );

  return (
    <section className="mb-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      {headerBar}

      {busy && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</p>
      )}
      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>
      )}

      {mode === 'link' && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold leading-5 text-slate-600">
            Dán link file Google Sheet. Lần đầu Google sẽ hỏi cấp quyền — app dùng đúng quyền của tài khoản bạn,
            và chỉ đọc, ghi vùng BTVN của tab bạn chọn.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={linkInput}
              onChange={event => setLinkInput(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-400"
            />
            <button type="button" onClick={() => void readFile()} disabled={busy !== '' || !linkInput.trim()} className="min-h-10 rounded-xl bg-slate-900 px-3 text-xs font-black text-white disabled:opacity-40">Đọc file</button>
          </div>

          {info && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-700">{info.title} ›</span>
              <select
                value={tabId ?? ''}
                onChange={event => { setTabId(Number(event.target.value)); setLinkCheck(null); }}
                className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
              >
                {info.tabs.map(tab => <option key={tab.sheetId} value={tab.sheetId}>{tab.title}</option>)}
              </select>
              <button type="button" onClick={() => void checkTab()} disabled={busy !== '' || tabId === null} className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-40">Kiểm tra tab</button>
            </div>
          )}

          {linkCheck?.problem && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">{linkCheck.problem}</p>
          )}
          {linkCheck && !linkCheck.problem && linkCheck.match && (
            <div>
              <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Tab đúng khuôn BTVN. Khớp {linkCheck.match.rowByStudentId.size}/{linkCheck.studentCount} em.
              </p>
              <StudentProblems match={linkCheck.match} />
              <button type="button" onClick={() => void saveLink()} disabled={busy !== ''} className="mt-3 min-h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-40">
                Nối tab này cho lớp
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'sync' && plan && syncData && (
        <div className="mt-4 space-y-3 text-xs font-semibold leading-5 text-slate-700">
          <p className="rounded-xl bg-slate-50 px-3 py-2 font-black text-slate-800">
            Xem trước: gắn link {plan.counts.attached} cột có sẵn · tạo {plan.counts.created} cột mới · điền {plan.counts.statusWrites} ô ·
            {plan.counts.deadlineWrites > 0 ? ` sửa ${plan.counts.deadlineWrites} hạn · ` : ' '}
            bỏ qua {plan.counts.keptHuman} ô người đã chọn.
          </p>

          <ul className="space-y-1">
            {plan.columns.filter(column => column.source !== 'created').map(column => (
              <li key={column.assignmentId}>
                <span className="font-black">Cột {columnName(column.column)}</span> — {column.title}
                {column.source === 'attached' ? ' (gắn link vào cột bạn đã tạo tay)' : ''}
              </li>
            ))}
            {newCandidates.map(candidate => {
              const planned = plan.columns.find(column => column.assignmentId === candidate.assignmentId);
              return (
                <li key={candidate.assignmentId}>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={!excludedNew.has(candidate.assignmentId)} onChange={() => toggleNew(candidate.assignmentId)} className="accent-emerald-600" />
                    <span>
                      {planned ? <span className="font-black">Tạo cột {columnName(planned.column)}</span> : <span className="font-black text-slate-400">Không tạo</span>} — {candidate.title}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {plan.skipped.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-amber-900">
              {plan.skipped.map(item => <p key={item.assignmentId}><span className="font-black">{item.title}:</span> {item.reason}</p>)}
            </div>
          )}

          {lateMissing && (
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={addLate} onChange={event => setAddLate(event.target.checked)} className="mt-0.5 accent-emerald-600" />
              <span>
                Bổ sung lựa chọn <span className="font-black">{SHEET_STATUS.muon}</span> vào tab này (danh sách chọn và ô đếm "Số HS đủ").
                Bỏ tích thì em nộp muộn vẫn ghi là {SHEET_STATUS.du}.
              </span>
            </label>
          )}

          <StudentProblems match={plan.students} />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void applyPlan()}
              disabled={busy !== '' || (plan.writes.length === 0 && !plan.upgradedStatusOptions)}
              className="min-h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-40"
            >
              Ghi vào Sheet
            </button>
            <button type="button" onClick={close} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600">Huỷ, không ghi gì</button>
          </div>
        </div>
      )}
    </section>
  );
};
