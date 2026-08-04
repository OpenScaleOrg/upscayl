import { describe, it, expect } from "vitest";
import { outputDimensions, estimateSizeMB } from "@/lib/output-size";

describe("outputDimensions", () => {
  it("multiplies by a numeric scale", () => {
    expect(outputDimensions(1920, 1080, 4)).toEqual({
      width: 7680,
      height: 4320,
    });
  });

  it("accepts a string scale", () => {
    expect(outputDimensions(100, 50, "2")).toEqual({ width: 200, height: 100 });
  });

  it("returns 0×0 when source dimensions are missing", () => {
    expect(outputDimensions(null, null, 4)).toEqual({ width: 0, height: 0 });
    expect(outputDimensions(1920, null, 4)).toEqual({ width: 0, height: 0 });
  });

  it("uses custom width and preserves aspect ratio", () => {
    expect(outputDimensions(1920, 1080, 4, true, 3840)).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it("ignores custom width when it is 0", () => {
    expect(outputDimensions(1920, 1080, 2, true, 0)).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it("falls back to factor 1 for an invalid scale", () => {
    expect(outputDimensions(100, 100, "abc")).toEqual({
      width: 100,
      height: 100,
    });
  });
});

describe("estimateSizeMB", () => {
  it("estimates ~3 bytes per pixel in MB", () => {
    expect(estimateSizeMB(1024, 1024)).toBeCloseTo(3, 5);
  });

  it("returns 0 for empty dimensions", () => {
    expect(estimateSizeMB(0, 0)).toBe(0);
  });
});
