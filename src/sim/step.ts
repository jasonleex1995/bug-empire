import {
  BODY_RADIUS,
  CASTLE_ATTACK,
  COLS,
  FRONT_CAPACITY,
  LANE_LENGTH,
  OPEN_INTEL,
  REVEAL_RANGE,
  ROWS,
  SLOW_FACTOR,
  STRUCTURE_REACH_BONUS,
  TICK_DT,
  UNDER_CONSTRUCTION_HP_RATIO,
  castleX,
  direction,
  inBattlefield,
  inOwnTerritory,
  moduleSpan,
  otherSide,
  type Side,
} from './config';
import { applySlow, damageCastle, damageModule, damageUnit, effectiveStats, frontPressureBonus, resolveUnitAttack, rollDamage, tickPoison } from './combat';
import { BARRACKS_LEVEL_SPAWN_MULT, MODULE_BY_ID } from './data/modules';
import { UNIT_BY_ID } from './data/units';
import type { GameState, ModuleInst, UnitInst } from './state';

function spanDistance(x: number, [a, b]: [number, number]): number {
  return Math.max(a - x, x - b, 0);
}

type Target =
  | { kind: 'unit'; unit: UnitInst; dist: number }
  | { kind: 'module'; module: ModuleInst; dist: number }
  | { kind: 'castle'; dist: number };

/** Living enemies that still contest the shared war front (mid or our base). */
function enemiesContestingFront(state: GameState, side: Side): boolean {
  return state.units.some((e) => {
    if (e.side === side || e.hp <= 0) return false;
    if (inOwnTerritory(side, e.x) || inBattlefield(e.x)) return true;
    // Still near the enemy's mid edge — not yet a backline-only remnant.
    return side === 0 ? e.x <= LANE_LENGTH - COLS + 1.2 : e.x >= COLS - 1.2;
  });
}

/**
 * Pick what the unit attacks this tick.
 * Shared front: unit↔unit combat ignores row (one war). Structures stay row-preferring until the
 * mid is won, then survivors may breach any row (redistributed pressure).
 */
function findTarget(state: GameState, u: UnitInst, reach: number, stuck: boolean, atWall: boolean): Target | null {
  const d = direction(u.side);
  const own = inOwnTerritory(u.side, u.x);
  let best: Target | null = null;

  // Pressed against an enemy building, fight "over the wall" with structure reach.
  const unitReach = atWall ? reach + STRUCTURE_REACH_BONUS : reach;
  for (const e of state.units) {
    if (e.side === u.side || e.hp <= 0) continue;
    const rel = (e.x - u.x) * d;
    if (rel < -BODY_RADIUS && !own) continue;
    const dist = Math.abs(e.x - u.x);
    if (dist > unitReach + BODY_RADIUS) continue;
    if (!best || dist < best.dist) best = { kind: 'unit', unit: e, dist };
  }
  if (best) return best;
  if (!stuck) return null;

  const structReach = reach + STRUCTURE_REACH_BONUS;
  const midCleared = !enemiesContestingFront(state, u.side);

  for (const m of state.modules) {
    if (m.side === u.side || m.hp <= 0) continue;
    // Prefer own spawn row; after winning the shared fight, breach any row.
    if (m.row !== u.row && !midCleared) continue;
    const span = moduleSpan(m.side, m.col);
    const center = (span[0] + span[1]) / 2;
    if ((center - u.x) * d < 0) continue;
    const dist = spanDistance(u.x, span);
    if (dist > structReach) continue;
    // Same-row modules beat cross-row when both are in reach.
    const rowBias = m.row === u.row ? 0 : 0.05;
    if (!best || dist + rowBias < best.dist) best = { kind: 'module', module: m, dist: dist + rowBias };
  }
  if (best) return best;

  const cx = castleX(otherSide(u.side));
  const castleDist = Math.abs(cx - u.x);
  if (castleDist <= structReach) return { kind: 'castle', dist: castleDist };
  return null;
}

/** Shared front: allies stack in x regardless of spawn row. */
function blockedByAlly(state: GameState, u: UnitInst, range: number): boolean {
  const d = direction(u.side);
  for (const a of state.units) {
    if (a.side !== u.side || a === u || a.hp <= 0) continue;
    const rel = (a.x - u.x) * d;
    if (rel <= 0 || rel >= UNIT_BY_ID[a.defId].body) continue;
    if (UNIT_BY_ID[a.defId].range > range + 0.2) continue;
    return true;
  }
  return false;
}

/**
 * Nearest enemy module edge ahead. Same-row first; if the shared mid is clear, any row
 * (survivors fan out onto the enemy grid).
 */
function nextEnemyModuleEdge(state: GameState, u: UnitInst): number | null {
  const d = direction(u.side);
  const midCleared = !enemiesContestingFront(state, u.side);
  let best: number | null = null;
  let bestScore = Infinity;
  for (const m of state.modules) {
    if (m.side === u.side || m.hp <= 0) continue;
    if (m.row !== u.row && !midCleared) continue;
    const [a, b] = moduleSpan(m.side, m.col);
    const edge = d > 0 ? a : b;
    const ahead = (edge - u.x) * d;
    if (ahead < 0) continue;
    const score = ahead + (m.row === u.row ? 0 : 0.01);
    if (score < bestScore) {
      bestScore = score;
      best = edge;
    }
  }
  return best;
}

function stepUnit(state: GameState, u: UnitInst, dt: number): void {
  tickPoison(state, u, dt);
  if (u.hp <= 0) return;
  const stats = effectiveStats(state, u);
  const reach = stats.def.range;
  const d = direction(u.side);
  u.atkTimer = Math.max(0, u.atkTimer - dt);

  const blocked = blockedByAlly(state, u, stats.def.range);
  const wallEdge = nextEnemyModuleEdge(state, u);
  const atWall = wallEdge !== null && Math.abs(wallEdge - u.x) <= BODY_RADIUS + 1e-6;
  const atEnd = d > 0 ? u.x >= LANE_LENGTH : u.x <= 0;
  const target = findTarget(state, u, reach, blocked || atWall || atEnd, atWall);
  if (target) {
    if (u.atkTimer <= 0) {
      u.atkTimer = stats.atkInterval;
      if (target.kind === 'unit') {
        resolveUnitAttack(state, u, target.unit);
      } else if (target.kind === 'module') {
        damageModule(state, target.module, rollDamage(state, stats.dmg * stats.def.siegeMult), u.side);
      } else {
        damageCastle(state, otherSide(u.side), rollDamage(state, stats.dmg * stats.def.siegeMult));
      }
    }
    // Winning the shared front: keep grinding forward while trading so the line can break.
    if (target.kind === 'unit') {
      const push = frontPressureBonus(state, u);
      if (push > 1) {
        let nx = u.x + d * stats.speed * dt * (push - 1) * 1.1;
        if (wallEdge !== null) {
          const limit = wallEdge - d * BODY_RADIUS;
          if ((nx - limit) * d > 0) nx = limit;
        }
        u.x = Math.min(LANE_LENGTH, Math.max(0, nx));
      }
    }
    return;
  }

  let moveDir: 1 | -1 = d;
  if (inOwnTerritory(u.side, u.x)) {
    let nearest: UnitInst | null = null;
    for (const e of state.units) {
      if (e.side === u.side || e.hp <= 0) continue;
      if (!inOwnTerritory(u.side, e.x)) continue;
      if (!nearest || Math.abs(e.x - u.x) < Math.abs(nearest.x - u.x)) nearest = e;
    }
    if (nearest) moveDir = nearest.x >= u.x ? 1 : -1;
  }

  if (moveDir === d && blocked) return;

  const slowed = state.t < u.slowUntil;
  const speed = stats.speed * (slowed ? SLOW_FACTOR : 1);
  let nx = u.x + moveDir * speed * dt;

  if (moveDir === d && wallEdge !== null) {
    const limit = wallEdge - d * BODY_RADIUS;
    if ((nx - limit) * d > 0) nx = limit;
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
      const occupied = state.units.reduce((sum, u) => (u.side === m.side ? sum + UNIT_BY_ID[u.defId].body : sum), 0);
      if (occupied >= FRONT_CAPACITY) {
        m.spawnTimer = 1;
        return;
      }
      m.spawnTimer += def.spawnInterval! * BARRACKS_LEVEL_SPAWN_MULT[m.level];
      const [a, b] = moduleSpan(m.side, m.col);
      const unitDef = def.unitId!;
      // Spawn at the barracks' front edge so fresh units stand in front of their own buildings.
      const inst: UnitInst = {
        id: state.nextId++,
        side: m.side,
        row: m.row,
        defId: unitDef,
        x: m.side === 0 ? b + BODY_RADIUS : a - BODY_RADIUS,
        hp: 0,
        maxHp: 0,
        atkTimer: 0,
        slowUntil: 0,
        poisonUntil: 0,
        poisonDps: 0,
        poisonFrom: null,
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
    // Same row always; also cover the shared mid so towers still matter on one front.
    const inRange = state.units.filter((e) => {
      if (e.side === m.side || e.hp <= 0) return false;
      if (Math.abs(e.x - cx) > def.attack!.range) return false;
      return e.row === m.row || inBattlefield(e.x);
    });
    if (inRange.length === 0) return;
    m.atkTimer = def.attack.interval;
    const targets = def.attack.aoe ? inRange : [inRange.reduce((p, c) => (Math.abs(c.x - cx) < Math.abs(p.x - cx) ? c : p))];
    for (const e of targets) {
      if (def.attack.dmg > 0) damageUnit(state, e, def.attack.dmg, m.side, true);
      if (def.attack.slow > 0) applySlow(state, e, def.attack.slow);
      if (def.attack.knockback > 0) {
        const push = e.x >= cx ? def.attack.knockback : -def.attack.knockback;
        e.x = Math.min(LANE_LENGTH, Math.max(0, e.x + push));
      }
    }
  }
}

function stepCastles(state: GameState, dt: number): void {
  for (const side of [0, 1] as Side[]) {
    const p = state.players[side];
    const cx = castleX(side);
    // Shared front: one wall timer fires at the nearest intruders regardless of spawn row.
    p.castleAtkTimers[0] = Math.max(0, p.castleAtkTimers[0] - dt);
    if (p.castleAtkTimers[0] > 0) continue;
    const targets = state.units
      .filter((e) => e.side !== side && e.hp > 0 && Math.abs(e.x - cx) <= CASTLE_ATTACK.range)
      .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))
      .slice(0, CASTLE_ATTACK.targets);
    if (targets.length === 0) continue;
    p.castleAtkTimers[0] = CASTLE_ATTACK.interval;
    for (const e of targets) damageUnit(state, e, CASTLE_ATTACK.dmg, side, true);
  }
}

function updateFog(state: GameState): void {
  for (const side of [0, 1] as Side[]) {
    const enemy = otherSide(side);
    const fog = state.players[side].fog;
    if (OPEN_INTEL) {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const m = state.modules.find((x) => x.side === enemy && x.row === row && x.col === col && x.hp > 0);
          fog[row][col] = { defId: m ? m.defId : null, level: m ? m.level : 0, seenAt: state.t };
        }
      }
      continue;
    }
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
    const keys: ((p: (typeof state.players)[0]) => number)[] = [(p) => p.castleHp, (p) => p.stats.castleDamageDealt, (p) => p.stats.kills];
    state.winner = 'draw';
    for (const k of keys) {
      if (k(a) !== k(b)) {
        state.winner = k(a) > k(b) ? 0 : 1;
        break;
      }
    }
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
