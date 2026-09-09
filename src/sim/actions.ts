import {
  ACID_RAIN,
  COLS,
  EMERGENCY_RECHARGE_GAS,
  RESOURCE_PRICE_GROWTH,
  ROWS,
  SELL_REFUND_RATIO,
  UNDER_CONSTRUCTION_HP_RATIO,
  UPGRADE_TIME,
  buildTimeFor,
  inOwnTerritory,
  type Side,
} from './config';
import { damageUnit } from './combat';
import { BARRACKS_UPGRADE_COST, MODULE_BY_ID } from './data/modules';
import { UNIT_BY_ID, type Family } from './data/units';
import { MAX_UPGRADE_LEVEL, UPGRADE_GAS_COST, type Track } from './data/upgrades';
import { moduleAt, type GameState, type ModuleInst } from './state';

export type ActionResult = { ok: true } | { ok: false; reason: string };

const ok: ActionResult = { ok: true };
const fail = (reason: string): ActionResult => ({ ok: false, reason });

export function isUnlocked(state: GameState, side: Side, unitId: string): boolean {
  const u = UNIT_BY_ID[unitId];
  return u.unlockGas === 0 || state.players[side].unlocked.includes(unitId);
}

/**
 * Current mineral price of a module for a side. Resource modules get pricier with each one owned,
 * so an all-farm opening stops paying for itself.
 */
export function moduleCost(state: GameState, side: Side, defId: string): number {
  const def = MODULE_BY_ID[defId];
  if (def.kind !== 'resource') return def.cost;
  const owned = state.modules.filter((m) => m.side === side && MODULE_BY_ID[m.defId].kind === 'resource').length;
  return Math.round(def.cost * Math.pow(RESOURCE_PRICE_GROWTH, owned));
}

export function canPlace(state: GameState, side: Side, row: number, col: number, defId: string): ActionResult {
  const def = MODULE_BY_ID[defId];
  if (!def) return fail('unknown module');
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return fail('out of grid');
  if (moduleAt(state, side, row, col)) return fail('cell occupied');
  if (def.kind === 'barracks' && !isUnlocked(state, side, def.unitId!)) return fail('locked');
  if (state.players[side].minerals < moduleCost(state, side, defId)) return fail('not enough minerals');
  return ok;
}

export function place(state: GameState, side: Side, row: number, col: number, defId: string): ActionResult {
  const check = canPlace(state, side, row, col, defId);
  if (!check.ok) return check;
  const def = MODULE_BY_ID[defId];
  const p = state.players[side];
  const cost = moduleCost(state, side, defId);
  p.minerals -= cost;
  state.modules.push({
    id: state.nextId++,
    side,
    row,
    col,
    defId,
    hp: Math.round(def.hp * UNDER_CONSTRUCTION_HP_RATIO),
    maxHp: def.hp,
    level: 1,
    buildRemaining: buildTimeFor(def.cost),
    upgradeRemaining: 0,
    // Slight jitter so mirrored builds do not spawn in perfect lockstep.
    spawnTimer: (def.spawnInterval ?? 0) * (0.8 + 0.4 * state.rng.next()),
    atkTimer: 0,
    mineralValue: cost,
  });
  return ok;
}

export function barracksUpgradeCost(m: ModuleInst): { minerals: number; gas: number } | null {
  if (m.level >= 3) return null;
  const def = MODULE_BY_ID[m.defId];
  const next = (m.level + 1) as 2 | 3;
  const c = BARRACKS_UPGRADE_COST[next];
  return { minerals: Math.round(def.cost * c.mineralRatio), gas: c.gas };
}

export function upgradeModule(state: GameState, side: Side, moduleId: number): ActionResult {
  const m = state.modules.find((x) => x.id === moduleId && x.side === side);
  if (!m) return fail('no module');
  const def = MODULE_BY_ID[m.defId];
  if (def.kind !== 'barracks') return fail('only barracks upgrade');
  if (m.buildRemaining > 0) return fail('under construction');
  if (m.upgradeRemaining > 0) return fail('already upgrading');
  const cost = barracksUpgradeCost(m);
  if (!cost) return fail('max level');
  const p = state.players[side];
  if (p.minerals < cost.minerals) return fail('not enough minerals');
  if (p.gas < cost.gas) return fail('not enough gas');
  p.minerals -= cost.minerals;
  p.gas -= cost.gas;
  m.mineralValue += cost.minerals;
  m.upgradeRemaining = UPGRADE_TIME;
  return ok;
}

export function sell(state: GameState, side: Side, moduleId: number): ActionResult {
  const idx = state.modules.findIndex((x) => x.id === moduleId && x.side === side);
  if (idx < 0) return fail('no module');
  const m = state.modules[idx];
  const def = MODULE_BY_ID[m.defId];
  state.players[side].minerals += Math.round(def.cost * SELL_REFUND_RATIO);
  state.modules.splice(idx, 1);
  return ok;
}

export function castleUpgradeCost(state: GameState, side: Side, family: Family, track: Track): number | null {
  const lvl = state.players[side].upgrades[family][track];
  if (lvl >= MAX_UPGRADE_LEVEL) return null;
  return UPGRADE_GAS_COST[(lvl + 1) as 1 | 2 | 3];
}

export function castleUpgrade(state: GameState, side: Side, family: Family, track: Track): ActionResult {
  const cost = castleUpgradeCost(state, side, family, track);
  if (cost === null) return fail('max level');
  const p = state.players[side];
  if (p.gas < cost) return fail('not enough gas');
  p.gas -= cost;
  p.upgrades[family][track] += 1;
  return ok;
}

export function unlock(state: GameState, side: Side, unitId: string): ActionResult {
  const u = UNIT_BY_ID[unitId];
  if (!u) return fail('unknown unit');
  if (isUnlocked(state, side, unitId)) return fail('already unlocked');
  const p = state.players[side];
  if (p.gas < u.unlockGas) return fail('not enough gas');
  p.gas -= u.unlockGas;
  p.unlocked.push(unitId);
  return ok;
}

/** Wipe every enemy unit inside our own territory of the lane. One charge per lane. */
export function emergency(state: GameState, side: Side, row: number): ActionResult {
  const p = state.players[side];
  if (row < 0 || row >= ROWS) return fail('bad lane');
  if (!p.emergencyCharges[row]) return fail('no charge');
  p.emergencyCharges[row] = false;
  for (const u of state.units) {
    if (u.side !== side && u.row === row && inOwnTerritory(side, u.x)) u.hp = 0;
  }
  state.events.push({ type: 'emergency', row, side });
  return ok;
}

export function rechargeEmergency(state: GameState, side: Side, row: number): ActionResult {
  const p = state.players[side];
  if (p.emergencyCharges[row]) return fail('already charged');
  if (p.gas < EMERGENCY_RECHARGE_GAS) return fail('not enough gas');
  p.gas -= EMERGENCY_RECHARGE_GAS;
  p.emergencyCharges[row] = true;
  return ok;
}

export function acidRain(state: GameState, side: Side, row: number): ActionResult {
  const p = state.players[side];
  if (row < 0 || row >= ROWS) return fail('bad lane');
  if (p.gas < ACID_RAIN.gas) return fail('not enough gas');
  p.gas -= ACID_RAIN.gas;
  for (const u of state.units) {
    if (u.side !== side && u.row === row) damageUnit(state, u, ACID_RAIN.dmg, side, true);
  }
  state.events.push({ type: 'acidRain', row, side });
  return ok;
}
