import {
  CASTLE_HP,
  COLS,
  ROWS,
  START_GAS,
  START_MINERALS,
  type Side,
} from './config';
import { MODULE_BY_ID, STARTING_RESOURCE_MODULE } from './data/modules';
import { emptyUpgrades, type UpgradeState } from './data/upgrades';
import { Rng } from './rng';

export interface ModuleInst {
  id: number;
  side: Side;
  row: number;
  col: number;
  defId: string;
  hp: number;
  maxHp: number;
  level: 1 | 2 | 3;
  /** Seconds left until construction finishes (0 = built). */
  buildRemaining: number;
  /** Seconds left on an in-progress barracks upgrade (0 = none). */
  upgradeRemaining: number;
  spawnTimer: number;
  atkTimer: number;
  /** Total minerals invested (base + upgrades). Drives the gas bounty when destroyed. */
  mineralValue: number;
}

export interface UnitInst {
  id: number;
  side: Side;
  row: number;
  defId: string;
  x: number;
  hp: number;
  maxHp: number;
  atkTimer: number;
  slowUntil: number;
  poisonUntil: number;
  poisonDps: number;
  poisonFrom: Side | null;
  spawnedAt: number;
}

export interface FogCell {
  /** Module def id seen, or null for a known-empty cell. */
  defId: string | null;
  level: number;
  seenAt: number;
}

export interface PlayerStats {
  kills: number;
  modulesDestroyed: number;
  mineralsEarned: number;
  gasEarned: number;
  castleDamageDealt: number;
}

export interface PlayerState {
  side: Side;
  minerals: number;
  gas: number;
  castleHp: number;
  unlocked: string[];
  upgrades: UpgradeState;
  emergencyCharges: boolean[];
  castleAtkTimers: number[];
  /** Knowledge about the enemy grid, indexed [row][col]. null = never seen. */
  fog: (FogCell | null)[][];
  stats: PlayerStats;
}

export type Winner = Side | 'draw' | null;

export interface GameConfig {
  seed: number;
  /** Seconds; null = no time limit. */
  timeLimit: number | null;
  /** Income and starting-resource multiplier per side (difficulty knob for the AI). */
  resourceMult: [number, number];
}

export interface GameState {
  cfg: GameConfig;
  t: number;
  tick: number;
  rng: Rng;
  players: [PlayerState, PlayerState];
  modules: ModuleInst[];
  units: UnitInst[];
  nextId: number;
  winner: Winner;
  /** Transient per-tick events for the renderer (hits, deaths, spawns). */
  events: SimEvent[];
}

export type SimEvent =
  | { type: 'hit'; row: number; x: number; side: Side }
  | { type: 'unitDied'; row: number; x: number; side: Side }
  | { type: 'moduleDestroyed'; row: number; col: number; side: Side }
  | { type: 'castleHit'; side: Side; dmg: number }
  | { type: 'emergency'; row: number; side: Side }
  | { type: 'acidRain'; row: number; side: Side };

function makePlayer(side: Side, resourceMult: number): PlayerState {
  return {
    side,
    minerals: Math.round(START_MINERALS * resourceMult),
    gas: START_GAS,
    castleHp: CASTLE_HP,
    unlocked: [],
    upgrades: emptyUpgrades(),
    emergencyCharges: Array.from({ length: ROWS }, () => true),
    castleAtkTimers: Array.from({ length: ROWS }, () => 0),
    fog: Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null)),
    stats: { kills: 0, modulesDestroyed: 0, mineralsEarned: 0, gasEarned: 0, castleDamageDealt: 0 },
  };
}

export function createGame(cfg: GameConfig): GameState {
  const rng = new Rng(cfg.seed);
  const state: GameState = {
    cfg,
    t: 0,
    tick: 0,
    rng,
    players: [makePlayer(0, cfg.resourceMult[0]), makePlayer(1, cfg.resourceMult[1])],
    modules: [],
    units: [],
    nextId: 1,
    winner: null,
    events: [],
  };

  // Both sides start with one mirrored, already-built resource module in column 0.
  const row = rng.int(ROWS);
  const def = MODULE_BY_ID[STARTING_RESOURCE_MODULE];
  for (const side of [0, 1] as Side[]) {
    state.modules.push({
      id: state.nextId++,
      side,
      row,
      col: 0,
      defId: def.id,
      hp: def.hp,
      maxHp: def.hp,
      level: 1,
      buildRemaining: 0,
      upgradeRemaining: 0,
      spawnTimer: 0,
      atkTimer: 0,
      mineralValue: def.cost,
    });
  }
  return state;
}

export function moduleAt(state: GameState, side: Side, row: number, col: number): ModuleInst | undefined {
  return state.modules.find((m) => m.side === side && m.row === row && m.col === col);
}

export function modulesOf(state: GameState, side: Side): ModuleInst[] {
  return state.modules.filter((m) => m.side === side);
}
