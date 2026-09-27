import { useMemo, useState } from 'react';
import { Award, Loader2, Save, Sparkles, X } from 'lucide-react';
import type { AssignmentCompetencyTag, AssignmentDoc } from '../../../lib/classroom/types';
import { buildQuestionCatalog, setAssignmentCompetencyTags } from '../../../services/gradingApi';
import { competenciesByGrade, competencyById, type CompetencyGrade } from '../../../lib/classroom/competency/framework';

interface Props {
  assignment: AssignmentDoc;
  grade: CompetencyGrade;
  showToast: (msg: string, icon?: unknown) => void;
  /** Gọi lại sau khi lưu để danh sách bài nạp lại nhãn mới. */
  onSaved: () => void;
}

const toTag = (tag: AssignmentCompetencyTag): AssignmentCompetencyTag => ({
  competencyId: tag.competencyId,
  confidence: typeof tag.confidence === 'number' ? tag.confidence : 1,
  reason: tag.reason || '',
});

/**
 * Gắn + DUYỆT nhãn năng lực cho một bài BTVN (GĐ3b).
 *
 * Hai đường vào cùng một danh sách nhãn: "Gắn bằng AI" đọc đề rồi đề xuất (giáo viên soát), và
 * giáo viên tự thêm/bỏ. Bấm "Lưu nhãn" mới chốt — chốt rồi thì lần đọc đề sau không đè nhãn tay.
 * Chỉ những nhãn đã lưu mới được tính vào hồ sơ năng lực của học sinh.
 */
export const CompetencyTagEditor = ({ assignment, grade, showToast, onSaved }: Props) => {
  const [tags, setTags] = useState<AssignmentCompetencyTag[]>((assignment.competencyTags || []).map(toTag));
  const [approved, setApproved] = useState(assignment.competencyTagsApproved === true);
  const [dirty, setDirty] = useState(false);
  const [dangGanAI, setDangGanAI] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [addValue, setAddValue] = useState('');

  const options = useMemo(() => competenciesByGrade(grade), [grade]);
  const taggedIds = useMemo(() => new Set(tags.map(t => t.competencyId)), [tags]);
  const remaining = options.filter(item => !taggedIds.has(item.id));

  const ganBangAI = async () => {
    setDangGanAI(true);
    try {
      const { competencyTags } = await buildQuestionCatalog(assignment.id, true);
      setTags(competencyTags.map(toTag));
      setApproved(false);
      setDirty(true);
      showToast(
        competencyTags.length > 0 ? `AI đề xuất ${competencyTags.length} năng lực — soát rồi bấm Lưu nhãn.` : 'AI chưa gắn được năng lực nào cho bài này.',
        competencyTags.length > 0 ? 'success' : 'info',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không gắn được nhãn.', 'error');
    } finally {
      setDangGanAI(false);
    }
  };

  const themNhan = (competencyId: string) => {
    if (!competencyId || taggedIds.has(competencyId)) return;
    setTags(previous => [...previous, { competencyId, confidence: 1, reason: '' }]);
    setDirty(true);
    setAddValue('');
  };

  const boNhan = (competencyId: string) => {
    setTags(previous => previous.filter(t => t.competencyId !== competencyId));
    setDirty(true);
  };

  const luuNhan = async () => {
    setDangLuu(true);
    try {
      const { competencyTags } = await setAssignmentCompetencyTags(assignment.id, tags);
      setTags(competencyTags.map(toTag));
      setApproved(true);
      setDirty(false);
      showToast('Đã lưu nhãn năng lực.', 'success');
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không lưu được nhãn.', 'error');
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="mb-5 rounded-2xl bg-indigo-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-indigo-600"><Award className="h-4 w-4" /> Nhãn năng lực</p>
        {approved && !dirty
          ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">Đã duyệt</span>
          : tags.length > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">Chưa lưu</span>}
      </div>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-indigo-900/70">
        Bài này đo năng lực nào (theo khung Lớp {grade})? AI gợi ý, thầy cô chốt. Chỉ nhãn đã lưu mới vào hồ sơ năng lực của học sinh.
      </p>

      {tags.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-slate-400">Chưa gắn năng lực nào.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map(tag => {
            const competency = competencyById(tag.competencyId);
            return (
              <span key={tag.competencyId} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                <span>{competency ? competency.topic : tag.competencyId}</span>
                {!approved && tag.confidence < 1 && <span className="text-[10px] font-black text-indigo-400">{Math.round(tag.confidence * 100)}%</span>}
                <button type="button" onClick={() => boNhan(tag.competencyId)} aria-label={`Bỏ ${competency?.topic || tag.competencyId}`} className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={ganBangAI} disabled={dangGanAI}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40">
          {dangGanAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {dangGanAI ? 'Đang đọc đề...' : 'Gắn nhãn bằng AI'}
        </button>

        {remaining.length > 0 && (
          <select value={addValue} onChange={e => themNhan(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400">
            <option value="">+ Thêm năng lực…</option>
            {remaining.map(item => <option key={item.id} value={item.id}>{item.area} › {item.topic}</option>)}
          </select>
        )}

        <span className="flex-1" />
        <button type="button" onClick={luuNhan} disabled={!dirty || dangLuu}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700 disabled:opacity-40">
          {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dangLuu ? 'Đang lưu...' : 'Lưu nhãn'}
        </button>
      </div>
    </div>
  );
};
