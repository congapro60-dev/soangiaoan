export type ExternalToolStatus = 'pending' | 'active' | 'disabled';
export type ExternalToolSandboxPreset = 'strict' | 'geogebra' | 'trustedExternal';
export type ExternalToolHeightPreset = 'compact' | 'standard' | 'large';

export interface ExternalToolCatalogItem {
  toolId: string;
  title: string;
  description: string;
  url: string;
  sourceDomain: string;
  tags: string[];
  heightPreset: ExternalToolHeightPreset;
  sandboxPreset: ExternalToolSandboxPreset;
  status: ExternalToolStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExternalToolRagMatch {
  toolId: string;
  score: number;
  reasons: string[];
  tool: ExternalToolCatalogItem;
}

export interface ExternalToolRetrievalInput {
  lessonTitle?: string;
  unitTitle?: string;
  sourceHint?: string;
  objectiveTitles?: string[];
  subject?: string;
  grade?: string;
  topK?: number;
}

const VIETNAMESE_MARKS_REGEX = /[\u0300-\u036f]/g;
const WORD_REGEX = /[a-z0-9]+/g;
const STOP_WORDS = new Set<string>([
  'va', 'voi', 'cho', 'cac', 'mot', 'nhung', 'trong', 'ngoai', 'khi', 'thi',
  'hoc', 'sinh', 'bai', 'tiet', 'phan', 'noi', 'dung', 'muc', 'tieu', 'kien', 'thuc',
  'the', 'duoc', 'tu', 've', 'la', 'cua', 'de', 'den', 'hay', 'can', 'qua', 'tai',
]);

const normalizeText = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(VIETNAMESE_MARKS_REGEX, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase();

const tokenize = (value: unknown): Set<string> => {
  const tokens: string[] = normalizeText(value).match(WORD_REGEX) ?? [];
  return new Set(tokens.filter(token => token.length >= 2 && !STOP_WORDS.has(token)));
};

const overlap = (left: Set<string>, right: Set<string>) => {
  let count = 0;
  left.forEach(token => {
    if (right.has(token)) count += 1;
  });
  return count;
};

const tokenizeArray = (values: string[]) => tokenize(values.join(' '));
const clampTopK = (topK: number | undefined) => Math.max(0, Math.min(Math.floor(topK || 3), 10));

export function buildExternalToolQueryText(input: ExternalToolRetrievalInput): string {
  return [
    input.lessonTitle,
    input.unitTitle,
    input.sourceHint,
    input.subject,
    input.grade,
    ...(input.objectiveTitles || []),
  ].filter(Boolean).join(' ');
}

export function scoreExternalTool(input: ExternalToolRetrievalInput, tool: ExternalToolCatalogItem): ExternalToolRagMatch {
  const queryText = buildExternalToolQueryText(input);
  const queryTokens = tokenize(queryText);
  const titleTokens = tokenize(tool.title);
  const descriptionTokens = tokenize(tool.description);
  const tagTokens = tokenizeArray(tool.tags || []);
  const domainTokens = tokenize(tool.sourceDomain);

  const reasons: string[] = [];
  const tagOverlap = overlap(queryTokens, tagTokens);
  const titleOverlap = overlap(queryTokens, titleTokens);
  const descriptionOverlap = overlap(queryTokens, descriptionTokens);
  const domainOverlap = overlap(queryTokens, domainTokens);

  let score = 0;
  if (tagOverlap) {
    score += tagOverlap * 4;
    reasons.push(`tags:${tagOverlap}`);
  }
  if (titleOverlap) {
    score += titleOverlap * 3;
    reasons.push(`title:${titleOverlap}`);
  }
  if (descriptionOverlap) {
    score += descriptionOverlap * 2;
    reasons.push(`description:${descriptionOverlap}`);
  }
  if (domainOverlap) {
    score += domainOverlap;
    reasons.push(`domain:${domainOverlap}`);
  }

  return { toolId: tool.toolId, score, reasons, tool };
}

export function retrieveTopExternalTools(input: ExternalToolRetrievalInput, tools: ExternalToolCatalogItem[]): ExternalToolRagMatch[] {
  const topK = clampTopK(input.topK);
  if (topK === 0) return [];

  return tools
    .filter(tool => tool.status === 'active')
    .map(tool => scoreExternalTool(input, tool))
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title, 'vi'))
    .slice(0, topK);
}

/**
 * Strict allow-list gate for AI output. Any id not returned by the RAG step is
 * discarded so a model cannot hallucinate or inject arbitrary Firestore ids.
 */
export function validateExternalToolIdsFromAi(outputIds: unknown, allowedTools: Array<Pick<ExternalToolCatalogItem, 'toolId'>>): string[] {
  if (!Array.isArray(outputIds)) return [];
  const allowed = new Set(allowedTools.map(tool => tool.toolId));
  const selected = new Set<string>();

  outputIds.forEach(id => {
    if (typeof id !== 'string') return;
    const normalized = id.trim();
    if (allowed.has(normalized)) selected.add(normalized);
  });

  return [...selected];
}
