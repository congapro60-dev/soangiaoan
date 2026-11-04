import { readFileSync, writeFileSync } from 'node:fs';

const p = 'src/components/liveLesson/StudentLiveView.tsx';
let t = readFileSync(p, 'utf8');

// 1. import uploader
const impAnchor = "import { MathFigureZoom } from './MathFigureZoom';";
if (!t.includes(impAnchor)) throw new Error('zoom import missing');
t = t.split(impAnchor).join(impAnchor + "\nimport { StudentPaperPhotoUploader } from './StudentPaperPhotoUploader';");

// 2. chèn uploader ngay dưới textarea trong textControl
const textAnchor = '<div className="student-draft-meta">';
if (!t.includes(textAnchor)) throw new Error('draft meta missing');
const uploaderCode = `{participantUid && (
              <StudentPaperPhotoUploader
                participantUid={participantUid}
                disabled={!thinkWindow.canAnswer}
                onPhotoInserted={(ref) => setTextValue((v) => (v ? v + ref : ref.trim()))}
              />
            )}\n            ` + textAnchor;
t = t.split(textAnchor).join(uploaderCode);

writeFileSync(p, t, 'utf8');
console.log('uploader wired into StudentLiveView');
