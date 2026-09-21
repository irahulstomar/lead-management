import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev overlay badge sits on top of the sidebar user row, and this app is
  // screen-recorded straight from the dev server.
  devIndicators: false,
};

export default nextConfig;
