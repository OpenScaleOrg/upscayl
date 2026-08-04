import fs from "fs";
import path from "path";
import { imageFormats } from "../../common/image-formats";
import logit from "../utils/logit";

/**
 * Return the absolute paths of all supported images directly inside a folder
 * (non-recursive), sorted by name. Used to populate the batch queue when a
 * folder tab is opened.
 */
const listFolderImages = async (
  _event: any,
  folderPath: string,
): Promise<string[]> => {
  if (!folderPath) return [];
  try {
    const entries = await fs.promises.readdir(folderPath, {
      withFileTypes: true,
    });
    const valid = new Set(imageFormats.map((f) => f.toLowerCase()));
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const ext = name.split(".").pop()?.toLowerCase();
        return !!ext && valid.has(ext) && !name.startsWith(".");
      })
      .sort((a, b) => a.localeCompare(b))
      .map((name) => path.join(folderPath, name));
  } catch (error: any) {
    logit("📁 listFolderImages error: ", error?.message);
    return [];
  }
};

export default listFolderImages;
