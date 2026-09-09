import { UNITS, type UnitDef } from './units';

export type ModuleKind = 'resource' | 'defense' | 'barracks';

export interface DefenseAttack {
  dmg: number;
  interval: number;
  range: number;
  /** Seconds of slow applied on hit (0 = none). */
  slow: number;
  /** Hits every enemy in range instead of the nearest one. */
  aoe: boolean;
}

export interface ModuleDef {
  id: string;
  name: string;
  short: string;
  kind: ModuleKind;
  cost: number;
  hp: number;
  desc: string;
  /** resource */
  incomePerSec?: number;
  /** barracks */
  unitId?: string;
  spawnInterval?: number;
  /** defense */
  attack?: DefenseAttack;
}

/** Barracks level -> spawn interval multiplier. Levels are per cell. */
export const BARRACKS_LEVEL_SPAWN_MULT: Record<1 | 2 | 3, number> = { 1: 1.0, 2: 0.75, 3: 0.55 };

/** Upgrade to level N costs (base cost * mineralRatio) minerals + gas. */
export const BARRACKS_UPGRADE_COST: Record<2 | 3, { mineralRatio: number; gas: number }> = {
  2: { mineralRatio: 0.6, gas: 30 },
  3: { mineralRatio: 0.9, gas: 60 },
};

const SPAWN_INTERVAL_BY_TIER: Record<1 | 2 | 3, number> = { 1: 10, 2: 16, 3: 24 };
const BARRACKS_COST_BY_TIER: Record<1 | 2 | 3, number> = { 1: 70, 2: 120, 3: 180 };
const BARRACKS_HP_BY_TIER: Record<1 | 2 | 3, number> = { 1: 260, 2: 340, 3: 420 };

function barracksFor(u: UnitDef): ModuleDef {
  return {
    id: `barracks_${u.id}`,
    name: `${u.name} 병영`,
    short: u.short,
    kind: 'barracks',
    cost: BARRACKS_COST_BY_TIER[u.tier],
    hp: BARRACKS_HP_BY_TIER[u.tier],
    unitId: u.id,
    spawnInterval: SPAWN_INTERVAL_BY_TIER[u.tier],
    desc: `${u.name}을(를) ${SPAWN_INTERVAL_BY_TIER[u.tier]}초마다 자동 생산`,
  };
}

export const RESOURCE_MODULES: ModuleDef[] = [
  { id: 'aphid_farm', name: '진딧물 목장', short: '진', kind: 'resource', cost: 50, hp: 120, incomePerSec: 1.0, desc: '초당 미네랄 1.0' },
  { id: 'honey_pot', name: '꿀단지', short: '꿀', kind: 'resource', cost: 150, hp: 180, incomePerSec: 3.5, desc: '초당 미네랄 3.5 (파괴되면 상대에게 큰 가스)' },
];

export const DEFENSE_MODULES: ModuleDef[] = [
  { id: 'thorn_wall', name: '가시덤불', short: '덤', kind: 'defense', cost: 40, hp: 450, desc: '공격 없음. 시간을 번다.' },
  { id: 'poison_mushroom', name: '독버섯', short: '독', kind: 'defense', cost: 70, hp: 100, attack: { dmg: 4, interval: 1.0, range: 1.5, slow: 2.0, aoe: true }, desc: '사거리 내 전체에 약한 피해 + 둔화' },
  { id: 'spider_turret', name: '거미줄 포탑', short: '거', kind: 'defense', cost: 90, hp: 120, attack: { dmg: 14, interval: 0.9, range: 2.0, slow: 0, aoe: false }, desc: '가장 가까운 적 하나를 공격' },
];

export const BARRACKS_MODULES: ModuleDef[] = UNITS.map(barracksFor);

export const MODULES: ModuleDef[] = [...RESOURCE_MODULES, ...DEFENSE_MODULES, ...BARRACKS_MODULES];
export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

export const STARTING_RESOURCE_MODULE = 'aphid_farm';
