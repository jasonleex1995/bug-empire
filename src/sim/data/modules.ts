/**
 * Placeable modules: resources, utility defenses, and per-unit barracks.
 * Defenses buy time (slow / knockback / wall) — they are not kill towers.
 * Destroying any module triggers shrapnel + short slow (see combat.moduleBacklash).
 */
import { UNITS, type Family, type UnitDef } from './units';

export type ModuleKind = 'resource' | 'defense' | 'barracks';

export interface DefenseAttack {
  dmg: number;
  interval: number;
  range: number;
  /** Seconds of slow on hit (0 = none). */
  slow: number;
  /** Hit every enemy in range instead of the nearest. */
  aoe: boolean;
  /** Push target away from the tower, in cells (0 = none). */
  knockback: number;
}

export interface ModuleDef {
  id: string;
  name: string;
  short: string;
  kind: ModuleKind;
  cost: number;
  hp: number;
  desc: string;
  incomePerSec?: number;
  unitId?: string;
  spawnInterval?: number;
  attack?: DefenseAttack;
}

export const BARRACKS_LEVEL_SPAWN_MULT: Record<1 | 2 | 3, number> = { 1: 1.0, 2: 0.7, 3: 0.5 };

export const BARRACKS_UPGRADE_COST: Record<2 | 3, { mineralRatio: number; gas: number }> = {
  2: { mineralRatio: 0.5, gas: 25 },
  3: { mineralRatio: 0.8, gas: 50 },
};

/** Ant tech is cheap; beetle/mantis barracks cost more for the same tier. */
const BARRACKS_COST: Record<Family, Record<1 | 2 | 3, number>> = {
  ant: { 1: 55, 2: 95, 3: 140 },
  beetle: { 1: 95, 2: 160, 3: 200 },
  mantis: { 1: 90, 2: 150, 3: 190 },
};
const BARRACKS_HP: Record<Family, Record<1 | 2 | 3, number>> = {
  ant: { 1: 220, 2: 280, 3: 340 },
  beetle: { 1: 320, 2: 420, 3: 500 },
  mantis: { 1: 240, 2: 300, 3: 360 },
};

function barracksFor(u: UnitDef): ModuleDef {
  return {
    id: `barracks_${u.id}`,
    name: `${u.name} 병영`,
    short: u.short,
    kind: 'barracks',
    cost: BARRACKS_COST[u.family][u.tier],
    hp: BARRACKS_HP[u.family][u.tier],
    unitId: u.id,
    spawnInterval: u.spawnInterval,
    desc: `${u.name}을(를) ${u.spawnInterval}초마다 자동 생산`,
  };
}

export const RESOURCE_MODULES: ModuleDef[] = [
  { id: 'aphid_farm', name: '진딧물 목장', short: '진', kind: 'resource', cost: 50, hp: 120, incomePerSec: 1.0, desc: '초당 미네랄 1.0' },
  { id: 'honey_pot', name: '꿀단지', short: '꿀', kind: 'resource', cost: 150, hp: 180, incomePerSec: 3.5, desc: '초당 미네랄 3.5 (파괴 시 상대에게 큰 가스)' },
];

export const THORN_WALL: ModuleDef = {
  id: 'thorn_wall',
  name: '가시덤불',
  short: '덤',
  kind: 'defense',
  cost: 40,
  hp: 450,
  desc: '공격 없음. 시간을 번다. 파괴 시 파편+둔화.',
};

export const STICKY_DEW: ModuleDef = {
  id: 'sticky_dew',
  name: '끈끈이이슬',
  short: '끈',
  kind: 'defense',
  cost: 65,
  hp: 90,
  attack: { dmg: 0, interval: 0.8, range: 1.6, slow: 2.2, aoe: true, knockback: 0 },
  desc: '범위 둔화만 (딜 없음). 파괴 시 파편+둔화.',
};

export const WIND_GUST: ModuleDef = {
  id: 'wind_gust',
  name: '돌풍돌기',
  short: '돌',
  kind: 'defense',
  cost: 80,
  hp: 110,
  attack: { dmg: 0, interval: 2.4, range: 1.8, slow: 0, aoe: false, knockback: 0.55 },
  desc: '가장 가까운 적을 짧게 뒤로 밀침. 파괴 시 파편+둔화.',
};

export const DEFENSE_MODULES: ModuleDef[] = [THORN_WALL, STICKY_DEW, WIND_GUST];

export const BARRACKS_MODULES: ModuleDef[] = UNITS.map(barracksFor);
export const MODULES: ModuleDef[] = [...RESOURCE_MODULES, ...DEFENSE_MODULES, ...BARRACKS_MODULES];
export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));
export const STARTING_RESOURCE_MODULE = 'aphid_farm';
