"use client";
import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  activeToolAtom,
  compareModeAtom,
  cropRatioAtom,
  cropRatioPresetAtom,
  cropRectAtom,
  selectCompareModeAtom,
  splitColsAtom,
  splitRowsAtom,
  transformBusyAtom,
  zoomAtom,
  zoomByAtom,
} from "@/atoms/studio-atoms";
import {
  constrainCropRatio,
  pixelRatioToFraction,
  setCropSizePx,
} from "@/lib/crop";
import { splitGrid } from "@/lib/split";
import { useStudio } from "./studio-context";
import { C } from "./theme";

// Aspect-ratio presets, as pixel width/height. `orig` resolves to the image.
const RATIOS: { id: string; label: string; value?: number }[] = [
  { id: "free", label: "Free" },
  { id: "orig", label: "Original" },
  { id: "1:1", label: "1 : 1", value: 1 },
  { id: "3:2", label: "3 : 2", value: 3 / 2 },
  { id: "2:3", label: "2 : 3", value: 2 / 3 },
  { id: "4:3", label: "4 : 3", value: 4 / 3 },
  { id: "3:4", label: "3 : 4", value: 3 / 4 },
  { id: "16:9", label: "16 : 9", value: 16 / 9 },
  { id: "9:16", label: "9 : 16", value: 9 / 16 },
  { id: "custom", label: "Custom" },
];

const HINTS: Record<string, string> = {
  move: "Move — drag the canvas to reposition the view",
  hand: "Pan — drag to move around, or hold the middle mouse button",
  zoom: "Zoom — click the canvas to zoom in, scroll to zoom either way",
};

const label: React.CSSProperties = {
  fontSize: 11,
  color: C.textMute,
  whiteSpace: "nowrap",
};

const field: React.CSSProperties = {
  height: 24,
  border: `1px solid ${C.border2}`,
  borderRadius: 4,
  background: C.input,
  color: C.text,
  font: `12px ${C.mono}`,
  padding: "0 6px",
  outline: "none",
};

const numField: React.CSSProperties = { ...field, width: 64 };

const btn = (primary?: boolean): React.CSSProperties => ({
  height: 24,
  padding: "0 11px",
  border: `1px solid ${primary ? C.accentBorder : C.border2}`,
  borderRadius: 4,
  background: primary ? C.accentBtn : C.input,
  color: primary ? "#fff" : C.text,
  fontSize: 11.5,
  cursor: "pointer",
});

const Sep = () => (
  <span style={{ width: 1, height: 18, background: C.border, flex: "none" }} />
);

type NumFieldProps = {
  value: number;
  onCommit: (n: number) => void;
  label: string;
  min?: number;
  max?: number;
  width?: number;
  disabled?: boolean;
  /** Commit while typing (default) — off for fields where a half-typed
   *  number would reshape the selection into something unrecoverable. */
  live?: boolean;
};

/**
 * Numeric field that shows exactly what you type while it has focus — an empty
 * field included — and only reports clamped values back. Binding the input
 * straight to the clamped value instead makes it impossible to clear: the
 * keystroke that empties it immediately re-renders the old number.
 */
const NumField = ({
  value,
  onCommit,
  label,
  min = 1,
  max,
  width = 64,
  disabled,
  live = true,
}: NumFieldProps) => {
  const [text, setText] = useState<string | null>(null); // non-null = editing
  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return; // keep editing
    onCommit(Math.min(max ?? Infinity, Math.max(min, n)));
  };
  return (
    <input
      type="number"
      min={min}
      max={max}
      disabled={disabled}
      value={text ?? String(value)}
      onFocus={() => setText(String(value))}
      onChange={(e) => {
        setText(e.target.value);
        if (live) commit(e.target.value);
      }}
      onBlur={(e) => {
        commit(e.target.value);
        setText(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={{ ...numField, width }}
      aria-label={label}
    />
  );
};

const ToolOptions = () => {
  const s = useStudio();
  const tool = useAtomValue(activeToolAtom);
  const [rect, setRect] = useAtom(cropRectAtom);
  const [ratio, setRatio] = useAtom(cropRatioAtom);
  const [preset, setPreset] = useAtom(cropRatioPresetAtom);
  const [cols, setCols] = useAtom(splitColsAtom);
  const [rows, setRows] = useAtom(splitRowsAtom);
  const busy = useAtomValue(transformBusyAtom);
  const compare = useAtomValue(compareModeAtom);
  const selectCompareMode = useSetAtom(selectCompareModeAtom);
  const zoom = useAtomValue(zoomAtom);
  const zoomBy = useSetAtom(zoomByAtom);
  // The Custom ratio pair is its own state: deriving it from the selection's
  // pixel size would make every keystroke fight the reshape it just caused.
  const [custom, setCustom] = useState({ w: 16, h: 9 });

  const imgW = s.dimensions.width ?? 0;
  const imgH = s.dimensions.height ?? 0;
  const known = imgW > 0 && imgH > 0;

  // ---- crop ----
  const cropW = rect && known ? Math.round(rect.w * imgW) : 0;
  const cropH = rect && known ? Math.round(rect.h * imgH) : 0;

  // Reshape the live selection whenever the locked ratio changes.
  const applyRatio = (value: number | null, presetId: string) => {
    setRatio(value);
    setPreset(presetId);
    if (value && rect && known)
      setRect(
        constrainCropRatio(rect, pixelRatioToFraction(value, imgW, imgH), "w"),
      );
  };

  const onPreset = (id: string) => {
    const entry = RATIOS.find((r) => r.id === id);
    if (id === "free") return applyRatio(null, id);
    if (id === "orig") return applyRatio(known ? imgW / imgH : null, id);
    if (id === "custom") {
      // seed the pair from the current selection so it reads 1920 : 1080
      const seed = cropW && cropH ? { w: cropW, h: cropH } : custom;
      setCustom(seed);
      return applyRatio(seed.w / seed.h, id);
    }
    applyRatio(entry?.value ?? null, id);
  };

  const setCustomRatio = (w: number, h: number) => {
    setCustom({ w, h });
    applyRatio(w / h, "custom");
  };

  // Resize the selection to an exact pixel size, honouring the ratio lock.
  const setSize = (wPx: number, hPx: number, edited: "w" | "h") => {
    if (!rect || !known) return;
    let next = setCropSizePx(rect, imgW, imgH, wPx, hPx);
    if (ratio)
      next = constrainCropRatio(
        next,
        pixelRatioToFraction(ratio, imgW, imgH),
        edited,
      );
    setRect(next);
  };

  const toggleLock = () => {
    if (ratio) return applyRatio(null, "free");
    onPreset("custom");
  };

  const crop = (
    <>
      <span style={label}>Ratio</span>
      <select
        value={preset}
        onChange={(e) => onPreset(e.target.value)}
        style={{ ...field, width: 104, cursor: "pointer" }}
      >
        {RATIOS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      {preset === "custom" && (
        <>
          <NumField
            value={custom.w}
            onCommit={(n) => setCustomRatio(n, custom.h)}
            label="Custom ratio width"
            width={56}
            live={false}
          />
          <span style={label}>:</span>
          <NumField
            value={custom.h}
            onCommit={(n) => setCustomRatio(custom.w, n)}
            label="Custom ratio height"
            width={56}
            live={false}
          />
        </>
      )}
      <button
        onClick={toggleLock}
        title={
          ratio
            ? "Ratio locked — click to unlock"
            : "Lock the current selection's ratio"
        }
        style={{
          ...btn(),
          width: 30,
          padding: 0,
          color: ratio ? C.blue : C.textMute,
          borderColor: ratio ? C.accent : C.border2,
        }}
        aria-label="Lock aspect ratio"
      >
        {ratio ? "🔒" : "🔓"}
      </button>
      <Sep />
      <span style={label}>W</span>
      <NumField
        value={cropW}
        onCommit={(n) => setSize(n, cropH, "w")}
        label="Crop width in pixels"
        max={imgW || undefined}
        disabled={!rect || !known}
      />
      <span style={label}>H</span>
      <NumField
        value={cropH}
        onCommit={(n) => setSize(cropW, n, "h")}
        label="Crop height in pixels"
        max={imgH || undefined}
        disabled={!rect || !known}
      />
      <span style={{ ...label, color: C.textFaint }}>px</span>
      <Sep />
      <button
        onClick={() => setRect({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 })}
        style={btn()}
      >
        Reset
      </button>
      <button onClick={s.applyCrop} disabled={!rect} style={btn(true)}>
        Apply Crop
      </button>
      <span style={{ ...label, color: C.textFaint }}>Enter applies</span>
    </>
  );

  // ---- split ----
  const tiles = splitGrid(imgW || 1, imgH || 1, cols, rows);
  const tileSizes = known ? ` · ~${tiles[0].sw}×${tiles[0].sh} px each` : "";
  const splitTarget = s.upscaledImagePath ? "upscayled result" : "source image";

  const split = (
    <>
      <span style={label}>Columns</span>
      <NumField
        value={cols}
        onCommit={setCols}
        label="Split columns"
        max={50}
      />
      <span style={label}>Rows</span>
      <NumField value={rows} onCommit={setRows} label="Split rows" max={50} />
      <Sep />
      <span style={{ ...label, color: C.textFaint }}>
        {cols * rows} tiles from the {splitTarget}
        {s.upscaledImagePath ? "" : tileSizes}
      </span>
      <Sep />
      <button
        onClick={() => s.splitImage(cols, rows)}
        disabled={busy || (!s.imagePath && !s.upscaledImagePath)}
        style={{
          ...btn(true),
          opacity: busy || !s.imagePath ? 0.6 : 1,
        }}
      >
        {busy ? "Splitting…" : "Split & Save"}
      </button>
      <span style={{ ...label, color: C.textFaint }}>
        saved to a folder next to the output
      </span>
    </>
  );

  // ---- compare ----
  // These used to float over the canvas next to the zoom pill, where they
  // showed for every tool. They belong to the compare tool.
  const hasUpscaled = !!s.upscaledImagePath && !!s.imagePath;
  const compareOpts = (
    <>
      <span style={label}>View</span>
      {(["split", "lens", "side"] as const).map((m) => (
        <button
          key={m}
          onClick={() => selectCompareMode(m)}
          disabled={!hasUpscaled}
          style={{
            ...btn(compare === m),
            textTransform: "capitalize",
            opacity: hasUpscaled ? 1 : 0.6,
          }}
        >
          {m}
        </button>
      ))}
      <Sep />
      <span style={{ ...label, color: C.textFaint }}>
        {hasUpscaled
          ? "drag the divider on the canvas"
          : "upscale an image to compare"}
      </span>
    </>
  );

  const zoomLabel = zoom == null ? "Fit" : `${zoom}%`;
  const zoomBtn: React.CSSProperties = {
    ...btn(),
    width: 26,
    padding: 0,
    fontSize: 14,
    color: C.textDim,
  };

  return (
    <div
      style={{
        height: 34,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "0 10px",
        background: C.panel2,
        borderBottom: `1px solid ${C.border}`,
        userSelect: "none",
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.textDim,
          textTransform: "capitalize",
          minWidth: 44,
        }}
      >
        {tool}
      </span>
      <Sep />
      {tool === "crop" ? (
        crop
      ) : tool === "split" ? (
        split
      ) : tool === "compare" ? (
        compareOpts
      ) : (
        <span style={{ ...label, color: C.textFaint }}>
          {HINTS[tool] ?? "No options for this tool"}
        </span>
      )}

      {/* Zoom is not a tool option — it stays pinned right for every tool. */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 5,
          flex: "none",
          paddingLeft: 10,
        }}
      >
        <Sep />
        <button
          onClick={() => zoomBy(-1)}
          style={zoomBtn}
          aria-label="Zoom out"
        >
          &minus;
        </button>
        <span
          style={{
            minWidth: 46,
            textAlign: "center",
            font: `11.5px ${C.mono}`,
            color: C.text,
          }}
        >
          {zoomLabel}
        </span>
        <button onClick={() => zoomBy(1)} style={zoomBtn} aria-label="Zoom in">
          +
        </button>
      </div>
    </div>
  );
};

export default ToolOptions;
