import { COLS, LANE_LENGTH, ROWS } from '../sim/config';

export const W = 1280;
export const H = 720;

/**
 * PvZ-style chrome: slim status + seed rail on top.
 * Grid cells are square (CELL_W === LANE_H) so the lawn reads like a board, not stretched tiles.
 */
export const TOP_BAR_H = 36;
export const SEED_H = 86;
/**
 * Square cells — width and lane height must match.
 * COLS=7 ⇒ LANE_LENGTH=17; 72px keeps the board inside 1280 with GRID_LEFT.
 */
export const CELL_W = 72;
export const LANE_H = 72;
export const GRID_LEFT = 40;
export const GRID_TOP = TOP_BAR_H + SEED_H;
export const CASTLE_W = 40;

export const LANES_BOTTOM = GRID_TOP + ROWS * LANE_H;

/** No permanent bottom HUD; leftover frame is soil atmosphere under the lawn. */
export const PANEL_TOP = H;

export const CARD_W = 72;
export const CARD_H = 78;
export const CARD_GAP = 4;
/** Extra gap between card families (resource / defense / barracks / ability). */
export const CARD_GROUP_GAP = 10;
export const CARDS_TOP = TOP_BAR_H + 4;
export const CARDS_LEFT = 12;

/** Floating action bar when a placed module is selected (not always-on). */
export const CONTEXT_H = 52;
export const CONTEXT_LEFT = 24;
export const CONTEXT_W = W - 48;
export const CONTEXT_TOP = Math.min(LANES_BOTTOM + 12, H - CONTEXT_H - 10);

/** Mineral counter anchor — sap droplets fly here (PvZ sun tray energy). */
export const MINERAL_HUD_X = 52;
export const MINERAL_HUD_Y = 18;

export function laneToPx(x: number): number {
  return GRID_LEFT + x * CELL_W;
}

export function pxToLane(px: number): number {
  return (px - GRID_LEFT) / CELL_W;
}

export function rowTop(row: number): number {
  return GRID_TOP + row * LANE_H;
}

export function rowCenter(row: number): number {
  return rowTop(row) + LANE_H / 2;
}

export function pxToRow(py: number): number | null {
  if (py < GRID_TOP || py >= LANES_BOTTOM) return null;
  return Math.floor((py - GRID_TOP) / LANE_H);
}

/** Own-grid cell under a pixel, or null. */
export function pxToOwnCell(px: number, py: number): { row: number; col: number } | null {
  const row = pxToRow(py);
  if (row === null) return null;
  const x = pxToLane(px);
  if (x < 0 || x >= COLS) return null;
  return { row, col: Math.floor(x) };
}

export function isInLaneArea(px: number, py: number): boolean {
  return py >= GRID_TOP && py < LANES_BOTTOM && px >= laneToPx(0) && px < laneToPx(LANE_LENGTH);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function inRect(r: Rect, px: number, py: number): boolean {
  return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
}
