import type { Family } from './units';

export type Track = 'atk' | 'armor' | 'special';
export const TRACKS: Track[] = ['atk', 'armor', 'special'];
export const MAX_UPGRADE_LEVEL = 3;

/** Gas cost to go from level (n-1) to level n. */
export const UPGRADE_GAS_COST: Record<1 | 2 | 3, number> = { 1: 40, 2: 80, 3: 140 };

export const TRACK_NAME: Record<Track, string> = { atk: '공격력', armor: '방어력', special: '특성' };

/** Family-specific third track. Each level adds this fraction. */
export const SPECIAL_TRACK: Record<Family, { name: string; desc: string; perLevel: number }> = {
  ant: { name: '이동속도', desc: '개미류 이동속도 +15%/단계', perLevel: 0.15 },
  beetle: { name: '체력', desc: '딱정벌레류 최대 체력 +20%/단계', perLevel: 0.2 },
  mantis: { name: '공격속도', desc: '사마귀류 공격속도 +15%/단계', perLevel: 0.15 },
};

/** Flat attack added per level, per family (bigger hitters get bigger increments). */
export const ATK_PER_LEVEL: Record<Family, number> = { ant: 2, beetle: 4, mantis: 6 };
export const ARMOR_PER_LEVEL = 1;

export type UpgradeState = Record<Family, Record<Track, number>>;

export function emptyUpgrades(): UpgradeState {
  return {
    ant: { atk: 0, armor: 0, special: 0 },
    beetle: { atk: 0, armor: 0, special: 0 },
    mantis: { atk: 0, armor: 0, special: 0 },
  };
}
