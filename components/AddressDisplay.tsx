"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  resolveAddress, 
  copyAddressToClipboard, 
  formatAddressDisplay,
  type ResolvedAddress,
  type AddressDisplayOptions 
} from "@/lib/utils/address-display";

interface AddressDisplayProps {
  address: string;
  options?: AddressDisplayOptions;
  className?: string;
  showCopy?: boolean;
  showTooltip?: boolean;
  onClick?: (address: string) => void;
}

export default function AddressDisplay({
  address,
  options = {},
  className = "",
  showCopy = true,
  showTooltip = true,
  onClick,
}: AddressDisplayProps) {
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [hasTriedResolve, setHasTriedResolve] = useState(false);

  // Only resolve when user interacts or explicitly requested
  const resolveOnDemand = useCallback(async () => {
    if (hasTriedResolve || isLoading) return;
    
    setHasTriedResolve(true);
    setIsLoading(true);
    
    try {
      const result = await resolveAddress(address, options);
      setResolved(result);
    } catch (error) {
      console.warn("Address resolution failed:", error);
      setResolved({
        original: address,
        display: address,
        type: "full",
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, options, hasTriedResolve, isLoading]);

  // Show shortened address by default
  useEffect(() => {
    if (!resolved && !hasTriedResolve) {
      setResolved({
        original: address,
        display: `${address.slice(0, 6)}...${address.slice(-4)}`,
        type: "shortened",
      });
    }
  }, [address, resolved, hasTriedResolve]);

  // Handle copy to clipboard
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const success = await copyAddressToClipboard(address);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.warn("Copy failed:", error);
    }
  };

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(address);
    } else if (!hasTriedResolve) {
      resolveOnDemand();
    } else {
      setShowFullAddress(!showFullAddress);
    }
  };

  if (isLoading) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-600 rounded px-2 py-1 text-xs">
          Loading...
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <span className={`text-gray-400 ${className}`}>
        Invalid address
      </span>
    );
  }

  const displayText = showFullAddress 
    ? resolved.original 
    : formatAddressDisplay(resolved, { showType: true });

  const isVerified = resolved.verified;
  const hasAvatar = resolved.avatar;

  return (
    <div className={`inline-flex items-center space-x-2 group ${className}`}>
      {/* Avatar if available */}
      {hasAvatar && (
        <Image
          src={resolved.avatar || "/placeholder-avatar.png"}
          alt={`${resolved.display} avatar`}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full border border-gray-600"
        />
      )}

      {/* Address display */}
      <button
        onClick={handleClick}
        className={`
          inline-flex items-center space-x-1 px-2 py-1 rounded text-sm
          transition-colors duration-200
          ${isVerified 
            ? "bg-green-900/20 text-green-300 hover:bg-green-900/30" 
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }
          ${onClick ? "cursor-pointer" : "cursor-default"}
        `}
        title={showTooltip ? `Click to ${!hasTriedResolve ? "resolve" : showFullAddress ? "shorten" : "expand"} • ${resolved.original}` : undefined}
      >
        {/* Type indicator */}
        {resolved.type === "ens" && <span className="text-blue-400">🏷️</span>}
        {resolved.type === "farcaster" && <span className="text-purple-400">🟣</span>}
        {isVerified && <span className="text-green-400">✓</span>}
        
        {/* Display text */}
        <span className="font-mono text-xs">
          {displayText}
        </span>
      </button>

      {/* Copy button */}
      {showCopy && (
        <button
          onClick={handleCopy}
          className={`
            p-1 rounded transition-colors duration-200
            ${copied 
              ? "bg-green-600 text-white" 
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }
            opacity-0 group-hover:opacity-100
          `}
          title={copied ? "Copied!" : "Copy address"}
        >
          {copied ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// Lightweight version for lists
export function AddressDisplayCompact({ 
  address, 
  className = "" 
}: { 
  address: string; 
  className?: string; 
}) {
  return (
    <AddressDisplay
      address={address}
      className={className}
      showCopy={false}
      showTooltip={false}
      options={{ fallbackLength: 4 }}
    />
  );
}

// Card version with full details
export function AddressDisplayCard({ 
  address, 
  title,
  className = "" 
}: { 
  address: string; 
  title?: string;
  className?: string; 
}) {
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    resolveAddress(address, { preferFarcaster: true, preferENS: true })
      .then(setResolved)
      .catch(console.warn)
      .finally(() => setIsLoading(false));
  }, [address]);

  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-800 rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded mb-2"></div>
          <div className="h-6 bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-800 rounded-lg ${className}`}>
      {title && <div className="text-sm text-gray-400 mb-2">{title}</div>}
      
      <div className="flex items-center space-x-3">
        {resolved?.avatar && (
          <Image
            src={resolved?.avatar}
            alt="Avatar"
            width={40}
            height={40}
            className="w-10 h-10 rounded-full border-2 border-gray-600"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <AddressDisplay
            address={address}
            showCopy={true}
            showTooltip={true}
            options={{ preferFarcaster: true, preferENS: true }}
          />
          
          {resolved?.type !== "full" && resolved?.type !== "shortened" && (
            <div className="text-xs text-gray-500 mt-1 font-mono">
              {resolved?.original.slice(0, 10)}...{resolved?.original.slice(-8)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}