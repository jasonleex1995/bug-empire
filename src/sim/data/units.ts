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
 * Balance model: "value" = HP x DPS per spawn, normalised by spawn interval.
 * Targets per 10s of production: T1 ~1000, T2 ~2000, T3 ~3000.
 * Ants spawn twice as often with half the value each (swarm); beetles carry armor and siege;
 * mantises hit hard from reach but are weak against structures.
 */
export const UNITS: UnitDef[] = [
  // 개미류: 싸고 빠르고 많다. 방어력이 거의 없고 고정 감산 방어력에 약하다.
  { id: 'worker_ant', name: '일개미', short: '일', family: 'ant', tier: 1, hp: 55, dmg: 10, atkInterval: 1.0, armor: 0, speed: 1.2, range: 0.4, siegeMult: 0.7, pierce: false, body: 0.15, spawnInterval: 5, unlockGas: 0 },
  { id: 'soldier_ant', name: '병정개미', short: '병', family: 'ant', tier: 2, hp: 120, dmg: 14, atkInterval: 1.0, armor: 1, speed: 1.1, range: 0.4, siegeMult: 0.8, pierce: false, body: 0.18, spawnInterval: 7, unlockGas: 60 },
  { id: 'acid_ant', name: '산성개미', short: '산', family: 'ant', tier: 3, hp: 80, dmg: 10, atkInterval: 0.5, armor: 0, speed: 1.2, range: 1.4, siegeMult: 0.7, pierce: true, body: 0.2, spawnInterval: 12, unlockGas: 120 },

  // 풍뎅이류: 껍질이 두껍고 느리다. 이름은 개미/사마귀처럼 계열이 한눈에 들어오게.
  // T1 무당벌레는 엄밀히는 무당벌레과지만, 에셋·인지도·갑옷 정체성이 맞아 같은 계열로 둔다.
  { id: 'ladybug', name: '무당벌레', short: '무', family: 'beetle', tier: 1, hp: 115, dmg: 9, atkInterval: 0.9, armor: 2, speed: 0.7, range: 0.3, siegeMult: 1, pierce: false, body: 0.3, spawnInterval: 10, unlockGas: 0 },
  { id: 'rhino_beetle', name: '장수풍뎅이', short: '장', family: 'beetle', tier: 2, hp: 220, dmg: 20, atkInterval: 0.9, armor: 3, speed: 0.6, range: 0.3, siegeMult: 1.25, pierce: false, body: 0.36, spawnInterval: 14, unlockGas: 60 },
  { id: 'stag_beetle', name: '사슴벌레', short: '사', family: 'beetle', tier: 3, hp: 350, dmg: 30, atkInterval: 1.0, armor: 5, speed: 0.55, range: 0.35, siegeMult: 2, pierce: false, body: 0.42, spawnInterval: 18, unlockGas: 120 },

  // 사마귀류: 한 방이 크고 리치가 길다. 체력이 낮고 건물에는 약하다.
  { id: 'small_mantis', name: '애기사마귀', short: '애', family: 'mantis', tier: 1, hp: 60, dmg: 14, atkInterval: 0.9, armor: 0, speed: 0.9, range: 0.7, siegeMult: 0.75, pierce: false, body: 0.3, spawnInterval: 10, unlockGas: 0 },
  { id: 'king_mantis', name: '왕사마귀', short: '왕', family: 'mantis', tier: 2, hp: 120, dmg: 26, atkInterval: 1.0, armor: 1, speed: 0.85, range: 0.8, siegeMult: 0.75, pierce: false, body: 0.34, spawnInterval: 16, unlockGas: 80 },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));
