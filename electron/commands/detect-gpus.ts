import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { execPath, modelsPath } from "../utils/get-resource-paths";
import logit from "../utils/logit";

export type DetectedGpu = { index: number; name: string };

// A valid 1×1 PNG so the binary gets past its input-file check and reaches GPU
// enumeration (with a fake input it exits before enumerating).
const ONE_PX_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64",
);

const GPU_RE = /\[(\d+)\s+([^\]]+?)\]/g;

function parseGpus(stderr: string): DetectedGpu[] {
  const gpus: DetectedGpu[] = [];
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  GPU_RE.lastIndex = 0;
  while ((m = GPU_RE.exec(stderr)) !== null) {
    const index = Number(m[1]);
    if (seen.has(index)) continue;
    seen.add(index);
    gpus.push({ index, name: m[2].trim() });
  }
  return gpus;
}

/**
 * Probe the upscayl binary for the Vulkan GPUs it can see. It prints an
 * enumeration like `[0 AMD Radeon(TM) Graphics] ...` / `[1 NVIDIA GeForce RTX
 * 3060 ...]` to stderr early in a normal run. We feed it a tiny real image and
 * a real model so enumeration prints cleanly, then resolve as soon as the GPU
 * lines appear and kill the process — before it does any (possibly slow) GPU
 * compute. A hard timeout guards against a stalled start.
 */
export default async function detectGpus(): Promise<DetectedGpu[]> {
  const probeIn = path.join(os.tmpdir(), "upscayl-gpu-probe.png");
  const probeOut = path.join(os.tmpdir(), "upscayl-gpu-probe-out.png");
  try {
    fs.writeFileSync(probeIn, new Uint8Array(ONE_PX_PNG));
  } catch {}

  return new Promise((resolve) => {
    let stderr = "";
    let settled = false;
    let softTimer: NodeJS.Timeout | null = null;
    let proc: ReturnType<typeof spawn> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (softTimer) clearTimeout(softTimer);
      try {
        proc?.kill();
      } catch {}
      try {
        fs.unlinkSync(probeIn);
      } catch {}
      try {
        fs.unlinkSync(probeOut);
      } catch {}
      const gpus = parseGpus(stderr);
      logit("🎛️ Detected GPUs: ", JSON.stringify(gpus));
      resolve(gpus);
    };

    try {
      proc = spawn(
        execPath,
        [
          "-i",
          probeIn,
          "-o",
          probeOut,
          "-n",
          "upscayl-standard-4x",
          "-m",
          modelsPath,
        ],
        { detached: false },
      );
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
        // Once the GPU list has printed, wait a short beat to collect all
        // adapters, then finish (kills the process before it starts compute).
        if (!softTimer && parseGpus(stderr).length > 0) {
          softTimer = setTimeout(finish, 400);
        }
      });
      proc.on("close", finish);
      proc.on("error", finish);
      // Hard guard if enumeration never prints.
      setTimeout(finish, 6000);
    } catch {
      finish();
    }
  });
}
