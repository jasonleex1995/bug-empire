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

function set(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function fill(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** 32×28 pixel ant emblem (amber on transparent). */
export function drawPixelAntLogo(dest: CanvasRenderingContext2D, cx: number, cy: number, scale = 3): void {
  const c = makePixelCanvas(32, 28);
  const ctx = pxCtx(c);
  const A = '#e8b84a';
  const D = '#a07828';
  const S = '#f5d78a';

  // abdomen
  fill(ctx, 4, 14, 10, 8, A);
  fill(ctx, 5, 13, 8, 1, A);
  fill(ctx, 5, 22, 8, 1, A);
  fill(ctx, 6, 15, 3, 2, D);
  // thorax
  fill(ctx, 13, 13, 8, 8, A);
  fill(ctx, 14, 12, 6, 1, A);
  fill(ctx, 15, 15, 3, 2, S);
  // head
  fill(ctx, 20, 12, 7, 7, A);
  fill(ctx, 21, 11, 5, 1, A);
  fill(ctx, 24, 14, 2, 2, D); // eye
  // mandibles
  set(ctx, 27, 15, A);
  set(ctx, 28, 16, A);
  set(ctx, 27, 17, A);
  set(ctx, 28, 18, A);
  // antennae
  set(ctx, 24, 10, A);
  set(ctx, 25, 8, A);
  set(ctx, 26, 6, A);
  set(ctx, 27, 5, S);
  set(ctx, 23, 10, A);
  set(ctx, 22, 8, A);
  set(ctx, 21, 7, S);
  // legs
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
    [16, 21],
    [15, 23],
    [14, 25],
  ] as [number, number][]) {
    set(ctx, x, y, D);
  }
  // glow plate under feet
  fill(ctx, 6, 26, 16, 1, '#5a4018');

  blitPixel(dest, c, cx - (32 * scale) / 2, cy - (28 * scale) / 2, scale);
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
        if (g[row][col] === '1') set(ctx, x + col, row, color);
      }
    }
    x += letterW + gap;
  }
  // soft shadow pass
  dest.save();
  dest.globalAlpha = 0.35;
  blitPixel(dest, c, cx - (bufW * scale) / 2 + scale, cy - (bufH * scale) / 2 + scale, scale);
  dest.globalAlpha = 1;
  blitPixel(dest, c, cx - (bufW * scale) / 2, cy - (bufH * scale) / 2, scale);
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
