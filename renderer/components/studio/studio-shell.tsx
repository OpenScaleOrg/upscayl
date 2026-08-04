"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import { FEATURE_FLAGS } from "@common/feature-flags";
import getDirectoryFromPath from "@common/get-directory-from-path";
import getFilenameFromPath from "@common/get-file-name";
import { DoubleUpscaylPayload, ImageUpscaylPayload } from "@common/types/types";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import useLogger from "@/components/hooks/use-logger";
import useTranslation from "@/components/hooks/use-translation";
import useUpscaylVersion from "@/components/hooks/use-upscayl-version";
import useSystemInfo from "@/components/hooks/use-system-info";
import { useInitCustomModels } from "@/components/hooks/use-custom-models";
import { ImageFormat, VALID_IMAGE_FORMATS } from "@/lib/valid-formats";
import { applyTransform, TransformOp } from "@/lib/image-transform";
import { extractProgressPercent } from "@/lib/progress";
import { customModelIdsAtom } from "@/atoms/models-list-atom";
import {
  compressionAtom,
  copyMetadataAtom,
  doubleUpscaylAtom,
  gpuIdAtom,
  noImageProcessingAtom,
  overwriteAtom,
  progressAtom,
  rememberOutputFolderAtom,
  savedOutputPathAtom,
  saveImageAsAtom,
  scaleAtom,
  selectedModelIdAtom,
  tileSizeAtom,
  ttaModeAtom,
  useCustomWidthAtom,
  customWidthAtom,
  userStatsAtom,
} from "@/atoms/user-settings-atom";
import {
  adjustmentsAtom,
  cropRectAtom,
  gpuListAtom,
  historyAtom,
  QueueItem,
  queueRunningAtom,
  selectedQueueIdAtom,
  showBatchQueueAtom,
  showInspectorAtom,
  showToolRailAtom,
  transformBusyAtom,
} from "@/atoms/studio-atoms";
import { ZERO_ADJUSTMENTS, hasAdjustments } from "@/lib/adjustments";
import { pickBestGpu } from "@/lib/gpu";
import {
  Dimensions,
  StudioContext,
  StudioContextValue,
} from "./studio-context";
import TitleBar from "./title-bar";
import Ribbon from "./ribbon";
import ToolRail from "./tool-rail";
import CanvasStage from "./canvas-stage";
import BatchQueue from "./batch-queue";
import Inspector from "./inspector";
import StatusBar from "./status-bar";
import PreferencesDialog from "./preferences-dialog";
import { C } from "./theme";

const timeLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
};

type ImageDoc = {
  id: string;
  kind: "image";
  imagePath: string;
  upscaledImagePath: string;
  dimensions: Dimensions;
};
type FolderDoc = {
  id: string;
  kind: "folder";
  folderPath: string;
  items: QueueItem[];
};
type Doc = ImageDoc | FolderDoc;
const emptyDims = (): Dimensions => ({ width: null, height: null });
const newImageDoc = (id: string): ImageDoc => ({
  id,
  kind: "image",
  imagePath: "",
  upscaledImagePath: "",
  dimensions: emptyDims(),
});

// Explicit GPU choice wins; otherwise auto-pick the best detected GPU so we
// never silently fall back to a slow integrated GPU.
const resolveGpuId = (s: any): string | null => {
  let gpu: string | null = s.gpuId && s.gpuId.length ? s.gpuId : null;
  if (gpu == null && Array.isArray(s.gpuList) && s.gpuList.length > 1) {
    const best = pickBestGpu(s.gpuList);
    if (best != null) gpu = String(best);
  }
  return gpu;
};

const StudioShell = () => {
  const t = useTranslation();
  const logit = useLogger();
  const { toast } = useToast();
  const version = useUpscaylVersion();
  const { systemInfo } = useSystemInfo();

  useInitCustomModels();

  // ---- document state (multi-tab; image or folder tabs) ----
  const docSeqRef = useRef(1);
  const [docs, setDocs] = useState<Doc[]>(() => [newImageDoc("doc-1")]);
  const [activeId, setActiveId] = useState("doc-1");
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  // batch-queue runner refs (used by once-registered IPC listeners)
  const queueRunningRef = useRef(false);
  const runningFolderIdRef = useRef<string | null>(null);
  const currentItemIdRef = useRef<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const startQueueRef = useRef<(() => void) | null>(null);
  const active = docs.find((d) => d.id === activeId) ?? docs[0];
  const activeImage = active && active.kind === "image" ? active : null;
  const activeFolder = active && active.kind === "folder" ? active : null;
  // On a folder tab, the selected queue item is previewed on the canvas (and
  // compared against its output once it's done).
  const selectedQueueId = useAtomValue(selectedQueueIdAtom);
  const previewItem =
    activeFolder?.items.find((it) => it.id === selectedQueueId) ?? null;
  const [previewDimensions, setPreviewDimensions] =
    useState<Dimensions>(emptyDims);
  const imagePath = activeImage?.imagePath ?? previewItem?.path ?? "";
  const upscaledImagePath =
    activeImage?.upscaledImagePath ?? previewItem?.output ?? "";
  const dimensions = activeImage?.dimensions ?? previewDimensions;
  const batchMode = !!activeFolder;
  const batchFolderPath = activeFolder?.folderPath ?? "";
  const queueItems = activeFolder?.items ?? [];

  // Patch an image doc by id (no-op if it isn't an image doc).
  const patchImageDoc = useCallback((id: string, patch: Partial<ImageDoc>) => {
    setDocs((ds) =>
      ds.map((d) =>
        d.id === id && d.kind === "image" ? { ...d, ...patch } : d,
      ),
    );
  }, []);
  const patchFolderItems = useCallback(
    (id: string, updater: (items: QueueItem[]) => QueueItem[]) => {
      setDocs((ds) =>
        ds.map((d) =>
          d.id === id && d.kind === "folder"
            ? { ...d, items: updater(d.items) }
            : d,
        ),
      );
    },
    [],
  );
  const setImagePath = useCallback(
    (p: string) => patchImageDoc(activeIdRef.current, { imagePath: p }),
    [patchImageDoc],
  );
  const setUpscaledImagePath = useCallback(
    (p: string) => patchImageDoc(activeIdRef.current, { upscaledImagePath: p }),
    [patchImageDoc],
  );
  const setDimensions = useCallback(
    (d: Dimensions) => {
      const cur = docsRef.current.find((doc) => doc.id === activeIdRef.current);
      if (cur?.kind === "folder") setPreviewDimensions(d);
      else patchImageDoc(activeIdRef.current, { dimensions: d });
    },
    [patchImageDoc],
  );

  const [upscaledBatchFolderPath, setUpscaledBatchFolderPath] = useState("");
  const [doubleUpscaylCounter, setDoubleUpscaylCounter] = useState(0);
  // Which document a single/double upscale was started for (so its result lands
  // on the right tab even if the user switches tabs mid-run).
  const upscaleDocIdRef = useRef<string>("doc-1");

  // ---- settings atoms ----
  const [outputPath, setOutputPath] = useAtom(savedOutputPathAtom);
  const rememberOutputFolder = useAtomValue(rememberOutputFolderAtom);
  const setProgress = useSetAtom(progressAtom);
  const progress = useAtomValue(progressAtom);
  const setModelIds = useSetAtom(customModelIdsAtom);
  const setUserStats = useSetAtom(userStatsAtom);
  const setHistory = useSetAtom(historyAtom);
  const setCropRect = useSetAtom(cropRectAtom);
  const cropRect = useAtomValue(cropRectAtom);
  const [adjustments, setAdjustments] = useAtom(adjustmentsAtom);
  const setTransformBusy = useSetAtom(transformBusyAtom);
  const [queueRunning, setQueueRunning] = useAtom(queueRunningAtom);
  const [gpuList, setGpuList] = useAtom(gpuListAtom);

  // Global "a job is running" guard — no other processing may start while true.
  const busy = queueRunning || (progress.length > 0 && !upscaledImagePath);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // Detect GPUs on launch. GPU enumeration can fail flakily under contention,
  // so we retry a couple of times, never overwrite a previously-cached list with
  // an empty result, and (when the GPU setting is still "Auto") resolve it to the
  // best discrete GPU — integrated GPUs often stall the upscaler.
  useEffect(() => {
    let cancelled = false;
    const applyBest = (gpus: { index: number; name: string }[]) => {
      if (gpus.length > 1 && settingsRef.current.gpuId.trim() === "") {
        const best = pickBestGpu(gpus);
        if (best != null) setGpuId(String(best));
      }
    };
    const probe = (attempt: number) => {
      window.electron
        .invoke(ELECTRON_COMMANDS.DETECT_GPUS)
        .then((gpus: { index: number; name: string }[]) => {
          if (cancelled || !Array.isArray(gpus)) return;
          if (gpus.length > 0) {
            setGpuList(gpus); // only replace the cache with a real result
            applyBest(gpus);
          } else if (attempt < 2) {
            setTimeout(() => probe(attempt + 1), 1500); // retry flaky empty
          } else {
            // fall back to any previously cached list
            applyBest(settingsRef.current.gpuList ?? []);
          }
        })
        .catch(() => {});
    };
    probe(0);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedModelId = useAtomValue(selectedModelIdAtom);
  const doubleUpscayl = useAtomValue(doubleUpscaylAtom);
  const [gpuId, setGpuId] = useAtom(gpuIdAtom);
  const saveImageAs = useAtomValue(saveImageAsAtom);
  const scale = useAtomValue(scaleAtom);
  const overwrite = useAtomValue(overwriteAtom);
  const noImageProcessing = useAtomValue(noImageProcessingAtom);
  const compression = useAtomValue(compressionAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);
  const tileSize = useAtomValue(tileSizeAtom);
  const ttaMode = useAtomValue(ttaModeAtom);
  const copyMetadata = useAtomValue(copyMetadataAtom);

  const showToolRail = useAtomValue(showToolRailAtom);
  const showBatch = useAtomValue(showBatchQueueAtom);
  const showInspector = useAtomValue(showInspectorAtom);

  // mirror settings into a ref so event-driven handlers read fresh values
  const settingsRef = useRef<any>({});
  settingsRef.current = {
    outputPath,
    selectedModelId,
    gpuId,
    saveImageAs,
    scale,
    overwrite,
    noImageProcessing,
    compression,
    customWidth,
    useCustomWidth,
    tileSize,
    ttaMode,
    copyMetadata,
    doubleUpscayl,
    batchMode,
    rememberOutputFolder,
    gpuList,
  };

  const pushHistory = useCallback(
    (label: string) => {
      setHistory((prev) => {
        const next = prev.map((h) => ({ ...h, active: false }));
        next.push({ label, time: timeLabel(), active: true });
        return next.slice(-12);
      });
    },
    [setHistory],
  );

  // ---------------- source / io ----------------
  const resetImagePaths = useCallback(() => {
    setDimensions({ width: null, height: null });
    setProgress("");
    setImagePath("");
    setUpscaledImagePath("");
    setUpscaledBatchFolderPath("");
    setCropRect(null);
    setAdjustments(ZERO_ADJUSTMENTS);
  }, [
    setProgress,
    setCropRect,
    setDimensions,
    setImagePath,
    setUpscaledImagePath,
    setAdjustments,
  ]);

  // ---------------- documents / tabs ----------------
  const newDocument = useCallback(() => {
    const id = `doc-${++docSeqRef.current}`;
    setDocs((ds) => [...ds, newImageDoc(id)]);
    setActiveId(id);
    setProgress("");
    setCropRect(null);
    setAdjustments(ZERO_ADJUSTMENTS);
  }, [setProgress, setCropRect, setAdjustments]);

  const selectDocument = useCallback(
    (id: string) => {
      setActiveId(id);
      setCropRect(null);
      setAdjustments(ZERO_ADJUSTMENTS);
    },
    [setCropRect, setAdjustments],
  );

  const closeDocument = useCallback((id: string) => {
    // don't orphan a running batch
    if (id === runningFolderIdRef.current) stopRef.current?.();
    const ds = docsRef.current;
    const idx = ds.findIndex((d) => d.id === id);
    const rest = ds.filter((d) => d.id !== id);
    if (rest.length === 0) {
      const fresh = newImageDoc(`doc-${++docSeqRef.current}`);
      setDocs([fresh]);
      setActiveId(fresh.id);
    } else {
      setDocs(rest);
      if (activeIdRef.current === id)
        setActiveId(rest[Math.min(idx, rest.length - 1)].id);
    }
  }, []);

  const validateImagePath = useCallback(
    (path: string) => {
      if (path.length > 0) {
        const extension = path.split(".").pop()?.toLowerCase() as ImageFormat;
        if (!VALID_IMAGE_FORMATS.includes(extension)) {
          toast({
            title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
            description: t("ERRORS.INVALID_IMAGE_ERROR.DESCRIPTION"),
          });
          resetImagePaths();
        }
      } else {
        resetImagePaths();
      }
    },
    [t, toast, resetImagePaths],
  );

  // Load an image into an image tab: reuse the active image tab, else open a new one.
  const adoptImage = useCallback(
    (path: string, historyLabel?: string) => {
      setCropRect(null);
      setAdjustments(ZERO_ADJUSTMENTS);
      let targetId = activeIdRef.current;
      const cur = docsRef.current.find((d) => d.id === targetId);
      if (!cur || cur.kind !== "image") {
        targetId = `doc-${++docSeqRef.current}`;
        setDocs((ds) => [...ds, newImageDoc(targetId)]);
        setActiveId(targetId);
      }
      setDocs((ds) =>
        ds.map((d) =>
          d.id === targetId && d.kind === "image"
            ? {
                ...d,
                imagePath: path,
                upscaledImagePath: "",
                dimensions: emptyDims(),
              }
            : d,
        ),
      );
      const dirname = getDirectoryFromPath(path);
      if (!FEATURE_FLAGS.APP_STORE_BUILD && !rememberOutputFolder) {
        setOutputPath(dirname);
      }
      validateImagePath(path);
      if (historyLabel) pushHistory(historyLabel);
    },
    [
      rememberOutputFolder,
      setOutputPath,
      validateImagePath,
      pushHistory,
      setCropRect,
      setAdjustments,
    ],
  );

  const selectImage = useCallback(async () => {
    const path = await window.electron.invoke(ELECTRON_COMMANDS.SELECT_FILE);
    if (path === null) return;
    logit("🖼 Selected Image Path: ", path);
    adoptImage(path, `Open ${getFilenameFromPath(path)}`);
  }, [adoptImage, logit]);

  // Open a folder as its own tab, listing all its images in the batch queue.
  const openFolderTab = useCallback(
    async (path: string) => {
      const images: string[] = await window.electron.invoke(
        ELECTRON_COMMANDS.LIST_FOLDER_IMAGES,
        path,
      );
      const id = `doc-${++docSeqRef.current}`;
      const meta = `${settingsRef.current.scale}×`;
      const items: QueueItem[] = (images || []).map((p, i) => ({
        id: `${id}-${i}`,
        path: p,
        name: getFilenameFromPath(p),
        meta,
        status: "queued" as const,
        pct: 0,
      }));
      setDocs((ds) => [...ds, { id, kind: "folder", folderPath: path, items }]);
      setActiveId(id);
      setUpscaledBatchFolderPath("");
      if (!rememberOutputFolder) setOutputPath(path);
      pushHistory(`Open folder ${getFilenameFromPath(path)} (${items.length})`);
      if (items.length === 0)
        toast({ description: "No supported images found in that folder." });
    },
    [rememberOutputFolder, setOutputPath, pushHistory, toast],
  );

  const selectFolder = useCallback(async () => {
    const path = await window.electron.invoke(ELECTRON_COMMANDS.SELECT_FOLDER);
    if (path === null) return;
    await openFolderTab(path);
  }, [openFolderTab]);

  const selectOutput = useCallback(async () => {
    const path = await window.electron.invoke(ELECTRON_COMMANDS.SELECT_FOLDER);
    setOutputPath(path !== null ? path : null);
  }, [setOutputPath]);

  const openOutputFolder = useCallback(() => {
    const target = upscaledBatchFolderPath || outputPath;
    if (target) window.electron.send(ELECTRON_COMMANDS.OPEN_FOLDER, target);
  }, [upscaledBatchFolderPath, outputPath]);

  const pasteFromClipboard = useCallback(async () => {
    if (!outputPath) {
      toast({
        title: t("ERRORS.NO_OUTPUT_FOLDER_ERROR.TITLE"),
        description: t("ERRORS.NO_OUTPUT_FOLDER_ERROR.DESCRIPTION"),
      });
      return;
    }
    try {
      const items = await (navigator.clipboard as any).read();
      for (const item of items) {
        const type = item.types.find((ty: string) => ty.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        const buf = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++)
          binary += String.fromCharCode(buf[i]);
        const base64 = btoa(binary);
        const stamp = `${Date.now()}`;
        window.electron.send(ELECTRON_COMMANDS.PASTE_IMAGE, {
          name: `.temp-paste-${stamp}.png`,
          path: outputPath,
          extension: "png",
          size: buf.length,
          type: "image",
          encodedBuffer: base64,
        });
        return;
      }
      toast({
        title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.INVALID_IMAGE_ERROR.CLIPBOARD_DESCRIPTION"),
      });
    } catch (e: any) {
      toast({
        title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
        description: e?.message ?? "Clipboard read failed",
      });
    }
  }, [outputPath, t, toast]);

  // ---------------- transforms (client-side, real) ----------------
  const transformLabelRef = useRef<string>("");
  const transform = useCallback(
    async (op: TransformOp) => {
      if (busyRef.current) {
        toast({ description: "A job is running — please wait." });
        return;
      }
      if (!imagePath) {
        toast({
          title: t("ERRORS.NO_IMAGE_ERROR.TITLE"),
          description: t("ERRORS.NO_IMAGE_ERROR.DESCRIPTION"),
        });
        return;
      }
      const dest = outputPath || getDirectoryFromPath(imagePath);
      const labels: Record<string, string> = {
        crop: "Crop selection",
        rotate: op.kind === "rotate" ? `Rotate ${op.deg}°` : "Rotate",
        flipH: "Flip horizontal",
        flipV: "Flip vertical",
        adjust: "Adjustments applied",
      };
      transformLabelRef.current = labels[op.kind] || "Transform";
      setTransformBusy(true);
      try {
        await applyTransform(imagePath, op, dest);
      } catch (e: any) {
        setTransformBusy(false);
        toast({ title: "Transform failed", description: e?.message });
      }
    },
    [imagePath, outputPath, t, toast, setTransformBusy],
  );

  const applyCrop = useCallback(() => {
    if (!cropRect) return;
    transform({ kind: "crop", rect: cropRect });
  }, [cropRect, transform]);

  const applyImageAdjustments = useCallback(() => {
    if (!hasAdjustments(adjustments)) return;
    transform({ kind: "adjust", adj: adjustments });
  }, [adjustments, transform]);

  // ---------------- upscale ----------------
  const buildBaseline = (path: string): ImageUpscaylPayload => {
    const s = settingsRef.current;
    return {
      imagePath: path,
      outputPath: s.outputPath,
      model: s.selectedModelId,
      gpuId: resolveGpuId(s),
      saveImageAs: s.saveImageAs,
      scale: s.scale,
      overwrite: s.overwrite,
      noImageProcessing: s.noImageProcessing,
      compression: s.compression.toString(),
      customWidth: s.customWidth > 0 ? s.customWidth.toString() : null,
      useCustomWidth: s.useCustomWidth,
      tileSize: s.tileSize,
      ttaMode: s.ttaMode,
      copyMetadata: s.copyMetadata,
    } as ImageUpscaylPayload;
  };

  const runUpscayl = useCallback(() => {
    if (busyRef.current) {
      toast({ description: "A job is already running." });
      return;
    }
    const s = settingsRef.current;
    // A folder tab: run its batch queue instead of a single image.
    const activeDoc = docsRef.current.find((d) => d.id === activeIdRef.current);
    if (activeDoc && activeDoc.kind === "folder") {
      startQueueRef.current?.();
      return;
    }
    if (!s.outputPath) {
      toast({ description: t("APP.SCALE_SELECTION.NO_OUTPUT_FOLDER_ALERT") });
      return;
    }
    if (imagePath === "") {
      toast({
        title: t("ERRORS.NO_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.NO_IMAGE_ERROR.DESCRIPTION"),
      });
      return;
    }
    upscaleDocIdRef.current = activeIdRef.current;
    setUpscaledImagePath("");
    setProgress(t("APP.PROGRESS.WAIT_TITLE"));
    if (s.doubleUpscayl) {
      const p = buildBaseline(imagePath);
      const { overwrite: _o, ...rest } = p;
      window.electron.send<DoubleUpscaylPayload>(
        ELECTRON_COMMANDS.DOUBLE_UPSCAYL,
        rest as DoubleUpscaylPayload,
      );
      setUserStats((prev) => ({
        ...prev,
        totalUpscayls: prev.totalUpscayls + 1,
        lastUsedAt: Date.now(),
        doubleUpscayls: prev.doubleUpscayls + 1,
        imageUpscayls: prev.imageUpscayls + 1,
      }));
    } else {
      window.electron.send<ImageUpscaylPayload>(
        ELECTRON_COMMANDS.UPSCAYL,
        buildBaseline(imagePath),
      );
      setUserStats((prev) => ({
        ...prev,
        totalUpscayls: prev.totalUpscayls + 1,
        lastUsedAt: Date.now(),
        imageUpscayls: prev.imageUpscayls + 1,
      }));
    }
    pushHistory(`Upscale ${s.scale}× · ${s.selectedModelId}`);
  }, [
    imagePath,
    t,
    toast,
    setProgress,
    setUserStats,
    setUpscaledImagePath,
    pushHistory,
  ]);

  const stop = useCallback(() => {
    window.electron.send(ELECTRON_COMMANDS.STOP);
    queueRunningRef.current = false;
    runningFolderIdRef.current = null;
    currentItemIdRef.current = null;
    setQueueRunning(false);
    setProgress("");
  }, [setProgress, setQueueRunning]);
  stopRef.current = stop;

  // ---------------- batch queue (per-folder-tab, sequential) ----------------
  // Process the next queued item of the running folder tab via the single-image
  // UPSCAYL pipeline (gives per-item progress). Uses refs so the once-registered
  // IPC listeners can drive it.
  const processNextInQueue = useCallback(() => {
    const folderId = runningFolderIdRef.current;
    const folder = docsRef.current.find(
      (d) => d.id === folderId && d.kind === "folder",
    ) as FolderDoc | undefined;
    const next = folder?.items.find((q) => q.status === "queued");
    if (!folder || !next) {
      queueRunningRef.current = false;
      runningFolderIdRef.current = null;
      currentItemIdRef.current = null;
      setQueueRunning(false);
      setProgress("");
      return;
    }
    currentItemIdRef.current = next.id;
    patchFolderItems(folder.id, (items) =>
      items.map((it) =>
        it.id === next.id ? { ...it, status: "running", pct: 0 } : it,
      ),
    );
    setProgress(t("APP.PROGRESS.WAIT_TITLE"));
    window.electron.send<ImageUpscaylPayload>(
      ELECTRON_COMMANDS.UPSCAYL,
      buildBaseline(next.path),
    );
  }, [patchFolderItems, setProgress, setQueueRunning, t]);

  const startQueue = useCallback(() => {
    if (busyRef.current) {
      toast({ description: "A job is already running." });
      return;
    }
    const s = settingsRef.current;
    if (!s.outputPath) {
      toast({ description: t("APP.SCALE_SELECTION.NO_OUTPUT_FOLDER_ALERT") });
      return;
    }
    const folder = docsRef.current.find(
      (d) => d.id === activeIdRef.current && d.kind === "folder",
    ) as FolderDoc | undefined;
    if (!folder || !folder.items.some((q) => q.status === "queued")) return;
    runningFolderIdRef.current = folder.id;
    queueRunningRef.current = true;
    setQueueRunning(true);
    processNextInQueue();
  }, [processNextInQueue, t, toast, setQueueRunning]);
  startQueueRef.current = startQueue;

  const clearDone = useCallback(() => {
    const folder = docsRef.current.find(
      (d) => d.id === activeIdRef.current && d.kind === "folder",
    );
    if (!folder) return;
    patchFolderItems(folder.id, (items) =>
      items.filter((it) => it.status !== "done"),
    );
  }, [patchFolderItems]);

  // "Add to queue" on an image → open its containing folder as a batch tab.
  const addCurrentToQueue = useCallback(() => {
    if (!imagePath) {
      toast({
        title: t("ERRORS.NO_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.NO_IMAGE_ERROR.DESCRIPTION"),
      });
      return;
    }
    openFolderTab(getDirectoryFromPath(imagePath));
  }, [imagePath, openFolderTab, t, toast]);

  // Open an explicit set of image paths (e.g. a multi-drop) as a batch tab.
  const openCollectionTab = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) return;
      const id = `doc-${++docSeqRef.current}`;
      const meta = `${settingsRef.current.scale}×`;
      const items: QueueItem[] = paths.map((p, i) => ({
        id: `${id}-${i}`,
        path: p,
        name: getFilenameFromPath(p),
        meta,
        status: "queued" as const,
        pct: 0,
      }));
      const folderPath = getDirectoryFromPath(paths[0]);
      setDocs((ds) => [...ds, { id, kind: "folder", folderPath, items }]);
      setActiveId(id);
      setUpscaledBatchFolderPath("");
      if (!rememberOutputFolder) setOutputPath(folderPath);
      pushHistory(`Batch ${items.length} images`);
    },
    [rememberOutputFolder, setOutputPath, pushHistory],
  );

  // ---------------- drag & drop / paste (window-level) ----------------
  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      const paths = files.map((f) => (f as any).path as string).filter(Boolean);
      const valid = paths.filter((p) =>
        VALID_IMAGE_FORMATS.includes(
          p.split(".").pop()?.toLowerCase() as ImageFormat,
        ),
      );
      if (valid.length === 0) {
        toast({
          title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
          description: t("ERRORS.INVALID_IMAGE_ERROR.ADDITIONAL_DESCRIPTION"),
        });
        return;
      }
      if (valid.length === 1) {
        adoptImage(valid[0], `Open ${getFilenameFromPath(valid[0])}`);
      } else {
        openCollectionTab(valid);
      }
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onPaste = (e: ClipboardEvent) => {
      const outPath = settingsRef.current.outputPath;
      const file = e.clipboardData?.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      if (!outPath) {
        toast({
          title: t("ERRORS.NO_OUTPUT_FOLDER_ERROR.TITLE"),
          description: t("ERRORS.NO_OUTPUT_FOLDER_ERROR.DESCRIPTION"),
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (!(result instanceof ArrayBuffer)) return;
        const buf = new Uint8Array(result);
        let binary = "";
        for (let i = 0; i < buf.length; i++)
          binary += String.fromCharCode(buf[i]);
        window.electron.send(ELECTRON_COMMANDS.PASTE_IMAGE, {
          name: `.temp-paste-${Date.now()}.png`,
          path: outPath,
          extension: "png",
          size: buf.length,
          type: "image",
          encodedBuffer: btoa(binary),
        });
      };
      reader.readAsArrayBuffer(file);
    };
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("paste", onPaste);
    };
  }, [t, toast, adoptImage, openCollectionTab]);

  // ---------------- IPC listeners (once) ----------------
  useEffect(() => {
    // Track every registration so the effect can unsubscribe. Without this, a
    // remount (HMR, StrictMode) stacks a second set of handlers and each
    // UPSCAYL_DONE advances the batch queue twice.
    const subs: [string, (...args: any[]) => void][] = [];
    const on = (command: string, func: (...args: any[]) => void) => {
      window.electron.on(command, func);
      subs.push([command, func]);
    };

    const handleErrors = (data: string) => {
      if (data.includes("Invalid GPU")) {
        toast({
          title: t("ERRORS.GPU_ERROR.TITLE"),
          description: t("ERRORS.GPU_ERROR.DESCRIPTION", { data }),
          action: (
            <a
              href="https://docs.upscayl.org/"
              target="_blank"
              rel="noreferrer"
            >
              <ToastAction altText={t("ERRORS.OPEN_DOCS_TITLE")}>
                {t("ERRORS.OPEN_DOCS_BUTTON_TITLE")}
              </ToastAction>
            </a>
          ),
        });
        resetImagePaths();
      } else if (data.includes("write") || data.includes("read")) {
        if (settingsRef.current.batchMode) return;
        toast({
          title: t("ERRORS.READ_WRITE_ERROR.TITLE"),
          description: t("ERRORS.READ_WRITE_ERROR.DESCRIPTION", { data }),
        });
        resetImagePaths();
      } else if (data.includes("tile size")) {
        toast({
          title: t("ERRORS.TILE_SIZE_ERROR.TITLE"),
          description: t("ERRORS.TILE_SIZE_ERROR.DESCRIPTION", { data }),
        });
        resetImagePaths();
      } else if (data.includes("uncaughtException")) {
        toast({
          title: t("ERRORS.EXCEPTION_ERROR.TITLE"),
          description: t("ERRORS.EXCEPTION_ERROR.DESCRIPTION"),
        });
        resetImagePaths();
      }
    };

    on(ELECTRON_COMMANDS.LOG, (_: any, data: string) =>
      logit(`🎒 BACKEND: `, data),
    );
    on(ELECTRON_COMMANDS.SCALING_AND_CONVERTING, () =>
      setProgress(t("APP.PROGRESS.PROCESSING_TITLE")),
    );
    on(ELECTRON_COMMANDS.UPSCAYL_WARNING, (_: any, data: string) =>
      toast({ title: t("WARNING.GENERIC_WARNING.TITLE"), description: data }),
    );
    on(ELECTRON_COMMANDS.METADATA_ERROR, (_: any, data: string) =>
      toast({ title: t("ERRORS.METADATA_ERROR.TITLE"), description: data }),
    );
    on(ELECTRON_COMMANDS.UPSCAYL_ERROR, (_: any, data: string) => {
      toast({ title: t("ERRORS.GENERIC_ERROR.TITLE"), description: data });
      if (
        queueRunningRef.current &&
        runningFolderIdRef.current &&
        currentItemIdRef.current
      ) {
        patchFolderItems(runningFolderIdRef.current, (items) =>
          items.map((it) =>
            it.id === currentItemIdRef.current
              ? { ...it, status: "failed" }
              : it,
          ),
        );
        processNextInQueue();
      } else {
        resetImagePaths();
      }
    });

    const extractPct = extractProgressPercent;
    const onProgress = (data: string) => {
      const pct = extractPct(data);
      if (pct) {
        setProgress(pct);
        if (
          queueRunningRef.current &&
          runningFolderIdRef.current &&
          currentItemIdRef.current
        ) {
          const n = parseFloat(pct);
          patchFolderItems(runningFolderIdRef.current, (items) =>
            items.map((it) =>
              it.id === currentItemIdRef.current
                ? { ...it, pct: isNaN(n) ? it.pct : n }
                : it,
            ),
          );
        }
      } else if (data.includes("converting")) {
        setProgress(t("APP.PROGRESS.SCALING_CONVERTING_TITLE"));
      } else if (data.includes("Successful")) {
        setProgress(t("APP.PROGRESS.SUCCESS_TITLE"));
      }
      handleErrors(data);
    };
    on(ELECTRON_COMMANDS.UPSCAYL_PROGRESS, (_: any, d: string) =>
      onProgress(d),
    );
    on(ELECTRON_COMMANDS.FOLDER_UPSCAYL_PROGRESS, (_: any, data: string) => {
      if (data.includes("Successful"))
        setProgress(t("APP.PROGRESS.SUCCESS_TITLE"));
      const pct = extractPct(data);
      if (pct) setProgress(pct);
      handleErrors(data);
    });
    on(ELECTRON_COMMANDS.DOUBLE_UPSCAYL_PROGRESS, (_: any, data: string) => {
      const pct = extractPct(data);
      if (pct) {
        if (parseFloat(pct) === 0) setDoubleUpscaylCounter((c) => c + 1);
        setProgress(pct);
      }
      handleErrors(data);
    });

    const bumpStats = () =>
      setUserStats((prev) => ({
        ...prev,
        lastUpscaylDuration: Date.now() - prev.lastUsedAt,
        averageUpscaylTime:
          (prev.averageUpscaylTime * prev.totalUpscayls +
            (Date.now() - prev.lastUsedAt)) /
          (prev.totalUpscayls + 1),
      }));

    on(ELECTRON_COMMANDS.UPSCAYL_DONE, (_: any, data: string) => {
      setProgress("");
      bumpStats();
      if (
        queueRunningRef.current &&
        runningFolderIdRef.current &&
        currentItemIdRef.current
      ) {
        patchFolderItems(runningFolderIdRef.current, (items) =>
          items.map((it) =>
            it.id === currentItemIdRef.current
              ? { ...it, status: "done", pct: 100, output: data }
              : it,
          ),
        );
        processNextInQueue();
      } else {
        patchImageDoc(upscaleDocIdRef.current, { upscaledImagePath: data });
      }
    });
    on(ELECTRON_COMMANDS.FOLDER_UPSCAYL_DONE, (_: any, data: string) => {
      setProgress("");
      setUpscaledBatchFolderPath(data);
      bumpStats();
    });
    on(ELECTRON_COMMANDS.DOUBLE_UPSCAYL_DONE, (_: any, data: string) => {
      setProgress("");
      const target = upscaleDocIdRef.current;
      setTimeout(() => patchImageDoc(target, { upscaledImagePath: data }), 500);
      setDoubleUpscaylCounter(0);
      bumpStats();
    });

    on(ELECTRON_COMMANDS.CUSTOM_MODEL_FILES_LIST, (_: any, data: string[]) =>
      setModelIds(data),
    );

    // clipboard / transform save results share PASTE_IMAGE
    on(
      ELECTRON_COMMANDS.PASTE_IMAGE_SAVE_SUCCESS,
      (_: any, imageFilePath: string) => {
        setTransformBusy(false);
        const label = transformLabelRef.current;
        transformLabelRef.current = "";
        adoptImage(
          imageFilePath,
          label || `Load ${getFilenameFromPath(imageFilePath)}`,
        );
      },
    );
    on(ELECTRON_COMMANDS.PASTE_IMAGE_SAVE_ERROR, (_: any, error: string) => {
      setTransformBusy(false);
      toast({ title: t("ERRORS.NO_IMAGE_ERROR.TITLE"), description: error });
    });

    return () => subs.forEach(([cmd, fn]) => window.electron.off(cmd, fn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the actual adapter name (detected by the upscayl binary) rather than a
  // bare index — including for "Auto", where we resolve the index we'd pick.
  const gpuLabel = useMemo(() => {
    const nameOf = (index: number | string) =>
      gpuList.find((g) => String(g.index) === String(index))?.name;
    if (gpuId) return nameOf(gpuId) || `GPU ${gpuId}`;
    const auto = pickBestGpu(gpuList);
    if (auto != null) return nameOf(auto) || `GPU ${auto}`;
    const g = systemInfo?.gpu as any;
    const name =
      g?.gpuDevice?.[0]?.vendorId != null
        ? undefined
        : g?.auxAttributes?.glRenderer || g?.model;
    return name || systemInfo?.model || "GPU Ready";
  }, [gpuId, gpuList, systemInfo]);

  const ctx: StudioContextValue = {
    imagePath,
    upscaledImagePath,
    dimensions,
    batchFolderPath,
    upscaledBatchFolderPath,
    doubleUpscaylCounter,
    gpuLabel,
    platform: window.electron.platform,
    version,
    tabs: docs.map((d) =>
      d.kind === "folder"
        ? {
            id: d.id,
            kind: "folder" as const,
            name: d.folderPath
              ? getFilenameFromPath(d.folderPath) || "Folder"
              : "Batch",
            count: d.items.length,
            hasImage: false,
            dimensions: emptyDims(),
          }
        : {
            id: d.id,
            kind: "image" as const,
            name: d.imagePath ? getFilenameFromPath(d.imagePath) : "Untitled",
            count: 0,
            hasImage: !!d.imagePath,
            dimensions: d.dimensions,
          },
    ),
    activeId,
    batchMode,
    queueItems,
    queueRunning,
    busy,
    newDocument,
    selectDocument,
    closeDocument,
    selectImage,
    selectFolder,
    selectOutput,
    pasteFromClipboard,
    openOutputFolder,
    reset: resetImagePaths,
    runUpscayl,
    stop,
    transform,
    applyCrop,
    applyAdjustments: applyImageAdjustments,
    addCurrentToQueue,
    startQueue,
    clearDone,
  };

  return (
    <StudioContext.Provider value={ctx}>
      <div
        style={{
          height: "100vh",
          minWidth: 1180,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: C.bg,
          fontFamily: C.sans,
          color: C.text,
        }}
      >
        <TitleBar setDimensions={setDimensions} />
        <Ribbon />
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {showToolRail && <ToolRail />}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <CanvasStage setDimensions={setDimensions} />
            {showBatch && <BatchQueue />}
          </div>
          {showInspector && <Inspector />}
        </div>
        <StatusBar />
      </div>
      <PreferencesDialog />
    </StudioContext.Provider>
  );
};

export default StudioShell;
