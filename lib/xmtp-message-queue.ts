/**
 * XMTP Message Queue System
 * Bridges the gap between frontend API calls and the XMTP bot service
 *
 * This system allows the frontend to send messages that get processed by the bot
 * even when the bot is running as a separate service.
 */

import { CHAT_CONFIG } from './xmtp-constants';

interface QueuedMessage {
  id: string;
  userAddress: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: string;
  error?: string;
}

// In-memory message queue (in production, use Redis or database)
const messageQueue: Map<string, QueuedMessage> = new Map();
const messageResponses: Map<string, string> = new Map();

/**
 * Add a message to the queue for processing
 */
export function queueMessage(userAddress: string, message: string): string {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const queuedMessage: QueuedMessage = {
    id: messageId,
    userAddress,
    message,
    timestamp: Date.now(),
    status: 'pending'
  };
  
  messageQueue.set(messageId, queuedMessage);
  
  console.log(`📨 Queued message ${messageId} from ${userAddress}: ${message}`);
  
  return messageId;
}

/**
 * Get a message from the queue
 */
export function getMessage(messageId: string): QueuedMessage | undefined {
  return messageQueue.get(messageId);
}

/**
 * Update message status
 */
export function updateMessageStatus(
  messageId: string, 
  status: QueuedMessage['status'], 
  response?: string, 
  error?: string
): void {
  const message = messageQueue.get(messageId);
  if (message) {
    message.status = status;
    if (response) message.response = response;
    if (error) message.error = error;
    messageQueue.set(messageId, message);
    
    console.log(`📝 Updated message ${messageId} status to ${status}`);
  }
}

/**
 * Get all pending messages (for bot service to process)
 */
export function getPendingMessages(): QueuedMessage[] {
  return Array.from(messageQueue.values()).filter(msg => msg.status === 'pending');
}

/**
 * Mark message as processing
 */
export function markMessageProcessing(messageId: string): void {
  updateMessageStatus(messageId, 'processing');
}

/**
 * Complete message processing with response
 */
export function completeMessage(messageId: string, response: string): void {
  updateMessageStatus(messageId, 'completed', response);
}

/**
 * Mark message as failed
 */
export function failMessage(messageId: string, error: string): void {
  updateMessageStatus(messageId, 'failed', undefined, error);
}

/**
 * Wait for message completion (with timeout)
 */
export async function waitForMessageResponse(
  messageId: string,
  timeoutMs: number = CHAT_CONFIG.MESSAGE_TIMEOUT
): Promise<string> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkMessage = () => {
      const message = getMessage(messageId);
      
      if (!message) {
        reject(new Error('Message not found'));
        return;
      }
      
      if (message.status === 'completed' && message.response) {
        resolve(message.response);
        return;
      }
      
      if (message.status === 'failed') {
        reject(new Error(message.error || 'Message processing failed'));
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Message processing timeout'));
        return;
      }
      
      // Check again in 100ms
      setTimeout(checkMessage, 100);
    };
    
    checkMessage();
  });
}

/**
 * Clean up old messages (call periodically)
 */
export function cleanupOldMessages(maxAgeMs: number = CHAT_CONFIG.MESSAGE_CLEANUP_AGE): void {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [id, message] of messageQueue.entries()) {
    if (now - message.timestamp > maxAgeMs) {
      toDelete.push(id);
    }
  }
  
  toDelete.forEach(id => {
    messageQueue.delete(id);
    console.log(`🗑️ Cleaned up old message ${id}`);
  });
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const messages = Array.from(messageQueue.values());
  return {
    total: messages.length,
    pending: messages.filter(m => m.status === 'pending').length,
    processing: messages.filter(m => m.status === 'processing').length,
    completed: messages.filter(m => m.status === 'completed').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };
}
