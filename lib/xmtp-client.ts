"use client";

import { Client, Group } from "@xmtp/browser-sdk";

export interface XMTPClientConfig {
  signer: any; // Wallet signer
  env: "dev" | "production" | "local";
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
      
      this.client = await Client.create(this.config.signer, {
        env: this.config.env,
      });

      // Sync conversations to get latest state
      await this.client.conversations.sync();
      
      this.isInitialized = true;
      console.log("✅ XMTP client initialized successfully");
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

      await conversation.send(content);
      console.log("✅ Message sent successfully");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
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

      // Browser SDK uses stream() method with callback
      const stream = await conversation.stream((message) => {
        // Check if message exists and has the expected properties
        if (!message || !('senderInboxId' in message) || message.senderInboxId === this.client?.inboxId) return;
        onMessage(message);
      });

      // Return cleanup function
      return () => {
        // End the stream if it has an end method
        if (stream && typeof stream.end === 'function') {
          stream.end();
        }
        console.log("🔄 Message stream cleanup requested");
      };
    } catch (error) {
      console.error("❌ Failed to stream messages:", error);
      throw error;
    }
  }

  async streamAllMessages(onMessage: (message: any) => void): Promise<() => void> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      // Browser SDK uses streamAllMessages with callback
      const stream = await this.client.conversations.streamAllMessages((message) => {
        // Check if message exists and has the expected properties
        if (!message || !('senderInboxId' in message) || message.senderInboxId === this.client?.inboxId) return;
        onMessage(message);
      });

      // Return cleanup function
      return () => {
        // End the stream if it has an end method
        if (stream && typeof stream.end === 'function') {
          stream.end();
        }
        console.log("🔄 All messages stream cleanup requested");
      };
    } catch (error) {
      console.error("❌ Failed to stream all messages:", error);
      throw error;
    }
  }

  async getConversations(): Promise<ConversationInfo[]> {
    if (!this.client) throw new Error("XMTP client not initialized");

    try {
      await this.client.conversations.sync();
      const conversations = await this.client.conversations.list();
      
      return conversations.map((conv: any) => ({
        id: conv.id,
        type: conv.version === "GROUP" ? "group" : "dm",
        title: conv.name || `Conversation ${conv.id.slice(0, 8)}`,
        memberCount: conv.members?.length || 2,
        // Note: Getting last message would require additional API calls
      }));
    } catch (error) {
      console.error("❌ Failed to get conversations:", error);
      return [];
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
