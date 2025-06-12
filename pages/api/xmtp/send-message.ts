import { NextApiRequest, NextApiResponse } from 'next';
import { enhancedMessageStore } from '@/lib/enhanced-message-store';

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

    // Use message queue system for proper XMTP integration
    try {
      // Import message queue system
      const { queueMessage, waitForMessageResponse } = await import('../../../lib/xmtp-message-queue');

      // Queue the message for the bot service to process
      const messageId = queueMessage(userAddress, message);
      console.log(`📨 Queued message ${messageId} for bot processing`);

      // Try to wait for bot response (with shorter timeout for better UX)
      try {
        const botResponse = await waitForMessageResponse(messageId, 10000); // 10 second timeout

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

      // Check if user is asking about live markets
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('live') && (lowerMessage.includes('market') || lowerMessage.includes('prediction'))) {
        // Use enhanced contract data service for live markets
        try {
          const { getMarketSummaryForBot } = await import('../../../lib/contract-data-service');
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
          const { getNetworkStatsForBot } = await import('../../../lib/contract-data-service');
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
      const { generatePredictionProposal } = await import('../../../lib/ai-bot-service');
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
      await enhancedMessageStore.addMessage(userMessage);
      await enhancedMessageStore.addMessage(botMessage);

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
