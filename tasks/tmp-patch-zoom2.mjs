import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/StudentLiveView.tsx';
const lines = readFileSync(p, 'utf8').split('\n');
// dòng 733-738 (index 732-737) — thay bằng bản bọc MathFigureZoom
const replacement = [
  "      <details key={publicState.cueId} className=\"student-tv-reference\" open={step?.id === 'cp-ai-error' || step?.id === 'ai-error-w01'}>",
  '        <summary>Đề bài và nội dung chung</summary>',
  '        <MathFigureZoom title={tvScreen?.title ?? \'Nội dung chung\'}>',
  '          <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Màn hình chung (trên TV)</p>',
  "          <h2 className=\"mt-3 text-xl font-black\">{tvScreen?.title ?? 'Đang chờ màn hình'}</h2>",
  "          <LiveLessonRichText text={tvScreen?.body ?? 'Chưa có nội dung công khai.'} className=\"mt-3 text-sm font-semibold leading-6 text-slate-600\" />",
  '        </MathFigureZoom>',
  '      </details>',
];
const out = lines.slice(0, 732).concat(replacement).concat(lines.slice(738));
writeFileSync(p, out.join('\n'), 'utf8');
console.log('details wrapped');
