import { escapeAttribute, escapeHtml } from '../dewey/htmlShell';

export type LessonMediaKind = 'image' | 'video' | 'audio';
export type LessonMediaStatus = 'draft' | 'approved' | 'rejected' | 'archived';
export type LessonMediaPurpose =
  | 'preparation'
  | 'remediation'
  | 'self_paced'
  | 'context'
  | 'explanation'
  | 'misconception'
  | 'worked_example'
  | 'summary';

export interface LessonMediaRef {
  id: string;
  kind: LessonMediaKind;
  url: string;
  altText: string;
  status: LessonMediaStatus;
  version: number;
  captionUrl?: string;
  transcriptUrl?: string;
  objectiveIds?: string[];
  unitId?: string;
  purpose?: LessonMediaPurpose;
}

export interface NativeMediaDescriptor {
  element: LessonMediaKind;
  src: string;
  alt: string;
  controls?: true;
  preload?: 'metadata';
  captionUrl?: string;
  transcriptUrl?: string;
}

const SAFE_URL_RE = /^(?:https?:\/\/|\/(?!\/)|\.\.?\/)/i;
const BLOCKED_PROTOCOL_RE = /^(?:javascript|data|vbscript):/i;

const safeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || BLOCKED_PROTOCOL_RE.test(url) || url.startsWith('//')) return null;
  return SAFE_URL_RE.test(url) ? url : null;
};

const nonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result || null;
};

const stringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
  return result.length ? result : undefined;
};

export function normalizeApprovedMedia(input: unknown): LessonMediaRef | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const id = nonEmptyString(raw.id);
  const altText = nonEmptyString(raw.altText);
  const url = safeUrl(raw.url);
  const kind = raw.kind;
  const status = raw.status;
  const version = raw.version;
  if (
    !id ||
    !altText ||
    !url ||
    (kind !== 'image' && kind !== 'video' && kind !== 'audio') ||
    status !== 'approved' ||
    !Number.isInteger(version) ||
    (version as number) < 1
  ) {
    return null;
  }

  const captionUrl = raw.captionUrl === undefined ? undefined : safeUrl(raw.captionUrl);
  const transcriptUrl = raw.transcriptUrl === undefined ? undefined : safeUrl(raw.transcriptUrl);
  if ((raw.captionUrl !== undefined && !captionUrl) || (raw.transcriptUrl !== undefined && !transcriptUrl)) return null;

  const objectiveIds = stringArray(raw.objectiveIds);
  const unitId = nonEmptyString(raw.unitId) ?? undefined;
  const purpose = nonEmptyString(raw.purpose) as LessonMediaPurpose | null;

  return {
    id,
    kind,
    url,
    altText,
    status,
    version: version as number,
    ...(captionUrl ? { captionUrl } : {}),
    ...(transcriptUrl ? { transcriptUrl } : {}),
    ...(objectiveIds ? { objectiveIds } : {}),
    ...(unitId ? { unitId } : {}),
    ...(purpose ? { purpose } : {}),
  };
}

export function toNativeMediaDescriptor(media: LessonMediaRef): NativeMediaDescriptor {
  return {
    element: media.kind,
    src: media.url,
    alt: media.altText,
    ...(media.kind !== 'image' ? { controls: true as const, preload: 'metadata' as const } : {}),
    ...(media.captionUrl ? { captionUrl: media.captionUrl } : {}),
    ...(media.transcriptUrl ? { transcriptUrl: media.transcriptUrl } : {}),
  };
}

export function renderNativeMedia(media: LessonMediaRef): string {
  return renderNativeMediaDescriptor(toNativeMediaDescriptor(media));
}

export function renderNativeMediaDescriptor(descriptor: NativeMediaDescriptor): string {
  const alt = escapeAttribute(descriptor.alt);
  const src = escapeAttribute(descriptor.src);
  const transcript = descriptor.transcriptUrl
    ? `<a href="${escapeAttribute(descriptor.transcriptUrl)}" target="_blank" rel="noopener">Xem bản chép lời</a>`
    : '';
  const caption = descriptor.captionUrl
    ? `<track kind="captions" src="${escapeAttribute(descriptor.captionUrl)}" srclang="vi" label="Phụ đề">`
    : '';
  if (descriptor.element === 'image') {
    return `<figure class="lesson-media lesson-media-image"><img src="${src}" alt="${alt}">${transcript ? `<figcaption>${transcript}</figcaption>` : ''}</figure>`;
  }

  const fallback = descriptor.element === 'video'
    ? 'Trình duyệt không hỗ trợ phát video.'
    : 'Trình duyệt không hỗ trợ phát âm thanh.';
  const element = descriptor.element === 'video'
    ? `<video src="${src}" controls preload="metadata" aria-label="${alt}">${caption}${escapeHtml(fallback)}</video>`
    : `<audio src="${src}" controls preload="metadata" aria-label="${alt}">${escapeHtml(fallback)}</audio>`;
  return `<figure class="lesson-media lesson-media-${descriptor.element}">${element}${transcript ? `<figcaption>${transcript}</figcaption>` : ''}</figure>`;
}
