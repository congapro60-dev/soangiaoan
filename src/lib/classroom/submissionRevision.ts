import type { SubmissionAttachment } from './types.js';

export interface SubmissionEvidenceInput {
  fileUrls: readonly string[];
  attachments?: readonly SubmissionAttachment[];
  textContent?: string;
}

export interface MergedSubmissionEvidence {
  fileUrls: string[];
  attachments: SubmissionAttachment[];
  textContent: string;
}

const kindForUrl = (url: string): SubmissionAttachment['kind'] => {
  if (/\.pdf(?:$|\?)/i.test(url)) return 'pdf';
  if (/\.docx?(?:$|\?)/i.test(url)) return 'document';
  return 'image';
};

/** Ghép revision theo thứ tự cũ trước mới; URL trùng chỉ giữ một bản. */
export const mergeSubmissionEvidence = (
  previous: SubmissionEvidenceInput,
  incoming: SubmissionEvidenceInput,
): MergedSubmissionEvidence => {
  const fileUrls = [...previous.fileUrls, ...incoming.fileUrls]
    .map(url => String(url || '').trim())
    .filter(Boolean)
    .filter((url, index, all) => all.indexOf(url) === index);
  const metadata = new Map<string, SubmissionAttachment>();
  for (const attachment of [...(previous.attachments || []), ...(incoming.attachments || [])]) {
    const url = String(attachment?.url || '').trim();
    if (url && !metadata.has(url)) metadata.set(url, { ...attachment, url });
  }
  const attachments = fileUrls.map((url, index) => metadata.get(url) || {
    name: `Tệp ${index + 1}`,
    url,
    kind: kindForUrl(url),
  });
  const textContent = [previous.textContent, incoming.textContent]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n\n');
  return { fileUrls, attachments, textContent };
};
