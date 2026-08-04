// Upscayl Studio dark palette — matches the Claude Design "Upscayl Studio" spec.
// Kept in one place so every studio chrome component stays visually consistent.
export const C = {
  bg: "#101216",
  bgDeep: "#0c0e11",
  panel: "#15181d",
  panel2: "#12151a",
  panelHi: "#191c21",
  titlebar: "#0e1013",
  input: "#11141a",
  border: "#262a31",
  border2: "#333842",
  border3: "#2b3038",
  hover: "#20242b",
  hover2: "#242931",
  text: "#e6e8ec",
  textDim: "#c8cdd6",
  textMute: "#8b93a0",
  textFaint: "#6e7685",
  accent: "#3d7ff5",
  accentBtn: "#2f6fe4",
  accentBtnHi: "#3a7cf3",
  accentBorder: "#4d8ffd",
  accentSoft: "#1f3b6e",
  accentSelBg: "#182335",
  blue: "#7fb3ff",
  blueLt: "#9dc2ff",
  green: "#3fbf7f",
  amber: "#f0b429",
  red: "#c0392b",
  redText: "#ff8a7a",
  mono: "ui-monospace,Consolas,monospace",
  sans: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
} as const;

// status colors for batch queue items: [text, border, bg, bar]
export const QUEUE_STATUS: Record<string, [string, string, string, string]> = {
  done: ["#3fbf7f", "#1e4630", "#12251c", "#3fbf7f"],
  running: ["#7fb3ff", "#2a4472", "#141d2c", "#3d7ff5"],
  queued: ["#9aa1ab", "#333842", "#1a1e24", "#4a515d"],
  failed: ["#ff8a7a", "#5c2a24", "#2a1613", "#c0392b"],
};
