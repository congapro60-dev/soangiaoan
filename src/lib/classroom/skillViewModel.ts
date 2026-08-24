import { SKILL_CATALOG } from '../learning/skillCatalog';
import type { SkillEvidenceSource, StudentSkillState } from '../learning/skillTypes';

export interface StudentSkillCard {
  skillId: string;
  title: string;
  status: StudentSkillState['status'];
  statusLabel: string;
  trend: StudentSkillState['trend'];
  trendLabel: string;
  sourceLabel: string;
  masteryPercent: number;
  confidencePercent: number;
  evidenceCount: number;
}

const STATUS_LABEL: Record<StudentSkillState['status'], string> = {
  not_seen: 'Chưa có dữ liệu',
  weak: 'Cần củng cố',
  developing: 'Đang phát triển',
  mastered: 'Đã nắm vững',
  advanced: 'Vận dụng tốt',
};

const SOURCE_LABEL: Record<SkillEvidenceSource, string> = {
  homework: 'Bài đã được giáo viên duyệt',
  practice: 'Luyện tập',
  transfer: 'Bài vận dụng',
};

const clampPercent = (value: number): number => Math.round(Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100);

const trendLabel = (state: StudentSkillState): string => {
  if (state.evidenceCount === 0 || state.status === 'not_seen') return 'Chưa đủ dữ liệu';
  if (state.trend === 'up') return 'Đang tiến bộ';
  if (state.trend === 'down') return 'Cần theo dõi';
  return 'Ổn định';
};

export const buildStudentSkillCards = (states: readonly StudentSkillState[] | undefined): StudentSkillCard[] => {
  if (!states?.length) return [];

  return states.flatMap(state => {
    const definition = SKILL_CATALOG.find(skill => skill.skillId === state.skillId);
    if (!definition) return [];

    const sources = [...new Set(state.sourceKinds.map(source => SOURCE_LABEL[source]).filter(Boolean))];
    return [{
      skillId: state.skillId,
      title: definition.title,
      status: state.status,
      statusLabel: STATUS_LABEL[state.status],
      trend: state.trend,
      trendLabel: trendLabel(state),
      sourceLabel: sources.length > 0 ? sources.join(' · ') : 'Chưa có minh chứng',
      masteryPercent: clampPercent(state.masteryEstimate),
      confidencePercent: clampPercent(state.confidence),
      evidenceCount: Math.max(0, Math.trunc(state.evidenceCount || 0)),
    }];
  });
};
