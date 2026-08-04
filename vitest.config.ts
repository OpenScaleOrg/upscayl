import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "renderer"),
      "@common": resolve(__dirname, "common"),
      "@electron": resolve(__dirname, "electron"),
    },
  },
});
