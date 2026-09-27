import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import type { AppData } from '../../types';
import type { ClassReportQuestionSource } from './questionCatalog';
import { readQuestionCatalogFromSources } from './questionSourceReader';

const settings = {
  selectedProvider: 'gemini',
  geminiApiKey: 'test-key',
} as AppData['settings'];

const source = (name: string, url = `https://example.test/${name}`): ClassReportQuestionSource => ({
  name,
  url,
  mimeType: name.endsWith('.pdf') ? 'application/pdf' : undefined,
});

const depsFor = (readSourceFile: (file: File) => Promise<{ text: string; images: string[]; note: string }>, ocr = vi.fn()) => ({
  fetch: vi.fn(async () => new Response(new Blob(['source']), { status: 200 })),
  readSourceFile,
  ocr: async (images: string[], activeSettings: AppData['settings'], questionNumbers?: readonly string[]) => ocr(images, activeSettings, questionNumbers),
});

describe('questionSourceReader', () => {
  it('ưu tiên catalog từ chữ đã lưu và không gọi mạng hay OCR khi đã đủ câu', async () => {
    const fetch = vi.fn();
    const ocr = vi.fn();

    const result = await readQuestionCatalogFromSources({
      sources: [source('de.pdf')],
      questionNumbers: ['Câu 1'],
      sourceText: 'Câu 1: Giải $x+1=0$.',
      settings,
    }, { ...depsFor(async () => ({ text: '', images: [], note: '' }), ocr), fetch });

    expect(result.catalog).toEqual([{ questionNumber: 'Câu 1', content: 'Giải $x+1=0$.' }]);
    expect(result.mode).toBe('text');
    expect(fetch).not.toHaveBeenCalled();
    expect(ocr).not.toHaveBeenCalled();
  });

  it('đọc được câu hỏi từ chữ trong PDF hoặc Word mà không cần OCR', async () => {
    const ocr = vi.fn();
    const result = await readQuestionCatalogFromSources({
      sources: [source('de.pdf')],
      questionNumbers: ['Câu 1', 'Câu 2'],
      settings,
    }, depsFor(async () => ({
      text: 'Câu 1: Tính $a+b$.\nCâu 2: Tính $a-b$.',
      images: [],
      note: 'Đã đọc chữ',
    }), ocr));

    expect(result.catalog).toEqual([
      { questionNumber: 'Câu 1', content: 'Tính $a+b$.' },
      { questionNumber: 'Câu 2', content: 'Tính $a-b$.' },
    ]);
    expect(result.mode).toBe('text');
    expect(ocr).not.toHaveBeenCalled();
  });

  it('gửi ảnh đề và trang PDF scan tới Vision khi không có lớp chữ', async () => {
    const ocr = vi.fn((_images: string[], _activeSettings: AppData['settings']) =>
      Promise.resolve('Câu 1: Giải $x^2-1=0$.'));
    const image = 'data:image/png;base64,c2Nhbg==';
    const result = await readQuestionCatalogFromSources({
      sources: [source('de-scan.pdf')],
      questionNumbers: ['Câu 1'],
      settings,
    }, depsFor(async () => ({ text: '', images: [image], note: 'PDF scan' }), ocr));

    expect(result.catalog).toEqual([{ questionNumber: 'Câu 1', content: 'Giải $x^2-1=0$.' }]);
    expect(result.mode).toBe('ocr');
    expect(ocr).toHaveBeenCalledWith([image], settings, ['Câu 1']);
  });

  it('đặt đúng phần mở rộng cho nguồn ảnh có MIME wildcard', async () => {
    const image = 'data:image/jpeg;base64,c2Nhbg==';
    const readSourceFile = vi.fn(async (file: File) => {
      expect(file.name).toMatch(/\.jpg$/u);
      return { text: '', images: [image], note: 'Ảnh đề' };
    });
    const ocr = vi.fn(async () => 'Câu 1: Tính $x$.');
    const result = await readQuestionCatalogFromSources({
      sources: [{ name: 'Ảnh đề trang 1', url: 'https://example.test/page-1', mimeType: 'image/*' }],
      questionNumbers: ['Câu 1'],
      settings,
    }, {
      ...depsFor(readSourceFile, ocr),
      fetch: vi.fn(async () => new Response(new Blob(['image']), { status: 200 })),
    });

    expect(result.catalog).toEqual([{ questionNumber: 'Câu 1', content: 'Tính $x$.' }]);
    expect(ocr).toHaveBeenCalledOnce();
  });

  it('lấy ảnh nhúng trong DOCX để OCR khi Word không có lớp chữ', async () => {
    const zip = new JSZip();
    zip.file('word/media/image1.png', Uint8Array.from([137, 80, 78, 71]));
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const ocr = vi.fn((_images: string[], _activeSettings: AppData['settings']) =>
      Promise.resolve('Câu 1: Tính $S=ab$.'));
    const result = await readQuestionCatalogFromSources({
      sources: [source('de-anh.docx')],
      questionNumbers: ['Câu 1'],
      settings,
    }, {
      ...depsFor(async () => ({ text: '', images: [], note: 'Word không có lớp chữ' }), ocr),
      fetch: vi.fn(async () => new Response(bytes, { status: 200 })),
    });

    expect(result.catalog).toEqual([{ questionNumber: 'Câu 1', content: 'Tính $S=ab$.' }]);
    expect(result.mode).toBe('ocr');
    expect(ocr).toHaveBeenCalledTimes(1);
    expect(ocr.mock.calls[0][0][0]).toMatch(/^data:image\/png;base64,/u);
  });

  it('giữ cảnh báo và không làm mất nguồn khi file không tải được', async () => {
    const result = await readQuestionCatalogFromSources({
      sources: [source('de.pdf')],
      questionNumbers: ['Câu 1'],
      settings,
    }, {
      ...depsFor(async () => ({ text: '', images: [], note: '' })),
      fetch: vi.fn(async () => { throw new Error('mạng bị ngắt'); }),
    });

    expect(result.catalog).toEqual([]);
    expect(result.mode).toBe('empty');
    expect(result.warnings).toContain('de.pdf: mạng bị ngắt');
  });

  it('báo rõ khi câu còn thiếu nhưng bài không có nguồn đề để đọc thêm', async () => {
    const result = await readQuestionCatalogFromSources({
      sources: [],
      questionNumbers: ['Câu 1'],
      settings,
    }, depsFor(async () => ({ text: '', images: [], note: '' })));

    expect(result.catalog).toEqual([]);
    expect(result.warnings).toContain('Bài giao chưa có nguồn đề gốc dạng PDF, Word hoặc ảnh để đọc câu hỏi.');
  });

  it('không quay vô hạn khi nguồn đề treo mạng', async () => {
    vi.useFakeTimers();
    try {
      const resultPromise = readQuestionCatalogFromSources({
        sources: [source('de-treo.pdf')],
        questionNumbers: ['Câu 1'],
        settings,
      }, {
        ...depsFor(async () => ({ text: '', images: [], note: '' })),
        fetch: vi.fn(async () => new Promise<Response>(() => undefined)),
      });

      await vi.advanceTimersByTimeAsync(20_000);
      const result = await resultPromise;
      expect(result.catalog).toEqual([]);
      expect(result.warnings.some(warning => warning.includes('quá thời gian'))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('báo các nhãn vẫn chưa đọc chắc chắn sau OCR thay vì coi là đã đủ', async () => {
    const result = await readQuestionCatalogFromSources({
      sources: [source('de-scan.pdf')],
      questionNumbers: ['Câu 1', 'Câu 2'],
      settings,
    }, {
      ...depsFor(async () => ({ text: '', images: ['data:image/png;base64,c2Nhbg=='], note: '' }), vi.fn(async () => 'Câu 1: Tính $x$.')),
    });

    expect(result.catalog).toEqual([{ questionNumber: 'Câu 1', content: 'Tính $x$.' }]);
    expect(result.warnings.some(warning => warning.includes('Câu 2'))).toBe(true);
  });
});
