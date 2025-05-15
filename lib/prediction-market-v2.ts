"use client";

import { ethers } from "ethers";
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';

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
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_V2_ADDRESS || '0x4d6b336F174f17daAf63D233E1E05cB105562304';

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

// Get Farcaster wallet provider for write operations
const getBrowserProvider = async () => {
  try {
    // Dynamically import the Farcaster SDK to avoid SSR issues
    const { sdk } = await import('@farcaster/frame-sdk');

    // Check if we have access to the Farcaster wallet
    if (sdk.wallet && sdk.wallet.ethProvider) {
      return new ethers.BrowserProvider(sdk.wallet.ethProvider);
    } else {
      console.log('Farcaster wallet not available, falling back to window.ethereum');
      // Fallback to window.ethereum for testing outside of Farcaster
      if (typeof window !== 'undefined' && window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
      }
    }
  } catch (error) {
    console.error('Error accessing Farcaster wallet:', error);
  }

  throw new Error('No wallet provider found. Please ensure you are using the Warpcast app.');
};

// Get prediction market contract
const getPredictionMarketContract = async (requireSigner = false) => {
  if (!requireSigner) {
    // For read-only operations, use the direct provider
    const provider = getProvider();
    return new ethers.Contract(PREDICTION_MARKET_ADDRESS, predictionMarketABI, provider);
  }

  try {
    // For write operations, use the Farcaster wallet provider with signer
    const provider = await getBrowserProvider();
    const signer = await provider.getSigner();
    return new ethers.Contract(PREDICTION_MARKET_ADDRESS, predictionMarketABI, signer);
  } catch (error) {
    console.error('Error getting signer:', error);
    throw new Error('Could not access your wallet. Please ensure you are using the Warpcast app.');
  }
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
    // Create a read-only provider for CELO mainnet
    const provider = new ethers.JsonRpcProvider("https://forno.celo.org");

    // Create a contract instance with the read-only provider
    const contract = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      predictionMarketABI,
      provider
    );

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

// Track if a user has already been referred
const userReferrals = new Map<string, boolean>();

// Check if user has been referred before
const hasBeenReferred = (address: string): boolean => {
  if (userReferrals.has(address)) {
    return userReferrals.get(address) || false;
  }

  // Check localStorage if available
  if (typeof window !== 'undefined') {
    const referred = localStorage.getItem(`divvi-referred-${address}`);
    const isReferred = referred === 'true';
    userReferrals.set(address, isReferred);
    return isReferred;
  }

  return false;
};

// Mark user as referred
const markUserAsReferred = (address: string): void => {
  userReferrals.set(address, true);

  // Store in localStorage if available
  if (typeof window !== 'undefined') {
    localStorage.setItem(`divvi-referred-${address}`, 'true');
  }
};

// Vote on a prediction with Divvi referral tracking
export const voteOnPrediction = async (
  predictionId: number,
  isYes: boolean,
  amount: number
): Promise<void> => {
  try {
    // Get the contract with signer
    const contract = await getPredictionMarketContract(true);
    const provider = await getBrowserProvider();
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Check if this is the user's first transaction (not already referred)
    const isFirstTransaction = !hasBeenReferred(userAddress);

    console.log(`Voting on prediction ${predictionId}, isYes: ${isYes}, amount: ${amount} CELO`);
    console.log(`User address: ${userAddress}, isFirstTransaction: ${isFirstTransaction}`);

    try {
      let tx;
      let receipt;

      if (isFirstTransaction) {
        // Get the Divvi referral data suffix
        const dataSuffix = getDataSuffix({
          consumer: '0x55A5705453Ee82c742274154136Fce8149597058',
          providers: [
            '0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8',
            '0x6226ddE08402642964f9A6de844ea3116F0dFc7e',
            '0x0423189886D7966f0DD7E7d256898DAeEE625dca'
          ],
        });

        // Prepare the transaction data with the referral suffix
        const data = contract.interface.encodeFunctionData('vote', [predictionId, isYes]) + dataSuffix;

        // Send the transaction with increased gas limit for Warpcast wallet
        tx = await signer.sendTransaction({
          to: PREDICTION_MARKET_ADDRESS,
          data: data,
          value: ethers.parseEther(amount.toString()),
          gasLimit: 500000 // Increase gas limit for Warpcast wallet
        });

        console.log('Transaction sent:', tx.hash);

        // Wait for transaction confirmation
        receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);

        if (receipt) {
          // Submit the referral to Divvi
          const chainId = (await provider.getNetwork()).chainId;
          await submitReferral({
            txHash: receipt.hash as `0x${string}`,
            chainId: Number(chainId),
          });

          // Mark user as referred
          markUserAsReferred(userAddress);
          console.log('User referred successfully:', userAddress);
        }
      } else {
        // Regular transaction for returning users with increased gas limit
        tx = await contract.vote(predictionId, isYes, {
          value: ethers.parseEther(amount.toString()),
          gasLimit: 500000 // Increase gas limit for Warpcast wallet
        });

        console.log('Transaction sent:', tx.hash);
        receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);
      }
    } catch (txError: any) {
      console.error('Transaction error:', txError);

      // Provide more user-friendly error messages
      if (txError.message.includes('user rejected')) {
        throw new Error('Transaction was rejected by the user.');
      } else if (txError.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds. Please make sure you have enough CELO to complete this transaction.');
      } else if (txError.message.includes('gas required exceeds')) {
        throw new Error('Transaction requires more gas than available. Try a smaller amount.');
      } else {
        throw new Error(`Transaction failed: ${txError.message || 'Unknown error'}`);
      }
    }
  } catch (error: any) {
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

    // Add gas limit for Warpcast wallet
    const tx = await contract.claimReward(predictionId, {
      gasLimit: 500000 // Increase gas limit for Warpcast wallet
    });

    console.log('Claim reward transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Claim reward transaction confirmed:', receipt);
  } catch (txError: any) {
    console.error('Error claiming reward:', txError);

    // Provide more user-friendly error messages
    if (txError.message.includes('user rejected')) {
      throw new Error('Transaction was rejected by the user.');
    } else if (txError.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds. Please make sure you have enough CELO to complete this transaction.');
    } else if (txError.message.includes('gas required exceeds')) {
      throw new Error('Transaction requires more gas than available.');
    } else {
      throw new Error(`Transaction failed: ${txError.message || 'Unknown error'}`);
    }
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