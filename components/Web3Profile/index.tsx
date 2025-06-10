"use client";

import { useAddressDisplay } from "@/hooks/use-address-resolution";
import Image from "next/image";

interface Web3ProfileProps {
  address: string;
  className?: string;
  avatarOnly?: boolean;
  useUnifiedResolution?: boolean;
}

export default function Web3Profile({
  address,
  className = "",
  avatarOnly = false,
  useUnifiedResolution = true,
}: Web3ProfileProps) {
  // Use unified resolution hook
  const {
    profile: unifiedProfile,
    displayName: unifiedDisplayName,
    isLoading: unifiedLoading,
  } = useAddressDisplay(useUnifiedResolution ? address : undefined);

  // Generate fallback display for addresses
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const addressInitials = address.slice(2, 4).toUpperCase();
  const addressColor = `#${address.slice(2, 8)}`;

  // Use unified profile data
  const effectiveProfile = unifiedProfile
    ? {
        pfpUrl: unifiedProfile.avatar || unifiedProfile.farcaster?.pfp_url,
        displayName:
          unifiedProfile.displayName || unifiedProfile.farcaster?.display_name,
        username: unifiedProfile.username || unifiedProfile.farcaster?.username,
      }
    : null;

  const effectiveDisplayName = unifiedDisplayName || truncatedAddress;

  // Avatar component - shows profile pic or address-based avatar
  const Avatar = () => {
    if (effectiveProfile?.pfpUrl) {
      return (
        <div className="w-8 h-8 relative">
          <Image
            src={effectiveProfile.pfpUrl}
            alt={effectiveProfile.displayName || truncatedAddress}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border border-white object-cover"
          />
        </div>
      );
    }

    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs border border-white"
        style={{ backgroundColor: addressColor }}
      >
        {addressInitials}
      </div>
    );
  };

  // If avatar only mode, just return the avatar
  if (avatarOnly) {
    return (
      <div className={`relative ${className}`}>
        <Avatar />
        {unifiedLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full" />
        )}
      </div>
    );
  }

  // Full profile display - simplified to show only one name
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Avatar />
      <span className="text-sm font-medium truncate">
        {effectiveDisplayName}
      </span>
    </div>
  );
}
