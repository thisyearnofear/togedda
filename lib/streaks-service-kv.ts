import { kv } from '@vercel/kv';

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  activityDates: string[];
}

const STREAK_KEY_PREFIX = "imperfect-form:streak";
const STREAK_EXPIRY = 60 * 60 * 24 * 365 * 2; // 2 years (in seconds)

/**
 * Get a user's streak data
 */
export async function getUserStreak(userId: string): Promise<UserStreak> {
  try {
    const userStreakKey = `${STREAK_KEY_PREFIX}:${userId}`;
    const data = await kv.hgetall(userStreakKey);
    
    if (!data || Object.keys(data).length === 0) {
      // Return default values for new users
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        activityDates: []
      };
    }
    
    return {
      userId,
      currentStreak: parseInt(data.currentStreak as string || '0'),
      longestStreak: parseInt(data.longestStreak as string || '0'),
      lastActivityDate: data.lastActivityDate as string || '',
      activityDates: JSON.parse(data.activityDates as string || '[]')
    };
  } catch (error) {
    console.error("Error getting user streak:", error);
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      activityDates: []
    };
  }
}

/**
 * Update a user's streak based on new activity
 */
export async function updateUserStreak(userId: string): Promise<UserStreak> {
  try {
    // Get current streak data
    const userStreak = await getUserStreak(userId);
    
    // Get today's date (normalized to start of day in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if already logged today
    if (userStreak.activityDates.includes(todayStr)) {
      return userStreak; // Already logged today, no changes needed
    }
    
    // Add today to activity dates
    const activityDates = [...userStreak.activityDates, todayStr];
    
    // Keep only last 100 days for efficiency
    if (activityDates.length > 100) {
      activityDates.sort().reverse();
      activityDates.length = 100;
    }
    
    // Calculate yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Update streak
    let newStreak = 1; // Default to 1 if streak is broken
    if (userStreak.lastActivityDate === yesterdayStr) {
      // Continuing streak
      newStreak = userStreak.currentStreak + 1;
    }
    
    // Update longest streak if needed
    const newLongestStreak = Math.max(userStreak.longestStreak, newStreak);
    
    // Create updated streak object
    const updatedStreak: UserStreak = {
      userId,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: todayStr,
      activityDates
    };
    
    // Save updated data
    const userStreakKey = `${STREAK_KEY_PREFIX}:${userId}`;
    await kv.hset(userStreakKey, {
      currentStreak: newStreak.toString(),
      longestStreak: newLongestStreak.toString(),
      lastActivityDate: todayStr,
      activityDates: JSON.stringify(activityDates)
    });
    
    // Set expiration for cleanup
    await kv.expire(userStreakKey, STREAK_EXPIRY);
    
    return updatedStreak;
  } catch (error) {
    console.error("Error updating user streak:", error);
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      activityDates: []
    };
  }
}

/**
 * Check if a user has a streak of a specific length
 */
export async function hasStreakOfLength(userId: string, length: number): Promise<boolean> {
  const userStreak = await getUserStreak(userId);
  return userStreak.currentStreak >= length;
}

/**
 * Get all users with active streaks
 */
export async function getActiveStreaks(): Promise<UserStreak[]> {
  try {
    // Get all keys with the streak prefix
    const keys = await kv.keys(`${STREAK_KEY_PREFIX}:*`);
    const streaks: UserStreak[] = [];
    
    // Get streak data for each key
    for (const key of keys) {
      const userId = key.replace(`${STREAK_KEY_PREFIX}:`, '');
      const streak = await getUserStreak(userId);
      
      // Only include active streaks (current streak > 0)
      if (streak.currentStreak > 0) {
        streaks.push(streak);
      }
    }
    
    return streaks;
  } catch (error) {
    console.error("Error getting active streaks:", error);
    return [];
  }
}
