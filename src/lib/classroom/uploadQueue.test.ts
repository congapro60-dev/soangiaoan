import { describe, expect, it } from 'vitest';

import { appendPendingFiles, removePendingFile } from './uploadQueue';

const fakeFile = (name: string) => ({ name } as File);

describe('homework upload queue', () => {
  it('keeps files when camera is opened again instead of submitting the first file', () => {
    const first = fakeFile('trang-1.jpg');
    const second = fakeFile('trang-2.jpg');

    const afterFirstCapture = appendPendingFiles([], [first], 10);
    const afterSecondCapture = appendPendingFiles(afterFirstCapture, [second], 10);

    expect(afterFirstCapture).toEqual([first]);
    expect(afterSecondCapture).toEqual([first, second]);
  });

  it('caps appended files without mutating the existing queue', () => {
    const first = fakeFile('trang-1.jpg');
    const second = fakeFile('trang-2.jpg');
    const third = fakeFile('trang-3.jpg');
    const existing = [first];

    expect(appendPendingFiles(existing, [second, third], 2)).toEqual([first, second]);
    expect(existing).toEqual([first]);
  });

  it('removes one file while preserving the order of the remaining files', () => {
    const files = [fakeFile('trang-1.jpg'), fakeFile('trang-2.jpg'), fakeFile('trang-3.jpg')];

    expect(removePendingFile(files, 1)).toEqual([files[0], files[2]]);
    expect(removePendingFile(files, 99)).toEqual(files);
  });
});
