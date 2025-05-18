"use client";

import { batchAddressesToFids } from "@/lib/farcaster-social";
import { fetchUser } from "@/lib/neynar";

export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

// Cache for Farcaster profiles to avoid repeated API calls
const profileCache = new Map<number, { profile: FarcasterProfile, timestamp: number }>();
const PROFILE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch a Farcaster profile by FID
 * @param fid Farcaster ID
 * @returns Farcaster profile or null if not found
 */
export const fetchFarcasterProfile = async (fid: number): Promise<FarcasterProfile | null> => {
  // Check cache first
  const cachedProfile = profileCache.get(fid);
  if (cachedProfile && Date.now() - cachedProfile.timestamp < PROFILE_CACHE_DURATION) {
    return cachedProfile.profile;
  }

  try {
    const user = await fetchUser(fid.toString());

    const profile: FarcasterProfile = {
      fid: parseInt(user.fid),
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url
    };

    // Update cache
    profileCache.set(fid, { profile, timestamp: Date.now() });

    return profile;
  } catch (error) {
    console.error(`Error fetching Farcaster profile for FID ${fid}:`, error);
    return null;
  }
};

/**
 * Batch fetch Farcaster profiles for multiple FIDs
 * @param fids Array of Farcaster IDs
 * @returns Map of FID to Farcaster profile
 */
export const batchFetchFarcasterProfiles = async (fids: number[]): Promise<Map<number, FarcasterProfile>> => {
  if (fids.length === 0) return new Map();

  // Check which FIDs we need to fetch (not in cache or cache expired)
  const fidsToFetch: number[] = [];
  const result = new Map<number, FarcasterProfile>();

  fids.forEach(fid => {
    const cached = profileCache.get(fid);
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      // Use cached value
      result.set(fid, cached.profile);
    } else {
      // Need to fetch this FID
      fidsToFetch.push(fid);
    }
  });

  // If all FIDs were in cache, return early
  if (fidsToFetch.length === 0) {
    return result;
  }

  try {
    // Split into batches of 10 FIDs
    const batchSize = 10;

    for (let i = 0; i < fidsToFetch.length; i += batchSize) {
      const batch = fidsToFetch.slice(i, i + batchSize);

      // Fetch profiles in parallel
      const profiles = await Promise.all(
        batch.map(async (fid) => {
          try {
            const profile = await fetchFarcasterProfile(fid);
            return { fid, profile };
          } catch (error) {
            console.error(`Error fetching profile for FID ${fid}:`, error);
            return { fid, profile: null };
          }
        })
      );

      // Add successful results to the map
      profiles.forEach(({ fid, profile }) => {
        if (profile) {
          result.set(fid, profile);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error batch fetching Farcaster profiles:', error);
    return result;
  }
};

/**
 * Resolve wallet addresses to Farcaster profiles in a single batch operation
 * @param addresses Array of wallet addresses
 * @returns Map of address to Farcaster profile
 */
export const resolveAddressesToProfiles = async (addresses: string[]): Promise<Map<string, FarcasterProfile>> => {
  if (addresses.length === 0) return new Map();

  // Create a result map
  const result = new Map<string, FarcasterProfile>();

  try {
    // Normalize all addresses to lowercase for consistent lookup
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());

    // Check cache first to avoid unnecessary API calls
    const cachedProfiles = new Map<string, FarcasterProfile>();
    const addressesToFetch: string[] = [];

    // First pass: check cache
    for (const address of normalizedAddresses) {
      // Check if we already have this address in the result map
      if (result.has(address)) continue;

      // Check module-level cache in Web3Profile component
      // This is a simplified approach - in a real implementation, you'd access the actual cache
      const cachedProfile = (window as any).__profileCache?.get?.(address);
      if (cachedProfile && Date.now() - cachedProfile.timestamp < 30 * 60 * 1000) {
        cachedProfiles.set(address, cachedProfile);
      } else {
        addressesToFetch.push(address);
      }
    }

    // Add cached profiles to result
    for (const [address, profile] of cachedProfiles.entries()) {
      result.set(address, profile);
    }

    // If all addresses were in cache, return early
    if (addressesToFetch.length === 0) {
      return result;
    }

    // Limit batch size to avoid rate limiting
    const batchSize = 5; // Reduced batch size for better reliability
    const batches = [];

    // Split addresses into batches
    for (let i = 0; i < addressesToFetch.length; i += batchSize) {
      batches.push(addressesToFetch.slice(i, i + batchSize));
    }

    // Process each batch sequentially to avoid rate limiting
    for (const batch of batches) {
      try {
        // Step 1: Convert addresses to FIDs
        const addressToFidMap = await batchAddressesToFids(batch);

        if (addressToFidMap.size === 0) {
          console.log("No FIDs found for batch of addresses");
          continue;
        }

        // Step 2: Get unique FIDs to fetch
        const fidsToFetch = Array.from(new Set(Array.from(addressToFidMap.values())));

        // Step 3: Fetch profiles for these FIDs
        const fidToProfileMap = await batchFetchFarcasterProfiles(fidsToFetch);

        // Step 4: Map addresses to profiles
        for (const [address, fid] of addressToFidMap.entries()) {
          const profile = fidToProfileMap.get(fid);
          if (profile) {
            result.set(address.toLowerCase(), profile);

            // Update the module-level cache in Web3Profile component
            if ((window as any).__profileCache) {
              (window as any).__profileCache.set(address.toLowerCase(), {
                ...profile,
                timestamp: Date.now()
              });
            }
          }
        }

        // Add a small delay between batches to avoid rate limiting
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 800)); // Increased delay
        }
      } catch (error) {
        console.error("Error processing batch of addresses:", error);
        // Continue with next batch even if this one fails
      }
    }
  } catch (error) {
    console.error('Error resolving addresses to profiles:', error);
  }

  return result;
};
