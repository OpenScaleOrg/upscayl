export async function copyMetadata(
  originalFile: string,
  outputFile: string,
): Promise<void> {
  // Imported on demand, never at module load. `exiftool-vendored` builds its
  // singleton (`exports.exiftool = new ExifTool()`) as a side effect of being
  // required, and that probes its own vendored Perl tree inside the app
  // bundle. Under MSIX those reads land in C:\Program Files\WindowsApps and
  // register as the package modifying itself: Windows flips it to
  // "Modified, NeedsRemediation" ~3s in, terminates the app, and refuses to
  // activate it again until reinstall. Three of the app's startup imports
  // reach this file, so the singleton was being built on every launch.
  //
  // Keeping it lazy also drops a spawned Perl process off the startup path.
  const { exiftool } = await import("exiftool-vendored");
  await exiftool.write(
    outputFile,
    {},
    {
      writeArgs: [
        "-overwrite_original_in_place",
        "-tagsFromFile",
        originalFile,
      ],
    },
  );
}
