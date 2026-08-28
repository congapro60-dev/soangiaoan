import { describe, expect, it } from 'vitest';
import { getG10P31V4Contract } from '../../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import {
  computeHintOpacity,
  createHintState,
  getExtension,
  getOrderedHints,
  getRevealedHints,
  getRoutedVariant,
  hasMoreHints,
  revealNextHint,
} from './taskRouting';

describe('getRoutedVariant', () => {
  const contract = getG10P31V4Contract();

  it('returns the matching variant and scaffold set for each valid route', () => {
    for (const route of ['M', 'S', 'C'] as const) {
      const routed = getRoutedVariant(contract, route);
      expect(routed).not.toBeNull();
      expect(routed!.variant.route).toBe(route);
      expect(routed!.scaffoldSet.id).toBe(routed!.variant.scaffoldSetId);
      expect(routed!.scaffoldSet.route).toBe(route);
    }
  });

  it('returns ordered hints from the scaffold set', () => {
    const routed = getRoutedVariant(contract, 'M');
    expect(routed!.orderedHints.length).toBeGreaterThan(0);
    expect(routed!.orderedHints).toEqual([...routed!.scaffoldSet.hints]);
  });

  it('returns null for a non-existent route', () => {
    const routed = getRoutedVariant(contract, 'X' as never);
    expect(routed).toBeNull();
  });

  it('all three routes share the same success criteria', () => {
    const variants = ['M', 'S', 'C'].map((r) => getRoutedVariant(contract, r as never)!);
    const [m, s, c] = variants;
    expect(m.variant.successCriteria).toEqual(s.variant.successCriteria);
    expect(s.variant.successCriteria).toEqual(c.variant.successCriteria);
  });

  it('each route has a different prompt', () => {
    const prompts = ['M', 'S', 'C'].map((r) => getRoutedVariant(contract, r as never)!.variant.prompt);
    expect(new Set(prompts).size).toBe(3);
  });

  it('C route has extension while M and S do not', () => {
    expect(getRoutedVariant(contract, 'C')!.variant.extension).toBeDefined();
    expect(getRoutedVariant(contract, 'M')!.variant.extension).toBeUndefined();
    expect(getRoutedVariant(contract, 'S')!.variant.extension).toBeUndefined();
  });
});

describe('getOrderedHints', () => {
  const contract = getG10P31V4Contract();

  it('returns hints for valid routes', () => {
    expect(getOrderedHints(contract, 'M').length).toBeGreaterThan(0);
    expect(getOrderedHints(contract, 'S').length).toBeGreaterThan(0);
    expect(getOrderedHints(contract, 'C').length).toBeGreaterThan(0);
  });

  it('returns empty array for invalid route', () => {
    expect(getOrderedHints(contract, 'X' as never)).toEqual([]);
  });
});

describe('hint reveal order and fading', () => {
  it('initial state has zero revealed hints', () => {
    const hints = ['Hint A', 'Hint B', 'Hint C'];
    const state = createHintState(hints);
    expect(state).toEqual({ revealedCount: 0, totalHints: 3 });
    expect(hasMoreHints(state)).toBe(true);
  });

  it('reveals hints one at a time in order', () => {
    const hints = ['First scaffold', 'Second scaffold'];
    let count = createHintState(hints).revealedCount;

    count = revealNextHint({ revealedCount: count, totalHints: hints.length });
    expect(count).toBe(1);
    expect(getRevealedHints(hints, count)).toEqual(['First scaffold']);

    count = revealNextHint({ revealedCount: count, totalHints: hints.length });
    expect(count).toBe(2);
    expect(getRevealedHints(hints, count)).toEqual(['First scaffold', 'Second scaffold']);
  });

  it('does not exceed total hints when revealing past the end', () => {
    const hints = ['Only one'];
    let count = 0;
    count = revealNextHint({ revealedCount: count, totalHints: hints.length });
    expect(count).toBe(1);
    count = revealNextHint({ revealedCount: count, totalHints: hints.length });
    expect(count).toBe(1); // bounded
    expect(hasMoreHints({ revealedCount: count, totalHints: hints.length })).toBe(false);
  });

  it('hint opacity fades older hints progressively', () => {
    const hints = ['A', 'B', 'C'];
    let count = createHintState(hints).revealedCount;

    // Reveal all three
    count = revealNextHint({ revealedCount: count, totalHints: 3 });
    count = revealNextHint({ revealedCount: count, totalHints: 3 });
    count = revealNextHint({ revealedCount: count, totalHints: 3 });

    // Latest (index 2) = 1.0, middle (index 1) = 0.6, oldest (index 0) = 0.35
    expect(computeHintOpacity(2, count)).toBe(1);
    expect(computeHintOpacity(1, count)).toBe(0.6);
    expect(computeHintOpacity(0, count)).toBe(0.35);
    // Not yet revealed
    expect(computeHintOpacity(3, count)).toBe(0);
  });

  it('single hint starts at full opacity', () => {
    const hints = ['Solo'];
    const count = revealNextHint({ revealedCount: 0, totalHints: 1 });
    expect(computeHintOpacity(0, count)).toBe(1);
  });

  it('getRevealedHints returns empty when nothing revealed', () => {
    expect(getRevealedHints(['A', 'B'], 0)).toEqual([]);
  });
});

describe('getExtension', () => {
  const contract = getG10P31V4Contract();

  it('returns extension for C variant', () => {
    const routed = getRoutedVariant(contract, 'C');
    expect(getExtension(routed!.variant)).toBeDefined();
  });

  it('returns undefined for M variant', () => {
    const routed = getRoutedVariant(contract, 'M');
    expect(getExtension(routed!.variant)).toBeUndefined();
  });
});
