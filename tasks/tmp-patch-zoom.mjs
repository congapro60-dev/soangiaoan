import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/StudentLiveView.tsx';
let t = readFileSync(p, 'utf8');
// import
const impAnchor = "import { StudentPublishedQuestion } from './StudentPublishedQuestion';";
if (!t.includes(impAnchor)) throw new Error('import anchor missing');
t = t.split(impAnchor).join(impAnchor + `
import { MathFigureZoom } from './MathFigureZoom';`);
// bọc nội dung details TV reference
const oldDetails = `      <details key={publicState.cueId} className="student-tv-reference" open={step?.id === 'cp-ai-error' || step?.id === 'ai-error-w01'}>
        <summary>Đề bài và nội dung chung</summary>
        <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Màn hình chung (trên TV)</p>
        <h2 className="mt-3 text-xl font-black">{tvScreen?.title ?? 'Đang chờ màn hình'}</h2>
        <LiveLessonRichText text={tvScreen?.body ?? 'Chưa có nội dung công khai.'} className="mt-3 text-sm font-semibold leading-6 text-slate-600" />
      </details>`;
if (!t.includes(oldDetails)) throw new Error('details anchor missing');
const newDetails = `      <details key={publicState.cueId} className="student-tv-reference" open={step?.id === 'cp-ai-error' || step?.id === 'ai-error-w01'}>
        <summary>Đề bài và nội dung chung</summary>
        <MathFigureZoom title={tvScreen?.title ?? 'Nội dung chung'}>
          <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Màn hình chung (trên TV)</p>
          <h2 className="mt-3 text-xl font-black">{tvScreen?.title ?? 'Đang chờ màn hình'}</h2>
          <LiveLessonRichText text={tvScreen?.body ?? 'Chưa có nội dung công khai.'} className="mt-3 text-sm font-semibold leading-6 text-slate-600" />
        </MathFigureZoom>
      </details>`;
t = t.split(oldDetails).join(newDetails);
writeFileSync(p, t, 'utf8');
console.log('SLV zoom patched');
