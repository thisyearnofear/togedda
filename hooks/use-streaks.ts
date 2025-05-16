import { UserStreak } from "@/lib/streaks-service-pg";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export const useStreaks = (userId: string | null) => {
  const [streakData, setStreakData] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch streak data
  const fetchStreakData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/streaks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        // If unauthorized, don't throw an error, just return default data
        if (response.status === 401) {
          console.log("User not authenticated for streak data, using defaults");
          setStreakData({
            userId: userId,
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: '',
            activityDates: []
          });
          return;
        }
        throw new Error("Failed to fetch streak data");
      }

      const data = await response.json();
      setStreakData(data);
    } catch (err) {
      console.error("Error fetching streak data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Set default data on error
      setStreakData({
        userId: userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        activityDates: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Update streak
  const updateStreak = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/streaks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        // If unauthorized, don't throw an error, just return default data
        if (response.status === 401) {
          console.log("User not authenticated for streak update, using defaults");
          const defaultStreak = {
            userId: userId,
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: '',
            activityDates: []
          };
          setStreakData(defaultStreak);
          return defaultStreak;
        }
        throw new Error("Failed to update streak");
      }

      const data = await response.json();
      setStreakData(data.streak);

      // Show toast notification if streak increased
      if (streakData && data.streak.currentStreak > streakData.currentStreak) {
        toast.success(`🔥 Streak updated: ${data.streak.currentStreak} days!`);
      }

      return data.streak;
    } catch (err) {
      console.error("Error updating streak:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      // Set default data on error
      const defaultStreak = {
        userId: userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        activityDates: []
      };
      setStreakData(defaultStreak);
      return defaultStreak;
    } finally {
      setIsLoading(false);
    }
  }, [userId, streakData]);

  // Fetch streak data on component mount
  useEffect(() => {
    if (userId) {
      fetchStreakData();
    }
  }, [userId, fetchStreakData]);

  return {
    streakData,
    isLoading,
    error,
    fetchStreakData,
    updateStreak,
  };
};
