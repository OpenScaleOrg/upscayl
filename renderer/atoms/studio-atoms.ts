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
  | "straighten"
  | "heal"
  | "eyedrop"
  | "zoom"
  | "hand"
  | "compare";
export const activeToolAtom = atom<StudioTool>("hand");

// Canvas zoom (percentage). "fit" is represented as null → fit-to-screen.
export const zoomAtom = nullableAtom<number>();

// Compare view mode for the canvas when an upscaled result exists.
export type CompareMode = "split" | "lens" | "side";
export const compareModeAtom = atomWithStorage<CompareMode>(
  "studioCompareMode",
  "split",
);

// Inspector right-panel tab.
export type InspectorTab = "Model" | "Adjust" | "Info" | "History";
export const inspectorTabAtom = atom<InspectorTab>("Model");

// Panel visibility (View / Window menu toggles).
export const showInspectorAtom = atomWithStorage("studioShowInspector", true);
export const showBatchQueueAtom = atomWithStorage("studioShowBatchQueue", true);
export const showToolRailAtom = atomWithStorage("studioShowToolRail", true);

// Preferences dialog open state.
export const showPreferencesAtom = atom(false);

// Crop selection rectangle, in fractions (0..1) of the source image. null = none.
export const cropRectAtom = nullableAtom<CropRect>();

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
