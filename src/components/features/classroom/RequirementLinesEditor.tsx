import { X } from 'lucide-react';
import {
  buildLessonMap, groupLessonsByChapter, groupLessonsByStrand, groupRequirementLines, MAX_REQUIREMENT_NOTE_CHARS, REQUIREMENT_LEVELS, requirementLevelLabel,
  type LessonSummary, type ParentRequirementLine, type RequirementLevel,
} from '../../../lib/classroom/parentRequirements';
import { sgkChapterOf } from '../../../lib/curriculum/sgkToanKntt';

const LEVEL_CLASS: Record<RequirementLevel, string> = {
  vung: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  dang: 'border-amber-200 bg-amber-50 text-amber-800',
  chua: 'border-rose-200 bg-rose-50 text-rose-800',
};

const DOT_CLASS: Record<RequirementLevel | 'thieu', string> = {
  vung: 'bg-emerald-500', dang: 'bg-amber-500', chua: 'bg-rose-500', thieu: 'bg-slate-300',
};

/** "2/5 bài vững" của một nhóm bài; chưa bài nào đủ căn cứ thì nói thẳng. */
const vungText = (lessons: readonly LessonSummary[]): string => {
  const assessed = lessons.filter(lesson => lesson.level !== null).length;
  return assessed === 0 ? 'chưa đủ căn cứ' : `${lessons.filter(lesson => lesson.level === 'vung').length}/${assessed} bài vững`;
};

interface Props {
  lines: ParentRequirementLine[];
  onChange: (lines: ParentRequirementLine[]) => void;
}

/**
 * Kết quả theo yêu cầu cần đạt — giáo viên soát trước khi lưu: đổi mức, sửa ghi chú, bỏ dòng ghép sai.
 * Cùng cách nhóm với bản PDF để thấy trước đúng thứ phụ huynh sẽ đọc.
 */
/** "Tập 2 · Chương VI · Bài 16" — tra được chương thì ghi đủ, không thì chỉ ghi bài. */
const sgkWhere = (id: string, sgk: string): string => {
  const chapter = sgkChapterOf(Number(id.match(/^T(\d+)\./)?.[1]), sgk);
  return chapter ? `Tập ${chapter.tap} · Chương ${chapter.code} · ${sgk}` : sgk;
};

export const RequirementLinesEditor = ({ lines, onChange }: Props) => {
  const update = (id: string, patch: Partial<ParentRequirementLine>) =>
    onChange(lines.map(line => (line.id === id ? { ...line, ...patch } : line)));
  const remove = (id: string) => onChange(lines.filter(line => line.id !== id));
  const lessons = buildLessonMap(lines);

  return (
    <div className="space-y-3">
      {lessons.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] font-black text-slate-500">Phụ huynh thấy ở “Bản đồ theo bài SGK” (tính lại khi thầy cô bỏ dòng ghép sai)</p>
          <div className="space-y-1.5">
            {groupLessonsByStrand(lessons).map(row => (
              <div key={row.strand} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-20 shrink-0 whitespace-nowrap text-xs font-black text-slate-800">{row.strand}</span>
                <span className="flex h-2.5 min-w-[96px] flex-1 gap-0.5">
                  {row.lessons.map(lesson => <i key={lesson.lesson} title={lesson.lesson} className={`min-w-[6px] flex-1 rounded-sm ${DOT_CLASS[lesson.level ?? 'thieu']}`} />)}
                </span>
                <span className="ml-auto whitespace-nowrap text-[11px] font-bold text-slate-500">{vungText(row.lessons)}</span>
              </div>
            ))}
          </div>
          {groupLessonsByChapter(lessons).map(group => (
            <div key={group.chapter ? `${group.chapter.tap}-${group.chapter.code}` : 'khac'}>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-slate-200 pb-1 text-xs">
                {group.chapter ? (
                  <>
                    <span className="whitespace-nowrap font-black uppercase tracking-wide text-indigo-700">Tập {group.chapter.tap} · Chương {group.chapter.code}</span>
                    <span className="min-w-0 flex-1 font-black text-slate-900">{group.chapter.name}</span>
                    <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-800">{group.chapter.strand}</span>
                    <span className="whitespace-nowrap text-[11px] font-bold text-slate-500">{vungText(group.lessons)}</span>
                  </>
                ) : <span className="font-black text-slate-700">Bài khác</span>}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {group.lessons.map(lesson => (
                  <li key={lesson.lesson} className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-black ${lesson.level ? LEVEL_CLASS[lesson.level] : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    {lesson.lesson} · {lesson.level ? `${requirementLevelLabel(lesson.level)} ${Math.round(lesson.percent)}%` : 'Chưa đủ căn cứ'}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {groupRequirementLines(lines).map(group => (
        <div key={`${group.strand}-${group.topic}`}>
          <p className="border-b border-slate-200 pb-1 text-xs font-black text-indigo-900">{group.strand} · {group.topic}</p>
          <ul className="divide-y divide-dashed divide-slate-200">
            {group.rows.map(({ line, item }) => (
              <li key={line.id} className="flex items-start gap-2 py-2">
                <select
                  value={line.level}
                  onChange={event => update(line.id, { level: event.target.value as RequirementLevel })}
                  className={`mt-0.5 shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${LEVEL_CLASS[line.level]}`}
                  aria-label={`Mức của yêu cầu ${item.id}`}
                >
                  {REQUIREMENT_LEVELS.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}
                </select>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{item.text}</p>
                  <input
                    value={line.note}
                    maxLength={MAX_REQUIREMENT_NOTE_CHARS}
                    onChange={event => update(line.id, { note: event.target.value })}
                    placeholder="Ghi chú: em làm tốt / sai chính xác ở đâu (không nhắc số câu)"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold italic text-slate-700 outline-none focus:border-violet-300"
                  />
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Căn cứ: {line.evidence} câu · đạt {Math.round(line.percent)}% · SGK Kết nối tri thức <span className="whitespace-nowrap">{sgkWhere(item.id, item.sgk)}</span></p>
                </div>
                <button type="button" onClick={() => remove(line.id)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Bỏ yêu cầu ${item.id}`} title="Bỏ dòng này (AI ghép sai)">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
