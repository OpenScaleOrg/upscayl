/**
 * @type {import('next').NextConfig}
 **/

const nextConfig = {
  output: "export",
  // Electron loads the export over file://, where root-absolute asset paths
  // (/_next/...) resolve to the filesystem root instead of the app folder and
  // every script/stylesheet 404s into a white window. Relative keeps them
  // alongside index.html.
  assetPrefix: process.env.NODE_ENV === "production" ? "." : undefined,
  images: {
    unoptimized: true,
  },
  experimental: {
    externalDir: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = nextConfig;
