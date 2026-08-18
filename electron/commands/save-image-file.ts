import fs from "fs";
import path from "path";
import logit from "../utils/logit";

export interface SaveImageFileParameters {
  /** Destination folder — created (recursively) if it does not exist. */
  folder: string;
  /** File name only; any directory part is stripped. */
  name: string;
  encodedBuffer: string;
}

/**
 * Write a base64 image buffer to disk and return the saved path. Unlike
 * PASTE_IMAGE this is `invoke`-based and does not tell the renderer to adopt
 * the file as the new document — callers that save many files (the Split tool)
 * just await each write.
 */
const saveImageFile = async (
  _event: Electron.IpcMainInvokeEvent,
  file: SaveImageFileParameters,
): Promise<string> => {
  if (!file?.folder || !file?.name || !file?.encodedBuffer)
    throw new Error("Invalid save request");
  // basename keeps a crafted name from escaping the chosen folder
  const filePath = path.join(file.folder, path.basename(file.name));
  try {
    await fs.promises.mkdir(file.folder, { recursive: true });
    const buffer = Buffer.from(file.encodedBuffer, "base64");
    await fs.promises.writeFile(filePath, new Uint8Array(buffer));
    return filePath;
  } catch (error: any) {
    logit("💾 Save image file error: ", error.message);
    throw error;
  }
};

export default saveImageFile;
