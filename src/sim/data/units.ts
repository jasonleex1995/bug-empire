/**
 * Barracks units — locked roster (ants 3 / beetles 2 / mantises 2).
 *
 * Mid/late triangle: ant ▷ mantis ▷ beetle ▷ ant
 *   ants   = poison + swarm (cheap)
 *   beetles = armor soak + resist (expensive)
 *   mantises = flat pierce (expensive)
 *
 * See docs/ROSTER_RPS_DESIGN.md for the design lock.
 */
export type Family = 'ant' | 'beetle' | 'mantis';
export type Tier = 1 | 2 | 3;

export interface UnitDef {
  id: string;
  name: string;
  family: Family;
  tier: Tier;
  hp: number;
  dmg: number;
  atkInterval: number;
  armor: number;
  speed: number;
  range: number;
  siegeMult: number;
  /** Flat armor penetration: appliedArmor = max(0, armor - pierce). */
  pierce: number;
  body: number;
  spawnInterval: number;
  unlockGas: number;
  short: string;
  /** Poison DPS on enemy units only (never structures). */
  poisonDps: number;
  poisonDuration: number;
}

export const FAMILY_NAME: Record<Family, string> = {
  ant: '개미류',
  beetle: '풍뎅이류',
  mantis: '사마귀류',
};

export const FAMILY_SHORT: Record<Family, string> = {
  ant: '개미',
  beetle: '풍뎅이',
  mantis: '사마',
};

/** Soft RPS multipliers on top of poison / pierce / armor mechanics. */
export const FAMILY_MULT: Record<Family, Record<Family, number>> = {
  ant: { ant: 1, beetle: 0.85, mantis: 1.25 },
  beetle: { ant: 1.2, beetle: 1, mantis: 0.85 },
  mantis: { ant: 0.85, beetle: 1.3, mantis: 1 },
};

export const UNITS: UnitDef[] = [
  // —— Ants (cheap ladder)
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
    speed: 1.25,
    range: 0.4,
    siegeMult: 0.7,
    pierce: 0,
    body: 0.15,
    spawnInterval: 5,
    unlockGas: 0,
    poisonDps: 0,
    poisonDuration: 0,
  },
  {
    id: 'fire_ant',
    name: '불개미',
    short: '불',
    family: 'ant',
    tier: 2,
    hp: 90,
    dmg: 12,
    atkInterval: 0.95,
    armor: 0,
    speed: 1.15,
    range: 0.4,
    siegeMult: 0.7,
    pierce: 0,
    body: 0.17,
    spawnInterval: 6.5,
    unlockGas: 50,
    poisonDps: 4,
    poisonDuration: 3,
  },
  {
    id: 'acid_ant',
    name: '산성개미',
    short: '산',
    family: 'ant',
    tier: 3,
    hp: 70,
    dmg: 11,
    atkInterval: 0.55,
    armor: 0,
    speed: 1.15,
    range: 1.35,
    siegeMult: 0.65,
    pierce: 0,
    body: 0.2,
    spawnInterval: 11,
    unlockGas: 100,
    poisonDps: 5,
    poisonDuration: 3.5,
  },

  // —— Beetles (expensive tanks)
  {
    id: 'rhino_beetle',
    name: '코뿔소풍뎅이',
    short: '코',
    family: 'beetle',
    tier: 1,
    hp: 160,
    dmg: 11,
    atkInterval: 1.0,
    armor: 3,
    speed: 0.6,
    range: 0.32,
    siegeMult: 1,
    pierce: 0,
    body: 0.34,
    spawnInterval: 12,
    unlockGas: 0,
    poisonDps: 0,
    poisonDuration: 0,
  },
  {
    id: 'kabuto_beetle',
    name: '장수풍뎅이',
    short: '장',
    family: 'beetle',
    tier: 2,
    hp: 280,
    dmg: 18,
    atkInterval: 1.05,
    armor: 5,
    speed: 0.52,
    range: 0.34,
    siegeMult: 1,
    pierce: 0,
    body: 0.4,
    spawnInterval: 16,
    unlockGas: 90,
    poisonDps: 0,
    poisonDuration: 0,
  },

  // —— Mantises (expensive pierce). Base pierce ≈ attack × 1.5
  {
    id: 'leaf_mantis',
    name: '좀사마귀',
    short: '좀',
    family: 'mantis',
    tier: 1,
    hp: 48,
    dmg: 12,
    atkInterval: 0.9,
    armor: 0,
    speed: 0.95,
    range: 0.72,
    siegeMult: 0.7,
    pierce: 18,
    body: 0.28,
    spawnInterval: 11,
    unlockGas: 0,
    poisonDps: 0,
    poisonDuration: 0,
  },
  {
    id: 'king_mantis',
    name: '왕사마귀',
    short: '왕',
    family: 'mantis',
    tier: 2,
    hp: 100,
    dmg: 22,
    atkInterval: 1.0,
    armor: 1,
    speed: 0.85,
    range: 0.9,
    siegeMult: 0.7,
    pierce: 33,
    body: 0.34,
    spawnInterval: 15,
    unlockGas: 90,
    poisonDps: 0,
    poisonDuration: 0,
  },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));
