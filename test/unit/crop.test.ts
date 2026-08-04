import { describe, it, expect } from "vitest";
import {
  moveCropRect,
  resizeCropRect,
  cropRectToPixels,
  type CropRect,
} from "@/lib/crop";

const base: CropRect = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

describe("moveCropRect", () => {
  it("translates within bounds", () => {
    const r = moveCropRect(base, 0.1, -0.1);
    expect(r.x).toBeCloseTo(0.3);
    expect(r.y).toBeCloseTo(0.1);
    expect(r.w).toBe(0.4);
    expect(r.h).toBe(0.4);
  });

  it("clamps to the left/top edge", () => {
    const r = moveCropRect(base, -1, -1);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("clamps to the right/bottom edge (x + w <= 1)", () => {
    const r = moveCropRect(base, 1, 1);
    expect(r.x).toBeCloseTo(0.6); // 1 - w
    expect(r.y).toBeCloseTo(0.6);
    expect(r.x + r.w).toBeLessThanOrEqual(1);
  });

  it("never changes size", () => {
    const r = moveCropRect(base, 0.5, 0.5);
    expect(r.w).toBe(base.w);
    expect(r.h).toBe(base.h);
  });
});

describe("resizeCropRect", () => {
  it("east handle grows width only", () => {
    const r = resizeCropRect(base, "e", 0.2, 0);
    expect(r.w).toBeCloseTo(0.6);
    expect(r.x).toBe(base.x);
    expect(r.h).toBe(base.h);
  });

  it("west handle moves x and adjusts width", () => {
    const r = resizeCropRect(base, "w", -0.1, 0);
    expect(r.x).toBeCloseTo(0.1);
    expect(r.w).toBeCloseTo(0.5);
  });

  it("corner handle resizes both axes", () => {
    const r = resizeCropRect(base, "se", 0.1, 0.1);
    expect(r.w).toBeCloseTo(0.5);
    expect(r.h).toBeCloseTo(0.5);
  });

  it("enforces a minimum size", () => {
    const r = resizeCropRect(base, "e", -1, 0, 0.05);
    expect(r.w).toBeGreaterThanOrEqual(0.05);
  });

  it("keeps the rect inside [0,1]", () => {
    const r = resizeCropRect(base, "se", 2, 2);
    expect(r.x + r.w).toBeLessThanOrEqual(1.0001);
    expect(r.y + r.h).toBeLessThanOrEqual(1.0001);
  });
});

describe("cropRectToPixels", () => {
  it("maps fractions to integer pixels", () => {
    expect(cropRectToPixels(base, 1920, 1080)).toEqual({
      sx: 384,
      sy: 216,
      sw: 768,
      sh: 432,
    });
  });

  it("never returns a zero-size crop", () => {
    const tiny = cropRectToPixels({ x: 0, y: 0, w: 0.0001, h: 0.0001 }, 10, 10);
    expect(tiny.sw).toBeGreaterThanOrEqual(1);
    expect(tiny.sh).toBeGreaterThanOrEqual(1);
  });
});
