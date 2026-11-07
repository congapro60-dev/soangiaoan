import {stats, ordered, requireAction} from './shared.js';

// Nông Trại Tri Thức: mỗi câu đúng là một lượt tưới; đủ nước thì cây lớn qua 5 giai đoạn.
// Chạy theo mùa vụ: ngày được suy ra từ đồng hồ của ván (không cần thao tác của học sinh).
// Bỏ trắng một ngày mất một lượt nước; bỏ hai ngày liền thì cây héo mất một giai đoạn.
export const constants = Object.freeze({
  stages: 5, waterPerStage: 2, wiltAfterDry: 2,
  // Một "ngày" mặc định dài 5 phút để mùa vụ chạy vừa một tiết 30 phút.
  // Ván dài nhiều ngày thật thì truyền dayMs = 86400000 khi khởi tạo.
  dayMs: 300000, seasonDays: 6
});
export const STAGE_LABELS = Object.freeze(['Hạt', 'Mầm', 'Cây non', 'Ra hoa', 'Kết quả']);

export function init(units, now = 0) {
  return {
    day: 0, startedAt: now, dayStartedAt: now, dayMs: constants.dayMs, seasonDays: constants.seasonDays,
    players: stats(units, () => ({water: 0, stage: 0, dry: 0, dryDays: 0, correct: 0, harvested: 0, lastDay: 0, finishedAt: null}))
  };
}

export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['water', 'harvest'].includes(a.type));
  if (a.type === 'water') requireAction(p.stage < constants.stages, 'CROP_MATURE');
  if (a.type === 'harvest') requireAction(p.stage >= constants.stages, 'CROP_NOT_MATURE');
}

export function progress(s, id, a, now, correct) {
  const r = s.ruleState, p = r.players[id];
  if (a.type === 'harvest') {
    p.harvested++;
    p.water = 0;
    p.stage = 0;
    p.dry = 0;
    p.dryDays = 0;
    return;
  }
  if (correct) {
    p.correct++;
    p.water++;
    p.dry = 0;
    p.dryDays = 0;
    p.lastDay = r.day;
    while (p.water >= constants.waterPerStage && p.stage < constants.stages) {
      p.water -= constants.waterPerStage;
      p.stage++;
    }
    if (p.stage >= constants.stages) p.finishedAt ??= now;
  } else {
    p.dry++;
    if (p.dry >= constants.wiltAfterDry) p.water = Math.max(0, p.water - 1);
  }
}

// The day is derived from the trusted game clock, so a client cannot skip a day to
// dodge the wilt penalty — and cannot rewind it either.
export function tick(s, now) {
  const r = s.ruleState;
  const target = Math.min(r.seasonDays, Math.max(0, Math.floor((now - r.startedAt) / r.dayMs)));
  while (r.day < target) {
    r.day++;
    r.dayStartedAt = r.startedAt + r.day * r.dayMs;
    for (const p of Object.values(r.players)) {
      if (p.lastDay < r.day - 1) {
        p.dryDays++;
        if (p.dryDays >= 1) p.water = Math.max(0, p.water - 1);
        if (p.dryDays >= constants.wiltAfterDry) p.stage = Math.max(0, p.stage - 1);
      }
      p.dry = 0;
    }
  }
  if (r.day >= r.seasonDays) s.finished = true;
}

export function rank(s) {
  return ordered(s.units, id => {
    const p = s.ruleState.players[id];
    return [p.stage, p.harvested, p.correct, p.water];
  });
}

export const mathActions = ['water'];
