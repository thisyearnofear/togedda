import createJiti from "jiti";
import { fileURLToPath } from "node:url";
const jiti = createJiti(fileURLToPath(import.meta.url));

// Import env here to validate during build. Using jiti@^1 we can import .ts files :)
jiti("./lib/env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Ensure .well-known directory is accessible
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
  // Add rewrites to ensure manifest files are accessible
  async rewrites() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination: "/api/manifest/farcaster",
      },
      {
        source: "/.well-known/farcaster/manifest.json",
        destination: "/api/manifest/farcaster",
      },
    ];
  },
};

export default nextConfig;
