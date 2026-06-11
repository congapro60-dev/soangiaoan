export type ExternalToolSource = 'congcutoanhoc' | 'giaovienai' | 'geogebra';
export type ExternalToolEmbedMode = 'iframe' | 'link' | 'modal';
export type ExternalToolUrlStatus = 'verified' | 'inferred';

export interface ExternalTool {
  id: string;
  name: string;
  url: string;
  source: ExternalToolSource;
  embedMode: ExternalToolEmbedMode;
  topic: string;
  gradeLevel: 10 | 11 | 12;
  license: string;
  author: string;
  notes?: string;
  urlStatus: ExternalToolUrlStatus;
  isEmbeddable?: boolean;
}

import externalToolsData from './externalToolsData.json';

export const EXTERNAL_TOOLS: ExternalTool[] = [
  ...externalToolsData.map(t => ({
    ...t,
    source: t.source as ExternalToolSource,
    embedMode: t.embedMode as ExternalToolEmbedMode,
    gradeLevel: t.gradeLevel as 10 | 11 | 12,
    urlStatus: 'verified' as ExternalToolUrlStatus
  })),
  {
    id: 'gamedoikhang',
    name: 'Đấu Trường Tri Thức (7 game đối kháng)',
    url: 'https://gamedoikhangpro.vercel.app/',
    source: 'giaovienai',
    embedMode: 'link',
    topic: 'on-tap',
    gradeLevel: 11,
    license: 'Trần Hoài Thanh — miễn phí',
    author: 'Trần Hoài Thanh',
    notes: 'X-Frame-Options: SAMEORIGIN — không nhúng được, chỉ mở tab mới.',
    urlStatus: 'verified',
    isEmbeddable: false
  }
];

export const getToolsByIds = (ids: string[]): ExternalTool[] =>
  ids.map(id => EXTERNAL_TOOLS.find(t => t.id === id)).filter((t): t is ExternalTool => t !== undefined);
