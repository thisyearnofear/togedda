/**
 * Dual-Chain Service for CELO Mainnet + Base Sepolia
 * Handles prediction market operations across both networks
 * Optimized for Base Batches Buildathon while maintaining CELO production functionality
 */

import { ethers } from "ethers";
import { predictionMarketABI } from "./constants";

// Chain configurations
export const CHAIN_CONFIG = {
  celo: {
    id: 42220,
    name: "CELO Mainnet",
    rpcUrl: "https://forno.celo.org",
    contractAddress: "0x4d6b336F174f17daAf63D233E1E05cB105562304",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18
    },
    blockExplorer: "https://celoscan.io",
    color: "#fcb131",
    emoji: "🟡",
    isProduction: true
  },
  base: {
    id: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    contractAddress: "0x9B4Be1030eDC90205C10aEE54920192A13c12Cba",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorer: "https://sepolia.basescan.org",
    color: "#416ced",
    emoji: "🔵",
    isProduction: false
  }
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
 */
export function getChainContract(chain: SupportedChain, signerOrProvider?: ethers.Signer | ethers.Provider) {
  const config = CHAIN_CONFIG[chain];
  const provider = signerOrProvider || new ethers.JsonRpcProvider(config.rpcUrl);
  
  return new ethers.Contract(
    config.contractAddress,
    predictionMarketABI,
    provider
  );
}

/**
 * Get all predictions from both chains
 */
export async function getAllChainPredictions(): Promise<ChainPrediction[]> {
  const allPredictions: ChainPrediction[] = [];
  
  for (const [chainKey, config] of Object.entries(CHAIN_CONFIG)) {
    const chain = chainKey as SupportedChain;
    
    try {
      console.log(`🔄 Fetching predictions from ${config.name}...`);
      const contract = getChainContract(chain);
      
      // Get predictions (assuming IDs 1-4 exist on both chains)
      const knownIds = [1, 2, 3, 4];
      
      for (const id of knownIds) {
        try {
          const prediction = await contract.getPrediction(id);
          
          const chainPrediction: ChainPrediction = {
            id: Number(prediction.id),
            chain,
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
            chainMetadata: {
              currency: config.nativeCurrency.symbol,
              explorerUrl: config.blockExplorer,
              isProduction: config.isProduction
            }
          };
          
          allPredictions.push(chainPrediction);
        } catch (error) {
          console.log(`No prediction ${id} found on ${config.name}`);
        }
      }
      
      console.log(`✅ Found ${allPredictions.filter(p => p.chain === chain).length} predictions on ${config.name}`);
    } catch (error) {
      console.error(`❌ Error fetching predictions from ${config.name}:`, error);
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
    
    console.log(`🔄 Creating prediction on ${config.name}: ${predictionData.title}`);
    
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
      txHash: receipt.hash
    };
  } catch (error: any) {
    console.error(`❌ Error creating prediction on ${chain}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error'
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
    
    console.log(`🔄 Voting on ${config.name} prediction ${predictionId}: ${isYes ? 'YES' : 'NO'} with ${amount} ${config.nativeCurrency.symbol}`);
    
    const tx = await contract.vote(predictionId, isYes, {
      value: amountInWei
    });
    
    const receipt = await tx.wait();
    
    console.log(`✅ Vote successful on ${config.name}: ${receipt.hash}`);
    
    return {
      success: true,
      txHash: receipt.hash
    };
  } catch (error: any) {
    console.error(`❌ Error voting on ${chain}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get chain-specific staking recommendations
 */
export function getStakingRecommendations(chain: SupportedChain) {
  const config = CHAIN_CONFIG[chain];
  
  if (chain === 'celo') {
    return {
      minAmount: "0.1",
      recommendedAmounts: ["0.5", "1.0", "2.5", "5.0"],
      currency: "CELO",
      note: "Production network - real CELO tokens",
      gasEstimate: "~0.001 CELO"
    };
  } else {
    return {
      minAmount: "0.001",
      recommendedAmounts: ["0.005", "0.01", "0.025", "0.05"],
      currency: "ETH",
      note: "Testnet - free test ETH from faucet",
      gasEstimate: "~0.0001 ETH"
    };
  }
}

/**
 * Get formatted chain summary for AI bot
 */
export async function getChainSummaryForBot(): Promise<string> {
  try {
    const predictions = await getAllChainPredictions();
    
    const celoStats = predictions.filter(p => p.chain === 'celo');
    const baseStats = predictions.filter(p => p.chain === 'base');
    
    const celoVolume = celoStats.reduce((sum, p) => sum + p.totalStaked, 0);
    const baseVolume = baseStats.reduce((sum, p) => sum + p.totalStaked, 0);
    
    return `🌐 **Multi-Chain Prediction Markets**

🟡 **CELO Mainnet** (Production)
• ${celoStats.length} active predictions
• ${celoVolume.toFixed(2)} CELO total volume
• Real money, real impact! 💰

🔵 **Base Sepolia** (Hackathon)
• ${baseStats.length} active predictions  
• ${baseVolume.toFixed(4)} ETH total volume
• Test network - perfect for experimenting! 🧪

Choose your chain when creating predictions or voting!`;
  } catch (error) {
    console.error('Error generating chain summary:', error);
    return "Multi-chain prediction markets available on CELO Mainnet and Base Sepolia!";
  }
}

/**
 * Determine best chain for user based on context
 */
export function recommendChainForUser(context: {
  isNewUser?: boolean;
  hasTestEth?: boolean;
  hasCelo?: boolean;
  wantsRealMoney?: boolean;
}): SupportedChain {
  // For hackathon demo and new users, recommend Base Sepolia
  if (context.isNewUser || context.hasTestEth) {
    return 'base';
  }
  
  // For users wanting real impact, recommend CELO
  if (context.wantsRealMoney || context.hasCelo) {
    return 'celo';
  }
  
  // Default to Base for hackathon
  return 'base';
}
