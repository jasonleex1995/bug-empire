/**
 * Unit matchup matrix: one lane, two barracks of type A vs two barracks of type B,
 * no AI, no upgrades. Reports how often A destroys B's barracks first.
 *
 *   npm run duel            # all 8x8
 *   npm run duel -- 5       # 5 seeds per cell
 */
import { TICK_DT } from '../sim/config';
import { UNITS } from '../sim/data/units';
import { createGame } from '../sim/state';
import { step } from '../sim/step';

function duel(a: string, b: string, seed: number, limit = 900): 0 | 1 | 'draw' {
  const state = createGame({ seed, timeLimit: null, resourceMult: [1, 1] });
  // Remove the starting farms so nothing else is targetable.
  state.modules.length = 0;
  for (const [side, id, col] of [[0, a, 2], [0, a, 3], [1, b, 2], [1, b, 3]] as [0 | 1, string, number][]) {
    state.modules.push({
      id: state.nextId++,
      side,
      row: 0,
      col,
      defId: `barracks_${id}`,
      hp: 100000,
      maxHp: 100000,
      level: 1,
      buildRemaining: 0,
      upgradeRemaining: 0,
      spawnTimer: 0,
      atkTimer: 0,
      mineralValue: 0,
    });
  }
  // Barracks are indestructible; the winner is whoever damages the enemy castle first.
  while (state.t < limit) {
    step(state, TICK_DT);
    const [p0, p1] = state.players;
    if (p0.castleHp < 8000 && p1.castleHp < 8000) return 'draw';
    if (p1.castleHp < 8000) return 0;
    if (p0.castleHp < 8000) return 1;
  }
  // Nobody broke through: judge by the kill trade (within 10% counts as even).
  const k0 = state.players[0].stats.kills;
  const k1 = state.players[1].stats.kills;
  if (Math.abs(k0 - k1) <= 0.1 * Math.max(k0, k1, 1)) return 'draw';
  return k0 > k1 ? 0 : 1;
}

const seeds = Number(process.argv[2] ?? 3);
const ids = UNITS.map((u) => u.id);
const short = (id: string) => UNITS.find((u) => u.id === id)!.name.padEnd(5, '\u3000');
console.log('행(A)이 열(B)을 이긴 비율 %. 같은 진영 교대 포함.');
console.log('        ' + ids.map((id) => short(id)).join(' '));
for (const a of ids) {
  const cells: string[] = [];
  for (const b of ids) {
    if (a === b) {
      cells.push('  —  '.padEnd(6, '\u3000'));
      continue;
    }
    let wins = 0;
    let total = 0;
    for (let s = 0; s < seeds; s++) {
      const r1 = duel(a, b, 100 + s);
      const r2 = duel(b, a, 100 + s);
      total += 2;
      wins += r1 === 0 ? 1 : r1 === 'draw' ? 0.5 : 0;
      wins += r2 === 1 ? 1 : r2 === 'draw' ? 0.5 : 0;
    }
    cells.push(`${Math.round((wins / total) * 100)}`.padStart(4).padEnd(6, '\u3000'));
  }
  console.log(short(a) + ' ' + cells.join(''));
}
