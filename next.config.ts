import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  turbopack: {},
  // Static export for Capacitor builds only
  ...(isCapacitorBuild && {
    output: 'export',
    images: { unoptimized: true },
    trailingSlash: true,
  }),
};

// Service worker (offline caching and reminder notifications), built from
// app/sw.ts. Not used in Capacitor builds, where the native shell handles this.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default isCapacitorBuild ? nextConfig : withSerwist(nextConfig);
