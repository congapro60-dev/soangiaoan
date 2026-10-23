import JSZip from 'jszip';
import { decodeMathTypeEquation } from './mathType';

export interface ExtractedDocxEquation {
  relationshipId: string;
  objectPath: string;
  latex: string;
}

export interface ExtractedDocxLessonSource {
  text: string;
  equations: ExtractedDocxEquation[];
}

const decodeXml = (value: string): string => value.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_match, code: string) =>
  String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const attr = (tag: string, name: string): string | null => {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`).exec(tag);
  return match?.[1] ?? null;
};

const normalizeTarget = (target: string): string => {
  if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('/') || target.includes('..')) {
    throw new Error('DOCX_MATH_RELATIONSHIP_INVALID');
  }
  const value = `word/${target.replaceAll('\\', '/')}`;
  if (!value.startsWith('word/embeddings/')) throw new Error('DOCX_MATH_RELATIONSHIP_INVALID');
  return value;
};

const readRelationships = (xml: string): Map<string, string> => {
  const result = new Map<string, string>();
  for (const match of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(match[0], 'Id'); const target = attr(match[0], 'Target');
    const type = attr(match[0], 'Type');
    if (id && target && type?.endsWith('/oleObject')) result.set(id, normalizeTarget(target));
  }
  return result;
};

export const extractDocxLessonSource = async (input: ArrayBuffer | Uint8Array): Promise<ExtractedDocxLessonSource> => {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(input); } catch { throw new Error('DOCX_ZIP_INVALID'); }
  const documentFile = zip.file('word/document.xml');
  const relationshipFile = zip.file('word/_rels/document.xml.rels');
  if (!documentFile || !relationshipFile) throw new Error('DOCX_DOCUMENT_XML_MISSING');
  const xml = await documentFile.async('string');
  if (/<m:oMath(?:Para)?\b/.test(xml)) throw new Error('DOCX_MATH_OMML_UNSUPPORTED');
  const relationships = readRelationships(await relationshipFile.async('string'));
  const equations: ExtractedDocxEquation[] = [];
  const chunks: string[] = [];
  const tokens = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<\/w:p\s*>|<\/w:tc\s*>|<o:OLEObject\b[^>]*(?:\/>|>[\s\S]*?<\/o:OLEObject>)/g;
  for (const match of xml.matchAll(tokens)) {
    const token = match[0];
    if (match[1] !== undefined) chunks.push(decodeXml(match[1]));
    else if (/^<w:tab/.test(token)) chunks.push('\t');
    else if (/^<w:br/.test(token)) chunks.push('\n');
    else if (/^<\/w:(?:p|tc)/.test(token)) chunks.push('\n');
    else {
      if (attr(token, 'ProgID') !== 'Equation.DSMT4') continue;
      const relationshipId = attr(token, 'r:id');
      if (!relationshipId) throw new Error('DOCX_MATH_RELATIONSHIP_MISSING');
      const objectPath = relationships.get(relationshipId);
      if (!objectPath) throw new Error(`DOCX_MATH_RELATIONSHIP_MISSING:${relationshipId}`);
      const file = zip.file(objectPath);
      if (!file) throw new Error(`DOCX_MATH_OBJECT_MISSING:${objectPath}`);
      const bytes = await file.async('uint8array');
      let latex: string;
      try {
        latex = decodeMathTypeEquation(bytes);
      } catch (error) {
        throw new Error(`DOCX_MATH_DECODE_FAILED:${objectPath}:${String(error)}`);
      }
      equations.push({ relationshipId, objectPath, latex });
      chunks.push(`$${latex}$`);
    }
  }
  return { text: chunks.join('').replace(/\n{3,}/g, '\n\n').trim(), equations };
};
