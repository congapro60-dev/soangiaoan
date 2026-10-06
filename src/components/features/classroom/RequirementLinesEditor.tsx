import { X } from 'lucide-react';
import {
  buildLessonMap, groupRequirementLines, MAX_REQUIREMENT_NOTE_CHARS, REQUIREMENT_LEVELS, requirementLevelLabel,
  type ParentRequirementLine, type RequirementLevel,
} from '../../../lib/classroom/parentRequirements';

const LEVEL_CLASS: Record<RequirementLevel, string> = {
  vung: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  dang: 'border-amber-200 bg-amber-50 text-amber-800',
  chua: 'border-rose-200 bg-rose-50 text-rose-800',
};

interface Props {
  lines: ParentRequirementLine[];
  onChange: (lines: ParentRequirementLine[]) => void;
}

/**
 * Kết quả theo yêu cầu cần đạt — giáo viên soát trước khi lưu: đổi mức, sửa ghi chú, bỏ dòng ghép sai.
 * Cùng cách nhóm với bản PDF để thấy trước đúng thứ phụ huynh sẽ đọc.
 */
export const RequirementLinesEditor = ({ lines, onChange }: Props) => {
  const update = (id: string, patch: Partial<ParentRequirementLine>) =>
    onChange(lines.map(line => (line.id === id ? { ...line, ...patch } : line)));
  const remove = (id: string) => onChange(lines.filter(line => line.id !== id));
  const lessons = buildLessonMap(lines);

  return (
    <div className="space-y-3">
      {lessons.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <p className="text-[11px] font-black text-slate-500">Phụ huynh thấy ở “Bản đồ theo bài SGK” (tính lại khi thầy cô bỏ dòng ghép sai)</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {lessons.map(lesson => (
              <li key={lesson.lesson} className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-black ${lesson.level ? LEVEL_CLASS[lesson.level] : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                {lesson.lesson} · {lesson.level ? `${requirementLevelLabel(lesson.level)} ${Math.round(lesson.percent)}%` : 'Chưa đủ căn cứ'}
              </li>
            ))}
          </ul>
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
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Căn cứ: {line.evidence} câu · đạt {Math.round(line.percent)}% · SGK Kết nối tri thức {item.sgk}</p>
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
