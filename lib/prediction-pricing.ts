/**
 * Prediction Pricing and Charging System
 * Handles costs for creating and participating in predictions
 */

import { CHAIN_CONFIG, type SupportedChain } from './dual-chain-service';

export interface PredictionCosts {
  creation: {
    amount: string;
    currency: string;
    gasEstimate: string;
    totalCost: string;
  };
  voting: {
    minStake: string;
    recommendedStakes: string[];
    currency: string;
    gasEstimate: string;
  };
  fees: {
    platformFee: number; // Percentage
    charityFee: number;  // Percentage
    maintenanceFee: number; // Percentage
  };
}

/**
 * Get pricing structure for a specific chain
 */
export function getPredictionCosts(chain: SupportedChain): PredictionCosts {
  const config = CHAIN_CONFIG[chain];
  
  if (chain === 'celo') {
    return {
      creation: {
        amount: "0.1", // Small creation fee to prevent spam
        currency: "CELO",
        gasEstimate: "0.001",
        totalCost: "0.101"
      },
      voting: {
        minStake: "0.1",
        recommendedStakes: ["0.5", "1.0", "2.5", "5.0"],
        currency: "CELO",
        gasEstimate: "0.001"
      },
      fees: {
        platformFee: 20,
        charityFee: 15,
        maintenanceFee: 5
      }
    };
  } else {
    // Base Sepolia - Lower costs for hackathon
    return {
      creation: {
        amount: "0.001", // Very small creation fee
        currency: "ETH",
        gasEstimate: "0.0001",
        totalCost: "0.0011"
      },
      voting: {
        minStake: "0.001",
        recommendedStakes: ["0.005", "0.01", "0.025", "0.05"],
        currency: "ETH",
        gasEstimate: "0.0001"
      },
      fees: {
        platformFee: 20,
        charityFee: 15,
        maintenanceFee: 5
      }
    };
  }
}

/**
 * Calculate total cost for creating a prediction
 */
export function calculateCreationCost(chain: SupportedChain): {
  breakdown: {
    creationFee: string;
    gasEstimate: string;
    total: string;
  };
  currency: string;
  usdEstimate?: string;
} {
  const costs = getPredictionCosts(chain);
  const config = CHAIN_CONFIG[chain];
  
  const creationFee = parseFloat(costs.creation.amount);
  const gasEstimate = parseFloat(costs.creation.gasEstimate);
  const total = creationFee + gasEstimate;
  
  return {
    breakdown: {
      creationFee: costs.creation.amount,
      gasEstimate: costs.creation.gasEstimate,
      total: total.toString()
    },
    currency: config.nativeCurrency.symbol,
    // TODO: Add USD estimation via price feeds
  };
}

/**
 * Validate user has sufficient balance for creation
 */
export async function validateCreationBalance(
  userAddress: string,
  chain: SupportedChain
): Promise<{
  hasBalance: boolean;
  currentBalance: string;
  requiredBalance: string;
  currency: string;
}> {
  const costs = calculateCreationCost(chain);
  const config = CHAIN_CONFIG[chain];
  
  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const balance = await provider.getBalance(userAddress);
    const balanceInEther = ethers.formatEther(balance);
    
    const hasBalance = parseFloat(balanceInEther) >= parseFloat(costs.breakdown.total);
    
    return {
      hasBalance,
      currentBalance: parseFloat(balanceInEther).toFixed(4),
      requiredBalance: costs.breakdown.total,
      currency: config.nativeCurrency.symbol
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    return {
      hasBalance: false,
      currentBalance: "0",
      requiredBalance: costs.breakdown.total,
      currency: config.nativeCurrency.symbol
    };
  }
}

/**
 * Get user-friendly pricing explanation
 */
export function getPricingExplanation(chain: SupportedChain): string {
  const costs = getPredictionCosts(chain);
  const config = CHAIN_CONFIG[chain];
  
  if (chain === 'celo') {
    return `💰 **CELO Mainnet Pricing**

🔮 **Create Prediction**: ${costs.creation.amount} CELO
   • Creation fee: ${costs.creation.amount} CELO
   • Gas estimate: ~${costs.creation.gasEstimate} CELO
   • Total: ~${costs.creation.totalCost} CELO

📊 **Vote on Predictions**: 
   • Minimum stake: ${costs.voting.minStake} CELO
   • Recommended: ${costs.voting.recommendedStakes.join(', ')} CELO
   • Gas: ~${costs.voting.gasEstimate} CELO per vote

💝 **Platform Fees**: ${costs.fees.platformFee}% of winnings
   • ${costs.fees.charityFee}% → Greenpill Kenya charity
   • ${costs.fees.maintenanceFee}% → Platform maintenance

Real money, real impact! 🌍`;
  } else {
    return `🧪 **Base Sepolia Pricing** (Testnet)

🔮 **Create Prediction**: ${costs.creation.amount} ETH
   • Creation fee: ${costs.creation.amount} ETH
   • Gas estimate: ~${costs.creation.gasEstimate} ETH
   • Total: ~${costs.creation.totalCost} ETH

📊 **Vote on Predictions**: 
   • Minimum stake: ${costs.voting.minStake} ETH
   • Recommended: ${costs.voting.recommendedStakes.join(', ')} ETH
   • Gas: ~${costs.voting.gasEstimate} ETH per vote

💝 **Platform Fees**: ${costs.fees.platformFee}% of winnings
   • ${costs.fees.charityFee}% → Future charity integration
   • ${costs.fees.maintenanceFee}% → Platform maintenance

Free testnet ETH - perfect for demos! 🚀`;
  }
}

/**
 * Charging options for users
 */
export const CHARGING_OPTIONS = {
  // Option 1: Current model (bot pays creation, user pays voting)
  BOT_CREATION: {
    name: "Bot-Sponsored Creation",
    description: "Bot pays creation costs, users only pay for voting",
    pros: ["Low barrier to entry", "Encourages experimentation"],
    cons: ["Requires funded bot wallet", "Potential for spam"]
  },
  
  // Option 2: User pays everything
  USER_CREATION: {
    name: "User-Paid Creation", 
    description: "Users pay small fee to create predictions",
    pros: ["Prevents spam", "Sustainable model", "Quality control"],
    cons: ["Higher barrier to entry", "May discourage casual users"]
  },
  
  // Option 3: Hybrid model
  HYBRID: {
    name: "Hybrid Model",
    description: "Free creation for verified users, small fee for others",
    pros: ["Balanced approach", "Rewards engagement", "Spam protection"],
    cons: ["More complex implementation", "Verification overhead"]
  }
} as const;

/**
 * Recommended charging strategy based on context
 */
export function getRecommendedChargingStrategy(context: {
  chain: SupportedChain;
  isHackathon: boolean;
  userType: 'new' | 'verified' | 'power';
}): keyof typeof CHARGING_OPTIONS {
  // For hackathon demos, keep barriers low
  if (context.isHackathon || context.chain === 'base') {
    return 'BOT_CREATION';
  }
  
  // For production CELO, implement quality controls
  if (context.chain === 'celo') {
    if (context.userType === 'new') {
      return 'USER_CREATION'; // Small fee prevents spam
    } else {
      return 'HYBRID'; // Reward verified users
    }
  }
  
  return 'BOT_CREATION';
}
