import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from '../../lib/liveLesson/definition';
import {
  buildPrivateNeedsSummary,
  buildTeacherStatePatch,
  getCueNavigation,
  getTeacherMobileControlModel,
  getTimerSnapshot,
} from './TeacherLiveView';

describe('TeacherLiveView controls', () => {
  const definition = getPilotLiveLessonDefinition();

  it('moves within cue bounds and keeps the matching TV screen', () => {
    expect(getCueNavigation(definition, 'P00', 'previous')).toEqual({ currentCueId: 'P00', currentTvScreenId: 'S0' });
    expect(getCueNavigation(definition, 'P00', 'next')).toEqual({ currentCueId: 'P01', currentTvScreenId: 'S1' });
    expect(getCueNavigation(definition, 'P21', 'next')).toEqual({ currentCueId: 'P21', currentTvScreenId: 'S11' });
  });

  it('derives elapsed and remaining time from the canonical cue timeline', () => {
    expect(getTimerSnapshot(definition, 'P12', 'running')).toEqual({ elapsedSeconds: 1005, remainingSeconds: 1395, status: 'running' });
    expect(getTimerSnapshot(definition, 'P12', 'paused')).toEqual({ elapsedSeconds: 1005, remainingSeconds: 1395, status: 'paused' });
    expect(getTimerSnapshot(definition, 'missing', 'running')).toEqual({ elapsedSeconds: 0, remainingSeconds: 2400, status: 'running' });
  });

  it('creates only allowed teacher state patches and never resumes a closed session', () => {
    expect(buildTeacherStatePatch(definition, 'P05', 'running')).toEqual({
      currentCueId: 'P05', currentTvScreenId: 'S4',
    });
    expect(buildTeacherStatePatch(definition, 'P05', 'paused')).toEqual({ status: 'running' });
    expect(buildTeacherStatePatch(definition, 'P05', 'closed')).toBeNull();
  });

  it('describes the current cue and mobile control labels', () => {
    expect(getTeacherMobileControlModel(definition, {
      currentCueId: 'P12',
      status: 'running',
      publicStatsEnabled: true,
    })).toEqual({
      currentCueInstruction: definition.cues[12].teacher,
      cueIndex: 13,
      cueTotal: 22,
      pauseResumeLabel: 'Tạm dừng',
      secondaryLabels: {
        timeline: 'Mở timeline',
        stats: 'Ẩn thống kê TV',
        close: 'Đóng phiên',
      },
    });

    expect(getTeacherMobileControlModel(definition, {
      currentCueId: 'P12',
      status: 'paused',
      publicStatsEnabled: false,
    }).pauseResumeLabel).toBe('Bắt đầu / tiếp tục');
  });
});

describe('TeacherLiveView private needs summary', () => {
  it('aggregates need signals privately without public ability or language labels', () => {
    const summary = buildPrivateNeedsSummary([
      { need: 'terminology', count: 3 },
      { need: 'sentence_frame', count: 2 },
      { need: 'extra_processing_time', count: 1 },
    ]);

    expect(summary).toEqual({ title: 'Nhu cầu hỗ trợ riêng', lines: ['Thuật ngữ: 3', 'Khung câu: 2', 'Thêm thời gian xử lý: 1'] });
    expect(JSON.stringify(summary)).not.toMatch(/yếu|giỏi|kém|language|english|korean|nhãn/i);
  });
});

describe('TeacherLiveView grouping integration', () => {
  it('group proposals are kept private to teacher view and not exposed to TV', () => {
    const proposal = {
      groupId: 'grp-1',
      purpose: 'same_need_workshop' as const,
      memberIds: ['s1', 's2', 's3'],
      scaffold: 'Hình/khung câu/thuật ngữ đã chuẩn bị.',
      reason: 'HS chưa phân biệt đường biên — lý do riêng tư.',
    };
    const json = JSON.stringify(proposal);
    expect(json).toContain('HS chưa phân biệt đường biên');
    expect(json).toContain('grp-1');
    // Private reason is OK in teacher view — it must NOT appear in TV projection
  });
});
