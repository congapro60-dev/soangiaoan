import { describe, expect, it } from 'vitest';
import { lookupTvMedia } from './mediaManifest';

describe('lookupTvMedia', () => {
  it('returns whiteboard media for 10-5-31 / S1 (P00 maps to S1 per timeline)', () => {
    const entry = lookupTvMedia('10-5-31', 'S1');
    expect(entry).not.toBeNull();
    expect(entry!.videoSrc).toBe('/media/g10-w5-p31-p00-whiteboard.mp4');
    expect(entry!.posterSrc).toBe('/media/g10-w5-p31-p00-whiteboard.png');
    expect(entry!.altText).toContain('Bảng trắng');
  });

  it('returns null for 10-5-31 / S0 (S0 is not a media screen)', () => {
    expect(lookupTvMedia('10-5-31', 'S0')).toBeNull();
  });

  it('returns null for unknown definitionKey', () => {
    expect(lookupTvMedia('99-9-99', 'S1')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(lookupTvMedia('', 'S1')).toBeNull();
    expect(lookupTvMedia('10-5-31', '')).toBeNull();
  });

  it('isolates entries — S0 does not return media while S1 does', () => {
    const s0 = lookupTvMedia('10-5-31', 'S0');
    const s1 = lookupTvMedia('10-5-31', 'S1');
    expect(s0).toBeNull();
    expect(s1).not.toBeNull();
  });

  it('media entry has both video and poster sources for fallback', () => {
    const entry = lookupTvMedia('10-5-31', 'S1');
    expect(entry).not.toBeNull();
    expect(entry!.videoSrc).toBeTruthy();
    expect(entry!.posterSrc).toBeTruthy();
  });

  it('running status policy — manifest does not change based on status (component controls playback)', () => {
    const entry = lookupTvMedia('10-5-31', 'S1');
    expect(entry).not.toBeNull();
  });
});
