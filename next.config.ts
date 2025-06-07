import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  distDir: "dist",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      "https://6000-firebase-studio-1748973252551.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev",
    ],
  },
};

export default nextConfig;
