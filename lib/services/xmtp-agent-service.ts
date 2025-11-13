/**
 * XMTP Agent Service
 * Following official XMTP agent patterns from ephemeraHQ/xmtp-agent-examples
 * Optimized for Base Batches Messaging Buildathon
 */

import { Client, type XmtpEnv, type Conversation } from "@xmtp/node-sdk";
import { initializeXMTPClient, validateXMTPEnvironment } from "./xmtp-helpers";
import { enhancedMessageStore } from "./enhanced-message-store";
import { processGroupFitnessCommand } from "./group-fitness-agent";

export interface AgentMessage {
  id: string;
  content: string;
  senderInboxId: string;
  conversationId: string;
  timestamp: number;
}

export interface AgentConfig {
  enableGroupFitness: boolean;
  enablePredictionMarkets: boolean;
  enableBasenames: boolean;
  autoRespond: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  enableGroupFitness: true,
  enablePredictionMarkets: true,
  enableBasenames: true,
  autoRespond: true,
};

/**
 * XMTP Fitness Agent Service
 * Handles all agent operations following XMTP best practices
 */
export class XMTPAgentService {
  private client: Client | null = null;
  private isRunning = false;
  private messageStreams: Map<string, () => void> = new Map();
  private config: AgentConfig;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the agent (following official patterns)
   */
  async initialize(): Promise<void> {
    try {
      console.log("🤖 Initializing XMTP Fitness Agent...");

      const env = validateXMTPEnvironment();
      this.client = await initializeXMTPClient(
        env.BOT_PRIVATE_KEY,
        env.ENCRYPTION_KEY,
        env.XMTP_ENV
      );

      console.log(`✅ Agent initialized with inbox ID: ${this.client.inboxId}`);
    } catch (error) {
      console.error("❌ Failed to initialize agent:", error);
      throw error;
    }
  }

  /**
   * Start the agent (following official streaming patterns)
   */
  async start(): Promise<void> {
    if (!this.client) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    if (this.isRunning) {
      console.log("⚠️ Agent is already running");
      return;
    }

    try {
      console.log("🚀 Starting XMTP Fitness Agent...");
      this.isRunning = true;

      // Sync conversations first (XMTP best practice)
      await this.client.conversations.sync();
      console.log("✅ Conversations synced");

      // Start message processing (simplified for hackathon)
      await this.startMessageProcessing();

      console.log("🎯 Agent is now active and listening for messages!");
    } catch (error) {
      console.error("❌ Failed to start agent:", error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    console.log("⏹️ Stopping XMTP Fitness Agent...");
    this.isRunning = false;

    // Stop all message streams
    for (const [conversationId, stopFn] of this.messageStreams) {
      try {
        stopFn();
        console.log(`✅ Stopped stream for conversation: ${conversationId}`);
      } catch (error) {
        console.error(`❌ Error stopping stream for ${conversationId}:`, error);
      }
    }

    this.messageStreams.clear();
    console.log("✅ Agent stopped");
  }

  /**
   * Start message processing (simplified for hackathon)
   */
  private async startMessageProcessing(): Promise<void> {
    if (!this.client) throw new Error("Client not initialized");

    console.log("🔄 Starting message processing (polling mode for hackathon demo)");

    // Use polling for reliable demo (can be upgraded to streaming later)
    const processMessages = async () => {
      if (!this.isRunning) return;

      try {
        const conversations = await this.client!.conversations.list();

        for (const conversation of conversations) {
          try {
            const messages = await (conversation as any).messages?.({ limit: 5 }) || [];

            for (const message of messages) {
              if (!message) continue;
              if (message.senderInboxId === this.client?.inboxId) continue;

              // Simple message processing for demo
              await this.handleMessage({
                id: message.id || `msg_${Date.now()}`,
                content: typeof message.content === 'string' ? message.content : 'Non-text message',
                senderInboxId: message.senderInboxId || 'unknown',
                conversationId: message.conversationId || conversation.id || 'unknown',
                timestamp: message.sentAt?.getTime() || Date.now(),
              });
            }
          } catch (convError) {
            console.warn(`⚠️ Error processing conversation:`, convError);
          }
        }
      } catch (error) {
        console.error("❌ Message processing error:", error);
      }

      // Schedule next processing cycle
      if (this.isRunning) {
        setTimeout(processMessages, 5000); // Process every 5 seconds
      }
    };

    // Start processing
    processMessages();
  }

  /**
   * Handle incoming messages (core agent logic)
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    try {
      console.log(`📨 Processing message from ${message.senderInboxId}: ${message.content.substring(0, 50)}...`);

      // Get sender address for context
      const senderAddress = await this.getSenderAddress(message.senderInboxId);
      let response: string | null = null;

      // Handle group fitness commands (slash commands)
      if (message.content.startsWith('/') && this.config.enableGroupFitness) {
        response = await processGroupFitnessCommand(
          message.content,
          senderAddress,
          message.conversationId
        );
      }

      // Handle prediction market queries
      if (!response && this.config.enablePredictionMarkets) {
        response = await this.handlePredictionQuery(message.content, senderAddress);
      }

      // Handle general fitness queries
      if (!response && this.config.autoRespond) {
        response = await this.handleGeneralQuery(message.content, senderAddress);
      }

      // Send response if we have one
      if (response) {
        await this.sendResponse(message.conversationId, response);
      }

      // Store message for history
      await this.storeMessage(message, response);

    } catch (error) {
      console.error(`❌ Error handling message ${message.id}:`, error);
      
      // Send error response to user
      try {
        await this.sendResponse(
          message.conversationId,
          "Sorry, I encountered an error processing your message. Please try again! 🤖"
        );
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }

  /**
   * Get sender address from inbox ID
   */
  private async getSenderAddress(senderInboxId: string): Promise<string> {
    if (!this.client) throw new Error("Client not initialized");

    try {
      // Use the correct API method for getting inbox states
      const inboxStates = await (this.client as any).getInboxStates([senderInboxId]);
      return inboxStates[0]?.identifiers[0]?.identifier || senderInboxId;
    } catch (error) {
      console.warn(`⚠️ Could not resolve address for ${senderInboxId}:`, error);
      // For now, return the inbox ID as fallback
      return senderInboxId;
    }
  }

  /**
   * Handle prediction market queries
   */
  private async handlePredictionQuery(content: string, senderAddress: string): Promise<string | null> {
    const lowerContent = content.toLowerCase();

    // Check for prediction intent
    if (lowerContent.includes('predict') || lowerContent.includes('bet') || lowerContent.includes('stake')) {
      try {
        const { generatePredictionProposal } = await import('./ai-bot-service');
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
          return "🤖 Prediction markets are temporarily unavailable. Please try again later!";
        }

        return await generatePredictionProposal(content, apiKey, `agent_${Date.now()}`);
      } catch (error) {
        console.error("❌ Error generating prediction proposal:", error);
        return null;
      }
    }

    // Check for live markets query
    if (lowerContent.includes('live') && lowerContent.includes('market')) {
      try {
        const { getMarketSummaryForBot } = await import('./contract-data-service');
        return await getMarketSummaryForBot();
      } catch (error) {
        console.error("❌ Error fetching live markets:", error);
        return "🤖 Unable to fetch live markets right now. Please try again later!";
      }
    }

    return null;
  }

  /**
   * Handle general fitness queries
   */
  private async handleGeneralQuery(content: string, senderAddress: string): Promise<string | null> {
    const lowerContent = content.toLowerCase();

    // Greeting responses
    if (lowerContent.includes('hello') || lowerContent.includes('hi') || lowerContent.includes('gm')) {
      return `Hello! 👋 I'm your AI fitness agent on XMTP!

🏋️ **What I can help with:**
• Create fitness predictions with real ETH stakes
• Start group fitness challenges (\`/challenge pushups 1000 7\`)
• Track your progress (\`/progress 150\`)
• Motivate your group (\`/motivate\`)
• Show live prediction markets

**Try saying:** "I predict I'll do 500 pushups by February 1st" or "/challenge squats 300 5"

Let's get moving! 💪`;
    }

    // Help responses
    if (lowerContent.includes('help') || lowerContent.includes('command')) {
      return `🤖 **XMTP Fitness Agent Commands**

**Prediction Markets:**
• "I predict I'll do 500 pushups by March 15th" - Create prediction with stakes
• "What prediction markets are live?" - View active markets
• "Help me understand prediction markets" - Learn how they work

**Group Fitness:**
• "Start a pushup challenge with jesse.base.eth and bamstrong.base.eth" - Create group challenge
• "Show me the fitness leaderboard" - View group standings
• "Give me some motivation to stay hard" - Get Goggins motivation
• "I completed 150 pushups today" - Update your progress

**Examples:**
• "I predict I'll do 1000 pushups by March 1st"
• "Start a squat challenge for 7 days"
• "What markets are live right now?"

Turn your chat into a fitness powerhouse! 🚀`;
    }

    return null;
  }

  /**
   * Send response to conversation
   */
  private async sendResponse(conversationId: string, content: string): Promise<void> {
    if (!this.client) throw new Error("Client not initialized");

    try {
      const conversation = await this.client.conversations.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      await conversation.send(content);
      console.log(`✅ Response sent to conversation: ${conversationId}`);
    } catch (error) {
      console.error(`❌ Failed to send response to ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Store message for history and analytics
   */
  private async storeMessage(message: AgentMessage, response: string | null): Promise<void> {
    try {
      // Store user message
      await enhancedMessageStore.addMessage({
        id: message.id,
        conversationId: message.conversationId,
        senderAddress: await this.getSenderAddress(message.senderInboxId),
        content: message.content,
        timestamp: message.timestamp,
        messageType: 'user',
        metadata: {
          actionType: 'general',
          xmtpMessageId: message.senderInboxId,
        },
      });

      // Store bot response if any
      if (response) {
        await enhancedMessageStore.addMessage({
          id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId: message.conversationId,
          senderAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'agent',
          content: response,
          timestamp: Date.now(),
          messageType: 'bot',
          metadata: {
            actionType: 'general',
            xmtpMessageId: message.id,
          },
        });
      }
    } catch (error) {
      console.error("❌ Failed to store message:", error);
      // Don't throw - message storage failure shouldn't break the agent
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isInitialized: !!this.client,
      inboxId: this.client?.inboxId,
      activeStreams: this.messageStreams.size,
      config: this.config,
    };
  }
}

// Export singleton instance
export const fitnessAgent = new XMTPAgentService();
