"use client";

import { ethers } from "ethers";
import {
  POLYGON_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  fitnessLeaderboardABI,
  RPC_URLS,
  LEADERBOARD_CACHE_DURATION,
  MOUNT_OLYMPUS_GOAL,
  KENYA_RUN_GOAL
} from "./constants";

// Contract addresses
export const CONTRACT_ADDRESSES = {
  polygon: POLYGON_CONTRACT_ADDRESS,
  celo: CELO_CONTRACT_ADDRESS,
  monad: MONAD_CONTRACT_ADDRESS,
  base: BASE_CONTRACT_ADDRESS
};

// Types
export interface Score {
  user: string;
  pushups: number;
  squats: number;
  timestamp: number;
}

export interface NetworkData {
  [network: string]: Score[];
}

export interface CollectiveGoals {
  totalPushups: number;
  totalSquats: number;
  mountOlympus: {
    goal: number;
    current: number;
    progressPercentage: number;
  };
  kenyaRun: {
    goal: number;
    current: number;
    progressPercentage: number;
  };
}

// Cache for leaderboard data
let leaderboardCache: {
  data: NetworkData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Function to fetch data with fallback RPCs
export async function fetchWithFallbackRpcs(
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
      
      console.log(`Calling getLeaderboard() on ${networkName} contract at ${contractAddress}`);
      const data = await contract.getLeaderboard();
      console.log(`Successfully retrieved ${data.length} entries from ${networkName}`);
      
      // Convert BigInt values to numbers for easier handling
      return data.map((item: any) => ({
        user: item.user,
        pushups: Number(item.pushups),
        squats: Number(item.squats),
        timestamp: Number(item.timestamp)
      }));
    } catch (error) {
      console.error(`Error fetching data from ${rpcUrl} (${networkName}):`, error);
      // Continue to next RPC URL
    }
  }
  
  console.error(`All RPC URLs failed for ${networkName}`);
  return [];
}

// Fetch data from all networks
export async function fetchAllNetworksData(forceRefresh = false): Promise<NetworkData> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (
    !forceRefresh &&
    leaderboardCache.data &&
    now - leaderboardCache.timestamp < LEADERBOARD_CACHE_DURATION
  ) {
    console.log("Using cached leaderboard data");
    return leaderboardCache.data;
  }

  const networks = ["polygon", "celo", "monad", "base"];
  const results: NetworkData = {};
  
  await Promise.all(
    networks.map(async (network) => {
      const data = await fetchWithFallbackRpcs(
        CONTRACT_ADDRESSES[network as keyof typeof CONTRACT_ADDRESSES],
        RPC_URLS[network as keyof typeof RPC_URLS],
        network
      );
      results[network] = data;
    })
  );
  
  // Update cache
  leaderboardCache = {
    data: results,
    timestamp: now
  };
  
  return results;
}

// Calculate totals for collective goals
export function calculateCollectiveGoals(allNetworksData: NetworkData): CollectiveGoals {
  let totalPushups = 0;
  let totalSquats = 0;
  
  Object.values(allNetworksData).forEach(networkData => {
    networkData.forEach(entry => {
      totalPushups += entry.pushups;
      totalSquats += entry.squats;
    });
  });
  
  // Calculate progress for Mount Olympus challenge
  const mountOlympusProgress = (totalPushups / MOUNT_OLYMPUS_GOAL) * 100;
  
  // Calculate progress for Kenya Run challenge
  const kenyaRunProgress = (totalSquats / KENYA_RUN_GOAL) * 100;
  
  return {
    totalPushups,
    totalSquats,
    mountOlympus: {
      goal: MOUNT_OLYMPUS_GOAL,
      current: totalPushups,
      progressPercentage: mountOlympusProgress
    },
    kenyaRun: {
      goal: KENYA_RUN_GOAL,
      current: totalSquats,
      progressPercentage: kenyaRunProgress
    }
  };
}

// Get network contribution percentages
export function getNetworkContributions(allNetworksData: NetworkData) {
  const networkContributions = {
    pushups: {} as Record<string, { count: number; percentage: number }>,
    squats: {} as Record<string, { count: number; percentage: number }>
  };
  
  let totalPushups = 0;
  let totalSquats = 0;
  
  // Count totals per network
  Object.entries(allNetworksData).forEach(([network, data]) => {
    const networkPushups = data.reduce((sum, entry) => sum + entry.pushups, 0);
    const networkSquats = data.reduce((sum, entry) => sum + entry.squats, 0);
    
    networkContributions.pushups[network] = { count: networkPushups, percentage: 0 };
    networkContributions.squats[network] = { count: networkSquats, percentage: 0 };
    
    totalPushups += networkPushups;
    totalSquats += networkSquats;
  });
  
  // Calculate percentages
  if (totalPushups > 0) {
    Object.keys(networkContributions.pushups).forEach(network => {
      networkContributions.pushups[network].percentage = 
        (networkContributions.pushups[network].count / totalPushups) * 100;
    });
  }
  
  if (totalSquats > 0) {
    Object.keys(networkContributions.squats).forEach(network => {
      networkContributions.squats[network].percentage = 
        (networkContributions.squats[network].count / totalSquats) * 100;
    });
  }
  
  return networkContributions;
}
