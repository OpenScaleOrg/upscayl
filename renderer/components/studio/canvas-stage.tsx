"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ReactCompareSlider } from "react-compare-slider";
import { sanitizePath } from "@common/sanitize-path";
import getFilenameFromPath from "@common/get-file-name";
import LensViewer from "@/components/main-content/lens-view";
import { progressAtom, scaleAtom } from "@/atoms/user-settings-atom";
import {
  constrainCropRatio,
  moveCropRect,
  pixelRatioToFraction,
  resizeCropRect,
  type CropRect,
} from "@/lib/crop";
import { splitGrid } from "@/lib/split";
import {
  activeToolAtom,
  adjustmentsAtom,
  compareModeAtom,
  zoomByAtom,
  cropRatioAtom,
  cropRectAtom,
  splitColsAtom,
  splitRowsAtom,
  zoomAtom,
} from "@/atoms/studio-atoms";
import { hasAdjustments } from "@/lib/adjustments";
import AdjustPreview from "./adjust-preview";
import { useStudio } from "./studio-context";
import { C } from "./theme";
import type { Dimensions } from "./studio-context";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

const CanvasStage = ({
  setDimensions,
}: {
  setDimensions: (d: Dimensions) => void;
}) => {
  const s = useStudio();
  const tool = useAtomValue(activeToolAtom);
  const [zoom, setZoom] = useAtom(zoomAtom);
  const compare = useAtomValue(compareModeAtom);
  const zoomBy = useSetAtom(zoomByAtom);
  const [cropRect, setCropRect] = useAtom(cropRectAtom);
  const cropRatio = useAtomValue(cropRatioAtom);
  const splitCols = useAtomValue(splitColsAtom);
  const splitRows = useAtomValue(splitRowsAtom);
  const scale = useAtomValue(scaleAtom);
  const progress = useAtomValue(progressAtom);
  const adjustments = useAtomValue(adjustmentsAtom);

  const imgRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [imgRect, setImgRect] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  const running = progress.length > 0 && !s.upscaledImagePath;
  const progressPct = /%$/.test(progress) ? progress : "0%";
  const hasUpscaled = !!s.upscaledImagePath && !!s.imagePath;
  // Compare is a tool, not a mode the canvas falls into once a result exists.
  // Previously any tool showed the comparison after upscaling, which also
  // unmounted the single-image view that crop/split measure against.
  const showCompare = hasUpscaled && tool === "compare";

  // Detect a stalled upscale (no progress change for a while) — usually the
  // wrong GPU on a multi-GPU machine — and surface a hint.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    if (!running) return;
    const id = setTimeout(() => setStalled(true), 12000);
    return () => clearTimeout(id);
  }, [running, progressPct]);

  const src = s.imagePath ? "file:///" + sanitizePath(s.imagePath) : "";
  const upSrc = s.upscaledImagePath
    ? "file:///" + sanitizePath(s.upscaledImagePath)
    : "";

  // compute letterboxed image rect within the stage box (object-contain)
  const recompute = useCallback(() => {
    const box = boxRef.current;
    const img = imgRef.current;
    if (!box || !img || !img.naturalWidth) return setImgRect(null);
    const bw = box.clientWidth;
    const bh = box.clientHeight;
    const ar = img.naturalWidth / img.naturalHeight;
    let w = bw;
    let h = bw / ar;
    if (h > bh) {
      h = bh;
      w = bh * ar;
    }
    // imgRect is the fit (letterboxed) rect at scale 1; zoom is applied as a
    // CSS transform on the content wrapper, not baked in here.
    setImgRect({ left: (bw - w) / 2, top: (bh - h) / 2, w, h });
  }, []);

  const zScale = zoom == null ? 1 : zoom / 100;
  const zRef = useRef(zScale);
  zRef.current = zScale;

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(recompute);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [recompute, src]);

  // The locked crop ratio, expressed in the crop rect's fraction space.
  const fracRatio =
    cropRatio && s.dimensions.width && s.dimensions.height
      ? pixelRatioToFraction(cropRatio, s.dimensions.width, s.dimensions.height)
      : undefined;

  // default crop rect when the crop tool is picked
  useEffect(() => {
    if (tool === "crop" && !cropRect && s.imagePath && !hasUpscaled) {
      const start = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
      setCropRect(fracRatio ? constrainCropRatio(start, fracRatio) : start);
    }
  }, [tool, cropRect, s.imagePath, hasUpscaled, fracRatio, setCropRect]);

  // Enter applies crop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && tool === "crop" && cropRect) {
        e.preventDefault();
        s.applyCrop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, cropRect, s]);

  // ---- crop drag logic ----
  const dragRef = useRef<{
    mode: "move" | Handle;
    startX: number;
    startY: number;
    rect: CropRect;
  } | null>(null);

  const onCropDown = (mode: "move" | Handle) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cropRect) return;
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      rect: cropRect,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      const r = imgRect;
      if (!d || !r) return;
      const z = zRef.current || 1;
      const dx = (e.clientX - d.startX) / (r.w * z);
      const dy = (e.clientY - d.startY) / (r.h * z);
      setCropRect(
        d.mode === "move"
          ? moveCropRect(d.rect, dx, dy)
          : resizeCropRect(d.rect, d.mode, dx, dy, 0.02, fracRatio),
      );
    };
    const onUp = () => (dragRef.current = null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [imgRect, fracRatio, setCropRect]);

  const showCrop =
    tool === "crop" && cropRect && imgRect && s.imagePath && !hasUpscaled;
  const showSplit = tool === "split" && imgRect && s.imagePath && !hasUpscaled;

  // ---- hand / pan (Photoshop grab tool) ----
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panDragRef = useRef<{
    sx: number;
    sy: number;
    px: number;
    py: number;
  } | null>(null);

  // reset pan when the document changes or we fit to screen
  useEffect(() => setPan({ x: 0, y: 0 }), [src]);
  useEffect(() => {
    if (zoom == null) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const startPan = (e: React.MouseEvent) => {
    // Hand tool with the left button, or middle-mouse with any tool.
    if (!(tool === "hand" && e.button === 0) && e.button !== 1) return;
    e.preventDefault();
    panDragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    setPanning(true);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = panDragRef.current;
      if (!d) return;
      setPan({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) });
    };
    const onUp = () => {
      panDragRef.current = null;
      setPanning(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const canvasCursor =
    tool === "hand"
      ? panning
        ? "grabbing"
        : "grab"
      : tool === "zoom"
        ? "zoom-in"
        : "default";
  const contentTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zScale})`;

  // The split slider itself must always span the full canvas: putting the zoom
  // transform on its container shrank the clip region and the drag handle with
  // it, so zooming out trapped the divider inside a small box. Transform the
  // two images instead — identical transform on both keeps them registered.
  const compareImg: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transform: contentTransform,
    transformOrigin: "center center",
  };

  const checker: React.CSSProperties = {
    backgroundColor: C.bgDeep,
    backgroundImage:
      "linear-gradient(45deg,#111418 25%,transparent 25%),linear-gradient(-45deg,#111418 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#111418 75%),linear-gradient(-45deg,transparent 75%,#111418 75%)",
    backgroundSize: "22px 22px",
    backgroundPosition: "0 0,0 11px,11px -11px,-11px 0",
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        background: C.bg,
      }}
    >
      {/* tab bar */}
      <div
        style={{
          height: 34,
          flex: "none",
          display: "flex",
          alignItems: "stretch",
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          userSelect: "none",
        }}
      >
        {s.tabs.map((tab) => {
          const on = tab.id === s.activeId;
          const isFolder = tab.kind === "folder";
          return (
            <div
              key={tab.id}
              onClick={() => s.selectDocument(tab.id)}
              title={tab.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 11px",
                borderRight: `1px solid ${C.border}`,
                background: on ? C.bg : "transparent",
                borderTop: `2px solid ${on ? C.accent : "transparent"}`,
                fontSize: 12,
                color: on ? C.text : C.textMute,
                maxWidth: 230,
                cursor: "pointer",
              }}
            >
              {isFolder ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke={C.amber}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6.5V5a1 1 0 0 1 1-1h3.2l1.4 1.8h7.4a1 1 0 0 1 1 1v8.7a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z" />
                </svg>
              ) : (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    background: tab.hasImage ? C.green : C.textFaint,
                  }}
                />
              )}
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {tab.name}
              </span>
              {isFolder ? (
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 10.5,
                    color: C.textFaint,
                  }}
                >
                  {tab.count}
                </span>
              ) : (
                tab.dimensions.width && (
                  <span
                    style={{
                      fontFamily: C.mono,
                      fontSize: 10.5,
                      color: C.textFaint,
                    }}
                  >
                    {tab.dimensions.width}×{tab.dimensions.height}
                  </span>
                )
              )}
              <span
                className="dc-x"
                style={{ color: C.textFaint, fontSize: 13 }}
                onClick={(e) => {
                  e.stopPropagation();
                  s.closeDocument(tab.id);
                }}
              >
                ×
              </span>
            </div>
          );
        })}
        <button
          className="dc-tabadd"
          title="New tab"
          aria-label="New tab"
          style={{
            width: 34,
            border: 0,
            borderRight: `1px solid ${C.border}`,
            background: "transparent",
            color: C.textMute,
            fontSize: 15,
            cursor: "pointer",
          }}
          onClick={s.newDocument}
        >
          +
        </button>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontFamily: C.mono,
            fontSize: 10.5,
            color: C.textMute,
          }}
        >
          {tool === "crop"
            ? "Crop — drag handles, Enter to apply"
            : tool === "split"
              ? `Split — ${splitCols} × ${splitRows} grid, save from the options bar`
              : showCompare
                ? "Compare — drag the divider"
                : s.imagePath
                  ? "Ready"
                  : "Import an image to begin"}
        </div>
      </div>

      {/* canvas */}
      <div
        ref={boxRef}
        onMouseDown={startPan}
        onWheel={(e) => {
          if (!s.imagePath) return;
          const step = e.deltaY < 0 ? 10 : -10;
          setZoom((z) =>
            Math.max(10, Math.min(800, (z == null ? 100 : z) + step)),
          );
        }}
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          cursor: s.imagePath ? canvasCursor : "default",
          ...checker,
        }}
      >
        {/* empty state */}
        {!s.imagePath && !s.batchMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                textAlign: "center",
                color: C.textMute,
                border: `1px dashed ${C.border2}`,
                borderRadius: 12,
                padding: "44px 60px",
              }}
            >
              <div style={{ fontSize: 15, color: C.textDim, marginBottom: 8 }}>
                Drop an image here
              </div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>
                or import, paste, or open a folder to batch
              </div>
              <button
                className="dc-run"
                onClick={s.selectImage}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: `1px solid ${C.accentBorder}`,
                  background: C.accentBtn,
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "default",
                }}
              >
                Import Image
              </button>
            </div>
          </div>
        )}

        {/* folder tab overview — replaced by the image once one is selected */}
        {s.batchMode && !s.imagePath && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: C.textDim,
              padding: 24,
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 18 18"
              fill="none"
              stroke={C.amber}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 6.5V5a1 1 0 0 1 1-1h3.2l1.4 1.8h7.4a1 1 0 0 1 1 1v8.7a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z" />
            </svg>
            <div style={{ fontSize: 13, textAlign: "center" }}>
              <span style={{ fontFamily: C.mono, color: C.blue }}>
                {s.batchFolderPath || "Batch"}
              </span>
            </div>
            <div
              style={{ fontFamily: C.mono, fontSize: 12, color: C.textMute }}
            >
              {s.queueItems.length} images ·{" "}
              {s.queueItems.filter((q) => q.status === "done").length} done
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="dc-run"
                onClick={s.queueRunning ? s.stop : s.startQueue}
                disabled={
                  s.queueItems.length === 0 || (s.busy && !s.queueRunning)
                }
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: `1px solid ${C.accentBorder}`,
                  background: C.accentBtn,
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity:
                    s.queueItems.length === 0 || (s.busy && !s.queueRunning)
                      ? 0.5
                      : 1,
                }}
              >
                {s.queueRunning ? "Pause batch" : "Start batch"}
              </button>
              <button
                onClick={s.openOutputFolder}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: `1px solid ${C.border2}`,
                  background: C.input,
                  color: C.text,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Open output folder
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.textFaint }}>
              Images are listed in the Batch Queue below.
            </div>
          </div>
        )}

        {/* compare views */}
        {showCompare && compare === "split" && (
          <ReactCompareSlider
            className="dc-cmp"
            style={{ position: "absolute", inset: 0 }}
            itemOne={<img src={src} alt="original" style={compareImg} />}
            itemTwo={<img src={upSrc} alt="upscayled" style={compareImg} />}
          />
        )}
        {showCompare && compare === "lens" && (
          <div style={{ position: "absolute", inset: 0 }}>
            <LensViewer
              sanitizedImagePath={sanitizePath(s.imagePath)}
              sanitizedUpscaledImagePath={sanitizePath(s.upscaledImagePath)}
            />
          </div>
        )}
        {showCompare && compare === "side" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              transform: contentTransform,
              transformOrigin: "center center",
            }}
          >
            <div
              style={{
                flex: 1,
                position: "relative",
                borderRight: `1px solid ${C.border}`,
              }}
            >
              <img
                src={src}
                alt="original"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  fontSize: 11,
                  background: "#0e1013cc",
                  color: C.textDim,
                  padding: "2px 7px",
                  borderRadius: 4,
                }}
              >
                original
              </span>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
              <img
                src={upSrc}
                alt="upscayled"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  fontSize: 11,
                  background: "#0e1013cc",
                  color: C.blueLt,
                  padding: "2px 7px",
                  borderRadius: 4,
                }}
              >
                upscayled {scale}×
              </span>
            </div>
          </div>
        )}

        {/* single-image view — every tool except compare. Owns imgRef, which
            the crop and split overlays measure against. */}
        {s.imagePath && !showCompare && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: contentTransform,
              transformOrigin: "center center",
              transition: "transform .12s ease-out",
            }}
          >
            <img
              ref={imgRef}
              src={hasUpscaled ? upSrc : src}
              alt=""
              draggable={false}
              onClick={() => {
                if (tool === "zoom") zoomBy(1);
              }}
              onLoad={(e) => {
                // Source dimensions only — output size is scale × original, so
                // the upscaled result must not overwrite them.
                if (!hasUpscaled) {
                  setDimensions({
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight,
                  });
                }
                recompute();
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                cursor: canvasCursor,
              }}
            />

            {hasAdjustments(adjustments) && (
              <AdjustPreview srcPath={s.imagePath} adj={adjustments} />
            )}

            {showSplit && imgRect && (
              <div
                style={{
                  position: "absolute",
                  left: imgRect.left,
                  top: imgRect.top,
                  width: imgRect.w,
                  height: imgRect.h,
                  outline: `1px solid ${C.accent}`,
                  pointerEvents: "none",
                  display: "grid",
                  gridTemplateColumns: `repeat(${splitCols},1fr)`,
                  gridTemplateRows: `repeat(${splitRows},1fr)`,
                }}
              >
                {splitGrid(
                  s.dimensions.width || 1,
                  s.dimensions.height || 1,
                  splitCols,
                  splitRows,
                ).map((tile) => (
                  <div
                    key={`${tile.row}-${tile.col}`}
                    style={{
                      border: `1px dashed ${C.accent}99`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: `10.5px ${C.mono}`,
                      color: "#dfe6f5",
                      textShadow: "0 1px 3px #000",
                    }}
                  >
                    {tile.sw}×{tile.sh}
                  </div>
                ))}
              </div>
            )}

            {showCrop && imgRect && cropRect && (
              <div
                style={{
                  position: "absolute",
                  left: imgRect.left,
                  top: imgRect.top,
                  width: imgRect.w,
                  height: imgRect.h,
                  pointerEvents: "none",
                }}
              >
                {/* dim mask via 4 rects would be heavier; use shadow box */}
                <div
                  onMouseDown={onCropDown("move")}
                  style={{
                    position: "absolute",
                    left: `${cropRect.x * 100}%`,
                    top: `${cropRect.y * 100}%`,
                    width: `${cropRect.w * 100}%`,
                    height: `${cropRect.h * 100}%`,
                    outline: "1px solid #fff",
                    boxShadow: "0 0 0 9999px rgba(8,10,13,.55)",
                    pointerEvents: "auto",
                    cursor: "move",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gridTemplateRows: "repeat(3,1fr)",
                      pointerEvents: "none",
                    }}
                  >
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderRight:
                            i % 3 !== 2 ? "1px solid #ffffff33" : "none",
                          borderBottom: i < 6 ? "1px solid #ffffff33" : "none",
                        }}
                      />
                    ))}
                  </div>
                  {HANDLES.map((hd) => {
                    const pos: Record<Handle, [string, string, string]> = {
                      nw: ["0", "0", "nwse-resize"],
                      n: ["0", "50%", "ns-resize"],
                      ne: ["0", "100%", "nesw-resize"],
                      e: ["50%", "100%", "ew-resize"],
                      se: ["100%", "100%", "nwse-resize"],
                      s: ["100%", "50%", "ns-resize"],
                      sw: ["100%", "0", "nesw-resize"],
                      w: ["50%", "0", "ew-resize"],
                    };
                    const [top, left, cur] = pos[hd];
                    return (
                      <div
                        key={hd}
                        onMouseDown={onCropDown(hd)}
                        style={{
                          position: "absolute",
                          top,
                          left,
                          width: 10,
                          height: 10,
                          background: "#fff",
                          border: "1px solid #101216",
                          transform: "translate(-50%,-50%)",
                          cursor: cur,
                          pointerEvents: "auto",
                        }}
                      />
                    );
                  })}
                  <div
                    style={{
                      position: "absolute",
                      top: 7,
                      left: 7,
                      background: "#1c1f25",
                      border: `1px solid ${C.border2}`,
                      borderRadius: 5,
                      padding: "2px 8px",
                      fontFamily: C.mono,
                      fontSize: 10.5,
                      color: C.textDim,
                      pointerEvents: "none",
                    }}
                  >
                    {s.dimensions.width
                      ? Math.round(cropRect.w * s.dimensions.width)
                      : 0}{" "}
                    ×{" "}
                    {s.dimensions.height
                      ? Math.round(cropRect.h * s.dimensions.height)
                      : 0}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* progress overlay */}
        {running && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 64,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "#12151acc",
              backdropFilter: "blur(8px)",
              border: `1px solid ${stalled ? C.amber : C.border2}`,
              borderRadius: 8,
              padding: "9px 14px",
              minWidth: 340,
              maxWidth: 420,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ fontSize: 11.5, color: C.text }}>
                {/%$/.test(progress) ? "Upscaling" : progress}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  background: "#22262d",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: C.accent,
                    width: progressPct,
                    transition: "width .2s",
                  }}
                />
              </div>
              <span
                style={{ fontFamily: C.mono, fontSize: 11, color: C.blueLt }}
              >
                {progressPct}
              </span>
            </div>
            {stalled && (
              <span style={{ fontSize: 10.5, color: C.amber, lineHeight: 1.4 }}>
                Still working… on a multi-GPU laptop this usually means it
                picked the slow integrated GPU. Open <b>Preferences → GPU ID</b>{" "}
                and set your dedicated GPU (e.g. <b>1</b>), then run again.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasStage;
