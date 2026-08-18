import { describe, it, expect } from "vitest";
import { splitGrid, tileFileName } from "@/lib/split";

describe("splitGrid", () => {
  it("returns cols × rows tiles in reading order", () => {
    const tiles = splitGrid(100, 100, 3, 2);
    expect(tiles).toHaveLength(6);
    expect(tiles[0]).toMatchObject({ row: 0, col: 0 });
    expect(tiles[3]).toMatchObject({ row: 1, col: 0 });
  });

  it("covers the whole image when the size does not divide evenly", () => {
    const tiles = splitGrid(1001, 999, 3, 7);
    const area = tiles.reduce((sum, t) => sum + t.sw * t.sh, 0);
    expect(area).toBe(1001 * 999);
    const last = tiles[tiles.length - 1];
    expect(last.sx + last.sw).toBe(1001);
    expect(last.sy + last.sh).toBe(999);
  });

  it("never produces an empty tile", () => {
    for (const t of splitGrid(7, 3, 50, 50)) {
      expect(t.sw).toBeGreaterThan(0);
      expect(t.sh).toBeGreaterThan(0);
    }
  });

  it("clamps nonsense grids to at least one tile", () => {
    expect(splitGrid(10, 10, 0, -3)).toHaveLength(1);
  });
});

describe("tileFileName", () => {
  it("uses 1-based row/column and a png extension", () => {
    const tile = { col: 2, row: 0, sx: 0, sy: 0, sw: 1, sh: 1 };
    expect(tileFileName("photo.jpeg", tile)).toBe("photo_r1c3.png");
  });
});
