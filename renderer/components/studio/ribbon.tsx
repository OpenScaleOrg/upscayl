"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MODELS } from "@common/models-list";
import useTranslation from "@/components/hooks/use-translation";
import { customModelIdsAtom } from "@/atoms/models-list-atom";
import {
  doubleUpscaylAtom,
  progressAtom,
  scaleAtom,
  selectedModelIdAtom,
  ttaModeAtom,
} from "@/atoms/user-settings-atom";
import { selectCompareModeAtom, zoomAtom } from "@/atoms/studio-atoms";
import { useStudio } from "./studio-context";
import { C } from "./theme";

const bigBtn = (active?: boolean): React.CSSProperties => ({
  width: 56,
  height: 60,
  border: `1px solid ${active ? C.accent : "transparent"}`,
  borderRadius: 6,
  background: active ? C.accentSoft : "transparent",
  color: C.text,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "default",
});

const miniBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  height: 28,
  padding: "0 10px 0 8px",
  border: `1px solid ${C.border2}`,
  borderRadius: 5,
  background: C.input,
  color: C.text,
  fontSize: 11.5,
  cursor: "default",
};

const ghostBtn: React.CSSProperties = {
  ...miniBtn,
  border: "1px solid transparent",
  background: "transparent",
};

const labelStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 9.5,
  letterSpacing: 0.6,
  color: C.textFaint,
  whiteSpace: "nowrap",
};

const Divider = () => (
  <div
    style={{ width: 1, background: C.border, margin: "10px 0", flex: "none" }}
  />
);

// Approx compact-button footprint and divider width used for the collapse math.
const COMPACT_W = 84;
const DIVIDER_W = 13;
// Fallback full-width estimates (used before first measurement).
const MIN_W: Record<string, number> = {
  source: 200,
  transform: 188,
  enhance: 462,
  process: 268,
  view: 156,
};
// Collapse priority — higher number collapses first; enhance/process last.
const PRIORITY: Record<string, number> = {
  view: 5,
  transform: 4,
  source: 3,
  process: 2,
  enhance: 1,
};

const Ribbon = () => {
  const t = useTranslation();
  const s = useStudio();
  const [modelsOpen, setModelsOpen] = useState(false);
  const [model, setModel] = useAtom(selectedModelIdAtom);
  const [scale, setScale] = useAtom(scaleAtom);
  const [double, setDouble] = useAtom(doubleUpscaylAtom);
  const [tta, setTta] = useAtom(ttaModeAtom);
  const [, setZoom] = useAtom(zoomAtom);
  const setCompare = useSetAtom(selectCompareModeAtom);
  const customModels = useAtomValue(customModelIdsAtom);
  const progress = useAtomValue(progressAtom);

  const running = progress.length > 0 && !s.upscaledImagePath;
  const progressPct = /%$/.test(progress) ? progress : "0%";

  const modelName = (id: string) =>
    id in MODELS ? t(`APP.MODEL_SELECTION.MODELS.${id}.NAME` as any) : id;
  const modelDesc = (id: string) =>
    id in MODELS
      ? t(`APP.MODEL_SELECTION.MODELS.${id}.DESCRIPTION` as any)
      : "Custom model";

  // ---- section content renderers (used full inline or inside a popover) ----
  const source = (
    <div style={{ display: "flex", gap: 3 }}>
      <button className="dc-tile" style={bigBtn()} onClick={s.selectImage}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
          <circle cx="7" cy="8.5" r="1.4" />
          <path d="m3 14 4.5-4 3.5 3 3-2.5 3 3.5" />
        </svg>
        <span style={{ fontSize: 10.5 }}>Import</span>
      </button>
      <button
        className="dc-tile"
        style={bigBtn()}
        onClick={s.pasteFromClipboard}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 5.5h3M13 5.5h3v11H4v-11" />
          <rect x="7" y="3" width="6" height="4" rx="1" />
        </svg>
        <span style={{ fontSize: 10.5 }}>Paste</span>
      </button>
      <button className="dc-tile" style={bigBtn()} onClick={s.selectFolder}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.5V5a1 1 0 0 1 1-1h3.2l1.4 1.8h7.4a1 1 0 0 1 1 1v8.7a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z" />
        </svg>
        <span style={{ fontSize: 10.5 }}>Folder</span>
      </button>
    </div>
  );

  const transform = (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          className="dc-mini"
          style={ghostBtn}
          onClick={() => s.transform({ kind: "rotate", deg: -90 })}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <path d="M3 9a6 6 0 1 1 1.8 4.2M3 9V5.5M3 9h3.5" />
          </svg>
          Rotate L
        </button>
        <button
          className="dc-mini"
          style={ghostBtn}
          onClick={() => s.transform({ kind: "rotate", deg: 90 })}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <path d="M15 9A6 6 0 1 0 13.2 13.2M15 9V5.5M15 9h-3.5" />
          </svg>
          Rotate R
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          className="dc-mini"
          style={ghostBtn}
          onClick={() => s.transform({ kind: "flipH" })}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 2v14" strokeDasharray="2 2" />
            <path d="M7 5H3.5v8H7M11 5h3.5v8H11" />
          </svg>
          Flip H
        </button>
        <button
          className="dc-mini"
          style={ghostBtn}
          onClick={() => s.transform({ kind: "flipV" })}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 9h14" strokeDasharray="2 2" />
            <path d="M5 7V3.5h8V7M5 11v3.5h8V11" />
          </svg>
          Flip V
        </button>
      </div>
    </div>
  );

  const enhance = (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 10, color: C.textMute }}>AI Model</span>
        <div style={{ position: "relative" }}>
          <button
            className="dc-select"
            style={{
              width: 150,
              height: 32,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 9px",
              border: `1px solid ${C.border2}`,
              borderRadius: 5,
              background: C.input,
              color: C.text,
              fontSize: 12,
              cursor: "default",
            }}
            onClick={() => setModelsOpen((o) => !o)}
            onBlur={() => setTimeout(() => setModelsOpen(false), 150)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 18 18"
              fill="none"
              stroke={C.blue}
              strokeWidth="1.4"
            >
              <path d="M9 2.5 15 6v6l-6 3.5L3 12V6Z" />
              <path d="M9 9v6.5M9 9 3 6M9 9l6-3" />
            </svg>
            <span
              style={{
                flex: 1,
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {modelName(model)}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke={C.textMute}
              strokeWidth="1.3"
            >
              <path d="m2 4 3 3 3-3" />
            </svg>
          </button>
          {modelsOpen && (
            <div
              style={{
                position: "absolute",
                top: 36,
                left: 0,
                width: 288,
                background: "#1c1f25",
                border: `1px solid ${C.border2}`,
                borderRadius: 8,
                padding: 5,
                boxShadow: "0 18px 40px rgba(0,0,0,.6)",
                zIndex: 70,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {[...Object.keys(MODELS), ...customModels].map((id) => (
                <div
                  key={id}
                  className="dc-opt"
                  onMouseDown={() => {
                    setModel(id);
                    setModelsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    padding: "7px 9px",
                    borderRadius: 5,
                    background: id === model ? C.accentSoft : "transparent",
                    cursor: "default",
                  }}
                >
                  <span style={{ fontSize: 12, color: C.text }}>
                    {modelName(id)}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.textMute }}>
                    {modelDesc(id)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 10, color: C.textMute }}>Output Scale</span>
        <div
          style={{
            display: "flex",
            height: 32,
            border: `1px solid ${C.border2}`,
            borderRadius: 5,
            overflow: "hidden",
            background: C.input,
          }}
        >
          {["2", "3", "4", "8"].map((n) => (
            <button
              key={n}
              className="dc-seg"
              onClick={() => setScale(n)}
              style={{
                width: 34,
                border: 0,
                borderRight: `1px solid ${C.border}`,
                background: n === scale ? C.accentBtn : "transparent",
                color: n === scale ? "#fff" : "#aeb5c0",
                font: `600 11.5px ${C.mono}`,
                cursor: "default",
              }}
            >
              {n}×
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          paddingTop: 16,
        }}
      >
        <label
          onClick={() => setDouble((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            color: C.text,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 30,
              height: 16,
              borderRadius: 9,
              background: double ? C.accentBtn : C.border2,
              display: "flex",
              alignItems: "center",
              padding: 2,
              justifyContent: double ? "flex-end" : "flex-start",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#fff",
              }}
            />
          </span>
          Double upscale
        </label>
        <label
          onClick={() => setTta((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            color: C.text,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              border: `1px solid ${tta ? C.accentBtn : "#4a515d"}`,
              background: tta ? C.accentBtn : C.input,
            }}
          />
          TTA mode
        </label>
      </div>
    </div>
  );

  const process = (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
      <button
        className="dc-run"
        onClick={running ? s.stop : s.runUpscayl}
        style={{
          width: 118,
          height: 60,
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 6,
          background: C.accentBtn,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          cursor: "default",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 2.5v5M10 17.5v-3M4 5l3 3M16 5l-3 3M2.5 11h5M17.5 11h-5M6 17l2-3M14 17l-2-3" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {running ? "Upscaling…" : "Upscale"}
        </span>
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          className="dc-mini"
          style={miniBtn}
          onClick={s.addCurrentToQueue}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <path d="M9 4v10M4 9h10" />
          </svg>
          Add to queue
        </button>
        <button className="dc-mini" style={miniBtn} onClick={s.stop}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="5" width="8" height="8" rx="1" />
          </svg>
          Stop
        </button>
      </div>
    </div>
  );

  const view = (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      <button
        className="dc-mini"
        style={ghostBtn}
        onClick={() => setZoom(null)}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M3 6.5V3h3.5M15 6.5V3h-3.5M3 11.5V15h3.5M15 11.5V15h-3.5" />
        </svg>
        Fit
      </button>
      <button className="dc-mini" style={ghostBtn} onClick={() => setZoom(100)}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M6 4v10M12 4v10M4 9h10" />
        </svg>
        100%
      </button>
      <button
        className="dc-mini"
        style={ghostBtn}
        onClick={() => setCompare("split")}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <rect x="2.5" y="4" width="13" height="10" />
          <path d="M9 3v12" strokeDasharray="2 2" />
        </svg>
        Compare
      </button>
      <button
        className="dc-mini"
        style={ghostBtn}
        onClick={() => setCompare("lens")}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="8" cy="8" r="4.5" />
          <path d="m11.5 11.5 4 4" strokeLinecap="round" />
        </svg>
        Lens
      </button>
    </div>
  );

  const icon = {
    source: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
        <circle cx="7" cy="8.5" r="1.4" />
        <path d="m3 14 4.5-4 3.5 3 3-2.5 3 3.5" />
      </svg>
    ),
    transform: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5.5 2v12.5H18M2 5.5h12.5V18" />
      </svg>
    ),
    enhance: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 18 18"
        fill="none"
        stroke={C.blue}
        strokeWidth="1.4"
      >
        <path d="M9 2.5 15 6v6l-6 3.5L3 12V6Z" />
        <path d="M9 9v6.5M9 9 3 6M9 9l6-3" />
      </svg>
    ),
    process: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 2.5v5M10 17.5v-3M4 5l3 3M16 5l-3 3M2.5 11h5M17.5 11h-5M6 17l2-3M14 17l-2-3" />
      </svg>
    ),
    view: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <circle cx="8" cy="8" r="4.5" />
        <path d="m11.5 11.5 4 4" strokeLinecap="round" />
      </svg>
    ),
  } as const;

  const SECTIONS = [
    { id: "source", label: "SOURCE", short: "Source", content: source },
    {
      id: "transform",
      label: "TRANSFORM · PRE-PROCESS",
      short: "Transform",
      content: transform,
    },
    {
      id: "enhance",
      label: "ENHANCEMENT ENGINE",
      short: "Model",
      content: enhance,
    },
    { id: "process", label: "PROCESS", short: "Run", content: process },
    { id: "view", label: "VIEW", short: "View", content: view },
  ] as const;

  // ---- responsive collapse (Office-style) ----
  const ribbonRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fullW = useRef<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const recompute = useCallback(() => {
    const el = ribbonRef.current;
    if (!el) return;
    const avail = el.clientWidth - 8;
    // cache measured full widths of any section currently rendered full
    for (const sec of SECTIONS) {
      const node = secRefs.current[sec.id];
      if (node && !collapsed.includes(sec.id))
        fullW.current[sec.id] = node.offsetWidth;
    }
    const width = (id: string) => fullW.current[id] ?? MIN_W[id];
    const order = SECTIONS.map((x) => x.id).sort(
      (a, b) => PRIORITY[b] - PRIORITY[a],
    );
    const next = new Set<string>();
    const total = () =>
      SECTIONS.reduce(
        (sum, sec) => sum + (next.has(sec.id) ? COMPACT_W : width(sec.id)),
        0,
      ) +
      (SECTIONS.length - 1) * DIVIDER_W;
    for (const id of order) {
      if (total() <= avail) break;
      next.add(id);
    }
    setCollapsed((prev) => {
      const a = [...prev].sort();
      const b = Array.from(next).sort();
      return a.length === b.length && a.every((v, i) => v === b[i])
        ? prev
        : Array.from(next);
    });
  }, [collapsed]);

  useLayoutEffect(() => {
    recompute();
    const el = ribbonRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  useEffect(() => {
    const onDoc = () => setOpenPopover(null);
    if (openPopover) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [openPopover]);

  return (
    <div
      ref={ribbonRef}
      style={{
        flex: "none",
        background: C.panelHi,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "stretch",
        height: 96,
        minHeight: 96,
        overflow: "visible",
        userSelect: "none",
        position: "relative",
        zIndex: 40,
      }}
    >
      {SECTIONS.map((sec, i) => {
        const isCollapsed = collapsed.includes(sec.id);
        return (
          <div key={sec.id} style={{ display: "flex", alignItems: "stretch" }}>
            {isCollapsed ? (
              <div
                style={{
                  flex: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "7px 8px 5px",
                  position: "relative",
                }}
              >
                <button
                  className="dc-tile"
                  style={{ ...bigBtn(openPopover === sec.id), width: 66 }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setOpenPopover((o) => (o === sec.id ? null : sec.id));
                  }}
                >
                  {icon[sec.id]}
                  <span
                    style={{
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    {sec.short}
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke={C.textMute}
                      strokeWidth="1.3"
                    >
                      <path d="m2 4 3 3 3-3" />
                    </svg>
                  </span>
                </button>
                <div style={labelStyle}>{sec.label}</div>
                {openPopover === sec.id && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: 72,
                      left: 0,
                      background: "#1c1f25",
                      border: `1px solid ${C.border2}`,
                      borderRadius: 8,
                      padding: 12,
                      boxShadow: "0 18px 40px rgba(0,0,0,.6)",
                      zIndex: 60,
                    }}
                  >
                    {sec.content}
                  </div>
                )}
              </div>
            ) : (
              <div
                ref={(n) => {
                  secRefs.current[sec.id] = n;
                }}
                style={{
                  flex: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "7px 12px 5px",
                }}
              >
                {sec.content}
                <div style={labelStyle}>{sec.label}</div>
              </div>
            )}
            {i < SECTIONS.length - 1 && <Divider />}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />

      {running && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 2,
            width: progressPct,
            background: C.accent,
          }}
        />
      )}
    </div>
  );
};

export default Ribbon;
