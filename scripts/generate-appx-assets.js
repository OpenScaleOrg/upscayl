const path = require("path");
const sharp = require("sharp");

const srcIcon = path.join(__dirname, "..", "build", "icon.png");
const outDir = path.join(__dirname, "..", "build", "appx");

async function square(size, outFile) {
  await sharp(srcIcon)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, outFile));
}

async function wideTile(outFile) {
  const logoSize = 120;
  const logo = await sharp(srcIcon).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: {
      width: 310,
      height: 150,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: logo,
        left: Math.round((310 - logoSize) / 2),
        top: Math.round((150 - logoSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(outDir, outFile));
}

async function main() {
  await require("fs").promises.mkdir(outDir, { recursive: true });
  await square(50, "StoreLogo.png");
  await square(44, "Square44x44Logo.png");
  await square(150, "Square150x150Logo.png");
  await wideTile("Wide310x150Logo.png");
  console.log("Generated AppX tile assets in build/appx/");
}

main();
