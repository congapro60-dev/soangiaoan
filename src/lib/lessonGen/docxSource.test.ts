import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractDocxLessonSource } from './docxSource';

const sample = 'docs/source-specs/v88/ban-toan-template/THT_G11_Gioi_han_cua_day_so.docx';

describe('source-bound DOCX math extraction', () => {
  it('restores every MathType equation in its original text position without changing the upload bytes', async () => {
    const bytes = readFileSync(sample); const before = Buffer.from(bytes);
    const result = await extractDocxLessonSource(bytes);
    expect(bytes).toEqual(before);
    expect(result.equations).toHaveLength(63);
    expect(result.text).toContain('Con tính giới hạn $\\lim_{n\\to +\\infty }\\left(3-\\frac{1}{n}\\right)$ bằng cách nào?');
    expect(result.text).toContain('Cho hai dãy số $\\left(u_{n}\\right)$ và $\\left(v_{n}\\right)$');
    expect(result.text).toContain('$u_{n}=2+\\frac{1}{n}$');
    expect(result.text).toContain('$v_{n}=3-\\frac{2}{n}$');
    expect(result.equations[0]).toMatchObject({ relationshipId: 'rId2', objectPath: 'word/embeddings/oleObject57.bin' });
    for (const equation of result.equations) expect(result.text).toContain(`$${equation.latex}$`);
  }, 15000);

  it('rejects a missing OLE payload rather than returning formula-free text', async () => {
    const zip = await JSZip.loadAsync(readFileSync(sample));
    zip.remove('word/embeddings/oleObject57.bin');
    await expect(extractDocxLessonSource(await zip.generateAsync({ type: 'uint8array' })))
      .rejects.toThrow(/oleObject57.bin/);
  });

  it('does not follow an external relationship or a path outside the DOCX word part', async () => {
    for (const target of ['https://example.invalid/equation.bin', '../../equation.bin']) {
      const zip = await JSZip.loadAsync(readFileSync(sample));
      const relationships = await zip.file('word/_rels/document.xml.rels')!.async('string');
      zip.file('word/_rels/document.xml.rels', relationships.replace('Target="embeddings/oleObject57.bin"', `Target="${target}"`));
      await expect(extractDocxLessonSource(await zip.generateAsync({ type: 'uint8array' })))
        .rejects.toThrow(/DOCX_MATH_RELATIONSHIP_INVALID/);
    }
  });

  it('fails closed for native OMML until its conversion path is implemented', async () => {
    const zip = await JSZip.loadAsync(readFileSync(sample));
    const xml = await zip.file('word/document.xml')!.async('string');
    zip.file('word/document.xml', xml.replace('</w:body>', '<m:oMath><m:r><m:t>x</m:t></m:r></m:oMath></w:body>'));
    await expect(extractDocxLessonSource(await zip.generateAsync({ type: 'uint8array' })))
      .rejects.toThrow('DOCX_MATH_OMML_UNSUPPORTED');
  });

  it('skips a non-MathType OLE object instead of treating it as an equation', async () => {
    const zip = await JSZip.loadAsync(readFileSync(sample));
    const xml = await zip.file('word/document.xml')!.async('string');
    zip.file('word/document.xml', xml.replace('ProgID="Equation.DSMT4"', 'ProgID="Excel.Sheet"'));
    const result = await extractDocxLessonSource(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.equations).toHaveLength(62);
  });

  it('accepts a paired OLE closing tag', async () => {
    const zip = await JSZip.loadAsync(readFileSync(sample));
    const xml = await zip.file('word/document.xml')!.async('string');
    zip.file('word/document.xml', xml.replace('ProgID="Equation.DSMT4"', 'ProgID="Equation.DSMT4"').replace('/></w:pict>', '></o:OLEObject></w:pict>'));
    await expect(extractDocxLessonSource(await zip.generateAsync({ type: 'uint8array' }))).resolves.toMatchObject({ equations: expect.any(Array) });
  });
});
