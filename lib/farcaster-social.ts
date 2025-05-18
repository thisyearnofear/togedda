"use client";

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
    // Use our server-side API route instead of directly accessing Neynar
    const response = await fetch(
      `/api/farcaster/follows?fid=${fid}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch follows: ${response.status}`);
    }

    const data = await response.json();
    const follows = data.follows || [];

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
    // Use a server-side API route instead of directly accessing the Neynar API
    const response = await fetch(
      `/api/farcaster/address-to-fid?address=${address}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.fid) {
      return data.fid;
    }

    return null;
  } catch (error) {
    console.error('Error converting address to FID:', error);
    return null;
  }
};

// Cache for batch address resolution to avoid repeated API calls
const batchAddressCache = new Map<string, { fid: number, timestamp: number }>();
const BATCH_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Convert multiple wallet addresses to FIDs in a single API call
 * @param addresses Array of Ethereum addresses
 * @returns Map of address to FID
 */
export const batchAddressesToFids = async (addresses: string[]): Promise<Map<string, number>> => {
  if (addresses.length === 0) return new Map();

  // Normalize addresses for consistent caching
  const normalizedAddresses = addresses.map(addr => addr.toLowerCase());

  // Check which addresses we need to fetch (not in cache or cache expired)
  const addressesToFetch: string[] = [];
  const result = new Map<string, number>();

  // First check if we have a global cache from Web3Profile component
  const globalCache = typeof window !== 'undefined' ? (window as any).__profileCache : null;

  normalizedAddresses.forEach(address => {
    // First check the batch address cache
    const cached = batchAddressCache.get(address);
    if (cached && Date.now() - cached.timestamp < BATCH_CACHE_DURATION) {
      // Use cached value
      result.set(address, cached.fid);
    }
    // Then check the global profile cache if available
    else if (globalCache && globalCache.has(address)) {
      const profile = globalCache.get(address);
      if (profile && profile.fid) {
        result.set(address, profile.fid);

        // Also update our local cache
        batchAddressCache.set(address, {
          fid: profile.fid,
          timestamp: Date.now()
        });
      } else {
        addressesToFetch.push(address);
      }
    }
    else {
      // Need to fetch this address
      addressesToFetch.push(address);
    }
  });

  // If all addresses were in cache, return early
  if (addressesToFetch.length === 0) {
    return result;
  }

  try {
    // Split into batches of 10 addresses (reduced for better reliability)
    const batchSize = 10;

    for (let i = 0; i < addressesToFetch.length; i += batchSize) {
      const batch = addressesToFetch.slice(i, i + batchSize);

      // Use our server-side API route instead of directly accessing Neynar
      const response = await fetch(
        `/api/farcaster/batch-addresses-to-fids?addresses=${batch.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
        }
      );

      if (!response.ok) {
        console.error('Error fetching FIDs for addresses:', response.status);
        continue;
      }

      const data = await response.json();

      if (data.addressToFidMap) {
        // Process the returned map
        Object.entries(data.addressToFidMap).forEach(([address, fid]) => {
          if (address && fid) {
            const normalizedAddress = address.toLowerCase();
            result.set(normalizedAddress, fid as number);

            // Update cache
            batchAddressCache.set(normalizedAddress, {
              fid: fid as number,
              timestamp: Date.now()
            });
          }
        });
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < addressesToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return result;
  } catch (error) {
    console.error('Error batch converting addresses to FIDs:', error);
    return result;
  }
};
