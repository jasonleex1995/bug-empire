/**
 * Combat resolution: unit attacks, poison DoT, armor pierce, module/castle damage,
 * and destroy backlash. Castle upgrades are applied via effectiveStats / resistFactor.
 */
import {
  AGGRESSOR_GAS_MULT,
  DAMAGE_VARIANCE,
  KILL_GAS_BY_TIER,
  MODULE_BACKLASH_DAMAGE,
  MODULE_BACKLASH_RANGE,
  MODULE_BACKLASH_SLOW,
  MODULE_DESTROY_GAS_RATIO,
  PASSIVE_KILL_GAS_MULT,
  GAS_CAP,
  inBattlefield,
  inOwnTerritory,
  moduleCenter,
  type Side,
} from './config';
import { FAMILY_MULT, UNIT_BY_ID, type UnitDef } from './data/units';
import { FAMILY_TRACKS, TRACKS, type TrackEffect } from './data/upgrades';
import type { GameState, ModuleInst, UnitInst } from './state';

/** Slight snowball on the shared front so mirror meatgrinders eventually break. */
export function frontPressureBonus(state: GameState, attacker: UnitInst): number {
  let own = 0;
  let enemy = 0;
  for (const u of state.units) {
    if (u.hp <= 0 || !inBattlefield(u.x)) continue;
    const body = UNIT_BY_ID[u.defId].body;
    if (u.side === attacker.side) own += body;
    else enemy += body;
  }
  if (enemy <= 0) return 1.15;
  if (own > enemy * 1.25) return 1.4;
  if (own > enemy * 1.08) return 1.2;
  if (own > enemy) return 1.08;
  return 1;
}

function addGas(state: GameState, side: Side, amount: number): void {
  const p = state.players[side];
  const before = p.gas;
  p.gas = Math.min(GAS_CAP, p.gas + amount);
  p.stats.gasEarned += p.gas - before;
}

function sumEffect(state: GameState, u: UnitInst, effect: TrackEffect): number {
  const def = UNIT_BY_ID[u.defId];
  const tracks = FAMILY_TRACKS[def.family];
  const lvl = state.players[u.side].upgrades[def.family];
  let sum = 0;
  for (const t of TRACKS) {
    if (tracks[t].effect === effect) sum += tracks[t].perLevel * lvl[t];
  }
  return sum;
}

/** Resist shortens poison/slow durations (beetle specialty). */
export function resistFactor(state: GameState, u: UnitInst): number {
  return Math.max(0.25, 1 - sumEffect(state, u, 'resist'));
}

export function effectiveStats(state: GameState, u: UnitInst): {
  dmg: number;
  armor: number;
  pierce: number;
  speed: number;
  atkInterval: number;
  maxHp: number;
  def: UnitDef;
} {
  const def = UNIT_BY_ID[u.defId];
  const atkSpd = sumEffect(state, u, 'atkSpeed');
  const hpFrac = sumEffect(state, u, 'hp');
  const armorAdd = sumEffect(state, u, 'armor');
  const pierceAdd = sumEffect(state, u, 'pierce');
  return {
    def,
    dmg: def.dmg,
    armor: def.armor + armorAdd,
    pierce: def.pierce + pierceAdd,
    speed: def.speed,
    atkInterval: def.atkInterval / (1 + atkSpd),
    maxHp: Math.round(def.hp * (1 + hpFrac)),
  };
}

export function damageUnit(state: GameState, target: UnitInst, rawDmg: number, attackerSide: Side, passive: boolean): boolean {
  if (target.hp <= 0) return false;
  target.hp -= rawDmg;
  state.events.push({ type: 'hit', row: target.row, x: target.x, side: target.side });
  if (target.hp > 0) return false;
  const def = UNIT_BY_ID[target.defId];
  const inEnemyGrid = inOwnTerritory(target.side, target.x);
  const gas = KILL_GAS_BY_TIER[def.tier] * (passive ? PASSIVE_KILL_GAS_MULT : 1) * (!passive && inEnemyGrid ? AGGRESSOR_GAS_MULT : 1);
  addGas(state, attackerSide, gas);
  state.players[attackerSide].stats.kills += 1;
  state.events.push({ type: 'unitDied', row: target.row, x: target.x, side: target.side });
  return true;
}

export function rollDamage(state: GameState, base: number): number {
  return base * (1 - DAMAGE_VARIANCE + 2 * DAMAGE_VARIANCE * state.rng.next());
}

/** appliedArmor = max(0, armor - pierce); no overpierce bonus damage. */
export function unitAttackDamage(state: GameState, attacker: UnitInst, target: UnitInst): number {
  const a = effectiveStats(state, attacker);
  const t = effectiveStats(state, target);
  const mult = FAMILY_MULT[a.def.family][t.def.family] * frontPressureBonus(state, attacker);
  const appliedArmor = Math.max(0, t.armor - a.pierce);
  return Math.max(1, rollDamage(state, a.dmg * mult) - appliedArmor);
}

function applyPoison(state: GameState, attacker: UnitInst, target: UnitInst): void {
  const def = UNIT_BY_ID[attacker.defId];
  if (def.poisonDps <= 0 || def.poisonDuration <= 0) return;
  const duration = def.poisonDuration * resistFactor(state, target);
  const dps = def.poisonDps;
  target.poisonUntil = Math.max(target.poisonUntil, state.t + duration);
  if (dps >= target.poisonDps) {
    target.poisonDps = dps;
    target.poisonFrom = attacker.side;
  }
}

export function applySlow(state: GameState, target: UnitInst, seconds: number): void {
  if (seconds <= 0) return;
  const dur = seconds * resistFactor(state, target);
  target.slowUntil = Math.max(target.slowUntil, state.t + dur);
}

export function resolveUnitAttack(state: GameState, attacker: UnitInst, primary: UnitInst): void {
  damageUnit(state, primary, unitAttackDamage(state, attacker, primary), attacker.side, false);
  applyPoison(state, attacker, primary);
}

export function tickPoison(state: GameState, u: UnitInst, dt: number): void {
  if (u.hp <= 0 || state.t >= u.poisonUntil || u.poisonDps <= 0 || u.poisonFrom === null) {
    if (state.t >= u.poisonUntil) {
      u.poisonDps = 0;
      u.poisonFrom = null;
    }
    return;
  }
  // Poison ignores armor (ant identity).
  damageUnit(state, u, u.poisonDps * dt, u.poisonFrom, false);
}

/** Shrapnel + short slow on enemy units near a wrecked module. */
export function moduleBacklash(state: GameState, wreck: ModuleInst): void {
  const cx = moduleCenter(wreck.side, wreck.col);
  for (const e of state.units) {
    if (e.side === wreck.side || e.row !== wreck.row || e.hp <= 0) continue;
    if (Math.abs(e.x - cx) > MODULE_BACKLASH_RANGE) continue;
    damageUnit(state, e, MODULE_BACKLASH_DAMAGE, wreck.side, true);
    applySlow(state, e, MODULE_BACKLASH_SLOW);
  }
}

export function damageModule(state: GameState, target: ModuleInst, dmg: number, attackerSide: Side): boolean {
  if (target.hp <= 0) return false;
  target.hp -= dmg;
  if (target.hp > 0) return false;
  addGas(state, attackerSide, Math.round(target.mineralValue * MODULE_DESTROY_GAS_RATIO));
  state.players[attackerSide].stats.modulesDestroyed += 1;
  state.events.push({ type: 'moduleDestroyed', row: target.row, col: target.col, side: target.side });
  moduleBacklash(state, target);
  return true;
}

export function damageCastle(state: GameState, targetSide: Side, dmg: number): void {
  const p = state.players[targetSide];
  p.castleHp = Math.max(0, p.castleHp - dmg);
  state.players[targetSide === 0 ? 1 : 0].stats.castleDamageDealt += dmg;
  state.events.push({ type: 'castleHit', side: targetSide, dmg });
}

/** Retroactive max-HP sync after hp-track upgrades. */
export function syncUnitMaxHp(state: GameState, side: Side, family: UnitDef['family']): void {
  for (const u of state.units) {
    if (u.side !== side || UNIT_BY_ID[u.defId].family !== family) continue;
    const newMax = effectiveStats(state, u).maxHp;
    u.hp += newMax - u.maxHp;
    u.maxHp = newMax;
  }
}
