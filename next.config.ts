import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "framerusercontent.com", pathname: "/images/**" },
      { protocol: "https", hostname: "**.canalblog.com" },
      { protocol: "https", hostname: "rustyjamesblog.link" },
      { protocol: "https", hostname: "**.blogspot.com" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },
  experimental: {
    agentFeedback: true,
  },
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
