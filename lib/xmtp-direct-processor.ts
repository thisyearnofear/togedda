/**
 * Direct XMTP Message Processor
 * Handles message processing when Redis queue is not available
 * Provides immediate AI responses without queue timeouts
 */

import { enhancedMessageStore } from './enhanced-message-store';
import { StoredMessage } from './enhanced-message-store';

export interface DirectProcessorConfig {
  enableLogging: boolean;
  storeMessages: boolean;
  maxResponseTime: number; // milliseconds
}

const DEFAULT_CONFIG: DirectProcessorConfig = {
  enableLogging: true,
  storeMessages: true,
  maxResponseTime: 15000, // 15 seconds
};

/**
 * Process a message directly without queue system
 */
export async function processMessageDirect(
  userAddress: string,
  message: string,
  conversationId?: string,
  context?: any,
  config: Partial<DirectProcessorConfig> = {}
): Promise<{
  response: string;
  source: string;
  conversationId: string;
  messageId?: string;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  if (finalConfig.enableLogging) {
    console.log(`🚀 Processing message directly: "${message.substring(0, 50)}..."`);
  }

  try {
    // Generate conversation ID if not provided
    const finalConversationId = conversationId || `chat_wallet_${userAddress.slice(-8)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check for specific query types first (faster responses)
    const lowerMessage = message.toLowerCase();
    let response: string;
    let source: string;

    // Handle group fitness commands (new for hackathon)
    if (message.startsWith('/')) {
      try {
        const { processGroupFitnessCommand } = await import('./group-fitness-agent');
        response = await processGroupFitnessCommand(message, userAddress, finalConversationId);

        if (response) {
          source = 'group_fitness_agent';
          if (finalConfig.enableLogging) {
            console.log(`🏋️ Processed group fitness command in ${Date.now() - startTime}ms`);
          }
        } else {
          // Fall through to other processing if command not recognized
          response = await processWithAI(message, finalConversationId, context);
          source = 'ai_direct';
        }
      } catch (error) {
        if (finalConfig.enableLogging) {
          console.error('Error processing group fitness command:', error);
        }
        // Fall through to AI processing
        response = await processWithAI(message, finalConversationId, context);
        source = 'ai_direct_fallback';
      }
    }

    // Handle live markets query
    if (lowerMessage.includes('live') && (lowerMessage.includes('market') || lowerMessage.includes('prediction'))) {
      try {
        const { getMarketSummaryForBot } = await import('./services/contract-data-service');
        response = await getMarketSummaryForBot();
        source = 'enhanced_live_markets_direct';
        
        if (finalConfig.enableLogging) {
          console.log(`📊 Served live markets data in ${Date.now() - startTime}ms`);
        }
      } catch (error) {
        if (finalConfig.enableLogging) {
          console.error('Error fetching live markets:', error);
        }
        // Fall through to AI processing
        response = await processWithAI(message, finalConversationId, context);
        source = 'ai_direct_fallback';
      }
    }
    // Handle network stats query
    else if (lowerMessage.includes('network stat') || lowerMessage.includes('fitness stat') || lowerMessage.includes('how many')) {
      try {
        const { getNetworkStatsForBot } = await import('./services/contract-data-service');
        response = await getNetworkStatsForBot();
        source = 'network_stats_direct';
        
        if (finalConfig.enableLogging) {
          console.log(`📈 Served network stats in ${Date.now() - startTime}ms`);
        }
      } catch (error) {
        if (finalConfig.enableLogging) {
          console.error('Error fetching network stats:', error);
        }
        // Fall through to AI processing
        response = await processWithAI(message, finalConversationId, context);
        source = 'ai_direct_fallback';
      }
    }
    // Default to AI processing
    else {
      response = await processWithAI(message, finalConversationId, context);
      source = 'ai_direct';
    }

    // Store messages if enabled and PostgreSQL is available
    if (finalConfig.storeMessages) {
      try {
        await storeConversationMessages(userAddress, message, response, finalConversationId);
        if (finalConfig.enableLogging) {
          console.log(`💾 Messages stored successfully`);
        }
      } catch (storeError) {
        if (finalConfig.enableLogging) {
          console.error('❌ Error storing messages:', storeError);
        }
        // Continue anyway - response is still valid
      }
    }

    const processingTime = Date.now() - startTime;
    if (finalConfig.enableLogging) {
      console.log(`✅ Message processed in ${processingTime}ms (source: ${source})`);
    }

    return {
      response,
      source,
      conversationId: finalConversationId,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    if (finalConfig.enableLogging) {
      console.error(`❌ Direct processing failed after ${processingTime}ms:`, error);
    }

    // Return fallback response
    return {
      response: getFallbackResponse(message),
      source: 'fallback_direct',
      conversationId: conversationId || `fallback_${Date.now()}`,
    };
  }
}

/**
 * Process message with AI service
 */
async function processWithAI(message: string, conversationId: string, context?: any): Promise<string> {
  try {
    const { generatePredictionProposal } = await import('./ai-bot-service');
    
    // Enhanced message with context
    const enhancedMessage = context ?
      `[User Context: ${context.authType} auth${context.farcaster ? `, Farcaster: @${context.farcaster.username || context.farcaster.fid}` : ''}${context.environment ? `, Environment: ${context.environment}` : ''}] ${message}` :
      message;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    return await generatePredictionProposal(enhancedMessage, apiKey, conversationId);
  } catch (error) {
    console.error('AI processing error:', error);
    throw error;
  }
}

/**
 * Store conversation messages in database
 */
async function storeConversationMessages(
  userAddress: string,
  userMessage: string,
  botResponse: string,
  conversationId: string
): Promise<void> {
  const timestamp = Date.now();

  const userMsg: StoredMessage = {
    id: `user_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    senderAddress: userAddress,
    content: userMessage,
    timestamp,
    messageType: 'user',
    metadata: {
      actionType: 'general',
    },
  };

  const botMsg: StoredMessage = {
    id: `bot_${timestamp + 1}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    senderAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'bot',
    content: botResponse,
    timestamp: timestamp + 1,
    messageType: 'bot',
    metadata: {
      actionType: 'general',
    },
  };

  await enhancedMessageStore.addMessage(userMsg);
  await enhancedMessageStore.addMessage(botMsg);
}

/**
 * Get fallback response for errors
 */
function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('gm')) {
    return `Hello! 👋 I'm your AI prediction assistant. I can help you:

• **Query live markets**: "What prediction markets are currently live?"
• **Create predictions**: "Create a prediction about Bitcoin reaching $100k"
• **Get help**: "How do prediction markets work?"
• **Chat with community**: Just start typing to chat with other users!

What would you like to do?`;
  } else if (lowerMessage.includes('help')) {
    return `🤖 **How I can help you:**

**Prediction Markets:**
• Ask about live markets
• Create custom predictions
• Explain how predictions work
• Suggest interesting prediction ideas

**Community Chat:**
• Chat with other users
• Share prediction strategies
• Discuss market trends

Try asking: "What prediction markets are live?" or "Create a Bitcoin prediction"`;
  } else {
    return `I received: "${message}"

I'm your AI prediction assistant! Try asking:
• "What prediction markets are currently live?"
• "Create a prediction about [your idea]"
• "How do prediction markets work?"

You can also chat with other community members here!`;
  }
}

/**
 * Check if direct processing should be used
 */
export function shouldUseDirectProcessing(): boolean {
  // Use direct processing when Redis is not available
  return enhancedMessageStore.isPostgreSQLOnlyMode();
}
