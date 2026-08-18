const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Vulkan is what breaks the MSIX build. A packaged (MSIX) process enforces a
// DLL signing level, and `vulkan-1.dll` shipped by Electron does not meet it:
//
//   CodeIntegrity 3033: process (...\app\Upscayl Studio.exe) attempted to load
//   ...\app\vulkan-1.dll that did not meet the Microsoft signing level
//   requirements.
//
// Windows then marks the whole package "Modified, NeedsRemediation", kills the
// app ~3s after launch, and refuses to activate it again until reinstall -
// the "starts and closes, then never opens" loop. Signing the DLL yourself
// does NOT help: only the Store's own signature reaches that level.
//
// Chromium uses D3D11/ANGLE on Windows, so dropping the Vulkan loader and its
// SwiftShader ICD costs nothing here. Only done for AppX/MSIX - the NSIS build
// keeps them, so the software rasterizer fallback stays available there.
const VULKAN_FILES = [
  "vulkan-1.dll",
  "vk_swiftshader.dll",
  "vk_swiftshader_icd.json",
];

function stripVulkanForMsix(context) {
  // win.target no longer includes appx, so this only fires via `dist:appx`.
  if (!context.targets?.some((t) => t.name === "appx")) return;

  for (const name of VULKAN_FILES) {
    const file = path.join(context.appOutDir, name);
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`  • removed for MSIX code integrity  file=${name}`);
    }
  }
}

// electron-builder skips code signing entirely when no Developer ID is
// available, and macOS refuses to launch an unsigned .app on Apple Silicon
// ("Upscayl Studio is damaged and can't be opened") - so the DMG installs and
// then does nothing. An ad-hoc signature makes the bundle launchable once the
// user clears quarantine; it is NOT a substitute for notarization.
//
// ponytail: --deep is deprecated by Apple but is the one-liner that covers the
// nested helpers/frameworks. Drop this once CSC_LINK is set.
function adhocSignMac(context) {
  if (
    process.env.CSC_LINK ||
    process.env.CSC_IDENTITY_AUTO_DISCOVERY !== "false"
  ) {
    return;
  }
  const app = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  console.log(`  • ad-hoc signing (no Developer ID)  file=${app}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], {
    stdio: "inherit",
  });
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName === "win32") stripVulkanForMsix(context);
  if (context.electronPlatformName === "darwin") adhocSignMac(context);
};
