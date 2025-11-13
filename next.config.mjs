import createJiti from "jiti";
import { fileURLToPath } from "node:url";
const jiti = createJiti(fileURLToPath(import.meta.url));

// Import env here to validate during build. Using jiti@^1 we can import .ts files :)
jiti("./lib/env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize images with enhanced configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enhanced headers for security and caching
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/:path*.(ico|png|jpg|jpeg|gif|webp|svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.(js|css|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Handle XMTP node modules for browser compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:module": false,
        "node:path": false,
        "node:process": false,
        "node:fs": false,
        "node:crypto": false,
        "node:stream": false,
        "node:util": false,
        "node:buffer": false,
        "node:url": false,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        url: false,
        module: false,
        process: false,
      };

      // Exclude server-side XMTP modules from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        "@xmtp/node-sdk": "commonjs @xmtp/node-sdk",
      });
    }

    // Optimize bundle size
    if (!dev && !isServer) {
      // Removed custom splitChunks to restore Next.js defaults and fix RSC chunking issues.
    }

    return config;
  },

  // Turbopack configuration (empty to silence warning)
  turbopack: {},

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["@farcaster/miniapp-sdk", "@coinbase/onchainkit"],
    webVitalsAttribution: ["CLS", "LCP"],
  },

  // Compiler options
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Production optimizations
  distDir: ".next",
  generateEtags: false,
  poweredByHeader: false,
};

export default nextConfig;
