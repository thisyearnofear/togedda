import { env, features } from "@/lib/env";
import { supportedChains, chainMetadata } from "./chains";

// Application configuration
export const appConfig = {
  // Basic app info
  name: "Imperfect Form",
  description: "Track fitness goals across multiple blockchain networks with a retro-gamified style",
  version: "0.2.0",
  
  // URLs and endpoints
  baseUrl: env.NEXT_PUBLIC_URL,
  apiUrl: `${env.NEXT_PUBLIC_URL}/api`,
  
  // Farcaster configuration
  farcaster: {
    projectId: env.NEXT_PUBLIC_MINIKIT_PROJECT_ID,
    manifestUrl: `${env.NEXT_PUBLIC_URL}/.well-known/farcaster.json`,
    frameUrl: env.NEXT_PUBLIC_URL,
    notificationProxyUrl: "/api/notification",
    webhookUrl: "https://api.neynar.com/f/app/9c260f93-357a-4952-8090-a03f10e742f4/event",
  },
  
  // Supported blockchain networks
  chains: {
    supported: supportedChains,
    metadata: chainMetadata,
    default: supportedChains[0], // Base as default
  },
  
  // Feature flags
  features: {
    notifications: features.notifications,
    predictions: features.predictions,
    analytics: features.analytics,
    multiChain: true,
    socialSharing: true,
    leaderboards: true,
    streaks: true,
    collectiveGoals: true,
    addressFallbacks: true,
    web3bioFallback: process.env.ENABLE_WEB3BIO_FALLBACK !== "false",
    ensdataFallback: process.env.ENABLE_ENSDATA_FALLBACK !== "false",
  },
  
  // UI Configuration
  ui: {
    theme: "retro-arcade",
    animations: {
      enabled: true,
      duration: {
        fast: 150,
        normal: 300,
        slow: 500,
      },
    },
    responsive: {
      mobile: "max-width: 768px",
      tablet: "max-width: 1024px",
      desktop: "min-width: 1025px",
    },
  },
  
  // Fitness tracking configuration
  fitness: {
    exercises: {
      pushups: {
        name: "Push-ups",
        icon: "💪",
        unit: "reps",
        category: "upper-body",
      },
      squats: {
        name: "Squats",
        icon: "🏋️",
        unit: "reps",
        category: "lower-body",
      },
      // Add more exercises as needed
    },
    goals: {
      dailyMinimum: 10,
      weeklyTarget: 100,
      monthlyChallenge: 500,
    },
    streaks: {
      minDailyActivity: 1,
      maxMissedDays: 1,
    },
  },
  
  // Collective goals configuration
  collectiveGoals: {
    mountOlympus: {
      name: "Mount Olympus",
      description: "Collective push-up challenge",
      target: 100000,
      exercise: "pushups",
    },
    kenyaRun: {
      name: "Kenya Run",
      description: "Collective squat challenge", 
      target: 150000,
      exercise: "squats",
    },
  },
  
  // API configuration
  api: {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
    rateLimit: {
      requests: 100,
      window: 60000, // 1 minute
    },
    addressResolution: {
      maxConcurrent: 5, // Max concurrent address resolution requests
      batchSize: 10, // Batch size for bulk resolution
      fallbackTimeout: 5000, // Timeout for fallback services
      cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
    },
  },
  
  // Cache configuration
  cache: {
    userProfile: 5 * 60 * 1000, // 5 minutes
    leaderboard: 2 * 60 * 1000, // 2 minutes
    collectiveGoals: 1 * 60 * 1000, // 1 minute
    networkData: 30 * 1000, // 30 seconds
  },
  
  // Social configuration
  social: {
    shareText: "Check out my fitness progress on Imperfect Form! 💪",
    hashtags: ["ImperfectForm", "FitnessOnChain", "Web3Fitness"],
  },
  
  // Debug configuration
  debug: {
    enabled: process.env.NODE_ENV === "development" || env.NEXT_PUBLIC_DEBUG_MODE,
    logLevel: process.env.NODE_ENV === "production" ? "error" : "debug",
    showDevTools: process.env.NODE_ENV === "development",
  },
  
  // External services (URLs only - API keys handled server-side)
  services: {
    neynar: {
      baseUrl: "https://api.neynar.com/v2",
      timeout: 10000,
    },
    web3bio: {
      baseUrl: "https://api.web3.bio",
      timeout: 8000,
      enabled: process.env.ENABLE_WEB3BIO_FALLBACK !== "false",
    },
    ensdata: {
      baseUrl: "https://api.ensdata.net",
      timeout: 8000,
      enabled: process.env.ENABLE_ENSDATA_FALLBACK !== "false",
    },
    ens: {
      rpcUrl: "https://eth-mainnet.public.blastapi.io",
      timeout: 10000,
    },
  },
  
  // Error handling
  errors: {
    retryAttempts: 3,
    retryDelay: 1000,
    showUserFriendlyMessages: true,
    logToConsole: process.env.NODE_ENV === "development",
  },
  
  // Performance monitoring
  performance: {
    enableMetrics: process.env.NODE_ENV === "production",
    enableAnalytics: features.analytics,
    sampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  },
} as const;

// Type exports
export type AppConfig = typeof appConfig;
export type Exercise = keyof typeof appConfig.fitness.exercises;
export type CollectiveGoal = keyof typeof appConfig.collectiveGoals;

// Helper functions
export function getExerciseConfig(exercise: Exercise) {
  return appConfig.fitness.exercises[exercise];
}

export function getCollectiveGoalConfig(goal: CollectiveGoal) {
  return appConfig.collectiveGoals[goal];
}

export function isFeatureEnabled(feature: keyof typeof appConfig.features): boolean {
  return appConfig.features[feature];
}

export function getCacheTimeout(key: keyof typeof appConfig.cache): number {
  return appConfig.cache[key];
}

export function getApiConfig() {
  return appConfig.api;
}

export function getDebugConfig() {
  return appConfig.debug;
}