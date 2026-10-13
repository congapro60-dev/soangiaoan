import { computeObjectiveMastery } from './passport.js';

const list = (prefix, names) => Object.freeze(names.map(([id, name]) => Object.freeze({ id: prefix + id, name })));
export const EDUFIT_VALUES = Object.freeze([
  { id: 'integrity', name: 'Integrity', meaning: 'Trân trọng lời nói của mình; coi mình là gốc rễ của sự việc; trọn vẹn và hoàn tất' },
  { id: 'passion', name: 'Đam mê', meaning: 'Tự tin khám phá bản thân; kiên trì tìm tòi và trải nghiệm; nuôi dưỡng động lực nội tại; đổi mới sáng tạo để dẫn đầu thay đổi' },
  { id: 'generosity', name: 'Hào phóng', meaning: 'Tôn trọng sự khác biệt của mỗi cá nhân; suy nghĩ và hành động vì người khác trước; đóng góp cho cộng đồng xung quanh' },
  { id: 'lifelong-learning', name: 'Học tập suốt đời', meaning: 'Không ngừng học hỏi; tự học, học hỏi lẫn nhau, lan tỏa tinh thần học tập; dám thử nghiệm để tạo giá trị mới' },
].map(Object.freeze));
export const GLOBAL_ISSUES = list('global-', [['equality', 'công bằng xã hội và bình đẳng'], ['identity', 'bản sắc và sự đa dạng'], ['interdependence', 'toàn cầu hóa và sự phụ thuộc lẫn nhau'], ['sustainability', 'phát triển bền vững'], ['peace', 'hòa bình và xung đột'], ['rights', 'quyền con người']]);
export const GLOBAL_SKILLS = list('skill-', [['empathy', 'thấu cảm'], ['communication', 'giao tiếp'], ['critical-thinking', 'tư duy phản biện'], ['collaboration', 'hợp tác'], ['respect', 'hiểu sự khác biệt và tương tác tôn trọng']]);
export const GLOBAL_ATTITUDES = list('attitude-', [['confidence', 'tự tin tham gia'], ['responsibility', 'tham gia có trách nhiệm trong cộng đồng']]);
export const DIGITAL_TOPICS = list('digital-', [['balance', 'Cân bằng truyền thông & hạnh phúc'], ['privacy', 'Quyền riêng tư & an ninh'], ['footprint', 'Dấu chân số & danh tính'], ['relationships', 'Quan hệ & giao tiếp'], ['bullying', 'Bắt nạt mạng, drama số & ngôn từ thù ghét'], ['media', 'Hiểu biết tin tức & truyền thông']]);
export const WELLBEING_COMPONENTS = list('wellbeing-', [['physical', 'Sức khỏe thể chất'], ['psychological', 'Sức khỏe tâm lý'], ['relationships', 'Quan hệ tích cực'], ['agency', 'Năng lực bản thân & tự tin'], ['purpose', 'Ý nghĩa & mục đích']]);
export const LESSON_INTEGRATIONS = Object.freeze([...GLOBAL_ISSUES, ...DIGITAL_TOPICS, ...list('', [['real-world', 'Trải nghiệm thực tế'], ['ai', 'AI']])]);
export const AI_POLICIES = Object.freeze(['off', 'hints', 'check']);
export const REFLECTION_PROMPTS = Object.freeze(Object.fromEntries(Object.entries({
  'before-now': ['Trước em nghĩ…', 'Giờ em nghĩ… Điều gì khiến em đổi ý?'],
  'see-think-wonder': ['Em thấy điều gì? Em nghĩ dữ kiện đó nói lên điều gì?', 'Em còn thắc mắc điều gì và muốn kiểm tra bằng cách nào?'],
  'ai-disclosure': ['AI giúp gì?', 'Em kiểm tra và sửa gì trong gợi ý của AI?'],
  'real-world-kolb': ['Em đo hoặc đếm gì ngoài thực tế, nhận ra quy luật nào?', 'Em sẽ dùng quy luật đó để thử hoặc cải tiến điều gì?'],
  'cross-perspective': ['Hai người có thể nhìn tình huống này khác nhau thế nào?', 'Em cần hỏi hoặc kiểm chứng gì để hiểu và tôn trọng mỗi góc nhìn?'],
  'check-news': ['Tin này đến từ đâu; dữ kiện nào kiểm chứng được?', 'Em đối chiếu nguồn nào trước khi kết luận hoặc chia sẻ?'],
}).map(([id, prompts]) => [id, Object.freeze(prompts)])));
export const EYE_BREAK_REMINDER = 'Em hãy rời mắt khỏi màn hình, nhìn xa và vận động nhẹ; chọn lúc phù hợp để nghỉ trước khi tiếp tục.';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw Error(code); };
const text = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
function teacher(state, actor) {
  if (!state?.hostId || actor?.role !== 'teacher' || !text(actor.id, 128) || (actor.id !== state.hostId && actor.authorizedHostId !== state.hostId)) fail('FORBIDDEN');
}

export function sanitizeLessonIntegrations(input) {
  if (!Array.isArray(input) || input.length > 2 || new Set(input).size !== input.length || input.some(id => typeof id !== 'string' || !LESSON_INTEGRATIONS.some(item => item.id === id))) fail('INVALID_INTEGRATIONS');
  return [...input];
}

export function sanitizeValueReflection(input, policy = 'off') {
  if (!AI_POLICIES.includes(policy)) fail('INVALID_AI_POLICY');
  if (!object(input) || Object.keys(input).some(key => !['integrity', 'usedAI', 'aiHelp', 'ownChanges', 'reflection'].includes(key)) || typeof input.integrity !== 'boolean' || typeof input.usedAI !== 'boolean' || !['aiHelp', 'ownChanges', 'reflection'].every(key => typeof input[key] === 'string' && input[key].length <= 1000) || input.reflection.split(/\r\n?|\n/).length > 2 || (input.usedAI ? !input.aiHelp.trim() || !input.ownChanges.trim() : input.aiHelp.trim() || input.ownChanges.trim())) fail('INVALID_REFLECTION');
  // A forbidden use can still be disclosed truthfully; it never becomes independent evidence.
  return { integrity: input.integrity, usedAI: input.usedAI, aiHelp: input.aiHelp.trim(), ownChanges: input.ownChanges.trim(), reflection: input.reflection.trim() };
}

export function grantValueBadge(state, input, actor) {
  teacher(state, actor);
  if (!object(input) || Object.keys(input).some(key => !['learnerId', 'valueId', 'evidenceId', 'reason', 'now'].includes(key)) || !text(input.learnerId, 128) || !Object.hasOwn(state.roster || {}, input.learnerId) || !EDUFIT_VALUES.some(value => value.id === input.valueId) || !text(input.evidenceId, 128) || !text(input.reason, 500) || !Number.isSafeInteger(input.now) || input.now < 0) fail('INVALID_VALUE_BADGE');
  return { learnerId: input.learnerId, valueId: input.valueId, evidenceId: input.evidenceId.trim(), reason: input.reason.trim(), awardedAt: input.now, awardedBy: actor.id };
}

export function revokeValueBadge(state, badge, input, actor) {
  teacher(state, actor);
  if (!object(badge) || !object(input) || Object.keys(input).some(key => !['reason', 'now'].includes(key)) || !Object.hasOwn(state.roster || {}, badge.learnerId) || !EDUFIT_VALUES.some(value => value.id === badge.valueId) || !text(badge.evidenceId, 128) || !text(badge.reason, 500) || !text(badge.awardedBy, 128) || !Number.isSafeInteger(badge.awardedAt) || !text(input.reason, 500) || !Number.isSafeInteger(input.now) || input.now < badge.awardedAt) fail('INVALID_VALUE_BADGE');
  return { learnerId: badge.learnerId, valueId: badge.valueId, evidenceId: badge.evidenceId, reason: badge.reason, awardedAt: badge.awardedAt, awardedBy: badge.awardedBy, revokedAt: input.now, revokedBy: actor.id, revocationReason: input.reason.trim() };
}

// Teacher aggregate of available observations; no formal rubric level can be inferred from this JSON.
export function buildLessonQualityReport(state, actor) {
  teacher(state, actor);
  const learnerIds = Object.keys(state.roster || {}).filter(id => state.roster[id].present !== false);
  const pkg = state.package || {}, tasks = pkg.tasks || [];
  const rate = count => learnerIds.length ? count / learnerIds.length : null;
  const records = id => {
    const latest = new Map();
    for (const sub of state.passports?.[id]?.submissions || []) if (tasks.some(task => task.id === sub.taskId && task.participation === 'individual' && task.type !== 'reflection') && (!latest.has(sub.taskId) || (latest.get(sub.taskId).at || 0) <= (sub.at || 0))) latest.set(sub.taskId, sub);
    return [...latest.values()];
  };
  const objectives = (pkg.objectives || []).map(objective => {
    let withEvidence = 0, independentMastery = 0, supported = 0;
    for (const id of learnerIds) {
      const passport = state.passports?.[id];
      const own = records(id).filter(sub => tasks.some(task => task.id === sub.taskId && task.objectiveIds?.includes(objective.id)));
      if (own.some(sub => sub.assessmentStatus === 'assessed')) withEvidence++;
      const mastery = computeObjectiveMastery(passport, objective.id, pkg);
      if (mastery.status === 'independent_mastery') independentMastery++;
      if (mastery.supportedCount > 0) supported++;
    }
    return { objectiveId: objective.id, statement: objective.statement || '', withEvidence, independentMastery, supported, evidenceRate: rate(withEvidence) };
  });
  const pending = learnerIds.reduce((count, id) => count + records(id).filter(sub => sub.assessmentStatus === 'pending').length, 0);
  const contributed = new Set(Object.values(state.groups || {}).flatMap(activity => (activity.groups || []).flatMap(group => (group.contributions || []).filter(item => text(item.text, 20000) && learnerIds.includes(item.learnerId)).map(item => item.learnerId))));
  const reflected = learnerIds.filter(id => text(state.valueReflections?.[id]?.reflection, 1000) && Number.isFinite(state.valueReflections[id].submittedAt)).length;
  const criterion = (id, observed) => ({ id, status: observed ? 'observed' : 'missing' });
  return { kind: 'observed_evidence_summary', learners: learnerIds.length, objectives, pending,
    groupContribution: { learners: contributed.size, total: learnerIds.length, rate: rate(contributed.size) },
    reflection: { completed: reflected, total: learnerIds.length, rate: rate(reflected) },
    criteria: [criterion('higher_order_question', tasks.some(task => task.metadata?.higherOrder === true)), criterion('individual_and_group', tasks.some(task => task.participation === 'individual') && tasks.some(task => ['group', 'pair'].includes(task.participation))), criterion('reflection', reflected > 0), criterion('integration', Array.isArray(state.lessonIntegrations) && state.lessonIntegrations.length >= 1 && state.lessonIntegrations.length <= 2 && state.lessonIntegrations.every(id => LESSON_INTEGRATIONS.some(item => item.id === id))), criterion('objective_evidence', objectives.length > 0 && learnerIds.length > 0 && objectives.every(objective => objective.withEvidence === learnerIds.length))] };
}
