import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mergeProfileWithExisting } from '../adaptive-progress-profile';

const makeIncomingProfile = (suffix: string, averageMastery = 0.8) => ({
  id: 'student-1',
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentCode: 'S1',
  studentName: 'Student 1',
  studentClass: '11A1',
  totalSessions: 1,
  averageMastery,
  routeHistory: [`core-${suffix}`],
  objectiveMemory: [
    {
      objectiveId: 'obj-ap',
      status: 'mastered',
      attempts: 1,
      lastScore: averageMastery,
      lastUpdatedAt: `2026-05-18T13:0${suffix}:00.000Z`,
    },
  ],
  misconceptionCounts: { 'common-difference': 1 },
  createdAt: '2026-05-18T13:00:00.000Z',
  updatedAt: `2026-05-18T13:0${suffix}:00.000Z`,
});

const makeProgressRecord = (route = 'core', masteryEstimate = 0.8) => ({
  id: `progress-${route}`,
  teacherId: 'teacher-1',
  lessonId: 'lesson-1',
  studentId: 'student-1',
  studentCode: 'S1',
  studentName: 'Student 1',
  route,
  diagnosticAttempt: {
    objectiveScores: [{ objectiveId: 'obj-ap', masteryEstimate }],
  },
  quickCheckAttempts: [],
});

describe('adaptive-progress profile merge', () => {
  it('keeps a new incoming profile unchanged when no existing profile exists', () => {
    const incomingProfile = makeIncomingProfile('1', 0.75);
    const merged = mergeProfileWithExisting({
      existingProfile: null,
      incomingProfile,
      progressRecord: makeProgressRecord('core', 0.75),
    });

    expect(merged).toEqual(incomingProfile);
  });

  it('increments totalSessions for the second saved session', () => {
    const existingProfile = {
      ...makeIncomingProfile('1', 0.7),
      totalSessions: 1,
      averageMastery: 0.7,
      routeHistory: ['core-1'],
    };
    const incomingProfile = makeIncomingProfile('2', 0.9);

    const merged = mergeProfileWithExisting({
      existingProfile,
      incomingProfile,
      progressRecord: makeProgressRecord('extension', 0.9),
    });

    expect(merged.totalSessions).toBe(2);
    expect(merged.averageMastery).toBe(0.8);
    expect(merged.routeHistory).toEqual(['core-1', 'core-2']);
  });

  it('accumulates misconception counts and objective attempts across sessions', () => {
    const existingProfile = {
      ...makeIncomingProfile('1', 0.6),
      totalSessions: 3,
      averageMastery: 0.6,
      objectiveMemory: [{ objectiveId: 'obj-ap', attempts: 3, status: 'developing' }],
      misconceptionCounts: { 'common-difference': 2, 'sum-vs-term': 1 },
    };
    const incomingProfile = {
      ...makeIncomingProfile('2', 0.9),
      misconceptionCounts: { 'common-difference': 1, 'formula-selection': 2 },
    };

    const merged = mergeProfileWithExisting({
      existingProfile,
      incomingProfile,
      progressRecord: makeProgressRecord('core', 0.9),
    });

    expect(merged.totalSessions).toBe(4);
    expect(merged.objectiveMemory[0].attempts).toBe(4);
    expect(merged.misconceptionCounts).toEqual({
      'common-difference': 3,
      'sum-vs-term': 1,
      'formula-selection': 2,
    });
  });

  it('demonstrates two sequential transaction-style merges preserve totalSessions === 2', () => {
    const first = mergeProfileWithExisting({
      existingProfile: null,
      incomingProfile: makeIncomingProfile('1', 0.7),
      progressRecord: makeProgressRecord('core', 0.7),
    });

    const second = mergeProfileWithExisting({
      existingProfile: first,
      incomingProfile: makeIncomingProfile('2', 0.9),
      progressRecord: makeProgressRecord('extension', 0.9),
    });

    expect(second.totalSessions).toBe(2);
    expect(second.averageMastery).toBe(0.8);
    expect(second.misconceptionCounts['common-difference']).toBe(2);
  });

  it('keeps profile reads inside the Firestore transaction to prevent lost updates', () => {
    const source = readFileSync(resolve(process.cwd(), 'api/adaptive-progress.ts'), 'utf8');
    const transactionBlock = source.match(/await db\.runTransaction\(async transaction => \{[\s\S]*?\n    \}\);/)?.[0] || '';
    const beforeTransaction = source.split('await db.runTransaction(async transaction => {')[0];

    expect(transactionBlock).toContain('const existingProfileSnapshot = await transaction.get(profileRef);');
    expect(beforeTransaction).not.toContain('profileRef.get(');
  });
});
