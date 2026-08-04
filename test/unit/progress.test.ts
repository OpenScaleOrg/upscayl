import { describe, it, expect } from "vitest";
import { extractProgressPercent } from "@/lib/progress";

describe("extractProgressPercent", () => {
  it("parses a clean percentage", () => {
    expect(extractProgressPercent("42.00%")).toBe("42.00%");
  });

  it("strips trailing newline/whitespace (the real bug)", () => {
    expect(extractProgressPercent("42.00%\n")).toBe("42.00%");
    expect(extractProgressPercent("  42.00%  ")).toBe("42.00%");
  });

  it("returns the last value in a multi-line chunk", () => {
    expect(extractProgressPercent("10.00%\n20.00%\n30.50%\n")).toBe("30.50%");
  });

  it("handles carriage-return overwrites", () => {
    expect(extractProgressPercent("12.00%\r13.00%")).toBe("13.00%");
  });

  it("parses integers without a decimal", () => {
    expect(extractProgressPercent("100%")).toBe("100%");
  });

  it("returns null when there is no percentage", () => {
    expect(extractProgressPercent("Resizing image")).toBeNull();
    expect(extractProgressPercent("")).toBeNull();
  });
});
