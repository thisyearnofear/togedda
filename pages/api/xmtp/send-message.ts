import { NextApiRequest, NextApiResponse } from 'next';
import { enhancedMessageStore, StoredMessage } from '@/lib/enhanced-message-store';

/**
 * Check if the bot service is available and responsive
 */
async function checkBotServiceAvailability(): Promise<boolean> {
  try {
    // Check if bot environment variables are configured
    const botConfigured = !!(
      process.env.BOT_PRIVATE_KEY &&
      process.env.ENCRYPTION_KEY &&
      process.env.OPENAI_API_KEY &&
      process.env.XMTP_ENV
    );

    if (!botConfigured) {
      return false;
    }

    // Try to import and check the queue system
    const { getQueueStats } = await import('@/lib/xmtp-message-queue');
    const stats = getQueueStats();

    // If we can get stats, the queue system is working
    return true;
  } catch (error) {
    console.log(`🔍 Bot service availability check failed:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * API endpoint to send a message to the XMTP bot
 * POST /api/xmtp/send-message
 * 
 * Body: { message: string, userAddress: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userAddress, conversationId, context } = req.body;

    if (!message || !userAddress) {
      return res.status(400).json({ error: 'Message and userAddress are required' });
    }

    // Log enhanced authentication context for debugging
    if (context) {
      console.log('📋 Enhanced auth context:', {
        authType: context.authType,
        environment: context.environment,
        hasFarcaster: !!context.farcaster,
        userAddress: context.userAddress,
      });
    }

    // Check if bot is configured
    if (!process.env.BOT_PRIVATE_KEY || !process.env.ENCRYPTION_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: 'Bot is not properly configured. Please check environment variables.',
        response: 'Sorry, the prediction bot is currently unavailable. Please try again later.'
      });
    }

    // Check if we should use direct processing (more efficient when Redis unavailable)
    const { shouldUseDirectProcessing, processMessageDirect } = await import('@/lib/xmtp-direct-processor');

    if (shouldUseDirectProcessing()) {
      console.log(`📝 Redis not configured, using PostgreSQL only`);

      try {
        const result = await processMessageDirect(userAddress, message, conversationId, context);

        return res.status(200).json({
          response: result.response,
          botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
          timestamp: new Date().toISOString(),
          source: result.source,
          conversationId: result.conversationId
        });
      } catch (directError) {
        console.error('❌ Direct processing failed:', directError);
        // Fall through to queue-based processing
      }
    }

    // Check if we have a running bot service for queue-based processing
    const botServiceAvailable = await checkBotServiceAvailability();

    if (botServiceAvailable) {
      // Use message queue system for proper XMTP integration
      try {
        // Import message queue system
        const { queueMessage, waitForMessageResponse } = await import('@/lib/xmtp-message-queue');

        // Queue the message for the bot service to process
        const messageId = queueMessage(userAddress, message);
        console.log(`📨 Queued message ${messageId} for bot processing`);

        // Try to wait for bot response (with shorter timeout for better UX)
        try {
          const botResponse = await waitForMessageResponse(messageId, 5000); // 5 second timeout

          return res.status(200).json({
            response: botResponse,
            botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
            timestamp: new Date().toISOString(),
            source: 'xmtp_queue_processed',
            messageId
          });
        } catch (timeoutError) {
          console.log(`⏰ Message ${messageId} timed out, falling back to direct AI response`);
          // Fall through to direct AI processing
        }
      } catch (queueError) {
        console.log(`❌ Queue system error, falling back to direct AI response:`, queueError instanceof Error ? queueError.message : String(queueError));
        // Fall through to direct AI processing
      }
    } else {
      console.log(`🤖 Bot service not available, using direct AI processing`);
    }

    // Direct AI processing (fallback or when bot service unavailable)
    try {
      // Check if user is asking about live markets
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('live') && (lowerMessage.includes('market') || lowerMessage.includes('prediction'))) {
        // Use enhanced contract data service for live markets
        try {
          const { getMarketSummaryForBot } = await import('@/lib/contract-data-service');
          const response = await getMarketSummaryForBot();

          return res.status(200).json({
            response,
            botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
            timestamp: new Date().toISOString(),
            source: 'enhanced_live_markets'
          });
        } catch (fetchError) {
          console.error('Error fetching enhanced market data:', fetchError);
        }
      }

      // Handle network stats queries
      if (lowerMessage.includes('network stat') || lowerMessage.includes('fitness stat') || lowerMessage.includes('how many')) {
        try {
          const { getNetworkStatsForBot } = await import('@/lib/contract-data-service');
          const response = await getNetworkStatsForBot();

          return res.status(200).json({
            response,
            botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
            timestamp: new Date().toISOString(),
            source: 'network_stats'
          });
        } catch (fetchError) {
          console.error('Error fetching network stats:', fetchError);
        }
      }

      // For now, use direct AI service call until we implement proper XMTP user clients
      const { generatePredictionProposal } = await import('@/lib/ai-bot-service');
      // Use provided conversation ID or create one based on request info
      const finalConversationId = conversationId || `api_${req.headers['x-forwarded-for'] || 'unknown'}_${Date.now()}`;

      // Enhanced AI call with authentication context
      const enhancedMessage = context ?
        `[User Context: ${context.authType} auth${context.farcaster ? `, Farcaster: @${context.farcaster.username || context.farcaster.fid}` : ''}${context.environment ? `, Environment: ${context.environment}` : ''}] ${message}` :
        message;

      const aiResponse = await generatePredictionProposal(enhancedMessage, process.env.OPENAI_API_KEY || '', finalConversationId);

      // Store both user message and bot response in enhanced store
      const userMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: finalConversationId,
        senderAddress: userAddress,
        content: message,
        timestamp: Date.now(),
        messageType: 'user' as const,
        metadata: {
          actionType: 'general' as const,
        },
      };

      const botMessage = {
        id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: finalConversationId,
        senderAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'bot',
        content: aiResponse,
        timestamp: Date.now() + 1, // Ensure bot message comes after user message
        messageType: 'bot' as const,
        metadata: {
          actionType: 'general' as const,
        },
      };

      // Store messages in enhanced store
      try {
        console.log(`📝 Storing user message: ${userMessage.id} in conversation ${finalConversationId}`);
        await enhancedMessageStore.addMessage(userMessage);
        console.log(`📝 Storing bot message: ${botMessage.id} in conversation ${finalConversationId}`);
        await enhancedMessageStore.addMessage(botMessage);
        console.log(`✅ Successfully stored both messages in database`);
      } catch (storeError) {
        console.error('❌ Error storing messages in enhanced store:', storeError);
        // Continue anyway - the response will still be sent to the user
      }

      res.status(200).json({
        response: aiResponse,
        botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
        timestamp: new Date().toISOString(),
        source: 'ai_direct_via_api'
      });

    } catch (aiError) {
      console.error('AI service error:', aiError);

      // Enhanced fallback responses based on message content
      const lowerMessage = message.toLowerCase();
      let fallbackResponse;

      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('gm')) {
        fallbackResponse = `Hello! 👋 I'm your AI prediction assistant. I can help you:

• **Query live markets**: "What prediction markets are currently live?"
• **Create predictions**: "Create a prediction about Bitcoin reaching $100k"
• **Get help**: "How do prediction markets work?"
• **Chat with community**: Just start typing to chat with other users!

What would you like to do?`;
      } else if (lowerMessage.includes('help')) {
        fallbackResponse = `🤖 **How I can help you:**

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
        fallbackResponse = `I received: "${message}"

I'm your AI prediction assistant! Try asking:
• "What prediction markets are currently live?"
• "Create a prediction about [your idea]"
• "How do prediction markets work?"

You can also chat with other community members here!`;
      }

      res.status(200).json({
        response: fallbackResponse,
        botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
        timestamp: new Date().toISOString(),
        source: 'enhanced_fallback'
      });
    }

  } catch (error) {
    console.error('Error sending message to bot:', error);
    res.status(500).json({ 
      error: 'Failed to send message to bot',
      response: 'Sorry, there was an error processing your message. Please try again.'
    });
  }
}
