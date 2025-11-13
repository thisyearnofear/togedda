/**
 * Server-side blockchain data fetching
 * This version can be used in API routes and server-side functions
 */

import { ethers } from "ethers";
import {
  POLYGON_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  fitnessLeaderboardABI,
  RPC_URLS,
} from "./constants";

// Contract addresses
export const CONTRACT_ADDRESSES = {
  polygon: POLYGON_CONTRACT_ADDRESS,
  celo: CELO_CONTRACT_ADDRESS,
  monad: MONAD_CONTRACT_ADDRESS,
  base: BASE_CONTRACT_ADDRESS
};

// Types (shared with client-side)
export interface Score {
  user: string;
  pushups: number;
  squats: number;
  timestamp: number;
}

export interface NetworkData {
  [network: string]: Score[];
}

// Server-side cache for leaderboard data
let serverLeaderboardCache: {
  data: NetworkData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Server-side function to fetch data with fallback RPCs
 */
export async function fetchWithFallbackRpcsServer(
  contractAddress: string,
  rpcUrls: string[],
  networkName: string
): Promise<Score[]> {
  for (const rpcUrl of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        contractAddress,
        fitnessLeaderboardABI,
        provider
      );
      
      console.log(`[Server] Calling getLeaderboard() on ${networkName} contract at ${contractAddress}`);
      const data = await contract.getLeaderboard();
      console.log(`[Server] Successfully retrieved ${data.length} entries from ${networkName}`);
      
      // Convert BigInt values to numbers for easier handling
      return data.map((item: any) => ({
        user: item.user,
        pushups: Number(item.pushups),
        squats: Number(item.squats),
        timestamp: Number(item.timestamp)
      }));
    } catch (error) {
      console.error(`[Server] Error fetching data from ${rpcUrl} (${networkName}):`, error);
      // Continue to next RPC URL
    }
  }
  
  console.error(`[Server] All RPC URLs failed for ${networkName}`);
  return [];
}

/**
 * Server-side function to fetch data from all networks
 */
export async function fetchAllNetworksDataServer(forceRefresh = false): Promise<NetworkData> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (
    !forceRefresh &&
    serverLeaderboardCache.data &&
    now - serverLeaderboardCache.timestamp < CACHE_DURATION
  ) {
    console.log("[Server] Using cached leaderboard data");
    return serverLeaderboardCache.data;
  }

  console.log("[Server] Fetching fresh blockchain data...");
  const networks = ["polygon", "celo", "monad", "base"];
  const results: NetworkData = {};
  
  // Fetch data from all networks in parallel
  await Promise.all(
    networks.map(async (network) => {
      try {
        const data = await fetchWithFallbackRpcsServer(
          CONTRACT_ADDRESSES[network as keyof typeof CONTRACT_ADDRESSES],
          RPC_URLS[network as keyof typeof RPC_URLS],
          network
        );
        results[network] = data;
        console.log(`[Server] ${network}: ${data.length} entries fetched`);
      } catch (error) {
        console.error(`[Server] Failed to fetch data for ${network}:`, error);
        results[network] = []; // Set empty array on failure
      }
    })
  );
  
  // Update cache
  serverLeaderboardCache = {
    data: results,
    timestamp: now
  };
  
  console.log("[Server] Blockchain data fetch completed");
  return results;
}

/**
 * Get fitness data for a specific address across all networks
 */
export async function getAddressFitnessDataServer(address: string): Promise<{
  totalPushups: number;
  totalSquats: number;
  lastActivity: string;
  networks: string[];
} | null> {
  try {
    const networkData = await fetchAllNetworksDataServer();
    const normalizedAddress = address.toLowerCase();
    
    let totalPushups = 0;
    let totalSquats = 0;
    let lastActivity = '';
    let lastTimestamp = 0;
    const networks = new Set<string>();
    
    // Aggregate data across all networks
    for (const [network, scores] of Object.entries(networkData)) {
      for (const score of scores) {
        if (score.user.toLowerCase() === normalizedAddress) {
          totalPushups += score.pushups;
          totalSquats += score.squats;
          networks.add(network);
          
          if (score.timestamp > lastTimestamp) {
            lastTimestamp = score.timestamp;
            lastActivity = new Date(score.timestamp * 1000).toISOString();
          }
        }
      }
    }
    
    if (totalPushups === 0 && totalSquats === 0) {
      return null; // No fitness data found
    }
    
    return {
      totalPushups,
      totalSquats,
      lastActivity,
      networks: Array.from(networks)
    };
    
  } catch (error) {
    console.error('[Server] Error getting address fitness data:', error);
    return null;
  }
}

/**
 * Get aggregated fitness data for multiple addresses
 */
export async function getMultiAddressFitnessDataServer(addresses: string[]): Promise<{
  totalPushups: number;
  totalSquats: number;
  lastActivity: string;
  networks: string[];
  addressBreakdown: { [address: string]: { pushups: number; squats: number; networks: string[] } };
} | null> {
  try {
    const networkData = await fetchAllNetworksDataServer();
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
    
    let totalPushups = 0;
    let totalSquats = 0;
    let lastActivity = '';
    let lastTimestamp = 0;
    const networks = new Set<string>();
    const addressBreakdown: { [address: string]: { pushups: number; squats: number; networks: string[] } } = {};
    
    // Initialize breakdown for each address
    normalizedAddresses.forEach(addr => {
      addressBreakdown[addr] = { pushups: 0, squats: 0, networks: [] };
    });
    
    // Aggregate data across all networks and addresses
    for (const [network, scores] of Object.entries(networkData)) {
      for (const score of scores) {
        const scoreAddress = score.user.toLowerCase();
        if (normalizedAddresses.includes(scoreAddress)) {
          totalPushups += score.pushups;
          totalSquats += score.squats;
          networks.add(network);
          
          // Update address breakdown
          addressBreakdown[scoreAddress].pushups += score.pushups;
          addressBreakdown[scoreAddress].squats += score.squats;
          if (!addressBreakdown[scoreAddress].networks.includes(network)) {
            addressBreakdown[scoreAddress].networks.push(network);
          }
          
          if (score.timestamp > lastTimestamp) {
            lastTimestamp = score.timestamp;
            lastActivity = new Date(score.timestamp * 1000).toISOString();
          }
        }
      }
    }
    
    if (totalPushups === 0 && totalSquats === 0) {
      return null; // No fitness data found
    }
    
    return {
      totalPushups,
      totalSquats,
      lastActivity,
      networks: Array.from(networks),
      addressBreakdown
    };
    
  } catch (error) {
    console.error('[Server] Error getting multi-address fitness data:', error);
    return null;
  }
}

/**
 * Check if an address has any fitness activity
 */
export async function hasAddressFitnessActivityServer(address: string): Promise<boolean> {
  try {
    const fitnessData = await getAddressFitnessDataServer(address);
    return fitnessData !== null && (fitnessData.totalPushups > 0 || fitnessData.totalSquats > 0);
  } catch (error) {
    console.error('[Server] Error checking address fitness activity:', error);
    return false;
  }
}

/**
 * Get the latest activity timestamp for an address
 */
export async function getLatestActivityTimestampServer(address: string): Promise<number | null> {
  try {
    const networkData = await fetchAllNetworksDataServer();
    const normalizedAddress = address.toLowerCase();
    let latestTimestamp = 0;
    
    for (const [network, scores] of Object.entries(networkData)) {
      for (const score of scores) {
        if (score.user.toLowerCase() === normalizedAddress && score.timestamp > latestTimestamp) {
          latestTimestamp = score.timestamp;
        }
      }
    }
    
    return latestTimestamp > 0 ? latestTimestamp : null;
  } catch (error) {
    console.error('[Server] Error getting latest activity timestamp:', error);
    return null;
  }
}
