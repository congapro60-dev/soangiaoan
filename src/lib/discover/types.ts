export type DiscoverGrade = '10' | '11' | '12';

export interface DiscoverNewKnowledgeSeed {
  id: string;
  sheet: `G${DiscoverGrade}`;
  grade: DiscoverGrade;
  row: number;
  week: number | null;
  period: number | string | null;
  subject?: string | null;
  month?: string | null;
  title: string;
  detail: string;
  text: string;
  kind: 'new_knowledge';
  sourceWorkbook: string;
}

export interface DiscoverSourceDraft {
  seedId: string;
  title: string;
  content: string;
  grade: string;
  week: string;
  sourceLabel: string;
}

export interface StudentDiscoverCatalogItem {
  id: string;
  title: string;
  grade: DiscoverGrade;
  week: number | null;
  period: number | string | null;
  status: 'available';
}
