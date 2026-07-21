import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Minimal config - keeping it simple for the template
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
