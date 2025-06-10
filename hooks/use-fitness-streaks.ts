"use client";

import { useState, useEffect, useCallback } from "react";
import { UserStreak } from "@/lib/streaks-service-pg";
import { UserFitnessData } from "@/lib/fitness-sync-service";

// Helper function to get user FID from various sources
function getUserFid(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    // Try localStorage first
    const neynarUser = localStorage.getItem("neynar_user");
    if (neynarUser) {
      const user = JSON.parse(neynarUser);
      if (user.fid) return user.fid.toString();
    }
    
    // Try URL params
    const urlParams = new URLSearchParams(window.location.search);
    const fidFromUrl = urlParams.get("fid");
    if (fidFromUrl) return fidFromUrl;
    
    // Default fallback for testing (you can remove this)
    return "5254";
  } catch (error) {
    console.error("Error getting user FID:", error);
    return null;
  }
}

interface EnhancedStreakData extends UserStreak {
  fitnessData?: UserFitnessData | null;
}

interface UseFitnessStreaksReturn {
  streakData: EnhancedStreakData | null;
  isLoading: boolean;
  error: string | null;
  refreshStreaks: (sync?: boolean, fid?: string) => Promise<void>;
  syncFitnessData: (fid?: string) => Promise<void>;
}

/**
 * Hook to manage fitness streaks with automatic blockchain sync
 */
export function useFitnessStreaks(): UseFitnessStreaksReturn {
  const [streakData, setStreakData] = useState<EnhancedStreakData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStreaks = useCallback(async (sync: boolean = false, fid?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get FID from parameter or try to determine from context
      const userFid = fid || getUserFid();
      const syncParam = sync ? "sync=true" : "";
      const fidParam = userFid ? `fid=${userFid}` : "";
      const params = [syncParam, fidParam].filter(Boolean).join("&");
      const url = `/api/streaks${params ? `?${params}` : ""}`;
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (userFid) {
        headers["x-fid"] = userFid;
      }
      
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch streaks: ${response.status}`);
      }

      const data = await response.json();
      setStreakData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch streaks";
      setError(errorMessage);
      console.error("Error fetching streaks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncFitnessData = useCallback(async (fid?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[useFitnessStreaks] Syncing fitness data...");
      
      // Get FID from parameter or try to determine from context
      const userFid = fid || getUserFid();
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (userFid) {
        headers["x-fid"] = userFid;
      }
      
      const body: any = { action: "user" };
      if (userFid) {
        body.fid = userFid;
      }
      
      const response = await fetch("/api/sync-fitness", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(`[useFitnessStreaks] Sync response not OK: ${response.status}`);
        throw new Error(`Failed to sync fitness data: ${response.status}`);
      }

      const result = await response.json();
      console.log("[useFitnessStreaks] Sync result:", result);
      
      if (result.success) {
        // If we have fitnessData in the response, update our state directly
        if (result.fitnessData) {
          console.log("[useFitnessStreaks] Got fitness data directly:", result.fitnessData);
          
          // Update streakData with the fitness data
          setStreakData(prevData => {
            if (!prevData) return null;
            return {
              ...prevData,
              fitnessData: result.fitnessData
            };
          });
        }
        
        // Refresh streaks after successful sync
        await refreshStreaks(false);
      } else {
        console.warn("[useFitnessStreaks] Sync failed:", result.message);
        throw new Error(result.message || "Sync failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync fitness data";
      setError(errorMessage);
      console.error("Error syncing fitness data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStreaks]);

  // Load initial data
  useEffect(() => {
    refreshStreaks(true); // Sync on initial load
  }, [refreshStreaks]);

  return {
    streakData,
    isLoading,
    error,
    refreshStreaks,
    syncFitnessData,
  };
}

/**
 * Hook for getting fitness data without streaks
 */
export function useFitnessData(fid?: number) {
  const [fitnessData, setFitnessData] = useState<UserFitnessData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFitnessData = useCallback(async () => {
    if (!fid) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/sync-fitness${fid ? `?fid=${fid}` : ''}`;
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch fitness data: ${response.status}`);
      }

      const result = await response.json();
      setFitnessData(result.fitnessData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch fitness data";
      setError(errorMessage);
      console.error("Error fetching fitness data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fid]);

  useEffect(() => {
    fetchFitnessData();
  }, [fetchFitnessData]);

  return {
    fitnessData,
    isLoading,
    error,
    refresh: fetchFitnessData,
  };
}

/**
 * Utility functions for streak calculations
 */
export const streakUtils = {
  /**
   * Calculate streak percentage for progress bars
   */
  getStreakProgress: (currentStreak: number, targetStreak: number = 30): number => {
    return Math.min((currentStreak / targetStreak) * 100, 100);
  },

  /**
   * Get streak milestone info
   */
  getStreakMilestone: (currentStreak: number): { 
    current: number; 
    next: number; 
    progress: number; 
    message: string;
  } => {
    const milestones = [7, 14, 30, 60, 100, 365];
    const currentMilestone = milestones.find(m => currentStreak < m) || 365;
    const previousMilestone = milestones[milestones.indexOf(currentMilestone) - 1] || 0;
    
    const progress = previousMilestone === 0 ? 
      (currentStreak / currentMilestone) * 100 :
      ((currentStreak - previousMilestone) / (currentMilestone - previousMilestone)) * 100;

    let message = "";
    if (currentStreak === 0) {
      message = "Start your fitness journey!";
    } else if (currentStreak < 7) {
      message = "Building the habit...";
    } else if (currentStreak < 14) {
      message = "One week strong! 💪";
    } else if (currentStreak < 30) {
      message = "Two weeks in! Keep going! 🔥";
    } else if (currentStreak < 60) {
      message = "One month streak! Amazing! 🏆";
    } else if (currentStreak < 100) {
      message = "Two months! You're unstoppable! 🚀";
    } else if (currentStreak < 365) {
      message = "100+ days! Legendary! 👑";
    } else {
      message = "One year streak! You're a fitness god! 🏛️";
    }

    return {
      current: previousMilestone,
      next: currentMilestone,
      progress: Math.min(progress, 100),
      message
    };
  },

  /**
   * Format streak display
   */
  formatStreak: (streak: number): string => {
    if (streak === 0) return "No streak";
    if (streak === 1) return "1 day";
    return `${streak} days`;
  },

  /**
   * Get streak emoji based on length
   */
  getStreakEmoji: (streak: number): string => {
    if (streak === 0) return "😴";
    if (streak < 7) return "🌱";
    if (streak < 14) return "💪";
    if (streak < 30) return "🔥";
    if (streak < 60) return "🏆";
    if (streak < 100) return "🚀";
    if (streak < 365) return "👑";
    return "🏛️";
  }
};
