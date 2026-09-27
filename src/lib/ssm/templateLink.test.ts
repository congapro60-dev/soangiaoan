import { describe, expect, it } from 'vitest';
import { resolveTemplateUrl } from './templateLink';

const CDN = 'https://cdn-ssm.edufit.vn/export/evaluation/Template_Export_Score_11Columbus_VN%20TO%C3%81N_F1.xlsx';

describe('resolveTemplateUrl', () => {
  it('link CDN trực tiếp → giữ nguyên đường dẫn', () => {
    expect(resolveTemplateUrl(CDN)).toBe(CDN);
  });

  it('link xem Office → tách ?src= ra URL CDN thật', () => {
    const view = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(CDN) + '&wdOrigin=BROWSELINK';
    expect(resolveTemplateUrl(view)).toBe(CDN);
  });

  it('bỏ query/hash, chỉ giữ đường dẫn file', () => {
    expect(resolveTemplateUrl(CDN + '?x=1#y')).toBe(CDN);
  });

  it('từ chối host khác (chống tải URL bậy)', () => {
    expect(resolveTemplateUrl('https://evil.example/export/evaluation/a.xlsx')).toBeNull();
    expect(resolveTemplateUrl('https://cdn-ssm.edufit.vn.evil.com/export/evaluation/a.xlsx')).toBeNull();
  });

  it('từ chối đường dẫn ngoài /export/evaluation/ hoặc không .xlsx', () => {
    expect(resolveTemplateUrl('https://cdn-ssm.edufit.vn/secret/a.xlsx')).toBeNull();
    expect(resolveTemplateUrl('https://cdn-ssm.edufit.vn/export/evaluation/a.pdf')).toBeNull();
  });

  it('từ chối http (không https) và link Office trỏ host lạ', () => {
    expect(resolveTemplateUrl('http://cdn-ssm.edufit.vn/export/evaluation/a.xlsx')).toBeNull();
    const badView = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent('https://evil.example/a.xlsx');
    expect(resolveTemplateUrl(badView)).toBeNull();
  });

  it('rỗng / rác → null', () => {
    expect(resolveTemplateUrl('')).toBeNull();
    expect(resolveTemplateUrl('không phải link')).toBeNull();
  });
});
