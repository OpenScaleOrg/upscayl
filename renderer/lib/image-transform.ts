import { sanitizePath } from "@common/sanitize-path";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import { cropRectToPixels, type CropRect } from "@/lib/crop";
import { applyAdjustments, type Adjustments } from "@/lib/adjustments";

export type TransformOp =
  | { kind: "crop"; rect: CropRect }
  | { kind: "rotate"; deg: 90 | -90 }
  | { kind: "flipH" }
  | { kind: "flipV" }
  | { kind: "adjust"; adj: Adjustments };

function loadImage(srcPath: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for transform"));
    img.src = "file:///" + sanitizePath(srcPath);
  });
}

function render(img: HTMLImageElement, op: TransformOp): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  if (op.kind === "crop") {
    const { sx, sy, sw, sh } = cropRectToPixels(op.rect, w, h);
    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  } else if (op.kind === "rotate") {
    canvas.width = h;
    canvas.height = w;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((op.deg * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2);
  } else if (op.kind === "adjust") {
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    applyAdjustments(imageData.data, op.adj);
    ctx.putImageData(imageData, 0, 0);
  } else {
    canvas.width = w;
    canvas.height = h;
    ctx.translate(op.kind === "flipH" ? w : 0, op.kind === "flipV" ? h : 0);
    ctx.scale(op.kind === "flipH" ? -1 : 1, op.kind === "flipV" ? -1 : 1);
    ctx.drawImage(img, 0, 0);
  }
  return canvas;
}

/**
 * Apply a single client-side transform to the source image and persist the
 * result to `destFolder` via the PASTE_IMAGE IPC (which writes the buffer and
 * replies on PASTE_IMAGE_SAVE_SUCCESS with the saved path). The caller's
 * PASTE_IMAGE_SAVE_SUCCESS listener then adopts the new path as the source.
 */
export async function applyTransform(
  srcPath: string,
  op: TransformOp,
  destFolder: string,
): Promise<void> {
  const img = await loadImage(srcPath);
  const canvas = render(img, op);
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const now = new Date();
  const stamp = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`;
  const name = `.temp-${op.kind}-${stamp}.png`;
  window.electron.send(ELECTRON_COMMANDS.PASTE_IMAGE, {
    name,
    path: destFolder,
    extension: "png",
    size: base64.length,
    type: "image",
    encodedBuffer: base64,
  });
}
