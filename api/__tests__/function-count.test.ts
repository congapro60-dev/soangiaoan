import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Vercel Hobby cho tối đa 12 Serverless Functions mỗi deployment, và nó đếm MỌI file `.ts` trong `api/` mà tên
 * (file hoặc thư mục cha) KHÔNG bắt đầu bằng `_` — kể cả file test và file phụ trợ. Vượt là CẢ deployment lỗi
 * `exceeded_serverless_functions_per_deployment` (đã xảy ra 2026-09-30 vì một file test nằm thẳng trong `api/`).
 */
const HOBBY_LIMIT = 12;
const API_DIR = new URL('..', import.meta.url);

const deployable = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return deployable(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });

describe('số Vercel Function', () => {
  const root = API_DIR.pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const files = deployable(root).map(file => relative(root, file).split('\\').join('/')).sort();

  it(`không quá ${HOBBY_LIMIT} (gói Hobby)`, () => {
    expect(files.length, `Đang có ${files.length} hàm:\n${files.join('\n')}`).toBeLessThanOrEqual(HOBBY_LIMIT);
  });

  it('không file test nào nằm thẳng trong api/ — test vào __tests__, helper đặt tên bắt đầu bằng _', () => {
    expect(files.filter(file => /\.test\.ts$/.test(file))).toEqual([]);
  });
});
