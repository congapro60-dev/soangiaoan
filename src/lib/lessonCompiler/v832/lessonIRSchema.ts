import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import schema from './lesson-ir-v8.3.2.schema.json';
import type { LessonIRV832 } from './lessonIR.generated';

export type LessonIRV83 = LessonIRV832;

export interface LessonIRSchemaIssue {
  path: string;
  keyword: string;
  message: string;
}

export interface LessonIRSchemaResult {
  valid: boolean;
  issues: LessonIRSchemaIssue[];
}

const validator = new Ajv2020({ allErrors: true, allowUnionTypes: true }).compile(schema);

const issuePath = (error: ErrorObject): string => error.keyword === 'required'
  ? `${error.instancePath}/${String(error.params.missingProperty).replace(/~/g, '~0').replace(/\//g, '~1')}`
  : error.instancePath || '/';

export const validateLessonIRSchema = (value: unknown): LessonIRSchemaResult => {
  const valid = validator(value);
  return {
    valid,
    issues: valid ? [] : (validator.errors ?? []).map(error => ({
      path: issuePath(error),
      keyword: error.keyword,
      message: error.message ?? 'Không khớp Lesson IR 8.3.2.',
    })),
  };
};

export const isLessonIRV83 = (value: unknown): value is LessonIRV83 => validator(value);
