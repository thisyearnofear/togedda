import { NextApiRequest, NextApiResponse } from 'next';
import { aggregateVerification } from '@/lib/enhanced-oracle-system';

/**
 * Attestation Status API
 * Returns verification confidence, cross-chain proof entries, and challenge window countdown
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { predictionId, exerciseType = 'pushups', requiredAmount = '100' } = req.query;

    if (!predictionId) {
      return res.status(400).json({ success: false, error: 'predictionId required' });
    }

    const reqAmount = Number(requiredAmount);
    const result = await aggregateVerification('user', String(exerciseType), reqAmount);

    const challengeWindowSeconds = 2 * 60 * 60; // 2 hours challenge window (oracle)
    const now = Math.floor(Date.now() / 1000);

    return res.status(200).json({
      success: true,
      data: {
        predictionId: Number(predictionId),
        confidence: result.confidence,
        verifiedAmount: result.verifiedAmount,
        totalRequired: result.totalRequired,
        message: result.message,
        proof: result.proof ? JSON.parse(result.proof) : [],
        challengeWindow: {
          seconds: challengeWindowSeconds,
          endsAt: now + challengeWindowSeconds,
          remaining: Math.max(0, now + challengeWindowSeconds - now),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Attestation status error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}