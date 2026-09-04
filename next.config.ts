import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Profile photos are uploaded through a server action; the default 1 MB body limit is too small for a phone photo.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
