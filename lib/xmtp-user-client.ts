/**
 * Enhanced XMTP User Client for Frontend Integration
 * Based on ephemeraHQ examples and XMTP V3 best practices
 *
 * This module handles user-side XMTP client initialization, real-time messaging,
 * and conversation management for the prediction bot integration.
 */

import { Client, type XmtpEnv, type Conversation } from "@xmtp/node-sdk";
import { messageStore, type StoredMessage } from "./xmtp-message-store";
import { initializeXMTPClient } from "./xmtp-helpers";

interface UserXMTPConfig {
  userAddress: string;
  encryptionKey?: Uint8Array;
  env?: XmtpEnv;
}

interface XMTPMessage {
  id: string;
  content: string;
  senderAddress: string;
  timestamp: number;
  conversationId: string;
}

interface ConversationManager {
  conversation: Conversation;
  stopStream?: () => void;
  isStreaming: boolean;
}

/**
 * Enhanced XMTP User Client Manager
 * Handles user-side XMTP operations with real-time messaging and conversation management
 */
export class UserXMTPClient {
  private client: Client | null = null;
  private conversations: Map<string, ConversationManager> = new Map();
  private isInitialized = false;
  private messageListeners: Map<string, Set<(message: StoredMessage) => void>> = new Map();

  constructor(private config: UserXMTPConfig) {}

  /**
   * Initialize the user's XMTP client with real wallet integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log(`🔄 Initializing XMTP client for user: ${this.config.userAddress}`);

      // In production, this would use the user's actual wallet signer
      // For now, we'll create a simulated client for development
      if (process.env.NODE_ENV === 'development') {
        // Development mode: simulate client
        this.isInitialized = true;
        console.log(`✅ XMTP client initialized (dev mode) for user: ${this.config.userAddress}`);
        return true;
      }

      // Production mode: use real XMTP client
      // This would require proper wallet integration
      const privateKey = process.env.USER_PRIVATE_KEY; // This should come from wallet
      const encryptionKey = process.env.USER_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

      if (!privateKey || !encryptionKey) {
        console.warn('⚠️ Missing keys for XMTP client initialization');
        return false;
      }

      this.client = await initializeXMTPClient(
        privateKey,
        encryptionKey,
        this.config.env || 'dev'
      );

      this.isInitialized = true;
      console.log(`✅ XMTP client initialized for user: ${this.config.userAddress}`);

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize XMTP client:', error);
      return false;
    }
  }

  /**
   * Start a conversation with real-time streaming
   */
  async startConversationStream(
    peerAddress: string,
    onMessage: (message: StoredMessage) => void
  ): Promise<() => void> {
    if (!this.isInitialized) {
      throw new Error('XMTP client not initialized');
    }

    try {
      console.log(`🔄 Starting conversation stream with: ${peerAddress}`);

      if (this.client) {
        // Real XMTP implementation
        const conversation = await (this.client.conversations as any).newConversation?.(peerAddress);
        const conversationId = (conversation as any)?.topic || 'unknown';

        // Load existing history first
        await messageStore.loadConversationHistory(conversation, 50);

        // Start real-time streaming
        const stopStream = await messageStore.startMessageStream(conversation, onMessage);

        // Store conversation manager
        this.conversations.set(conversationId, {
          conversation,
          stopStream,
          isStreaming: true,
        });

        console.log(`✅ Started conversation stream: ${conversationId}`);
        return stopStream;
      } else {
        // Development fallback
        const conversationId = `conv_${this.config.userAddress}_${peerAddress}_${Date.now()}`;
        console.log(`✅ Started simulated conversation stream: ${conversationId}`);

        return () => {
          console.log(`⏹️ Stopped simulated conversation stream: ${conversationId}`);
        };
      }
    } catch (error) {
      console.error('❌ Failed to start conversation stream:', error);
      throw error;
    }
  }

  /**
   * Send a message with real-time delivery
   */
  async sendMessage(peerAddress: string, content: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('XMTP client not initialized');
    }

    try {
      console.log(`📤 Sending message to ${peerAddress}: ${content.substring(0, 50)}...`);

      if (this.client) {
        // Real XMTP implementation
        const conversation = await (this.client.conversations as any).newConversation?.(peerAddress);
        await (conversation as any)?.send?.(content);

        // Add to local store
        const message: StoredMessage = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId: conversation.topic,
          senderAddress: this.config.userAddress,
          content,
          timestamp: Date.now(),
          messageType: 'user',
        };

        messageStore.addMessage(message);
        console.log(`✅ Message sent via XMTP`);
      } else {
        // Development fallback - use API bridge
        const response = await fetch('/api/xmtp/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: this.config.userAddress,
            message: content,
            conversationId: `conv_${this.config.userAddress}_${peerAddress}_${Date.now()}`
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        console.log(`✅ Message sent via API bridge`);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Load conversation history with caching
   */
  async loadConversationHistory(peerAddress: string, limit: number = 50): Promise<StoredMessage[]> {
    if (!this.isInitialized) {
      throw new Error('XMTP client not initialized');
    }

    try {
      console.log(`📚 Loading conversation history with ${peerAddress}`);

      if (this.client) {
        // Real XMTP implementation
        const conversation = await (this.client.conversations as any).newConversation?.(peerAddress);
        return await messageStore.loadConversationHistory(conversation, limit);
      } else {
        // Development fallback - return cached messages
        const conversationId = `conv_${this.config.userAddress}_${peerAddress}`;
        return messageStore.getMessages(conversationId, limit);
      }
    } catch (error) {
      console.error('❌ Failed to load conversation history:', error);
      return [];
    }
  }

  /**
   * Subscribe to messages for a specific conversation
   */
  subscribeToMessages(conversationId: string, callback: (message: StoredMessage) => void): () => void {
    return messageStore.subscribeToMessages(conversationId, callback);
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(conversationId: string) {
    return messageStore.getConversationStats(conversationId);
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<any[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      if (this.client) {
        // Real XMTP implementation
        const conversations = await this.client.conversations.list();
        return conversations.map((conv: any) => ({
          id: conv.topic || conv.id || 'unknown',
          peerAddress: conv.peerAddress || 'unknown',
          createdAt: conv.createdAt || new Date(),
          lastMessage: null, // Would need to fetch
        }));
      } else {
        // Development fallback
        return messageStore.getConversations();
      }
    } catch (error) {
      console.error('❌ Failed to get conversations:', error);
      return [];
    }
  }

  /**
   * Check if user can use XMTP
   */
  static async canUseXMTP(userAddress: string): Promise<boolean> {
    try {
      // In a full implementation, this would check:
      // 1. If user has XMTP identity
      // 2. If user's wallet supports XMTP
      // 3. Network connectivity
      
      return true; // For now, assume all users can use XMTP
    } catch (error) {
      console.error('❌ Error checking XMTP compatibility:', error);
      return false;
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.isInitialized && (this.client !== null || process.env.NODE_ENV === 'development');
  }

  /**
   * Cleanup resources and stop all streams
   */
  async disconnect(): Promise<void> {
    // Stop all conversation streams
    for (const [conversationId, manager] of this.conversations.entries()) {
      if (manager.stopStream) {
        manager.stopStream();
      }
    }
    this.conversations.clear();

    // Clear message listeners
    this.messageListeners.clear();

    // Close XMTP client
    if (this.client) {
      // In a full implementation, this would properly close the XMTP client
      this.client = null;
    }

    this.isInitialized = false;
    console.log(`🔌 Disconnected XMTP client for user: ${this.config.userAddress}`);
  }
}

/**
 * Utility function to create and initialize a user XMTP client
 */
export async function createUserXMTPClient(config: UserXMTPConfig): Promise<UserXMTPClient | null> {
  try {
    const client = new UserXMTPClient(config);
    const initialized = await client.initialize();
    
    if (!initialized) {
      return null;
    }
    
    return client;
  } catch (error) {
    console.error('❌ Failed to create user XMTP client:', error);
    return null;
  }
}

/**
 * Check if XMTP is available in the current environment
 */
export function isXMTPAvailable(): boolean {
  // Check if we're in a browser environment with wallet support
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check for wallet providers that support XMTP
  const hasWallet = !!(window as any).ethereum || !!(window as any).coinbaseWalletExtension;
  
  return hasWallet;
}
