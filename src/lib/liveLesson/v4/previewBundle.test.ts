import { describe, expect, it } from 'vitest';
import { getG10P31V4Contract } from '../../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import { buildLiveLessonDefinitionFromV4 } from './runtimeDefinition';
import {
  assertPreviewPrivacy,
  buildPreviewManifest,
  buildPreviewModel,
  buildPreviewZipEntries,
  buildSyntheticCueStats,
  formulaToText,
  renderPreviewHtml,
} from './previewBundle';

const def = buildLiveLessonDefinitionFromV4(getG10P31V4Contract());
const model = buildPreviewModel(def, '10-5-31');

describe('formulaToText', () => {
  it('converts common LaTeX commands to Unicode and strips $ delimiters', () => {
    expect(formulaToText('$15x + 10y \\le 150$')).toBe('15x + 10y ≤ 150');
    expect(formulaToText('a \\ge b \\times c')).toBe('a ≥ b × c');
    expect(formulaToText('3x + 2y ≤ 30')).toBe('3x + 2y ≤ 30');
  });
});

describe('buildPreviewModel (from live runtime definition)', () => {
  it('has one preview cue per definition cue, in order', () => {
    expect(model.cues.length).toBe(def.cues.length);
    expect(model.cues.map((c) => c.cueId)).toEqual(def.cues.map((c) => c.id));
    model.cues.forEach((c, i) => expect(c.order).toBe(i));
  });

  it('carries the corrected per-cue TV titles', () => {
    const byCue = new Map(model.cues.map((c) => [c.cueId, c]));
    expect(byCue.get('P00')!.tv.title).toBe('TÌNH HUỐNG BÁNH NƯỚC');
    expect(byCue.get('P16')!.tv.title).toBe('AI ERROR OF THE WEEK');
    expect(byCue.get('P38')!.tv.title).toBe('EXIT TICKET');
  });

  it('attaches media only to the opening cue P00', () => {
    const byCue = new Map(model.cues.map((c) => [c.cueId, c]));
    expect(byCue.get('P00')!.media).not.toBeNull();
    expect(byCue.get('P16')!.media).toBeNull();
    expect(byCue.get('P27')!.media).toBeNull();
  });

  it('includes a response prompt only for cues that carry a checkpoint', () => {
    const byCue = new Map(model.cues.map((c) => [c.cueId, c]));
    expect(byCue.get('P16')!.student.responsePrompt).toBeTruthy(); // cp-ai-error
    expect(byCue.get('P00')!.student.responsePrompt).toBeUndefined(); // opening, no checkpoint
  });
});

describe('preview privacy', () => {
  it('the serialized model + manifest carry no private fields', () => {
    const serialized = JSON.stringify({ model, manifest: buildPreviewManifest(model) });
    expect(() => assertPreviewPrivacy(serialized)).not.toThrow();
  });

  it('the rendered HTML carries no teacherScript text', () => {
    const html = renderPreviewHtml(model);
    // A distinctive teacher-only phrase from the contract must not appear.
    expect(html).not.toContain('Xem đề xuất riêng, chọn Duyệt/Đổi nhóm');
    expect(() => assertPreviewPrivacy(html)).not.toThrow();
  });

  it('assertPreviewPrivacy throws when a private field is present', () => {
    expect(() => assertPreviewPrivacy('{"teacherScript":"..."}')).toThrow();
    expect(() => assertPreviewPrivacy('{"participantUid":"abc"}')).toThrow();
  });
});

describe('renderPreviewHtml self-containment', () => {
  const html = renderPreviewHtml(model, { posterDataUri: 'data:image/png;base64,AAAA' });

  it('is a standalone HTML document', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>');
  });

  it('references no external network resources (offline-safe)', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html.toLowerCase()).not.toContain('firebase');
    expect(html).not.toContain('cdnjs');
    expect(html).not.toContain('googleapis');
  });

  it('embeds the poster as a data URI and lists every cue', () => {
    expect(html).toContain('data:image/png;base64,AAAA');
    for (const cue of model.cues) expect(html).toContain(cue.cueId);
  });
});

describe('buildSyntheticCueStats (illustrative preview-only fixture)', () => {
  const byCue = new Map(model.cues.map((c) => [c.cueId, c]));
  it('shows AI error categories at P16 and routes at P30', () => {
    expect(buildSyntheticCueStats(byCue.get('P16')!)?.label).toBe('Phân loại lỗi AI');
    expect(buildSyntheticCueStats(byCue.get('P16')!)?.rows).toHaveLength(4);
    expect(buildSyntheticCueStats(byCue.get('P30')!)?.label).toBe('Tuyến M / S / C');
  });
  it('returns null for cues without a response step (e.g. P00 opening)', () => {
    expect(buildSyntheticCueStats(byCue.get('P00')!)).toBeNull();
  });
  it('is illustrative only — never written into the manifest', () => {
    expect(JSON.stringify(buildPreviewManifest(model))).not.toContain('minh họa');
  });
});

describe('preview navigation + labelled stats fixture in HTML', () => {
  const html = renderPreviewHtml(model, { posterDataUri: 'data:image/png;base64,AAAA' });
  it('has Prev/Next controls and a cue counter', () => {
    expect(html).toContain('id="prev"');
    expect(html).toContain('id="next"');
    expect(html).toContain('id="counter"');
  });
  it('labels the synthetic stats clearly as illustrative data', () => {
    expect(html).toContain('Dữ liệu minh họa');
    expect(html).toContain('id="tvStats"');
  });
  it('stays offline-safe with the new controls (no external network)', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html.toLowerCase()).not.toContain('firebase');
  });
});

describe('buildPreviewZipEntries', () => {
  it('contains a self-contained preview.html and manifest.json', () => {
    const entries = buildPreviewZipEntries(model);
    const names = entries.map((e) => e.name);
    expect(names).toContain('preview.html');
    expect(names).toContain('manifest.json');
    const html = entries.find((e) => e.name === 'preview.html')!.content as string;
    expect(html.startsWith('<!doctype html>')).toBe(true);
    const manifest = JSON.parse(entries.find((e) => e.name === 'manifest.json')!.content as string);
    expect(manifest.cueCount).toBe(model.cues.length);
  });

  it('adds a decoded poster file when a data URI is supplied', () => {
    const entries = buildPreviewZipEntries(model, 'data:image/png;base64,iVBORw0KGgo=');
    const poster = entries.find((e) => e.name === 'media/preview-poster.png');
    expect(poster).toBeTruthy();
    expect(poster!.content).toBeInstanceOf(Uint8Array);
    expect((poster!.content as Uint8Array).length).toBeGreaterThan(0);
  });

  it('omits the poster file when no poster is supplied', () => {
    const entries = buildPreviewZipEntries(model);
    expect(entries.some((e) => e.name.startsWith('media/'))).toBe(false);
  });
});

describe('buildPreviewManifest', () => {
  const manifest = buildPreviewManifest(model);
  it('summarises every cue with screen + media refs', () => {
    expect(manifest.schema).toBe('smartplan.tv-hs-preview.v1');
    expect(manifest.cueCount).toBe(model.cues.length);
    const p00 = manifest.cues.find((c) => c.cueId === 'P00')!;
    expect(p00.tvScreenId).toBe('S0');
    expect(p00.media).toBeTruthy();
    const p16 = manifest.cues.find((c) => c.cueId === 'P16')!;
    expect(p16.media).toBeNull();
    expect(p16.hasResponse).toBe(true);
    const p27 = manifest.cues.find((c) => c.cueId === 'P27')!;
    expect(p27.hasResponse).toBe(true);
    expect(p27.studentScreenId).toBe('HS7');
  });
});
