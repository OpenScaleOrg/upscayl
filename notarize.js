require("dotenv").config();
const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  // Without these the notarize call throws and takes the whole build down;
  // an unsigned/ad-hoc build is still worth publishing.
  const { APPLEID, APPLEIDPASS, TEAMID } = process.env;
  if (!APPLEID || !APPLEIDPASS || !TEAMID) {
    console.log(
      "  • skipped notarization  reason=APPLEID/APPLEIDPASS/TEAMID not set",
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: "org.openscale.UpscaylStudio",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: APPLEID,
    appleIdPassword: APPLEIDPASS,
    teamId: TEAMID,
  });
};
