import { describe, it, expect } from "vitest";
import {
  applyAdjustments,
  hasAdjustments,
  ZERO_ADJUSTMENTS,
} from "@/lib/adjustments";

const px = (r: number, g: number, b: number) =>
  new Uint8ClampedArray([r, g, b, 255]);

describe("hasAdjustments", () => {
  it("is false for the zero object", () => {
    expect(hasAdjustments(ZERO_ADJUSTMENTS)).toBe(false);
  });
  it("is true when any field is non-zero", () => {
    expect(hasAdjustments({ ...ZERO_ADJUSTMENTS, contrast: 5 })).toBe(true);
  });
});

describe("applyAdjustments", () => {
  it("leaves pixels unchanged with zero adjustments", () => {
    const d = px(100, 150, 200);
    applyAdjustments(d, ZERO_ADJUSTMENTS);
    expect([d[0], d[1], d[2]]).toEqual([100, 150, 200]);
  });

  it("exposure brightens", () => {
    const d = px(100, 100, 100);
    applyAdjustments(d, { ...ZERO_ADJUSTMENTS, exposure: 50 });
    expect(d[0]).toBeGreaterThan(100);
  });

  it("negative exposure darkens", () => {
    const d = px(100, 100, 100);
    applyAdjustments(d, { ...ZERO_ADJUSTMENTS, exposure: -50 });
    expect(d[0]).toBeLessThan(100);
  });

  it("contrast pushes darks down and lights up", () => {
    const dark = px(60, 60, 60);
    const light = px(200, 200, 200);
    applyAdjustments(dark, { ...ZERO_ADJUSTMENTS, contrast: 50 });
    applyAdjustments(light, { ...ZERO_ADJUSTMENTS, contrast: 50 });
    expect(dark[0]).toBeLessThan(60);
    expect(light[0]).toBeGreaterThan(200);
  });

  it("full desaturation makes channels equal (grayscale)", () => {
    const d = px(200, 100, 50);
    applyAdjustments(d, { ...ZERO_ADJUSTMENTS, saturation: -100 });
    expect(d[0]).toBe(d[1]);
    expect(d[1]).toBe(d[2]);
  });

  it("clamps to the 0..255 range", () => {
    const d = px(250, 250, 250);
    applyAdjustments(d, { ...ZERO_ADJUSTMENTS, exposure: 100 });
    expect(d[0]).toBe(255);
    const d2 = px(5, 5, 5);
    applyAdjustments(d2, { ...ZERO_ADJUSTMENTS, exposure: -100 });
    expect(d2[0]).toBe(0);
  });

  it("preserves the alpha channel", () => {
    const d = px(100, 100, 100);
    applyAdjustments(d, { ...ZERO_ADJUSTMENTS, exposure: 50, contrast: 20 });
    expect(d[3]).toBe(255);
  });
});
