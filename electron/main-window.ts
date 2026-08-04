import { app, BrowserWindow, shell } from "electron";
import { getPlatform } from "./utils/get-device-specs";
import { join } from "path";
import { ELECTRON_COMMANDS } from "../common/electron-commands";
import { fetchLocalStorage } from "./utils/config-variables";
import electronIsDev from "electron-is-dev";
import { format } from "url";
import { autoUpdater } from "electron-updater";

let mainWindow: BrowserWindow | undefined;

const createMainWindow = () => {
  console.log("📂 DIRNAME", __dirname);
  console.log("🚃 App Path: ", app.getAppPath());

  mainWindow = new BrowserWindow({
    icon: join(app.getAppPath(), "build", "icon.png"),
    width: 1440,
    height: 940,
    minHeight: 560,
    minWidth: 960,
    show: false,
    backgroundColor: "#171717",
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      preload: join(__dirname, "preload.js"),
    },
    // Frameless on Windows/Linux so the Studio renders its own title bar with
    // custom window controls; mac keeps the inset traffic lights.
    frame: getPlatform() === "mac",
    titleBarStyle: getPlatform() === "mac" ? "hiddenInset" : "default",
  });

  const url = electronIsDev
    ? "http://localhost:8000"
    : format({
        pathname: join(__dirname, "../../renderer/out/index.html"),
        protocol: "file:",
        slashes: true,
      });

  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;
    mainWindow.show();
  });

  // Surface renderer console warnings/errors in the dev terminal for debugging.
  if (electronIsDev) {
    mainWindow.webContents.on(
      "console-message",
      (_event, level, message, line, sourceId) => {
        if (level >= 2) {
          console.log(
            `🖥️ RENDERER[${level === 3 ? "error" : "warn"}]: ${message} (${sourceId}:${line})`,
          );
        }
      },
    );
  }

  fetchLocalStorage();

  if (!electronIsDev) {
    console.log("🚀 Checking for updates");
    mainWindow.webContents
      .executeJavaScript('localStorage.getItem("autoUpdate");', true)
      .then((lastSaved: string | null) => {
        if (
          lastSaved === null ||
          lastSaved === undefined ||
          lastSaved === "true"
        ) {
          autoUpdater.checkForUpdates();
        } else {
          console.log("🚀 Auto Update is disabled");
        }
      });
  }

  mainWindow.webContents.send(ELECTRON_COMMANDS.OS, getPlatform());

  mainWindow.setMenuBarVisibility(false);
};

const getMainWindow = () => {
  return mainWindow;
};

export { createMainWindow, getMainWindow };
