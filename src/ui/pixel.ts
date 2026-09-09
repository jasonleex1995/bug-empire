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

  const skyTop = '#101820';
  const skyMid = '#243038';
  const skyWarm = '#7a5840';
  const sunCore = '#ffe080';
  const sunGlow = '#e09848';
  const ridge = '#141c24';
  const ridgeLit = '#283848';
  const soil = '#241c14';
  const soilLit = '#3a2c1c';
  const rock = '#3a3224';
  const rockLit = '#5a4c38';
  const leaf = '#16301c';
  const leafLit = '#2a5030';
  const flag = '#d04030';
  const flagPole = '#6a5840';

  for (let y = 0; y < 54; y++) {
    const u = y / 54;
    fill(ctx, 0, y, W, 1, u < 0.3 ? skyTop : u < 0.58 ? skyMid : skyWarm);
  }

  const sunX = 80;
  const sunY = 38;
  for (let dy = -11; dy <= 11; dy++) {
    for (let dx = -13; dx <= 13; dx++) {
      const d = Math.hypot(dx, dy * 1.1);
      if (d < 6) set(ctx, sunX + dx, sunY + dy, sunCore);
      else if (d < 9.5) set(ctx, sunX + dx, sunY + dy, sunGlow);
      else if (d < 13 && (dx + dy * 3 + Math.floor(t * 2)) % 3 === 0) set(ctx, sunX + dx, sunY + dy, '#a87040');
    }
  }
  fill(ctx, 14, 12, 20, 2, '#3a4850');
  fill(ctx, 18, 10, 14, 2, '#4a5860');
  fill(ctx, 118, 16, 24, 2, '#3a4850');
  fill(ctx, 124, 14, 14, 2, '#4a5860');

  for (let x = 0; x < W; x++) {
    if (x >= 68 && x <= 92) continue; // leave sun window
    const jag = 44 + ((x * 5) % 7) - ((x * 3) % 4);
    fill(ctx, x, jag, 1, 58 - jag, ridge);
    if (x % 5 === 0) set(ctx, x, jag, ridgeLit);
  }
  // Pillar rocks
  fill(ctx, 8, 40, 10, 22, ridge);
  fill(ctx, 10, 38, 6, 2, ridgeLit);
  fill(ctx, 142, 42, 12, 20, ridge);
  fill(ctx, 145, 40, 6, 2, ridgeLit);

  fill(ctx, 0, 58, W, H - 58, soil);
  fill(ctx, 16, 56, 128, 2, soilLit);
  fill(ctx, 36, 54, 88, 2, rock);
  fill(ctx, 10, 72, 16, 10, rock);
  fill(ctx, 12, 70, 12, 2, rockLit);
  fill(ctx, 128, 74, 18, 10, rock);
  fill(ctx, 132, 72, 12, 2, rockLit);
  for (let i = 0; i < 16; i++) {
    const gx = 10 + i * 9;
    set(ctx, gx, 62 + (i % 3), leafLit);
    set(ctx, gx, 63 + (i % 3), leaf);
  }
  for (const fx of [30, 48, 112, 130]) {
    fill(ctx, fx, 64, 1, 14, flagPole);
    fill(ctx, fx + 1, 64, 5, 3, flag);
    set(ctx, fx + 5, 65, '#a02820');
  }

  const breath = Math.round(Math.sin(t * 2.1));
  const antenna = Math.round(Math.sin(t * 3.2));
  const scythe = Math.round(Math.sin(t * 2.4 + 1));

  // Back row first, ant last (foreground).
  drawPixelBeetle(ctx, 8, 22 + breath, W, H);
  drawPixelMantis(ctx, 102, 14 - breath, scythe, W, H);
  drawPixelHeroAnt(ctx, 52, 28, antenna, W, H);

  // Leaf canopy frame
  for (let i = 0; i < 26; i++) {
    fill(ctx, i, 0, 1, 10 + (i % 6), leaf);
    fill(ctx, W - 1 - i, 0, 1, 9 + ((i + 2) % 6), leaf);
    if (i % 2 === 0) {
      set(ctx, i + 1, 8 + (i % 5), leafLit);
      set(ctx, W - 2 - i, 7 + (i % 5), leafLit);
    }
  }
  for (let i = 0; i < 12; i++) {
    fill(ctx, i * 4, H - 5, 5, 5, leaf);
    fill(ctx, W - 5 - i * 4, H - 6, 5, 6, leaf);
  }

  blitPixel(dest, c, cx - (W * scale) / 2, cy - (H * scale) / 2, scale);
}

/** Kabuto-style tank beetle — left of the trio. */
function drawPixelBeetle(ctx: Px, ox: number, oy: number, W: number, H: number): void {
  const shell = '#182428';
  const shellLit = '#3a5860';
  const shellHi = '#68a0a8';
  const horn = '#0c1418';
  const hornLit = '#4a6870';
  const leg = '#0e1618';
  const rim = '#e8c878';

  // Domed shell
  fill(ctx, ox + 4, oy + 22, 34, 26, shell);
  fill(ctx, ox + 8, oy + 18, 28, 4, shell);
  fill(ctx, ox + 12, oy + 16, 20, 2, shellLit);
  fill(ctx, ox + 6, oy + 24, 14, 12, shellLit);
  fill(ctx, ox + 10, oy + 28, 8, 6, shellHi);
  // Head plate
  fill(ctx, ox + 34, oy + 24, 14, 14, shell);
  fill(ctx, ox + 36, oy + 26, 8, 6, shellLit);
  fill(ctx, ox + 42, oy + 28, 3, 3, '#060a0c');
  setIf(ctx, ox + 43, oy + 29, '#c8e0e8', W, H);
  // Big Y-horn (장수풍뎅이 cue)
  fill(ctx, ox + 38, oy + 4, 4, 22, horn);
  fill(ctx, ox + 39, oy + 2, 2, 3, hornLit);
  fill(ctx, ox + 28, oy + 8, 12, 3, horn);
  fill(ctx, ox + 26, oy + 6, 4, 5, horn);
  fill(ctx, ox + 42, oy + 8, 12, 3, horn);
  fill(ctx, ox + 52, oy + 6, 4, 5, horn);
  setIf(ctx, ox + 40, oy + 6, rim, W, H);
  setIf(ctx, ox + 27, oy + 7, rim, W, H);
  setIf(ctx, ox + 54, oy + 7, rim, W, H);
  // Legs
  for (const [lx, ly] of [
    [6, 46],
    [3, 50],
    [1, 54],
    [16, 48],
    [13, 52],
    [10, 56],
    [28, 48],
    [30, 52],
    [32, 56],
  ] as [number, number][]) {
    setIf(ctx, ox + lx, oy + ly, leg, W, H);
    setIf(ctx, ox + lx + 1, oy + ly, leg, W, H);
  }
  setIf(ctx, ox + 8, oy + 20, rim, W, H);
  setIf(ctx, ox + 20, oy + 18, rim, W, H);
}

/** Forward red ant — center hero. */
function drawPixelHeroAnt(ctx: Px, ox: number, oy: number, antenna: number, W: number, H: number): void {
  const body = '#c85030';
  const bodyDeep = '#7a2818';
  const bodyLit = '#e87850';
  const eye = '#140c0c';
  const leg = '#4a1810';
  const rim = '#f0c878';

  // Abdomen (rear segment)
  fill(ctx, ox + 0, oy + 24, 20, 18, body);
  fill(ctx, ox + 2, oy + 22, 16, 2, body);
  fill(ctx, ox + 2, oy + 42, 16, 2, body);
  fill(ctx, ox + 4, oy + 26, 8, 8, bodyDeep);
  fill(ctx, ox + 8, oy + 28, 5, 4, bodyLit);
  // Mid / thorax
  fill(ctx, ox + 18, oy + 20, 16, 16, body);
  fill(ctx, ox + 20, oy + 18, 12, 2, body);
  fill(ctx, ox + 22, oy + 22, 8, 6, bodyLit);
  // Head
  fill(ctx, ox + 32, oy + 16, 16, 16, body);
  fill(ctx, ox + 34, oy + 14, 12, 2, body);
  fill(ctx, ox + 40, oy + 20, 6, 6, eye);
  fill(ctx, ox + 42, oy + 22, 2, 2, '#3a2020');
  // Mandibles
  fill(ctx, ox + 46, oy + 22, 4, 2, bodyDeep);
  fill(ctx, ox + 48, oy + 24, 3, 2, bodyDeep);
  fill(ctx, ox + 46, oy + 26, 4, 2, bodyDeep);
  // Antennae
  setIf(ctx, ox + 38, oy + 12, bodyDeep, W, H);
  setIf(ctx, ox + 40, oy + 8, bodyDeep, W, H);
  setIf(ctx, ox + 42 + antenna, oy + 4, bodyLit, W, H);
  setIf(ctx, ox + 36, oy + 12, bodyDeep, W, H);
  setIf(ctx, ox + 34, oy + 8, bodyDeep, W, H);
  setIf(ctx, ox + 32 - antenna, oy + 4, bodyLit, W, H);
  // Legs
  for (const [lx, ly] of [
    [4, 42],
    [2, 46],
    [0, 50],
    [12, 44],
    [10, 48],
    [8, 52],
    [24, 40],
    [26, 44],
    [28, 48],
    [30, 42],
    [32, 46],
    [34, 50],
  ] as [number, number][]) {
    setIf(ctx, ox + lx, oy + ly, leg, W, H);
    setIf(ctx, ox + lx + 1, oy + ly, leg, W, H);
  }
  setIf(ctx, ox + 10, oy + 24, rim, W, H);
  setIf(ctx, ox + 26, oy + 20, rim, W, H);
  setIf(ctx, ox + 38, oy + 16, rim, W, H);
}

/** Green mantis — right flank, scythes ready. */
function drawPixelMantis(ctx: Px, ox: number, oy: number, scythe: number, W: number, H: number): void {
  const body = '#48a040';
  const bodyDeep = '#246028';
  const bodyLit = '#78d060';
  const eye = '#d8f0b0';
  const leg = '#1e3c1c';
  const rim = '#e8d080';

  // Long abdomen
  fill(ctx, ox + 12, oy + 30, 12, 34, body);
  fill(ctx, ox + 14, oy + 32, 6, 26, bodyDeep);
  fill(ctx, ox + 16, oy + 36, 3, 10, bodyLit);
  // Thorax
  fill(ctx, ox + 8, oy + 18, 18, 14, body);
  fill(ctx, ox + 10, oy + 16, 14, 2, bodyLit);
  // Triangle head
  fill(ctx, ox + 10, oy + 4, 16, 14, body);
  fill(ctx, ox + 12, oy + 2, 12, 2, body);
  fill(ctx, ox + 14, oy + 0, 8, 2, bodyLit);
  fill(ctx, ox + 16, oy + 8, 6, 6, eye);
  fill(ctx, ox + 18, oy + 10, 2, 2, '#102010');
  setIf(ctx, ox + 14, oy + 1, bodyDeep, W, H);
  setIf(ctx, ox + 12, oy + 0, bodyLit, W, H);
  setIf(ctx, ox + 22, oy + 1, bodyDeep, W, H);
  setIf(ctx, ox + 24, oy + 0, bodyLit, W, H);
  // Scythe arms
  const s = scythe;
  fill(ctx, ox + 24, oy + 18 + s, 18, 4, bodyDeep);
  fill(ctx, ox + 38, oy + 10 + s, 4, 14, body);
  fill(ctx, ox + 26, oy + 22 + s, 12, 2, bodyLit);
  setIf(ctx, ox + 28, oy + 20 + s, '#142814', W, H);
  setIf(ctx, ox + 32, oy + 20 + s, '#142814', W, H);
  setIf(ctx, ox + 36, oy + 20 + s, '#142814', W, H);
  fill(ctx, ox - 6, oy + 20 - s, 16, 4, bodyDeep);
  fill(ctx, ox - 8, oy + 12 - s, 4, 14, body);
  setIf(ctx, ox - 4, oy + 18 - s, '#142814', W, H);
  setIf(ctx, ox, oy + 18 - s, '#142814', W, H);
  // Standing legs
  for (const [lx, ly] of [
    [10, 60],
    [8, 66],
    [6, 72],
    [22, 60],
    [24, 66],
    [26, 72],
  ] as [number, number][]) {
    setIf(ctx, ox + lx, oy + ly, leg, W, H);
    setIf(ctx, ox + lx + 1, oy + ly, leg, W, H);
  }
  setIf(ctx, ox + 12, oy + 6, rim, W, H);
  setIf(ctx, ox + 20, oy + 18, rim, W, H);
  setIf(ctx, ox + 40, oy + 12 + s, rim, W, H);
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
