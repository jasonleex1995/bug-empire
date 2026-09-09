/**
 * Catalog of player-like strategies for tournament testing.
 * Each is a full AiProfile built from a small spec so that one axis can be varied at a time.
 */
import type { Family } from '../data/units';
import type { AiProfile, BuildGoal } from './profiles';

export interface StrategySpec {
  id: string;
  name: string;
  /** Farms before anything else. */
  farms: number;
  /** Farms wanted later when minerals pile up. */
  lateFarms?: number;
  lanes: 1 | 2 | 3 | 4;
  family: Family | 'mix';
  /** Defense modules per lane (0 = none). */
  defense: number;
  defenseStyle?: 'auto' | 'wall' | 'turret' | 'mushroom';
  /** Put defense before barracks in the spend order. */
  defenseFirst?: boolean;
  reactive?: boolean;
  /** 0 = all gas to castle upgrades, 1 = all to barracks upgrades. */
  gasBias?: number;
  unlock?: 'none' | 't2' | 'all' | 'fast';
  honeyEarly?: boolean;
  barracksPerLane?: number;
  noBarracks?: boolean;
  noCastleUpgrades?: boolean;
  noBarracksUpgrades?: boolean;
}

const FAMILY_UNITS: Record<Family, string[]> = {
  ant: ['fire_ant', 'acid_ant', 'black_ant'],
  beetle: ['kabuto_beetle', 'stag_beetle', 'rhino_beetle'],
  mantis: ['orchid_mantis', 'king_mantis', 'leaf_mantis'],
};

const MIX_UNITS = [
  'fire_ant',
  'kabuto_beetle',
  'king_mantis',
  'stag_beetle',
  'acid_ant',
  'black_ant',
  'rhino_beetle',
  'leaf_mantis',
  'orchid_mantis',
];

const T2 = ['fire_ant', 'kabuto_beetle', 'orchid_mantis'];
const T3 = ['stag_beetle', 'acid_ant', 'king_mantis'];

function unlockOrderFor(family: Family | 'mix', mode: StrategySpec['unlock']): string[] {
  if (mode === 'none') return [];
  const pool =
    family === 'mix'
      ? [...T2, ...T3]
      : FAMILY_UNITS[family].filter((u) => !['black_ant', 'rhino_beetle', 'leaf_mantis'].includes(u));
  if (mode === 't2') return pool.filter((u) => T2.includes(u));
  return pool;
}

export function makeStrategy(s: StrategySpec): AiProfile {
  const priority: BuildGoal[] = s.defenseFirst ? ['farm', 'defense', 'barracks'] : ['farm', 'barracks', 'defense'];
  if (s.farms <= 1) {
    // Rush-style: barracks come before the (single) farm.
    priority.splice(priority.indexOf('farm'), 1);
    priority.push('farm');
  }
  return {
    id: s.id,
    name: s.name,
    decisionInterval: 2.5,
    farmTarget: s.farms,
    farmLateTarget: s.lateFarms ?? Math.max(s.farms, 4),
    farmSurplus: 220,
    buildBarracks: !s.noBarracks,
    buildDefense: s.defense > 0,
    defensePerLane: s.defense,
    defenseOnlyWhenPressured: false,
    reactive: s.reactive ?? false,
    cheatVision: false,
    concentrateLanes: s.lanes,
    barracksPerLane: s.barracksPerLane ?? (s.lanes === 1 ? 5 : s.lanes === 2 ? 4 : 3),
    unitPrefs: s.family === 'mix' ? MIX_UNITS : FAMILY_UNITS[s.family],
    unlockOrder: unlockOrderFor(s.family, s.unlock ?? 'all'),
    priority,
    barracksUpgradeBias: s.gasBias ?? 0.5,
    honeyEarly: s.honeyEarly,
    defenseStyle: s.defenseStyle ?? 'auto',
    noCastleUpgrades: s.noCastleUpgrades,
    noBarracksUpgrades: s.noBarracksUpgrades,
  };
}

export const STRATEGY_SPECS: StrategySpec[] = [
  // --- Openings (how greedy) --------------------------------------------------
  { id: 'rush1_mix_2L', name: '러시(농장1) 혼합 2레인', farms: 1, lanes: 2, family: 'mix', defense: 0 },
  { id: 'rush1_mix_4L', name: '러시(농장1) 혼합 4레인', farms: 1, lanes: 4, family: 'mix', defense: 0 },
  { id: 'rush1_ant_1L', name: '러시 개미 1레인 올인', farms: 1, lanes: 1, family: 'ant', defense: 0 },
  { id: 'std2_mix_4L', name: '표준(농장2) 혼합 4레인', farms: 2, lanes: 4, family: 'mix', defense: 0 },
  { id: 'eco3_mix_4L', name: '경제(농장3) 혼합 4레인', farms: 3, lanes: 4, family: 'mix', defense: 0 },
  { id: 'greedy5_mix_4L', name: '탐욕(농장5) 혼합 4레인', farms: 5, lanes: 4, family: 'mix', defense: 0 },
  { id: 'ecoOnly12', name: '경제 올인(농장12)', farms: 12, lateFarms: 14, lanes: 4, family: 'mix', defense: 1 },
  { id: 'honey_eco', name: '꿀단지 경제(농장3)', farms: 3, lanes: 4, family: 'mix', defense: 0, honeyEarly: true },

  // --- Lane concentration -----------------------------------------------------
  { id: 'std2_mix_1L', name: '표준 혼합 1레인 올인', farms: 2, lanes: 1, family: 'mix', defense: 0 },
  { id: 'std2_mix_2L', name: '표준 혼합 2레인', farms: 2, lanes: 2, family: 'mix', defense: 0 },
  { id: 'std2_mix_3L', name: '표준 혼합 3레인', farms: 2, lanes: 3, family: 'mix', defense: 0 },

  // --- Family focus -------------------------------------------------------------
  { id: 'std2_ant_4L', name: '표준 개미 4레인', farms: 2, lanes: 4, family: 'ant', defense: 0 },
  { id: 'std2_beetle_4L', name: '표준 풍뎅이 4레인', farms: 2, lanes: 4, family: 'beetle', defense: 0 },
  { id: 'std2_mantis_4L', name: '표준 사마귀 4레인', farms: 2, lanes: 4, family: 'mantis', defense: 0 },
  { id: 'rush1_beetle_2L', name: '러시 풍뎅이 2레인', farms: 1, lanes: 2, family: 'beetle', defense: 0 },
  { id: 'rush1_mantis_2L', name: '러시 사마귀 2레인', farms: 1, lanes: 2, family: 'mantis', defense: 0 },
  { id: 'eco3_beetle_4L', name: '경제 풍뎅이 4레인', farms: 3, lanes: 4, family: 'beetle', defense: 0 },

  // --- Defense usage ------------------------------------------------------------
  { id: 'std2_mix_4L_def1', name: '표준 혼합 + 디펜스1/레인', farms: 2, lanes: 4, family: 'mix', defense: 1 },
  { id: 'std2_mix_4L_def2', name: '표준 혼합 + 디펜스2/레인', farms: 2, lanes: 4, family: 'mix', defense: 2 },
  { id: 'std2_mix_4L_wall', name: '표준 혼합 + 가시덤불1/레인', farms: 2, lanes: 4, family: 'mix', defense: 1, defenseStyle: 'wall' },
  { id: 'std2_mix_4L_turret', name: '표준 혼합 + 포탑1/레인', farms: 2, lanes: 4, family: 'mix', defense: 1, defenseStyle: 'turret' },
  { id: 'turtle3_def2', name: '터틀(농장3→디펜스2→병영)', farms: 3, lanes: 4, family: 'mix', defense: 2, defenseFirst: true },
  { id: 'defenseOnly', name: '디펜스 올인', farms: 4, lateFarms: 8, lanes: 4, family: 'mix', defense: 4, defenseFirst: true, noBarracks: true },
  { id: 'wallFirst_rush', name: '벽 먼저 → 러시', farms: 1, lanes: 2, family: 'mix', defense: 1, defenseStyle: 'wall', defenseFirst: true },

  // --- Gas spending ------------------------------------------------------------
  { id: 'std2_castleFocus', name: '표준 + 성 업그레이드 집중', farms: 2, lanes: 4, family: 'mix', defense: 0, gasBias: 0.1 },
  { id: 'std2_barracksFocus', name: '표준 + 병영 업그레이드 집중', farms: 2, lanes: 4, family: 'mix', defense: 0, gasBias: 0.9 },
  { id: 'std2_noUnlock', name: '표준 T1만 (해금 없음)', farms: 2, lanes: 4, family: 'mix', defense: 0, unlock: 'none' },
  { id: 'std2_t2only', name: '표준 T2까지만 해금', farms: 2, lanes: 4, family: 'mix', defense: 0, unlock: 't2' },
  { id: 'std2_noCastle', name: '표준 성 업그레이드 없음', farms: 2, lanes: 4, family: 'mix', defense: 0, noCastleUpgrades: true, gasBias: 1 },
  { id: 'std2_noBarracksUp', name: '표준 병영 업그레이드 없음', farms: 2, lanes: 4, family: 'mix', defense: 0, noBarracksUpgrades: true, gasBias: 0 },

  // --- Reactive play ------------------------------------------------------------
  { id: 'std2_mix_4L_react', name: '표준 혼합 반응형', farms: 2, lanes: 4, family: 'mix', defense: 1, reactive: true },
  { id: 'eco3_mix_4L_react', name: '경제 혼합 반응형', farms: 3, lanes: 4, family: 'mix', defense: 1, reactive: true },
  { id: 'rush1_mix_2L_react', name: '러시 혼합 2레인 반응형', farms: 1, lanes: 2, family: 'mix', defense: 0, reactive: true },
];

export const STRATEGIES: Record<string, AiProfile> = Object.fromEntries(STRATEGY_SPECS.map((s) => [s.id, makeStrategy(s)]));
