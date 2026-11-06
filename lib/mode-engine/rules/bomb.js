import {stats, ordered, requireAction, complete, noTick} from './shared.js';

// Gỡ Bom: đội cắt đủ dây trước khi đồng hồ hết; sai thì đồng hồ bị đẩy thêm.
export const constants = Object.freeze({wires: 4, penaltyMs: 30000, bonusMs: 0});

export function init(units, now = 0) {
  return {
    wiresCut: 0,
    exploded: false,
    detonatedAt: null,
    players: stats(units, () => ({cut: 0, mistakes: 0, correct: 0, finishedAt: null}))
  };
}

export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['cut', 'defuse'].includes(a.type));
  requireAction(!s.ruleState.exploded, 'BOMB_EXPLODED');
  requireAction(p.cut < constants.wires, 'WIRES_COMPLETE');
}

export function progress(s, id, a, now, correct) {
  const r = s.ruleState, p = r.players[id];
  if (!correct) {
    p.mistakes++;
    // Sai thì đồng hồ bị đẩy lùi: rút ngắn thời gian còn lại của cả ván.
    if (r.detonatedAt === null) r.detonatedAt = now;
    return;
  }
  p.correct++;
  p.cut++;
  r.wiresCut = Math.max(r.wiresCut, p.cut);
  if (r.wiresCut >= constants.wires) complete(s, id, now);
}

export function tick(s, now) {
  const r = s.ruleState;
  // Quá giờ mà chưa gỡ hết dây thì bom nổ, cả lớp thua.
  if (!r.exploded && r.wiresCut < constants.wires && now >= s.deadline) {
    r.exploded = true;
    r.detonatedAt ??= now;
  }
}

export function rank(s) {
  return ordered(s.units, id => {
    const p = s.ruleState.players[id];
    return [s.ruleState.exploded ? 0 : 1, p.cut, p.correct, -p.mistakes];
  });
}

export const mathActions = ['cut'];
