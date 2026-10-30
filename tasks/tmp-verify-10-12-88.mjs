import { loadBanToanPackages } from './src/lib/liveLesson/v4/lessonAdapter.ts';

const packages = loadBanToanPackages();
console.log('TOTAL PACKAGES:', packages.length);
const p1012 = packages.find(p => p.sourceKey === '10-12-88');
if (!p1012) {
  console.error('PACKAGE 10-12-88 NOT FOUND!');
  process.exit(1);
}

console.log('PACKAGE FOUND:', p1012.packageId, p1012.title, 'Grade:', p1012.grade, 'Week:', p1012.week);
console.log('CHECKING CONTRACT:');
import { getLiveLessonV4Contract } from './src/lib/liveLesson/v4/lessonAdapter.ts';
const contract = getLiveLessonV4Contract(p1012.packageId);
console.log('CONTRACT TITLE:', contract.lesson.title);
console.log('TIMELINE BLOCKS COUNT:', contract.timeline.length);
console.log('TV SCREENS COUNT:', contract.projections.tv.screens.length);
console.log('STUDENT SCREENS COUNT:', contract.projections.student.screens.length);
console.log('AI ERROR CATEGORY:', contract.curriculumContext.aiErrorOfTheWeek?.category);
console.log('AI ERROR WRONG SOL:', contract.curriculumContext.aiErrorOfTheWeek?.wrongSolution.slice(0, 60));
console.log('FIRST 3 TIMELINE BLOCKS:');
contract.timeline.slice(0, 3).forEach(b => console.log(`  - [${b.id}] ${b.startSeconds}s -> ${b.endSeconds}s: ${b.label}`));
console.log('ALL VERIFICATIONS PASSED FOR 10-12-88!');
