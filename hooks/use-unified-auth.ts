"use client";

import { useMemo, useCallback } from "react";
import { useMiniKitAuth } from "./use-minikit-auth";
import { useAccount, useDisconnect } from "wagmi";
import { usePersistentNeynarAuth } from "./use-persistent-neynar-auth";

export interface UnifiedUser {
  // Farcaster data (from MiniKit or Neynar)
  fid?: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  custody_address?: string;
  verifications?: string[];

  // Wallet data
  address?: string;

  // Auth source
  authSource: "farcaster-minikit" | "farcaster-neynar" | "wallet" | "none";
}

export interface UnifiedAuthState {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;

  // User data
  user: UnifiedUser | null;

  // Specific auth states
  isFarcasterUser: boolean;
  isWalletOnlyUser: boolean;
  isMiniKitUser: boolean;
  isNeynarUser: boolean;

  // Error handling
  error: string | null;

  // Auth capabilities
  canCast: boolean;
  canTrade: boolean;
  canReceiveNotifications: boolean;

  // Actions
  signOut: () => void;
}

/**
 * Unified authentication hook that respects all auth states:
 * - MiniKit Farcaster auth (for mini app)
 * - Neynar Farcaster auth (for web app)
 * - Wallet connections (for trading)
 */
export function useUnifiedAuth(): UnifiedAuthState {
  // MiniKit Farcaster auth (mini app context)
  const {
    isSignedIn: miniKitSignedIn,
    isLoading: miniKitLoading,
    user: miniKitUser,
    error: miniKitError,
  } = useMiniKitAuth({ autoSignIn: false });

  // Neynar Farcaster auth (web app context) with persistence
  const {
    user: neynarUser,
    isLoading: neynarLoading,
    isAuthenticated: neynarAuthenticated,
    clearPersistedUser: clearNeynarUser
  } = usePersistentNeynarAuth();

  // Wallet connection
  const { address, isConnected: walletConnected } = useAccount();
  const { disconnect: disconnectWallet } = useDisconnect();

  // Sign out function that clears all auth states
  const signOut = useCallback(() => {
    // Clear Neynar auth
    clearNeynarUser();

    // Disconnect wallet
    if (walletConnected) {
      disconnectWallet();
    }

    // Clear MiniKit auth (handled by cookies expiring)
    // Note: MiniKit doesn't have a direct sign-out method

    console.log("Signed out from all auth methods");
  }, [clearNeynarUser, walletConnected, disconnectWallet]);

  // Determine unified auth state
  const authState = useMemo((): UnifiedAuthState => {
    // Priority order: MiniKit > Neynar > Wallet
    let user: UnifiedUser | null = null;
    let authSource: UnifiedUser["authSource"] = "none";
    let isAuthenticated = false;
    let isFarcasterUser = false;
    let isWalletOnlyUser = false;
    let isMiniKitUser = false;
    let isNeynarUser = false;

    // Check MiniKit auth first (highest priority)
    if (miniKitSignedIn && miniKitUser) {
      user = {
        fid: typeof miniKitUser.fid === 'string' ? parseInt(miniKitUser.fid, 10) : miniKitUser.fid,
        username: miniKitUser.username,
        display_name: miniKitUser.display_name,
        pfp_url: miniKitUser.pfp_url,
        custody_address: miniKitUser.custody_address,
        verifications: miniKitUser.verifications,
        address: miniKitUser.custody_address,
        authSource: "farcaster-minikit",
      };
      authSource = "farcaster-minikit";
      isAuthenticated = true;
      isFarcasterUser = true;
      isMiniKitUser = true;
    }
    // Check Neynar auth second
    else if (neynarUser) {
      user = {
        fid: typeof neynarUser.fid === 'string' ? parseInt(neynarUser.fid, 10) : neynarUser.fid,
        username: neynarUser.username,
        display_name: neynarUser.display_name,
        pfp_url: neynarUser.pfp_url,
        custody_address: neynarUser.custody_address,
        verifications: neynarUser.verifications,
        address: neynarUser.custody_address,
        authSource: "farcaster-neynar",
      };
      authSource = "farcaster-neynar";
      isAuthenticated = true;
      isFarcasterUser = true;
      isNeynarUser = true;
    }
    // Check wallet connection last
    else if (walletConnected && address) {
      user = {
        address,
        display_name: "Connected Wallet",
        authSource: "wallet",
      };
      authSource = "wallet";
      isAuthenticated = true;
      isWalletOnlyUser = true;
    }

    // Determine capabilities based on auth type
    const canCast = isFarcasterUser && (isMiniKitUser || isNeynarUser);
    const canTrade = walletConnected || isFarcasterUser; // Farcaster users can use custody wallet
    const canReceiveNotifications = isFarcasterUser;

    // Determine loading state
    const isLoading = miniKitLoading || neynarLoading;

    // Determine error state
    const error = miniKitError;

    return {
      isAuthenticated,
      isLoading,
      user,
      isFarcasterUser,
      isWalletOnlyUser,
      isMiniKitUser,
      isNeynarUser,
      error,
      canCast,
      canTrade,
      canReceiveNotifications,
      signOut,
    };
  }, [
    miniKitSignedIn,
    miniKitLoading,
    miniKitUser,
    miniKitError,
    neynarUser,
    neynarLoading,
    neynarAuthenticated,
    address,
    walletConnected,
    signOut,
  ]);

  return authState;
}

/**
 * Convenience hooks for specific auth checks
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useUnifiedAuth();
  return isAuthenticated;
}

export function useCurrentUser(): UnifiedUser | null {
  const { user } = useUnifiedAuth();
  return user;
}

export function useAuthCapabilities() {
  const { canCast, canTrade, canReceiveNotifications } = useUnifiedAuth();
  return { canCast, canTrade, canReceiveNotifications };
}
