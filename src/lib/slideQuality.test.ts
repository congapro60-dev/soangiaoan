import { describe, it, expect } from 'vitest';
import { auditSlide, auditSlides, buildSlideRepairBrief, SLIDE_LIMITS, type SlideDraft } from './slideQuality';

const goodSlide: SlideDraft = {
  type: 'content',
  title: 'HĐ2: ĐỊNH LÝ CÔ-SIN',
  points: ['Phát biểu định lý $a^2 = b^2 + c^2 - 2bc\\cos A$', 'Áp dụng: tính cạnh khi biết 2 cạnh + góc xen giữa'],
  visualSuggestion: 'Tam giác ABC với các cạnh a, b, c',
};

describe('auditSlide', () => {
  it('slide đạt chuẩn thì không có finding', () => {
    expect(auditSlide(goodSlide, 0)).toHaveLength(0);
  });

  it('bắt tiêu đề quá dài', () => {
    const s: SlideDraft = { ...goodSlide, title: 'A'.repeat(SLIDE_LIMITS.maxTitleChars + 5) };
    expect(auditSlide(s, 0).some((f) => f.id === 'title-too-long')).toBe(true);
  });

  it('bắt quá nhiều bullet', () => {
    const s: SlideDraft = { ...goodSlide, points: Array.from({ length: SLIDE_LIMITS.maxBullets + 1 }, (_, i) => `Ý ${i}`) };
    expect(auditSlide(s, 0).some((f) => f.id === 'too-many-bullets')).toBe(true);
  });

  it('bắt bullet quá dài', () => {
    const s: SlideDraft = { ...goodSlide, points: ['x'.repeat(SLIDE_LIMITS.maxBulletChars + 10)] };
    expect(auditSlide(s, 0).some((f) => f.id === 'bullet-too-long')).toBe(true);
  });

  it('KHÔNG tính độ dài vùng công thức LaTeX vào bullet-too-long', () => {
    const formula = '$$' + 'x + '.repeat(60) + '1$$'; // rất dài nhưng toàn công thức
    const s: SlideDraft = { ...goodSlide, points: [`Công thức: ${formula}`] };
    expect(auditSlide(s, 0).some((f) => f.id === 'bullet-too-long')).toBe(false);
  });

  it('bắt thiếu visualSuggestion cho slide content, nhưng KHÔNG cho walt/wrapup', () => {
    const content: SlideDraft = { type: 'content', title: 'Nội dung', points: ['A'], visualSuggestion: '' };
    expect(auditSlide(content, 0).some((f) => f.id === 'missing-visual')).toBe(true);

    const walt: SlideDraft = { type: 'walt', title: 'Mục tiêu', points: ['A'], visualSuggestion: '' };
    expect(auditSlide(walt, 0).some((f) => f.id === 'missing-visual')).toBe(false);
  });
});

describe('auditSlides + buildSlideRepairBrief', () => {
  it('missing-visual là medium nên KHÔNG nằm trong blocking', () => {
    const slides: SlideDraft[] = [{ type: 'content', title: 'Nội dung', points: ['A'], visualSuggestion: '' }];
    const { findings, blocking } = auditSlides(slides);
    expect(findings.some((f) => f.id === 'missing-visual')).toBe(true);
    expect(blocking).toHaveLength(0);
  });

  it('brief rỗng khi không có lỗi blocking', () => {
    expect(buildSlideRepairBrief([goodSlide], [])).toBe('');
  });

  it('brief liệt kê đúng slide lỗi, giữ số lượng và đính kèm JSON', () => {
    const slides: SlideDraft[] = [
      goodSlide,
      { type: 'content', title: 'B'.repeat(SLIDE_LIMITS.maxTitleChars + 5), points: ['x'] },
    ];
    const { blocking } = auditSlides(slides);
    const brief = buildSlideRepairBrief(slides, blocking);
    expect(brief).toContain('Slide 2');
    expect(brief).toContain(String(slides.length));
    expect(brief).toContain('JSON');
  });
});
