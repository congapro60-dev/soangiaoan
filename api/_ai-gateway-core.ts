import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions';
import {
  VERCEL_AI_GATEWAY_BASE_URL,
  VERCEL_AI_GATEWAY_MAX_OUTPUT_TOKENS,
  VERCEL_AI_GATEWAY_MAX_PROMPT_LENGTH,
  VERCEL_AI_GATEWAY_MODEL,
} from '../src/lib/vercelGatewayConfig.js';

export const AI_GATEWAY_BASE_URL = VERCEL_AI_GATEWAY_BASE_URL;
export const AI_GATEWAY_MODEL = VERCEL_AI_GATEWAY_MODEL;
export const AI_GATEWAY_MAX_OUTPUT_TOKENS = VERCEL_AI_GATEWAY_MAX_OUTPUT_TOKENS;
export const AI_GATEWAY_MAX_PROMPT_LENGTH = VERCEL_AI_GATEWAY_MAX_PROMPT_LENGTH;

export const getBearerToken = (authorizationHeader: string | string[] | undefined): string | null => {
  const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

export const normalizeGatewayPrompt = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const prompt = value.trim();
  if (!prompt || prompt.length > AI_GATEWAY_MAX_PROMPT_LENGTH) return null;
  return prompt;
};

export const resolveGatewayApiKey = (env: NodeJS.ProcessEnv = process.env): string | null => {
  const key = env.AI_GATEWAY_API_KEY?.trim();
  return key || null;
};

export function buildGatewayChatRequest(prompt: string, stream: false): ChatCompletionCreateParamsNonStreaming;
export function buildGatewayChatRequest(prompt: string, stream: true): ChatCompletionCreateParamsStreaming;
export function buildGatewayChatRequest(
  prompt: string,
  stream: boolean,
): ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming {
  return {
    model: AI_GATEWAY_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: AI_GATEWAY_MAX_OUTPUT_TOKENS,
    stream,
  } as ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;
}
