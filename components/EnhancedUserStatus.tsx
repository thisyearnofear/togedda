"use client";

import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useAppUser, useAppEnvironment } from "@/contexts/unified-app-context";
import Image from "next/image";
import { FaWallet, FaExternalLinkAlt, FaTimes } from "react-icons/fa";

interface EnhancedUserStatusProps {
  user: any;
  onDisconnect: () => void;
  className?: string;
  compact?: boolean;
  showWalletControls?: boolean;
}

export default function EnhancedUserStatus({
  user,
  onDisconnect,
  className = "",
  compact = false,
  showWalletControls = true,
}: EnhancedUserStatusProps) {
  const { address, isConnected } = useAccount();
  const { disconnect: disconnectWallet } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { isFarcasterUser, isWalletUser } = useAppUser();
  const { mode, showWebAppFeatures } = useAppEnvironment();
  
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Determine authentication states
  const hasFarcasterAuth = user?.authType === "farcaster" || user?.fid || user?.username;
  const hasWalletAuth = isConnected && address;
  const isDualAuth = hasFarcasterAuth && hasWalletAuth;
  const isWalletOnlyUser = user?.authType === "wallet" && !hasFarcasterAuth;

  // Display information
  const farcasterDisplayName = user?.display_name || user?.username || "User";
  const farcasterIdentifier = user?.username ? `@${user.username}` : user?.fid ? `FID: ${user.fid}` : "Farcaster";
  const walletDisplayName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Wallet";

  // Primary display logic
  const primaryDisplayName = hasFarcasterAuth ? farcasterDisplayName : walletDisplayName;
  const primaryIdentifier = hasFarcasterAuth ? farcasterIdentifier : address;

  // Handle wallet connection/disconnection
  const handleWalletAction = async (action: 'connect' | 'disconnect') => {
    if (action === 'disconnect') {
      disconnectWallet();
      setShowWalletOptions(false);
    } else {
      setShowWalletOptions(true);
    }
  };

  const handleConnectWallet = async (connectorId: string) => {
    try {
      const connector = connectors.find((c) => c.id === connectorId);
      if (connector) {
        await connect({ connector });
        setShowWalletOptions(false);
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Authentication Display */}
      <div className="flex items-center space-x-3 p-3 bg-gray-800 border border-gray-600 rounded-lg">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user?.pfp_url ? (
            <Image
              src={user.pfp_url}
              alt={primaryDisplayName}
              width={compact ? 32 : 40}
              height={compact ? 32 : 40}
              className={`rounded-full border border-white ${
                compact ? "w-8 h-8" : "w-10 h-10"
              }`}
            />
          ) : (
            <div
              className={`
                rounded-full bg-purple-600 flex items-center justify-center text-white font-bold
                ${compact ? "w-8 h-8 text-sm" : "w-10 h-10"}
              `}
            >
              {isWalletOnlyUser ? "W" : primaryDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1">
            <p className={`font-medium truncate ${compact ? "text-sm" : ""}`}>
              {primaryDisplayName}
            </p>
            {/* Authentication Status Indicators */}
            <div className="flex items-center space-x-1">
              {hasFarcasterAuth && (
                <span className="text-purple-400 text-xs" title="Farcaster Connected">
                  🟣
                </span>
              )}
              {hasWalletAuth && (
                <span className="text-green-400 text-xs" title="Wallet Connected">
                  💰
                </span>
              )}
              {isDualAuth && (
                <span className="text-blue-400 text-xs" title="Dual Authentication">
                  ⚡
                </span>
              )}
            </div>
          </div>
          <p className={`text-gray-400 truncate ${compact ? "text-xs" : "text-sm"}`}>
            {primaryIdentifier}
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
          title="Disconnect All"
        >
          <FaTimes />
        </button>
      </div>

      {/* Dual Authentication Status & Controls (Web App Only) */}
      {showWebAppFeatures && showWalletControls && hasFarcasterAuth && !compact && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FaWallet className="text-gray-400 text-sm" />
              <span className="text-sm font-medium text-gray-300">Wallet Status</span>
            </div>
            
            {hasWalletAuth && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-400">✓ Connected</span>
                <button
                  onClick={() => handleWalletAction('disconnect')}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {hasWalletAuth ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Address:</span>
              <span className="text-xs text-gray-300 font-mono">{walletDisplayName}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-400">⚠ Not Connected</span>
                <button
                  onClick={() => handleWalletAction('connect')}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center space-x-1"
                >
                  <FaWallet />
                  <span>Connect Wallet</span>
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Connect a wallet to stake on predictions and access trading features.
              </p>
            </div>
          )}

          {/* Wallet Connection Options */}
          {showWalletOptions && !hasWalletAuth && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Choose wallet:</div>
              <div className="grid grid-cols-2 gap-2">
                {connectors
                  .filter((connector) => connector.id !== "farcasterFrame")
                  .slice(0, 4)
                  .map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnectWallet(connector.id)}
                      className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded transition-colors flex items-center justify-between"
                    >
                      <span>{connector.name}</span>
                      <FaExternalLinkAlt className="text-xs" />
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setShowWalletOptions(false)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-400 w-full text-center"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connection Summary for Compact Mode */}
      {compact && isDualAuth && (
        <div className="text-xs text-center text-gray-400">
          <span className="text-purple-400">Farcaster</span> + <span className="text-green-400">Wallet</span>
        </div>
      )}
    </div>
  );
}

// Export authentication status helper
export function getAuthenticationStatus(user: any, address: string | undefined, isConnected: boolean) {
  const hasFarcasterAuth = user?.authType === "farcaster" || user?.fid || user?.username;
  const hasWalletAuth = isConnected && address;
  
  return {
    hasFarcasterAuth,
    hasWalletAuth,
    isDualAuth: hasFarcasterAuth && hasWalletAuth,
    isWalletOnlyUser: user?.authType === "wallet" && !hasFarcasterAuth,
    authLevel: hasFarcasterAuth && hasWalletAuth ? "dual" : hasFarcasterAuth ? "social" : hasWalletAuth ? "wallet" : "none"
  };
}
