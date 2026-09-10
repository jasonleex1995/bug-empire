import { barracksUpgradeCost, castleUpgradeCost, isUnlocked, moduleCost } from '../sim/actions';
import type { Difficulty } from '../sim/ai/profiles';
import { DIFFICULTIES } from '../sim/ai/profiles';
import {
  ACID_RAIN,
  CASTLE_HP,
  COLS,
  EMERGENCY_RECHARGE_GAS,
  GAS_CAP,
  LANE_LENGTH,
  MID,
  REVEAL_RANGE,
  ROWS,
  SELL_REFUND_RATIO,
  UPGRADE_TIME,
  buildTimeFor,
  moduleSpan,
} from '../sim/config';
import { effectiveStats } from '../sim/combat';
import { BARRACKS_LEVEL_SPAWN_MULT, BARRACKS_MODULES, DEFENSE_MODULES, MODULE_BY_ID, RESOURCE_MODULES, type ModuleDef } from '../sim/data/modules';
import { FAMILY_NAME, FAMILY_SHORT, UNIT_BY_ID, type Family } from '../sim/data/units';
import { FAMILY_TRACKS, MAX_UPGRADE_LEVEL, TRACKS, type Track } from '../sim/data/upgrades';
import type { GameState, ModuleInst, UnitInst } from '../sim/state';
import {
  CARDS_LEFT,
  CARDS_TOP,
  CARD_GAP,
  CARD_GROUP_GAP,
  CARD_H,
  CARD_W,
  CASTLE_W,
  CELL_W,
  CONTEXT_H,
  CONTEXT_LEFT,
  CONTEXT_TOP,
  CONTEXT_W,
  GRID_LEFT,
  GRID_TOP,
  H,
  LANES_BOTTOM,
  LANE_H,
  TOP_BAR_H,
  W,
  inRect,
  laneToPx,
  rowCenter,
  rowTop,
  type Rect,
} from './layout';
import {
  C,
  FONT_DISPLAY,
  FONT_KO_DISPLAY,
  FONT_UI,
  KIND_COLOR,
  drawCastleFace,
  drawInsect,
  drawModuleGlyph,
  fillBg,
  glowCircle,
  rr,
  text,
} from './theme';
import { drawPixelGem, drawPixelOrb, drawPixelTitle, getMenuHeroImage } from './pixel';

export const ACID_CARD = 'acid_rain';

export interface Effect {
  kind: 'spark' | 'puff' | 'burst' | 'laneFlash' | 'laneGreen';
  x: number;
  y: number;
  row?: number;
  ttl: number;
  max: number;
  color?: string;
}

export interface UiState {
  screen: 'menu' | 'difficulty' | 'game' | 'end';
  difficulty: Difficulty;
  timeLimitMode: boolean;
  selectedCard: string | null;
  selectedModuleId: number | null;
  /** Castle family upgrades open as a modal, not a permanent bottom panel. */
  castlePanelOpen: boolean;
  hover: { x: number; y: number };
  speed: number;
  paused: boolean;
  message: { text: string; until: number } | null;
  /** Per lane, per family: wall-clock seconds when an enemy unit of that family was last visible. */
  laneIntel: Record<Family, number>[];
  effects: Effect[];
  now: number;
}

export interface Button extends Rect {
  id: string;
  onClick: () => void;
  tooltip?: string[];
  disabled?: boolean;
}

export interface UiApi {
  selectCard(id: string | null): void;
  togglePause(): void;
  setSpeed(n: number): void;
  upgradeSelected(): void;
  sellSelected(): void;
  castleUpgrade(f: Family, t: Track): void;
  toggleCastlePanel(open?: boolean): void;
  unlock(unitId: string): void;
  emergency(row: number): void;
  recharge(row: number): void;
  setDifficulty(d: Difficulty): void;
  setTimeLimitMode(on: boolean): void;
  /** Title → difficulty pick (flow A). */
  toDifficulty(): void;
  startGame(): void;
  toMenu(): void;
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, fg: string, bg = 'rgba(0,0,0,0.55)'): void {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  const rw = Math.max(0, Math.min(1, ratio)) * w;
  if (rw > 0.5) {
    rr(ctx, x, y, rw, h, h / 2);
    ctx.fillStyle = fg;
    ctx.fill();
  }
}

function fmtTime(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function button(
  ctx: CanvasRenderingContext2D,
  buttons: Button[],
  b: Button,
  label: string,
  ui: UiState,
  opts: { active?: boolean; size?: number; color?: string; fill?: string } = {},
): void {
  const hovered = inRect(b, ui.hover.x, ui.hover.y) && !b.disabled;
  ctx.fillStyle = b.disabled ? '#1a221c' : opts.fill ? opts.fill : opts.active ? '#3a4e32' : hovered ? '#2a382c' : C.panelLift;
  rr(ctx, b.x, b.y, b.w, b.h, 2);
  ctx.fill();
  ctx.strokeStyle = opts.active ? C.mineral : hovered ? C.panelLine : 'rgba(47,69,54,0.7)';
  ctx.lineWidth = opts.active ? 2 : 1;
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2, opts.size ?? 14, b.disabled ? C.mute : opts.color ?? C.text, 'center', 400);
  buttons.push(b);
}

// ---------------------------------------------------------------------------
// Lanes
// ---------------------------------------------------------------------------

function drawLanes(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState): void {
  // Soft ground wash behind the grid.
  const ground = ctx.createLinearGradient(GRID_LEFT, GRID_TOP, laneToPx(LANE_LENGTH), GRID_TOP);
  ground.addColorStop(0, 'rgba(60,100,60,0.12)');
  ground.addColorStop(COLS / LANE_LENGTH, 'rgba(80,70,40,0.08)');
  ground.addColorStop(1, 'rgba(100,50,40,0.12)');
  ctx.fillStyle = ground;
  ctx.fillRect(GRID_LEFT - 4, GRID_TOP - 4, LANE_LENGTH * CELL_W + 8, ROWS * LANE_H + 8);

  for (let row = 0; row < ROWS; row++) {
    const y = rowTop(row);
    for (let x = 0; x < LANE_LENGTH; x++) {
      const px = laneToPx(x);
      let a: string;
      let b: string;
      if (x < COLS) {
        a = C.leafLight;
        b = C.leafDark;
      } else if (x < COLS + MID) {
        a = C.midLight;
        b = C.midDark;
      } else {
        a = C.enemySoil;
        b = C.enemySoilDark;
      }
      ctx.fillStyle = (x + row) % 2 === 0 ? a : b;
      ctx.fillRect(px, y, CELL_W, LANE_H);

      // Subtle leaf vein / dirt grain — cheap procedural texture.
      if (x < COLS && (x + row) % 3 === 0) {
        ctx.strokeStyle = 'rgba(120,160,100,0.06)';
        ctx.beginPath();
        ctx.moveTo(px + 8, y + 10);
        ctx.quadraticCurveTo(px + 40, y + LANE_H / 2, px + CELL_W - 8, y + LANE_H - 12);
        ctx.stroke();
      }
    }
    // Lane separator as a thin root line.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, y + LANE_H);
    ctx.lineTo(laneToPx(LANE_LENGTH), y + LANE_H);
    ctx.stroke();
  }

  // Mid-field dust strip.
  const midX = laneToPx(COLS);
  const midG = ctx.createLinearGradient(midX, 0, midX + MID * CELL_W, 0);
  midG.addColorStop(0, 'rgba(0,0,0,0)');
  midG.addColorStop(0.5, 'rgba(200,170,100,0.07)');
  midG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = midG;
  ctx.fillRect(midX, GRID_TOP, MID * CELL_W, ROWS * LANE_H);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let col = 0; col <= COLS; col++) {
    const x1 = laneToPx(col);
    const x2 = laneToPx(LANE_LENGTH - col);
    ctx.beginPath();
    ctx.moveTo(x1, GRID_TOP);
    ctx.lineTo(x1, LANES_BOTTOM);
    ctx.moveTo(x2, GRID_TOP);
    ctx.lineTo(x2, LANES_BOTTOM);
    ctx.stroke();
  }

  // Quiet zone whispers — playfield stays the focus (PvZ lawn energy).
  text(ctx, '내 진영', laneToPx(COLS / 2), GRID_TOP + 16, 11, 'rgba(138,160,144,0.45)', 'center', 500);
  text(ctx, '전장', laneToPx(COLS + MID / 2), GRID_TOP + 16, 11, 'rgba(160,120,40,0.4)', 'center', 500);
  text(ctx, '적 진영', laneToPx(LANE_LENGTH - COLS / 2), GRID_TOP + 16, 11, 'rgba(138,160,144,0.45)', 'center', 500);

  if (ui.selectedCard) {
    const hx = (ui.hover.x - GRID_LEFT) / CELL_W;
    const row = Math.floor((ui.hover.y - GRID_TOP) / LANE_H);
    if (row >= 0 && row < ROWS && ui.hover.y >= GRID_TOP) {
      if (ui.selectedCard === ACID_CARD) {
        if (hx >= 0 && hx < LANE_LENGTH) {
          ctx.fillStyle = 'rgba(93,224,192,0.16)';
          ctx.fillRect(GRID_LEFT, rowTop(row), LANE_LENGTH * CELL_W, LANE_H);
        }
      } else if (hx >= 0 && hx < COLS) {
        const col = Math.floor(hx);
        const occupied = game.modules.some((m) => m.side === 0 && m.row === row && m.col === col);
        ctx.fillStyle = occupied ? 'rgba(224,112,92,0.22)' : 'rgba(126,207,106,0.22)';
        rr(ctx, laneToPx(col) + 2, rowTop(row) + 2, CELL_W - 4, LANE_H - 4, 6);
        ctx.fill();
      }
    }
  }
}

function drawCastles(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const [me] = game.players;
  drawCastleFace(ctx, 0, GRID_TOP, CASTLE_W, LANES_BOTTOM - GRID_TOP, 0, game.t);
  drawCastleFace(ctx, W - CASTLE_W, GRID_TOP, CASTLE_W, LANES_BOTTOM - GRID_TOP, 1, game.t);

  for (let row = 0; row < ROWS; row++) {
    const cy = rowCenter(row);
    const charged = me.emergencyCharges[row];
    const b: Button = {
      id: `emg${row}`,
      x: 5,
      y: cy - 16,
      w: CASTLE_W - 10,
      h: 32,
      onClick: () => (charged ? api.emergency(row) : api.recharge(row)),
      tooltip: charged
        ? ['비상 방어 (레인 ' + (row + 1) + ')', '내 진영 안의 적 유닛 전부 제거', '레인당 1회. 클릭해서 사용']
        : ['비상 방어 재충전', `가스 ${EMERGENCY_RECHARGE_GAS}`, '클릭해서 재충전'],
      disabled: !charged && me.gas < EMERGENCY_RECHARGE_GAS,
    };
    button(ctx, buttons, b, charged ? '!' : '+', ui, { active: charged, size: 16, color: charged ? C.mineral : C.dim });
    text(ctx, `${row + 1}`, W - CASTLE_W / 2, cy, 13, C.dim, 'center', 600);
  }
}

function moduleVisibleToPlayer(game: GameState, m: ModuleInst): boolean {
  if (m.side === 0) return true;
  const f = game.players[0].fog[m.row][m.col];
  return f !== null && game.t - f.seenAt < 0.2;
}

function unitVisibleToPlayer(game: GameState, u: UnitInst): boolean {
  if (u.side === 0) return true;
  if (u.x <= LANE_LENGTH - COLS + 0.3) return true;
  return game.units.some((s) => s.side === 0 && s.row === u.row && Math.abs(s.x - u.x) <= REVEAL_RANGE + 0.5);
}

function drawModule(ctx: CanvasRenderingContext2D, game: GameState, m: ModuleInst, ghost: boolean, selected: boolean): void {
  const def = MODULE_BY_ID[m.defId];
  const [a] = moduleSpan(m.side, m.col);
  const x = laneToPx(a) + 5;
  const y = rowTop(m.row) + 6;
  const w = CELL_W - 10;
  const h = LANE_H - 18;
  ctx.globalAlpha = ghost ? 0.4 : 1;

  // Soft pad under the structure.
  const pad = ctx.createLinearGradient(x, y, x, y + h);
  pad.addColorStop(0, ghost ? '#3a3830' : KIND_COLOR[def.kind]);
  pad.addColorStop(1, ghost ? '#2a2820' : 'rgba(0,0,0,0.35)');
  ctx.fillStyle = pad;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = C.mineral;
    ctx.lineWidth = 2;
    ctx.stroke();
    glowCircle(ctx, x + w / 2, y + h / 2, 30, C.amberGlow);
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Inner soil plate.
  ctx.fillStyle = ghost ? 'rgba(40,40,36,0.7)' : 'rgba(12,18,12,0.45)';
  rr(ctx, x + 5, y + 5, w - 10, h - 10, 8);
  ctx.fill();

  drawModuleGlyph(ctx, def.kind, def.id, x + w / 2, y + h / 2 + 2, ghost ? '#9a9588' : '#f2efe4', m.level);
  ctx.globalAlpha = 1;

  if (!ghost) {
    bar(ctx, x + 4, y + h + 2, w - 8, 4, m.hp / m.maxHp, m.side === 0 ? C.player : C.enemy);
    if (m.buildRemaining > 0) {
      const total = buildTimeFor(def.cost);
      ctx.fillStyle = 'rgba(8,12,8,0.7)';
      rr(ctx, x, y, w, h, 10);
      ctx.fill();
      text(ctx, '건설', x + w / 2, y + h / 2 - 8, 12, C.text, 'center', 600);
      bar(ctx, x + 10, y + h / 2 + 6, w - 20, 5, 1 - m.buildRemaining / total, C.mineral);
    } else if (m.upgradeRemaining > 0) {
      text(ctx, '강화 중', x + w / 2, y + 10, 10, C.mineral, 'center', 600);
      bar(ctx, x + 10, y + h - 14, w - 20, 4, 1 - m.upgradeRemaining / UPGRADE_TIME, C.mineral);
    }
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, game: GameState, u: UnitInst): void {
  const def = UNIT_BY_ID[u.defId];
  const px = laneToPx(u.x);
  const py = rowCenter(u.row) + 8 + ((u.id * 7) % 5) * 3.5 - 7;
  const fill = u.side === 0 ? C.player : C.enemy;
  const facing: 1 | -1 = u.side === 0 ? 1 : -1;
  drawInsect(ctx, def.family, def.tier, px, py, facing, fill, game.t, u.id);
  if (game.t < u.slowUntil) {
    ctx.strokeStyle = C.gas;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const st = effectiveStats(game, u);
  const bw = 6 + def.tier * 4;
  bar(ctx, px - bw / 2, py - 14, bw, 3, u.hp / st.maxHp, fill);
}

function drawFog(ctx: CanvasRenderingContext2D, game: GameState): void {
  const fog = game.players[0].fog;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const [a] = moduleSpan(1, col);
      const f = fog[row][col];
      const visible = f !== null && game.t - f.seenAt < 0.2;
      if (visible) continue;
      ctx.fillStyle = C.fog;
      ctx.fillRect(laneToPx(a), rowTop(row), CELL_W, LANE_H);
      // Soft noise of unknown canopy.
      ctx.fillStyle = 'rgba(40,60,45,0.15)';
      for (let i = 0; i < 4; i++) {
        const ox = ((col * 17 + row * 9 + i * 23) % 60) + 8;
        const oy = ((col * 11 + row * 13 + i * 19) % 50) + 10;
        ctx.beginPath();
        ctx.arc(laneToPx(a) + ox, rowTop(row) + oy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (f && f.defId) {
        const ghost: ModuleInst = {
          id: -1,
          side: 1,
          row,
          col,
          defId: f.defId,
          hp: 1,
          maxHp: 1,
          level: (f.level || 1) as 1 | 2 | 3,
          buildRemaining: 0,
          upgradeRemaining: 0,
          spawnTimer: 0,
          atkTimer: 0,
          mineralValue: 0,
        };
        drawModule(ctx, game, ghost, true, false);
        text(ctx, `${fmtTime(f.seenAt)}`, laneToPx(a) + CELL_W / 2, rowTop(row) + LANE_H - 8, 10, C.dim, 'center');
      } else if (f) {
        text(ctx, '빈 칸', laneToPx(a) + CELL_W / 2, rowCenter(row), 11, C.dim, 'center');
      } else {
        text(ctx, '?', laneToPx(a) + CELL_W / 2, rowCenter(row), 22, 'rgba(180,200,180,0.14)', 'center', 700, FONT_DISPLAY);
      }
    }
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, ui: UiState): void {
  for (const e of ui.effects) {
    const k = e.ttl / e.max;
    if (e.kind === 'spark') {
      glowCircle(ctx, e.x, e.y, 8 + (1 - k) * 6, `rgba(255,230,140,${k * 0.8})`);
      ctx.fillStyle = `rgba(255,240,180,${k})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2 + (1 - k) * 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'puff') {
      ctx.fillStyle = `rgba(160,180,150,${k * 0.45})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 + (1 - k) * 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'burst') {
      ctx.strokeStyle = `rgba(255,160,90,${k})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10 + (1 - k) * 36, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === 'laneFlash' || e.kind === 'laneGreen') {
      ctx.fillStyle = e.kind === 'laneFlash' ? `rgba(255,220,120,${k * 0.4})` : `rgba(120,220,140,${k * 0.35})`;
      ctx.fillRect(GRID_LEFT, rowTop(e.row!), LANE_LENGTH * CELL_W, LANE_H);
    }
  }
}

// ---------------------------------------------------------------------------
// HUD and panels
// ---------------------------------------------------------------------------

function drawTopBar(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const [me, foe] = game.players;
  // Status strip only — seed packets live in the row beneath (PvZ sun bar energy).
  const hg = ctx.createLinearGradient(0, 0, 0, TOP_BAR_H);
  hg.addColorStop(0, '#152218');
  hg.addColorStop(1, '#0c140e');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, W, TOP_BAR_H);

  drawPixelGem(ctx, 14, 8, 2.2);
  text(ctx, `${Math.floor(me.minerals)}`, 40, 17, 14, C.mineral, 'left', 400);

  drawPixelOrb(ctx, 118, 8, 2.2);
  text(ctx, `${Math.floor(me.gas)}/${GAS_CAP}`, 144, 17, 13, C.gas, 'left', 400);

  bar(ctx, 270, 12, 150, 8, me.castleHp / CASTLE_HP, C.player);
  text(ctx, `${Math.ceil(me.castleHp)}`, 345, 16, 10, '#0c140c', 'center', 700);

  const timer = game.cfg.timeLimit !== null ? `${fmtTime(game.cfg.timeLimit - game.t)} 남음` : fmtTime(game.t);
  text(ctx, timer, W / 2, 10, 12, C.text, 'center', 700, FONT_DISPLAY);
  const bx = W / 2 - 92;
  button(ctx, buttons, { id: 'pause', x: bx, y: 18, w: 48, h: 14, onClick: () => api.togglePause() }, ui.paused ? '재생' : '일시정지', ui, { active: ui.paused, size: 10 });
  for (const [i, s] of [1, 2, 3].entries()) {
    button(ctx, buttons, { id: `spd${s}`, x: bx + 52 + i * 38, y: 18, w: 34, h: 14, onClick: () => api.setSpeed(s) }, `${s}x`, ui, { active: ui.speed === s && !ui.paused, size: 10 });
  }

  bar(ctx, W - 430, 12, 150, 8, foe.castleHp / CASTLE_HP, C.enemy);
  text(ctx, `${Math.ceil(foe.castleHp)}`, W - 355, 16, 10, '#140c0c', 'center', 700);

  button(
    ctx,
    buttons,
    {
      id: 'castle_panel',
      x: W - 230,
      y: 4,
      w: 78,
      h: 24,
      onClick: () => api.toggleCastlePanel(),
      tooltip: ['성 업그레이드', '가스로 계열 전체 강화', `킬 ${me.stats.kills} · 파괴 ${me.stats.modulesDestroyed}`],
    },
    ui.castlePanelOpen ? '성 닫기' : '성 업글',
    ui,
    { active: ui.castlePanelOpen, size: 11, color: C.gas },
  );
  text(ctx, DIFFICULTIES[ui.difficulty].name, W - 16, 17, 11, C.dim, 'right', 600);
}

/** Card index → x with family group gaps (resource | defense | barracks | ability). */
function cardGroupOffset(i: number): number {
  // 0 resource | 1–3 defense | 4–11 barracks | 12 acid
  if (i <= 0) return 0;
  if (i <= 3) return CARD_GROUP_GAP;
  if (i <= 11) return CARD_GROUP_GAP * 2;
  return CARD_GROUP_GAP * 3;
}

function cardRect(i: number): Rect {
  return {
    x: CARDS_LEFT + i * (CARD_W + CARD_GAP) + cardGroupOffset(i),
    y: CARDS_TOP,
    w: CARD_W,
    h: CARD_H,
  };
}

/** Thin family ticks — no teaching labels (players are assumed to know the roster). */
function drawCardGroupTicks(ctx: CanvasRenderingContext2D): void {
  for (const i of [1, 4, 12]) {
    const r = cardRect(i);
    const x = r.x - CARD_GROUP_GAP / 2;
    ctx.fillStyle = 'rgba(232,184,74,0.22)';
    ctx.fillRect(x, CARDS_TOP + 8, 1, CARD_H - 16);
  }
}

/**
 * PvZ-style seed packets: glyph + cost badge dominate.
 * Long descriptions stay on hover tooltip only — not in chrome.
 */
function drawCards(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const me = game.players[0];
  // Seed rail backdrop
  const band = ctx.createLinearGradient(0, TOP_BAR_H, 0, GRID_TOP);
  band.addColorStop(0, '#101810');
  band.addColorStop(1, '#0a100c');
  ctx.fillStyle = band;
  ctx.fillRect(0, TOP_BAR_H, W, GRID_TOP - TOP_BAR_H);
  ctx.fillStyle = 'rgba(93,224,192,0.08)';
  ctx.fillRect(0, GRID_TOP - 1, W, 1);

  drawCardGroupTicks(ctx);
  const cards: ModuleDef[] = [...RESOURCE_MODULES, ...DEFENSE_MODULES, ...BARRACKS_MODULES];
  cards.forEach((def, i) => {
    const r = cardRect(i);
    const cost = moduleCost(game, 0, def.id);
    const locked = def.kind === 'barracks' && !isUnlocked(game, 0, def.unitId!);
    const unit = def.kind === 'barracks' ? UNIT_BY_ID[def.unitId!] : null;
    const affordable = locked ? me.gas >= unit!.unlockGas : me.minerals >= cost;
    const selected = ui.selectedCard === def.id;
    const hovered = inRect(r, ui.hover.x, ui.hover.y);
    const lift = selected ? -2 : 0;

    // Packet body
    ctx.fillStyle = selected ? '#2a3a24' : hovered ? '#1e2a20' : '#162018';
    rr(ctx, r.x, r.y + lift, r.w, r.h, 4);
    ctx.fill();
    ctx.strokeStyle = selected ? C.mineral : hovered ? KIND_COLOR[def.kind] : 'rgba(47,69,54,0.9)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.globalAlpha = affordable ? 1 : 0.4;
    ctx.stroke();

    // Glyph plate
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    rr(ctx, r.x + 6, r.y + lift + 5, r.w - 12, 36, 3);
    ctx.fill();
    if (def.kind === 'barracks' && unit) {
      drawInsect(ctx, unit.family, unit.tier, r.x + r.w / 2, r.y + lift + 24, 1, KIND_COLOR[def.kind], ui.now / 1000, i);
    } else {
      drawModuleGlyph(ctx, def.kind, def.id, r.x + r.w / 2, r.y + lift + 24, KIND_COLOR[def.kind], 1);
    }

    // Tiny name — packet tag, not a lesson
    text(ctx, def.name.replace(' 병영', ''), r.x + r.w / 2, r.y + lift + 50, 10, affordable ? C.text : C.dim, 'center', 500);

    // Cost badge (PvZ sun-cost energy)
    const badgeY = r.y + lift + r.h - 14;
    if (locked) {
      text(ctx, `${unit!.unlockGas}G`, r.x + r.w / 2, badgeY, 12, affordable ? C.gas : C.dim, 'center', 700);
    } else {
      text(ctx, `${cost}`, r.x + r.w / 2, badgeY, 13, affordable ? C.mineral : C.dim, 'center', 700);
    }
    if (unit) text(ctx, `T${unit.tier}`, r.x + r.w - 5, r.y + lift + 9, 9, C.mute, 'right');
    ctx.globalAlpha = 1;

    const tooltip = [def.name, def.kind === 'barracks' ? `${cost} 미네랄 · ${FAMILY_NAME[unit!.family]} T${unit!.tier}` : `${cost} 미네랄`, def.desc];
    if (unit) {
      const tags: string[] = [];
      if (unit.pierce > 0) tags.push(`관통 ${unit.pierce}`);
      if (unit.poisonDps > 0) tags.push(`독 ${unit.poisonDps}/s×${unit.poisonDuration}s`);
      tooltip.push(`HP ${unit.hp}  공격 ${unit.dmg}/${unit.atkInterval}s  방어 ${unit.armor}`);
      tooltip.push(`이동 ${unit.speed}  사거리 ${unit.range}  생산 ${unit.spawnInterval}s`);
      if (tags.length) tooltip.push(tags.join(' · '));
      if (locked) tooltip.push(`잠김: 가스 ${unit.unlockGas}로 해금 (클릭)`);
    }
    if (def.kind === 'defense') tooltip.push('늦추기용. 업그레이드 불가. 파괴 시 파편+둔화.');
    if (def.kind === 'resource') tooltip.push('자원 모듈은 하나 지을 때마다 15% 비싸짐');
    buttons.push({
      id: `card_${def.id}`,
      x: r.x,
      y: r.y + lift,
      w: r.w,
      h: r.h,
      onClick: () => (locked ? api.unlock(def.unitId!) : api.selectCard(selected ? null : def.id)),
      tooltip,
    });
  });

  const r = cardRect(cards.length);
  const selected = ui.selectedCard === ACID_CARD;
  const affordable = me.gas >= ACID_RAIN.gas;
  const lift = selected ? -2 : 0;
  ctx.fillStyle = selected ? '#1a3228' : '#121c18';
  rr(ctx, r.x, r.y + lift, r.w, r.h, 4);
  ctx.fill();
  ctx.strokeStyle = selected ? C.gas : '#2a5a44';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke();
  ctx.globalAlpha = affordable ? 1 : 0.4;
  glowCircle(ctx, r.x + r.w / 2, r.y + lift + 22, 16, C.mintGlow);
  ctx.fillStyle = C.gas;
  ctx.beginPath();
  ctx.ellipse(r.x + r.w / 2, r.y + lift + 20, 7, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '산성비', r.x + r.w / 2, r.y + lift + 50, 10, affordable ? C.text : C.dim, 'center');
  text(ctx, `${ACID_RAIN.gas}G`, r.x + r.w / 2, r.y + lift + r.h - 14, 13, affordable ? C.gas : C.dim, 'center', 700);
  ctx.globalAlpha = 1;
  buttons.push({
    id: 'card_acid',
    x: r.x,
    y: r.y + lift,
    w: r.w,
    h: r.h,
    onClick: () => api.selectCard(selected ? null : ACID_CARD),
    tooltip: ['산성비', `가스 ${ACID_RAIN.gas}`, `선택한 레인의 적 유닛 전체에 ${ACID_RAIN.dmg} 피해`, '카드 선택 후 레인 클릭'],
  });
}

/** Compact per-lane family ticks on the right castle chrome. */
function drawLaneIntelTicks(ctx: CanvasRenderingContext2D, ui: UiState): void {
  const fams: Family[] = ['ant', 'beetle', 'mantis'];
  for (let row = 0; row < ROWS; row++) {
    const y = rowTop(row) + 14;
    fams.forEach((f, i) => {
      const seen = ui.laneIntel[row][f];
      const age = seen && Number.isFinite(seen) ? (ui.now - seen) / 1000 : Infinity;
      const col = !Number.isFinite(age) ? 'rgba(90,110,96,0.35)' : age < 8 ? C.enemy : age < 30 ? C.mineral : C.mute;
      const x = W - CASTLE_W + 10 + i * 10;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, age < 8 ? 3.2 : 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/**
 * Action strip only when a placed module is selected.
 * No idle / card-teaching copy — selection + ghost placement carry that job.
 */
function drawContextPanel(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const m = game.modules.find((mm) => mm.id === ui.selectedModuleId && mm.side === 0);
  if (!m) return;

  const x0 = CONTEXT_LEFT;
  const y0 = CONTEXT_TOP;
  const w = CONTEXT_W;
  const h = CONTEXT_H;

  ctx.fillStyle = 'rgba(10,16,12,0.92)';
  rr(ctx, x0, y0, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,184,74,0.35)';
  ctx.stroke();

  const def = MODULE_BY_ID[m.defId];
  drawModuleGlyph(ctx, def.kind, def.id, x0 + 26, y0 + h / 2, KIND_COLOR[def.kind], m.level);
  text(ctx, def.name, x0 + 52, y0 + 18, 14, C.text, 'left', 700);
  text(ctx, `HP ${Math.ceil(m.hp)}/${m.maxHp}`, x0 + 52, y0 + 36, 12, C.dim);

  if (def.kind === 'barracks') {
    const unit = UNIT_BY_ID[def.unitId!];
    const mult = BARRACKS_LEVEL_SPAWN_MULT[m.level];
    text(ctx, `Lv${m.level}/3 · ${(def.spawnInterval! * mult).toFixed(1)}s · ${FAMILY_NAME[unit.family]}`, x0 + 200, y0 + h / 2, 12, C.text);
    const cost = barracksUpgradeCost(m);
    if (cost) {
      const can = game.players[0].minerals >= cost.minerals && game.players[0].gas >= cost.gas;
      button(
        ctx,
        buttons,
        {
          id: 'upgrade',
          x: x0 + w - 300,
          y: y0 + 9,
          w: 170,
          h: 34,
          onClick: () => api.upgradeSelected(),
          disabled: !can,
          tooltip: [`병영 강화 Lv${m.level + 1}`, `미네랄 ${cost.minerals} + 가스 ${cost.gas}`, `생산 주기 ×${BARRACKS_LEVEL_SPAWN_MULT[(m.level + 1) as 2 | 3]}`],
        },
        `강화  ${cost.minerals}M  ${cost.gas}G`,
        ui,
        { size: 12, color: can ? C.mineral : C.dim },
      );
    } else {
      text(ctx, 'MAX', x0 + w - 260, y0 + h / 2, 13, C.mineral);
    }
  }

  const refund = Math.floor(def.cost * SELL_REFUND_RATIO);
  button(
    ctx,
    buttons,
    {
      id: 'sell',
      x: x0 + w - 110,
      y: y0 + 9,
      w: 90,
      h: 34,
      onClick: () => api.sellSelected(),
      tooltip: [`판매 · 미네랄 ${refund} 환불`, '가스는 돌려받지 않습니다'],
    },
    `판매 ${refund}`,
    ui,
    { size: 12, color: C.enemy },
  );
}

function drawCastleUpgradeModal(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  if (!ui.castlePanelOpen) return;
  ctx.fillStyle = 'rgba(6,12,8,0.55)';
  ctx.fillRect(0, 0, W, H);

  const pw = 720;
  const ph = 280;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2 - 20;
  ctx.fillStyle = '#121a14';
  rr(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = C.panelLine;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  text(ctx, '성 업그레이드', px + 24, py + 28, 18, C.text, 'left', 700, FONT_KO_DISPLAY);
  text(ctx, '가스 · 계열 전체 즉시 적용', px + 24, py + 52, 12, C.dim);
  button(ctx, buttons, { id: 'castle_close', x: px + pw - 96, y: py + 16, w: 72, h: 28, onClick: () => api.toggleCastlePanel(false) }, '닫기', ui, { size: 12 });

  const me = game.players[0];
  const fams: Family[] = ['ant', 'beetle', 'mantis'];
  fams.forEach((f, fi) => {
    const y = py + 78 + fi * 58;
    drawInsect(ctx, f, 1, px + 36, y + 18, 1, C.text, ui.now / 1000, fi + 20);
    text(ctx, FAMILY_NAME[f], px + 58, y + 18, 14, C.text, 'left', 600);
    TRACKS.forEach((t, ti) => {
      const lvl = me.upgrades[f][t];
      const cost = castleUpgradeCost(game, 0, f, t);
      const track = FAMILY_TRACKS[f][t];
      const label = cost === null ? `${track.name} MAX` : `${track.name} ${lvl}/${MAX_UPGRADE_LEVEL}  ${cost}G`;
      const b: Button = {
        id: `up_${f}_${t}`,
        x: px + 160 + ti * 260,
        y,
        w: 240,
        h: 36,
        onClick: () => api.castleUpgrade(f, t),
        disabled: cost === null || me.gas < cost,
        tooltip: [`${FAMILY_NAME[f]} ${track.name}`, track.desc],
      };
      button(ctx, buttons, b, label, ui, { size: 12, color: cost === null ? C.mineral : C.text });
    });
  });
}

function drawMessage(ctx: CanvasRenderingContext2D, ui: UiState): void {
  if (!ui.message || ui.now > ui.message.until) return;
  const alpha = Math.min(1, (ui.message.until - ui.now) / 400);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10,16,12,0.85)';
  rr(ctx, W / 2 - 220, GRID_TOP + 8, 440, 36, 10);
  ctx.fill();
  text(ctx, ui.message.text, W / 2, GRID_TOP + 26, 14, C.mineral, 'center', 600);
  ctx.globalAlpha = 1;
}

function drawTooltip(ctx: CanvasRenderingContext2D, ui: UiState, buttons: Button[]): void {
  // Hide chrome tooltips while the castle modal owns the screen.
  if (ui.castlePanelOpen) return;
  const hit = buttons.find((b) => b.tooltip && inRect(b, ui.hover.x, ui.hover.y) && !b.disabled);
  if (!hit || !hit.tooltip) return;
  const lines = hit.tooltip;
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  // measureText needs font set
  ctx.font = `500 12px ${FONT_UI}`;
  const width = Math.max(160, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24);
  const th = lines.length * 18 + 16;
  let x = ui.hover.x + 14;
  let y = ui.hover.y + 14;
  if (x + width > W - 8) x = ui.hover.x - width - 10;
  if (y + th > H - 8) y = H - th - 8;
  ctx.fillStyle = 'rgba(10,16,12,0.94)';
  rr(ctx, x, y, width, th, 8);
  ctx.fill();
  ctx.strokeStyle = C.panelLine;
  ctx.stroke();
  lines.forEach((l, i) => text(ctx, l, x + 12, y + 14 + i * 18, i === 0 ? 13 : 12, i === 0 ? C.mineral : C.text, 'left', i === 0 ? 700 : 500));
  void tw;
}

// ---------------------------------------------------------------------------

/** Top sky slice to discard — matches the red box the user marked. */
const MENU_TOP_CROP = 0.14;
/**
 * Full-width underground band for BUG EMPIRE + CTA (시작하기 / 난이도 선택).
 * Sized from the user's collage mockup (~y 500→720 on a 720p frame).
 */
const MENU_UI_BAND = 220;
/** Soft dirt→underground blend straddling the art/black edge (px). Positions stay fixed. */
const MENU_EDGE_FADE = 200;

/** Bayer 4×4 thresholds (0…1) — breaks straight crop lines in the soft edge. */
const MENU_BAYER_4 = [
  0.03125, 0.53125, 0.15625, 0.65625,
  0.78125, 0.28125, 0.90625, 0.40625,
  0.21875, 0.71875, 0.09375, 0.59375,
  0.96875, 0.46875, 0.84375, 0.34375,
];

/**
 * Title backdrop matching the collage mockup positions, with a soft ground edge:
 * - crop empty top sky so the trio sits high
 * - let textured dirt run past the band edge (no hard clip)
 * - long dithered dissolve into underground (texture still behind the title)
 */
function drawMenuBackdrop(ctx: CanvasRenderingContext2D, t: number, uiBand = MENU_UI_BAND): void {
  const artH = Math.max(0, H - uiBand);
  ctx.fillStyle = '#080a0c';
  ctx.fillRect(0, 0, W, H);

  const hero = getMenuHeroImage();
  if (hero) {
    const imgW = hero.naturalWidth || hero.width;
    const imgH = hero.naturalHeight || hero.height;
    const srcY = Math.floor(imgH * MENU_TOP_CROP);
    const srcH = imgH - srcY;
    // Cover through the fade so dirt remains available under the title.
    const coverH = artH + Math.floor(MENU_EDGE_FADE * 0.5);
    const scale = Math.max(W / imgW, coverH / Math.max(1, srcH));
    const dw = imgW * scale;
    const dh = srcH * scale;
    const dx = (W - dw) / 2;
    const dy = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hero, 0, srcY, imgW, srcH, dx, dy, dw, dh);
  } else if (artH > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, artH);
    g.addColorStop(0, '#101820');
    g.addColorStop(0.55, '#3a3028');
    g.addColorStop(1, '#1a1410');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, artH);
  }

  if (uiBand > 0) {
    // Ordered-dither dissolve: speckled dirt→black edge (breaks the ruler-line crop look).
    const fadeTop = Math.max(0, artH - Math.floor(MENU_EDGE_FADE * 0.6));
    const fadeBot = Math.min(H, artH + Math.floor(MENU_EDGE_FADE * 0.45));
    const fadeH = Math.max(1, fadeBot - fadeTop);
    const img = ctx.getImageData(0, fadeTop, W, fadeH);
    const data = img.data;
    for (let y = 0; y < fadeH; y++) {
      const u = y / fadeH;
      // Density of black speckles grows downward; title band still keeps dirt flecks.
      const density = Math.min(1, u * u * (1.25 - 0.15 * u));
      for (let x = 0; x < W; x++) {
        const thr = MENU_BAYER_4[((y & 3) << 2) | (x & 3)];
        // Binary-ish dissolve with a little soft mix so it isn't strobing.
        const cover = density > thr;
        const a = cover ? Math.min(1, 0.55 + density * 0.45) : density * 0.22;
        const i = (y * W + x) * 4;
        const ia = 1 - a;
        data[i] = data[i] * ia + 8 * a;
        data[i + 1] = data[i + 1] * ia + 10 * a;
        data[i + 2] = data[i + 2] * ia + 12 * a;
      }
    }
    ctx.putImageData(img, 0, fadeTop);
    if (fadeBot < H) {
      ctx.fillStyle = '#080a0c';
      ctx.fillRect(0, fadeBot, W, H - fadeBot);
    }
  }

  if (artH > 40) {
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const seed = i * 97.3;
      const x = ((seed * 13 + t * (10 + (i % 4))) % (W + 40)) - 20;
      const y = ((seed * 7.1 + Math.sin(t * 0.5 + i) * 18) % Math.max(40, artH - 40)) + 12;
      const a = 0.1 + (i % 3) * 0.05;
      ctx.fillStyle = i % 2 === 0 ? `rgba(232,184,74,${a})` : `rgba(200,160,120,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + (i % 3) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCtaButton(
  ctx: CanvasRenderingContext2D,
  buttons: Button[],
  ui: UiState,
  b: Button,
  label: string,
  opts: { glow?: boolean; size?: number } = {},
): void {
  const hovered = inRect(b, ui.hover.x, ui.hover.y);
  if (opts.glow !== false) glowCircle(ctx, b.x + b.w / 2, b.y + b.h / 2, hovered ? 100 : 80, C.amberGlow);
  ctx.fillStyle = hovered ? '#5a6e30' : '#3e5428';
  rr(ctx, b.x, b.y, b.w, b.h, 2);
  ctx.fill();
  ctx.strokeStyle = C.mineral;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2, opts.size ?? 20, C.mineral, 'center', 400, FONT_KO_DISPLAY);
  buttons.push(b);
}

function drawMenu(ctx: CanvasRenderingContext2D, ui: UiState, buttons: Button[], api: UiApi): void {
  const t = ui.now / 1000;
  drawMenuBackdrop(ctx, t, MENU_UI_BAND);

  const artH = H - MENU_UI_BAND;
  // Collage mockup positions (720p): title ~y514 straddling the art/black edge, button ~y600.
  const titleCy = artH + 14;
  const buttonY = artH + 100;
  glowCircle(ctx, W / 2, titleCy, 90, C.amberGlow);
  drawPixelTitle(ctx, W / 2, titleCy, 10, C.mineral);
  drawCtaButton(
    ctx,
    buttons,
    ui,
    { id: 'to_difficulty', x: W / 2 - 150, y: buttonY, w: 300, h: 48, onClick: () => api.toDifficulty() },
    '시작하기',
  );
}

function drawDifficulty(ctx: CanvasRenderingContext2D, ui: UiState, buttons: Button[], api: UiApi): void {
  const t = ui.now / 1000;
  // Same world as the title — keep the underground band; only the CTA row changes.
  drawMenuBackdrop(ctx, t, MENU_UI_BAND);

  const artH = H - MENU_UI_BAND;
  const titleCy = artH + 14;
  glowCircle(ctx, W / 2, titleCy, 90, C.amberGlow);
  drawPixelTitle(ctx, W / 2, titleCy, 10, C.mineral);

  text(ctx, '난이도 선택', W / 2, artH + 90, 16, C.dim, 'center', 500, FONT_KO_DISPLAY);

  const diffs = Object.keys(DIFFICULTIES) as Difficulty[];
  const gap = 14;
  const bw = 160;
  const bh = 48;
  const totalW = diffs.length * bw + (diffs.length - 1) * gap;
  const startX = Math.round(W / 2 - totalW / 2);
  // Slightly above the previous slot; back button is gone so the row can sit lower overall.
  const rowY = artH + 124;
  diffs.forEach((d, i) => {
    drawCtaButton(
      ctx,
      buttons,
      ui,
      {
        id: `diff_${d}`,
        x: startX + i * (bw + gap),
        y: rowY,
        w: bw,
        h: bh,
        onClick: () => {
          api.setDifficulty(d);
          api.startGame();
        },
      },
      DIFFICULTIES[d].name,
      { glow: false, size: 18 },
    );
  });
}

function drawEnd(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  ctx.fillStyle = 'rgba(6,12,8,0.78)';
  ctx.fillRect(0, 0, W, H);
  const w = game.winner;
  const title = w === 0 ? '승리' : w === 1 ? '패배' : '무승부';
  const col = w === 0 ? C.player : w === 1 ? C.enemy : C.dim;
  glowCircle(ctx, W / 2, 200, 120, w === 0 ? 'rgba(126,207,106,0.25)' : w === 1 ? 'rgba(224,112,92,0.25)' : 'rgba(140,160,140,0.15)');
  text(ctx, title, W / 2, 200, 48, col, 'center', 400, FONT_KO_DISPLAY);
  const [me, foe] = game.players;
  const lines = [
    `경과 ${fmtTime(game.t)} · ${DIFFICULTIES[ui.difficulty].name}${game.cfg.timeLimit ? ' · 15분 제한' : ''}`,
    `성 HP  나 ${Math.ceil(me.castleHp)}  /  적 ${Math.ceil(foe.castleHp)}`,
    `킬  나 ${me.stats.kills}  /  적 ${foe.stats.kills}      모듈 파괴  나 ${me.stats.modulesDestroyed}  /  적 ${foe.stats.modulesDestroyed}`,
    `획득 가스  나 ${Math.round(me.stats.gasEarned)}  /  적 ${Math.round(foe.stats.gasEarned)}      채집 미네랄  나 ${Math.round(me.stats.mineralsEarned)}  /  적 ${Math.round(foe.stats.mineralsEarned)}`,
  ];
  lines.forEach((l, i) => text(ctx, l, W / 2, 280 + i * 30, 15, C.text, 'center'));
  button(ctx, buttons, { id: 'again', x: W / 2 - 220, y: 430, w: 200, h: 50, onClick: () => api.startGame() }, '같은 설정으로 다시', ui, { active: true, size: 16 });
  button(ctx, buttons, { id: 'menu', x: W / 2 + 20, y: 430, w: 200, h: 50, onClick: () => api.toMenu() }, '메뉴로', ui, { size: 16 });
}

// ---------------------------------------------------------------------------

export function render(ctx: CanvasRenderingContext2D, game: GameState | null, ui: UiState, api: UiApi): Button[] {
  const buttons: Button[] = [];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  if (ui.screen === 'menu' || ui.screen === 'difficulty' || !game) {
    if (ui.screen === 'difficulty') drawDifficulty(ctx, ui, buttons, api);
    else drawMenu(ctx, ui, buttons, api);
    drawTooltip(ctx, ui, buttons);
    return buttons;
  }

  fillBg(ctx, W, H, game.t * 0.35);
  drawLanes(ctx, game, ui);
  for (const m of game.modules) {
    if (!moduleVisibleToPlayer(game, m)) continue;
    drawModule(ctx, game, m, false, m.id === ui.selectedModuleId);
  }
  drawFog(ctx, game);
  for (const u of game.units) if (unitVisibleToPlayer(game, u)) drawUnit(ctx, game, u);
  drawEffects(ctx, ui);
  drawCastles(ctx, game, ui, buttons, api);
  drawLaneIntelTicks(ctx, ui);

  // Top chrome over the lawn: status + seed packets (PvZ hierarchy).
  drawTopBar(ctx, game, ui, buttons, api);
  drawCards(ctx, game, ui, buttons, api);
  drawContextPanel(ctx, game, ui, buttons, api);
  drawMessage(ctx, ui);

  if (ui.paused && ui.screen === 'game') {
    ctx.fillStyle = 'rgba(6,12,8,0.35)';
    ctx.fillRect(GRID_LEFT, GRID_TOP, LANE_LENGTH * CELL_W, ROWS * LANE_H);
    text(ctx, '일시정지', W / 2, GRID_TOP + (LANES_BOTTOM - GRID_TOP) / 2, 32, 'rgba(230,240,228,0.85)', 'center', 400, FONT_KO_DISPLAY);
  }

  drawCastleUpgradeModal(ctx, game, ui, buttons, api);
  if (ui.screen === 'end') drawEnd(ctx, game, ui, buttons, api);
  drawTooltip(ctx, ui, buttons);
  return buttons;
}
