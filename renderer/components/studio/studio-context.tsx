import { createContext, useContext } from "react";
import type { TransformOp } from "@/lib/image-transform";
import type { QueueItem } from "@/atoms/studio-atoms";

export type Dimensions = { width: number | null; height: number | null };

export type StudioContextValue = {
  // document state
  imagePath: string;
  upscaledImagePath: string;
  dimensions: Dimensions;
  batchFolderPath: string;
  upscaledBatchFolderPath: string;
  doubleUpscaylCounter: number;
  gpuLabel: string;
  platform: "mac" | "win" | "linux";
  version: string;

  // documents / tabs
  tabs: {
    id: string;
    kind: "image" | "folder";
    name: string;
    count: number;
    hasImage: boolean;
    dimensions: Dimensions;
  }[];
  activeId: string;
  batchMode: boolean;
  queueItems: QueueItem[];
  queueRunning: boolean;
  busy: boolean;
  newDocument: () => void;
  selectDocument: (id: string) => void;
  closeDocument: (id: string) => void;

  // source / io
  selectImage: () => void;
  selectFolder: () => void;
  selectOutput: () => void;
  pasteFromClipboard: () => void;
  openOutputFolder: () => void;
  reset: () => void;

  // enhance
  runUpscayl: () => void;
  stop: () => void;

  // transform (client-side, real)
  transform: (op: TransformOp) => void;
  applyCrop: () => void;
  applyAdjustments: () => void;

  // queue
  addCurrentToQueue: () => void;
  startQueue: () => void;
  clearDone: () => void;
};

export const StudioContext = createContext<StudioContextValue | null>(null);

export const useStudio = () => {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioShell");
  return ctx;
};
