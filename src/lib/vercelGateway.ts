import { auth } from './firebase';
import {
  VERCEL_AI_GATEWAY_MODEL,
} from './vercelGatewayConfig';

export const SERVER_MANAGED_API_KEY = 'server-managed-ai-gateway';

export interface VercelGatewayTextResult {
  text: string;
  model: string;
  truncated: boolean;
}

interface GatewaySsePayload {
  text?: string;
  done?: boolean;
  error?: string;
}

export const parseGatewaySseEvent = (value: string): GatewaySsePayload | null => {
  const data = value.trim();
  if (data === '[DONE]') return { done: true };

  try {
    const parsed = JSON.parse(data) as GatewaySsePayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Bạn cần đăng nhập để dùng GLM 5.2.');

  const idToken = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
};

const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof payload?.error === 'string' ? payload.error : 'Gọi GLM 5.2 thất bại. Vui lòng thử lại.';
};

export const callVercelGateway = async (prompt: string): Promise<VercelGatewayTextResult> => {
  const response = await fetch('/api/ai-gateway', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ prompt, stream: false }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));

  const payload = await response.json() as Partial<VercelGatewayTextResult>;
  if (typeof payload.text !== 'string') throw new Error('GLM 5.2 không trả về nội dung.');

  return {
    text: payload.text,
    model: payload.model || VERCEL_AI_GATEWAY_MODEL,
    truncated: payload.truncated === true,
  };
};

export const streamVercelGateway = async (
  prompt: string,
  onChunk: (chunk: string) => void,
): Promise<void> => {
  const response = await fetch('/api/ai-gateway', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ prompt, stream: true }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));
  if (!response.body) throw new Error('GLM 5.2 không mở được luồng trả lời.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consumeEvents = (flush = false) => {
    const events: string[] = [];
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      events.push(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
    if (flush && buffer.trim()) {
      events.push(buffer);
      buffer = '';
    }

    for (const event of events) {
      const dataLine = event.split(/\r?\n/).find(line => line.startsWith('data:'));
      if (!dataLine) continue;
      const payload = parseGatewaySseEvent(dataLine.slice('data:'.length));
      if (payload?.error) throw new Error(payload.error);
      if (payload?.text) onChunk(payload.text);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      consumeEvents(done);
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
};
