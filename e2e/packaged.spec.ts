import { test, expect, _electron as electron } from "@playwright/test";
import type { ElectronApplication } from "playwright";
import fs from "fs";
import path from "path";

// studio.spec.ts drives `export/electron/index.js` straight from the source
// tree, so it never sees what packaging does to the app: the asar layout, the
// file:// asset paths, extraFiles placement. Every "it installs but the window
// is blank / never opens" bug has lived in exactly that gap.
//
// This spec launches the *real packaged binary* from dist/ and asserts it
// boots. Build it first with `npm run pack-app` (or any `dist:*` target);
// the suite skips itself when dist/ has not been populated.

const root = path.join(__dirname, "..");

function packagedBinary(): string | null {
  const candidates: Record<string, string[]> = {
    win32: ["dist/win-unpacked/Upscayl Studio.exe"],
    darwin: [
      "dist/mac-universal/Upscayl Studio.app/Contents/MacOS/Upscayl Studio",
      "dist/mac-arm64/Upscayl Studio.app/Contents/MacOS/Upscayl Studio",
      "dist/mac/Upscayl Studio.app/Contents/MacOS/Upscayl Studio",
    ],
    linux: ["dist/linux-unpacked/upscayl-studio"],
  };
  for (const rel of candidates[process.platform] ?? []) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

const executablePath = packagedBinary();

test.describe("packaged build", () => {
  test.skip(
    !executablePath,
    "no packaged app in dist/ — run `npm run pack-app` first",
  );

  let app: ElectronApplication;
  const failedLoads: string[] = [];

  test.beforeAll(async () => {
    // VS Code's extension host leaks ELECTRON_RUN_AS_NODE=1 into child
    // environments; with it set the binary runs as plain Node and exits
    // instantly with no window, which reads as "the packaged app is broken".
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    app = await electron.launch({
      executablePath: executablePath!,
      // Keep the test off the user's real settings/logs directory.
      args: [`--user-data-dir=${path.join(root, "dist", ".e2e-userdata")}`],
      env,
      timeout: 60_000,
    });
  });

  test.afterAll(async () => {
    await app?.close();
  });

  test("boots, opens a window, and loads every renderer asset", async () => {
    const page = await app.firstWindow();

    // A packaged app with broken asset paths still opens a window — it is just
    // blank — so collect load failures rather than trusting "a window exists".
    page.on("requestfailed", (req) =>
      failedLoads.push(`${req.failure()?.errorText} ${req.url()}`),
    );
    page.on("pageerror", (err) =>
      failedLoads.push(`pageerror: ${err.message}`),
    );

    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Upscayl Studio", { timeout: 45_000 });

    expect(await page.title()).not.toBe("");
    expect(failedLoads).toEqual([]);
  });

  test("ships upscayl-bin and the models beside the asar", () => {
    // extraFiles land next to the asar, not inside it. If that mapping breaks
    // the app still starts and only fails once the user hits Upscale.
    const resources =
      process.platform === "darwin"
        ? path.resolve(path.dirname(executablePath!), "..", "Resources")
        : path.join(path.dirname(executablePath!), "resources");

    const bin = path.join(
      resources,
      "bin",
      process.platform === "win32" ? "upscayl-bin.exe" : "upscayl-bin",
    );
    const models = path.join(resources, "models");

    expect(fs.existsSync(bin), `missing engine binary at ${bin}`).toBe(true);
    expect(
      fs.existsSync(models) ? fs.readdirSync(models).length : 0,
      `no models at ${models}`,
    ).toBeGreaterThan(0);
  });
});
