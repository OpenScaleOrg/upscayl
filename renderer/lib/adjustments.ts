// Client-side, non-destructive image adjustments applied per-pixel. Used both
// for the live canvas preview and for baking a new source image before upscale.
export type Adjustments = {
  exposure: number; // -100..100  (brightness)
  contrast: number; // -100..100
  saturation: number; // -100..100
  highlights: number; // -100..100 (bright tones)
  shadows: number; // -100..100 (dark tones)
  clarity: number; // -100..100 (midtone local contrast, approximated)
};

export const ZERO_ADJUSTMENTS: Adjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  highlights: 0,
  shadows: 0,
  clarity: 0,
};

export function hasAdjustments(a: Adjustments): boolean {
  return (
    a.exposure !== 0 ||
    a.contrast !== 0 ||
    a.saturation !== 0 ||
    a.highlights !== 0 ||
    a.shadows !== 0 ||
    a.clarity !== 0
  );
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const LUM_R = 0.2126;
const LUM_G = 0.7152;
const LUM_B = 0.0722;

/** Mutates an RGBA pixel buffer in place. */
export function applyAdjustments(
  d: Uint8ClampedArray,
  a: Adjustments,
): Uint8ClampedArray {
  const exp = 1 + a.exposure / 100; // brightness multiplier
  const con = 1 + a.contrast / 100; // contrast factor around 128
  const sat = 1 + a.saturation / 100; // saturation factor
  const hi = a.highlights / 100;
  const sh = a.shadows / 100;
  const cl = a.clarity / 100;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * exp;
    let g = d[i + 1] * exp;
    let b = d[i + 2] * exp;

    // contrast
    r = (r - 128) * con + 128;
    g = (g - 128) * con + 128;
    b = (b - 128) * con + 128;

    // saturation (toward luminance)
    let lum = LUM_R * r + LUM_G * g + LUM_B * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;

    if (hi !== 0 || sh !== 0 || cl !== 0) {
      lum = LUM_R * r + LUM_G * g + LUM_B * b;
      if (hi !== 0) {
        const w = lum > 128 ? (lum - 128) / 127 : 0;
        const v = hi * 64 * w;
        r += v;
        g += v;
        b += v;
      }
      if (sh !== 0) {
        const w = lum < 128 ? (128 - lum) / 128 : 0;
        const v = sh * 64 * w;
        r += v;
        g += v;
        b += v;
      }
      if (cl !== 0) {
        const w = 1 - Math.abs(lum - 128) / 128; // strongest in midtones
        const f = 1 + cl * w * 0.8;
        r = (r - 128) * f + 128;
        g = (g - 128) * f + 128;
        b = (b - 128) * f + 128;
      }
    }

    d[i] = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
  return d;
}
