"use client";

import { ethers } from "ethers";
import { predictionMarketABI } from "./constants";

// ⚠️ DEPRECATED: This file is CELO-only and should not be used for new features
// Use dual-chain-service.ts for chain-aware functionality instead
//
// Deployed prediction market contract address on CELO MAINNET ONLY
export const CELO_PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_V2_ADDRESS || '0x4d6b336F174f17daAf63D233E1E05cB105562304';

// Charity address
const CHARITY_ADDRESS = "0x0e5DaC01687592597d3e4307cdB7B3B616F2822E";

// Enum values for categories
export enum PredictionCategory {
  FITNESS = 0,
  CHAIN = 1,
  COMMUNITY = 2,
  CUSTOM = 3
}

// Enum values for outcomes
export enum PredictionOutcome {
  UNRESOLVED = 0,
  YES = 1,
  NO = 2
}

// Enum values for status
export enum PredictionStatus {
  ACTIVE = 0,
  RESOLVED = 1,
  CANCELLED = 2
}

// Type definitions
export interface Prediction {
  id: number;
  creator: string;
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  currentValue: number;
  category: PredictionCategory;
  network: string;
  emoji: string;
  totalStaked: number;
  yesVotes: number;
  noVotes: number;
  status: PredictionStatus;
  outcome: PredictionOutcome;
  createdAt: number;
  autoResolvable?: boolean;
}

export interface Vote {
  isYes: boolean;
  amount: number;
  claimed: boolean;
}

export interface FeeInfo {
  charityFeePercentage: number;
  maintenanceFeePercentage: number;
  totalFeePercentage: number;
  charityAddress: string;
  maintenanceAddress: string;
}

// Get provider for read operations (CELO MAINNET ONLY)
const getCeloProvider = () => {
  // Always use CELO mainnet provider for read operations - using Alchemy for better CORS support
  return new ethers.JsonRpcProvider('https://celo-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B');
};

// Get CELO prediction market contract for read operations
const getCeloPredictionMarketContract = (requireSigner = false) => {
  // For read-only operations, use the CELO provider
  const provider = getCeloProvider();
  return new ethers.Contract(CELO_PREDICTION_MARKET_ADDRESS, predictionMarketABI, provider);
};

// Calculate odds for a prediction
export const calculateOdds = (yesVotes: number, noVotes: number) => {
  const total = yesVotes + noVotes;
  if (total === 0) {
    return { yes: 50, no: 50 };
  }
  
  const yesPercentage = Math.round((yesVotes / total) * 100);
  return {
    yes: yesPercentage,
    no: 100 - yesPercentage
  };
};

// Get fee information (CELO MAINNET ONLY)
export const getCeloFeeInfo = async (): Promise<FeeInfo> => {
  try {
    const contract = getCeloPredictionMarketContract();

    const [
      charityFeePercentage,
      maintenanceFeePercentage,
      totalFeePercentage,
      charityAddress,
      maintenanceAddress
    ] = await Promise.all([
      contract.charityFeePercentage(),
      contract.maintenanceFeePercentage(),
      contract.getTotalFeePercentage(),
      contract.charityAddress(),
      contract.maintenanceAddress()
    ]);

    return {
      charityFeePercentage: Number(charityFeePercentage),
      maintenanceFeePercentage: Number(maintenanceFeePercentage),
      totalFeePercentage: Number(totalFeePercentage),
      charityAddress,
      maintenanceAddress
    };
  } catch (error) {
    console.error('Error getting fee info:', error);
    // Return default values if contract call fails
    return {
      charityFeePercentage: 15,
      maintenanceFeePercentage: 5,
      totalFeePercentage: 20,
      charityAddress: CHARITY_ADDRESS,
      maintenanceAddress: CELO_PREDICTION_MARKET_ADDRESS
    };
  }
};

// Get all predictions (CELO MAINNET ONLY)
export const getAllCeloPredictions = async (): Promise<Prediction[]> => {
  try {
    const contract = getCeloPredictionMarketContract();
    const predictions: Prediction[] = [];
    
    // We know we have 4 predictions (IDs 1-4)
    const knownIds = [1, 2, 3, 4];

    for (const id of knownIds) {
      try {
        const prediction = await contract.getPrediction(id);

        predictions.push({
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
          autoResolvable: prediction.autoResolvable
        });
      } catch (error) {
        console.error(`Error fetching prediction ${id}:`, error);
      }
    }

    return predictions;
  } catch (error) {
    console.error('Error getting all predictions:', error);
    return [];
  }
};

// Get prediction by ID (CELO MAINNET ONLY)
export const getCeloPrediction = async (id: number): Promise<Prediction | null> => {
  try {
    const contract = getCeloPredictionMarketContract();
    const prediction = await contract.getPrediction(id);

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
      autoResolvable: prediction.autoResolvable
    };
  } catch (error) {
    console.error(`Error getting prediction ${id}:`, error);
    return null;
  }
};

// Get user vote (CELO MAINNET ONLY) - DEPRECATED: Use getChainUserVote from dual-chain-service.ts
export const getCeloUserVote = async (predictionId: number, userAddress: string): Promise<Vote | null> => {
  try {
    const contract = getCeloPredictionMarketContract();
    const vote = await contract.getUserVote(predictionId, userAddress);

    return {
      isYes: vote.isYes,
      amount: Number(ethers.formatEther(vote.amount)),
      claimed: vote.claimed
    };
  } catch (error) {
    console.error(`Error getting user vote for prediction ${predictionId}:`, error);
    return null;
  }
};

// ⚠️ DEPRECATED EXPORTS - Use dual-chain-service.ts instead
// These are kept for backward compatibility but will be removed in future versions

export const PREDICTION_MARKET_ADDRESS = CELO_PREDICTION_MARKET_ADDRESS;

export const getFeeInfo = (...args: Parameters<typeof getCeloFeeInfo>) => {
  console.warn('⚠️ getFeeInfo is deprecated. Use dual-chain-service.ts for chain-aware functionality');
  return getCeloFeeInfo(...args);
};

export const getAllPredictions = (...args: Parameters<typeof getAllCeloPredictions>) => {
  console.warn('⚠️ getAllPredictions is deprecated. Use dual-chain-service.ts for chain-aware functionality');
  return getAllCeloPredictions(...args);
};

export const getPrediction = (...args: Parameters<typeof getCeloPrediction>) => {
  console.warn('⚠️ getPrediction is deprecated. Use dual-chain-service.ts for chain-aware functionality');
  return getCeloPrediction(...args);
};

export const getUserVote = (...args: Parameters<typeof getCeloUserVote>) => {
  console.warn('⚠️ getUserVote is deprecated. Use getChainUserVote from dual-chain-service.ts instead');
  return getCeloUserVote(...args);
};
