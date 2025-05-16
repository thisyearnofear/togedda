import { UserStreak } from "@/lib/streaks-service-pg";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export const useStreaks = (userId: string | null) => {
  const [streakData, setStreakData] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch streak data
  const fetchStreakData = useCallback(async () => {
    if (!userId) {
      console.log("No userId provided, skipping streak data fetch");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching streak data for userId:", userId);

      const response = await fetch("/api/streaks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      console.log("Streak data fetch response status:", response.status);

      if (!response.ok) {
        // If unauthorized, don't throw an error, just return default data
        if (response.status === 401) {
          console.log("User not authenticated for streak data, using defaults");

          // Try to sign in again if needed
          const signInEvent = new CustomEvent('need-sign-in');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(signInEvent);
          }

          setStreakData({
            userId: userId,
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: '',
            activityDates: []
          });
          return;
        }
        throw new Error(`Failed to fetch streak data: ${response.status}`);
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
    if (!userId) {
      console.log("No userId provided, skipping streak update");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Updating streak for userId:", userId);

      const response = await fetch("/api/streaks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      console.log("Streak update response status:", response.status);

      if (!response.ok) {
        // If unauthorized, don't throw an error, just return default data
        if (response.status === 401) {
          console.log("User not authenticated for streak update, using defaults");

          // Try to sign in again if needed
          const signInEvent = new CustomEvent('need-sign-in');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(signInEvent);
          }

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
        throw new Error(`Failed to update streak: ${response.status}`);
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

  // Listen for sign-in events
  useEffect(() => {
    const handleNeedSignIn = () => {
      console.log("Need sign-in event received");
      // This will be handled by the useSignIn hook
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('need-sign-in', handleNeedSignIn);

      return () => {
        window.removeEventListener('need-sign-in', handleNeedSignIn);
      };
    }
  }, []);

  // Fetch streak data when userId changes
  useEffect(() => {
    if (userId) {
      console.log("UserId changed, fetching streak data:", userId);
      fetchStreakData();
    } else {
      console.log("No userId available yet");
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
