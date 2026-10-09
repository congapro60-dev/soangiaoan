/**
 * Lịch dạy của giáo viên → cách đánh số tuần học cho báo cáo. Lịch dạy lưu trên trình duyệt của giáo viên
 * (xem `loadScheduleState`), nên bản này tính ở máy giáo viên rồi đi cùng báo cáo khi công bố.
 */
import type { WeekPlan } from '../classroom/reportWeeks';
import { fullyOffWeeks, offDatesFrom } from './calendarImport';
import { loadScheduleState, type ScheduleState, type SchedulePlan } from './schedulePlan';

const norm = (value: string): string => value.normalize('NFC').replace(/\s+/g, '').toLowerCase();

/** Bộ lịch có lớp này (theo tên lớp trong TKB hoặc nhãn); không có thì bộ lịch đầu tiên đã đặt tuần 1. */
const planForClass = (state: ScheduleState, className: string): SchedulePlan | null => {
  const withWeek1 = state.plans.filter(plan => plan.week1Monday);
  const key = norm(className);
  return withWeek1.find(plan => plan.classes.some(c => norm(c.classKey) === key || norm(c.label) === key)) ?? withWeek1[0] ?? null;
};

export const weekPlanFromState = (state: ScheduleState, className: string): WeekPlan | null => {
  const plan = planForClass(state, className);
  if (!plan) return null;
  const off = fullyOffWeeks(offDatesFrom(state.calendar.events));
  return { week1Monday: plan.week1Monday, skippedWeeks: [...new Set([...plan.skippedWeeks, ...off])].sort() };
};

/** Chưa có Lịch dạy (hoặc trình duyệt không cho đọc) → null: báo cáo chia tuần theo khoảng ngày. */
export const weekPlanFor = (uid: string, className: string): WeekPlan | null => (uid ? weekPlanFromState(loadScheduleState(uid), className) : null);
