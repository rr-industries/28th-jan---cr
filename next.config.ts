import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, "src/visual-edits/component-tagger-loader.js");

const nextConfig: NextConfig = {
  // Recommended for catching issues early
  reactStrictMode: true,

  // Use SWC minifier for smaller builds
  swcMinify: true,

  // Keep browser source maps out of production bundles by default
  productionBrowserSourceMaps: false,

  // Image remote patterns — narrow these if possible for better security
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "**" }
    ],
  },

  // Fail the build on type errors / lint errors (preferred on Vercel)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Native/server packages that should remain external to the client bundle
  serverExternalPackages: ["better-auth", "bcrypt"],

  // Register your custom loader (adjust `test`/`use` to match your loader's target)
  webpack: (config, { isServer }) => {
    if (LOADER) {
      config.module = config.module || { rules: [] };
      config.module.rules.push({
        test: /\.tagger\.js$/, // change to match files your loader should handle
        use: LOADER,
      } as any);
    }
    return config;
  },

  // Optional: produces a standalone server build artifact (helpful for non-Vercel hosts).
  // Vercel does not strictly require this; remove if you prefer Vercel defaults.
  output: "standalone",
};

export default nextConfig;
