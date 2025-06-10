"use client";

import { useState, useEffect, useCallback } from "react";
import { useNeynarContext } from "@neynar/react";
import { useMiniKitAuth } from "@/hooks/use-minikit-auth";
import { useAccount } from "wagmi";
import { useAppMode } from "@/contexts/app-mode-context";

export interface SimpleUser {
  fid?: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  custody_address?: string;
  address?: string; // For wallet-only users
  authType: "farcaster" | "wallet" | "none";
}

const USER_STORAGE_KEY = "app_user";

export function useSimpleUser() {
  const { isFarcasterEnvironment } = useAppMode();
  const { user: neynarUser } = useNeynarContext();
  const { user: miniKitUser, isSignedIn: miniKitSignedIn } = useMiniKitAuth({ 
    autoSignIn: isFarcasterEnvironment 
  });
  const { address, isConnected } = useAccount();
  
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        // Check if it's not too old (24 hours)
        if (user.timestamp && Date.now() - user.timestamp < 24 * 60 * 60 * 1000) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Error restoring user:", error);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  // Update user when auth sources change
  useEffect(() => {
    let user: SimpleUser | null = null;

    // Priority: MiniKit > Neynar > Wallet
    if (miniKitSignedIn && miniKitUser) {
      user = {
        fid: miniKitUser.fid,
        username: miniKitUser.username,
        display_name: miniKitUser.display_name,
        pfp_url: miniKitUser.pfp_url,
        custody_address: miniKitUser.custody_address,
        authType: "farcaster"
      };
    } else if (neynarUser) {
      user = {
        fid: neynarUser.fid.toString(),
        username: neynarUser.username,
        display_name: neynarUser.display_name,
        pfp_url: neynarUser.pfp_url,
        custody_address: neynarUser.custody_address,
        authType: "farcaster"
      };
    } else if (isConnected && address) {
      user = {
        address,
        authType: "wallet"
      };
    }

    // Only update if user actually changed
    const userChanged = JSON.stringify(user) !== JSON.stringify(currentUser);
    
    if (user && userChanged) {
      // Store with timestamp
      const userWithTimestamp = { ...user, timestamp: Date.now() };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithTimestamp));
      setCurrentUser(user);
    } else if (!user && currentUser) {
      // Only clear if we had a user before
      localStorage.removeItem(USER_STORAGE_KEY);
      setCurrentUser(null);
    }
  }, [miniKitSignedIn, miniKitUser, neynarUser, isConnected, address]); // Remove currentUser from deps

  const disconnect = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const getFid = useCallback((): string | null => {
    return currentUser?.fid || null;
  }, [currentUser?.fid]); // Only depend on the fid, not the whole user object

  return {
    user: currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    isFarcasterUser: currentUser?.authType === "farcaster",
    isWalletUser: currentUser?.authType === "wallet",
    disconnect,
    getFid
  };
}
