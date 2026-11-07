import {stats, ordered, requireAction, complete, noTick} from './shared.js';

// Đấu Trường RPG: HP/MP/vật phẩm; đúng thì hồi máu và đánh boss, sai thì mất máu.
export const constants = Object.freeze({
  hp: 1000, mp: 300, healHp: 50, healMp: 30, hurtHp: 100,
  bossHp: 9000, bossHurt: 300, comboAt: 3,
  classes: Object.freeze({
    warrior: Object.freeze({name: 'Chiến binh', hp: 1200, mp: 200, damage: 1}),
    mage: Object.freeze({name: 'Pháp sư', hp: 800, mp: 500, damage: 2}),
    archer: Object.freeze({name: 'Cung thủ', hp: 1000, mp: 300, damage: 1.5}),
    tank: Object.freeze({name: 'Tank', hp: 2000, mp: 150, damage: 0.5})
  }),
  items: Object.freeze(['shield', 'freeze', 'switchTurn', 'fifty', 'revive'])
});

const maxOf = p => constants.classes[p.class]?.hp ?? constants.hp;

export function init(units, now, seed, legacyTeams = {}) {
  return {
    boss: {hp: constants.bossHp, max: constants.bossHp},
    players: stats(units, () => ({
      class: 'warrior', classChosen: false, hp: constants.classes.warrior.hp, mp: constants.classes.warrior.mp,
      combo: 0, correct: 0, wrong: 0, damage: 0, items: [], down: false, finishedAt: null
    }))
  };
}

export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['attack', 'item', 'chooseClass'].includes(a.type));
  if (a.type === 'chooseClass') {
    requireAction(Object.hasOwn(constants.classes, a.class), 'INVALID_CLASS');
    requireAction(!p.classChosen, 'CLASS_ALREADY_CHOSEN');
    requireAction(!p.down && p.correct + p.wrong === 0, 'CLASS_CHOICE_CLOSED');
    return;
  }
  if (a.type === 'attack') requireAction(!p.down, 'HERO_DOWN');
  if (a.type === 'item') {
    requireAction(constants.items.includes(a.item), 'INVALID_ITEM');
    requireAction(p.items.includes(a.item), 'ITEM_UNAVAILABLE');
    if (a.item === 'revive') requireAction(p.down, 'NOT_DOWN');
  }
}

export function progress(s, id, a, now, correct) {
  const r = s.ruleState, p = r.players[id], unit = s.units.find(u => u.id === id);
  if (a.type === 'chooseClass') {
    const picked = constants.classes[a.class];
    p.class = a.class;
    p.classChosen = true;
    p.hp = picked.hp;
    p.mp = picked.mp;
    return;
  }
  const cap = maxOf(p);
  if (a.type === 'item') {
    p.items = p.items.filter(item => item !== a.item);
    if (a.item === 'revive') {
      p.down = false;
      p.hp = Math.round(cap * 0.5);
      if (unit.outcome === 'temporary-defeat') unit.outcome = 'active';
    }
    if (a.item === 'shield') p.shield = true;
    if (a.item === 'fifty') p.hint = true;
    if (a.item === 'freeze') p.freeze = true;
    return;
  }
  if (correct) {
    p.correct++;
    p.combo++;
    p.hp = Math.min(cap, p.hp + constants.healHp);
    p.mp = Math.min(constants.classes[p.class]?.mp ?? constants.mp, p.mp + constants.healMp);
    const hit = Math.round(constants.bossHurt * (constants.classes[p.class]?.damage ?? 1));
    r.boss.hp = Math.max(0, r.boss.hp - hit);
    p.damage += hit;
    if (p.combo >= constants.comboAt) {
      const item = constants.items[(p.correct + id.length) % constants.items.length];
      if (!p.items.includes(item)) p.items.push(item);
      p.combo -= constants.comboAt;
    }
    if (r.boss.hp === 0) {
      for (const u of s.units) {
        if (['active', 'temporary-defeat'].includes(u.outcome)) {
          r.players[u.id].finishedAt ??= now;
          u.outcome = 'completed';
        }
      }
    }
  } else {
    p.wrong++;
    p.combo = 0;
    if (p.shield) p.shield = false;
    else p.hp = Math.max(0, p.hp - constants.hurtHp);
    if (p.hp === 0 && !p.down) {
      p.down = true;
      unit.outcome = 'temporary-defeat';
    }
  }
}

export function rank(s) {
  return ordered(s.units, id => {
    const p = s.ruleState.players[id];
    return [p.down ? 0 : 1, p.damage, p.correct, p.hp];
  });
}

export const tick = noTick;
export const mathActions = ['attack'];
