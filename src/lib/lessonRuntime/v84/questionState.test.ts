import { describe, expect, it } from 'vitest';
import {
  briefQuestion, extendQuestion, includeRequiredStudent, lockQuestionNow, openQuestion,
  prepareQuestion, reconcileQuestion, reopenQuestion, excludeRequiredStudent,
  resolveDisconnectedBlocker, revealQuestion,
  showQuestionStats, submitQuestionResponse, type QuestionRun, pauseQuestion, resumeQuestion,
  resolveConfirmedAbsence,
} from './questionState';

const open = (required: string[], revealPolicy: QuestionRun['revealPolicy'] = 'show_after_submit') =>
  openQuestion({ instanceId: 'Q1@A1', activityId: 'A1', requiredStudentIds: required, openedAtSec: 100, workBudgetSec: 45, revealPolicy });

describe('V8.4 single active question', () => {
  it('requires a brief before opening the first question', () => {
    const introduced = prepareQuestion('Q1@A1', 'A1', 'show_after_submit');
    expect(introduced.phase).toBe('INTRO');
    const briefed = briefQuestion(introduced);
    expect(briefed.phase).toBe('QUESTION_BRIEF');
    expect(() => briefQuestion(briefed)).toThrow('QUESTION_PHASE_INVALID');
  });
  it('freezes the required cohort while recording a late non-blocking response', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 111);
    run = submitQuestionResponse(run, 'late', 112);
    run = submitQuestionResponse(run, 'two', 113);
    expect(run.completionRequiredSet).toEqual(['one', 'two']);
    expect(run.responseSet).toEqual(['late', 'one', 'two']);
    expect(run.requiredCompleted).toBe(2);
    expect(run.validResponses).toBe(3);
  });

  it('auto-locks as soon as all required students submit and keeps stats before reveal', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 110);
    expect(run.phase).toBe('QUESTION_OPEN');
    run = submitQuestionResponse(run, 'two', 127);
    expect(run.phase).toBe('STATS');
    expect(run.lockedAtSec).toBe(127);
    expect(run.savedWorkSec).toBe(18);
    expect(reconcileQuestion(run, 129).phase).toBe('STATS');
    expect(reconcileQuestion(run, 130).phase).toBe('REVEAL');
  });

  it('locks on maximum budget and rejects submissions after lock', () => {
    const run = reconcileQuestion(open(['one', 'two']), 145);
    expect(run.phase).toBe('STATS');
    expect(run.lockReason).toBe('TIMER_EXPIRED');
    expect(() => submitQuestionResponse(run, 'one', 146)).toThrow('QUESTION_LOCKED');
  });

  it('does not vacuously auto-lock an empty required set', () => {
    expect(reconcileQuestion(open([]), 100).phase).toBe('QUESTION_OPEN');
  });

  it('preserves teacher-manual and no-reveal policies after stats', () => {
    let manual = submitQuestionResponse(open(['one'], 'teacher_manual'), 'one', 112);
    manual = reconcileQuestion(manual, 120);
    expect(manual.phase).toBe('STATS');
    const never = reconcileQuestion(submitQuestionResponse(open(['one'], 'no_reveal'), 'one', 112), 120);
    expect(never.phase).toBe('STATS');
  });

  it('counts revisions once and keeps the current question until teacher advances', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 105);
    run = submitQuestionResponse(run, 'one', 106);
    expect(run.responseSet).toEqual(['one']);
    expect(run.responseRevisionByStudent.one).toBe(2);
    run = submitQuestionResponse(run, 'two', 108);
    expect(reconcileQuestion(run, 120).phase).toBe('REVEAL');
    expect(reconcileQuestion(run, 180).instanceId).toBe('Q1@A1');
  });

  it('lets the teacher extend an open question before expiry', () => {
    const extended = extendQuestion(open(['one']), 15);
    expect(extended.deadlineAtSec).toBe(160);
    expect(reconcileQuestion(extended, 145).phase).toBe('QUESTION_OPEN');
    expect(reconcileQuestion(extended, 160).phase).toBe('STATS');
  });

  it('never counts teacher extensions as time saved against the original plan', () => {
    const extended = extendQuestion(open(['one']), 30);
    expect(submitQuestionResponse(extended, 'one', 127).savedWorkSec).toBe(18);
    expect(lockQuestionNow(extended, 150).savedWorkSec).toBe(0);
  });

  it('freezes question automation and input while paused, then restores the remaining time without changing the draft run key', () => {
    const run = open(['one']);
    const paused = pauseQuestion(run, 110);
    expect(reconcileQuestion(paused, 200)).toBe(paused);
    expect(() => submitQuestionResponse(paused, 'one', 120)).toThrow('QUESTION_PAUSED');
    expect(pauseQuestion(paused, 120)).toBe(paused);
    const resumed = resumeQuestion(paused, 200);
    expect(resumed.openedAtSec).toBe(100);
    expect(resumed.deadlineAtSec).toBe(235);
    expect(resumed.pausedAtSec).toBeUndefined();
    expect(resumeQuestion(resumed, 210)).toBe(resumed);
    expect(submitQuestionResponse(resumed, 'one', 210).savedWorkSec).toBe(0);
  });

  it('holds the stats dwell during pause and gives the remaining dwell after resume', () => {
    const stats = submitQuestionResponse(open(['one']), 'one', 127);
    const paused = pauseQuestion(stats, 128);
    expect(reconcileQuestion(paused, 200)).toBe(paused);
    const resumed = resumeQuestion(paused, 200);
    expect(reconcileQuestion(resumed, 201).phase).toBe('STATS');
    expect(reconcileQuestion(resumed, 202).phase).toBe('REVEAL');
  });

  it('keeps manual lock, stats and reveal as separate teacher actions', () => {
    const locked = lockQuestionNow(open(['one'], 'teacher_manual'), 120);
    expect(locked.phase).toBe('QUESTION_LOCKED');
    const stats = showQuestionStats(locked, 121);
    expect(stats.phase).toBe('STATS');
    expect(reconcileQuestion(stats, 140).phase).toBe('STATS');
    expect(revealQuestion(stats, 122).phase).toBe('REVEAL');
    expect(() => revealQuestion(showQuestionStats(lockQuestionNow(open(['one'], 'no_reveal'), 120), 121), 122)).toThrow('REVEAL_FORBIDDEN');
  });

  it('records explicit teacher inclusion of a late student without silently altering a previous snapshot', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 110);
    run = submitQuestionResponse(run, 'late', 111);
    const included = includeRequiredStudent(run, 'late');
    expect(run.completionRequiredSet).toEqual(['one', 'two']);
    expect(included.completionRequiredSet).toEqual(['late', 'one', 'two']);
    expect(included.requiredCompleted).toBe(2);
  });

  it('allows early finish after disconnected grace without rewriting the frozen denominator', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 110);
    const resolved = resolveDisconnectedBlocker(run, 'two', 135);
    expect(resolved.completionRequiredSet).toEqual(['one', 'two']);
    expect(resolved.nonBlockingRequiredSet).toEqual(['two']);
    expect(resolved.requiredCompleted).toBe(1);
    expect(resolved.phase).toBe('STATS');
    expect(resolved.lockReason).toBe('DISCONNECT_GRACE');
  });

  it('does not let a teacher-confirmed absence block early finish mid-question', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 110);
    const resolved = resolveConfirmedAbsence(run, 'two', 112);
    expect(resolved).toMatchObject({ phase: 'STATS', lockReason: 'CONFIRMED_ABSENCE',
      completionRequiredSet: ['one', 'two'], nonBlockingRequiredSet: ['two'],
      requiredCompleted: 1, validResponses: 1 });
    expect(() => resolveConfirmedAbsence(run, 'late', 112)).toThrow('QUESTION_ABSENCE_OVERRIDE_INVALID');
  });

  it('reopens only before answer reveal and starts a fresh response run', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 110, 'A');
    run = submitQuestionResponse(run, 'two', 112, 'B');
    const reopened = reopenQuestion(run, 120, 45);
    expect(reopened).toMatchObject({ phase: 'QUESTION_OPEN', openedAtSec: 120, deadlineAtSec: 165,
      completionRequiredSet: ['one', 'two'], responseSet: [], responseValueByStudent: {}, savedWorkSec: 0 });
    expect(reopened.runRevision).toBeGreaterThan(run.runRevision);
    expect(() => reopenQuestion({ ...run, phase: 'REVEAL' }, 120, 45)).toThrow('REOPEN_AFTER_REVEAL_FORBIDDEN');
  });

  it('lets the teacher explicitly remove a current blocker while retaining submitted evidence', () => {
    let run = open(['one', 'two']);
    run = submitQuestionResponse(run, 'one', 110, 'A');
    const excluded = excludeRequiredStudent(run, 'two', 112);
    expect(excluded).toMatchObject({ completionRequiredSet: ['one'], responseSet: ['one'],
      requiredCompleted: 1, validResponses: 1, phase: 'STATS', lockReason: 'TEACHER_COHORT' });
  });
});
