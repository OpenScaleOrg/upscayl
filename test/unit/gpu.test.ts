import { describe, it, expect } from "vitest";
import { scoreGpu, pickBestGpu } from "@/lib/gpu";

describe("scoreGpu", () => {
  it("ranks NVIDIA discrete highest", () => {
    expect(scoreGpu("NVIDIA GeForce RTX 3060 Laptop GPU")).toBe(100);
  });
  it("ranks integrated AMD APU graphics low", () => {
    expect(scoreGpu("AMD Radeon(TM) Graphics")).toBe(30);
  });
  it("ranks discrete AMD above integrated", () => {
    expect(scoreGpu("AMD Radeon RX 6800")).toBe(80);
    expect(scoreGpu("AMD Radeon RX 6800")).toBeGreaterThan(
      scoreGpu("AMD Radeon(TM) Graphics"),
    );
  });
  it("ranks Intel integrated low", () => {
    expect(scoreGpu("Intel(R) UHD Graphics")).toBe(10);
  });
});

describe("pickBestGpu", () => {
  it("returns null for an empty list", () => {
    expect(pickBestGpu([])).toBeNull();
  });
  it("picks the NVIDIA GPU over the integrated one (the real case)", () => {
    const gpus = [
      { index: 0, name: "AMD Radeon(TM) Graphics" },
      { index: 1, name: "NVIDIA GeForce RTX 3060 Laptop GPU" },
    ];
    expect(pickBestGpu(gpus)).toBe(1);
  });
  it("falls back to the only GPU when there is one", () => {
    expect(pickBestGpu([{ index: 0, name: "AMD Radeon(TM) Graphics" }])).toBe(
      0,
    );
  });
  it("prefers the lower index on a score tie", () => {
    const gpus = [
      { index: 0, name: "NVIDIA GeForce RTX 4090" },
      { index: 1, name: "NVIDIA GeForce RTX 4080" },
    ];
    expect(pickBestGpu(gpus)).toBe(0);
  });
});
