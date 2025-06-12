"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  FaPaperPlane,
  FaTimes,
  FaUsers,
  FaRobot,
  FaCircle,
  FaSync,
  FaSpinner,
  FaEllipsisH,
} from "react-icons/fa";
import { useAccount } from "wagmi";
import {
  DEFAULT_FALLBACK_ADDRESS,
  CHAT_MODES,
  type ChatMode,
} from "@/lib/xmtp-constants";
// import { useRealTimeMessages } from "@/hooks/use-real-time-messages";
import { useBotStatus, useSendMessage } from "@/hooks/use-prediction-queries";
import { type StoredMessage } from "@/lib/xmtp-message-store";
import { useXMTPConnectionStatus } from "@/hooks/use-xmtp-auth";
import { useXMTPConversations } from "@/hooks/use-xmtp-conversations";

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  messageType?: "user" | "bot" | "system";
  metadata?: {
    predictionId?: number;
    actionType?: string;
  };
}

interface ChatInterfaceProps {
  onClose: () => void;
  embedded?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onClose,
  embedded = true,
}) => {
  // Enhanced authentication and XMTP readiness
  const {
    canInitializeXMTP,
    connectionMessage,
    primaryIdentity,
    userDisplayInfo,
    getConversationContext,
  } = useXMTPConnectionStatus();

  // XMTP Conversations Management
  const {
    isInitializing: xmtpInitializing,
    isReady: xmtpReady,
    initError: xmtpError,
    botConversation,
    communityConversation,
    sendToBotConversation,
    sendToCommunityConversation,
    initializeXMTPForCommunity, // Manual initialization
  } = useXMTPConversations();

  // Fallback API for when XMTP is not available
  const { data: botStatus } = useBotStatus();
  const sendMessageMutation = useSendMessage();
  const hasUnreadMessages = false;
  const totalUnreadCount = 0;

  // Local state
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPrediction, setPendingPrediction] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>(CHAT_MODES.AI_BOT);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [currentThinkingMessage, setCurrentThinkingMessage] = useState("");
  const [communityMessages, setCommunityMessages] = useState<ChatMessage[]>([]);

  // Dynamic thinking messages
  const thinkingMessages = [
    "Analyzing market trends...",
    "Consulting the prediction oracle...",
    "Crunching blockchain data...",
    "Checking fitness stats across networks...",
    "Evaluating prediction possibilities...",
    "Scanning live markets...",
    "Processing your request...",
    "Connecting to the multiverse...",
    "Calculating odds...",
    "Reviewing community insights...",
  ];

  // Refs for auto-scroll and UI management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enhanced conversation ID with authentication context
  const [conversationId] = useState(() => {
    const authType = primaryIdentity.type;
    const identifier =
      primaryIdentity.address || userDisplayInfo.identifier || "anon";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `chat_${authType}_${identifier.slice(-8)}_${timestamp}_${random}`;
  });

  // Bot address for XMTP communication
  const botAddress =
    process.env.NEXT_PUBLIC_PREDICTION_BOT_XMTP_ADDRESS ||
    "0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c";

  // Convert StoredMessage to ChatMessage format
  const convertToDisplayMessages = useCallback(
    (storedMessages: StoredMessage[]): ChatMessage[] => {
      return storedMessages.map((msg) => ({
        id: msg.id,
        sender:
          msg.messageType === "bot"
            ? "PredictionBot"
            : msg.messageType === "user"
            ? "You"
            : msg.senderAddress,
        content: msg.content,
        timestamp: msg.timestamp,
        messageType: msg.messageType,
        metadata: msg.metadata,
      }));
    },
    []
  );

  // Convert XMTP messages to display format
  const convertXMTPToDisplayMessages = useCallback(
    (xmtpMessages: any[]) => {
      return xmtpMessages.map((msg) => ({
        id: msg.id,
        sender:
          msg.senderInboxId === primaryIdentity.address
            ? "You"
            : "PredictionBot",
        content: msg.content,
        timestamp: msg.timestamp,
        messageType:
          msg.senderInboxId === primaryIdentity.address
            ? ("user" as const)
            : ("bot" as const),
      }));
    },
    [primaryIdentity.address]
  );

  // Display messages based on chat mode
  const displayMessages = useMemo(() => {
    if (chatMode === CHAT_MODES.COMMUNITY) {
      // Show community XMTP messages or setup message
      if (xmtpReady && communityConversation.messages.length > 0) {
        return convertXMTPToDisplayMessages(communityConversation.messages);
      } else {
        return [
          {
            id: "community_setup",
            sender: "Community",
            content: xmtpReady
              ? "💬 Welcome to the community chat!\n\nThis is where you can:\n• Discuss predictions with other users\n• Share fitness strategies\n• Chat about market trends\n\nStart chatting with other community members!"
              : "💬 Community Chat Setup Required\n\n🔐 Community chat uses XMTP for secure P2P messaging\n📝 This requires a one-time signature to create your decentralized inbox\n✨ Your messages will be end-to-end encrypted\n\n👆 Click 'Set up Community Chat' below to get started!",
            timestamp: Date.now() - 300000,
            messageType: "bot" as const,
          },
        ];
      }
    } else {
      // AI Bot chat - always works without XMTP
      return [
        {
          id: "ai_welcome",
          sender: "PredictionBot",
          content:
            '🤖 Ready to help with predictions and market insights!\n\nTry asking:\n• "What markets are live?"\n• "Create a Bitcoin prediction"\n• "Show me fitness stats"\n\n✨ No setup required - start chatting immediately! 🚀',
          timestamp: Date.now() - 300000,
          messageType: "bot" as const,
        },
      ];
    }
  }, [
    chatMode,
    xmtpReady,
    communityConversation.messages,
    convertXMTPToDisplayMessages,
  ]);

  // Monitor XMTP connection status
  useEffect(() => {
    if (!canInitializeXMTP) {
      setError(connectionMessage);
    } else if (xmtpError) {
      // Provide user-friendly error messages for XMTP issues
      let friendlyError = xmtpError;
      if (xmtpError.includes("Signature")) {
        friendlyError =
          "🔐 XMTP requires a signature to create your secure inbox. Please sign the message in your wallet to continue.";
      } else if (xmtpError.includes("popup")) {
        friendlyError =
          "🚫 Signature popup was blocked. Please allow popups and refresh the page.";
      } else if (xmtpError.includes("Access Handle")) {
        friendlyError =
          "⚠️ Database conflict detected. Please close other tabs with this app and refresh.";
      }
      setError(friendlyError);
    } else {
      setError(null);
    }
  }, [canInitializeXMTP, connectionMessage, xmtpError]);

  // Enhanced message sending with better UX
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");
    setIsLoading(true);
    setError(null);
    setIsTyping(false);

    // Start cycling through thinking messages
    const randomMessage =
      thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
    setCurrentThinkingMessage(randomMessage);

    // Change thinking message every 3 seconds
    const thinkingInterval = setInterval(() => {
      const newMessage =
        thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
      setCurrentThinkingMessage(newMessage);
    }, 3000);

    // Clear typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    // Scroll to bottom to show user's message
    setTimeout(() => scrollToBottom(), 50);

    try {
      if (chatMode === CHAT_MODES.AI_BOT) {
        // AI Bot conversation - use API by default (no signature required)
        const context = getConversationContext();
        await sendMessageMutation.mutateAsync({
          message: messageToSend,
          userAddress: primaryIdentity.address || DEFAULT_FALLBACK_ADDRESS,
          conversationId,
          context, // Include authentication context
        });
      } else if (chatMode === CHAT_MODES.COMMUNITY) {
        // Community chat - requires XMTP for P2P messaging
        if (xmtpReady && communityConversation.id) {
          await sendToCommunityConversation(messageToSend);
        } else {
          // Show helpful error for community chat
          setError(
            "Community chat requires XMTP setup. Click 'Set up Community Chat' to enable P2P messaging."
          );
        }
      }

      // Check for prediction proposals in the response
      if (
        messageToSend.toLowerCase().includes("create") &&
        messageToSend.toLowerCase().includes("prediction")
      ) {
        setPendingPrediction({
          id: `pred_${Date.now()}`,
          content: messageToSend,
        });
      }
      // Force scroll to show user's message and focus back on input
      scrollToBottomForced();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } catch (err) {
      console.error("❌ Failed to send message:", err);
      setError("Failed to send message. Please try again.");

      // Restore message on error
      setNewMessage(messageToSend);
    } finally {
      setIsLoading(false);
      clearInterval(thinkingInterval);
      setCurrentThinkingMessage("");
    }
  };

  // Handle prediction confirmation
  const handleConfirmPrediction = useCallback(() => {
    if (pendingPrediction) {
      // Here, integrate with smart contract to create prediction on-chain
      console.log("Confirming prediction:", pendingPrediction.content);

      // Add confirmation message
      const confirmationMessage: ChatMessage = {
        id: `confirm_${Date.now()}`,
        sender: "You",
        content: `Confirmed prediction: ${pendingPrediction.content}`,
        timestamp: Date.now(),
        messageType: "user",
      };

      setPendingPrediction(null);
      // In a real implementation, this would trigger the smart contract interaction
    }
  }, [pendingPrediction]);

  const handleEditPrediction = useCallback(() => {
    if (pendingPrediction) {
      setNewMessage(pendingPrediction.content);
      setPendingPrediction(null);
    }
  }, [pendingPrediction]);

  // Connection status indicator
  const getConnectionStatus = () => {
    if (xmtpInitializing)
      return {
        status: "connecting",
        color: "yellow",
        text: "Setting up secure chat...",
        detail: "First-time users need to sign a message to create XMTP inbox",
      };
    if (xmtpReady)
      return {
        status: "connected",
        color: "green",
        text: "XMTP Connected",
        detail: "Secure messaging ready",
      };
    if (xmtpError)
      return {
        status: "error",
        color: "red",
        text: "Connection Error",
        detail: "Check error message below",
      };
    if (botStatus?.online)
      return {
        status: "api",
        color: "blue",
        text: "API Connected",
        detail: "Using fallback messaging",
      };
    return {
      status: "offline",
      color: "gray",
      text: "Offline",
      detail: "Connect wallet to enable chat",
    };
  };

  const connectionStatus = getConnectionStatus();

  // Enhanced auto-scroll to keep user messages in view
  const scrollToBottom = useCallback(
    (smooth: boolean = true, force: boolean = false) => {
      if (messagesEndRef.current && messagesContainerRef.current) {
        // Check if user is near bottom before auto-scrolling
        const container = messagesContainerRef.current;
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          100;

        if (force || isNearBottom) {
          messagesEndRef.current.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "end",
          });
        }
      }
    },
    []
  );

  // Auto-scroll when messages change, but only if user is near bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom(true, false); // Don't force scroll unless user is near bottom
    }, 100);

    return () => clearTimeout(timer);
  }, [displayMessages.length, scrollToBottom]);

  // Force scroll when user sends a message
  const scrollToBottomForced = useCallback(() => {
    scrollToBottom(true, true);
  }, [scrollToBottom]);

  // Handle typing indicators
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set typing state
      if (!isTyping && e.target.value.length > 0) {
        setIsTyping(true);
      }

      // Clear typing after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 2000);

      setTypingTimeout(timeout);
    },
    [isTyping, typingTimeout]
  );

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const containerClass = embedded
    ? "bg-black bg-opacity-50 border-2 border-purple-800 rounded-lg flex flex-col h-[600px]"
    : "fixed bottom-0 right-0 left-0 bg-black bg-opacity-80 z-50 flex flex-col border-t-2 border-blue-800 rounded-t-lg max-h-[60vh] mx-auto";

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center p-3 border-b border-purple-800 bg-purple-900 bg-opacity-20">
        <div className="flex items-center gap-3">
          <h3 className="text-md font-bold text-purple-400">
            {embedded
              ? "AI Assistant & Community Chat"
              : "Prediction Chat (Beta)"}
          </h3>

          {/* Authentication Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">|</span>
            <div className="flex items-center gap-1">
              {primaryIdentity.type === "dual" && (
                <>
                  <span className="text-purple-400" title="Farcaster">
                    🟣
                  </span>
                  <span className="text-green-400" title="Wallet">
                    💰
                  </span>
                </>
              )}
              {primaryIdentity.type === "farcaster" && (
                <span className="text-purple-400" title="Farcaster Only">
                  🟣
                </span>
              )}
              {primaryIdentity.type === "wallet" && (
                <span className="text-green-400" title="Wallet Only">
                  💰
                </span>
              )}
              {primaryIdentity.type === "none" && (
                <span className="text-red-400" title="Not Connected">
                  ❌
                </span>
              )}
              <span className="text-gray-300 truncate max-w-20">
                {userDisplayInfo.displayName}
              </span>
            </div>
          </div>

          {/* Enhanced connection status */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <FaCircle
                className={`${
                  canInitializeXMTP ? "text-green-400" : "text-red-400"
                }`}
                size={8}
              />
              <span className="text-gray-300">
                {canInitializeXMTP ? "Ready" : "Not Ready"}
              </span>
            </div>

            {/* Unread message indicator */}
            {hasUnreadMessages && (
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {totalUnreadCount}
              </div>
            )}

            {/* Real-time indicator */}
            {isStreamActive && (
              <div className="flex items-center gap-1 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Live</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => window.location.reload()}
            className="text-gray-400 hover:text-white transition-colors"
            title="Refresh chat"
          >
            <FaSync size={14} />
          </button>

          {!embedded && (
            <button onClick={onClose} className="text-white hover:text-red-400">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Simplified Chat Mode Selector - AI Bot vs Community */}
      <div className="flex p-2 bg-black bg-opacity-20 border-b border-purple-800">
        <button
          onClick={() => setChatMode(CHAT_MODES.AI_BOT)}
          className={`flex-1 py-2 px-3 rounded-l-lg text-xs font-bold transition-all ${
            chatMode === CHAT_MODES.AI_BOT
              ? "bg-purple-600 text-white shadow-lg"
              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <FaRobot className="inline mr-1" />
          🤖 AI Assistant
        </button>
        <button
          onClick={() => setChatMode(CHAT_MODES.COMMUNITY)}
          className={`flex-1 py-2 px-3 rounded-r-lg text-xs font-bold transition-all ${
            chatMode === CHAT_MODES.COMMUNITY
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <FaUsers className="inline mr-1" />
          💬 Community
        </button>
      </div>

      {/* Authentication Error Display */}
      {!canInitializeXMTP && (
        <div className="p-3 bg-red-900 bg-opacity-20 border-b border-red-800">
          <div className="flex items-center gap-2 text-red-300 text-sm">
            <span className="text-red-400">⚠️</span>
            <div>
              <div className="font-medium">Chat Not Available</div>
              <div className="text-xs text-red-400">{connectionMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* XMTP Initialization Info - Only for Community Chat */}
      {xmtpInitializing &&
        canInitializeXMTP &&
        chatMode === CHAT_MODES.COMMUNITY && (
          <div className="p-3 bg-blue-900 bg-opacity-20 border-b border-blue-800">
            <div className="flex items-center gap-2 text-blue-300 text-sm">
              <FaSpinner className="animate-spin text-blue-400" />
              <div>
                <div className="font-medium">Setting up community chat...</div>
                <div className="text-xs text-blue-400 mt-1 space-y-1">
                  <div>
                    🔐 Community chat requires XMTP signature for P2P messaging
                  </div>
                  <div>📝 This creates your secure, decentralized inbox</div>
                  <div>💬 AI Bot chat works without signatures!</div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* XMTP Error Display */}
      {xmtpError && canInitializeXMTP && (
        <div className="p-3 bg-red-900 bg-opacity-20 border-b border-red-800">
          <div className="flex items-center gap-2 text-red-300 text-sm">
            <span className="text-red-400">⚠️</span>
            <div>
              <div className="font-medium">XMTP Connection Error</div>
              <div className="text-xs text-red-400">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 bg-black bg-opacity-30 scroll-smooth"
      >
        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-2 animate-fadeIn ${
              msg.sender === "You" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg text-sm max-w-md transition-all duration-200 ${
                msg.sender === "You"
                  ? "bg-green-700 text-white shadow-lg"
                  : msg.sender === "PredictionBot"
                  ? "bg-purple-700 text-white shadow-lg"
                  : "bg-gray-700 text-white shadow-lg"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-xs flex items-center gap-1">
                  {msg.sender === "PredictionBot" && (
                    <FaRobot className="text-purple-300" />
                  )}
                  {msg.sender === "You" && (
                    <span className="text-green-300">👤</span>
                  )}
                  {msg.sender}
                </div>
                <div className="text-xs opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Message type indicator */}
              {msg.messageType === "bot" && msg.sender === "PredictionBot" && (
                <div className="mt-1 text-xs opacity-60">🤖 AI Response</div>
              )}
            </div>
          </div>
        ))}

        {/* AI Thinking Indicator */}
        {isLoading && (
          <div className="mb-2 text-left animate-fadeIn">
            <div className="inline-block p-3 rounded-lg text-sm max-w-md bg-purple-700 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <FaRobot className="text-purple-300" />
                <span className="font-bold text-xs">PredictionBot</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <FaSpinner className="animate-spin text-purple-300" />
                <span className="text-purple-200">
                  {currentThinkingMessage || "Processing your request..."}
                </span>
                <div className="flex gap-1">
                  <div
                    className="w-1 h-1 bg-purple-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-purple-300 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-purple-300 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />

        {pendingPrediction && (
          <div className="mt-2 p-2 bg-yellow-800 text-white rounded text-xs">
            <p className="font-bold">Pending Prediction Proposal:</p>
            <p>{pendingPrediction.content}</p>
            <div className="mt-1 flex justify-start">
              <button
                onClick={handleConfirmPrediction}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded mr-2 text-xs"
              >
                Confirm
              </button>
              <button
                onClick={handleEditPrediction}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-0.5 rounded text-xs"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-purple-800 bg-black bg-opacity-30"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder={
                chatMode === CHAT_MODES.AI_BOT
                  ? "Ask about markets, create predictions, get insights..."
                  : xmtpReady
                  ? "Chat with the community..."
                  : "Set up community chat first..."
              }
              className={`w-full bg-black border-2 p-2 text-white text-sm rounded-lg focus:outline-none transition-all duration-200 ${
                chatMode === CHAT_MODES.AI_BOT
                  ? "border-purple-700 focus:border-purple-500"
                  : "border-blue-700 focus:border-blue-500"
              }`}
              disabled={isLoading}
              maxLength={500}
            />

            {/* Character count */}
            {newMessage.length > 400 && (
              <div className="absolute -top-6 right-0 text-xs text-gray-400">
                {newMessage.length}/500
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && !isLoading && (
              <div className="absolute -top-6 left-0 text-xs text-purple-400 flex items-center gap-1">
                <FaEllipsisH className="animate-pulse" />
                <span>typing...</span>
              </div>
            )}
          </div>

          {/* Community Chat Setup Button or Send Button */}
          {chatMode === CHAT_MODES.COMMUNITY && !xmtpReady ? (
            <button
              type="button"
              onClick={initializeXMTPForCommunity}
              disabled={xmtpInitializing}
              className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-sm font-medium"
              title="Set up secure P2P messaging for community chat"
            >
              {xmtpInitializing ? (
                <>
                  <FaSpinner className="animate-spin" size={14} />
                  Setting up...
                </>
              ) : (
                <>🔐 Set up Community Chat</>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                isLoading ||
                !newMessage.trim() ||
                (chatMode === CHAT_MODES.COMMUNITY && !xmtpReady)
              }
              className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 text-white disabled:bg-gray-600 ${
                chatMode === CHAT_MODES.AI_BOT
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              title={
                isLoading
                  ? chatMode === CHAT_MODES.AI_BOT
                    ? "AI is thinking..."
                    : "Sending..."
                  : "Send message"
              }
            >
              {isLoading ? (
                <FaSpinner className="animate-spin" size={14} />
              ) : (
                <FaPaperPlane size={14} />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <div>
            {isLoading ? (
              <span className="text-blue-400 flex items-center gap-1">
                <FaSpinner className="animate-spin" size={10} />
                AI is thinking...
              </span>
            ) : error ? (
              <span className="text-red-400">{error}</span>
            ) : (
              <span>
                {connectionStatus.status === "connected" && "🟢 XMTP active"}
                {connectionStatus.status === "api" && "🔵 API connected"}
                {connectionStatus.status === "connecting" && "🟡 Connecting..."}
                {connectionStatus.status === "offline" && "🔴 Offline"}
                {connectionStatus.status === "error" && "❌ Connection error"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Message count */}
            {displayMessages.length > 1 && (
              <span>{displayMessages.length - 1} messages</span>
            )}

            {/* Bot status */}
            <span>
              Bot: {botStatus?.online ? "🟢" : "🔴"}{" "}
              {botStatus?.environment || "Unknown"}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
