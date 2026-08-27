import type {
  EvidenceVector,
  GroupPurpose,
  GroupingCheckpoint,
} from './types';
import type { StudentEvidence } from './evidence';

const MIN_GROUP_SIZE = 3;
const MAX_GROUP_SIZE = 4;

export interface GroupProposal {
  groupId: string;
  purpose: GroupPurpose;
  memberIds: string[];
  scaffold: string;
  reason: string;
}

interface GroupingInput {
  checkpoint: GroupingCheckpoint;
  students: StudentEvidence[];
  existingRoles?: Map<string, string>; // studentId -> last role assignment
}

function distinctActivityTypes(points: EvidenceVector['points']): Set<string> {
  const signals = new Set<string>();
  for (const point of points) {
    signals.add(point.signal);
  }
  return signals;
}

function hasHighConfidenceTeacherObservation(students: StudentEvidence[]): boolean {
  return students.some(s => s.vector.points.some(p => p.confidence >= 0.75));
}

function canProposeGrouping(input: GroupingInput): { ok: boolean; reason: string } {
  const allPoints = input.students.flatMap(s => s.vector.points);
  const recentPoints = allPoints.filter(p => {
    // Points are already filtered for staleness in evidence.ts; here we just check count
    return true;
  });

  if (recentPoints.length >= 2) {
    const activityTypes = distinctActivityTypes(recentPoints);
    if (activityTypes.size >= 2) {
      return { ok: true, reason: `${recentPoints.length} điểm bằng chứng từ ${activityTypes.size} loại hoạt động.` };
    }
  }

  if (hasHighConfidenceTeacherObservation(input.students)) {
    return { ok: true, reason: 'Có một nhận xét GV có độ tin cậy cao.' };
  }

  return {
    ok: false,
    reason: `Chỉ có ${recentPoints.length} điểm — cần ít nhất 2 điểm từ 2 loại hoạt động khác nhau hoặc 1 nhận xét GV confidence cao.`,
  };
}

function groupByStrength(students: StudentEvidence[]): {
  strong: StudentEvidence[];
  needWork: StudentEvidence[];
} {
  const strong: StudentEvidence[] = [];
  const needWork: StudentEvidence[] = [];

  for (const student of students) {
    const avg = student.vector.points.length > 0
      ? student.vector.points.reduce((sum, p) => sum + p.confidence, 0) / student.vector.points.length
      : 0;
    if (avg >= 0.55) {
      strong.push(student);
    } else {
      needWork.push(student);
    }
  }

  return { strong, needWork };
}

function buildSameNeedGroups(input: GroupingInput): GroupProposal[] {
  const { strong, needWork } = groupByStrength(input.students);
  const groups: GroupProposal[] = [];

  if (needWork.length >= MIN_GROUP_SIZE) {
    const chunk = needWork.slice(0, MAX_GROUP_SIZE);
    groups.push({
      groupId: `grp-ws-${chunk[0].participantUid}`,
      purpose: 'same_need_workshop',
      memberIds: chunk.map(s => s.participantUid),
      scaffold: 'Hình/khung câu/thuật ngữ đã chuẩn bị.',
      reason: `${chunk.length} HS có nhu cầu hỗ trợ tương tự.`,
    });
  }

  if (strong.length >= MIN_GROUP_SIZE && groups.length === 0) {
    const chunk = strong.slice(0, MAX_GROUP_SIZE);
    groups.push({
      groupId: `grp-en-${chunk[0].participantUid}`,
      purpose: 'same_need_workshop',
      memberIds: chunk.map(s => s.participantUid),
      scaffold: 'Ít gợi ý hơn, yêu cầu liên hệ hai biểu diễn.',
      reason: `${chunk.length} HS có nền tảng vững — cần thách thức phù hợp.`,
    });
  }

  return groups;
}

function buildMixedReasonGroups(input: GroupingInput): GroupProposal[] {
  const sorted = [...input.students].sort((a, b) => b.vector.confidence - a.vector.confidence);
  const groups: GroupProposal[] = [];

  for (let i = 0; i < sorted.length; i += MAX_GROUP_SIZE) {
    const chunk = sorted.slice(i, i + MAX_GROUP_SIZE);
    if (chunk.length < MIN_GROUP_SIZE) {
      continue;
    }
    groups.push({
      groupId: `grp-mixed-${chunk[0].participantUid}`,
      purpose: 'mixed_reasoning',
      memberIds: chunk.map(s => s.participantUid),
      scaffold: 'Thêm điều kiện, phản ví dụ hoặc yêu cầu chứng minh.',
      reason: `Nhóm đa dạng ${chunk.length} HS với thế mạnh khác nhau để giải thích và phản biện.`,
    });
  }

  return groups;
}

function ensureNoRoleRepeat(
  groups: GroupProposal[],
  existingRoles: Map<string, string>,
): GroupProposal[] {
  return groups.map(group => ({
    ...group,
    memberIds: group.memberIds.filter(id => {
      const lastRole = existingRoles.get(id);
      // Không loại bỏ — chỉ cảnh báo. Nếu GV đã gán role trước đó, giữ nguyên.
      return true;
    }),
  })).filter(group => group.memberIds.length >= MIN_GROUP_SIZE);
}

export function proposeGroups(input: GroupingInput): GroupProposal[] {
  if (input.students.length < MIN_GROUP_SIZE) {
    return [{
      groupId: 'default-mixed',
      purpose: 'teacher_defined',
      memberIds: input.students.map(s => s.participantUid),
      scaffold: 'Nhóm mặc định — GV quyết định nhiệm vụ.',
      reason: `Chỉ có ${input.students.length} HS — không đủ để chia nhóm theo chiến lược.`,
    }];
  }

  const eligibility = canProposeGrouping(input);
  if (!eligibility.ok) {
    return [{
      groupId: 'default-mixed',
      purpose: 'teacher_defined',
      memberIds: input.students.map(s => s.participantUid),
      scaffold: 'Nhóm mặc định — GV quyết định nhiệm vụ.',
      reason: eligibility.reason,
    }];
  }

  const existingRoles = input.existingRoles ?? new Map<string, string>();
  let groups: GroupProposal[];

  if (input.checkpoint.purpose === 'same_need_workshop') {
    groups = buildSameNeedGroups(input);
    if (groups.length === 0) {
      groups = buildMixedReasonGroups(input);
    }
  } else {
    groups = buildMixedReasonGroups(input);
  }

  return ensureNoRoleRepeat(groups, existingRoles);
}
