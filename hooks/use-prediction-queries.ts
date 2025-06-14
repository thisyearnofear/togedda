/**
 * React Query hooks for Prediction Market data with caching and real-time updates
 * Provides efficient data fetching, caching, and synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { type ChainPrediction } from '@/lib/dual-chain-service';
import { type Prediction } from '@/lib/prediction-market-v2';
import { sendMessageToBot, getBotStatus } from '@/components/PredictionMarket/XMTPIntegration';
import { useChainContracts } from './use-chain-contracts';

// Query keys for consistent caching
export const QUERY_KEYS = {
  PREDICTIONS: ['predictions'] as const,
  CHAIN_PREDICTIONS: ['chain-predictions'] as const,
  BOT_STATUS: ['bot-status'] as const,
  USER_VOTES: (address: string) => ['user-votes', address] as const,
  CONVERSATION_HISTORY: (conversationId: string) => ['conversation-history', conversationId] as const,
  PREDICTION_STATS: (predictionId: number) => ['prediction-stats', predictionId] as const,
} as const;

// Cache configuration
const CACHE_CONFIG = {
  PREDICTIONS: {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  },
  BOT_STATUS: {
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // 30 seconds
  },
  USER_DATA: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Manual refresh only
  },
} as const;

/**
 * Hook for fetching all predictions with caching
 * DEPRECATED: Use useChainPredictions instead
 */
export function usePredictions() {
  const { getAllPredictions } = useChainContracts();

  return useQuery({
    queryKey: QUERY_KEYS.PREDICTIONS,
    queryFn: getAllPredictions,
    ...CACHE_CONFIG.PREDICTIONS,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching dual-chain predictions with enhanced caching
 * Uses wagmi providers for consistency
 */
export function useChainPredictions() {
  const { getAllPredictions } = useChainContracts();

  return useQuery({
    queryKey: QUERY_KEYS.CHAIN_PREDICTIONS,
    queryFn: async (): Promise<ChainPrediction[]> => {
      try {
        console.log('🔄 Fetching chain predictions...');
        const predictions = await getAllPredictions();
        console.log(`✅ Fetched ${predictions.length} chain predictions`);
        return predictions;
      } catch (error) {
        console.error('❌ Error fetching chain predictions:', error);
        return [];
      }
    },
    ...CACHE_CONFIG.PREDICTIONS,
    retry: 2,
    retryDelay: 2000,
  });
}

/**
 * Hook for bot status with real-time updates
 */
export function useBotStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.BOT_STATUS,
    queryFn: getBotStatus,
    ...CACHE_CONFIG.BOT_STATUS,
    retry: 1,
    retryDelay: 5000,
  });
}

/**
 * Hook for user votes with address-specific caching
 */
export function useUserVotes() {
  const { address } = useAccount();
  
  return useQuery({
    queryKey: address ? QUERY_KEYS.USER_VOTES(address) : ['user-votes', 'no-address'],
    queryFn: async () => {
      if (!address) return [];
      
      // Fetch user's votes across all predictions
      // This would typically come from a dedicated API endpoint
      const response = await fetch(`/api/user-votes?address=${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user votes');
      }
      return response.json();
    },
    enabled: !!address,
    ...CACHE_CONFIG.USER_DATA,
  });
}

/**
 * Hook for conversation history with message-level caching
 */
export function useConversationHistory(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId ? QUERY_KEYS.CONVERSATION_HISTORY(conversationId) : ['conversation-history', 'none'],
    queryFn: async () => {
      if (!conversationId) return [];

      const response = await fetch(`/api/xmtp/conversation-history?conversationId=${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation history');
      }
      const data = await response.json();

      // Extract messages from the API response
      if (data.success && data.messages) {
        return data.messages;
      }

      return [];
    },
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: false, // Real-time updates via WebSocket
  });
}

/**
 * Hook for prediction statistics with smart caching
 */
export function usePredictionStats(predictionId: number | null) {
  return useQuery({
    queryKey: predictionId ? QUERY_KEYS.PREDICTION_STATS(predictionId) : ['prediction-stats', 'none'],
    queryFn: async () => {
      if (!predictionId) return null;
      
      const response = await fetch(`/api/predictions/${predictionId}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch prediction stats');
      }
      return response.json();
    },
    enabled: !!predictionId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

/**
 * Mutation hook for sending messages with optimistic updates
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      message,
      userAddress,
      conversationId,
      context
    }: {
      message: string;
      userAddress: string;
      conversationId: string;
      context?: any;
    }) => {
      return await sendMessageToBot(message, userAddress, conversationId);
    },
    onMutate: async ({ message, userAddress, conversationId, context }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: QUERY_KEYS.CONVERSATION_HISTORY(conversationId) 
      });

      // Snapshot previous value
      const previousHistory = queryClient.getQueryData(
        QUERY_KEYS.CONVERSATION_HISTORY(conversationId)
      );

      // Optimistically update conversation history
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        sender: 'You',
        content: message,
        timestamp: Date.now(),
        senderAddress: userAddress,
        messageType: 'user',
      };

      queryClient.setQueryData(
        QUERY_KEYS.CONVERSATION_HISTORY(conversationId),
        (old: any[]) => [...(old || []), optimisticMessage]
      );

      return { previousHistory };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousHistory) {
        queryClient.setQueryData(
          QUERY_KEYS.CONVERSATION_HISTORY(variables.conversationId),
          context.previousHistory
        );
      }
    },
    onSuccess: (response, { conversationId }) => {
      // Add bot response to cache
      const botMessage = {
        id: `bot_${Date.now()}`,
        sender: 'PredictionBot',
        content: response,
        timestamp: Date.now(),
        messageType: 'bot',
      };

      queryClient.setQueryData(
        QUERY_KEYS.CONVERSATION_HISTORY(conversationId),
        (old: any[]) => [...(old || []), botMessage]
      );
    },
    onSettled: (data, error, { conversationId }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.CONVERSATION_HISTORY(conversationId) 
      });
    },
  });
}

/**
 * Mutation hook for voting with cache invalidation
 */
export function useVoteMutation() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  
  return useMutation({
    mutationFn: async ({ 
      predictionId, 
      isYes, 
      amount 
    }: { 
      predictionId: number; 
      isYes: boolean; 
      amount: string;
    }) => {
      // This would call the actual voting function
      const response = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId, isYes, amount }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PREDICTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHAIN_PREDICTIONS });
      
      if (address) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_VOTES(address) });
      }
    },
  });
}

/**
 * Hook for manual cache invalidation
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();
  
  return {
    invalidatePredictions: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PREDICTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHAIN_PREDICTIONS });
    },
    invalidateUserData: (address: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_VOTES(address) });
    },
    invalidateConversation: (conversationId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATION_HISTORY(conversationId) });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}

/**
 * Hook for prefetching data
 */
export function usePrefetchData() {
  const queryClient = useQueryClient();
  const { getAllPredictions } = useChainContracts();

  return {
    prefetchPredictions: () => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.PREDICTIONS,
        queryFn: getAllPredictions,
        staleTime: CACHE_CONFIG.PREDICTIONS.staleTime,
      });
    },
    prefetchChainPredictions: () => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.CHAIN_PREDICTIONS,
        queryFn: getAllPredictions,
        staleTime: CACHE_CONFIG.PREDICTIONS.staleTime,
      });
    },
  };
}
