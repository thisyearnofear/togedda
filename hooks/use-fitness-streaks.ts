"use client";

import { useState, useEffect, useCallback } from "react";
import { UserStreak } from "@/lib/streaks-service-pg";
import { UserFitnessData } from "@/lib/fitness-sync-service";

interface EnhancedStreakData extends UserStreak {
  fitnessData?: UserFitnessData | null;
}

interface UseFitnessStreaksReturn {
  streakData: EnhancedStreakData | null;
  isLoading: boolean;
  error: string | null;
  refreshStreaks: (sync?: boolean) => Promise<void>;
  syncFitnessData: () => Promise<void>;
}

/**
 * Hook to manage fitness streaks with automatic blockchain sync
 */
export function useFitnessStreaks(): UseFitnessStreaksReturn {
  const [streakData, setStreakData] = useState<EnhancedStreakData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStreaks = useCallback(async (sync: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = sync ? "/api/streaks?sync=true" : "/api/streaks";
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
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

  const syncFitnessData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sync-fitness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ action: "user" }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync fitness data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh streaks after successful sync
        await refreshStreaks(false);
      } else {
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
