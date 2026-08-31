import { useEffect, useMemo, useState, useCallback } from 'react';
import type { LiveCue } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues';
import type { LiveLessonDefinition, LiveLessonSession, LivePublicStats, LiveResponse } from '../../lib/liveLesson/types';
import { aggregateLiveResponses } from '../../lib/liveLesson/aggregate';
import {
  createEmptyTeacherEvidence,
  loadTeacherEvidence,
  saveTeacherEvidence,
  type LiveTeacherEvidence,
} from '../../lib/liveLesson/teacherEvidence';
import { saveClosedLiveLessonProgressViaApi } from '../../services/adaptiveProgressApi';
import { closeLiveLessonSession, publishLivePublicStats, subscribeToTeacherResponses, updateLiveLessonState } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';
import { GroupingApprovalPanel, type ApprovalResult } from './GroupingApprovalPanel';
import type { GroupProposal } from '../../lib/liveLesson/v4/grouping';
import { buildOfflineChecklist, type OfflinePackContents } from '../../lib/liveLesson/v4/offlinePack';
import { getG10P31V4Contract } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import { getBanToanV4ContractForLiveDefinitionId } from '../../lib/liveLesson/v4';

export type CueDirection = 'previous' | 'next';
export type TeacherControl = 'running' | 'paused' | 'closed';
export type PrivateNeedSignal = 'terminology' | 'sentence_frame' | 'visual_representation' | 'extra_processing_time';

export interface PrivateNeedCount {
  need: PrivateNeedSignal;
  count: number;
}

export interface PrivateNeedsSummary {
  title: string;
  lines: string[];
}

const findCue = (definition: LiveLessonDefinition, cueId: string): LiveCue => definition.cues.find(cue => cue.id === cueId) ?? definition.cues[0];

export const getCueNavigation = (definition: LiveLessonDefinition, cueId: string, direction: CueDirection) => {
  const index = Math.max(0, definition.cues.findIndex(cue => cue.id === cueId));
  const nextIndex = direction === 'next' ? Math.min(definition.cues.length - 1, index + 1) : Math.max(0, index - 1);
  const cue = definition.cues[nextIndex];
  return { currentCueId: cue.id, currentTvScreenId: cue.tvScreenId };
};

export const getTimerSnapshot = (definition: LiveLessonDefinition, cueId: string, status: LiveLessonSession['status'] = 'lobby') => {
  const elapsedSeconds = findCue(definition, cueId).atSeconds;
  return { elapsedSeconds, remainingSeconds: Math.max(0, definition.durationSeconds - elapsedSeconds), status };
};

export const buildTeacherStatePatch = (definition: LiveLessonDefinition, cueId: string, control: TeacherControl) => {
  if (control === 'closed') return null;
  if (control === 'paused') return { status: 'running' as const };
  const cue = findCue(definition, cueId);
  return { currentCueId: cue.id, currentTvScreenId: cue.tvScreenId };
};

export interface TeacherMobileControlModel {
  currentCueInstruction: string;
  cueIndex: number;
  cueTotal: number;
  pauseResumeLabel: string;
  secondaryLabels: {
    timeline: string;
    stats: string;
    close: string;
  };
}

export const getTeacherMobileControlModel = (
  definition: LiveLessonDefinition,
  session: Pick<LiveLessonSession, 'currentCueId' | 'status' | 'publicStatsEnabled'>,
): TeacherMobileControlModel => {
  const cue = findCue(definition, session.currentCueId);
  const cueIndex = Math.max(0, definition.cues.findIndex(item => item.id === cue.id));
  return {
    currentCueInstruction: cue.teacher,
    cueIndex: cueIndex + 1,
    cueTotal: definition.cues.length,
    pauseResumeLabel: session.status === 'running' ? 'Tạm dừng' : 'Bắt đầu / tiếp tục',
    secondaryLabels: {
      timeline: 'Mở timeline',
      stats: session.publicStatsEnabled ? 'Ẩn thống kê TV' : 'Hiện thống kê TV',
      close: 'Đóng phiên',
    },
  };
};

const needLabels: Record<PrivateNeedSignal, string> = {
  terminology: 'Thuật ngữ',
  sentence_frame: 'Khung câu',
  visual_representation: 'Biểu diễn trực quan',
  extra_processing_time: 'Thêm thời gian xử lý',
};

export const buildPrivateNeedsSummary = (counts: PrivateNeedCount[]): PrivateNeedsSummary => ({
  title: 'Nhu cầu hỗ trợ riêng',
  lines: counts.filter(item => item.count > 0).map(item => `${needLabels[item.need]}: ${item.count}`),
});

const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export interface TeacherLiveViewProps {
  definition: LiveLessonDefinition;
  session: LiveLessonSession;
  sessionError?: string | null;
  onSessionChange: (session: LiveLessonSession) => void;
}

const mergeResponses = (current: LiveResponse[], incoming: LiveResponse[]): LiveResponse[] => {
  const byId = new Map(current.map(response => [response.id, response]));
  incoming.forEach(response => byId.set(response.id, response));
  return [...byId.values()];
};

export const buildTeacherOfflineChecklist = (
  offlinePack: OfflinePackContents,
): Array<{ label: string; ready: boolean }> => {
  return [
    { label: 'Cue và hình/đồ thị TV', ready: offlinePack.tvCues.length > 0 },
    { label: 'Bảng thuật ngữ (approved)', ready: offlinePack.approvedGlossary.length > 0 },
    { label: 'Bảng phụ: mục tiêu, khung câu, rubric', ready: offlinePack.boardPlan.objectives.length > 0 },
    { label: 'Lỗi AI và đáp án', ready: offlinePack.aiErrorAnswerKey.correction.length > 0 },
    { label: 'Thẻ nhiệm vụ M/S/C', ready: offlinePack.routeCards.length === 3 },
    { label: 'Nhóm mặc định', ready: offlinePack.defaultGrouping !== null },
    { label: 'Exit ticket giấy', ready: offlinePack.paperExitTicket.prompt.length > 0 },
  ];
};

export const TeacherLiveView = ({ definition, session, sessionError, onSessionChange }: TeacherLiveViewProps) => {
  const [responses, setResponses] = useState<LiveResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progressSummary, setProgressSummary] = useState<string | null>(null);
  const [teacherEvidence, setTeacherEvidence] = useState<LiveTeacherEvidence>(() => createEmptyTeacherEvidence());
  const [evidenceSaved, setEvidenceSaved] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const cue = findCue(definition, session.currentCueId);
  const timer = getTimerSnapshot(definition, session.currentCueId, session.status);
  const responseStepId = cue.responseStepId;
  const stats = useMemo<LivePublicStats | null>(() => responseStepId ? aggregateLiveResponses(responses, responseStepId) : null, [responses, responseStepId]);
  const mobileControl = getTeacherMobileControlModel(definition, session);
  const privateNeedsSummary = useMemo(() => buildPrivateNeedsSummary([
    { need: 'terminology', count: responses.filter(response => response.stepId === responseStepId && String(response.value).toLowerCase().includes('term')).length },
    { need: 'sentence_frame', count: responses.filter(response => response.stepId === responseStepId && String(response.value).toLowerCase().includes('frame')).length },
  ]), [responses, responseStepId]);
  const [groupProposals, setGroupProposals] = useState<GroupProposal[]>([]);
  const [approvedGroupId, setApprovedGroupId] = useState<string | null>(null);
  const [showOfflineChecklist, setShowOfflineChecklist] = useState(false);
  const v4Contract = useMemo(() => getBanToanV4ContractForLiveDefinitionId(definition.id) ?? getG10P31V4Contract(), [definition.id]);
  const offlineChecklist = useMemo(() => buildOfflineChecklist(v4Contract), [v4Contract]);
  const supportsAdaptiveProgressBridge = definition.id === 'g10_w5_p31_bpt_tiet1';

  const handleGroupApproval = useCallback((result: ApprovalResult) => {
    setApprovedGroupId(result.chosenGroupId);
    setGroupProposals([]);
  }, []);

  useEffect(() => {
    if (session.status === 'closed') { setResponses([]); return undefined; }
    setResponses([]);
    const stops = definition.allowedStepIds.map(stepId => subscribeToTeacherResponses(
      session.id,
      stepId,
      incoming => setResponses(current => mergeResponses(current, incoming)),
      nextError => setError(nextError.message),
    ));
    return () => stops.forEach(stop => stop());
  }, [definition.allowedStepIds, session.id, session.status]);
  useEffect(() => {
    if (session.status !== 'closed') return;
    setTeacherEvidence(loadTeacherEvidence(session.id));
    setEvidenceSaved(false);
  }, [session.id, session.status]);
  useEffect(() => {
    if (!stats || !session.publicStatsEnabled) return;
    void publishLivePublicStats(session.id, stats).catch(nextError => setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật thống kê công khai.'));
  }, [session.id, session.publicStatsEnabled, stats]);

  const applyPatch = async (patch: Parameters<typeof updateLiveLessonState>[1]) => {
    if (session.status === 'closed') return;
    try { onSessionChange(await updateLiveLessonState(session.id, patch)); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật phiên.'); }
  };
  const saveProgress = async (closedSession: LiveLessonSession) => {
    if (!supportsAdaptiveProgressBridge) {
      setProgressSummary('Phiên V4 đã đóng; mapping tiến trình adaptive cho gói nguồn này chưa bật. Minh chứng realtime vẫn giữ trong phiên.');
      setError(null);
      return;
    }
    try {
      const summary = await saveClosedLiveLessonProgressViaApi(closedSession.id, definition);
      setProgressSummary(`Đủ điều kiện: ${summary.eligible}; đã ghi: ${summary.saved}; lỗi ghi: ${summary.failed}; chưa đủ: ${summary.incomplete}.`);
      setError(null);
    }
    catch (nextError) {
      setProgressSummary('Chưa ghi được tiến trình: lỗi máy chủ hoặc mapping chưa xác minh. Không báo hoàn tất.');
      setError(nextError instanceof Error ? nextError.message : 'Không thể ghi tiến trình sau khi đóng phiên.');
    }
  };
  const close = async () => {
    if (session.status === 'closed') { await saveProgress(session); return; }
    try {
      const closedSession = await closeLiveLessonSession(session.id);
      onSessionChange(closedSession);
      await saveProgress(closedSession);
    }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể đóng phiên.'); }
  };
  const isClosed = session.status === 'closed';
  const saveEvidence = () => {
    setTeacherEvidence(current => saveTeacherEvidence(session.id, current));
    setEvidenceSaved(true);
  };
  const updateEvidence = <K extends keyof LiveTeacherEvidence>(key: K, value: LiveTeacherEvidence[K]) => {
    setTeacherEvidence(current => ({ ...current, [key]: value }));
    setEvidenceSaved(false);
  };
  const updateHumanEvidence = (key: keyof LiveTeacherEvidence['humanEvidence'], value: boolean) => {
    setTeacherEvidence(current => ({ ...current, humanEvidence: { ...current.humanEvidence, [key]: value } }));
    setEvidenceSaved(false);
  };
  const index = definition.cues.findIndex(item => item.id === cue.id);
  const navigate = (direction: CueDirection) => applyPatch(getCueNavigation(definition, session.currentCueId, direction));
  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsCloseConfirmOpen(false);
  };
  const openMenu = () => {
    setIsMenuOpen(true);
    setIsCloseConfirmOpen(false);
  };
  const confirmClose = async () => {
    setIsCloseConfirmOpen(false);
    await close();
    setIsMenuOpen(false);
  };

  return <main className="min-h-screen overflow-x-hidden bg-slate-100 pb-28 text-slate-900 sm:pb-32"><div className="mx-auto w-full max-w-6xl min-w-0 space-y-3 px-3 py-3 sm:space-y-4 sm:p-6">
    <header className="sticky top-0 z-30 rounded-2xl bg-slate-950/95 px-4 py-3 text-white shadow-lg backdrop-blur sm:p-5"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Giáo viên · tiết V4</p><h1 className="mt-1 truncate text-lg font-black sm:text-2xl">{session.title}</h1><div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs font-black"><span className="rounded-full bg-white/10 px-2.5 py-1 tabular-nums">{mobileControl.cueIndex}/{mobileControl.cueTotal} · {cue.label}</span><span className="rounded-full bg-indigo-400/20 px-2.5 py-1 uppercase">Phiên: {session.status}</span><span className={`rounded-full px-2.5 py-1 ${sessionError ? 'bg-rose-400/20 text-rose-200' : 'bg-emerald-400/20 text-emerald-200'}`}>{sessionError ? 'Mất kết nối' : 'Đã kết nối'}</span></div></div><div className="flex shrink-0 items-start gap-2"><div className="text-right"><p className="text-[10px] font-bold uppercase text-slate-400">{timer.status === 'paused' ? 'Timeline · tạm dừng' : 'Timeline · theo cue'}</p><p className="text-xl font-black tabular-nums sm:text-3xl">{formatDuration(timer.elapsedSeconds)}</p><p className="text-xs font-bold text-slate-400">Còn {formatDuration(timer.remainingSeconds)}</p></div><button type="button" aria-label="Mở menu timeline và hành động phụ" onClick={openMenu} className="min-h-11 min-w-11 rounded-xl border border-white/20 bg-white/10 px-2 text-lg font-black leading-none hover:bg-white/20">☰</button></div></div></header>
    <div className="space-y-2">{sessionError && <LiveLessonStatus tone="error">Lỗi trạng thái phiên: {sessionError}</LiveLessonStatus>}{error && <LiveLessonStatus tone="error">Lỗi giáo viên: {error}</LiveLessonStatus>}{isClosed && <LiveLessonStatus tone="warning">Phiên đã đóng. Các nút điều khiển đã khóa.</LiveLessonStatus>}{progressSummary && <LiveLessonStatus tone="warning">{progressSummary}</LiveLessonStatus>}</div>
    <button type="button" onClick={() => setShowOfflineChecklist(!showOfflineChecklist)} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 hover:bg-amber-100">{showOfflineChecklist ? 'Ẩn gói offline' : 'Xem gói offline trước tiết'}</button>
    {showOfflineChecklist && <section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-amber-700">Gói offline trước tiết</p><ul className="mt-3 space-y-2">{offlineChecklist.map((item, idx) => <li key={idx} className="flex items-center gap-2 text-sm font-semibold"><span className={item.ready ? 'text-emerald-600' : 'text-rose-600'}>{item.ready ? '✓' : '✗'}</span><span className={item.ready ? 'text-slate-700' : 'text-rose-800'}>{item.label}</span></li>)}</ul></section>}
    <section className="space-y-3"><article className="min-w-0 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-indigo-600">{cue.id} · Đang dẫn</p><h2 className="mt-1 break-words text-2xl font-black sm:text-3xl">{cue.label}</h2></div><span className="shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">GV nói/làm</span></div><p className="mt-6 whitespace-pre-line break-words text-lg font-bold leading-8 text-slate-800 sm:text-xl">{mobileControl.currentCueInstruction}</p></article><div className="grid min-w-0 gap-3 md:grid-cols-3"><details className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-800"><span>Bảng lớn / bảng phụ</span><span className="text-slate-400">Mở</span></summary><div className="space-y-4 border-t border-slate-100 p-4"><div><p className="text-xs font-black uppercase text-slate-500">Bảng lớn</p><p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6">{cue.boardLarge}</p></div><div><p className="text-xs font-black uppercase text-slate-500">Bảng phụ</p><p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6">{cue.boardSide}</p></div></div></details><details className="min-w-0 rounded-2xl border border-amber-100 bg-amber-50 shadow-sm"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-amber-900"><span>HS trên thiết bị</span><span className="text-amber-700/60">Mở</span></summary><div className="border-t border-amber-100 p-4"><p className="whitespace-pre-line break-words text-sm font-semibold leading-6 text-amber-950">{cue.student}</p></div></details><details className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-emerald-900"><span>Vở & minh chứng</span><span className="text-emerald-700/60">Mở</span></summary><div className="border-t border-emerald-100 p-4"><p className="whitespace-pre-line break-words text-sm font-semibold leading-6 text-emerald-950">{cue.notebook}{'\n'}{cue.observerEvidence}</p></div></details></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Thống kê phản hồi"><div className="grid grid-cols-3 divide-x divide-slate-100 text-center"><div className="min-w-0 px-2"><p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500">Bước</p><p className="mt-1 truncate text-sm font-black text-slate-800">{responseStepId ?? 'Không có'}</p></div><div className="px-2"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Đã gửi</p><p className="mt-1 text-lg font-black tabular-nums text-indigo-700">{stats?.submittedCount ?? 0}</p></div><div className="px-2"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tham gia</p><p className="mt-1 text-lg font-black tabular-nums text-indigo-700">{stats?.participantCount ?? 0}</p></div></div></section>
    {isClosed && <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Minh chứng sau giờ · GV</p><h2 className="mt-1 text-xl font-black">Ghi nhanh để nối sang tiết sau</h2></div>{evidenceSaved && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Đã lưu trên thiết bị</span>}</div><p className="mt-2 text-sm font-semibold text-slate-500">Chỉ giáo viên nhìn thấy. Không gửi câu trả lời cá nhân lên TV; không ghi tên học sinh vào ô ghi chú.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm font-bold text-slate-700">Lỗi AI trong tiết<select value={teacherEvidence.aiErrorCategory} onChange={event => updateEvidence('aiErrorCategory', event.target.value as LiveTeacherEvidence['aiErrorCategory'])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Chưa chốt</option><option value="Conceptual">Conceptual · khái niệm</option><option value="Algebraic">Algebraic · đại số</option><option value="Logical">Logical · lập luận</option><option value="Missing condition">Missing condition · điều kiện</option></select></label><label className="text-sm font-bold text-slate-700">Lỗi Quick check<select value={teacherEvidence.quickCheckIssue} onChange={event => updateEvidence('quickCheckIssue', event.target.value as LiveTeacherEvidence['quickCheckIssue'])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Chưa chốt</option><option value="substitution">Thay cặp số</option><option value="sign">Dấu bất phương trình</option><option value="condition">Điều kiện/nghĩa của biến</option></select></label><label className="text-sm font-bold text-slate-700">Ưu tiên tiết sau<select value={teacherEvidence.nextPriority} onChange={event => updateEvidence('nextPriority', event.target.value as LiveTeacherEvidence['nextPriority'])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Chưa chốt</option><option value="M">M · củng cố</option><option value="S">S · chuẩn</option><option value="C">C · thử thách</option><option value="verify">VERIFY · kiểm chứng</option></select></label></div><div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" checked={teacherEvidence.humanEvidence.think} onChange={event => updateHumanEvidence('think', event.target.checked)} /> Có dự đoán trước AI</label><label className="flex items-center gap-2"><input type="checkbox" checked={teacherEvidence.humanEvidence.peerCheck} onChange={event => updateHumanEvidence('peerCheck', event.target.checked)} /> Có peer-check</label><label className="flex items-center gap-2"><input type="checkbox" checked={teacherEvidence.humanEvidence.notebook} onChange={event => updateHumanEvidence('notebook', event.target.checked)} /> Có sản phẩm trong vở</label></div><textarea value={teacherEvidence.note} maxLength={500} onChange={event => updateEvidence('note', event.target.value)} placeholder="Một lỗi chung hoặc bước tiếp theo (tối đa 500 ký tự)…" className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold" /><button type="button" onClick={saveEvidence} className="mt-3 min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Lưu minh chứng trên thiết bị này</button></section>}
  </div><nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur" aria-label="Điều khiển cue"><div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2 pb-3"><button type="button" disabled={index <= 0 || isClosed} onClick={() => void navigate('previous')} className="min-h-11 min-w-11 rounded-xl border border-slate-200 px-2 py-2 text-sm font-black disabled:opacity-40">← Trước</button><button type="button" disabled={isClosed} onClick={() => void applyPatch({ status: session.status === 'running' ? 'paused' : 'running' })} className="min-h-11 min-w-11 rounded-xl bg-indigo-600 px-2 py-2 text-sm font-black text-white disabled:opacity-40">{mobileControl.pauseResumeLabel}</button><button type="button" disabled={index >= definition.cues.length - 1 || isClosed} onClick={() => void navigate('next')} className="min-h-11 min-w-11 rounded-xl border border-slate-200 px-2 py-2 text-sm font-black disabled:opacity-40">Sau →</button></div></nav>{isMenuOpen && <><button type="button" aria-label="Đóng menu" onClick={closeMenu} className="fixed inset-0 z-40 bg-slate-950/40" /><aside role="dialog" aria-modal="true" aria-label="Timeline và hành động phụ" className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 shadow-2xl sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-4xl sm:rounded-3xl"><div className="mx-auto max-w-3xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Điều khiển mở rộng</p><h2 className="mt-1 text-xl font-black">Timeline & hành động phụ</h2></div><button type="button" onClick={closeMenu} className="min-h-11 min-w-11 rounded-xl border border-slate-200 px-3 text-sm font-black">Đóng</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" disabled={isClosed} onClick={() => void applyPatch({ publicStatsEnabled: !session.publicStatsEnabled })} className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black disabled:opacity-40">{mobileControl.secondaryLabels.stats}</button>{isClosed ? <button type="button" onClick={() => void saveProgress(session)} className="min-h-11 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-black text-indigo-700">Ghi lại tiến trình</button> : <button type="button" onClick={() => setIsCloseConfirmOpen(true)} className="min-h-11 rounded-xl bg-rose-600 px-3 py-2 text-sm font-black text-white">{mobileControl.secondaryLabels.close}</button>}</div>{isCloseConfirmOpen && !isClosed && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alertdialog" aria-label="Xác nhận đóng phiên"><p className="text-sm font-bold leading-6 text-rose-950">Đóng phiên sẽ khóa điều khiển. Sau đó chỉ còn ghi minh chứng và thử ghi lại tiến trình.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setIsCloseConfirmOpen(false)} className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-800">Hủy</button><button type="button" onClick={() => void confirmClose()} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-black text-white">Xác nhận đóng phiên</button></div></div>}<div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">{mobileControl.secondaryLabels.timeline}</p><p className="mt-1 text-sm font-semibold text-slate-500">Chọn cue để chuyển cả màn hình TV tương ứng.</p></div><span className="text-sm font-black tabular-nums text-indigo-700">{mobileControl.cueIndex}/{mobileControl.cueTotal}</span></div><nav className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8" aria-label="Timeline cues">{definition.cues.map(item => <button key={item.id} type="button" onClick={() => { closeMenu(); void applyPatch({ currentCueId: item.id, currentTvScreenId: item.tvScreenId }); }} disabled={isClosed} className={`min-h-11 w-full rounded-xl px-2 py-2 text-xs font-black ${item.id === cue.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'} disabled:opacity-40`}>{item.id}</button>)}</nav></div></aside></>}</main>;

};
