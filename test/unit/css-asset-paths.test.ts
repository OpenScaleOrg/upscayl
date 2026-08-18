import { describe, it, expect } from "vitest";
const {
  rewriteCssAssetUrls,
} = require("../../scripts/fix-export-asset-paths.js");

// The stylesheet lives at out/_next/static/css/, so it must climb three levels
// before re-entering _next/.
const PREFIX = "../../..";

describe("rewriteCssAssetUrls", () => {
  it("repoints a bare _next url at the export root", () => {
    expect(
      rewriteCssAssetUrls(
        "@font-face{src:url(_next/static/media/Poppins-Regular.4b4ebe20.ttf)}",
        PREFIX,
      ),
    ).toBe(
      "@font-face{src:url(../../../_next/static/media/Poppins-Regular.4b4ebe20.ttf)}",
    );
  });

  it("handles ./ and / prefixed forms and keeps quotes", () => {
    expect(
      rewriteCssAssetUrls("a{background:url('./_next/x.png')}", PREFIX),
    ).toBe("a{background:url('../../../_next/x.png')}");
    expect(
      rewriteCssAssetUrls('a{background:url("/_next/x.png")}', PREFIX),
    ).toBe('a{background:url("../../../_next/x.png")}');
  });

  it("leaves data: uris and non-_next urls alone", () => {
    const css =
      "a{background:url(data:image/png;base64,AAAA)}b{src:url(fonts/x.woff)}";
    expect(rewriteCssAssetUrls(css, PREFIX)).toBe(css);
  });

  it("is idempotent — a second pass changes nothing", () => {
    const once = rewriteCssAssetUrls(
      "a{src:url(_next/static/media/x.ttf)}",
      PREFIX,
    );
    expect(rewriteCssAssetUrls(once, PREFIX)).toBe(once);
  });
});
