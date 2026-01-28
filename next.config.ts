import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, "src/visual-edits/component-tagger-loader.js");

const nextConfig: NextConfig = {
  // Recommended for catching issues early
  reactStrictMode: true,



  // Image remote patterns — narrow these if possible for better security
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" }
    ],
  },

  // Security Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Fail the build on type errors / lint errors (preferred on Vercel)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
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

  // produces a standalone server build artifact (helpful for non-Vercel hosts).
  output: "standalone",
};

export default nextConfig;
