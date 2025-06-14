import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to get conversation history
 * GET /api/xmtp/conversation-history?userAddress=0x...&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress parameter is required' },
        { status: 400 }
      );
    }

    // Generate conversation ID (consistent with send-message)
    const conversationId = `conv_${userAddress}_bot`;

    try {
      // Try to get messages from enhanced message store
      const { enhancedMessageStore } = await import('@/lib/enhanced-message-store');
      const messages = await enhancedMessageStore.getMessages(conversationId, limit);

      return NextResponse.json({
        conversationId,
        userAddress,
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          messageType: msg.messageType,
          senderAddress: msg.senderAddress,
          metadata: msg.metadata
        })),
        count: messages.length,
        source: enhancedMessageStore.isRedisAvailable() ? 'redis_postgresql' : 'postgresql_only',
        timestamp: new Date().toISOString()
      });

    } catch (storeError) {
      console.error('Error accessing message store:', storeError);
      
      // Fallback: return empty conversation
      return NextResponse.json({
        conversationId,
        userAddress,
        messages: [],
        count: 0,
        source: 'fallback_empty',
        timestamp: new Date().toISOString(),
        note: 'Message store unavailable, returning empty conversation'
      });
    }

  } catch (error) {
    console.error('Error getting conversation history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get conversation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
