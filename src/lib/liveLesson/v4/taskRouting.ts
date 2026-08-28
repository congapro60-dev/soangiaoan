// Task routing — route M/S/C chỉ thay đổi scaffold/độ mở rộng; success criteria chung.
// Mỗi route có scaffold hints được reveal THEO THỨ TỰ, ghi nhận hintUse, không expose tất cả cùng lúc.

import type { LiveLessonV4Contract, ScaffoldSet, TaskVariant, V4Route } from './types';

export interface RoutedTask {
  variant: TaskVariant;
  scaffoldSet: ScaffoldSet;
  orderedHints: string[];
}

export interface HintRevealState {
  revealedCount: number;
  totalHints: number;
}

/**
 * Chọn TaskVariant + ScaffoldSet theo route. Trả về null nếu route không tồn tại trong contract.
 */
export function getRoutedVariant(
  contract: LiveLessonV4Contract,
  route: V4Route,
): RoutedTask | null {
  const variant = contract.taskVariants.find((v) => v.route === route);
  if (!variant) return null;

  const scaffoldSet = contract.scaffoldSets.find((s) => s.id === variant.scaffoldSetId);
  if (!scaffoldSet) return null;

  return {
    variant,
    scaffoldSet,
    orderedHints: [...scaffoldSet.hints],
  };
}

/**
 * Trả về ordered hints cho một route. Rỗng nếu route không hợp lệ.
 */
export function getOrderedHints(
  contract: LiveLessonV4Contract,
  route: V4Route,
): string[] {
  const routed = getRoutedVariant(contract, route);
  return routed?.orderedHints ?? [];
}

/**
 * Reveal hint tiếp theo. Trả về số hints đã reveal sau thao tác (bounded).
 * Mỗi lần reveal ghi nhận hintUse — KHÔNG expose tất cả hints cùng lúc.
 */
export function revealNextHint(current: HintRevealState): number {
  return Math.min(current.revealedCount + 1, current.totalHints);
}

/**
 * Tạo initial hint state — chưa reveal hint nào.
 */
export function createHintState(orderedHints: string[]): HintRevealState {
  return { revealedCount: 0, totalHints: orderedHints.length };
}

/**
 * Trả về hints đã reveal (từ index 0 đến revealedCount - 1).
 */
export function getRevealedHints(orderedHints: string[], revealedCount: number): string[] {
  return orderedHints.slice(0, revealedCount);
}

/**
 * Opacity cho hint fading: hint mới nhất full opacity, cũ hơn mờ dần.
 * Giá trị 0–1 cho CSS opacity.
 */
export function computeHintOpacity(
  hintIndex: number,
  revealedCount: number,
): number {
  if (hintIndex >= revealedCount) return 0;
  const age = revealedCount - 1 - hintIndex;
  if (age === 0) return 1;
  if (age === 1) return 0.6;
  return 0.35;
}

/**
 * Kiểm tra xem còn hint nào để reveal không.
 */
export function hasMoreHints(state: HintRevealState): boolean {
  return state.revealedCount < state.totalHints;
}

/**
 * Trả về extension text nếu variant có extension.
 */
export function getExtension(variant: TaskVariant): string | undefined {
  return variant.extension;
}
