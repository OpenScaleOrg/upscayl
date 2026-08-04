import { describe, it, expect } from "vitest";
import getFilenameFromPath from "@common/get-file-name";
import getDirectoryFromPath from "@common/get-directory-from-path";
import { sanitizePath } from "@common/sanitize-path";

describe("getFilenameFromPath", () => {
  it("returns the last segment of a Windows path", () => {
    expect(getFilenameFromPath("C:\\images\\porsche.png")).toBe("porsche.png");
  });
  it("returns the last segment of a POSIX path", () => {
    expect(getFilenameFromPath("/home/user/cat.jpg")).toBe("cat.jpg");
  });
  it("returns empty string for empty input", () => {
    expect(getFilenameFromPath("")).toBe("");
  });
});

describe("getDirectoryFromPath", () => {
  it("drops the filename on Windows paths", () => {
    expect(getDirectoryFromPath("C:\\images\\porsche.png")).toBe("C:\\images");
  });
  it("drops the filename on POSIX paths", () => {
    expect(getDirectoryFromPath("/home/user/cat.jpg")).toBe("/home/user");
  });
});

describe("sanitizePath", () => {
  it("normalizes backslashes to forward slashes", () => {
    expect(sanitizePath("a\\b\\c.png")).toBe("a/b/c.png");
  });
  it("URL-encodes spaces per segment", () => {
    expect(sanitizePath("my folder\\a.png")).toBe("my%20folder/a.png");
  });
  it("URL-encodes special characters per segment", () => {
    expect(sanitizePath("a&b.png")).toBe("a%26b.png");
  });
  it("encodes the drive-letter colon (encodeURIComponent per segment)", () => {
    expect(sanitizePath("C:\\a.png")).toBe("C%3A/a.png");
  });
  it("does not encode the slash separators", () => {
    expect(sanitizePath("/a/b/c.png")).toBe("/a/b/c.png");
  });
});
