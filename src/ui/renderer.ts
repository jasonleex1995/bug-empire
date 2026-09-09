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
import { FAMILY_NAME, UNIT_BY_ID, type Family } from '../sim/data/units';
import { ATK_PER_LEVEL, MAX_UPGRADE_LEVEL, SPECIAL_TRACK, TRACKS, TRACK_NAME, type Track } from '../sim/data/upgrades';
import type { GameState, ModuleInst, UnitInst } from '../sim/state';
import {
  CARDS_LEFT,
  CARDS_TOP,
  CARD_GAP,
  CARD_H,
  CARD_W,
  CASTLE_W,
  CELL_W,
  GRID_LEFT,
  GRID_TOP,
  H,
  LANES_BOTTOM,
  LANE_H,
  LOWER_TOP,
  PANEL_TOP,
  W,
  inRect,
  laneToPx,
  rowCenter,
  rowTop,
  type Rect,
} from './layout';

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
  screen: 'menu' | 'game' | 'end';
  difficulty: Difficulty;
  timeLimitMode: boolean;
  selectedCard: string | null;
  selectedModuleId: number | null;
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
  unlock(unitId: string): void;
  emergency(row: number): void;
  recharge(row: number): void;
  setDifficulty(d: Difficulty): void;
  setTimeLimitMode(on: boolean): void;
  startGame(): void;
  toMenu(): void;
}

const C = {
  bg: '#14120f',
  panel: '#1f1b16',
  panelLine: '#3a332a',
  text: '#e8e2d4',
  dim: '#9a9083',
  player: '#7fd35b',
  enemy: '#e0635a',
  resource: '#e2b93b',
  defense: '#6ea8d6',
  barracks: '#e08a3c',
  mineral: '#8ad0ff',
  gas: '#8fe38a',
  fog: 'rgba(8,6,4,0.78)',
  ownFloor: ['#2b3323', '#262d1f'],
  midFloor: ['#2a2620', '#26221c'],
  enemyFloor: ['#33251f', '#2e211c'],
};

const KIND_COLOR: Record<ModuleDef['kind'], string> = { resource: C.resource, defense: C.defense, barracks: C.barracks };

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = C.text, align: CanvasTextAlign = 'left', weight = ''): void {
  ctx.font = `${weight} ${size}px 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`.trim();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, fg: string, bg = '#111'): void {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, ratio)) * w, h);
}

function fmtTime(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function button(ctx: CanvasRenderingContext2D, buttons: Button[], b: Button, label: string, ui: UiState, opts: { active?: boolean; size?: number; color?: string } = {}): void {
  const hovered = inRect(b, ui.hover.x, ui.hover.y) && !b.disabled;
  ctx.fillStyle = b.disabled ? '#2a2620' : opts.active ? '#5a4b2a' : hovered ? '#3f382e' : '#2e2924';
  rr(ctx, b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  ctx.strokeStyle = opts.active ? C.resource : C.panelLine;
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2, opts.size ?? 13, b.disabled ? '#5e574d' : opts.color ?? C.text, 'center');
  buttons.push(b);
}

// ---------------------------------------------------------------------------
// Lanes
// ---------------------------------------------------------------------------

function drawLanes(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState): void {
  for (let row = 0; row < ROWS; row++) {
    const y = rowTop(row);
    for (let x = 0; x < LANE_LENGTH; x++) {
      const px = laneToPx(x);
      const zone = x < COLS ? C.ownFloor : x < COLS + MID ? C.midFloor : C.enemyFloor;
      ctx.fillStyle = zone[(x + row) % 2];
      ctx.fillRect(px, y, CELL_W, LANE_H);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(GRID_LEFT, y + 0.5, LANE_LENGTH * CELL_W, LANE_H - 1);
  }
  // Grid lines for own cells and the fogged enemy cells.
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
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
  text(ctx, '내 진영', laneToPx(COLS / 2), GRID_TOP - 10, 12, C.dim, 'center');
  text(ctx, '전장', laneToPx(COLS + MID / 2), GRID_TOP - 10, 12, C.dim, 'center');
  text(ctx, '적 진영 (시야 밖)', laneToPx(LANE_LENGTH - COLS / 2), GRID_TOP - 10, 12, C.dim, 'center');

  // Hover highlight on own cells / lane when a card is selected.
  if (ui.selectedCard) {
    const hx = (ui.hover.x - GRID_LEFT) / CELL_W;
    const row = Math.floor((ui.hover.y - GRID_TOP) / LANE_H);
    if (row >= 0 && row < ROWS && ui.hover.y >= GRID_TOP) {
      if (ui.selectedCard === ACID_CARD) {
        if (hx >= 0 && hx < LANE_LENGTH) {
          ctx.fillStyle = 'rgba(143,227,138,0.18)';
          ctx.fillRect(GRID_LEFT, rowTop(row), LANE_LENGTH * CELL_W, LANE_H);
        }
      } else if (hx >= 0 && hx < COLS) {
        const col = Math.floor(hx);
        const occupied = game.modules.some((m) => m.side === 0 && m.row === row && m.col === col);
        ctx.fillStyle = occupied ? 'rgba(224,99,90,0.25)' : 'rgba(127,211,91,0.25)';
        ctx.fillRect(laneToPx(col), rowTop(row), CELL_W, LANE_H);
      }
    }
  }
}

function drawCastles(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const [me, foe] = game.players;
  // Player castle
  ctx.fillStyle = '#3d4a2e';
  ctx.fillRect(0, GRID_TOP, CASTLE_W, LANES_BOTTOM - GRID_TOP);
  ctx.fillStyle = '#4a2e2e';
  ctx.fillRect(W - CASTLE_W, GRID_TOP, CASTLE_W, LANES_BOTTOM - GRID_TOP);
  ctx.fillStyle = C.player;
  ctx.fillRect(0, GRID_TOP, 4, LANES_BOTTOM - GRID_TOP);
  ctx.fillStyle = C.enemy;
  ctx.fillRect(W - 4, GRID_TOP, 4, LANES_BOTTOM - GRID_TOP);

  for (let row = 0; row < ROWS; row++) {
    const cy = rowCenter(row);
    const charged = me.emergencyCharges[row];
    const b: Button = {
      id: `emg${row}`,
      x: 6,
      y: cy - 18,
      w: CASTLE_W - 12,
      h: 36,
      onClick: () => (charged ? api.emergency(row) : api.recharge(row)),
      tooltip: charged
        ? ['비상 방어 (레인 ' + (row + 1) + ')', '내 진영 안의 적 유닛 전부 제거', '레인당 1회. 클릭해서 사용']
        : ['비상 방어 재충전', `가스 ${EMERGENCY_RECHARGE_GAS}`, '클릭해서 재충전'],
      disabled: !charged && me.gas < EMERGENCY_RECHARGE_GAS,
    };
    button(ctx, buttons, b, charged ? '!' : '+', ui, { active: charged, size: 18, color: charged ? C.resource : C.dim });
    text(ctx, `${row + 1}`, W - CASTLE_W / 2, cy, 14, C.dim, 'center');
    if (!foe.emergencyCharges[row]) text(ctx, 'x', W - CASTLE_W / 2, cy + 18, 10, C.dim, 'center');
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
  const x = laneToPx(a) + 6;
  const y = rowTop(m.row) + 8;
  const w = CELL_W - 12;
  const h = LANE_H - 22;
  ctx.globalAlpha = ghost ? 0.45 : 1;
  ctx.fillStyle = ghost ? '#55504a' : KIND_COLOR[def.kind];
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, x + 4, y + 4, w - 8, h - 8, 6);
  ctx.fill();
  text(ctx, def.short, x + w / 2, y + h / 2 - 4, 26, ghost ? '#bbb' : '#fff', 'center', 'bold');
  if (def.kind === 'barracks') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < m.level ? C.resource : 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + w / 2 - 14 + i * 10, y + h - 10, 8, 4);
    }
  }
  ctx.globalAlpha = 1;
  if (!ghost) {
    bar(ctx, x, y + h + 3, w, 5, m.hp / m.maxHp, m.side === 0 ? C.player : C.enemy);
    if (m.buildRemaining > 0) {
      const total = buildTimeFor(def.cost);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      rr(ctx, x, y, w, h, 8);
      ctx.fill();
      text(ctx, '건설', x + w / 2, y + h / 2 - 8, 12, C.text, 'center');
      bar(ctx, x + 8, y + h / 2 + 6, w - 16, 5, 1 - m.buildRemaining / total, C.resource);
    } else if (m.upgradeRemaining > 0) {
      text(ctx, '업그레이드 중', x + w / 2, y + 8, 10, C.resource, 'center');
      bar(ctx, x + 8, y + h - 18, w - 16, 4, 1 - m.upgradeRemaining / UPGRADE_TIME, C.resource);
    }
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, game: GameState, u: UnitInst): void {
  const def = UNIT_BY_ID[u.defId];
  const px = laneToPx(u.x);
  // Spread units vertically a little by id so stacks are readable.
  const py = rowCenter(u.row) + 10 + ((u.id * 7) % 5) * 4 - 8;
  const r = def.tier === 1 ? 7 : def.tier === 2 ? 9 : 12;
  const color = u.side === 0 ? C.player : C.enemy;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (def.family === 'ant') {
    ctx.arc(px, py, r, 0, Math.PI * 2);
  } else if (def.family === 'beetle') {
    rr(ctx, px - r, py - r, r * 2, r * 2, 4);
  } else {
    const d = u.side === 0 ? 1 : -1;
    ctx.moveTo(px + d * r * 1.2, py);
    ctx.lineTo(px - d * r, py - r);
    ctx.lineTo(px - d * r, py + r);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  if (game.t < u.slowUntil) {
    ctx.strokeStyle = '#b48cff';
    ctx.beginPath();
    ctx.arc(px, py, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  const st = effectiveStats(game, u);
  bar(ctx, px - r, py - r - 6, r * 2, 3, u.hp / st.maxHp, color, 'rgba(0,0,0,0.6)');
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
      if (f && f.defId) {
        const ghost: ModuleInst = {
          id: -1, side: 1, row, col, defId: f.defId, hp: 1, maxHp: 1, level: (f.level || 1) as 1 | 2 | 3,
          buildRemaining: 0, upgradeRemaining: 0, spawnTimer: 0, atkTimer: 0, mineralValue: 0,
        };
        drawModule(ctx, game, ghost, true, false);
        text(ctx, `${fmtTime(f.seenAt)}`, laneToPx(a) + CELL_W / 2, rowTop(row) + LANE_H - 8, 10, C.dim, 'center');
      } else if (f) {
        text(ctx, '빈 칸', laneToPx(a) + CELL_W / 2, rowCenter(row), 11, C.dim, 'center');
      } else {
        text(ctx, '?', laneToPx(a) + CELL_W / 2, rowCenter(row), 20, 'rgba(255,255,255,0.12)', 'center');
      }
    }
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, ui: UiState): void {
  for (const e of ui.effects) {
    const k = e.ttl / e.max;
    if (e.kind === 'spark') {
      ctx.fillStyle = `rgba(255,240,180,${k})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3 + (1 - k) * 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'puff') {
      ctx.fillStyle = `rgba(200,200,200,${k * 0.6})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 + (1 - k) * 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'burst') {
      ctx.strokeStyle = `rgba(255,150,80,${k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10 + (1 - k) * 40, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === 'laneFlash' || e.kind === 'laneGreen') {
      ctx.fillStyle = e.kind === 'laneFlash' ? `rgba(255,230,120,${k * 0.45})` : `rgba(140,230,120,${k * 0.4})`;
      ctx.fillRect(GRID_LEFT, rowTop(e.row!), LANE_LENGTH * CELL_W, LANE_H);
    }
  }
}

// ---------------------------------------------------------------------------
// HUD and panels
// ---------------------------------------------------------------------------

function drawTopBar(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const [me, foe] = game.players;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = C.panelLine;
  ctx.fillRect(0, 60, W, 1);

  text(ctx, '미네랄', 24, 20, 12, C.dim);
  text(ctx, `${Math.floor(me.minerals)}`, 24, 40, 20, C.mineral, 'left', 'bold');
  text(ctx, '가스', 130, 20, 12, C.dim);
  text(ctx, `${Math.floor(me.gas)} / ${GAS_CAP}`, 130, 40, 20, C.gas, 'left', 'bold');

  text(ctx, '내 성', 300, 18, 12, C.dim);
  bar(ctx, 300, 28, 220, 14, me.castleHp / CASTLE_HP, C.player);
  text(ctx, `${Math.ceil(me.castleHp)}`, 410, 35, 11, '#000', 'center', 'bold');

  const timer = game.cfg.timeLimit !== null ? `${fmtTime(game.cfg.timeLimit - game.t)} 남음` : fmtTime(game.t);
  text(ctx, timer, W / 2, 22, 18, C.text, 'center', 'bold');
  const bx = W / 2 - 110;
  button(ctx, buttons, { id: 'pause', x: bx, y: 34, w: 60, h: 20, onClick: () => api.togglePause() }, ui.paused ? '재생' : '일시정지', ui, { active: ui.paused, size: 11 });
  for (const [i, s] of [1, 2, 3].entries()) {
    button(ctx, buttons, { id: `spd${s}`, x: bx + 68 + i * 52, y: 34, w: 46, h: 20, onClick: () => api.setSpeed(s) }, `${s}x`, ui, { active: ui.speed === s && !ui.paused, size: 11 });
  }

  text(ctx, '적 성', W - 520, 18, 12, C.dim, 'left');
  bar(ctx, W - 520, 28, 220, 14, foe.castleHp / CASTLE_HP, C.enemy);
  text(ctx, `${Math.ceil(foe.castleHp)}`, W - 410, 35, 11, '#000', 'center', 'bold');
  text(ctx, `${DIFFICULTIES[ui.difficulty].name}`, W - 24, 22, 13, C.dim, 'right');
  text(ctx, `킬 ${me.stats.kills}  파괴 ${me.stats.modulesDestroyed}`, W - 24, 42, 12, C.dim, 'right');
}

function cardRect(i: number): Rect {
  return { x: CARDS_LEFT + i * (CARD_W + CARD_GAP), y: CARDS_TOP, w: CARD_W, h: CARD_H };
}

function drawCards(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const me = game.players[0];
  const cards: ModuleDef[] = [...RESOURCE_MODULES, ...DEFENSE_MODULES, ...BARRACKS_MODULES];
  cards.forEach((def, i) => {
    const r = cardRect(i);
    const cost = moduleCost(game, 0, def.id);
    const locked = def.kind === 'barracks' && !isUnlocked(game, 0, def.unitId!);
    const unit = def.kind === 'barracks' ? UNIT_BY_ID[def.unitId!] : null;
    const affordable = locked ? me.gas >= unit!.unlockGas : me.minerals >= cost;
    const selected = ui.selectedCard === def.id;
    const hovered = inRect(r, ui.hover.x, ui.hover.y);

    ctx.fillStyle = selected ? '#4a4030' : hovered ? '#332d26' : '#2a251f';
    rr(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? C.resource : KIND_COLOR[def.kind];
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = KIND_COLOR[def.kind];
    ctx.globalAlpha = affordable ? 1 : 0.45;
    rr(ctx, r.x + 20, r.y + 10, 40, 40, 6);
    ctx.fill();
    text(ctx, def.short, r.x + 40, r.y + 30, 22, '#fff', 'center', 'bold');
    ctx.globalAlpha = 1;
    text(ctx, def.name.replace(' 병영', ''), r.x + r.w / 2, r.y + 62, 11, affordable ? C.text : C.dim, 'center');
    if (locked) {
      text(ctx, `해금 ${unit!.unlockGas}G`, r.x + r.w / 2, r.y + 82, 12, affordable ? C.gas : C.dim, 'center', 'bold');
    } else {
      text(ctx, `${cost}`, r.x + r.w / 2, r.y + 82, 14, affordable ? C.mineral : C.dim, 'center', 'bold');
    }
    if (unit) text(ctx, `T${unit.tier}`, r.x + r.w - 10, r.y + 12, 10, C.dim, 'right');

    const tooltip = [def.name, def.kind === 'barracks' ? `${cost} 미네랄 · ${FAMILY_NAME[unit!.family]} T${unit!.tier}` : `${cost} 미네랄`, def.desc];
    if (unit) {
      tooltip.push(`HP ${unit.hp}  공격 ${unit.dmg}/${unit.atkInterval}s  방어 ${unit.armor}`);
      tooltip.push(`이동 ${unit.speed}  사거리 ${unit.range}  생산 ${unit.spawnInterval}s${unit.siegeMult !== 1 ? `  공성 x${unit.siegeMult}` : ''}${unit.pierce ? '  방어 관통' : ''}`);
      if (locked) tooltip.push(`잠김: 가스 ${unit.unlockGas}로 해금 (클릭)`);
    }
    if (def.kind === 'defense') tooltip.push('디펜스 킬 가스 25%. 업그레이드 불가.');
    if (def.kind === 'resource') tooltip.push('자원 모듈은 하나 지을 때마다 15% 비싸짐');
    buttons.push({
      id: `card_${def.id}`,
      ...r,
      onClick: () => (locked ? api.unlock(def.unitId!) : api.selectCard(selected ? null : def.id)),
      tooltip,
    });
  });

  // Acid rain card
  const r = cardRect(cards.length);
  const selected = ui.selectedCard === ACID_CARD;
  const affordable = me.gas >= ACID_RAIN.gas;
  ctx.fillStyle = selected ? '#2f4a30' : '#22301f';
  rr(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = selected ? C.gas : '#3f6b3a';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke();
  ctx.globalAlpha = affordable ? 1 : 0.45;
  ctx.fillStyle = C.gas;
  rr(ctx, r.x + 20, r.y + 10, 40, 40, 6);
  ctx.fill();
  text(ctx, '비', r.x + 40, r.y + 30, 22, '#123', 'center', 'bold');
  ctx.globalAlpha = 1;
  text(ctx, '산성비', r.x + r.w / 2, r.y + 62, 11, affordable ? C.text : C.dim, 'center');
  text(ctx, `${ACID_RAIN.gas}G`, r.x + r.w / 2, r.y + 82, 14, affordable ? C.gas : C.dim, 'center', 'bold');
  buttons.push({
    id: 'card_acid',
    ...r,
    onClick: () => api.selectCard(selected ? null : ACID_CARD),
    tooltip: ['산성비', `가스 ${ACID_RAIN.gas}`, `선택한 레인의 적 유닛 전체에 ${ACID_RAIN.dmg} 피해`, '카드 선택 후 레인 클릭'],
  });
}

function drawUpgradePanel(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const me = game.players[0];
  const x0 = 24;
  const y0 = LOWER_TOP;
  text(ctx, '성 업그레이드 (가스, 계열 전체·즉시 적용)', x0, y0 + 8, 12, C.dim);
  const fams: Family[] = ['ant', 'beetle', 'mantis'];
  fams.forEach((f, fi) => {
    const y = y0 + 24 + fi * 40;
    text(ctx, FAMILY_NAME[f], x0, y + 14, 13, C.text);
    TRACKS.forEach((t, ti) => {
      const lvl = me.upgrades[f][t];
      const cost = castleUpgradeCost(game, 0, f, t);
      const name = t === 'special' ? SPECIAL_TRACK[f].name : TRACK_NAME[t];
      const label = cost === null ? `${name} MAX` : `${name} ${lvl}/${MAX_UPGRADE_LEVEL}  ${cost}G`;
      const b: Button = {
        id: `up_${f}_${t}`,
        x: x0 + 80 + ti * 150,
        y,
        w: 142,
        h: 28,
        onClick: () => api.castleUpgrade(f, t),
        disabled: cost === null || me.gas < cost,
        tooltip: [
          `${FAMILY_NAME[f]} ${name}`,
          t === 'atk' ? `공격력 +${ATK_PER_LEVEL[f]}/단계 (방어력 고정 감산이라 단단한 상대에 유리)` : t === 'armor' ? '방어력 +1/단계 (다수의 약한 공격에 유리)' : SPECIAL_TRACK[f].desc,
        ],
      };
      button(ctx, buttons, b, label, ui, { size: 12, color: cost === null ? C.resource : C.text });
    });
  });
}

function drawSelectionPanel(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  const x0 = 560;
  const y0 = LOWER_TOP;
  const w = 330;
  ctx.fillStyle = '#1a1713';
  rr(ctx, x0, y0, w, 150, 8);
  ctx.fill();
  ctx.strokeStyle = C.panelLine;
  ctx.stroke();
  const m = ui.selectedModuleId !== null ? game.modules.find((mm) => mm.id === ui.selectedModuleId && mm.side === 0) : undefined;
  if (!m) {
    text(ctx, '내 모듈을 클릭하면 정보와 업그레이드/판매가 표시됩니다.', x0 + 14, y0 + 24, 12, C.dim);
    text(ctx, '카드를 선택하고 내 진영 칸을 클릭해 설치합니다.', x0 + 14, y0 + 46, 12, C.dim);
    text(ctx, '적 진영은 내 병사가 지나간 칸만 보이며, 마지막으로 본 상태가 남습니다.', x0 + 14, y0 + 68, 12, C.dim);
    text(ctx, '단축키: Space 일시정지 · 1/2/3 속도 · Esc 선택 해제', x0 + 14, y0 + 90, 12, C.dim);
    return;
  }
  const def = MODULE_BY_ID[m.defId];
  text(ctx, `${def.name}  (레인 ${m.row + 1}, ${m.col + 1}열)`, x0 + 14, y0 + 20, 14, C.text, 'left', 'bold');
  text(ctx, def.desc, x0 + 14, y0 + 42, 12, C.dim);
  text(ctx, `HP ${Math.ceil(m.hp)} / ${m.maxHp}`, x0 + 14, y0 + 62, 12, C.text);
  if (def.kind === 'barracks') {
    const unit = UNIT_BY_ID[def.unitId!];
    const mult = BARRACKS_LEVEL_SPAWN_MULT[m.level];
    text(ctx, `레벨 ${m.level}/3 · 생산 주기 ${(def.spawnInterval! * mult).toFixed(1)}s · ${FAMILY_NAME[unit.family]}`, x0 + 14, y0 + 82, 12, C.text);
    const cost = barracksUpgradeCost(m);
    const busy = m.buildRemaining > 0 || m.upgradeRemaining > 0;
    const label = cost ? `업그레이드  ${cost.minerals}M + ${cost.gas}G` : '최대 레벨';
    button(
      ctx,
      buttons,
      { id: 'upg', x: x0 + 14, y: y0 + 106, w: 190, h: 30, onClick: () => api.upgradeSelected(), disabled: !cost || busy || game.players[0].minerals < cost.minerals || game.players[0].gas < cost.gas, tooltip: ['이 칸의 병영만 업그레이드', '생산 속도: L2 x0.75, L3 x0.55', '10초 소요'] },
      label,
      ui,
      { size: 12 },
    );
  }
  button(ctx, buttons, { id: 'sell', x: x0 + w - 110, y: y0 + 106, w: 96, h: 30, onClick: () => api.sellSelected(), tooltip: ['판매: 기본 가격의 50% 미네랄 환불', '가스는 환불되지 않음'] }, `판매 +${Math.round(def.cost * SELL_REFUND_RATIO)}`, ui, { size: 12 });
}

function drawIntelPanel(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState): void {
  const x0 = 910;
  const y0 = LOWER_TOP;
  text(ctx, '레인별 최근 목격 적 병종', x0, y0 + 8, 12, C.dim);
  const fams: Family[] = ['ant', 'beetle', 'mantis'];
  for (let row = 0; row < ROWS; row++) {
    const y = y0 + 30 + row * 30;
    text(ctx, `레인 ${row + 1}`, x0, y, 12, C.text);
    fams.forEach((f, i) => {
      const last = ui.laneIntel[row][f];
      const age = ui.now - last;
      const alpha = last === -Infinity ? 0.12 : Math.max(0.25, 1 - age / 60);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = C.enemy;
      const px = x0 + 60 + i * 60;
      ctx.beginPath();
      if (f === 'ant') ctx.arc(px, y, 7, 0, Math.PI * 2);
      else if (f === 'beetle') rr(ctx, px - 7, y - 7, 14, 14, 3);
      else {
        ctx.moveTo(px - 8, y);
        ctx.lineTo(px + 6, y - 7);
        ctx.lineTo(px + 6, y + 7);
        ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      text(ctx, FAMILY_NAME[f].replace('류', ''), px + 12, y, 11, alpha > 0.2 ? C.text : C.dim);
    });
    const enemyMods = game.players[0].fog[row].filter((f) => f && f.defId).length;
    text(ctx, enemyMods > 0 ? `본 모듈 ${enemyMods}` : '', x0 + 250, y, 11, C.dim);
  }
  text(ctx, '(내 병사가 적 진영에 들어가야 상대 빌드가 보입니다)', x0, y0 + 150, 11, C.dim);
}

function drawTooltip(ctx: CanvasRenderingContext2D, ui: UiState, buttons: Button[]): void {
  const b = buttons.find((bb) => bb.tooltip && inRect(bb, ui.hover.x, ui.hover.y));
  if (!b || !b.tooltip) return;
  ctx.font = `12px 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  const w = Math.max(...b.tooltip.map((l) => ctx.measureText(l).width)) + 20;
  const h = b.tooltip.length * 18 + 12;
  let x = ui.hover.x + 14;
  let y = ui.hover.y - h - 6;
  if (x + w > W) x = W - w - 4;
  if (y < 0) y = ui.hover.y + 18;
  ctx.fillStyle = 'rgba(10,8,6,0.94)';
  rr(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = C.panelLine;
  ctx.stroke();
  b.tooltip.forEach((l, i) => text(ctx, l, x + 10, y + 15 + i * 18, 12, i === 0 ? C.resource : C.text));
}

function drawMessage(ctx: CanvasRenderingContext2D, ui: UiState): void {
  if (!ui.message || ui.now > ui.message.until) return;
  const alpha = Math.min(1, (ui.message.until - ui.now) / 0.5);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  rr(ctx, W / 2 - 200, LANES_BOTTOM - 40, 400, 28, 6);
  ctx.fill();
  text(ctx, ui.message.text, W / 2, LANES_BOTTOM - 26, 13, C.resource, 'center');
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function drawMenu(ctx: CanvasRenderingContext2D, ui: UiState, buttons: Button[], api: UiApi): void {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'BUG EMPIRE', W / 2, 140, 56, C.resource, 'center', 'bold');
  text(ctx, '레인 전쟁 · 격자 건설 · 계열 업그레이드', W / 2, 195, 18, C.dim, 'center');

  text(ctx, '난이도', W / 2, 270, 16, C.text, 'center');
  (Object.keys(DIFFICULTIES) as Difficulty[]).forEach((d, i) => {
    button(ctx, buttons, { id: `diff_${d}`, x: W / 2 - 200 + i * 140, y: 290, w: 120, h: 40, onClick: () => api.setDifficulty(d) }, DIFFICULTIES[d].name, ui, { active: ui.difficulty === d, size: 15 });
  });
  const diffDesc: Record<Difficulty, string> = {
    normal: 'AI가 정해진 빌드만 따라감. 자원 보너스 없음.',
    hard: 'AI가 압박받는 레인에 반응하고 자원 +15%.',
    hell: 'AI가 내 빌드를 훔쳐보며 카운터를 치고 자원 +40%.',
  };
  text(ctx, diffDesc[ui.difficulty], W / 2, 350, 13, C.dim, 'center');

  text(ctx, '모드', W / 2, 400, 16, C.text, 'center');
  button(ctx, buttons, { id: 'mode_free', x: W / 2 - 160, y: 420, w: 150, h: 40, onClick: () => api.setTimeLimitMode(false) }, '무제한', ui, { active: !ui.timeLimitMode, size: 15 });
  button(ctx, buttons, { id: 'mode_15', x: W / 2 + 10, y: 420, w: 150, h: 40, onClick: () => api.setTimeLimitMode(true) }, '15분 제한', ui, { active: ui.timeLimitMode, size: 15 });
  text(ctx, ui.timeLimitMode ? '15분이 지나면 남은 성 HP가 높은 쪽이 승리' : '어느 한쪽의 성 HP가 0이 될 때까지', W / 2, 480, 13, C.dim, 'center');

  button(ctx, buttons, { id: 'start', x: W / 2 - 100, y: 530, w: 200, h: 54, onClick: () => api.startGame() }, '게임 시작', ui, { active: true, size: 20 });

  const tips = [
    '미네랄은 자원 모듈로, 가스는 오직 전투(킬·모듈 파괴)로만 얻습니다.',
    '병사는 자기 레인의 가장 앞 모듈부터 부수고, 레인을 다 뚫으면 성을 공격합니다.',
    '디펜스 모듈은 업그레이드가 없고 킬 가스도 25%만 줍니다. 시간을 벌 뿐, 이기게 해주진 않습니다.',
  ];
  tips.forEach((t, i) => text(ctx, t, W / 2, 625 + i * 22, 12, C.dim, 'center'));
}

function drawEnd(ctx: CanvasRenderingContext2D, game: GameState, ui: UiState, buttons: Button[], api: UiApi): void {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);
  const w = game.winner;
  const title = w === 0 ? '승리' : w === 1 ? '패배' : '무승부';
  text(ctx, title, W / 2, 200, 64, w === 0 ? C.player : w === 1 ? C.enemy : C.dim, 'center', 'bold');
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
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  if (ui.screen === 'menu' || !game) {
    drawMenu(ctx, ui, buttons, api);
    drawTooltip(ctx, ui, buttons);
    return buttons;
  }

  drawLanes(ctx, game, ui);
  for (const m of game.modules) {
    if (!moduleVisibleToPlayer(game, m)) continue;
    drawModule(ctx, game, m, false, m.id === ui.selectedModuleId);
  }
  drawFog(ctx, game);
  for (const u of game.units) if (unitVisibleToPlayer(game, u)) drawUnit(ctx, game, u);
  drawEffects(ctx, ui);
  drawCastles(ctx, game, ui, buttons, api);

  ctx.fillStyle = C.panel;
  ctx.fillRect(0, PANEL_TOP, W, H - PANEL_TOP);
  ctx.fillStyle = C.panelLine;
  ctx.fillRect(0, PANEL_TOP, W, 1);

  drawTopBar(ctx, game, ui, buttons, api);
  drawCards(ctx, game, ui, buttons, api);
  drawUpgradePanel(ctx, game, ui, buttons, api);
  drawSelectionPanel(ctx, game, ui, buttons, api);
  drawIntelPanel(ctx, game, ui);
  drawMessage(ctx, ui);

  if (ui.paused && ui.screen === 'game') {
    text(ctx, '일시정지', W / 2, GRID_TOP + (LANES_BOTTOM - GRID_TOP) / 2, 40, 'rgba(255,255,255,0.7)', 'center', 'bold');
  }

  if (ui.screen === 'end') drawEnd(ctx, game, ui, buttons, api);
  drawTooltip(ctx, ui, buttons);
  return buttons;
}
