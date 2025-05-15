"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";

interface WarpcastWalletProps {
  children: React.ReactNode;
}

export const WarpcastWallet: React.FC<WarpcastWalletProps> = ({ children }) => {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isLoading } = useConnect();
  const [isWarpcastAvailable, setIsWarpcastAvailable] = useState<boolean | null>(null);

  // Check if we're in the Warpcast environment
  useEffect(() => {
    const checkWarpcastEnvironment = async () => {
      try {
        // Dynamically import the Farcaster SDK to avoid SSR issues
        const { sdk } = await import("@farcaster/frame-sdk");
        
        // Check if we have access to the Farcaster wallet
        if (sdk.wallet && sdk.wallet.ethProvider) {
          setIsWarpcastAvailable(true);
          console.log("Warpcast wallet is available");
          
          // Auto-connect to the Warpcast wallet
          if (!isConnected && connectors.length > 0) {
            connect({ connector: connectors[0] });
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
  }, [isConnected, connect, connectors]);

  // Display a message if not in Warpcast
  if (isWarpcastAvailable === false) {
    return (
      <div className="p-4 bg-red-900 bg-opacity-30 border border-red-800 rounded-lg mb-4">
        <h3 className="text-lg font-bold text-red-400 mb-2">Warpcast Wallet Not Available</h3>
        <p className="text-sm text-white mb-2">
          This app requires the Warpcast wallet to function properly. Please open this app in the Warpcast mobile app.
        </p>
        <p className="text-xs text-gray-400">
          If you're seeing this message inside Warpcast, please try refreshing the page or contact support.
        </p>
      </div>
    );
  }

  // Show loading state
  if (isWarpcastAvailable === null || isLoading) {
    return (
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg mb-4 animate-pulse">
        <p className="text-center text-gray-400">Connecting to Warpcast wallet...</p>
      </div>
    );
  }

  // Render children when connected
  return <>{children}</>;
};

export default WarpcastWallet;
