import { useEffect, useMemo, useState } from 'react';
import type { ApiProvider } from '../config/apiLimits';
import { getProviderModel, type ProviderModel } from '../data/models';

export interface UsageState {
  date: string;
  requestsToday: number;
  tokensUsedCurrentMinute: number;
  minuteStart: number;
  rpm: number;
  rpmWindow: number[];
}

export interface ApiUsageSnapshot extends UsageState {
  provider: ApiProvider;
  modelId: string;
  model?: ProviderModel;
  rpdPercent: number;
  tpmPercent: number;
  rpmPercent: number;
  statusLevel: 'safe' | 'warning' | 'danger';
  reset: () => void;
}

const ONE_MINUTE_MS = 60_000;
const USAGE_UPDATED_EVENT = 'api-usage-updated';

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const todayKey = (): string => new Date().toISOString().slice(0, 10);
const makeStorageKey = (provider: string, modelId: string): string => `usage_${provider}_${modelId}`;

const emptyState = (now = Date.now()): UsageState => ({
  date: todayKey(),
  requestsToday: 0,
  tokensUsedCurrentMinute: 0,
  minuteStart: now,
  rpm: 0,
  rpmWindow: [],
});

const sanitizeState = (state: Partial<UsageState> | null | undefined, now = Date.now()): UsageState => {
  const today = todayKey();
  if (!state || state.date !== today) return emptyState(now);

  const rpmWindow = Array.isArray(state.rpmWindow)
    ? state.rpmWindow.filter(timestamp => typeof timestamp === 'number' && now - timestamp < ONE_MINUTE_MS)
    : [];

  const minuteStart = Number(state.minuteStart) || now;
  const minuteExpired = now - minuteStart > ONE_MINUTE_MS;

  return {
    date: today,
    requestsToday: Number(state.requestsToday) || 0,
    tokensUsedCurrentMinute: minuteExpired ? 0 : Number(state.tokensUsedCurrentMinute) || 0,
    minuteStart: minuteExpired ? now : minuteStart,
    rpm: rpmWindow.length,
    rpmWindow,
  };
};

const readUsageState = (provider: ApiProvider, modelId: string): UsageState => {
  if (!isBrowser() || !modelId) return emptyState();
  try {
    const raw = window.localStorage.getItem(makeStorageKey(provider, modelId));
    return sanitizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyState();
  }
};

const writeUsageState = (provider: ApiProvider, modelId: string, state: UsageState): void => {
  if (!isBrowser() || !modelId) return;
  window.localStorage.setItem(makeStorageKey(provider, modelId), JSON.stringify(state));
};

const dispatchUsageUpdated = (): void => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT));
};

export const estimateTokenCount = (text: string): number => Math.max(1, Math.ceil((text || '').length / 4));

export function trackUsage(provider: ApiProvider, modelId: string, tokensUsed: number, requestCount = 1): void {
  if (!modelId || requestCount <= 0) return;

  const now = Date.now();
  let state = readUsageState(provider, modelId);
  const safeTokens = Math.max(0, Math.round(tokensUsed || 0));

  state.requestsToday += requestCount;

  if (now - state.minuteStart > ONE_MINUTE_MS) {
    state.tokensUsedCurrentMinute = safeTokens;
    state.minuteStart = now;
  } else {
    state.tokensUsedCurrentMinute += safeTokens;
  }

  state.rpmWindow = [
    ...state.rpmWindow.filter(timestamp => now - timestamp < ONE_MINUTE_MS),
    ...Array.from({ length: requestCount }, () => now),
  ];
  state.rpm = state.rpmWindow.length;

  writeUsageState(provider, modelId, state);
  dispatchUsageUpdated();
}

export function resetApiUsage(provider: ApiProvider, modelId: string): void {
  if (!modelId) return;
  const current = readUsageState(provider, modelId);
  const next: UsageState = {
    ...current,
    requestsToday: 0,
    tokensUsedCurrentMinute: 0,
    minuteStart: Date.now(),
    rpm: 0,
    rpmWindow: [],
  };
  writeUsageState(provider, modelId, next);
  dispatchUsageUpdated();
}

const percent = (used: number, limit?: number): number => {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
};

const statusFromPercents = (...values: number[]): ApiUsageSnapshot['statusLevel'] => {
  const max = Math.max(...values);
  if (max > 95) return 'danger';
  if (max >= 80) return 'warning';
  return 'safe';
};

export function getApiUsageSnapshot(provider: ApiProvider, modelId: string): Omit<ApiUsageSnapshot, 'reset'> {
  const state = readUsageState(provider, modelId);
  const model = getProviderModel(provider, modelId);
  const rpdPercent = percent(state.requestsToday, model?.rpdLimit);
  const tpmPercent = percent(state.tokensUsedCurrentMinute, model?.tpmLimit);
  const rpmPercent = percent(state.rpm, model?.rpmLimit);

  return {
    provider,
    modelId,
    model,
    ...state,
    rpdPercent,
    tpmPercent,
    rpmPercent,
    statusLevel: statusFromPercents(rpdPercent, tpmPercent, rpmPercent),
  };
}

export function useApiUsage(provider: ApiProvider, modelId: string): ApiUsageSnapshot {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isBrowser()) return undefined;
    const refresh = () => setRefreshTick(tick => tick + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener(USAGE_UPDATED_EVENT, refresh);
    const timer = window.setInterval(refresh, 10_000);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(USAGE_UPDATED_EVENT, refresh);
      window.clearInterval(timer);
    };
  }, []);

  const snapshot = useMemo(() => getApiUsageSnapshot(provider, modelId), [provider, modelId, refreshTick]);
  return {
    ...snapshot,
    reset: () => resetApiUsage(provider, modelId),
  };
}
