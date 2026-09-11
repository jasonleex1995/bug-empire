/**
 * Tall lawn board: seven horizontal lanes, shallow build depth.
 * Fills the leftover vertical space under the PvZ seed rail (was empty soil).
 */
export const ROWS = 7;
/** Player/enemy build depth — 4 square columns toward the shared mid. */
export const COLS = 4;
/** Width of the neutral battlefield between the two grids, in cell units.
 * Wider mid eats the left/right canvas margins so the war front feels bigger. */
export const MID = 6;
/** Total lane length in cell units. Side 0 castle at x=0, side 1 castle at x=LANE_LENGTH. */
export const LANE_LENGTH = COLS * 2 + MID;

export const TICK_DT = 1 / 20;

export const START_MINERALS = 150;
export const START_GAS = 0;
export const GAS_CAP = 300;
export const CASTLE_HP = 30000;
/**
 * Shared-front army cap: barracks stop spawning while this side's living units already occupy
 * this much body sum across ALL rows (one war front, not per-lane faucets).
 */
export const FRONT_CAPACITY = 6.0;
/** @deprecated alias — same as FRONT_CAPACITY. */
export const LANE_CAPACITY = FRONT_CAPACITY;

/** Gas awarded to the killer's side per kill, by unit tier. */
export const KILL_GAS_BY_TIER: Record<1 | 2 | 3, number> = { 1: 2, 2: 5, 3: 10 };
/** Kills made by defense modules or the castle give only this fraction of the gas. */
export const PASSIVE_KILL_GAS_MULT = 0.25;
/** Destroying a module awards this fraction of its total mineral value as gas. */
export const MODULE_DESTROY_GAS_RATIO = 0.2;

export const SELL_REFUND_RATIO = 0.5;
/** Each owned resource module multiplies the price of the next one. */
export const RESOURCE_PRICE_GROWTH = 1.15;

/** All player-facing mineral prices snap to this step (50, 55, 175, …). */
export const MINERAL_COST_STEP = 5;

/** Round a mineral amount to the nearest multiple of {@link MINERAL_COST_STEP}. */
export function snapMineral(n: number): number {
  return Math.max(0, Math.round(n / MINERAL_COST_STEP) * MINERAL_COST_STEP);
}

/** Build time in seconds = clamp(cost / BUILD_TIME_DIVISOR, min, max). */
export const BUILD_TIME_DIVISOR = 10;
export const BUILD_TIME_MIN = 4;
export const BUILD_TIME_MAX = 15;
export const UPGRADE_TIME = 10;
/** HP fraction a module has while under construction. */
export const UNDER_CONSTRUCTION_HP_RATIO = 0.5;

export const CASTLE_ATTACK = { dmg: 7, interval: 1.0, range: 1.5, targets: 2 };
export const EMERGENCY_RECHARGE_GAS = 80;
export const ACID_RAIN = { gas: 60, dmg: 60 };

/** Units within this distance of an enemy cell reveal it (fog of war). */
export const REVEAL_RANGE = 1.0;
/**
 * Build-counterplay: both sides always see the enemy build grid.
 * Fog is off so reading / switching compositions is the main skill.
 */
export const OPEN_INTEL = true;

/** Kills scored inside the enemy's grid pay this much more gas: pushing is rewarded, camping is not. */
export const AGGRESSOR_GAS_MULT = 2.0;
/** Extra reach added to melee/ranged range to account for body size. */
export const BODY_RADIUS = 0.12;
/** Modules and castles are wide targets: several queued units can hit them at once. */
export const STRUCTURE_REACH_BONUS = 0.35;

export const SLOW_FACTOR = 0.6;
/** Every hit rolls its damage in [1 - v, 1 + v]; keeps identical fights from resolving identically. */
export const DAMAGE_VARIANCE = 0.15;

/** When any module is destroyed: shrapnel + short slow on enemy units in that lane near the wreck. */
export const MODULE_BACKLASH_DAMAGE = 22;
export const MODULE_BACKLASH_SLOW = 1.0;
export const MODULE_BACKLASH_RANGE = 1.25;

export type Side = 0 | 1;

export function otherSide(s: Side): Side {
  return s === 0 ? 1 : 0;
}

/** Lane-x interval occupied by a module at (side, col). Col 0 is nearest that side's castle. */
export function moduleSpan(side: Side, col: number): [number, number] {
  return side === 0 ? [col, col + 1] : [LANE_LENGTH - 1 - col, LANE_LENGTH - col];
}

export function moduleCenter(side: Side, col: number): number {
  const [a, b] = moduleSpan(side, col);
  return (a + b) / 2;
}

export function castleX(side: Side): number {
  return side === 0 ? 0 : LANE_LENGTH;
}

export function direction(side: Side): 1 | -1 {
  return side === 0 ? 1 : -1;
}

/** True if x lies within the grid area belonging to `side`. */
export function inOwnTerritory(side: Side, x: number): boolean {
  return side === 0 ? x < COLS : x > LANE_LENGTH - COLS;
}

/** Neutral shared battlefield between the two build grids. */
export function inBattlefield(x: number): boolean {
  return x >= COLS && x <= LANE_LENGTH - COLS;
}

export function buildTimeFor(cost: number): number {
  return Math.min(BUILD_TIME_MAX, Math.max(BUILD_TIME_MIN, cost / BUILD_TIME_DIVISOR));
}
