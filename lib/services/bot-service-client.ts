/**
 * Bot Service Client
 * Handles communication with the Northflank-deployed XMTP bot service
 */

import { env } from './env';

// Default to local development, but use Hetzner VPS in production
const BOT_SERVICE_URL = env.XMTP_BOT_SERVICE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://157.180.36.156:3001' // Your Hetzner VPS
    : 'http://localhost:3001');

export interface BotServiceResponse {
  response: string;
  botAddress: string;
  timestamp: string;
  source: string;
  conversationId?: string;
}

export interface BotStatusResponse {
  online: boolean;
  address: string;
  environment: string;
  redisStatus: string;
  dbStatus: string;
  processingMode: string;
  lastUpdated: string;
}

/**
 * Send a message to the XMTP bot service
 */
export async function sendMessageToBot(
  userAddress: string,
  message: string,
  conversationId?: string,
  context?: any
): Promise<BotServiceResponse> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress,
        message,
        conversationId,
        context
      }),
    });

    if (!response.ok) {
      throw new Error(`Bot service error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error communicating with bot service:', error);
    throw error;
  }
}

/**
 * Get bot status from the service
 */
export async function getBotStatus(): Promise<BotStatusResponse> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bot service error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting bot status:', error);
    throw error;
  }
}

/**
 * Get conversation history from the bot service
 */
export async function getConversationHistory(
  userAddress: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/conversation-history?userAddress=${userAddress}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bot service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Health check for the bot service
 */
export async function checkBotServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${BOT_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Bot service health check failed:', error);
    return false;
  }
}

/**
 * Create a prediction via the bot service
 */
export async function createPredictionViaBot(predictionData: any): Promise<any> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/create-prediction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(predictionData),
    });

    if (!response.ok) {
      throw new Error(`Bot service error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating prediction via bot service:', error);
    throw error;
  }
}

/**
 * Get the bot service URL (useful for debugging)
 */
export function getBotServiceUrl(): string {
  return BOT_SERVICE_URL;
}
