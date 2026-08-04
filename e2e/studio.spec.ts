import { test, expect, _electron as electron } from "@playwright/test";
import type { ElectronApplication, Page } from "playwright";
import path from "path";

// These tests exercise the Studio UI end-to-end without touching the AI engine
// (no GPU / upscayl-bin needed): layout, menus, tools, panels, preferences.

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, "..", "export", "electron", "index.js")],
    // Force the production path so the app loads the static `renderer/out`
    // export instead of expecting a Next dev server on :8000.
    env: {
      ...process.env,
      ELECTRON_IS_DEV: "0",
      NODE_ENV: "production",
    },
    timeout: 60_000,
  });
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  // wait past the mount gate until the Studio chrome is rendered
  await page.waitForSelector("text=OpenScayl", { timeout: 45_000 });
});

test.afterAll(async () => {
  await app?.close();
});

test("title bar shows the brand and menu bar", async () => {
  await expect(page.getByText("OpenScayl")).toBeVisible();
  // Menu labels unique to the title bar (the responsive ribbon may render its
  // own "View"/"Source" collapse buttons, so those are excluded here).
  for (const label of ["File", "Edit", "Image", "Enhance", "Batch"]) {
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
});

test("ribbon renders its section groups", async () => {
  await expect(page.getByText("SOURCE", { exact: true })).toBeVisible();
  await expect(
    page.getByText("ENHANCEMENT ENGINE", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("PROCESS", { exact: true })).toBeVisible();
});

test("empty canvas prompts to import an image", async () => {
  await expect(page.getByText("Drop an image here")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import Image" }),
  ).toBeVisible();
});

test("the + button adds a new document tab (does not replace)", async () => {
  const untitled = page.getByText("Untitled", { exact: true });
  const before = await untitled.count();
  await page.getByRole("button", { name: "New tab" }).click();
  await expect(page.getByText("Untitled", { exact: true })).toHaveCount(
    before + 1,
  );
});

test("File menu opens and lists import actions", async () => {
  await page.getByRole("button", { name: "File", exact: true }).click();
  await expect(page.getByText("Import Images…")).toBeVisible();
  await expect(page.getByText("Paste from Clipboard")).toBeVisible();
  // close the menu
  await page.keyboard.press("Escape").catch(() => {});
  await page.mouse.click(600, 400);
});

test("Inspector tabs are present and switchable", async () => {
  for (const t of ["Model", "Adjust", "Info", "History"]) {
    await expect(
      page.getByRole("button", { name: t, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await expect(page.getByText("IMAGE ADJUSTMENTS")).toBeVisible();
  await expect(page.getByText("Exposure")).toBeVisible();
  await expect(page.getByText("Clarity")).toBeVisible();
  await expect(page.getByText("GEOMETRY")).toBeVisible();
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect(page.getByText("SESSION STATS")).toBeVisible();
});

test("Window menu can hide the Inspector", async () => {
  // Use the inspector's own "History" tab as a presence marker (independent of
  // which inspector tab a previous test left active).
  const marker = page.getByRole("button", { name: "History", exact: true });
  await expect(marker).toBeVisible();
  await page.getByRole("button", { name: "Window", exact: true }).click();
  await page.getByText("Hide Inspector").click();
  await expect(marker).toHaveCount(0);
  // restore
  await page.getByRole("button", { name: "Window", exact: true }).click();
  await page.getByText("Show Inspector").click();
  await expect(marker).toBeVisible();
});

test("Preferences dialog opens from the Edit menu", async () => {
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByText("Preferences…").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Preferences", { exact: true })).toBeVisible();
});
