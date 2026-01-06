import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow large file uploads (500MB)
  serverComponentsExternalPackages: ['cloudinary'],
  // Configure server to handle larger bodies
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
