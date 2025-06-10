import pool from './db';

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  activityDates: string[];
  totalPushups?: number;
  totalSquats?: number;
  lastFitnessSync?: string;
}

/**
 * Initialize the database schema
 */
export async function initializeDatabase() {
  // Skip database initialization during build time
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    console.log('Skipping database initialization during build');
    return;
  }

  let client;

  try {
    client = await pool.connect();

    // Create the streaks table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        user_id TEXT PRIMARY KEY,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_date TEXT,
        activity_dates JSONB NOT NULL DEFAULT '[]'
      )
    `);

    // Add new columns if they don't exist (for migration)
    try {
      await client.query(`ALTER TABLE user_streaks ADD COLUMN total_pushups INTEGER NOT NULL DEFAULT 0`);
      console.log('Added total_pushups column');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Error adding total_pushups column:', error);
      }
    }

    try {
      await client.query(`ALTER TABLE user_streaks ADD COLUMN total_squats INTEGER NOT NULL DEFAULT 0`);
      console.log('Added total_squats column');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Error adding total_squats column:', error);
      }
    }

    try {
      await client.query(`ALTER TABLE user_streaks ADD COLUMN last_fitness_sync TEXT`);
      console.log('Added last_fitness_sync column');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Error adding last_fitness_sync column:', error);
      }
    }

    try {
      await client.query(`ALTER TABLE user_streaks ADD COLUMN wallet_addresses JSONB NOT NULL DEFAULT '[]'`);
      console.log('Added wallet_addresses column');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Error adding wallet_addresses column:', error);
      }
    }

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    // Don't throw error during build time
    if (process.env.NODE_ENV !== 'production') {
      throw error;
    }
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Get a user's streak data
 */
export async function getUserStreak(userId: string): Promise<UserStreak> {
  const client = await pool.connect();
  
  try {
    // Check if the user exists
    const result = await client.query(
      'SELECT * FROM user_streaks WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Return default values for new users
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        activityDates: [],
        totalPushups: 0,
        totalSquats: 0,
        lastFitnessSync: ''
      };
    }
    
    const userData = result.rows[0];
    
    return {
      userId,
      currentStreak: userData.current_streak,
      longestStreak: userData.longest_streak,
      lastActivityDate: userData.last_activity_date || '',
      activityDates: userData.activity_dates || [],
      totalPushups: userData.total_pushups || 0,
      totalSquats: userData.total_squats || 0,
      lastFitnessSync: userData.last_fitness_sync || ''
    };
  } catch (error) {
    console.error('Error getting user streak:', error);
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      activityDates: []
    };
  } finally {
    client.release();
  }
}

/**
 * Update a user's streak based on new activity
 */
export async function updateUserStreak(userId: string): Promise<UserStreak> {
  const client = await pool.connect();
  
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
    await client.query(`
      INSERT INTO user_streaks (
        user_id, 
        current_streak, 
        longest_streak, 
        last_activity_date, 
        activity_dates
      ) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        current_streak = $2, 
        longest_streak = $3, 
        last_activity_date = $4, 
        activity_dates = $5
    `, [
      userId,
      newStreak,
      newLongestStreak,
      todayStr,
      JSON.stringify(activityDates)
    ]);
    
    return updatedStreak;
  } catch (error) {
    console.error('Error updating user streak:', error);
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      activityDates: []
    };
  } finally {
    client.release();
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
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM user_streaks 
      WHERE current_streak > 0
      ORDER BY current_streak DESC
    `);
    
    return result.rows.map(row => ({
      userId: row.user_id,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastActivityDate: row.last_activity_date || '',
      activityDates: row.activity_dates || []
    }));
  } catch (error) {
    console.error('Error getting active streaks:', error);
    return [];
  } finally {
    client.release();
  }
}
