import { useEffect, useMemo, useState } from 'react';
import { getApiModelLimit, type ApiModelLimit, type ApiProvider } from '../config/apiLimits';

export interface TokenUsagePayload {
  provider: ApiProvider;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestCount?: number;
}

export interface TokenUsageSnapshot {
  provider: ApiProvider;
  model: string;
  dateKey: string;
  requestsToday: number;
  tokensToday: number;
  tokensLastMinute: number;
  requestsLastMinute: number;
  limit?: ApiModelLimit;
  isMinuteLimited: boolean;
  isTokenMinuteLimited: boolean;
}

interface MinuteTokenEntry {
  timestamp: number;
  tokens: number;
}

interface StoredTokenUsage {
  requests: number;
  tokens: number;
  minuteTimestamps: number[];
  minuteTokenEntries: MinuteTokenEntry[];
  updatedAt: number;
}

const STORAGE_PREFIX = 'api_usage';
const ONE_MINUTE_MS = 60_000;
const USAGE_UPDATED_EVENT = 'api-usage-updated';

const todayKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
};

const makeStorageKey = (provider: ApiProvider, model: string, dateKey = todayKey()): string => (
  `${STORAGE_PREFIX}_${provider}_${model}_${dateKey}`
);

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const emptyStoredUsage = (): StoredTokenUsage => ({
  requests: 0,
  tokens: 0,
  minuteTimestamps: [],
  minuteTokenEntries: [],
  updatedAt: Date.now(),
});

const readStoredUsage = (provider: ApiProvider, model: string, dateKey = todayKey()): StoredTokenUsage => {
  if (!isBrowser()) return emptyStoredUsage();

  try {
    const raw = window.localStorage.getItem(makeStorageKey(provider, model, dateKey));
    if (!raw) return emptyStoredUsage();
    const parsed = JSON.parse(raw) as Partial<StoredTokenUsage>;
    const now = Date.now();
    return {
      requests: Number(parsed.requests) || 0,
      tokens: Number(parsed.tokens) || 0,
      minuteTimestamps: Array.isArray(parsed.minuteTimestamps)
        ? parsed.minuteTimestamps.filter(timestamp => typeof timestamp === 'number' && now - timestamp < ONE_MINUTE_MS)
        : [],
      minuteTokenEntries: Array.isArray(parsed.minuteTokenEntries)
        ? parsed.minuteTokenEntries.filter(entry => (
          entry &&
          typeof entry.timestamp === 'number' &&
          typeof entry.tokens === 'number' &&
          now - entry.timestamp < ONE_MINUTE_MS
        ))
        : [],
      updatedAt: Number(parsed.updatedAt) || now,
    };
  } catch {
    return emptyStoredUsage();
  }
};

const writeStoredUsage = (provider: ApiProvider, model: string, usage: StoredTokenUsage, dateKey = todayKey()) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(makeStorageKey(provider, model, dateKey), JSON.stringify(usage));
};

const dispatchUsageUpdated = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT));
};

export const estimateTokenCount = (text: string): number => Math.max(1, Math.ceil(text.length / 4));

export const recordTokenUsage = ({
  provider,
  model,
  promptTokens = 0,
  completionTokens = 0,
  totalTokens,
  requestCount = 1,
}: TokenUsagePayload): void => {
  if (!model || requestCount <= 0) return;

  const dateKey = todayKey();
  const now = Date.now();
  const stored = readStoredUsage(provider, model, dateKey);
  const tokens = Math.max(0, Math.round(totalTokens ?? promptTokens + completionTokens));
  const nextUsage: StoredTokenUsage = {
    requests: stored.requests + requestCount,
    tokens: stored.tokens + tokens,
    minuteTimestamps: [
      ...stored.minuteTimestamps.filter(timestamp => now - timestamp < ONE_MINUTE_MS),
      ...Array.from({ length: requestCount }, () => now),
    ],
    minuteTokenEntries: [
      ...stored.minuteTokenEntries.filter(entry => now - entry.timestamp < ONE_MINUTE_MS),
      { timestamp: now, tokens },
    ],
    updatedAt: now,
  };

  writeStoredUsage(provider, model, nextUsage, dateKey);
  dispatchUsageUpdated();
};

export const getTokenUsageSnapshot = (provider: ApiProvider, model: string): TokenUsageSnapshot => {
  const dateKey = todayKey();
  const stored = readStoredUsage(provider, model, dateKey);
  const limit = getApiModelLimit(provider, model);
  const requestsLastMinute = stored.minuteTimestamps.length;
  const tokensLastMinute = stored.minuteTokenEntries.reduce((sum, entry) => sum + entry.tokens, 0);

  return {
    provider,
    model,
    dateKey,
    requestsToday: stored.requests,
    tokensToday: stored.tokens,
    tokensLastMinute,
    requestsLastMinute,
    limit,
    isMinuteLimited: Boolean(limit && requestsLastMinute >= limit.rpm),
    isTokenMinuteLimited: Boolean(limit && tokensLastMinute >= limit.tpm),
  };
};

export const resetTokenUsage = (provider?: ApiProvider): void => {
  if (!isBrowser()) return;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(`${STORAGE_PREFIX}_`)) continue;
    if (!provider || key.startsWith(`${STORAGE_PREFIX}_${provider}_`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => window.localStorage.removeItem(key));
  dispatchUsageUpdated();
};

export const useTokenTracker = (provider: ApiProvider, model: string) => {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isBrowser()) return undefined;
    const handleStorage = () => setRefreshTick(tick => tick + 1);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(USAGE_UPDATED_EVENT, handleStorage);
    const timer = window.setInterval(handleStorage, 15_000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(USAGE_UPDATED_EVENT, handleStorage);
      window.clearInterval(timer);
    };
  }, []);

  const snapshot = useMemo(() => getTokenUsageSnapshot(provider, model), [provider, model, refreshTick]);

  return {
    ...snapshot,
    reset: () => resetTokenUsage(provider),
  };
};
