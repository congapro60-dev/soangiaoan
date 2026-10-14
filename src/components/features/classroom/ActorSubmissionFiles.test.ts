import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixtures = vi.hoisted(() => ({ pdf: vi.fn(), compress: vi.fn() }));
vi.mock('../../../utils/pdfToImages', () => ({ pdfToImages: fixtures.pdf }));
vi.mock('../../../utils/imageCompress', () => ({ nenAnhBaiLam: fixtures.compress }));
import { prepareActorFiles } from './ActorSubmissionUpload';
beforeEach(() => { fixtures.pdf.mockReset().mockResolvedValue(['data:image/jpeg;base64,YQ==', 'data:image/jpeg;base64,Yg==']); fixtures.compress.mockReset().mockResolvedValue('data:image/jpeg;base64,Yw=='); });
describe('nộp hộ PDF/ảnh đủ bằng chứng để chấm', () => {
  it('PDF thành mọi trang ảnh cùng PDF gốc; grant nhận ảnh, không chỉ PDF', async () => {
    const original = new File(['pdf content'], 'baithi.pdf', { type: 'application/pdf' });
    const result = await prepareActorFiles([original]);
    expect(result.map(file => file.type)).toEqual(['image/jpeg', 'image/jpeg', 'application/pdf']);
    expect(result.map(file => file.name)).toEqual(['baithi.pdf-trang-1.jpg', 'baithi.pdf-trang-2.jpg', 'baithi.pdf']);
    expect(await result[2].text()).toBe('pdf content');
    expect(fixtures.pdf).toHaveBeenCalledWith(original, undefined, false, undefined, { maxPages: 11, rejectOverflow: true });
  });
  it('ảnh dùng bộ nén hiện có; cộng tệp PDF gốc vào giới hạn 12, không âm thầm cắt trang', async () => {
    const image = new File(['img'], 'paper.png', { type: 'image/png' });
    const result = await prepareActorFiles([image, new File(['pdf'], 'scan.pdf', { type: 'application/pdf' })]);
    expect(fixtures.compress).toHaveBeenCalledWith(image); expect(result[0].type).toBe('image/jpeg');
    expect(fixtures.pdf.mock.calls[0][4]).toMatchObject({ maxPages: 10, rejectOverflow: true });
    fixtures.pdf.mockRejectedValueOnce(new Error('PDF có quá nhiều trang.'));
    await expect(prepareActorFiles([new File(['pdf'], 'full.pdf', { type: 'application/pdf' })])).rejects.toThrow('quá nhiều trang');
    expect(await result[0].text()).toBe('c');
  });
  it('từ chối tệp rỗng/loại sai/quá nhiều; bộ giải mã trả lỗi không nộp thiếu bài', async () => {
    await expect(prepareActorFiles([new File([], 'empty.jpg', { type: 'image/jpeg' })])).rejects.toThrow('20 MB');
    await expect(prepareActorFiles([new File(['bad'], 'notes.txt', { type: 'text/plain' })])).rejects.toThrow('chỉ nhận');
    await expect(prepareActorFiles(Array.from({ length: 13 }, () => new File(['x'], 'paper.jpg', { type: 'image/jpeg' })))).rejects.toThrow('12 tệp');
    fixtures.pdf.mockResolvedValueOnce([]);
    await expect(prepareActorFiles([new File(['pdf'], 'empty.pdf', { type: 'application/pdf' })])).rejects.toThrow('Không đọc được trang');
  });
});
