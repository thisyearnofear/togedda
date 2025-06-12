/**
 * WebSocket hook for real-time updates
 * Provides live updates for predictions and messages
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { io, Socket } from 'socket.io-client';
import { type StoredMessage } from '@/lib/xmtp-message-store';

interface WebSocketConfig {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastPing: number | null;
}

interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  
  // Conversation methods
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  
  // Prediction methods
  joinPredictions: () => void;
  leavePredictions: () => void;
  
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  
  // Event listeners
  onNewMessage: (callback: (message: StoredMessage) => void) => () => void;
  onMessageUpdated: (callback: (message: StoredMessage) => void) => () => void;
  onPredictionUpdated: (callback: (prediction: any) => void) => () => void;
  onPredictionCreated: (callback: (prediction: any) => void) => () => void;
  onPredictionResolved: (callback: (prediction: any) => void) => () => void;
  onUserTyping: (callback: (data: { userId: string; conversationId: string }) => void) => () => void;
  onUserStoppedTyping: (callback: (data: { userId: string; conversationId: string }) => void) => () => void;
}

export function useWebSocket(config: WebSocketConfig = {}): UseWebSocketReturn {
  const { address } = useAccount();
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
  } = config;

  // State
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastPing: null,
  });

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<Map<string, Set<Function>>>(new Map());

  // Helper to add event listeners
  const addEventListener = useCallback((event: string, callback: Function) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, new Set());
    }
    eventListenersRef.current.get(event)!.add(callback);

    // Return cleanup function
    return () => {
      const listeners = eventListenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          eventListenersRef.current.delete(event);
        }
      }
    };
  }, []);

  // Helper to emit to event listeners
  const emitToListeners = useCallback((event: string, data: any) => {
    const listeners = eventListenersRef.current.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
      
      socketRef.current = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        query: {
          userAddress: address || 'anonymous',
        },
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          lastPing: Date.now(),
        }));
        reconnectCountRef.current = 0;
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: `Disconnected: ${reason}`,
        }));

        // Auto-reconnect logic
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }

        if (reconnectCountRef.current < reconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, delay);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: `Connection error: ${error.message}`,
        }));
      });

      // Message events
      socket.on('new-message', (message: StoredMessage) => {
        emitToListeners('new-message', message);
      });

      socket.on('message-updated', (message: StoredMessage) => {
        emitToListeners('message-updated', message);
      });

      // Prediction events
      socket.on('prediction-updated', (prediction: any) => {
        emitToListeners('prediction-updated', prediction);
      });

      socket.on('prediction-created', (prediction: any) => {
        emitToListeners('prediction-created', prediction);
      });

      socket.on('prediction-resolved', (prediction: any) => {
        emitToListeners('prediction-resolved', prediction);
      });

      // Typing events
      socket.on('user-typing', (data: { userId: string; conversationId: string }) => {
        emitToListeners('user-typing', data);
      });

      socket.on('user-stopped-typing', (data: { userId: string; conversationId: string }) => {
        emitToListeners('user-stopped-typing', data);
      });

      // Status events
      socket.on('connection-status', (status: string) => {
        console.log('📡 Connection status:', status);
        setState(prev => ({ ...prev, lastPing: Date.now() }));
      });

      socket.on('error', (error: { message: string; code?: string }) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, error: error.message }));
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [address, reconnectAttempts, reconnectDelay, emitToListeners]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastPing: null,
    });

    console.log('🔌 WebSocket disconnected');
  }, []);

  // Room management
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-conversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-conversation', conversationId);
    }
  }, []);

  const joinPredictions = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-predictions');
    }
  }, []);

  const leavePredictions = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-predictions');
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', conversationId);
    }
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', conversationId);
    }
  }, []);

  // Event listener methods
  const onNewMessage = useCallback((callback: (message: StoredMessage) => void) => {
    return addEventListener('new-message', callback);
  }, [addEventListener]);

  const onMessageUpdated = useCallback((callback: (message: StoredMessage) => void) => {
    return addEventListener('message-updated', callback);
  }, [addEventListener]);

  const onPredictionUpdated = useCallback((callback: (prediction: any) => void) => {
    return addEventListener('prediction-updated', callback);
  }, [addEventListener]);

  const onPredictionCreated = useCallback((callback: (prediction: any) => void) => {
    return addEventListener('prediction-created', callback);
  }, [addEventListener]);

  const onPredictionResolved = useCallback((callback: (prediction: any) => void) => {
    return addEventListener('prediction-resolved', callback);
  }, [addEventListener]);

  const onUserTyping = useCallback((callback: (data: { userId: string; conversationId: string }) => void) => {
    return addEventListener('user-typing', callback);
  }, [addEventListener]);

  const onUserStoppedTyping = useCallback((callback: (data: { userId: string; conversationId: string }) => void) => {
    return addEventListener('user-stopped-typing', callback);
  }, [addEventListener]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && address) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, address, connect, disconnect]);

  return {
    // State
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    
    // Connection management
    connect,
    disconnect,
    
    // Room management
    joinConversation,
    leaveConversation,
    joinPredictions,
    leavePredictions,
    
    // Typing indicators
    startTyping,
    stopTyping,
    
    // Event listeners
    onNewMessage,
    onMessageUpdated,
    onPredictionUpdated,
    onPredictionCreated,
    onPredictionResolved,
    onUserTyping,
    onUserStoppedTyping,
  };
}
