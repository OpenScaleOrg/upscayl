// The upscayl-bin streams progress on stderr as lines like "42.00%", often with
// trailing whitespace/newlines, carriage returns, or several values per chunk.
// Return the last percentage token (normalized, e.g. "42.00%") or null.
export function extractProgressPercent(data: string): string | null {
  if (!data) return null;
  const m = data.match(/(\d+(?:\.\d+)?)\s*%/g);
  return m && m.length ? m[m.length - 1].replace(/\s+/g, "") : null;
}
