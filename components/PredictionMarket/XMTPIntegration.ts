/**
 * XMTPIntegration.ts
 * This file provides frontend utilities for XMTP integration.
 *
 * IMPORTANT: The XMTP Node SDK (@xmtp/node-sdk) is server-side only and cannot be used in Next.js frontend.
 * This file provides frontend utilities and API endpoints for communicating with the backend bot service.
 *
 * The actual XMTP bot logic is in lib/services/ai-bot-service.ts (server-side only).
 */

// Frontend utilities for XMTP bot communication

/**
 * Frontend API utilities for XMTP bot communication
 */

/**
 * Send a message to the AI bot via API endpoint
 * @param message The message to send to the bot
 * @param userAddress The user's wallet address
 * @param conversationId Optional conversation ID for maintaining context
 * @returns Promise with the bot's response
 */
export async function sendMessageToBot(message: string, userAddress: string, conversationId?: string): Promise<string> {
  try {
    const response = await fetch('/api/xmtp/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userAddress,
        conversationId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || 'Bot is currently unavailable. Please try again later.';
  } catch (error) {
    console.error('❌ Error sending message to bot:', error);
    throw new Error('Failed to send message to bot. Please try again.');
  }
}

import { isDevelopment } from '@/lib/env';

/**
 * Get bot status and information
 * @returns Promise with bot status
 */
export async function getBotStatus(): Promise<{ online: boolean; address: string; environment: string }> {
  if (isDevelopment) {
    console.log("Skipping bot status check in development mode.");
    return {
      online: false,
      address: 'Unknown',
      environment: 'development'
    };
  }
  try {
    const response = await fetch('/api/xmtp/bot-status');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error getting bot status:', error);
    return {
      online: false,
      address: 'Unknown',
      environment: 'Unknown'
    };
  }
}

/**
 * Start a conversation with the AI bot
 * @param userAddress The user's wallet address
 * @returns Promise with conversation details
 */
export async function startBotConversation(userAddress: string): Promise<{ conversationId: string; botAddress: string }> {
  try {
    const response = await fetch('/api/xmtp/start-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error starting bot conversation:', error);
    throw new Error('Failed to start conversation with bot. Please try again.');
  }
}

/**
 * The XMTP address for the AI prediction bot.
 * This is retrieved from the backend API.
 */
export const PREDICTION_BOT_XMTP_ADDRESS = '0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c';

/**
 * Get conversation history with the bot
 * @param userAddress The user's wallet address
 * @returns Promise with conversation history
 */
export async function getConversationHistory(userAddress: string): Promise<Array<{ sender: string; content: string; timestamp: Date }>> {
  try {
    const response = await fetch(`/api/xmtp/conversation-history?userAddress=${encodeURIComponent(userAddress)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    return [];
  }
}

/**
 * Note: This frontend integration communicates with the XMTP bot via API endpoints.
 *
 * The actual XMTP V3 Node SDK integration is in:
 * - lib/services/ai-bot-service.ts (server-side bot logic)
 * - pages/api/xmtp/* (API endpoints for frontend communication)
 *
 * Frontend responsibilities:
 * - Send messages to bot via API
 * - Display conversation history
 * - Handle user interactions
 *
 * Backend responsibilities:
 * - XMTP client initialization and management
 * - Real-time message streaming
 * - AI integration and prediction processing
 * - Smart contract interactions
 */
