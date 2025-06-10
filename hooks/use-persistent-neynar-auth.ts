"use client";

import { useState, useEffect } from "react";
import { useNeynarContext } from "@neynar/react";

const NEYNAR_USER_KEY = "neynar_user";
const NEYNAR_AUTH_TIMESTAMP_KEY = "neynar_auth_timestamp";
const AUTH_EXPIRY_HOURS = 24; // 24 hours

interface PersistedNeynarUser {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  custody_address?: string;
  verifications?: string[];
}

/**
 * Hook that provides persistent Neynar authentication
 * Restores user from localStorage on page load
 */
export function usePersistentNeynarAuth() {
  const { user: contextUser } = useNeynarContext();
  const [persistedUser, setPersistedUser] = useState<PersistedNeynarUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const storedUser = localStorage.getItem(NEYNAR_USER_KEY);
      const storedTimestamp = localStorage.getItem(NEYNAR_AUTH_TIMESTAMP_KEY);

      if (storedUser && storedTimestamp) {
        const timestamp = parseInt(storedTimestamp, 10);
        const now = Date.now();
        const hoursElapsed = (now - timestamp) / (1000 * 60 * 60);

        // Check if auth is still valid (within expiry time)
        if (hoursElapsed < AUTH_EXPIRY_HOURS) {
          const user = JSON.parse(storedUser);
          console.log("Restored Neynar user from localStorage:", user.username);
          setPersistedUser(user);
        } else {
          console.log("Neynar auth expired, clearing localStorage");
          localStorage.removeItem(NEYNAR_USER_KEY);
          localStorage.removeItem(NEYNAR_AUTH_TIMESTAMP_KEY);
        }
      }
    } catch (error) {
      console.error("Error restoring Neynar user from localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem(NEYNAR_USER_KEY);
      localStorage.removeItem(NEYNAR_AUTH_TIMESTAMP_KEY);
    }

    setIsLoading(false);
  }, []);

  // Update persisted user when context user changes
  useEffect(() => {
    if (contextUser) {
      // Convert the context user to our persisted format
      const convertedUser: PersistedNeynarUser = {
        fid: contextUser.fid,
        username: contextUser.username,
        display_name: contextUser.display_name,
        pfp_url: contextUser.pfp_url,
        custody_address: contextUser.custody_address,
        verifications: contextUser.verifications,
      };
      setPersistedUser(convertedUser);
    } else if (!contextUser && persistedUser) {
      // Context user is null but we have persisted user
      // This might happen on page refresh before context loads
      console.log("Context user is null, keeping persisted user");
    }
  }, [contextUser, persistedUser]);

  // Clear persisted user when signing out
  const clearPersistedUser = () => {
    setPersistedUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(NEYNAR_USER_KEY);
      localStorage.removeItem(NEYNAR_AUTH_TIMESTAMP_KEY);
    }
  };

  // Return the current user (context takes priority, fallback to persisted)
  const currentUser = contextUser || persistedUser;

  return {
    user: currentUser,
    isLoading,
    clearPersistedUser,
    isAuthenticated: !!currentUser,
  };
}
