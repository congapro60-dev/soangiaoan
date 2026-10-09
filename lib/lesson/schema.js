import { createHash } from 'node:crypto';

/**
 * Sorts object keys recursively while preserving array order.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
}

/**
 * Canonical JSON serialization: recursively sorted object keys,
 * preserved array order, UTF-8 JSON with no whitespace.
 *
 * @param {unknown} obj
 * @returns {string}
 */
export function canonicalize(obj) {
  return JSON.stringify(sortKeys(obj));
}

/**
 * Computes sha256 of canonical package excluding contentHash.
 *
 * @param {Record<string, unknown>} pkg
 * @returns {string}
 */
export function hashPackage(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    throw new TypeError('Package must be a non-null object');
  }
  const clone = { ...pkg };
  delete clone.contentHash;
  const canonicalJson = canonicalize(clone);
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

export const TASK_TYPES = Object.freeze(['closed', 'open', 'reflection']);

export const MANDATORY_FORBIDDEN_SOURCES = Object.freeze([
  'group_product',
  'map_position',
  'race_position',
  'group_score'
]);

export const ALLOWED_INDIVIDUAL_MASTERY_KINDS = Object.freeze([
  'independent_recheck',
  'individual_recheck',
  'exit'
]);

function isStringStringMap(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  for (const k of keys) {
    if (typeof k !== 'string' || typeof obj[k] !== 'string') return false;
  }
  return true;
}

export const CHECKER_REGISTRY = Object.freeze({
  numeric_exact(input, task) {
    try {
      const evalData = task?.evaluation || task;
      const answerKey = evalData?.answerKey;
      if (typeof answerKey !== 'number' || !Number.isFinite(answerKey)) {
        return { ok: false };
      }

      let inputNum;
      if (typeof input === 'number') {
        if (!Number.isFinite(input)) return { ok: false };
        inputNum = input;
      } else if (typeof input === 'string') {
        const trimmed = input.trim().replace(/[−–]/g, '-').replace(/^([+-]?\d+),(\d+)$/, '$1.$2');
        if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
          inputNum = Number(trimmed);
        } else if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(trimmed)) {
          const parts = trimmed.split('/');
          const num = Number(parts[0]);
          const den = Number(parts[1]);
          if (den === 0 || !Number.isFinite(num) || !Number.isFinite(den)) return { ok: false };
          inputNum = num / den;
        } else {
          return { ok: false };
        }
      } else {
        return { ok: false };
      }

      if (!Number.isFinite(inputNum)) return { ok: false };
      return { ok: Math.abs(inputNum - answerKey) <= 1e-9 };
    } catch {
      return { ok: false };
    }
  },

  text_normalized_exact(input, task) {
    try {
      const evalData = task?.evaluation || task;
      const answerKey = evalData?.answerKey;
      if (typeof input !== 'string' || typeof answerKey !== 'string') {
        return { ok: false };
      }
      const normalize = (s) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
      return { ok: normalize(input) === normalize(answerKey) };
    } catch {
      return { ok: false };
    }
  },

  choice_exact(input, task) {
    try {
      const evalData = task?.evaluation || task;
      const answerKey = evalData?.answerKey;
      const options =
        evalData?.options ||
        task?.inputSchema?.options?.map((o) => (typeof o === 'string' ? o : o?.id));
      if (
        !Array.isArray(options) ||
        options.length === 0 ||
        options.some((x) => typeof x !== 'string') ||
        new Set(options).size !== options.length
      ) {
        return { ok: false };
      }
      if (typeof answerKey !== 'string' || !options.includes(answerKey)) {
        return { ok: false };
      }
      if (typeof input !== 'string' || !options.includes(input)) {
        return { ok: false };
      }
      return { ok: input === answerKey };
    } catch {
      return { ok: false };
    }
  },

  multi_choice_exact(input, task) {
    try {
      const evalData = task?.evaluation || task;
      const answerKey = evalData?.answerKey;
      const options =
        evalData?.options ||
        task?.inputSchema?.options?.map((o) => (typeof o === 'string' ? o : o?.id));
      if (
        !Array.isArray(answerKey) ||
        answerKey.length === 0 ||
        answerKey.some((x) => typeof x !== 'string') ||
        new Set(answerKey).size !== answerKey.length
      ) {
        return { ok: false };
      }
      if (Array.isArray(options)) {
        if (options.some((x) => typeof x !== 'string') || answerKey.some((x) => !options.includes(x))) {
          return { ok: false };
        }
      }
      if (
        !Array.isArray(input) ||
        input.some((x) => typeof x !== 'string') ||
        new Set(input).size !== input.length
      ) {
        return { ok: false };
      }
      if (Array.isArray(options) && input.some((x) => !options.includes(x))) {
        return { ok: false };
      }
      if (input.length !== answerKey.length) return { ok: false };
      const inputSet = new Set(input);
      for (const item of answerKey) {
        if (!inputSet.has(item)) return { ok: false };
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },

  representation_match(input, task) {
    try {
      const evalData = task?.evaluation || task;
      const answerKey = evalData?.answerKey;
      if (!isStringStringMap(answerKey) || !isStringStringMap(input)) {
        return { ok: false };
      }
      const inputKeys = Object.keys(input).sort();
      const keyKeys = Object.keys(answerKey).sort();
      if (inputKeys.length !== keyKeys.length) return { ok: false };
      for (let i = 0; i < inputKeys.length; i++) {
        const k = inputKeys[i];
        if (k !== keyKeys[i]) return { ok: false };
        if (input[k] !== answerKey[k]) return { ok: false };
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
});

export function createPackageDraft(overrides = {}) {
  const pkg = {
    schemaVersion: '1.0.0',
    id: 'pkg-draft',
    version: '1.0.0',
    status: 'draft',
    subject: 'math',
    grade: 11,
    curriculumRefs: [],
    sourceRefs: [],
    essentialQuestion: '',
    prerequisites: [],
    objectives: [],
    budget: {
      slotMinutes: 40,
      coreMinutes: 0,
      reserveMinutes: 0,
      transitionMinutes: 0,
      optionalMinutes: 0
    },
    activities: [],
    tasks: [],
    hints: [],
    evidenceRules: [],
    rubric: {
      criteria: [],
      lookFor: []
    },
    modePolicies: {},
    masteryPolicy: {
      individualEvidencePerObjectiveMin: 2,
      masterySources: ['individual_recheck', 'exit'],
      forbiddenSources: [...MANDATORY_FORBIDDEN_SOURCES]
    },
    ...overrides
  };

  if (!pkg.contentHash) {
    pkg.contentHash = hashPackage(pkg);
  }
  return pkg;
}
