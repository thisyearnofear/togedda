import { fetchAllNetworksDataServer, getMultiAddressFitnessDataServer, NetworkData, Score } from './blockchain-server';
import { getUserStreak, UserStreak } from './streaks-service-pg';
import pool from './db';

/**
 * Service to sync fitness data from blockchain to Neon database
 * This connects the leaderboard data with the streaks system
 */

export interface FitnessActivity {
  address: string;
  fid?: number;
  pushups: number;
  squats: number;
  timestamp: number;
  network: string;
}

export interface UserFitnessData {
  fid: number;
  addresses: string[];
  totalPushups: number;
  totalSquats: number;
  lastActivity: string;
  networks: string[];
}

/**
 * Get FID for a wallet address using the existing API
 */
async function getFidForAddress(address: string): Promise<number | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/farcaster/address-to-fid?address=${address}`);
    if (!response.ok) return null;

    const data = await response.json();
    return data.fid || null;
  } catch (error) {
    console.error('Error getting FID for address:', address, error);
    return null;
  }
}

/**
 * Get verified addresses for a FID directly from Neynar API
 */
async function getVerifiedAddressesForFid(fid: number): Promise<string[]> {
  try {
    console.log(`[getVerifiedAddressesForFid] Fetching addresses for FID: ${fid}`);

    // Call Neynar API directly to avoid internal fetch issues
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY || "",
        },
      }
    );

    console.log(`[getVerifiedAddressesForFid] Neynar response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getVerifiedAddressesForFid] Neynar API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(`[getVerifiedAddressesForFid] Neynar response data:`, data);

    const users = data.users;
    if (!users || users.length === 0) {
      console.log(`[getVerifiedAddressesForFid] No users found for FID ${fid}`);
      return [];
    }

    const user = users[0];
    const addresses: string[] = [];

    // Add custody address
    if (user.custody_address) {
      addresses.push(user.custody_address.toLowerCase());
    }

    // Add verified addresses
    if (user.verifications && Array.isArray(user.verifications)) {
      user.verifications.forEach((address: string) => {
        if (!addresses.includes(address.toLowerCase())) {
          addresses.push(address.toLowerCase());
        }
      });
    }

    console.log(`[getVerifiedAddressesForFid] Final addresses:`, addresses);
    return addresses;

  } catch (error) {
    console.error('[getVerifiedAddressesForFid] Error getting verified addresses for FID:', fid, error);
    return [];
  }
}

/**
 * Sync fitness data from blockchain to database
 */
export async function syncFitnessData(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  console.log('Starting fitness data sync...');
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  try {
    // Fetch all blockchain data using server-side function
    const networkData: NetworkData = await fetchAllNetworksDataServer(true); // Force refresh
    
    // Process each network
    for (const [network, scores] of Object.entries(networkData)) {
      console.log(`Processing ${scores.length} entries from ${network}`);
      
      for (const score of scores) {
        processed++;
        
        try {
          // Get FID for this address
          const fid = await getFidForAddress(score.user);
          
          if (!fid) {
            console.log(`No FID found for address ${score.user}, skipping`);
            continue;
          }
          
          // Update user's fitness data and streak
          await updateUserFitnessData(fid, score, network);
          updated++;
          
        } catch (error) {
          console.error(`Error processing score for ${score.user}:`, error);
          errors++;
        }
      }
    }
    
    console.log(`Fitness sync completed: ${processed} processed, ${updated} updated, ${errors} errors`);
    
  } catch (error) {
    console.error('Error in fitness data sync:', error);
    errors++;
  }
  
  return { processed, updated, errors };
}

/**
 * Update user's fitness data and potentially their streak
 */
async function updateUserFitnessData(fid: number, score: Score, network: string): Promise<void> {
  const client = await pool.connect();

  try {
    console.log(`[updateUserFitnessData] Starting update for FID ${fid} with score:`, score);

    // Get current user data
    const currentStreak = await getUserStreak(fid.toString());
    console.log(`[updateUserFitnessData] Current streak data:`, currentStreak);
    
    // Get all verified addresses for this FID
    const verifiedAddresses = await getVerifiedAddressesForFid(fid);
    
    // Check if this is new activity (more recent than last sync)
    const activityDate = new Date(score.timestamp * 1000);
    const activityDateStr = activityDate.toISOString().split('T')[0];
    
    const lastSyncDate = currentStreak.lastFitnessSync ? 
      new Date(currentStreak.lastFitnessSync) : 
      new Date(0);
    
    const isNewActivity = activityDate > lastSyncDate;
    
    // Calculate if this should trigger a streak update
    let shouldUpdateStreak = false;
    let newActivityDates = [...currentStreak.activityDates];
    
    if (isNewActivity && !currentStreak.activityDates.includes(activityDateStr)) {
      shouldUpdateStreak = true;
      newActivityDates.push(activityDateStr);
      
      // Keep only last 100 days for efficiency
      if (newActivityDates.length > 100) {
        newActivityDates.sort().reverse();
        newActivityDates.length = 100;
      }
    }
    
    // Calculate new streak if needed
    let newStreak = currentStreak.currentStreak;
    let newLongestStreak = currentStreak.longestStreak;
    
    if (shouldUpdateStreak) {
      // Calculate yesterday
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Update streak logic
      if (currentStreak.lastActivityDate === yesterdayStr) {
        // Continuing streak
        newStreak = currentStreak.currentStreak + 1;
      } else {
        // New streak or broken streak
        newStreak = 1;
      }
      
      newLongestStreak = Math.max(currentStreak.longestStreak, newStreak);
    }
    
    // Update database
    console.log(`[updateUserFitnessData] Updating database with values:`, {
      fid: fid.toString(),
      newStreak,
      newLongestStreak,
      activityDate: shouldUpdateStreak ? activityDateStr : currentStreak.lastActivityDate,
      pushups: score.pushups,
      squats: score.squats,
      shouldUpdateStreak
    });

    await client.query(`
      INSERT INTO user_streaks (
        user_id,
        current_streak,
        longest_streak,
        last_activity_date,
        activity_dates,
        total_pushups,
        total_squats,
        last_fitness_sync,
        wallet_addresses
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_streak = CASE WHEN $10 THEN $2 ELSE user_streaks.current_streak END,
        longest_streak = CASE WHEN $10 THEN $3 ELSE GREATEST(user_streaks.longest_streak, $3) END,
        last_activity_date = CASE WHEN $10 THEN $4 ELSE user_streaks.last_activity_date END,
        activity_dates = CASE WHEN $10 THEN $5 ELSE user_streaks.activity_dates END,
        total_pushups = $6,
        total_squats = $7,
        last_fitness_sync = $8,
        wallet_addresses = $9
    `, [
      fid.toString(),
      newStreak,
      newLongestStreak,
      shouldUpdateStreak ? activityDateStr : currentStreak.lastActivityDate,
      JSON.stringify(newActivityDates),
      score.pushups,
      score.squats,
      activityDate.toISOString(),
      JSON.stringify(verifiedAddresses),
      shouldUpdateStreak // Parameter for conditional updates
    ]);

    console.log(`[updateUserFitnessData] Database update completed successfully`);
    
    if (shouldUpdateStreak) {
      console.log(`Updated streak for FID ${fid}: ${newStreak} days (was ${currentStreak.currentStreak})`);
    }
    
  } finally {
    client.release();
  }
}

/**
 * Get aggregated fitness data for a user across all their addresses
 */
export async function getUserFitnessData(fid: number): Promise<UserFitnessData | null> {
  try {
    console.log(`[getUserFitnessData] Starting for FID: ${fid}`);

    // Get verified addresses for this FID
    const addresses = await getVerifiedAddressesForFid(fid);
    console.log(`[getUserFitnessData] Found addresses:`, addresses);

    if (addresses.length === 0) {
      console.log(`[getUserFitnessData] No addresses found for FID ${fid}`);
      return null;
    }

    // Get blockchain data using server-side function
    console.log(`[getUserFitnessData] Fetching blockchain data for addresses:`, addresses);
    const fitnessData = await getMultiAddressFitnessDataServer(addresses);
    console.log(`[getUserFitnessData] Blockchain data result:`, fitnessData);

    if (!fitnessData) {
      console.log(`[getUserFitnessData] No fitness data found for FID ${fid}`);
      return null;
    }

    const result = {
      fid,
      addresses,
      totalPushups: fitnessData.totalPushups,
      totalSquats: fitnessData.totalSquats,
      lastActivity: fitnessData.lastActivity,
      networks: fitnessData.networks
    };

    console.log(`[getUserFitnessData] Final result:`, result);
    return result;

  } catch (error) {
    console.error('[getUserFitnessData] Error getting user fitness data:', error);
    return null;
  }
}

/**
 * Sync fitness data for a specific user
 */
export async function syncUserFitnessData(fid: number): Promise<boolean> {
  try {
    console.log(`[syncUserFitnessData] Starting sync for FID: ${fid}`);

    const fitnessData = await getUserFitnessData(fid);

    if (!fitnessData) {
      console.log(`[syncUserFitnessData] No fitness data found for FID ${fid}`);
      return false;
    }

    console.log(`[syncUserFitnessData] Fitness data retrieved:`, fitnessData);

    // Create a mock score object for the update function
    const mockScore: Score = {
      user: fitnessData.addresses[0] || '',
      pushups: fitnessData.totalPushups,
      squats: fitnessData.totalSquats,
      timestamp: fitnessData.lastActivity ? Math.floor(new Date(fitnessData.lastActivity).getTime() / 1000) : 0
    };

    console.log(`[syncUserFitnessData] Mock score created:`, mockScore);

    await updateUserFitnessData(fid, mockScore, fitnessData.networks.join(','));

    console.log(`[syncUserFitnessData] Synced fitness data for FID ${fid}: ${fitnessData.totalPushups} pushups, ${fitnessData.totalSquats} squats`);
    return true;

  } catch (error) {
    console.error(`[syncUserFitnessData] Error syncing fitness data for FID ${fid}:`, error);
    return false;
  }
}
