import { COLS, LANE_LENGTH, ROWS } from '../sim/config';

export const W = 1280;
export const H = 720;

export const CELL_W = 80;
export const LANE_H = 84;
export const GRID_LEFT = 40;
export const GRID_TOP = 76;
export const CASTLE_W = 40;

export const LANES_BOTTOM = GRID_TOP + ROWS * LANE_H;

export const PANEL_TOP = LANES_BOTTOM + 12;
export const CARD_W = 80;
export const CARD_H = 100;
export const CARD_GAP = 8;
export const CARDS_TOP = PANEL_TOP + 8;
export const CARDS_LEFT = 24;

export const LOWER_TOP = CARDS_TOP + CARD_H + 10;

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
