/** Loại báo cáo phụ huynh — tách riêng, không phụ thuộc gì, để máy chủ dùng chung. */
/** `custom` = phụ huynh tự chọn khoảng ngày trên cổng /ph; KHÔNG nằm trong `REPORT_KINDS` nên giáo viên không chọn/công bố được. */
export type ReportKind = 'month' | 'gk1' | 'ck1' | 'gk2' | 'ck2' | 'year' | 'custom';

export const REPORT_KINDS: ReadonlyArray<{ kind: ReportKind; label: string }> = [
  { kind: 'month', label: 'Báo cáo tháng' },
  { kind: 'gk1', label: 'Giữa học kì I' },
  { kind: 'ck1', label: 'Cuối học kì I' },
  { kind: 'gk2', label: 'Giữa học kì II' },
  { kind: 'ck2', label: 'Cuối học kì II' },
  { kind: 'year', label: 'Cả năm học' },
];
