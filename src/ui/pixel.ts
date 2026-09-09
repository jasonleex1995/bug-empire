/**
 * Nearest-neighbor pixel art helpers. Draw into a tiny buffer, then blit scaled up.
 * Keeps silhouettes crisp on a 1280 canvas without depending on external sprite sheets.
 */

export function makePixelCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function pxCtx(c: OffscreenCanvas | HTMLCanvasElement): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Blit a pixel buffer scaled by `scale` with nearest-neighbor filtering. */
export function blitPixel(
  dest: CanvasRenderingContext2D,
  src: OffscreenCanvas | HTMLCanvasElement,
  dx: number,
  dy: number,
  scale: number,
): void {
  dest.imageSmoothingEnabled = false;
  dest.drawImage(src, Math.round(dx), Math.round(dy), src.width * scale, src.height * scale);
}

type Px = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function set(ctx: Px, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function fill(ctx: Px, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function setIf(ctx: Px, x: number, y: number, color: string, w: number, h: number): void {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  set(ctx, x, y, color);
}

/** 32×28 pixel ant emblem (amber on transparent) — kept for small UI marks. */
export function drawPixelAntLogo(dest: CanvasRenderingContext2D, cx: number, cy: number, scale = 3): void {
  const c = makePixelCanvas(32, 28);
  const ctx = pxCtx(c);
  const A = '#e8b84a';
  const D = '#a07828';
  const S = '#f5d78a';

  fill(ctx, 4, 14, 10, 8, A);
  fill(ctx, 5, 13, 8, 1, A);
  fill(ctx, 5, 22, 8, 1, A);
  fill(ctx, 6, 15, 3, 2, D);
  fill(ctx, 13, 13, 8, 8, A);
  fill(ctx, 14, 12, 6, 1, A);
  fill(ctx, 15, 15, 3, 2, S);
  fill(ctx, 20, 12, 7, 7, A);
  fill(ctx, 21, 11, 5, 1, A);
  fill(ctx, 24, 14, 2, 2, D);
  set(ctx, 27, 15, A);
  set(ctx, 28, 16, A);
  set(ctx, 27, 17, A);
  set(ctx, 28, 18, A);
  set(ctx, 24, 10, A);
  set(ctx, 25, 8, A);
  set(ctx, 26, 6, A);
  set(ctx, 27, 5, S);
  set(ctx, 23, 10, A);
  set(ctx, 22, 8, A);
  set(ctx, 21, 7, S);
  for (const [x, y] of [
    [8, 22],
    [7, 24],
    [6, 26],
    [12, 22],
    [12, 24],
    [11, 26],
    [16, 21],
    [17, 23],
    [18, 25],
    [15, 23],
    [14, 25],
  ] as [number, number][]) {
    set(ctx, x, y, D);
  }
  fill(ctx, 6, 26, 16, 1, '#5a4018');

  blitPixel(dest, c, cx - (32 * scale) / 2, cy - (28 * scale) / 2, scale);
}

/**
 * Title-screen roster hero: beetle · ant · mantis on a warm under-leaf dusk.
 * Drawn at 160×90 then scaled — epic poster feel without shipping a PNG.
 */
export function drawPixelRosterHero(dest: CanvasRenderingContext2D, cx: number, cy: number, scale = 5, t = 0): void {
  const W = 160;
  const H = 90;
  const c = makePixelCanvas(W, H);
  const ctx = pxCtx(c);

  const skyTop = '#142028';
  const skyMid = '#2a3840';
  const skyWarm = '#6a5040';
  const sunCore = '#f0c060';
  const sunGlow = '#c88840';
  const ridge = '#1a2430';
  const ridgeLit = '#2a3848';
  const soil = '#2a2218';
  const soilLit = '#3a3020';
  const rock = '#3a3428';
  const rockLit = '#524838';
  const leaf = '#1e3820';
  const leafLit = '#2e5030';
  const flag = '#c04038';
  const flagPole = '#6a5840';

  // —— Sky bands (warm dusk, forest-teal not cotton-candy purple)
  for (let y = 0; y < 52; y++) {
    const u = y / 52;
    const col = u < 0.35 ? skyTop : u < 0.62 ? skyMid : skyWarm;
    fill(ctx, 0, y, W, 1, col);
  }
  // Sun + rim glow
  const sunX = 80;
  const sunY = 40;
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      const d = Math.hypot(dx, dy * 1.15);
      if (d < 5.2) set(ctx, sunX + dx, sunY + dy, sunCore);
      else if (d < 8.5) set(ctx, sunX + dx, sunY + dy, sunGlow);
      else if (d < 12 && (dx + dy * 3 + Math.floor(t * 2)) % 3 === 0) set(ctx, sunX + dx, sunY + dy, skyWarm);
    }
  }
  // Soft clouds
  fill(ctx, 18, 14, 18, 2, '#3a4850');
  fill(ctx, 22, 12, 12, 2, '#4a5860');
  fill(ctx, 120, 18, 22, 2, '#3a4850');
  fill(ctx, 126, 16, 12, 2, '#4a5860');

  // —— Mountain / pillar ridges
  const peaks = [
    [0, 52, 18, 28],
    [14, 48, 22, 32],
    [34, 44, 16, 28],
    [48, 50, 14, 24],
    [98, 50, 16, 26],
    [112, 46, 20, 30],
    [132, 50, 28, 28],
  ];
  for (const [x, y, w, h] of peaks) {
    fill(ctx, x, y, w, h, ridge);
    fill(ctx, x + 2, y, Math.max(2, w - 6), 2, ridgeLit);
  }
  // Jagged tops
  for (let x = 0; x < W; x++) {
    const jag = 46 + ((x * 5) % 7) - ((x * 3) % 5);
    if (x < 70 || x > 95) fill(ctx, x, jag, 1, 56 - jag, ridge);
  }

  // —— Ground mound
  fill(ctx, 0, 58, W, H - 58, soil);
  fill(ctx, 20, 56, 120, 2, soilLit);
  fill(ctx, 40, 54, 80, 2, rock);
  // Rocks
  fill(ctx, 12, 70, 14, 8, rock);
  fill(ctx, 14, 68, 10, 2, rockLit);
  fill(ctx, 130, 72, 16, 10, rock);
  fill(ctx, 134, 70, 10, 2, rockLit);
  fill(ctx, 70, 78, 20, 6, rock);
  // Sparse grass
  for (let i = 0; i < 18; i++) {
    const gx = 8 + i * 8 + (i % 3);
    set(ctx, gx, 64 + (i % 4), leafLit);
    set(ctx, gx, 65 + (i % 4), leaf);
  }
  // Tiny war flags (empire scale cue)
  for (const fx of [36, 52, 108, 124]) {
    fill(ctx, fx, 66, 1, 12, flagPole);
    fill(ctx, fx + 1, 66, 4, 3, flag);
  }

  const breath = Math.sin(t * 2.1) * 0.5;
  const antenna = Math.round(Math.sin(t * 3.2) * 1);
  const scythe = Math.round(Math.sin(t * 2.4 + 1) * 1);

  drawPixelBeetle(ctx, 28, 38 + Math.round(breath), W, H);
  drawPixelMantis(ctx, 112, 30 + Math.round(-breath), scythe, W, H);
  drawPixelHeroAnt(ctx, 68, 42, antenna, W, H);

  // Leaf frame (foreground corners)
  for (let i = 0; i < 22; i++) {
    fill(ctx, i, 0, 1, 8 + (i % 5), leaf);
    fill(ctx, W - 1 - i, 0, 1, 7 + ((i + 2) % 5), leaf);
    if (i % 3 === 0) {
      set(ctx, i + 2, 6 + (i % 4), leafLit);
      set(ctx, W - 3 - i, 5 + (i % 4), leafLit);
    }
  }
  // Bottom leaf fringe
  for (let i = 0; i < 10; i++) {
    fill(ctx, i * 3, H - 4, 4, 4, leaf);
    fill(ctx, W - 4 - i * 3, H - 5, 4, 5, leaf);
  }

  // Rim light accents on bugs (sunset edge)
  const rim = '#e8c070';
  setIf(ctx, 48, 36, rim, W, H);
  setIf(ctx, 49, 40, rim, W, H);
  setIf(ctx, 95, 48, rim, W, H);
  setIf(ctx, 96, 52, rim, W, H);
  setIf(ctx, 128, 34, rim, W, H);
  setIf(ctx, 130, 42, rim, W, H);

  blitPixel(dest, c, cx - (W * scale) / 2, cy - (H * scale) / 2, scale);
}

/** Kabuto-style tank beetle — left of the trio. */
function drawPixelBeetle(ctx: Px, ox: number, oy: number, W: number, H: number): void {
  const shell = '#1a2830';
  const shellLit = '#2e4850';
  const shellHi = '#4a7078';
  const horn = '#0e181c';
  const hornLit = '#3a5058';
  const leg = '#121c20';

  // Body shell
  fill(ctx, ox + 6, oy + 14, 28, 22, shell);
  fill(ctx, ox + 8, oy + 12, 24, 2, shell);
  fill(ctx, ox + 10, oy + 10, 20, 2, shellLit);
  fill(ctx, ox + 8, oy + 16, 10, 8, shellLit);
  fill(ctx, ox + 12, oy + 18, 6, 4, shellHi);
  // Head
  fill(ctx, ox + 30, oy + 16, 12, 12, shell);
  fill(ctx, ox + 32, oy + 18, 6, 4, shellLit);
  setIf(ctx, ox + 38, oy + 20, '#0a1014', W, H); // eye
  // Twin horns / mandibles (풍뎅이 identity)
  fill(ctx, ox + 34, oy + 4, 3, 14, horn);
  fill(ctx, ox + 35, oy + 2, 2, 3, hornLit);
  fill(ctx, ox + 28, oy + 8, 8, 2, horn);
  fill(ctx, ox + 26, oy + 6, 3, 4, horn);
  fill(ctx, ox + 40, oy + 8, 8, 2, horn);
  fill(ctx, ox + 46, oy + 6, 3, 4, horn);
  // Legs
  for (const [lx, ly] of [
    [8, 34],
    [6, 38],
    [4, 42],
    [16, 36],
    [14, 40],
    [12, 44],
    [24, 36],
    [26, 40],
    [28, 44],
  ] as [number, number][]) {
    setIf(ctx, ox + lx, oy + ly, leg, W, H);
  }
}

/** Forward red ant — center hero. */
function drawPixelHeroAnt(ctx: Px, ox: number, oy: number, antenna: number, W: number, H: number): void {
  const body = '#b84830';
  const bodyDeep = '#7a2818';
  const bodyLit = '#d46848';
  const eye = '#1a1010';
  const leg = '#5a2018';

  // Abdomen
  fill(ctx, ox + 2, oy + 18, 16, 14, body);
  fill(ctx, ox + 4, oy + 16, 12, 2, body);
  fill(ctx, ox + 4, oy + 32, 12, 2, body);
  fill(ctx, ox + 6, oy + 20, 6, 6, bodyDeep);
  fill(ctx, ox + 8, oy + 22, 4, 3, bodyLit);
  // Thorax
  fill(ctx, ox + 16, oy + 16, 14, 14, body);
  fill(ctx, ox + 18, oy + 14, 10, 2, body);
  fill(ctx, ox + 20, oy + 18, 6, 4, bodyLit);
  // Head
  fill(ctx, ox + 28, oy + 14, 12, 12, body);
  fill(ctx, ox + 30, oy + 12, 8, 2, body);
  fill(ctx, ox + 34, oy + 16, 4, 4, eye);
  fill(ctx, ox + 35, oy + 17, 2, 2, '#3a2020');
  // Mandibles
  setIf(ctx, ox + 40, oy + 18, bodyDeep, W, H);
  setIf(ctx, ox + 41, oy + 19, bodyDeep, W, H);
  setIf(ctx, ox + 40, oy + 20, bodyDeep, W, H);
  setIf(ctx, ox + 41, oy + 21, bodyDeep, W, H);
  // Antennae (animated tip)
  setIf(ctx, ox + 32, oy + 10, bodyDeep, W, H);
  setIf(ctx, ox + 33, oy + 7, bodyDeep, W, H);
  setIf(ctx, ox + 34 + antenna, oy + 4, bodyLit, W, H);
  setIf(ctx, ox + 30, oy + 10, bodyDeep, W, H);
  setIf(ctx, ox + 28, oy + 7, bodyDeep, W, H);
  setIf(ctx, ox + 27 - antenna, oy + 4, bodyLit, W, H);
  // Legs (planted stance)
  for (const [lx, ly] of [
    [6, 32],
    [4, 36],
    [2, 40],
    [12, 34],
    [10, 38],
    [8, 42],
    [20, 32],
    [22, 36],
    [24, 40],
    [26, 34],
    [28, 38],
    [30, 42],
  ] as [number, number][]) {
    setIf(ctx, ox + lx, oy + ly, leg, W, H);
  }
}

/** Green mantis — right flank, scythes ready. */
function drawPixelMantis(ctx: Px, ox: number, oy: number, scythe: number, W: number, H: number): void {
  const body = '#4a8a40';
  const bodyDeep = '#2a5a28';
  const bodyLit = '#6ab058';
  const eye = '#c8e0a8';
  const leg = '#2a4828';

  // Tall abdomen
  fill(ctx, ox + 10, oy + 22, 10, 28, body);
  fill(ctx, ox + 12, oy + 24, 4, 20, bodyDeep);
  fill(ctx, ox + 14, oy + 26, 2, 8, bodyLit);
  // Thorax
  fill(ctx, ox + 8, oy + 14, 14, 12, body);
  fill(ctx, ox + 10, oy + 12, 10, 2, bodyLit);
  // Triangular head
  fill(ctx, ox + 10, oy + 4, 12, 10, body);
  fill(ctx, ox + 12, oy + 2, 8, 2, body);
  fill(ctx, ox + 14, oy + 6, 4, 4, eye);
  fill(ctx, ox + 15, oy + 7, 2, 2, '#1a2810');
  // Antennae
  setIf(ctx, ox + 14, oy + 1, bodyDeep, W, H);
  setIf(ctx, ox + 13, oy + 0, bodyLit, W, H);
  setIf(ctx, ox + 18, oy + 1, bodyDeep, W, H);
  setIf(ctx, ox + 19, oy + 0, bodyLit, W, H);
  // Raptorial forelegs (animated)
  const s = scythe;
  fill(ctx, ox + 20, oy + 14 + s, 14, 3, bodyDeep);
  fill(ctx, ox + 30, oy + 10 + s, 3, 10, body);
  fill(ctx, ox + 22, oy + 18 + s, 10, 2, bodyLit);
  // Spikes
  setIf(ctx, ox + 24, oy + 16 + s, '#1a3018', W, H);
  setIf(ctx, ox + 28, oy + 16 + s, '#1a3018', W, H);
  // Second arm
  fill(ctx, ox - 2, oy + 16 - s, 12, 3, bodyDeep);
  fill(ctx, ox - 4, oy + 12 - s, 3, 10, body);
  // Standing legs
  for (const [lx, ly] of [
    [8, 48],
    [6, 52],
    [4, 56],
    [18, 48],
    [20, 52],
    [22, 56],
  ] as [number, number][]) {
    setIf(ctx, ox + lx, oy + ly, leg, W, H);
  }
}

/**
 * Tiny 5×7 capitals for the title. Each glyph is 5 columns × 7 rows of 0/1,
 * packed as 7 strings of length 5.
 */
const GLYPHS: Record<string, string[]> = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

/** Draw "BUG EMPIRE" as chunky pixel letters centered at (cx, cy). */
export function drawPixelTitle(dest: CanvasRenderingContext2D, cx: number, cy: number, scale = 5, color = '#e8b84a'): void {
  const text = 'BUG EMPIRE';
  const letterW = 5;
  const letterH = 7;
  const gap = 1;
  const spaceGap = 3;
  let units = 0;
  for (const ch of text) units += ch === ' ' ? spaceGap : letterW + gap;
  units -= gap;

  const bufW = units;
  const bufH = letterH;

  const paint = (fillColor: string) => {
    const c = makePixelCanvas(bufW, bufH);
    const ctx = pxCtx(c);
    let x = 0;
    for (const ch of text) {
      if (ch === ' ') {
        x += spaceGap;
        continue;
      }
      const g = GLYPHS[ch];
      if (!g) continue;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] === '1') set(ctx, x + col, row, fillColor);
        }
      }
      x += letterW + gap;
    }
    return c;
  };

  const outline = paint('#1a1408');
  const face = paint(color);
  const dx = cx - (bufW * scale) / 2;
  const dy = cy - (bufH * scale) / 2;
  const o = Math.max(1, Math.round(scale / 5));

  dest.save();
  dest.globalAlpha = 0.35;
  blitPixel(dest, outline, dx + o, dy + o, scale);
  dest.globalAlpha = 1;
  for (const [ox, oy] of [
    [-o, 0],
    [o, 0],
    [0, -o],
    [0, o],
    [-o, -o],
    [o, -o],
    [-o, o],
    [o, o],
  ] as [number, number][]) {
    blitPixel(dest, outline, dx + ox, dy + oy, scale);
  }
  blitPixel(dest, face, dx, dy, scale);
  dest.restore();
}

/** 9×9 mineral gem. */
export function drawPixelGem(dest: CanvasRenderingContext2D, x: number, y: number, scale = 2): void {
  const c = makePixelCanvas(9, 9);
  const ctx = pxCtx(c);
  const A = '#e8b84a';
  const L = '#f5d78a';
  const D = '#8a6020';
  fill(ctx, 4, 0, 1, 1, L);
  fill(ctx, 3, 1, 3, 1, A);
  fill(ctx, 2, 2, 5, 1, A);
  fill(ctx, 1, 3, 7, 1, A);
  fill(ctx, 0, 4, 9, 1, A);
  fill(ctx, 1, 5, 7, 1, A);
  fill(ctx, 2, 6, 5, 1, A);
  fill(ctx, 3, 7, 3, 1, A);
  fill(ctx, 4, 8, 1, 1, D);
  fill(ctx, 3, 3, 2, 2, L);
  blitPixel(dest, c, x, y, scale);
}

/** 9×9 gas orb. */
export function drawPixelOrb(dest: CanvasRenderingContext2D, x: number, y: number, scale = 2): void {
  const c = makePixelCanvas(9, 9);
  const ctx = pxCtx(c);
  const A = '#5de0c0';
  const L = '#b8fff0';
  const D = '#2a8a74';
  fill(ctx, 3, 0, 3, 1, A);
  fill(ctx, 1, 1, 7, 1, A);
  fill(ctx, 0, 2, 9, 5, A);
  fill(ctx, 1, 7, 7, 1, A);
  fill(ctx, 3, 8, 3, 1, D);
  fill(ctx, 2, 3, 2, 2, L);
  blitPixel(dest, c, x, y, scale);
}
