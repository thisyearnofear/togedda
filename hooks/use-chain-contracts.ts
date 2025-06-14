/**
 * Hook for chain-aware contract operations
 * Uses reliable ethers providers directly from dual-chain service
 */

import { useCallback } from 'react';
import {
  getChainUserVote,
  getChainFeeInfo,
  getAllChainPredictions,
  type SupportedChain
} from '@/lib/dual-chain-service';

/**
 * Hook for chain-aware contract operations
 * Simplified to use direct ethers providers for reliability
 */
export function useChainContracts() {
  const getUserVote = useCallback(async (
    predictionId: number,
    userAddress: string,
    chain: SupportedChain
  ) => {
    return getChainUserVote(predictionId, userAddress, chain);
  }, []);

  const getFeeInfo = useCallback(async (chain: SupportedChain) => {
    return getChainFeeInfo(chain);
  }, []);

  const getAllPredictions = useCallback(async () => {
    return getAllChainPredictions();
  }, []);

  return {
    getUserVote,
    getFeeInfo,
    getAllPredictions
  };
}

/**
 * Hook for getting user votes across all chains
 */
export function useUserVotesForPrediction(predictionId: number, userAddress?: string) {
  const { getUserVote } = useChainContracts();

  const getUserVoteForChain = useCallback(async (chain: SupportedChain) => {
    if (!userAddress) return null;
    return getUserVote(predictionId, userAddress, chain);
  }, [getUserVote, predictionId, userAddress]);

  return {
    getUserVoteForChain
  };
}

/**
 * Hook for getting fee info across all chains
 */
export function useFeeInfoForChain(chain: SupportedChain) {
  const { getFeeInfo } = useChainContracts();

  const getFeeInfoForChain = useCallback(async () => {
    return getFeeInfo(chain);
  }, [getFeeInfo, chain]);

  return {
    getFeeInfoForChain
  };
}
