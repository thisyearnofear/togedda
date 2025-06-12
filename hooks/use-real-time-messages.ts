/**
 * Real-time messaging hook with XMTP integration
 * Provides live message streaming, conversation management, and optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { 
  createUserXMTPClient, 
  type UserXMTPClient 
} from '@/lib/xmtp-user-client';
import { 
  messageStore, 
  type StoredMessage 
} from '@/lib/xmtp-message-store';
import { QUERY_KEYS } from './use-prediction-queries';

interface UseRealTimeMessagesConfig {
  autoConnect?: boolean;
  enablePersistence?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface MessageStreamState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  messageCount: number;
  lastMessageAt: number | null;
}

interface ConversationState {
  id: string;
  peerAddress: string;
  isActive: boolean;
  messageCount: number;
  unreadCount: number;
}

export function useRealTimeMessages(config: UseRealTimeMessagesConfig = {}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  
  // Configuration with defaults
  const {
    autoConnect = true,
    enablePersistence = true,
    maxRetries = 3,
    retryDelay = 2000,
  } = config;

  // State management
  const [xmtpClient, setXmtpClient] = useState<UserXMTPClient | null>(null);
  const [streamState, setStreamState] = useState<MessageStreamState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    messageCount: 0,
    lastMessageAt: null,
  });
  
  const [conversations, setConversations] = useState<Map<string, ConversationState>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);

  // Refs for cleanup and retry logic
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize XMTP client
   */
  const initializeClient = useCallback(async () => {
    if (!address || streamState.isConnecting) return;

    try {
      setStreamState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      console.log('🔄 Initializing XMTP client...');
      
      const client = await createUserXMTPClient({
        userAddress: address,
        env: 'dev',
      });

      if (client) {
        setXmtpClient(client);
        setStreamState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false,
          error: null 
        }));
        
        retryCountRef.current = 0; // Reset retry count on success
        console.log('✅ XMTP client initialized successfully');
      } else {
        throw new Error('Failed to create XMTP client');
      }
    } catch (error) {
      console.error('❌ Failed to initialize XMTP client:', error);
      setStreamState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
        
        console.log(`🔄 Retrying XMTP initialization in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          initializeClient();
        }, delay);
      }
    }
  }, [address, streamState.isConnecting, maxRetries, retryDelay]);

  /**
   * Start conversation stream with a peer
   */
  const startConversationStream = useCallback(async (peerAddress: string) => {
    if (!xmtpClient || !xmtpClient.isConnected()) {
      throw new Error('XMTP client not connected');
    }

    try {
      console.log(`🔄 Starting conversation stream with ${peerAddress}`);
      
      // Load existing history first
      const history = await xmtpClient.loadConversationHistory(peerAddress, 50);
      setMessages(history);

      // Start real-time stream
      const stopStream = await xmtpClient.startConversationStream(
        peerAddress,
        (message: StoredMessage) => {
          console.log('📨 Received real-time message:', message);
          
          // Update local state
          setMessages(prev => {
            const exists = prev.some(m => m.id === message.id);
            if (exists) return prev;
            return [...prev, message];
          });

          // Update stream state
          setStreamState(prev => ({
            ...prev,
            messageCount: prev.messageCount + 1,
            lastMessageAt: message.timestamp,
          }));

          // Update conversation state
          setConversations(prev => {
            const updated = new Map(prev);
            const existing = updated.get(message.conversationId);
            
            if (existing) {
              updated.set(message.conversationId, {
                ...existing,
                messageCount: existing.messageCount + 1,
                unreadCount: message.messageType !== 'user' ? existing.unreadCount + 1 : existing.unreadCount,
              });
            } else {
              updated.set(message.conversationId, {
                id: message.conversationId,
                peerAddress,
                isActive: true,
                messageCount: 1,
                unreadCount: message.messageType !== 'user' ? 1 : 0,
              });
            }
            
            return updated;
          });

          // Invalidate React Query cache
          queryClient.invalidateQueries({ 
            queryKey: QUERY_KEYS.CONVERSATION_HISTORY(message.conversationId) 
          });
        }
      );

      // Store cleanup function
      streamCleanupRef.current = stopStream;
      
      // Set active conversation
      const conversationId = `conv_${address}_${peerAddress}`;
      setActiveConversationId(conversationId);

      console.log('✅ Conversation stream started successfully');
      return stopStream;
    } catch (error) {
      console.error('❌ Failed to start conversation stream:', error);
      throw error;
    }
  }, [xmtpClient, address, queryClient]);

  /**
   * Send message with optimistic updates
   */
  const sendMessage = useCallback(async (peerAddress: string, content: string) => {
    if (!xmtpClient || !address) {
      throw new Error('XMTP client not available or no address');
    }

    try {
      // Optimistic update
      const optimisticMessage: StoredMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: `conv_${address}_${peerAddress}`,
        senderAddress: address,
        content,
        timestamp: Date.now(),
        messageType: 'user',
        metadata: {
          actionType: 'general',
        },
      };

      // Add to local state immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send via XMTP
      await xmtpClient.sendMessage(peerAddress, content);

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')));
      throw error;
    }
  }, [xmtpClient, address]);

  /**
   * Mark conversation as read
   */
  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations(prev => {
      const updated = new Map(prev);
      const existing = updated.get(conversationId);
      
      if (existing) {
        updated.set(conversationId, {
          ...existing,
          unreadCount: 0,
        });
      }
      
      return updated;
    });
  }, []);

  /**
   * Get conversation statistics
   */
  const getConversationStats = useCallback((conversationId: string) => {
    if (!xmtpClient) return null;
    return xmtpClient.getConversationStats(conversationId);
  }, [xmtpClient]);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    // Stop message stream
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Disconnect XMTP client
    if (xmtpClient) {
      xmtpClient.disconnect();
      setXmtpClient(null);
    }

    // Reset state
    setStreamState({
      isConnected: false,
      isConnecting: false,
      error: null,
      messageCount: 0,
      lastMessageAt: null,
    });
    
    setConversations(new Map());
    setActiveConversationId(null);
    setMessages([]);
    
    console.log('🔌 Real-time messaging cleaned up');
  }, [xmtpClient]);

  // Auto-initialize on address change
  useEffect(() => {
    if (address && autoConnect && !xmtpClient && !streamState.isConnecting) {
      initializeClient();
    }
    
    return () => {
      if (!address) {
        cleanup();
      }
    };
  }, [address, autoConnect, xmtpClient, streamState.isConnecting, initializeClient, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isConnected: streamState.isConnected,
    isConnecting: streamState.isConnecting,
    error: streamState.error,
    messages,
    conversations: Array.from(conversations.values()),
    activeConversationId,
    messageCount: streamState.messageCount,
    lastMessageAt: streamState.lastMessageAt,
    
    // Actions
    initializeClient,
    startConversationStream,
    sendMessage,
    markConversationAsRead,
    getConversationStats,
    cleanup,
    
    // Utilities
    isClientReady: !!xmtpClient && streamState.isConnected,
    hasUnreadMessages: Array.from(conversations.values()).some(c => c.unreadCount > 0),
    totalUnreadCount: Array.from(conversations.values()).reduce((sum, c) => sum + c.unreadCount, 0),
  };
}
