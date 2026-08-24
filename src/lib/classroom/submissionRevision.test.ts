import { describe, expect, it } from 'vitest';
import { mergeSubmissionEvidence } from './submissionRevision';

describe('submissionRevision', () => {
  it('ghép evidence cũ trước mới, loại URL trùng và nối text', () => {
    const merged = mergeSubmissionEvidence(
      {
        fileUrls: ['old-1', 'old-2'],
        attachments: [{ name: 'old-1.jpg', url: 'old-1', kind: 'image' }],
        textContent: 'Phần cũ',
      },
      {
        fileUrls: ['new-1', 'old-2'],
        attachments: [{ name: 'new-1.jpg', url: 'new-1', kind: 'image' }],
        textContent: 'Phần mới',
      },
    );

    expect(merged.fileUrls).toEqual(['old-1', 'old-2', 'new-1']);
    expect(merged.attachments?.map(file => file.url)).toEqual(['old-1', 'old-2', 'new-1']);
    expect(merged.textContent).toBe('Phần cũ\n\nPhần mới');
  });
});
