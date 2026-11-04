import { beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ count: 2, document: { numPages: 2, getPage: vi.fn(), destroy: vi.fn() }, getDocument: vi.fn(), canvas: { height: 0, width: 0, getContext: vi.fn(), toDataURL: vi.fn() } }));
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, version: 'test', getDocument: f.getDocument }));
import { pdfToImages } from './pdfToImages';
beforeEach(() => {
  f.document.numPages = 2; f.document.getPage.mockReset().mockResolvedValue({ getViewport: () => ({ width: 10, height: 20 }), render: () => ({ promise: Promise.resolve() }) });
  f.document.destroy.mockReset().mockResolvedValue(undefined); f.getDocument.mockReset().mockReturnValue({ promise: Promise.resolve(f.document) });
  f.canvas.getContext.mockReturnValue({}); f.canvas.toDataURL.mockReturnValue('data:image/jpeg;base64,YQ==');
  vi.stubGlobal('document', { createElement: () => f.canvas });
});
describe('PDF pure renderer', () => {
  it('proxy render tất cả trang và giải phóng bộ nhớ', async () => {
    f.document.numPages = 8;
    const images = await pdfToImages(new File(['pdf'], 'paper.pdf'), undefined, false, undefined, { maxPages: 11, rejectOverflow: true });
    expect(images).toHaveLength(8); expect(f.document.getPage).toHaveBeenNthCalledWith(8, 8); expect(f.document.destroy).toHaveBeenCalledOnce(); expect(f.canvas.width).toBe(0);
  });
  it('quá số tệp chặn trước khi vẽ; vẫn giải phóng tài liệu; mặc định import cũ còn sáu trang', async () => {
    f.document.numPages = 12;
    await expect(pdfToImages(new File(['pdf'], 'long.pdf'), undefined, false, undefined, { maxPages: 11, rejectOverflow: true })).rejects.toThrow('12 trang');
    expect(f.document.getPage).not.toHaveBeenCalled(); expect(f.document.destroy).toHaveBeenCalledOnce();
    expect(await pdfToImages(new File(['pdf'], 'legacy.pdf'))).toHaveLength(6);
  });
  it('lỗi canvas không âm thầm bỏ một trang', async () => {
    f.canvas.getContext.mockReturnValueOnce(null);
    await expect(pdfToImages(new File(['pdf'], 'paper.pdf'))).rejects.toThrow('chưa hỗ trợ'); expect(f.document.destroy).toHaveBeenCalledOnce();
  });
  // Bài làm in sẵn: bản 72 DPI + JPEG 0,4 làm mất dấu bôi màu và chỉ số dưới của công thức.
  it('maxCanh phóng trang cho tới mốc cạnh dài, quality đổi chất lượng JPEG', async () => {
    const viewports: number[] = [];
    f.document.getPage.mockReset().mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => { viewports.push(scale); return { width: 10 * scale, height: 20 * scale }; },
      render: () => ({ promise: Promise.resolve() }),
    });
    await pdfToImages(new File(['pdf'], 'paper.pdf'), undefined, false, undefined, { maxCanh: 100, quality: 0.72 });
    // Trang 10x20 → scale 5 bị chặn ở 3 (không phóng quá tay).
    expect(viewports).toEqual([1, 3, 1, 3]);
    expect(f.canvas.toDataURL).toHaveBeenLastCalledWith('image/jpeg', 0.72);
    expect(f.canvas.width).toBe(0);
  });
});
