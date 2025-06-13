"use client";

import React, { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { FaExchangeAlt, FaSpinner } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { getChainName } from "@/lib/config/chains";

interface NetworkSwitchButtonProps {
  targetChainId: number;
  targetChainName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "warning";
}

const NetworkSwitchButton: React.FC<NetworkSwitchButtonProps> = ({
  targetChainId,
  targetChainName,
  onSuccess,
  onError,
  className = "",
  size = "md",
  variant = "warning",
}) => {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're already on the target network
  const isOnTargetNetwork = chain?.id === targetChainId;

  // Get current chain name using centralized utility
  const currentChainName = getChainName(chain?.id || 0);

  const handleSwitchNetwork = async () => {
    if (isOnTargetNetwork) return;

    setIsLoading(true);
    try {
      await switchChain({ chainId: targetChainId });

      // For Coinbase Smart Wallet and other wallets that don't immediately update chain state,
      // wait and check multiple times before calling onSuccess
      let retryCount = 0;
      const maxRetries = 10;
      const checkChainState = () => {
        retryCount++;
        console.log(
          `🔍 NetworkSwitchButton: Checking chain state (attempt ${retryCount}/${maxRetries}), current chain: ${chain?.id}, target: ${targetChainId}`
        );

        if (chain?.id === targetChainId) {
          console.log(
            `✅ NetworkSwitchButton: Chain state updated successfully`
          );
          toast.success(`Switched to ${targetChainName}`);
          onSuccess?.();
          setIsLoading(false);
        } else if (retryCount < maxRetries) {
          console.log(
            `⏳ NetworkSwitchButton: Chain state not updated yet, waiting...`
          );
          setTimeout(checkChainState, 500);
        } else {
          console.log(
            `⚠️ NetworkSwitchButton: Chain state didn't update after ${maxRetries} attempts`
          );
          toast.success(`Switch initiated - please wait for wallet to update`);
          onSuccess?.(); // Call anyway, let parent handle the retry logic
          setIsLoading(false);
        }
      };

      // Start checking after a short delay
      setTimeout(checkChainState, 500);
    } catch (error) {
      const errorMessage = `Failed to switch to ${targetChainName}`;
      toast.error(errorMessage);
      onError?.(errorMessage);
      console.error("Network switch error:", error);
      setIsLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  // Variant classes
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
  };

  // If already on target network, show success state
  if (isOnTargetNetwork) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm ${className}`}
      >
        <span className="text-green-200">✅</span>
        <span>Connected to {targetChainName}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSwitchNetwork}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <FaSpinner className="animate-spin" />
          <span>Switching...</span>
        </>
      ) : (
        <>
          <FaExchangeAlt />
          <span>Switch to {targetChainName}</span>
        </>
      )}
    </button>
  );
};

export default NetworkSwitchButton;
