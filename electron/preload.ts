import { ipcRenderer, contextBridge } from "electron";
import {
  getAppVersion,
  getDeviceSpecs,
  getPlatform,
} from "./utils/get-device-specs";

// 'ipcRenderer' will be available in index.js with the method 'window.electron'
contextBridge.exposeInMainWorld("electron", {
  send: (command: string, payload: any) => ipcRenderer.send(command, payload),
  // Register `func` itself, not a wrapper — otherwise `off` can never remove it
  // and every remount leaks another listener.
  on: (command: string, func: (...args: any) => any) =>
    ipcRenderer.on(command, func),
  off: (command: string, func: (...args: any) => any) =>
    ipcRenderer.removeListener(command, func),
  invoke: (command: string, payload: any) =>
    ipcRenderer.invoke(command, payload),
  platform: getPlatform(),
  getSystemInfo: async () => await getDeviceSpecs(),
  getAppVersion: async () => await getAppVersion(),
});
