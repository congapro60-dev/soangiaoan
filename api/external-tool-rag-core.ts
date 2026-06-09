import type { DocumentData, Firestore } from 'firebase-admin/firestore';

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

export interface ExternalToolRagMatch {
  toolId: string;
  score: number;
  reasons: string[];
  tool: ExternalToolCatalogItem;
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

const clampTopK = (topK: number | undefined) => Math.max(0, Math.min(Math.floor(topK || 3), 10));
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const isHeightPreset = (value: unknown): value is ExternalToolHeightPreset => value === 'compact' || value === 'standard' || value === 'large';
const isSandboxPreset = (value: unknown): value is ExternalToolSandboxPreset => value === 'strict' || value === 'geogebra' || value === 'trustedExternal';

const toCatalogItem = (id: string, data: DocumentData): ExternalToolCatalogItem | null => {
  if (data.status !== 'active') return null;
  if (typeof data.toolId !== 'string' || data.toolId !== id) return null;
  if (typeof data.title !== 'string' || typeof data.description !== 'string' || typeof data.url !== 'string') return null;
  if (typeof data.sourceDomain !== 'string') return null;
  if (!isHeightPreset(data.heightPreset) || !isSandboxPreset(data.sandboxPreset)) return null;

  return {
    toolId: data.toolId,
    title: data.title,
    description: data.description,
    url: data.url,
    sourceDomain: data.sourceDomain,
    tags: asStringArray(data.tags),
    heightPreset: data.heightPreset,
    sandboxPreset: data.sandboxPreset,
    status: 'active',
  };
};

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
  const queryTokens = tokenize(buildExternalToolQueryText(input));
  const titleOverlap = overlap(queryTokens, tokenize(tool.title));
  const descriptionOverlap = overlap(queryTokens, tokenize(tool.description));
  const tagOverlap = overlap(queryTokens, tokenize(tool.tags.join(' ')));
  const domainOverlap = overlap(queryTokens, tokenize(tool.sourceDomain));

  const reasons: string[] = [];
  let score = 0;
  if (tagOverlap) { score += tagOverlap * 4; reasons.push(`tags:${tagOverlap}`); }
  if (titleOverlap) { score += titleOverlap * 3; reasons.push(`title:${titleOverlap}`); }
  if (descriptionOverlap) { score += descriptionOverlap * 2; reasons.push(`description:${descriptionOverlap}`); }
  if (domainOverlap) { score += domainOverlap; reasons.push(`domain:${domainOverlap}`); }

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

export async function queryTopKExternalTools(db: Firestore, input: ExternalToolRetrievalInput): Promise<ExternalToolRagMatch[]> {
  const snapshot = await db.collection('externalTools')
    .where('status', '==', 'active')
    .limit(50)
    .get();

  const tools = snapshot.docs
    .map(doc => toCatalogItem(doc.id, doc.data()))
    .filter((tool): tool is ExternalToolCatalogItem => Boolean(tool));

  return retrieveTopExternalTools(input, tools);
}

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
