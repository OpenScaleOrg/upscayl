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

/**
 * Resize the rect from a given handle by (dx, dy) fractions. When `fracRatio`
 * is given the result keeps that width/height ratio (see `pixelRatioToFraction`).
 */
export function resizeCropRect(
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  min = 0.02,
  fracRatio?: number,
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
  if (!fracRatio || fracRatio <= 0) return { x, y, w, h };

  // A ratio-locked drag follows the edge being dragged and keeps the opposite
  // edge pinned, the way an aspect-locked crop behaves in an image editor.
  const bottom = y + h;
  const right = x + w;
  const r = constrainCropRatio(
    { x, y, w, h },
    fracRatio,
    handle === "n" || handle === "s" ? "h" : "w",
  );
  if (handle.includes("n")) r.y = Math.max(0, Math.min(1 - r.h, bottom - r.h));
  if (handle.includes("w")) r.x = Math.max(0, Math.min(1 - r.w, right - r.w));
  return r;
}

/**
 * Force `rect` to a width/height ratio expressed in *fraction* space, keeping
 * either its width or its height, and shrink/shift it to stay inside [0,1].
 */
export function constrainCropRatio(
  rect: CropRect,
  fracRatio: number,
  keep: "w" | "h" = "w",
): CropRect {
  let { x, y, w, h } = rect;
  if (keep === "w") h = w / fracRatio;
  else w = h * fracRatio;
  if (w > 1 || h > 1) {
    const k = Math.min(1 / w, 1 / h);
    w *= k;
    h *= k;
  }
  return {
    w,
    h,
    x: Math.max(0, Math.min(1 - w, x)),
    y: Math.max(0, Math.min(1 - h, y)),
  };
}

/**
 * A pixel aspect ratio (w/h) expressed in the fraction space of a crop rect —
 * the two only agree on a square image.
 */
export const pixelRatioToFraction = (
  ratio: number,
  naturalW: number,
  naturalH: number,
) => (ratio * naturalH) / naturalW;

/** Resize the rect to an exact pixel size, anchored at its top-left corner. */
export function setCropSizePx(
  rect: CropRect,
  naturalW: number,
  naturalH: number,
  wPx: number,
  hPx: number,
): CropRect {
  const w = Math.min(1, Math.max(1 / naturalW, wPx / naturalW));
  const h = Math.min(1, Math.max(1 / naturalH, hPx / naturalH));
  return { w, h, x: Math.min(rect.x, 1 - w), y: Math.min(rect.y, 1 - h) };
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
