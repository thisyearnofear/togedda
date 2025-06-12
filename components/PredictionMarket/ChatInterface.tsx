"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaPaperPlane,
  FaTimes,
  FaRocket,
  FaUsers,
  FaRobot,
  FaCircle,
  FaSync,
  FaSpinner,
  FaEllipsisH,
} from "react-icons/fa";
import { sendMessageToBot, getBotStatus } from "./XMTPIntegration";
import { useAccount } from "wagmi";
import {
  DEFAULT_FALLBACK_ADDRESS,
  CHAT_CONFIG,
  ERROR_MESSAGES,
  CHAT_MODES,
  type ChatMode,
  formatErrorMessage,
} from "@/lib/xmtp-constants";
// import { useRealTimeMessages } from "@/hooks/use-real-time-messages";
import { useBotStatus, useSendMessage } from "@/hooks/use-prediction-queries";
import { type StoredMessage } from "@/lib/xmtp-message-store";

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
  // Hooks for real-time messaging and data fetching
  const { address: userAddress } = useAccount();
  const { data: botStatus, isLoading: botStatusLoading } = useBotStatus();
  const sendMessageMutation = useSendMessage();

  // Temporarily disabled for build compatibility
  const xmtpConnected = false;
  const xmtpConnecting = false;
  const xmtpError = null;
  const realTimeMessages: any[] = [];
  const conversations: any[] = [];
  const startConversationStream = useCallback(async () => {}, []);
  const sendXMTPMessage = async (_address: string, _message: string) => {};
  const isClientReady = false;
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

  // Refs for auto-scroll and UI management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Conversation ID for maintaining context
  const [conversationId] = useState(
    () =>
      `chat_${userAddress || "anon"}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`
  );

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

  // Display messages (real-time + fallback)
  const displayMessages =
    realTimeMessages.length > 0
      ? convertToDisplayMessages(realTimeMessages)
      : [
          {
            id: "welcome",
            sender: "PredictionBot",
            content:
              "Welcome! I'm your AI prediction assistant. Ask me:\n• 'What prediction markets are live?'\n• 'Create a prediction about Bitcoin reaching $100k'\n• 'How do prediction markets work?'\n\nYou can also chat with other users here!",
            timestamp: Date.now() - 300000,
            messageType: "bot" as const,
          },
        ];

  // Initialize real-time conversation stream
  useEffect(() => {
    const initializeStream = async () => {
      if (!userAddress || !isClientReady || isStreamActive) return;

      try {
        console.log("🔄 Starting conversation stream with bot...");
        await startConversationStream();
        setIsStreamActive(true);
        console.log("✅ Conversation stream started");
      } catch (error) {
        console.error("❌ Failed to start conversation stream:", error);
        setError("Failed to connect to real-time chat");
      }
    };

    initializeStream();
  }, [
    userAddress,
    isClientReady,
    isStreamActive,
    startConversationStream,
    botAddress,
  ]);

  // Enhanced message sending with better UX
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");
    setIsLoading(true);
    setError(null);
    setIsTyping(false);

    // Clear typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    // Scroll to bottom to show user's message
    setTimeout(() => scrollToBottom(), 50);

    try {
      if (chatMode === CHAT_MODES.AI_BOT) {
        // Send to AI bot
        if (isClientReady) {
          // Use real-time XMTP if available
          await sendXMTPMessage(botAddress, messageToSend);
        } else {
          // Fallback to API
          await sendMessageMutation.mutateAsync({
            message: messageToSend,
            userAddress: userAddress || DEFAULT_FALLBACK_ADDRESS,
            conversationId,
          });
        }
      } else if (chatMode === CHAT_MODES.COMMUNITY) {
        // Community chat - broadcast to all connected users
        // This would require additional implementation for multi-user chat
        console.log("Community chat not yet implemented");
        setError("Community chat coming soon!");
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
      // Focus back on input after sending
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
    if (xmtpConnecting)
      return { status: "connecting", color: "yellow", text: "Connecting..." };
    if (xmtpConnected && isClientReady)
      return {
        status: "connected",
        color: "green",
        text: "Real-time Connected",
      };
    if (xmtpError)
      return { status: "error", color: "red", text: "Connection Error" };
    if (botStatus?.online)
      return { status: "api", color: "blue", text: "API Connected" };
    return { status: "offline", color: "gray", text: "Offline" };
  };

  const connectionStatus = getConnectionStatus();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [displayMessages.length, scrollToBottom]);

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
    ? "bg-black bg-opacity-50 border-2 border-purple-800 rounded-lg flex flex-col h-[500px]"
    : "fixed bottom-0 right-0 left-0 bg-black bg-opacity-80 z-50 flex flex-col border-t-2 border-blue-800 rounded-t-lg max-h-[50vh] mx-auto";

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center p-3 border-b border-purple-800 bg-purple-900 bg-opacity-20">
        <div className="flex items-center gap-3">
          <h3 className="text-md font-bold text-purple-400">
            {embedded
              ? "AI Assistant & Community Chat"
              : "Prediction Chat (Beta)"}
          </h3>

          {/* Enhanced connection status */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <FaCircle
                className={`text-${connectionStatus.color}-400`}
                size={8}
              />
              <span className="text-gray-300">{connectionStatus.text}</span>
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

      {/* Chat Mode Selector */}
      <div className="flex p-2 bg-black bg-opacity-20 border-b border-purple-800">
        <button
          onClick={() => setChatMode(CHAT_MODES.AI_BOT)}
          className={`flex-1 py-2 px-3 rounded-l-lg text-xs font-bold transition-all ${
            chatMode === CHAT_MODES.AI_BOT
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <FaRobot className="inline mr-1" />
          AI Bot
        </button>
        <button
          onClick={() => setChatMode(CHAT_MODES.COMMUNITY)}
          className={`flex-1 py-2 px-3 text-xs font-bold transition-all ${
            chatMode === CHAT_MODES.COMMUNITY
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <FaUsers className="inline mr-1" />
          Community
        </button>
        <button
          onClick={() => setChatMode(CHAT_MODES.MIXED)}
          className={`flex-1 py-2 px-3 rounded-r-lg text-xs font-bold transition-all ${
            chatMode === CHAT_MODES.MIXED
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <FaRocket className="inline mr-1" />
          Mixed
        </button>
      </div>
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

              {/* Message metadata */}
              {msg.metadata?.actionType && (
                <div className="mt-1 text-xs opacity-60">
                  {msg.metadata.actionType === "create_prediction" &&
                    "🔮 Prediction"}
                  {msg.metadata.actionType === "vote" && "🗳️ Vote"}
                  {msg.metadata.actionType === "query" && "❓ Query"}
                </div>
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
                <span className="text-purple-200">AI is thinking...</span>
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
              placeholder="Ask about live markets, create predictions, or chat..."
              className="w-full bg-black border-2 border-purple-700 p-2 text-white text-sm rounded-lg focus:outline-none focus:border-purple-500 transition-all duration-200"
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

          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white p-2 rounded-lg transition-all duration-200 flex items-center gap-1"
            title={isLoading ? "AI is thinking..." : "Send message"}
          >
            {isLoading ? (
              <FaSpinner className="animate-spin" size={14} />
            ) : (
              <FaPaperPlane size={14} />
            )}
          </button>
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
                {connectionStatus.status === "connected" &&
                  "🟢 Real-time active"}
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
            {botStatus && (
              <span>
                Bot: {botStatus.online ? "🟢" : "🔴"} {botStatus.environment}
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
