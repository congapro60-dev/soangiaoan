import katex from 'katex';
import { sourceNumericDrift } from './pedagogy.js';
import {
  hashPackage,
  CHECKER_REGISTRY,
  TASK_TYPES,
  MANDATORY_FORBIDDEN_SOURCES,
  ALLOWED_INDIVIDUAL_MASTERY_KINDS
} from './schema.js';

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const FORBIDDEN_CODE_REGEX = /\b(function|eval|Function|setTimeout|setInterval|import|process|child_process)\b|=>/;

const ALLOWED_PACKAGE_KEYS = new Set([
  'schemaVersion',
  'id',
  'version',
  'status',
  'contentHash',
  'subject',
  'grade',
  'curriculumRefs',
  'sourceRefs',
  'essentialQuestion',
  'prerequisites',
  'objectives',
  'budget',
  'activities',
  'tasks',
  'hints',
  'evidenceRules',
  'rubric',
  'modePolicies',
  'masteryPolicy'
]);

const ALLOWED_STATUSES = new Set(['draft', 'needs_review', 'approved', 'published']);
const ALLOWED_SOURCE_KINDS = new Set(['repo', 'external']);
const ALLOWED_SOURCE_VERIFICATIONS = new Set(['verified', 'teacher_review_required']);

const ALLOWED_SOURCE_KEYS = new Set(['id', 'kind', 'locator', 'label', 'verification', 'hash']);
const ALLOWED_OBJECTIVE_KEYS = new Set([
  'id',
  'code',
  'level',
  'statement',
  'prerequisiteIds',
  'metadata',
  'requiresFiniteInfiniteDistinction',
  'requiresRepresentations'
]);
const ALLOWED_OBJECTIVE_LEVELS = new Set(['must', 'should', 'could']);

const ALLOWED_ACTIVITY_KEYS = new Set([
  'id',
  'phase',
  'budgetRole',
  'minutes',
  'objectiveIds',
  'taskIds',
  'participation',
  'studentAction',
  'expectedProduct',
  'evidenceIds',
  'teacherLookFor',
  'supportIds',
  'transition'
]);
const ALLOWED_ACTIVITY_PHASES = new Set([
  'experience',
  'formation',
  'guided',
  'practice',
  'recheck',
  'exit',
  'reflection'
]);
const ALLOWED_BUDGET_ROLES = new Set(['core', 'reserve', 'optional']);
const ALLOWED_PARTICIPATION = new Set(['whole_class', 'individual', 'pair', 'group']);

const ALLOWED_TASK_KEYS = new Set([
  'id',
  'type',
  'objectiveIds',
  'activityId',
  'participation',
  'prompt',
  'sourceRefs',
  'evidenceIds',
  'evaluation',
  'inputSchema',
  'isCore',
  'requiresFullScaffold',
  'supportRationale',
  'minutes',
  'hintIds',
  'branch',
  'sequenceType',
  'sequenceTypes',
  'representation',
  'representations',
  'domain',
  'metadata',
  'expectedProduct',
  'imageUrl',
  'diagramUrl',
  'image'
]);
const ALLOWED_TASK_BRANCHES = new Set(['shared', 'support', 'core', 'extension']);

const ALLOWED_CHOICE_INPUT_SCHEMA_KEYS = new Set(['options']);
const ALLOWED_OPTION_ITEM_KEYS = new Set(['id', 'label']);

const ALLOWED_REP_INPUT_SCHEMA_KEYS = new Set(['representations', 'cards']);
const ALLOWED_REP_ITEM_KEYS = new Set(['id', 'label']);
const ALLOWED_CARD_ITEM_KEYS = new Set(['id', 'label']);

const ALLOWED_GENERIC_INPUT_SCHEMA_KEYS = new Set([
  'placeholder',
  'unit',
  'format',
  'maxLength',
  'minLength',
  'min',
  'max',
  'step',
  'prefix',
  'suffix'
]);
const ALLOWED_TRUE_FALSE_4_INPUT_SCHEMA_KEYS = new Set(['type', 'statements']);
const ALLOWED_SHORT_ANSWER_4_INPUT_SCHEMA_KEYS = new Set(['type', 'cells', 'format']);
const SHORT_ANSWER_4_FORMATS = new Set(['digits', 'signed_digits', 'alphanumeric', 'decimal_4']);

const ALLOWED_HINT_KEYS = new Set([
  'id',
  'tier',
  'text',
  'taskId',
  'objectiveIds',
  'order',
  'notAnswer',
  'penalty',
  'supportRationale',
  'diagramUrl',
  'image'
]);
const ALLOWED_HINT_TIERS = new Set(['H1', 'H2', 'H3', 'H4']);

const ALLOWED_EVIDENCE_KEYS = new Set([
  'id',
  'kind',
  'objectiveIds',
  'individual',
  'countsForMastery',
  'taskId'
]);
const ALLOWED_EVIDENCE_KINDS = new Set([
  'precheck',
  'initialThinking',
  'group_product',
  'individual_reasoning',
  'individual_recheck',
  'independent_recheck',
  'exit',
  'self_assessment',
  'teacher_observation',
  'practice'
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

function validFourLabeledItems(items) {
  if (!Array.isArray(items) || items.length !== 4) return false;
  if (items.some(item => !item || typeof item !== 'object' || Array.isArray(item) ||
    Object.keys(item).some(key => !['id', 'label'].includes(key)) ||
    typeof item.id !== 'string' || item.id.length === 0 ||
    ['__proto__', 'prototype', 'constructor'].includes(item.id) ||
    typeof item.label !== 'string' || !item.label.trim())) return false;
  return new Set(items.map(item => item.id)).size === 4;
}

function validShortAnswerVector(value, format) {
  if (!Array.isArray(value) || value.length !== 4 || value.some(cell => typeof cell !== 'string')) return false;
  const cells = value.map(cell => cell.normalize('NFC').trim());
  if (cells.some(cell => Array.from(cell).length !== 1)) return false;
  if (format === 'digits') return cells.every(cell => /^\d$/.test(cell));
  if (format === 'signed_digits') return /^[+-\d]$/.test(cells[0]) && cells.slice(1).every(cell => /^\d$/.test(cell));
  if (format === 'alphanumeric') return cells.every(cell => /^[\p{L}\p{N}]$/u.test(cell));
  if (format === 'decimal_4') {
    const normalized = cells.map(cell => cell.replace('.', ','));
    if (!/^[-\d]$/.test(normalized[0]) || normalized.slice(1).some(cell => !/^[\d,]$/.test(cell))) return false;
    if (normalized.filter(cell => cell === ',').length > 1) return false;
    const commaAt = normalized.indexOf(',');
    if (commaAt > 0 && !/^\d$/.test(normalized[commaAt - 1])) return false;
    return true;
  }
  return false;
}

/**
 * Scans a string for KaTeX delimiters ($...$, $$...$$, \(...\), \[...\])
 * and validates unmatched delimiters as well as LaTeX syntax.
 *
 * @param {unknown} text
 * @param {string} path
 * @param {Array<{code: string, path: string, message: string}>} errors
 */
function scanKaTeX(text, path, errors) {
  if (typeof text !== 'string') return;

  // 1. Unmatched delimiter checks
  const doubleDollarMatches = text.match(/\$\$/g) || [];
  if (doubleDollarMatches.length % 2 !== 0) {
    errors.push({
      code: 'ERR_KATEX_SYNTAX',
      path,
      message: `Unclosed display math delimiter $$ in: "${text}"`
    });
    return;
  }

  const textWithoutDouble = text.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\$\$/g, '');
  const singleDollarMatches = textWithoutDouble.match(/\$/g) || [];
  if (singleDollarMatches.length % 2 !== 0) {
    errors.push({
      code: 'ERR_KATEX_SYNTAX',
      path,
      message: `Unclosed inline math delimiter $ in: "${text}"`
    });
    return;
  }

  const openParenMatches = text.match(/\\\(/g) || [];
  const closeParenMatches = text.match(/\\\)/g) || [];
  if (openParenMatches.length !== closeParenMatches.length) {
    errors.push({
      code: 'ERR_KATEX_SYNTAX',
      path,
      message: `Unmatched inline math delimiter \\( or \\) in: "${text}"`
    });
    return;
  }

  const openBracketMatches = text.match(/\\\[/g) || [];
  const closeBracketMatches = text.match(/\\\]/g) || [];
  if (openBracketMatches.length !== closeBracketMatches.length) {
    errors.push({
      code: 'ERR_KATEX_SYNTAX',
      path,
      message: `Unmatched display math delimiter \\[ or \\] in: "${text}"`
    });
    return;
  }

  // 2. Render-based syntax check
  const regex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\$([^\$\n]+)\$|\\\(([\s\S]*?)\\\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const math = match[1] || match[2] || match[3] || match[4];
    try {
      katex.renderToString(math, { throwOnError: true, strict: 'ignore' });
    } catch (err) {
      errors.push({
        code: 'ERR_KATEX_SYNTAX',
        path,
        message: `KaTeX syntax error: ${err.message}`
      });
    }
  }
}

/**
 * Detects cycles in objective prerequisite dependencies.
 *
 * @param {Array<{id: string, prerequisiteIds?: string[]}>} objectives
 * @param {Array<{code: string, path: string, message: string}>} errors
 */
function checkAcyclicObjectives(objectives, errors) {
  const adj = new Map();
  for (const obj of objectives) {
    adj.set(obj.id, Array.isArray(obj.prerequisiteIds) ? obj.prerequisiteIds : []);
  }

  const visited = new Set();
  const recStack = new Set();

  function dfs(nodeId, path) {
    visited.add(nodeId);
    recStack.add(nodeId);
    const prereqs = adj.get(nodeId) || [];
    for (const neighbor of prereqs) {
      if (!adj.has(neighbor)) continue;
      if (recStack.has(neighbor)) {
        errors.push({
          code: 'ERR_DANGLING_REFERENCE',
          path: `objectives.${nodeId}.prerequisiteIds`,
          message: `Cycle detected in objective prerequisites involving ${nodeId}`
        });
        return;
      }
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      }
    }
    recStack.delete(nodeId);
  }

  for (const obj of objectives) {
    if (!visited.has(obj.id)) {
      dfs(obj.id, [obj.id]);
    }
  }
}

/**
 * Validates a LessonPackage object.
 *
 * @param {unknown} pkg
 * @param {{ mode?: 'draft' | 'publish' }} [options]
 * @returns {{ ok: boolean, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validateLessonPackage(pkg, { mode = 'draft' } = {}) {
  const errors = [];

  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return {
      ok: false,
      errors: [
        {
          code: 'ERR_PACKAGE_MUTABLE',
          path: '',
          message: 'Package must be a non-null object'
        }
      ]
    };
  }

  // 1. Top-Level Field Allowlist and Status Check
  for (const key of Object.keys(pkg)) {
    if (!ALLOWED_PACKAGE_KEYS.has(key)) {
      errors.push({
        code: 'ERR_PACKAGE_MUTABLE',
        path: key,
        message: `Unknown package property: '${key}'`
      });
    }
  }

  if (typeof pkg.status !== 'string' || !ALLOWED_STATUSES.has(pkg.status)) {
    errors.push({
      code: 'ERR_PACKAGE_MUTABLE',
      path: 'status',
      message: `Invalid package status: '${pkg.status}'`
    });
  }

  if (pkg.schemaVersion !== '1.0.0') {
    errors.push({
      code: 'ERR_PACKAGE_MUTABLE',
      path: 'schemaVersion',
      message: `Expected schemaVersion '1.0.0', got '${pkg.schemaVersion}'`
    });
  }

  if (typeof pkg.version !== 'string' || !SEMVER_REGEX.test(pkg.version)) {
    errors.push({
      code: 'ERR_PACKAGE_MUTABLE',
      path: 'version',
      message: `Package version '${pkg.version}' is not valid SemVer`
    });
  }

  // 2. Package Hash Check (ERR_PACKAGE_MUTABLE)
  try {
    const computedHash = hashPackage(pkg);
    if (!pkg.contentHash || pkg.contentHash !== computedHash) {
      errors.push({
        code: 'ERR_PACKAGE_MUTABLE',
        path: 'contentHash',
        message: `Content hash mismatch: expected '${computedHash}', got '${pkg.contentHash}'`
      });
    }
  } catch (err) {
    errors.push({
      code: 'ERR_PACKAGE_MUTABLE',
      path: 'contentHash',
      message: `Failed to compute content hash: ${err.message}`
    });
  }

  // 3. Structural Validation: MasteryPolicy and Budget before access
  const masteryPolicy = pkg.masteryPolicy;
  if (!masteryPolicy || typeof masteryPolicy !== 'object' || Array.isArray(masteryPolicy)) {
    errors.push({
      code: 'ERR_INVALID_MASTERY_SOURCE',
      path: 'masteryPolicy',
      message: 'Package must specify a valid masteryPolicy object'
    });
  } else {
    const minVal = masteryPolicy.individualEvidencePerObjectiveMin;
    if (typeof minVal !== 'number' || !Number.isInteger(minVal) || minVal < 2) {
      errors.push({
        code: 'ERR_INVALID_MASTERY_SOURCE',
        path: 'masteryPolicy.individualEvidencePerObjectiveMin',
        message: `individualEvidencePerObjectiveMin must be an integer >= 2, got ${minVal}`
      });
    }
  }

  const budget = pkg.budget;
  if (!budget || typeof budget !== 'object' || Array.isArray(budget)) {
    errors.push({
      code: 'ERR_TIME_BUDGET_MISMATCH',
      path: 'budget',
      message: 'Package must specify a valid budget object'
    });
  }

  // Helper to validate entity array elements structurally before relational checks
  function sanitizeEntities(arr, arrName, errCode, allowedKeys) {
    if (!Array.isArray(arr)) {
      errors.push({
        code: errCode,
        path: arrName,
        message: `${arrName} must be an array`
      });
      return [];
    }
    const sanitized = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const itemPath = `${arrName}[${i}]`;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({
          code: errCode,
          path: itemPath,
          message: `${itemPath} must be a non-null object`
        });
        continue;
      }
      if (allowedKeys) {
        for (const k of Object.keys(item)) {
          if (!allowedKeys.has(k)) {
            errors.push({
              code: errCode,
              path: `${itemPath}.${k}`,
              message: `Unknown property '${k}' in ${itemPath}`
            });
          }
        }
      }
      sanitized.push(item);
    }
    return sanitized;
  }

  const rawSourceRefs = pkg.sourceRefs;
  const rawObjectives = pkg.objectives;
  const rawActivities = pkg.activities;
  const rawTasks = pkg.tasks;
  const rawHints = pkg.hints;
  const rawEvidenceRules = pkg.evidenceRules;

  const sourceRefs = sanitizeEntities(rawSourceRefs, 'sourceRefs', 'ERR_MISSING_SOURCES', ALLOWED_SOURCE_KEYS);
  const objectives = sanitizeEntities(rawObjectives, 'objectives', 'ERR_LO_NOT_COVERED', ALLOWED_OBJECTIVE_KEYS);
  const activities = sanitizeEntities(rawActivities, 'activities', 'ERR_DANGLING_REFERENCE', ALLOWED_ACTIVITY_KEYS);
  const tasks = sanitizeEntities(rawTasks, 'tasks', 'ERR_INVALID_TASK_EVALUATION', ALLOWED_TASK_KEYS);
  const hints = sanitizeEntities(rawHints, 'hints', 'ERR_SCAFFOLD_INCOMPLETE', ALLOWED_HINT_KEYS);
  const evidenceRules = sanitizeEntities(rawEvidenceRules, 'evidenceRules', 'ERR_EVIDENCE_COVERAGE', ALLOWED_EVIDENCE_KEYS);

  // 4. SourceRef Schema and Publication Verification
  if (!Array.isArray(rawSourceRefs) || rawSourceRefs.length === 0) {
    errors.push({
      code: 'ERR_MISSING_SOURCES',
      path: 'sourceRefs',
      message: 'Package must declare at least one sourceRef'
    });
  } else {
    for (let i = 0; i < sourceRefs.length; i++) {
      const src = sourceRefs[i];
      const srcPath = `sourceRefs[${i}]`;

      if (
        typeof src.id !== 'string' ||
        !src.id ||
        typeof src.locator !== 'string' ||
        !src.locator ||
        typeof src.label !== 'string' ||
        !src.label ||
        !ALLOWED_SOURCE_KINDS.has(src.kind) ||
        !ALLOWED_SOURCE_VERIFICATIONS.has(src.verification)
      ) {
        errors.push({
          code: 'ERR_MISSING_SOURCES',
          path: srcPath,
          message: `SourceRef at index ${i} has invalid shape or missing fields`
        });
      }

      if ((mode === 'publish' || pkg.status === 'published') && src.verification !== 'verified') {
        errors.push({
          code: 'ERR_SOURCE_UNVERIFIED_ON_PUBLISH',
          path: `${srcPath}.verification`,
          message: `Source '${src.id || i}' has verification '${src.verification}', but publication requires 'verified'`
        });
      }
    }
  }

  // Objective enum validation
  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    if (typeof obj.level !== 'string' || !ALLOWED_OBJECTIVE_LEVELS.has(obj.level)) {
      errors.push({
        code: 'ERR_LO_NOT_COVERED',
        path: `objectives[${i}].level`,
        message: `Objective '${obj.id}' has invalid level '${obj.level}'`
      });
    }
  }

  // Activity enum and field validation
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const actPath = `activities[${i}]`;
    if (typeof act.phase !== 'string' || !ALLOWED_ACTIVITY_PHASES.has(act.phase)) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: `${actPath}.phase`,
        message: `Activity '${act.id}' has invalid phase '${act.phase}'`
      });
    }
    if (typeof act.budgetRole !== 'string' || !ALLOWED_BUDGET_ROLES.has(act.budgetRole)) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: `${actPath}.budgetRole`,
        message: `Activity '${act.id}' has invalid budgetRole '${act.budgetRole}'`
      });
    }
    if (typeof act.participation !== 'string' || !ALLOWED_PARTICIPATION.has(act.participation)) {
      errors.push({
        code: 'ERR_DANGLING_REFERENCE',
        path: `${actPath}.participation`,
        message: `Activity '${act.id}' has invalid participation '${act.participation}'`
      });
    }
  }

  // Task enum validation
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const taskPath = `tasks[${i}]`;
    if (typeof t.participation !== 'string' || !ALLOWED_PARTICIPATION.has(t.participation)) {
      errors.push({
        code: 'ERR_INVALID_TASK_EVALUATION',
        path: `${taskPath}.participation`,
        message: `Task '${t.id}' has invalid participation '${t.participation}'`
      });
    }
    if (t.branch && (typeof t.branch !== 'string' || !ALLOWED_TASK_BRANCHES.has(t.branch))) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: `${taskPath}.branch`,
        message: `Task '${t.id}' has invalid branch '${t.branch}'`
      });
    }
  }

  // Hint enum validation
  for (let i = 0; i < hints.length; i++) {
    const h = hints[i];
    if (typeof h.tier !== 'string' || !ALLOWED_HINT_TIERS.has(h.tier)) {
      errors.push({
        code: 'ERR_SCAFFOLD_INCOMPLETE',
        path: `hints[${i}].tier`,
        message: `Hint '${h.id}' has invalid tier '${h.tier}'`
      });
    }
  }

  // Evidence enum validation
  for (let i = 0; i < evidenceRules.length; i++) {
    const e = evidenceRules[i];
    if (typeof e.kind !== 'string' || !ALLOWED_EVIDENCE_KINDS.has(e.kind)) {
      errors.push({
        code: 'ERR_EVIDENCE_COVERAGE',
        path: `evidenceRules[${i}].kind`,
        message: `Evidence '${e.id}' has invalid kind '${e.kind}'`
      });
    }
  }

  // 5. Duplicate ID check (ERR_DUPLICATE_ID)
  const seenIds = new Set();
  function checkId(id, path) {
    if (!id || typeof id !== 'string') return;
    if (seenIds.has(id)) {
      errors.push({
        code: 'ERR_DUPLICATE_ID',
        path,
        message: `Duplicate ID detected: '${id}'`
      });
    } else {
      seenIds.add(id);
    }
  }

  objectives.forEach((o, i) => checkId(o.id, `objectives[${i}].id`));
  activities.forEach((a, i) => checkId(a.id, `activities[${i}].id`));
  tasks.forEach((t, i) => checkId(t.id, `tasks[${i}].id`));
  hints.forEach((h, i) => checkId(h.id, `hints[${i}].id`));
  evidenceRules.forEach((e, i) => checkId(e.id, `evidenceRules[${i}].id`));
  sourceRefs.forEach((s, i) => checkId(s.id, `sourceRefs[${i}].id`));

  // 6. Dangling References, Reciprocal Links & Matching LO Sets (ERR_DANGLING_REFERENCE)
  const objectiveIdSet = new Set(objectives.map((o) => o.id));
  const activityIdSet = new Set(activities.map((a) => a.id));
  const taskIdSet = new Set(tasks.map((t) => t.id));
  const hintIdSet = new Set(hints.map((h) => h.id));
  const evidenceIdSet = new Set(evidenceRules.map((e) => e.id));
  const sourceRefIdSet = new Set(sourceRefs.map((s) => s.id));

  // Objective prerequisites & cycles
  checkAcyclicObjectives(objectives, errors);
  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    if (Array.isArray(obj.prerequisiteIds)) {
      for (const pid of obj.prerequisiteIds) {
        if (!objectiveIdSet.has(pid) || pid === obj.id) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `objectives[${i}].prerequisiteIds`,
            message: `Objective '${obj.id}' references invalid prerequisite '${pid}'`
          });
        }
      }
    }
  }

  // Reciprocal Activity <-> Task links and Activity <-> Evidence ownership
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const actPath = `activities[${i}]`;

    if (Array.isArray(act.objectiveIds)) {
      for (const oid of act.objectiveIds) {
        if (!objectiveIdSet.has(oid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${actPath}.objectiveIds`,
            message: `Activity '${act.id}' references missing objective '${oid}'`
          });
        }
      }
    }

    if (Array.isArray(act.taskIds)) {
      for (const tid of act.taskIds) {
        if (!taskIdSet.has(tid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${actPath}.taskIds`,
            message: `Activity '${act.id}' references missing task '${tid}'`
          });
        } else {
          const linkedTask = tasks.find((t) => t.id === tid);
          if (linkedTask && linkedTask.activityId !== act.id) {
            errors.push({
              code: 'ERR_DANGLING_REFERENCE',
              path: `${actPath}.taskIds`,
              message: `Reciprocal mismatch: Activity '${act.id}' includes task '${tid}' but task points to '${linkedTask.activityId}'`
            });
          }
        }
      }
    }

    // Activity evidence ownership check: evidence must belong to a task in THIS activity
    if (Array.isArray(act.evidenceIds)) {
      for (const eid of act.evidenceIds) {
        if (!evidenceIdSet.has(eid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${actPath}.evidenceIds`,
            message: `Activity '${act.id}' references missing evidence '${eid}'`
          });
        } else {
          const linkedEv = evidenceRules.find((e) => e.id === eid);
          if (linkedEv && linkedEv.taskId) {
            const owningTask = tasks.find((t) => t.id === linkedEv.taskId);
            if (!owningTask || owningTask.activityId !== act.id) {
              errors.push({
                code: 'ERR_DANGLING_REFERENCE',
                path: `${actPath}.evidenceIds`,
                message: `Activity '${act.id}' claims evidence '${eid}' which belongs to task '${linkedEv.taskId}' in activity '${owningTask ? owningTask.activityId : 'missing'}'`
              });
            }
          }
        }
      }
    }

    // Complete reverse linkage: activity must include all evidence produced by its tasks
    if (Array.isArray(act.taskIds)) {
      for (const tid of act.taskIds) {
        const task = tasks.find((t) => t.id === tid);
        if (task && Array.isArray(task.evidenceIds)) {
          for (const eid of task.evidenceIds) {
            if (!Array.isArray(act.evidenceIds) || !act.evidenceIds.includes(eid)) {
              errors.push({
                code: 'ERR_DANGLING_REFERENCE',
                path: `${actPath}.evidenceIds`,
                message: `Activity '${act.id}' is missing evidence '${eid}' produced by its task '${tid}'`
              });
            }
          }
        }
      }
    }

    if (Array.isArray(act.supportIds)) {
      for (const hid of act.supportIds) {
        if (!hintIdSet.has(hid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${actPath}.supportIds`,
            message: `Activity '${act.id}' references missing hint '${hid}'`
          });
        }
      }
    }
  }

  // Task references, reciprocal checks, and LO match
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const taskPath = `tasks[${i}]`;

    if (!activityIdSet.has(t.activityId)) {
      errors.push({
        code: 'ERR_DANGLING_REFERENCE',
        path: `${taskPath}.activityId`,
        message: `Task '${t.id}' references missing activity '${t.activityId}'`
      });
    } else {
      const parentAct = activities.find((a) => a.id === t.activityId);
      if (parentAct && (!Array.isArray(parentAct.taskIds) || !parentAct.taskIds.includes(t.id))) {
        errors.push({
          code: 'ERR_DANGLING_REFERENCE',
          path: `${taskPath}.activityId`,
          message: `Reciprocal mismatch: Task '${t.id}' points to activity '${t.activityId}' which does not include it in taskIds`
        });
      }
      if (parentAct && Array.isArray(t.objectiveIds)) {
        const actObjSet = new Set(parentAct.objectiveIds || []);
        for (const oid of t.objectiveIds) {
          if (!actObjSet.has(oid)) {
            errors.push({
              code: 'ERR_DANGLING_REFERENCE',
              path: `${taskPath}.objectiveIds`,
              message: `Objective '${oid}' in task '${t.id}' is not covered by parent activity '${parentAct.id}'`
            });
          }
        }
      }
    }

    if (Array.isArray(t.objectiveIds)) {
      for (const oid of t.objectiveIds) {
        if (!objectiveIdSet.has(oid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${taskPath}.objectiveIds`,
            message: `Task '${t.id}' references missing objective '${oid}'`
          });
        }
      }
    }

    if (Array.isArray(t.evidenceIds)) {
      for (const eid of t.evidenceIds) {
        if (!evidenceIdSet.has(eid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${taskPath}.evidenceIds`,
            message: `Task '${t.id}' references missing evidence '${eid}'`
          });
        } else {
          const linkedEv = evidenceRules.find((e) => e.id === eid);
          if (linkedEv && linkedEv.taskId !== t.id) {
            errors.push({
              code: 'ERR_DANGLING_REFERENCE',
              path: `${taskPath}.evidenceIds`,
              message: `Reciprocal mismatch: Task '${t.id}' links evidence '${eid}' whose taskId is '${linkedEv.taskId}'`
            });
          }
        }
      }
    }

    if (Array.isArray(t.hintIds)) {
      for (const hid of t.hintIds) {
        if (!hintIdSet.has(hid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${taskPath}.hintIds`,
            message: `Task '${t.id}' references missing hint '${hid}'`
          });
        } else {
          const linkedHint = hints.find((h) => h.id === hid);
          if (linkedHint && linkedHint.taskId !== t.id) {
            errors.push({
              code: 'ERR_DANGLING_REFERENCE',
              path: `${taskPath}.hintIds`,
              message: `Reciprocal mismatch: Task '${t.id}' links hint '${hid}' whose taskId is '${linkedHint.taskId}'`
            });
          }
        }
      }
    }

    if (Array.isArray(t.sourceRefs)) {
      for (const sid of t.sourceRefs) {
        if (!sourceRefIdSet.has(sid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${taskPath}.sourceRefs`,
            message: `Task '${t.id}' references missing sourceRef '${sid}'`
          });
        }
      }
    }
  }

  // Hint reciprocal checks and LO match
  for (let i = 0; i < hints.length; i++) {
    const h = hints[i];
    const hintPath = `hints[${i}]`;
    if (!taskIdSet.has(h.taskId)) {
      errors.push({
        code: 'ERR_DANGLING_REFERENCE',
        path: `${hintPath}.taskId`,
        message: `Hint '${h.id}' references missing task '${h.taskId}'`
      });
    } else {
      const parentTask = tasks.find((t) => t.id === h.taskId);
      if (parentTask && (!Array.isArray(parentTask.hintIds) || !parentTask.hintIds.includes(h.id))) {
        errors.push({
          code: 'ERR_DANGLING_REFERENCE',
          path: `${hintPath}.taskId`,
          message: `Reciprocal mismatch: Hint '${h.id}' points to task '${h.taskId}' which does not include it in hintIds`
        });
      }
      if (parentTask && Array.isArray(h.objectiveIds)) {
        const taskObjSet = new Set(parentTask.objectiveIds || []);
        for (const oid of h.objectiveIds) {
          if (!taskObjSet.has(oid)) {
            errors.push({
              code: 'ERR_DANGLING_REFERENCE',
              path: `${hintPath}.objectiveIds`,
              message: `Objective '${oid}' in hint '${h.id}' is not covered by parent task '${parentTask.id}'`
            });
          }
        }
      }
    }
    if (Array.isArray(h.objectiveIds)) {
      for (const oid of h.objectiveIds) {
        if (!objectiveIdSet.has(oid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${hintPath}.objectiveIds`,
            message: `Hint '${h.id}' references missing objective '${oid}'`
          });
        }
      }
    }
  }

  // Evidence reciprocal checks and LO match
  for (let i = 0; i < evidenceRules.length; i++) {
    const e = evidenceRules[i];
    const evPath = `evidenceRules[${i}]`;
    if (e.taskId) {
      if (!taskIdSet.has(e.taskId)) {
        errors.push({
          code: 'ERR_DANGLING_REFERENCE',
          path: `${evPath}.taskId`,
          message: `Evidence '${e.id}' references missing task '${e.taskId}'`
        });
      } else {
        const parentTask = tasks.find((t) => t.id === e.taskId);
        if (parentTask && (!Array.isArray(parentTask.evidenceIds) || !parentTask.evidenceIds.includes(e.id))) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${evPath}.taskId`,
            message: `Reciprocal mismatch: Evidence '${e.id}' points to task '${e.taskId}' which does not include it in evidenceIds`
          });
        }
        if (parentTask && Array.isArray(e.objectiveIds)) {
          const taskObjSet = new Set(parentTask.objectiveIds || []);
          for (const oid of e.objectiveIds) {
            if (!taskObjSet.has(oid)) {
              errors.push({
                code: 'ERR_DANGLING_REFERENCE',
                path: `${evPath}.objectiveIds`,
                message: `Objective '${oid}' in evidence '${e.id}' is not covered by parent task '${parentTask.id}'`
              });
            }
          }
        }
      }
    }
    if (Array.isArray(e.objectiveIds)) {
      for (const oid of e.objectiveIds) {
        if (!objectiveIdSet.has(oid)) {
          errors.push({
            code: 'ERR_DANGLING_REFERENCE',
            path: `${evPath}.objectiveIds`,
            message: `Evidence '${e.id}' references missing objective '${oid}'`
          });
        }
      }
    }
  }

  // 7. Time Budget Checks (ERR_TIME_BUDGET_MISMATCH)
  if (budget && typeof budget === 'object') {
    const coreMinutesSum = activities
      .filter((a) => a.budgetRole === 'core')
      .reduce((sum, a) => sum + (typeof a.minutes === 'number' ? a.minutes : 0), 0);
    const reserveMinutesSum = activities
      .filter((a) => a.budgetRole === 'reserve')
      .reduce((sum, a) => sum + (typeof a.minutes === 'number' ? a.minutes : 0), 0);
    const optionalMinutesSum = activities
      .filter((a) => a.budgetRole === 'optional')
      .reduce((sum, a) => sum + (typeof a.minutes === 'number' ? a.minutes : 0), 0);

    if (typeof budget.coreMinutes !== 'number' || budget.coreMinutes !== coreMinutesSum) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: 'budget.coreMinutes',
        message: `budget.coreMinutes (${budget.coreMinutes}) does not equal sum of core activities (${coreMinutesSum})`
      });
    }
    if (typeof budget.reserveMinutes !== 'number' || budget.reserveMinutes !== reserveMinutesSum) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: 'budget.reserveMinutes',
        message: `budget.reserveMinutes (${budget.reserveMinutes}) does not equal sum of reserve activities (${reserveMinutesSum})`
      });
    }
    if (typeof budget.optionalMinutes !== 'number' || budget.optionalMinutes !== optionalMinutesSum) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: 'budget.optionalMinutes',
        message: `budget.optionalMinutes (${budget.optionalMinutes}) does not equal sum of optional activities (${optionalMinutesSum})`
      });
    }

    const slotMinutes = typeof budget.slotMinutes === 'number' ? budget.slotMinutes : 0;
    const transitionMinutes = typeof budget.transitionMinutes === 'number' ? budget.transitionMinutes : 0;
    const totalDeclaredBudget = (budget.coreMinutes || 0) +
      (budget.reserveMinutes || 0) +
      transitionMinutes +
      (budget.optionalMinutes || 0);

    if (totalDeclaredBudget > slotMinutes) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: 'budget.slotMinutes',
        message: `Total declared minutes (${totalDeclaredBudget}) exceeds slotMinutes (${slotMinutes})`
      });
    }
  }

  // Activity task minutes check
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const actTasks = tasks.filter(
      (t) => t.activityId === act.id || (Array.isArray(act.taskIds) && act.taskIds.includes(t.id))
    );

    let sharedMinutes = 0;
    const branchMinutes = { support: 0, core: 0, extension: 0 };

    for (const t of actTasks) {
      const mins = typeof t.minutes === 'number' ? t.minutes : 0;
      if (!t.branch || t.branch === 'shared') {
        sharedMinutes += mins;
      } else if (t.branch in branchMinutes) {
        branchMinutes[t.branch] += mins;
      } else {
        sharedMinutes += mins;
      }
    }

    const maxAlternativeBranch = Math.max(
      branchMinutes.support,
      branchMinutes.core,
      branchMinutes.extension,
      0
    );
    const effectiveTaskMinutes = sharedMinutes + maxAlternativeBranch;
    const actMinutes = typeof act.minutes === 'number' ? act.minutes : 0;

    if (effectiveTaskMinutes > actMinutes) {
      errors.push({
        code: 'ERR_TIME_BUDGET_MISMATCH',
        path: `activities[${i}].minutes`,
        message: `Task minutes (${effectiveTaskMinutes}) exceed activity duration (${actMinutes}) for activity '${act.id}'`
      });
    }
  }

  // 8. Task Evaluation and Public inputSchema Checks (ERR_UNKNOWN_CHECKER, ERR_INVALID_TASK_EVALUATION)
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const taskPath = `tasks[${i}]`;

    if (!TASK_TYPES.includes(t.type)) {
      errors.push({
        code: 'ERR_INVALID_TASK_EVALUATION',
        path: `${taskPath}.type`,
        message: `Task '${t.id}' has invalid type '${t.type}'`
      });
      continue;
    }

    const evaluation = t.evaluation;
    if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) {
      errors.push({
        code: 'ERR_INVALID_TASK_EVALUATION',
        path: `${taskPath}.evaluation`,
        message: `Task '${t.id}' requires an evaluation object`
      });
      continue;
    }

    // Safety check: ensure no executable code/functions exist in evaluation
    const evalStr = JSON.stringify(evaluation);
    if (FORBIDDEN_CODE_REGEX.test(evalStr)) {
      errors.push({
        code: 'ERR_INVALID_TASK_EVALUATION',
        path: `${taskPath}.evaluation`,
        message: `Task '${t.id}' evaluation contains forbidden executable tokens`
      });
    }

    if (t.type === 'closed') {
      const checkerId = evaluation.checkerId;
      if (!checkerId || typeof checkerId !== 'string') {
        errors.push({
          code: 'ERR_INVALID_TASK_EVALUATION',
          path: `${taskPath}.evaluation.checkerId`,
          message: `Closed task '${t.id}' requires checkerId`
        });
      } else if (!(checkerId in CHECKER_REGISTRY)) {
        errors.push({
          code: 'ERR_UNKNOWN_CHECKER',
          path: `${taskPath}.evaluation.checkerId`,
          message: `Unknown checker '${checkerId}' on closed task '${t.id}'`
        });
      }

      if (evaluation.answerKey === undefined || evaluation.answerKey === null) {
        errors.push({
          code: 'ERR_INVALID_TASK_EVALUATION',
          path: `${taskPath}.evaluation.answerKey`,
          message: `Closed task '${t.id}' requires answerKey`
        });
      }

      if (['ordering_exact', 'classification_exact'].includes(checkerId)) {
        const schema = t.inputSchema;
        const keys = checkerId === 'ordering_exact' ? ['items'] : ['items', 'categories'];
        const valid = schema && typeof schema === 'object' && !Array.isArray(schema) && Object.keys(schema).every(key => keys.includes(key)) && keys.every(key => Array.isArray(schema[key]) && schema[key].length > 0 && schema[key].length <= 40 && new Set(schema[key].map(item => item?.id)).size === schema[key].length && schema[key].every(item => item && Object.keys(item).every(k => ['id', 'label'].includes(k)) && typeof item.id === 'string' && item.id.length > 0 && !['__proto__','constructor','prototype'].includes(item.id) && typeof item.label === 'string' && item.label.trim()));
        if (!valid || CHECKER_REGISTRY[checkerId](evaluation.answerKey, t)?.ok !== true) errors.push({ code: 'ERR_INVALID_TASK_EVALUATION', path: taskPath, message: 'Invalid public item schema or answer domain' });
      }

      if (checkerId === 'true_false_4') {
        const schema = t.inputSchema;
        const validSchema = schema && typeof schema === 'object' && !Array.isArray(schema) &&
          Object.keys(schema).every(key => ALLOWED_TRUE_FALSE_4_INPUT_SCHEMA_KEYS.has(key)) &&
          (schema.type === undefined || schema.type === checkerId) && validFourLabeledItems(schema.statements);
        if (!validSchema || CHECKER_REGISTRY[checkerId](evaluation.answerKey, t)?.ok !== true) {
          errors.push({ code: 'ERR_INVALID_TASK_EVALUATION', path: taskPath, message: `Invalid true_false_4 schema or answer domain on task '${t.id}'` });
        }
      }

      if (checkerId === 'short_answer_4') {
        const schema = t.inputSchema;
        const validSchema = schema && typeof schema === 'object' && !Array.isArray(schema) &&
          Object.keys(schema).every(key => ALLOWED_SHORT_ANSWER_4_INPUT_SCHEMA_KEYS.has(key)) &&
          (schema.type === undefined || schema.type === checkerId) &&
          (schema.cells === undefined || validFourLabeledItems(schema.cells)) &&
          (schema.format === undefined || SHORT_ANSWER_4_FORMATS.has(schema.format));
        if (!validSchema || CHECKER_REGISTRY[checkerId](evaluation.answerKey, t)?.ok !== true) {
          errors.push({ code: 'ERR_INVALID_TASK_EVALUATION', path: taskPath, message: `Invalid short_answer_4 schema or answer domain on task '${t.id}'` });
        }
      }

      // Public inputSchema validation for choice and representation tasks
      if (checkerId === 'choice_exact' || checkerId === 'multi_choice_exact') {
        const schema = t.inputSchema;
        if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
          errors.push({
            code: 'ERR_INVALID_TASK_EVALUATION',
            path: `${taskPath}.inputSchema`,
            message: `Choice task '${t.id}' requires inputSchema with options [{id, label}]`
          });
        } else {
          for (const k of Object.keys(schema)) {
            if (!ALLOWED_CHOICE_INPUT_SCHEMA_KEYS.has(k)) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.inputSchema.${k}`,
                message: `Unknown property '${k}' in inputSchema for choice task '${t.id}'`
              });
            }
          }
          if (!Array.isArray(schema.options) || schema.options.length === 0) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.inputSchema.options`,
              message: `Choice task '${t.id}' inputSchema.options must be a non-empty array of [{id, label}]`
            });
          } else {
            const optionIds = [];
            for (let oIdx = 0; oIdx < schema.options.length; oIdx++) {
              const opt = schema.options[oIdx];
              const optPath = `${taskPath}.inputSchema.options[${oIdx}]`;
              if (
                !opt ||
                typeof opt !== 'object' ||
                Array.isArray(opt) ||
                typeof opt.id !== 'string' ||
                !opt.id ||
                typeof opt.label !== 'string' ||
                !opt.label
              ) {
                errors.push({
                  code: 'ERR_INVALID_TASK_EVALUATION',
                  path: optPath,
                  message: `Option at ${optPath} must be an object with non-empty string id and label`
                });
              } else {
                for (const k of Object.keys(opt)) {
                  if (!ALLOWED_OPTION_ITEM_KEYS.has(k)) {
                    errors.push({
                      code: 'ERR_INVALID_TASK_EVALUATION',
                      path: `${optPath}.${k}`,
                      message: `Unknown property '${k}' in option for choice task '${t.id}'`
                    });
                  }
                }
                optionIds.push(opt.id);
                scanKaTeX(opt.label, `${optPath}.label`, errors);
              }
            }
            if (new Set(optionIds).size !== optionIds.length) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.inputSchema.options`,
                message: `Option IDs in task '${t.id}' must be unique`
              });
            }
            if (checkerId === 'choice_exact' && typeof evaluation.answerKey === 'string' && !optionIds.includes(evaluation.answerKey)) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.evaluation.answerKey`,
                message: `choice_exact answerKey must belong to inputSchema.options in task '${t.id}'`
              });
            }
            if (checkerId === 'multi_choice_exact' && Array.isArray(evaluation.answerKey)) {
              if (evaluation.answerKey.some((k) => !optionIds.includes(k))) {
                errors.push({
                  code: 'ERR_INVALID_TASK_EVALUATION',
                  path: `${taskPath}.evaluation.answerKey`,
                  message: `multi_choice_exact answerKey items must belong to inputSchema.options in task '${t.id}'`
                });
              }
            }
          }
        }
      } else if (checkerId === 'representation_match') {
        const schema = t.inputSchema;
        if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
          errors.push({
            code: 'ERR_INVALID_TASK_EVALUATION',
            path: `${taskPath}.inputSchema`,
            message: `representation_match task '${t.id}' requires inputSchema with representations and cards`
          });
        } else {
          for (const k of Object.keys(schema)) {
            if (!ALLOWED_REP_INPUT_SCHEMA_KEYS.has(k)) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.inputSchema.${k}`,
                message: `Unknown property '${k}' in inputSchema for representation task '${t.id}'`
              });
            }
          }
          const reps = schema.representations;
          const cards = schema.cards;
          if (!Array.isArray(reps) || reps.length === 0) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.inputSchema.representations`,
              message: `inputSchema.representations must be a non-empty array of [{id, label}]`
            });
          }
          if (!Array.isArray(cards) || cards.length === 0) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.inputSchema.cards`,
              message: `inputSchema.cards must be a non-empty array of [{id, label}]`
            });
          }
          const repIdList = [];
          if (Array.isArray(reps)) {
            for (let rIdx = 0; rIdx < reps.length; rIdx++) {
              const r = reps[rIdx];
              const rPath = `${taskPath}.inputSchema.representations[${rIdx}]`;
              if (
                !r ||
                typeof r !== 'object' ||
                Array.isArray(r) ||
                typeof r.id !== 'string' ||
                !r.id ||
                typeof r.label !== 'string' ||
                !r.label
              ) {
                errors.push({
                  code: 'ERR_INVALID_TASK_EVALUATION',
                  path: rPath,
                  message: `Representation at ${rPath} must be an object with non-empty string id and label`
                });
              } else {
                for (const k of Object.keys(r)) {
                  if (!ALLOWED_REP_ITEM_KEYS.has(k)) {
                    errors.push({
                      code: 'ERR_INVALID_TASK_EVALUATION',
                      path: `${rPath}.${k}`,
                      message: `Unknown property '${k}' in representation item for task '${t.id}'`
                    });
                  }
                }
                repIdList.push(r.id);
                scanKaTeX(r.label, `${rPath}.label`, errors);
              }
            }
          }
          const cardIdList = [];
          if (Array.isArray(cards)) {
            for (let cIdx = 0; cIdx < cards.length; cIdx++) {
              const c = cards[cIdx];
              const cPath = `${taskPath}.inputSchema.cards[${cIdx}]`;
              if (
                !c ||
                typeof c !== 'object' ||
                Array.isArray(c) ||
                typeof c.id !== 'string' ||
                !c.id ||
                typeof c.label !== 'string' ||
                !c.label
              ) {
                errors.push({
                  code: 'ERR_INVALID_TASK_EVALUATION',
                  path: cPath,
                  message: `Card at ${cPath} must be an object with non-empty string id and label`
                });
              } else {
                for (const k of Object.keys(c)) {
                  if (!ALLOWED_CARD_ITEM_KEYS.has(k)) {
                    errors.push({
                      code: 'ERR_INVALID_TASK_EVALUATION',
                      path: `${cPath}.${k}`,
                      message: `Unknown property '${k}' in card item for task '${t.id}'`
                    });
                  }
                }
                cardIdList.push(c.id);
                scanKaTeX(c.label, `${cPath}.label`, errors);
              }
            }
          }
          // Domain & range matching against evaluation.answerKey without disclosing mapping
          if (evaluation.answerKey && typeof evaluation.answerKey === 'object' && !Array.isArray(evaluation.answerKey)) {
            const answerKeys = Object.keys(evaluation.answerKey);
            const repIdSet = new Set(repIdList);
            if (answerKeys.length !== repIdSet.size || answerKeys.some((k) => !repIdSet.has(k))) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.evaluation.answerKey`,
                message: `representation_match answerKey keys must match inputSchema.representations domain exactly`
              });
            }
            const cardIdSet = new Set(cardIdList);
            if (Object.values(evaluation.answerKey).some((val) => !cardIdSet.has(val))) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.evaluation.answerKey`,
                message: `representation_match answerKey values must belong to inputSchema.cards`
              });
            }
          }
        }
      } else if (!['ordering_exact', 'classification_exact', 'true_false_4', 'short_answer_4'].includes(checkerId)) {
        // Other closed tasks with optional inputSchema
        if (t.inputSchema) {
          if (typeof t.inputSchema !== 'object' || Array.isArray(t.inputSchema)) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.inputSchema`,
              message: `inputSchema on task '${t.id}' must be an object`
            });
          } else {
            for (const k of Object.keys(t.inputSchema)) {
              if (!ALLOWED_GENERIC_INPUT_SCHEMA_KEYS.has(k)) {
                errors.push({
                  code: 'ERR_INVALID_TASK_EVALUATION',
                  path: `${taskPath}.inputSchema.${k}`,
                  message: `Unknown property '${k}' in inputSchema for task '${t.id}'`
                });
              }
            }
          }
        }
      }

      if (checkerId in CHECKER_REGISTRY) {
        if (checkerId === 'numeric_exact') {
          if (typeof evaluation.answerKey !== 'number' || !Number.isFinite(evaluation.answerKey)) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `numeric_exact requires finite number answerKey on task '${t.id}'`
            });
          }
        } else if (checkerId === 'text_normalized_exact') {
          if (typeof evaluation.answerKey !== 'string') {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `text_normalized_exact requires string answerKey on task '${t.id}'`
            });
          }
        } else if (checkerId === 'choice_exact') {
          const options = evaluation.options || t.inputSchema?.options?.map((o) => (typeof o === 'string' ? o : o?.id));
          if (
            !Array.isArray(options) ||
            options.length === 0 ||
            options.some((x) => typeof x !== 'string') ||
            new Set(options).size !== options.length
          ) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.options`,
              message: `choice_exact requires unique array of option IDs on task '${t.id}'`
            });
          } else if (typeof evaluation.answerKey !== 'string' || !options.includes(evaluation.answerKey)) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `choice_exact answerKey must be a member of options on task '${t.id}'`
            });
          }
        } else if (checkerId === 'multi_choice_exact') {
          const key = evaluation.answerKey;
          const options = evaluation.options || t.inputSchema?.options?.map((o) => (typeof o === 'string' ? o : o?.id));
          if (
            !Array.isArray(key) ||
            key.length === 0 ||
            key.some((x) => typeof x !== 'string') ||
            new Set(key).size !== key.length
          ) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `multi_choice_exact requires unique array of option IDs for answerKey on task '${t.id}'`
            });
          }
          if (Array.isArray(options) && Array.isArray(key)) {
            if (key.some((k) => !options.includes(k))) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.evaluation.answerKey`,
                message: `multi_choice_exact answerKey items must belong to options on task '${t.id}'`
              });
            }
          }
        } else if (checkerId === 'representation_match') {
          const key = evaluation.answerKey;
          if (!isStringStringMap(key)) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `representation_match requires plain non-empty string/string object answerKey on task '${t.id}'`
            });
          }
        } else if (checkerId === 'true_false_4') {
          if (!Array.isArray(evaluation.answerKey) || evaluation.answerKey.length !== 4 || evaluation.answerKey.some(value => typeof value !== 'boolean')) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `true_false_4 requires exactly four boolean answerKey values on task '${t.id}'`
            });
          }
        } else if (checkerId === 'short_answer_4') {
          const format = t.inputSchema?.format === undefined ? 'digits' : t.inputSchema.format;
          if (!SHORT_ANSWER_4_FORMATS.has(format) || !validShortAnswerVector(evaluation.answerKey, format)) {
            errors.push({
              code: 'ERR_INVALID_TASK_EVALUATION',
              path: `${taskPath}.evaluation.answerKey`,
              message: `short_answer_4 requires four valid cells for format '${format}' on task '${t.id}'`
            });
          }
        }
      }
    } else {
      // open or reflection
      if (evaluation.checkerId !== undefined || evaluation.answerKey !== undefined) {
        errors.push({
          code: 'ERR_INVALID_TASK_EVALUATION',
          path: `${taskPath}.evaluation`,
          message: `${t.type} task '${t.id}' must not have checkerId or answerKey`
        });
      }
      const rubric = evaluation.rubric;
      if (!rubric || typeof rubric !== 'object' || Array.isArray(rubric)) {
        errors.push({
          code: 'ERR_INVALID_TASK_EVALUATION',
          path: `${taskPath}.evaluation.rubric`,
          message: `${t.type} task '${t.id}' requires a rubric object`
        });
      } else {
        if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
          errors.push({
            code: 'ERR_INVALID_TASK_EVALUATION',
            path: `${taskPath}.evaluation.rubric.criteria`,
            message: `${t.type} task '${t.id}' rubric requires criteria[]`
          });
        }
        if (!Array.isArray(rubric.lookFor) || rubric.lookFor.length === 0) {
          errors.push({
            code: 'ERR_INVALID_TASK_EVALUATION',
            path: `${taskPath}.evaluation.rubric.lookFor`,
            message: `${t.type} task '${t.id}' rubric requires lookFor[]`
          });
        }
      }
      if (t.inputSchema) {
        if (typeof t.inputSchema !== 'object' || Array.isArray(t.inputSchema)) {
          errors.push({
            code: 'ERR_INVALID_TASK_EVALUATION',
            path: `${taskPath}.inputSchema`,
            message: `inputSchema on task '${t.id}' must be an object`
          });
        } else {
          for (const k of Object.keys(t.inputSchema)) {
            if (!ALLOWED_GENERIC_INPUT_SCHEMA_KEYS.has(k)) {
              errors.push({
                code: 'ERR_INVALID_TASK_EVALUATION',
                path: `${taskPath}.inputSchema.${k}`,
                message: `Unknown property '${k}' in inputSchema for task '${t.id}'`
              });
            }
          }
        }
      }
    }
  }

  // 9. Scaffold / Hints Validation (ERR_SCAFFOLD_INCOMPLETE, ERR_SCAFFOLD_PENALTY_FORBIDDEN)
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const taskPath = `tasks[${i}]`;

    const assignedHints = Array.isArray(t.hintIds)
      ? t.hintIds.map((id) => hints.find((h) => h.id === id)).filter(Boolean)
      : hints.filter((h) => h.taskId === t.id);

    if (t.isCore) {
      if (t.requiresFullScaffold) {
        const sorted = [...assignedHints].sort((a, b) => (a.order || 0) - (b.order || 0));
        const tiers = sorted.map((h) => h.tier);
        const orders = sorted.map((h) => h.order);
        const expectedTiers = ['H1', 'H2', 'H3', 'H4'];
        const isComplete =
          tiers.length === 4 &&
          expectedTiers.every((exp, idx) => tiers[idx] === exp && orders[idx] === idx + 1);

        if (!isComplete) {
          errors.push({
            code: 'ERR_SCAFFOLD_INCOMPLETE',
            path: `${taskPath}.hintIds`,
            message: `Core task '${t.id}' marked requiresFullScaffold must have H1..H4 in order`
          });
        }
      } else {
        const hasRationale = Boolean(t.supportRationale) || assignedHints.some((h) => Boolean(h.supportRationale));
        if (assignedHints.length === 0 || !hasRationale) {
          errors.push({
            code: 'ERR_SCAFFOLD_INCOMPLETE',
            path: `${taskPath}.hintIds`,
            message: `Core task '${t.id}' requires at least one hint and a supportRationale`
          });
        }
      }
    }
  }

  // Check hint penalties and answer leaks
  // ponytail: literal assertions only; paraphrased leaks still require teacher review.
  const normalizeAnswerText = value => value.normalize('NFC').toLowerCase().replace(/dãy số/g, 'dãy').replace(/(?:hệ|công) thức(?: số hạng)?/g, 'thức').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < hints.length; i++) {
    const h = hints[i];
    const hintPath = `hints[${i}]`;

    if (!h.penalty || h.penalty.time !== 0 || h.penalty.score !== 0 || h.penalty.freeze !== 0) {
      errors.push({
        code: 'ERR_SCAFFOLD_PENALTY_FORBIDDEN',
        path: `${hintPath}.penalty`,
        message: `Hint '${h.id}' must have zero learning penalties ({time:0,score:0,freeze:0})`
      });
    }

    if (h.notAnswer !== true) {
      errors.push({
        code: 'ERR_SCAFFOLD_PENALTY_FORBIDDEN',
        path: `${hintPath}.notAnswer`,
        message: `Hint '${h.id}' must specify notAnswer: true`
      });
    }

    const linkedTask = tasks.find((t) => t.id === h.taskId);
    if (linkedTask && linkedTask.type === 'closed' && linkedTask.evaluation?.answerKey !== undefined) {
      const answerKey = linkedTask.evaluation.answerKey;
      if (typeof answerKey === 'string' || typeof answerKey === 'number' || Array.isArray(answerKey)) {
        const keys = Array.isArray(answerKey) ? answerKey : [answerKey];
        const keyStr = String(answerKey).normalize('NFC').trim().toLowerCase();
        const hintStr = typeof h.text === 'string' ? h.text.normalize('NFC').trim().toLowerCase() : '';
        const labels = ['choice_exact', 'multi_choice_exact'].includes(linkedTask.evaluation.checkerId) && Array.isArray(linkedTask.inputSchema?.options)
          ? linkedTask.inputSchema.options.filter(item => keys.includes(item?.id) && typeof item?.label === 'string').map(item => normalizeAnswerText(item.label.split('(')[0])) : [];
        const targets = [...keys.map(key => normalizeAnswerText(String(key))), ...labels];
        const normalizedHint = normalizeAnswerText(hintStr).replace(/^h[1-4]\s*:\s*/, '');
        const workedExample = /(?:ví dụ|chẳng hạn|for example|example)/.test(normalizedHint);
        const assertion = /(?:^|[.!;:]\s*|\s)(?:đáp án|kết quả|the answer|answer|result)\s*(?:là|is|[:=])\s*|(?:^|[.!;:]\s*|\s)(?:chọn|choose|select)\s*(?:đáp án|phương án|option)?\s*|(?:^|[.!;:]\s*|\s)(?:đây là|this is|nên là|do đó là|therefore it is|hence it is)\s*(?:cách (?:cho bằng|mô tả)\s*)?/g;
        const directAssertion = [...normalizedHint.matchAll(assertion)].some(match => {
          if (/đây là|this is|nên là|do đó là|therefore|hence/.test(match[0]) && (workedExample || /(?:^|\s)(?:nếu|if)(?=\s|:|$)/.test(normalizedHint.slice(0, match.index)))) return false;
          const conclusion = normalizedHint.slice(match.index + match[0].length);
          return targets.some(target => conclusion.startsWith(target) && (!conclusion[target.length] || /[\s.,!;?$]/.test(conclusion[target.length])));
        });
        const numericEquation = typeof answerKey === 'number' && [...normalizedHint.replace(/[−–]/g, '-').matchAll(/=\s*([+-]?\d+(?:[.,]\d+)?)(?=\s*(?:[.,;!?$]|$))/g)].some(match => Number(match[1].replace(',', '.')) === answerKey);
        if (hintStr === keyStr || normalizedHint.replace(/[.!]+$/, '') === keyStr || labels.includes(normalizedHint.replace(/[.!]+$/, '')) || directAssertion || numericEquation) {
          errors.push({
            code: 'ERR_SCAFFOLD_PENALTY_FORBIDDEN',
            path: `${hintPath}.text`,
            message: `Hint '${h.id}' directly gives the answer to task '${linkedTask.id}'`
          });
        }
      }
    }
  }

  for (const [index, task] of tasks.entries()) {
    const variants = task.metadata?.practiceVariants;
    if (variants === undefined) continue;
    if (!Array.isArray(variants) || variants.length > 16 || variants.some(variant => !variant || typeof variant !== 'object' || Array.isArray(variant) || Object.keys(variant).some(key => !['prompt','inputSchema','evaluation','masteryEvidence'].includes(key)) || variant.masteryEvidence !== undefined && typeof variant.masteryEvidence !== 'boolean' || typeof variant.prompt !== 'string' || !variant.prompt.trim() || variant.prompt === task.prompt || variant.prompt.length > 8000 || !variant.evaluation || !variant.inputSchema)) errors.push({ code: 'ERR_INVALID_PRACTICE_VARIANTS', path: 'tasks[' + index + '].metadata.practiceVariants', message: 'Practice requires at most16 authored distinct public prompts with checker and input schema' });
  }

  // Source provenance remains attached through teacher edits and approval.
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i], citation = task.metadata?.sourceCitation;
    if (citation !== undefined) {
      if (!citation || typeof citation !== 'object' || Array.isArray(citation) || Object.keys(citation).some(key => !['segmentId', 'quote', 'origin'].includes(key)) || typeof citation.segmentId !== 'string' || !citation.segmentId || typeof citation.quote !== 'string' || !citation.quote.trim() || !['source', 'adapted', 'generated'].includes(citation.origin) || typeof task.metadata.numericReviewRequired !== 'boolean' || !Array.isArray(task.sourceRefs) || !task.sourceRefs.length) {
        errors.push({ code: 'ERR_SOURCE_PROVENANCE', path: `tasks[${i}].metadata`, message: 'Task source citation and review flag must remain bound to a source' });
      } else if (sourceNumericDrift(task, citation.quote)) {
        if (citation.origin === 'source') errors.push({ code: 'ERR_SOURCE_NUMERIC_MISMATCH', path: `tasks[${i}].prompt`, message: 'Source-exact task contains a numeric token absent from its citation' });
        else if (!task.metadata.numericReviewRequired) errors.push({ code: 'ERR_SOURCE_PROVENANCE', path: `tasks[${i}].metadata.numericReviewRequired`, message: 'Adapted numeric data require teacher review' });
      }
    } else if (task.metadata?.numericReviewRequired) {
      errors.push({ code: 'ERR_SOURCE_PROVENANCE', path: `tasks[${i}].metadata`, message: 'Numeric review requires the cited source' });
    }
    const activity = activities.find(item => item.id === task.activityId);
    if (activity?.phase === 'recheck' && tasks.some(prior => {
      const priorActivity = activities.find(item => item.id === prior.activityId);
      return ['experience', 'guided', 'formation', 'practice'].includes(priorActivity?.phase) && normalizeAnswerText(String(prior.prompt || '')).replace(/[\s$]/g, '') === normalizeAnswerText(String(task.prompt || '')).replace(/[\s$]/g, '');
    })) errors.push({ code: 'ERR_RECHECK_DUPLICATE', path: `tasks[${i}].prompt`, message: 'Recheck must use a different prompt from previous learning tasks' });
  }

  // 10. Mastery Policy and Mandatory Forbidden Sources (ERR_INVALID_MASTERY_SOURCE)
  if (masteryPolicy && typeof masteryPolicy === 'object') {
    if (!Array.isArray(masteryPolicy.forbiddenSources)) {
      errors.push({
        code: 'ERR_INVALID_MASTERY_SOURCE',
        path: 'masteryPolicy.forbiddenSources',
        message: 'masteryPolicy.forbiddenSources must be an array'
      });
    } else {
      // Mandatory forbidden sources cannot be omitted or weakened by package policy
      for (const mfs of MANDATORY_FORBIDDEN_SOURCES) {
        if (!masteryPolicy.forbiddenSources.includes(mfs)) {
          errors.push({
            code: 'ERR_INVALID_MASTERY_SOURCE',
            path: 'masteryPolicy.forbiddenSources',
            message: `Mandatory forbidden source '${mfs}' cannot be removed from forbiddenSources`
          });
        }
      }
    }

    if (!Array.isArray(masteryPolicy.masterySources) || masteryPolicy.masterySources.length === 0) {
      errors.push({
        code: 'ERR_INVALID_MASTERY_SOURCE',
        path: 'masteryPolicy.masterySources',
        message: 'masteryPolicy.masterySources must be a non-empty array'
      });
    } else {
      for (const ms of masteryPolicy.masterySources) {
        if (MANDATORY_FORBIDDEN_SOURCES.includes(ms) || (Array.isArray(masteryPolicy.forbiddenSources) && masteryPolicy.forbiddenSources.includes(ms))) {
          errors.push({
            code: 'ERR_INVALID_MASTERY_SOURCE',
            path: 'masteryPolicy.masterySources',
            message: `masterySources contains forbidden source '${ms}'`
          });
        }
        if (!ALLOWED_INDIVIDUAL_MASTERY_KINDS.includes(ms)) {
          errors.push({
            code: 'ERR_INVALID_MASTERY_SOURCE',
            path: 'masteryPolicy.masterySources',
            message: `masterySources contains unauthorized source '${ms}' (allowed: ${ALLOWED_INDIVIDUAL_MASTERY_KINDS.join(', ')})`
          });
        }
      }
    }
  }

  // Check evidence countsForMastery invariants: must be individual, allowed kind, not reflection task
  for (let i = 0; i < evidenceRules.length; i++) {
    const e = evidenceRules[i];
    const evPath = `evidenceRules[${i}]`;
    if (e.countsForMastery) {
      if (e.individual !== true) {
        errors.push({
          code: 'ERR_INVALID_MASTERY_SOURCE',
          path: `${evPath}.individual`,
          message: `Evidence '${e.id}' counts for mastery but is not marked individual: true`
        });
      }
      if (MANDATORY_FORBIDDEN_SOURCES.includes(e.kind)) {
        errors.push({
          code: 'ERR_INVALID_MASTERY_SOURCE',
          path: `${evPath}.kind`,
          message: `Evidence '${e.id}' counts for mastery using mandatory forbidden source '${e.kind}'`
        });
      }
      if (!ALLOWED_INDIVIDUAL_MASTERY_KINDS.includes(e.kind)) {
        errors.push({
          code: 'ERR_INVALID_MASTERY_SOURCE',
          path: `${evPath}.kind`,
          message: `Evidence '${e.id}' counts for mastery using unauthorized source '${e.kind}' (allowed: ${ALLOWED_INDIVIDUAL_MASTERY_KINDS.join(', ')})`
        });
      }
      if (e.taskId) {
        const linkedTask = tasks.find((t) => t.id === e.taskId);
        if (linkedTask && linkedTask.type === 'reflection') {
          errors.push({
            code: 'ERR_INVALID_MASTERY_SOURCE',
            path: `${evPath}.taskId`,
            message: `Evidence '${e.id}' counts for mastery but is attached to reflection task '${linkedTask.id}'; reflection/self-assessment cannot count for mastery`
          });
        }
      }
    }
  }

  // 11. Objective LO Coverage, Evidence Coverage & Recheck (ERR_LO_NOT_COVERED, ERR_EVIDENCE_COVERAGE, ERR_RECHECK_MISSING)
  const minIndividualEvidence =
    masteryPolicy && typeof masteryPolicy.individualEvidencePerObjectiveMin === 'number'
      ? masteryPolicy.individualEvidencePerObjectiveMin
      : 2;

  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    const objPath = `objectives[${i}]`;

    // Tasks covering objective
    const coveringTasks = tasks.filter(
      (t) => Array.isArray(t.objectiveIds) && t.objectiveIds.includes(obj.id)
    );
    if (coveringTasks.length === 0) {
      errors.push({
        code: 'ERR_LO_NOT_COVERED',
        path: `${objPath}.id`,
        message: `Objective '${obj.id}' has no covering learning tasks`
      });
    }

    // Evidence covering objective
    const coveringEvidences = evidenceRules.filter(
      (e) => Array.isArray(e.objectiveIds) && e.objectiveIds.includes(obj.id)
    );

    const hasPrecheck = coveringEvidences.some(
      (e) => e.kind === 'precheck' || e.kind === 'initialThinking'
    );

    const hasFormationOrPractice = coveringEvidences.some((e) => {
      if (['individual_reasoning', 'group_product', 'teacher_observation', 'practice'].includes(e.kind)) {
        return true;
      }
      const linkedTask = tasks.find((t) => t.id === e.taskId);
      if (linkedTask) {
        const linkedAct = activities.find((a) => a.id === linkedTask.activityId);
        if (linkedAct && ['formation', 'practice', 'guided'].includes(linkedAct.phase)) {
          return true;
        }
      }
      return false;
    });

    const individualCount = coveringEvidences.filter((e) => e.individual === true).length;

    if (!hasPrecheck || !hasFormationOrPractice || individualCount < minIndividualEvidence) {
      errors.push({
        code: 'ERR_EVIDENCE_COVERAGE',
        path: `${objPath}.id`,
        message: `Objective '${obj.id}' missing required evidence coverage (precheck=${hasPrecheck}, formation/practice=${hasFormationOrPractice}, individualRecords=${individualCount}/${minIndividualEvidence})`
      });
    }

    // Independent mastery evidence must come from an individual task, two distinct tasks, and countsForMastery true
    const masteryEvidences = coveringEvidences.filter((e) => e.countsForMastery === true && e.individual === true);
    const distinctMasteryTasks = new Set();
    for (const me of masteryEvidences) {
      if (me.taskId) {
        const linkedTask = tasks.find((t) => t.id === me.taskId);
        if (linkedTask && linkedTask.participation === 'individual' && linkedTask.type !== 'reflection') {
          distinctMasteryTasks.add(linkedTask.id);
        }
      }
    }

    if (distinctMasteryTasks.size < minIndividualEvidence) {
      errors.push({
        code: 'ERR_EVIDENCE_COVERAGE',
        path: `${objPath}.id`,
        message: `Objective '${obj.id}' requires at least ${minIndividualEvidence} distinct individual tasks with countsForMastery: true (found ${distinctMasteryTasks.size})`
      });
    }

    const hasIndividualRecheck = coveringEvidences.some(
      (e) => (e.kind === 'individual_recheck' || e.kind === 'independent_recheck') && e.individual === true
    );
    if (!hasIndividualRecheck) {
      errors.push({
        code: 'ERR_RECHECK_MISSING',
        path: `${objPath}.id`,
        message: `Objective '${obj.id}' is missing required individual_recheck evidence`
      });
    }
  }

  // 12. Domain-Specific LO Assertions: T11.18 finite/infinite and T11.19 representations
  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    const objPath = `objectives[${i}]`;
    const coveringTasks = tasks.filter(
      (t) => Array.isArray(t.objectiveIds) && t.objectiveIds.includes(obj.id)
    );

    // T11.18: finite/infinite distinction
    const independentTasks = coveringTasks.filter(task => task.participation === 'individual' && task.type !== 'reflection' && !['support', 'extension'].includes(task.branch));
    const needsFiniteInfinite =
      obj.code === 'T11.18' ||
      obj.requiresFiniteInfiniteDistinction === true ||
      obj.metadata?.requiresFiniteInfiniteDistinction === true;

    if (needsFiniteInfinite) {
      if (['finite', 'infinite'].some(type => !independentTasks.some(task => task.sequenceType === type || task.sequenceType === 'both' || Array.isArray(task.sequenceTypes) && task.sequenceTypes.includes(type) || typeof task.domain === 'string' && task.domain.includes(type) || task.metadata?.sequenceType === type))) {
        errors.push({ code: 'ERR_INDEPENDENT_OBJECTIVE_COVERAGE', path: `${objPath}.code`, message: 'Finite/infinite distinction requires independent individual tasks covering both aspects' });
      }
      const hasFinite = coveringTasks.some((t) => {
        if (t.sequenceType) return t.sequenceType === 'finite' || t.sequenceType === 'both';
        if (Array.isArray(t.sequenceTypes)) return t.sequenceTypes.includes('finite');
        return t.domain?.includes('finite') || t.metadata?.sequenceType === 'finite';
      });

      const hasInfinite = coveringTasks.some((t) => {
        if (t.sequenceType) return t.sequenceType === 'infinite' || t.sequenceType === 'both';
        if (Array.isArray(t.sequenceTypes)) return t.sequenceTypes.includes('infinite');
        return t.domain?.includes('infinite') || t.metadata?.sequenceType === 'infinite';
      });

      if (!hasFinite || !hasInfinite) {
        errors.push({
          code: 'ERR_MISSING_FINITE_INFINITE_DISTINCTION',
          path: `${objPath}.code`,
          message: `Objective '${obj.code}' must cover both finite and infinite sequence distinctions (finite=${hasFinite}, infinite=${hasInfinite})`
        });
      }
    }

    // T11.19: four representations
    const needsRepresentations =
      obj.code === 'T11.19' ||
      obj.requiresRepresentations === true ||
      obj.metadata?.requiresRepresentations === true;

    if (needsRepresentations) {
      const repsCovered = new Set();
      const independentReps = new Set();
      for (const t of coveringTasks) {
        const taskReps = [];
        if (t.representation) taskReps.push(t.representation);
        if (Array.isArray(t.representations)) {
          taskReps.push(...t.representations);
        }
        if (t.evaluation?.checkerId === 'representation_match' && t.evaluation.answerKey) {
          const keys = Object.keys(t.evaluation.answerKey);
          for (const k of keys) {
            if (k.includes('list')) taskReps.push('list');
            if (k.includes('explicit')) taskReps.push('explicit');
            if (k.includes('recurrence')) taskReps.push('recurrence');
            if (k.includes('verbal')) taskReps.push('verbal');
          }
        }
        taskReps.forEach(rep => { repsCovered.add(rep); if (independentTasks.includes(t)) independentReps.add(rep === 'explicit_formula' ? 'explicit' : rep); });
      }
      if (['list', 'explicit', 'recurrence', 'verbal'].some(rep => !independentReps.has(rep))) errors.push({ code: 'ERR_INDEPENDENT_OBJECTIVE_COVERAGE', path: `${objPath}.code`, message: 'Four sequence representations require independent individual tasks covering every aspect' });

      const hasList = repsCovered.has('list');
      const hasExplicit = repsCovered.has('explicit') || repsCovered.has('explicit_formula');
      const hasRecurrence = repsCovered.has('recurrence');
      const hasVerbal = repsCovered.has('verbal');

      if (!hasList || !hasExplicit || !hasRecurrence || !hasVerbal) {
        errors.push({
          code: 'ERR_MISSING_REPRESENTATIONS',
          path: `${objPath}.code`,
          message: `Objective '${obj.code}' must cover all four representations: list, explicit, recurrence, verbal (found: ${Array.from(repsCovered).join(', ')})`
        });
      }
    }
  }

  // 13. KaTeX Syntax & Delimiter Scanning (ERR_KATEX_SYNTAX)
  scanKaTeX(pkg.essentialQuestion, 'essentialQuestion', errors);
  if (pkg.rubric) {
    (pkg.rubric.criteria || []).forEach((c, idx) => scanKaTeX(c, `rubric.criteria[${idx}]`, errors));
    (pkg.rubric.lookFor || []).forEach((l, idx) => scanKaTeX(l, `rubric.lookFor[${idx}]`, errors));
  }
  activities.forEach((a, i) => {
    scanKaTeX(a.studentAction, `activities[${i}].studentAction`, errors);
    scanKaTeX(a.expectedProduct, `activities[${i}].expectedProduct`, errors);
    scanKaTeX(a.teacherLookFor, `activities[${i}].teacherLookFor`, errors);
    scanKaTeX(a.transition, `activities[${i}].transition`, errors);
  });
  tasks.forEach((t, i) => {
    scanKaTeX(t.prompt, `tasks[${i}].prompt`, errors);
    scanKaTeX(t.supportRationale, `tasks[${i}].supportRationale`, errors);
    scanKaTeX(t.expectedProduct, `tasks[${i}].expectedProduct`, errors);
    if (t.inputSchema) {
      if (Array.isArray(t.inputSchema.options)) {
        t.inputSchema.options.forEach((opt, oIdx) => {
          if (opt && typeof opt.label === 'string') {
            scanKaTeX(opt.label, `tasks[${i}].inputSchema.options[${oIdx}].label`, errors);
          }
        });
      }
      if (Array.isArray(t.inputSchema.representations)) {
        t.inputSchema.representations.forEach((r, rIdx) => {
          if (r && typeof r.label === 'string') {
            scanKaTeX(r.label, `tasks[${i}].inputSchema.representations[${rIdx}].label`, errors);
          }
        });
      }
      if (Array.isArray(t.inputSchema.cards)) {
        t.inputSchema.cards.forEach((c, cIdx) => {
          if (c && typeof c.label === 'string') {
            scanKaTeX(c.label, `tasks[${i}].inputSchema.cards[${cIdx}].label`, errors);
          }
        });
      }
    }
    if (t.evaluation) {
      if (typeof t.evaluation.answerKey === 'string') {
        scanKaTeX(t.evaluation.answerKey, `tasks[${i}].evaluation.answerKey`, errors);
      }
      if (Array.isArray(t.evaluation.options)) {
        t.evaluation.options.forEach((opt, oIdx) => scanKaTeX(opt, `tasks[${i}].evaluation.options[${oIdx}]`, errors));
      }
      if (t.evaluation.rubric) {
        (t.evaluation.rubric.criteria || []).forEach((c, cIdx) => scanKaTeX(c, `tasks[${i}].evaluation.rubric.criteria[${cIdx}]`, errors));
        (t.evaluation.rubric.lookFor || []).forEach((l, lIdx) => scanKaTeX(l, `tasks[${i}].evaluation.rubric.lookFor[${lIdx}]`, errors));
      }
    }
  });
  hints.forEach((h, i) => {
    scanKaTeX(h.text, `hints[${i}].text`, errors);
    scanKaTeX(h.supportRationale, `hints[${i}].supportRationale`, errors);
  });

  return {
    ok: errors.length === 0,
    errors
  };
}
