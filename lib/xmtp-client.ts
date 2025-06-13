"use client";

import { Client, Group, type Signer } from "@xmtp/browser-sdk";
import type { WalletClient } from "viem";

export interface XMTPClientConfig {
  signer: WalletClient; // Wagmi wallet client
  env: "dev" | "production" | "local";
}

// Convert wagmi WalletClient to XMTP Signer
function createXMTPSigner(walletClient: WalletClient): Signer {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: walletClient.account?.address || "",
      identifierKind: "Ethereum" as const,
    }),
    signMessage: async (message: string) => {
      if (!walletClient.account) {
        throw new Error("No account connected");
      }

      console.log("🔐 XMTP requesting signature for:", message.substring(0, 50) + "...");

      try {
        const signature = await walletClient.signMessage({
          account: walletClient.account,
          message,
        });

        console.log("✅ Signature obtained successfully");

        // Convert hex signature to Uint8Array
        return new Uint8Array(
          signature.slice(2).match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
      } catch (error) {
        console.error("❌ Signature failed:", error);
        throw error;
      }
    },
  };
}

export interface ConversationInfo {
  id: string;
  type: "dm" | "group";
  title?: string;
  memberCount?: number;
  lastMessage?: {
    content: string;
    timestamp: number;
    sender: string;
  };
}

export class XMTPClientManager {
  private client: Client | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private config: XMTPClientConfig) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log("🔄 Initializing XMTP client...");

      // Convert wagmi wallet client to XMTP signer
      const xmtpSigner = createXMTPSigner(this.config.signer);

      // Create unique database path to avoid conflicts
      const walletAddress = this.config.signer.account?.address;
      const dbPath = walletAddress ? `xmtp-${walletAddress.toLowerCase()}` : undefined;

      this.client = await Client.create(xmtpSigner, {
        env: this.config.env,
        dbPath,
        // Enable structured logging for better debugging
        structuredLogging: process.env.NODE_ENV === "development",
        loggingLevel: process.env.NODE_ENV === "development" ? "info" : "warn",
      });

      // Sync conversations to get latest state
      await this.client.conversations.sync();

      this.isInitialized = true;
      console.log("✅ XMTP client initialized successfully");
      console.log(`📧 Inbox ID: ${this.client.inboxId}`);
    } catch (error) {
      console.error("❌ Failed to initialize XMTP client:", error);
      this.initPromise = null;
      throw error;
    }
  }

  async getOrCreateBotDM(botInboxId: string): Promise<any> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      // Check if DM already exists
      let dm = await this.client.conversations.getDmByInboxId(botInboxId);

      if (!dm) {
        // Check if bot is reachable - browser SDK uses different API
        const canMessage = await Client.canMessage([{
          identifier: botInboxId,
          identifierKind: "Ethereum"
        }]);

        if (!canMessage.get(botInboxId)) {
          throw new Error("Bot is not reachable on XMTP network");
        }

        // Create new DM with bot
        dm = await this.client.conversations.newDm(botInboxId);
        console.log("✅ Created new DM with prediction bot");
      }

      return dm;
    } catch (error) {
      console.error("❌ Failed to get/create bot DM:", error);
      throw error;
    }
  }

  async getOrCreateCommunityGroup(groupName: string = "Imperfect Form Community"): Promise<any> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      // For now, create an optimistic group that can be synced later
      // In a real implementation, you'd want to manage group membership more carefully
      const group = await this.client.conversations.newGroupOptimistic({
        name: groupName,
        description: "Community chat for fitness predictions and discussions",
      });

      console.log("✅ Created community group chat");
      return group;
    } catch (error) {
      console.error("❌ Failed to create community group:", error);
      throw error;
    }
  }

  async sendMessage(conversationId: string, content: string): Promise<void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      const conversation = await this.client.conversations.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      console.log(`📤 Sending message to conversation: ${conversationId}`);
      await conversation.send(content);
      console.log("✅ Message sent successfully");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      throw error;
    }
  }

  /**
   * Send a reaction to a message (XMTP content type)
   */
  async sendReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      const conversation = await this.client.conversations.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // For now, send as text - in production, use reaction content type
      const reactionMessage = `${emoji} (reacting to message)`;
      await conversation.send(reactionMessage);
      console.log(`✅ Reaction sent: ${emoji}`);
    } catch (error) {
      console.error("❌ Failed to send reaction:", error);
      throw error;
    }
  }

  async streamMessages(conversationId: string, onMessage: (message: any) => void): Promise<() => void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      const conversation = await this.client.conversations.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      console.log(`🔄 Starting message stream for conversation: ${conversationId}`);

      // Simplified streaming for hackathon - use polling for now
      let isStreaming = true;
      const pollInterval = setInterval(async () => {
        if (!isStreaming) return;

        try {
          // Get recent messages (simplified approach)
          const messages = await (conversation as any).messages?.({ limit: 5 }) || [];
          for (const message of messages) {
            if (message.senderInboxId === this.client?.inboxId) continue;
            onMessage(message);
          }
        } catch (error) {
          console.error(`❌ Polling error for ${conversationId}:`, error);
        }
      }, 2000); // Poll every 2 seconds

      // Return cleanup function
      return () => {
        isStreaming = false;
        clearInterval(pollInterval);
        console.log(`⏹️ Stopped message stream for conversation: ${conversationId}`);
      };
    } catch (error) {
      console.error("❌ Failed to stream messages:", error);
      throw error;
    }
  }

  async streamAllMessages(onMessage: (message: any) => void): Promise<() => void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      console.log("🔄 Starting stream for all conversations");

      // Sync conversations first (best practice from docs)
      await this.client.conversations.sync();

      // Simplified streaming for hackathon - use polling
      let isStreaming = true;
      const pollInterval = setInterval(async () => {
        if (!isStreaming) return;

        try {
          const conversations = await this.client!.conversations.list();
          for (const conversation of conversations) {
            const messages = await (conversation as any).messages?.({ limit: 3 }) || [];
            for (const message of messages) {
              if (message.senderInboxId === this.client?.inboxId) continue;
              onMessage(message);
            }
          }
        } catch (error) {
          console.error("❌ All messages polling error:", error);
        }
      }, 3000); // Poll every 3 seconds

      // Return cleanup function
      return () => {
        isStreaming = false;
        clearInterval(pollInterval);
        console.log("⏹️ Stopped all messages stream");
      };
    } catch (error) {
      console.error("❌ Failed to stream all messages:", error);
      throw error;
    }
  }

  async getConversations(): Promise<ConversationInfo[]> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      console.log("🔄 Syncing conversations from network...");
      await this.client.conversations.sync();

      const conversations = await this.client.conversations.list();
      console.log(`✅ Found ${conversations.length} conversations`);

      return conversations.map((conv: any) => ({
        id: conv.id,
        type: conv.version === "GROUP" ? "group" : "dm",
        title: conv.name || `Conversation ${conv.id.slice(0, 8)}`,
        memberCount: conv.members?.length || 2,
        lastMessageTime: conv.lastMessage?.sentAt || Date.now(),
      }));
    } catch (error) {
      console.error("❌ Failed to get conversations:", error);
      return [];
    }
  }

  /**
   * Sync specific conversation messages (XMTP best practice)
   */
  async syncConversation(conversationId: string): Promise<void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      const conversation = await this.client.conversations.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      console.log(`🔄 Syncing conversation: ${conversationId}`);
      await conversation.sync();
      console.log(`✅ Conversation synced: ${conversationId}`);
    } catch (error) {
      console.error(`❌ Failed to sync conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Check if an identity is reachable on XMTP (simplified for hackathon)
   */
  async canMessage(address: string): Promise<boolean> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      // Simplified check - assume most addresses can be messaged for demo
      console.log(`🔍 Checking if can message: ${address}`);
      return true; // For hackathon demo, assume all addresses are reachable
    } catch (error) {
      console.error(`❌ Failed to check if can message ${address}:`, error);
      return false;
    }
  }

  async addMembersToGroup(groupId: string, memberInboxIds: string[]): Promise<void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      const conversation = await this.client.conversations.getConversationById(groupId);
      if (!conversation || !(conversation instanceof Group)) {
        throw new Error("Group not found or invalid");
      }

      // Check if members are reachable - browser SDK uses different API
      const identifiers = memberInboxIds.map(id => ({
        identifier: id,
        identifierKind: "Ethereum" as const
      }));

      const canMessage = await Client.canMessage(identifiers);
      const reachableMembers = memberInboxIds.filter(id => canMessage.get(id));

      if (reachableMembers.length === 0) {
        throw new Error("No reachable members to add");
      }

      await conversation.addMembers(reachableMembers);
      console.log(`✅ Added ${reachableMembers.length} members to group`);
    } catch (error) {
      console.error("❌ Failed to add members to group:", error);
      throw error;
    }
  }

  get inboxId(): string | null {
    return this.client?.inboxId || null;
  }

  get isReady(): boolean {
    return this.isInitialized && !!this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // Note: Browser SDK doesn't have explicit disconnect
      // Just clear references for garbage collection
      this.client = null;
      this.isInitialized = false;
      this.initPromise = null;
      console.log("🔄 XMTP client disconnected");
    }
  }
}
