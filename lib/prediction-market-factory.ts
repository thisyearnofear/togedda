import { ethers } from 'ethers';

// Factory contract ABI
const PredictionMarketFactoryABI = [
  // Events
  "event PredictionMarketCreated(address indexed marketAddress, address indexed creator)",
  
  // Functions
  "function createPredictionMarket() external returns (address)",
  "function getAllPredictionMarkets() external view returns (address[])",
  "function getMarketCount() external view returns (uint256)",
  "function isMarketFromFactory(address) external view returns (bool)",
  "function transferOwnership(address _newOwner) external"
];

// Factory contract address
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS || '0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9';

// Get provider function (reusing from prediction-market.ts)
import { getProvider } from './prediction-market';

// Get factory contract
export const getFactoryContract = async (writeAccess = true) => {
  const provider = await getProvider();
  
  // For read-only operations or if we're using a JsonRpcProvider
  if (!writeAccess || !('getSigner' in provider)) {
    return new ethers.Contract(
      FACTORY_ADDRESS,
      PredictionMarketFactoryABI,
      provider
    );
  }
  
  // For write operations when we have a Web3Provider
  try {
    const signer = (provider as ethers.providers.Web3Provider).getSigner();
    return new ethers.Contract(
      FACTORY_ADDRESS,
      PredictionMarketFactoryABI,
      signer
    );
  } catch (error) {
    console.error('Error getting signer:', error);
    // Fallback to read-only if getting signer fails
    return new ethers.Contract(
      FACTORY_ADDRESS,
      PredictionMarketFactoryABI,
      provider
    );
  }
};

// Create a new prediction market
export const createNewPredictionMarket = async (): Promise<string> => {
  try {
    const contract = await getFactoryContract(true);
    const tx = await contract.createPredictionMarket();
    const receipt = await tx.wait();
    
    // Get the new prediction market address from the event
    const event = receipt.events?.find(e => e.event === 'PredictionMarketCreated');
    if (event && event.args) {
      return event.args.marketAddress;
    }
    throw new Error('Failed to get prediction market address from event');
  } catch (error) {
    console.error('Error creating prediction market:', error);
    throw error;
  }
};

// Get all prediction markets created by the factory
export const getAllPredictionMarkets = async (): Promise<string[]> => {
  try {
    const contract = await getFactoryContract(false);
    return await contract.getAllPredictionMarkets();
  } catch (error) {
    console.error('Error getting all prediction markets:', error);
    return [];
  }
};

// Get the number of prediction markets created by the factory
export const getMarketCount = async (): Promise<number> => {
  try {
    const contract = await getFactoryContract(false);
    const count = await contract.getMarketCount();
    return count.toNumber();
  } catch (error) {
    console.error('Error getting market count:', error);
    return 0;
  }
};

// Check if a market was created by the factory
export const isMarketFromFactory = async (marketAddress: string): Promise<boolean> => {
  try {
    const contract = await getFactoryContract(false);
    return await contract.isMarketFromFactory(marketAddress);
  } catch (error) {
    console.error('Error checking if market is from factory:', error);
    return false;
  }
};

// Transfer ownership of the factory
export const transferFactoryOwnership = async (newOwner: string): Promise<void> => {
  try {
    const contract = await getFactoryContract(true);
    const tx = await contract.transferOwnership(newOwner);
    await tx.wait();
  } catch (error) {
    console.error('Error transferring factory ownership:', error);
    throw error;
  }
};
