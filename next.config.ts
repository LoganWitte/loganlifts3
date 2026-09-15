import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "loganlifts.app",
      },
      {
        protocol: "https",
        // Allows profile images from Google OAuth provider
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        // Allows profile images from GitHub OAuth provider
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;