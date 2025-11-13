import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Types for cross-platform predictions
interface CrossPlatformPrediction {
  id: number;
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
  platforms: string[];
}

/**
 * Custom hook for fetching cross-platform predictions
 */
export const useCrossPlatformPredictions = () => {
  return useQuery<CrossPlatformPrediction[]>({
    queryKey: ['cross-platform-predictions'],
    queryFn: async () => {
      const response = await fetch('/api/sports-predictions');
      if (!response.ok) {
        throw new Error('Failed to fetch cross-platform predictions');
      }
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

/**
 * Custom hook for fetching sports central data
 */
export const useSportsCentralData = () => {
  return useQuery({
    queryKey: ['sports-central-data'],
    queryFn: async () => {
      const response = await fetch('/api/sports-central');
      if (!response.ok) {
        throw new Error('Failed to fetch sports central data');
      }
      const data = await response.json();
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

/**
 * Custom hook for submitting cross-platform predictions
 */
export const useSubmitCrossPlatformPrediction = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitPrediction = async (predictionData: {
    title: string;
    description: string;
    targetDate: number;
    targetValue: number;
    platforms: string[];
    emoji?: string;
    category?: number;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/sports-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit prediction');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSubmitError(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitPrediction, isSubmitting, submitError };
};

/**
 * Custom hook for enhanced verification
 */
export const useEnhancedVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const verifyExercise = async (
    userId: string,
    exerciseType: string,
    requiredAmount: number
  ) => {
    setIsVerifying(true);
    try {
      // Import the verification function from the enhanced oracle system
      const { verifyBNBExerciseCompletion } = await import('@/lib/enhanced-oracle-system');
      const result = await verifyBNBExerciseCompletion(userId, exerciseType, requiredAmount);
      setVerificationResult(result);
      return result;
    } catch (error) {
      console.error('Error during verification:', error);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyCrossChain = async (
    userId: string,
    exerciseType: string,
    requiredAmount: number
  ) => {
    setIsVerifying(true);
    try {
      const { verifyCrossChainExercise } = await import('@/lib/enhanced-oracle-system');
      const results = await verifyCrossChainExercise(userId, exerciseType, requiredAmount);
      setVerificationResult(results);
      return results;
    } catch (error) {
      console.error('Error during cross-chain verification:', error);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  return { 
    verifyExercise, 
    verifyCrossChain, 
    isVerifying, 
    verificationResult,
    clearResult: () => setVerificationResult(null)
  };
};