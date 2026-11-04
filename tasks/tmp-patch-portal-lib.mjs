// Patch AdaptiveStudentPortalPage: library mode (import + deps + submit branches)
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/pages/AdaptiveStudentPortalPage.tsx';
let t = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const reps = [
  ['  openStudentAdaptiveAssignment,\n  submitStudentAdaptiveAssessment,', '  openStudentAdaptiveAssignment,\n  openStudentAdaptiveLibraryLesson,\n  submitStudentAdaptiveLibraryAssessment,\n  submitStudentAdaptiveAssessment,'],
  ['  }, [id, teacherId, assignmentId]);', '  }, [id, teacherId, assignmentId, libraryLessonId]);'],
];

const diagOld = `    const attempt = assignmentId
      ? (await submitStudentAdaptiveAssessment(assignmentId, {
        kind: 'diagnostic',
        answers: diagnosticAnswers,
        durationSeconds: measuredDurationFor('diagnostic', plannedSeconds),
      })).attempt
      : gradeAssessment(lesson.diagnosticTest, diagnosticAnswers, measuredDurationFor('diagnostic', plannedSeconds));`;
const diagNew = `    const attempt = assignmentId
      ? (await submitStudentAdaptiveAssessment(assignmentId, {
        kind: 'diagnostic',
        answers: diagnosticAnswers,
        durationSeconds: measuredDurationFor('diagnostic', plannedSeconds),
      })).attempt
      : libraryMode
      ? (await submitStudentAdaptiveLibraryAssessment(libraryLessonId!, {
        kind: 'diagnostic',
        answers: diagnosticAnswers,
        durationSeconds: measuredDurationFor('diagnostic', plannedSeconds),
      })).attempt
      : gradeAssessment(lesson.diagnosticTest, diagnosticAnswers, measuredDurationFor('diagnostic', plannedSeconds));`;

const exitOld = `    const finalExitTicketAttempt = assignmentId
      ? (await submitStudentAdaptiveAssessment(assignmentId, {
        kind: 'exitTicket',
        answers: exitTicketAnswers,
        durationSeconds: measuredDurationFor('exit-ticket', plannedSeconds),
      })).attempt
      : gradeAssessment(lesson.exitTicket, exitTicketAnswers, measuredDurationFor('exit-ticket', plannedSeconds));`;
const exitNew = `    const finalExitTicketAttempt = assignmentId
      ? (await submitStudentAdaptiveAssessment(assignmentId, {
        kind: 'exitTicket',
        answers: exitTicketAnswers,
        durationSeconds: measuredDurationFor('exit-ticket', plannedSeconds),
      })).attempt
      : libraryMode
      ? (await submitStudentAdaptiveLibraryAssessment(libraryLessonId!, {
        kind: 'exitTicket',
        answers: exitTicketAnswers,
        durationSeconds: measuredDurationFor('exit-ticket', plannedSeconds),
      })).attempt
      : gradeAssessment(lesson.exitTicket, exitTicketAnswers, measuredDurationFor('exit-ticket', plannedSeconds));`;

for (const [a, b] of reps) {
  if (!t.includes(a)) throw new Error('KHÔNG thấy: ' + a.slice(0, 60));
  t = t.split(a).join(b);
}
for (const [a, b] of [[diagOld, diagNew], [exitOld, exitNew]]) {
  if (!t.includes(a)) throw new Error('KHÔNG thấy block: ' + a.slice(0, 60));
  t = t.split(a).join(b);
}
writeFileSync(p, t, 'utf8');
console.log('PATCHED:', t.includes('submitStudentAdaptiveLibraryAssessment') && t.includes('libraryLessonId]);'));
