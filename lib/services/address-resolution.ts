/**
 * Unified Address Resolution Service
 * 
 * Priority order:
 * 1. Web3.bio API (comprehensive social profiles)
 * 2. ENSData API (ENS names and profiles)
 * 3. Neynar API (Farcaster-specific, last resort)
 * 
 * In mini app context, Farcaster SDK handles native resolution
 */

import { env } from "@/lib/env";

export interface ResolvedProfile {
  address: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  ens?: string;
  farcaster?: {
    fid?: number;
    username?: string;
    display_name?: string;
    pfp_url?: string;
  };
  source: 'web3bio' | 'ensdata' | 'neynar' | 'cache';
  cached?: boolean;
}

// Unified cache for all resolution services
const resolutionCache = new Map<string, { data: ResolvedProfile; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Main address resolution function with fallback hierarchy
 */
export async function resolveAddress(address: string): Promise<ResolvedProfile> {
  const normalizedAddress = address.toLowerCase();
  const cacheKey = `unified:${normalizedAddress}`;

  // Check cache first
  const cached = resolutionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.data, cached: true };
  }

  console.log(`Resolving address: ${normalizedAddress}`);

  // Try Web3.bio first (most comprehensive)
  try {
    const web3bioResult = await resolveWithWeb3Bio(normalizedAddress);
    if (web3bioResult) {
      cacheResult(cacheKey, web3bioResult);
      return web3bioResult;
    }
  } catch (error) {
    console.warn('Web3.bio resolution failed:', error);
  }

  // Try ENSData second (good for ENS names)
  try {
    const ensdataResult = await resolveWithENSData(normalizedAddress);
    if (ensdataResult) {
      cacheResult(cacheKey, ensdataResult);
      return ensdataResult;
    }
  } catch (error) {
    console.warn('ENSData resolution failed:', error);
  }

  // Try Neynar as last resort (Farcaster-specific)
  try {
    const neynarResult = await resolveWithNeynar(normalizedAddress);
    if (neynarResult) {
      cacheResult(cacheKey, neynarResult);
      return neynarResult;
    }
  } catch (error) {
    console.warn('Neynar resolution failed:', error);
  }

  // Return minimal profile if all services fail
  const fallbackProfile: ResolvedProfile = {
    address: normalizedAddress,
    source: 'cache'
  };
  
  cacheResult(cacheKey, fallbackProfile);
  return fallbackProfile;
}

/**
 * Resolve using Web3.bio API directly
 */
async function resolveWithWeb3Bio(address: string): Promise<ResolvedProfile | null> {
  try {
    // Call Web3.bio API directly
    const response = await fetch(`https://api.web3.bio/profile/${address}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Imperfect-Form/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const profiles = await response.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return null;
    }

    // Get the first profile (usually ENS or primary)
    const profile = profiles[0];

    return {
      address,
      displayName: profile.displayName || profile.identity,
      username: profile.identity,
      avatar: profile.avatar,
      ens: profile.platform === 'ens' ? profile.identity : undefined,
      farcaster: profiles.find(p => p.platform === 'farcaster') ? {
        username: profiles.find(p => p.platform === 'farcaster')?.identity
      } : undefined,
      source: 'web3bio'
    };
  } catch (error) {
    console.warn('Web3.bio API failed:', error);
    return null;
  }
}

/**
 * Resolve using ENSData API directly
 */
async function resolveWithENSData(address: string): Promise<ResolvedProfile | null> {
  try {
    // Call ENSData API directly
    const response = await fetch(`https://ensdata.net/${address}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Imperfect-Form/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const profile = await response.json();

    if (!profile || !profile.name) {
      return null;
    }

    return {
      address,
      displayName: profile.display_name || profile.name,
      username: profile.name,
      avatar: profile.avatar,
      ens: profile.name,
      source: 'ensdata'
    };
  } catch (error) {
    console.warn('ENSData API failed:', error);
    return null;
  }
}

/**
 * Resolve using Neynar API (last resort) - call internal API
 */
async function resolveWithNeynar(address: string): Promise<ResolvedProfile | null> {
  try {
    // For Neynar, we'll use the internal API since it handles auth
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/farcaster/address-to-fid?address=${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.fid) {
      return null;
    }

    return {
      address,
      displayName: data.display_name || data.username,
      username: data.username,
      avatar: data.pfp_url,
      farcaster: {
        fid: data.fid,
        username: data.username,
        display_name: data.display_name,
        pfp_url: data.pfp_url
      },
      source: 'neynar'
    };
  } catch (error) {
    console.warn('Neynar API failed:', error);
    return null;
  }
}

/**
 * Batch resolution for multiple addresses
 */
export async function resolveAddresses(addresses: string[]): Promise<ResolvedProfile[]> {
  const results = await Promise.allSettled(
    addresses.map(address => resolveAddress(address))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to resolve address ${addresses[index]}:`, result.reason);
      return {
        address: addresses[index].toLowerCase(),
        source: 'cache' as const
      };
    }
  });
}

/**
 * Cache helper
 */
function cacheResult(key: string, data: ResolvedProfile) {
  resolutionCache.set(key, {
    data,
    timestamp: Date.now()
  });

  // Cleanup old entries periodically
  if (resolutionCache.size > 1000) {
    const now = Date.now();
    for (const [cacheKey, value] of resolutionCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        resolutionCache.delete(cacheKey);
      }
    }
  }
}

/**
 * Get display name with fallback logic
 */
export function getDisplayName(profile: ResolvedProfile): string {
  return profile.displayName || 
         profile.username || 
         profile.ens || 
         profile.farcaster?.username ||
         `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`;
}

/**
 * Check if profile has meaningful data
 */
export function hasProfileData(profile: ResolvedProfile): boolean {
  return !!(
    profile.displayName ||
    profile.username ||
    profile.ens ||
    profile.farcaster?.username ||
    profile.avatar
  );
}

/**
 * Clear the resolution cache (useful for development/testing)
 */
export function clearResolutionCache(): void {
  resolutionCache.clear();
  console.log('Address resolution cache cleared');
}
