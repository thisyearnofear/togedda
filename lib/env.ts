import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// https://env.t3.gg/docs/nextjs
export const env = createEnv({
  server: {
    // Required server variables
    NEYNAR_API_KEY: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(1).optional(),
    
    // Optional server variables
    REDIS_URL: z.string().optional(),
    REDIS_TOKEN: z.string().optional(),
    WEB3_BIO_API_KEY: z.string().optional(),

    // Backend service URL
    XMTP_BOT_SERVICE_URL: z.string().optional(),
    
    // Fallback service configuration
    ENABLE_WEB3BIO_FALLBACK: z
      .string()
      .transform((val) => val === "true")
      .default("true"),
    ENABLE_ENSDATA_FALLBACK: z
      .string()
      .transform((val) => val === "true")
      .default("true"),
    
    // Database configuration
    DATABASE_URL: z.string().optional(),
    POSTGRES_URL: z.string().optional(),
    
    // Node environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    // Required client variables
    NEXT_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_MINIKIT_PROJECT_ID: z.string().min(1).default("togedda"),

    // Farcaster manifest variables (required for account association)
    NEXT_PUBLIC_FARCASTER_HEADER: z.string().min(1).default("default_header"),
    NEXT_PUBLIC_FARCASTER_PAYLOAD: z.string().min(1).default("default_payload"),
    NEXT_PUBLIC_FARCASTER_SIGNATURE: z.string().min(1).default("default_signature"),
    
    // WalletConnect configuration (optional for web app wallet connections)
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),

    // Neynar configuration (optional for web app Farcaster auth)
    NEXT_PUBLIC_NEYNAR_CLIENT_ID: z.string().optional(),
    
    // Optional client variables
    NEXT_PUBLIC_APP_ENV: z
      .enum(["development", "staging", "production"])
      .default("development"),
    
    // Contract addresses (optional for different environments)
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: z.string().optional(),
    NEXT_PUBLIC_FITNESS_CONTRACT_ADDRESS: z.string().optional(),
    
    // Feature flags
    NEXT_PUBLIC_ENABLE_NOTIFICATIONS: z
      .string()
      .transform((val) => val === "true")
      .default("false"),
    NEXT_PUBLIC_ENABLE_PREDICTIONS: z
      .string()
      .transform((val) => val === "true")
      .default("false"),
    NEXT_PUBLIC_ENABLE_ANALYTICS: z
      .string()
      .transform((val) => val === "true")
      .default("false"),
    
    // Debug settings
    NEXT_PUBLIC_DEBUG_MODE: z
      .string()
      .transform((val) => val === "true")
      .default("false"),
  },
  
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_MINIKIT_PROJECT_ID: process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID,
    NEXT_PUBLIC_FARCASTER_HEADER: process.env.NEXT_PUBLIC_FARCASTER_HEADER,
    NEXT_PUBLIC_FARCASTER_PAYLOAD: process.env.NEXT_PUBLIC_FARCASTER_PAYLOAD,
    NEXT_PUBLIC_FARCASTER_SIGNATURE: process.env.NEXT_PUBLIC_FARCASTER_SIGNATURE,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_NEYNAR_CLIENT_ID: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID,
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS,
    NEXT_PUBLIC_FITNESS_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_FITNESS_CONTRACT_ADDRESS,
    NEXT_PUBLIC_ENABLE_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
    NEXT_PUBLIC_ENABLE_PREDICTIONS: process.env.NEXT_PUBLIC_ENABLE_PREDICTIONS,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE,
  },
  
  // Skip validation for build time
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  
  // Empty string error message
  emptyStringAsUndefined: true,
});

// Export type-safe environment variables
export type Env = typeof env;

// Helper functions for feature flags (client-safe)
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isDebugMode = env.NEXT_PUBLIC_DEBUG_MODE;

// Feature flag helpers
export const features = {
  notifications: env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
  predictions: env.NEXT_PUBLIC_ENABLE_PREDICTIONS,
  analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
} as const;

// Database helper (server-side only)
export function hasDatabase() {
  if (typeof window !== "undefined") return false;
  return !!(env.DATABASE_URL || env.POSTGRES_URL);
}

export function hasRedis() {
  if (typeof window !== "undefined") return false;
  return !!(env.REDIS_URL && env.REDIS_TOKEN);
}