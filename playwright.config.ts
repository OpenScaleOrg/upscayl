import { defineConfig } from "@playwright/test";

// End-to-end tests drive the real Electron build. Run `npm run build` first so
// `export/electron/index.js` and `renderer/out/` exist.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
});
