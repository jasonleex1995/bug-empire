import { acidRain, castleUpgrade, emergency, place, rechargeEmergency, sell, unlock, upgradeModule } from './sim/actions';
import { AiController } from './sim/ai/controller';
import { DIFFICULTIES, type Difficulty } from './sim/ai/profiles';
import { COLS, LANE_LENGTH, ROWS, TICK_DT, moduleSpan } from './sim/config';
import { UNIT_BY_ID, type Family } from './sim/data/units';
import type { Track } from './sim/data/upgrades';
import { createGame, type GameState } from './sim/state';
import { step } from './sim/step';
import { H, W, laneToPx, pxToLane, pxToOwnCell, pxToRow, rowCenter, inRect, isInLaneArea } from './ui/layout';
import { ACID_CARD, render, type Button, type UiApi, type UiState } from './ui/renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
canvas.width = W;
canvas.height = H;

let game: GameState | null = null;
let ai: AiController | null = null;
let buttons: Button[] = [];

const ui: UiState = {
  screen: 'menu',
  difficulty: 'normal',
  timeLimitMode: false,
  selectedCard: null,
  selectedModuleId: null,
  hover: { x: -1, y: -1 },
  speed: 1,
  paused: false,
  message: null,
  laneIntel: Array.from({ length: ROWS }, () => ({ ant: -Infinity, beetle: -Infinity, mantis: -Infinity })),
  effects: [],
  now: 0,
};

function say(text: string): void {
  ui.message = { text, until: ui.now + 2.5 };
}

const api: UiApi = {
  selectCard(id) {
    ui.selectedCard = id;
    if (id) ui.selectedModuleId = null;
  },
  togglePause() {
    ui.paused = !ui.paused;
  },
  setSpeed(n) {
    ui.speed = n;
    ui.paused = false;
  },
  upgradeSelected() {
    if (!game || ui.selectedModuleId === null) return;
    const r = upgradeModule(game, 0, ui.selectedModuleId);
    if (!r.ok) say(reasonText(r.reason));
  },
  sellSelected() {
    if (!game || ui.selectedModuleId === null) return;
    const r = sell(game, 0, ui.selectedModuleId);
    if (r.ok) ui.selectedModuleId = null;
  },
  castleUpgrade(f: Family, t: Track) {
    if (!game) return;
    const r = castleUpgrade(game, 0, f, t);
    if (!r.ok) say(reasonText(r.reason));
  },
  unlock(unitId) {
    if (!game) return;
    const r = unlock(game, 0, unitId);
    if (!r.ok) say(reasonText(r.reason));
    else say(`${UNIT_BY_ID[unitId].name} 해금`);
  },
  emergency(row) {
    if (!game) return;
    const r = emergency(game, 0, row);
    if (!r.ok) say(reasonText(r.reason));
  },
  recharge(row) {
    if (!game) return;
    const r = rechargeEmergency(game, 0, row);
    if (!r.ok) say(reasonText(r.reason));
  },
  setDifficulty(d: Difficulty) {
    ui.difficulty = d;
  },
  setTimeLimitMode(on) {
    ui.timeLimitMode = on;
  },
  toDifficulty() {
    ui.screen = 'difficulty';
  },
  startGame() {
    startGame();
  },
  toMenu() {
    ui.screen = 'menu';
    game = null;
    ai = null;
  },
};

function reasonText(reason: string): string {
  const map: Record<string, string> = {
    'not enough minerals': '미네랄이 부족합니다',
    'not enough gas': '가스가 부족합니다',
    'cell occupied': '이미 모듈이 있는 칸입니다',
    locked: '먼저 해금해야 합니다',
    'max level': '최대 레벨입니다',
    'under construction': '건설 중입니다',
    'already upgrading': '이미 업그레이드 중입니다',
    'no charge': '비상 방어가 소모되었습니다',
    'already charged': '이미 충전되어 있습니다',
    'only barracks upgrade': '병영만 업그레이드할 수 있습니다',
    'already unlocked': '이미 해금되었습니다',
  };
  return map[reason] ?? reason;
}

function startGame(): void {
  const preset = DIFFICULTIES[ui.difficulty];
  const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  game = createGame({ seed, timeLimit: null, resourceMult: [1, preset.resourceMult] });
  // Unlimited only for now; 15-minute mode stays in the sim but is not exposed in the menu.
  ai = new AiController(1, preset.profile, seed);
  ui.screen = 'game';
  ui.selectedCard = null;
  ui.selectedModuleId = null;
  ui.paused = false;
  ui.speed = 1;
  ui.effects = [];
  ui.message = null;
  for (const li of ui.laneIntel) {
    li.ant = -Infinity;
    li.beetle = -Infinity;
    li.mantis = -Infinity;
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function canvasPos(e: MouseEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

canvas.addEventListener('mousemove', (e) => {
  ui.hover = canvasPos(e);
});

canvas.addEventListener('mouseleave', () => {
  ui.hover = { x: -1, y: -1 };
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ui.selectedCard = null;
  ui.selectedModuleId = null;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const p = canvasPos(e);
  const b = buttons.find((bb) => inRect(bb, p.x, p.y) && !bb.disabled);
  if (b) {
    b.onClick();
    return;
  }
  if (!game || ui.screen !== 'game') return;

  if (ui.selectedCard === ACID_CARD) {
    const row = pxToRow(p.y);
    if (row !== null && isInLaneArea(p.x, p.y)) {
      const r = acidRain(game, 0, row);
      if (!r.ok) say(reasonText(r.reason));
      else if (!e.shiftKey) ui.selectedCard = null;
    }
    return;
  }

  const cell = pxToOwnCell(p.x, p.y);
  if (cell) {
    if (ui.selectedCard) {
      const r = place(game, 0, cell.row, cell.col, ui.selectedCard);
      if (!r.ok) say(reasonText(r.reason));
      else if (!e.shiftKey) ui.selectedCard = null;
    } else {
      const m = game.modules.find((mm) => mm.side === 0 && mm.row === cell.row && mm.col === cell.col);
      ui.selectedModuleId = m ? m.id : null;
    }
    return;
  }
  // Clicking the enemy side or empty space clears selection.
  if (pxToRow(p.y) !== null) {
    ui.selectedCard = null;
    ui.selectedModuleId = null;
  }
});

window.addEventListener('keydown', (e) => {
  if (ui.screen !== 'game') return;
  if (e.code === 'Space') {
    e.preventDefault();
    api.togglePause();
  } else if (e.key === '1' || e.key === '2' || e.key === '3') {
    api.setSpeed(Number(e.key));
  } else if (e.key === 'Escape') {
    ui.selectedCard = null;
    ui.selectedModuleId = null;
  }
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function collectEffects(g: GameState): void {
  for (const ev of g.events) {
    if (ev.type === 'hit') {
      if (Math.random() < 0.35) ui.effects.push({ kind: 'spark', x: laneToPx(ev.x), y: rowCenter(ev.row) + 6, ttl: 0.25, max: 0.25 });
    } else if (ev.type === 'unitDied') {
      ui.effects.push({ kind: 'puff', x: laneToPx(ev.x), y: rowCenter(ev.row) + 6, ttl: 0.5, max: 0.5 });
    } else if (ev.type === 'moduleDestroyed') {
      const [a, b] = moduleSpan(ev.side, ev.col);
      ui.effects.push({ kind: 'burst', x: laneToPx((a + b) / 2), y: rowCenter(ev.row), ttl: 0.6, max: 0.6 });
    } else if (ev.type === 'emergency') {
      ui.effects.push({ kind: 'laneFlash', x: 0, y: 0, row: ev.row, ttl: 0.6, max: 0.6 });
    } else if (ev.type === 'acidRain') {
      ui.effects.push({ kind: 'laneGreen', x: 0, y: 0, row: ev.row, ttl: 0.7, max: 0.7 });
    } else if (ev.type === 'castleHit' && ev.side === 0) {
      if (Math.random() < 0.3) ui.effects.push({ kind: 'spark', x: laneToPx(0) + 4, y: rowCenter(Math.floor(Math.random() * ROWS)), ttl: 0.3, max: 0.3 });
    }
  }
}

function updateIntel(g: GameState): void {
  for (const u of g.units) {
    if (u.side !== 1) continue;
    const visible = u.x <= LANE_LENGTH - COLS + 0.3 || g.units.some((s) => s.side === 0 && s.row === u.row && Math.abs(s.x - u.x) <= 1.5);
    if (visible) ui.laneIntel[u.row][UNIT_BY_ID[u.defId].family] = ui.now;
  }
}

let last = performance.now();
let acc = 0;

function frame(now: number): void {
  const realDt = Math.min(0.1, (now - last) / 1000);
  last = now;
  ui.now = now / 1000;

  if (game && ui.screen === 'game' && !ui.paused) {
    acc += realDt * ui.speed;
    let steps = 0;
    while (acc >= TICK_DT && steps < 12) {
      ai!.update(game);
      step(game, TICK_DT);
      collectEffects(game);
      acc -= TICK_DT;
      steps++;
    }
    if (steps === 12) acc = 0;
    updateIntel(game);
    if (game.winner !== null) ui.screen = 'end';
  }

  for (const e of ui.effects) e.ttl -= realDt;
  ui.effects = ui.effects.filter((e) => e.ttl > 0);
  if (ui.effects.length > 300) ui.effects.splice(0, ui.effects.length - 300);

  buttons = render(ctx, game, ui, api);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Handy for poking at the sim from the devtools console.
(window as unknown as { bugEmpire: unknown }).bugEmpire = { get game() { return game; }, ui, pxToLane };
