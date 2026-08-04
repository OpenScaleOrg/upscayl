"use client";
import { useAtomValue } from "jotai";
import { progressAtom, scaleAtom } from "@/atoms/user-settings-atom";
import { queueAtom, zoomAtom } from "@/atoms/studio-atoms";
import { outputDimensions } from "@/lib/output-size";
import { useStudio } from "./studio-context";
import { C } from "./theme";

const Sep = () => (
  <span style={{ width: 1, height: 13, background: C.border3 }} />
);

const StatusBar = () => {
  const s = useStudio();
  const progress = useAtomValue(progressAtom);
  const zoom = useAtomValue(zoomAtom);
  const scale = useAtomValue(scaleAtom);
  const queue = useAtomValue(queueAtom);

  const w = s.dimensions.width;
  const h = s.dimensions.height;
  const { width: outW, height: outH } = outputDimensions(w, h, scale);
  const mp = outW && outH ? (outW * outH) / 1e6 : 0;

  const running = progress.length > 0 && !s.upscaledImagePath;
  const statusText = running
    ? `Upscaling · ${/%$/.test(progress) ? progress : ""}`.trim()
    : "Ready";
  const done = queue.filter((q) => q.status === "done").length;

  return (
    <div
      style={{
        height: 28,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 12px",
        background: C.titlebar,
        borderTop: `1px solid ${C.border}`,
        fontFamily: C.mono,
        fontSize: 11,
        color: C.textMute,
        userSelect: "none",
      }}
    >
      <span style={{ color: C.textDim }}>{statusText}</span>
      {w && (
        <>
          <Sep />
          <span>
            Input {w} × {h}
          </span>
          <span style={{ color: "#5d6572" }}>→</span>
          <span style={{ color: C.blue }}>
            Output {outW} × {outH} · {mp.toFixed(1)} MP
          </span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <span
        style={{
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {s.gpuLabel}
      </span>
      <Sep />
      <span>Zoom {zoom == null ? "Fit" : `${zoom}%`}</span>
      {queue.length > 0 && (
        <>
          <Sep />
          <span>
            Queue {done} of {queue.length} done
          </span>
        </>
      )}
    </div>
  );
};

export default StatusBar;
