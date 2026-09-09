export const ROWS = 4;
export const COLS = 6;
/** Width of the neutral battlefield between the two grids, in cell units. */
export const MID = 3;
/** Total lane length in cell units. Side 0 castle at x=0, side 1 castle at x=LANE_LENGTH. */
export const LANE_LENGTH = COLS * 2 + MID;

export const TICK_DT = 1 / 20;

export const START_MINERALS = 100;
export const START_GAS = 0;
export const GAS_CAP = 300;
export const CASTLE_HP = 8000;
/**
 * Barracks in a lane stop spawning while that side already has this many living units in the lane.
 * Keeps blobs readable and makes stacking more barracks into one lane hit diminishing returns.
 */
export const MAX_UNITS_PER_LANE = 12;

/** Gas awarded to the killer's side per kill, by unit tier. */
export const KILL_GAS_BY_TIER: Record<1 | 2 | 3, number> = { 1: 2, 2: 5, 3: 10 };
/** Kills made by defense modules or the castle give only this fraction of the gas. */
export const PASSIVE_KILL_GAS_MULT = 0.25;
/** Destroying a module awards this fraction of its total mineral value as gas. */
export const MODULE_DESTROY_GAS_RATIO = 0.3;

export const SELL_REFUND_RATIO = 0.5;
/** Each owned resource module multiplies the price of the next one. */
export const RESOURCE_PRICE_GROWTH = 1.15;

/** Build time in seconds = clamp(cost / BUILD_TIME_DIVISOR, min, max). */
export const BUILD_TIME_DIVISOR = 10;
export const BUILD_TIME_MIN = 4;
export const BUILD_TIME_MAX = 15;
export const UPGRADE_TIME = 10;
/** HP fraction a module has while under construction. */
export const UNDER_CONSTRUCTION_HP_RATIO = 0.5;

export const CASTLE_ATTACK = { dmg: 6, interval: 1.0, range: 1.2 };
export const EMERGENCY_RECHARGE_GAS = 80;
export const ACID_RAIN = { gas: 60, dmg: 60 };

/** Units within this distance of an enemy cell reveal it (fog of war). */
export const REVEAL_RANGE = 1.0;

/** Minimum spacing between allied units moving in the same direction. */
export const UNIT_SPACING = 0.3;
/** Extra reach added to melee/ranged range to account for body size. */
export const BODY_RADIUS = 0.12;
/** Modules and castles are wide targets: several queued units can hit them at once. */
export const STRUCTURE_REACH_BONUS = 0.6;

export const SLOW_FACTOR = 0.6;

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

export function buildTimeFor(cost: number): number {
  return Math.min(BUILD_TIME_MAX, Math.max(BUILD_TIME_MIN, cost / BUILD_TIME_DIVISOR));
}
