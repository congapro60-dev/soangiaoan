import { describe, expect, it } from 'vitest';
import { lookupTvMedia } from './mediaManifest';

describe('lookupTvMedia', () => {
  it('returns whiteboard media for 10-5-31 / S0 (P00 opening cue)', () => {
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
    expect(entry!.videoSrc).toBe('/media/g10-w5-p31-p00-whiteboard.mp4');
    expect(entry!.posterSrc).toBe('/media/g10-w5-p31-p00-whiteboard.png');
    expect(entry!.altText).toContain('Bảng trắng');
  });

  it('returns null for 10-5-31 / S1 (only the opening cue carries media)', () => {
    expect(lookupTvMedia('10-5-31', 'S1')).toBeNull();
  });

  it('returns null for unknown definitionKey', () => {
    expect(lookupTvMedia('99-9-99', 'S0')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(lookupTvMedia('', 'S0')).toBeNull();
    expect(lookupTvMedia('10-5-31', '')).toBeNull();
  });

  it('isolates entries — only S0 returns media, other screens do not', () => {
    expect(lookupTvMedia('10-5-31', 'S0')).not.toBeNull();
    expect(lookupTvMedia('10-5-31', 'S1')).toBeNull();
    expect(lookupTvMedia('10-5-31', 'S4')).toBeNull();
    expect(lookupTvMedia('10-5-31', 'S10')).toBeNull();
  });

  it('media entry has both video and poster sources for fallback', () => {
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
    expect(entry!.videoSrc).toBeTruthy();
    expect(entry!.posterSrc).toBeTruthy();
  });

  it('running status policy — manifest does not change based on status (component controls playback)', () => {
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
  });
});
