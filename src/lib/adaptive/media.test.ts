import { describe, expect, it } from 'vitest';
import {
  normalizeApprovedMedia,
  renderNativeMedia,
  type LessonMediaRef,
} from './media';
import { adaptiveLessonToDeweyContent } from './adaptiveToDewey';
import { renderBodyHtml } from '../dewey/template';
import { buildBanToanV4AdaptiveLessonDraft } from '../liveLesson/v4/adaptiveDraft';

const baseMedia = (overrides: Partial<LessonMediaRef> = {}): Record<string, unknown> => ({
  id: 'media-1',
  kind: 'image',
  url: '/media/cap-so-cong.png',
  altText: 'Minh hoạ cấp số cộng',
  status: 'approved',
  version: 1,
  ...overrides,
});

describe('normalizeApprovedMedia', () => {
  it.each(['image', 'video', 'audio'] as const)('accepts an approved %s reference', (kind) => {
    const media = normalizeApprovedMedia(baseMedia({ kind, purpose: 'preparation', objectiveIds: ['obj-1'], unitId: 'unit-1' }));

    expect(media).toMatchObject({
      id: 'media-1',
      kind,
      altText: 'Minh hoạ cấp số cộng',
      objectiveIds: ['obj-1'],
      unitId: 'unit-1',
      purpose: 'preparation',
      version: 1,
      status: 'approved',
    });
  });

  it('keeps optional caption and transcript URLs when safe', () => {
    const media = normalizeApprovedMedia(baseMedia({
      kind: 'video',
      captionUrl: '/media/cap-so-cong.vtt',
      transcriptUrl: 'https://cdn.example.test/cap-so-cong.txt',
    }));

    expect(media).toMatchObject({
      captionUrl: '/media/cap-so-cong.vtt',
      transcriptUrl: 'https://cdn.example.test/cap-so-cong.txt',
    });
  });

  it.each([
    { label: 'missing alt text', input: baseMedia({ altText: '   ' }) },
    { label: 'unapproved status', input: baseMedia({ status: 'draft' }) },
    { label: 'javascript media URL', input: baseMedia({ url: 'javascript:alert(1)' }) },
    { label: 'data media URL', input: baseMedia({ url: 'data:image/png;base64,AAAA' }) },
    { label: 'javascript caption URL', input: baseMedia({ captionUrl: 'javascript:alert(1)' }) },
  ])('rejects $label', ({ input }) => {
    expect(normalizeApprovedMedia(input)).toBeNull();
  });
});

describe('renderNativeMedia', () => {
  it('renders safe native video markup with captions, transcript link, and text fallback', () => {
    const media = normalizeApprovedMedia(baseMedia({
      kind: 'video',
      url: '/media/cap-so-cong.mp4',
      captionUrl: '/media/cap-so-cong.vtt',
      transcriptUrl: '/media/cap-so-cong.txt',
    }));

    expect(media).not.toBeNull();
    const html = renderNativeMedia(media!);

    expect(html).toContain('<video');
    expect(html).toContain('controls');
    expect(html).toContain('preload="metadata"');
    expect(html).toContain('<track');
    expect(html).toContain('href="/media/cap-so-cong.txt"');
    expect(html).toContain('Trình duyệt không hỗ trợ phát video');
    expect(html).not.toContain('<script');
  });

  it('renders image and audio as native elements', () => {
    const image = normalizeApprovedMedia(baseMedia());
    const audio = normalizeApprovedMedia(baseMedia({
      id: 'audio-1',
      kind: 'audio',
      url: '/media/cap-so-cong.mp3',
      altText: 'Lời giải thích cấp số cộng',
    }));

    expect(renderNativeMedia(image!)).toContain('<img');
    expect(renderNativeMedia(audio!)).toContain('<audio');
    expect(renderNativeMedia(audio!)).toContain('preload="metadata"');
  });
});

describe('adaptive Dewey media integration', () => {
  it('renders only approved manifest media in the native Dewey path', () => {
    const lesson = buildBanToanV4AdaptiveLessonDraft('10-5-31', 'teacher-qa');
    const content = adaptiveLessonToDeweyContent({
      ...lesson,
      mediaManifest: [baseMedia({
        kind: 'video',
        url: '/media/cap-so-cong.mp4',
        captionUrl: '/media/cap-so-cong.vtt',
        transcriptUrl: '/media/cap-so-cong.txt',
      }) as unknown as LessonMediaRef],
    });
    const html = renderBodyHtml(content);

    expect(content.engage.media?.[0]).toMatchObject({ element: 'video', src: '/media/cap-so-cong.mp4' });
    expect(html).toContain('<video');
    expect(html).toContain('preload="metadata"');
    expect(html).toContain('/media/cap-so-cong.vtt');
    expect(html).toContain('/media/cap-so-cong.txt');
    expect(html).not.toContain('javascript:');
  });
});
