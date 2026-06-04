import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, 'wordExportA4.ts'), 'utf8');

describe('wordExportA4 OMML regression guard', () => {
  it('does not use ImportedXmlComponent.fromXmlString for OMML import', () => {
    // docx@9 converts xml-js document roots into an invalid <undefined> wrapper
    // when ImportedXmlComponent.fromXmlString() is used directly. Word then
    // reports the generated DOCX as corrupted. Keep this guard to prevent the
    // same export bug from being reintroduced during future refactors.
    expect(source).not.toContain('ImportedXmlComponent.fromXmlString');
  });

  it('keeps the explicit DOMParser -> ImportedXmlComponent conversion path', () => {
    expect(source).toContain('const importedXmlFromDomNode');
    expect(source).toContain('new ImportedXmlComponent(node.nodeName');
    expect(source).toContain("new DOMParser().parseFromString(xml, 'application/xml')");
  });
});
