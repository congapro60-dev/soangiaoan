import type { User } from 'firebase/auth';

export type LinkChannel = 'telegram' | 'zalo_oa';

export interface LinkSummary {
  linkId: string;
  channel: LinkChannel;
  channelAccountId: string;
  channelUserId: string;
  createdAt: number;
}

const request = async <T>(headers: Record<string, string>, action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Assistant link request failed');
  return body as T;
};

export const unwrapGatewayResult = <T>(body: T & { result?: unknown }): T =>
  body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'result')
    ? body.result as T
    : body;

const call = async <T>(user: User, action: string, payload: Record<string, unknown> = {}) =>
  unwrapGatewayResult<T>(await request<T & { result?: unknown }>({ Authorization: `Bearer ${await user.getIdToken()}` }, action, payload));

export const createTelegramLinkCode = (user: User) => call<{ code: string; expiresAt: number; linkId: string }>(user, 'createLinkCode');

export const revokeTelegramLink = (user: User, linkId: string) =>
  call<{ ok: true }>(user, 'revokeLink', { linkId });

export const cancelTelegramLinkCode = (user: User, linkId: string) =>
  call<{ ok: true }>(user, 'cancelLinkCode', { linkId });

export const listChannelLinks = (user: User) =>
  call<{ links: LinkSummary[] }>(user, 'listChannelLinks');

export const consumeChannelLink = (code: string, identity: {
  channel: LinkChannel;
  channelAccountId: string;
  channelUserId: string;
  channelChatId?: string;
}) => request<{ linked: true } & { result?: unknown }>({}, 'consumeLinkCode', { code, ...identity }).then(unwrapGatewayResult);
