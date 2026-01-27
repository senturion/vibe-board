import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

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

// Disable PWA for Capacitor builds (native shell handles this)
const config = isCapacitorBuild
  ? nextConfig
  : withPWA({
      dest: "public",
      cacheOnFrontEndNav: true,
      aggressiveFrontEndNavCaching: true,
      reloadOnOnline: true,
      disable: process.env.NODE_ENV === "development",
      workboxOptions: {
        disableDevLogs: true,
        importScripts: ["push-sw.js"],
      },
    })(nextConfig);

export default config;
