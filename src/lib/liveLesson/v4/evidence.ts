import type {
  EvidenceBand,
  EvidenceDimension,
  EvidencePoint,
  EvidenceRule,
  EvidenceVector,
} from './types';
import type { LiveResponse } from '../types';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 phút — quá nửa tiết thì chỉ là tín hiệu yếu
const DEFAULT_CONFIDENCE = 0.4;

interface EvidencePointInput {
  sourceStepId: string;
  observedAt: number;
  signal: string;
  confidence: number;
  privateReason: string;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isStale(observedAt: number, now: number): boolean {
  return now - observedAt > STALE_THRESHOLD_MS;
}

function evidenceConfidence(base: number, observedAt: number, now: number): number {
  const clamped = clampConfidence(base);
  return isStale(observedAt, now) ? Math.min(clamped, 0.3) : clamped;
}

function signalFromResponse(response: LiveResponse): EvidencePointInput | null {
  const { stepId, responseType, value, submittedAt } = response;

  switch (responseType) {
    case 'choice': {
      const correct = String(value).trim().toUpperCase() === 'C';
      return {
        sourceStepId: stepId,
        observedAt: submittedAt,
        signal: correct ? 'correct_choice' : 'incorrect_choice',
        confidence: correct ? 0.6 : 0.45,
        privateReason: `Chọn ${String(value)} — ${correct ? 'đúng' : 'sai'}.`,
      };
    }
    case 'boolean': {
      const affirmative = value === true || String(value).toLowerCase() === 'true';
      return {
        sourceStepId: stepId,
        observedAt: submittedAt,
        signal: 'boolean_affirmative',
        confidence: 0.5,
        privateReason: `Trả lời ${affirmative ? 'đúng/có' : 'sai/không'}.`,
      };
    }
    case 'route': {
      const route = String(value).trim().toUpperCase();
      return {
        sourceStepId: stepId,
        observedAt: submittedAt,
        signal: `route_${route}`,
        confidence: 0.35,
        privateReason: `HS chọn tuyến ${route}.`,
      };
    }
    case 'hint': {
      return {
        sourceStepId: stepId,
        observedAt: submittedAt,
        signal: 'hint_used',
        confidence: 0.3,
        privateReason: 'HS đã dùng gợi ý — cần hỗ trợ thêm.',
      };
    }
    case 'text': {
      const text = String(value).trim();
      if (text.length === 0) return null;
      return {
        sourceStepId: stepId,
        observedAt: submittedAt,
        signal: 'text_response',
        confidence: 0.5,
        privateReason: `Phản hồi văn bản (${text.length} ký tự).`,
      };
    }
    default:
      return null;
  }
}

function inferDimension(signal: string): EvidenceDimension {
  if (signal === 'correct_choice' || signal === 'incorrect_choice') return 'concept';
  if (signal === 'boolean_affirmative') return 'concept';
  if (signal.startsWith('route_')) return 'autonomyCollaboration';
  if (signal === 'hint_used') return 'autonomyCollaboration';
  if (signal === 'text_response') return 'reasoning';
  return 'concept';
}

function bandFromPoints(points: EvidencePoint[]): EvidenceBand {
  if (points.length === 0) return 'not_observed';
  const avg = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
  if (avg >= 0.85) return 'transfer';
  if (avg >= 0.65) return 'secure';
  if (avg >= 0.35) return 'emerging';
  return 'not_observed';
}

export interface EvidenceAdapterInput {
  responses: LiveResponse[];
  evidenceRules: EvidenceRule[];
  now: number;
}

export interface StudentEvidence {
  participantUid: string;
  vector: EvidenceVector;
}

export function deduplicateResponses(responses: LiveResponse[]): LiveResponse[] {
  const byNonce = new Map<string, LiveResponse>();
  const seen = new Map<string, LiveResponse>();

  for (const response of responses) {
    const nonceKey = `${response.participantUid}::${response.clientNonce}`;
    const existing = byNonce.get(nonceKey);
    if (existing) {
      if (response.updatedAt > existing.updatedAt
        || (response.updatedAt === existing.updatedAt && response.id > existing.id)) {
        byNonce.set(nonceKey, response);
      }
      continue;
    }
    byNonce.set(nonceKey, response);
  }

  // Thêm response không trùng nonce, giữ cái mới nhất nếu trùng participantUid+stepId
  for (const response of byNonce.values()) {
    const key = `${response.participantUid}::${response.stepId}`;
    const existing = seen.get(key);
    if (!existing || response.updatedAt > existing.updatedAt) {
      seen.set(key, response);
    }
  }

  return Array.from(seen.values());
}

export function buildEvidenceVectors(input: EvidenceAdapterInput): StudentEvidence[] {
  const { evidenceRules, now } = input;
  const deduplicated = deduplicateResponses(input.responses);

  const byStudent = new Map<string, LiveResponse[]>();
  for (const response of deduplicated) {
    const list = byStudent.get(response.participantUid) ?? [];
    list.push(response);
    byStudent.set(response.participantUid, list);
  }

  const ruleMap = new Map<string, EvidenceRule>();
  for (const rule of evidenceRules) {
    ruleMap.set(rule.sourceStepId, rule);
  }

  const results: StudentEvidence[] = [];
  for (const [participantUid, responses] of byStudent) {
    const allPoints: EvidencePoint[] = [];
    const dimensionPoints = new Map<EvidenceDimension, EvidencePoint[]>();

    for (const response of responses) {
      const pointInput = signalFromResponse(response);
      if (!pointInput) continue;

      const rule = ruleMap.get(pointInput.sourceStepId);
      const minConfidence = rule?.minConfidence ?? DEFAULT_CONFIDENCE;

      const point: EvidencePoint = {
        sourceStepId: pointInput.sourceStepId,
        observedAt: pointInput.observedAt,
        signal: pointInput.signal,
        confidence: evidenceConfidence(
          Math.max(pointInput.confidence, minConfidence),
          pointInput.observedAt,
          now,
        ),
        privateReason: pointInput.privateReason,
      };

      allPoints.push(point);
      const dim = rule?.dimension ?? inferDimension(pointInput.signal);
      const dimList = dimensionPoints.get(dim) ?? [];
      dimList.push(point);
      dimensionPoints.set(dim, dimList);
    }

    allPoints.sort((a, b) => b.observedAt - a.observedAt);

    const freshestAt = allPoints.length > 0
      ? Math.max(...allPoints.map(p => p.observedAt))
      : now;

    const vector: EvidenceVector = {
      concept: bandFromPoints(dimensionPoints.get('concept') ?? []),
      procedure: bandFromPoints(dimensionPoints.get('procedure') ?? []),
      reasoning: bandFromPoints(dimensionPoints.get('reasoning') ?? []),
      modeling: bandFromPoints(dimensionPoints.get('modeling') ?? []),
      languageAccess: bandFromPoints(dimensionPoints.get('languageAccess') ?? []),
      autonomyCollaboration: bandFromPoints(dimensionPoints.get('autonomyCollaboration') ?? []),
      points: allPoints,
      confidence: allPoints.length > 0
        ? clampConfidence(allPoints.reduce((sum, p) => sum + p.confidence, 0) / allPoints.length)
        : 0,
      freshestAt,
    };

    results.push({ participantUid, vector });
  }

  return results;
}
