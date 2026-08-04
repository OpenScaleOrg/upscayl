"use client";
import { useAtom, useAtomValue } from "jotai";
import { MODELS } from "@common/models-list";
import useTranslation from "@/components/hooks/use-translation";
import { customModelIdsAtom } from "@/atoms/models-list-atom";
import { ImageFormat } from "@/lib/valid-formats";
import {
  compressionAtom,
  customWidthAtom,
  saveImageAsAtom,
  savedOutputPathAtom,
  scaleAtom,
  selectedModelIdAtom,
  tileSizeAtom,
  ttaModeAtom,
  useCustomWidthAtom,
  userStatsAtom,
} from "@/atoms/user-settings-atom";
import {
  adjustmentsAtom,
  historyAtom,
  inspectorTabAtom,
} from "@/atoms/studio-atoms";
import { outputDimensions, estimateSizeMB } from "@/lib/output-size";
import {
  ZERO_ADJUSTMENTS,
  hasAdjustments,
  type Adjustments,
} from "@/lib/adjustments";
import { useStudio } from "./studio-context";
import { C } from "./theme";

const ADJ_FIELDS: { key: keyof Adjustments; name: string }[] = [
  { key: "exposure", name: "Exposure" },
  { key: "contrast", name: "Contrast" },
  { key: "saturation", name: "Saturation" },
  { key: "highlights", name: "Highlights" },
  { key: "shadows", name: "Shadows" },
  { key: "clarity", name: "Clarity" },
];

const label = (text: string) => (
  <span style={{ fontSize: 10, letterSpacing: 0.6, color: C.textFaint }}>
    {text}
  </span>
);
const sectionStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderBottom: "1px solid #22262d",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const Slider = ({ name, value, min, max, onChange, display }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11.5,
      }}
    >
      <span>{name}</span>
      <span style={{ fontFamily: C.mono, color: C.blueLt }}>{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: C.accent }}
    />
  </div>
);

const Inspector = () => {
  const t = useTranslation();
  const s = useStudio();
  const [tab, setTab] = useAtom(inspectorTabAtom);
  const [model, setModel] = useAtom(selectedModelIdAtom);
  const [format, setFormat] = useAtom(saveImageAsAtom);
  const [tileSize, setTileSize] = useAtom(tileSizeAtom);
  const [compression, setCompression] = useAtom(compressionAtom);
  const [tta, setTta] = useAtom(ttaModeAtom);
  const [useCustomWidth, setUseCustomWidth] = useAtom(useCustomWidthAtom);
  const [customWidth, setCustomWidth] = useAtom(customWidthAtom);
  const [scale, setScale] = useAtom(scaleAtom);
  const outputPath = useAtomValue(savedOutputPathAtom);
  const stats = useAtomValue(userStatsAtom);
  const history = useAtomValue(historyAtom);
  const customModels = useAtomValue(customModelIdsAtom);
  const [adjustments, setAdjustments] = useAtom(adjustmentsAtom);

  const modelName = (id: string) =>
    id in MODELS ? t(`APP.MODEL_SELECTION.MODELS.${id}.NAME` as any) : id;
  const modelDesc = (id: string) =>
    id in MODELS
      ? t(`APP.MODEL_SELECTION.MODELS.${id}.DESCRIPTION` as any)
      : "Custom model";

  const w = s.dimensions.width;
  const h = s.dimensions.height;
  const { width: outW, height: outH } = outputDimensions(
    w,
    h,
    scale,
    useCustomWidth,
    customWidth,
  );
  const estMB = outW && outH ? estimateSizeMB(outW, outH).toFixed(1) : "—";

  const tabs: any[] = ["Model", "Adjust", "Info", "History"];

  return (
    <div
      style={{
        width: 320,
        flex: "none",
        background: C.panel,
        borderLeft: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        userSelect: "none",
      }}
    >
      <div
        style={{
          height: 34,
          flex: "none",
          display: "flex",
          alignItems: "stretch",
          borderBottom: `1px solid ${C.border}`,
          background: C.panel2,
        }}
      >
        {tabs.map((tName) => (
          <button
            key={tName}
            className="dc-itab"
            onClick={() => setTab(tName)}
            style={{
              flex: 1,
              border: 0,
              borderBottom: `2px solid ${tab === tName ? C.accent : "transparent"}`,
              background: "transparent",
              color: tab === tName ? C.text : C.textMute,
              fontSize: 11.5,
              cursor: "default",
            }}
          >
            {tName}
          </button>
        ))}
      </div>

      <div
        className="dc-scroll-stable"
        style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
      >
        {tab === "Model" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={sectionStyle}>
              {label("MODEL LIBRARY")}
              {[...Object.keys(MODELS), ...customModels].map((id) => {
                const on = id === model;
                return (
                  <div
                    key={id}
                    className="dc-mrow"
                    onClick={() => setModel(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      border: `1px solid ${on ? C.accent : C.border}`,
                      borderRadius: 6,
                      background: on ? C.accentSelBg : C.panel2,
                      cursor: "default",
                    }}
                  >
                    <span
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: "50%",
                        border: `1px solid ${on ? C.accent : "#4a515d"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: on ? C.accent : "transparent",
                        }}
                      />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {modelName(id)}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          color: C.textMute,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {modelDesc(id)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={sectionStyle}>
              {label("QUALITY")}
              <Slider
                name="Tile size"
                min={0}
                max={1024}
                value={tileSize ?? 0}
                onChange={(v: number) => setTileSize(v === 0 ? null : v)}
                display={tileSize ? `${tileSize} px` : "Auto"}
              />
              <Slider
                name="Compression"
                min={0}
                max={100}
                value={compression}
                onChange={setCompression}
                display={`${compression}`}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
                onClick={() => setTta((v) => !v)}
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
                TTA mode (slower, higher quality)
              </label>
            </div>

            <div
              style={{
                padding: "11px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {label("OUTPUT")}
              <div
                style={{
                  display: "flex",
                  height: 28,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 5,
                  overflow: "hidden",
                  background: C.input,
                }}
              >
                {(["png", "jpg", "webp"] as ImageFormat[]).map((f) => (
                  <button
                    key={f}
                    className="dc-seg"
                    onClick={() => setFormat(f)}
                    style={{
                      flex: 1,
                      border: 0,
                      borderRight: `1px solid ${C.border}`,
                      background: format === f ? C.accentBtn : "transparent",
                      color: format === f ? "#fff" : "#aeb5c0",
                      font: `600 10.5px ${C.mono}`,
                      cursor: "default",
                      textTransform: "uppercase",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div
                className="dc-mini"
                onClick={s.selectOutput}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 5,
                  background: C.input,
                  padding: "6px 9px",
                  cursor: "default",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke={C.textMute}
                  strokeWidth="1.4"
                >
                  <path d="M2.5 6.5V5a1 1 0 0 1 1-1h3.2l1.4 1.8h7.4a1 1 0 0 1 1 1v8.7a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z" />
                </svg>
                <span
                  style={{
                    flex: 1,
                    fontFamily: C.mono,
                    fontSize: 10.5,
                    color: C.textDim,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {outputPath || "No output folder"}
                </span>
                <span style={{ fontSize: 11, color: C.blue }}>Change</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 11.5 }}>Filename pattern</span>
                <div
                  style={{
                    border: `1px solid ${C.border2}`,
                    borderRadius: 5,
                    background: C.input,
                    padding: "6px 9px",
                    fontFamily: C.mono,
                    fontSize: 10.5,
                    color: C.textDim,
                  }}
                >
                  {"{name}_upscayl_{scale}x_{model}"}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Adjust" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={sectionStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {label("IMAGE ADJUSTMENTS")}
                <span
                  onClick={() => setAdjustments(ZERO_ADJUSTMENTS)}
                  style={{ fontSize: 10.5, color: C.blue, cursor: "pointer" }}
                >
                  Reset
                </span>
              </div>
              {ADJ_FIELDS.map((f) => (
                <Slider
                  key={f.key}
                  name={f.name}
                  min={-100}
                  max={100}
                  value={adjustments[f.key]}
                  display={
                    adjustments[f.key] > 0
                      ? `+${adjustments[f.key]}`
                      : `${adjustments[f.key]}`
                  }
                  onChange={(v: number) =>
                    setAdjustments((a) => ({ ...a, [f.key]: v }))
                  }
                />
              ))}
              <button
                className="dc-run"
                onClick={s.applyAdjustments}
                disabled={!hasAdjustments(adjustments)}
                style={{
                  height: 30,
                  border: `1px solid ${C.accentBorder}`,
                  borderRadius: 5,
                  background: hasAdjustments(adjustments)
                    ? C.accentBtn
                    : C.input,
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: hasAdjustments(adjustments) ? 1 : 0.5,
                }}
              >
                Apply adjustments
              </button>
              <span style={{ fontSize: 10.5, color: C.textFaint }}>
                Preview updates live · Apply bakes them into the image before
                upscaling.
              </span>
            </div>
            <div style={sectionStyle}>
              {label("OUTPUT SCALE")}
              <div
                style={{
                  display: "flex",
                  height: 30,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 5,
                  overflow: "hidden",
                  background: C.input,
                }}
              >
                {["1", "2", "3", "4", "8", "16"].map((n) => (
                  <button
                    key={n}
                    className="dc-seg"
                    onClick={() => setScale(n)}
                    style={{
                      flex: 1,
                      border: 0,
                      borderRight: `1px solid ${C.border}`,
                      background:
                        !useCustomWidth && n === scale
                          ? C.accentBtn
                          : "transparent",
                      color:
                        !useCustomWidth && n === scale ? "#fff" : "#aeb5c0",
                      font: `600 11px ${C.mono}`,
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
                padding: "11px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {label("GEOMETRY")}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
                onClick={() => setUseCustomWidth((v) => !v)}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: `1px solid ${useCustomWidth ? C.accentBtn : "#4a515d"}`,
                    background: useCustomWidth ? C.accentBtn : C.input,
                  }}
                />
                Use custom output width
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  opacity: useCustomWidth ? 1 : 0.5,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span style={{ fontSize: 11, color: C.textMute }}>Width</span>
                  <input
                    type="number"
                    disabled={!useCustomWidth}
                    value={customWidth || ""}
                    onChange={(e) =>
                      setCustomWidth(Number(e.target.value) || 0)
                    }
                    style={{
                      border: `1px solid ${C.border2}`,
                      borderRadius: 5,
                      background: C.input,
                      padding: "6px 9px",
                      fontFamily: C.mono,
                      fontSize: 11,
                      color: C.text,
                    }}
                  />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span style={{ fontSize: 11, color: C.textMute }}>
                    Height
                  </span>
                  <div
                    style={{
                      border: `1px solid ${C.border2}`,
                      borderRadius: 5,
                      background: C.input,
                      padding: "6px 9px",
                      fontFamily: C.mono,
                      fontSize: 11,
                      color: C.textMute,
                    }}
                  >
                    {outH || "—"}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 10.5, color: C.textFaint }}>
                Height is derived from the source aspect ratio.
              </span>
            </div>
          </div>
        )}

        {tab === "Info" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={sectionStyle}>
              {label("DOCUMENT")}
              {[
                ["Format", format.toUpperCase()],
                ["Source", w ? `${w} × ${h}` : "—"],
                ["Output", outW ? `${outW} × ${outH}` : "—"],
                ["Model", modelName(model)],
                ["Scale", useCustomWidth ? `${customWidth}px` : `${scale}×`],
                ["Est. size", `~${estMB} MB`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11.5,
                  }}
                >
                  <span style={{ color: C.textMute }}>{k}</span>
                  <span style={{ fontFamily: C.mono }}>{v}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "11px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {label("SESSION STATS")}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  ["Upscales", String(stats.totalUpscayls)],
                  ["Batches", String(stats.batchUpscayls)],
                  [
                    "Avg time",
                    stats.averageUpscaylTime
                      ? `${(stats.averageUpscaylTime / 1000).toFixed(1)}s`
                      : "—",
                  ],
                  [
                    "Last run",
                    stats.lastUpscaylDuration
                      ? `${(stats.lastUpscaylDuration / 1000).toFixed(1)}s`
                      : "—",
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: C.panel2,
                      padding: "9px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 10.5, color: C.textMute }}>
                      {k}
                    </span>
                    <span style={{ fontFamily: C.mono, fontSize: 17 }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "History" && (
          <div
            style={{
              padding: "11px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ paddingBottom: 6 }}>{label("HISTORY")}</div>
            {history.length === 0 && (
              <span style={{ fontSize: 11.5, color: C.textFaint }}>
                No actions yet this session.
              </span>
            )}
            {[...history].reverse().map((hh, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 9px",
                  borderRadius: 5,
                  background: hh.active ? C.accentSelBg : "transparent",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: hh.active ? C.accent : C.textFaint,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 11.5,
                    color: hh.active ? C.text : C.textDim,
                  }}
                >
                  {hh.label}
                </span>
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 10,
                    color: C.textFaint,
                  }}
                >
                  {hh.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inspector;
