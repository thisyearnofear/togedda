"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSignIn } from "@/hooks/use-sign-in";
import {
  useAppMode,
  MiniAppOnly,
  WebAppOnly,
} from "@/contexts/app-mode-context";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Connector } from "wagmi";
import Image from "next/image";
import NeynarAuth from "./NeynarAuth";

interface AuthFlowProps {
  onAuthSuccess?: (user: any) => void;
  onAuthError?: (error: string) => void;
  className?: string;
  compact?: boolean;
}

type AuthMethod = "farcaster" | "wallet" | "none";

export default function AuthFlow({
  onAuthSuccess,
  onAuthError,
  className = "",
  compact = false,
}: AuthFlowProps) {
  const { mode, isFarcasterEnvironment, showFallbackAuth } = useAppMode();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    signIn: farcasterSignIn,
    isLoading: farcasterLoading,
    isSignedIn: farcasterSignedIn,
    user: farcasterUser,
    error: farcasterError,
  } = useSignIn({ autoSignIn: isFarcasterEnvironment });

  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>("none");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showMethods, setShowMethods] = useState(false);
  const [neynarUser, setNeynarUser] = useState<any>(null);

  // Determine authentication state
  const isAuthenticated = farcasterSignedIn || isConnected || !!neynarUser;
  const currentUser = useMemo(
    () => farcasterUser || neynarUser || (isConnected ? { address } : null),
    [farcasterUser, neynarUser, isConnected, address]
  );

  // Handle authentication success
  useEffect(() => {
    if (isAuthenticated && currentUser && onAuthSuccess) {
      onAuthSuccess(currentUser);
    }
  }, [isAuthenticated, currentUser, onAuthSuccess]);

  // Handle authentication errors
  useEffect(() => {
    const error = farcasterError || authError;
    if (error && onAuthError) {
      onAuthError(error);
    }
  }, [farcasterError, authError, onAuthError]);

  // Clear error when switching methods
  useEffect(() => {
    setAuthError(null);
  }, [selectedMethod]);

  const handleFarcasterSignIn = useCallback(async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      setSelectedMethod("farcaster");

      // Add timeout for web app context
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Sign-in timed out. Try connecting a wallet instead.")
            ),
          10000
        )
      );

      await Promise.race([farcasterSignIn(), timeoutPromise]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Farcaster sign-in failed";
      setAuthError(message);
      console.warn("Farcaster sign-in failed:", error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [farcasterSignIn]);

  const handleWalletConnect = useCallback(
    async (connector: Connector) => {
      try {
        setIsAuthenticating(true);
        setAuthError(null);
        await connect({ connector });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Wallet connection failed";
        setAuthError(message);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [connect]
  );

  const handleNeynarAuthSuccess = useCallback((user: any) => {
    setNeynarUser(user);
    setSelectedMethod("farcaster");
    setAuthError(null);
    setIsAuthenticating(false);
  }, []);

  const handleNeynarAuthError = useCallback((error: string) => {
    setAuthError(error);
    setIsAuthenticating(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    if (isConnected) {
      disconnect();
    }
    setNeynarUser(null);
    setSelectedMethod("none");
    setShowMethods(false);
  }, [disconnect, isConnected]);

  const handleRetry = useCallback(() => {
    setAuthError(null);
    if (selectedMethod === "farcaster") {
      handleFarcasterSignIn();
    }
    // For wallet, user needs to select connector again
  }, [selectedMethod, handleFarcasterSignIn]);

  // If already authenticated, show user info
  if (isAuthenticated && currentUser) {
    return (
      <AuthenticatedUser
        user={currentUser}
        onDisconnect={handleDisconnect}
        className={className}
        compact={compact}
      />
    );
  }

  // Loading state
  const isLoading = farcasterLoading || isConnecting || isAuthenticating;

  return (
    <div className={`auth-flow ${className}`}>
      {/* Compact mode - just a sign in button */}
      {compact && !showMethods && (
        <button
          onClick={() => setShowMethods(true)}
          disabled={isLoading}
          className="retro-button px-4 py-2"
        >
          {isLoading ? "Connecting..." : "Sign In"}
        </button>
      )}

      {/* Full auth flow */}
      {(!compact || showMethods) && (
        <div className="space-y-4">
          {/* Simplified Header */}
          {!compact && (
            <div className="text-center">
              <h3 className="text-lg mb-4">
                {mode === "miniapp" ? "Connect to Continue" : "Sign In"}
              </h3>
            </div>
          )}

          {/* Farcaster Sign In */}
          <MiniAppOnly>
            <AuthButton
              type="farcaster"
              onClick={handleFarcasterSignIn}
              loading={
                farcasterLoading ||
                (isAuthenticating && selectedMethod === "farcaster")
              }
              disabled={isLoading}
              primary
            />
          </MiniAppOnly>

          {/* Web App Authentication Options */}
          <WebAppOnly>
            <div className="space-y-3 max-w-sm mx-auto">
              {/* Neynar Farcaster authentication for web users */}
              <NeynarAuth
                onAuthSuccess={handleNeynarAuthSuccess}
                onAuthError={handleNeynarAuthError}
                className="w-full"
              />

              {/* Simple divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-black px-2 text-gray-400">or</span>
                </div>
              </div>

              {/* Wallet connection options - simplified */}
              <div className="space-y-2">
                {connectors.slice(1, 3).map((connector) => (
                  <WalletConnector
                    key={connector.id}
                    connector={connector}
                    onClick={() => {
                      setSelectedMethod("wallet");
                      handleWalletConnect(connector);
                    }}
                    loading={
                      isConnecting ||
                      (isAuthenticating && selectedMethod === "wallet")
                    }
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
          </WebAppOnly>

          {/* Error Display */}
          {(authError || farcasterError) && (
            <div className="bg-red-900/20 border border-red-600 rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm font-medium">
                    Connection Failed
                  </p>
                  <p className="text-red-400 text-xs mt-1">
                    {authError || farcasterError}
                  </p>
                </div>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={handleRetry}
                    className="text-red-300 hover:text-red-200 text-xs px-2 py-1 border border-red-600 rounded"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setSelectedMethod("none");
                    }}
                    className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compact mode close button */}
          {compact && (
            <button
              onClick={() => setShowMethods(false)}
              className="w-full text-gray-400 hover:text-white text-sm py-2"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Auth button component
interface AuthButtonProps {
  type: "farcaster" | "wallet";
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}

function AuthButton({
  type,
  onClick,
  loading,
  disabled,
  primary,
}: AuthButtonProps) {
  const config = {
    farcaster: {
      icon: "🟣",
      label: "Sign in with Farcaster",
      description: "Full experience • Streaks • Social features",
    },
    wallet: {
      icon: "👛",
      label: "Connect Wallet",
      description: "Basic stats only • Single address",
    },
  };

  const { icon, label, description } = config[type];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full flex items-center justify-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-lg border-2 transition-all
        ${
          primary
            ? "border-white bg-white text-black hover:bg-gray-100 disabled:bg-gray-200"
            : "border-gray-600 bg-gray-800 text-white hover:border-gray-500 hover:bg-gray-700 disabled:bg-gray-900"
        }
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
        ${loading ? "animate-pulse" : ""}
      `}
    >
      <span className="text-base md:text-lg">{icon}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="font-medium text-sm md:text-base truncate">
          {loading ? "Connecting..." : label}
        </div>
        <div className="text-xs opacity-75 truncate">
          {loading && type === "farcaster"
            ? "This may take a moment..."
            : description}
        </div>
      </div>
      {loading && (
        <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
      )}
    </button>
  );
}

// Wallet connector component
interface WalletConnectorProps {
  connector: Connector;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function WalletConnector({
  connector,
  onClick,
  loading,
  disabled,
}: WalletConnectorProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const provider = await connector.getProvider();
      setReady(!!provider);
    })();
  }, [connector]);

  const getConnectorIcon = (name: string) => {
    if (name.toLowerCase().includes("metamask")) return "🦊";
    if (name.toLowerCase().includes("coinbase")) return "🔵";
    if (name.toLowerCase().includes("walletconnect")) return "🔗";
    return "👛";
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || !ready}
      className={`
        w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-600
        ${
          ready
            ? "bg-gray-800 hover:bg-gray-700 text-white"
            : "bg-gray-900 text-gray-500 cursor-not-allowed"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        transition-colors
      `}
    >
      <span>{getConnectorIcon(connector.name)}</span>
      <span className="text-sm">{connector.name}</span>
      {loading && (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
      )}
    </button>
  );
}

// Authenticated user display
interface AuthenticatedUserProps {
  user: any;
  onDisconnect: () => void;
  className?: string;
  compact?: boolean;
}

function AuthenticatedUser({
  user,
  onDisconnect,
  className = "",
  compact,
}: AuthenticatedUserProps) {
  const isWalletUser = !user.username && user.address;
  const displayName = user.display_name || user.username || "Anonymous";
  const identifier = user.username ? `@${user.username}` : user.address;

  return (
    <div className={`authenticated-user ${className}`}>
      <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.pfp_url ? (
            <Image
              src={user.pfp_url}
              alt={displayName}
              width={compact ? 32 : 40}
              height={compact ? 32 : 40}
              className="rounded-full border border-gray-600"
            />
          ) : (
            <div
              className={`
              ${compact ? "w-8 h-8" : "w-10 h-10"} 
              bg-gray-600 rounded-full flex items-center justify-center
            `}
            >
              <span className="text-sm font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1">
            <p className={`font-medium truncate ${compact ? "text-sm" : ""}`}>
              {displayName}
            </p>
            {!isWalletUser && <span className="text-green-400 text-xs">✓</span>}
          </div>
          <p
            className={`text-gray-400 truncate ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {identifier}
          </p>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={onDisconnect}
          className={`
            flex-shrink-0 px-2 py-1 text-gray-400 hover:text-white 
            border border-gray-600 hover:border-gray-500 rounded transition-colors
            ${compact ? "text-xs" : "text-sm"}
          `}
          title="Disconnect"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Export for use in other components
export { AuthButton, WalletConnector, AuthenticatedUser };
