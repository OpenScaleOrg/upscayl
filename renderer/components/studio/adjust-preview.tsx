"use client";
import { useCallback, useEffect, useRef } from "react";
import { sanitizePath } from "@common/sanitize-path";
import { applyAdjustments, type Adjustments } from "@/lib/adjustments";

// Live, non-destructive preview of the current adjustments, drawn to a canvas
// overlaid on the source image. Capped resolution keeps slider dragging smooth;
// the final full-resolution bake happens in image-transform on "Apply".
const MAX_DIM = 1600;

export default function AdjustPreview({
  srcPath,
  adj,
}: {
  srcPath: string;
  adj: Adjustments;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.naturalWidth) return;
    const scale = Math.min(
      1,
      MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    applyAdjustments(data.data, adj);
    ctx.putImageData(data, 0, 0);
  }, [adj]);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      drawRef.current();
    };
    img.src = "file:///" + sanitizePath(srcPath);
    return () => {
      imgRef.current = null;
    };
  }, [srcPath]);

  useEffect(() => {
    const r = requestAnimationFrame(() => draw());
    return () => cancelAnimationFrame(r);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
      }}
    />
  );
}
