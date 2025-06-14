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
import { createPublicClient, http, Address, encodePacked, keccak256, namehash } from 'viem';
import { base } from 'viem/chains';

// Basenames contract constants
const BASENAME_L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as Address;
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// L2 Resolver ABI (minimal for name resolution)
const L2ResolverAbi = [
  {
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Convert address to reverse node for Basenames lookup
 */
function convertReverseNodeToBytes(address: Address, chainId: number): `0x${string}` {
  const addressFormatted = address.toLowerCase() as Address;
  const addressNode = keccak256(addressFormatted.substring(2) as `0x${string}`);
  const chainCoinType = chainId === 1 ? '1' : '8453'; // mainnet : base
  const baseReverseNode = namehash(`${chainCoinType}.reverse`);
  const addressReverseNode = keccak256(encodePacked(['bytes32', 'bytes32'], [baseReverseNode, addressNode]));
  return addressReverseNode;
}

export interface ResolvedProfile {
  address: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  ens?: string;
  basename?: string; // Add Basenames support
  farcaster?: {
    fid?: number;
    username?: string;
    display_name?: string;
    pfp_url?: string;
  };
  source: 'web3bio' | 'ensdata' | 'neynar' | 'basenames' | 'cache';
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

  // Try direct Basenames contract first (most authoritative for Base ecosystem)
  try {
    const basenamesResult = await resolveWithBasenamesContract(normalizedAddress);
    if (basenamesResult) {
      console.log(`✅ Basenames contract resolved ${normalizedAddress}:`, {
        displayName: basenamesResult.displayName,
        basename: basenamesResult.basename,
        source: basenamesResult.source
      });
      cacheResult(cacheKey, basenamesResult);
      return basenamesResult;
    }
  } catch (error) {
    console.warn('Basenames contract resolution failed:', error);
  }

  // Try Web3.bio second (comprehensive, includes multiple platforms)
  try {
    const web3bioResult = await resolveWithWeb3Bio(normalizedAddress);
    if (web3bioResult) {
      console.log(`✅ Web3.bio resolved ${normalizedAddress}:`, {
        displayName: web3bioResult.displayName,
        basename: web3bioResult.basename,
        source: web3bioResult.source
      });
      cacheResult(cacheKey, web3bioResult);
      return web3bioResult;
    } else {
      console.log(`❌ Web3.bio found no profile for ${normalizedAddress}`);
    }
  } catch (error) {
    console.warn('Web3.bio resolution failed:', error);
  }

  // Try Basenames API as fallback
  try {
    const basenamesResult = await resolveWithBasenames(normalizedAddress);
    if (basenamesResult) {
      cacheResult(cacheKey, basenamesResult);
      return basenamesResult;
    }
  } catch (error) {
    console.warn('Basenames API resolution failed:', error);
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
 * Resolve using direct Basenames contract (most authoritative)
 */
async function resolveWithBasenamesContract(address: string): Promise<ResolvedProfile | null> {
  try {
    const addressReverseNode = convertReverseNodeToBytes(address as Address, base.id);

    const basename = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'name',
      args: [addressReverseNode],
    });

    if (basename && basename.trim() !== '') {
      return {
        address,
        displayName: basename,
        username: basename,
        basename: basename,
        source: 'basenames'
      };
    }

    return null;
  } catch (error) {
    console.warn('Basenames contract query failed:', error);
    return null;
  }
}

/**
 * Resolve using Basenames (Base ecosystem naming service)
 * Updated to use alternative APIs since api.basenames.org is unreliable
 */
async function resolveWithBasenames(address: string): Promise<ResolvedProfile | null> {
  try {
    // Check if it's a .base.eth name first
    if (address.endsWith('.base.eth')) {
      // Try web3.bio first for basename resolution
      const web3bioResponse = await fetch(`https://api.web3.bio/ns/basenames/${address}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Imperfect-Form/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (web3bioResponse.ok) {
        const data = await web3bioResponse.json();
        if (data.address) {
          return {
            address: data.address.toLowerCase(),
            displayName: address,
            username: address,
            basename: address,
            avatar: data.avatar,
            source: 'basenames'
          };
        }
      }
    } else {
      // Try web3.bio for reverse basename lookup first
      const web3bioResponse = await fetch(`https://api.web3.bio/profile/basenames/${address}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Imperfect-Form/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (web3bioResponse.ok) {
        const data = await web3bioResponse.json();
        if (data.identity && !data.error) {
          return {
            address,
            displayName: data.displayName || data.identity,
            username: data.identity,
            basename: data.identity,
            avatar: data.avatar,
            source: 'basenames'
          };
        }
      }

      // Fallback to direct Basenames API if web3.bio fails
      const response = await fetch(`https://api.basenames.org/v1/address/${address}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Imperfect-Form/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.name) {
          return {
            address,
            displayName: data.name,
            username: data.name,
            basename: data.name,
            avatar: data.avatar,
            source: 'basenames'
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Basenames API failed:', error);
    return null;
  }
}

/**
 * Resolve using Web3.bio API directly (includes Basenames support)
 */
async function resolveWithWeb3Bio(address: string): Promise<ResolvedProfile | null> {
  try {
    // Try Basenames specifically first via web3bio
    const basenamesResponse = await fetch(`https://api.web3.bio/profile/basenames/${address}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Imperfect-Form/1.0'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (basenamesResponse.ok) {
      const basenamesProfile = await basenamesResponse.json();
      if (basenamesProfile && basenamesProfile.identity) {
        return {
          address: basenamesProfile.address || address,
          displayName: basenamesProfile.displayName || basenamesProfile.identity,
          username: basenamesProfile.identity,
          avatar: basenamesProfile.avatar,
          basename: basenamesProfile.identity,
          source: 'web3bio'
        };
      }
    }

    // Fall back to general web3bio profile lookup
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

    // Look for Basenames profile first
    const basenamesProfile = profiles.find(p => p.platform === 'basenames');
    if (basenamesProfile) {
      return {
        address,
        displayName: basenamesProfile.displayName || basenamesProfile.identity,
        username: basenamesProfile.identity,
        avatar: basenamesProfile.avatar,
        basename: basenamesProfile.identity,
        source: 'web3bio'
      };
    }

    // Get the first profile (usually ENS or primary)
    const profile = profiles[0];

    return {
      address,
      displayName: profile.displayName || profile.identity,
      username: profile.identity,
      avatar: profile.avatar,
      ens: profile.platform === 'ens' ? profile.identity : undefined,
      basename: profile.platform === 'basenames' ? profile.identity : undefined,
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
 * Get display name with fallback logic (prioritizes Basenames for Base ecosystem)
 */
export function getDisplayName(profile: ResolvedProfile): string {
  // For Base ecosystem hackathon, prioritize Basenames
  if (profile.basename) {
    return profile.basename;
  }

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
    profile.basename ||
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
