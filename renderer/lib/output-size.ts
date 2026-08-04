// Pure helper: projected upscaled output dimensions. Shared by the Inspector,
// StatusBar and anywhere else that shows "source → output".

export type Size = { width: number; height: number };

export function outputDimensions(
  width: number | null,
  height: number | null,
  scale: number | string,
  useCustomWidth = false,
  customWidth = 0,
): Size {
  if (!width || !height) return { width: 0, height: 0 };
  if (useCustomWidth && customWidth > 0) {
    return {
      width: customWidth,
      height: Math.round(customWidth * (height / width)),
    };
  }
  const s = typeof scale === "string" ? parseInt(scale, 10) : scale;
  const factor = Number.isFinite(s) && s > 0 ? s : 1;
  return { width: width * factor, height: height * factor };
}

/** Rough uncompressed-ish size estimate in MB for a WxH RGB image. */
export function estimateSizeMB(width: number, height: number): number {
  if (!width || !height) return 0;
  return (width * height * 3) / (1024 * 1024);
}
