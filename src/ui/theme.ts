/**
 * Underleaf War visual language: soil and leaf greens, amber sap, bioluminescent gas.
 * Procedural insect silhouettes and nest-like modules — readable at lane scale without spritesheets.
 */
import type { Family } from '../sim/data/units';
import type { ModuleDef } from '../sim/data/modules';

/** Pixel fonts — always draw at integer sizes/positions to avoid the “깨진” look. */
export const FONT_UI = `'Galmuri14', 'Galmuri11', monospace`;
export const FONT_DISPLAY = `'Press Start 2P', 'Galmuri14', monospace`;
export const FONT_KO_DISPLAY = `'Galmuri16', 'Galmuri14', monospace`;

export const C = {
  bgDeep: '#0c1410',
  bg: '#121a14',
  bgLift: '#1a261c',
  panel: '#152018',
  panelLift: '#1e2c22',
  panelLine: '#2f4536',
  text: '#e6f0e4',
  dim: '#8aa090',
  mute: '#5a6e60',
  /** Sap — minerals. */
  mineral: '#e8b84a',
  mineralDim: '#a07828',
  /** Bioluminescence — gas. */
  gas: '#5de0c0',
  gasDim: '#2a8a74',
  player: '#7ecf6a',
  playerDeep: '#3a7a38',
  enemy: '#e0705c',
  enemyDeep: '#8a3028',
  resource: '#d4a84a',
  defense: '#6a9ec8',
  barracks: '#d4884a',
  fog: 'rgba(6,12,8,0.82)',
  leafLight: '#243828',
  leafDark: '#1a281c',
  soilLight: '#2a2418',
  soilDark: '#1e1a12',
  midLight: '#262018',
  midDark: '#1c1812',
  enemySoil: '#2c1c18',
  enemySoilDark: '#221410',
  amberGlow: 'rgba(232,184,74,0.35)',
  mintGlow: 'rgba(93,224,192,0.28)',
};

export const KIND_COLOR: Record<ModuleDef['kind'], string> = {
  resource: C.resource,
  defense: C.defense,
  barracks: C.barracks,
};

export function fillBg(ctx: CanvasRenderingContext2D, w: number, h: number, t = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a1612');
  g.addColorStop(0.45, C.bg);
  g.addColorStop(1, '#0e120c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft canopy vignette.
  const vg = ctx.createRadialGradient(w * 0.5, h * 0.15, 40, w * 0.5, h * 0.4, w * 0.7);
  vg.addColorStop(0, 'rgba(40,70,48,0.22)');
  vg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Floating pollen / spore motes.
  ctx.save();
  for (let i = 0; i < 36; i++) {
    const seed = i * 97.3;
    const x = ((seed * 13 + t * (8 + (i % 5))) % (w + 40)) - 20;
    const y = (seed * 7.1 + Math.sin(t * 0.4 + i) * 18) % h;
    const a = 0.08 + (i % 4) * 0.04;
    ctx.fillStyle = i % 3 === 0 ? `rgba(232,184,74,${a})` : `rgba(160,200,160,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color = C.text,
  align: CanvasTextAlign = 'left',
  _weight: string | number = 400,
  font: string = FONT_UI,
): void {
  // Pixel fonts hate fractional CSS sizes and subpixel positions — both look “깨진”.
  const px = Math.max(11, Math.round(size));
  ctx.imageSmoothingEnabled = false;
  ctx.font = `${px}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, Math.round(x), Math.round(y));
}

export function glowCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Walking bob for living units. */
export function unitBob(t: number, id: number): number {
  return Math.sin(t * 10 + id * 1.7) * 1.6;
}

/**
 * Draw a readable insect silhouette. Facing +1 = right (player), -1 = left (enemy).
 * Colors: fill is the team color; a darker outline is derived.
 */
export function drawInsect(
  ctx: CanvasRenderingContext2D,
  family: Family,
  tier: 1 | 2 | 3,
  x: number,
  y: number,
  facing: 1 | -1,
  fill: string,
  t: number,
  id: number,
): void {
  const scale = tier === 1 ? 1.15 : tier === 2 ? 1.4 : 1.65;
  const bob = unitBob(t, id);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(facing * scale, scale);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 1.6;
  ctx.fillStyle = fill;
  // Soft halo so team color reads at a glance even when silhouettes overlap.
  glowCircle(ctx, 0, 0, 14, fill.length === 7 ? fill + '55' : 'rgba(255,255,255,0.15)');

  if (family === 'ant') {
    // Three body segments + antennae + thin legs.
    ctx.beginPath();
    ctx.ellipse(-7, 0, 4.2, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 0, 5.2, 3.8, 0, 0, Math.PI * 2);
    ctx.ellipse(7.5, -0.4, 3.6, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Antennae
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.quadraticCurveTo(14, -8, 16, -10);
    ctx.moveTo(10, -1);
    ctx.quadraticCurveTo(13, -5, 15, -6);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    for (const [ox, ly] of [[-4, 3], [0, 4], [4, 3]] as [number, number][]) {
      const swing = Math.sin(t * 12 + id + ox) * 1.5;
      ctx.moveTo(ox, ly);
      ctx.lineTo(ox - 2 + swing, ly + 5);
      ctx.moveTo(ox, ly);
      ctx.lineTo(ox + 2 - swing, ly + 5);
    }
    ctx.stroke();
    if (tier >= 3) {
      // Acid ant: small glow orb
      glowCircle(ctx, 9, -4, 6, C.mintGlow);
    }
  } else if (family === 'beetle') {
    // Domed shell, short head, stubby legs. Horn grows with tier; T3 adds jaws.
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Shell split
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    // Head
    ctx.beginPath();
    ctx.ellipse(8, 0, 3.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (tier >= 1) {
      // Small horn (코뿔소 T1) → larger horn (장수 T2)
      const tip = tier >= 2 ? 16 : 13;
      const lift = tier >= 2 ? -6 : -4;
      ctx.beginPath();
      ctx.moveTo(10, -1);
      ctx.lineTo(tip, lift);
      ctx.lineTo(11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Mantis: elongated abdomen, triangular head, scythe forelegs.
    ctx.beginPath();
    ctx.ellipse(-2, 1, 7, 3.2, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Thorax
    ctx.beginPath();
    ctx.ellipse(5, -1, 3.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Head triangle
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(13, -5);
    ctx.lineTo(12, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Scythes
    const raise = 0.15 + Math.sin(t * 8 + id) * 0.08;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.quadraticCurveTo(10, -6 - raise * 10, 4, -10 - raise * 4);
    ctx.moveTo(6, 1);
    ctx.quadraticCurveTo(11, 5, 8, 9);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/** Nest / structure glyph inside a module cell. */
export function drawModuleGlyph(
  ctx: CanvasRenderingContext2D,
  kind: ModuleDef['kind'],
  defId: string,
  cx: number,
  cy: number,
  color: string,
  level = 1,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;

  if (kind === 'resource') {
    // Aphid mound or honey pot.
    if (defId.includes('honey')) {
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.quadraticCurveTo(-12, -4, 0, -12);
      ctx.quadraticCurveTo(12, -4, 10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(-3, -2, 3, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -2, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Tiny aphids
      for (const [ax, ay] of [[-5, -4], [3, -6], [6, -2]] as [number, number][]) {
        ctx.beginPath();
        ctx.arc(ax, ay, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30,40,20,0.55)';
        ctx.fill();
      }
    }
  } else if (kind === 'defense') {
    if (defId === 'thorn_wall') {
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(i * 5, 8);
        ctx.lineTo(i * 5 + 2, -10);
        ctx.lineTo(i * 5 + 4, 8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (defId === 'sticky_dew') {
      ctx.beginPath();
      ctx.ellipse(0, 4, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(0, 2, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (defId === 'wind_gust') {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0.2, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6, -0.4, Math.PI * 1.2);
      ctx.stroke();
      glowCircle(ctx, 0, 0, 12, 'rgba(160,200,220,0.3)');
    } else {
      ctx.beginPath();
      ctx.arc(0, -2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Barracks: nest mound with entrance + tier notches
    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -2, 11, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < level; i++) {
      ctx.fillStyle = C.mineral;
      ctx.fillRect(-8 + i * 7, -12, 5, 3);
    }
  }
  ctx.restore();
}

export function drawCastleFace(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, side: 0 | 1, t: number): void {
  const deep = side === 0 ? '#243820' : '#3a221c';
  const mid = side === 0 ? '#2f4a2c' : '#4a2c26';
  const edge = side === 0 ? C.player : C.enemy;
  const g = ctx.createLinearGradient(x, y, x + w, y);
  if (side === 0) {
    g.addColorStop(0, deep);
    g.addColorStop(1, mid);
  } else {
    g.addColorStop(0, mid);
    g.addColorStop(1, deep);
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Bark / chitin ridges
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const yy = y + (h * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x + 4, yy);
    ctx.lineTo(x + w - 4, yy + Math.sin(t * 0.5 + i) * 2);
    ctx.stroke();
  }

  ctx.fillStyle = edge;
  if (side === 0) ctx.fillRect(x + w - 4, y, 4, h);
  else ctx.fillRect(x, y, 4, h);

  // Soft glow along the face
  glowCircle(ctx, side === 0 ? x + w : x, y + h * 0.5, 28, side === 0 ? 'rgba(126,207,106,0.15)' : 'rgba(224,112,92,0.15)');
}

/** Brand mark: stylized ant over a mound, used on menu and favicon spirit. */
export function drawBrandMark(ctx: CanvasRenderingContext2D, x: number, y: number, s = 1, t = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  glowCircle(ctx, 0, 4, 48, C.amberGlow);
  ctx.fillStyle = C.mineral;
  ctx.beginPath();
  ctx.ellipse(0, 14, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  drawInsect(ctx, 'ant', 2, 0, 0, 1, C.mineral, t, 1);
  ctx.restore();
}
