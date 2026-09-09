import { AGGRESSOR_GAS_MULT, DAMAGE_VARIANCE, KILL_GAS_BY_TIER, MODULE_DESTROY_GAS_RATIO, PASSIVE_KILL_GAS_MULT, GAS_CAP, inOwnTerritory, type Side } from './config';
import { FAMILY_MULT, UNIT_BY_ID, type UnitDef } from './data/units';
import { ARMOR_PER_LEVEL, ATK_PER_LEVEL, SPECIAL_TRACK } from './data/upgrades';
import type { GameState, ModuleInst, UnitInst } from './state';

function addGas(state: GameState, side: Side, amount: number): void {
  const p = state.players[side];
  const before = p.gas;
  p.gas = Math.min(GAS_CAP, p.gas + amount);
  p.stats.gasEarned += p.gas - before;
}

/** Effective stats after castle upgrades (applied retroactively to living units). */
export function effectiveStats(state: GameState, u: UnitInst): { dmg: number; armor: number; speed: number; atkInterval: number; maxHp: number; def: UnitDef } {
  const def = UNIT_BY_ID[u.defId];
  const up = state.players[u.side].upgrades[def.family];
  const special = SPECIAL_TRACK[def.family].perLevel * up.special;
  return {
    def,
    dmg: def.dmg + ATK_PER_LEVEL[def.family] * up.atk,
    armor: def.armor + ARMOR_PER_LEVEL * up.armor,
    speed: def.family === 'ant' ? def.speed * (1 + special) : def.speed,
    atkInterval: def.family === 'mantis' ? def.atkInterval / (1 + special) : def.atkInterval,
    maxHp: def.family === 'beetle' ? Math.round(def.hp * (1 + special)) : def.hp,
  };
}

/**
 * Apply damage to a unit. `passive` marks kills by defenses/castle/spells, which pay reduced gas.
 * Returns true if the unit died from this hit.
 */
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

/** Unit-vs-unit damage with family multiplier and flat armor. */
export function rollDamage(state: GameState, base: number): number {
  return base * (1 - DAMAGE_VARIANCE + 2 * DAMAGE_VARIANCE * state.rng.next());
}

export function unitAttackDamage(state: GameState, attacker: UnitInst, target: UnitInst): number {
  const a = effectiveStats(state, attacker);
  const t = effectiveStats(state, target);
  const mult = FAMILY_MULT[a.def.family][t.def.family];
  return Math.max(1, rollDamage(state, a.dmg * mult) - (a.def.pierce ? 0 : t.armor));
}

export function damageModule(state: GameState, target: ModuleInst, dmg: number, attackerSide: Side): boolean {
  if (target.hp <= 0) return false;
  target.hp -= dmg;
  if (target.hp > 0) return false;
  addGas(state, attackerSide, Math.round(target.mineralValue * MODULE_DESTROY_GAS_RATIO));
  state.players[attackerSide].stats.modulesDestroyed += 1;
  state.events.push({ type: 'moduleDestroyed', row: target.row, col: target.col, side: target.side });
  return true;
}

export function damageCastle(state: GameState, targetSide: Side, dmg: number): void {
  const p = state.players[targetSide];
  p.castleHp = Math.max(0, p.castleHp - dmg);
  state.players[targetSide === 0 ? 1 : 0].stats.castleDamageDealt += dmg;
  state.events.push({ type: 'castleHit', side: targetSide, dmg });
}
