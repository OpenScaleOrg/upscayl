// Pure grid geometry for the Split tool (columns × rows of an image).
// Kept dependency-free so it is trivially unit-testable.

export type SplitTile = {
  col: number;
  row: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Cut points for `n` slices of `total` pixels — rounded, so slices tile exactly. */
const edges = (total: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => Math.round((total * i) / n));

/**
 * Divide a `naturalW × naturalH` image into `cols × rows` tiles, in reading
 * order. Remainder pixels are absorbed by the rounding of the cut points, so
 * the tiles cover the image exactly — no dropped edge row/column.
 */
export function splitGrid(
  naturalW: number,
  naturalH: number,
  cols: number,
  rows: number,
): SplitTile[] {
  const c = Math.max(1, Math.min(Math.floor(cols) || 1, naturalW));
  const r = Math.max(1, Math.min(Math.floor(rows) || 1, naturalH));
  const xs = edges(naturalW, c);
  const ys = edges(naturalH, r);
  const tiles: SplitTile[] = [];
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      tiles.push({
        col,
        row,
        sx: xs[col],
        sy: ys[row],
        sw: xs[col + 1] - xs[col],
        sh: ys[row + 1] - ys[row],
      });
    }
  }
  return tiles;
}

/** `photo.jpg` + tile (0,1) → `photo_r2c1.png` (1-based, row first). */
export function tileFileName(fileName: string, tile: SplitTile): string {
  const base = fileName.replace(/\.[^.]+$/, "") || "image";
  return `${base}_r${tile.row + 1}c${tile.col + 1}.png`;
}
