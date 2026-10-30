import { buildCanonicalDraft } from './src/lib/liveLesson/v4/sequentialPublication.ts';
import { getBanToanV4PackageMetadata } from './src/lib/liveLesson/v4/lessonAdapter.ts';

const meta = getBanToanV4PackageMetadata().find(m => m.sourceKey === '10-12-88');
console.log('META FOR 10-12-88:', meta);

try {
  const draft = buildCanonicalDraft(meta, 'test-teacher-id');
  console.log('DRAFT BUILT SUCCESS:', draft.id, draft.title, draft.kind);
  console.log('AUDIT CHECK:');
  import('./src/lib/liveLesson/v4/sequentialPublication.ts').then(mod => {
    const issues = mod.auditLesson(draft, meta);
    console.log('AUDIT ISSUES COUNT:', issues.length);
    if (issues.length > 0) {
      console.log('ISSUES:', issues);
    } else {
      console.log('NO AUDIT ISSUES! 10-12-88 WILL PASS AUDIT CLEANLY.');
    }
  });
} catch (e) {
  console.error('ERROR BUILDING DRAFT:', e.message);
}
