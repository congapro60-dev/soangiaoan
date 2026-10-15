export type DiscoverGrade = '10' | '11' | '12';

export interface DiscoverNewKnowledgeSeed {
  id: string;
  sheet: `G${DiscoverGrade}`;
  grade: DiscoverGrade;
  row: number;
  week: number | null;
  period: number | string | null;
  text: string;
  kind: 'new_knowledge';
  sourceWorkbook: string;
}

export interface DiscoverSourceDraft {
  title: string;
  content: string;
  grade: string;
  week: string;
  sourceLabel: string;
}
