import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served under kevincho.ca/maplestory as a Next.js Multi-Zone: the portal
  // (kevin-cho/kevincho.ca) rewrites /maplestory/* to this app.
  basePath: "/maplestory",
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
