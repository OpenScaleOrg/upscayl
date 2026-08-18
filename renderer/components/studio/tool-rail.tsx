"use client";
import { useAtom, useSetAtom } from "jotai";
import {
  activeToolAtom,
  showPreferencesAtom,
  StudioTool,
} from "@/atoms/studio-atoms";
import { C } from "./theme";

const S = (children: any) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

// Only tools that actually do something in an upscaler are exposed.
const TOOLS: { id: StudioTool; title: string; icon: any }[] = [
  {
    id: "move",
    title: "Move (V)",
    icon: S(
      <path d="M9 2v14M2 9h14M9 2 6.5 4.5M9 2l2.5 2.5M9 16l-2.5-2.5M9 16l2.5-2.5M2 9l2.5-2.5M2 9l2.5 2.5M16 9l-2.5-2.5M16 9l-2.5 2.5" />,
    ),
  },
  {
    id: "crop",
    title: "Crop (C)",
    icon: S(<path d="M5 1.5v11.5h11.5M1.5 5H13v11.5" />),
  },
  {
    id: "split",
    title: "Split — cut the image into a grid of tiles",
    icon: S(
      <>
        <rect x="2.5" y="2.5" width="13" height="13" />
        <path d="M9 2.5v13M2.5 9h13" />
      </>,
    ),
  },
  {
    id: "zoom",
    title: "Zoom (Z) — click canvas to zoom in",
    icon: S(
      <>
        <circle cx="8" cy="8" r="5" />
        <path d="m12 12 4 4M6 8h4M8 6v4" />
      </>,
    ),
  },
  {
    id: "hand",
    title: "Pan (H) — drag to pan when zoomed in",
    icon: S(
      <path d="M6 9V4.2a1.2 1.2 0 0 1 2.4 0V8m0-.5V3.4a1.2 1.2 0 0 1 2.4 0V8m0-.8a1.2 1.2 0 0 1 2.4 0v4.3c0 2.4-1.8 4.2-4.3 4.2-2.6 0-4.3-1.5-5-3.6L3.4 10c-.3-.9.3-1.6 1.1-1.7.6 0 1.1.3 1.4.9" />,
    ),
  },
  {
    id: "compare",
    title: "Compare Split (K)",
    icon: S(
      <>
        <rect x="2.5" y="3.5" width="13" height="11" />
        <path d="M9 2v14" strokeDasharray="2 2" />
      </>,
    ),
  },
];

const ToolRail = () => {
  const [active, setActive] = useAtom(activeToolAtom);
  const setPrefs = useSetAtom(showPreferencesAtom);

  return (
    <div
      style={{
        width: 52,
        flex: "none",
        background: C.panel,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 0",
        gap: 3,
      }}
    >
      {TOOLS.map((tl) => {
        const on = active === tl.id;
        return (
          <button
            key={tl.id}
            title={tl.title}
            onClick={() => setActive(tl.id)}
            className="dc-tool"
            style={{
              width: 38,
              height: 38,
              borderRadius: 6,
              border: `1px solid ${on ? C.accent : "transparent"}`,
              background: on ? C.accentSoft : "transparent",
              color: on ? "#cfe0ff" : "#98a0ad",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "default",
            }}
          >
            {tl.icon}
          </button>
        );
      })}
      <div
        style={{ width: 26, height: 1, background: C.border3, margin: "7px 0" }}
      />
      <div style={{ flex: 1 }} />
      <button
        title="Preferences"
        aria-label="Preferences"
        onClick={() => setPrefs(true)}
        className="dc-tool"
        style={{
          width: 38,
          height: 38,
          borderRadius: 6,
          border: "1px solid transparent",
          background: "transparent",
          color: C.textMute,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="8" cy="8" r="2.6" />
          <circle cx="8" cy="8" r="6.2" />
        </svg>
      </button>
    </div>
  );
};

export default ToolRail;
