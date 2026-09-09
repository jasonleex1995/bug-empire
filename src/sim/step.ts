import {
  BODY_RADIUS,
  CASTLE_ATTACK,
  COLS,
  LANE_LENGTH,
  MAX_UNITS_PER_LANE,
  REVEAL_RANGE,
  ROWS,
  SLOW_FACTOR,
  STRUCTURE_REACH_BONUS,
  TICK_DT,
  UNDER_CONSTRUCTION_HP_RATIO,
  UNIT_SPACING,
  castleX,
  direction,
  inOwnTerritory,
  moduleSpan,
  otherSide,
  type Side,
} from './config';
import { damageCastle, damageModule, damageUnit, effectiveStats, unitAttackDamage } from './combat';
import { BARRACKS_LEVEL_SPAWN_MULT, MODULE_BY_ID } from './data/modules';
import type { GameState, ModuleInst, UnitInst } from './state';

function spanDistance(x: number, [a, b]: [number, number]): number {
  return Math.max(a - x, x - b, 0);
}

type Target =
  | { kind: 'unit'; unit: UnitInst; dist: number }
  | { kind: 'module'; module: ModuleInst; dist: number }
  | { kind: 'castle'; dist: number };

function findTarget(state: GameState, u: UnitInst, reach: number): Target | null {
  const d = direction(u.side);
  const own = inOwnTerritory(u.side, u.x);
  let best: Target | null = null;

  for (const e of state.units) {
    if (e.side === u.side || e.row !== u.row || e.hp <= 0) continue;
    const rel = (e.x - u.x) * d;
    if (rel < -BODY_RADIUS && !own) continue;
    const dist = Math.abs(e.x - u.x);
    if (dist > reach + BODY_RADIUS) continue;
    if (!best || dist < best.dist) best = { kind: 'unit', unit: e, dist };
  }
  if (best) return best;

  const structReach = reach + STRUCTURE_REACH_BONUS;
  for (const m of state.modules) {
    if (m.side === u.side || m.row !== u.row || m.hp <= 0) continue;
    const span = moduleSpan(m.side, m.col);
    const center = (span[0] + span[1]) / 2;
    if ((center - u.x) * d < 0) continue;
    const dist = spanDistance(u.x, span);
    if (dist > structReach) continue;
    if (!best || dist < best.dist) best = { kind: 'module', module: m, dist };
  }
  if (best) return best;

  const cx = castleX(otherSide(u.side));
  const castleDist = Math.abs(cx - u.x);
  if (castleDist <= structReach) return { kind: 'castle', dist: castleDist };
  return null;
}

/** Nearest enemy module span ahead of the unit, used to stop units from walking through modules. */
function nextEnemyModuleEdge(state: GameState, u: UnitInst): number | null {
  const d = direction(u.side);
  let best: number | null = null;
  for (const m of state.modules) {
    if (m.side === u.side || m.row !== u.row || m.hp <= 0) continue;
    const [a, b] = moduleSpan(m.side, m.col);
    const edge = d > 0 ? a : b;
    if ((edge - u.x) * d < 0) continue;
    if (best === null || (edge - u.x) * d < (best - u.x) * d) best = edge;
  }
  return best;
}

function stepUnit(state: GameState, u: UnitInst, dt: number): void {
  const stats = effectiveStats(state, u);
  const reach = stats.def.range;
  const d = direction(u.side);
  u.atkTimer = Math.max(0, u.atkTimer - dt);

  const target = findTarget(state, u, reach);
  if (target) {
    if (u.atkTimer <= 0) {
      u.atkTimer = stats.atkInterval;
      if (target.kind === 'unit') {
        damageUnit(state, target.unit, unitAttackDamage(state, u, target.unit), u.side, false);
      } else if (target.kind === 'module') {
        damageModule(state, target.module, stats.dmg * stats.def.siegeMult, u.side);
      } else {
        damageCastle(state, otherSide(u.side), stats.dmg * stats.def.siegeMult);
      }
    }
    return;
  }

  // Inside our own grid, chase intruders even if they are behind us.
  let moveDir: 1 | -1 = d;
  if (inOwnTerritory(u.side, u.x)) {
    let nearest: UnitInst | null = null;
    for (const e of state.units) {
      if (e.side === u.side || e.row !== u.row || e.hp <= 0) continue;
      if (!inOwnTerritory(u.side, e.x)) continue;
      if (!nearest || Math.abs(e.x - u.x) < Math.abs(nearest.x - u.x)) nearest = e;
    }
    if (nearest) moveDir = nearest.x >= u.x ? 1 : -1;
  }

  if (moveDir === d) {
    for (const a of state.units) {
      if (a.side !== u.side || a.row !== u.row || a === u || a.hp <= 0) continue;
      const rel = (a.x - u.x) * d;
      if (rel > 0 && rel < UNIT_SPACING) return;
    }
  }

  const slowed = state.t < u.slowUntil;
  const speed = stats.speed * (slowed ? SLOW_FACTOR : 1);
  let nx = u.x + moveDir * speed * dt;

  if (moveDir === d) {
    const edge = nextEnemyModuleEdge(state, u);
    if (edge !== null) {
      const limit = edge - d * BODY_RADIUS;
      if ((nx - limit) * d > 0) nx = limit;
    }
  }
  u.x = Math.min(LANE_LENGTH, Math.max(0, nx));
}

function stepModule(state: GameState, m: ModuleInst, dt: number): void {
  const def = MODULE_BY_ID[m.defId];
  if (m.buildRemaining > 0) {
    m.buildRemaining = Math.max(0, m.buildRemaining - dt);
    if (m.buildRemaining === 0) {
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp - Math.round(m.maxHp * UNDER_CONSTRUCTION_HP_RATIO));
    }
    return;
  }
  if (m.upgradeRemaining > 0) {
    m.upgradeRemaining = Math.max(0, m.upgradeRemaining - dt);
    if (m.upgradeRemaining === 0 && m.level < 3) m.level = (m.level + 1) as 2 | 3;
  }

  const owner = state.players[m.side];
  if (def.kind === 'resource') {
    const gain = def.incomePerSec! * dt * state.cfg.resourceMult[m.side];
    owner.minerals += gain;
    owner.stats.mineralsEarned += gain;
    return;
  }

  if (def.kind === 'barracks') {
    m.spawnTimer -= dt;
    if (m.spawnTimer <= 0) {
      if (state.units.filter((u) => u.side === m.side && u.row === m.row).length >= MAX_UNITS_PER_LANE) {
        m.spawnTimer = 1;
        return;
      }
      m.spawnTimer += def.spawnInterval! * BARRACKS_LEVEL_SPAWN_MULT[m.level];
      const [a, b] = moduleSpan(m.side, m.col);
      const unitDef = def.unitId!;
      const inst: UnitInst = {
        id: state.nextId++,
        side: m.side,
        row: m.row,
        defId: unitDef,
        x: (a + b) / 2,
        hp: 0,
        maxHp: 0,
        atkTimer: 0,
        slowUntil: 0,
        spawnedAt: state.t,
      };
      const st = effectiveStats(state, inst);
      inst.hp = st.maxHp;
      inst.maxHp = st.maxHp;
      state.units.push(inst);
    }
    return;
  }

  if (def.kind === 'defense' && def.attack) {
    m.atkTimer = Math.max(0, m.atkTimer - dt);
    if (m.atkTimer > 0) return;
    const [a, b] = moduleSpan(m.side, m.col);
    const cx = (a + b) / 2;
    const inRange = state.units.filter((e) => e.side !== m.side && e.row === m.row && e.hp > 0 && Math.abs(e.x - cx) <= def.attack!.range);
    if (inRange.length === 0) return;
    m.atkTimer = def.attack.interval;
    const targets = def.attack.aoe ? inRange : [inRange.reduce((p, c) => (Math.abs(c.x - cx) < Math.abs(p.x - cx) ? c : p))];
    for (const e of targets) {
      damageUnit(state, e, def.attack.dmg, m.side, true);
      if (def.attack.slow > 0) e.slowUntil = Math.max(e.slowUntil, state.t + def.attack.slow);
    }
  }
}

function stepCastles(state: GameState, dt: number): void {
  for (const side of [0, 1] as Side[]) {
    const p = state.players[side];
    const cx = castleX(side);
    for (let row = 0; row < ROWS; row++) {
      p.castleAtkTimers[row] = Math.max(0, p.castleAtkTimers[row] - dt);
      if (p.castleAtkTimers[row] > 0) continue;
      let best: UnitInst | null = null;
      for (const e of state.units) {
        if (e.side === side || e.row !== row || e.hp <= 0) continue;
        const dist = Math.abs(e.x - cx);
        if (dist > CASTLE_ATTACK.range) continue;
        if (!best || dist < Math.abs(best.x - cx)) best = e;
      }
      if (!best) continue;
      p.castleAtkTimers[row] = CASTLE_ATTACK.interval;
      damageUnit(state, best, CASTLE_ATTACK.dmg, side, true);
    }
  }
}

function updateFog(state: GameState): void {
  for (const side of [0, 1] as Side[]) {
    const enemy = otherSide(side);
    const fog = state.players[side].fog;
    const scouts = state.units.filter((u) => u.side === side && u.hp > 0);
    if (scouts.length === 0) continue;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const span = moduleSpan(enemy, col);
        let visible = false;
        for (const s of scouts) {
          if (s.row !== row) continue;
          if (spanDistance(s.x, span) <= REVEAL_RANGE) {
            visible = true;
            break;
          }
        }
        if (!visible) continue;
        const m = state.modules.find((x) => x.side === enemy && x.row === row && x.col === col && x.hp > 0);
        fog[row][col] = { defId: m ? m.defId : null, level: m ? m.level : 0, seenAt: state.t };
      }
    }
  }
}

function checkWinner(state: GameState): void {
  const [a, b] = state.players;
  if (a.castleHp <= 0 && b.castleHp <= 0) state.winner = 'draw';
  else if (a.castleHp <= 0) state.winner = 1;
  else if (b.castleHp <= 0) state.winner = 0;
  else if (state.cfg.timeLimit !== null && state.t >= state.cfg.timeLimit) {
    state.winner = a.castleHp > b.castleHp ? 0 : b.castleHp > a.castleHp ? 1 : 'draw';
  }
}

export function step(state: GameState, dt: number = TICK_DT): void {
  if (state.winner !== null) return;
  state.events.length = 0;

  for (const m of state.modules) stepModule(state, m, dt);
  for (const u of state.units) if (u.hp > 0) stepUnit(state, u, dt);
  stepCastles(state, dt);

  state.units = state.units.filter((u) => u.hp > 0);
  state.modules = state.modules.filter((m) => m.hp > 0);

  updateFog(state);

  state.t += dt;
  state.tick += 1;
  checkWinner(state);
}
