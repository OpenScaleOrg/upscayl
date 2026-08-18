const fs = require("fs");
const path = require("path");

// next.config.js sets assetPrefix "." so the static export works over file://,
// where root-absolute /_next/... would resolve to the filesystem root. That is
// right for index.html's <script>/<link> tags, which resolve against the page.
// It is wrong for url() inside a stylesheet, which resolves against the
// *stylesheet's own folder*: `url(_next/static/media/Poppins.ttf)` sitting in
// _next/static/css/app.css asks for _next/static/css/_next/static/media/... and
// 404s. Result: every packaged build silently lost its fonts.
//
// Next has one assetPrefix for both cases, so rewrite the CSS after export.
//
// ponytail: post-export rewrite. The alternative is serving renderer/out over a
// custom app:// scheme and dropping assetPrefix entirely - more moving parts
// than this deserves until something other than CSS breaks.

/** Rewrite `url(_next/...)` so it resolves from the stylesheet's own folder. */
function rewriteCssAssetUrls(css, prefix) {
  return css.replace(
    /url\((['"]?)(?:\.?\/)?_next\//g,
    `url($1${prefix}/_next/`,
  );
}

function main() {
  const outDir = path.join(__dirname, "..", "renderer", "out");
  const cssDir = path.join(outDir, "_next", "static", "css");
  if (!fs.existsSync(cssDir)) {
    console.error(
      `No export at ${cssDir} — run \`next build renderer\` first.`,
    );
    process.exit(1);
  }

  // Depth is derived, not hardcoded, so a future Next layout change can't
  // silently reintroduce the bug.
  const prefix = path.relative(cssDir, outDir).split(path.sep).join("/") || ".";

  let patched = 0;
  for (const name of fs.readdirSync(cssDir).filter((f) => f.endsWith(".css"))) {
    const file = path.join(cssDir, name);
    const css = fs.readFileSync(file, "utf8");
    const fixed = rewriteCssAssetUrls(css, prefix);
    if (fixed !== css) {
      fs.writeFileSync(file, fixed);
      patched++;
    }
  }
  console.log(
    `Rewrote _next asset urls in ${patched} stylesheet(s) to "${prefix}/_next/".`,
  );
}

if (require.main === module) main();

module.exports = { rewriteCssAssetUrls };
