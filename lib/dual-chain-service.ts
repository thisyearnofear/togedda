/**
 * Dual-Chain Service for CELO Mainnet + Base Sepolia
 * Handles prediction market operations across both networks
 * Optimized for Base Batches Buildathon while maintaining CELO production functionality
 *
 * TODO: Consolidate with lib/config/chains.ts for better DRY principles
 * This service maintains its own chain config for prediction-specific contracts
 */

import { ethers } from "ethers";
import { unifiedPredictionMarketABI } from "./unified-prediction-market-abi";
import { getChainName, getChainSwitchInfo } from "./config/chains";

// Chain configurations
export const CHAIN_CONFIG = {
  celo: {
    id: 42220,
    name: "CELO Mainnet",
    rpcUrl:
      "https://celo-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
    contractAddress: "0xa226c82f1b6983aBb7287Cd4d83C2aEC802A183F", // New unified contract deployed
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
    blockExplorer: "https://celoscan.io",
    color: "#fcb131",
    emoji: "🟡",
    isProduction: true,
  },
  base: {
    id: 8453,
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
    contractAddress: "0x89ED0a9739801634A61e791aB57ADc3298B685e9", // SweatEquityBot on Base mainnet
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorer: "https://basescan.org",
    color: "#0052FF",
    emoji: "🔵",
    isProduction: true,
  },
  bsc: {
    id: 56, // BNB Chain mainnet
    name: "BNB Chain",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    contractAddress: "0x0000000000000000000000000000000000000000", // TODO: Deploy BNB Chain contract
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    blockExplorer: "https://bscscan.com",
    color: "#F0B90B",
    emoji: "🟡",
    isProduction: true,
  },
} as const;

export type SupportedChain = keyof typeof CHAIN_CONFIG;

// Enhanced prediction interface with chain information
export interface ChainPrediction {
  id: number;
  chain: SupportedChain;
  creator: string;
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  currentValue: number;
  category: number;
  network: string;
  emoji: string;
  totalStaked: number;
  yesVotes: number;
  noVotes: number;
  status: number;
  outcome: number;
  createdAt: number;
  autoResolvable: boolean;
  // Chain-specific metadata
  chainMetadata: {
    currency: string;
    explorerUrl: string;
    isProduction: boolean;
  };
}

/**
 * Get contract instance for a specific chain
 * Uses direct ethers providers for reliability and correct ABI for each chain
 */
export function getChainContract(
  chain: SupportedChain,
  signerOrProvider?: ethers.Signer | ethers.Provider
) {
  const config = CHAIN_CONFIG[chain];

  // Use provided signer/provider, or create a reliable ethers provider
  const provider =
    signerOrProvider ||
    new ethers.JsonRpcProvider(config.rpcUrl, {
      name: config.name,
      chainId: config.id,
    });

  // Use the unified ABI for both chains
  return new ethers.Contract(
    config.contractAddress,
    unifiedPredictionMarketABI,
    provider
  );
}

/**
 * Get all predictions from both chains
 * Uses reliable ethers providers
 */
export async function getAllChainPredictions(): Promise<ChainPrediction[]> {
  const allPredictions: ChainPrediction[] = [];

  for (const [chainKey, config] of Object.entries(CHAIN_CONFIG)) {
    const chain = chainKey as SupportedChain;

    try {
      console.log(`🔄 Fetching predictions from ${config.name}...`);
      const contract = getChainContract(chain);

      // For Base mainnet, limit to recent SweatEquityBot-relevant predictions only
      let totalPredictions = 0;
      if (chain === "base") {
        // Only show recent predictions to focus on SweatEquityBot innovation
        totalPredictions = 10; // Limit Base to avoid showing old test predictions
        console.log(
          `🎯 ${config.name} - limiting to ${totalPredictions} recent predictions for SweatEquityBot focus`
        );
      } else {
        try {
          // Try to get the prediction count from contract (if available)
          const contractTotal = await contract.getTotalPredictions();
          totalPredictions = Number(contractTotal.toString()); // Convert BigInt to number
          console.log(
            `📊 ${config.name} has ${totalPredictions} total predictions`
          );
        } catch (error) {
          // Fallback: scan for predictions up to a reasonable limit
          console.log(
            `⚠️ No getTotalPredictions() method, scanning for predictions...`
          );
          totalPredictions = 100; // Increased scan limit to catch more predictions
        }
      }

      // Fetch all predictions dynamically - scan more comprehensively
      // Start from ID 1 since our contract predictions start from 1, not 0
      const maxId = Math.max(totalPredictions, 50); // Ensure we scan at least 50 IDs
      let foundPredictions = 0;
      let consecutiveFailures = 0;

      for (let id = 1; id <= maxId; id++) {
        try {
          const prediction = await contract.getPrediction(id);

          const chainPrediction: ChainPrediction = {
            id: Number(prediction.id.toString()),
            chain,
            creator: prediction.creator,
            title: prediction.title,
            description: prediction.description,
            targetDate: Number(prediction.targetDate.toString()),
            targetValue: Number(prediction.targetValue.toString()),
            currentValue: Number(prediction.currentValue.toString()),
            category: Number(prediction.category.toString()),
            network: prediction.network,
            emoji: prediction.emoji,
            totalStaked: Number(ethers.formatEther(prediction.totalStaked)),
            yesVotes: Number(ethers.formatEther(prediction.yesVotes)),
            noVotes: Number(ethers.formatEther(prediction.noVotes)),
            status: Number(prediction.status.toString()),
            outcome: Number(prediction.outcome.toString()),
            createdAt: Number(prediction.createdAt.toString()),
            autoResolvable: prediction.autoResolvable,
            chainMetadata: {
              currency: config.nativeCurrency.symbol,
              explorerUrl: config.blockExplorer,
              isProduction: config.isProduction,
            },
          };

          allPredictions.push(chainPrediction);
          foundPredictions++;
          consecutiveFailures = 0; // Reset failure counter
        } catch (error) {
          consecutiveFailures++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // If we hit 5 consecutive failures and haven't found any predictions, likely no predictions exist
          if (consecutiveFailures >= 5 && foundPredictions === 0) {
            console.log(
              `📍 No predictions found after ${consecutiveFailures} attempts on ${config.name}`
            );
            break;
          }

          // If we've found predictions but hit 3 consecutive failures, we've likely reached the end
          if (consecutiveFailures >= 3 && foundPredictions > 0) {
            console.log(
              `📍 Reached end of predictions at ID ${
                id - consecutiveFailures
              } on ${config.name}`
            );
            break;
          }

          if (
            errorMessage?.includes("revert") ||
            errorMessage?.includes("invalid")
          ) {
            // This is expected for non-existent predictions, continue scanning
            continue;
          }

          console.log(
            `⚠️ Error fetching prediction ${id} on ${config.name}:`,
            errorMessage
          );
        }
      }

      console.log(
        `✅ Found ${
          allPredictions.filter((p) => p.chain === chain).length
        } predictions on ${config.name}`
      );
    } catch (error) {
      console.error(
        `❌ Error fetching predictions from ${config.name}:`,
        error
      );
    }
  }

  return allPredictions;
}

/**
 * Create prediction on specified chain
 */
export async function createChainPrediction(
  chain: SupportedChain,
  predictionData: {
    title: string;
    description: string;
    targetDate: number;
    targetValue: number;
    category: number;
    network: string;
    emoji: string;
    autoResolvable?: boolean;
  },
  signer: ethers.Signer
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const config = CHAIN_CONFIG[chain];
    const contract = getChainContract(chain, signer);

    console.log(
      `🔄 Creating prediction on ${config.name}: ${predictionData.title}`
    );

    const tx = await contract.createPrediction(
      predictionData.title,
      predictionData.description,
      predictionData.targetDate,
      predictionData.targetValue,
      predictionData.category,
      predictionData.network,
      predictionData.emoji,
      predictionData.autoResolvable || false
    );

    const receipt = await tx.wait();

    console.log(`✅ Prediction created on ${config.name}: ${receipt.hash}`);

    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error(`❌ Error creating prediction on ${chain}:`, error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Vote on prediction with chain-specific handling
 */
export async function voteOnChainPrediction(
  chain: SupportedChain,
  predictionId: number,
  isYes: boolean,
  amount: string, // Amount in native currency (CELO or ETH)
  signer: ethers.Signer
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const config = CHAIN_CONFIG[chain];
    const contract = getChainContract(chain, signer);

    const amountInWei = ethers.parseEther(amount);

    console.log(
      `🔄 Voting on ${config.name} prediction ${predictionId}: ${
        isYes ? "YES" : "NO"
      } with ${amount} ${config.nativeCurrency.symbol}`
    );

    const tx = await contract.vote(predictionId, isYes, {
      value: amountInWei,
    });

    const receipt = await tx.wait();

    console.log(`✅ Vote successful on ${config.name}: ${receipt.hash}`);

    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error(`❌ Error voting on ${chain}:`, error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Get chain-specific staking recommendations
 */
export function getStakingRecommendations(chain: SupportedChain) {
  const config = CHAIN_CONFIG[chain];

  if (chain === "celo") {
    return {
      minAmount: "0.1",
      recommendedAmounts: ["0.5", "1.0", "2.5", "5.0"],
      currency: "CELO",
      note: "Production network - real CELO tokens",
      gasEstimate: "~0.001 CELO",
    };
  } else if (chain === "bsc") {
    return {
      minAmount: "0.001",
      recommendedAmounts: ["0.005", "0.01", "0.025", "0.05"],
      currency: "BNB",
      note: "BNB Chain - High-performance predictions with low gas fees!",
      gasEstimate: "~0.00005 BNB",
    };
  } else {
    return {
      minAmount: "0.001",
      recommendedAmounts: ["0.005", "0.01", "0.025", "0.05"],
      currency: "ETH",
      note: "Base Mainnet - Revolutionary fitness-backed predictions with 80% stake recovery!",
      gasEstimate: "~0.0001 ETH",
    };
  }
}

/**
 * Get formatted chain summary for AI bot
 */
export async function getChainSummaryForBot(): Promise<string> {
  try {
    const predictions = await getAllChainPredictions();

    const celoStats = predictions.filter((p) => p.chain === "celo");
    const baseStats = predictions.filter((p) => p.chain === "base");
    const bscStats = predictions.filter((p) => p.chain === "bsc");

    const celoVolume = celoStats.reduce((sum, p) => sum + p.totalStaked, 0);
    const baseVolume = baseStats.reduce((sum, p) => sum + p.totalStaked, 0);
    const bscVolume = bscStats.reduce((sum, p) => sum + p.totalStaked, 0);

    return `🌐 **Multi-Chain Prediction Markets**

🟡 **CELO Mainnet** (Production)
• ${celoStats.length} active predictions
• ${celoVolume.toFixed(2)} CELO total volume
• Real money, real impact! 💰

🔵 **Base Mainnet** (SweatEquityBot)
• ${baseStats.length} active predictions
• ${baseVolume.toFixed(4)} ETH total volume
• Revolutionary fitness-backed predictions! 💪
• Recover lost stakes through exercise! 🏋️

🟡 **BNB Chain** (High Performance)
• ${bscStats.length} active predictions
• ${bscVolume.toFixed(4)} BNB total volume
• Low gas fees, fast transactions! ⚡

🏆 **Multi-Sports Predictions Available**
• Link ImperfectForm, ImperfectCoach, ImperfectAbs data
• Create predictions spanning multiple sports apps
• Verify exercise completion across platforms

Choose your chain when creating predictions or voting!`;
  } catch (error) {
    console.error("Error generating chain summary:", error);
    return "Revolutionary multi-sports prediction markets available on CELO Mainnet, Base Mainnet, and BNB Chain!";
  }
}

/**
 * Get user vote for a specific prediction on the correct chain
 * Uses reliable ethers providers
 */
export async function getChainUserVote(
  predictionId: number,
  userAddress: string,
  chain: SupportedChain
): Promise<{ isYes: boolean; amount: number; claimed: boolean } | null> {
  try {
    const contract = getChainContract(chain);
    const vote = await contract.getUserVote(predictionId, userAddress);

    return {
      isYes: vote.isYes,
      amount: Number(ethers.formatEther(vote.amount)),
      claimed: vote.claimed,
    };
  } catch (error: any) {
    // Check if it's a specific contract error vs network error
    if (
      error.message?.includes("missing revert data") ||
      error.code === "CALL_EXCEPTION"
    ) {
      console.warn(
        `⚠️ Contract call failed for prediction ${predictionId} on ${chain} - prediction may not exist or user hasn't voted`
      );
      return null;
    }

    console.error(
      `Error getting user vote for prediction ${predictionId} on ${chain}:`,
      error
    );
    return null;
  }
}

/**
 * Get fee information for a specific chain
 * Uses reliable ethers providers
 */
export async function getChainFeeInfo(chain: SupportedChain): Promise<{
  charityFeePercentage: number;
  maintenanceFeePercentage: number;
  totalFeePercentage: number;
  charityAddress: string;
  maintenanceAddress: string;
} | null> {
  try {
    const contract = getChainContract(chain);

    const [
      charityFeePercentage,
      maintenanceFeePercentage,
      totalFeePercentage,
      charityAddress,
      maintenanceAddress,
    ] = await Promise.all([
      contract.charityFeePercentage(),
      contract.maintenanceFeePercentage(),
      contract.getTotalFeePercentage(),
      contract.charityAddress(),
      contract.maintenanceAddress(),
    ]);

    return {
      charityFeePercentage: Number(charityFeePercentage),
      maintenanceFeePercentage: Number(maintenanceFeePercentage),
      totalFeePercentage: Number(totalFeePercentage),
      charityAddress,
      maintenanceAddress,
    };
  } catch (error: any) {
    console.error(`Error getting fee info for ${chain}:`, error);
    return null;
  }
}

/**
 * Get a specific prediction by ID and chain
 */
export async function getChainPrediction(
  predictionId: number,
  chain: SupportedChain
): Promise<ChainPrediction | null> {
  try {
    const contract = getChainContract(chain);
    const prediction = await contract.getPrediction(predictionId);

    const config = CHAIN_CONFIG[chain];

    return {
      id: Number(prediction.id),
      creator: prediction.creator,
      title: prediction.title,
      description: prediction.description,
      targetDate: Number(prediction.targetDate),
      targetValue: Number(prediction.targetValue),
      currentValue: Number(prediction.currentValue),
      category: prediction.category,
      network: prediction.network,
      emoji: prediction.emoji,
      totalStaked: Number(ethers.formatEther(prediction.totalStaked)),
      yesVotes: Number(ethers.formatEther(prediction.yesVotes)),
      noVotes: Number(ethers.formatEther(prediction.noVotes)),
      status: prediction.status,
      outcome: prediction.outcome,
      createdAt: Number(prediction.createdAt),
      autoResolvable: prediction.autoResolvable,
      chain: chain,
      chainMetadata: {
        currency: config.nativeCurrency.symbol,
        explorerUrl: config.blockExplorer,
        isProduction: config.isProduction,
      },
    };
  } catch (error: any) {
    console.error(
      `Error getting prediction ${predictionId} on ${chain}:`,
      error
    );
    return null;
  }
}

/**
 * Determine best chain for user based on context
 */
export function recommendChainForUser(context: {
  isNewUser?: boolean;
  hasTestEth?: boolean;
  hasCelo?: boolean;
  hasBnb?: boolean;
  wantsRealMoney?: boolean;
  prefersLowFees?: boolean;
}): SupportedChain {
  // For hackathon focus on BNB Chain with low fees
  if (context.prefersLowFees || context.hasBnb) {
    return "bsc";
  }
  
  // For revolutionary SweatEquityBot features, recommend Base Mainnet
  if (context.isNewUser || context.hasTestEth || !context.wantsRealMoney) {
    return "base";
  }

  // For users wanting real impact, recommend CELO
  if (context.wantsRealMoney || context.hasCelo) {
    return "celo";
  }

  // Default to BNB for hackathon focus
  return "bsc";
}
