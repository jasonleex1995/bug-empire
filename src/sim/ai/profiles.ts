export type BuildGoal = 'farm' | 'barracks' | 'defense';

export interface AiProfile {
  id: string;
  name: string;
  /** Seconds between decisions. */
  decisionInterval: number;
  /** Farms wanted before anything else. */
  farmTarget: number;
  /** Farms wanted once minerals pile up beyond `farmSurplus`. */
  farmLateTarget: number;
  farmSurplus: number;
  buildBarracks: boolean;
  buildDefense: boolean;
  /** Max defense modules per lane. */
  defensePerLane: number;
  /** Only build defenses when a lane is under pressure (needs `reactive`). */
  defenseOnlyWhenPressured: boolean;
  /** React to lane pressure with defenses / counter barracks / emergency. */
  reactive: boolean;
  /** Read the opponent's grid directly instead of inferring from visible units. */
  cheatVision: boolean;
  /** Number of lanes to put barracks in (1 = all-in). */
  concentrateLanes: number;
  /** Stop adding barracks to a lane once it holds this many. */
  barracksPerLane: number;
  /** Preferred unit ids, most preferred first. */
  unitPrefs: string[];
  unlockOrder: string[];
  /** Order in which mineral spending goals are tried each decision. */
  priority: BuildGoal[];
  /** Fraction of gas decisions that go to barracks upgrades vs castle upgrades. */
  barracksUpgradeBias: number;
  /** Prefer honey pots as soon as affordable instead of after 3 farms. */
  honeyEarly?: boolean;
  /** Which defense to reach for when not under heavy pressure. */
  defenseStyle?: 'auto' | 'wall' | 'turret' | 'mushroom';
  /** Skip castle upgrades entirely (gas goes to unlocks / barracks). */
  noCastleUpgrades?: boolean;
  /** Skip barracks upgrades entirely. */
  noBarracksUpgrades?: boolean;
}

const ALL_UNITS_BALANCED = [
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

export const PROFILES: Record<string, AiProfile> = {
  balanced: {
    id: 'balanced',
    name: '균형',
    decisionInterval: 3,
    farmTarget: 2,
    farmLateTarget: 5,
    farmSurplus: 220,
    buildBarracks: true,
    buildDefense: true,
    defensePerLane: 1,
    defenseOnlyWhenPressured: false,
    reactive: false,
    cheatVision: false,
    concentrateLanes: 4,
    barracksPerLane: 3,
    unitPrefs: ALL_UNITS_BALANCED,
    unlockOrder: ['fire_ant', 'kabuto_beetle', 'orchid_mantis', 'stag_beetle', 'acid_ant', 'king_mantis'],
    priority: ['farm', 'barracks', 'defense'],
    barracksUpgradeBias: 0.5,
  },
  rush: {
    id: 'rush',
    name: '올인 러시',
    decisionInterval: 2,
    farmTarget: 1,
    farmLateTarget: 2,
    farmSurplus: 300,
    buildBarracks: true,
    buildDefense: false,
    defensePerLane: 0,
    defenseOnlyWhenPressured: false,
    reactive: false,
    cheatVision: false,
    concentrateLanes: 2,
    barracksPerLane: 5,
    unitPrefs: ['fire_ant', 'black_ant', 'leaf_mantis', 'rhino_beetle', 'kabuto_beetle', 'orchid_mantis'],
    unlockOrder: ['fire_ant', 'kabuto_beetle'],
    priority: ['barracks', 'farm'],
    barracksUpgradeBias: 0.8,
  },
  defenseOnly: {
    id: 'defenseOnly',
    name: '디펜스 올인',
    decisionInterval: 2,
    farmTarget: 4,
    farmLateTarget: 8,
    farmSurplus: 150,
    buildBarracks: false,
    buildDefense: true,
    defensePerLane: 4,
    defenseOnlyWhenPressured: false,
    reactive: true,
    cheatVision: false,
    concentrateLanes: 4,
    barracksPerLane: 0,
    unitPrefs: [],
    unlockOrder: [],
    priority: ['farm', 'defense'],
    barracksUpgradeBias: 0,
  },
  ecoOnly: {
    id: 'ecoOnly',
    name: '경제 올인',
    decisionInterval: 2,
    farmTarget: 12,
    farmLateTarget: 14,
    farmSurplus: 100,
    buildBarracks: true,
    buildDefense: true,
    defensePerLane: 1,
    defenseOnlyWhenPressured: false,
    reactive: false,
    cheatVision: false,
    concentrateLanes: 4,
    barracksPerLane: 3,
    unitPrefs: ALL_UNITS_BALANCED,
    unlockOrder: ['kabuto_beetle', 'orchid_mantis', 'stag_beetle', 'king_mantis'],
    priority: ['farm', 'barracks', 'defense'],
    barracksUpgradeBias: 0.5,
  },
  turtle: {
    id: 'turtle',
    name: '방어 후 역습',
    decisionInterval: 2,
    farmTarget: 3,
    farmLateTarget: 6,
    farmSurplus: 200,
    buildBarracks: true,
    buildDefense: true,
    defensePerLane: 2,
    defenseOnlyWhenPressured: false,
    reactive: true,
    cheatVision: false,
    concentrateLanes: 4,
    barracksPerLane: 2,
    unitPrefs: ALL_UNITS_BALANCED,
    unlockOrder: ['kabuto_beetle', 'stag_beetle', 'king_mantis'],
    priority: ['farm', 'defense', 'barracks'],
    barracksUpgradeBias: 0.3,
  },
};

// Experimental variants used only by the headless runner to isolate one variable at a time.
PROFILES.rushSpread = { ...PROFILES.rush, id: 'rushSpread', name: '러시(4레인)', concentrateLanes: 4 };
PROFILES.balancedFocus = { ...PROFILES.balanced, id: 'balancedFocus', name: '균형(2레인)', concentrateLanes: 2 };
PROFILES.reactive = { ...PROFILES.balanced, id: 'reactive', name: '균형(반응형)', reactive: true, decisionInterval: 2.5 };

export type Difficulty = 'normal' | 'hard' | 'hell';

export interface DifficultyPreset {
  id: Difficulty;
  name: string;
  profile: AiProfile;
  resourceMult: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyPreset> = {
  normal: {
    id: 'normal',
    name: '노말',
    profile: { ...PROFILES.balanced, id: 'normal', decisionInterval: 3.5 },
    resourceMult: 1.0,
  },
  hard: {
    id: 'hard',
    name: '하드',
    profile: { ...PROFILES.balanced, id: 'hard', reactive: true, decisionInterval: 2.5, defensePerLane: 1 },
    resourceMult: 1.15,
  },
  hell: {
    id: 'hell',
    name: '헬',
    profile: { ...PROFILES.balanced, id: 'hell', reactive: true, cheatVision: true, decisionInterval: 1.5, defensePerLane: 2, farmLateTarget: 6 },
    resourceMult: 1.4,
  },
};
