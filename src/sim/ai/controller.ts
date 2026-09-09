import {
  barracksUpgradeCost,
  canPlace,
  castleUpgrade,
  castleUpgradeCost,
  emergency,
  isUnlocked,
  moduleCost,
  place,
  unlock,
  upgradeModule,
} from '../actions';
import { COLS, MID, ROWS, castleX, otherSide, type Side } from '../config';
import { DEFENSE_MODULES, MODULE_BY_ID, RESOURCE_MODULES } from '../data/modules';
import { FAMILY_MULT, UNIT_BY_ID, type Family } from '../data/units';
import { TRACKS, type Track } from '../data/upgrades';
import { moduleAt, type GameState } from '../state';
import type { AiProfile, BuildGoal } from './profiles';

interface LaneInfo {
  row: number;
  enemyHp: number;
  ownHp: number;
  /** Family of enemy units most present in this lane (from visible units). */
  enemyFamily: Family | null;
  /** Enemy closest to our castle, as distance in cells (Infinity if none). */
  nearestThreat: number;
}

export class AiController {
  private nextDecision = 0;
  private laneOffset: number;
  private gasToggle = 0;

  constructor(
    public readonly side: Side,
    public readonly profile: AiProfile,
    seed: number,
  ) {
    this.laneOffset = seed % ROWS;
  }

  update(state: GameState): void {
    // Emergency charges are checked every tick: a leak into the castle is decided in a second or two.
    this.handleEmergencies(state);
    if (state.t < this.nextDecision) return;
    this.nextDecision = state.t + this.profile.decisionInterval;

    const lanes = this.analyzeLanes(state);
    this.spendGas(state, lanes);
    this.spendMinerals(state, lanes);
  }

  private analyzeLanes(state: GameState): LaneInfo[] {
    const side = this.side;
    const cx = castleX(side);
    const enemy = otherSide(side);
    const infos: LaneInfo[] = [];
    for (let row = 0; row < ROWS; row++) {
      let enemyHp = 0;
      let ownHp = 0;
      let nearestThreat = Infinity;
      const famCount: Record<Family, number> = { ant: 0, beetle: 0, mantis: 0 };
      for (const u of state.units) {
        if (u.row !== row) continue;
        const dist = Math.abs(u.x - cx);
        // Only count units that are in our half or the battlefield.
        if (dist > COLS + MID) continue;
        if (u.side === side) ownHp += u.hp;
        else {
          enemyHp += u.hp;
          famCount[UNIT_BY_ID[u.defId].family] += UNIT_BY_ID[u.defId].tier;
          nearestThreat = Math.min(nearestThreat, dist);
        }
      }
      if (this.profile.cheatVision) {
        for (const m of state.modules) {
          if (m.side !== enemy || m.row !== row) continue;
          const def = MODULE_BY_ID[m.defId];
          if (def.kind === 'barracks') famCount[UNIT_BY_ID[def.unitId!].family] += 2 * m.level;
        }
      }
      const top = (Object.keys(famCount) as Family[]).reduce((a, b) => (famCount[b] > famCount[a] ? b : a));
      infos.push({ row, enemyHp, ownHp, enemyFamily: famCount[top] > 0 ? top : null, nearestThreat });
    }
    return infos;
  }

  private handleEmergencies(state: GameState): void {
    const p = state.players[this.side];
    const cx = castleX(this.side);
    for (let row = 0; row < ROWS; row++) {
      if (!p.emergencyCharges[row]) continue;
      let hpNear = 0;
      for (const u of state.units) {
        if (u.side === this.side || u.row !== row) continue;
        if (Math.abs(u.x - cx) <= 1.2) hpNear += u.hp;
      }
      if (hpNear >= 60) emergency(state, this.side, row);
    }
  }

  private spendGas(state: GameState, lanes: LaneInfo[]): void {
    const p = state.players[this.side];
    const prof = this.profile;

    for (const id of prof.unlockOrder) {
      if (isUnlocked(state, this.side, id)) continue;
      const u = UNIT_BY_ID[id];
      if (p.gas >= u.unlockGas) {
        unlock(state, this.side, id);
        return;
      }
      break;
    }

    this.gasToggle = (this.gasToggle + 1) % 10;
    const preferBarracks = this.gasToggle / 10 < prof.barracksUpgradeBias;

    if (preferBarracks && this.tryBarracksUpgrade(state)) return;
    if (this.tryCastleUpgrade(state, lanes)) return;
    if (!preferBarracks) this.tryBarracksUpgrade(state);
  }

  private tryBarracksUpgrade(state: GameState): boolean {
    const p = state.players[this.side];
    const candidates = state.modules
      .filter((m) => m.side === this.side && MODULE_BY_ID[m.defId].kind === 'barracks' && m.buildRemaining === 0 && m.upgradeRemaining === 0 && m.level < 3)
      .sort((a, b) => a.level - b.level || UNIT_BY_ID[MODULE_BY_ID[b.defId].unitId!].tier - UNIT_BY_ID[MODULE_BY_ID[a.defId].unitId!].tier);
    for (const m of candidates) {
      const cost = barracksUpgradeCost(m);
      if (!cost) continue;
      if (p.minerals >= cost.minerals && p.gas >= cost.gas) {
        return upgradeModule(state, this.side, m.id).ok;
      }
    }
    return false;
  }

  private tryCastleUpgrade(state: GameState, lanes: LaneInfo[]): boolean {
    const p = state.players[this.side];
    const famCount: Record<Family, number> = { ant: 0, beetle: 0, mantis: 0 };
    for (const m of state.modules) {
      if (m.side !== this.side) continue;
      const def = MODULE_BY_ID[m.defId];
      if (def.kind === 'barracks') famCount[UNIT_BY_ID[def.unitId!].family] += m.level;
    }
    const families = (Object.keys(famCount) as Family[]).filter((f) => famCount[f] > 0).sort((a, b) => famCount[b] - famCount[a]);
    if (families.length === 0) return false;

    // Facing lots of armored beetles: raw attack matters more. Facing ants: armor.
    const dominantEnemy = lanes.map((l) => l.enemyFamily).filter((f): f is Family => f !== null)[0] ?? null;
    let trackOrder: Track[] = TRACKS;
    if (dominantEnemy === 'beetle') trackOrder = ['atk', 'special', 'armor'];
    else if (dominantEnemy === 'ant') trackOrder = ['armor', 'atk', 'special'];

    for (const fam of families) {
      let cheapest: { track: Track; cost: number } | null = null;
      for (const track of trackOrder) {
        const cost = castleUpgradeCost(state, this.side, fam, track);
        if (cost === null) continue;
        if (!cheapest || cost < cheapest.cost) cheapest = { track, cost };
      }
      if (cheapest && p.gas >= cheapest.cost) {
        return castleUpgrade(state, this.side, fam, cheapest.track).ok;
      }
    }
    return false;
  }

  private spendMinerals(state: GameState, lanes: LaneInfo[]): void {
    const prof = this.profile;
    const own = state.modules.filter((m) => m.side === this.side);
    const farms = own.filter((m) => MODULE_BY_ID[m.defId].kind === 'resource').length;
    const p = state.players[this.side];

    // Reactive builds jump the queue: a pressured lane gets a defense or a counter barracks first.
    if (prof.reactive) {
      const pressured = lanes
        .filter((l) => l.enemyHp > l.ownHp + 40 && l.nearestThreat < COLS + 1)
        .sort((a, b) => a.nearestThreat - b.nearestThreat)[0];
      if (pressured) {
        if (prof.buildBarracks && this.tryBarracks(state, [pressured.row], pressured.enemyFamily)) return;
        if (prof.buildDefense && this.tryDefense(state, pressured.row, lanes)) return;
      }
    }

    for (const goal of prof.priority) {
      const r = this.tryGoal(state, goal, farms, lanes);
      // 'wait' means the goal is wanted but unaffordable: save up instead of buying cheaper filler.
      if (r === 'built' || r === 'wait') return;
    }

    // Money piling up with nothing better to do: a farm is never useless if there is room.
    if (p.minerals >= prof.farmSurplus && farms < prof.farmLateTarget) this.tryFarm(state, farms);
  }

  private tryGoal(state: GameState, goal: BuildGoal, farms: number, lanes: LaneInfo[]): 'built' | 'wait' | 'skip' {
    const prof = this.profile;
    const p = state.players[this.side];
    switch (goal) {
      case 'farm': {
        const wanted = farms < prof.farmTarget || (p.minerals >= prof.farmSurplus && farms < prof.farmLateTarget);
        if (!wanted) return 'skip';
        return this.tryFarm(state, farms) ? 'built' : 'wait';
      }
      case 'barracks': {
        if (!prof.buildBarracks) return 'skip';
        const laneRows = Array.from({ length: prof.concentrateLanes }, (_, i) => (this.laneOffset + i) % ROWS);
        if (this.tryBarracks(state, laneRows, null)) return 'built';
        // Nothing affordable right now; wait unless the lanes already hold enough barracks.
        const wantsMore = laneRows.some((row) => {
          const n = state.modules.filter((m) => m.side === this.side && m.row === row && MODULE_BY_ID[m.defId].kind === 'barracks').length;
          return n < prof.barracksPerLane && this.freeColsIn(state, row).length > 0;
        });
        return wantsMore ? 'wait' : 'skip';
      }
      case 'defense': {
        if (!prof.buildDefense) return 'skip';
        if (prof.defenseOnlyWhenPressured) return 'skip';
        const rows = lanes.slice().sort((a, b) => b.enemyHp - a.enemyHp).map((l) => l.row);
        for (const row of rows) if (this.tryDefense(state, row, lanes)) return 'built';
        return 'skip';
      }
    }
  }

  private freeColsIn(state: GameState, row: number): number[] {
    const cols: number[] = [];
    for (let c = 0; c < COLS; c++) if (!moduleAt(state, this.side, row, c)) cols.push(c);
    return cols;
  }

  private tryFarm(state: GameState, farms: number): boolean {
    const p = state.players[this.side];
    // Honey pots once the economy is rolling; aphid farms early.
    const def = farms >= 3 && p.minerals >= moduleCost(state, this.side, RESOURCE_MODULES[1].id) ? RESOURCE_MODULES[1] : RESOURCE_MODULES[0];
    if (p.minerals < moduleCost(state, this.side, def.id)) return false;
    // Lowest free column (closest to castle) across lanes, preferring lanes with fewer modules.
    let best: { row: number; col: number; score: number } | null = null;
    for (let row = 0; row < ROWS; row++) {
      const free = this.freeColsIn(state, row);
      if (free.length === 0) continue;
      const col = free[0];
      const score = col * 10 + (COLS - free.length);
      if (!best || score < best.score) best = { row, col, score };
    }
    if (!best) return false;
    return place(state, this.side, best.row, best.col, def.id).ok;
  }

  private pickUnit(state: GameState, counter: Family | null): string | null {
    const p = state.players[this.side];
    let candidates = this.profile.unitPrefs.filter((id) => isUnlocked(state, this.side, id) && p.minerals >= MODULE_BY_ID[`barracks_${id}`].cost);
    if (candidates.length === 0) return null;
    if (counter) {
      const good = candidates.filter((id) => FAMILY_MULT[UNIT_BY_ID[id].family][counter] > 1);
      if (good.length > 0) candidates = good;
    }
    // Highest tier among affordable, then preference order.
    candidates.sort((a, b) => UNIT_BY_ID[b].tier - UNIT_BY_ID[a].tier || this.profile.unitPrefs.indexOf(a) - this.profile.unitPrefs.indexOf(b));
    return candidates[0];
  }

  private tryBarracks(state: GameState, rows: number[], counter: Family | null): boolean {
    const unitId = this.pickUnit(state, counter);
    if (!unitId) return false;
    const defId = `barracks_${unitId}`;
    // Lane with the fewest barracks first.
    const ranked = rows
      .map((row) => ({ row, n: state.modules.filter((m) => m.side === this.side && m.row === row && MODULE_BY_ID[m.defId].kind === 'barracks').length }))
      .filter((l) => l.n < this.profile.barracksPerLane)
      .sort((a, b) => a.n - b.n);
    for (const { row } of ranked) {
      const free = this.freeColsIn(state, row);
      // Keep the front-most column for defenses when possible.
      const pref = free.filter((c) => c >= 1 && c <= COLS - 2).reverse();
      const col = pref[0] ?? free[free.length - 1];
      if (col === undefined) continue;
      if (canPlace(state, this.side, row, col, defId).ok) return place(state, this.side, row, col, defId).ok;
    }
    return false;
  }

  private tryDefense(state: GameState, row: number, lanes: LaneInfo[]): boolean {
    const p = state.players[this.side];
    const existing = state.modules.filter((m) => m.side === this.side && m.row === row && MODULE_BY_ID[m.defId].kind === 'defense').length;
    if (existing >= this.profile.defensePerLane) return false;
    const free = this.freeColsIn(state, row);
    if (free.length === 0) return false;
    const col = free[free.length - 1];
    const lane = lanes[row];
    // Under heavy pressure a wall buys the most time per mineral; otherwise take the best turret we can afford.
    const order = lane.enemyHp > 200 ? [DEFENSE_MODULES[0], DEFENSE_MODULES[2], DEFENSE_MODULES[1]] : [DEFENSE_MODULES[2], DEFENSE_MODULES[1], DEFENSE_MODULES[0]];
    for (const def of order) {
      if (p.minerals >= def.cost) return place(state, this.side, row, col, def.id).ok;
    }
    return false;
  }
}
