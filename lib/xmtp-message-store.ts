/**
 * Enhanced XMTP Message Store with Real-time Updates and Persistence
 * Implements message caching, real-time streaming, and conversation management
 * Based on XMTP V3 best practices and ephemeraHQ examples
 */

import { Client, type Conversation, type DecodedMessage } from '@xmtp/node-sdk';

export interface StoredMessage {
  id: string;
  conversationId: string;
  senderAddress: string;
  content: string;
  timestamp: number;
  messageType: 'user' | 'bot' | 'system';
  metadata?: {
    predictionId?: number;
    actionType?: 'create_prediction' | 'vote' | 'query' | 'general';
    chainId?: number;
  };
}

export interface ConversationInfo {
  id: string;
  peerAddress: string;
  topic: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  isActive: boolean;
}

export interface MessageStoreConfig {
  maxMessagesPerConversation: number;
  messageRetentionDays: number;
  enableRealTimeSync: boolean;
  cacheSize: number;
}

const DEFAULT_CONFIG: MessageStoreConfig = {
  maxMessagesPerConversation: 1000,
  messageRetentionDays: 30,
  enableRealTimeSync: true,
  cacheSize: 5000,
};

/**
 * Enhanced Message Store with real-time capabilities
 */
export class XMTPMessageStore {
  private messages: Map<string, StoredMessage[]> = new Map();
  private conversations: Map<string, ConversationInfo> = new Map();
  private messageListeners: Map<string, Set<(message: StoredMessage) => void>> = new Map();
  private conversationStreams: Map<string, AsyncIterable<DecodedMessage>> = new Map();
  private config: MessageStoreConfig;

  constructor(config: Partial<MessageStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a message to the store
   */
  addMessage(message: StoredMessage): void {
    const conversationId = message.conversationId;
    
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }

    const messages = this.messages.get(conversationId)!;
    
    // Check for duplicates
    const exists = messages.some(m => m.id === message.id);
    if (exists) return;

    // Add message
    messages.push(message);
    
    // Maintain size limit
    if (messages.length > this.config.maxMessagesPerConversation) {
      messages.shift(); // Remove oldest message
    }

    // Update conversation info
    this.updateConversationInfo(conversationId, message);

    // Notify listeners
    this.notifyMessageListeners(conversationId, message);

    console.log(`📨 Added message to conversation ${conversationId}: ${message.content.substring(0, 50)}...`);
  }

  /**
   * Get messages for a conversation
   */
  getMessages(conversationId: string, limit?: number): StoredMessage[] {
    const messages = this.messages.get(conversationId) || [];
    
    if (limit) {
      return messages.slice(-limit);
    }
    
    return [...messages];
  }

  /**
   * Get all conversations
   */
  getConversations(): ConversationInfo[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string, 
    callback: (message: StoredMessage) => void
  ): () => void {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set());
    }

    this.messageListeners.get(conversationId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.messageListeners.get(conversationId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.messageListeners.delete(conversationId);
        }
      }
    };
  }

  /**
   * Start real-time message streaming for a conversation
   */
  async startMessageStream(
    conversation: Conversation,
    onMessage: (message: StoredMessage) => void
  ): Promise<() => void> {
    const conversationId = (conversation as any).topic || conversation.id || 'unknown';
    
    try {
      console.log(`🔄 Starting message stream for conversation: ${conversationId}`);
      
      // Create async iterator for streaming messages
      const messageStream = (conversation as any).streamMessages?.() || (async function*() { return; })();
      this.conversationStreams.set(conversationId, messageStream);

      // Process messages in background
      this.processMessageStream(messageStream, conversationId, onMessage);

      // Return stop function
      return () => {
        this.conversationStreams.delete(conversationId);
        console.log(`⏹️ Stopped message stream for conversation: ${conversationId}`);
      };
    } catch (error) {
      console.error(`❌ Error starting message stream for ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Process message stream in background
   */
  private async processMessageStream(
    messageStream: AsyncIterable<DecodedMessage>,
    conversationId: string,
    onMessage: (message: StoredMessage) => void
  ): Promise<void> {
    try {
      for await (const xmtpMessage of messageStream) {
        const storedMessage: StoredMessage = {
          id: `${(xmtpMessage as any).id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId,
          senderAddress: (xmtpMessage as any).senderAddress || 'unknown',
          content: (xmtpMessage as any).content || '',
          timestamp: (xmtpMessage as any).sentAt?.getTime() || Date.now(),
          messageType: this.determineMessageType((xmtpMessage as any).senderAddress || 'unknown'),
          metadata: this.extractMessageMetadata((xmtpMessage as any).content || ''),
        };

        // Add to store
        this.addMessage(storedMessage);
        
        // Notify callback
        onMessage(storedMessage);
      }
    } catch (error) {
      console.error(`❌ Error processing message stream for ${conversationId}:`, error);
    }
  }

  /**
   * Load conversation history from XMTP
   */
  async loadConversationHistory(
    conversation: Conversation,
    limit: number = 50
  ): Promise<StoredMessage[]> {
    const conversationId = (conversation as any).topic || conversation.id || 'unknown';
    
    try {
      console.log(`📚 Loading conversation history for: ${conversationId}`);
      
      const messages = await (conversation as any).messages?.({ limit }) || [];
      const storedMessages: StoredMessage[] = [];

      for (const xmtpMessage of messages) {
        const storedMessage: StoredMessage = {
          id: `${(xmtpMessage as any).id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId,
          senderAddress: (xmtpMessage as any).senderAddress || 'unknown',
          content: (xmtpMessage as any).content || '',
          timestamp: (xmtpMessage as any).sentAt?.getTime() || Date.now(),
          messageType: this.determineMessageType((xmtpMessage as any).senderAddress || 'unknown'),
          metadata: this.extractMessageMetadata((xmtpMessage as any).content || ''),
        };

        storedMessages.push(storedMessage);
        this.addMessage(storedMessage);
      }

      console.log(`✅ Loaded ${storedMessages.length} messages for conversation ${conversationId}`);
      return storedMessages.reverse(); // Most recent first
    } catch (error) {
      console.error(`❌ Error loading conversation history for ${conversationId}:`, error);
      return [];
    }
  }

  /**
   * Clear old messages based on retention policy
   */
  cleanupOldMessages(): void {
    const cutoffTime = Date.now() - (this.config.messageRetentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [conversationId, messages] of this.messages.entries()) {
      const filteredMessages = messages.filter(msg => msg.timestamp > cutoffTime);
      
      if (filteredMessages.length !== messages.length) {
        this.messages.set(conversationId, filteredMessages);
        cleanedCount += messages.length - filteredMessages.length;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🗑️ Cleaned up ${cleanedCount} old messages`);
    }
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(conversationId: string): {
    messageCount: number;
    lastMessageAt: number;
    participantCount: number;
    averageResponseTime: number;
  } {
    const messages = this.getMessages(conversationId);
    const conversation = this.conversations.get(conversationId);

    if (!messages.length) {
      return {
        messageCount: 0,
        lastMessageAt: 0,
        participantCount: 0,
        averageResponseTime: 0,
      };
    }

    const participants = new Set(messages.map(m => m.senderAddress));
    const lastMessage = messages[messages.length - 1];

    // Calculate average response time between user and bot messages
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];
      
      if (prev.messageType === 'user' && curr.messageType === 'bot') {
        totalResponseTime += curr.timestamp - prev.timestamp;
        responseCount++;
      }
    }

    return {
      messageCount: messages.length,
      lastMessageAt: lastMessage.timestamp,
      participantCount: participants.size,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
    };
  }

  private updateConversationInfo(conversationId: string, message: StoredMessage): void {
    const existing = this.conversations.get(conversationId);
    
    if (existing) {
      existing.lastMessageAt = message.timestamp;
      existing.messageCount++;
    } else {
      this.conversations.set(conversationId, {
        id: conversationId,
        peerAddress: message.senderAddress,
        topic: conversationId,
        createdAt: message.timestamp,
        lastMessageAt: message.timestamp,
        messageCount: 1,
        isActive: true,
      });
    }
  }

  private notifyMessageListeners(conversationId: string, message: StoredMessage): void {
    const listeners = this.messageListeners.get(conversationId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in message listener callback:', error);
        }
      });
    }
  }

  private determineMessageType(senderAddress: string): 'user' | 'bot' | 'system' {
    const botAddress = process.env.PREDICTION_BOT_XMTP_ADDRESS?.toLowerCase();
    
    if (senderAddress.toLowerCase() === botAddress) {
      return 'bot';
    }
    
    return 'user';
  }

  private extractMessageMetadata(content: string): StoredMessage['metadata'] {
    const metadata: StoredMessage['metadata'] = {};

    // Extract prediction ID if mentioned
    const predictionMatch = content.match(/prediction\s+(?:id\s+)?(\d+)/i);
    if (predictionMatch) {
      metadata.predictionId = parseInt(predictionMatch[1]);
    }

    // Determine action type based on content
    if (content.toLowerCase().includes('create') && content.toLowerCase().includes('prediction')) {
      metadata.actionType = 'create_prediction';
    } else if (content.toLowerCase().includes('vote') || content.toLowerCase().includes('stake')) {
      metadata.actionType = 'vote';
    } else if (content.includes('?') || content.toLowerCase().includes('what') || content.toLowerCase().includes('how')) {
      metadata.actionType = 'query';
    } else {
      metadata.actionType = 'general';
    }

    return metadata;
  }
}

// Global message store instance
export const messageStore = new XMTPMessageStore();
