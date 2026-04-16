import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ['preview-chat-3aec7ebf-1693-4734-8cb4-890fa3169962.space.z.ai'],
};

export default nextConfig;
