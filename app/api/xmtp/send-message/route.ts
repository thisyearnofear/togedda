import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to send a message to the XMTP bot
 * POST /api/xmtp/send-message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userAddress, conversationId, context } = body;

    if (!message || !userAddress) {
      return NextResponse.json(
        { error: 'Message and userAddress are required' },
        { status: 400 }
      );
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

    // Check if we should use direct processing (more efficient when Redis unavailable)
    const { shouldUseDirectProcessing, processMessageDirect } = await import('@/lib/xmtp-direct-processor');

    if (shouldUseDirectProcessing()) {
      console.log(`📝 Redis not configured, using PostgreSQL only`);

      try {
        const result = await processMessageDirect(userAddress, message, conversationId, context);

        return NextResponse.json({
          response: result.response,
          botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
          timestamp: new Date().toISOString(),
          source: result.source,
          conversationId: result.conversationId
        });
      } catch (directError) {
        console.error('❌ Direct processing failed:', directError);
        // Fall through to other processing methods
      }
    }

    // Direct AI processing (fallback)
    try {
      // Check if user is asking about live markets
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('live') && (lowerMessage.includes('market') || lowerMessage.includes('prediction'))) {
        try {
          const { getMarketSummaryForBot } = await import('@/lib/contract-data-service');
          const response = await getMarketSummaryForBot();

          return NextResponse.json({
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

          return NextResponse.json({
            response,
            botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
            timestamp: new Date().toISOString(),
            source: 'network_stats'
          });
        } catch (fetchError) {
          console.error('Error fetching network stats:', fetchError);
        }
      }

      // Default AI processing
      const { generatePredictionProposal } = await import('@/lib/ai-bot-service');

      const enhancedMessage = context ?
        `[User Context: ${context.authType} auth${context.farcaster ? `, Farcaster: @${context.farcaster.username || context.farcaster.fid}` : ''}${context.environment ? `, Environment: ${context.environment}` : ''}] ${message}` :
        message;

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await generatePredictionProposal(enhancedMessage, apiKey, conversationId);

      return NextResponse.json({
        response,
        botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS,
        timestamp: new Date().toISOString(),
        source: 'ai_direct',
        conversationId: conversationId || `conv_${userAddress}_${Date.now()}`
      });

    } catch (error) {
      console.error('❌ Error processing message:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('❌ Send message API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
