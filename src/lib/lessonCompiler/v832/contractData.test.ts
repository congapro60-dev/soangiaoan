import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lessonIrV832Schema } from './lessonIRSchemaData';
import { lessonValidatorContractV11 } from './lessonValidatorContractData';

/**
 * Hai module `.ts` dữ liệu là bản rã của JSON chuẩn để lambda Vercel không phụ thuộc
 * import attribute JSON (compiler của Vercel làm rơi `with { type: 'json' }`).
 * Test này chặn hai bản lệch nhau: JSON chuẩn là nguồn duy nhất, đổi JSON mà quên
 * sinh lại TS (hoặc ngược lại) thì đỏ tại đây trước khi tới production.
 */
const here = dirname(fileURLToPath(import.meta.url));
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('v8.3.2 contract data mirrors canonical JSON', () => {
  it('lessonIRSchemaData khớp từng byte với lesson-ir-v8.3.2.schema.json', () => {
    const canonical = resolve(here, 'lesson-ir-v8.3.2.schema.json');
    expect(JSON.parse(readFileSync(canonical, 'utf8'))).toEqual(lessonIrV832Schema);
    expect(sha256(canonical)).toBe(
      '60bf770f31b7b6c5f346b283fcee48751a646a14214981da2f840677f33e6f41',
    );
  });

  it('lessonValidatorContractData khớp từng byte với CIS_TDS_Lesson_Validator_v1.1.json', () => {
    const canonical = resolve(here, 'CIS_TDS_Lesson_Validator_v1.1.json');
    expect(JSON.parse(readFileSync(canonical, 'utf8'))).toEqual(lessonValidatorContractV11);
    expect(sha256(canonical)).toBe(
      '155919c6daef4699be5158b5930f74967b8cd950f06509c46cc1f667d92496de',
    );
  });
});
