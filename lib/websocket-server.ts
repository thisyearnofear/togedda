/**
 * WebSocket Server for Real-time Updates
 * Provides live updates for predictions, messages, and user activities
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { messageStore, type StoredMessage } from './xmtp-message-store';

interface SocketData {
  userId?: string;
  userAddress?: string;
  conversationId?: string;
}

interface ClientToServerEvents {
  'join-conversation': (conversationId: string) => void;
  'leave-conversation': (conversationId: string) => void;
  'join-predictions': () => void;
  'leave-predictions': () => void;
  'send-message': (data: { content: string; conversationId: string }) => void;
  'typing-start': (conversationId: string) => void;
  'typing-stop': (conversationId: string) => void;
}

interface ServerToClientEvents {
  'new-message': (message: StoredMessage) => void;
  'message-updated': (message: StoredMessage) => void;
  'prediction-updated': (prediction: any) => void;
  'prediction-created': (prediction: any) => void;
  'prediction-resolved': (prediction: any) => void;
  'user-typing': (data: { userId: string; conversationId: string }) => void;
  'user-stopped-typing': (data: { userId: string; conversationId: string }) => void;
  'connection-status': (status: 'connected' | 'disconnected' | 'error') => void;
  'error': (error: { message: string; code?: string }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

export class WebSocketManager {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private conversationRooms: Map<string, Set<string>> = new Map();
  private predictionRooms: Set<string> = new Set();
  private typingUsers: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    this.setupMessageStoreIntegration();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      // Send connection confirmation
      socket.emit('connection-status', 'connected');

      // Handle conversation joining
      socket.on('join-conversation', (conversationId) => {
        try {
          socket.join(`conversation:${conversationId}`);
          
          // Track room membership
          if (!this.conversationRooms.has(conversationId)) {
            this.conversationRooms.set(conversationId, new Set());
          }
          this.conversationRooms.get(conversationId)!.add(socket.id);
          
          console.log(`👥 Client ${socket.id} joined conversation: ${conversationId}`);
          
          // Send recent messages
          const recentMessages = messageStore.getMessages(conversationId, 20);
          recentMessages.forEach(message => {
            socket.emit('new-message', message);
          });
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle conversation leaving
      socket.on('leave-conversation', (conversationId) => {
        try {
          socket.leave(`conversation:${conversationId}`);
          
          // Update room membership
          const room = this.conversationRooms.get(conversationId);
          if (room) {
            room.delete(socket.id);
            if (room.size === 0) {
              this.conversationRooms.delete(conversationId);
            }
          }
          
          console.log(`👋 Client ${socket.id} left conversation: ${conversationId}`);
        } catch (error) {
          console.error('Error leaving conversation:', error);
        }
      });

      // Handle predictions room
      socket.on('join-predictions', () => {
        try {
          socket.join('predictions');
          this.predictionRooms.add(socket.id);
          console.log(`📊 Client ${socket.id} joined predictions room`);
        } catch (error) {
          console.error('Error joining predictions room:', error);
          socket.emit('error', { message: 'Failed to join predictions room' });
        }
      });

      socket.on('leave-predictions', () => {
        try {
          socket.leave('predictions');
          this.predictionRooms.delete(socket.id);
          console.log(`📊 Client ${socket.id} left predictions room`);
        } catch (error) {
          console.error('Error leaving predictions room:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing-start', (conversationId) => {
        try {
          if (!this.typingUsers.has(conversationId)) {
            this.typingUsers.set(conversationId, new Set());
          }
          this.typingUsers.get(conversationId)!.add(socket.id);
          
          // Broadcast to other users in the conversation
          socket.to(`conversation:${conversationId}`).emit('user-typing', {
            userId: socket.id,
            conversationId,
          });
        } catch (error) {
          console.error('Error handling typing start:', error);
        }
      });

      socket.on('typing-stop', (conversationId) => {
        try {
          const typingInConversation = this.typingUsers.get(conversationId);
          if (typingInConversation) {
            typingInConversation.delete(socket.id);
            if (typingInConversation.size === 0) {
              this.typingUsers.delete(conversationId);
            }
          }
          
          // Broadcast to other users in the conversation
          socket.to(`conversation:${conversationId}`).emit('user-stopped-typing', {
            userId: socket.id,
            conversationId,
          });
        } catch (error) {
          console.error('Error handling typing stop:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Clean up room memberships
        this.conversationRooms.forEach((room, conversationId) => {
          if (room.has(socket.id)) {
            room.delete(socket.id);
            if (room.size === 0) {
              this.conversationRooms.delete(conversationId);
            }
          }
        });
        
        this.predictionRooms.delete(socket.id);
        
        // Clean up typing indicators
        this.typingUsers.forEach((typingSet, conversationId) => {
          if (typingSet.has(socket.id)) {
            typingSet.delete(socket.id);
            // Notify others that user stopped typing
            socket.to(`conversation:${conversationId}`).emit('user-stopped-typing', {
              userId: socket.id,
              conversationId,
            });
          }
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  private setupMessageStoreIntegration() {
    // Subscribe to message store events
    // This would be implemented when message store supports event emission
    console.log('📡 WebSocket server integrated with message store');
  }

  // Public methods for broadcasting updates
  public broadcastNewMessage(message: StoredMessage) {
    try {
      this.io.to(`conversation:${message.conversationId}`).emit('new-message', message);
      console.log(`📨 Broadcasted new message to conversation: ${message.conversationId}`);
    } catch (error) {
      console.error('Error broadcasting new message:', error);
    }
  }

  public broadcastMessageUpdate(message: StoredMessage) {
    try {
      this.io.to(`conversation:${message.conversationId}`).emit('message-updated', message);
      console.log(`📝 Broadcasted message update to conversation: ${message.conversationId}`);
    } catch (error) {
      console.error('Error broadcasting message update:', error);
    }
  }

  public broadcastPredictionUpdate(prediction: any) {
    try {
      this.io.to('predictions').emit('prediction-updated', prediction);
      console.log(`📊 Broadcasted prediction update: ${prediction.id}`);
    } catch (error) {
      console.error('Error broadcasting prediction update:', error);
    }
  }

  public broadcastPredictionCreated(prediction: any) {
    try {
      this.io.to('predictions').emit('prediction-created', prediction);
      console.log(`🆕 Broadcasted new prediction: ${prediction.id}`);
    } catch (error) {
      console.error('Error broadcasting new prediction:', error);
    }
  }

  public broadcastPredictionResolved(prediction: any) {
    try {
      this.io.to('predictions').emit('prediction-resolved', prediction);
      console.log(`✅ Broadcasted prediction resolution: ${prediction.id}`);
    } catch (error) {
      console.error('Error broadcasting prediction resolution:', error);
    }
  }

  // Get statistics
  public getStats() {
    return {
      connectedClients: this.io.sockets.sockets.size,
      conversationRooms: this.conversationRooms.size,
      predictionRoomMembers: this.predictionRooms.size,
      activeTypingUsers: Array.from(this.typingUsers.values()).reduce((sum, set) => sum + set.size, 0),
    };
  }

  // Cleanup
  public close() {
    this.io.close();
    console.log('🔌 WebSocket server closed');
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocketServer(server: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
    console.log('🚀 WebSocket server initialized');
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
