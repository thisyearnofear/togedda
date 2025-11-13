"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useAppEnvironment } from "@/contexts/unified-app-context";
import { FaWallet, FaExternalLinkAlt } from "react-icons/fa";

interface WarpcastWalletProps {
  children: React.ReactNode;
}

const WarpcastWallet = ({ children }: WarpcastWalletProps) => {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { mode, isFarcasterEnvironment, canUseMiniKitFeatures } =
    useAppEnvironment();
  const [isWarpcastAvailable, setIsWarpcastAvailable] = useState<boolean | null>(
    null
  );
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Check if we're in the Warpcast environment
  useEffect(() => {
    const checkWarpcastEnvironment = async () => {
      try {
        // If we're in web app mode, skip Warpcast check
        if (mode === "webapp" && !isFarcasterEnvironment) {
          setIsWarpcastAvailable(false);
          return;
        }

        // Dynamically import the Farcaster SDK to avoid SSR issues
        const { sdk } = await import("@farcaster/miniapp-sdk");

        // Check if we have access to the Farcaster wallet
        if (sdk.wallet && sdk.wallet.ethProvider) {
          setIsWarpcastAvailable(true);
          console.log("Warpcast wallet is available");

          // Auto-connect to the Warpcast wallet
          if (!isConnected && connectors.length > 0) {
            const farcasterConnector = connectors.find(
              (c) => c.id === "farcasterFrame"
            );
            if (farcasterConnector) {
              connect({ connector: farcasterConnector });
            }
          }
        } else {
          setIsWarpcastAvailable(false);
          console.log("Warpcast wallet is not available");
        }
      } catch (error) {
        console.error("Error checking Warpcast environment:", error);
        setIsWarpcastAvailable(false);
      }
    };

    checkWarpcastEnvironment();
  }, [isConnected, connect, connectors, mode, isFarcasterEnvironment]);

  // Handle wallet connection for web app users
  const handleConnectWallet = async (connectorId?: string) => {
    try {
      const connector = connectorId
        ? connectors.find((c) => c.id === connectorId)
        : connectors.find((c) => c.id !== "farcasterFrame"); // Exclude frame connector in web app

      if (connector) {
        await connect({ connector });
        setShowWalletOptions(false);
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  // For web app users, show wallet connection options instead of blocking
  if (isWarpcastAvailable === false && mode === "webapp") {
    return (
      <div className="space-y-4">
        {!isConnected && (
          <div className="p-4 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg mb-4">
            <div className="flex items-start">
              <FaWallet className="text-blue-400 mr-3 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-300 mb-2">
                  Connect Wallet to Use Predictions
                </h3>
                <p className="text-sm text-blue-200 mb-3">
                  Connect your wallet to stake on predictions and participate in
                  the market.
                </p>

                {!showWalletOptions ? (
                  <button
                    onClick={() => setShowWalletOptions(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                  >
                    <FaWallet />
                    <span>Connect Wallet</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-blue-300 mb-2">
                      Choose a wallet:
                    </p>
                    {connectors
                      .filter((connector) => connector.id !== "farcasterFrame")
                      .map((connector) => (
                        <button
                          key={connector.id}
                          onClick={() => handleConnectWallet(connector.id)}
                          className="w-full bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm flex items-center justify-between"
                        >
                          <span>{connector.name}</span>
                          <FaExternalLinkAlt className="text-xs" />
                        </button>
                      ))}
                    <button
                      onClick={() => setShowWalletOptions(false)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }

  // For mini app users, show the original Warpcast requirement message
  if (isWarpcastAvailable === false && mode === "miniapp") {
    return (
      <div className="p-4 bg-red-900 bg-opacity-30 border border-red-800 rounded-lg mb-4">
        <h3 className="text-lg font-bold text-red-400 mb-2">
          Warpcast Wallet Not Available
        </h3>
        <p className="text-sm text-white mb-2">
          This app requires the Warpcast wallet to function properly. Please
          open this app in the Warpcast mobile app.
        </p>
        <p className="text-xs text-gray-400">
          If you&apos;re seeing this message inside Warpcast, please try
          refreshing the page or contact support.
        </p>
      </div>
    );
  }

  // Show loading state
  if (isWarpcastAvailable === null) {
    return (
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg mb-4 animate-pulse">
        <p className="text-center text-gray-400">
          {mode === "webapp"
            ? "Checking wallet availability..."
            : "Connecting to Warpcast wallet..."}
        </p>
      </div>
    );
  }

  // Render children when connected or in web app mode
  return <>{children}</>;
};

export { WarpcastWallet };