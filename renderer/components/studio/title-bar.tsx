"use client";
import { useEffect, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import getFilenameFromPath from "@common/get-file-name";
import { useStudio } from "./studio-context";
import { C } from "./theme";
import {
  compareModeAtom,
  inspectorTabAtom,
  showBatchQueueAtom,
  showInspectorAtom,
  showPreferencesAtom,
  showToolRailAtom,
  zoomAtom,
} from "@/atoms/studio-atoms";
import { doubleUpscaylAtom } from "@/atoms/user-settings-atom";
import type { Dimensions } from "./studio-context";

const drag = { WebkitAppRegion: "drag" } as any;
const noDrag = { WebkitAppRegion: "no-drag" } as any;

type Item = { label: string; key?: string; onClick?: () => void };

const TitleBar = ({
  setDimensions,
}: {
  setDimensions: (d: Dimensions) => void;
}) => {
  const s = useStudio();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const setPrefs = useSetAtom(showPreferencesAtom);
  const setZoom = useSetAtom(zoomAtom);
  const setCompare = useSetAtom(compareModeAtom);
  const [showInspector, setShowInspector] = useAtom(showInspectorAtom);
  const [showBatch, setShowBatch] = useAtom(showBatchQueueAtom);
  const [showRail, setShowRail] = useAtom(showToolRailAtom);
  const setInspectorTab = useSetAtom(inspectorTabAtom);
  const [double, setDouble] = useAtom(doubleUpscaylAtom);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const close = () => setOpen(null);
  const run = (fn?: () => void) => () => {
    close();
    fn?.();
  };

  const menus: { label: string; items: Item[] }[] = [
    {
      label: "File",
      items: [
        { label: "Import Images…", key: "Ctrl+O", onClick: s.selectImage },
        {
          label: "Import Folder…",
          key: "Ctrl+Shift+O",
          onClick: s.selectFolder,
        },
        {
          label: "Paste from Clipboard",
          key: "Ctrl+V",
          onClick: s.pasteFromClipboard,
        },
        {
          label: "Export / Open Folder…",
          key: "Ctrl+E",
          onClick: s.openOutputFolder,
        },
        { label: "Set Output Folder…", onClick: s.selectOutput },
        {
          label: "Exit",
          key: "Alt+F4",
          onClick: () => window.electron.send(ELECTRON_COMMANDS.WINDOW_CLOSE),
        },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Preferences…", key: "Ctrl+,", onClick: () => setPrefs(true) },
        { label: "Reset Document", onClick: s.reset },
      ],
    },
    {
      label: "Image",
      items: [
        { label: "Crop to Selection", key: "Enter", onClick: s.applyCrop },
        {
          label: "Rotate 90° CW",
          key: "Ctrl+]",
          onClick: () => s.transform({ kind: "rotate", deg: 90 }),
        },
        {
          label: "Rotate 90° CCW",
          key: "Ctrl+[",
          onClick: () => s.transform({ kind: "rotate", deg: -90 }),
        },
        {
          label: "Flip Horizontal",
          onClick: () => s.transform({ kind: "flipH" }),
        },
        {
          label: "Flip Vertical",
          onClick: () => s.transform({ kind: "flipV" }),
        },
      ],
    },
    {
      label: "Enhance",
      items: [
        { label: "Run Upscale", key: "Ctrl+R", onClick: s.runUpscayl },
        {
          label: "Double Upscale",
          key: "Ctrl+Shift+R",
          onClick: () => {
            setDouble(true);
            setTimeout(s.runUpscayl, 0);
          },
        },
        { label: "Model Manager…", onClick: () => setPrefs(true) },
      ],
    },
    {
      label: "Batch",
      items: [
        {
          label: "Add Current to Queue",
          key: "Ctrl+B",
          onClick: s.addCurrentToQueue,
        },
        { label: "Start Queue", key: "F5", onClick: s.startQueue },
        { label: "Pause Queue", key: "F6", onClick: s.stop },
        { label: "Clear Completed", onClick: s.clearDone },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Fit on Screen", key: "Ctrl+0", onClick: () => setZoom(null) },
        { label: "Actual Pixels", key: "Ctrl+1", onClick: () => setZoom(100) },
        {
          label: "Split Compare",
          key: "C",
          onClick: () => setCompare("split"),
        },
        { label: "Lens Compare", key: "L", onClick: () => setCompare("lens") },
        { label: "Side by Side", onClick: () => setCompare("side") },
      ],
    },
    {
      label: "Window",
      items: [
        {
          label: showInspector ? "Hide Inspector" : "Show Inspector",
          key: "F7",
          onClick: () => setShowInspector((v) => !v),
        },
        {
          label: showBatch ? "Hide Batch Queue" : "Show Batch Queue",
          key: "F8",
          onClick: () => setShowBatch((v) => !v),
        },
        {
          label: showRail ? "Hide Tool Rail" : "Show Tool Rail",
          onClick: () => setShowRail((v) => !v),
        },
        {
          label: "History",
          onClick: () => {
            setShowInspector(true);
            setInspectorTab("History");
          },
        },
        {
          label: "Reset Layout",
          onClick: () => {
            setShowInspector(true);
            setShowBatch(true);
            setShowRail(true);
          },
        },
      ],
    },
    {
      label: "Help",
      items: [
        {
          label: "Documentation",
          key: "F1",
          onClick: () => window.open("https://docs.upscayl.org/", "_blank"),
        },
        {
          label: "GitHub",
          onClick: () =>
            window.open("https://github.com/upscayl/upscayl", "_blank"),
        },
        {
          label: "About OpenScayl",
          onClick: () => window.open("https://upscayl.org/", "_blank"),
        },
      ],
    },
  ];

  const fileName = s.imagePath ? getFilenameFromPath(s.imagePath) : null;
  const isMac = s.platform === "mac";

  return (
    <div
      ref={ref}
      style={{
        height: 40,
        flex: "none",
        display: "flex",
        alignItems: "center",
        background: C.titlebar,
        borderBottom: `1px solid ${C.border}`,
        userSelect: "none",
        position: "relative",
        zIndex: 60,
        ...drag,
      }}
    >
      {/* brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: isMac ? "0 14px 0 78px" : "0 14px 0 12px",
        }}
      >
        <img
          src="icon.png"
          alt=""
          width={18}
          height={18}
          style={{ borderRadius: 5, display: "block" }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.2 }}>
          OpenScayl
        </span>
      </div>

      {/* menus */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "100%",
          ...noDrag,
        }}
      >
        {menus.map((m) => (
          <div
            key={m.label}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <button
              onClick={() => setOpen((o) => (o === m.label ? null : m.label))}
              onMouseEnter={() => open && setOpen(m.label)}
              style={{
                background: open === m.label ? C.hover : "transparent",
                border: 0,
                color: open === m.label ? "#fff" : C.textDim,
                font: `400 12.5px ${C.sans}`,
                padding: "0 11px",
                cursor: "default",
                height: "100%",
              }}
            >
              {m.label}
            </button>
            {open === m.label && (
              <div
                style={{
                  position: "absolute",
                  top: 40,
                  left: 0,
                  minWidth: 236,
                  background: "#1c1f25",
                  border: `1px solid ${C.border2}`,
                  borderRadius: 8,
                  padding: 5,
                  boxShadow: "0 18px 40px rgba(0,0,0,.55)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {m.items.map((it) => (
                  <div
                    key={it.label}
                    onClick={run(it.onClick)}
                    className="dc-menu-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 24,
                      padding: "6px 10px",
                      borderRadius: 5,
                      fontSize: 12.5,
                      color: C.textDim,
                      cursor: "default",
                    }}
                  >
                    <span>{it.label}</span>
                    {it.key && (
                      <span
                        style={{
                          fontFamily: C.mono,
                          fontSize: 11,
                          color: C.textFaint,
                        }}
                      >
                        {it.key}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* file info chip */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minWidth: 0,
          overflow: "hidden",
          padding: "0 16px",
        }}
      >
        {fileName && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#171a20",
              border: `1px solid ${C.border3}`,
              borderRadius: 6,
              padding: "3px 10px",
              maxWidth: "100%",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: C.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {fileName}
            </span>
            {s.dimensions.width && (
              <>
                <span style={{ width: 1, height: 12, background: C.border2 }} />
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: C.textMute,
                    flex: "none",
                  }}
                >
                  {s.dimensions.width} × {s.dimensions.height}
                </span>
              </>
            )}
            {!s.upscaledImagePath && (
              <span
                style={{
                  flex: "none",
                  fontSize: 10.5,
                  color: C.amber,
                  border: "1px solid #6b5417",
                  background: "#2a2312",
                  borderRadius: 3,
                  padding: "0 5px",
                }}
              >
                unsaved
              </span>
            )}
          </div>
        )}
      </div>

      {/* gpu chip + window controls */}
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingRight: 6,
          ...noDrag,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#151a22",
            border: `1px solid ${C.border3}`,
            borderRadius: 5,
            padding: "3px 9px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.green,
            }}
          />
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              color: "#9aa1ab",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {s.gpuLabel}
          </span>
        </div>

        {!isMac && (
          <div style={{ display: "flex", alignItems: "stretch", height: 40 }}>
            <button
              onClick={() =>
                window.electron.send(ELECTRON_COMMANDS.WINDOW_MINIMIZE)
              }
              className="dc-wc"
              style={{
                width: 44,
                border: 0,
                background: "transparent",
                color: C.textDim,
                cursor: "default",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11">
                <line
                  x1="0"
                  y1="5.5"
                  x2="11"
                  y2="5.5"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </button>
            <button
              onClick={() =>
                window.electron.send(ELECTRON_COMMANDS.WINDOW_MAXIMIZE)
              }
              className="dc-wc"
              style={{
                width: 44,
                border: 0,
                background: "transparent",
                color: C.textDim,
                cursor: "default",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11">
                <rect
                  x="0.5"
                  y="0.5"
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </button>
            <button
              onClick={() =>
                window.electron.send(ELECTRON_COMMANDS.WINDOW_CLOSE)
              }
              className="dc-wc-close"
              style={{
                width: 46,
                border: 0,
                background: "transparent",
                color: C.textDim,
                cursor: "default",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11">
                <line
                  x1="0"
                  y1="0"
                  x2="11"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <line
                  x1="11"
                  y1="0"
                  x2="0"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleBar;
