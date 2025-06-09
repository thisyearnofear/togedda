"use client";

import { FarcasterProfile } from "@/lib/farcaster-profiles";
import { useCallback, useEffect, useState } from "react";

// Cache for FID to verified addresses mapping
const fidToAddressesCache = new Map<number, { addresses: string[], timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cache for address to FID mapping (reverse lookup)
const addressToFidCache = new Map<string, { fid: number, timestamp: number }>();

/**
 * Hook to map wallet addresses to Farcaster profiles
 * This handles both primary custody addresses and verified addresses
 */
export const useAddressToFarcaster = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Map of address to Farcaster profile
  const [addressToProfileMap, setAddressToProfileMap] = useState<Map<string, FarcasterProfile>>(new Map());
  
  // Map of FID to verified addresses
  const [fidToAddressesMap, setFidToAddressesMap] = useState<Map<number, string[]>>(new Map());

  /**
   * Fetch verified addresses for a Farcaster user
   */
  const fetchVerifiedAddresses = useCallback(async (fid: number): Promise<string[]> => {
    // Check cache first
    const cachedAddresses = fidToAddressesCache.get(fid);
    if (cachedAddresses && Date.now() - cachedAddresses.timestamp < CACHE_DURATION) {
      return cachedAddresses.addresses;
    }
    
    try {
      const response = await fetch(`/api/farcaster/verified-addresses?fid=${fid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch verified addresses: ${response.status}`);
      }
      
      const data = await response.json();
      const addresses = data.addresses || [];
      
      // Update cache
      fidToAddressesCache.set(fid, {
        addresses,
        timestamp: Date.now()
      });
      
      // Update reverse lookup cache
      addresses.forEach((address: string) => {
        addressToFidCache.set(address.toLowerCase(), {
          fid,
          timestamp: Date.now()
        });
      });
      
      return addresses;
    } catch (error) {
      console.error('Error fetching verified addresses:', error);
      return [];
    }
  }, []);

  /**
   * Map a list of addresses to their Farcaster profiles
   * This will check both primary custody addresses and verified addresses
   */
  const mapAddressesToProfiles = useCallback(async (addresses: string[]): Promise<Map<string, FarcasterProfile>> => {
    if (addresses.length === 0) return new Map();
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Normalize addresses
      const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
      
      // Create a new map for the results
      const result = new Map<string, FarcasterProfile>();
      
      // First, try to resolve addresses directly using the batch API
      const response = await fetch(
        `/api/farcaster/batch-addresses-to-fids?addresses=${normalizedAddresses.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch FIDs for addresses: ${response.status}`);
      }
      
      const data = await response.json();
      const addressToFidMap = data.addressToFidMap || {};
      
      // Collect all unique FIDs to fetch profiles for
      const fidsToFetch = new Set<number>();
      
      // Add FIDs from direct address mapping
      Object.entries(addressToFidMap).forEach(([address, fid]) => {
        if (fid) {
          fidsToFetch.add(fid as number);
          
          // Update reverse lookup cache
          addressToFidCache.set(address.toLowerCase(), {
            fid: fid as number,
            timestamp: Date.now()
          });
        }
      });
      
      // Fetch profiles for all FIDs
      const fidProfiles = new Map<number, FarcasterProfile>();
      
      // Fetch profiles in batches
      const fidArray = Array.from(fidsToFetch);
      const batchSize = 10;
      
      for (let i = 0; i < fidArray.length; i += batchSize) {
        const batch = fidArray.slice(i, i + batchSize);
        
        // Fetch profiles for this batch
        const batchPromises = batch.map(async (fid) => {
          try {
            // Fetch user data
            const userResponse = await fetch(`/api/farcaster/user?fid=${fid}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
            
            if (!userResponse.ok) {
              return { fid, profile: null };
            }
            
            const userData = await userResponse.json();
            const user = userData.user;
            
            if (!user) {
              return { fid, profile: null };
            }
            
            // Create profile
            const profile: FarcasterProfile = {
              fid,
              username: user.username,
              displayName: user.display_name,
              pfpUrl: user.pfp_url
            };
            
            return { fid, profile };
          } catch (error) {
            console.error(`Error fetching profile for FID ${fid}:`, error);
            return { fid, profile: null };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Add successful results to the map
        batchResults.forEach(({ fid, profile }) => {
          if (profile) {
            fidProfiles.set(fid, profile);
          }
        });
        
        // Add a small delay between batches
        if (i + batchSize < fidArray.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Map addresses to profiles
      Object.entries(addressToFidMap).forEach(([address, fid]) => {
        const profile = fidProfiles.get(fid as number);
        if (profile) {
          result.set(address.toLowerCase(), profile);
        }
      });
      
      // Now fetch verified addresses for each FID and map them to profiles
      const fidToAddressesMapUpdated = new Map<number, string[]>();
      
      for (const fid of Array.from(fidProfiles.keys())) {
        const verifiedAddresses = await fetchVerifiedAddresses(fid);
        fidToAddressesMapUpdated.set(fid, verifiedAddresses);
        
        // Map each verified address to the profile
        const profile = fidProfiles.get(fid);
        if (profile) {
          verifiedAddresses.forEach(address => {
            result.set(address.toLowerCase(), profile);
          });
        }
      }
      
      // Update state
      setFidToAddressesMap(fidToAddressesMapUpdated);
      setAddressToProfileMap(result);
      
      return result;
    } catch (error) {
      console.error('Error mapping addresses to profiles:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return new Map();
    } finally {
      setIsLoading(false);
    }
  }, [fetchVerifiedAddresses]);

  return {
    mapAddressesToProfiles,
    fetchVerifiedAddresses,
    addressToProfileMap,
    fidToAddressesMap,
    isLoading,
    error
  };
};
