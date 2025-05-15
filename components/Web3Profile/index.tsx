"use client";

import { useEffect, useState } from "react";
import { addressToFid } from "@/lib/farcaster-social";
import { fetchUser } from "@/lib/neynar";
import { FarcasterProfile } from "@/lib/farcaster-profiles";
import Image from "next/image";

interface Web3ProfileProps {
  address: string;
  className?: string;
  avatarOnly?: boolean;
  farcasterProfile?: FarcasterProfile | null;
}

// For internal use only - extends FarcasterProfile with timestamp
interface CachedFarcasterProfile extends FarcasterProfile {
  timestamp: number;
}

// Cache for resolved addresses to avoid repeated API calls
// This is a module-level cache that persists between component renders
const profileCache = new Map<string, CachedFarcasterProfile | null>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function Web3Profile({
  address,
  className = "",
  avatarOnly = false,
  farcasterProfile: providedProfile = null,
}: Web3ProfileProps) {
  const [resolvedProfile, setResolvedProfile] =
    useState<FarcasterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use the provided profile or the resolved one
  const farcasterProfile = providedProfile || resolvedProfile;

  // Generate fallback display for addresses without Farcaster profiles
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const addressInitials = address.slice(2, 4).toUpperCase();
  const addressColor = `#${address.slice(2, 8)}`;

  useEffect(() => {
    // If a profile was provided via props, no need to resolve
    if (providedProfile) {
      return;
    }

    const resolveAddress = async () => {
      // Normalize address for consistent caching
      const normalizedAddress = address.toLowerCase();

      // Check cache first
      const cachedProfile = profileCache.get(normalizedAddress);
      if (cachedProfile) {
        // If cache is still valid, use it
        if (Date.now() - cachedProfile.timestamp < CACHE_DURATION) {
          setResolvedProfile(cachedProfile);
          return;
        }
        // Otherwise, we'll refresh but still show the cached data immediately
        setResolvedProfile(cachedProfile);
      }

      // If we're already loading or have a valid cache, don't make another request
      if (
        isLoading ||
        (cachedProfile && Date.now() - cachedProfile.timestamp < CACHE_DURATION)
      ) {
        return;
      }

      setIsLoading(true);

      try {
        // Try to resolve address to FID
        const fid = await addressToFid(normalizedAddress);

        if (fid) {
          // If FID found, fetch user details
          const user = await fetchUser(fid.toString());

          // Create profile object
          const profile: CachedFarcasterProfile = {
            fid,
            username: user.username,
            displayName: user.display_name,
            pfpUrl: user.pfp_url,
            timestamp: Date.now(),
          };

          // Update state with Farcaster profile
          setResolvedProfile(profile);

          // Update cache
          profileCache.set(normalizedAddress, profile);
        } else {
          // No FID found, cache the negative result
          profileCache.set(normalizedAddress, null);
        }
      } catch (error) {
        console.error("Error resolving address to Farcaster profile:", error);
        // Cache the error as a null result to avoid repeated failed requests
        profileCache.set(normalizedAddress, null);
      } finally {
        setIsLoading(false);
      }
    };

    resolveAddress();
  }, [address, isLoading, providedProfile]);

  // Avatar component - shows Farcaster profile pic or address-based avatar
  const Avatar = () => {
    if (farcasterProfile?.pfpUrl) {
      return (
        <div className="w-8 h-8 relative">
          <Image
            src={farcasterProfile.pfpUrl}
            alt={farcasterProfile.displayName || truncatedAddress}
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
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full" />
        )}
      </div>
    );
  }

  // Full profile display
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Avatar />
      {farcasterProfile ? (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {farcasterProfile.displayName || farcasterProfile.username}
          </span>
          {farcasterProfile.username && (
            <span className="text-xs text-gray-400">
              @{farcasterProfile.username}
            </span>
          )}
        </div>
      ) : (
        <span className="text-sm font-medium truncate">{truncatedAddress}</span>
      )}
    </div>
  );
}
