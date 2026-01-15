import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['cloudinary'],
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
