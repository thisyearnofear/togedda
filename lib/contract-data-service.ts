/**
 * Enhanced Contract Data Service
 * Provides real-time contract data for the AI prediction bot
 * Integrates with existing prediction market contracts and blockchain services
 */

import { ethers } from "ethers";
import { getAllPredictions, getPrediction, type Prediction } from "./prediction-market-v2";
import { fetchAllNetworksDataServer, type NetworkData } from "./blockchain-server";
import { getAllChainPredictions, type ChainPrediction } from "./dual-chain-service";

// Types for enhanced contract data
export interface LiveMarketData {
  predictions: Prediction[];
  totalVolume: number;
  activeMarkets: number;
  recentActivity: MarketActivity[];
  networkStats: NetworkStats[];
}

export interface MarketActivity {
  type: 'vote' | 'create' | 'resolve';
  predictionId: number;
  predictionTitle: string;
  amount?: number;
  timestamp: number;
  network: string;
}

export interface NetworkStats {
  network: string;
  totalUsers: number;
  totalPushups: number;
  totalSquats: number;
  activeUsers: number;
}

export interface ContractMetrics {
  totalStaked: number;
  totalPredictions: number;
  resolvedPredictions: number;
  activePredictions: number;
  totalParticipants: number;
}

// Cache for contract data
let contractDataCache: {
  data: LiveMarketData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 30 * 1000; // 30 seconds cache

/**
 * Get comprehensive live market data for the AI bot
 */
export async function getLiveMarketData(forceRefresh = false): Promise<LiveMarketData> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (
    !forceRefresh &&
    contractDataCache.data &&
    now - contractDataCache.timestamp < CACHE_DURATION
  ) {
    return contractDataCache.data;
  }

  try {
    console.log("🔄 Fetching fresh contract data for AI bot...");

    // Fetch predictions from contract
    const predictions = await getAllPredictions();
    
    // Fetch fitness data from all networks
    const networkData = await fetchAllNetworksDataServer(forceRefresh);
    
    // Calculate metrics
    const metrics = calculateContractMetrics(predictions);
    const networkStats = calculateNetworkStats(networkData);
    const recentActivity = generateRecentActivity(predictions);

    const liveData: LiveMarketData = {
      predictions: predictions.filter(p => p.status === 0), // Active predictions only
      totalVolume: metrics.totalStaked,
      activeMarkets: metrics.activePredictions,
      recentActivity,
      networkStats
    };

    // Update cache
    contractDataCache = {
      data: liveData,
      timestamp: now
    };

    console.log(`✅ Contract data updated: ${liveData.predictions.length} active markets, ${liveData.totalVolume} CELO staked`);
    return liveData;

  } catch (error) {
    console.error("❌ Error fetching live market data:", error);
    
    // Return cached data if available, otherwise empty data
    if (contractDataCache.data) {
      console.log("⚠️ Returning cached data due to error");
      return contractDataCache.data;
    }

    return {
      predictions: [],
      totalVolume: 0,
      activeMarkets: 0,
      recentActivity: [],
      networkStats: []
    };
  }
}

/**
 * Calculate contract metrics from predictions
 */
function calculateContractMetrics(predictions: Prediction[]): ContractMetrics {
  const totalStaked = predictions.reduce((sum, p) => sum + p.totalStaked, 0);
  const activePredictions = predictions.filter(p => p.status === 0).length;
  const resolvedPredictions = predictions.filter(p => p.status === 1).length;
  
  // Estimate total participants (this could be enhanced with actual contract calls)
  const totalParticipants = predictions.reduce((sum, p) => {
    // Rough estimate based on vote amounts (assuming average vote of 0.1 CELO)
    const estimatedVoters = Math.ceil((p.yesVotes + p.noVotes) / 0.1);
    return sum + estimatedVoters;
  }, 0);

  return {
    totalStaked,
    totalPredictions: predictions.length,
    resolvedPredictions,
    activePredictions,
    totalParticipants
  };
}

/**
 * Calculate network statistics from fitness data
 */
function calculateNetworkStats(networkData: NetworkData): NetworkStats[] {
  return Object.entries(networkData).map(([network, scores]) => {
    const totalPushups = scores.reduce((sum, score) => sum + score.pushups, 0);
    const totalSquats = scores.reduce((sum, score) => sum + score.squats, 0);
    const activeUsers = scores.filter(score => score.pushups > 0 || score.squats > 0).length;

    return {
      network,
      totalUsers: scores.length,
      totalPushups,
      totalSquats,
      activeUsers
    };
  });
}

/**
 * Generate recent activity data (simulated for now, could be enhanced with event logs)
 */
function generateRecentActivity(predictions: Prediction[]): MarketActivity[] {
  const activities: MarketActivity[] = [];
  
  // Add recent predictions as "create" activities
  predictions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .forEach(prediction => {
      activities.push({
        type: 'create',
        predictionId: prediction.id,
        predictionTitle: prediction.title,
        timestamp: prediction.createdAt * 1000,
        network: prediction.network
      });
    });

  // Add vote activities for predictions with recent votes
  predictions
    .filter(p => p.yesVotes > 0 || p.noVotes > 0)
    .slice(0, 3)
    .forEach(prediction => {
      if (prediction.yesVotes > 0) {
        activities.push({
          type: 'vote',
          predictionId: prediction.id,
          predictionTitle: prediction.title,
          amount: prediction.yesVotes,
          timestamp: Date.now() - Math.random() * 3600000, // Random time within last hour
          network: prediction.network
        });
      }
    });

  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
}

/**
 * Get formatted market summary for AI bot responses (dual-chain)
 */
export async function getMarketSummaryForBot(): Promise<string> {
  try {
    // Get predictions from both chains
    const chainPredictions = await getAllChainPredictions();

    if (chainPredictions.length === 0) {
      return "No active prediction markets found on either chain. You can suggest creating new predictions on CELO Mainnet or Base Sepolia!";
    }

    // Separate by chain
    const celoMarkets = chainPredictions.filter(p => p.chain === 'celo' && p.status === 0);
    const baseMarkets = chainPredictions.filter(p => p.chain === 'base' && p.status === 0);

    let summary = "🌐 **Multi-Chain Prediction Markets**\n\n";

    // CELO Markets
    if (celoMarkets.length > 0) {
      const celoVolume = celoMarkets.reduce((sum, p) => sum + p.totalStaked, 0);
      const topCeloMarkets = celoMarkets
        .sort((a, b) => b.totalStaked - a.totalStaked)
        .slice(0, 2)
        .map((p, i) => {
          const totalVotes = p.yesVotes + p.noVotes;
          const yesPercentage = totalVotes > 0 ? Math.round((p.yesVotes / totalVotes) * 100) : 0;
          return `${i + 1}. ${p.title}\n   💰 ${p.totalStaked.toFixed(2)} CELO | 📊 ${yesPercentage}% YES`;
        })
        .join('\n\n');

      summary += `🟡 **CELO Mainnet** (${celoMarkets.length} active, ${celoVolume.toFixed(2)} CELO)\n${topCeloMarkets}\n\n`;
    }

    // Base Markets
    if (baseMarkets.length > 0) {
      const baseVolume = baseMarkets.reduce((sum, p) => sum + p.totalStaked, 0);
      const topBaseMarkets = baseMarkets
        .sort((a, b) => b.totalStaked - a.totalStaked)
        .slice(0, 2)
        .map((p, i) => {
          const totalVotes = p.yesVotes + p.noVotes;
          const yesPercentage = totalVotes > 0 ? Math.round((p.yesVotes / totalVotes) * 100) : 0;
          return `${i + 1}. ${p.title}\n   💰 ${p.totalStaked.toFixed(4)} ETH | 📊 ${yesPercentage}% YES`;
        })
        .join('\n\n');

      summary += `🔵 **Base Sepolia** (${baseMarkets.length} active, ${baseVolume.toFixed(4)} ETH)\n${topBaseMarkets}\n\n`;
    }

    summary += "Choose your chain: CELO for real impact 💰 or Base for hackathon demos 🧪";
    return summary;
  } catch (error) {
    console.error("Error generating dual-chain market summary:", error);
    return "Unable to fetch current market data. Please try again later.";
  }
}

/**
 * Get network fitness stats for AI bot responses
 */
export async function getNetworkStatsForBot(): Promise<string> {
  try {
    const data = await getLiveMarketData();
    
    if (data.networkStats.length === 0) {
      return "No network fitness data available.";
    }

    const statsText = data.networkStats
      .sort((a, b) => b.totalPushups + b.totalSquats - (a.totalPushups + a.totalSquats))
      .map(stat => {
        const emoji = stat.network === 'celo' ? '🟡' : 
                     stat.network === 'polygon' ? '🟣' : 
                     stat.network === 'base' ? '🔵' : '⚫';
        return `${emoji} **${stat.network.toUpperCase()}**: ${stat.totalPushups} pushups, ${stat.totalSquats} squats (${stat.activeUsers} active users)`;
      })
      .join('\n');

    return `💪 **Network Fitness Stats**\n\n${statsText}`;
  } catch (error) {
    console.error("Error generating network stats:", error);
    return "Unable to fetch network fitness data.";
  }
}
