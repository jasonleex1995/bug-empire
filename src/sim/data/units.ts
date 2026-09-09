export type Family = 'ant' | 'beetle' | 'mantis';
export type Tier = 1 | 2 | 3;

export interface UnitDef {
  id: string;
  name: string;
  family: Family;
  tier: Tier;
  hp: number;
  dmg: number;
  /** Seconds between attacks. */
  atkInterval: number;
  /** Flat damage reduction. Damage = max(1, dmg * mult - armor). */
  armor: number;
  /** Cells per second. */
  speed: number;
  /** Attack reach in cells (melee ~0.3, spear ~0.7, ranged >= 1.2). */
  range: number;
  /** Damage multiplier against modules and the castle. */
  siegeMult: number;
  /** Attacks ignore target armor. */
  pierce: boolean;
  /** How much lane length the unit occupies in a queue. Small bodies pack more attackers into reach. */
  body: number;
  /** Seconds between spawns at a level-1 barracks. */
  spawnInterval: number;
  /** Gas needed to unlock this unit's barracks (0 = available from start). */
  unlockGas: number;
  short: string;
  /** Splash radius in cells around the primary target (0 = single-target only). */
  splashRadius: number;
  /** Splash hits deal this fraction of a normal attack (still applies family mult / armor / pierce). */
  splashMult: number;
  /** Seconds of move-slow applied on hit (0 = none). Reuses defense slow factor. */
  slowOnHit: number;
}

export const FAMILY_NAME: Record<Family, string> = {
  ant: '개미류',
  beetle: '풍뎅이류',
  mantis: '사마귀류',
};

/** Short labels for dense UI (intel table, badges). */
export const FAMILY_SHORT: Record<Family, string> = {
  ant: '개미',
  beetle: '풍뎅이',
  mantis: '사마',
};

/**
 * Rock-paper-scissors on top of flat armor:
 * ants swarm mantises, mantises pierce beetles, beetles shrug off ants.
 */
export const FAMILY_MULT: Record<Family, Record<Family, number>> = {
  ant: { ant: 1, beetle: 0.8, mantis: 1.3 },
  beetle: { ant: 1.3, beetle: 1, mantis: 0.8 },
  mantis: { ant: 0.8, beetle: 1.3, mantis: 1 },
};

/**
 * Role map (StarCraft-flavoured, rooted in real insect traits):
 * - 개미: 물량·화학전 — 근접 sweep / 근접 범위(불개미) / 원거리 관통(산성)
 * - 풍뎅이: 갑옷·돌파 — 뿔·턱 실루엣이 비슷한 코뿔소·장수·사슴
 * - 사마귀: 리치·특수 — 좀(리치) / 유령(원거리 범위+둔화) / 왕(중화력 리치)
 */
export const UNITS: UnitDef[] = [
  // 개미류: 싸고 빠르고 많다. 화학 공격으로 역할이 갈린다.
  {
    id: 'black_ant',
    name: '검정개미',
    short: '검',
    family: 'ant',
    tier: 1,
    hp: 55,
    dmg: 10,
    atkInterval: 1.0,
    armor: 0,
    speed: 1.2,
    range: 0.4,
    siegeMult: 0.7,
    pierce: false,
    body: 0.15,
    spawnInterval: 5,
    unlockGas: 0,
    splashRadius: 0,
    splashMult: 0,
    slowOnHit: 0,
  },
  {
    id: 'fire_ant',
    name: '불개미',
    short: '불',
    family: 'ant',
    tier: 2,
    hp: 110,
    dmg: 12,
    atkInterval: 1.0,
    armor: 1,
    speed: 1.1,
    range: 0.45,
    siegeMult: 0.8,
    pierce: false,
    body: 0.18,
    spawnInterval: 7,
    unlockGas: 60,
    splashRadius: 0.4,
    splashMult: 0.45,
    slowOnHit: 0,
  },
  {
    id: 'acid_ant',
    name: '산성개미',
    short: '산',
    family: 'ant',
    tier: 3,
    hp: 80,
    dmg: 10,
    atkInterval: 0.5,
    armor: 0,
    speed: 1.2,
    range: 1.4,
    siegeMult: 0.7,
    pierce: true,
    body: 0.2,
    spawnInterval: 12,
    unlockGas: 120,
    splashRadius: 0,
    splashMult: 0,
    slowOnHit: 0,
  },

  // 풍뎅이류: 뿔·턱 달린 갑옷형. 느리지만 단단하고 공성에 강하다.
  {
    id: 'rhino_beetle',
    name: '코뿔소풍뎅이',
    short: '코',
    family: 'beetle',
    tier: 1,
    hp: 115,
    dmg: 9,
    atkInterval: 0.9,
    armor: 2,
    speed: 0.7,
    range: 0.3,
    siegeMult: 1,
    pierce: false,
    body: 0.3,
    spawnInterval: 10,
    unlockGas: 0,
    splashRadius: 0,
    splashMult: 0,
    slowOnHit: 0,
  },
  {
    id: 'kabuto_beetle',
    name: '장수풍뎅이',
    short: '장',
    family: 'beetle',
    tier: 2,
    hp: 220,
    dmg: 20,
    atkInterval: 0.9,
    armor: 3,
    speed: 0.6,
    range: 0.3,
    siegeMult: 1.25,
    pierce: false,
    body: 0.36,
    spawnInterval: 14,
    unlockGas: 60,
    splashRadius: 0,
    splashMult: 0,
    slowOnHit: 0,
  },
  {
    id: 'stag_beetle',
    name: '사슴벌레',
    short: '사',
    family: 'beetle',
    tier: 3,
    hp: 320,
    dmg: 26,
    atkInterval: 1.0,
    armor: 5,
    speed: 0.55,
    range: 0.4,
    siegeMult: 2,
    pierce: false,
    body: 0.42,
    spawnInterval: 18,
    unlockGas: 120,
    splashRadius: 0.45,
    splashMult: 0.5,
    slowOnHit: 0,
  },

  // 사마귀류: 리치와 특수. HP는 낮고 건물에는 약하다.
  {
    id: 'leaf_mantis',
    name: '좀사마귀',
    short: '좀',
    family: 'mantis',
    tier: 1,
    hp: 55,
    dmg: 14,
    atkInterval: 0.9,
    armor: 0,
    speed: 0.9,
    range: 0.7,
    siegeMult: 0.75,
    pierce: false,
    body: 0.3,
    spawnInterval: 10,
    unlockGas: 0,
    splashRadius: 0,
    splashMult: 0,
    slowOnHit: 0,
  },
  {
    id: 'orchid_mantis',
    name: '유령사마귀',
    short: '유',
    family: 'mantis',
    tier: 2,
    hp: 70,
    dmg: 16,
    atkInterval: 1.1,
    armor: 0,
    speed: 0.85,
    range: 1.25,
    siegeMult: 0.6,
    pierce: false,
    body: 0.3,
    spawnInterval: 14,
    unlockGas: 80,
    splashRadius: 0.55,
    splashMult: 0.4,
    slowOnHit: 1.5,
  },
  {
    id: 'king_mantis',
    name: '왕사마귀',
    short: '왕',
    family: 'mantis',
    tier: 3,
    hp: 140,
    dmg: 30,
    atkInterval: 1.0,
    armor: 1,
    speed: 0.8,
    range: 0.85,
    siegeMult: 0.75,
    pierce: false,
    body: 0.36,
    spawnInterval: 16,
    unlockGas: 120,
    splashRadius: 0,
    splashMult: 0,
    slowOnHit: 0,
  },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));
