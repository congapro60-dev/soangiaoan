import {stats, ordered, requireAction, noTick} from './shared.js';

// Nông Trại Tri Thức: mỗi câu đúng là một lượt tưới; đủ nước thì cây lớn qua 5 giai đoạn.
export const constants = Object.freeze({stages: 5, waterPerStage: 2, wiltAfterDry: 2});
export const STAGE_LABELS = Object.freeze(['Hạt', 'Mầm', 'Cây non', 'Ra hoa', 'Kết quả']);

export function init(units) {
  return {players: stats(units, () => ({water: 0, stage: 0, dry: 0, correct: 0, harvested: 0, finishedAt: null}))};
}

export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['water', 'harvest'].includes(a.type));
  if (a.type === 'water') requireAction(p.stage < constants.stages, 'CROP_MATURE');
  if (a.type === 'harvest') requireAction(p.stage >= constants.stages, 'CROP_NOT_MATURE');
}

export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'harvest') {
    p.harvested++;
    p.water = 0;
    p.stage = 0;
    p.dry = 0;
    return;
  }
  if (correct) {
    p.correct++;
    p.water++;
    p.dry = 0;
    while (p.water >= constants.waterPerStage && p.stage < constants.stages) {
      p.water -= constants.waterPerStage;
      p.stage++;
    }
    if (p.stage >= constants.stages) s.ruleState.players[id].finishedAt ??= now;
  } else {
    p.dry++;
    if (p.dry >= constants.wiltAfterDry) p.water = Math.max(0, p.water - 1);
  }
}

export function rank(s) {
  return ordered(s.units, id => {
    const p = s.ruleState.players[id];
    return [p.stage, p.harvested, p.correct, p.water];
  });
}

export const tick = noTick;
export const mathActions = ['water'];
