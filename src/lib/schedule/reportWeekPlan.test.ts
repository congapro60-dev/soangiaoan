import { describe, expect, it } from 'vitest';
import { weekPlanFromState } from './reportWeekPlan';
import { emptyScheduleState, type SchedulePlan, type ScheduleState } from './schedulePlan';

const plan = (over: Partial<SchedulePlan>): SchedulePlan => ({
  id: 'p', name: 'Học kì I', week1Monday: '2026-08-31', skippedWeeks: ['2026-09-14'], messageSubject: 'Toán', subjectLabels: {}, timetables: [],
  classes: [{ classKey: '10Olinda (Dis)', label: '10Olinda', subjects: ['Toán'], ppct: null, strandBySlot: {} }], ...over,
});

describe('tuần học cho báo cáo từ Lịch dạy', () => {
  it('lấy bộ lịch có lớp đó; gộp tuần nghỉ trọn tuần theo lịch sự kiện', () => {
    const state: ScheduleState = {
      ...emptyScheduleState(),
      plans: [plan({ id: 'khac', week1Monday: '2026-09-07', classes: [] }), plan({})],
      calendar: { sourceName: '', events: [{ from: '2026-09-21', to: '2026-09-25', kind: 'nghi', note: 'Nghỉ', applied: true } as never] },
    };
    expect(weekPlanFromState(state, '10Olinda')).toEqual({ week1Monday: '2026-08-31', skippedWeeks: ['2026-09-14', '2026-09-21'] });
  });

  it('không khớp lớp thì dùng bộ lịch đầu tiên đã đặt tuần 1; chưa có lịch thì null', () => {
    const state = { ...emptyScheduleState(), plans: [plan({ week1Monday: '' }), plan({ id: 'b', week1Monday: '2026-09-07', classes: [] })] };
    expect(weekPlanFromState(state, '12A')?.week1Monday).toBe('2026-09-07');
    expect(weekPlanFromState(emptyScheduleState(), '12A')).toBeNull();
  });
});

describe('lịch năm học của chủ dự án', () => {
  it('17/08/2026 là thứ Hai: tuần 1 bắt đầu đúng ngày đó, tuần 2 là 24/08', async () => {
    const { OWNER_WEEK_PLAN } = await import('./reportWeekPlan');
    const { weekNumber, mondayOf } = await import('../classroom/reportWeeks');
    expect(mondayOf(OWNER_WEEK_PLAN.week1Monday)).toBe('2026-08-17');
    expect(weekNumber('2026-08-17', OWNER_WEEK_PLAN)).toBe(1);
    expect(weekNumber('2026-08-24', OWNER_WEEK_PLAN)).toBe(2);
    expect(weekNumber('2026-10-05', OWNER_WEEK_PLAN)).toBe(8);
  });
});
