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
  /** Gas needed to unlock this unit's barracks (0 = available from start). */
  unlockGas: number;
  short: string;
}

export const FAMILY_NAME: Record<Family, string> = {
  ant: '개미류',
  beetle: '딱정벌레류',
  mantis: '사마귀류',
};

/**
 * Rock-paper-scissors on top of flat armor:
 * ants swarm mantises, mantises pierce beetles, beetles shrug off ants.
 */
export const FAMILY_MULT: Record<Family, Record<Family, number>> = {
  ant: { ant: 1, beetle: 0.85, mantis: 1.25 },
  beetle: { ant: 1.25, beetle: 1, mantis: 0.85 },
  mantis: { ant: 0.85, beetle: 1.25, mantis: 1 },
};

export const UNITS: UnitDef[] = [
  // 개미류: 싸고 빠르고 많다. 방어력이 거의 없다.
  { id: 'worker_ant', name: '일개미', short: '일', family: 'ant', tier: 1, hp: 40, dmg: 6, atkInterval: 1.0, armor: 0, speed: 1.2, range: 0.3, siegeMult: 1, unlockGas: 0 },
  { id: 'soldier_ant', name: '병정개미', short: '병', family: 'ant', tier: 2, hp: 90, dmg: 12, atkInterval: 1.0, armor: 1, speed: 1.1, range: 0.3, siegeMult: 1, unlockGas: 60 },
  { id: 'acid_ant', name: '산성개미', short: '산', family: 'ant', tier: 3, hp: 70, dmg: 9, atkInterval: 0.5, armor: 0, speed: 1.2, range: 1.4, siegeMult: 1, unlockGas: 120 },

  // 딱정벌레류: 느리고 단단하다. 사슴벌레는 공성 특화.
  { id: 'ladybug', name: '무당벌레', short: '무', family: 'beetle', tier: 1, hp: 120, dmg: 8, atkInterval: 0.9, armor: 2, speed: 0.7, range: 0.3, siegeMult: 1, unlockGas: 0 },
  { id: 'rhino_beetle', name: '장수풍뎅이', short: '장', family: 'beetle', tier: 2, hp: 300, dmg: 20, atkInterval: 0.8, armor: 4, speed: 0.6, range: 0.3, siegeMult: 1.25, unlockGas: 60 },
  { id: 'stag_beetle', name: '사슴벌레', short: '사', family: 'beetle', tier: 3, hp: 520, dmg: 36, atkInterval: 0.9, armor: 6, speed: 0.55, range: 0.35, siegeMult: 2, unlockGas: 120 },

  // 사마귀류: 한 방이 크고 리치가 길다. 체력이 낮다.
  { id: 'small_mantis', name: '애기사마귀', short: '애', family: 'mantis', tier: 1, hp: 55, dmg: 18, atkInterval: 0.9, armor: 0, speed: 0.9, range: 0.7, siegeMult: 1, unlockGas: 0 },
  { id: 'king_mantis', name: '왕사마귀', short: '왕', family: 'mantis', tier: 2, hp: 120, dmg: 42, atkInterval: 1.0, armor: 1, speed: 0.85, range: 0.8, siegeMult: 1, unlockGas: 80 },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));
