import { isAddress } from "viem";

// Types for address display
export interface AddressDisplayOptions {
  showFull?: boolean;
  showCopy?: boolean;
  preferENS?: boolean;
  preferFarcaster?: boolean;
  fallbackLength?: number;
  enableFallbacks?: boolean;
}

export interface ResolvedAddress {
  original: string;
  display: string;
  type: "ens" | "farcaster" | "web3bio" | "ensdata" | "shortened" | "full";
  avatar?: string;
  verified?: boolean;
  source?: string;
  metadata?: {
    twitter?: string;
    github?: string;
    discord?: string;
    telegram?: string;
    website?: string;
    description?: string;
  };
}

// Cache for resolved addresses
const addressCache = new Map<string, ResolvedAddress>();
const ensCache = new Map<string, string>();
const farcasterCache = new Map<string, { username: string; avatar?: string }>();
const web3bioCache = new Map<string, any>();
const ensdataCache = new Map<string, any>();

// Failure tracking to prevent excessive retries
const failureCache = new Map<string, { count: number; lastAttempt: number }>();
const pendingRequests = new Map<string, Promise<ResolvedAddress>>();

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const FAILURE_TTL = 2 * 60 * 1000; // 2 minutes for failed resolutions
const MAX_FAILURES = 3; // Max failures before giving up
const cacheTimestamps = new Map<string, number>();

/**
 * Resolves an address to a human-readable format with comprehensive fallback chain
 */
export async function resolveAddress(
  address: string,
  options: AddressDisplayOptions = {}
): Promise<ResolvedAddress> {
  const {
    showFull = false,
    preferENS = true,
    preferFarcaster = true,
    fallbackLength = 6,
    enableFallbacks = true,
  } = options;

  // Validate address format
  if (!isAddress(address)) {
    return {
      original: address,
      display: address,
      type: "full",
    };
  }

  const normalizedAddress = address.toLowerCase();
  
  // Check cache first
  const cached = addressCache.get(normalizedAddress);
  const cacheTime = cacheTimestamps.get(normalizedAddress);
  
  if (cached && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cached;
  }

  let resolved: ResolvedAddress = {
    original: address,
    display: showFull ? address : shortenAddress(address, fallbackLength),
    type: showFull ? "full" : "shortened",
  };

  try {
    // Check if this address has failed too many times recently
    const failures = failureCache.get(normalizedAddress);
    if (failures && failures.count >= MAX_FAILURES && 
        Date.now() - failures.lastAttempt < FAILURE_TTL) {
      console.log(`Skipping resolution for ${address} - too many recent failures`);
      // Return the existing resolved result (shortened address)
      addressCache.set(normalizedAddress, resolved);
      cacheTimestamps.set(normalizedAddress, Date.now());
      return resolved;
    }

    // Check for pending request to avoid duplicate calls
    const pendingKey = `${normalizedAddress}:${preferFarcaster}:${preferENS}:${enableFallbacks}`;
    const existingRequest = pendingRequests.get(pendingKey);
    if (existingRequest) {
      return existingRequest;
    }

    // Create the resolution promise
    const resolutionPromise = (async () => {
      try {
        // Resolution chain with fallbacks
        const resolutionChain = [];

        if (preferFarcaster) {
          resolutionChain.push(() => resolveFarcasterUsername(normalizedAddress));
        }

        if (preferENS) {
          resolutionChain.push(() => resolveENS(normalizedAddress));
        }

        if (enableFallbacks) {
          resolutionChain.push(
            () => resolveWeb3Bio(normalizedAddress),
            () => resolveENSData(normalizedAddress)
          );
        }

        let hasAnySuccess = false;

        // Try each resolution method in order
        for (const resolveMethod of resolutionChain) {
          try {
            const result = await resolveMethod();
            if (result) {
              resolved = result;
              hasAnySuccess = true;
              break; // Stop at first successful resolution
            }
          } catch (error) {
            console.warn(`Address resolution method failed for ${address}:`, error);
            // Continue to next method
          }
        }

        // Update failure tracking
        if (!hasAnySuccess) {
          const currentFailures = failureCache.get(normalizedAddress) || { count: 0, lastAttempt: 0 };
          failureCache.set(normalizedAddress, {
            count: currentFailures.count + 1,
            lastAttempt: Date.now()
          });
        } else {
          // Clear failure count on success
          failureCache.delete(normalizedAddress);
        }

        // Cache the result
        addressCache.set(normalizedAddress, resolved);
        cacheTimestamps.set(normalizedAddress, Date.now());
        
        return resolved;
      } finally {
        // Remove from pending requests
        pendingRequests.delete(pendingKey);
      }
    })();

    // Store pending request
    pendingRequests.set(pendingKey, resolutionPromise);
    
    return await resolutionPromise;
    
  } catch (error) {
    console.warn(`Failed to resolve address ${address}:`, error);
    // Update failure tracking
    const currentFailures = failureCache.get(normalizedAddress) || { count: 0, lastAttempt: 0 };
    failureCache.set(normalizedAddress, {
      count: currentFailures.count + 1,
      lastAttempt: Date.now()
    });
    // Return shortened address as fallback
  }

  return resolved;
}

/**
 * Resolves multiple addresses in batch for better performance
 */
export async function resolveAddressBatch(
  addresses: string[],
  options: AddressDisplayOptions = {}
): Promise<ResolvedAddress[]> {
  // Separate cached and uncached addresses
  const uncachedAddresses = addresses.filter(addr => {
    const normalized = addr.toLowerCase();
    const cached = addressCache.get(normalized);
    const cacheTime = cacheTimestamps.get(normalized);
    return !cached || !cacheTime || Date.now() - cacheTime >= CACHE_TTL;
  });

  // For uncached addresses, try batch resolution where possible
  if (uncachedAddresses.length > 0 && options.enableFallbacks) {
    try {
      await batchResolveWeb3Bio(uncachedAddresses);
      await batchResolveENSData(uncachedAddresses);
    } catch (error) {
      console.warn("Batch resolution failed:", error);
    }
  }

  // Resolve all addresses (cached and newly resolved)
  const promises = addresses.map(address => resolveAddress(address, options));
  return Promise.all(promises);
}

/**
 * Resolves ENS name for an address
 */
async function resolveENS(address: string): Promise<ResolvedAddress | null> {
  try {
    // Check cache first
    const cached = ensCache.get(address);
    if (cached) {
      return {
        original: address,
        display: cached,
        type: "ens",
        verified: true,
        source: "viem",
      };
    }

    // Try to resolve ENS
    const response = await fetch(`/api/ens/resolve?address=${address}`);
    if (response.ok) {
      const data = await response.json();
      if (data.name) {
        ensCache.set(address, data.name);
        return {
          original: address,
          display: data.name,
          type: "ens",
          verified: true,
          source: "viem",
        };
      }
    }
  } catch (error) {
    console.warn(`ENS resolution failed for ${address}:`, error);
  }
  
  return null;
}

/**
 * Resolves Farcaster username for an address
 */
async function resolveFarcasterUsername(
  address: string
): Promise<ResolvedAddress | null> {
  try {
    // Check cache first
    const cached = farcasterCache.get(address);
    if (cached) {
      return {
        original: address,
        display: `@${cached.username}`,
        type: "farcaster",
        avatar: cached.avatar,
        verified: true,
        source: "neynar",
      };
    }

    // Use existing API to get FID first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const fidResponse = await fetch(`/api/farcaster/address-to-fid?address=${address}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!fidResponse.ok) {
        if (fidResponse.status === 404) {
          // Cache negative result to avoid repeated calls
          farcasterCache.set(address, { username: '', avatar: undefined });
        }
        return null;
      }

      const fidData = await fidResponse.json();
      if (!fidData.fid) {
        // Cache negative result
        farcasterCache.set(address, { username: '', avatar: undefined });
        return null;
      }

      // Get user profile from FID
      const userResponse = await fetch(`/api/farcaster/user?fid=${fidData.fid}`, {
        signal: controller.signal
      });
      
      if (!userResponse.ok) return null;

      const userData = await userResponse.json();
      if (userData.users && userData.users.length > 0) {
        const user = userData.users[0];
        const result = {
          username: user.username,
          avatar: user.pfp_url,
        };
        
        farcasterCache.set(address, result);
        return {
          original: address,
          display: `@${result.username}`,
          type: "farcaster",
          avatar: result.avatar,
          verified: true,
          source: "neynar",
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn(`Farcaster resolution timed out for ${address}`);
      } else {
        throw fetchError;
      }
    }
  } catch (error) {
    console.warn(`Farcaster resolution failed for ${address}:`, error);
  }
  
  return null;
}

/**
 * Resolves Web3.bio profile for an address
 */
async function resolveWeb3Bio(address: string): Promise<ResolvedAddress | null> {
  try {
    // Check cache first
    const cached = web3bioCache.get(address);
    if (cached) {
      return formatWeb3BioResult(address, cached);
    }

    const response = await fetch(`/api/web3bio/resolve?address=${address}&platform=ethereum`);
    if (response.ok) {
      const data = await response.json();
      if (data.found && data.profile) {
        web3bioCache.set(address, data);
        return formatWeb3BioResult(address, data);
      }
    }
  } catch (error) {
    console.warn(`Web3.bio resolution failed for ${address}:`, error);
  }
  
  return null;
}

/**
 * Resolves ENSData profile for an address
 */
async function resolveENSData(address: string): Promise<ResolvedAddress | null> {
  try {
    // Check cache first
    const cached = ensdataCache.get(address);
    if (cached) {
      return formatENSDataResult(address, cached);
    }

    const response = await fetch(`/api/ensdata/resolve?address=${address}`);
    if (response.ok) {
      const data = await response.json();
      if (data.found && data.name) {
        ensdataCache.set(address, data);
        return formatENSDataResult(address, data);
      }
    }
  } catch (error) {
    console.warn(`ENSData resolution failed for ${address}:`, error);
  }
  
  return null;
}

/**
 * Batch resolve Web3.bio profiles
 */
async function batchResolveWeb3Bio(addresses: string[]): Promise<void> {
  try {
    const response = await fetch('/api/web3bio/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results) {
        data.results.forEach((result: any) => {
          if (result.found) {
            web3bioCache.set(result.address, result);
          }
        });
      }
    }
  } catch (error) {
    console.warn('Batch Web3.bio resolution failed:', error);
  }
}

/**
 * Batch resolve ENSData profiles
 */
async function batchResolveENSData(addresses: string[]): Promise<void> {
  try {
    const response = await fetch('/api/ensdata/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results) {
        data.results.forEach((result: any) => {
          if (result.found) {
            ensdataCache.set(result.address, result);
          }
        });
      }
    }
  } catch (error) {
    console.warn('Batch ENSData resolution failed:', error);
  }
}

/**
 * Formats Web3.bio result into ResolvedAddress
 */
function formatWeb3BioResult(address: string, data: any): ResolvedAddress | null {
  if (!data.profile) return null;

  const profile = data.profile;
  let displayName = profile.displayName || profile.identity;
  
  // Try to get the best display name
  if (profile.ens && profile.ens.length > 0) {
    displayName = profile.ens[0];
  } else if (profile.lens && profile.lens.length > 0) {
    displayName = profile.lens[0];
  } else if (profile.farcaster && profile.farcaster.length > 0) {
    displayName = `@${profile.farcaster[0]}`;
  }

  if (!displayName) return null;

  return {
    original: address,
    display: displayName,
    type: "web3bio",
    avatar: profile.avatar,
    verified: true,
    source: "web3bio",
    metadata: {
      twitter: profile.links?.twitter?.handle,
      github: profile.links?.github?.handle,
      discord: profile.links?.discord?.handle,
      telegram: profile.links?.telegram?.handle,
      website: profile.links?.website?.[0],
      description: profile.description,
    },
  };
}

/**
 * Formats ENSData result into ResolvedAddress
 */
function formatENSDataResult(address: string, data: any): ResolvedAddress | null {
  if (!data.name || !data.profile) return null;

  const profile = data.profile;
  return {
    original: address,
    display: data.name,
    type: "ensdata",
    avatar: profile.avatar,
    verified: true,
    source: "ensdata",
    metadata: {
      twitter: profile.twitter,
      github: profile.github,
      discord: profile.discord,
      telegram: profile.telegram,
      website: profile.url,
      description: profile.description,
    },
  };
}

/**
 * Shortens an address to a readable format
 */
export function shortenAddress(address: string, length: number = 6): string {
  if (!isAddress(address)) return address;
  
  const start = address.slice(0, length + 2); // Include "0x"
  const end = address.slice(-length);
  return `${start}...${end}`;
}

/**
 * Formats an address for display with optional copy functionality
 */
export function formatAddressDisplay(
  resolved: ResolvedAddress,
  options: { showOriginal?: boolean; showType?: boolean; showSource?: boolean } = {}
): string {
  const { showOriginal = false, showType = false, showSource = false } = options;
  
  let display = resolved.display;
  
  if (showType && resolved.type !== "full") {
    const typeIndicator = {
      ens: "🏷️",
      farcaster: "🟣",
      web3bio: "🌐",
      ensdata: "📋",
      shortened: "📍",
      full: "",
    }[resolved.type];
    
    display = `${typeIndicator} ${display}`;
  }
  
  if (showSource && resolved.source) {
    display += ` (${resolved.source})`;
  }
  
  if (showOriginal && resolved.type !== "full" && resolved.type !== "shortened") {
    display += ` (${shortenAddress(resolved.original)})`;
  }
  
  return display;
}

/**
 * Copies address to clipboard
 */
export async function copyAddressToClipboard(address: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(address);
    return true;
  } catch (error) {
    console.warn("Failed to copy address:", error);
    
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackError) {
      console.warn("Fallback copy method failed:", fallbackError);
      return false;
    }
  }
}

/**
 * Validates if a string could be an ENS name
 */
export function isENSName(input: string): boolean {
  return /^[a-zA-Z0-9-]+\.eth$/.test(input) || 
         /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(input);
}

/**
 * Validates if a string could be a Farcaster username
 */
export function isFarcasterUsername(input: string): boolean {
  return /^@?[a-zA-Z0-9_-]+\.eth$/.test(input) || 
         /^@?[a-zA-Z0-9_-]+$/.test(input);
}

/**
 * Clears the address resolution cache
 */
export function clearAddressCache(): void {
  addressCache.clear();
  ensCache.clear();
  farcasterCache.clear();
  web3bioCache.clear();
  ensdataCache.clear();
  cacheTimestamps.clear();
  failureCache.clear();
  pendingRequests.clear();
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheStats() {
  return {
    addressCache: addressCache.size,
    ensCache: ensCache.size,
    farcasterCache: farcasterCache.size,
    web3bioCache: web3bioCache.size,
    ensdataCache: ensdataCache.size,
    failureCache: failureCache.size,
    pendingRequests: pendingRequests.size,
    totalCached: addressCache.size + ensCache.size + farcasterCache.size + web3bioCache.size + ensdataCache.size,
  };
}

/**
 * Preloads address resolutions for better UX
 */
export async function preloadAddresses(addresses: string[]): Promise<void> {
  const uncachedAddresses = addresses.filter(addr => {
    const normalized = addr.toLowerCase();
    const cached = addressCache.get(normalized);
    const cacheTime = cacheTimestamps.get(normalized);
    return !cached || !cacheTime || Date.now() - cacheTime >= CACHE_TTL;
  });

  if (uncachedAddresses.length > 0) {
    // Resolve in background without blocking UI
    resolveAddressBatch(uncachedAddresses, { enableFallbacks: true }).catch(error => {
      console.warn("Preload failed:", error);
    });
  }
}

/**
 * Gets the best available profile information for an address
 */
export async function getProfileInfo(address: string): Promise<{
  name?: string;
  avatar?: string;
  description?: string;
  social?: {
    twitter?: string;
    github?: string;
    discord?: string;
    telegram?: string;
    website?: string;
  };
  source?: string;
} | null> {
  const resolved = await resolveAddress(address, { enableFallbacks: true });
  
  if (resolved.type === "shortened" || resolved.type === "full") {
    return null;
  }

  return {
    name: resolved.display,
    avatar: resolved.avatar,
    description: resolved.metadata?.description,
    social: {
      twitter: resolved.metadata?.twitter,
      github: resolved.metadata?.github,
      discord: resolved.metadata?.discord,
      telegram: resolved.metadata?.telegram,
      website: resolved.metadata?.website,
    },
    source: resolved.source,
  };
}

// Type exports (already exported above, removing duplicate)