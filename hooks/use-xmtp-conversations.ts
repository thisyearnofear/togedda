"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { useWalletClient } from "wagmi";
import { XMTPClientManager, type ConversationInfo } from "@/lib/xmtp-client";
import { useXMTPAuth } from "./use-xmtp-auth";

export interface XMTPMessage {
  id: string;
  content: string;
  senderInboxId: string;
  timestamp: number;
  conversationId: string;
}

export interface ConversationState {
  id: string;
  type: "bot" | "community";
  messages: XMTPMessage[];
  isLoading: boolean;
  error: string | null;
}

const BOT_INBOX_ID = process.env.NEXT_PUBLIC_XMTP_BOT_INBOX_ID || "16ff50d497ed1b3ac2a9e8979d295d35f103dd2e53cf45c953ac43a4e1e42d3d";

export function useXMTPConversations() {
  const { data: walletClient } = useWalletClient();
  const { canInitializeXMTP, primaryIdentity } = useXMTPAuth();
  
  const [clientManager, setClientManager] = useState<XMTPClientManager | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [botConversation, setBotConversation] = useState<ConversationState>({
    id: "",
    type: "bot",
    messages: [],
    isLoading: false,
    error: null,
  });
  
  const [communityConversation, setCommunityConversation] = useState<ConversationState>({
    id: "",
    type: "community", 
    messages: [],
    isLoading: false,
    error: null,
  });

  const streamCleanupRef = useRef<(() => void)[]>([]);

  // Initialize XMTP client
  const initializeClient = useCallback(async () => {
    if (!canInitializeXMTP || !walletClient || isInitializing || clientManager?.isReady) {
      return;
    }

    setIsInitializing(true);
    setInitError(null);

    try {
      const manager = new XMTPClientManager({
        signer: walletClient,
        env: process.env.NODE_ENV === "production" ? "production" : "dev",
      });

      await manager.initialize();
      setClientManager(manager);
      console.log("✅ XMTP client manager initialized");
    } catch (error) {
      console.error("❌ Failed to initialize XMTP:", error);
      setInitError(error instanceof Error ? error.message : "Failed to initialize XMTP");
    } finally {
      setIsInitializing(false);
    }
  }, [canInitializeXMTP, walletClient, isInitializing, clientManager?.isReady]);

  // Initialize bot conversation
  const initializeBotConversation = useCallback(async () => {
    if (!clientManager?.isReady || botConversation.id) return;

    setBotConversation(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const dm = await clientManager.getOrCreateBotDM(BOT_INBOX_ID);
      
      setBotConversation(prev => ({
        ...prev,
        id: dm.id,
        isLoading: false,
      }));

      // Start streaming messages for bot conversation
      const cleanup = await clientManager.streamMessages(dm.id, (message) => {
        const xmtpMessage: XMTPMessage = {
          id: message.id,
          content: message.content,
          senderInboxId: message.senderInboxId,
          timestamp: message.sentAt || Date.now(),
          conversationId: dm.id,
        };

        setBotConversation(prev => ({
          ...prev,
          messages: [...prev.messages, xmtpMessage],
        }));
      });

      streamCleanupRef.current.push(cleanup);
      console.log("✅ Bot conversation initialized");
    } catch (error) {
      console.error("❌ Failed to initialize bot conversation:", error);
      setBotConversation(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize bot conversation",
      }));
    }
  }, [clientManager?.isReady, botConversation.id]);

  // Initialize community conversation
  const initializeCommunityConversation = useCallback(async () => {
    if (!clientManager?.isReady || communityConversation.id) return;

    setCommunityConversation(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const group = await clientManager.getOrCreateCommunityGroup();
      
      setCommunityConversation(prev => ({
        ...prev,
        id: group.id,
        isLoading: false,
      }));

      // Start streaming messages for community conversation
      const cleanup = await clientManager.streamMessages(group.id, (message) => {
        const xmtpMessage: XMTPMessage = {
          id: message.id,
          content: message.content,
          senderInboxId: message.senderInboxId,
          timestamp: message.sentAt || Date.now(),
          conversationId: group.id,
        };

        setCommunityConversation(prev => ({
          ...prev,
          messages: [...prev.messages, xmtpMessage],
        }));
      });

      streamCleanupRef.current.push(cleanup);
      console.log("✅ Community conversation initialized");
    } catch (error) {
      console.error("❌ Failed to initialize community conversation:", error);
      setCommunityConversation(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize community conversation",
      }));
    }
  }, [clientManager?.isReady, communityConversation.id]);

  // Send message to specific conversation
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!clientManager?.isReady) {
      throw new Error("XMTP client not ready");
    }

    try {
      await clientManager.sendMessage(conversationId, content);
      
      // Add optimistic message to local state
      const optimisticMessage: XMTPMessage = {
        id: `temp_${Date.now()}`,
        content,
        senderInboxId: clientManager.inboxId!,
        timestamp: Date.now(),
        conversationId,
      };

      if (conversationId === botConversation.id) {
        setBotConversation(prev => ({
          ...prev,
          messages: [...prev.messages, optimisticMessage],
        }));
      } else if (conversationId === communityConversation.id) {
        setCommunityConversation(prev => ({
          ...prev,
          messages: [...prev.messages, optimisticMessage],
        }));
      }
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      throw error;
    }
  }, [clientManager, botConversation.id, communityConversation.id]);

  // Send message to bot
  const sendToBotConversation = useCallback(async (content: string) => {
    if (!botConversation.id) {
      throw new Error("Bot conversation not initialized");
    }
    return sendMessage(botConversation.id, content);
  }, [botConversation.id, sendMessage]);

  // Send message to community
  const sendToCommunityConversation = useCallback(async (content: string) => {
    if (!communityConversation.id) {
      throw new Error("Community conversation not initialized");
    }
    return sendMessage(communityConversation.id, content);
  }, [communityConversation.id, sendMessage]);

  // Initialize client when ready
  useEffect(() => {
    initializeClient();
  }, [initializeClient]);

  // Initialize conversations when client is ready
  useEffect(() => {
    if (clientManager?.isReady) {
      initializeBotConversation();
      initializeCommunityConversation();
    }
  }, [clientManager?.isReady, initializeBotConversation, initializeCommunityConversation]);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      streamCleanupRef.current.forEach(cleanup => cleanup());
      streamCleanupRef.current = [];
    };
  }, []);

  return {
    // Client state
    isInitializing,
    isReady: clientManager?.isReady || false,
    initError,
    
    // Conversations
    botConversation,
    communityConversation,
    
    // Actions
    sendToBotConversation,
    sendToCommunityConversation,
    
    // Utils
    clientManager,
  };
}
