/**
 * Network Utilities
 * Centralized utilities for network operations to maintain DRY principles
 */

import { getChainName, getChainSwitchInfo, getExplorerUrl } from "@/lib/config/chains";
import { CHAIN_CONFIG } from "@/lib/services/dual-chain-service";

/**
 * Check if a chain ID is supported by our prediction markets
 */
export function isPredictionChainSupported(chainId: number): boolean {
  return chainId === 42220 || chainId === 84532; // CELO Mainnet or Base Sepolia
}

/**
 * Get prediction market contract address for a chain
 */
export function getPredictionContractAddress(chainId: number): string | null {
  if (chainId === 42220) {
    return CHAIN_CONFIG.celo.contractAddress;
  }
  if (chainId === 84532) {
    return CHAIN_CONFIG.base.contractAddress;
  }
  return null;
}

/**
 * Get network mismatch error message
 */
export function getNetworkMismatchMessage(currentChainId: number, targetChainId: number): string {
  const currentName = getChainName(currentChainId);
  const targetName = getChainName(targetChainId);
  return `Network mismatch: Connected to ${currentName}, but ${targetName} is required for this transaction.`;
}

/**
 * Get transaction explorer URL
 */
export function getTransactionUrl(chainId: number, txHash: string): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : "";
}

/**
 * Get address explorer URL
 */
export function getAddressUrl(chainId: number, address: string): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/address/${address}` : "";
}

/**
 * Format chain display info for UI components
 */
export function formatChainDisplayInfo(chainId: number) {
  const name = getChainName(chainId);
  const info = getChainSwitchInfo(chainId);
  
  return {
    name,
    shortName: name.split(" ")[0], // e.g., "Base" from "Base Sepolia"
    emoji: info.emoji,
    color: info.color,
    isTestnet: info.isTestnet,
    isProduction: info.isProduction,
    description: info.description,
    explorerUrl: info.explorerUrl,
    faucetUrl: info.faucetUrl,
  };
}

/**
 * Get user-friendly network status message
 */
export function getNetworkStatusMessage(chainId: number | undefined): string {
  if (!chainId) {
    return "No network connected";
  }
  
  const info = formatChainDisplayInfo(chainId);
  
  if (info.isTestnet) {
    return `Connected to ${info.name} (Testnet)`;
  }
  
  if (info.isProduction) {
    return `Connected to ${info.name} (Mainnet)`;
  }
  
  return `Connected to ${info.name}`;
}

/**
 * Check if user needs to switch networks for prediction operations
 */
export function needsNetworkSwitch(currentChainId: number | undefined, targetChainId: number): boolean {
  return currentChainId !== targetChainId;
}

/**
 * Get recommended chain for new users (Base Sepolia for hackathon)
 */
export function getRecommendedChainForNewUsers(): number {
  return 84532; // Base Sepolia
}

/**
 * Get production chain for real money operations
 */
export function getProductionChain(): number {
  return 42220; // CELO Mainnet
}

/**
 * Validate if a chain supports our app features
 */
export function validateChainSupport(chainId: number): {
  isSupported: boolean;
  supportsPredictions: boolean;
  message: string;
} {
  const supportsPredictions = isPredictionChainSupported(chainId);
  const chainInfo = formatChainDisplayInfo(chainId);
  
  if (supportsPredictions) {
    return {
      isSupported: true,
      supportsPredictions: true,
      message: `${chainInfo.name} is fully supported`,
    };
  }
  
  return {
    isSupported: false,
    supportsPredictions: false,
    message: `${chainInfo.name} is not supported for predictions. Please switch to CELO Mainnet or Base Sepolia.`,
  };
}

const networkUtils = {
  isPredictionChainSupported,
  getPredictionContractAddress,
  getNetworkMismatchMessage,
  getTransactionUrl,
  getAddressUrl,
  formatChainDisplayInfo,
  getNetworkStatusMessage,
  needsNetworkSwitch,
  getRecommendedChainForNewUsers,
  getProductionChain,
  validateChainSupport,
};

export default networkUtils;
