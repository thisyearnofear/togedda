/**
 * API endpoint for fetching conversation history with caching
 * GET /api/xmtp/conversation-history
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { messageStore } from '@/lib/xmtp-message-store';

interface ConversationHistoryRequest {
  conversationId?: string;
  userAddress?: string;
  limit?: string;
  offset?: string;
}

interface ConversationHistoryResponse {
  success: boolean;
  messages?: any[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConversationHistoryResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { 
      conversationId, 
      userAddress, 
      limit = '50', 
      offset = '0' 
    } = req.query as ConversationHistoryRequest;

    if (!conversationId && !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Either conversationId or userAddress is required'
      });
    }

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit or offset parameters'
      });
    }

    let messages: any[] = [];
    let total = 0;

    if (conversationId) {
      // Get messages for specific conversation
      const allMessages = messageStore.getMessages(conversationId);
      total = allMessages.length;
      
      // Apply pagination
      messages = allMessages
        .slice(offsetNum, offsetNum + limitNum)
        .map(msg => ({
          id: msg.id,
          sender: msg.messageType === 'bot' ? 'PredictionBot' : 
                  msg.messageType === 'user' ? 'You' : 
                  msg.senderAddress,
          content: msg.content,
          timestamp: msg.timestamp,
          messageType: msg.messageType,
          metadata: msg.metadata,
        }));
    } else if (userAddress) {
      // Get all conversations for user
      const conversations = messageStore.getConversations();
      const userConversations = conversations.filter(conv => 
        conv.peerAddress.toLowerCase() === userAddress.toLowerCase()
      );

      // Aggregate messages from all user conversations
      const allUserMessages: any[] = [];
      userConversations.forEach(conv => {
        const convMessages = messageStore.getMessages(conv.id);
        allUserMessages.push(...convMessages);
      });

      // Sort by timestamp (most recent first)
      allUserMessages.sort((a, b) => b.timestamp - a.timestamp);
      
      total = allUserMessages.length;
      
      // Apply pagination
      messages = allUserMessages
        .slice(offsetNum, offsetNum + limitNum)
        .map(msg => ({
          id: msg.id,
          sender: msg.messageType === 'bot' ? 'PredictionBot' : 
                  msg.messageType === 'user' ? 'You' : 
                  msg.senderAddress,
          content: msg.content,
          timestamp: msg.timestamp,
          messageType: msg.messageType,
          metadata: msg.metadata,
          conversationId: msg.conversationId,
        }));
    }

    const hasMore = offsetNum + limitNum < total;

    res.status(200).json({
      success: true,
      messages,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore,
      },
    });

  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation history',
    });
  }
}
