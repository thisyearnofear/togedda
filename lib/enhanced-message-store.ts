/**
 * Enhanced Message Store with PostgreSQL, Redis, and XMTP Integration
 * 
 * This implements a robust multi-layer storage architecture:
 * 1. PostgreSQL for persistent storage
 * 2. Redis for real-time caching and session management
 * 3. XMTP native sync for cross-device consistency
 * 4. Proper frontend integration
 * 
 * Based on XMTP V3 best practices and ephemeraHQ examples
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { Client } from '@xmtp/node-sdk';

export interface StoredMessage {
  id: string;
  conversationId: string;
  senderAddress: string;
  senderInboxId?: string;
  content: string;
  timestamp: number;
  messageType: 'user' | 'bot' | 'system';
  metadata?: {
    predictionId?: number;
    actionType?: 'create_prediction' | 'vote' | 'query' | 'general';
    chainId?: number;
    xmtpMessageId?: string;
  };
  synced?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConversationInfo {
  id: string;
  peerAddress: string;
  peerInboxId?: string;
  topic: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  isActive: boolean;
  syncedAt?: number;
}

export interface MessageStoreConfig {
  postgresql: {
    connectionString: string;
    maxConnections: number;
  };
  redis: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  };
  xmtp: {
    enableSync: boolean;
    syncIntervalMs: number;
    maxMessagesPerSync: number;
  };
  cache: {
    messageTtlSeconds: number;
    conversationTtlSeconds: number;
    maxCacheSize: number;
  };
}

const DEFAULT_CONFIG: MessageStoreConfig = {
  postgresql: {
    connectionString: process.env.DATABASE_URL || '',
    maxConnections: 20,
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  xmtp: {
    enableSync: true,
    syncIntervalMs: 30000, // 30 seconds
    maxMessagesPerSync: 100,
  },
  cache: {
    messageTtlSeconds: 3600, // 1 hour
    conversationTtlSeconds: 7200, // 2 hours
    maxCacheSize: 10000,
  },
};

export class EnhancedMessageStore {
  private pg: Pool;
  private redis?: Redis;
  private xmtpClient?: Client;
  private config: MessageStoreConfig;
  private syncInterval?: NodeJS.Timeout;
  private messageListeners: Map<string, Set<(message: StoredMessage) => void>> = new Map();

  constructor(config: Partial<MessageStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize PostgreSQL
    this.pg = new Pool({
      connectionString: this.config.postgresql.connectionString,
      max: this.config.postgresql.maxConnections,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Initialize Redis with error handling
    try {
      if (this.config.redis.url) {
        this.redis = new Redis(this.config.redis.url);
      } else {
        this.redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          maxRetriesPerRequest: 3,
          lazyConnect: true, // Don't connect immediately
        });
      }

      // Test Redis connection
      this.redis.ping().catch((error) => {
        console.warn('⚠️ Redis connection failed, falling back to PostgreSQL only:', error.message);
      });
    } catch (error) {
      console.warn('⚠️ Redis initialization failed, falling back to PostgreSQL only:', error);
    }

    this.initializeDatabase();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create messages table
      await this.pg.query(`
        CREATE TABLE IF NOT EXISTS xmtp_messages (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) NOT NULL,
          sender_address VARCHAR(255) NOT NULL,
          sender_inbox_id VARCHAR(255),
          content TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          message_type VARCHAR(50) NOT NULL,
          metadata JSONB,
          synced BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create conversations table
      await this.pg.query(`
        CREATE TABLE IF NOT EXISTS xmtp_conversations (
          id VARCHAR(255) PRIMARY KEY,
          peer_address VARCHAR(255) NOT NULL,
          peer_inbox_id VARCHAR(255),
          topic VARCHAR(255) NOT NULL,
          created_at BIGINT NOT NULL,
          last_message_at BIGINT NOT NULL,
          message_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          synced_at BIGINT
        );
      `);

      // Create indexes for better performance
      await this.pg.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON xmtp_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON xmtp_messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_messages_sender ON xmtp_messages(sender_address);
        CREATE INDEX IF NOT EXISTS idx_conversations_peer ON xmtp_conversations(peer_address);
        CREATE INDEX IF NOT EXISTS idx_conversations_active ON xmtp_conversations(is_active);
      `);

      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Set XMTP client for sync operations
   */
  setXMTPClient(client: Client): void {
    this.xmtpClient = client;
    
    if (this.config.xmtp.enableSync) {
      this.startSyncInterval();
    }
  }

  /**
   * Add a message to the store (PostgreSQL + Redis)
   */
  async addMessage(message: StoredMessage): Promise<void> {
    try {
      // Store in PostgreSQL
      await this.pg.query(`
        INSERT INTO xmtp_messages (
          id, conversation_id, sender_address, sender_inbox_id, content, 
          timestamp, message_type, metadata, synced
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          synced = EXCLUDED.synced,
          updated_at = CURRENT_TIMESTAMP
      `, [
        message.id,
        message.conversationId,
        message.senderAddress,
        message.senderInboxId || null,
        message.content,
        message.timestamp,
        message.messageType,
        JSON.stringify(message.metadata || {}),
        message.synced || false
      ]);

      // Cache in Redis (with error handling)
      if (this.redis) {
        try {
          const cacheKey = `msg:${message.conversationId}`;
          await this.redis.lpush(cacheKey, JSON.stringify(message));
          await this.redis.ltrim(cacheKey, 0, 999); // Keep last 1000 messages
          await this.redis.expire(cacheKey, this.config.cache.messageTtlSeconds);
        } catch (redisError) {
          console.warn('⚠️ Redis cache operation failed:', redisError);
          // Continue without caching - PostgreSQL is the source of truth
        }
      }

      // Update conversation info
      await this.updateConversationInfo(message.conversationId, message);

      // Notify listeners
      this.notifyMessageListeners(message.conversationId, message);

      console.log(`📨 Added message to store: ${message.content.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Error adding message to store:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation (Redis first, then PostgreSQL)
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<StoredMessage[]> {
    try {
      // Try Redis cache first (with error handling)
      if (this.redis) {
        try {
          const cacheKey = `msg:${conversationId}`;
          const cachedMessages = await this.redis.lrange(cacheKey, 0, limit - 1);

          if (cachedMessages.length > 0) {
            const messages = cachedMessages.map(msg => JSON.parse(msg) as StoredMessage);
            console.log(`📦 Retrieved ${messages.length} messages from cache for ${conversationId}`);
            return messages.reverse(); // Reverse to get chronological order
          }
        } catch (redisError) {
          console.warn('⚠️ Redis cache read failed, falling back to PostgreSQL:', redisError);
        }
      }

      // Fallback to PostgreSQL
      const result = await this.pg.query(`
        SELECT * FROM xmtp_messages 
        WHERE conversation_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [conversationId, limit]);

      const messages = result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderAddress: row.sender_address,
        senderInboxId: row.sender_inbox_id,
        content: row.content,
        timestamp: parseInt(row.timestamp),
        messageType: row.message_type,
        metadata: row.metadata,
        synced: row.synced,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as StoredMessage[];

      // Cache the results (with error handling)
      if (messages.length > 0 && this.redis) {
        try {
          const cacheKey = `msg:${conversationId}`;
          const pipeline = this.redis.pipeline();
          messages.forEach(msg => {
            pipeline.lpush(cacheKey, JSON.stringify(msg));
          });
          pipeline.expire(cacheKey, this.config.cache.messageTtlSeconds);
          await pipeline.exec();
        } catch (redisError) {
          console.warn('⚠️ Redis cache write failed:', redisError);
        }
      }

      console.log(`🗄️ Retrieved ${messages.length} messages from database for ${conversationId}`);
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return [];
    }
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<ConversationInfo[]> {
    try {
      const result = await this.pg.query(`
        SELECT * FROM xmtp_conversations
        WHERE is_active = true
        ORDER BY last_message_at DESC
      `);

      return result.rows.map(row => ({
        id: row.id,
        peerAddress: row.peer_address,
        peerInboxId: row.peer_inbox_id,
        topic: row.topic,
        createdAt: parseInt(row.created_at),
        lastMessageAt: parseInt(row.last_message_at),
        messageCount: row.message_count,
        isActive: row.is_active,
        syncedAt: row.synced_at ? parseInt(row.synced_at) : undefined,
      }));
    } catch (error) {
      console.error('❌ Error getting conversations:', error);
      return [];
    }
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
   * Sync with XMTP network
   */
  async syncWithXMTP(): Promise<void> {
    if (!this.xmtpClient) {
      console.warn('⚠️ XMTP client not set, skipping sync');
      return;
    }

    try {
      console.log('🔄 Starting XMTP sync...');

      // Sync all conversations and messages
      await this.xmtpClient.conversations.syncAll();

      // Get all conversations
      const conversations = await this.xmtpClient.conversations.list();

      for (const conversation of conversations) {
        await this.syncConversation(conversation);
      }

      console.log('✅ XMTP sync completed');
    } catch (error) {
      console.error('❌ Error syncing with XMTP:', error);
    }
  }

  /**
   * Sync a specific conversation
   */
  private async syncConversation(conversation: any): Promise<void> {
    try {
      const conversationId = conversation.id;

      // Sync conversation messages
      await conversation.sync();

      // Get messages from XMTP
      const xmtpMessages = await conversation.messages({
        limit: this.config.xmtp.maxMessagesPerSync
      });

      for (const xmtpMessage of xmtpMessages) {
        const storedMessage: StoredMessage = {
          id: `xmtp_${xmtpMessage.id}`,
          conversationId,
          senderAddress: xmtpMessage.senderInboxId, // Use inbox ID as address for now
          senderInboxId: xmtpMessage.senderInboxId,
          content: xmtpMessage.content,
          timestamp: xmtpMessage.sentAt?.getTime() || Date.now(),
          messageType: this.determineMessageType(xmtpMessage.senderInboxId),
          metadata: {
            xmtpMessageId: xmtpMessage.id,
            ...this.extractMessageMetadata(xmtpMessage.content),
          },
          synced: true,
        };

        // Check if message already exists
        const existing = await this.pg.query(
          'SELECT id FROM xmtp_messages WHERE id = $1',
          [storedMessage.id]
        );

        if (existing.rows.length === 0) {
          await this.addMessage(storedMessage);
        }
      }

      // Update conversation sync timestamp
      await this.pg.query(`
        UPDATE xmtp_conversations
        SET synced_at = $1
        WHERE id = $2
      `, [Date.now(), conversationId]);

    } catch (error) {
      console.error(`❌ Error syncing conversation ${conversation.id}:`, error);
    }
  }

  /**
   * Start periodic sync with XMTP
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncWithXMTP();
    }, this.config.xmtp.syncIntervalMs);

    console.log(`🔄 Started XMTP sync interval (${this.config.xmtp.syncIntervalMs}ms)`);
  }

  /**
   * Update conversation info
   */
  private async updateConversationInfo(conversationId: string, message: StoredMessage): Promise<void> {
    try {
      await this.pg.query(`
        INSERT INTO xmtp_conversations (
          id, peer_address, peer_inbox_id, topic, created_at,
          last_message_at, message_count, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, true)
        ON CONFLICT (id) DO UPDATE SET
          last_message_at = EXCLUDED.last_message_at,
          message_count = xmtp_conversations.message_count + 1,
          peer_inbox_id = COALESCE(EXCLUDED.peer_inbox_id, xmtp_conversations.peer_inbox_id)
      `, [
        conversationId,
        message.senderAddress,
        message.senderInboxId || null,
        conversationId, // Use conversation ID as topic for now
        message.timestamp,
        message.timestamp
      ]);

      // Update Redis cache
      if (this.redis) {
        try {
          const cacheKey = `conv:${conversationId}`;
          const convInfo = {
            id: conversationId,
            peerAddress: message.senderAddress,
            peerInboxId: message.senderInboxId,
            lastMessageAt: message.timestamp,
          };
          await this.redis.setex(cacheKey, this.config.cache.conversationTtlSeconds, JSON.stringify(convInfo));
        } catch (redisError) {
          console.warn('⚠️ Redis conversation cache update failed:', redisError);
        }
      }

    } catch (error) {
      console.error('❌ Error updating conversation info:', error);
    }
  }

  /**
   * Notify message listeners
   */
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

  /**
   * Determine message type based on sender
   */
  private determineMessageType(senderInboxId: string): 'user' | 'bot' | 'system' {
    const botInboxId = process.env.NEXT_PUBLIC_XMTP_BOT_INBOX_ID;

    if (senderInboxId === botInboxId) {
      return 'bot';
    }

    return 'user';
  }

  /**
   * Extract metadata from message content
   */
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

  /**
   * Clear old messages based on retention policy
   */
  async cleanupOldMessages(retentionDays: number = 30): Promise<void> {
    try {
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      const result = await this.pg.query(`
        DELETE FROM xmtp_messages
        WHERE timestamp < $1
      `, [cutoffTime]);

      console.log(`🗑️ Cleaned up ${result.rowCount} old messages`);
    } catch (error) {
      console.error('❌ Error cleaning up old messages:', error);
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    lastMessageAt: number;
    participantCount: number;
    averageResponseTime: number;
  }> {
    try {
      const result = await this.pg.query(`
        SELECT
          COUNT(*) as message_count,
          MAX(timestamp) as last_message_at,
          COUNT(DISTINCT sender_address) as participant_count
        FROM xmtp_messages
        WHERE conversation_id = $1
      `, [conversationId]);

      const stats = result.rows[0];

      // Calculate average response time
      const responseTimeResult = await this.pg.query(`
        WITH message_pairs AS (
          SELECT
            timestamp,
            message_type,
            LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
            LAG(message_type) OVER (ORDER BY timestamp) as prev_message_type
          FROM xmtp_messages
          WHERE conversation_id = $1
          ORDER BY timestamp
        )
        SELECT AVG(timestamp - prev_timestamp) as avg_response_time
        FROM message_pairs
        WHERE prev_message_type = 'user' AND message_type = 'bot'
      `, [conversationId]);

      return {
        messageCount: parseInt(stats.message_count) || 0,
        lastMessageAt: parseInt(stats.last_message_at) || 0,
        participantCount: parseInt(stats.participant_count) || 0,
        averageResponseTime: parseInt(responseTimeResult.rows[0]?.avg_response_time) || 0,
      };
    } catch (error) {
      console.error('❌ Error getting conversation stats:', error);
      return {
        messageCount: 0,
        lastMessageAt: 0,
        participantCount: 0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    await this.pg.end();

    if (this.redis) {
      await this.redis.quit();
    }

    console.log('✅ Enhanced message store connections closed');
  }
}

// Global enhanced message store instance
export const enhancedMessageStore = new EnhancedMessageStore();
