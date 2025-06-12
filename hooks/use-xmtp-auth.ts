"use client";

import { useAccount } from "wagmi";
import { useAppUser, useAppEnvironment } from "@/contexts/unified-app-context";
import { getAuthenticationStatus } from "@/components/EnhancedUserStatus";

/**
 * Hook to provide authentication state specifically for XMTP integration
 * This ensures XMTP has access to the correct user identity and wallet information
 */
export function useXMTPAuth() {
  const { address, isConnected } = useAccount();
  const { user, isAuthenticated, isFarcasterUser, isWalletUser } = useAppUser();
  const { mode, isFarcasterEnvironment, showWebAppFeatures } = useAppEnvironment();

  // Get detailed authentication status
  const authStatus = getAuthenticationStatus(user, address, isConnected);

  // Determine the primary identity for XMTP
  const getPrimaryIdentity = () => {
    if (authStatus.hasFarcasterAuth && authStatus.hasWalletAuth) {
      // Dual auth: prefer wallet address for XMTP but include Farcaster context
      return {
        type: "dual" as const,
        address: address!,
        farcasterData: {
          fid: user?.fid,
          username: user?.username,
          displayName: user?.display_name,
        },
      };
    } else if (authStatus.hasFarcasterAuth) {
      // Farcaster only: use custody address if available, otherwise need wallet connection
      return {
        type: "farcaster" as const,
        address: user?.custody_address || null,
        farcasterData: {
          fid: user?.fid,
          username: user?.username,
          displayName: user?.display_name,
        },
      };
    } else if (authStatus.hasWalletAuth) {
      // Wallet only
      return {
        type: "wallet" as const,
        address: address!,
        farcasterData: null,
      };
    }

    return {
      type: "none" as const,
      address: null,
      farcasterData: null,
    };
  };

  const primaryIdentity = getPrimaryIdentity();

  // Check if XMTP can be initialized
  const canInitializeXMTP = () => {
    // Need a valid Ethereum address to initialize XMTP
    if (!primaryIdentity.address) {
      return {
        canInit: false,
        reason: "No wallet address available",
        suggestion: authStatus.hasFarcasterAuth 
          ? "Connect a wallet to enable chat features"
          : "Connect wallet or sign in with Farcaster",
      };
    }

    // In mini app environment, should work automatically
    if (mode === "miniapp" && isFarcasterEnvironment) {
      return {
        canInit: true,
        reason: "Mini app with native wallet",
        suggestion: null,
      };
    }

    // In web app, need explicit wallet connection
    if (mode === "webapp" && isConnected) {
      return {
        canInit: true,
        reason: "Web app with connected wallet",
        suggestion: null,
      };
    }

    return {
      canInit: false,
      reason: "Wallet not properly connected",
      suggestion: "Please connect your wallet to enable chat",
    };
  };

  const xmtpReadiness = canInitializeXMTP();

  // Get user display information for chat UI
  const getUserDisplayInfo = () => {
    if (authStatus.hasFarcasterAuth) {
      return {
        displayName: user?.display_name || user?.username || "Farcaster User",
        identifier: user?.username ? `@${user.username}` : `FID: ${user?.fid}`,
        avatar: user?.pfp_url,
        type: "farcaster" as const,
      };
    } else if (authStatus.hasWalletAuth) {
      return {
        displayName: `${address!.slice(0, 6)}...${address!.slice(-4)}`,
        identifier: address!,
        avatar: null,
        type: "wallet" as const,
      };
    }

    return {
      displayName: "Anonymous",
      identifier: "Not connected",
      avatar: null,
      type: "none" as const,
    };
  };

  const userDisplayInfo = getUserDisplayInfo();

  // Get conversation context for the bot
  const getConversationContext = () => {
    const context: Record<string, any> = {
      userAddress: primaryIdentity.address,
      authType: primaryIdentity.type,
      environment: mode,
      timestamp: Date.now(),
    };

    if (primaryIdentity.farcasterData) {
      context.farcaster = {
        fid: primaryIdentity.farcasterData.fid,
        username: primaryIdentity.farcasterData.username,
        displayName: primaryIdentity.farcasterData.displayName,
      };
    }

    return context;
  };

  return {
    // Authentication state
    isAuthenticated,
    authStatus,
    primaryIdentity,
    userDisplayInfo,

    // XMTP readiness
    canInitializeXMTP: xmtpReadiness.canInit,
    xmtpReadinessReason: xmtpReadiness.reason,
    xmtpSuggestion: xmtpReadiness.suggestion,

    // Environment info
    mode,
    isFarcasterEnvironment,
    showWebAppFeatures,

    // Conversation context
    getConversationContext,

    // Helper functions
    hasWalletForXMTP: !!primaryIdentity.address,
    hasFarcasterContext: !!primaryIdentity.farcasterData,
    isDualAuth: authStatus.isDualAuth,

    // For debugging
    debugInfo: {
      user,
      address,
      isConnected,
      authStatus,
      primaryIdentity,
      xmtpReadiness,
    },
  };
}

/**
 * Hook specifically for XMTP connection status and error handling
 */
export function useXMTPConnectionStatus() {
  const xmtpAuth = useXMTPAuth();

  const getConnectionStatus = () => {
    if (!xmtpAuth.isAuthenticated) {
      return {
        status: "not_authenticated" as const,
        message: "Please sign in to use chat features",
        canRetry: false,
      };
    }

    if (!xmtpAuth.canInitializeXMTP) {
      return {
        status: "missing_requirements" as const,
        message: xmtpAuth.xmtpSuggestion || "Cannot initialize chat",
        canRetry: false,
      };
    }

    return {
      status: "ready" as const,
      message: "Ready to connect to chat",
      canRetry: true,
    };
  };

  const connectionStatus = getConnectionStatus();

  return {
    ...xmtpAuth,
    connectionStatus: connectionStatus.status,
    connectionMessage: connectionStatus.message,
    canRetryConnection: connectionStatus.canRetry,
  };
}
