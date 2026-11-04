/**
 * Lịch dạy của giáo viên → cách đánh số tuần học cho báo cáo. Lịch dạy lưu trên trình duyệt của giáo viên
 * (xem `loadScheduleState`), nên bản này tính ở máy giáo viên rồi đi cùng báo cáo khi công bố.
 */
import type { WeekPlan } from '../classroom/reportWeeks';
import { fullyOffWeeks, offDatesFrom } from './calendarImport';
import { isAdminEmail } from '../admin/adminConfig';
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

/** Lịch năm học 2026–2027 của chủ dự án: tuần 1 (W01) bắt đầu thứ Hai 17/08/2026 (xác nhận 09/10/2026, theo file "26-27 School calendar"). */
export const OWNER_WEEK_PLAN: WeekPlan = { week1Monday: '2026-08-17', skippedWeeks: [] };

/**
 * Tuần học của giáo viên: theo Lịch dạy đã lập trên máy này; chưa có thì (chủ dự án) dùng lịch năm học trên;
 * không có gì thì null → báo cáo chia tuần theo khoảng ngày.
 */
export const weekPlanFor = (uid: string, className: string, email?: string | null): WeekPlan | null =>
  (uid ? weekPlanFromState(loadScheduleState(uid), className) : null) ?? (isAdminEmail(email) ? OWNER_WEEK_PLAN : null);
