export interface TvMediaEntry {
  videoSrc: string;
  posterSrc: string;
  altText: string;
}

const MEDIA_MANIFEST = new Map<string, Map<string, TvMediaEntry>>();

function registerMedia(definitionKey: string, screenId: string, entry: TvMediaEntry): void {
  let screenMap = MEDIA_MANIFEST.get(definitionKey);
  if (!screenMap) {
    screenMap = new Map();
    MEDIA_MANIFEST.set(definitionKey, screenMap);
  }
  screenMap.set(screenId, entry);
}

registerMedia('10-5-31', 'S1', {
  videoSrc: '/media/g10-w5-p31-p00-whiteboard.mp4',
  posterSrc: '/media/g10-w5-p31-p00-whiteboard.png',
  altText: 'Bảng trắng bài học Bất phương trình bậc nhất hai ẩn — Tiết 1',
});

export function lookupTvMedia(definitionKey: string, screenId: string): TvMediaEntry | null {
  if (!definitionKey || !screenId) return null;
  const screenMap = MEDIA_MANIFEST.get(definitionKey);
  return screenMap?.get(screenId) ?? null;
}
