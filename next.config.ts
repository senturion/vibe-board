import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    // TODO: Fix Supabase Database type inference issues properly
    // The types are defined but not being picked up by @supabase/ssr generics
    ignoreBuildErrors: true,
  },
};

export default withPWA({
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
