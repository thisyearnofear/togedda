"use client";

import { ethers } from "ethers";

// Complete ABI for the prediction market contract
const predictionMarketABI = [

  // View Functions
  "function getPrediction(uint256 _predictionId) external view returns (tuple(uint256 id, address creator, string title, string description, uint256 targetDate, uint256 targetValue, uint256 currentValue, uint8 category, string network, string emoji, uint256 totalStaked, uint256 yesVotes, uint256 noVotes, uint8 status, uint8 outcome, uint256 createdAt, bool autoResolvable))",
  "function getUserVote(uint256 _predictionId, address _user) external view returns (tuple(bool isYes, uint256 amount, bool claimed))",
  "function getTotalPredictions() external view returns (uint256)",
  "function getParticipants(uint256 _predictionId) external view returns (address[])",
  "function getTotalFeePercentage() external view returns (uint256)",
  "function charityFeePercentage() external view returns (uint256)",
  "function maintenanceFeePercentage() external view returns (uint256)",
  "function charityAddress() external view returns (address)",
  "function maintenanceAddress() external view returns (address)",

  // State-Changing Functions
  "function createPrediction(string memory _title, string memory _description, uint256 _targetDate, uint256 _targetValue, uint8 _category, string memory _network, string memory _emoji, bool _autoResolvable) external returns (uint256)",
  "function vote(uint256 _predictionId, bool _isYes) external payable",
  "function claimReward(uint256 _predictionId) external",
  "function claimRefund(uint256 _predictionId) external",
  "function autoResolvePrediction(uint256 _predictionId) external",

  // Owner Functions
  "function resolvePrediction(uint256 _predictionId, uint8 _outcome) external",
  "function cancelPrediction(uint256 _predictionId) external",
  "function updatePredictionValue(uint256 _predictionId, uint256 _currentValue) external",
  "function updateFeePercentages(uint256 _newCharityFeePercentage, uint256 _newMaintenanceFeePercentage) external",
  "function updateCharityAddress(address _newCharityAddress) external",
  "function updateMaintenanceAddress(address _newMaintenanceAddress) external",
  "function transferOwnership(address _newOwner) external"
];

// Deployed prediction market contract address on CELO
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_V2_ADDRESS || '0x28461Aeb1af60D059D9aD07051df4fB70C5C1921';

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

// Get provider and signer
const getProvider = () => {
  // Always use a direct provider for read operations
  return new ethers.JsonRpcProvider('https://forno.celo.org');
};

// Get browser provider for write operations
const getBrowserProvider = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum provider found. Please install MetaMask or another wallet.');
  }
  return new ethers.BrowserProvider(window.ethereum);
};

// Get prediction market contract
const getPredictionMarketContract = async (requireSigner = false) => {
  if (!requireSigner) {
    // For read-only operations, use the direct provider
    const provider = getProvider();
    return new ethers.Contract(PREDICTION_MARKET_ADDRESS, predictionMarketABI, provider);
  }

  // For write operations, use the browser provider with signer
  const provider = await getBrowserProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(PREDICTION_MARKET_ADDRESS, predictionMarketABI, signer);
};

// Get fee information
export const getFeeInfo = async (): Promise<FeeInfo> => {
  try {
    const contract = await getPredictionMarketContract();

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
      maintenanceAddress: PREDICTION_MARKET_ADDRESS
    };
  }
};

// Get all predictions
export const getAllPredictions = async (): Promise<Prediction[]> => {
  try {
    console.log("Getting prediction market contract...");
    console.log("Using address:", PREDICTION_MARKET_ADDRESS);

    // Create a read-only provider for CELO mainnet
    const provider = new ethers.JsonRpcProvider("https://forno.celo.org");

    // Create a contract instance with the read-only provider
    const contract = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      predictionMarketABI,
      provider
    );

    console.log("Trying to fetch predictions directly...");

    const predictions: Prediction[] = [];
    // We know we have 4 predictions (IDs 1-4)
    const knownIds = [1, 2, 3, 4];

    for (const id of knownIds) {
      try {
        console.log(`Fetching prediction ${id}...`);
        const prediction = await contract.getPrediction(id);
        console.log(`Prediction ${id} data:`, {
          id: prediction.id.toString(),
          title: prediction.title,
          network: prediction.network,
          status: prediction.status
        });

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
        console.log(`Added prediction ${id} to list`);
      } catch (error) {
        console.error(`Error fetching prediction ${id}:`, error);
      }
    }

    console.log("Final predictions list:", predictions);
    return predictions;
  } catch (error) {
    console.error('Error getting all predictions:', error);
    return [];
  }
};

// Get prediction by ID
export const getPrediction = async (id: number): Promise<Prediction | null> => {
  try {
    const contract = await getPredictionMarketContract();
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

// Get user vote
export const getUserVote = async (predictionId: number, userAddress: string): Promise<Vote | null> => {
  try {
    const contract = await getPredictionMarketContract();
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

// Create a new prediction
export const createPrediction = async (
  title: string,
  description: string,
  targetDate: number,
  targetValue: number,
  category: PredictionCategory,
  network: string,
  emoji: string,
  autoResolvable: boolean = true
): Promise<number> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.createPrediction(
      title,
      description,
      targetDate,
      targetValue,
      category,
      network,
      emoji,
      autoResolvable
    );

    const receipt = await tx.wait();

    // Extract prediction ID from event
    const event = receipt.logs.find(
      (log: any) => log.fragment && log.fragment.name === 'PredictionCreated'
    );

    if (event && event.args) {
      return Number(event.args[0]);
    }

    throw new Error('Failed to get prediction ID from event');
  } catch (error) {
    console.error('Error creating prediction:', error);
    throw error;
  }
};

// Vote on a prediction
export const voteOnPrediction = async (
  predictionId: number,
  isYes: boolean,
  amount: number
): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.vote(predictionId, isYes, {
      value: ethers.parseEther(amount.toString())
    });
    await tx.wait();
  } catch (error) {
    console.error('Error voting on prediction:', error);
    throw error;
  }
};

// Update prediction value
export const updatePredictionValue = async (
  predictionId: number,
  currentValue: number
): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.updatePredictionValue(predictionId, currentValue);
    await tx.wait();
  } catch (error) {
    console.error('Error updating prediction value:', error);
    throw error;
  }
};

// Claim reward
export const claimReward = async (predictionId: number): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.claimReward(predictionId);
    await tx.wait();
  } catch (error) {
    console.error('Error claiming reward:', error);
    throw error;
  }
};

// Resolve prediction (admin function)
export const resolvePrediction = async (predictionId: number, outcome: number): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.resolvePrediction(predictionId, outcome);
    await tx.wait();
  } catch (error) {
    console.error('Error resolving prediction:', error);
    throw error;
  }
};

// Auto-resolve prediction
export const autoResolvePrediction = async (predictionId: number): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.autoResolvePrediction(predictionId);
    await tx.wait();
  } catch (error) {
    console.error('Error auto-resolving prediction:', error);
    throw error;
  }
};

// Calculate odds
export const calculateOdds = (yesVotes: number, noVotes: number): { yes: number, no: number } => {
  const total = yesVotes + noVotes;
  if (total === 0) return { yes: 50, no: 50 };

  const yesPercentage = Math.round((yesVotes / total) * 100);
  return {
    yes: yesPercentage,
    no: 100 - yesPercentage
  };
};

// Get category name
export const getCategoryName = (category: PredictionCategory): string => {
  switch (category) {
    case PredictionCategory.FITNESS:
      return 'Fitness';
    case PredictionCategory.CHAIN:
      return 'Chain';
    case PredictionCategory.COMMUNITY:
      return 'Community';
    case PredictionCategory.CUSTOM:
      return 'Custom';
    default:
      return 'Unknown';
  }
};