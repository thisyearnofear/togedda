"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMiniKitAuth } from "@/hooks/use-minikit-auth";
import { useUnifiedAuth } from "@/hooks/use-unified-auth";
import {
  useAppMode,
  MiniAppOnly,
  WebAppOnly,
} from "@/contexts/app-mode-context";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Connector } from "wagmi";
import Image from "next/image";
import NeynarSIWN from "./NeynarSIWN";

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

  // Use unified auth for overall state
  const { isAuthenticated: unifiedIsAuthenticated, user: unifiedUser } =
    useUnifiedAuth();

  // Use MiniKit auth for mini app specific functionality
  const {
    signIn: farcasterSignIn,
    isLoading: farcasterLoading,
    isSignedIn: farcasterSignedIn,
    user: farcasterUser,
    error: farcasterError,
  } = useMiniKitAuth({ autoSignIn: isFarcasterEnvironment });

  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>("none");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showMethods, setShowMethods] = useState(false);
  const [neynarUser, setNeynarUser] = useState<any>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Use unified authentication state
  const isAuthenticated =
    unifiedIsAuthenticated || farcasterSignedIn || isConnected || !!neynarUser;
  const currentUser = useMemo(
    () =>
      unifiedUser ||
      farcasterUser ||
      neynarUser ||
      (isConnected ? { address } : null),
    [unifiedUser, farcasterUser, neynarUser, isConnected, address]
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

  // Auto-restore user from localStorage on mount
  useEffect(() => {
    const restoreUser = () => {
      // Skip if already authenticated or in mini app environment
      if (isAuthenticated || isFarcasterEnvironment || isRestoringSession) return;

      setIsRestoringSession(true);
      
      try {
        const storedUser = localStorage.getItem('neynar_user');
        const storedTimestamp = localStorage.getItem('neynar_auth_timestamp');
        
        if (storedUser && storedTimestamp) {
          const timestamp = parseInt(storedTimestamp, 10);
          const now = Date.now();
          const hoursElapsed = (now - timestamp) / (1000 * 60 * 60);
          
          // Keep user data for 24 hours
          if (hoursElapsed < 24) {
            const user = JSON.parse(storedUser);
            console.log('[AuthFlow] Restored user from localStorage:', user.username);
            setNeynarUser(user);
            setSelectedMethod("farcaster");
          } else {
            console.log('[AuthFlow] Stored user data expired, clearing');
            localStorage.removeItem('neynar_user');
            localStorage.removeItem('neynar_auth_timestamp');
          }
        }
      } catch (error) {
        console.log('[AuthFlow] User restore failed:', error);
        localStorage.removeItem('neynar_user');
        localStorage.removeItem('neynar_auth_timestamp');
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreUser();
  }, [isAuthenticated, isFarcasterEnvironment, isRestoringSession]);

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

  const handleNeynarAuthSuccess = useCallback(
    async (user: any) => {
      try {
        setIsAuthenticating(true);
        console.log(
          "[AuthFlow] Neynar auth success:",
          user ? { fid: user.fid, username: user.username } : null
        );

        // Simply store user data locally - no server-side session needed
        setNeynarUser(user);
        setSelectedMethod("farcaster");
        setAuthError(null);

        // Store in localStorage for persistence
        if (typeof window !== "undefined") {
          localStorage.setItem("neynar_user", JSON.stringify(user));
          localStorage.setItem("neynar_auth_timestamp", Date.now().toString());
        }

        if (onAuthSuccess) {
          onAuthSuccess(user);
        }
      } catch (error) {
        console.error("Error handling Neynar auth:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Auth failed";
        setAuthError(errorMessage);
        if (onAuthError) {
          onAuthError(errorMessage);
        }
      } finally {
        setIsAuthenticating(false);
      }
    },
    [onAuthSuccess, onAuthError]
  );

  const handleNeynarAuthError = useCallback((error: string) => {
    setAuthError(error);
    setIsAuthenticating(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('neynar_user');
    localStorage.removeItem('neynar_auth_timestamp');
    
    // Disconnect wallet if connected
    if (isConnected) {
      disconnect();
    }
    
    // Reset local state
    setNeynarUser(null);
    setSelectedMethod("none");
    setShowMethods(false);
    
    console.log('[AuthFlow] Disconnect completed');
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
  const isLoading = farcasterLoading || isConnecting || isAuthenticating || isRestoringSession;

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
            <div className="space-y-4 max-w-sm mx-auto">
              {/* Authentication method explanation */}
              <div className="text-center text-sm text-gray-400">
                <p>Choose your preferred sign-in method:</p>
              </div>

              {/* Farcaster Authentication */}
              <div className="space-y-2">
                <div className="text-xs text-gray-500 text-center">
                  🟣 <strong>Recommended:</strong> Full social features &
                  streaks
                </div>
                <NeynarSIWN
                  onAuthSuccess={handleNeynarAuthSuccess}
                  onAuthError={handleNeynarAuthError}
                  className="w-full"
                />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-black px-2 text-gray-400">
                    or connect wallet
                  </span>
                </div>
              </div>

              {/* Wallet Connection Options */}
              <div className="space-y-2">
                <div className="text-xs text-gray-500 text-center">
                  👛 <strong>For trading:</strong> Required for prediction
                  markets
                </div>
                {connectors
                  .filter((connector) => connector.id !== "farcasterFrame") // Exclude frame connector in web app
                  .map((connector) => (
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

              {/* Help text */}
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>
                  💡 <strong>Tip:</strong> You can connect both for the full
                  experience
                </p>
                <p>Farcaster for social features + Wallet for trading</p>
              </div>
            </div>
          </WebAppOnly>

          {/* Error Display with Better UX */}
          {(authError || farcasterError) && (
            <div className="bg-red-900/20 border border-red-600 rounded p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-red-300 text-sm font-medium">
                      {selectedMethod === "farcaster"
                        ? "Farcaster Sign-In Failed"
                        : "Wallet Connection Failed"}
                    </p>
                    <p className="text-red-400 text-xs mt-1">
                      {authError || farcasterError}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setSelectedMethod("none");
                    }}
                    className="text-gray-400 hover:text-gray-300 text-lg px-1"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>

                {/* Helpful suggestions */}
                <div className="text-xs text-red-300 space-y-1">
                  {selectedMethod === "farcaster" && (
                    <>
                      <p>
                        💡 <strong>Try:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Allow popups for this site</li>
                        <li>Check if you&apos;re signed into Farcaster</li>
                        <li>Use wallet connection instead</li>
                      </ul>
                    </>
                  )}
                  {selectedMethod === "wallet" && (
                    <>
                      <p>
                        💡 <strong>Try:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Make sure your wallet extension is installed</li>
                        <li>Refresh the page and try again</li>
                        <li>Try a different wallet</li>
                      </ul>
                    </>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleRetry}
                    className="flex-1 text-red-300 hover:text-red-200 text-xs px-3 py-2 border border-red-600 rounded transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setSelectedMethod("none");
                      setShowMethods(true);
                    }}
                    className="flex-1 text-gray-400 hover:text-gray-300 text-xs px-3 py-2 border border-gray-600 rounded transition-colors"
                  >
                    Choose Different Method
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
