"use client";

import { env } from "@/lib/env";

// Interface for Farcaster user
export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
  followingCount: number;
}

// Cache for follows data to avoid repeated API calls
const followsCache = new Map<number, { follows: number[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch follows for a Farcaster user
 * @param fid Farcaster ID
 * @param limit Number of follows to fetch (max 100)
 * @returns Array of FIDs that the user follows
 */
export const fetchFollows = async (fid: number, limit: number = 100): Promise<number[]> => {
  // Check cache first
  const cachedData = followsCache.get(fid);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.follows;
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=${limit}`,
      {
        headers: {
          'x-api-key': env.NEYNAR_API_KEY!,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch follows: ${response.status}`);
    }
    
    const data = await response.json();
    const follows = data.users.map((user: any) => user.fid);
    
    // Update cache
    followsCache.set(fid, { follows, timestamp: Date.now() });
    
    return follows;
  } catch (error) {
    console.error('Error fetching follows:', error);
    return [];
  }
};

/**
 * Check if a FID is in the user's follows
 * @param userFid The user's Farcaster ID
 * @param targetFid The FID to check
 * @returns Boolean indicating if targetFid is followed by userFid
 */
export const isFollowing = async (userFid: number, targetFid: number): Promise<boolean> => {
  const follows = await fetchFollows(userFid);
  return follows.includes(targetFid);
};

/**
 * Filter an array of FIDs to only include those followed by the user
 * @param userFid The user's Farcaster ID
 * @param fids Array of FIDs to filter
 * @returns Filtered array of FIDs that are followed by the user
 */
export const filterFollowed = async (userFid: number, fids: number[]): Promise<number[]> => {
  const follows = await fetchFollows(userFid);
  return fids.filter(fid => follows.includes(fid));
};

/**
 * Convert a wallet address to a FID if possible
 * @param address Ethereum address
 * @returns FID if found, null otherwise
 */
export const addressToFid = async (address: string): Promise<number | null> => {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'x-api-key': env.NEYNAR_API_KEY!,
        },
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (data.users && data.users.length > 0) {
      return data.users[0].fid;
    }
    
    return null;
  } catch (error) {
    console.error('Error converting address to FID:', error);
    return null;
  }
};
