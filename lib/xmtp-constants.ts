/**
 * XMTP Constants and Configuration
 * Centralized constants for XMTP integration to maintain DRY principles
 */

// Default fallback address for development/testing
export const DEFAULT_FALLBACK_ADDRESS = "0x1234567890123456789012345678901234567890";

// XMTP Environment configuration
export const XMTP_ENVIRONMENTS = {
  DEV: 'dev',
  PRODUCTION: 'production', 
  LOCAL: 'local'
} as const;

// Default XMTP environment
export const DEFAULT_XMTP_ENV = XMTP_ENVIRONMENTS.DEV;

// Chat configuration
export const CHAT_CONFIG = {
  // Queue processing intervals
  QUEUE_CHECK_INTERVAL: 2000, // 2 seconds
  STATUS_UPDATE_INTERVAL: 10000, // 10 seconds
  
  // Timeouts
  MESSAGE_TIMEOUT: 10000, // 10 seconds
  INITIALIZATION_TIMEOUT: 5000, // 5 seconds
  
  // Message lifecycle
  MESSAGE_CLEANUP_AGE: 5 * 60 * 1000, // 5 minutes
  
  // UI configuration
  MAX_MESSAGE_LENGTH: 500,
  MESSAGES_PER_PAGE: 50,
} as const;

// Bot configuration
export const BOT_CONFIG = {
  // The XMTP address for the AI prediction bot
  ADDRESS: '0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c',
  
  // AI model configuration
  MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 200,
  TEMPERATURE: 0.7,
  
  // Response patterns
  PREDICTION_KEYWORDS: ['prediction', 'predict', 'forecast', 'bet'],
  CONFIRMATION_KEYWORDS: ['confirm', 'yes', 'approve', 'accept'],
  HELP_KEYWORDS: ['help', 'how', 'what', 'explain'],
} as const;

// Error messages
export const ERROR_MESSAGES = {
  BOT_OFFLINE: "Bot is currently offline. Please check configuration.",
  SEND_FAILED: "Failed to send message. Please try again.",
  INIT_FAILED: "Failed to initialize XMTP client.",
  TIMEOUT: "Request timed out. Please try again.",
  INVALID_ADDRESS: "Invalid wallet address provided.",
  NO_WALLET: "Please connect your wallet to continue.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  XMTP_CONNECTED: "✅ XMTP client connected successfully",
  MESSAGE_SENT: "✅ Message sent successfully",
  PREDICTION_CREATED: "✅ Prediction created successfully",
} as const;

// Chat modes
export const CHAT_MODES = {
  AI_BOT: 'ai_bot',
  COMMUNITY: 'community', 
  MIXED: 'mixed'
} as const;

export type ChatMode = typeof CHAT_MODES[keyof typeof CHAT_MODES];
export type XmtpEnvironment = typeof XMTP_ENVIRONMENTS[keyof typeof XMTP_ENVIRONMENTS];

// API endpoints
export const API_ENDPOINTS = {
  SEND_MESSAGE: '/api/xmtp/send-message',
  BOT_STATUS: '/api/xmtp/bot-status',
  QUEUE_STATUS: '/api/xmtp/queue-status',
  START_CONVERSATION: '/api/xmtp/start-conversation',
} as const;

// Validation patterns
export const VALIDATION = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/,
  ENCRYPTION_KEY: /^[a-fA-F0-9]{64}$/,
} as const;

/**
 * Utility function to validate Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return VALIDATION.ETHEREUM_ADDRESS.test(address);
}

/**
 * Utility function to get environment-specific configuration
 */
export function getXMTPConfig(env: XmtpEnvironment = DEFAULT_XMTP_ENV) {
  return {
    environment: env,
    botAddress: BOT_CONFIG.ADDRESS,
    timeout: CHAT_CONFIG.MESSAGE_TIMEOUT,
    queueInterval: CHAT_CONFIG.QUEUE_CHECK_INTERVAL,
  };
}

/**
 * Utility function to format error messages consistently
 */
export function formatErrorMessage(error: unknown, fallback: string = ERROR_MESSAGES.SEND_FAILED): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}
