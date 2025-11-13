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
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import {
  DEFAULT_FALLBACK_ADDRESS,
  CHAT_MODES,
  type ChatMode,
} from "@/lib/xmtp-constants";
// import { useRealTimeMessages } from "@/hooks/use-real-time-messages";
import {
  useBotStatus,
  useSendMessage,
  useConversationHistory,
  useCacheInvalidation,
} from "@/hooks/use-prediction-queries";
import { type StoredMessage } from "@/lib/xmtp-message-store";
import { useXMTPConnectionStatus } from "@/hooks/use-xmtp-auth";
import { useXMTPConversations } from "@/hooks/use-xmtp-conversations";
import { predictionMarketABI } from "@/lib/constants";
import NetworkMismatchModal from "@/components/NetworkMismatchModal";
import NetworkSwitchButton from "@/components/NetworkSwitchButton";
import { getChainName } from "@/lib/config/chains";
import TransactionSuccessModal from "./TransactionSuccessModal";
// Removed AgentKit modal - users always use their wallet

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
  const { invalidatePredictions } = useCacheInvalidation();

  const hasUnreadMessages = false;
  const totalUnreadCount = 0;

  // Local state
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPrediction, setPendingPrediction] = useState<{
    id: string;
    content: string;
    transactionParams?: any;
  } | null>(null);

  // Track processed wallet triggers to prevent duplicates
  const [processedTriggers, setProcessedTriggers] = useState<Set<string>>(
    new Set()
  );
  const [isCreatingPrediction, setIsCreatingPrediction] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(CHAT_MODES.AI_BOT);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [currentThinkingMessage, setCurrentThinkingMessage] = useState("");
  const [communityMessages, setCommunityMessages] = useState<ChatMessage[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    type: "prediction" | "stake" | "claim";
    hash?: string;
    title?: string;
  }>({ type: "prediction" });

  // Quick action confirmation state
  const [pendingAction, setPendingAction] = useState<{
    message: string;
    icon: string;
    description: string;
  } | null>(null);

  // Removed AgentKit modal state - users always use their wallet

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

  // Get conversation history from query cache (after conversationId is declared)
  const { data: conversationHistory = [], isLoading: historyLoading } =
    useConversationHistory(conversationId);

  // Bot address for XMTP communication
  const botAddress =
    process.env.NEXT_PUBLIC_PREDICTION_BOT_XMTP_ADDRESS ||
    "0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c";

  // Wagmi hooks for contract interaction
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const {
    writeContract,
    data: hash,
    isPending: isContractPending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

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
      // AI Bot chat - use conversation history from query cache
      if (conversationHistory.length > 0) {
        // Convert stored messages to display format
        return conversationHistory.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          messageType: msg.messageType,
          metadata: msg.metadata,
        }));
      } else {
        // Show welcome message when no conversation history
        return [
          {
            id: "ai_welcome",
            sender: "PredictionBot",
            content:
              '🤖 AI Fitness Agent Ready!\n💬 Try: "I predict 500 pushups by March 15th" or use Quick Actions 🔥',
            timestamp: Date.now() - 300000,
            messageType: "bot" as const,
          },
        ];
      }
    }
  }, [
    chatMode,
    xmtpReady,
    communityConversation.messages,
    conversationHistory,
    convertXMTPToDisplayMessages,
  ]);

  // Monitor XMTP connection status
  useEffect(() => {
    if (xmtpError) {
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
  }, [xmtpError]);

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

    // Removed autoscroll - let users control their own scrolling

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
      // Focus back on input without forced scrolling
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

  // Network mismatch state
  const [showNetworkMismatch, setShowNetworkMismatch] = useState(false);
  const [networkMismatchData, setNetworkMismatchData] = useState<{
    currentChainId: number;
    targetChainId: number;
    targetChainName: string;
    transactionParams: any;
  } | null>(null);

  // Prevent infinite network switch loops
  const [lastNetworkSwitchAttempt, setLastNetworkSwitchAttempt] =
    useState<number>(0);
  const NETWORK_SWITCH_COOLDOWN = 5000; // 5 seconds

  // Create prediction via wallet transaction
  const handleCreatePrediction = useCallback(
    async (transactionParams: any) => {
      console.log("🎯 handleCreatePrediction called with:", transactionParams);
      console.log(
        "💰 Wallet status - Connected:",
        isConnected,
        "Address:",
        address,
        "Current Chain:",
        chain?.id
      );
      console.log("🔄 Already creating prediction:", isCreatingPrediction);

      if (!transactionParams || isCreatingPrediction) {
        console.log("❌ Early return - no params or already creating");
        return;
      }

      if (!isConnected || !address) {
        console.error("❌ Wallet not connected!");
        setError("Please connect your wallet first");
        return;
      }

      setIsCreatingPrediction(true);

      try {
        const targetChainId = transactionParams.chainId;
        console.log(
          `🔗 Target chain ID: ${targetChainId}, Current chain ID: ${chain?.id}`
        );

        // Check if we need to switch chains (ensure both are numbers for comparison)
        const currentChainId = Number(chain?.id);
        const targetChainIdNum = Number(targetChainId);

        if (currentChainId !== targetChainIdNum) {
          console.log(`🔄 Network mismatch detected - showing switch UI`);

          // Check cooldown to prevent infinite loops
          const now = Date.now();
          if (now - lastNetworkSwitchAttempt < NETWORK_SWITCH_COOLDOWN) {
            console.log(
              `⏳ Network switch cooldown active, showing manual retry message`
            );
            setError(
              `Network switch in progress. Please wait a moment and try again, or switch networks manually in your wallet.`
            );
            setIsCreatingPrediction(false);
            return;
          }

          // Get target chain name using centralized utility
          const targetChainName = getChainName(targetChainId);

          // Show network mismatch modal instead of generic error
          setNetworkMismatchData({
            currentChainId: chain?.id || 0,
            targetChainId,
            targetChainName,
            transactionParams,
          });
          setShowNetworkMismatch(true);
          setIsCreatingPrediction(false);
          return;
        }

        console.log(`🔄 Creating prediction with params:`, transactionParams);
        console.log(`📋 Contract address:`, transactionParams.contractAddress);
        console.log("📋 Target chain ID:", transactionParams.chainId);
        console.log("📋 Current chain ID:", chain?.id);
        console.log("📋 Current chain name:", chain?.name);
        console.log(`📋 Function args:`, [
          transactionParams.title,
          transactionParams.description,
          BigInt(transactionParams.targetDate),
          BigInt(transactionParams.targetValue),
          transactionParams.category,
          transactionParams.network,
          transactionParams.emoji,
          transactionParams.autoResolvable,
        ]);

        // Validate all parameters before sending
        console.log("🔍 Validating transaction parameters...");

        if (!transactionParams.contractAddress) {
          throw new Error("Contract address is missing");
        }

        if (!transactionParams.title || transactionParams.title.length === 0) {
          throw new Error("Title is required");
        }

        if (
          !transactionParams.targetDate ||
          transactionParams.targetDate <= Math.floor(Date.now() / 1000)
        ) {
          throw new Error("Target date must be in the future");
        }

        if (
          !transactionParams.targetValue ||
          transactionParams.targetValue <= 0
        ) {
          throw new Error("Target value must be greater than 0");
        }

        // Double-check we're on the right network before sending
        if (chain?.id !== transactionParams.chainId) {
          throw new Error(
            `Network mismatch: Expected ${transactionParams.chainId}, got ${chain?.id}`
          );
        }

        console.log("✅ All parameters validated, calling writeContract...");

        const writeContractArgs = {
          address: transactionParams.contractAddress as `0x${string}`,
          abi: predictionMarketABI,
          functionName: "createPrediction" as const,
          args: [
            transactionParams.title,
            transactionParams.description,
            BigInt(transactionParams.targetDate),
            BigInt(transactionParams.targetValue),
            Number(transactionParams.category),
            transactionParams.network,
            transactionParams.emoji,
            Boolean(transactionParams.autoResolvable),
          ] as const,
        };

        console.log("📝 writeContract arguments:", writeContractArgs);

        await writeContract(writeContractArgs);

        console.log(
          "✅ writeContract called successfully - wallet should prompt for signature"
        );
      } catch (error) {
        console.error("❌ Error creating prediction:", error);
        console.error("❌ Write error details:", writeError);
        console.error(
          "❌ Error stack:",
          error instanceof Error ? error.stack : "No stack"
        );

        // Log more details about the error
        if (error && typeof error === "object") {
          console.error("❌ Error object keys:", Object.keys(error));
          console.error("❌ Error details:", JSON.stringify(error, null, 2));
        }

        // Check if it's a user rejection
        if (error instanceof Error && error.message.includes("User rejected")) {
          setError("Transaction was cancelled by user");
        } else if (
          error instanceof Error &&
          error.message.includes("insufficient funds")
        ) {
          setError("Insufficient funds for transaction");
        } else {
          setError(
            `Transaction failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
        setIsCreatingPrediction(false);
      }
    },
    [
      isCreatingPrediction,
      writeContract,
      isConnected,
      address,
      chain,
      writeError,
      setError,
      lastNetworkSwitchAttempt,
    ]
  );

  // Handle prediction confirmation - show transaction method selection
  const handleConfirmPrediction = useCallback(() => {
    console.log("🎯 Button clicked! Pending prediction:", pendingPrediction);

    if (pendingPrediction?.transactionParams) {
      console.log(
        "🚀 Creating prediction via button:",
        pendingPrediction.content
      );
      console.log(
        "📋 Transaction params:",
        pendingPrediction.transactionParams
      );
      console.log("💰 Wallet connected:", !!address);
      console.log("🔗 Chain ID:", pendingPrediction.transactionParams.chainId);

      // Always use user's wallet for prediction creation
      handleCreatePrediction(pendingPrediction.transactionParams);
      setPendingPrediction(null);
    } else {
      console.error("❌ No transaction params found in pending prediction");
    }
  }, [pendingPrediction, handleCreatePrediction, address]);

  const handleEditPrediction = useCallback(() => {
    if (pendingPrediction) {
      setNewMessage(pendingPrediction.content);
      setPendingPrediction(null);
    }
  }, [pendingPrediction]);

  // Removed AgentKit transaction method selection - users always use their wallet

  // Handle network switching from mismatch modal
  const handleNetworkSwitch = useCallback(async () => {
    if (!networkMismatchData) return;

    // Set cooldown timestamp to prevent infinite loops
    setLastNetworkSwitchAttempt(Date.now());

    try {
      console.log(
        `🔄 Switching to chain ${networkMismatchData.targetChainId}...`
      );
      await switchChain({ chainId: networkMismatchData.targetChainId });
      console.log(
        `✅ Successfully switched to ${networkMismatchData.targetChainName}`
      );

      // Close modal
      setShowNetworkMismatch(false);
      setNetworkMismatchData(null);

      // For Coinbase Smart Wallet and other wallets that don't immediately update chain state,
      // wait longer and check multiple times before retrying
      let retryCount = 0;
      const maxRetries = 10;
      const checkAndRetry = () => {
        retryCount++;
        console.log(
          `🔍 Checking chain state (attempt ${retryCount}/${maxRetries}), current chain: ${chain?.id}, target: ${networkMismatchData.targetChainId}`
        );

        if (chain?.id === networkMismatchData.targetChainId) {
          console.log(
            `✅ Chain state updated successfully, retrying prediction creation`
          );
          if (networkMismatchData.transactionParams) {
            handleCreatePrediction(networkMismatchData.transactionParams);
          }
        } else if (retryCount < maxRetries) {
          console.log(`⏳ Chain state not updated yet, waiting...`);
          setTimeout(checkAndRetry, 500);
        } else {
          console.log(
            `⚠️ Chain state didn't update after ${maxRetries} attempts, user may need to manually retry`
          );
          setError(
            `Network switch completed, but chain state is still updating. Please try creating the prediction again in a moment.`
          );
        }
      };

      // Start checking after a short delay
      setTimeout(checkAndRetry, 1000);
    } catch (switchError) {
      console.error("❌ Failed to switch chain:", switchError);
      setError(
        `Failed to switch to ${networkMismatchData.targetChainName}. Please try manually switching in your wallet.`
      );
    }
  }, [
    networkMismatchData,
    switchChain,
    handleCreatePrediction,
    chain?.id,
    setLastNetworkSwitchAttempt,
  ]);

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

  // Removed auto-scroll - users can scroll manually as needed

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

  // Parse messages for wallet transaction triggers and show button instead of auto-triggering
  useEffect(() => {
    console.log("🔍 Checking for wallet triggers...");
    console.log("📝 Conversation history length:", conversationHistory.length);
    console.log("🔄 Is creating prediction:", isCreatingPrediction);

    if (conversationHistory.length === 0 || isCreatingPrediction) return;

    const lastMessage = conversationHistory[conversationHistory.length - 1];
    console.log("📨 Last message:", lastMessage);

    if (
      lastMessage?.content?.includes("<!-- WALLET_TRIGGER:") &&
      lastMessage.messageType === "bot"
    ) {
      console.log("🎯 Wallet trigger found in message!");

      // Create unique trigger ID to prevent duplicates
      const triggerId = `${lastMessage.id}_${lastMessage.timestamp}`;

      if (processedTriggers.has(triggerId)) {
        console.log("⏭️ Wallet trigger already processed, skipping");
        return;
      }

      try {
        const match = lastMessage.content.match(
          /<!-- WALLET_TRIGGER:(.*?) -->/
        );
        console.log("🔍 Regex match result:", match);

        if (match) {
          const transactionParams = JSON.parse(match[1]);
          console.log(`🎯 Wallet trigger detected, showing create button...`);
          console.log("📋 Parsed transaction params:", transactionParams);

          // Mark this trigger as processed
          setProcessedTriggers((prev) => new Set(prev).add(triggerId));

          // Show pending prediction with transaction params for button
          setPendingPrediction({
            id: `pred_${Date.now()}`,
            content: transactionParams.title || "Create Prediction",
            transactionParams,
          });
        } else {
          console.log("❌ No match found in wallet trigger regex");
        }
      } catch (error) {
        console.error("❌ Error parsing wallet trigger:", error);
      }
    } else {
      console.log("❌ No wallet trigger found in last message");
    }
  }, [conversationHistory, isCreatingPrediction, processedTriggers]);

  // Handle contract transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log(`✅ Transaction confirmed: ${hash}`);
      console.log(
        `🔗 View on BaseScan: https://sepolia.basescan.org/tx/${hash}`
      );
      setIsCreatingPrediction(false);

      // Show success modal with prediction details
      setSuccessModalData({
        type: "prediction",
        hash: hash,
        title: pendingPrediction?.content || "New Prediction",
      });
      setShowSuccessModal(true);

      // Clear pending prediction to prevent duplicate button
      if (pendingPrediction) {
        console.log(
          `🧹 Clearing pending prediction after successful transaction`
        );
        setPendingPrediction(null);
      }

      // Add a delay before refreshing to allow blockchain indexing
      setTimeout(() => {
        console.log(`🔄 Refreshing predictions after 3 second delay...`);
        invalidatePredictions();
        console.log(`🔄 Cache invalidated - Live Markets will refresh`);
      }, 3000);
    }
  }, [isConfirmed, hash, invalidatePredictions, pendingPrediction]);

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
      <div className="flex flex-col items-center justify-center p-3 border-b border-purple-800 bg-purple-900 bg-opacity-20">
         <div className="flex items-center gap-3">
           <h3 className="text-md font-bold text-purple-400">
             {embedded
               ? "Chat"
               : "Prediction Chat (Beta)"}
           </h3>

           {/* Agent Status Indicator - Only show when chat is available */}
           {canInitializeXMTP && (
             <div className="flex items-center gap-1 text-xs">
               <FaCircle className="text-green-400 animate-pulse" size={8} />
               <span className="text-green-300">Agent Active</span>
             </div>
           )}

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
               <span className="text-gray-300 truncate max-w-20 text-xs">
                 {userDisplayInfo.displayName === "Anonymous" ? "Anon" : userDisplayInfo.displayName}
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
        {displayMessages.map((msg: ChatMessage) => (
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
              <div className="whitespace-pre-wrap">
                {/* Hide wallet trigger comments from display */}
                {msg.content.replace(/<!-- WALLET_TRIGGER:.*? -->/g, "").trim()}
              </div>

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

        {/* Wallet Transaction Indicator */}
        {(isCreatingPrediction || isContractPending || isConfirming) && (
          <div className="mb-2 text-left animate-fadeIn">
            <div className="inline-block p-3 rounded-lg text-sm max-w-md bg-blue-700 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-blue-300">💰</span>
                <span className="font-bold text-xs">Wallet Transaction</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <FaSpinner className="animate-spin text-blue-300" />
                <span className="text-blue-200">
                  {isContractPending
                    ? "⚡ Please sign the transaction in your wallet..."
                    : isConfirming
                    ? "🔄 Transaction confirming on blockchain..."
                    : "🚀 Preparing wallet transaction..."}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Success Indicator */}
        {isConfirmed && hash && (
          <div className="mb-2 text-left animate-fadeIn">
            <div className="inline-block p-3 rounded-lg text-sm max-w-md bg-green-700 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-green-300">✅</span>
                <span className="font-bold text-xs">Prediction Created!</span>
              </div>
              <div className="mt-1 text-xs text-green-200">
                TX: {hash.slice(0, 10)}...{hash.slice(-8)}
              </div>
              <div className="mt-2 flex gap-2">
                <a
                  href={`https://sepolia.basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                >
                  View on BaseScan
                </a>
                <button
                  onClick={() => {
                    console.log("🔄 Manual refresh triggered");
                    invalidatePredictions();
                  }}
                  className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
                >
                  Refresh Markets
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Error Indicator */}
        {writeError && (
          <div className="mb-2 text-left animate-fadeIn">
            <div className="inline-block p-3 rounded-lg text-sm max-w-md bg-red-700 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-300">❌</span>
                <span className="font-bold text-xs">Transaction Failed</span>
              </div>
              <div className="mt-1 text-xs text-red-200">
                {writeError.message || "Unknown error occurred"}
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />

        {pendingPrediction && (
          <div className="mt-2 p-3 bg-gradient-to-r from-blue-900 to-purple-900 text-white rounded-lg border border-blue-700 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-300">🚀</span>
              <p className="font-bold text-sm">Ready to Create Prediction</p>
            </div>
            <p className="text-xs text-blue-100 mb-3">
              {pendingPrediction.content}
            </p>

            {pendingPrediction.transactionParams && (
              <div className="text-xs text-gray-300 mb-3 space-y-1">
                <div>
                  ⛓️ Chain: {pendingPrediction.transactionParams.network}
                </div>
                <div>💰 Gas: ~$0.01</div>
                <div>
                  🎯 Target: {pendingPrediction.transactionParams.targetValue}{" "}
                  push-ups
                </div>

                {/* Network mismatch warning with switch button */}
                {Number(chain?.id) !==
                  Number(pendingPrediction.transactionParams.chainId) && (
                  <div className="bg-gradient-to-r from-red-900 to-yellow-900 bg-opacity-40 border-2 border-yellow-500 rounded-lg p-4 mt-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-yellow-300 text-sm font-semibold">
                          <span className="text-lg animate-bounce">⚠️</span>
                          <span>Wrong Network!</span>
                        </div>
                        <div className="text-yellow-200 text-sm mt-1">
                          Switch to{" "}
                          <span className="font-bold text-yellow-100">
                            {getChainName(
                              pendingPrediction.transactionParams.chainId
                            )}
                          </span>{" "}
                          to create your prediction
                        </div>
                      </div>

                      {/* Prominent Network Switch Button */}
                      <NetworkSwitchButton
                        targetChainId={
                          pendingPrediction.transactionParams.chainId
                        }
                        targetChainName={getChainName(
                          pendingPrediction.transactionParams.chainId
                        )}
                        size="md"
                        variant="warning"
                        className="ml-2 flex-shrink-0 animate-pulse"
                        onSuccess={() => {
                          // Auto-retry prediction creation after successful network switch
                          setTimeout(() => {
                            if (pendingPrediction?.transactionParams) {
                              handleCreatePrediction(
                                pendingPrediction.transactionParams
                              );
                            }
                          }, 1000);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleConfirmPrediction}
                disabled={isCreatingPrediction || isContractPending}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isCreatingPrediction || isContractPending ? (
                  <>
                    <FaSpinner className="animate-spin" size={12} />
                    Creating...
                  </>
                ) : (
                  <>
                    <>💰 Create Prediction</>
                  </>
                )}
              </button>
              <button
                onClick={handleEditPrediction}
                disabled={isCreatingPrediction || isContractPending}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Edit
              </button>
            </div>

            {/* Smart Features Banner */}
            <div className="mt-2 p-2 bg-blue-900 bg-opacity-30 border border-blue-500 rounded text-xs">
              <div className="flex items-center gap-1 text-blue-300 font-medium mb-1">
                <FaRobot size={12} />
                Smart Features
              </div>
              <div className="text-blue-200">
                🤖 AI-enhanced • 🔗 Multi-chain • 📍 Auto address resolution
              </div>
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
                  ? "Try: 'I predict 500 pushups by March 15th' or 'What markets are live?'"
                  : xmtpReady
                  ? "Chat with community: 'Start a group challenge' or 'Who wants to join?'"
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
            ) : null}
          </div>

          {/* Message count */}
          {displayMessages.length > 1 && (
            <span>{displayMessages.length - 1} messages</span>
          )}
        </div>
      </form>

      {/* Quick Actions - Icon Only */}
      <div className="p-2 border-t border-purple-800 flex items-center gap-2 justify-center flex-wrap">
        {/* Prediction Actions */}
        <button
          onClick={() =>
            setPendingAction({
              message: "I predict I'll do 500 pushups by March 15th",
              icon: "🔮",
              description: "Create a fitness prediction",
            })
          }
          className={`text-xl px-2 py-1 rounded transition-all ${
            canInitializeXMTP
              ? "hover:bg-purple-800 hover:scale-110 cursor-pointer"
              : "opacity-30 hover:opacity-50"
          }`}
          title="Create a fitness prediction"
        >
          🔮
        </button>

        <button
          onClick={() =>
            setPendingAction({
              message: "What prediction markets are live?",
              icon: "📊",
              description: "View prediction markets",
            })
          }
          className={`text-xl px-2 py-1 rounded transition-all ${
            canInitializeXMTP
              ? "hover:bg-blue-800 hover:scale-110 cursor-pointer"
              : "opacity-30 hover:opacity-50"
          }`}
          title="View prediction markets"
        >
          📊
        </button>

        <button
          onClick={() =>
            setPendingAction({
              message: "Start a pushup challenge with bamstrong.base.eth",
              icon: "🏋️",
              description: "Start a fitness challenge",
            })
          }
          className={`text-xl px-2 py-1 rounded transition-all ${
            canInitializeXMTP
              ? "hover:bg-green-800 hover:scale-110 cursor-pointer"
              : "opacity-30 hover:opacity-50"
          }`}
          title="Start a fitness challenge"
        >
          🏋️
        </button>

        <button
          onClick={() =>
            setPendingAction({
              message: "Give me some motivation to stay hard",
              icon: "🔥",
              description: "Get motivation",
            })
          }
          className={`text-xl px-2 py-1 rounded transition-all ${
            canInitializeXMTP
              ? "hover:bg-red-800 hover:scale-110 cursor-pointer"
              : "opacity-30 hover:opacity-50"
          }`}
          title="Get motivation"
        >
          🔥
        </button>

        <button
          onClick={() =>
            setPendingAction({
              message: "Show me the fitness leaderboard",
              icon: "🏆",
              description: "View fitness leaderboard",
            })
          }
          className={`text-xl px-2 py-1 rounded transition-all ${
            canInitializeXMTP
              ? "hover:bg-yellow-800 hover:scale-110 cursor-pointer"
              : "opacity-30 hover:opacity-50"
          }`}
          title="View fitness leaderboard"
        >
          🏆
        </button>

        <button
          onClick={() =>
            setPendingAction({
              message: "Help me understand how prediction markets work",
              icon: "❓",
              description: "Get help",
            })
          }
          className={`text-xl px-2 py-1 rounded transition-all ${
            canInitializeXMTP
              ? "hover:bg-gray-800 hover:scale-110 cursor-pointer"
              : "opacity-30 hover:opacity-50"
          }`}
          title="Get help"
        >
          ❓
        </button>
      </div>

      {/* Quick Action Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border-2 border-purple-600 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{pendingAction.icon}</span>
              <h3 className="text-lg font-bold text-purple-400">
                {pendingAction.description}
              </h3>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 mb-4 border border-gray-700">
              <p className="text-sm text-gray-300">{pendingAction.message}</p>
            </div>

            {!canInitializeXMTP ? (
              <button
                onClick={() => setPendingAction(null)}
                className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewMessage(pendingAction.message);
                    setPendingAction(null);
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setPendingAction(null)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network Mismatch Modal */}
      <NetworkMismatchModal
        isOpen={showNetworkMismatch}
        onClose={() => {
          setShowNetworkMismatch(false);
          setNetworkMismatchData(null);
          setIsCreatingPrediction(false);
        }}
        onSwitchNetwork={handleNetworkSwitch}
        currentChainId={networkMismatchData?.currentChainId || 0}
        targetChainId={networkMismatchData?.targetChainId || 0}
        targetChainName={networkMismatchData?.targetChainName || ""}
        isLoading={isCreatingPrediction}
      />

      {/* Removed AgentKit Transaction Modal - users always use their wallet */}

      {/* Transaction Success Modal */}
      <TransactionSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        transactionType={successModalData.type}
        transactionHash={successModalData.hash}
        predictionTitle={successModalData.title}
        currency="ETH"
        chain="base"
      />
    </div>
  );
};

export default ChatInterface;
