import { useState } from 'react';
import type { LiveLessonV4Contract, StudentLanguageView } from '../../lib/liveLesson/v4/types';
import { LiveLessonRichText } from './LiveLessonRichText';

type Frame = { vi: string; en?: string };
// Language scaffolds contain placeholders, never the mathematical answer.
function activityFrame(stepId: string): Frame {
  if (stepId === 'goals' || stepId === 'cp-student-goal') return {
    vi: 'Cuối tiết, em muốn tự ___. Em sẽ chứng minh bằng ___.',
    en: 'By the end of the lesson, I want to ___. My evidence will be ___.',
  };
  if (stepId.includes('ai-error')) return {
    vi: 'Bước ___ chưa thuyết phục vì ___. Em kiểm chứng bằng ___. Cách sửa của em là ___.',
    en: 'Step ___ is not convincing because ___. I checked it by ___. My correction is ___.',
  };
  if (stepId === 'cp-group-product') return {
    vi: 'Nhóm em dự đoán ___. Sau khi kiểm tra ___, em kết luận ___ vì ___.',
    en: 'Our group predicted ___. After checking ___, I conclude ___ because ___.',
  };
  if (stepId.includes('exit')) return {
    vi: 'Em đã tự làm được ___. Bằng chứng là ___. Em còn cần hỗ trợ về ___.',
    en: 'I can now ___ on my own. My evidence is ___. I still need support with ___.',
  };
  if (stepId.includes('post')) return {
    vi: 'Em thực hiện ___. Kết quả là ___. Vì ___, em kết luận ___.',
    en: 'I carried out ___. The result is ___. Because ___, I conclude ___.',
  };
  return { vi: 'Em chọn ___ vì ___. Bằng chứng của em là ___.', en: 'I chose ___ because ___. My evidence is ___.' };
}

export function StudentWritingSupport({ contract, cueId, stepId, route, languageView, onInsert }: {
  contract: LiveLessonV4Contract; cueId: string; stepId: string; route: string | null;
  languageView: StudentLanguageView; onInsert?: (text: string) => void;
}) {
  const [mode, setMode] = useState<'words' | 'frame' | 'own'>(languageView.showSentenceFrames ? 'frame' : 'words');
  const [termId, setTermId] = useState<string | null>(null);
  const [insertEnglish, setInsertEnglish] = useState(languageView.language === 'en');
  const demand = contract.languageDemands.find(item => item.stepId === cueId);
  const variant = contract.taskVariants.find(item => item.route === route);
  const scaffold = contract.scaffoldSets.find(item => item.id === variant?.scaffoldSetId);
  const specificTerms = demand?.terms ?? [];
  const allTerms = contract.glossary.filter(item => item.status === 'approved');
  const related = allTerms.filter(item => specificTerms.includes(item.vietnamese) || scaffold?.glossaryRefs?.includes(item.id));
  const terms = (related.length ? related : allTerms).slice(0, 4);
  const term = terms.find(item => item.id === termId);
  const baseFrame = activityFrame(stepId);
  const sources = [...(demand?.sentenceFrames ?? []), ...(scaffold?.sentenceFrames ?? [])];
  const frames: Frame[] = [baseFrame, ...[...new Set(sources)].filter(vi => vi !== baseFrame.vi).slice(0, 2).map(vi => ({ vi }))];
  const english = languageView.language === 'en';
  const lang = languageView.language;
  const independent = stepId.includes('post') || stepId.includes('exit');
  return <details className="student-writing-support">
    <summary><span>Hỗ trợ để em tự diễn đạt</span><small>Từ khóa → Nói thử → Viết → Tự diễn đạt</small></summary>
    <div className="student-support-body">
      <div className="student-support-modes" role="group" aria-label="Mức hỗ trợ diễn đạt">
        <button type="button" aria-pressed={mode === 'words'} onClick={() => setMode('words')}>1 · Từ khóa</button>
        <button type="button" aria-pressed={mode === 'frame'} onClick={() => setMode('frame')}>2 · Khung câu</button>
        <button type="button" aria-pressed={mode === 'own'} onClick={() => setMode('own')}>3 · Tự diễn đạt</button>
      </div>
      <p className="student-support-prompt">{mode === 'own'
        ? 'Ẩn gợi ý, đọc lại bài viết và giải thích bằng lời của em. Nội dung em đã viết vẫn được giữ.'
        : independent ? 'Tự chọn cách làm và bằng chứng. Khung diễn đạt chỉ giúp trình bày, không cung cấp lời giải.'
          : 'Nói thử một câu với bạn bên cạnh. Bạn nghe hỏi “vì sao?”; sau đó em tự viết kết luận kèm bằng chứng.'}</p>
      {english && <p lang="en" className="student-support-translation">{independent ? 'Work independently. Use the frame to explain your own reasoning.' : 'Say your idea to a partner, explain why, then write it in your own words.'}</p>}
      {mode !== 'own' && languageView.showGlossary && terms.length > 0 && <>
        <div className="student-support-terms">{terms.map(item => <button type="button" key={item.id} aria-pressed={termId === item.id} onClick={() => setTermId(termId === item.id ? null : item.id)}>{item.vietnamese}{lang !== 'vi' && item.translations[lang] ? ` · ${item.translations[lang]}` : ''}</button>)}</div>
        {term && <div className="student-support-definition">
          <strong>{term.vietnamese}</strong><LiveLessonRichText text={term.plainExplanationVi} />
          {lang !== 'vi' && term.plainExplanationByLanguage[lang] && <LiveLessonRichText text={term.plainExplanationByLanguage[lang]!} className="student-support-translation" />}
        </div>}
      </>}
      {mode === 'frame' && <>
        {english && onInsert && <label className="student-support-language"><input type="checkbox" checked={insertEnglish} onChange={e => setInsertEnglish(e.target.checked)} /> Chèn khung tiếng Anh khi có bản hỗ trợ</label>}
        {(independent ? [baseFrame] : frames).map(frame => <div className="student-sentence-frame" key={frame.vi}>
          <LiveLessonRichText text={frame.vi} />
          {english && frame.en && <p lang="en" className="student-support-translation">{frame.en}</p>}
          {onInsert ? <button type="button" onClick={() => onInsert(english && insertEnglish && frame.en ? frame.en : frame.vi)}>Thêm vào nháp của em</button>
            : <p className="student-support-prompt">Dùng để nói hoặc ghi vào vở; không cần gửi thêm trên máy.</p>}
        </div>)}
        <p className="student-support-prompt">Điền các chỗ ___ bằng ý của em. Khi đã tự giải thích được, chọn “Tự diễn đạt” để bỏ gợi ý.</p>
      </>}
    </div>
  </details>;
}
