export type Gpu = { index: number; name: string };

// Higher is better. Prefer discrete NVIDIA, then discrete AMD/Intel Arc, then
// generic; integrated graphics score lowest so we avoid defaulting to them.
export function scoreGpu(name: string): number {
  const n = name.toLowerCase();
  if (/nvidia|geforce|\brtx\b|\bgtx\b|quadro|tesla/.test(n)) return 100;
  if (/radeon (rx|pro)|\barc\b/.test(n)) return 80;
  if (/uhd|iris|\bhd graphics\b|\bintel\b/.test(n)) return 10;
  if (/radeon|vega/.test(n)) return 30; // usually an integrated APU
  return 50;
}

/** Index of the best GPU to use by default, or null if none. */
export function pickBestGpu(gpus: Gpu[]): number | null {
  if (!gpus.length) return null;
  let best = gpus[0];
  let bestScore = -1;
  for (const g of gpus) {
    const sc = scoreGpu(g.name);
    if (sc > bestScore) {
      bestScore = sc;
      best = g;
    }
  }
  return best.index;
}
