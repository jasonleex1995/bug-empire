import {
  barracksUpgradeCost,
  canPlace,
  castleUpgrade,
  castleUpgradeCost,
  emergency,
  isUnlocked,
  moduleCost,
  place,
  rechargeEmergency,
  unlock,
  upgradeModule,
} from '../actions';
import { COLS, MID, ROWS, castleX, moduleSpan, otherSide, type Side } from '../config';
import { MODULE_BY_ID, RESOURCE_MODULES, STICKY_DEW, THORN_WALL, WIND_GUST } from '../data/modules';
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
  /** Extra barracks per lane beyond the profile quota, raised when minerals sit idle. */
  private bonusBarracks = 0;

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
    // Shared front: army composition is global; row still tracks building pressure / placement.
    const globalFam: Record<Family, number> = { ant: 0, beetle: 0, mantis: 0 };
    for (const u of state.units) {
      if (u.side === side || u.hp <= 0) continue;
      if (Math.abs(u.x - cx) > COLS + MID) continue;
      globalFam[UNIT_BY_ID[u.defId].family] += UNIT_BY_ID[u.defId].tier;
    }
    // Open intel: always read enemy barracks so counters can be chosen.
    for (const m of state.modules) {
      if (m.side !== enemy) continue;
      const def = MODULE_BY_ID[m.defId];
      if (def.kind === 'barracks') globalFam[UNIT_BY_ID[def.unitId!].family] += 2 * m.level;
    }
    const topGlobal = (Object.keys(globalFam) as Family[]).reduce((a, b) => (globalFam[b] > globalFam[a] ? b : a));
    const dominant: Family | null = globalFam[topGlobal] > 0 ? topGlobal : null;

    const infos: LaneInfo[] = [];
    for (let row = 0; row < ROWS; row++) {
      let enemyHp = 0;
      let ownHp = 0;
      let nearestThreat = Infinity;
      for (const u of state.units) {
        // Threat near this row's buildings still uses spawn row for base defense.
        if (u.row !== row) continue;
        const dist = Math.abs(u.x - cx);
        if (dist > COLS + MID) continue;
        if (u.side === side) ownHp += u.hp;
        else {
          enemyHp += u.hp;
          nearestThreat = Math.min(nearestThreat, dist);
        }
      }
      infos.push({ row, enemyHp, ownHp, enemyFamily: dominant, nearestThreat });
    }
    return infos;
  }

  private handleEmergencies(state: GameState): void {
    const p = state.players[this.side];
    const cx = castleX(this.side);
    for (let row = 0; row < ROWS; row++) {
      let hpNear = 0;
      for (const u of state.units) {
        if (u.side === this.side || u.row !== row) continue;
        if (Math.abs(u.x - cx) <= 1.2) hpNear += u.hp;
      }
      if (hpNear < 200) continue;
      // A serious blob at the gate: buy the charge back if needed, then wipe. Only reactive
      // profiles (hard/hell) spend gas on this; normal uses the free charge only.
      if (!p.emergencyCharges[row] && this.profile.reactive && hpNear >= 500) rechargeEmergency(state, this.side, row);
      if (p.emergencyCharges[row]) emergency(state, this.side, row);
    }
  }

  private spendGas(state: GameState, lanes: LaneInfo[]): void {
    const p = state.players[this.side];
    const prof = this.profile;

    let unlockedCount = 0;
    for (const id of prof.unlockOrder) {
      if (isUnlocked(state, this.side, id)) {
        unlockedCount++;
        continue;
      }
      const u = UNIT_BY_ID[id];
      if (p.gas >= u.unlockGas) {
        unlock(state, this.side, id);
        return;
      }
      // Save up for the first two unlocks instead of nickel-and-diming gas into small upgrades;
      // later unlocks are bought opportunistically.
      if (unlockedCount < 2) return;
      break;
    }

    this.gasToggle = (this.gasToggle + 1) % 10;
    const preferBarracks = this.gasToggle / 10 < prof.barracksUpgradeBias;
    const canBarracks = !prof.noBarracksUpgrades;
    const canCastle = !prof.noCastleUpgrades;

    if (preferBarracks && canBarracks && this.tryBarracksUpgrade(state)) return;
    if (canCastle && this.tryCastleUpgrade(state, lanes)) return;
    if (!preferBarracks && canBarracks) this.tryBarracksUpgrade(state);
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

    // Prefer the family's identity weapon first when facing a counter target.
    const dominantEnemy = lanes.map((l) => l.enemyFamily).filter((f): f is Family => f !== null)[0] ?? null;
    let trackOrder: Track[] = TRACKS;
    if (dominantEnemy === 'beetle') trackOrder = ['t0', 't1']; // mantis pierce / beetle armor
    else if (dominantEnemy === 'ant') trackOrder = ['t1', 't0'];
    else if (dominantEnemy === 'mantis') trackOrder = ['t0', 't1'];
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
      // A lane already lost to a big blob is not worth feeding: anything built there dies before it
      // finishes. Save for the emergency wipe / counter-pushes elsewhere instead.
      if (pressured && pressured.enemyHp < 350) {
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
          return n < this.barracksQuota() && this.freeColsIn(state, row).length > 0;
        });
        if (wantsMore) return 'wait';
        // Quota met and minerals idle: raise the quota so spare cells turn into production.
        if (p.minerals >= 250 && this.bonusBarracks < COLS) this.bonusBarracks++;
        return 'skip';
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

  private barracksQuota(): number {
    return this.profile.barracksPerLane + this.bonusBarracks;
  }

  /** Empty cells in a lane that are not directly under enemy units (a build there dies before it finishes). */
  private freeColsIn(state: GameState, row: number): number[] {
    const cols: number[] = [];
    for (let c = 0; c < COLS; c++) {
      if (moduleAt(state, this.side, row, c)) continue;
      const [a, b] = moduleSpan(this.side, c);
      const contested = state.units.some((u) => u.side !== this.side && u.row === row && u.hp > 0 && u.x > a - 0.8 && u.x < b + 0.8);
      if (!contested) cols.push(c);
    }
    return cols;
  }

  private tryFarm(state: GameState, farms: number): boolean {
    const p = state.players[this.side];
    // Honey pots once the economy is rolling; aphid farms early.
    const honeyOk = (this.profile.honeyEarly || farms >= 3) && p.minerals >= moduleCost(state, this.side, RESOURCE_MODULES[1].id);
    const def = honeyOk ? RESOURCE_MODULES[1] : RESOURCE_MODULES[0];
    if (p.minerals < moduleCost(state, this.side, def.id)) return false;
    // Lowest free column (closest to castle), preferring lanes that already have a barracks in front of it.
    let best: { row: number; col: number; score: number } | null = null;
    for (let row = 0; row < ROWS; row++) {
      const free = this.freeColsIn(state, row);
      if (free.length === 0) continue;
      const col = free[0];
      const guarded = state.modules.some((m) => m.side === this.side && m.row === row && m.col > col && MODULE_BY_ID[m.defId].kind === 'barracks');
      const score = col * 10 + (COLS - free.length) + (guarded ? 0 : 100);
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
    // A lone barracks' trickle dies at the enemy castle wall, so bring each opened lane up to a
    // two-barracks stack before opening the next one; after that, fill the thinnest lane first.
    const stackTo = Math.min(2, this.barracksQuota());
    const ranked = rows
      .map((row) => ({ row, n: state.modules.filter((m) => m.side === this.side && m.row === row && MODULE_BY_ID[m.defId].kind === 'barracks').length }))
      .filter((l) => l.n < this.barracksQuota())
      .sort((a, b) => {
        const aOpen = a.n > 0 && a.n < stackTo ? 0 : 1;
        const bOpen = b.n > 0 && b.n < stackTo ? 0 : 1;
        return aOpen - bOpen || a.n - b.n;
      });
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
    for (const def of this.defensePreference(lanes[row])) {
      if (p.minerals >= def.cost) return place(state, this.side, row, col, def.id).ok;
    }
    return false;
  }

  /** Wall under pressure; otherwise gust → sticky → wall (or a forced style). */
  private defensePreference(lane: LaneInfo) {
    const style = this.profile.defenseStyle ?? 'auto';
    if (style === 'wall') return [THORN_WALL];
    if (style === 'gust') return [WIND_GUST];
    if (style === 'slow') return [STICKY_DEW];
    return lane.enemyHp > 200
      ? [THORN_WALL, WIND_GUST, STICKY_DEW]
      : [WIND_GUST, STICKY_DEW, THORN_WALL];
  }
}
