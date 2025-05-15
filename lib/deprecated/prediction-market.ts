import { ethers } from 'ethers';
// Note: This file is updated to work with ethers v6

// Import ABI - this would be generated from the compiled contract
// For now, we'll define a simplified version
const PredictionMarketABI = [
  // Events
  "event PredictionCreated(uint256 indexed id, address indexed creator, string title, uint256 targetDate, uint8 category, string network)",
  "event VoteCast(uint256 indexed predictionId, address indexed voter, bool isYes, uint256 amount)",
  "event PredictionResolved(uint256 indexed predictionId, uint8 outcome)",
  "event PredictionUpdated(uint256 indexed predictionId, uint256 currentValue)",
  "event RewardClaimed(uint256 indexed predictionId, address indexed user, uint256 amount)",

  // Functions
  "function createPrediction(string memory _title, string memory _description, uint256 _targetDate, uint256 _targetValue, uint8 _category, string memory _network, string memory _emoji) external returns (uint256)",
  "function vote(uint256 _predictionId, bool _isYes) external payable",
  "function getPrediction(uint256 _predictionId) external view returns (tuple(uint256 id, address creator, string title, string description, uint256 targetDate, uint256 targetValue, uint256 currentValue, uint8 category, string network, string emoji, uint256 totalStaked, uint256 yesVotes, uint256 noVotes, uint8 status, uint8 outcome, uint256 createdAt))",
  "function getUserVote(uint256 _predictionId, address _user) external view returns (tuple(bool isYes, uint256 amount, bool claimed))",
  "function getParticipants(uint256 _predictionId) external view returns (address[])",
  "function getTotalPredictions() external view returns (uint256)",
  "function claimReward(uint256 _predictionId) external"
];

// Deployed prediction market contract address on CELO
// Factory address: 0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x28461Aeb1af60D059D9aD07051df4fB70C5C1921';

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
}

export interface Vote {
  isYes: boolean;
  amount: number;
  claimed: boolean;
}

// Connect to CELO network
export const getProvider = async () => {
  // Check if we're in a browser environment with an Ethereum provider
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      return new ethers.BrowserProvider(window.ethereum);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  }

  // Fallback to read-only provider for Farcaster mini app environment
  // This allows users to view predictions without connecting a wallet
  console.log('Using fallback read-only provider for CELO');
  return new ethers.JsonRpcProvider('https://forno.celo.org');
};

// Get prediction market contract
export const getPredictionMarketContract = async (writeAccess = true) => {
  const provider = await getProvider();

  // For read-only operations
  if (!writeAccess) {
    return new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PredictionMarketABI,
      provider
    );
  }

  // For write operations when we have a BrowserProvider
  try {
    if ('getSigner' in provider) {
      const signer = await provider.getSigner();
      return new ethers.Contract(
        PREDICTION_MARKET_ADDRESS,
        PredictionMarketABI,
        signer
      );
    }
  } catch (error) {
    console.error('Error getting signer:', error);
  }

  // Fallback to read-only if getting signer fails
  return new ethers.Contract(
    PREDICTION_MARKET_ADDRESS,
    PredictionMarketABI,
    provider
  );
};

// Create a prediction
export const createPrediction = async (
  title: string,
  description: string,
  targetDate: Date,
  targetValue: number,
  category: PredictionCategory,
  network: string,
  emoji: string
): Promise<number> => {
  try {
    const contract = await getPredictionMarketContract();
    const tx = await contract.createPrediction(
      title,
      description,
      Math.floor(targetDate.getTime() / 1000),
      targetValue,
      category,
      network,
      emoji
    );
    const receipt = await tx.wait();

    // Get prediction ID from event
    const event = receipt.events?.find((e: any) => e.event === 'PredictionCreated');
    if (event && event.args) {
      return event.args.id.toNumber();
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
    const contract = await getPredictionMarketContract();
    const tx = await contract.vote(predictionId, isYes, {
      value: ethers.parseEther(amount.toString())
    });
    await tx.wait();
  } catch (error) {
    console.error('Error voting on prediction:', error);
    throw error;
  }
};

// Get prediction details
export const getPrediction = async (predictionId: number): Promise<Prediction> => {
  try {
    // Use read-only access for fetching prediction details
    const contract = await getPredictionMarketContract(false);
    const prediction = await contract.getPrediction(predictionId);

    // Convert BigNumber values to numbers
    return {
      id: prediction.id.toNumber(),
      creator: prediction.creator,
      title: prediction.title,
      description: prediction.description,
      targetDate: prediction.targetDate.toNumber(),
      targetValue: prediction.targetValue.toNumber(),
      currentValue: prediction.currentValue.toNumber(),
      category: prediction.category,
      network: prediction.network,
      emoji: prediction.emoji,
      totalStaked: parseFloat(ethers.formatEther(prediction.totalStaked)),
      yesVotes: parseFloat(ethers.formatEther(prediction.yesVotes)),
      noVotes: parseFloat(ethers.formatEther(prediction.noVotes)),
      status: prediction.status,
      outcome: prediction.outcome,
      createdAt: prediction.createdAt.toNumber()
    };
  } catch (error) {
    console.error(`Error getting prediction ${predictionId}:`, error);
    // Re-throw the error so it can be handled by the caller
    throw error;
  }
};

// Get user vote
export const getUserVote = async (
  predictionId: number,
  userAddress: string
): Promise<Vote> => {
  try {
    const contract = await getPredictionMarketContract();
    const vote = await contract.getUserVote(predictionId, userAddress);

    return {
      isYes: vote.isYes,
      amount: parseFloat(ethers.formatEther(vote.amount)),
      claimed: vote.claimed
    };
  } catch (error) {
    console.error('Error getting user vote:', error);
    throw error;
  }
};

// Get all predictions
export const getAllPredictions = async (): Promise<Prediction[]> => {
  try {
    // Use read-only access for fetching predictions
    const contract = await getPredictionMarketContract(false);
    const totalPredictions = await contract.getTotalPredictions();

    const predictions: Prediction[] = [];
    const totalCount = totalPredictions.toNumber();

    // Limit the number of predictions to fetch to avoid performance issues
    const maxPredictionsToFetch = Math.min(totalCount, 20);

    // Fetch predictions in parallel for better performance
    const fetchPromises = [];
    for (let i = totalCount; i > totalCount - maxPredictionsToFetch && i > 0; i--) {
      fetchPromises.push(getPrediction(i).catch(err => {
        console.error(`Error fetching prediction ${i}:`, err);
        return null;
      }));
    }

    const results = await Promise.all(fetchPromises);

    // Filter out any null results from failed fetches
    return results.filter(p => p !== null) as Prediction[];
  } catch (error) {
    console.error('Error getting all predictions:', error);
    // Return empty array instead of throwing in Farcaster mini app environment
    // This allows the UI to gracefully handle the error
    return [];
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

// Update prediction value (admin function)
export const updatePredictionValue = async (predictionId: number, currentValue: number): Promise<void> => {
  try {
    const contract = await getPredictionMarketContract(true);
    const tx = await contract.updatePredictionValue(predictionId, currentValue);
    await tx.wait();
  } catch (error) {
    console.error('Error updating prediction value:', error);
    throw error;
  }
};

// Format date for display
export const formatPredictionDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString();
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

// Get status name
export const getStatusName = (status: PredictionStatus): string => {
  switch (status) {
    case PredictionStatus.ACTIVE:
      return 'Active';
    case PredictionStatus.RESOLVED:
      return 'Resolved';
    case PredictionStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

// Get outcome name
export const getOutcomeName = (outcome: PredictionOutcome): string => {
  switch (outcome) {
    case PredictionOutcome.UNRESOLVED:
      return 'Unresolved';
    case PredictionOutcome.YES:
      return 'Yes';
    case PredictionOutcome.NO:
      return 'No';
    default:
      return 'Unknown';
  }
};
