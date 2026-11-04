import { LiveLessonRichText } from '../LiveLessonRichText';

const fieldLabels: Record<string, string> = {
  mode: 'Kiểu tiêu chí', criteria: 'Tiêu chí', sourceBasis: 'Nguồn căn cứ',
  acceptEquivalent: 'Cho phép cách trả lời tương đương',
  acceptEquivalentRepresentations: 'Chấp nhận cách biểu diễn tương đương',
  fullCredit: 'Đạt đầy đủ', partialCredit: 'Đạt một phần',
  key: 'Đáp án theo hàng', exactMatrixKey: 'Đáp án ma trận',
  rationale: 'Lí do', classificationCriterion: 'Tiêu chí phân loại',
  doNotRequireFinalTheoremBeforeTool: 'Không cần nêu định lí trước khi dùng công cụ',
  note: 'Ghi chú',
};

const modeLabels: Record<string, string> = {
  look_for: 'Dấu hiệu cần quan sát', expected_response: 'Câu trả lời mong đợi',
  conjecture_look_for: 'Dấu hiệu trong dự đoán', pattern_look_for: 'Dấu hiệu nhận ra quy luật',
  structured_true_false_matrix: 'Ma trận đúng/sai',
};

export const CoachExpectedContent = ({ value, contextKey }: { value: unknown; contextKey?: string }) => {
  if (contextKey === 'mode' && typeof value === 'string' && modeLabels[value]) {
    return <span>{modeLabels[value]}</span>;
  }
  if (typeof value === 'string') return <LiveLessonRichText text={value} />;
  if (typeof value === 'number') return <span>{String(value)}</span>;
  if (typeof value === 'boolean') return <span data-boolean={String(value)}>
    {contextKey === 'key' || contextKey === 'exactMatrixKey' ? (value ? 'Đúng' : 'Sai')
      : contextKey ? (value ? 'Có' : 'Không') : String(value)}
  </span>;
  if (Array.isArray(value)) return <ol className="v832-coach-expected-list">{value.map((item, index) =>
    <li key={index}><CoachExpectedContent value={item} contextKey={contextKey} /></li>)}</ol>;
  if (value !== null && typeof value === 'object') return <dl className="v832-coach-structured">
    {Object.entries(value).map(([key, entry]) => <div key={key}>
      <dt>{fieldLabels[key] ?? key}</dt>
      <dd><CoachExpectedContent value={entry} contextKey={key} /></dd>
    </div>)}
  </dl>;
  return <span>Chưa xác định</span>;
};
