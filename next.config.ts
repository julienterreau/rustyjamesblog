import { withPayload } from "@payloadcms/next/withPayload";
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
    ],
  },
  experimental: {
    agentFeedback: true,
  },
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

const payloadConfig = withPayload(nextConfig);

export default {
  ...payloadConfig,
  headers: async () => {
    const headers = (await payloadConfig.headers?.()) ?? [];
    return headers.map((item) => ({
      ...item,
      headers: item.headers.filter((header) => header.key !== "Accept-CH" && header.key !== "Critical-CH"),
    }));
  },
};
