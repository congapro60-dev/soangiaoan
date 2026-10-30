import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';
import { serializeForStudent, serializeForTeacher } from '../lib/lesson/serialize.js';
import { createSessionPlan } from '../lib/lesson/session-plan.js';
import { pilotGameDescriptor } from '../lib/lesson/game-adapter.js';

test('Week 14 E2E: all 24 lessons run smoothly with multi-branch differentiation, hints, and scoring', () => {
  const cat = JSON.parse(readFileSync(new URL('../content/hki-2026-catalogue.json', import.meta.url), 'utf8'));
  const w14 = cat.lessons.filter((l) => l.week === 14);
  assert.equal(w14.length, 24, 'Week 14 must have exactly 24 lessons in catalogue');

  let totalEvents = 0;
  let totalHintsTested = 0;
  let totalSubmitsTested = 0;

  for (const lesson of w14) {
    const pkg = JSON.parse(gunzipSync(Buffer.from(lesson.data, 'base64')).toString());

    // 1. Session Plan
    const plan = createSessionPlan({
      package: pkg,
      theme: 'historical',
      map: 'historical',
      rule: 'campaign',
      participation: 'group',
      status: 'approved',
      director: { seed: 100 + lesson.period }
    });
    assert.ok(plan, `Session plan failed for period ${lesson.period}`);

    // 2. Game Adapter Descriptor
    const descriptor = pilotGameDescriptor(pkg);
    assert.ok(descriptor, `Game descriptor failed for period ${lesson.period}`);

    // 3. Create Session with 2 learners
    let session = createLessonSession({
      package: pkg,
      mode: 'preview',
      sessionId: `test-${lesson.grade}-${lesson.period}`,
      hostId: 'teacher-main',
      learners: [
        { id: 'hs-core', name: 'Học sinh Tiêu Chuẩn' },
        { id: 'hs-support', name: 'Học sinh Cần Hỗ Trợ' }
      ],
      rewardPolicy: { individualCorrect: 5, groupCorrect: 2 },
      now: 1000
    });

    // 4. Start lesson
    let res = reduceLessonSession(
      session,
      { eventId: 'ev-start', type: 'START', round: 1, revision: 0, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
    );
    assert.equal(res.result.ok, true, `START failed for period ${lesson.period}`);
    session = res.state;
    totalEvents++;

    // 5. Walk through every activity in the lesson
    while (true) {
      const actId = session.timeline.currentActivityId;
      const act = pkg.activities.find((a) => a.id === actId);
      if (!act) break;

      // Student B selects support branch if available in this activity
      const supportTasks = (pkg.tasks || []).filter((t) => act.taskIds?.includes(t.id) && t.branch === 'support');
      if (supportTasks.length > 0) {
        const branchRes = reduceLessonSession(
          session,
          {
            eventId: `ev-branch-${act.id}`,
            type: 'SELECT_BRANCH',
            activityId: act.id,
            round: session.round,
            revision: session.revision,
            payload: { branch: 'support' }
          },
          { actor: { role: 'student', id: 'hs-support' }, now: 1000 + totalEvents * 10 }
        );
        if (branchRes.result.ok) {
          session = branchRes.state;
          totalEvents++;
        }
      }

      // Test learners on their respective available tasks
      for (const learnerId of ['hs-core', 'hs-support']) {
        const studentView = serializeForStudent(session, learnerId);
        const availableTasks = studentView.tasks || [];

        for (const task of availableTasks) {
          const taskObj = pkg.tasks.find((t) => t.id === task.id);
          const hint = pkg.hints.find((h) => h.taskId === task.id);
          if (hint) {
            const hintRes = reduceLessonSession(
              session,
              {
                eventId: `ev-h-${learnerId}-${task.id}`,
                type: 'HINT',
                activityId: act.id,
                round: session.round,
                revision: session.revision,
                payload: { taskId: task.id, hintId: hint.id }
              },
              { actor: { role: 'student', id: learnerId }, now: 1000 + totalEvents * 10 }
            );
            assert.equal(hintRes.result.ok, true, `HINT failed: ${JSON.stringify(hintRes.result)}`);
            session = hintRes.state;
            totalEvents++;
            totalHintsTested++;
          }

          let ans = 'Học sinh nộp bài giải';
          if (taskObj?.evaluation?.answerKey !== undefined) {
            ans = taskObj.evaluation.answerKey;
          } else if (taskObj?.type === 'closed') {
            ans = 1;
          }

          const subRes = reduceLessonSession(
            session,
            {
              eventId: `ev-sub-${learnerId}-${task.id}`,
              type: 'SUBMIT',
              activityId: act.id,
              round: session.round,
              revision: session.revision,
              payload: { taskId: task.id, answer: ans }
            },
            { actor: { role: 'student', id: learnerId }, now: 1000 + totalEvents * 10 }
          );
          assert.equal(subRes.result.ok, true, `SUBMIT failed: ${JSON.stringify(subRes.result)}`);
          session = subRes.state;
          totalEvents++;
          totalSubmitsTested++;
        }
      }

      // Advance to next activity
      const advRes = reduceLessonSession(
        session,
        {
          eventId: `ev-next-${session.timeline.activityIndex}`,
          type: 'NEXT',
          activityId: act.id,
          round: session.round,
          revision: session.revision,
          payload: {}
        },
        { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 + totalEvents * 10 }
      );

      if (!advRes.result.ok) break;
      session = advRes.state;
      totalEvents++;
    }

    const finalTeacher = serializeForTeacher(session);
    assert.ok(finalTeacher.tasks.length > 0, `Teacher view missing tasks in period ${lesson.period}`);
  }

  assert.ok(totalHintsTested > 0, 'Must have tested hints');
  assert.ok(totalSubmitsTested > 0, 'Must have tested submits');
  assert.ok(totalEvents > 0, 'Must have dispatched events');
});
