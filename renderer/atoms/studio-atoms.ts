import { atom, PrimitiveAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { CropRect } from "@/lib/crop";
import { type Adjustments, ZERO_ADJUSTMENTS } from "@/lib/adjustments";
import type { Gpu } from "@/lib/gpu";

export type { CropRect };

// GPUs detected from the upscayl binary. Persisted so one successful detection
// survives later flaky/empty probes (GPU enumeration can fail under contention).
export const gpuListAtom = atomWithStorage<Gpu[]>("gpuList", []);

// Post-process image adjustments for the active document (live preview + bake).
export const adjustmentsAtom = atom<Adjustments>(ZERO_ADJUSTMENTS);

// The renderer tsconfig has strictNullChecks off, so `atom(null)` mis-resolves to
// jotai's read-only overload (null is assignable to the read-function param). At
// runtime `atom(null)` is a normal writable primitive atom, so we cast it back.
const nullableAtom = <T>() => atom(null) as unknown as PrimitiveAtom<T | null>;

// Active tool in the ToolRail / Ribbon transform section.
export type StudioTool =
  | "move"
  | "marquee"
  | "crop"
  | "split"
  | "straighten"
  | "heal"
  | "eyedrop"
  | "zoom"
  | "hand"
  | "compare";
export const activeToolAtom = atom<StudioTool>("hand");

// Canvas zoom (percentage). "fit" is represented as null → fit-to-screen.
export const zoomAtom = nullableAtom<number>();

// Stepping lives here because both the canvas (zoom tool click) and the tool
// options bar drive it — the clamp should not be duplicated between them.
export const ZOOM_MIN = 10;
export const ZOOM_MAX = 800;
export const ZOOM_STEP = 25;
export const zoomByAtom = atom(null, (get, set, dir: 1 | -1) => {
  const z = get(zoomAtom) ?? 100;
  set(zoomAtom, Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z + dir * ZOOM_STEP)));
});

// Compare view mode for the canvas when an upscaled result exists.
export type CompareMode = "split" | "lens" | "side";
export const compareModeAtom = atomWithStorage<CompareMode>(
  "studioCompareMode",
  "split",
);

// Picking a compare mode has to select the compare tool as well: the canvas
// only renders a compare view for that tool, so setting the mode on its own
// would be inert. Every entry point (tool rail, ribbon, View menu, the canvas
// mode switcher) writes through here so none of them can forget.
export const selectCompareModeAtom = atom(
  null,
  (_get, set, mode: CompareMode) => {
    set(compareModeAtom, mode);
    set(activeToolAtom, "compare");
  },
);

// Inspector right-panel tab.
export type InspectorTab = "Model" | "Adjust" | "Info" | "History";
export const inspectorTabAtom = atom<InspectorTab>("Model");

// Panel visibility (View / Window menu toggles).
export const showInspectorAtom = atomWithStorage("studioShowInspector", true);
export const showBatchQueueAtom = atomWithStorage("studioShowBatchQueue", true);
export const showToolRailAtom = atomWithStorage("studioShowToolRail", true);
export const showOptionsBarAtom = atomWithStorage("studioShowOptionsBar", true);

// Preferences dialog open state.
export const showPreferencesAtom = atom(false);

// Crop selection rectangle, in fractions (0..1) of the source image. null = none.
export const cropRectAtom = nullableAtom<CropRect>();

// Crop aspect ratio lock, as a pixel w/h ratio. null = free (unlocked).
export const cropRatioAtom = nullableAtom<number>();
// Which entry of the ratio dropdown produced it (display state only).
export const cropRatioPresetAtom = atom<string>("free");

// Split tool grid.
export const splitColsAtom = atom(2);
export const splitRowsAtom = atom(2);

// Whether a client-side transform (crop/rotate/flip) is being written to disk.
export const transformBusyAtom = atom(false);

// Session action history (for the Inspector History tab).
export type HistoryEntry = { label: string; time: string; active?: boolean };
export const historyAtom = atom<HistoryEntry[]>([]);

// Client-side batch queue. Items are processed sequentially through the
// existing single-image UPSCAYL IPC by the queue runner in the Studio shell.
export type QueueStatus = "queued" | "running" | "done" | "failed";
export type QueueItem = {
  id: string;
  path: string;
  name: string;
  meta: string; // e.g. "1920×1080 · 4×"
  status: QueueStatus;
  pct: number;
  output?: string;
};
export const queueAtom = atom<QueueItem[]>([]);
export const queueRunningAtom = atom(false);
export const selectedQueueIdAtom = nullableAtom<string>();
