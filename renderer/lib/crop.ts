// Pure crop-rectangle geometry (fractions of the source image, 0..1).
// Kept dependency-free so it is trivially unit-testable.

export type CropRect = { x: number; y: number; w: number; h: number };
export type CropHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Move the whole rect by (dx, dy) fractions, keeping it inside [0,1]. */
export function moveCropRect(rect: CropRect, dx: number, dy: number): CropRect {
  return {
    w: rect.w,
    h: rect.h,
    x: Math.max(0, Math.min(1 - rect.w, rect.x + dx)),
    y: Math.max(0, Math.min(1 - rect.h, rect.y + dy)),
  };
}

/** Resize the rect from a given handle by (dx, dy) fractions. */
export function resizeCropRect(
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  min = 0.02,
): CropRect {
  let { x, y, w, h } = rect;
  if (handle.includes("w")) {
    const nx = clamp01(x + dx);
    w = w + (x - nx);
    x = nx;
  }
  if (handle.includes("n")) {
    const ny = clamp01(y + dy);
    h = h + (y - ny);
    y = ny;
  }
  if (handle.includes("e")) w = clamp01(w + dx);
  if (handle.includes("s")) h = clamp01(h + dy);
  w = Math.max(min, Math.min(1 - x, w));
  h = Math.max(min, Math.min(1 - y, h));
  return { x, y, w, h };
}

/** Convert a fractional crop rect to integer source-pixel coordinates. */
export function cropRectToPixels(
  rect: CropRect,
  naturalW: number,
  naturalH: number,
) {
  return {
    sx: Math.round(rect.x * naturalW),
    sy: Math.round(rect.y * naturalH),
    sw: Math.max(1, Math.round(rect.w * naturalW)),
    sh: Math.max(1, Math.round(rect.h * naturalH)),
  };
}
