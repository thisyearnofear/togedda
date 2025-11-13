/**
 * API endpoint for prediction statistics with caching
 * GET /api/predictions/stats
 * GET /api/predictions/[id]/stats
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getAllChainPredictions } from '@/lib/services/dual-chain-service';

interface PredictionStatsResponse {
  success: boolean;
  stats?: {
    totalPredictions: number;
    activePredictions: number;
    resolvedPredictions: number;
    totalVolume: number;
    averageStake: number;
    chainBreakdown: {
      [chainId: string]: {
        predictions: number;
        volume: number;
        currency: string;
      };
    };
    categoryBreakdown: {
      [category: string]: number;
    };
    recentActivity: {
      timestamp: number;
      type: 'created' | 'voted' | 'resolved';
      predictionId: number;
      amount?: number;
    }[];
  };
  predictionStats?: {
    id: number;
    title: string;
    totalStaked: number;
    participantCount: number;
    averageStake: number;
    yesPercentage: number;
    noPercentage: number;
    timeRemaining: number;
    chain: string;
    status: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PredictionStatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { id } = req.query;

    // Fetch all predictions
    const predictions = await getAllChainPredictions();

    if (id) {
      // Return stats for specific prediction
      const predictionId = parseInt(id as string, 10);
      const prediction = predictions.find(p => p.id === predictionId);

      if (!prediction) {
        return res.status(404).json({
          success: false,
          error: 'Prediction not found'
        });
      }

      const totalVotes = prediction.yesVotes + prediction.noVotes;
      const yesPercentage = totalVotes > 0 ? (prediction.yesVotes / totalVotes) * 100 : 50;
      const noPercentage = 100 - yesPercentage;
      const timeRemaining = Math.max(0, prediction.targetDate - Math.floor(Date.now() / 1000));

      // Estimate participant count (this would come from actual vote records in production)
      const estimatedParticipants = Math.max(1, Math.floor(prediction.totalStaked / 0.5));
      const averageStake = estimatedParticipants > 0 ? prediction.totalStaked / estimatedParticipants : 0;

      res.status(200).json({
        success: true,
        predictionStats: {
          id: prediction.id,
          title: prediction.title,
          totalStaked: prediction.totalStaked,
          participantCount: estimatedParticipants,
          averageStake,
          yesPercentage,
          noPercentage,
          timeRemaining,
          chain: prediction.chain,
          status: prediction.status === 0 ? 'active' : 
                  prediction.status === 1 ? 'resolved' : 'expired',
        },
      });
    } else {
      // Return overall statistics
      const totalPredictions = predictions.length;
      const activePredictions = predictions.filter(p => p.status === 0).length;
      const resolvedPredictions = predictions.filter(p => p.status === 1).length;
      
      const totalVolume = predictions.reduce((sum, p) => sum + p.totalStaked, 0);
      const averageStake = totalPredictions > 0 ? totalVolume / totalPredictions : 0;

      // Chain breakdown
      const chainBreakdown: { [chainId: string]: { predictions: number; volume: number; currency: string } } = {};
      predictions.forEach(p => {
        if (!chainBreakdown[p.chain]) {
          chainBreakdown[p.chain] = {
            predictions: 0,
            volume: 0,
            currency: p.chainMetadata.currency,
          };
        }
        chainBreakdown[p.chain].predictions++;
        chainBreakdown[p.chain].volume += p.totalStaked;
      });

      // Category breakdown
      const categoryBreakdown: { [category: string]: number } = {};
      predictions.forEach(p => {
        const categoryName = p.category === 0 ? 'fitness' : 
                           p.category === 1 ? 'crypto' : 
                           p.category === 2 ? 'sports' : 'other';
        categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + 1;
      });

      // Recent activity (simulated - would come from event logs in production)
      const recentActivity = predictions
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(p => ({
          timestamp: p.createdAt * 1000,
          type: 'created' as const,
          predictionId: p.id,
        }));

      res.status(200).json({
        success: true,
        stats: {
          totalPredictions,
          activePredictions,
          resolvedPredictions,
          totalVolume,
          averageStake,
          chainBreakdown,
          categoryBreakdown,
          recentActivity,
        },
      });
    }

  } catch (error) {
    console.error('Error fetching prediction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prediction statistics',
    });
  }
}
