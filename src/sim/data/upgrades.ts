/**
 * Castle upgrades — two tracks per family (design lock).
 *   ant    → attack speed / HP
 *   beetle → armor / resist (shortens poison & slow)
 *   mantis → pierce / armor
 */
import type { Family } from './units';

export type Track = 't0' | 't1';
export const TRACKS: Track[] = ['t0', 't1'];
export const MAX_UPGRADE_LEVEL = 6;

export const UPGRADE_GAS_COST: Record<number, number> = { 1: 40, 2: 70, 3: 100, 4: 140, 5: 190, 6: 250 };

export type TrackEffect = 'atkSpeed' | 'hp' | 'armor' | 'resist' | 'pierce';

export interface TrackDef {
  effect: TrackEffect;
  name: string;
  desc: string;
  /** Flat for armor/pierce; fraction for atkSpeed/hp/resist. */
  perLevel: number;
}

export const FAMILY_TRACKS: Record<Family, Record<Track, TrackDef>> = {
  ant: {
    t0: { effect: 'atkSpeed', name: '공격속도', desc: '개미류 공격주기 −12%/단계', perLevel: 0.12 },
    t1: { effect: 'hp', name: '체력', desc: '개미류 최대 체력 +15%/단계', perLevel: 0.15 },
  },
  beetle: {
    t0: { effect: 'armor', name: '방어력', desc: '풍뎅이류 방어력 +1/단계', perLevel: 1 },
    t1: { effect: 'resist', name: '저항', desc: '독·둔화 지속 −15%/단계', perLevel: 0.15 },
  },
  mantis: {
    t0: { effect: 'pierce', name: '방어관통', desc: '사마귀류 관통 +4/단계 (공격보다 효율)', perLevel: 4 },
    t1: { effect: 'armor', name: '방어력', desc: '사마귀류 방어력 +1/단계', perLevel: 1 },
  },
};

export type UpgradeState = Record<Family, Record<Track, number>>;

export function emptyUpgrades(): UpgradeState {
  return {
    ant: { t0: 0, t1: 0 },
    beetle: { t0: 0, t1: 0 },
    mantis: { t0: 0, t1: 0 },
  };
}
