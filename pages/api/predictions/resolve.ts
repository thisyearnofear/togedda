/**
 * Prediction Resolution API
 * 
 * Handles automatic and manual resolution of predictions
 * Integrates with external data sources and contract interactions
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  initializePredictionResolution,
  resolvePrediction,
  getResolutionStatus,
  getEligiblePredictions,
  checkPredictionEligibility,
  ResolutionResult
} from '@/lib/services/prediction-resolution-service';
import { getPrediction } from '@/lib/prediction-market-v2';

interface ResolutionRequest {
  action: 'status' | 'resolve' | 'eligible' | 'check';
  predictionId?: number;
  force?: boolean;
}

interface ResolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResolutionResponse>
) {
  const timestamp = new Date().toISOString();

  try {
    if (req.method === 'GET') {
      // Get resolution status
      const status = getResolutionStatus();
      
      return res.status(200).json({
        success: true,
        data: {
          status,
          message: `Monitoring ${status.pending} predictions, resolved ${status.resolved} total`
        },
        timestamp
      });
    }

    if (req.method === 'POST') {
      const { action, predictionId, force = false }: ResolutionRequest = req.body;

      switch (action) {
        case 'status':
          const status = getResolutionStatus();
          return res.status(200).json({
            success: true,
            data: status,
            timestamp
          });

        case 'eligible':
          // Get all eligible predictions for resolution
          const eligiblePredictions = await getEligiblePredictions();

          return res.status(200).json({
            success: true,
            data: {
              eligible: eligiblePredictions,
              total: eligiblePredictions.length,
              readyToResolve: eligiblePredictions.filter(p => p.eligible).length
            },
            timestamp
          });

        case 'resolve':
          if (!predictionId) {
            return res.status(400).json({
              success: false,
              error: 'predictionId required for resolve action',
              timestamp
            });
          }

          // Get prediction details
          const prediction = await getPrediction(predictionId);
          if (!prediction) {
            return res.status(404).json({
              success: false,
              error: `Prediction ${predictionId} not found`,
              timestamp
            });
          }

          // Check if prediction is eligible for resolution
          if (prediction.status !== 0) { // Not ACTIVE
            return res.status(400).json({
              success: false,
              error: `Prediction ${predictionId} is not active (status: ${prediction.status})`,
              timestamp
            });
          }

          const now = Math.floor(Date.now() / 1000);
          if (!force && now < prediction.targetDate) {
            return res.status(400).json({
              success: false,
              error: `Prediction ${predictionId} target date has not passed yet`,
              timestamp
            });
          }

          // Attempt resolution
          const result = await resolvePrediction(predictionId);

          return res.status(200).json({
            success: true,
            data: {
              resolution: result,
              prediction: {
                id: prediction.id,
                title: prediction.title,
                targetDate: prediction.targetDate,
                autoResolvable: prediction.autoResolvable
              }
            },
            timestamp
          });

        case 'check':
          if (!predictionId) {
            return res.status(400).json({
              success: false,
              error: 'predictionId required for check action',
              timestamp
            });
          }

          const eligibility = await checkPredictionEligibility(predictionId);

          return res.status(200).json({
            success: true,
            data: {
              predictionId,
              eligible: eligibility.eligible,
              reason: eligibility.reason,
              prediction: eligibility.prediction
            },
            timestamp
          });

        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action: ${action}. Valid actions: status, eligible, resolve, check`,
            timestamp
          });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET for status or POST for actions.',
      timestamp
    });

  } catch (error) {
    console.error('Prediction resolution API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp
    });
  }
}

/**
 * API Usage Examples (On-Demand Resolution):
 *
 * GET /api/predictions/resolve
 * - Get current resolution status
 *
 * POST /api/predictions/resolve
 * { "action": "status" }
 * - Get detailed resolution status
 *
 * POST /api/predictions/resolve
 * { "action": "eligible" }
 * - Get all predictions eligible for resolution
 *
 * POST /api/predictions/resolve
 * { "action": "resolve", "predictionId": 123 }
 * - Resolve specific prediction using external data
 *
 * POST /api/predictions/resolve
 * { "action": "resolve", "predictionId": 123, "force": true }
 * - Force resolve prediction even if target date hasn't passed
 *
 * POST /api/predictions/resolve
 * { "action": "check", "predictionId": 123 }
 * - Check if specific prediction is eligible for resolution
 */
