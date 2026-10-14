import {reduce} from './mode-engine/index.js';
import {activeEvent, gameNow, raceOf} from './community.js';

// Reads project the authoritative clock without writing a revision. Mutations
// persist this same projection together with their action under one room CAS.
export function projectMode(room, wall) {
  const race = raceOf(room);
  let mode = race?.modeState;
  if (!mode) return null;
  const active = activeEvent(room, wall);
  if (active) {
    if (!mode.communityOpened && !mode.finished) {
      const boundary = Math.max(mode.gameNow, gameNow(room, active.openedAt));
      mode = reduce(mode, {type: 'tick'}, {gameNow: boundary}).state;
      if (mode.finished) return mode;
      mode = reduce(mode, {type: 'community-open', round: mode.round, requestId: `system:open:${active.id}`}, {gameNow: mode.gameNow, pause: true}).state;
    }
    return reduce(mode, {type: 'tick'}, {gameNow: mode.gameNow, pause: true}).state;
  }
  if (mode.communityOpened) {
    const event = [race.community, race.arena, race.classActivity].filter(Boolean).sort((a, b) => b.resumeAt - a.resumeAt)[0];
    mode = reduce(mode, {type: 'community-close', round: mode.round, requestId: `system:close:${event?.id || mode.round}`}, {gameNow: mode.gameNow, pause: true}).state;
  }
  return reduce(mode, {type: 'tick'}, {gameNow: Math.max(mode.gameNow, gameNow(room, wall)), pause: false}).state;
}
